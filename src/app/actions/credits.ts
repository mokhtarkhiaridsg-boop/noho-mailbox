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
