"use client";

/**
 * Real-time Open / Closed sign for the public landing.
 *
 * iter-238 (round 84): now reads from the live operating-hours config that
 * the admin can edit, instead of hardcoded windows. Server-component wrapper
 * fetches the config and passes it as a prop. We re-derive status every
 * minute from the customer's local clock against the bureau timezone.
 *
 * Holiday closures + custom day windows + lunch breaks all flow through
 * `isOpenNow()` from the operating-hours lib (same path the footer uses).
 */
import { useEffect, useState } from "react";
import type { OperatingHoursConfig } from "@/lib/operating-hours";
import { isOpenNow, nextOpenDate, DEFAULT_HOURS } from "@/lib/operating-hours";

// Defensive: HMR / SSR-stream edge cases occasionally hand the client
// component an undefined prop before hydration completes. We accept undefined
// and fall back to DEFAULT_HOURS so the badge stays rendered (just shows
// stock hours) instead of throwing into the error boundary.
type Props = { hours?: OperatingHoursConfig };

type SignState = {
  status: "open" | "lunch" | "closed";
  headline: string;
  next: string;
};

/** Format a Date as "Mon 9:30 am" or "9:30 am tomorrow" or "9:30 am" depending on
 * how far out the next-open instant is. Keeps the badge compact. */
function nextOpenLabel(next: Date, now: Date, tz: string): string {
  const fmtTime = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true,
  });
  const time = fmtTime.format(next).toLowerCase().replace(/\s+/g, " ");
  // Compute calendar-day delta in bureau TZ
  const dayFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  const todayKey = dayFmt.format(now);
  const nextKey = dayFmt.format(next);
  if (todayKey === nextKey) return `Opens ${time}`;
  // Tomorrow check
  const tomorrow = new Date(now.getTime() + 24 * 3600 * 1000);
  if (dayFmt.format(tomorrow) === nextKey) return `Opens ${time} tomorrow`;
  // Otherwise show weekday name
  const wkFmt = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short" });
  return `Opens ${wkFmt.format(next)} ${time}`;
}

/** Read today's break-end HH:MM from the live config, using bureau TZ to pick
 * the weekday. Returns null when today has no break window configured. */
function todaysBreakEnd(hours: OperatingHoursConfig, now: Date): string | null {
  const wkFmt = new Intl.DateTimeFormat("en-US", { timeZone: hours.timezone, weekday: "short" });
  const weekdayShort = wkFmt.format(now).toLowerCase().slice(0, 3);
  const dayIdx = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].indexOf(weekdayShort);
  if (dayIdx < 0) return null;
  return hours.weekly[dayIdx]?.breakHHMM?.[1] ?? null;
}

