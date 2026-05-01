"use client";

/**
 * Real-time Open / Closed sign for the public landing.
 * Computes the live state from the customer's local clock against our hours
 * (interpreted as Los Angeles time). Updates every minute.
 *
 * Hours:
 *   Mon–Fri  9:30am–5:30pm (with 1:30–2:00pm lunch break)
 *   Saturday 10:00am–1:30pm
 *   Sunday   Closed
 */
import { useEffect, useState } from "react";

type Status = "open" | "lunch" | "closed";

function nowInLA(): { day: number; hour: number; minute: number } {
  // Render a Date in LA tz then read parts.
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Los_Angeles",
    weekday: "short",
    hour: "numeric",
    minute: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(new Date());
  const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
  const dayMap: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  const day = dayMap[get("weekday")] ?? 0;
  const hour = parseInt(get("hour"), 10);
  const minute = parseInt(get("minute"), 10);
  return { day, hour, minute };
}

function compute(): { status: Status; nextChange: string } {
  const { day, hour, minute } = nowInLA();
  const minutes = hour * 60 + minute;

  // Mon–Fri (1–5): 9:30 (570) – 17:30 (1050) with lunch break 13:30 (810) – 14:00 (840)
  if (day >= 1 && day <= 5) {
    if (minutes < 570) return { status: "closed", nextChange: "Opens 9:30 am" };
    if (minutes < 810) return { status: "open", nextChange: "Lunch 1:30–2:00 pm" };
    if (minutes < 840) return { status: "lunch", nextChange: "Reopens 2:00 pm" };
    if (minutes < 1050) return { status: "open", nextChange: "Closes 5:30 pm" };
    return { status: "closed", nextChange: day === 5 ? "Opens Sat 10:00 am" : "Opens 9:30 am tomorrow" };
  }
  // Saturday: 10:00 (600) – 13:30 (810)
  if (day === 6) {
    if (minutes < 600) return { status: "closed", nextChange: "Opens 10:00 am" };
    if (minutes < 810) return { status: "open", nextChange: "Closes 1:30 pm" };
    return { status: "closed", nextChange: "Opens Mon 9:30 am" };
  }
  // Sunday
  return { status: "closed", nextChange: "Opens Mon 9:30 am" };
}

export function OpenClosedSign() {
  const [{ status, nextChange }, setState] = useState<{ status: Status; nextChange: string }>({
    status: "closed",
    nextChange: "",
  });

  useEffect(() => {
    function tick() {
      setState(compute());
    }
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, []);

  const isOpen = status === "open";
  const isLunch = status === "lunch";

  return (
    <div
      className="fixed z-40 right-4 bottom-4 sm:right-6 sm:bottom-6"
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
            {isOpen ? "Open Now" : isLunch ? "On Lunch" : "Closed"}
          </p>
          <p className="text-[10px] font-semibold opacity-80">{nextChange}</p>
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
