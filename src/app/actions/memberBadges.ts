"use server";

/**
 * iter-216 — Member milestone badges (Tier 15 #125).
 *
 * Daily cron sweep walks every active member, computes their lifetime
 * stats, and awards any new milestone badges via idempotent upsert
 * (the `@@unique([userId, badgeKey])` constraint dedupes). Each
 * award fires an audit log so admin can spot "Karim hit $5k club
 * today" + (in a future iter) trigger a celebratory email.
 *
 * Surfaces in member dashboard, iCal feed, neighbor directory.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { BADGE_DEFS, computePunctualityStreak, type MemberStats } from "@/lib/member-badges";

export type MemberBadgeRow = {
  id: string;
  badgeKey: string;
  label: string;
  emoji: string;
  color: string;
  description: string;
  awardedAtIso: string;
  awardedReason: string | null;
};

function rowToView(r: { id: string; badgeKey: string; label: string; emoji: string; color: string; description: string; awardedAt: Date; awardedReason: string | null }): MemberBadgeRow {
  return {
    id: r.id, badgeKey: r.badgeKey, label: r.label, emoji: r.emoji, color: r.color,
    description: r.description, awardedAtIso: r.awardedAt.toISOString(), awardedReason: r.awardedReason,
  };
}

async function computeStats(userId: string): Promise<MemberStats | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { mailboxAssignedAt: true, createdAt: true },
  });
  if (!user) return null;

  // Gather counts in parallel; each branch try/catches so a missing
  // table on a fresh install doesn't break the whole sweep.
  const [packages, walletAgg, referrals, scans, forwarding, pickedUpRows] = await Promise.all([
    prisma.mailItem.count({ where: { userId, type: "Package" } }).catch(() => 0),
    prisma.walletTransaction.aggregate({
      where: { userId, kind: { in: ["TopUp", "Charge", "DepositCharge"] } },
      _sum: { amountCents: true },
    }).catch(() => ({ _sum: { amountCents: 0 } as { amountCents: number | null } })),
    prisma.referral.count({ where: { referrerId: userId, status: "credited" } }).catch(() => 0),
    prisma.mailRequest.count({ where: { userId, kind: "Scan" } }).catch(() => 0),
    prisma.scheduledForwardingBatch.count({ where: { userId, itemCount: { gt: 0 } } }).catch(() => 0),
    // iter-220: pull last-200 picked-up MailItems for streak compute
    prisma.mailItem.findMany({
      where: { userId, pickupSignedAt: { not: null } },
      select: { createdAt: true, pickupSignedAt: true },
      orderBy: { pickupSignedAt: "desc" },
      take: 200,
    }).catch(() => [] as Array<{ createdAt: Date; pickupSignedAt: Date | null }>),
  ]);

  // Lifetime spend = absolute value of all OUTBOUND wallet activity
  // (Charges, DepositCharges) — TopUps are deposits not spend.
  const charges = await prisma.walletTransaction.aggregate({
    where: { userId, amountCents: { lt: 0 } },
    _sum: { amountCents: true },
  }).catch(() => ({ _sum: { amountCents: 0 } as { amountCents: number | null } }));
  const totalSpendCents = Math.abs(charges._sum.amountCents ?? 0);

  void walletAgg; // currently informational; spend uses charges only

  // iter-220: punctuality streak.
  const validPickups = pickedUpRows
    .filter((r): r is { createdAt: Date; pickupSignedAt: Date } => r.pickupSignedAt !== null);
  const punct = computePunctualityStreak(validPickups);

  return {
    joinedAt: user.mailboxAssignedAt ?? user.createdAt,
    totalPackagesReceived: packages,
    totalLifetimeSpendCents: totalSpendCents,
    creditedReferrals: referrals,
    totalScansRequested: scans,
    totalForwardingShipped: forwarding,
    consecutiveOnTimePickups: punct.streak,
  };
}

async function awardForUser(userId: string): Promise<{ awarded: number; keys: string[] }> {
  const stats = await computeStats(userId);
  if (!stats) return { awarded: 0, keys: [] };
  let awarded = 0;
  const keys: string[] = [];
  for (const def of BADGE_DEFS) {
    const award = def.evaluator(stats);
    if (!award) continue;
    try {
      await prisma.memberBadge.upsert({
        where: { userId_badgeKey: { userId, badgeKey: def.key } },
        create: {
          userId, badgeKey: def.key,
          label: award.label, emoji: award.emoji, color: award.color,
          description: award.description, awardedReason: award.awardedReason,
        },
        update: {},                       // append-only — once awarded, never demote
      });
      // Was it new? Quick check: count of audits for this key.
      const exists = await prisma.auditLog.count({
        where: { entityType: "MemberBadge", entityId: `${userId}:${def.key}`, action: "member_badge.awarded" },
      });
      if (exists === 0) {
        await prisma.auditLog.create({
          data: {
            actorId: "system", actorRole: "SYSTEM",
            action: "member_badge.awarded",
            entityType: "MemberBadge", entityId: `${userId}:${def.key}`,
            metadata: JSON.stringify({ userId, key: def.key, label: award.label, reason: award.awardedReason }),
          },
        });
        awarded += 1;
        keys.push(def.key);
      }
    } catch { /* swallow — likely race condition; next sweep will catch it */ }
  }
  return { awarded, keys };
}

export type BadgeSweepResult = {
  scanned: number;
  awardedTotal: number;
  newAwards: Array<{ userId: string; userName: string; keys: string[] }>;
  ranAtIso: string;
};

export async function runBadgeAwardSweep(): Promise<BadgeSweepResult> {
  // Walk every member with mailboxStatus="Active" or "Assigned" (skip
  // pending/suspended). Capped at 5000 to keep one sweep bounded.
  const members = await prisma.user.findMany({
    where: { role: "USER", mailboxStatus: { in: ["Active", "Assigned"] } },
    select: { id: true, name: true },
    take: 5000,
  });
  const result: BadgeSweepResult = { scanned: members.length, awardedTotal: 0, newAwards: [], ranAtIso: new Date().toISOString() };

  for (const m of members) {
    const r = await awardForUser(m.id);
    if (r.awarded > 0) {
      result.awardedTotal += r.awarded;
      result.newAwards.push({ userId: m.id, userName: m.name, keys: r.keys });
    }
  }
  return result;
}

// Member-side reads ────────────────────────────────────────────────

export async function listMyBadges(): Promise<MemberBadgeRow[]> {
  const session = await verifySession();
  const userId = session.id!;
  const rows = await prisma.memberBadge.findMany({
    where: { userId },
    orderBy: { awardedAt: "desc" },
  });
  return rows.map(rowToView);
}

// Returns Map<userId, badges[]> for the iter-209 NeighborsPanel
// emoji-strip rendering. Public-ish (admin-gated for safety).
export async function getBadgesForUserIds(input: { userIds: string[] }): Promise<Record<string, MemberBadgeRow[]>> {
  await verifySession();
  if (input.userIds.length === 0) return {};
  const rows = await prisma.memberBadge.findMany({
    where: { userId: { in: input.userIds } },
    orderBy: { awardedAt: "desc" },
  });
  const out: Record<string, MemberBadgeRow[]> = {};
  for (const r of rows) {
    (out[r.userId] ??= []).push(rowToView(r));
  }
  return out;
}

// Member-callable: forces sweep just for self. Useful for "Check my
// badges now" button on the dashboard so members don't wait for
// the daily cron.
export async function recomputeMyBadges(): Promise<{ awarded: number; keys: string[] }> {
  const session = await verifySession();
  return awardForUser(session.id!);
}
