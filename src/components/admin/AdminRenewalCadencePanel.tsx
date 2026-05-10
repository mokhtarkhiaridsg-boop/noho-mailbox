"use client";

/**
 * iter-222 — Admin renewal-cadence panel (Tier 16 #131).
 *
 * Lists members with their personalized lead-time profiles. Top
 * "Recompute all" button forces a full sweep. Per-row shows lead
 * time + sample size + median latency + planDueDate.
 */

import { useEffect, useState, useTransition } from "react";
import { listRenewalCadences, adminRecomputeAllCadences, type CadenceRow } from "@/app/actions/renewalCadence";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

export default function AdminRenewalCadencePanel() {
  const [filter, setFilter] = useState<"all" | "personal" | "default">("all");
  const [rows, setRows] = useState<CadenceRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);

  function refresh() {
    void listRenewalCadences({ source: filter === "all" ? undefined : filter, limit: 200 }).then(setRows).catch(() => setRows([]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [filter]);

  function onRecompute() {
    setInfo(null);
    startTransition(async () => {
      const res = await adminRecomputeAllCadences();
      setInfo(`✓ Recomputed ${res.recomputed}/${res.scanned} · ${res.personalProfiles} personalized`);
      refresh();
    });
  }

  const personal = rows?.filter((r) => r.profile.source === "personal").length ?? 0;
  const fallback = rows?.filter((r) => r.profile.source === "default").length ?? 0;
  const avgLead = rows && rows.length > 0
    ? Math.round((rows.reduce((s, r) => s + r.profile.leadTimeDays, 0) / rows.length) * 10) / 10
    : 0;

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
          Renewal Cadence
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
          nudge at just the right moment
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {rows ? `${personal} personalized · avg ${avgLead}d` : "live console"}
        </span>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}

      <div className="grid grid-cols-3 gap-2">
        <Tile label="Members" value={rows?.length ?? 0} accent={T.inkSoft} />
        <Tile label="Personalized" value={personal} accent={T.success} />
        <Tile label="Avg lead time" value={`${avgLead}d`} accent={T.blue} />
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {(["all", "personal", "default"] as const).map((f) => (
          <button key={f} type="button" onClick={() => setFilter(f)}
            className="text-[10.5px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: filter === f ? T.blue : "white",
              color: filter === f ? "white" : T.ink,
              border: `1px solid ${filter === f ? T.blue : T.border}`,
            }}>
            {f === "all" ? "All" : f === "personal" ? `Personalized (${personal})` : `Default 7d (${fallback})`}
          </button>
        ))}
        <button type="button" onClick={onRecompute} disabled={busy}
          className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50 ml-auto" style={{ background: T.blue }}>
          {busy ? "Recomputing…" : "↻ Recompute all"}
        </button>
      </div>

      {!rows ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No members in this view.
        </div>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.userId} className="rounded-xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[12.5px] font-black" style={{ color: T.ink }}>{r.userName}</span>
                    <span className="text-[10.5px]" style={{ color: T.inkFaint }}>· {r.email}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: r.profile.source === "personal" ? "rgba(34,197,94,0.10)" : "rgba(122,130,144,0.10)", color: r.profile.source === "personal" ? "#15803d" : T.inkSoft }}>
                      {r.profile.source}
                    </span>
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: T.inkSoft }}>
                    Lead time: <strong style={{ color: T.blue }}>{r.profile.leadTimeDays}d</strong>
                    {r.profile.source === "personal" && (
                      <span> · median latency {r.profile.medianLatencyDays >= 0 ? "+" : ""}{r.profile.medianLatencyDays}d (n={r.profile.sampleSize})</span>
                    )}
                    {r.planDueDate && <span> · due {r.planDueDate}</span>}
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
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
