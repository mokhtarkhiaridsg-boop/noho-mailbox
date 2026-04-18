"use client";

import { useState, useTransition, useEffect } from "react";
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

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  Pending: { bg: "rgba(234,179,8,0.12)", color: "#92400e" },
  Approved: { bg: "rgba(51,116,181,0.1)", color: "#1e4d8c" },
  Completed: { bg: "rgba(22,163,74,0.1)", color: "#15803d" },
  Denied: { bg: "rgba(220,38,38,0.1)", color: "#b91c1c" },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: "rgba(0,0,0,0.06)", color: "#555" };
  return (
    <span
      className="text-[10px] font-black px-2 py-0.5 rounded-full whitespace-nowrap"
      style={c}
    >
      {status}
    </span>
  );
}

function CancelRow({ row, onRefresh }: { row: CancelRow; onRefresh: () => void }) {
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

  return (
    <div
      className="rounded-2xl border overflow-hidden"
      style={{ borderColor: "#E8E5E0" }}
    >
      <div
        className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sm text-gray-900">{row.user.name}</span>
              {row.user.suiteNumber && (
                <span className="text-[11px] text-gray-500">Suite {row.user.suiteNumber}</span>
              )}
              <StatusBadge status={row.status} />
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5">{row.user.email} · {row.user.plan ?? "No plan"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 ml-3 shrink-0">
          <span className="text-[11px] text-gray-400">
            {new Date(row.requestedAt).toLocaleDateString()}
          </span>
          <span className="text-gray-400">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">
          <div>
            <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Reason</p>
            <p className="text-sm text-gray-700">{row.reason}</p>
          </div>

          {row.gracePeriodEnd && (
            <div className="rounded-xl px-3 py-2 text-sm" style={{ background: "rgba(51,116,181,0.08)" }}>
              <span className="font-black text-blue-800">Grace period ends:</span>{" "}
              <span className="text-blue-700">{new Date(row.gracePeriodEnd).toLocaleDateString()}</span>
            </div>
          )}

          {row.adminNotes && (
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-wider mb-1">Admin Notes</p>
              <p className="text-sm text-gray-600">{row.adminNotes}</p>
            </div>
          )}

          {row.completedAt && (
            <p className="text-xs text-gray-500">Completed: {new Date(row.completedAt).toLocaleDateString()}</p>
          )}

          {/* Actions */}
          {row.status === "Pending" && (
            <div className="flex gap-2 flex-wrap">
              <button
                disabled={pending}
                onClick={() => {
                  const notes = window.prompt("Admin notes (optional):");
                  doAction(() => approveCancellation(row.id, notes ?? undefined), "Approved");
                }}
                className="text-xs font-black px-3 py-1.5 rounded-xl text-white disabled:opacity-40"
                style={{ background: "#3374B5" }}
              >
                Approve (30-day grace)
              </button>
              <button
                disabled={pending}
                onClick={() => {
                  const notes = window.prompt("Reason for denial:");
                  doAction(() => denyCancellation(row.id, notes ?? undefined), "Denied");
                }}
                className="text-xs font-black px-3 py-1.5 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-40"
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
                className="text-xs font-black px-3 py-1.5 rounded-xl border border-red-400 text-red-600 hover:bg-red-50 disabled:opacity-40"
              >
                Complete Cancellation
              </button>
            </div>
          )}

          {msg && (
            <p className="text-xs font-bold" style={{ color: msg.startsWith("✓") ? "#16a34a" : "#dc2626" }}>
              {msg}
            </p>
          )}
        </div>
      )}
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

  const statuses = ["Pending", "Approved", "Completed", "Denied"];
  const filtered = rows ? rows.filter((r) => filter === "All" || r.status === filter) : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-black text-gray-900">Cancellation Requests</h2>
          <p className="text-xs text-gray-500">Manage member cancellations and mailbox closeouts</p>
        </div>
        <button
          onClick={load}
          className="text-xs font-black px-3 py-2 rounded-xl text-white"
          style={{ background: "#3374B5" }}
        >
          Refresh
        </button>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 flex-wrap">
        {["All", ...statuses].map((s) => {
          const count = rows ? (s === "All" ? rows.length : rows.filter((r) => r.status === s).length) : 0;
          return (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className="text-xs font-black px-3 py-1.5 rounded-xl transition-colors"
              style={{
                background: filter === s ? "#3374B5" : "rgba(51,116,181,0.08)",
                color: filter === s ? "white" : "#3374B5",
              }}
            >
              {s} {rows !== null && `(${count})`}
            </button>
          );
        })}
      </div>

      {rows === null && (
        <p className="text-center py-10 text-gray-400 text-sm">Loading…</p>
      )}

      {rows !== null && filtered.length === 0 && (
        <p className="text-center py-10 text-gray-400 text-sm">No {filter !== "All" ? filter.toLowerCase() : ""} cancellation requests</p>
      )}

      <div className="space-y-2">
        {filtered.map((row) => (
          <CancelRow key={row.id} row={row} onRefresh={load} />
        ))}
      </div>

      {/* Info */}
      <div className="rounded-2xl p-4 text-xs" style={{ background: "rgba(51,116,181,0.06)", border: "1px solid rgba(51,116,181,0.15)" }}>
        <p className="font-black text-blue-900 mb-1.5">Cancellation workflow</p>
        <ol className="list-decimal pl-4 space-y-1 text-gray-600">
          <li><strong>Member requests</strong> cancellation via dashboard settings</li>
          <li><strong>Admin approves</strong> — member gets 30-day grace period to collect mail</li>
          <li><strong>Admin completes</strong> after grace period — mailbox released, status set to Cancelled</li>
          <li><strong>Records retained</strong> per CMRA 2-year retention requirement</li>
        </ol>
      </div>
    </div>
  );
}
