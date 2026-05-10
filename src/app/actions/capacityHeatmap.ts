"use server";

/**
 * iter-219 — Bureau capacity heatmap by hour (Tier 16 #128).
 *
 * Pure-read aggregator. Walks the last N days of activity events
 * (mail intake / pickup-signed / bell-ring / pickup-appointment)
 * and buckets them into a 7-day × 24-hour grid in the bureau's
 * timezone (iter-90 OperatingHoursConfig.timezone).
 *
 * Admin uses this to spot peak hours (Mondays 11am) and quiet
 * windows (Saturdays 10am) so they staff appropriately.
 *
 * No schema changes — all source rows already have createdAt
 * timestamps. Bureaus with bigger volume will want SQL window
 * functions; for now in-JS aggregation is fine since N is bounded.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { getOperatingHours } from "@/app/actions/operatingHours";

const WINDOW_DAYS_DEFAULT = 90;
const WINDOW_DAYS_MAX = 365;

export type HeatmapEventKind = "intake" | "pickup" | "bellring" | "appointment";

export type HeatmapCell = {
  dayOfWeek: number;     // 0..6, Sun..Sat in bureau TZ
  hour: number;          // 0..23 in bureau TZ
  count: number;
};

export type HeatmapResult = {
  windowDays: number;
  totalEvents: number;
  byKind: Record<HeatmapEventKind, number>;
  cells: HeatmapCell[];                            // 168 cells (7×24), all populated even when count=0
  peakDayOfWeek: number;
  peakHour: number;
  peakCount: number;
  busiestWindow: { day: number; startHour: number; endHour: number; count: number } | null;
  timezone: string;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export function dayOfWeekName(d: number): string { return DAY_NAMES[d] ?? "?"; }

// In-bureau-TZ extraction: format the date with the bureau timezone +
// extract weekday + hour. JS Intl avoids a per-row Date allocation
// path that loses TZ info on libsql.
function bucketDate(d: Date, tz: string): { dow: number; hour: number } | null {
  try {
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, hour12: false, weekday: "short", hour: "2-digit",
    });
    const parts = fmt.formatToParts(d);
    const wd = parts.find((p) => p.type === "weekday")?.value?.toLowerCase().slice(0, 3) ?? "";
    const hour = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
    const dow = ["sun","mon","tue","wed","thu","fri","sat"].indexOf(wd);
    if (dow < 0 || !Number.isFinite(hour) || hour < 0 || hour > 23) return null;
    return { dow, hour: hour === 24 ? 0 : hour };          // Intl emits "24" for midnight in some locales
  } catch { return null; }
}

export async function getCapacityHeatmap(input: { windowDays?: number } = {}): Promise<HeatmapResult> {
  await verifyAdmin();
  const windowDays = Math.min(WINDOW_DAYS_MAX, Math.max(1, input.windowDays ?? WINDOW_DAYS_DEFAULT));
  const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000);
  const cfg = await getOperatingHours();
  const tz = cfg.timezone || "America/Los_Angeles";

  // Pull each event source's timestamp column. Cap each at 5000 rows
  // so an old install with millions of events doesn't OOM the action.
  const [intakes, pickups, bells, appts] = await Promise.all([
    prisma.mailItem.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true }, take: 5000, orderBy: { createdAt: "desc" } }).catch(() => []),
    prisma.mailItem.findMany({ where: { pickupSignedAt: { gte: since } }, select: { pickupSignedAt: true }, take: 5000, orderBy: { pickupSignedAt: "desc" } }).catch(() => []),
    prisma.bellRing.findMany({ where: { ringedAt: { gte: since } }, select: { ringedAt: true }, take: 5000, orderBy: { ringedAt: "desc" } }).catch(() => []),
    prisma.pickupAppointment.findMany({ where: { scheduledAt: { gte: since } }, select: { scheduledAt: true }, take: 5000, orderBy: { scheduledAt: "desc" } }).catch(() => []),
  ]);

  // Initialize 7×24 grid + per-kind tallies.
  const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
  const byKind: Record<HeatmapEventKind, number> = { intake: 0, pickup: 0, bellring: 0, appointment: 0 };

  function bump(kind: HeatmapEventKind, ts: Date) {
    const b = bucketDate(ts, tz);
    if (!b) return;
    grid[b.dow]![b.hour] = (grid[b.dow]![b.hour] ?? 0) + 1;
    byKind[kind] += 1;
  }
  for (const r of intakes)  bump("intake",      r.createdAt);
  for (const r of pickups)  if (r.pickupSignedAt) bump("pickup",      r.pickupSignedAt);
  for (const r of bells)    bump("bellring",    r.ringedAt);
  for (const r of appts)    bump("appointment", r.scheduledAt);

  // Flatten + find peak.
  const cells: HeatmapCell[] = [];
  let peakCount = 0, peakDow = 0, peakHour = 0, total = 0;
  for (let d = 0; d < 7; d++) {
    for (let h = 0; h < 24; h++) {
      const c = grid[d]![h] ?? 0;
      cells.push({ dayOfWeek: d, hour: h, count: c });
      total += c;
      if (c > peakCount) { peakCount = c; peakDow = d; peakHour = h; }
    }
  }

  // Find busiest 3-hour rolling window per day (the kind of insight
  // admin actually staffs around).
  let busiest: HeatmapResult["busiestWindow"] = null;
  for (let d = 0; d < 7; d++) {
    for (let start = 0; start <= 21; start++) {
      const sum = (grid[d]![start] ?? 0) + (grid[d]![start + 1] ?? 0) + (grid[d]![start + 2] ?? 0);
      if (!busiest || sum > busiest.count) {
        busiest = { day: d, startHour: start, endHour: start + 3, count: sum };
      }
    }
  }

  return {
    windowDays, totalEvents: total, byKind, cells,
    peakDayOfWeek: peakDow, peakHour, peakCount,
    busiestWindow: busiest, timezone: tz,
  };
}
