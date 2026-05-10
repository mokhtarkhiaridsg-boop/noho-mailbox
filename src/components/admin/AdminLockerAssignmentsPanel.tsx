"use client";

/**
 * iter-225 — Admin lockbox-assignment panel (Tier 16 #134).
 *
 * Lists active + recent assignments with PIN visible (admin-only) +
 * release button to free the locker after pickup. Status filter chips.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listLockerAssignments,
  markLockerAssignmentReleased,
  type LockerAssignmentRow,
} from "@/app/actions/lockboxAutoAssign";

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

const STATUS_FILTERS: Array<{ id: "all" | LockerAssignmentRow["status"]; label: string }> = [
  { id: "Open", label: "Open" },
  { id: "PickedUp", label: "Picked up" },
  { id: "Released", label: "Released" },
  { id: "Expired", label: "Expired" },
  { id: "all", label: "All" },
];

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return `${sec}s ago`;
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  return `${Math.floor(sec / 86400)}d ago`;
}

export default function AdminLockerAssignmentsPanel() {
  const [filter, setFilter] = useState<"all" | LockerAssignmentRow["status"]>("Open");
  const [rows, setRows] = useState<LockerAssignmentRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);

  function refresh() {
    void listLockerAssignments({ status: filter === "all" ? undefined : filter, limit: 80 }).then(setRows).catch(() => setRows([]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [filter]);

  function onRelease(r: LockerAssignmentRow) {
    if (!confirm(`Release locker ${r.lockboxLabel}? Use after the member has picked up.`)) return;
    setInfo(null);
    startTransition(async () => {
      const res = await markLockerAssignmentReleased({ id: r.id });
      if (res.success) { setInfo(`✓ Released ${r.lockboxLabel}`); refresh(); }
    });
  }

  const open = (rows ?? []).filter((r) => r.status === "Open").length;

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
          Locker Assignments
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
          lockbox + pin, on the house
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {open} open · auto-assigned by suite
        </span>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}

      {open > 0 && (
        <div className="rounded-2xl px-4 py-3" style={{ background: "rgba(245,158,11,0.10)", border: "2px solid rgba(245,158,11,0.40)" }}>
          <p className="text-[12px] font-black" style={{ color: "#92400e" }}>
            🔓 {open} locker{open === 1 ? "" : "s"} currently holding a member package
          </p>
        </div>
      )}

      <div className="flex items-center gap-1.5 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button key={f.id} type="button" onClick={() => setFilter(f.id)}
            className="text-[10.5px] font-bold px-2.5 py-1 rounded-full"
            style={{
              background: filter === f.id ? T.blue : "white",
              color: filter === f.id ? "white" : T.ink,
              border: `1px solid ${filter === f.id ? T.blue : T.border}`,
            }}>
            {f.label}
          </button>
        ))}
      </div>

      {!rows ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          🌟 No locker assignments in this view.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const expSoon = r.status === "Open" && new Date(r.expiresAtIso).getTime() - Date.now() < 24 * 3600 * 1000;
            return (
              <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${expSoon ? T.warning : T.border}` }}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[14px] font-black font-mono" style={{ color: r.status === "Open" ? T.blue : T.inkSoft }}>
                        🗃️ {r.lockboxLabel}
                      </span>
                      <span className="text-[9.5px] font-black uppercase tracking-[0.10em] inline-block px-1.5 py-0.5 rounded"
                        style={{
                          background:
                            r.status === "Open" ? "rgba(245,158,11,0.10)" :
                            r.status === "PickedUp" ? "rgba(34,197,94,0.10)" :
                            r.status === "Released" ? "rgba(122,130,144,0.10)" :
                            "rgba(239,68,68,0.10)",
                          color:
                            r.status === "Open" ? "#92400e" :
                            r.status === "PickedUp" ? "#15803d" :
                            r.status === "Released" ? T.inkSoft :
                            T.danger,
                        }}>
                        {r.status}
                      </span>
                      {r.status === "Open" && (
                        <code className="text-[14px] font-black font-mono px-2 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.ink, letterSpacing: ".10em" }}>
                          PIN: {r.pickupPin}
                        </code>
                      )}
                      {expSoon && r.status === "Open" && (
                        <span className="text-[10px] font-black" style={{ color: T.warning }}>⏰ expires soon</span>
                      )}
                    </div>
                    <p className="text-[12px] font-bold mt-1" style={{ color: T.ink }}>{r.userName}</p>
                    <p className="text-[10.5px]" style={{ color: T.inkFaint }}>
                      from {r.mailItemFrom}
                      {r.userPhone && <span> · 📱 {r.userPhone}</span>}
                      {r.lockboxLocation && <span> · 📍 {r.lockboxLocation}</span>}
                    </p>
                    <p className="text-[10px] mt-0.5" style={{ color: T.inkFaint }}>
                      Assigned {relTime(r.assignedAtIso)} · expires {new Date(r.expiresAtIso).toLocaleDateString()}
                      {r.smsStatus && <span> · SMS: {r.smsStatus}</span>}
                    </p>
                  </div>
                  {r.status === "Open" && (
                    <button type="button" onClick={() => onRelease(r)} disabled={busy}
                      className="text-[11px] font-bold px-3 py-1.5 rounded-md text-white shrink-0 disabled:opacity-50" style={{ background: T.success }}>
                      ✓ Released
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
