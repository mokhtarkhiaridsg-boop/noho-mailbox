"use client";

/**
 * iter-151 — Email deliverability dashboard (Tier 9 #61).
 *
 * Pulls a 30-day rollup from EmailLog + live SPF/DKIM/DMARC checks
 * against the sender domain. Color-coded health tiles let admin spot
 * a regressing email kind at a glance.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getEmailDeliverabilityReport,
  type EmailDeliverabilityReport,
  type EmailKindStat,
} from "@/app/actions/emailDeliverability";

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

const DNS_STATUS_STYLE = {
  ok:        { bg: "rgba(34,197,94,0.10)",  fg: "#15803d", label: "OK" },
  warn:      { bg: "rgba(245,158,11,0.12)", fg: "#92400e", label: "Warn" },
  fail:      { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b", label: "Fail" },
  unchecked: { bg: "rgba(45,16,15,0.05)",   fg: T.inkFaint, label: "Unchecked" },
};

export default function AdminEmailDeliverabilityPanel() {
  const [report, setReport] = useState<EmailDeliverabilityReport | null>(null);
  const [windowDays, setWindowDays] = useState(30);
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function refresh(days: number) {
    setErrorMsg(null);
    startTransition(async () => {
      try {
        const res = await getEmailDeliverabilityReport({ windowDays: days });
        setReport(res);
      } catch (e) {
        setErrorMsg(e instanceof Error ? e.message : String(e));
      }
    });
  }
  useEffect(() => { refresh(windowDays); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, []);

  const overallHealth = useMemo(() => {
    if (!report || report.totals.total === 0) return { tone: "ok" as const, label: "No mail in window" };
    const failPct = (report.totals.failed + report.totals.bounced) / report.totals.total;
    if (failPct >= 0.10) return { tone: "fail" as const, label: `${(failPct * 100).toFixed(1)}% failed/bounced` };
    if (failPct >= 0.03) return { tone: "warn" as const, label: `${(failPct * 100).toFixed(1)}% failed/bounced` };
    return { tone: "ok" as const, label: `${((1 - failPct) * 100).toFixed(1)}% delivered` };
  }, [report]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          System · Email deliverability
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>
          Email deliverability dashboard
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          {report?.totals.total ?? "—"} emails sent over the last {windowDays} days · sender domain <span className="font-mono">{report?.senderDomain ?? "—"}</span>
        </p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1.5">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => { setWindowDays(d); refresh(d); }}
              className="text-[11.5px] font-bold px-2.5 py-1 rounded-full"
              style={{
                background: windowDays === d ? T.blue : "white",
                color: windowDays === d ? "white" : T.inkSoft,
                border: `1px solid ${windowDays === d ? T.blue : T.border}`,
              }}
            >
              Last {d} days
            </button>
          ))}
        </div>
        <button type="button" onClick={() => refresh(windowDays)} disabled={pending} className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
          {pending ? "Refreshing…" : "↻ Refresh"}
        </button>
      </div>

      {errorMsg && (
        <p className="text-[12px] font-semibold" style={{ color: T.danger }}>{errorMsg}</p>
      )}

      {report == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : (
        <>
          {/* ─── Headline tiles ─────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            <Tile label="Total sent" value={report.totals.total} accent={T.ink} />
            <Tile label="Delivered" value={report.totals.sent} accent={T.success} />
            <Tile label="Failed" value={report.totals.failed} accent={T.danger} />
            <Tile label="Bounced" value={report.totals.bounced} accent={T.warning} />
            <Tile label="Queued" value={report.totals.queued} accent={T.inkFaint} />
          </div>

          <div className="rounded-2xl p-4" style={{
            background: overallHealth.tone === "fail" ? "rgba(231,0,19,0.06)" : overallHealth.tone === "warn" ? "rgba(245,158,11,0.08)" : "rgba(34,197,94,0.08)",
            border: `1px solid ${overallHealth.tone === "fail" ? "rgba(231,0,19,0.30)" : overallHealth.tone === "warn" ? "rgba(245,158,11,0.30)" : "rgba(34,197,94,0.25)"}`,
          }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{
              color: overallHealth.tone === "fail" ? "#991b1b" : overallHealth.tone === "warn" ? "#92400e" : "#15803d",
            }}>
              Overall health
            </p>
            <p className="mt-0.5 text-[18px] font-black" style={{
              color: overallHealth.tone === "fail" ? "#991b1b" : overallHealth.tone === "warn" ? "#92400e" : "#15803d",
            }}>
              {overallHealth.label}
            </p>
          </div>

          {/* ─── DNS checks ─────────────────────────────────── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em]" style={{ background: T.surfaceAlt, color: T.inkFaint, borderBottom: `1px solid ${T.border}` }}>
              DNS authentication ({report.senderDomain})
            </div>
            <ul>
              {report.dns.map((d) => {
                const s = DNS_STATUS_STYLE[d.status];
                return (
                  <li key={d.record} className="px-4 py-3 flex items-start gap-3" style={{ borderTop: `1px solid ${T.border}` }}>
                    <span className="shrink-0 w-12 text-[12.5px] font-black" style={{ color: T.ink }}>{d.record}</span>
                    <span className="shrink-0 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: s.bg, color: s.fg }}>
                      {s.label}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[11.5px]" style={{ color: T.ink }}>{d.detail}</p>
                      {d.values.length > 0 && (
                        <p className="text-[9.5px] mt-1 font-mono break-all" style={{ color: T.inkFaint }}>
                          {d.values[0]}
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* ─── Per-kind breakdown ─────────────────────────── */}
          <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em]" style={{ background: T.surfaceAlt, color: T.inkFaint, borderBottom: `1px solid ${T.border}` }}>
              Per-kind breakdown
            </div>
            {report.byKind.length === 0 ? (
              <p className="p-6 text-center text-[12px]" style={{ color: T.inkFaint }}>No emails in this window.</p>
            ) : (
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: T.surfaceAlt }}>
                    <Th>Kind</Th>
                    <Th align="right">Sent</Th>
                    <Th align="right">Failed</Th>
                    <Th align="right">Bounced</Th>
                    <Th align="right">Failure %</Th>
                    <Th align="right">Last sent</Th>
                  </tr>
                </thead>
                <tbody>
                  {report.byKind.map((k) => (
                    <KindRow key={k.kind} k={k} />
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* ─── Daily sparkline ─────────────────────────────── */}
          <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
              Daily volume ({report.windowDays} days)
            </p>
            <DailySparkline rows={report.byDay} />
          </div>

          {/* ─── Recent failures ─────────────────────────────── */}
          {report.recentFailures.length > 0 && (
            <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em]" style={{ background: T.surfaceAlt, color: T.inkFaint, borderBottom: `1px solid ${T.border}` }}>
                Recent failures &amp; bounces ({report.recentFailures.length})
              </div>
              <ul>
                {report.recentFailures.map((f) => (
                  <li key={f.id} className="px-4 py-2" style={{ borderTop: `1px solid ${T.border}` }}>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: f.status === "bounced" ? "rgba(245,158,11,0.12)" : "rgba(231,0,19,0.10)", color: f.status === "bounced" ? "#92400e" : "#991b1b" }}>
                        {f.status}
                      </span>
                      <span className="text-[11.5px] font-bold" style={{ color: T.ink }}>{f.toEmail}</span>
                      <span className="text-[10.5px]" style={{ color: T.inkFaint }}>· {f.kind}</span>
                      <span className="ml-auto text-[10px] tabular-nums" style={{ color: T.inkFaint }}>
                        {new Date(f.createdAtIso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="text-[10.5px] truncate" style={{ color: T.inkSoft }}>{f.subject}</p>
                    {f.error && <p className="text-[10.5px] italic" style={{ color: "#991b1b" }}>{f.error}</p>}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" | "right" }) {
  return <th className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint, textAlign: align }}>{children}</th>;
}

function Tile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="mt-0.5 text-[22px] font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function KindRow({ k }: { k: EmailKindStat }) {
  const tone =
    k.failureRate >= 10 ? T.danger :
    k.failureRate >= 3  ? T.warning :
                          T.success;
  return (
    <tr style={{ borderTop: `1px solid ${T.border}` }}>
      <td className="px-4 py-2 text-[12px] font-bold" style={{ color: T.ink }}>{k.kind}</td>
      <td className="px-4 py-2 text-right tabular-nums" style={{ color: T.success }}>{k.sent}</td>
      <td className="px-4 py-2 text-right tabular-nums" style={{ color: k.failed > 0 ? T.danger : T.inkFaint }}>{k.failed}</td>
      <td className="px-4 py-2 text-right tabular-nums" style={{ color: k.bounced > 0 ? T.warning : T.inkFaint }}>{k.bounced}</td>
      <td className="px-4 py-2 text-right">
        <span className="text-[11.5px] font-black tabular-nums" style={{ color: tone }}>
          {k.failureRate.toFixed(1)}%
        </span>
      </td>
      <td className="px-4 py-2 text-right text-[10.5px] tabular-nums" style={{ color: T.inkFaint }}>
        {k.lastSentIso ? new Date(k.lastSentIso).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "—"}
      </td>
    </tr>
  );
}

function DailySparkline({ rows }: { rows: Array<{ dateIso: string; total: number; sent: number; failed: number; bounced: number }> }) {
  const max = Math.max(1, ...rows.map((r) => r.total));
  return (
    <div className="mt-3 flex items-end gap-0.5 h-24">
      {rows.map((r) => {
        const h = Math.round((r.total / max) * 100);
        const failedH = r.total > 0 ? Math.round(((r.failed + r.bounced) / r.total) * h) : 0;
        const sentH = h - failedH;
        const d = new Date(r.dateIso);
        const tooltip = `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} · ${r.total} sent · ${r.failed} failed · ${r.bounced} bounced`;
        return (
          <div key={r.dateIso} className="flex-1 flex flex-col justify-end" title={tooltip} style={{ minWidth: 4 }}>
            {failedH > 0 && (
              <div style={{ height: `${failedH}%`, background: T.danger, borderRadius: "2px 2px 0 0" }} />
            )}
            <div style={{ height: `${sentH}%`, background: T.success, borderRadius: failedH > 0 ? 0 : "2px 2px 0 0" }} />
          </div>
        );
      })}
    </div>
  );
}