/** Format a 24-hour HH:MM as a compact "2:00 pm" / "9:30 am" string. */
function format12h(hhmm: string): string {
  const [hh, mm] = hhmm.split(":").map((s) => parseInt(s, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return hhmm;
  const ampm = hh >= 12 ? "pm" : "am";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm === 0 ? `${h12}:00 ${ampm}` : `${h12}:${String(mm).padStart(2, "0")} ${ampm}`;
}

function compute(hours: OperatingHoursConfig): SignState {
  const now = new Date();
  const r = isOpenNow(hours, now);
  const headline =
    r.status === "open" ? "Open Now"
    : r.status === "closing_soon" ? "Closing Soon"
    : r.status === "break" ? "On Lunch"
    : r.status === "closed_holiday" ? `Closed · ${r.holiday?.label ?? "holiday"}`
    : "Closed";
  let next: string;
  if (r.status === "open" || r.status === "closing_soon") {
    next = r.minutesUntilClose != null ? `Closes in ${r.minutesUntilClose} min` : r.todayLabel;
  } else if (r.status === "break") {
    // Read the live break-end time off the config instead of hardcoding "2:00 pm"
    // — admin can shift the lunch window via /admin/hours, and the badge needs
    // to stay in sync with the same source the footer pulls from.
    const be = todaysBreakEnd(hours, now);
    next = be ? `Back at ${format12h(be)}` : "Back soon";
  } else {
    // Forward-looking: when do we reopen? Falls back to todayLabel if no next.
    const nd = nextOpenDate(hours, now);
    next = nd ? nextOpenLabel(nd, now, hours.timezone) : `Today: ${r.todayLabel}`;
  }
  const status =
    r.status === "open" || r.status === "closing_soon" ? "open"
    : r.status === "break" ? "lunch"
    : "closed";
  return { status, headline, next };
}

export function OpenClosedSign({ hours }: Props) {
  // Resolve once per render — falls back to DEFAULT_HOURS if prop missing.
  const safeHours = hours ?? DEFAULT_HOURS;
  // Initial state computed from the SSR config — server-rendered status
  // matches the user's first paint, so no "Closed" flash before hydration.
  const [state, setState] = useState<SignState>(() => compute(safeHours));

  useEffect(() => {
    function tick() {
      setState(compute(safeHours));
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [safeHours]);

  const { status, headline, next } = state;
  const isOpen = status === "open";
  const isLunch = status === "lunch";

  return (
    <div
      // Hidden on mobile because MobileStickyCTA already occupies the bottom-3
      // band with its own Call button — overlapping floats look broken. Sign
      // re-appears at tablet+ where there's room for both bottom-right corner
      // and a separate sticky CTA (which is itself md:hidden-only).
      className="hidden sm:block fixed z-40 right-6 bottom-6"
      aria-live="polite"
    >
      <a
        href="tel:+18185067744"
        className="group inline-flex items-center gap-2.5 pl-2.5 pr-3.5 py-2 rounded-full transition-all duration-300 hover:scale-[1.04] active:scale-[0.98]"
        style={{
          background: isOpen ? "#2D100F" : "#F7E6C2",
          color: isOpen ? "#F7E6C2" : "#2D100F",
          border: "2px solid #2D100F",
          boxShadow: isOpen
            ? "0 6px 24px rgba(45,16,15,0.3), 0 0 0 4px rgba(255,255,255,0.6)"
            : "0 6px 24px rgba(45,16,15,0.2), 0 0 0 4px rgba(255,255,255,0.6)",
          fontFamily: "var(--font-baloo), sans-serif",
        }}
        aria-label={isOpen ? "Open now — call us" : "Closed — call to leave a message"}
      >
        {/* Status dot */}
        <span className="relative inline-flex items-center justify-center w-3 h-3">
          {isOpen && (
            <span
              className="absolute inline-flex w-full h-full rounded-full opacity-70 animate-ping"
              style={{ background: "#16a34a" }}
            />
          )}
          <span
            className="relative inline-flex w-2.5 h-2.5 rounded-full"
            style={{
              background: isOpen ? "#16a34a" : isLunch ? "#F5A623" : "#9CA3AF",
              border: "1.5px solid #2D100F",
            }}
          />
        </span>

        <div className="leading-tight">
          <p className="text-[12px] font-black uppercase tracking-[0.18em]">
            {headline}
          </p>
          <p className="text-[10px] font-semibold opacity-80">{next}</p>
        </div>

        {/* Hover-only phone hint */}
        <span className="hidden sm:inline-flex items-center gap-1 ml-1 pl-2 text-[11px] font-bold transition-opacity duration-300 opacity-0 group-hover:opacity-100" style={{ borderLeft: `1.5px solid ${isOpen ? "rgba(247,230,194,0.3)" : "rgba(45,16,15,0.2)"}` }}>
          <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden="true">
            <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57a1 1 0 0 0-1.02.24l-2.2 2.2a15.05 15.05 0 0 1-6.59-6.59l2.2-2.2a1 1 0 0 0 .25-1.02A11.36 11.36 0 0 1 8.5 4a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1c0 9.39 7.61 17 17 17a1 1 0 0 0 1-1v-3.5a1 1 0 0 0-1-1z" />
          </svg>
          Call
        </span>
      </a>
    </div>
  );
}
