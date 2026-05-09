"use server";

/**
 * NOHO Mailbox — Credits (wallet top-up) requests.
 *
 * Members request credits from the dashboard; admin texts a Square payment
 * link, then marks Paid which credits the wallet.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function cuid() {
  return crypto.randomUUID();
}

const PRESETS = [2500, 5000, 10000, 25000];

export async function requestCredits(amountCents: number, notes?: string) {
  const session = await verifySession();
  const userId = session.id as string;

  if (!Number.isInteger(amountCents) || amountCents < 500 || amountCents > 100000) {
    return { error: "Amount must be between $5 and $1,000" };
  }
  if (!PRESETS.includes(amountCents) && amountCents % 100 !== 0) {
    return { error: "Use whole dollars" };
  }

  // Idempotency-ish: collapse pending requests for the same user
  const open = await (prisma as any).creditRequest.findFirst({
    where: { userId, status: { in: ["Pending", "LinkSent"] } },
  });
  if (open) {
    return { error: "You already have a pending credit request — we'll text you the link soon." };
  }

  await (prisma as any).creditRequest.create({
    data: {
      id: cuid(),
      userId,
      amountCents,
      status: "Pending",
      notes: notes ?? null,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function adminMarkCreditLinkSent(reqId: string, squareLink: string) {
  await verifyAdmin();
  if (!squareLink || !squareLink.startsWith("http")) {
    return { error: "Provide a valid Square link URL" };
  }
  await (prisma as any).creditRequest.update({
    where: { id: reqId },
    data: { status: "LinkSent", squareLink, linkSentAt: new Date() },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function adminMarkCreditPaid(reqId: string) {
  const admin = await verifyAdmin();

  const req = await (prisma as any).creditRequest.findUnique({ where: { id: reqId } });
  if (!req) return { error: "Request not found" };
  if (req.status === "Paid") return { error: "Already paid" };

  const user = await prisma.user.findUnique({
    where: { id: req.userId },
    select: { walletBalanceCents: true },
  });
  if (!user) return { error: "User not found" };

  const newBal = user.walletBalanceCents + req.amountCents;

  // Atomic: wallet credit + ledger row + request-status flip + audit log all
  // commit together. Was a `Promise.all` before — partial-failure risk left
  // the wallet drifted from the txn history; admin had no audit trail of
  // who marked the credit paid.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: req.userId },
      data: { walletBalanceCents: newBal },
    }),
    prisma.walletTransaction.create({
      data: {
        id: cuid(),
        userId: req.userId,
        kind: "TopUp",
        amountCents: req.amountCents,
        description: `Credit top-up via Square ($${(req.amountCents / 100).toFixed(2)})`,
        balanceAfterCents: newBal,
      },
    }),
    (prisma as any).creditRequest.update({
      where: { id: reqId },
      data: { status: "Paid", paidAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        id: cuid(),
        actorId: admin.id ?? "unknown",
        actorRole: "ADMIN",
        action: "credit.markPaid",
        entityType: "User",
        entityId: req.userId,
        metadata: JSON.stringify({
          creditRequestId: reqId,
          amountCents: req.amountCents,
          prevBalance: user.walletBalanceCents,
          newBalance: newBal,
        }),
      },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function adminCancelCreditRequest(reqId: string) {
  await verifyAdmin();
  await (prisma as any).creditRequest.update({
    where: { id: reqId },
    data: { status: "Cancelled" },
  });
  revalidatePath("/admin");
  return { success: true };
}

// iter-11.8 — Auto-match Square payments to outstanding credit requests.
//
// Admin texts a Square checkout link to a customer, marks the request
// "LinkSent". Customer pays. Square sync pulls the payment into our
// Payment table. This action correlates pending requests with synced
// payments by (userId, amount, time-window) so the admin sees a
// "✓ Square payment received · $X · 2h ago" badge instead of having
// to flip back and forth between Square dashboard + admin panel.
//
// Match criteria:
//   - payment.userId === request.userId  (after customer-link sync)
//   - payment.amount === request.amountCents
//   - payment.status === "COMPLETED"
//   - payment.squareCreatedAt within [linkSentAt - 1h, linkSentAt + 7d]
//     (allow slight clock-drift before, generous tail for slow payers)
//   - payment is not already linked to another paid request (de-dup)
export type CreditRequestPaymentMatch = {
  requestId: string;
  paymentId: string;
  squarePaymentId: string;
  amountCents: number;
  status: string;
  receiptUrl: string | null;
  paidAtIso: string;
};

export async function findPaymentMatchesForCreditRequests(
  reqIds: string[],
): Promise<CreditRequestPaymentMatch[]> {
  await verifyAdmin();
  if (reqIds.length === 0) return [];

  // Load the open credit requests we're matching against.
  const requests = await (prisma as any).creditRequest.findMany({
    where: { id: { in: reqIds } },
    select: {
      id: true,
      userId: true,
      amountCents: true,
      status: true,
      linkSentAt: true,
      createdAt: true,
    },
  }) as Array<{
    id: string;
    userId: string;
    amountCents: number;
    status: string;
    linkSentAt: Date | null;
    createdAt: Date;
  }>;

  if (requests.length === 0) return [];

  const userIds = Array.from(new Set(requests.map((r) => r.userId)));

  // Pull every COMPLETED payment for any user that has an open request,
  // within a generous time window. One DB round-trip → small in-memory
  // match step.
  const oldestAnchor = requests.reduce<Date>((min, r) => {
    const anchor = r.linkSentAt ?? r.createdAt;
    const back = new Date(anchor.getTime() - 60 * 60 * 1000); // 1h before
    return back < min ? back : min;
  }, new Date());

  const payments = await prisma.payment.findMany({
    where: {
      userId: { in: userIds },
      status: "COMPLETED",
      squareCreatedAt: { gte: oldestAnchor.toISOString() },
    },
    select: {
      id: true,
      squarePaymentId: true,
      userId: true,
      amount: true,
      status: true,
      receiptUrl: true,
      squareCreatedAt: true,
    },
  });

  // Track which payments are already claimed by an older Paid request
  // (so we don't surface the same payment as a match for two pending
  // requests).
  const claimedPaymentIds = new Set<string>();
  const paidRequests = await (prisma as any).creditRequest.findMany({
    where: {
      userId: { in: userIds },
      status: "Paid",
    },
    select: { id: true, userId: true, amountCents: true, paidAt: true },
  }) as Array<{ id: string; userId: string; amountCents: number; paidAt: Date | null }>;
  for (const pr of paidRequests) {
    // Find the payment most likely to have funded this paid request:
    // same user, same amount, closest createdAt to paidAt.
    const candidate = payments
      .filter((p) => p.userId === pr.userId && p.amount === pr.amountCents)
      .sort((a, b) => {
        const ta = pr.paidAt ? Math.abs(new Date(a.squareCreatedAt ?? 0).getTime() - pr.paidAt.getTime()) : 0;
        const tb = pr.paidAt ? Math.abs(new Date(b.squareCreatedAt ?? 0).getTime() - pr.paidAt.getTime()) : 0;
        return ta - tb;
      })[0];
    if (candidate) claimedPaymentIds.add(candidate.id);
  }

  const matches: CreditRequestPaymentMatch[] = [];
  for (const r of requests) {
    const anchor = r.linkSentAt ?? r.createdAt;
    const windowStart = new Date(anchor.getTime() - 60 * 60 * 1000);
    const windowEnd = new Date(anchor.getTime() + 7 * 24 * 60 * 60 * 1000);

    const candidate = payments.find((p) => {
      if (p.userId !== r.userId) return false;
      if (p.amount !== r.amountCents) return false;
      if (claimedPaymentIds.has(p.id)) return false;
      const t = new Date(p.squareCreatedAt ?? 0);
      return t >= windowStart && t <= windowEnd;
    });
    if (candidate) {
      matches.push({
        requestId: r.id,
        paymentId: candidate.id,
        squarePaymentId: candidate.squarePaymentId ?? "",
        amountCents: candidate.amount,
        status: candidate.status,
        receiptUrl: candidate.receiptUrl,
        paidAtIso: new Date(candidate.squareCreatedAt ?? Date.now()).toISOString(),
      });
      // Reserve so a second open request can't claim the same payment.
      claimedPaymentIds.add(candidate.id);
    }
  }

  return matches;
}
