"use server";

/**
 * iter-179 — Customer self-serve plan downgrade (Tier 12 #88).
 *
 * Counterpart to iter-116's prorate-on-upgrade. Downgrades DON'T
 * prorate (no refund) — the lower price applies starting at the next
 * renewal date. Eligibility gates: paid plan now, no overdue
 * invoices, no active vacation hold or storage dispute, no pending
 * downgrade already in flight.
 *
 * Lifecycle:
 *   request → pending
 *   admin approve / cancel / deny
 *   cron `applyDuePlanDowngradesSweep()` walks status="approved" with
 *   effectiveAt ≤ today and flips User.plan + audit + email
 *
 * Audit on every state change. Member webhook fires on `applied`.
 * Admin Slack/Discord webhook fires on initial request so churn-risk
 * gets eyeballs.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhooks";
import { fireMemberWebhooks } from "@/lib/memberWebhooks";

const PLAN_MONTHLY_CENTS: Record<string, number> = {
  Basic: 9500,
  Business: 17500,
  Premium: 27500,
};
const PLAN_ORDER = ["Basic", "Business", "Premium"] as const;
type PlanName = typeof PLAN_ORDER[number];

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

function isPlan(p: string | null | undefined): p is PlanName {
  return !!p && (PLAN_ORDER as readonly string[]).includes(p);
}

export type DowngradeOption = {
  plan: PlanName;
  monthlyCents: number;
  monthlySavingsCents: number;
};

export type DowngradeEligibility = {
  ok: boolean;
  reasons: Array<{ key: string; label: string; met: boolean; detail?: string }>;
  currentPlan: PlanName | null;
  currentMonthlyCents: number;
  currentDueDate: string | null;
  options: DowngradeOption[];
  pendingRequestId: string | null;
};

// ─── Eligibility check ──────────────────────────────────────────────
async function checkDowngradeEligibility(userId: string): Promise<DowngradeEligibility> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planDueDate: true, mailboxStatus: true, status: true },
  });
  if (!u) {
    return { ok: false, reasons: [], currentPlan: null, currentMonthlyCents: 0, currentDueDate: null, options: [], pendingRequestId: null };
  }
  const currentPlan = isPlan(u.plan) ? u.plan : null;
  const currentMonthlyCents = currentPlan ? PLAN_MONTHLY_CENTS[currentPlan] : 0;

  // Eligibility axes evaluated in JS so we can return reason details.
  const today = new Date();
  let overdueCount = 0;
  try {
    overdueCount = await prisma.invoice.count({ where: { userId, status: "Sent", dueAt: { lt: today } } });
  } catch { /* swallow */ }
  let activeHold = false;
  try {
    const hold = await prisma.vacationHold.findFirst({ where: { userId, active: true } });
    activeHold = !!hold;
  } catch { /* swallow */ }
  let openDispute = false;
  try {
    // Disputes use `filedById` not `userId` (filer != owner sometimes).
    const dispute = await prisma.storageFeeDispute.findFirst({ where: { filedById: userId, status: "Open" } });
    openDispute = !!dispute;
  } catch { /* swallow */ }
  const existing = await prisma.planDowngradeRequest.findFirst({
    where: { userId, status: { in: ["pending", "approved"] } },
    select: { id: true },
  });

  const reasons = [
    { key: "active",      label: "Active mailbox",          met: u.mailboxStatus !== "Cancelled" && u.status !== "Cancelled", detail: u.mailboxStatus ?? u.status },
    { key: "paidPlan",    label: "Currently on a paid plan", met: !!currentPlan,                    detail: u.plan ?? "no plan" },
    { key: "downgradable", label: "Has a lower tier to move to", met: currentPlan !== "Basic",      detail: currentPlan === "Basic" ? "Already on Basic" : "ok" },
    { key: "noOverdue",   label: "No overdue invoices",     met: overdueCount === 0,                detail: overdueCount === 0 ? "0 overdue" : `${overdueCount} overdue` },
    { key: "noActiveHold", label: "No active vacation hold", met: !activeHold,                       detail: activeHold ? "Hold active" : "ok" },
    { key: "noOpenDispute", label: "No open storage dispute", met: !openDispute,                     detail: openDispute ? "Dispute open" : "ok" },
    { key: "noPendingDowngrade", label: "No pending downgrade",  met: !existing,                    detail: existing ? "Already requested" : "ok" },
  ];
  const ok = reasons.every((r) => r.met);

  // Build downgrade options: every plan strictly cheaper than current.
  const options: DowngradeOption[] = [];
  if (currentPlan) {
    const currentIdx = PLAN_ORDER.indexOf(currentPlan);
    for (let i = 0; i < currentIdx; i++) {
      const p = PLAN_ORDER[i] as PlanName;
      options.push({
        plan: p,
        monthlyCents: PLAN_MONTHLY_CENTS[p]!,
        monthlySavingsCents: currentMonthlyCents - PLAN_MONTHLY_CENTS[p]!,
      });
    }
  }

  return {
    ok,
    reasons,
    currentPlan,
    currentMonthlyCents,
    currentDueDate: u.planDueDate ?? null,
    options,
    pendingRequestId: existing?.id ?? null,
  };
}

