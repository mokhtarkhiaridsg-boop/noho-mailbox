// iter-130 — Holiday-aware send helper.
//
// Decides whether the bureau is closed at a given moment (per iter-90
// OperatingHoursConfig) and computes the next time it'll be open. Email
// senders use this to defer time-sensitive notifications past closures
// so customers don't get a "your plan expires today!" email when the
// bureau is dark.

import {
  parseHoursConfig,
  type OperatingHoursConfig,
  type DayHours,
} from "@/lib/operating-hours";

const FALLBACK_TZ = "America/Los_Angeles";

// Compute "is the bureau closed at THIS instant?" — uses isOpenNow's same
// logic but boiled down to a single boolean.
export function isBureauOpenAt(cfg: OperatingHoursConfig, atDate: Date): boolean {
  const tz = cfg.timezone || FALLBACK_TZ;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(atDate);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const isoDay = `${get("year")}-${get("month")}-${get("day")}`;
  const minutes = parseInt(get("hour"), 10) * 60 + parseInt(get("minute"), 10);
  const wkShort = get("weekday").toLowerCase().slice(0, 3);
  const dayIdx = ["sun","mon","tue","wed","thu","fri","sat"].indexOf(wkShort);

  // Holiday wins.
  const holiday = cfg.holidays.find((h) => h.date === isoDay) ?? null;
  if (holiday) {
    if (holiday.closed) return false;
    if (holiday.openClose) {
      const o = parseHHMM(holiday.openClose.open);
      const c = parseHHMM(holiday.openClose.close);
      if (o == null || c == null) return false;
      return minutes >= o && minutes < c;
    }
  }

  const day = cfg.weekly[dayIdx] ?? { open: false, hours: "Closed" };
  if (!day.open || !day.openHHMM || !day.closeHHMM) return false;
  const o = parseHHMM(day.openHHMM);
  const c = parseHHMM(day.closeHHMM);
  if (o == null || c == null) return false;
  if (minutes < o || minutes >= c) return false;
  if (day.breakHHMM) {
    const bs = parseHHMM(day.breakHHMM[0]);
    const be = parseHHMM(day.breakHHMM[1]);
    if (bs != null && be != null && minutes >= bs && minutes < be) return false;
  }
  return true;
}

// "Next time the bureau is open" — walks forward up to 30 days max so a
// misconfigured 365-day closure doesn't loop. Returns the open instant
// in UTC.
export function nextOpenAt(cfg: OperatingHoursConfig, fromDate: Date): Date {
  const tz = cfg.timezone || FALLBACK_TZ;
  // Step forward 15 minutes at a time and check. 96 ticks/day × 30 days
  // = 2880 iterations max — bounded, fast.
  const stepMs = 15 * 60 * 1000;
  let probe = new Date(fromDate.getTime());
  for (let i = 0; i < 96 * 30; i += 1) {
    if (isBureauOpenAt(cfg, probe)) return probe;
    probe = new Date(probe.getTime() + stepMs);
  }
  // Couldn't find a window in 30 days — return fromDate + 1 day as a
  // reasonable fallback (caller should treat as "best effort").
  return new Date(fromDate.getTime() + 24 * 60 * 60 * 1000);
  void tz;
}

// Top-level decision used by senders. Pass the email "kind" + (optional)
// reference time. If we're closed and the kind is in the suppress list,
// returns the next open Date; otherwise null = "send now".
//
// Kinds defaulted to defer (anything customer-facing + time-sensitive
// that mentions "today" or asks for action):
const DEFAULT_DEFERRED_KINDS = new Set([
  "plan_renewal_reminder",
  "storage_fee",
  "id_expiring",
  "vacation_hold_started",
  "vacation_hold_ended",
  "auto_renew_reminder",
  "wallet_auto_top_up_fired",
  "guest_pickup_auth",
  "package_insured",
]);

export type DeferDecision = { defer: false } | { defer: true; deferUntil: Date; reason: string };

export function decideHolidayDeferral(input: {
  kind: string;
  cfg: OperatingHoursConfig;
  atDate?: Date;
  alwaysSendKinds?: Set<string>;
  alwaysDeferKinds?: Set<string>;
}): DeferDecision {
  const at = input.atDate ?? new Date();
  if (input.alwaysSendKinds?.has(input.kind)) return { defer: false };
  const deferSet = input.alwaysDeferKinds ?? DEFAULT_DEFERRED_KINDS;
  if (!deferSet.has(input.kind)) return { defer: false };
  if (isBureauOpenAt(input.cfg, at)) return { defer: false };

  const nextOpen = nextOpenAt(input.cfg, at);
  // Build a reason string for the queue row + audit metadata.
  const tz = input.cfg.timezone || FALLBACK_TZ;
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    weekday: "short", month: "short", day: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
  });
  const reason = `Bureau closed at send time; deferred until ${fmt.format(nextOpen)} ${tz}`;
  return { defer: true, deferUntil: nextOpen, reason };
}

function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mn = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mn < 0 || mn > 59) return null;
  return h * 60 + mn;
}

// Re-export so server actions can pull config + decide in one import.
export { parseHoursConfig };
export type { OperatingHoursConfig, DayHours };
