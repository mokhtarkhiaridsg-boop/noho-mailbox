"use server";

/**
 * NOHO Mailbox — Billing Actions
 * Late fee enforcement, plan expiry warnings, and auto-renewal.
 * These can be triggered manually by admin or via a cron job (Vercel Cron).
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { notifyPlanExpiring } from "@/app/actions/notifications";

// ─── Plan pricing (cents/month) ───────────────────────────────────────────────

const PLAN_MONTHLY_CENTS: Record<string, number> = {
  Basic:    9500,   // $95/mo
  Business: 17500,  // $175/mo
  Premium:  27500,  // $275/mo
};

const LATE_FEE_CENTS = 1500; // $15
const GRACE_PERIOD_DAYS = 10;
const WARNING_DAYS = 14;

function cuid() {
  return crypto.randomUUID();
}

// ─── Apply late fee to a single customer ─────────────────────────────────────

export async function applyLateFee(userId: string) {
  await verifyAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, walletBalanceCents: true, planDueDate: true },
  });
  if (!user) return { error: "User not found" };
  if (!user.planDueDate) return { error: "No due date set" };

  // Check: must be past due
  const due = new Date(user.planDueDate + "T00:00:00Z");
  const now = new Date();
  if (due > now) return { error: "Plan is not yet past due" };

  const newBal = Math.max(0, user.walletBalanceCents - LATE_FEE_CENTS);

  // Atomic: wallet debit + ledger row must commit together so the wallet
  // balance never drifts from the transaction history.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { walletBalanceCents: newBal },
    }),
    prisma.walletTransaction.create({
      data: {
        id: cuid(),
        userId,
        kind: "Charge",
        amountCents: -LATE_FEE_CENTS,
        description: `Late fee — plan due ${user.planDueDate}`,
        balanceAfterCents: newBal,
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, feeApplied: LATE_FEE_CENTS };
}

// ─── Run auto-renewal for a single customer ───────────────────────────────────

export async function runAutoRenewal(userId: string) {
  await verifyAdmin();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      planTerm: true,
      planDueDate: true,
      planAutoRenew: true,
      walletBalanceCents: true,
    },
  });

  if (!user || !user.plan) return { error: "User or plan not found" };
  if (!user.planAutoRenew) return { error: "Auto-renewal not enabled for this user" };
  if (!user.planDueDate) return { error: "No due date set" };

  const monthlyRate = PLAN_MONTHLY_CENTS[user.plan] ?? 9500;
  const termMonths = parseInt(user.planTerm ?? "1") || 1;
  const chargeAmount = monthlyRate * termMonths;

  if (user.walletBalanceCents < chargeAmount) {
    return { error: `Insufficient wallet balance — needs $${(chargeAmount / 100).toFixed(2)}, has $${(user.walletBalanceCents / 100).toFixed(2)}` };
  }

  // Extend due date — UTC-safe so the date doesn't drift across DST/timezone.
  // Using setUTCMonth avoids the local-TZ trap of setMonth() on a UTC-parsed Date.
  const currentDue = new Date(user.planDueDate + "T00:00:00Z");
  const nextDue = new Date(currentDue);
  const dueDay = nextDue.getUTCDate();
  nextDue.setUTCMonth(nextDue.getUTCMonth() + termMonths);
  // Handle Feb-overflow (e.g. Mar 31 + 1mo = May 1 → snap back to Apr 30)
  if (nextDue.getUTCDate() < dueDay) nextDue.setUTCDate(0);
  const nextDueStr = `${nextDue.getUTCFullYear()}-${String(nextDue.getUTCMonth() + 1).padStart(2, "0")}-${String(nextDue.getUTCDate()).padStart(2, "0")}`;

  const newBal = user.walletBalanceCents - chargeAmount;

  // Atomic: due-date advance + wallet debit + ledger entry. If any one fails
  // the whole renewal must roll back; otherwise we'd extend the plan without
  // charging (or charge without extending), both nightmares to reconcile.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        planDueDate: nextDueStr,
        walletBalanceCents: newBal,
        status: "Active",
      },
    }),
    prisma.walletTransaction.create({
      data: {
        id: cuid(),
        userId,
        kind: "Charge",
        amountCents: -chargeAmount,
        description: `${user.plan} plan renewal (${termMonths} month${termMonths !== 1 ? "s" : ""}) → due ${nextDueStr}`,
        balanceAfterCents: newBal,
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, nextDueDate: nextDueStr, charged: chargeAmount };
}

// ─── Batch: send plan expiry warnings ─────────────────────────────────────────
// Notify customers whose plan is due in 14, 7, or 3 days

export async function sendExpiryWarnings() {
  await verifyAdmin();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const customers = await prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
      planDueDate: { not: null },
      status: "Active",
    },
    select: { id: true, planDueDate: true, name: true },
  });

  let notified = 0;
  for (const c of customers) {
    if (!c.planDueDate) continue;
    const due = new Date(c.planDueDate + "T00:00:00Z");
    const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    // Notify at 14, 7, and 3 days
    if ([14, 7, 3].includes(daysLeft)) {
      try {
        await notifyPlanExpiring({
          userId: c.id,
          daysLeft,
          planDueDate: c.planDueDate,
        });
        notified++;
      } catch (e) {
        // Non-fatal — keep batch going — but log so we notice when warnings stop.
        console.error(`[sendExpiryWarnings] failed for user ${c.id} (${daysLeft}d):`, e);
      }
    }
  }

  revalidatePath("/admin");
  return { success: true, notified };
}

// ─── Batch: apply late fees to all overdue accounts ───────────────────────────
// Run daily — applies $15 fee to accounts 10+ days past due

export async function runLateFeesBatch() {
  await verifyAdmin();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const customers = await prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
      planDueDate: { not: null },
      status: "Active",
    },
    select: { id: true, planDueDate: true, name: true, email: true, walletBalanceCents: true },
  });

  let feesApplied = 0;
  const errors: string[] = [];

  for (const c of customers) {
    if (!c.planDueDate) continue;
    const due = new Date(c.planDueDate + "T00:00:00Z");
    const daysOverdue = Math.floor((today.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));

    // Apply fee starting at the grace-period cutoff and beyond, but only if
    // we haven't already charged a late fee for this overdue cycle. Without
    // this idempotency guard a single missed cron day means the fee never
    // fires (== day 10 was the old, fragile rule), and a doubled cron run
    // would double-charge. We treat "any late-fee txn since the planDueDate"
    // as proof of charge for this cycle.
    if (daysOverdue >= GRACE_PERIOD_DAYS) {
      try {
        const sincePlanDue = await prisma.walletTransaction.findFirst({
          where: {
            userId: c.id,
            kind: "Charge",
            description: { contains: "Late fee" },
            createdAt: { gte: due },
          },
          select: { id: true },
        });
        if (sincePlanDue) continue;

        const newBal = Math.max(0, c.walletBalanceCents - LATE_FEE_CENTS);
        await prisma.$transaction([
          prisma.user.update({
            where: { id: c.id },
            data: { walletBalanceCents: newBal, status: "Expired" },
          }),
          prisma.walletTransaction.create({
            data: {
              id: cuid(),
              userId: c.id,
              kind: "Charge",
              amountCents: -LATE_FEE_CENTS,
              description: `Late fee — plan ${daysOverdue} days overdue`,
              balanceAfterCents: newBal,
            },
          }),
        ]);
        feesApplied++;
      } catch (e: any) {
        errors.push(`${c.name}: ${e.message}`);
      }
    }
  }

  revalidatePath("/admin");
  return { success: true, feesApplied, errors };
}

// ─── Admin: toggle auto-renewal for a customer ────────────────────────────────

export async function setAutoRenewal(userId: string, enabled: boolean) {
  await verifyAdmin();
  await prisma.user.update({
    where: { id: userId },
    data: { planAutoRenew: enabled },
  });
  revalidatePath("/admin");
  return { success: true };
}

// ─── Admin: get billing overview ─────────────────────────────────────────────

export async function getBillingOverview() {
  await verifyAdmin();

  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const allCustomers = await prisma.user.findMany({
    where: { role: { not: "ADMIN" }, planDueDate: { not: null } },
    select: {
      id: true,
      name: true,
      email: true,
      plan: true,
      planDueDate: true,
      planAutoRenew: true,
      walletBalanceCents: true,
      status: true,
    },
  });

  const overdue: typeof allCustomers = [];
  const warning: typeof allCustomers = [];
  const upToDate: typeof allCustomers = [];

  for (const c of allCustomers) {
    if (!c.planDueDate) continue;
    const due = new Date(c.planDueDate + "T00:00:00Z");
    const daysLeft = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysLeft < 0) overdue.push(c);
    else if (daysLeft <= WARNING_DAYS) warning.push(c);
    else upToDate.push(c);
  }

  return { overdue, warning, upToDate };
}

// ─── Auto-renewal batch — runs all due/overdue auto-renew customers in one shot
// Designed for the Mailbox Center "Run today's auto-renewals" button. Each
// renewal uses the customer's wallet balance (already-paid credits). Returns
// per-customer outcomes so admin sees which succeeded vs. why others failed.
export async function runDueAutoRenewals() {
  await verifyAdmin();

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];

  const due = await prisma.user.findMany({
    where: {
      planAutoRenew: true,
      planDueDate: { not: null, lte: todayStr },
      status: { in: ["Active", "Expired"] },
    },
    select: { id: true, name: true, suiteNumber: true, planDueDate: true },
    orderBy: { planDueDate: "asc" },
    take: 200,
  });

  const results: Array<{
    userId: string;
    name: string;
    suiteNumber: string | null;
    success: boolean;
    error?: string;
  }> = [];

  for (const u of due) {
    try {
      const res = await runAutoRenewal(u.id);
      const failed = "error" in res && !!res.error;
      results.push({
        userId: u.id,
        name: u.name,
        suiteNumber: u.suiteNumber,
        success: !failed,
        error: failed ? (res as { error: string }).error : undefined,
      });
    } catch (e) {
      results.push({
        userId: u.id,
        name: u.name,
        suiteNumber: u.suiteNumber,
        success: false,
        error: e instanceof Error ? e.message : "unknown error",
      });
    }
  }

  const succeeded = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  revalidatePath("/admin");
  return {
    success: true as const,
    candidates: due.length,
    succeeded,
    failed,
    results,
  };
}
