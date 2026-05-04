"use server";

// iter-116 — Mailbox upgrade flow with prorate.
//
// Member self-upgrades from Basic → Business → Premium without admin
// intervention. We charge the difference for the months remaining on
// their current plan (not a full new term), update User.plan in place,
// record a MailboxRenewal row marked "Upgrade", and send a receipt
// email + admin webhook ping.
//
// Reuses iter-111 wallet-charge pattern + iter-83 MailboxRenewal model
// + iter-95 audit + iter-103 webhook.

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhooks";

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

// Mirror of billing.ts PLAN_MONTHLY_CENTS.
const PLAN_MONTHLY_CENTS: Record<string, number> = {
  Basic: 9500,
  Business: 17500,
  Premium: 27500,
};
const PLAN_ORDER = ["Basic", "Business", "Premium"] as const;
type PlanName = typeof PLAN_ORDER[number];

export type UpgradeOption = {
  plan: PlanName;
  monthlyCents: number;
  monthsRemaining: number;
  prorateCents: number;        // differential × months remaining
  newDueDate: string | null;   // unchanged from current
  monthlyDeltaCents: number;   // newRate - currentRate
};

export type UpgradeOptionsResult = {
  currentPlan: PlanName | null;
  currentTermMonths: number;
  currentDueDate: string | null;
  walletBalanceCents: number;
  monthsRemaining: number;
  options: UpgradeOption[];
};

function daysUntil(isoDate: string | null): number {
  if (!isoDate) return 0;
  const target = new Date(isoDate + "T00:00:00Z").getTime();
  const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  return Math.max(0, Math.floor((target - today) / (24 * 60 * 60 * 1000)));
}

// Treat months remaining as ceil(daysRemaining / 30) so an upgrade with
// 18 days left charges ⌈18/30⌉=1 month differential. Matches what most
// SaaS prorate flows do.
function monthsRemainingFor(currentDueDate: string | null): number {
  const days = daysUntil(currentDueDate);
  if (days <= 0) return 0;
  return Math.max(1, Math.ceil(days / 30));
}

// ─── Member: read upgrade options ────────────────────────────────────────
export async function getPlanUpgradeOptions(): Promise<UpgradeOptionsResult> {
  const session = await verifySession();
  if (!session.id) {
    return { currentPlan: null, currentTermMonths: 0, currentDueDate: null, walletBalanceCents: 0, monthsRemaining: 0, options: [] };
  }
  const u = await prisma.user.findUnique({
    where: { id: session.id },
    select: { plan: true, planTerm: true, planDueDate: true, walletBalanceCents: true },
  });
  if (!u) return { currentPlan: null, currentTermMonths: 0, currentDueDate: null, walletBalanceCents: 0, monthsRemaining: 0, options: [] };

  const currentPlan = PLAN_ORDER.includes(u.plan as PlanName) ? (u.plan as PlanName) : null;
  const currentRate = currentPlan ? PLAN_MONTHLY_CENTS[currentPlan] : 0;
  const monthsRemaining = monthsRemainingFor(u.planDueDate);
  const currentIdx = currentPlan ? PLAN_ORDER.indexOf(currentPlan) : -1;

  // Only higher tiers are upgrades.
  const options: UpgradeOption[] = PLAN_ORDER
    .filter((p, idx) => idx > currentIdx)
    .map((p) => {
      const newRate = PLAN_MONTHLY_CENTS[p];
      const delta = Math.max(0, newRate - currentRate);
      const prorateCents = delta * monthsRemaining;
      return {
        plan: p,
        monthlyCents: newRate,
        monthsRemaining,
        prorateCents,
        newDueDate: u.planDueDate,
        monthlyDeltaCents: delta,
      };
    });

  return {
    currentPlan,
    currentTermMonths: parseInt(u.planTerm ?? "1") || 1,
    currentDueDate: u.planDueDate,
    walletBalanceCents: u.walletBalanceCents,
    monthsRemaining,
    options,
  };
}

