"use client";

/**
 * iter-219 — Bureau capacity heatmap admin panel (Tier 16 #128).
 *
 * 7×24 colored matrix (rows = days Sun..Sat, cols = 24 hours of the
 * day) with green→amber→red intensity scaling per-cell relative to
 * the panel's own peak. Top tiles surface peak day/hour + busiest
 * 3-hour window so admin sees "Mondays 11am" and "Sat 10am-1pm" at
 * a glance.
 */

import { useEffect, useState, useTransition } from "react";
import { getCapacityHeatmap, dayOfWeekName, type HeatmapResult } from "@/app/actions/capacityHeatmap";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  blueDeep: "#0F5BD9",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const WINDOWS = [14, 30, 90, 180] as const;

function cellStyle(count: number, peak: number): React.CSSProperties {
  if (count === 0 || peak === 0) {
    return { background: "#fafaf7", color: "rgba(45,16,15,0.30)", border: "1px dashed rgba(45,16,15,0.10)" };
  }
  const intensity = Math.min(1, count / peak);
  // Scale: 0..0.4 green, 0.4..0.75 amber, 0.75..1 red
  if (intensity < 0.4) {
    const a = 0.18 + intensity * 0.5;
    return { background: `rgba(34,197,94,${a.toFixed(2)})`, color: intensity > 0.25 ? "white" : "#15803d", border: "1px solid rgba(34,197,94,0.40)" };
  }
  if (intensity < 0.75) {
    const a = 0.30 + intensity * 0.4;
    return { background: `rgba(245,158,11,${a.toFixed(2)})`, color: "white", border: "1px solid rgba(245,158,11,0.45)" };
  }
  const a = 0.55 + (intensity - 0.75) * 1.2;
  return { background: `rgba(239,68,68,${Math.min(0.95, a).toFixed(2)})`, color: "white", border: "1px solid rgba(239,68,68,0.50)" };
}

function fmtHour(h: number): string {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
}

export default function AdminCapacityHeatmapPanel() {
  const [windowDays, setWindowDays] = useState<number>(90);
  const [data, setData] = useState<HeatmapResult | null>(null);
  const [busy, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      try {
        const r = await getCapacityHeatmap({ windowDays });
        setData(r);
      } catch { setData(null); }
    });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [windowDays]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Operations · Capacity
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>Bureau capacity heatmap</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          When are your busy + quiet hours? Aggregates intake + pickups + bell rings + appointments by day-of-week × hour-of-day in your bureau timezone, so you can staff around the actual peaks instead of guessing.
        </p>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {WINDOWS.map((d) => (
          <button key={d} type="button" onClick={() => setWindowDays(d)}
            className="text-[10.5px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: windowDays === d ? T.blue : "white",
              color: windowDays === d ? "white" : T.ink,
              border: `1px solid ${windowDays === d ? T.blue : T.border}`,
            }}>
            Last {d}d
          </button>
        ))}
        <button type="button" onClick={refresh} disabled={busy} className="text-[10.5px] font-bold px-2.5 py-1 rounded-full ml-auto" style={{ background: "white", color: T.inkSoft, border: `1px solid ${T.border}` }}>
          {busy ? "…" : "↻"} Refresh
        </button>
      </div>

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile label="Total events" value={data.totalEvents} accent={T.blueDeep} />
            <Tile label="Peak hour" value={data.peakCount > 0 ? `${dayOfWeekName(data.peakDayOfWeek)} ${fmtHour(data.peakHour)}` : "—"} accent={T.danger} />
            <Tile label="Busiest 3h window" value={data.busiestWindow && data.busiestWindow.count > 0 ? `${dayOfWeekName(data.busiestWindow.day)} ${fmtHour(data.busiestWindow.startHour)}-${fmtHour(data.busiestWindow.endHour)}` : "—"} accent={T.warning} />
            <Tile label="Bureau TZ" value={data.timezone} accent={T.inkFaint} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Tile label="📦 Intake" value={data.byKind.intake} accent={T.success} />
            <Tile label="✓ Pickup" value={data.byKind.pickup} accent={T.blueDeep} />
            <Tile label="🛎️ Bell ring" value={data.byKind.bellring} accent={T.warning} />
            <Tile label="📅 Appointment" value={data.byKind.appointment} accent={T.inkSoft} />
          </div>

          {/* The matrix — first column is day labels, then 24 hour cells */}
          <div className="rounded-2xl bg-white border p-3 overflow-x-auto" style={{ borderColor: T.border }}>
            <div style={{ display: "grid", gridTemplateColumns: "44px repeat(24, 1fr)", gap: 2, minWidth: 660 }}>
              {/* Header row: empty + 24 hour labels */}
              <div />
              {Array.from({ length: 24 }, (_, h) => (
                <div key={h} style={{ textAlign: "center", fontSize: 9, fontWeight: 700, color: T.inkFaint, letterSpacing: ".05em" }}>
                  {h % 3 === 0 ? fmtHour(h) : ""}
                </div>
              ))}
              {/* 7 day rows */}
              {Array.from({ length: 7 }, (_, d) => (
                <RowFragment key={d} d={d} cells={data.cells.filter((c) => c.dayOfWeek === d)} peak={data.peakCount} />
              ))}
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-[10.5px]" style={{ color: T.inkFaint }}>
            <Legend swatch="#fafaf7" label="No activity" />
            <Legend swatch="rgba(34,197,94,0.50)" label="Quiet" />
            <Legend swatch="rgba(245,158,11,0.55)" label="Busy" />
            <Legend swatch="rgba(239,68,68,0.80)" label="Peak" />
          </div>

          <p className="text-[10px]" style={{ color: T.inkFaint }}>
            Cell intensity scales relative to the panel&apos;s own peak. Aggregates intake (MailItem.createdAt), pickups (pickupSignedAt), bell rings (iter-217), and appointments (iter-101) over the selected window.
          </p>
        </>
      )}
    </div>
  );
}

function RowFragment({ d, cells, peak }: { d: number; cells: { hour: number; count: number }[]; peak: number }) {
  return (
    <>
      <div style={{ fontSize: 11, fontWeight: 800, color: "#3B4252", display: "flex", alignItems: "center", paddingLeft: 4 }}>
        {dayOfWeekName(d)}
      </div>
      {Array.from({ length: 24 }, (_, h) => {
        const cell = cells.find((c) => c.hour === h) ?? { hour: h, count: 0 };
        return (
          <div key={h}
            title={`${dayOfWeekName(d)} ${fmtHour(h)}–${fmtHour((h + 1) % 24)} · ${cell.count} event${cell.count === 1 ? "" : "s"}`}
            style={{
              ...cellStyle(cell.count, peak),
              borderRadius: 3,
              padding: "6px 0",
              textAlign: "center",
              fontSize: 9.5,
              fontWeight: 800,
              fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
              cursor: "default",
            }}>
            {cell.count > 0 ? cell.count : ""}
          </div>
        );
      })}
    </>
  );
}

function Tile({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-md bg-white p-3" style={{ border: `1px solid ${T.border}` }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: accent, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>{value}</p>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: "white", border: `1px solid ${T.border}` }}>
      <span className="inline-block w-3 h-3 rounded" style={{ background: swatch }} />
      {label}
    </span>
  );
}
