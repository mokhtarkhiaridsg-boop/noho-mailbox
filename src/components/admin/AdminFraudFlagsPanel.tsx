"use client";

/**
 * iter-234 — Admin fraud flag review panel (Tier 17 #143).
 *
 * Shows open + recently-reviewed fraud flags. 4 status tabs + 4
 * severity tabs. Per-row card shows signal type emoji + severity pill +
 * summary + detail JSON + "Run sweep now" + Review/Dismiss/Escalate
 * buttons.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listFraudFlags,
  reviewFraudFlag,
  runFraudDetectionSweep,
  getFraudFlagsSummary,
  type FraudFlagRow,
} from "@/app/actions/fraudFlags";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
};

type StatusFilter = "Open" | "Reviewed" | "Dismissed" | "Escalated" | "all";
type SeverityFilter = "low" | "medium" | "high" | "critical" | "all";

const STATUS_TABS: Array<{ id: StatusFilter; label: string }> = [
  { id: "Open", label: "Open" },
  { id: "Escalated", label: "Escalated" },
  { id: "Reviewed", label: "Reviewed" },
  { id: "Dismissed", label: "Dismissed" },
  { id: "all", label: "All" },
];

const SEVERITY_TABS: Array<{ id: SeverityFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "critical", label: "🚨 Critical" },
  { id: "high", label: "⚠️ High" },
  { id: "medium", label: "📌 Medium" },
];

export default function AdminFraudFlagsPanel() {
  const [rows, setRows] = useState<FraudFlagRow[] | null>(null);
  const [summary, setSummary] = useState<{ openTotal: number; openCritical: number; openHigh: number; openMedium: number; last7Raised: number } | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("Open");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>("all");
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    void listFraudFlags({
      status: statusFilter === "all" ? undefined : statusFilter,
      severity: severityFilter === "all" ? undefined : severityFilter,
      limit: 80,
    }).then(setRows).catch(() => setRows([]));
    void getFraudFlagsSummary().then(setSummary).catch(() => setSummary(null));
  }

  useEffect(refresh, [statusFilter, severityFilter]);

  function onSweep() {
    setError(null); setInfo(null);
    startTransition(async () => {
      try {
        const r = await runFraudDetectionSweep();
        setInfo(`✓ Sweep complete · ${r.scanned} items scanned · ${r.raisedCount} new flags · ${r.updatedCount} updated`);
        refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "Sweep failed");
      }
    });
  }

  function onReview(r: FraudFlagRow, status: "Reviewed" | "Dismissed" | "Escalated") {
    const verb = status === "Dismissed" ? "Dismiss" : status === "Escalated" ? "Escalate" : "Mark reviewed";
    const note = prompt(`${verb} flag: ${r.summary}\n\nReview note (optional):`);
    if (note === null) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await reviewFraudFlag({ id: r.id, status, note: note.trim() || undefined });
      if (res.error) setError(res.error);
      else { setInfo(`✓ ${status}`); refresh(); }
    });
  }

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
          Fraud Flags
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
          spot the bad apples
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {summary?.openTotal ?? 0} open
        </span>
      </div>
      <p className="text-[11px] -mt-2" style={{ color: T.inkFaint }}>
        Pure-rules detector scans recent intake patterns + member state for 6 fraud signals. Cron runs hourly; high+critical signals fire `fraud.flag_raised` webhook for ops on-call.
      </p>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.green }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.red }}>{error}</p>}

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Tile label="Open" value={summary ? String(summary.openTotal) : "—"} accent={summary && summary.openTotal > 0 ? T.amber : T.inkFaint} />
        <Tile label="🚨 Critical" value={summary ? String(summary.openCritical) : "—"} accent={summary && summary.openCritical > 0 ? T.red : T.inkFaint} />
        <Tile label="⚠️ High" value={summary ? String(summary.openHigh) : "—"} accent={summary && summary.openHigh > 0 ? T.red : T.inkFaint} />
        <Tile label="Medium" value={summary ? String(summary.openMedium) : "—"} accent={summary && summary.openMedium > 0 ? T.amber : T.inkFaint} />
        <Tile label="7d raised" value={summary ? String(summary.last7Raised) : "—"} accent={T.blue} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={onSweep} disabled={busy}
          className="text-[11px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
          style={{ background: T.blue }}>
          {busy ? "Scanning…" : "🔍 Run sweep now"}
        </button>
        <div className="flex flex-wrap gap-1">
          {STATUS_TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setStatusFilter(t.id)}
              className="text-[10.5px] font-bold px-2 py-1 rounded-md"
              style={{
                background: statusFilter === t.id ? T.ink : T.surface,
                color: statusFilter === t.id ? "white" : T.inkSoft,
                border: `1px solid ${statusFilter === t.id ? T.ink : T.border}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap gap-1">
          {SEVERITY_TABS.map((t) => (
            <button key={t.id} type="button" onClick={() => setSeverityFilter(t.id)}
              className="text-[10.5px] font-bold px-2 py-1 rounded-md"
              style={{
                background: severityFilter === t.id ? T.red : T.surface,
                color: severityFilter === t.id ? "white" : T.inkSoft,
                border: `1px solid ${severityFilter === t.id ? T.red : T.border}`,
              }}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {!rows ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          {statusFilter === "Open" ? "🎉 No open fraud flags. The bureau is clean!" : "No flags in this filter."}
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${r.severity === "critical" || r.severity === "high" ? `${T.red}55` : T.border}` }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[14px]">{r.signalEmoji}</span>
                    <span className="text-[12.5px] font-black" style={{ color: T.ink }}>{r.signalLabel}</span>
                    <SeverityPill sev={r.severity} bg={r.severityBg} fg={r.severityFg} label={r.severityLabel} />
                    <StatusPill status={r.status} />
                    {r.suiteNumber && <span className="text-[10.5px] font-mono" style={{ color: T.inkFaint }}>· suite #{r.suiteNumber}</span>}
                  </div>
                  <p className="text-[12px] mt-1" style={{ color: T.ink }}>{r.summary}</p>
                  <p className="text-[10.5px] mt-0.5" style={{ color: T.inkFaint }}>
                    First seen {new Date(r.firstSeenAtIso).toLocaleString()} · Last seen {new Date(r.lastSeenAtIso).toLocaleString()} · Evidence × {r.evidenceCount}
                  </p>
                  {r.userName && <p className="text-[10.5px]" style={{ color: T.inkSoft }}>👤 {r.userName}</p>}
                  <details className="mt-1">
                    <summary className="text-[10.5px] cursor-pointer" style={{ color: T.inkFaint }}>Detail JSON</summary>
                    <pre className="mt-1 p-2 rounded-md text-[9.5px] font-mono overflow-x-auto" style={{ background: T.surfaceAlt, color: T.inkSoft }}>{JSON.stringify(r.detail, null, 2)}</pre>
                  </details>
                  {r.reviewNote && <p className="text-[10px] italic mt-1" style={{ color: T.inkSoft }}>📝 Review: {r.reviewNote}{r.reviewedByName && ` — ${r.reviewedByName}`}</p>}
                </div>
                {r.status === "Open" && (
                  <div className="flex flex-col gap-1 shrink-0 items-end">
                    <button type="button" onClick={() => onReview(r, "Escalated")} disabled={busy}
                      className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                      style={{ background: T.red, color: "white" }}>
                      Escalate
                    </button>
                    <button type="button" onClick={() => onReview(r, "Reviewed")} disabled={busy}
                      className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                      style={{ background: T.surface, color: T.blue, border: `1px solid ${T.blue}40` }}>
                      Mark reviewed
                    </button>
                    <button type="button" onClick={() => onReview(r, "Dismissed")} disabled={busy}
                      className="text-[10px] font-bold px-2 py-0.5 rounded-md disabled:opacity-50"
                      style={{ background: T.surface, color: T.inkFaint, border: `1px solid ${T.border}` }}>
                      Dismiss
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
      <p className="text-[9.5px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="font-mono font-black tabular-nums text-[18px] mt-0.5" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function SeverityPill({ sev, bg, fg, label }: { sev: string; bg: string; fg: string; label: string }) {
  return (
    <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: bg, color: fg, border: `1px solid ${fg}30` }}>
      {sev === "critical" || sev === "high" ? "⚠ " : ""}{label}
    </span>
  );
}

function StatusPill({ status }: { status: "Open" | "Reviewed" | "Dismissed" | "Escalated" }) {
  const meta: Record<string, { bg: string; fg: string }> = {
    Open:      { bg: "rgba(59,130,246,0.10)", fg: "#1d4ed8" },
    Reviewed:  { bg: "rgba(34,197,94,0.10)",  fg: "#15803d" },
    Dismissed: { bg: T.surfaceAlt,             fg: T.inkFaint },
    Escalated: { bg: "rgba(127,29,29,0.10)",   fg: "#7f1d1d" },
  };
  const m = meta[status] ?? meta.Open!;
  return (
    <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
      style={{ background: m.bg, color: m.fg, border: `1px solid ${m.fg}30` }}>
      {status}
    </span>
  );
}
