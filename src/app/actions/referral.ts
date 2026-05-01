"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function cuid() {
  return crypto.randomUUID();
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
  const suffix = crypto.randomUUID().replace(/-/g, "").slice(0, 4).toUpperCase();
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

// `applyReferralCode` was moved to `src/lib/referral-internal.ts`. It used
// to be a server action exported from this file with `(code, newUserId)`,
// which any logged-in user could call to credit a stranger's wallet $10
// (and their own). The internal version is now imported by `auth.ts`
// during signup only and is not RPC-exposed.
