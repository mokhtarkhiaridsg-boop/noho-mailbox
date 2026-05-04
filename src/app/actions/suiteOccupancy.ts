"use server";

// iter-117 — Mailbox suite occupancy heatmap.
//
// Returns one cell per suite # in the range (min..max occupied) with:
//   - "occupied_active"  → has owner + ≥1 mail event in last 30d
//   - "occupied_dormant" → has owner + no mail events in last 30d
//   - "vacant"           → suite # exists in the range but no owner
//
// Plus the top-line stats (total occupied, vacancy %, dormant %, mail
// volume in window). Drives the admin heatmap. No schema changes.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";

export type SuiteCellStatus = "occupied_active" | "occupied_dormant" | "vacant";

export type SuiteCell = {
  suite: string;        // human label, e.g. "042"
  numericRank: number;  // 42, used for sort + grid placement
  status: SuiteCellStatus;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  plan: string | null;
  recentMailCount: number;     // last 30d
  daysSinceLastIntake: number | null;
  signedUpAtIso: string | null;
};

export type SuiteOccupancyResult = {
  cells: SuiteCell[];
  totalSuitesInRange: number;
  occupied: number;
  vacant: number;
  dormant: number;
  occupancyPct: number;
  recentMailVolume: number;
  rangeMin: number;
  rangeMax: number;
};

const ACTIVITY_WINDOW_DAYS = 30;

function rankOf(suite: string): number {
  // Strip leading zeros + non-numeric. "042" → 42, "B-12" → 12. Best-
  // effort; suites that don't parse become NaN and get a stable sort
  // position later via fallback.
  const m = suite.match(/(\d+)/);
  return m ? parseInt(m[1], 10) : Number.NaN;
}

export async function getSuiteOccupancy(): Promise<SuiteOccupancyResult> {
  await verifyAdmin();

  const users = await prisma.user.findMany({
    where: { role: "USER", suiteNumber: { not: null } },
    select: { id: true, name: true, email: true, plan: true, suiteNumber: true, createdAt: true },
  });

  // Activity window: count mail items per user in last 30d + most recent.
  const since = new Date(Date.now() - ACTIVITY_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const userIds = users.map((u) => u.id);
  const [activityCounts, latestPer] = await Promise.all([
    userIds.length === 0 ? [] : prisma.mailItem.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, createdAt: { gte: since } },
      _count: { _all: true },
    }),
    userIds.length === 0 ? [] : prisma.mailItem.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds } },
      _max: { createdAt: true },
    }),
  ]);
  const countByUser = new Map<string, number>();
  for (const a of activityCounts) countByUser.set(a.userId, a._count._all);
  const latestByUser = new Map<string, Date | null>();
  for (const r of latestPer) latestByUser.set(r.userId, r._max.createdAt ?? null);

  // Group users by suite (drop ones with bad/null suite number).
  const userBySuite = new Map<string, typeof users[number]>();
  for (const u of users) {
    if (u.suiteNumber) userBySuite.set(u.suiteNumber, u);
  }

  // Determine the occupied suite range. If empty, return an empty grid.
  const occupiedRanks = Array.from(userBySuite.keys())
    .map(rankOf)
    .filter((n): n is number => Number.isFinite(n));
  if (occupiedRanks.length === 0) {
    return {
      cells: [], totalSuitesInRange: 0, occupied: 0, vacant: 0, dormant: 0,
      occupancyPct: 0, recentMailVolume: 0, rangeMin: 0, rangeMax: 0,
    };
  }
  const rangeMin = Math.min(...occupiedRanks);
  const rangeMax = Math.max(...occupiedRanks);

  // Build the grid in numeric order so vacancies show as gaps.
  const cells: SuiteCell[] = [];
  let dormant = 0;
  let recentMailVolume = 0;
  for (let n = rangeMin; n <= rangeMax; n += 1) {
    const padded = String(n).padStart(3, "0");
    const matchUser = userBySuite.get(padded) ?? userBySuite.get(String(n));
    if (!matchUser) {
      cells.push({
        suite: padded,
        numericRank: n,
        status: "vacant",
        userId: null,
        userName: null,
        userEmail: null,
        plan: null,
        recentMailCount: 0,
        daysSinceLastIntake: null,
        signedUpAtIso: null,
      });
      continue;
    }
    const cnt = countByUser.get(matchUser.id) ?? 0;
    recentMailVolume += cnt;
    const last = latestByUser.get(matchUser.id) ?? null;
    const dsi = last ? Math.floor((Date.now() - last.getTime()) / (24 * 60 * 60 * 1000)) : null;
    const isActive = cnt > 0;
    if (!isActive) dormant += 1;
    cells.push({
      suite: matchUser.suiteNumber ?? padded,
      numericRank: n,
      status: isActive ? "occupied_active" : "occupied_dormant",
      userId: matchUser.id,
      userName: matchUser.name,
      userEmail: matchUser.email,
      plan: matchUser.plan,
      recentMailCount: cnt,
      daysSinceLastIntake: dsi,
      signedUpAtIso: matchUser.createdAt.toISOString(),
    });
  }

  const occupied = cells.filter((c) => c.status !== "vacant").length;
  const vacant = cells.filter((c) => c.status === "vacant").length;
  const totalSuitesInRange = cells.length;
  const occupancyPct = totalSuitesInRange === 0 ? 0 : Math.round((occupied / totalSuitesInRange) * 100);

  return {
    cells,
    totalSuitesInRange,
    occupied,
    vacant,
    dormant,
    occupancyPct,
    recentMailVolume,
    rangeMin,
    rangeMax,
  };
}
