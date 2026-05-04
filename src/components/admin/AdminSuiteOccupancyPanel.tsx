"use client";

// iter-117 — Mailbox suite occupancy heatmap.
//
// Visual grid of every suite # in the occupied range. Color-coded by
// status with hover/click for detail. Stat tiles top-row drive ops
// decisions (which dormant boxes to dunning-call, vacancy % vs target).

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getSuiteOccupancy,
  type SuiteCell,
  type SuiteOccupancyResult,
} from "@/app/actions/suiteOccupancy";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

type Filter = "all" | "active" | "dormant" | "vacant";

export default function AdminSuiteOccupancyPanel() {
  const [data, setData] = useState<SuiteOccupancyResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("all");
  const [selected, setSelected] = useState<SuiteCell | null>(null);

  function refresh() {
    startTransition(async () => {
      try {
        const r = await getSuiteOccupancy();
        setData(r);
      } catch {
        setData(null);
      }
    });
  }
  useEffect(() => { refresh(); }, []);

  const visible = useMemo(() => {
    if (!data) return [];
    if (filter === "all") return data.cells;
    if (filter === "active") return data.cells.filter((c) => c.status === "occupied_active");
    if (filter === "dormant") return data.cells.filter((c) => c.status === "occupied_dormant");
    return data.cells.filter((c) => c.status === "vacant");
  }, [data, filter]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          Operations · Suite occupancy
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Mailbox occupancy heatmap</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          Every suite in the range, color-coded by activity. Tap a cell for the customer + last-30d mail count. Vacancies stand out so you know where to direct new signups.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Tile label="Range" value={data ? `#${String(data.rangeMin).padStart(3, "0")}–${String(data.rangeMax).padStart(3, "0")}` : "—"} accent={NOHO_INK} />
        <Tile label="Occupied" value={data?.occupied ?? 0} accent={NOHO_BLUE_DEEP} />
        <Tile label="Vacant" value={data?.vacant ?? 0} accent="#92400e" />
        <Tile label="Dormant (30d)" value={data?.dormant ?? 0} accent="#a16207" />
        <Tile label="Occupancy" value={`${data?.occupancyPct ?? 0}%`} accent="#15803d" />
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {(["all", "active", "dormant", "vacant"] as Filter[]).map((f) => {
          const active = filter === f;
          const label = f === "all" ? "All" : f === "active" ? "Active" : f === "dormant" ? "Dormant" : "Vacant";
          return (
            <button key={f} type="button" onClick={() => setFilter(f)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{
                background: active ? NOHO_BLUE : "white",
                color: active ? "white" : NOHO_INK,
                border: `1px solid ${active ? NOHO_BLUE : "#e8e5e0"}`,
              }}>
              {label}
            </button>
          );
        })}
        <span className="ml-2 text-[11px]" style={{ color: "rgba(45,16,15,0.55)" }}>
          {pending ? "Loading…" : `${visible.length} of ${data?.totalSuitesInRange ?? 0} suites · ${data?.recentMailVolume ?? 0} mail items in last 30d`}
        </span>
      </div>

      {/* Heatmap grid */}
      <div className="rounded-2xl bg-white border p-3" style={{ borderColor: "#e8e5e0" }}>
        {!data ? (
          <p className="px-2 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
        ) : data.cells.length === 0 ? (
          <p className="px-2 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>No occupied suites yet.</p>
        ) : (
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(54px, 1fr))" }}>
            {visible.map((c) => (
              <button
                key={c.suite}
                type="button"
                onClick={() => setSelected(c)}
                className="aspect-square rounded-md flex flex-col items-center justify-center text-[10px] font-mono font-black transition-transform hover:scale-110"
                style={cellStyle(c)}
                title={c.status === "vacant"
                  ? `Suite ${c.suite} · vacant`
                  : `${c.userName ?? "(unknown)"} · suite ${c.suite} · ${c.recentMailCount} mail items in last 30d${c.daysSinceLastIntake != null ? ` · last intake ${c.daysSinceLastIntake}d ago` : ""}`}
              >
                <span style={{ fontSize: 11 }}>{c.suite}</span>
                {c.status !== "vacant" && c.recentMailCount > 0 && (
                  <span style={{ fontSize: 8, opacity: 0.85 }}>×{c.recentMailCount}</span>
                )}
                {c.status === "vacant" && (
                  <span style={{ fontSize: 8, opacity: 0.7 }}>—</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>
        <Legend swatch="#16a34a" label="Active (mail in last 30d)" />
        <Legend swatch="#a16207" label="Dormant (occupied · no recent mail)" />
        <Legend swatch="#e8e5e0" label="Vacant" />
      </div>

      {/* Detail drawer */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(45,16,15,0.55)" }}
          onClick={() => setSelected(null)}>
          <div className="rounded-2xl bg-white max-w-md w-full p-5" style={{ border: "1px solid #e8e5e0" }}
            onClick={(e) => e.stopPropagation()}>
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
              Suite #{selected.suite}
            </p>
            {selected.status === "vacant" ? (
              <>
                <h3 className="text-lg font-black mt-1" style={{ color: NOHO_INK }}>Vacant</h3>
                <p className="text-[12px] mt-1" style={{ color: "rgba(45,16,15,0.55)" }}>
                  Available for the next signup. Use it in the New Customer wizard or assign manually from Mailbox Center.
                </p>
              </>
            ) : (
              <>
                <h3 className="text-lg font-black mt-1" style={{ color: NOHO_INK }}>{selected.userName ?? "(unknown)"}</h3>
                <p className="text-[11.5px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                  {selected.userEmail} · {selected.plan ?? "no plan"}
                </p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  <Stat label="Mail · 30d" value={selected.recentMailCount} />
                  <Stat label="Last intake" value={selected.daysSinceLastIntake != null ? `${selected.daysSinceLastIntake}d ago` : "never"} />
                  <Stat label="Status" value={selected.status === "occupied_active" ? "Active" : "Dormant"} />
                  <Stat label="Signed up" value={selected.signedUpAtIso ? new Date(selected.signedUpAtIso).toLocaleDateString() : "—"} />
                </div>
                {selected.userId && (
                  <a href={`/admin?tab=customers&q=${encodeURIComponent(selected.userEmail ?? "")}`}
                    className="mt-3 block w-full text-center py-2.5 rounded-lg text-white font-black text-[12px]"
                    style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}>
                    Open in customers →
                  </a>
                )}
              </>
            )}
            <button type="button" onClick={() => setSelected(null)}
              className="mt-3 w-full py-2 rounded-lg text-[11px] font-bold border"
              style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function cellStyle(c: SuiteCell): React.CSSProperties {
  if (c.status === "vacant") {
    return {
      background: "#fafaf7",
      color: "rgba(45,16,15,0.45)",
      border: "1px dashed rgba(45,16,15,0.20)",
    };
  }
  if (c.status === "occupied_dormant") {
    return {
      background: "rgba(245,166,35,0.18)",
      color: "#92400e",
      border: "1px solid rgba(245,166,35,0.40)",
    };
  }
  // occupied_active: gradient by intensity (more mail = saturate green more)
  const intensity = Math.min(1, c.recentMailCount / 10);
  const alpha = 0.18 + intensity * 0.55;
  return {
    background: `rgba(22,163,74,${alpha.toFixed(2)})`,
    color: intensity > 0.4 ? "white" : "#15803d",
    border: "1px solid rgba(22,163,74,0.40)",
  };
}

function Tile({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-md bg-white p-3" style={{ border: "1px solid #E5DACA" }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#998877" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: accent, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>{value}</p>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded" style={{ background: "white", border: "1px solid #e8e5e0" }}>
      <span className="inline-block w-3 h-3 rounded" style={{ background: swatch }} />
      {label}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(45,16,15,0.04)", border: "1px solid #e8e5e0" }}>
      <p className="text-[9.5px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>{label}</p>
      <p className="text-[13px] font-black tabular-nums" style={{ color: NOHO_INK }}>{value}</p>
    </div>
  );
}
