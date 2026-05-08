"use server";

// iter-126 — Pickup wait-time predictor.
//
// Mines historical MailItem intake → pickup intervals to compute each
// customer's typical wait time, then ranks who's currently sitting on a
// package longer than their own average. Drives the dunning workflow:
// admin can see "Mariem usually picks up in 1.2d, but this one's been
// here 4d" and nudge her with a single email.
//
// No schema changes — pure read of MailItem.createdAt + the audit log.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";

const LOOKBACK_DAYS = 180;        // historical window for the rolling average
const MIN_PICKUPS_FOR_AVG = 2;    // don't predict from a single data point
const STALE_THRESHOLD_OVERAGE_PCT = 0.50;  // 50% over their own average = "late"
const AT_LEAST_OVERDUE_DAYS = 2;  // also flag anyone with shelf age >= this

export type CustomerVelocity = {
  userId: string;
  name: string;
  email: string;
  suiteNumber: string | null;
  avgPickupDays: number | null;       // null if not enough data
  pickupSamples: number;              // historical pickups counted
  medianPickupDays: number | null;
  fastestDays: number | null;
  slowestDays: number | null;
  awaitingCount: number;              // packages currently on the shelf
  oldestAwaitingDays: number | null;  // age of oldest active pkg in days
  oldestAwaitingTracking: string | null;
  isLate: boolean;                    // oldestAwaitingDays > avgPickupDays * 1.5
  predictedPickupBy: string | null;   // ISO date if avg known + has awaiting items
};

export type PickupVelocityRollup = {
  customers: CustomerVelocity[];
  bureauAvgDays: number | null;
  totalSamples: number;
  lateCount: number;
};

export async function getPickupVelocityRollup(): Promise<PickupVelocityRollup> {
  await verifyAdmin();

  const since = new Date(Date.now() - LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  // Pull every "picked up" audit row in the window. Each row's createdAt
  // = pickup time; we'll match it back to the MailItem's intake time
  // (MailItem.createdAt) via entityId.
  const pickupAudits = await prisma.auditLog.findMany({
    where: {
      action: "mail.status.picked_up",
      entityType: "MailItem",
      createdAt: { gte: since },
    },
    select: { entityId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  const pickedItemIds = Array.from(new Set(pickupAudits.map((a) => a.entityId).filter(Boolean) as string[]));

  // Fetch the corresponding MailItems for intake-time lookup.
  const pickedItems = pickedItemIds.length === 0 ? [] : await prisma.mailItem.findMany({
    where: { id: { in: pickedItemIds } },
    select: { id: true, userId: true, createdAt: true },
  });
  const itemMap = new Map(pickedItems.map((m) => [m.id, m] as const));

  // Bucket intake-to-pickup intervals per customer.
  const intervalsByUser = new Map<string, number[]>();
  for (const a of pickupAudits) {
    if (!a.entityId) continue;
    const item = itemMap.get(a.entityId);
    if (!item) continue;
    const days = (a.createdAt.getTime() - item.createdAt.getTime()) / (24 * 60 * 60 * 1000);
    if (days < 0 || days > 180) continue; // sanity-skip impossible values
    const list = intervalsByUser.get(item.userId) ?? [];
    list.push(days);
    intervalsByUser.set(item.userId, list);
  }

  // Pull every currently-on-shelf MailItem (Awaiting Pickup or Received).
  const awaitingItems = await prisma.mailItem.findMany({
    where: {
      type: "Package",
      status: { in: ["Received", "Awaiting Pickup"] },
    },
    select: { id: true, userId: true, createdAt: true, trackingNumber: true },
    orderBy: { createdAt: "asc" },
  });
  const awaitingByUser = new Map<string, typeof awaitingItems>();
  for (const it of awaitingItems) {
    const list = awaitingByUser.get(it.userId) ?? [];
    list.push(it);
    awaitingByUser.set(it.userId, list);
  }

  // Combine the candidate user IDs (anyone with a pickup history OR a current package).
  const userIds = Array.from(new Set([
    ...intervalsByUser.keys(),
    ...awaitingByUser.keys(),
  ]));
  const users = userIds.length === 0 ? [] : await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, suiteNumber: true },
  });
  const userById = new Map(users.map((u) => [u.id, u] as const));

  let bureauTotalDays = 0;
  let bureauTotalSamples = 0;
  let lateCount = 0;
  const customers: CustomerVelocity[] = [];

  for (const uid of userIds) {
    const u = userById.get(uid);
    if (!u) continue;
    const intervals = intervalsByUser.get(uid) ?? [];
    const samples = intervals.length;
    let avg: number | null = null;
    let median: number | null = null;
    let fastest: number | null = null;
    let slowest: number | null = null;
    if (samples >= MIN_PICKUPS_FOR_AVG) {
      avg = intervals.reduce((a, b) => a + b, 0) / samples;
      const sorted = [...intervals].sort((a, b) => a - b);
      median = samples % 2 === 0
        ? (sorted[samples / 2 - 1] + sorted[samples / 2]) / 2
        : sorted[Math.floor(samples / 2)];
      fastest = sorted[0];
      slowest = sorted[sorted.length - 1];
      bureauTotalDays += intervals.reduce((a, b) => a + b, 0);
      bureauTotalSamples += samples;
    }

    const awaiting = awaitingByUser.get(uid) ?? [];
    const oldest = awaiting[0]; // sorted ascending by createdAt
    const oldestDays = oldest ? (Date.now() - oldest.createdAt.getTime()) / (24 * 60 * 60 * 1000) : null;
    const isLate = !!(oldestDays != null && (
      (avg != null && oldestDays > avg * (1 + STALE_THRESHOLD_OVERAGE_PCT)) ||
      (avg == null && oldestDays >= AT_LEAST_OVERDUE_DAYS * 2)  // no avg → use absolute threshold
    ));
    if (isLate) lateCount += 1;

    const predicted = avg != null && oldest
      ? new Date(oldest.createdAt.getTime() + avg * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
      : null;

    customers.push({
      userId: uid,
      name: u.name,
      email: u.email,
      suiteNumber: u.suiteNumber,
      avgPickupDays: avg != null ? round1(avg) : null,
      pickupSamples: samples,
      medianPickupDays: median != null ? round1(median) : null,
      fastestDays: fastest != null ? round1(fastest) : null,
      slowestDays: slowest != null ? round1(slowest) : null,
      awaitingCount: awaiting.length,
      oldestAwaitingDays: oldestDays != null ? round1(oldestDays) : null,
      oldestAwaitingTracking: oldest?.trackingNumber ?? null,
      isLate,
      predictedPickupBy: predicted,
    });
  }

  // Sort: late ones first (by overage), then by awaiting count desc.
  customers.sort((a, b) => {
    if (a.isLate !== b.isLate) return a.isLate ? -1 : 1;
    if (a.isLate && b.isLate) {
      const overA = (a.oldestAwaitingDays ?? 0) - (a.avgPickupDays ?? 0);
      const overB = (b.oldestAwaitingDays ?? 0) - (b.avgPickupDays ?? 0);
      return overB - overA;
    }
    return b.awaitingCount - a.awaitingCount;
  });

  return {
    customers,
    bureauAvgDays: bureauTotalSamples > 0 ? round1(bureauTotalDays / bureauTotalSamples) : null,
    totalSamples: bureauTotalSamples,
    lateCount,
  };
}

function round1(n: number): number { return Math.round(n * 10) / 10; }
