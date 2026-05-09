"use server";

/**
 * iter-156 — Member referral leaderboard (Tier 10 #66).
 *
 * Reads from the existing iter-29 Referral schema and groups credited
 * referrals by referrerId — both for the current calendar month and
 * all-time. Returns top 10 in each window plus the calling member's
 * own rank/count so the dashboard can show "you're #4".
 *
 * "Credited" = `status = 'credited'` (a referee actually signed up
 * AND the credit fired). Pending invites that never converted don't
 * count — keeps the leaderboard honest.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";

export type LeaderboardEntry = {
  rank: number;
  userId: string;
  customerName: string;
  suiteNumber: string | null;
  count: number;
  creditCents: number;        // total $ value of their credited referrals
};

export type ReferralLeaderboardWindow = "month" | "all_time";

export type ReferralLeaderboard = {
  window: ReferralLeaderboardWindow;
  generatedAtIso: string;
  monthLabel: string;          // "May 2026" — relevant when window === "month"
  top: LeaderboardEntry[];
  totalCustomersWithCredited: number;
  totalCreditedReferrals: number;
};

export type MyReferralStanding = {
  // null when the member has zero credited referrals.
  monthRank: number | null;
  monthCount: number;
  allTimeRank: number | null;
  allTimeCount: number;
  totalCreditCents: number;
  topCount: number;            // count of the #1 player — useful for "you need N more to tie"
};

const WINDOW_BUCKETS = ["month", "all_time"] as const;

function startOfMonthUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

async function rollupForWindow(window: ReferralLeaderboardWindow): Promise<{
  top: LeaderboardEntry[];
  totalCustomers: number;
  totalCredited: number;
}> {
  const where: { status: string; creditedAt?: { gte: Date } } = { status: "credited" };
  if (window === "month") {
    where.creditedAt = { gte: startOfMonthUtc(new Date()) };
  }

  const grouped = await prisma.referral.groupBy({
    by: ["referrerId"],
    where,
    _count: { _all: true },
    _sum: { creditCents: true },
  });
  if (grouped.length === 0) return { top: [], totalCustomers: 0, totalCredited: 0 };

  // Resolve names for the top 25 (we display top 10 but cushion in
  // case ties bump someone in/out).
  const sorted = grouped
    .map((g) => ({
      userId: g.referrerId,
      count: g._count._all,
      creditCents: g._sum.creditCents ?? 0,
    }))
    .sort((a, b) => b.count - a.count || b.creditCents - a.creditCents)
    .slice(0, 25);

  const users = await prisma.user.findMany({
    where: { id: { in: sorted.map((s) => s.userId) } },
    select: { id: true, name: true, suiteNumber: true },
  });
  const userMap = new Map(users.map((u) => [u.id, u]));

  let prevCount = -1;
  let runningRank = 0;
  let trueIndex = 0;
  const top: LeaderboardEntry[] = [];
  for (const s of sorted) {
    trueIndex++;
    if (s.count !== prevCount) {
      runningRank = trueIndex;
      prevCount = s.count;
    }
    if (top.length >= 10 && runningRank > 10) break;
    const u = userMap.get(s.userId);
    top.push({
      rank: runningRank,
      userId: s.userId,
      customerName: u?.name ?? "(unknown)",
      suiteNumber: u?.suiteNumber ?? null,
      count: s.count,
      creditCents: s.creditCents,
    });
  }

  const totalCredited = grouped.reduce((sum, g) => sum + g._count._all, 0);
  return { top, totalCustomers: grouped.length, totalCredited };
}

export async function getReferralLeaderboard(input: {
  window?: ReferralLeaderboardWindow;
}): Promise<ReferralLeaderboard> {
  const win: ReferralLeaderboardWindow = WINDOW_BUCKETS.includes(input.window ?? "month")
    ? (input.window ?? "month")
    : "month";

  const roll = await rollupForWindow(win);
  const now = new Date();
  return {
    window: win,
    generatedAtIso: now.toISOString(),
    monthLabel: now.toLocaleString("en-US", { month: "long", year: "numeric" }),
    top: roll.top,
    totalCustomersWithCredited: roll.totalCustomers,
    totalCreditedReferrals: roll.totalCredited,
  };
}

// Member-only: my rank + count in both windows, total credit earned.
export async function getMyReferralStanding(): Promise<MyReferralStanding> {
  const session = await verifySession();
  const userId = session.id!;

  const startOfMonth = startOfMonthUtc(new Date());

  const [monthRoll, allTimeRoll, myMonthRow, myAllTimeRow] = await Promise.all([
    prisma.referral.groupBy({
      by: ["referrerId"],
      where: { status: "credited", creditedAt: { gte: startOfMonth } },
      _count: { _all: true },
      orderBy: { _count: { referrerId: "desc" } },
    }),
    prisma.referral.groupBy({
      by: ["referrerId"],
      where: { status: "credited" },
      _count: { _all: true },
      orderBy: { _count: { referrerId: "desc" } },
    }),
    prisma.referral.aggregate({
      where: { referrerId: userId, status: "credited", creditedAt: { gte: startOfMonth } },
      _count: { _all: true },
    }),
    prisma.referral.aggregate({
      where: { referrerId: userId, status: "credited" },
      _count: { _all: true },
      _sum: { creditCents: true },
    }),
  ]);

  // Compute my rank by counting groups with strictly more referrals.
  function rankFor(myUserId: string, list: typeof monthRoll): number | null {
    const me = list.find((r) => r.referrerId === myUserId);
    if (!me) return null;
    const ahead = list.filter((r) => r._count._all > me._count._all).length;
    return ahead + 1;
  }

  const monthCount = myMonthRow._count._all;
  const allTimeCount = myAllTimeRow._count._all;
  const monthRank = monthCount > 0 ? rankFor(userId, monthRoll) : null;
  const allTimeRank = allTimeCount > 0 ? rankFor(userId, allTimeRoll) : null;
  const topCount = monthRoll[0]?._count._all ?? 0;

  return {
    monthRank,
    monthCount,
    allTimeRank,
    allTimeCount,
    totalCreditCents: myAllTimeRow._sum.creditCents ?? 0,
    topCount,
  };
}

// Admin: same data + a few extra columns for the management view.
export async function getReferralLeaderboardAdmin(): Promise<{
  month: ReferralLeaderboard;
  allTime: ReferralLeaderboard;
}> {
  await verifyAdmin();
  const [m, a] = await Promise.all([
    getReferralLeaderboard({ window: "month" }),
    getReferralLeaderboard({ window: "all_time" }),
  ]);
  return { month: m, allTime: a };
}
