"use client";

import { useState, useTransition, useEffect, useMemo } from "react";
import {
  getCancellationRequests,
  approveCancellation,
  completeCancellation,
  denyCancellation,
} from "@/app/actions/cancellation";

type CancelRow = {
  id: string;
  reason: string;
  status: string;
  requestedAt: string;
  gracePeriodEnd: string | null;
  completedAt: string | null;
  adminNotes: string | null;
  user: {
    id: string;
    name: string;
    email: string;
    suiteNumber: string | null;
    plan: string | null;
  };
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";
const NOHO_RED = "#E70013";

// Cancellation lifecycle: Pending → Approved (30-day grace) → Completed.
// Denied is a terminal off-ramp.
const LIFECYCLE: Array<{ id: string; label: string; sub: string; color: string }> = [
  { id: "Pending", label: "Pending", sub: "Awaiting review", color: NOHO_AMBER },
  { id: "Approved", label: "In grace", sub: "30-day window", color: NOHO_BLUE },
  { id: "Completed", label: "Completed", sub: "Mailbox closed", color: "#16A34A" },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, { bg: string; color: string; dot: string }> = {
    Pending: { bg: "rgba(245,166,35,0.12)", color: "#92400e", dot: NOHO_AMBER },
    Approved: { bg: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP, dot: NOHO_BLUE },
    Completed: { bg: "rgba(22,163,74,0.10)", color: "#15803d", dot: "#16A34A" },
    Denied: { bg: "rgba(220,38,38,0.10)", color: "#b91c1c", dot: "#dc2626" },
  };
  const c = map[status] ?? { bg: "rgba(0,0,0,0.06)", color: "#555", dot: "#777" };
  return (
    <span
      className="text-[9px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-md inline-flex items-center gap-1"
      style={{ background: c.bg, color: c.color }}
    >
      <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
      {status}
    </span>
  );
}

// Progress bar for the 30-day grace window. Returns days-elapsed / 30 as a
// percent + a human label like "12 of 30 days · 18 left".
function graceProgress(approvedAt: Date, gracePeriodEnd: Date): {
  pctElapsed: number;
  daysLeft: number;
  totalDays: number;
  daysElapsed: number;
} {
  const now = new Date();
  const total = Math.max(1, Math.round((gracePeriodEnd.getTime() - approvedAt.getTime()) / 86400000));
  const elapsed = Math.max(0, Math.min(total, Math.round((now.getTime() - approvedAt.getTime()) / 86400000)));
  const left = Math.max(0, total - elapsed);
  return { pctElapsed: (elapsed / total) * 100, daysLeft: left, totalDays: total, daysElapsed: elapsed };
}

function CancelCard({ row, onRefresh }: { row: CancelRow; onRefresh: () => void }) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  function doAction(fn: () => Promise<{ success?: boolean; error?: string }>, label: string) {
    setMsg(null);
    startTransition(async () => {
      const res = await fn();
      if (res.error) setMsg(`✗ ${res.error}`);
      else {
        setMsg(`✓ ${label}`);
        onRefresh();
      }
    });
  }

  // Grace window — only meaningful for Approved + still-pending-completion.
  const grace = useMemo(() => {
    if (row.status !== "Approved" || !row.gracePeriodEnd) return null;
    const end = new Date(row.gracePeriodEnd);
    // Approved date is 30 days before gracePeriodEnd.
    const approvedAt = new Date(end.getTime() - 30 * 86400000);
    return graceProgress(approvedAt, end);
  }, [row.gracePeriodEnd, row.status]);

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all hover:shadow-md"
      style={{
        background: "white",
        border: "1px solid rgba(232,229,224,0.7)",
        boxShadow: "0 1px 3px rgba(45,16,15,0.04), 0 4px 12px rgba(45,16,15,0.04)",
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left flex items-start gap-3 p-4"
      >
        {/* Avatar monogram */}
        <div
          className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center font-black text-sm"
          style={{
            background: row.status === "Pending"
              ? `linear-gradient(135deg, ${NOHO_AMBER}, #B07030)`
              : row.status === "Denied"
              ? "linear-gradient(135deg, #dc2626, #991b1b)"
              : row.status === "Completed"
              ? "linear-gradient(135deg, #16A34A, #166534)"
              : `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`,
            color: "#F7E6C2",
            boxShadow: "0 4px 14px rgba(45,16,15,0.18), inset 0 1px 0 rgba(255,255,255,0.2)",
            fontFamily: "var(--font-baloo), sans-serif",
          }}
        >
          {initials(row.user.name)}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-black text-sm truncate" style={{ color: NOHO_INK }}>
                  {row.user.name}
                </p>
                {row.user.suiteNumber && (
                  <span
                    className="text-[10px] font-black px-2 py-0.5 rounded-md"
                    style={{ background: "rgba(45,16,15,0.06)", color: NOHO_INK, fontFamily: "var(--font-baloo), sans-serif" }}
                  >
                    #{row.user.suiteNumber}
                  </span>
                )}
                <StatusPill status={row.status} />
                {row.user.plan && (
                  <span
                    className="text-[9px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-md"
                    style={{ background: "rgba(232,229,224,0.6)", color: "rgba(45,16,15,0.55)" }}
                  >
                    {row.user.plan}
                  </span>
                )}
              </div>
              <p className="text-[11px] mt-1 truncate" style={{ color: "rgba(45,16,15,0.5)" }}>
                {row.user.email}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-[10px]" style={{ color: "rgba(45,16,15,0.4)" }}>
                {new Date(row.requestedAt).toLocaleDateString()}
              </span>
              <span style={{ color: "rgba(45,16,15,0.35)" }}>{expanded ? "▲" : "▼"}</span>
            </div>
          </div>

          {/* Grace progress bar — only when In Grace */}
          {grace && (
            <div className="mt-2.5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: NOHO_BLUE_DEEP }}>
                  Grace window
                </span>
                <span className="text-[10px] font-bold tabular-nums" style={{ color: NOHO_INK }}>
                  {grace.daysElapsed} of {grace.totalDays} · {grace.daysLeft} left
                </span>
              </div>
              <div
                className="h-1.5 rounded-full overflow-hidden"
                style={{ background: "rgba(232,229,224,0.6)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-500 relative overflow-hidden"
                  style={{
                    width: `${grace.pctElapsed}%`,
                    background:
                      grace.daysLeft <= 3
                        ? "linear-gradient(90deg, #dc2626 0%, #991b1b 100%)"
                        : `linear-gradient(90deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)`,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                      animation: "noho-shine 4s ease-in-out infinite",
                    }}
                  />
                </div>
              </div>
              {grace.daysLeft <= 3 && (
                <p className="text-[10px] font-black mt-1" style={{ color: "#b91c1c" }}>
                  ⚠ Grace ends soon — complete cancellation when ready
                </p>
              )}
            </div>
          )}
        </div>
      </button>

      {expanded && (
        <div
          className="px-4 pb-4 space-y-3"
          style={{ borderTop: "1px solid rgba(232,229,224,0.5)" }}
        >
          <div className="pt-3">
            <p className="text-[9px] font-black uppercase tracking-[0.16em] mb-1" style={{ color: "rgba(45,16,15,0.4)" }}>
              Reason
            </p>
            <p className="text-sm" style={{ color: NOHO_INK }}>
              {row.reason}
            </p>
          </div>

          {row.gracePeriodEnd && row.status === "Approved" && (
            <div
              className="rounded-xl px-3 py-2 text-sm"
              style={{
                background: "rgba(51,116,133,0.06)",
                border: "1px solid rgba(51,116,133,0.18)",
              }}
            >
              <span className="font-black" style={{ color: NOHO_BLUE_DEEP }}>
                Grace period ends:
              </span>{" "}
              <span style={{ color: NOHO_INK }}>{new Date(row.gracePeriodEnd).toLocaleDateString()}</span>
            </div>
          )}

          {row.adminNotes && (
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.16em] mb-1" style={{ color: "rgba(45,16,15,0.4)" }}>
                Admin notes
              </p>
              <p className="text-sm" style={{ color: "rgba(45,16,15,0.7)" }}>
                {row.adminNotes}
              </p>
            </div>
          )}

          {row.completedAt && (
            <p className="text-xs" style={{ color: "rgba(45,16,15,0.5)" }}>
              Completed: {new Date(row.completedAt).toLocaleDateString()}
            </p>
          )}

          {row.status === "Pending" && (
            <div className="flex gap-2 flex-wrap">
              <button
                disabled={pending}
                onClick={() => {
                  const notes = window.prompt("Admin notes (optional):");
                  doAction(() => approveCancellation(row.id, notes ?? undefined), "Approved");
                }}
                className="text-xs font-black px-3 py-1.5 rounded-xl text-white disabled:opacity-40"
                style={{
                  background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`,
                  boxShadow: `0 2px 10px ${NOHO_BLUE}33`,
                }}
              >
                Approve · 30-day grace
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  const notes = window.prompt("Reason for denial:");
                  doAction(() => denyCancellation(row.id, notes ?? undefined), "Denied");
                }}
                className="text-xs font-black px-3 py-1.5 rounded-xl border disabled:opacity-40"
                style={{ borderColor: "rgba(220,38,38,0.4)", color: "#b91c1c" }}
              >
                Deny
              </button>
            </div>
          )}

          {row.status === "Approved" && (
            <div className="flex gap-2 flex-wrap">
              <button
                disabled={pending}
                onClick={() => {
                  if (!window.confirm("Complete cancellation? This will close the mailbox and cannot be undone.")) return;
                  doAction(() => completeCancellation(row.id), "Cancellation completed");
                }}
                className="text-xs font-black px-3 py-1.5 rounded-xl border disabled:opacity-40"
                style={{ borderColor: "rgba(220,38,38,0.6)", color: "#b91c1c" }}
              >
                Complete cancellation
              </button>
            </div>
          )}

          {msg && (
            <p
              className="text-xs font-bold"
              style={{ color: msg.startsWith("✓") ? "#16a34a" : "#dc2626" }}
            >
              {msg}
            </p>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes noho-shine {
          0%, 100% { transform: translateX(-100%); opacity: 0; }
          50% { transform: translateX(100%); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export function AdminCancellationsPanel() {
  const [rows, setRows] = useState<CancelRow[] | null>(null);
  const [filter, setFilter] = useState<string>("Pending");

  async function load() {
    const data = await getCancellationRequests();
    setRows(data as CancelRow[]);
  }

  useEffect(() => { load(); }, []);

  const counts = useMemo(() => {
    if (!rows) return { Pending: 0, Approved: 0, Completed: 0, Denied: 0, total: 0 };
    return {
      Pending: rows.filter((r) => r.status === "Pending").length,
      Approved: rows.filter((r) => r.status === "Approved").length,
      Completed: rows.filter((r) => r.status === "Completed").length,
      Denied: rows.filter((r) => r.status === "Denied").length,
      total: rows.length,
    };
  }, [rows]);

  const completedThisMonth = useMemo(() => {
    if (!rows) return 0;
    const now = new Date();
    return rows.filter((r) => {
      if (!r.completedAt) return false;
      const d = new Date(r.completedAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    }).length;
  }, [rows]);

  const filtered = rows ? rows.filter((r) => filter === "All" || r.status === filter) : [];
  const statuses = ["Pending", "Approved", "Completed", "Denied"];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-black text-lg uppercase tracking-wide" style={{ color: NOHO_INK }}>
            Cancellations
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.5)" }}>
            Member close-out workflow · 30-day grace period · CMRA 2-year retention
          </p>
        </div>
        <button
          onClick={load}
          className="text-[10px] font-black uppercase tracking-[0.16em] px-3 py-1.5 rounded-xl text-white"
          style={{
            background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`,
            boxShadow: `0 2px 10px ${NOHO_BLUE}33`,
          }}
        >
          Refresh
        </button>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Pending review" value={String(counts.Pending)} sub="Awaiting decision" accent={counts.Pending > 0} />
        <KpiTile label="In grace" value={String(counts.Approved)} sub="30-day window" />
        <KpiTile label="Completed" value={String(completedThisMonth)} sub={`${counts.Completed} all-time`} />
        <KpiTile label="Denied" value={String(counts.Denied)} sub="All-time" />
      </div>

      {/* ─── Lifecycle stepper ──────────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 bg-white"
        style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}
      >
        <h3 className="text-[10px] font-black uppercase tracking-[0.18em] mb-4" style={{ color: "rgba(45,16,15,0.5)" }}>
          Lifecycle
        </h3>
        <div className="flex items-center gap-2">
          {LIFECYCLE.map((step, i) => {
            const c = counts[step.id as "Pending" | "Approved" | "Completed"];
            return (
              <div key={step.id} className="flex items-center gap-2 flex-1">
                <div
                  className="flex-1 rounded-xl p-3 transition-all"
                  style={{
                    background: c > 0 ? `${step.color}10` : "rgba(232,229,224,0.4)",
                    border: `1px solid ${c > 0 ? `${step.color}55` : "rgba(232,229,224,0.7)"}`,
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-black shrink-0"
                      style={{
                        background: c > 0 ? step.color : "white",
                        color: c > 0 ? "white" : "rgba(45,16,15,0.5)",
                        boxShadow: c > 0 ? `0 0 10px ${step.color}55` : undefined,
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-[11px] font-black" style={{ color: NOHO_INK }}>
                        {step.label}
                      </p>
                      <p className="text-[9px]" style={{ color: "rgba(45,16,15,0.5)" }}>
                        {step.sub}
                      </p>
                    </div>
                    <span
                      className="ml-auto text-[14px] font-black tabular-nums"
                      style={{
                        color: c > 0 ? step.color : "rgba(45,16,15,0.4)",
                        fontFamily: "var(--font-baloo), sans-serif",
                      }}
                    >
                      {c}
                    </span>
                  </div>
                </div>
                {i < LIFECYCLE.length - 1 && (
                  <span aria-hidden="true" className="text-[18px] font-black shrink-0" style={{ color: "rgba(45,16,15,0.25)" }}>
                    →
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {["All", ...statuses].map((s) => {
          const count = rows ? (s === "All" ? rows.length : rows.filter((r) => r.status === s).length) : 0;
          const active = filter === s;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="text-[10px] font-black uppercase tracking-[0.14em] px-3 py-1.5 rounded-xl transition-all"
              style={{
                background: active ? NOHO_BLUE : "rgba(51,116,133,0.08)",
                color: active ? "white" : NOHO_BLUE_DEEP,
                boxShadow: active ? `0 2px 10px ${NOHO_BLUE}33` : undefined,
              }}
            >
              {s} {rows !== null && `(${count})`}
            </button>
          );
        })}
      </div>

      {rows === null && (
        <p className="text-center py-10 text-sm" style={{ color: "rgba(45,16,15,0.4)" }}>
          Loading…
        </p>
      )}

      {rows !== null && filtered.length === 0 && (
        <div
          className="rounded-2xl bg-white p-10 text-center"
          style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04)" }}
        >
          <p className="text-sm" style={{ color: "rgba(45,16,15,0.4)" }}>
            No {filter !== "All" ? filter.toLowerCase() : ""} cancellation requests
          </p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map((row) => (
          <CancelCard key={row.id} row={row} onRefresh={load} />
        ))}
      </div>

      {/* Workflow info card */}
      <div
        className="rounded-2xl p-4 text-xs"
        style={{
          background: "rgba(51,116,133,0.04)",
          border: "1px solid rgba(51,116,133,0.12)",
        }}
      >
        <p className="font-black mb-1.5 uppercase tracking-[0.16em]" style={{ color: NOHO_BLUE_DEEP }}>
          How cancellations work
        </p>
        <ol className="list-decimal pl-4 space-y-1" style={{ color: "rgba(45,16,15,0.6)" }}>
          <li><strong style={{ color: NOHO_INK }}>Member requests</strong> cancellation via dashboard settings</li>
          <li><strong style={{ color: NOHO_INK }}>Admin approves</strong> — member gets a 30-day grace window to collect mail</li>
          <li><strong style={{ color: NOHO_INK }}>Admin completes</strong> after grace — mailbox released, status → Cancelled</li>
          <li><strong style={{ color: NOHO_INK }}>Records retained</strong> per CMRA 2-year retention requirement</li>
        </ol>
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 transition-all hover:-translate-y-0.5"
      style={{
        background: accent ? `linear-gradient(135deg, ${NOHO_AMBER} 0%, #B07030 100%)` : "white",
        boxShadow: accent
          ? `0 8px 24px ${NOHO_AMBER}33, inset 0 1px 0 rgba(255,255,255,0.18)`
          : "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)",
        border: accent ? "1px solid rgba(247,230,194,0.18)" : "1px solid rgba(232,221,208,0.5)",
      }}
    >
      <p
        className="text-[10px] font-black uppercase tracking-[0.16em]"
        style={{ color: accent ? "rgba(255,255,255,0.6)" : "rgba(45,16,15,0.45)" }}
      >
        {label}
      </p>
      <p
        className="text-2xl sm:text-3xl font-black tracking-tight mt-1"
        style={{
          color: accent ? "white" : NOHO_INK,
          fontFamily: "var(--font-baloo), sans-serif",
        }}
      >
        {value}
      </p>
      {sub && (
        <p className="text-[10px] font-bold mt-1" style={{ color: accent ? "rgba(255,255,255,0.65)" : NOHO_BLUE }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// Suppress unused-token lint when only one of NOHO_RED is needed inline.
void NOHO_RED;
