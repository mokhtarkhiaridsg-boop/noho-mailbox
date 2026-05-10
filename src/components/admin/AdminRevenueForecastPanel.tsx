"use client";

/**
 * iter-190 — Admin revenue forecast panel (Tier 13 #99).
 *
 * 30/60/90-day projected revenue tiles + per-window breakdown
 * (trailing extrapolation vs renewal pipeline) + the upcoming-renewal
 * pipeline list sorted by date.
 */

import { useEffect, useState, useTransition } from "react";
import {
  getRevenueForecast,
  type RevenueForecastResult,
  type RevenueWindow,
} from "@/app/actions/revenueForecast";

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

export default function AdminRevenueForecastPanel() {
  const [data, setData] = useState<RevenueForecastResult | null>(null);
  const [busy, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      try { setData(await getRevenueForecast({ windowsDays: [30, 60, 90] })); }
      catch { setData(null); }
    });
  }
  useEffect(refresh, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Money · Revenue forecast
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>30 / 60 / 90-day revenue forecast</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Combines two signals: trailing-90d realized revenue extrapolated forward + the iter-83 renewal pipeline (auto-renew gets 95% confidence; manual gets 65%). Final number is conservative — max(trailing, pipeline×0.85).
        </p>
        <button type="button" onClick={refresh} disabled={busy} className="mt-2 text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
          {busy ? "Computing…" : "↻ Refresh"}
        </button>
      </div>

      {!data ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {data.windows.map((w) => <ForecastTile key={w.windowDays} w={w} />)}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-3">
            {/* Per-window detail breakdown */}
            <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>Window detail</p>
              <table className="w-full text-[11px]" style={{ borderCollapse: "collapse" }}>
                <thead style={{ background: T.surfaceAlt }}>
                  <tr>
                    <Th>Window</Th>
                    <Th align="right">Realized</Th>
                    <Th align="right">Trailing extrap</Th>
                    <Th align="right">Pipeline (n)</Th>
                    <Th align="right">Forecast</Th>
                    <Th align="right">Conf.</Th>
                  </tr>
                </thead>
                <tbody>
                  {data.windows.map((w) => (
                    <tr key={w.windowDays} style={{ borderTop: `1px solid ${T.border}` }}>
                      <td className="px-2 py-2 font-bold" style={{ color: T.ink }}>{w.windowDays}d</td>
                      <td className="px-2 py-2 text-right tabular-nums" style={{ color: T.success }}>{fmtCents(w.realizedCents)}</td>
                      <td className="px-2 py-2 text-right tabular-nums" style={{ color: T.inkSoft }}>{fmtCents(w.trailingExtrapolatedCents)}</td>
                      <td className="px-2 py-2 text-right tabular-nums" style={{ color: T.inkSoft }}>{fmtCents(w.pipelineCents)} <span style={{ color: T.inkFaint }}>({w.pipelineCount})</span></td>
                      <td className="px-2 py-2 text-right font-black tabular-nums" style={{ color: T.blueDeep }}>{fmtCents(w.forecastCents)}</td>
                      <td className="px-2 py-2 text-right tabular-nums" style={{ color: w.confidence >= 0.75 ? T.success : w.confidence >= 0.6 ? T.warning : T.danger }}>{Math.round(w.confidence * 100)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-[10.5px] mt-2" style={{ color: T.inkFaint }}>
                Realized = past N-day revenue. Trailing extrap = (past 90d / 90) × N. Pipeline = sum of upcoming renewals × confidence. Final forecast = max of the two.
              </p>
            </div>

            {/* Upcoming pipeline list */}
            <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>
                Upcoming renewal pipeline ({data.pipeline.length})
              </p>
              {data.pipeline.length === 0 ? (
                <p className="text-[11px] italic" style={{ color: T.inkFaint }}>No member renewals due in the next 90 days.</p>
              ) : (
                <ul className="space-y-1 max-h-[420px] overflow-y-auto">
                  {data.pipeline.map((p) => (
                    <li key={p.userId} className="text-[11px] flex items-center gap-1.5 py-1" style={{ borderBottom: `1px solid ${T.border}` }}>
                      <span className="font-mono tabular-nums" style={{ color: T.blueDeep, minWidth: 70 }}>{p.planDueDate}</span>
                      <span className="font-bold truncate flex-1" style={{ color: T.ink }}>{p.userName}</span>
                      {p.suiteNumber && <span className="font-mono" style={{ color: T.inkFaint }}>#{p.suiteNumber}</span>}
                      <span className="text-[10px]" style={{ color: T.inkSoft }}>{p.plan}·{p.planTerm}mo</span>
                      {p.autoRenew && <span className="text-[9px] font-black px-1 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.10)", color: "#15803d" }}>AUTO</span>}
                      <span className="font-black tabular-nums" style={{ color: T.ink, minWidth: 60, textAlign: "right" }}>{fmtCents(p.impliedCents)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <p className="text-[10px] text-right" style={{ color: T.inkFaint }}>
            Generated {new Date(data.generatedAtIso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
          </p>
        </>
      )}
    </div>
  );
}

function ForecastTile({ w }: { w: RevenueWindow }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <p className="text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>Next {w.windowDays} days</p>
      <p className="mt-1 text-[28px] font-black tabular-nums" style={{ color: T.blueDeep }}>{fmtCents(w.forecastCents)}</p>
      <p className="text-[10.5px]" style={{ color: T.inkSoft }}>
        ~{w.pipelineCount} renewal{w.pipelineCount === 1 ? "" : "s"} · {Math.round(w.confidence * 100)}% confidence
      </p>
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <th className="px-2 py-1 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint, textAlign: align }}>{children}</th>;
}

function fmtCents(c: number): string {
  return `$${(c / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}
