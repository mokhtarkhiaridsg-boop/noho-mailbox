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


// ─── iter-98: Recent referral activity for the member card ─────────────────
import { verifyAdmin } from "@/lib/dal";

export async function getMyReferralActivity(): Promise<Array<{
  id: string;
  status: string;
  refereeInitials: string | null;
  refereeFirstName: string | null;
  creditCents: number;
  createdAtIso: string;
  creditedAtIso: string | null;
}>> {
  const session = await verifySession();
  const rows = await prisma.referral.findMany({
    where: { referrerId: session.id! },
    orderBy: { createdAt: "desc" },
    take: 12,
    select: {
      id: true,
      status: true,
      refereeId: true,
      creditCents: true,
      createdAt: true,
      creditedAt: true,
    },
  });
  // Resolve referee names — we only show first name + initials so the
  // referrer doesn't see PII they shouldn't.
  const refereeIds = rows.map((r) => r.refereeId).filter((x): x is string => Boolean(x));
  const referees = refereeIds.length === 0
    ? []
    : await prisma.user.findMany({
        where: { id: { in: refereeIds } },
        select: { id: true, name: true },
      });
  const byId = new Map(referees.map((u) => [u.id, u] as const));
  return rows.map((r) => {
    const u = r.refereeId ? byId.get(r.refereeId) : undefined;
    const parts = (u?.name ?? "").trim().split(/\s+/);
    const refereeFirstName = parts[0] || null;
    const refereeInitials = parts.length === 0 ? null
      : parts.slice(0, 2).map((p) => p[0]).filter(Boolean).join("").toUpperCase();
    return {
      id: r.id,
      status: r.status,
      refereeInitials,
      refereeFirstName,
      creditCents: r.creditCents,
      createdAtIso: r.createdAt.toISOString(),
      creditedAtIso: r.creditedAt?.toISOString() ?? null,
    };
  });
}

// ─── iter-98: Admin leaderboard + roll-up ──────────────────────────────────
export async function getReferralLeaderboard(): Promise<{
  totalCredited: number;
  totalCreditedCents: number;
  totalPending: number;
  topReferrers: Array<{ userId: string; name: string | null; suiteNumber: string | null; conversions: number; earnedCents: number }>;
  recentConversions: Array<{ id: string; createdAtIso: string; creditedAtIso: string | null; creditCents: number; referrerName: string | null; refereeName: string | null }>;
}> {
  await verifyAdmin();
  const [credited, pending, allCredited] = await Promise.all([
    prisma.referral.count({ where: { status: "credited" } }),
    prisma.referral.count({ where: { status: "pending", refereeId: { not: null } } }),
    prisma.referral.findMany({
      where: { status: "credited" },
      select: { id: true, referrerId: true, refereeId: true, creditCents: true, createdAt: true, creditedAt: true },
      orderBy: { creditedAt: "desc" },
      take: 100,
    }),
  ]);

  const totalCreditedCents = allCredited.reduce((s, r) => s + (r.creditCents || 0) * 2, 0); // both parties get the credit
  // Tally per referrer.
  const tally = new Map<string, { conversions: number; earnedCents: number }>();
  for (const r of allCredited) {
    const t = tally.get(r.referrerId) ?? { conversions: 0, earnedCents: 0 };
    t.conversions += 1;
    t.earnedCents += r.creditCents;
    tally.set(r.referrerId, t);
  }
  const topIds = Array.from(tally.entries())
    .sort((a, b) => b[1].conversions - a[1].conversions)
    .slice(0, 10)
    .map(([id]) => id);
  const userIds = Array.from(new Set([...topIds, ...allCredited.slice(0, 12).map((r) => r.referrerId), ...allCredited.slice(0, 12).map((r) => r.refereeId).filter((x): x is string => Boolean(x))]));
  const users = userIds.length === 0
    ? []
    : await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, suiteNumber: true },
      });
  const userById = new Map(users.map((u) => [u.id, u] as const));

  return {
    totalCredited: credited,
    totalCreditedCents,
    totalPending: pending,
    topReferrers: topIds.map((id) => ({
      userId: id,
      name: userById.get(id)?.name ?? null,
      suiteNumber: userById.get(id)?.suiteNumber ?? null,
      conversions: tally.get(id)!.conversions,
      earnedCents: tally.get(id)!.earnedCents,
    })),
    recentConversions: allCredited.slice(0, 12).map((r) => ({
      id: r.id,
      createdAtIso: r.createdAt.toISOString(),
      creditedAtIso: r.creditedAt?.toISOString() ?? null,
      creditCents: r.creditCents,
      referrerName: userById.get(r.referrerId)?.name ?? null,
      refereeName: r.refereeId ? userById.get(r.refereeId)?.name ?? null : null,
    })),
  };
}
