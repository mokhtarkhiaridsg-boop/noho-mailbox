"use client";

// iter-121 — Affiliate earnings dashboard.
//
// Layout:
//   - Top: 4 stat tiles (lifetime paid, current owed, active partners, this-month closed)
//   - Middle: 12-month closed-vs-paid bar chart (pure SVG)
//   - Left: leaderboard of partners by lifetime earnings
//   - Right: payout queue (oldest closed-but-not-paid commissions, click to mark paid)

import { useEffect, useState, useTransition } from "react";
import {
  getAffiliateRollup,
  markCommissionPaid,
  type AffiliateRollup,
} from "@/app/actions/affiliateEarnings";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

function fmtCents(c: number): string {
  return `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
function fmtCentsDecimal(c: number): string {
  return `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function AdminAffiliateEarningsPanel() {
  const [data, setData] = useState<AffiliateRollup | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() {
    void getAffiliateRollup().then(setData).catch(() => setData(null));
  }
  useEffect(() => { refresh(); }, []);

  function payoutNow(commissionId: string) {
    if (!confirm("Mark this commission paid? Records the payout date + writes audit.")) return;
    setMsg(null);
    startTransition(async () => {
      const res = await markCommissionPaid({ commissionId });
      if (res.error) { setMsg(res.error); return; }
      setMsg("✓ Marked paid");
      refresh();
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          Money & Comms · Affiliates
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Affiliate earnings</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          Lifetime payouts, current liability, monthly trend, and the payout queue. Mark commissions paid as you cut checks — each click writes an audit row.
        </p>
      </div>

      {msg && (
        <div className="rounded-xl px-3 py-2 text-[11.5px] font-bold"
          style={{
            background: msg.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: msg.startsWith("✓") ? "#15803d" : "#991b1b",
          }}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Lifetime paid" value={fmtCents(data?.totals.lifetimePaidCents ?? 0)} accent="#15803d" />
        <Tile label="Currently owed" value={fmtCents(data?.totals.currentOwedCents ?? 0)} accent={(data?.totals.currentOwedCents ?? 0) > 0 ? "#92400e" : "#15803d"} />
        <Tile label="Active partners" value={data?.totals.activePartners ?? 0} accent={NOHO_BLUE_DEEP} />
        <Tile label="Closed this month" value={data?.totals.closedThisMonth ?? 0} accent={NOHO_INK} sub={`${data?.totals.leadsThisMonth ?? 0} new leads`} />
      </div>

      {/* Monthly bar chart (closed vs paid, last 12 months) */}
      <div className="rounded-2xl bg-white border p-4" style={{ borderColor: "#e8e5e0" }}>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
            Monthly trend · last 12 months
          </p>
          <div className="flex items-center gap-3 text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded" style={{ background: NOHO_BLUE }} /> Closed</span>
            <span className="inline-flex items-center gap-1"><span className="inline-block w-2.5 h-2.5 rounded" style={{ background: "#16a34a" }} /> Paid</span>
          </div>
        </div>
        <BarChart series={data?.monthly ?? []} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3">
        {/* Leaderboard */}
        <div className="rounded-2xl bg-white border" style={{ borderColor: "#e8e5e0" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #e8e5e0" }}>
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
              Leaderboard ({data?.partners.length ?? 0})
            </p>
          </div>
          {!data ? (
            <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
          ) : data.partners.length === 0 ? (
            <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>
              No partners yet. Add some from the Partners panel.
            </p>
          ) : (
            <ul>
              {data.partners.map((p, i) => (
                <li key={p.partnerId} className="px-4 py-3 flex items-center gap-3" style={{ borderTop: i === 0 ? "none" : "1px solid #e8e5e0" }}>
                  {/* Medal */}
                  <span className="text-[18px] w-7 text-center font-black tabular-nums" style={{ color: "rgba(45,16,15,0.45)" }}>
                    {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-black truncate" style={{ color: NOHO_INK }}>
                      {p.businessName}
                      <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                        {p.code}
                      </span>
                      <StatusChip status={p.status} />
                    </p>
                    <p className="text-[10.5px] truncate" style={{ color: "rgba(45,16,15,0.55)" }}>
                      {p.contactName} · {p.category} · {Math.round(p.commissionRate * 100)}% rate
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-[14px] font-black tabular-nums" style={{ color: "#15803d" }}>{fmtCentsDecimal(p.totalEarnedCents)}</p>
                    <p className="text-[10px] tabular-nums" style={{ color: "rgba(45,16,15,0.55)" }}>
                      {p.closedCount} closed · {p.leadCount} leads
                      {p.owedCents > 0 && <span className="ml-1" style={{ color: "#92400e" }}>· owe {fmtCents(p.owedCents)}</span>}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Payout queue */}
        <div className="rounded-2xl bg-white border" style={{ borderColor: "#e8e5e0" }}>
          <div className="px-4 py-3" style={{ borderBottom: "1px solid #e8e5e0" }}>
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
              Payout queue ({data?.payoutQueue.length ?? 0}) · oldest first
            </p>
          </div>
          {!data ? (
            <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
          ) : data.payoutQueue.length === 0 ? (
            <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>
              All caught up — no closed commissions awaiting payout. ✓
            </p>
          ) : (
            <ul>
              {data.payoutQueue.map((row, i) => (
                <li key={row.id} className="px-4 py-3 flex items-center gap-3" style={{ borderTop: i === 0 ? "none" : "1px solid #e8e5e0" }}>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-black truncate" style={{ color: NOHO_INK }}>{row.partnerName}</p>
                    <p className="text-[10.5px] truncate" style={{ color: "rgba(45,16,15,0.55)" }}>
                      {row.product} · {row.prospectName} · closed {row.closedAtIso ? new Date(row.closedAtIso).toLocaleDateString() : "—"}
                      {row.ageDays > 30 && <span className="ml-1 font-bold" style={{ color: "#991b1b" }}>· {row.ageDays}d old</span>}
                    </p>
                  </div>
                  <p className="text-[13px] font-black tabular-nums shrink-0" style={{ color: "#92400e" }}>{fmtCentsDecimal(row.commissionCents)}</p>
                  <button type="button" onClick={() => payoutNow(row.id)} disabled={pending}
                    className="px-2.5 py-1.5 rounded-lg text-[10.5px] font-black text-white disabled:opacity-50 shrink-0"
                    style={{ background: "linear-gradient(135deg,#16A34A,#15803d)" }}>
                    Mark paid
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, accent, sub }: { label: string; value: number | string; accent: string; sub?: string }) {
  return (
    <div className="rounded-md bg-white p-3" style={{ border: "1px solid #E5DACA" }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#998877" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: accent, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>{value}</p>
      {sub && <p className="text-[10.5px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>{sub}</p>}
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const c = status === "active"     ? { bg: "rgba(22,163,74,0.14)",  fg: "#15803d" }
          : status === "pending"    ? { bg: "rgba(245,166,35,0.14)", fg: "#92400e" }
          : status === "paused"     ? { bg: "rgba(45,16,15,0.06)",   fg: "rgba(45,16,15,0.55)" }
          : status === "terminated" ? { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b" }
          :                           { bg: "rgba(45,16,15,0.06)",   fg: "rgba(45,16,15,0.55)" };
  return (
    <span className="ml-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}

// ─── Tiny SVG bar chart — closed vs paid stacked-grouped ───────────────
function BarChart({ series }: { series: { monthLabel: string; closedCents: number; paidCents: number }[] }) {
  if (series.length === 0) return <p className="text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>No data yet.</p>;
  const max = Math.max(1, ...series.flatMap((s) => [s.closedCents, s.paidCents]));
  const width = 800;
  const height = 160;
  const margin = { top: 12, right: 12, bottom: 24, left: 40 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const groupW = innerW / series.length;
  const barW = Math.max(8, (groupW - 6) / 2);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" preserveAspectRatio="xMinYMid meet">
        <g transform={`translate(${margin.left},${margin.top})`}>
          {/* Y-axis ticks at 0 / 50% / 100% */}
          {[0, 0.5, 1].map((t) => {
            const y = innerH - innerH * t;
            const labelCents = Math.round(max * t);
            return (
              <g key={t}>
                <line x1={0} x2={innerW} y1={y} y2={y} stroke="#e8e5e0" strokeWidth={1} />
                <text x={-6} y={y + 4} textAnchor="end" fontSize={9} fill="rgba(45,16,15,0.55)">
                  ${(labelCents / 100).toLocaleString()}
                </text>
              </g>
            );
          })}
          {series.map((s, i) => {
            const groupX = i * groupW;
            const closedH = (s.closedCents / max) * innerH;
            const paidH = (s.paidCents / max) * innerH;
            return (
              <g key={s.monthLabel} transform={`translate(${groupX},0)`}>
                <rect
                  x={(groupW - barW * 2 - 4) / 2}
                  y={innerH - closedH}
                  width={barW}
                  height={closedH}
                  fill={NOHO_BLUE}
                  rx={2}
                >
                  <title>Closed in {s.monthLabel}: ${(s.closedCents / 100).toFixed(2)}</title>
                </rect>
                <rect
                  x={(groupW - barW * 2 - 4) / 2 + barW + 4}
                  y={innerH - paidH}
                  width={barW}
                  height={paidH}
                  fill="#16a34a"
                  rx={2}
                >
                  <title>Paid in {s.monthLabel}: ${(s.paidCents / 100).toFixed(2)}</title>
                </rect>
                <text x={groupW / 2} y={innerH + 14} textAnchor="middle" fontSize={9.5} fill="rgba(45,16,15,0.55)" fontWeight={700}>
                  {s.monthLabel}
                </text>
              </g>
            );
          })}
        </g>
      </svg>
    </div>
  );
}
