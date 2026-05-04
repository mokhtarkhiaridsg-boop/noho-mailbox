// iter-90 — Live operating-hours status pill.
//
// Shows "Open · closes in 2h" / "Open · closing soon" / "On lunch break" /
// "Closed today · opens Mon 9:30am" / "Closed · {holiday}". Pure server
// component — no client hydration needed because operating hours don't
// change minute-to-minute. Recomputed on every request render via
// `dynamic = "force-dynamic"` on the host page (or the existing 60s
// auto-refresh on the panel that consumes it).

import { getOperatingHours } from "@/app/actions/operatingHours";
import { isOpenNow } from "@/lib/operating-hours";

const STATUS_STYLES = {
  open:           { bg: "rgba(22,163,74,0.14)", fg: "#15803d", dot: "#16A34A" },
  closing_soon:   { bg: "rgba(245,166,35,0.14)", fg: "#92400e", dot: "#F5A623" },
  break:          { bg: "rgba(245,166,35,0.10)", fg: "#92400e", dot: "#F5A623" },
  closed_today:   { bg: "rgba(45,16,15,0.06)",  fg: "rgba(45,16,15,0.55)", dot: "rgba(45,16,15,0.40)" },
  closed_holiday: { bg: "rgba(231,0,19,0.10)",  fg: "#991b1b", dot: "#E70013" },
} as const;

const STATUS_LABEL: Record<keyof typeof STATUS_STYLES, string> = {
  open: "Open now",
  closing_soon: "Closing soon",
  break: "On lunch break",
  closed_today: "Closed",
  closed_holiday: "Closed · holiday",
};

export async function HoursStatusPill({ compact = false }: { compact?: boolean }) {
  const cfg = await getOperatingHours();
  const result = isOpenNow(cfg);
  const s = STATUS_STYLES[result.status];

  if (compact) {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[10.5px] font-black uppercase tracking-wider px-2 py-1 rounded-full"
        style={{ background: s.bg, color: s.fg }}
        title={result.todayLabel}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: s.dot, boxShadow: `0 0 6px ${s.dot}` }} />
        {STATUS_LABEL[result.status]}
      </span>
    );
  }

  // Full pill — adds the today line + minutes-until-close when relevant.
  const sub =
    result.status === "open" || result.status === "closing_soon" || result.status === "break"
      ? `${result.todayLabel}${result.minutesUntilClose != null ? ` · closes in ${formatMinutes(result.minutesUntilClose)}` : ""}`
      : result.status === "closed_holiday"
      ? `${result.holiday?.label}${result.holiday?.note ? ` · ${result.holiday.note}` : ""}`
      : `Today: ${result.todayLabel}`;

  return (
    <div
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.dot}30` }}
    >
      <span className="inline-block w-2 h-2 rounded-full" style={{ background: s.dot, boxShadow: `0 0 8px ${s.dot}` }} />
      <span>
        <span className="text-[10.5px] font-black uppercase tracking-wider">{STATUS_LABEL[result.status]}</span>
        <span className="block text-[10.5px] mt-0.5" style={{ opacity: 0.85 }}>{sub}</span>
      </span>
    </div>
  );
}

function formatMinutes(m: number): string {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}
