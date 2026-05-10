"use client";

/**
 * iter-199 — Supply consumption-velocity forecast admin panel (Tier 14 #108).
 *
 * Reads getSupplyForecasts and renders 4 stat tiles + a sorted list
 * of supplies grouped by urgency. Each row shows on-hand vs reorderAt,
 * the three velocity readings (with a "🔥 surging" or "🌬️ quieting"
 * acceleration chip), the projected reorder/stockout dates, and a
 * concrete recommendation line. Lead-time slider lets admin tune the
 * urgency thresholds for their actual vendor turnaround.
 */

import { useEffect, useState, useTransition } from "react";
import {
  getSupplyForecasts,
  type SupplyForecastRow,
  type SupplyForecastSummary,
} from "@/app/actions/supplyForecast";

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

const URGENCY_COLOR: Record<SupplyForecastRow["urgency"], { bg: string; fg: string; ring: string; label: string }> = {
  critical: { bg: "rgba(239,68,68,0.10)", fg: "#b91c1c", ring: "rgba(239,68,68,0.45)", label: "CRITICAL" },
  warning:  { bg: "rgba(245,158,11,0.12)", fg: "#92400e", ring: "rgba(245,158,11,0.40)", label: "WATCH"   },
  ok:       { bg: "rgba(34,197,94,0.10)",  fg: "#15803d", ring: "rgba(34,197,94,0.30)",  label: "HEALTHY" },
  unknown:  { bg: "rgba(122,130,144,0.10)", fg: "#3B4252", ring: "rgba(122,130,144,0.30)", label: "—"      },
};

export default function AdminSupplyForecastPanel() {
  const [leadTime, setLeadTime] = useState(5);
  const [data, setData] = useState<{ rows: SupplyForecastRow[]; summary: SupplyForecastSummary } | null>(null);
  const [busy, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      try {
        const r = await getSupplyForecasts({ leadTimeDays: leadTime });
        setData(r);
      } catch { setData(null); }
    });
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [leadTime]);

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2
          className="text-2xl font-bold"
          style={{
            color: "#1A1D23",
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
          }}
        >
          Supply Forecast
        </h2>
        <span
          className="text-[15px] hidden sm:inline"
          style={{
            color: "#1976FF",
            fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
            transform: "translateY(-1px)",
            display: "inline-block",
          }}
        >
          order before you run out
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {data?.summary.critical ?? 0} critical · {data?.summary.warning ?? 0} watch
        </span>
      </div>
      <div>
        <p className="text-[11px]" style={{ color: T.inkFaint }}>
          Per-supply consumption velocity (7d/30d/90d) projected against on-hand to surface "reorder by ${"{date}"}". Fold in your vendor lead time so urgency reflects when you actually need to click buy.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Critical" value={data?.summary.critical ?? 0} accent={T.danger} />
        <Tile label="Watch" value={data?.summary.warning ?? 0} accent={T.warning} />
        <Tile label="Healthy" value={data?.summary.ok ?? 0} accent={T.success} />
        <Tile label="No history" value={data?.summary.unknown ?? 0} accent={T.inkFaint} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <label className="text-[11px] font-bold flex items-center gap-1.5" style={{ color: T.inkSoft }}>
          Vendor lead time:
          <input type="range" min={0} max={30} value={leadTime} onChange={(e) => setLeadTime(parseInt(e.target.value, 10))} style={{ width: 160 }} />
          <span className="font-mono font-black" style={{ color: T.blueDeep, minWidth: 40, textAlign: "right" }}>{leadTime}d</span>
        </label>
        <span className="text-[10px]" style={{ color: T.inkFaint }}>
          Critical = ≤ lead time · Watch = ≤ lead+14d
        </span>
        <button type="button" onClick={refresh} disabled={busy} className="text-[10.5px] font-bold px-2.5 py-1 rounded-full ml-auto" style={{ background: "white", color: T.inkSoft, border: `1px solid ${T.border}` }}>
          {busy ? "…" : "↻"} Refresh
        </button>
      </div>

      {!data ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : data.rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No active supplies. Add some in the Supplies panel to see forecasts here.
        </div>
      ) : (
        <ul className="space-y-2">
          {data.rows.map((r) => (
            <ForecastRow key={r.id} r={r} />
          ))}
        </ul>
      )}

      <p className="text-[10px] mt-4" style={{ color: T.inkFaint }}>
        Velocity counts only consumption rows (sale + internal_use + loss). Restocks and adjustments don't affect projections.
      </p>
    </div>
  );
}

