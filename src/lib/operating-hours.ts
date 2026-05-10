// iter-90 — Operating-hours config + helpers.
//
// Single source of truth for the bureau's hours. Stored as JSON in
// SiteConfig under key "operating_hours_v1". Drives:
//   - Marketing-site Hours block + open-now badge
//   - Member-dashboard "we're closed" hint on action panels
//   - Email templates (in time, we'll inject these instead of hardcoding)
//
// Schema:
//   - weekly: 7 day rows (Sun..Sat) with open/close in 24-hour HH:MM
//     and an optional break window
//   - holidays: list of { date: "YYYY-MM-DD", label, closed?, openClose? }
//   - timezone: IANA tz used by isOpenNow (defaults to America/Los_Angeles)

export type DayHours = {
  open: boolean;       // is this day open at all?
  hours?: string;      // human-readable, e.g. "9:30am–5:30pm"
  openHHMM?: string;   // 24h HH:MM, e.g. "09:30"
  closeHHMM?: string;  // 24h HH:MM, e.g. "17:30"
  breakHHMM?: [string, string]; // optional [start, end], e.g. ["13:30","14:00"]
};

export type Holiday = {
  date: string;        // YYYY-MM-DD
  label: string;       // "New Year's Day"
  closed: boolean;     // if false, openClose overrides default day hours
  openClose?: { open: string; close: string };
  note?: string;       // optional admin note shown to customers
};

export type OperatingHoursConfig = {
  timezone: string;    // IANA tz
  weekly: [DayHours, DayHours, DayHours, DayHours, DayHours, DayHours, DayHours]; // Sun..Sat
  holidays: Holiday[];
};

export const OPERATING_HOURS_KEY = "operating_hours_v1";

// Defaults match the strings already hardcoded across email templates +
// marketing site: Mon–Fri 9:30am–5:30pm with 1:30–2:00pm break, Sat
// 10am–1:30pm, closed Sundays.
export const DEFAULT_HOURS: OperatingHoursConfig = {
  timezone: "America/Los_Angeles",
  weekly: [
    { open: false, hours: "Closed" },                                                                 // Sun
    { open: true,  hours: "9:30am–5:30pm (lunch 1:30–2:00pm)", openHHMM: "09:30", closeHHMM: "17:30", breakHHMM: ["13:30", "14:00"] }, // Mon
    { open: true,  hours: "9:30am–5:30pm (lunch 1:30–2:00pm)", openHHMM: "09:30", closeHHMM: "17:30", breakHHMM: ["13:30", "14:00"] }, // Tue
    { open: true,  hours: "9:30am–5:30pm (lunch 1:30–2:00pm)", openHHMM: "09:30", closeHHMM: "17:30", breakHHMM: ["13:30", "14:00"] }, // Wed
    { open: true,  hours: "9:30am–5:30pm (lunch 1:30–2:00pm)", openHHMM: "09:30", closeHHMM: "17:30", breakHHMM: ["13:30", "14:00"] }, // Thu
    { open: true,  hours: "9:30am–5:30pm (lunch 1:30–2:00pm)", openHHMM: "09:30", closeHHMM: "17:30", breakHHMM: ["13:30", "14:00"] }, // Fri
    { open: true,  hours: "10:00am–1:30pm",                     openHHMM: "10:00", closeHHMM: "13:30" },                                // Sat
  ],
  holidays: [],
};

// ─── Parse / normalize ─────────────────────────────────────────────────────
export function parseHoursConfig(raw: string | null | undefined): OperatingHoursConfig {
  if (!raw) return DEFAULT_HOURS;
  try {
    const j = JSON.parse(raw) as Partial<OperatingHoursConfig>;
    if (!j || typeof j !== "object") return DEFAULT_HOURS;
    const weekly = (Array.isArray(j.weekly) && j.weekly.length === 7
      ? j.weekly
      : DEFAULT_HOURS.weekly) as OperatingHoursConfig["weekly"];
    return {
      timezone: typeof j.timezone === "string" ? j.timezone : DEFAULT_HOURS.timezone,
      weekly,
      holidays: Array.isArray(j.holidays) ? j.holidays : [],
    };
  } catch {
    return DEFAULT_HOURS;
  }
}

// ─── Open-now check ───────────────────────────────────────────────────────
// Returns one of: "open" | "break" | "closing_soon" | "closed_today" |
// "closed_holiday". `closing_soon` fires within 30 min of close.

export type OpenStatus = "open" | "break" | "closing_soon" | "closed_today" | "closed_holiday";