export async function getMyPlanDowngradeOptions(): Promise<DowngradeEligibility> {
  const session = await verifySession();
  return checkDowngradeEligibility(session.id!);
}

// ─── Request ────────────────────────────────────────────────────────
export type PlanDowngradeRow = {
  id: string;
  fromPlan: PlanName;
  toPlan: PlanName;
  effectiveAt: string;
  reason: string | null;
  status: "pending" | "approved" | "applied" | "cancelled" | "denied";
  deniedReason: string | null;
  appliedAtIso: string | null;
  createdAtIso: string;
};

function toRow(r: { id: string; fromPlan: string; toPlan: string; effectiveAt: string; reason: string | null; status: string; deniedReason: string | null; appliedAt: Date | null; createdAt: Date }): PlanDowngradeRow {
  return {
    id: r.id,
    fromPlan: isPlan(r.fromPlan) ? r.fromPlan : "Basic",
    toPlan: isPlan(r.toPlan) ? r.toPlan : "Basic",
    effectiveAt: r.effectiveAt,
    reason: r.reason,
    status: ["pending", "approved", "applied", "cancelled", "denied"].includes(r.status) ? (r.status as PlanDowngradeRow["status"]) : "pending",
    deniedReason: r.deniedReason,
    appliedAtIso: r.appliedAt?.toISOString() ?? null,
    createdAtIso: r.createdAt.toISOString(),
  };
}

export async function requestPlanDowngrade(input: { toPlan: PlanName; reason?: string }): Promise<{ id?: string; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  if (!isPlan(input.toPlan)) return { error: "Invalid target plan." };
  const elig = await checkDowngradeEligibility(userId);
  if (!elig.ok) {
    const blocking = elig.reasons.find((r) => !r.met);
    return { error: blocking ? `Cannot downgrade — ${blocking.label}.` : "Not eligible." };
  }
  if (!elig.currentPlan) return { error: "No current plan." };
  if (PLAN_ORDER.indexOf(input.toPlan) >= PLAN_ORDER.indexOf(elig.currentPlan)) {
    return { error: "Target plan must be cheaper than current. Use upgrade for higher tiers." };
  }
  const effectiveAt = elig.currentDueDate;
  if (!effectiveAt) return { error: "No renewal date — contact support." };
  const reason = input.reason?.trim().slice(0, 500) || null;
  const created = await prisma.planDowngradeRequest.create({
    data: {
      userId,
      fromPlan: elig.currentPlan,
      toPlan: input.toPlan,
      effectiveAt,
      reason,
      status: "pending",
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId, actorRole: session.role ?? "MEMBER",
      action: "plan.downgrade_requested",
      entityType: "PlanDowngradeRequest",
      entityId: created.id,
      metadata: JSON.stringify({ fromPlan: elig.currentPlan, toPlan: input.toPlan, effectiveAt, hasReason: !!reason }),
    },
  });
  // Admin Slack/Discord ping — churn-risk events deserve human eyeballs.
  void fireWebhooks("door.code_issued", {
    text: `📉 Plan downgrade requested · *${session.name ?? userId}* · ${elig.currentPlan} → ${input.toPlan} effective ${effectiveAt}${reason ? `\nReason: ${reason}` : ""}`,
    emoji: "📉",
    detail: { userId, fromPlan: elig.currentPlan, toPlan: input.toPlan, effectiveAt, reason },
  });
  // Confirmation email to member.
  if (session.email) {
    void sendEmail({
      to: session.email,
      subject: `Got it — ${elig.currentPlan} → ${input.toPlan} effective ${effectiveAt}`,
      kind: "plan_downgrade_requested",
      userId,
      html: buildDowngradeConfirmationEmail(session.name ?? "there", elig.currentPlan, input.toPlan, effectiveAt, reason),
    }).catch(() => undefined);
  }
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { id: created.id };
}

