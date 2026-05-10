"use server";

/**
 * iter-223 — Public member-to-member referral leaderboard (Tier 16 #132).
 *
 * Distinct from iter-156 referralLeaderboard.ts (which is the
 * member-side dashboard widget showing "you're #4"). This file
 * powers the PUBLIC `/leaderboard` route + opt-in/out toggle +
 * quarterly award cron.
 *
 * Privacy: only members with `User.leaderboardOptIn=true` surface,
 * and even then only their first name + last initial + suite # +
 * credited count + earned badges. No email, no full name, no
 * lifetime spend.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

const LEADERBOARD_LIMIT = 50;

export type LeaderboardRow = {
  rank: number;
  publicName: string;        // "Karim S."
  suiteNumber: string | null;
  creditedReferrals: number;
  joinedYear: number;
  badgeKeys: string[];
};

function publicName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}

export async function getPublicReferralLeaderboard(): Promise<LeaderboardRow[]> {
  // PUBLIC — no auth. Only opted-in members surface.
  const members = await prisma.user.findMany({
    where: { leaderboardOptIn: true, role: "USER" },
    select: { id: true, name: true, suiteNumber: true, mailboxAssignedAt: true, createdAt: true },
    take: 500,
  }).catch(() => []);
  if (members.length === 0) return [];

  const ids = members.map((m) => m.id);
  const counts = await prisma.referral.groupBy({
    by: ["referrerId"],
    where: { referrerId: { in: ids }, status: "credited" },
    _count: { _all: true },
  }).catch(() => [] as Array<{ referrerId: string; _count: { _all: number } }>);
  const countMap = new Map<string, number>();
  for (const c of counts) countMap.set(c.referrerId, c._count._all);

  const badges = await prisma.memberBadge.findMany({
    where: { userId: { in: ids } },
    select: { userId: true, badgeKey: true },
  }).catch(() => [] as Array<{ userId: string; badgeKey: string }>);
  const badgeMap = new Map<string, string[]>();
  for (const b of badges) {
    const arr = badgeMap.get(b.userId) ?? [];
    arr.push(b.badgeKey);
    badgeMap.set(b.userId, arr);
  }

  const rows = members.map((m) => ({
    publicName: publicName(m.name),
    suiteNumber: m.suiteNumber,
    creditedReferrals: countMap.get(m.id) ?? 0,
    joinedYear: (m.mailboxAssignedAt ?? m.createdAt).getUTCFullYear(),
    badgeKeys: badgeMap.get(m.id) ?? [],
  }));
  rows.sort((a, b) => b.creditedReferrals - a.creditedReferrals);
  return rows.slice(0, LEADERBOARD_LIMIT).map((r, i) => ({ rank: i + 1, ...r }));
}

// ─── Member opt-in ─────────────────────────────────────────────────────

export async function getMyLeaderboardOptIn(): Promise<{ optedIn: boolean; creditedReferrals: number }> {
  const session = await verifySession();
  const userId = session.id!;
  const [u, count] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { leaderboardOptIn: true } }),
    prisma.referral.count({ where: { referrerId: userId, status: "credited" } }),
  ]);
  return { optedIn: u?.leaderboardOptIn ?? false, creditedReferrals: count };
}

export async function setMyLeaderboardOptIn(input: { optedIn: boolean }): Promise<{ success: boolean }> {
  const session = await verifySession();
  await prisma.user.update({ where: { id: session.id! }, data: { leaderboardOptIn: !!input.optedIn } });
  await prisma.auditLog.create({
    data: {
      actorId: session.id!, actorRole: session.role ?? "MEMBER",
      action: input.optedIn ? "leaderboard.opted_in" : "leaderboard.opted_out",
      entityType: "User", entityId: session.id!,
      metadata: JSON.stringify({ optedIn: input.optedIn }),
    },
  }).catch(() => null);
  revalidatePath("/leaderboard");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Admin: quarterly award ────────────────────────────────────────────

export type QuarterlyAwardResult = {
  quarter: string;
  awarded: number;
  recipients: Array<{ userId: string; name: string; rank: number; credited: number }>;
  ranAtIso: string;
};

function currentQuarter(): { label: string; year: number; q: number } {
  const now = new Date();
  const m = now.getUTCMonth() + 1;
  const q = Math.ceil(m / 3);
  return { label: `${now.getUTCFullYear()}-Q${q}`, year: now.getUTCFullYear(), q };
}

// Auto-awards iter-216 "Founder ambassador" badge to top 3 opted-in
// referrers each quarter. Idempotent within a quarter via memberBadge
// `userId_badgeKey` upsert (badgeKey suffixed with the quarter label).
export async function runQuarterlyReferralAwardSweep(): Promise<QuarterlyAwardResult> {
  const quarter = currentQuarter();
  const result: QuarterlyAwardResult = { quarter: quarter.label, awarded: 0, recipients: [], ranAtIso: new Date().toISOString() };

  // Re-pull opted-in members with credited counts (don't trust the
  // sanitized public projection — we need the real userId for the
  // badge upsert).
  const members = await prisma.user.findMany({
    where: { leaderboardOptIn: true, role: "USER" },
    select: { id: true, name: true, suiteNumber: true },
    take: 500,
  }).catch(() => []);
  if (members.length === 0) return result;

  const counts = await prisma.referral.groupBy({
    by: ["referrerId"],
    where: { referrerId: { in: members.map((m) => m.id) }, status: "credited" },
    _count: { _all: true },
  }).catch(() => [] as Array<{ referrerId: string; _count: { _all: number } }>);
  const countMap = new Map<string, number>();
  for (const c of counts) countMap.set(c.referrerId, c._count._all);

  const ranked = members
    .map((m) => ({ ...m, credited: countMap.get(m.id) ?? 0 }))
    .filter((m) => m.credited > 0)
    .sort((a, b) => b.credited - a.credited)
    .slice(0, 3);

  for (let i = 0; i < ranked.length; i++) {
    const m = ranked[i]!;
    const rank = i + 1;
    const badgeKey = `founder_ambassador_${quarter.label}`;
    try {
      // Idempotent — upsert + check if it was new via a fresh-row count.
      const existing = await prisma.memberBadge.findUnique({
        where: { userId_badgeKey: { userId: m.id, badgeKey } },
      });
      if (existing) continue;
      await prisma.memberBadge.create({
        data: {
          userId: m.id, badgeKey,
          label: `Founder ambassador · ${quarter.label}`,
          emoji: "🏆",
          color: "#92400e",
          description: `Top 3 referrer in ${quarter.label}. Earns a free month + permanent recognition.`,
          awardedReason: `${m.credited} credited referrals · rank #${rank}`,
        },
      });
      await prisma.auditLog.create({
        data: {
          actorId: "system", actorRole: "SYSTEM",
          action: "leaderboard.quarterly_awarded",
          entityType: "User", entityId: m.id,
          metadata: JSON.stringify({ quarter: quarter.label, rank, credited: m.credited, badgeKey }),
        },
      }).catch(() => null);
      result.awarded += 1;
      result.recipients.push({ userId: m.id, name: m.name, rank, credited: m.credited });
    } catch { /* swallow */ }
  }
  return result;
}

export async function adminTriggerQuarterlyAward(): Promise<QuarterlyAwardResult> {
  await verifyAdmin();
  return runQuarterlyReferralAwardSweep();
}
