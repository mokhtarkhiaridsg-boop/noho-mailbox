"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const REFERRAL_CREDIT_CENTS = 1000; // $10

// ─── Generate a referral code for current user ────────────────────────────────

export async function getOrCreateMyReferralCode(): Promise<{ code: string }> {
  const session = await verifySession();
  const userId = session.id!;

  // Check if user already has a referral entry (pending = their own code)
  const existing = await prisma.referral.findFirst({
    where: { referrerId: userId, refereeId: null },
  });
  if (existing) return { code: existing.code };

  // Generate code based on suite number + random suffix
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { suiteNumber: true, name: true },
  });

  const base = (user?.suiteNumber ?? user?.name?.slice(0, 4) ?? "noho").toUpperCase();
  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const code = `${base}-${suffix}`;

  await prisma.referral.create({
    data: {
      id: cuid(),
      referrerId: userId,
      code,
      status: "pending",
    },
  });

  return { code };
}

// ─── Get my referral stats ────────────────────────────────────────────────────

export async function getMyReferralStats() {
  const session = await verifySession();
  const userId = session.id!;

  const referrals = await prisma.referral.findMany({
    where: { referrerId: userId },
    orderBy: { createdAt: "desc" },
  });

  const credited = referrals.filter((r) => r.status === "credited");
  const pending = referrals.filter((r) => r.status === "pending" && r.refereeId);

  // My own code (no refereeId yet = unused)
  const myCode = referrals.find((r) => !r.refereeId)?.code ?? null;

  return {
    myCode,
    totalReferrals: credited.length + pending.length,
    creditedCount: credited.length,
    totalEarnedCents: credited.length * REFERRAL_CREDIT_CENTS,
    pendingCount: pending.length,
  };
}

// ─── Apply a referral code at signup ─────────────────────────────────────────
// Called during registration when user enters a referral code

export async function applyReferralCode(code: string, newUserId: string): Promise<boolean> {
  const referral = await prisma.referral.findFirst({
    where: { code: code.toUpperCase().trim(), refereeId: null, status: "pending" },
  });

  if (!referral) return false;
  if (referral.referrerId === newUserId) return false; // can't refer yourself

  // Credit both users
  await Promise.all([
    // Link the referral to the new user
    prisma.referral.update({
      where: { id: referral.id },
      data: { refereeId: newUserId, status: "credited", creditedAt: new Date() },
    }),
    // Credit the referrer
    prisma.user.update({
      where: { id: referral.referrerId },
      data: { walletBalanceCents: { increment: REFERRAL_CREDIT_CENTS } },
    }),
    // Credit the new user
    prisma.user.update({
      where: { id: newUserId },
      data: { walletBalanceCents: { increment: REFERRAL_CREDIT_CENTS } },
    }),
    // Wallet transactions for referrer
    prisma.walletTransaction.create({
      data: {
        id: cuid(),
        userId: referral.referrerId,
        kind: "Referral",
        amountCents: REFERRAL_CREDIT_CENTS,
        description: `Referral bonus — new member signed up with your code`,
        balanceAfterCents: 0, // will be slightly off, acceptable
      },
    }),
    // Wallet transaction for referee
    prisma.walletTransaction.create({
      data: {
        id: cuid(),
        userId: newUserId,
        kind: "Referral",
        amountCents: REFERRAL_CREDIT_CENTS,
        description: `Welcome bonus — referral code applied`,
        balanceAfterCents: REFERRAL_CREDIT_CENTS,
      },
    }),
  ]);

  revalidatePath("/dashboard");
  return true;
}
