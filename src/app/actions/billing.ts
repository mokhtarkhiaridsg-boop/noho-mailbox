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
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
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

  await Promise.all([
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

  // Extend due date
  const currentDue = new Date(user.planDueDate + "T00:00:00Z");
  const nextDue = new Date(currentDue);
  nextDue.setMonth(nextDue.getMonth() + termMonths);
  const nextDueStr = nextDue.toISOString().split("T")[0];

  const newBal = user.walletBalanceCents - chargeAmount;

  await Promise.all([
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
      } catch { /* non-fatal */ }
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

    // Apply fee at exactly day 10 (end of grace period)
    if (daysOverdue === GRACE_PERIOD_DAYS) {
      try {
        const newBal = Math.max(0, c.walletBalanceCents - LATE_FEE_CENTS);
        await Promise.all([
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
