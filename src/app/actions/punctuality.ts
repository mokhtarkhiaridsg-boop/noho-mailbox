"use server";

/**
 * iter-220 — Member-side punctuality streak read (Tier 16 #129).
 *
 * Pure read against MailItem pickup history. Returns the member's
 * current consecutive-on-time-pickup streak + total + on-time rate
 * + days-to-next-badge so the dashboard card can render a progress
 * bar toward the iter-216 "Punctual pal" badge.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { computePunctualityStreak, PUNCTUAL_BADGE_THRESHOLD } from "@/lib/member-badges";

export type PunctualityResult = {
  streak: number;
  total: number;
  onTime: number;
  onTimeRatePct: number;
  badgeThreshold: number;
  pickupsToBadge: number;
  hasBadge: boolean;
  mostRecentLatencyDays: number | null;
};

export async function getMyPunctualityStreak(): Promise<PunctualityResult> {
  const session = await verifySession();
  const userId = session.id!;
  const rows = await prisma.mailItem.findMany({
    where: { userId, pickupSignedAt: { not: null } },
    select: { createdAt: true, pickupSignedAt: true },
    orderBy: { pickupSignedAt: "desc" },
    take: 200,
  }).catch(() => [] as Array<{ createdAt: Date; pickupSignedAt: Date | null }>);

  const valid = rows.filter((r): r is { createdAt: Date; pickupSignedAt: Date } => r.pickupSignedAt !== null);
  const punct = computePunctualityStreak(valid);

  const hasBadge = await prisma.memberBadge.findUnique({
    where: { userId_badgeKey: { userId, badgeKey: "pickup_punctual_12" } },
  }).then((r) => !!r).catch(() => false);

  const onTimeRatePct = punct.total > 0 ? Math.round((punct.onTime / punct.total) * 100) : 0;
  const pickupsToBadge = Math.max(0, PUNCTUAL_BADGE_THRESHOLD - punct.streak);

  return {
    streak: punct.streak,
    total: punct.total,
    onTime: punct.onTime,
    onTimeRatePct,
    badgeThreshold: PUNCTUAL_BADGE_THRESHOLD,
    pickupsToBadge,
    hasBadge,
    mostRecentLatencyDays: punct.mostRecentLatencyDays,
  };
}