export async function cancelMyPlanDowngrade(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const row = await prisma.planDowngradeRequest.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Request not found." };
  if (row.userId !== session.id && session.role !== "ADMIN") return { error: "Not your request." };
  if (row.status === "applied") return { error: "Already applied." };
  if (row.status === "cancelled") return { error: "Already cancelled." };
  await prisma.$transaction([
    prisma.planDowngradeRequest.update({
      where: { id: row.id },
      data: { status: "cancelled", cancelledAt: new Date(), cancelledBy: row.userId === session.id ? "member" : (session.id ?? "admin") },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.id ?? "unknown", actorRole: session.role ?? "MEMBER",
        action: "plan.downgrade_cancelled",
        entityType: "PlanDowngradeRequest",
        entityId: row.id,
        metadata: JSON.stringify({ fromPlan: row.fromPlan, toPlan: row.toPlan, byMember: row.userId === session.id }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function listMyPlanDowngrades(): Promise<PlanDowngradeRow[]> {
  const session = await verifySession();
  const rows = await prisma.planDowngradeRequest.findMany({
    where: { userId: session.id! },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return rows.map(toRow);
}

// ─── Admin ──────────────────────────────────────────────────────────
export type AdminDowngradeRow = PlanDowngradeRow & {
  userId: string;
  customerName: string;
  customerEmail: string;
  suiteNumber: string | null;
};

export async function listAdminPlanDowngrades(input: { status?: PlanDowngradeRow["status"] | "all" } = {}): Promise<AdminDowngradeRow[]> {
  await verifyAdmin();
  const where: Record<string, unknown> = {};
  if (input.status && input.status !== "all") where.status = input.status;
  const rows = await prisma.planDowngradeRequest.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: { user: { select: { name: true, email: true, suiteNumber: true } } },
  });
  return rows.map((r) => ({
    ...toRow(r),
    userId: r.userId,
    customerName: r.user.name,
    customerEmail: r.user.email,
    suiteNumber: r.user.suiteNumber,
  }));
}

export async function approvePlanDowngrade(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.planDowngradeRequest.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Request not found." };
  if (row.status !== "pending") return { error: `Cannot approve a ${row.status} request.` };
  await prisma.$transaction([
    prisma.planDowngradeRequest.update({
      where: { id: row.id },
      data: { status: "approved", approvedAt: new Date(), approvedById: actor.id ?? null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "plan.downgrade_approved",
        entityType: "PlanDowngradeRequest",
        entityId: row.id,
        metadata: JSON.stringify({ userId: row.userId, fromPlan: row.fromPlan, toPlan: row.toPlan, effectiveAt: row.effectiveAt }),
      },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function denyPlanDowngrade(input: { id: string; reason: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const reason = input.reason.trim().slice(0, 300);
  if (reason.length < 2) return { error: "Reason required." };
  const row = await prisma.planDowngradeRequest.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Request not found." };
  if (row.status === "applied") return { error: "Already applied." };
  await prisma.$transaction([
    prisma.planDowngradeRequest.update({
      where: { id: row.id },
      data: { status: "denied", deniedAt: new Date(), deniedReason: reason },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "plan.downgrade_denied",
        entityType: "PlanDowngradeRequest",
        entityId: row.id,
        metadata: JSON.stringify({ userId: row.userId, fromPlan: row.fromPlan, toPlan: row.toPlan, reason }),
      },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Cron applier ────────────────────────────────────────────────────
// Walks every approved request whose effectiveAt has come due, flips
// User.plan, marks the request applied, fires email + member webhook.
export async function applyDuePlanDowngradesSweep(): Promise<{ scanned: number; applied: number; failed: number }> {
  const todayYmd = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  })();
  const due = await prisma.planDowngradeRequest.findMany({
    where: { status: "approved", effectiveAt: { lte: todayYmd } },
    include: { user: { select: { name: true, email: true } } },
  });
  let applied = 0, failed = 0;
  for (const r of due) {
    try {
      await prisma.$transaction([
        prisma.user.update({ where: { id: r.userId }, data: { plan: r.toPlan } }),
        prisma.planDowngradeRequest.update({
          where: { id: r.id },
          data: { status: "applied", appliedAt: new Date() },
        }),
        prisma.auditLog.create({
          data: {
            actorId: "system", actorRole: "SYSTEM",
            action: "plan.downgrade_applied",
            entityType: "PlanDowngradeRequest",
            entityId: r.id,
            metadata: JSON.stringify({ userId: r.userId, fromPlan: r.fromPlan, toPlan: r.toPlan }),
          },
        }),
      ]);
      if (r.user.email) {
        void sendEmail({
          to: r.user.email,
          subject: `Your downgrade is live — you're now on ${r.toPlan}`,
          kind: "plan_downgrade_applied",
          userId: r.userId,
          html: buildDowngradeAppliedEmail(r.user.name, r.fromPlan as PlanName, r.toPlan as PlanName),
        }).catch(() => undefined);
      }
      void fireMemberWebhooks(r.userId, "plan.expiring_soon", {
        text: `📉 Plan downgrade applied · You're now on ${r.toPlan}`,
        url: `${BASE_URL}/dashboard?tab=settings`,
        detail: { kind: "plan_downgrade_applied", fromPlan: r.fromPlan, toPlan: r.toPlan },
      });
      applied += 1;
    } catch {
      failed += 1;
    }
  }
  return { scanned: due.length, applied, failed };
}

// ─── Email templates ─────────────────────────────────────────────────
function buildDowngradeConfirmationEmail(name: string, fromPlan: PlanName, toPlan: PlanName, effectiveAt: string, reason: string | null): string {
  const firstName = name.split(" ")[0] || "there";
  const fromMo = (PLAN_MONTHLY_CENTS[fromPlan]! / 100).toFixed(2);
  const toMo = (PLAN_MONTHLY_CENTS[toPlan]! / 100).toFixed(2);
  const savingsMo = ((PLAN_MONTHLY_CENTS[fromPlan]! - PLAN_MONTHLY_CENTS[toPlan]!) / 100).toFixed(2);
  const effLabel = new Date(`${effectiveAt}T00:00:00`).toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" });
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F8F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#2D100F;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F2EA;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(45,16,15,0.10);">
  <tr><td style="background:linear-gradient(135deg,#337485,#23596A);padding:24px 28px;">
    <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#F7E6C2;">NOHO Mailbox · Plan downgrade</p>
    <h1 style="margin:6px 0 0;font-size:22px;font-weight:900;color:white;">Your request is in</h1>
  </td></tr>
  <tr><td style="padding:28px;font-size:14px;line-height:1.6;color:#2D100F;">
    <p>Hi ${firstName}, we got your downgrade request — here's what happens next.</p>
    <div style="margin:16px 0;padding:14px 16px;border-radius:12px;background:#F4EEE3;border:1px solid #E8DDD0;">
      <table width="100%" cellpadding="0" cellspacing="0" style="font-size:13px;color:#2D100F;">
        <tr><td style="padding:4px 0;width:50%;color:#7A6050;">From</td><td style="padding:4px 0;text-align:right;font-weight:800;">${fromPlan} · $${fromMo}/mo</td></tr>
        <tr><td style="padding:4px 0;color:#7A6050;">To</td><td style="padding:4px 0;text-align:right;font-weight:900;color:#337485;">${toPlan} · $${toMo}/mo</td></tr>
        <tr><td style="padding:4px 0;border-top:1px solid #E8DDD0;color:#7A6050;">Monthly savings</td><td style="padding:4px 0;border-top:1px solid #E8DDD0;text-align:right;font-weight:900;color:#15803d;">$${savingsMo}/mo</td></tr>
        <tr><td style="padding:4px 0;color:#7A6050;">Effective</td><td style="padding:4px 0;text-align:right;font-weight:800;">${effLabel}</td></tr>
      </table>
    </div>
    <p>You'll keep your <strong>${fromPlan}</strong> features and pricing through the end of your current term — the new lower price kicks in at your next renewal.</p>
    ${reason ? `<p style="margin:0 0 12px;padding:10px 12px;border-left:3px solid #337485;background:#f7faff;font-style:italic;color:#3A1816;">Your note: "${reason.replace(/</g, "&lt;")}"</p>` : ""}
    <p>Changed your mind? Cancel anytime before ${effLabel} from <a href="${BASE_URL}/dashboard?tab=settings" style="color:#337485;font-weight:700;">your dashboard</a>.</p>
    <a href="${BASE_URL}/dashboard?tab=settings" style="display:inline-block;margin-top:8px;background:#337485;color:white;font-weight:800;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:100px;">View on dashboard</a>
  </td></tr>
</table></td></tr></table></body></html>`;
}

function buildDowngradeAppliedEmail(name: string, fromPlan: PlanName, toPlan: PlanName): string {
  const firstName = name.split(" ")[0] || "there";
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F8F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#2D100F;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F8F2EA;padding:32px 16px;"><tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:white;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(45,16,15,0.10);">
  <tr><td style="background:linear-gradient(135deg,#22C55E,#15803d);padding:24px 28px;">
    <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:rgba(255,255,255,0.92);">NOHO Mailbox · Plan applied</p>
    <h1 style="margin:6px 0 0;font-size:22px;font-weight:900;color:white;">You're now on ${toPlan}</h1>
  </td></tr>
  <tr><td style="padding:28px;font-size:14px;line-height:1.6;color:#2D100F;">
    <p>Hi ${firstName}, your scheduled downgrade just went live — you've moved from <strong>${fromPlan}</strong> to <strong>${toPlan}</strong>. Welcome to your new plan.</p>
    <a href="${BASE_URL}/dashboard?tab=settings" style="display:inline-block;margin-top:8px;background:#337485;color:white;font-weight:800;font-size:14px;text-decoration:none;padding:12px 24px;border-radius:100px;">View plan details</a>
    <p style="margin:18px 0 0;font-size:12px;color:#5C4540;">If anything looks off, reply to this email — we'll sort it the same day.</p>
  </td></tr>
</table></td></tr></table></body></html>`;
}
