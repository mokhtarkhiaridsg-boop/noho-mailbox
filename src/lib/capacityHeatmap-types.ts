/**
 * Capacity heatmap types + helpers — extracted from
 * src/app/actions/capacityHeatmap.ts because Next 16 forbids non-async
 * exports inside `"use server"` files. The action file imports from
 * here; client components import from here too.
 */

export type HeatmapEventKind = "intake" | "pickup" | "bellring" | "appointment";

export type HeatmapCell = {
  dayOfWeek: number;
  hour: number;
  count: number;
};

export type HeatmapResult = {
  windowDays: number;
  totalEvents: number;
  byKind: Record<HeatmapEventKind, number>;
  cells: HeatmapCell[];
  peakDayOfWeek: number;
  peakHour: number;
  peakCount: number;
  busiestWindow: { day: number; startHour: number; endHour: number; count: number } | null;
  timezone: string;
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function dayOfWeekName(d: number): string {
  return DAY_NAMES[d] ?? "?";
}
