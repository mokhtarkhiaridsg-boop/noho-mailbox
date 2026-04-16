"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

/**
 * Wallet + saved cards.
 *
 * NOTE: Real Square Cards on File integration requires the Square Web Payments
 * SDK on the client to tokenize a card into a "source_id". The server then calls
 * `square.cards.create({ idempotencyKey, sourceId, card: { customerId } })`.
 *
 * For this round we persist the local Card row + WalletTransaction. Adding the
 * Square API call is a one-line addition once the SDK source_id is captured —
 * see `addCard` below.
 */

export async function addCard(input: {
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  squareCardId?: string;
}) {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;

  const existing = await prisma.card.count({ where: { userId } });

  const card = await prisma.card.create({
    data: {
      userId,
      squareCardId: input.squareCardId ?? `local_${Date.now()}`,
      brand: input.brand,
      last4: input.last4,
      expMonth: input.expMonth,
      expYear: input.expYear,
      isDefault: existing === 0,
    },
  });

  if (existing === 0) {
    await prisma.user.update({
      where: { id: userId },
      data: { defaultCardId: card.id },
    });
  }

  revalidatePath("/dashboard");
  return { success: true, cardId: card.id };
}

export async function removeCard(cardId: string) {
  const sessionUser = await verifySession();
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card || card.userId !== sessionUser.id) {
    return { error: "Not authorized" };
  }
  await prisma.card.delete({ where: { id: cardId } });
  // Clear default pointer if needed
  await prisma.user.update({
    where: { id: sessionUser.id! },
    data: { defaultCardId: card.isDefault ? null : undefined },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function setDefaultCard(cardId: string) {
  const sessionUser = await verifySession();
  const card = await prisma.card.findUnique({ where: { id: cardId } });
  if (!card || card.userId !== sessionUser.id) {
    return { error: "Not authorized" };
  }
  await prisma.card.updateMany({
    where: { userId: sessionUser.id! },
    data: { isDefault: false },
  });
  await prisma.card.update({
    where: { id: cardId },
    data: { isDefault: true },
  });
  await prisma.user.update({
    where: { id: sessionUser.id! },
    data: { defaultCardId: cardId },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function topUpWallet(amountCents: number) {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;

  if (amountCents <= 0 || amountCents > 100000) {
    return { error: "Amount out of range" };
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalanceCents: true, defaultCardId: true },
  });
  if (!user) return { error: "User not found" };
  if (!user.defaultCardId) return { error: "Add a card first" };

  const newBalance = user.walletBalanceCents + amountCents;
  await prisma.user.update({
    where: { id: userId },
    data: { walletBalanceCents: newBalance },
  });
  await prisma.walletTransaction.create({
    data: {
      userId,
      kind: "TopUp",
      amountCents,
      description: `Wallet top-up`,
      balanceAfterCents: newBalance,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function requestDepositRefund() {
  const sessionUser = await verifySession();
  // Send an internal note to admin via audit log; actual refund is manual.
  await prisma.auditLog.create({
    data: {
      actorId: sessionUser.id ?? "",
      actorRole: "USER",
      action: "requestDepositRefund",
      entityType: "User",
      entityId: sessionUser.id ?? "",
    },
  });
  revalidatePath("/dashboard");
  return { success: true };
}