export function isOpenNow(cfg: OperatingHoursConfig, atDate: Date = new Date()): {
  status: OpenStatus;
  todayLabel: string;             // human "9:30am–5:30pm" or "Closed"
  holiday?: Holiday | null;
  minutesUntilClose?: number;
} {
  // Resolve current local-time components in the bureau timezone.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: cfg.timezone,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", weekday: "short",
    hour12: false,
  });
  const parts = fmt.formatToParts(atDate);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const yyyy = get("year");
  const mm = get("month");
  const dd = get("day");
  const isoDay = `${yyyy}-${mm}-${dd}`;
  const hour = parseInt(get("hour"), 10);
  const min = parseInt(get("minute"), 10);
  const minutesNow = hour * 60 + min;
  const weekdayShort = get("weekday").toLowerCase().slice(0, 3); // "sun"..."sat"
  const dayIdx = ["sun","mon","tue","wed","thu","fri","sat"].indexOf(weekdayShort);

  // Holiday wins.
  const holiday = cfg.holidays.find((h) => h.date === isoDay) ?? null;
  if (holiday) {
    if (holiday.closed) {
      return { status: "closed_holiday", todayLabel: holiday.label + " · closed", holiday };
    }
    if (holiday.openClose) {
      const o = parseHHMM(holiday.openClose.open);
      const c = parseHHMM(holiday.openClose.close);
      if (o != null && c != null && minutesNow >= o && minutesNow < c) {
        const left = c - minutesNow;
        return {
          status: left <= 30 ? "closing_soon" : "open",
          todayLabel: `${holiday.label} · ${holiday.openClose.open}–${holiday.openClose.close}`,
          holiday,
          minutesUntilClose: left,
        };
      }
      return { status: "closed_today", todayLabel: `${holiday.label} · ${holiday.openClose.open}–${holiday.openClose.close}`, holiday };
    }
  }

  const day = cfg.weekly[dayIdx] ?? { open: false, hours: "Closed" };
  const todayLabel = day.hours ?? (day.open ? "Open" : "Closed");

  if (!day.open || day.openHHMM == null || day.closeHHMM == null) {
    return { status: "closed_today", todayLabel };
  }
  const o = parseHHMM(day.openHHMM);
  const c = parseHHMM(day.closeHHMM);
  if (o == null || c == null) return { status: "closed_today", todayLabel };
  if (minutesNow < o || minutesNow >= c) {
    return { status: "closed_today", todayLabel };
  }
  // In open window — check break first.
  if (day.breakHHMM) {
    const bs = parseHHMM(day.breakHHMM[0]);
    const be = parseHHMM(day.breakHHMM[1]);
    if (bs != null && be != null && minutesNow >= bs && minutesNow < be) {
      return { status: "break", todayLabel, minutesUntilClose: c - minutesNow };
    }
  }
  const left = c - minutesNow;
  return {
    status: left <= 30 ? "closing_soon" : "open",
    todayLabel,
    minutesUntilClose: left,
  };
}

function parseHHMM(s: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const mn = parseInt(m[2], 10);
  if (h < 0 || h > 23 || mn < 0 || mn > 59) return null;
  return h * 60 + mn;
}

// iter-197 — Find the next bureau-open Date relative to `from`. Walks
// forward up to 14 days looking for a non-holiday day with `open=true`
// + valid openHHMM. Used by the onboarding-pickup-reminder cron to ask
// "are we within X minutes of opening?". Returns null if the bureau is
// closed for the entire 14-day window (configuration error).
export function nextOpenDate(cfg: OperatingHoursConfig, from: Date = new Date()): Date | null {
  const tz = cfg.timezone;
  for (let dayOffset = 0; dayOffset <= 14; dayOffset++) {
    const probe = new Date(from.getTime() + dayOffset * 24 * 3600 * 1000);
    // Resolve probe day in bureau TZ.
    const fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hour12: false,
    });
    const parts = fmt.formatToParts(probe);
    const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
    const isoDay = `${get("year")}-${get("month")}-${get("day")}`;
    const weekdayShort = get("weekday").toLowerCase().slice(0, 3);
    const dayIdx = ["sun","mon","tue","wed","thu","fri","sat"].indexOf(weekdayShort);

    const holiday = cfg.holidays.find((h) => h.date === isoDay) ?? null;
    let openHHMM: string | undefined;
    if (holiday) {
      if (holiday.closed) continue;
      openHHMM = holiday.openClose?.open;
    } else {
      const day = cfg.weekly[dayIdx];
      if (!day?.open) continue;
      openHHMM = day.openHHMM;
    }
    if (!openHHMM) continue;

    // Build the open Date for that day in bureau TZ. We approximate by
    // formatting the bureau-tz wall-clock-time string and re-parsing —
    // browsers + Node both handle this for IANA tz names.
    const [hh, mm] = openHHMM.split(":").map((s) => parseInt(s, 10));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue;
    const candidate = wallClockToDate(isoDay, hh, mm, tz);
    if (candidate.getTime() > from.getTime()) return candidate;
  }
  return null;
}

// Approximate a wall-clock instant in tz to a UTC Date. Computes the
// offset by formatting a known UTC value in tz and reading the parts
// back. Sufficient accuracy for cron-level (minute-grained) decisions.
function wallClockToDate(isoDay: string, hour: number, minute: number, tz: string): Date {
  // Start from naive UTC interpretation, then correct by the TZ offset
  // at that moment.
  const naive = new Date(`${isoDay}T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00Z`);
  const fmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit", year: "numeric", month: "2-digit", day: "2-digit" });
  const parts = fmt.formatToParts(naive);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const tzHour = parseInt(get("hour"), 10);
  const tzMin = parseInt(get("minute"), 10);
  // Offset = (UTC time as seen in tz) − (intended local time)
  const offsetMin = (tzHour * 60 + tzMin) - (hour * 60 + minute);
  return new Date(naive.getTime() - offsetMin * 60 * 1000);
}
