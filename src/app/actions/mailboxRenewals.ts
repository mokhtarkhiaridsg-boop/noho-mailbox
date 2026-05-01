"use server";

/**
 * NOHO Mailbox — Admin-driven mailbox renewals.
 *
 * Admin processes a renewal in-store (or via Square link, etc.) and the system:
 *   1. Snapshots the current plan + dates
 *   2. Advances planDueDate + planExpiresAt by N months
 *   3. Records a Payment row for revenue tracking
 *   4. Sends a receipt email to the customer
 *   5. Stores everything in MailboxRenewal for printable receipts and audit
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendMailboxRenewalReceipt } from "@/lib/email";

function cuid() {
  return crypto.randomUUID();
}

/** Add `months` whole calendar months to a UTC date, never moving it earlier. */
function addMonths(base: Date, months: number): Date {
  const d = new Date(base);
  const day = d.getUTCDate();
  d.setUTCMonth(d.getUTCMonth() + months);
  // Handle Feb-overflow (e.g. Mar 31 + 1mo = May 1 → snap back to Apr 30)
  if (d.getUTCDate() < day) d.setUTCDate(0);
  return d;
}

function fmtDateString(d: Date): string {
  // UTC components — planDueDate is store-local "YYYY-MM-DD" without TZ
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parsePlanDueDate(s: string | null): Date | null {
  if (!s) return null;
  // Stored as "YYYY-MM-DD" — parse as UTC midnight so date arithmetic
  // doesn't drift across the admin's local timezone boundary.
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d));
}

/** Today as UTC midnight — matches parsePlanDueDate's frame. */
function todayUtc(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export async function processMailboxRenewal(input: {
  userId: string;
  termMonths: 3 | 6 | 14;
  amountCents: number;
  paymentMethod: "Square" | "Cash" | "CardOnFile";
  /** Optional plan override — defaults to customer's current plan. */
  planOverride?: string;
  /** Optional standard price the client showed; server validates and recomputes
   * `priceOverridden` from this. If the admin's amount differs from the standard,
   * a reason is required (audit). Pass null/undef when the client doesn't have it. */
  standardAmountCents?: number | null;
  /** Required when priceOverridden OR amountCents=0 — captured on receipt. */
  reason?: string;
  notes?: string;
}) {
  const admin = await verifyAdmin();

  if (![3, 6, 14].includes(input.termMonths)) {
    return { error: "Term must be 3, 6, or 14 months." };
  }
  if (!Number.isInteger(input.amountCents) || input.amountCents < 0) {
    return { error: "Invalid amount." };
  }
  // Server-derived priceOverridden: trust the actual numbers, not the client flag.
  const priceOverridden =
    input.amountCents === 0 ||
    (typeof input.standardAmountCents === "number" &&
      input.standardAmountCents > 0 &&
      input.amountCents !== input.standardAmountCents);
  if (priceOverridden && !input.reason?.trim()) {
    return { error: "A reason is required for $0 or custom-price renewals (audit trail)." };
  }

  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      suiteNumber: true,
      plan: true,
      planDueDate: true,
      planExpiresAt: true,
      status: true,
      mailboxStatus: true,
    },
  });
  if (!user) return { error: "Customer not found." };
  const planAtRenewal = (input.planOverride?.trim() || user.plan || "").trim();
  if (!planAtRenewal) {
    return { error: "Customer has no plan assigned and none provided. Pick a plan before renewing." };
  }

  // Anchor renewal off the later of (today UTC, current planDueDate / planExpiresAt).
  // This way renewing early extends rather than truncates. All comparisons are UTC.
  const now = new Date();
  const today = todayUtc();
  const currentDue = parsePlanDueDate(user.planDueDate);
  const currentExpires = user.planExpiresAt ?? null;
  const anchor = [today, currentDue, currentExpires]
    .filter((d): d is Date => !!d)
    .reduce((a, b) => (a > b ? a : b));

  const newDue = addMonths(anchor, input.termMonths);
  const newDueStr = fmtDateString(newDue);
  const newExpires = newDue;

  const renewalId = cuid();
  const paidAt = now;

  // Build a notes string that captures the audit trail (reason + admin notes).
  const notesParts: string[] = [];
  if (priceOverridden && input.amountCents > 0) notesParts.push(`Custom price`);
  if (input.amountCents === 0) notesParts.push(`No-charge`);
  if (input.reason?.trim()) notesParts.push(`Reason: ${input.reason.trim()}`);
  if (input.planOverride && input.planOverride !== user.plan) {
    notesParts.push(`Plan change: ${user.plan ?? "—"} → ${planAtRenewal}`);
  }
  if (input.notes?.trim()) notesParts.push(input.notes.trim());
  const combinedNotes = notesParts.join(" · ") || null;

  // Persist renewal + payment + user-update atomically.
  // Auto-reactivate the customer if they were Suspended/Expired and just paid.
  const reactivate = input.amountCents > 0 && (
    user.status !== "Active" || user.mailboxStatus === "Suspended" || user.mailboxStatus === "Pending"
  );

  try {
    await prisma.$transaction([
      (prisma as any).mailboxRenewal.create({
        data: {
          id: renewalId,
          userId: input.userId,
          termMonths: input.termMonths,
          planAtRenewal,
          amountCents: input.amountCents,
          paymentMethod: input.paymentMethod,
          paidAt,
          prevPlanDueDate: user.planDueDate,
          newPlanDueDate: newDueStr,
          prevPlanExpiresAt: currentExpires,
          newPlanExpiresAt: newExpires,
          notes: combinedNotes,
          createdById: admin.id ?? null,
        },
      }),
      prisma.user.update({
        where: { id: input.userId },
        data: {
          plan: planAtRenewal,
          planDueDate: newDueStr,
          planExpiresAt: newExpires,
          planTerm: String(input.termMonths),
          ...(reactivate ? { status: "Active", mailboxStatus: "Active" } : {}),
        },
      }),
      prisma.payment.create({
        data: {
          id: cuid(),
          squarePaymentId: `renewal-${renewalId}`,
          userId: input.userId,
          amount: input.amountCents,
          currency: "USD",
          status: "COMPLETED",
          sourceType: input.paymentMethod,
          note: `Mailbox renewal · ${input.termMonths} months · ${planAtRenewal}${priceOverridden ? " · custom price" : ""}`,
          squareCreatedAt: paidAt.toISOString(),
        },
      }),
      // Audit log inside the same transaction — voidMailboxRenewal already
      // writes one on the inverse path, this closes the loop on the create
      // path so admin actions on customer money are always traceable.
      prisma.auditLog.create({
        data: {
          id: cuid(),
          actorId: admin.id ?? "unknown",
          actorRole: "ADMIN",
          action: "mailbox.renewal.process",
          entityType: "User",
          entityId: input.userId,
          metadata: JSON.stringify({
            renewalId,
            planAtRenewal,
            termMonths: input.termMonths,
            amountCents: input.amountCents,
            standardAmountCents: input.standardAmountCents ?? null,
            priceOverridden,
            paymentMethod: input.paymentMethod,
            prevPlanDueDate: user.planDueDate,
            newPlanDueDate: newDueStr,
            reason: input.reason ?? null,
          }),
        },
      }),
    ]);
  } catch (e) {
    console.error("Mailbox renewal transaction failed:", e);
    return { error: "Renewal failed mid-write — no changes saved. Try again." };
  }

  // Send the receipt email (logs to EmailLog, never throws).
  let receiptResult: { logId: string; status: string } | null = null;
  if (user.email) {
    try {
      receiptResult = await sendMailboxRenewalReceipt({
        toEmail: user.email,
        userId: user.id,
        firstName: user.name.split(" ")[0] ?? user.name,
        suiteNumber: user.suiteNumber ?? "—",
        plan: planAtRenewal,
        termMonths: input.termMonths,
        amountCents: input.amountCents,
        paymentMethod: input.paymentMethod,
        paidAt,
        newDueDateStr: newDueStr,
        renewalId,
      });
    } catch (e) {
      console.error("Renewal receipt send failed:", e);
    }
  }

  // Persist email send status to the renewal row. Wrapped in try-catch
  // because a failure here would otherwise be silent (the renewal is already
  // committed — the user is renewed; we just don't want to lose the email log
  // pointer or invent a phantom 'sent' state).
  try {
    if (receiptResult?.status === "sent") {
      await (prisma as any).mailboxRenewal.update({
        where: { id: renewalId },
        data: {
          receiptSentAt: new Date(),
          receiptEmailLogId: receiptResult.logId,
        },
      });
    } else if (receiptResult?.logId) {
      await (prisma as any).mailboxRenewal.update({
        where: { id: renewalId },
        data: { receiptEmailLogId: receiptResult.logId },
      });
    }
  } catch (e) {
    console.error("Renewal receipt-status update failed (renewal still committed):", e);
  }

  revalidatePath("/admin");
  return {
    success: true as const,
    renewalId,
    newDueDate: newDueStr,
    receiptStatus: receiptResult?.status ?? "skipped",
  };
}

