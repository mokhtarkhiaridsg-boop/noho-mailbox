"use client";

// iter-126 — Admin pickup wait-time predictor.
//
// Two halves: bureau-wide stats + the late-customer table sorted with the
// most-overdue at the top. Click a row to see the per-customer breakdown.

import { useEffect, useState, useTransition } from "react";
import {
  getPickupVelocityRollup,
  type PickupVelocityRollup,
  type CustomerVelocity,
} from "@/app/actions/pickupVelocity";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

type Filter = "all" | "late" | "withAvg" | "noData";

export default function AdminPickupVelocityPanel() {
  const [data, setData] = useState<PickupVelocityRollup | null>(null);
  const [pending, startTransition] = useTransition();
  const [filter, setFilter] = useState<Filter>("late");
  const [selected, setSelected] = useState<CustomerVelocity | null>(null);

  function refresh() {
    startTransition(async () => {
      try {
        const r = await getPickupVelocityRollup();
        setData(r);
      } catch {
        setData(null);
      }
    });
  }
  useEffect(() => { refresh(); }, []);

  const filtered = (data?.customers ?? []).filter((c) => {
    if (filter === "all") return true;
    if (filter === "late") return c.isLate;
    if (filter === "withAvg") return c.avgPickupDays != null;
    if (filter === "noData") return c.avgPickupDays == null;
    return true;
  });

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          Operations · Pickup velocity
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Pickup wait-time predictor</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          Each customer's historical avg time-to-pickup vs. their oldest current package. Anyone running &gt;50% over their own average gets flagged "late" — these are who to nudge first.
        </p>
      </div>

      {/* Top-line bureau stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Bureau avg" value={data?.bureauAvgDays != null ? `${data.bureauAvgDays}d` : "—"} accent={NOHO_BLUE_DEEP} />
        <Tile label="Pickups in window" value={data?.totalSamples ?? 0} accent={NOHO_INK} sub="last 180 days" />
        <Tile label="Late customers" value={data?.lateCount ?? 0} accent={(data?.lateCount ?? 0) > 0 ? "#991b1b" : "#15803d"} />
        <Tile label="Showing" value={filtered.length} accent={NOHO_BLUE_DEEP} />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {([
          { k: "late",    label: `Late (${data?.lateCount ?? 0})` },
          { k: "all",     label: `All (${data?.customers.length ?? 0})` },
          { k: "withAvg", label: "With history" },
          { k: "noData",  label: "First-time customers" },
        ] as { k: Filter; label: string }[]).map(({ k, label }) => {
          const active = filter === k;
          return (
            <button key={k} type="button" onClick={() => setFilter(k)}
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
          {pending ? "Loading…" : `${filtered.length} customers`}
        </span>
      </div>

      {/* Velocity table */}
      <div className="rounded-2xl bg-white border" style={{ borderColor: "#e8e5e0" }}>
        {!data ? (
          <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>
            {filter === "late" ? "No late customers — all caught up. ✓" : "No customers in this view."}
          </p>
        ) : (
          <ul>
            {filtered.map((c, i) => (
              <li key={c.userId} className="px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#fafaf7]" style={{ borderTop: i === 0 ? "none" : "1px solid #e8e5e0" }}
                onClick={() => setSelected(c)}>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] font-black truncate" style={{ color: NOHO_INK }}>
                    {c.name}
                    {c.suiteNumber && (
                      <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                        #{c.suiteNumber}
                      </span>
                    )}
                    {c.isLate && (
                      <span className="ml-1.5 text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>
                        ⚠️ Late
                      </span>
                    )}
                  </p>
                  <p className="text-[10.5px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                    {c.avgPickupDays != null
                      ? `Typical: ${c.avgPickupDays}d (${c.pickupSamples} prior pickups)`
                      : `No prior pickups yet`}
                    {c.awaitingCount > 0 && (
                      <span className="ml-1.5">
                        · waiting {c.awaitingCount} pkg
                        {c.oldestAwaitingDays != null && ` · oldest ${c.oldestAwaitingDays}d`}
                      </span>
                    )}
                    {c.predictedPickupBy && c.avgPickupDays != null && !c.isLate && (
                      <span className="ml-1.5" style={{ color: "#15803d" }}>
                        · expected ~{c.predictedPickupBy}
                      </span>
                    )}
                  </p>
                </div>
                {/* Tiny avg-vs-current bar */}
                {c.avgPickupDays != null && c.oldestAwaitingDays != null && (
                  <div className="shrink-0" style={{ width: 80 }}>
                    <Sparkbar avg={c.avgPickupDays} now={c.oldestAwaitingDays} late={c.isLate} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      {selected && <DetailDrawer customer={selected} onClose={() => setSelected(null)} />}
    </div>
  );
}

function Tile({ label, value, accent, sub }: { label: string; value: number | string; accent: string; sub?: string }) {
  return (
    <div className="rounded-md bg-white p-3" style={{ border: "1px solid #E5DACA" }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#998877" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: accent, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>{value}</p>
      {sub && <p className="text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>{sub}</p>}
    </div>
  );
}

function Sparkbar({ avg, now, late }: { avg: number; now: number; late: boolean }) {
  const max = Math.max(avg, now, 1) * 1.2;
  const avgPct = Math.min(100, (avg / max) * 100);
  const nowPct = Math.min(100, (now / max) * 100);
  return (
    <div style={{ position: "relative", height: 18 }}>
      {/* Background track */}
      <div style={{ position: "absolute", inset: 0, background: "#fafaf7", borderRadius: 4, border: "1px solid #e8e5e0" }} />
      {/* Avg marker */}
      <div style={{
        position: "absolute", left: `${avgPct}%`, top: -2, bottom: -2,
        width: 1.5, background: NOHO_BLUE_DEEP,
      }} title={`Avg ${avg}d`} />
      {/* Current bar */}
      <div style={{
        position: "absolute", left: 0, top: 3, bottom: 3,
        width: `${nowPct}%`,
        background: late ? "rgba(231,0,19,0.55)" : "rgba(51,116,133,0.55)",
        borderRadius: 3,
      }} title={`Now ${now}d`} />
      <p style={{
        position: "absolute", right: 4, top: 0, bottom: 0,
        margin: "auto 0", height: 14, lineHeight: "14px",
        fontSize: 10, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
        color: NOHO_INK, fontWeight: 800,
      }}>
        {now}d
      </p>
    </div>
  );
}

function DetailDrawer({ customer, onClose }: { customer: CustomerVelocity; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(45,16,15,0.55)" }}
      onClick={onClose}>
      <div className="rounded-2xl bg-white max-w-md w-full p-5" style={{ border: "1px solid #e8e5e0" }}
        onClick={(e) => e.stopPropagation()}>
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
          Customer
        </p>
        <h3 className="text-lg font-black mt-1" style={{ color: NOHO_INK }}>
          {customer.name}
          {customer.suiteNumber && (
            <span className="ml-2 text-[12px] font-mono" style={{ color: NOHO_BLUE_DEEP }}>
              #{customer.suiteNumber}
            </span>
          )}
        </h3>
        <p className="text-[11px]" style={{ color: "rgba(45,16,15,0.55)" }}>{customer.email}</p>

        <div className="grid grid-cols-2 gap-2 mt-3">
          <Stat label="Avg pickup" value={customer.avgPickupDays != null ? `${customer.avgPickupDays}d` : "—"} />
          <Stat label="Median" value={customer.medianPickupDays != null ? `${customer.medianPickupDays}d` : "—"} />
          <Stat label="Fastest" value={customer.fastestDays != null ? `${customer.fastestDays}d` : "—"} />
          <Stat label="Slowest" value={customer.slowestDays != null ? `${customer.slowestDays}d` : "—"} />
          <Stat label="Sample size" value={`${customer.pickupSamples} pickups`} />
          <Stat label="Now waiting" value={`${customer.awaitingCount} pkg`} />
        </div>

        {customer.awaitingCount > 0 && (
          <div className="mt-3 rounded-lg p-3" style={{ background: customer.isLate ? "rgba(231,0,19,0.06)" : "rgba(51,116,133,0.06)", border: `1px solid ${customer.isLate ? "rgba(231,0,19,0.30)" : "rgba(51,116,133,0.30)"}` }}>
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: customer.isLate ? "#991b1b" : NOHO_BLUE_DEEP }}>
              Oldest current package
            </p>
            <p className="text-[12.5px] mt-0.5" style={{ color: NOHO_INK }}>
              <strong>{customer.oldestAwaitingDays}d</strong> on shelf
              {customer.oldestAwaitingTracking && (
                <span className="ml-1.5 font-mono text-[10.5px]" style={{ color: NOHO_BLUE_DEEP }}>
                  {customer.oldestAwaitingTracking}
                </span>
              )}
            </p>
            {customer.isLate && customer.avgPickupDays != null && (
              <p className="text-[11px] mt-1" style={{ color: "#991b1b" }}>
                {Math.round(((customer.oldestAwaitingDays! / customer.avgPickupDays) - 1) * 100)}% over their typical pace — good candidate to nudge.
              </p>
            )}
            {customer.predictedPickupBy && (
              <p className="text-[10.5px] mt-1" style={{ color: "rgba(45,16,15,0.55)" }}>
                Predicted pickup by <strong>{customer.predictedPickupBy}</strong> based on history.
              </p>
            )}
          </div>
        )}

        <a href={`/admin?tab=customers&q=${encodeURIComponent(customer.email)}`}
          className="mt-3 block w-full text-center py-2.5 rounded-lg text-white font-black text-[12px]"
          style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}>
          Open customer →
        </a>
        <button type="button" onClick={onClose}
          className="mt-2 w-full py-2 rounded-lg text-[11px] font-bold border"
          style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
          Close
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: "rgba(45,16,15,0.04)", border: "1px solid #e8e5e0" }}>
      <p className="text-[9.5px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>{label}</p>
      <p className="text-[13px] font-black tabular-nums" style={{ color: NOHO_INK }}>{value}</p>
    </div>
  );
}
