"use server";

/**
 * iter-199 — Supply consumption-velocity forecast (Tier 14 #108).
 *
 * Pure-read extension of iter-150 supplies: for each active Supply,
 * computes consumption velocity (units/day) over 7d/30d/90d windows,
 * projects when on-hand will hit reorderAt and zero, and suggests a
 * concrete "reorder by ${date}" so admin can place orders before the
 * lead-time bites.
 *
 * No schema changes — reads SupplyMovement.kind ∈ {sale, internal_use,
 * loss} where delta < 0 as "consumption". restock/adjust rows don't
 * count toward velocity.
 *
 * Why three windows: 7d catches a recent surge (Black Friday rush),
 * 30d is the smoothed baseline for normal ops, 90d is the slow-burn
 * average. We use the 30d window for projection by default but show
 * all three so admin can spot acceleration.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";

const DAY_MS = 24 * 3600 * 1000;
const PROJECTION_WINDOW_DAYS = 30;
const LEAD_TIME_DAYS_DEFAULT = 5;          // typical Amazon Business / vendor 1-day → 5d safety

export type SupplyForecastUrgency = "critical" | "warning" | "ok" | "unknown";

export type SupplyForecastRow = {
  id: string;
  name: string;
  category: string;
  unit: string;
  onHand: number;
  reorderAt: number;
  reorderQty: number;
  vendor: string | null;
  costCents: number | null;
  // velocity = absolute units consumed per day in each window
  velocity7d: number;
  velocity30d: number;
  velocity90d: number;
  // projection (uses velocity30d if available, else velocity7d)
  velocityUsed: number;
  velocityWindowDays: number;
  // days until on-hand drops to reorderAt / zero, null when no consumption
  daysUntilReorder: number | null;
  daysUntilStockout: number | null;
  // ISO dates the projection lands on, null when no consumption
  reorderByDateIso: string | null;
  stockoutByDateIso: string | null;
  // recommended action — accounts for lead time
  urgency: SupplyForecastUrgency;
  recommendation: string;
  // velocity acceleration: 7d vs 30d ratio (>1.5 = surging, <0.5 = quieting)
  accelerationRatio: number | null;
};

export type SupplyForecastSummary = {
  asOfIso: string;
  totalSupplies: number;
  critical: number;
  warning: number;
  ok: number;
  unknown: number;
  leadTimeDaysAssumed: number;
};

function urgencyFor(daysUntilReorder: number | null, daysUntilStockout: number | null, leadTime: number): SupplyForecastUrgency {
  if (daysUntilReorder == null && daysUntilStockout == null) return "unknown";
  // Already past reorder threshold → critical regardless of velocity.
  if (daysUntilReorder != null && daysUntilReorder <= leadTime) return "critical";
  if (daysUntilStockout != null && daysUntilStockout <= leadTime) return "critical";
  // Approaching reorder threshold within ~2 weeks → warning.
  if (daysUntilReorder != null && daysUntilReorder <= leadTime + 14) return "warning";
  return "ok";
}

function recommendationFor(row: {
  urgency: SupplyForecastUrgency;
  daysUntilReorder: number | null;
  daysUntilStockout: number | null;
  reorderByDateIso: string | null;
  reorderQty: number;
  unit: string;
  velocityUsed: number;
}): string {
  if (row.urgency === "unknown") return "No recent consumption — no action.";
  if (row.urgency === "critical") {
    if (row.daysUntilStockout != null && row.daysUntilStockout <= 3) {
      return `🚨 Order ${row.reorderQty} ${row.unit}${row.reorderQty === 1 ? "" : "s"} TODAY — stockout in ${row.daysUntilStockout}d`;
    }
    return `🚨 Order ${row.reorderQty} ${row.unit}${row.reorderQty === 1 ? "" : "s"} this week — at the reorder line now`;
  }
  if (row.urgency === "warning" && row.reorderByDateIso) {
    return `⏰ Order by ${new Date(row.reorderByDateIso).toLocaleDateString()} (${row.daysUntilReorder}d) to stay ahead`;
  }
  return `✓ Healthy — ~${row.velocityUsed.toFixed(1)} ${row.unit}${row.velocityUsed === 1 ? "" : "s"}/day`;
}

export async function getSupplyForecasts(input: { leadTimeDays?: number } = {}): Promise<{
  rows: SupplyForecastRow[];
  summary: SupplyForecastSummary;
}> {
  await verifyAdmin();
  const leadTime = Math.max(0, Math.min(60, input.leadTimeDays ?? LEAD_TIME_DAYS_DEFAULT));
  const now = Date.now();
  const since = new Date(now - 90 * DAY_MS);

  const supplies = await prisma.supply.findMany({
    where: { isActive: true },
    include: {
      movements: {
        where: { performedAt: { gte: since }, delta: { lt: 0 } },
        select: { delta: true, performedAt: true, kind: true },
      },
    },
  });

  const rows: SupplyForecastRow[] = supplies.map((s) => {
    let consumed7 = 0, consumed30 = 0, consumed90 = 0;
    for (const m of s.movements) {
      const ageDays = (now - m.performedAt.getTime()) / DAY_MS;
      const units = -m.delta;                    // delta is negative; units consumed positive
      if (ageDays <= 7) consumed7 += units;
      if (ageDays <= 30) consumed30 += units;
      if (ageDays <= 90) consumed90 += units;
    }
    const velocity7d = consumed7 / 7;
    const velocity30d = consumed30 / 30;
    const velocity90d = consumed90 / 90;

    // Pick the most reliable window. Prefer 30d when we have data; fall
    // back to 7d (newer supplies) and finally 90d.
    let velocityUsed = velocity30d;
    let velocityWindowDays = 30;
    if (velocity30d <= 0 && velocity7d > 0) { velocityUsed = velocity7d; velocityWindowDays = 7; }
    if (velocity30d <= 0 && velocity7d <= 0 && velocity90d > 0) { velocityUsed = velocity90d; velocityWindowDays = 90; }

    let daysUntilReorder: number | null = null;
    let daysUntilStockout: number | null = null;
    let reorderByDateIso: string | null = null;
    let stockoutByDateIso: string | null = null;
    if (velocityUsed > 0) {
      const slack = Math.max(0, s.onHand - s.reorderAt);
      daysUntilReorder = Math.floor(slack / velocityUsed);
      daysUntilStockout = Math.floor(s.onHand / velocityUsed);
      reorderByDateIso = new Date(now + daysUntilReorder * DAY_MS).toISOString();
      stockoutByDateIso = new Date(now + daysUntilStockout * DAY_MS).toISOString();
    }
    const urgency = urgencyFor(daysUntilReorder, daysUntilStockout, leadTime);
    const accelerationRatio = velocity30d > 0 ? velocity7d / velocity30d : null;

    const row: SupplyForecastRow = {
      id: s.id, name: s.name, category: s.category, unit: s.unit,
      onHand: s.onHand, reorderAt: s.reorderAt, reorderQty: s.reorderQty,
      vendor: s.vendor, costCents: s.costCents,
      velocity7d, velocity30d, velocity90d,
      velocityUsed, velocityWindowDays,
      daysUntilReorder, daysUntilStockout,
      reorderByDateIso, stockoutByDateIso,
      urgency,
      recommendation: "",
      accelerationRatio,
    };
    row.recommendation = recommendationFor({
      urgency, daysUntilReorder, daysUntilStockout, reorderByDateIso,
      reorderQty: s.reorderQty, unit: s.unit, velocityUsed,
    });
    return row;
  });

  // Sort: critical first, then warning, then ok (and unknown last). Within
  // each bucket, soonest reorder date first.
  const order: Record<SupplyForecastUrgency, number> = { critical: 0, warning: 1, ok: 2, unknown: 3 };
  rows.sort((a, b) => {
    const o = order[a.urgency] - order[b.urgency];
    if (o !== 0) return o;
    const ar = a.daysUntilReorder ?? Infinity;
    const br = b.daysUntilReorder ?? Infinity;
    return ar - br;
  });

  const summary: SupplyForecastSummary = {
    asOfIso: new Date(now).toISOString(),
    totalSupplies: rows.length,
    critical: rows.filter((r) => r.urgency === "critical").length,
    warning: rows.filter((r) => r.urgency === "warning").length,
    ok: rows.filter((r) => r.urgency === "ok").length,
    unknown: rows.filter((r) => r.urgency === "unknown").length,
    leadTimeDaysAssumed: leadTime,
  };
  return { rows, summary };
}