export async function getMailboxRenewals(limit = 10) {
  await verifyAdmin();
  const rows = await (prisma as any).mailboxRenewal.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, suiteNumber: true, email: true } } },
  });
  return rows;
}

export async function resendRenewalReceipt(renewalId: string) {
  await verifyAdmin();
  const renewal = await (prisma as any).mailboxRenewal.findUnique({
    where: { id: renewalId },
    include: { user: { select: { name: true, email: true, suiteNumber: true } } },
  });
  if (!renewal) return { error: "Renewal not found" };
  if (!renewal.user?.email) return { error: "Customer has no email on file" };

  const result = await sendMailboxRenewalReceipt({
    toEmail: renewal.user.email,
    userId: renewal.userId,
    firstName: renewal.user.name.split(" ")[0] ?? renewal.user.name,
    suiteNumber: renewal.user.suiteNumber ?? "—",
    plan: renewal.planAtRenewal,
    termMonths: renewal.termMonths,
    amountCents: renewal.amountCents,
    paymentMethod: renewal.paymentMethod,
    paidAt: new Date(renewal.paidAt),
    newDueDateStr: renewal.newPlanDueDate,
    renewalId: renewal.id,
  });

  await (prisma as any).mailboxRenewal.update({
    where: { id: renewalId },
    data: {
      receiptSentAt: result.status === "sent" ? new Date() : renewal.receiptSentAt,
      receiptEmailLogId: result.logId,
    },
  });

  revalidatePath("/admin");
  return { success: true as const, status: result.status };
}