// ─── Member: apply upgrade ───────────────────────────────────────────────
export async function requestPlanUpgrade(input: { newPlan: PlanName }): Promise<{
  error?: string;
  ok?: boolean;
  chargedCents?: number;
  newPlan?: PlanName;
}> {
  const session = await verifySession();
  const userId = session.id!;
  const newPlan = input.newPlan;
  if (!PLAN_ORDER.includes(newPlan)) return { error: "Invalid plan" };

  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, suiteNumber: true, plan: true, planTerm: true, planDueDate: true, walletBalanceCents: true },
  });
  if (!u) return { error: "User not found" };
  if (!u.plan) return { error: "No active plan to upgrade from" };
  const currentIdx = PLAN_ORDER.indexOf(u.plan as PlanName);
  const newIdx = PLAN_ORDER.indexOf(newPlan);
  if (newIdx <= currentIdx) return { error: "Pick a higher-tier plan" };

  const monthsRemaining = monthsRemainingFor(u.planDueDate);
  const delta = PLAN_MONTHLY_CENTS[newPlan] - PLAN_MONTHLY_CENTS[u.plan];
  const charge = Math.max(0, delta) * monthsRemaining;
  if (u.walletBalanceCents < charge) {
    return { error: `Top up your wallet first — need $${(charge / 100).toFixed(2)}, have $${(u.walletBalanceCents / 100).toFixed(2)}.` };
  }

  const newBal = u.walletBalanceCents - charge;
  const term = parseInt(u.planTerm ?? "1") || 1;
  const oldPlan = u.plan;

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { walletBalanceCents: newBal, plan: newPlan },
    }),
    prisma.walletTransaction.create({
      data: {
        userId,
        kind: "Charge",
        amountCents: -charge,
        description: `Plan upgrade · ${oldPlan} → ${newPlan} · ${monthsRemaining}mo prorate`,
        balanceAfterCents: newBal,
      },
    }),
    prisma.mailboxRenewal.create({
      data: {
        userId,
        termMonths: monthsRemaining,
        planAtRenewal: newPlan,
        amountCents: charge,
        paymentMethod: "Wallet",
        paidAt: new Date(),
        prevPlanDueDate: u.planDueDate,
        newPlanDueDate: u.planDueDate ?? new Date().toISOString().slice(0, 10),
        newPlanExpiresAt: u.planDueDate ? new Date(u.planDueDate + "T00:00:00Z") : new Date(),
        notes: `Member upgrade · ${oldPlan} → ${newPlan} · prorate`,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role,
        action: "plan.upgraded",
        entityType: "User",
        entityId: userId,
        metadata: JSON.stringify({
          oldPlan, newPlan, monthsRemaining, delta, chargeCents: charge,
          prevPlanDueDate: u.planDueDate,
        }),
      },
    }),
  ]);

  // Best-effort post-tx side effects.
  void (async () => {
    if (u.email) {
      try {
        await sendEmail({
          to: u.email,
          subject: `Plan upgraded · ${oldPlan} → ${newPlan} — NOHO Mailbox`,
          kind: "plan_upgraded",
          userId,
          html: emailUpgrade({
            firstName: (u.name ?? "there").split(" ")[0],
            suiteNumber: u.suiteNumber ?? "—",
            oldPlan, newPlan,
            chargedCents: charge,
            monthsRemaining,
            newDueDate: u.planDueDate ?? "—",
            walletBalanceAfterCents: newBal,
          }),
        });
      } catch (e) { console.error("[requestPlanUpgrade] email failed:", e); }
    }
    try {
      await fireWebhooks("plan.upgraded", {
        text: `⬆️ *${u.name ?? "(unknown)"}* (suite #${u.suiteNumber ?? "—"}) upgraded ${oldPlan} → ${newPlan} · charged $${(charge / 100).toFixed(2)}`,
        emoji: "⬆️",
        url: `${BASE_URL}/admin?tab=customers`,
        detail: { userId, oldPlan, newPlan, chargeCents: charge, monthsRemaining },
      });
    } catch (e) { console.error("[requestPlanUpgrade] webhook failed:", e); }
  })();

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { ok: true, chargedCents: charge, newPlan };
}

function emailUpgrade(args: {
  firstName: string;
  suiteNumber: string;
  oldPlan: string;
  newPlan: string;
  chargedCents: number;
  monthsRemaining: number;
  newDueDate: string;
  walletBalanceAfterCents: number;
}) {
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f8fd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8fd;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(14,34,64,0.10);">
        <tr><td style="background:linear-gradient(135deg,#337485 0%,#23596A 100%);padding:32px 40px;">
          <span style="font-size:20px;font-weight:900;color:#ffffff;">NOHO Mailbox</span>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);font-weight:600;">5062 Lankershim Blvd · North Hollywood, CA 91601</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#0e2240;">Welcome to ${args.newPlan} ⬆️</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Hi ${args.firstName}, your NOHO Mailbox plan is now <strong>${args.newPlan}</strong>. The new tier is active immediately, including any features that come with it.</p>
          <div style="background:#f0fdf4;border-left:3px solid #16a34a;border-radius:4px;padding:16px 20px;margin:16px 0;">
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Suite:</strong> #${args.suiteNumber}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>From:</strong> ${args.oldPlan}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>To:</strong> ${args.newPlan}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Prorated charge:</strong> $${(args.chargedCents / 100).toFixed(2)} · ${args.monthsRemaining} month${args.monthsRemaining === 1 ? "" : "s"} remaining</p>
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Same due date:</strong> ${args.newDueDate}</p>
            <p style="margin:0;font-size:13px;color:#334155;"><strong>Wallet balance:</strong> $${(args.walletBalanceAfterCents / 100).toFixed(2)}</p>
          </div>
          <p style="margin:0 0 16px;font-size:13px;color:#334155;line-height:1.55;">Your renewal date doesn't change — you only paid the difference for the months left on your term. The next full charge will be at the new ${args.newPlan} rate.</p>
          <a href="${BASE_URL}/dashboard?tab=invoices" style="display:inline-block;background:#337485;color:#ffffff;font-weight:800;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:100px;">View invoices</a>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
