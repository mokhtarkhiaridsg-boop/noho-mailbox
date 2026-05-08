"use client";

/**
 * iter-143 — Suite cleaning / maintenance log admin (Tier 8 #55).
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getSuiteMaintenanceOverview,
  listSuiteMaintenanceForSuite,
  logSuiteMaintenance,
  deleteSuiteMaintenance,
  MAINT_KINDS,
  type MaintKind,
  type MaintLogRow,
  type SuiteMaintOverviewRow,
  type SuiteMaintStatus,
} from "@/app/actions/suiteMaintenance";

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

const STATUS_STYLE: Record<SuiteMaintStatus, { bg: string; fg: string; label: string }> = {
  good:     { bg: "rgba(34,197,94,0.10)",  fg: "#15803d", label: "On track" },
  due_soon: { bg: "rgba(245,158,11,0.12)", fg: "#92400e", label: "Due soon" },
  overdue:  { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b", label: "Overdue" },
  never:    { bg: "rgba(45,16,15,0.05)",   fg: T.inkFaint,label: "Never logged" },
};

type Filter = "all" | "overdue" | "due_soon" | "good" | "never";

export default function AdminSuiteMaintenancePanel() {
  const [rows, setRows] = useState<SuiteMaintOverviewRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [drawerSuite, setDrawerSuite] = useState<string | null>(null);

  function refresh() {
    void getSuiteMaintenanceOverview().then(setRows).catch(() => setRows([]));
  }
  useEffect(() => { refresh(); }, []);

  const counts = useMemo(() => {
    const c = { all: 0, overdue: 0, due_soon: 0, good: 0, never: 0 };
    for (const r of rows ?? []) {
      c.all++;
      c[r.cleaningStatus]++;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (filter === "all") return rows;
    return rows.filter((r) => r.cleaningStatus === filter);
  }, [rows, filter]);

  const FILTERS: Array<{ id: Filter; label: string; tone: string }> = [
    { id: "all",       label: "All",        tone: T.ink },
    { id: "overdue",   label: "Overdue",    tone: T.danger },
    { id: "due_soon",  label: "Due soon",   tone: T.warning },
    { id: "never",     label: "Never logged", tone: T.inkFaint },
    { id: "good",      label: "On track",   tone: T.success },
  ];

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Operations · Suite maintenance
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>
          Suite cleaning &amp; maintenance log
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Cadence: clean every 21 days (overdue at 30), inspect every 60 days (overdue at 90). Click a suite to log a new entry or view history.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => {
          const c = counts[f.id] ?? 0;
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className="text-[11.5px] font-bold px-2.5 py-1 rounded-full transition-colors"
              style={{
                background: active ? T.blue : "white",
                color: active ? "white" : f.tone,
                border: `1px solid ${active ? T.blue : T.border}`,
              }}
            >
              {f.label} <span className="opacity-70 tabular-nums">{c}</span>
            </button>
          );
        })}
        <button
          type="button"
          onClick={refresh}
          className="ml-auto text-[10.5px] font-bold px-2 py-1 rounded-md"
          style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}
        >
          ↻ Refresh
        </button>
      </div>

      {rows == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No suites match this filter.
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead style={{ background: T.surfaceAlt }}>
              <tr>
                <Th>Suite</Th>
                <Th>Customer</Th>
                <Th align="center">Cleaning</Th>
                <Th align="center">Inspection</Th>
                <Th align="right">Logs</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr
                  key={r.suiteNumber}
                  className="cursor-pointer hover:bg-[#F4F5F7]"
                  onClick={() => setDrawerSuite(r.suiteNumber)}
                  style={{ borderTop: `1px solid ${T.border}` }}
                >
                  <td className="px-4 py-2.5 text-[13px] font-black tabular-nums" style={{ color: T.ink }}>
                    #{r.suiteNumber}
                  </td>
                  <td className="px-4 py-2.5">
                    <p className="text-[12.5px] font-bold truncate" style={{ color: T.ink }}>
                      {r.customerName ?? <span style={{ color: T.inkFaint }}>(vacant)</span>}
                    </p>
                    {r.customerEmail && (
                      <p className="text-[10.5px] truncate" style={{ color: T.inkFaint }}>{r.customerEmail}</p>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <StatusCell status={r.cleaningStatus} days={r.daysSinceCleaned} />
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <StatusCell status={r.inspectionStatus} days={r.daysSinceInspected} />
                  </td>
                  <td className="px-4 py-2.5 text-right text-[11.5px] tabular-nums" style={{ color: T.inkFaint }}>
                    {r.totalLogs}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {drawerSuite && (
        <SuiteDrawer
          suiteNumber={drawerSuite}
          row={rows?.find((r) => r.suiteNumber === drawerSuite) ?? null}
          onClose={() => setDrawerSuite(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" | "right" }) {
  return (
    <th className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint, textAlign: align }}>
      {children}
    </th>
  );
}

function StatusCell({ status, days }: { status: SuiteMaintStatus; days: number | null }) {
  const s = STATUS_STYLE[status];
  return (
    <div className="inline-flex flex-col items-center gap-0.5">
      <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: s.bg, color: s.fg }}>
        {s.label}
      </span>
      <span className="text-[10px] tabular-nums" style={{ color: T.inkFaint }}>
        {days == null ? "—" : `${days}d ago`}
      </span>
    </div>
  );
}

function SuiteDrawer({
  suiteNumber,
  row,
  onClose,
  onChanged,
}: {
  suiteNumber: string;
  row: SuiteMaintOverviewRow | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [logs, setLogs] = useState<MaintLogRow[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [kind, setKind] = useState<MaintKind>("cleaned");
  const [notes, setNotes] = useState("");

  function refreshLogs() {
    void listSuiteMaintenanceForSuite({ suiteNumber }).then(setLogs).catch(() => setLogs([]));
  }
  useEffect(refreshLogs, [suiteNumber]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onSubmit() {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await logSuiteMaintenance({ suiteNumber, kind, notes: notes.trim() || undefined });
      if (res.error) { setErrorMsg(res.error); return; }
      setNotes("");
      refreshLogs();
      onChanged();
    });
  }

  function onDelete(id: string) {
    if (!confirm("Delete this log entry? Audit-trail will retain it.")) return;
    setBusyId(id);
    startTransition(async () => {
      const res = await deleteSuiteMaintenance(id);
      setBusyId(null);
      if (res.error) { setErrorMsg(res.error); return; }
      refreshLogs();
      onChanged();
    });
  }

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>
              Suite #{suiteNumber}
            </p>
            <h3 className="text-lg font-black truncate" style={{ color: T.ink }}>
              {row?.customerName ?? "(vacant)"}
            </h3>
            {row && (
              <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
                Last cleaned {row.daysSinceCleaned == null ? "—" : `${row.daysSinceCleaned}d ago`}
                {" · "}
                Last inspected {row.daysSinceInspected == null ? "—" : `${row.daysSinceInspected}d ago`}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base font-black transition-colors hover:bg-[#F4F5F7]"
            style={{ color: T.inkSoft }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl p-4" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
              Log a new entry
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {MAINT_KINDS.map((k) => (
                <button
                  key={k.key}
                  type="button"
                  onClick={() => setKind(k.key)}
                  className="text-[11.5px] font-bold px-2.5 py-1 rounded-full"
                  style={{
                    background: kind === k.key ? T.blue : "white",
                    color: kind === k.key ? "white" : T.inkSoft,
                    border: `1px solid ${kind === k.key ? T.blue : T.border}`,
                  }}
                >
                  {k.emoji} {k.label}
                </button>
              ))}
            </div>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes (e.g. wiped down, replaced lock cylinder)"
              rows={2}
              maxLength={500}
              className="mt-2 w-full px-3 py-2 rounded-lg outline-none text-[12.5px] resize-none"
              style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
            />
            {errorMsg && (
              <p className="mt-1 text-[11px] font-semibold" style={{ color: T.danger }}>{errorMsg}</p>
            )}
            <div className="mt-2 flex justify-end">
              <button
                type="button"
                disabled={pending}
                onClick={onSubmit}
                className="px-3 py-2 rounded-lg text-[11.5px] font-black text-white disabled:opacity-50"
                style={{ background: T.blue }}
              >
                {pending ? "Saving…" : "Save log entry"}
              </button>
            </div>
          </div>

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>
              History {logs && `(${logs.length})`}
            </p>
            {logs == null ? (
              <p className="text-[11.5px]" style={{ color: T.inkFaint }}>Loading…</p>
            ) : logs.length === 0 ? (
              <div className="rounded-lg px-3 py-4 text-center text-[11.5px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
                No log entries for this suite yet.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {logs.map((l) => {
                  const meta = MAINT_KINDS.find((k) => k.key === l.kind);
                  const at = new Date(l.performedAtIso);
                  return (
                    <li
                      key={l.id}
                      className="rounded-lg p-3 flex items-start justify-between gap-3"
                      style={{ background: "white", border: `1px solid ${T.border}` }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10.5px] font-black" style={{ color: T.ink }}>
                            {meta?.emoji ?? "📝"} {meta?.label ?? l.kind}
                          </span>
                          <span className="text-[10.5px]" style={{ color: T.inkFaint }}>
                            · {at.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                          {l.performedByName && (
                            <span className="text-[10.5px]" style={{ color: T.inkFaint }}>
                              · by {l.performedByName}
                            </span>
                          )}
                        </div>
                        {l.notes && (
                          <p className="text-[11.5px] mt-1 italic" style={{ color: T.inkSoft }}>
                            {l.notes}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={pending && busyId === l.id}
                        onClick={() => onDelete(l.id)}
                        className="shrink-0 text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50"
                        style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.20)" }}
                      >
                        Delete
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