function ForecastRow({ r }: { r: SupplyForecastRow }) {
  const u = URGENCY_COLOR[r.urgency];
  const accel = r.accelerationRatio;
  return (
    <li className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${u.ring}` }}>
      <div className="flex items-start gap-3 flex-wrap">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-[0.10em]" style={{ background: u.bg, color: u.fg }}>
              {u.label}
            </span>
            <span className="text-[12.5px] font-black" style={{ color: T.ink }}>{r.name}</span>
            <span className="text-[10px]" style={{ color: T.inkFaint }}>· {r.category}</span>
            {r.vendor && <span className="text-[10px]" style={{ color: T.inkFaint }}>· {r.vendor}</span>}
          </div>
          <p className="text-[11.5px] mt-1" style={{ color: T.ink }}>{r.recommendation}</p>
          <div className="flex flex-wrap gap-1.5 mt-1.5 text-[10px]">
            <Pill label={`On-hand: ${r.onHand} ${r.unit}${r.onHand === 1 ? "" : "s"}`} accent={r.onHand <= r.reorderAt ? T.danger : T.ink} />
            <Pill label={`Reorder at: ${r.reorderAt}`} accent={T.inkSoft} />
            <Pill label={`Reorder qty: ${r.reorderQty}`} accent={T.inkFaint} />
            {r.daysUntilReorder != null && (
              <Pill label={`${r.daysUntilReorder}d to reorder`} accent={r.daysUntilReorder <= 7 ? T.danger : r.daysUntilReorder <= 14 ? T.warning : T.success} />
            )}
            {r.daysUntilStockout != null && (
              <Pill label={`${r.daysUntilStockout}d to empty`} accent={r.daysUntilStockout <= 7 ? T.danger : T.inkSoft} />
            )}
            {r.reorderByDateIso && (
              <Pill label={`by ${new Date(r.reorderByDateIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}`} accent={T.blueDeep} />
            )}
          </div>
          <div className="flex flex-wrap gap-1 mt-1.5 text-[10px]" style={{ color: T.inkFaint }}>
            <span className="font-mono">7d: <strong style={{ color: T.ink }}>{r.velocity7d.toFixed(2)}/day</strong></span>
            <span style={{ color: T.border }}>·</span>
            <span className="font-mono">30d: <strong style={{ color: T.ink }}>{r.velocity30d.toFixed(2)}/day</strong></span>
            <span style={{ color: T.border }}>·</span>
            <span className="font-mono">90d: <strong style={{ color: T.ink }}>{r.velocity90d.toFixed(2)}/day</strong></span>
            {accel != null && accel >= 1.5 && <span className="font-bold" style={{ color: T.danger }}>· 🔥 surging ×{accel.toFixed(1)}</span>}
            {accel != null && accel <= 0.5 && <span className="font-bold" style={{ color: T.inkFaint }}>· 🌬️ quieting ×{accel.toFixed(1)}</span>}
            {r.velocityUsed > 0 && <span className="ml-auto">projection uses {r.velocityWindowDays}d window</span>}
          </div>
        </div>
      </div>
    </li>
  );
}

function Pill({ label, accent }: { label: string; accent: string }) {
  return (
    <span className="px-1.5 py-0.5 rounded font-bold" style={{ background: T.surfaceAlt, color: accent, border: `1px solid ${T.border}` }}>
      {label}
    </span>
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
