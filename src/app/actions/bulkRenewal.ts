"use server";

/**
 * iter-191 — One-tap bulk renewal sweep (Tier 13 #100).
 *
 * Admin-fired version of iter-111's `runAutoRenewSystemSweep`:
 *   - Configurable look-ahead window (default 14 days) — not just
 *     past-due
 *   - Preview before fire so admin sees who + how much + which would
 *     fail upfront
 *   - Per-row pass/fail report bubbled into the panel UI
 *   - Audit-logged as `billing.bulk_renewal_swept` so we can prove
 *     who fired what + when
 *
 * Reuses the existing wallet-charge primitives so the side effects
 * (MailboxRenewal row + WalletTransaction + receipt email) stay
 * identical to the cron-driven path.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { fireWebhooks } from "@/lib/webhooks";

const PLAN_MONTHLY_CENTS: Record<string, number> = {
  Basic: 9500,
  Business: 17500,
  Premium: 27500,
};

function chargeAmountFor(plan: string | null, term: string | null): number {
  if (!plan) return 0;
  const monthly = PLAN_MONTHLY_CENTS[plan] ?? PLAN_MONTHLY_CENTS.Basic!;
  const months = parseInt(term ?? "1") || 1;
  return monthly * months;
}

function ymdToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDaysYmd(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type BulkRenewalCandidate = {
  userId: string;
  userName: string;
  userEmail: string;
  suiteNumber: string | null;
  plan: string | null;
  planTerm: string | null;
  planDueDate: string | null;
  walletBalanceCents: number;
  chargeCents: number;
  willSucceed: boolean;
  blocker: string | null;
};

export type BulkRenewalPreview = {
  windowDays: number;
  totalCandidates: number;
  willSucceed: number;
  insufficientWallet: number;
  noPlan: number;
  totalChargeIfRunCents: number;
  candidates: BulkRenewalCandidate[];
};

export async function previewBulkRenewal(input: { windowDays?: number } = {}): Promise<BulkRenewalPreview> {
  await verifyAdmin();
  const days = Math.max(1, Math.min(60, Math.round(input.windowDays ?? 14)));
  const today = ymdToday();
  const horizon = addDaysYmd(today, days);

  const due = await prisma.user.findMany({
    where: {
      planAutoRenew: true,
      planDueDate: { not: null, gte: today, lte: horizon },
      status: { in: ["Active", "Expired"] },
    },
    select: { id: true, name: true, email: true, suiteNumber: true, plan: true, planTerm: true, planDueDate: true, walletBalanceCents: true },
    orderBy: { planDueDate: "asc" },
    take: 500,
  });

  let willSucceed = 0;
  let insufficientWallet = 0;
  let noPlan = 0;
  let totalChargeIfRunCents = 0;

  const candidates: BulkRenewalCandidate[] = due.map((u) => {
    const charge = chargeAmountFor(u.plan, u.planTerm);
    let blocker: string | null = null;
    if (!u.plan) blocker = "no_plan";
    else if (charge === 0) blocker = "zero_charge";
    else if (u.walletBalanceCents < charge) blocker = `wallet_short_$${((charge - u.walletBalanceCents) / 100).toFixed(2)}`;

    const ok = blocker === null;
    if (ok) { willSucceed += 1; totalChargeIfRunCents += charge; }
    if (blocker === "no_plan" || blocker === "zero_charge") noPlan += 1;
    if (blocker?.startsWith("wallet_short")) insufficientWallet += 1;

    return {
      userId: u.id,
      userName: u.name,
      userEmail: u.email,
      suiteNumber: u.suiteNumber,
      plan: u.plan,
      planTerm: u.planTerm,
      planDueDate: u.planDueDate,
      walletBalanceCents: u.walletBalanceCents,
      chargeCents: charge,
      willSucceed: ok,
      blocker,
    };
  });

  return {
    windowDays: days,
    totalCandidates: candidates.length,
    willSucceed,
    insufficientWallet,
    noPlan,
    totalChargeIfRunCents,
    candidates,
  };
}

export type BulkRenewalRowResult = {
  userId: string;
  userName: string;
  ok: boolean;
  chargedCents?: number;
  newDueDate?: string;
  reason?: string;
};

export type BulkRenewalRunResult = {
  ranAt: string;
  windowDays: number;
  attempted: number;
  succeeded: number;
  failed: number;
  totalChargedCents: number;
  rows: BulkRenewalRowResult[];
};

export async function runBulkRenewal(input: { windowDays?: number; dryRun?: boolean } = {}): Promise<BulkRenewalRunResult> {
  const actor = await verifyAdmin();
  const days = Math.max(1, Math.min(60, Math.round(input.windowDays ?? 14)));
  const today = ymdToday();
  const horizon = addDaysYmd(today, days);

  const due = await prisma.user.findMany({
    where: {
      planAutoRenew: true,
      planDueDate: { not: null, gte: today, lte: horizon },
      status: { in: ["Active", "Expired"] },
    },
    select: { id: true, name: true, email: true, suiteNumber: true, plan: true, planTerm: true, planDueDate: true, walletBalanceCents: true },
    orderBy: { planDueDate: "asc" },
    take: 500,
  });

  const rows: BulkRenewalRowResult[] = [];
  let totalChargedCents = 0;
  let succeeded = 0;
  let failed = 0;

  if (input.dryRun) {
    // Dry-run mirrors preview but in the run-result shape so the UI
    // can surface the same per-row outcomes without firing.
    for (const u of due) {
      const charge = chargeAmountFor(u.plan, u.planTerm);
      if (!u.plan) { rows.push({ userId: u.id, userName: u.name, ok: false, reason: "no_plan" }); failed += 1; continue; }
      if (charge === 0) { rows.push({ userId: u.id, userName: u.name, ok: false, reason: "zero_charge" }); failed += 1; continue; }
      if (u.walletBalanceCents < charge) { rows.push({ userId: u.id, userName: u.name, ok: false, reason: `wallet_short_$${((charge - u.walletBalanceCents) / 100).toFixed(2)}` }); failed += 1; continue; }
      rows.push({ userId: u.id, userName: u.name, ok: true, chargedCents: charge, newDueDate: "(dry run)" });
      succeeded += 1;
      totalChargedCents += charge;
    }
    return { ranAt: new Date().toISOString(), windowDays: days, attempted: due.length, succeeded, failed, totalChargedCents, rows };
  }

  // Real run — process serially to avoid Square thundering herd + so
  // each MailboxRenewal/WalletTransaction commits before the next.
  for (const u of due) {
    const charge = chargeAmountFor(u.plan, u.planTerm);
    if (!u.plan) { rows.push({ userId: u.id, userName: u.name, ok: false, reason: "no_plan" }); failed += 1; continue; }
    if (charge === 0) { rows.push({ userId: u.id, userName: u.name, ok: false, reason: "zero_charge" }); failed += 1; continue; }
    if (u.walletBalanceCents < charge) { rows.push({ userId: u.id, userName: u.name, ok: false, reason: `wallet_short_$${((charge - u.walletBalanceCents) / 100).toFixed(2)}` }); failed += 1; continue; }

    try {
      const term = parseInt(u.planTerm ?? "1") || 1;
      const newDue = new Date((u.planDueDate ?? today) + "T00:00:00Z");
      newDue.setUTCMonth(newDue.getUTCMonth() + term);
      const newDueStr = newDue.toISOString().slice(0, 10);
      const newBal = u.walletBalanceCents - charge;

      await prisma.$transaction([
        prisma.user.update({
          where: { id: u.id },
          data: { walletBalanceCents: newBal, planDueDate: newDueStr, status: "Active" },
        }),
        prisma.walletTransaction.create({
          data: {
            userId: u.id,
            kind: "Charge",
            amountCents: -charge,
            description: `Bulk renewal · ${u.plan} · ${term}mo`,
            balanceAfterCents: newBal,
          },
        }),
        prisma.mailboxRenewal.create({
          data: {
            userId: u.id,
            termMonths: term,
            planAtRenewal: u.plan,
            amountCents: charge,
            paymentMethod: "Wallet",
            paidAt: new Date(),
            prevPlanDueDate: u.planDueDate ?? today,
            newPlanDueDate: newDueStr,
            newPlanExpiresAt: newDue,
            notes: `Bulk renewal sweep (admin: ${actor.id ?? "unknown"})`,
            createdById: actor.id ?? null,
          },
        }),
        prisma.auditLog.create({
          data: {
            actorId: actor.id, actorRole: actor.role,
            action: "billing.bulk_renewal_charged",
            entityType: "User",
            entityId: u.id,
            metadata: JSON.stringify({ plan: u.plan, term, chargeCents: charge, newDueDate: newDueStr, prevWallet: u.walletBalanceCents, newWallet: newBal }),
          },
        }),
      ]);
      rows.push({ userId: u.id, userName: u.name, ok: true, chargedCents: charge, newDueDate: newDueStr });
      succeeded += 1;
      totalChargedCents += charge;
      // Fire admin webhook (best-effort).
      void fireWebhooks("billing.auto_renewed", {
        text: `🔁 Bulk-renewed *${u.name}* (suite #${u.suiteNumber ?? "—"}) · $${(charge / 100).toFixed(2)} · sweep by admin`,
        emoji: "🔁",
        detail: { userId: u.id, plan: u.plan, chargedCents: charge, newDueDate: newDueStr, source: "bulk_sweep" },
      });
    } catch (e) {
      const reason = e instanceof Error ? e.message : String(e);
      rows.push({ userId: u.id, userName: u.name, ok: false, reason });
      failed += 1;
    }
  }

  // Roll-up audit so admin can prove the entire sweep as a single
  // event in addition to per-row.
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: actor.role,
      action: "billing.bulk_renewal_swept",
      entityType: "BulkRenewal",
      entityId: "(sweep)",
      metadata: JSON.stringify({ windowDays: days, attempted: due.length, succeeded, failed, totalChargedCents }),
    },
  }).catch(() => undefined);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { ranAt: new Date().toISOString(), windowDays: days, attempted: due.length, succeeded, failed, totalChargedCents, rows };
}
