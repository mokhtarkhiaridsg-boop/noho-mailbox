"use server";

/**
 * iter-206 — Member self-serve plan pause (Tier 14 #115).
 *
 * Snowbirds + long-term travelers can pause their full subscription
 * for a $5/mo holding fee while keeping suite + mail intake. Cron
 * sweeper auto-activates Scheduled rows on startDate and auto-resumes
 * Active rows on endDate (or member can early-resume anytime).
 *
 * Differences from iter-99 vacation hold:
 *   - vacation hold = no mail received; plan pause = mail still arrives
 *   - vacation hold = no fee; plan pause = $5/mo
 *   - vacation hold = days-only; plan pause = months-long suspension
 *
 * Differences from iter-179 plan downgrade:
 *   - downgrade = permanent change to a cheaper tier
 *   - plan pause = temporary; original plan auto-restores on endDate
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

const HOLDING_FEE_PER_MONTH_CENTS = 500;     // $5/mo
const MIN_PAUSE_DAYS = 14;                    // shorter than 2 weeks → use vacation hold instead
const MAX_PAUSE_DAYS = 365;                   // 1y cap

export type PlanPauseRow = {
  id: string;
  startDate: string;
  endDate: string;
  durationDays: number;
  holdingFeeCents: number;
  feeMonthly: number;                          // for display: $5/mo
  status: "Scheduled" | "Active" | "Resumed" | "Cancelled";
  reason: string | null;
  originalPlan: string | null;
  originalPlanTerm: string | null;
  activatedAtIso: string | null;
  resumedAtIso: string | null;
  resumedEarly: boolean;
  cancelledAtIso: string | null;
  cancelledReason: string | null;
  createdAtIso: string;
};

function asStatus(s: string): PlanPauseRow["status"] {
  if (s === "Active" || s === "Resumed" || s === "Cancelled") return s;
  return "Scheduled";
}

function rowToView(r: { id: string; startDate: string; endDate: string; holdingFeeCents: number; status: string; reason: string | null; originalPlan: string | null; originalPlanTerm: string | null; activatedAt: Date | null; resumedAt: Date | null; resumedEarly: boolean; cancelledAt: Date | null; cancelledReason: string | null; createdAt: Date }): PlanPauseRow {
  const days = daysBetween(r.startDate, r.endDate);
  return {
    id: r.id,
    startDate: r.startDate,
    endDate: r.endDate,
    durationDays: days,
    holdingFeeCents: r.holdingFeeCents,
    feeMonthly: HOLDING_FEE_PER_MONTH_CENTS / 100,
    status: asStatus(r.status),
    reason: r.reason,
    originalPlan: r.originalPlan,
    originalPlanTerm: r.originalPlanTerm,
    activatedAtIso: r.activatedAt?.toISOString() ?? null,
    resumedAtIso: r.resumedAt?.toISOString() ?? null,
    resumedEarly: r.resumedEarly,
    cancelledAtIso: r.cancelledAt?.toISOString() ?? null,
    cancelledReason: r.cancelledReason,
    createdAtIso: r.createdAt.toISOString(),
  };
}

function daysBetween(startYmd: string, endYmd: string): number {
  const a = new Date(`${startYmd}T00:00:00Z`).getTime();
  const b = new Date(`${endYmd}T00:00:00Z`).getTime();
  return Math.max(0, Math.round((b - a) / (24 * 3600 * 1000)));
}

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}

export async function previewPlanPauseFee(input: { startDate: string; endDate: string }): Promise<{ feeCents: number; durationDays: number; months: number; error?: string }> {
  await verifySession();
  if (!isYmd(input.startDate) || !isYmd(input.endDate)) return { feeCents: 0, durationDays: 0, months: 0, error: "Dates must be YYYY-MM-DD." };
  if (input.endDate <= input.startDate) return { feeCents: 0, durationDays: 0, months: 0, error: "End date must be after start." };
  const days = daysBetween(input.startDate, input.endDate);
  if (days < MIN_PAUSE_DAYS) return { feeCents: 0, durationDays: days, months: 0, error: `Pause must be at least ${MIN_PAUSE_DAYS} days. For shorter trips, use vacation hold (free).` };
  if (days > MAX_PAUSE_DAYS) return { feeCents: 0, durationDays: days, months: 0, error: `Pause cannot exceed ${MAX_PAUSE_DAYS} days.` };
  const months = days / 30;
  const feeCents = Math.round(months * HOLDING_FEE_PER_MONTH_CENTS);
  return { feeCents, durationDays: days, months: Math.round(months * 10) / 10 };
}

export async function getMyPlanPause(): Promise<PlanPauseRow | null> {
  const session = await verifySession();
  const userId = session.id!;
  const row = await prisma.planPause.findFirst({
    where: { userId, status: { in: ["Scheduled", "Active"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return null;
  return rowToView(row);
}

export async function getMyPlanPauseHistory(): Promise<PlanPauseRow[]> {
  const session = await verifySession();
  const userId = session.id!;
  const rows = await prisma.planPause.findMany({
    where: { userId, status: { in: ["Resumed", "Cancelled"] } },
    orderBy: { createdAt: "desc" },
    take: 10,
  });
  return rows.map(rowToView);
}

export async function requestPlanPause(input: { startDate: string; endDate: string; reason?: string }): Promise<{ row?: PlanPauseRow; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const preview = await previewPlanPauseFee({ startDate: input.startDate, endDate: input.endDate });
  if (preview.error) return { error: preview.error };

  // Reject if there's already an active or scheduled pause.
  const existing = await prisma.planPause.findFirst({
    where: { userId, status: { in: ["Scheduled", "Active"] } },
  });
  if (existing) return { error: "You already have a pause in progress. Cancel or resume it first." };

  // Snapshot current plan + term so we can restore on resume.
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { plan: true, planTerm: true, name: true, email: true },
  });
  if (!user) return { error: "User not found." };

  const created = await prisma.planPause.create({
    data: {
      userId,
      startDate: input.startDate,
      endDate: input.endDate,
      holdingFeeCents: preview.feeCents,
      reason: input.reason?.trim().slice(0, 300) || null,
      status: "Scheduled",
      originalPlan: user.plan ?? null,
      originalPlanTerm: user.planTerm ?? null,
      createdById: userId,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId, actorRole: session.role ?? "MEMBER",
      action: "plan_pause.requested",
      entityType: "PlanPause", entityId: created.id,
      metadata: JSON.stringify({ startDate: input.startDate, endDate: input.endDate, holdingFeeCents: preview.feeCents, originalPlan: user.plan, durationDays: preview.durationDays }),
    },
  }).catch(() => null);

  // Confirmation email.
  if (user.email) {
    void sendEmail({
      kind: "plan_pause_scheduled",
      to: user.email,
      userId,
      subject: `Your NOHO Mailbox plan pause is scheduled · ${input.startDate} → ${input.endDate}`,
      html: scheduledEmailHtml({
        firstName: user.name.split(/\s+/)[0] || user.name,
        startDate: input.startDate,
        endDate: input.endDate,
        durationDays: preview.durationDays,
        feeDollars: (preview.feeCents / 100).toFixed(2),
        originalPlan: user.plan,
      }),
    }).catch(() => null);
  }

  revalidatePath("/dashboard");
  return { row: rowToView(created) };
}

export async function cancelMyPlanPause(input: { reason?: string } = {}): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const row = await prisma.planPause.findFirst({
    where: { userId, status: { in: ["Scheduled", "Active"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return { error: "No active pause to cancel." };
  if (row.status === "Active") {
    // Active pause → use early-resume instead so the plan gets restored cleanly.
    return resumeMyPlanPauseEarly();
  }
  await prisma.$transaction([
    prisma.planPause.update({
      where: { id: row.id },
      data: { status: "Cancelled", cancelledAt: new Date(), cancelledReason: input.reason?.trim().slice(0, 200) || null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: userId, actorRole: session.role ?? "MEMBER",
        action: "plan_pause.cancelled",
        entityType: "PlanPause", entityId: row.id,
        metadata: JSON.stringify({ status: "Scheduled→Cancelled", reason: input.reason ?? null }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function resumeMyPlanPauseEarly(): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const row = await prisma.planPause.findFirst({
    where: { userId, status: "Active" },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return { error: "No active pause to resume." };
  await prisma.$transaction([
    prisma.planPause.update({
      where: { id: row.id },
      data: { status: "Resumed", resumedAt: new Date(), resumedEarly: true },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { plan: row.originalPlan ?? undefined, planTerm: row.originalPlanTerm ?? undefined },
    }),
    prisma.auditLog.create({
      data: {
        actorId: userId, actorRole: session.role ?? "MEMBER",
        action: "plan_pause.resumed_early",
        entityType: "PlanPause", entityId: row.id,
        metadata: JSON.stringify({ originalPlan: row.originalPlan, originalPlanTerm: row.originalPlanTerm }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  return { success: true };
}

// Cron sweep — activate Scheduled→Active when startDate ≤ today, and
// Active→Resumed when endDate ≤ today. Idempotent (status filter
// prevents double-fire). Sends member email on each transition.
export type PlanPauseSweepResult = {
  activated: number;
  resumed: number;
  ranAtIso: string;
  errors: string[];
};

export async function runPlanPauseSweep(): Promise<PlanPauseSweepResult> {
  const today = new Date().toISOString().slice(0, 10);
  const result: PlanPauseSweepResult = { activated: 0, resumed: 0, ranAtIso: new Date().toISOString(), errors: [] };

  // Activations.
  const toActivate = await prisma.planPause.findMany({
    where: { status: "Scheduled", startDate: { lte: today } },
    include: { user: { select: { id: true, name: true, email: true, plan: true, planTerm: true } } },
    take: 200,
  });
  for (const p of toActivate) {
    try {
      await prisma.$transaction([
        prisma.planPause.update({
          where: { id: p.id },
          data: {
            status: "Active",
            activatedAt: new Date(),
            // Re-snapshot if originalPlan wasn't captured at request time
            // (safety net for legacy rows).
            originalPlan: p.originalPlan ?? p.user?.plan ?? null,
            originalPlanTerm: p.originalPlanTerm ?? p.user?.planTerm ?? null,
          },
        }),
        prisma.user.update({
          where: { id: p.userId },
          // Mark plan as "Paused" — the rest of the system will see this and skip renewals etc.
          // This is intentionally non-destructive: we keep planTerm so we know what to restore.
          data: { plan: "Paused" },
        }),
        prisma.auditLog.create({
          data: {
            actorId: "system", actorRole: "SYSTEM",
            action: "plan_pause.activated",
            entityType: "PlanPause", entityId: p.id,
            metadata: JSON.stringify({ originalPlan: p.user?.plan, endDate: p.endDate }),
          },
        }),
      ]);
      result.activated += 1;
      if (p.user?.email) {
        void sendEmail({
          kind: "plan_pause_activated",
          to: p.user.email,
          userId: p.userId,
          subject: `Your NOHO Mailbox plan is now paused · auto-resumes ${p.endDate}`,
          html: activatedEmailHtml({
            firstName: p.user.name.split(/\s+/)[0] || p.user.name,
            endDate: p.endDate,
            originalPlan: p.user.plan,
          }),
        }).catch(() => null);
      }
    } catch (e) {
      result.errors.push(`activate ${p.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Auto-resumes.
  const toResume = await prisma.planPause.findMany({
    where: { status: "Active", endDate: { lte: today } },
    include: { user: { select: { id: true, name: true, email: true } } },
    take: 200,
  });
  for (const p of toResume) {
    try {
      await prisma.$transaction([
        prisma.planPause.update({
          where: { id: p.id },
          data: { status: "Resumed", resumedAt: new Date(), resumedEarly: false },
        }),
        prisma.user.update({
          where: { id: p.userId },
          data: { plan: p.originalPlan ?? undefined, planTerm: p.originalPlanTerm ?? undefined },
        }),
        prisma.auditLog.create({
          data: {
            actorId: "system", actorRole: "SYSTEM",
            action: "plan_pause.resumed",
            entityType: "PlanPause", entityId: p.id,
            metadata: JSON.stringify({ originalPlan: p.originalPlan, originalPlanTerm: p.originalPlanTerm }),
          },
        }),
      ]);
      result.resumed += 1;
      if (p.user?.email) {
        void sendEmail({
          kind: "plan_pause_resumed",
          to: p.user.email,
          userId: p.userId,
          subject: `Welcome back! Your NOHO Mailbox ${p.originalPlan ?? "plan"} just resumed`,
          html: resumedEmailHtml({
            firstName: p.user.name.split(/\s+/)[0] || p.user.name,
            originalPlan: p.originalPlan,
          }),
        }).catch(() => null);
      }
    } catch (e) {
      result.errors.push(`resume ${p.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return result;
}

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function scheduledEmailHtml(d: { firstName: string; startDate: string; endDate: string; durationDays: number; feeDollars: string; originalPlan: string | null }): string {
  return wrapEmail(`<p style="margin:0;font-size:11px;font-weight:800;letter-spacing:.20em;text-transform:uppercase;color:#23596A;">⏸ Plan pause scheduled</p>
<h1 style="margin:6px 0 4px;font-size:24px;font-weight:900;letter-spacing:-.4px;">See you ${escapeHtml(d.startDate)}, ${escapeHtml(d.firstName)}</h1>
<p style="margin:0 0 16px;font-size:14px;color:rgba(45,16,15,.65);line-height:1.5;">
  Your <strong>${escapeHtml(d.originalPlan ?? "current")}</strong> plan will pause on <strong>${escapeHtml(d.startDate)}</strong> and auto-resume on <strong>${escapeHtml(d.endDate)}</strong> (${d.durationDays} days).
  Mail still arrives at your suite during the pause — we hold everything until you're back.
</p>
<div style="background:#F7E6C2;border-radius:10px;padding:14px 18px;margin:14px 0;">
  <p style="margin:0;font-size:13px;color:#5C4540;">💰 <strong>Holding fee:</strong> $${escapeHtml(d.feeDollars)} (one-time, billed at activation)</p>
  <p style="margin:6px 0 0;font-size:12px;color:#7A6050;">Cancel anytime before ${escapeHtml(d.startDate)} for a full refund. Early-resume anytime during the pause to lift it sooner — no extra charge.</p>
</div>
<p style="margin:14px 0;text-align:center;">
  <a href="${BASE_URL}/dashboard?tab=settings" style="display:inline-block;padding:11px 22px;background:#337485;color:white;text-decoration:none;border-radius:10px;font-weight:900;font-size:13px;">Manage pause →</a>
</p>`);
}

function activatedEmailHtml(d: { firstName: string; endDate: string; originalPlan: string | null }): string {
  return wrapEmail(`<p style="margin:0;font-size:11px;font-weight:800;letter-spacing:.20em;text-transform:uppercase;color:#23596A;">⏸ Plan paused — see you ${escapeHtml(d.endDate)}</p>
<h1 style="margin:6px 0 4px;font-size:24px;font-weight:900;letter-spacing:-.4px;">Your NOHO Mailbox plan is paused</h1>
<p style="margin:0 0 16px;font-size:14px;color:rgba(45,16,15,.65);line-height:1.5;">
  Hi ${escapeHtml(d.firstName)} — your <strong>${escapeHtml(d.originalPlan ?? "plan")}</strong> just paused. Mail still arrives at your suite; we'll hold everything until your auto-resume on <strong>${escapeHtml(d.endDate)}</strong>.
  Need to come back early? Tap "Resume now" in your dashboard anytime.
</p>
<p style="margin:14px 0;text-align:center;">
  <a href="${BASE_URL}/dashboard?tab=settings" style="display:inline-block;padding:11px 22px;background:#337485;color:white;text-decoration:none;border-radius:10px;font-weight:900;font-size:13px;">Open dashboard →</a>
</p>`);
}

function resumedEmailHtml(d: { firstName: string; originalPlan: string | null }): string {
  return wrapEmail(`<p style="margin:0;font-size:11px;font-weight:800;letter-spacing:.20em;text-transform:uppercase;color:#15803d;">▶ Plan resumed — welcome back!</p>
<h1 style="margin:6px 0 4px;font-size:24px;font-weight:900;letter-spacing:-.4px;">Hi ${escapeHtml(d.firstName)}, you're back on ${escapeHtml(d.originalPlan ?? "your plan")}</h1>
<p style="margin:0 0 16px;font-size:14px;color:rgba(45,16,15,.65);line-height:1.5;">
  Your full subscription just resumed. Stop by the bureau anytime to pick up everything that came in while you were away — we kept it all safe.
</p>
<p style="margin:14px 0;text-align:center;">
  <a href="${BASE_URL}/dashboard" style="display:inline-block;padding:11px 22px;background:#337485;color:white;text-decoration:none;border-radius:10px;font-weight:900;font-size:13px;">View my mailbox →</a>
</p>`);
}

function wrapEmail(inner: string): string {
  return `<!doctype html><html><body style="margin:0;background:#F8F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#2D100F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F2EA;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:white;border-radius:14px;border:1px solid #E8DDD0;padding:28px 32px;">
      <tr><td>${inner}
        <p style="margin:14px 0 0;font-size:11px;color:rgba(45,16,15,.45);line-height:1.4;">
          📍 11288 Ventura Blvd #1006, Studio City, CA 91604 · ☎️ <a href="tel:+18185067744" style="color:#23596A;">(818) 506-7744</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}
