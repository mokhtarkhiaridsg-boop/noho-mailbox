"use client";

// iter-101 — Admin pickup queue.
//
// Sorted list of upcoming pickup appointments with the four lifecycle
// transitions (Check-in / Complete / No-Show / Cancel). Default window
// is "from 2h ago through next 7 days" so the queue is empty after the
// last person walks out and re-fills the next morning. Counters at the
// top: Today vs Upcoming.

import { useEffect, useState, useTransition } from "react";
import {
  listAdminPickupQueue,
  adminCheckInPickup,
  adminCompletePickup,
  adminNoShowPickup,
  adminCancelPickup,
  type AdminPickupRow,
} from "@/app/actions/pickupScheduling";

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";

type Status = "all" | "Scheduled" | "Checked-In" | "Completed" | "No-Show" | "Cancelled";

export default function AdminPickupAppointmentsPanel() {
  const [data, setData] = useState<{ rows: AdminPickupRow[]; todayCount: number; upcomingCount: number } | null>(null);
  const [filter, setFilter] = useState<Status>("Scheduled");
  const [pending, startTransition] = useTransition();

  function refresh() {
    void listAdminPickupQueue().then(setData).catch(() => setData({ rows: [], todayCount: 0, upcomingCount: 0 }));
  }

  useEffect(() => { refresh(); }, []);

  function transition(id: string, fn: (id: string) => Promise<{ error?: string; success?: boolean }>, label: string) {
    if (label.startsWith("Cancel") && !confirm("Cancel this appointment?")) return;
    if (label.startsWith("No-show") && !confirm("Mark as No-Show? The customer won't be notified.")) return;
    startTransition(async () => {
      const res = await fn(id);
      if (res.error) { alert(res.error); return; }
      refresh();
    });
  }

  const filteredRows = (data?.rows ?? []).filter((r) => filter === "all" || r.status === filter);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          Operations · Pickup queue
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Pickup appointments</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          15-minute pickup slots booked by customers. Check them in when they arrive, mark complete on hand-off.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <StatTile label="Today (active)" value={data?.todayCount ?? 0} accent={NOHO_BLUE_DEEP} />
        <StatTile label="Upcoming" value={data?.upcomingCount ?? 0} accent="#7c3aed" />
        <StatTile label="Total in window" value={data?.rows.length ?? 0} accent={NOHO_INK} />
        <StatTile label="Showing" value={filteredRows.length} accent="#15803d" />
      </div>

      {/* Filter chips */}
      <div className="flex flex-wrap gap-1.5">
        {(["Scheduled", "Checked-In", "Completed", "No-Show", "Cancelled", "all"] as Status[]).map((s) => {
          const active = filter === s;
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-full text-[11px] font-bold"
              style={{
                background: active ? NOHO_BLUE : "white",
                color: active ? "white" : NOHO_INK,
                border: `1px solid ${active ? NOHO_BLUE : "#e8e5e0"}`,
              }}>
              {s === "all" ? "All" : s}
            </button>
          );
        })}
      </div>

      {/* Queue */}
      <div className="rounded-md bg-white" style={{ border: "1px solid #ECEEF1" }}>
        {!data ? (
          <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading queue…</p>
        ) : filteredRows.length === 0 ? (
          <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>
            No appointments in this view.
          </p>
        ) : (
          <ul>
            {filteredRows.map((r, i) => (
              <li key={r.id} className="px-4 py-3 flex flex-wrap items-center gap-3" style={{ borderTop: i === 0 ? "none" : "1px solid #e8e5e0" }}>
                <div className="min-w-[160px]">
                  <p className="text-[12.5px] font-black tabular-nums" style={{ color: NOHO_INK }}>{r.scheduledAtLocal}</p>
                  <p className="text-[10.5px] mt-0.5">
                    <StatusChip status={r.status} />
                  </p>
                </div>
                <div className="min-w-[200px] flex-1">
                  <p className="text-[12.5px] font-black truncate" style={{ color: NOHO_INK }}>
                    {r.userName} {r.suiteNumber && (
                      <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                        Suite #{r.suiteNumber}
                      </span>
                    )}
                  </p>
                  <p className="text-[10.5px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                    {r.userEmail}
                    {r.packageCount != null && ` · ${r.packageCount} pkg`}
                    {r.guestName && ` · guest: ${r.guestName}`}
                  </p>
                  {r.notes && <p className="text-[10.5px] mt-0.5 italic" style={{ color: "rgba(45,16,15,0.55)" }}>"{r.notes}"</p>}
                </div>
                <div className="flex items-center gap-1">
                  {r.status === "Scheduled" && (
                    <>
                      <ActionBtn label="Check in" tone="blue"   onClick={() => transition(r.id, adminCheckInPickup, "Check in")} disabled={pending} />
                      <ActionBtn label="No-show"  tone="muted"  onClick={() => transition(r.id, adminNoShowPickup, "No-show")} disabled={pending} />
                      <ActionBtn label="Cancel"   tone="danger" onClick={() => transition(r.id, adminCancelPickup, "Cancel")} disabled={pending} />
                    </>
                  )}
                  {r.status === "Checked-In" && (
                    <ActionBtn label="Mark complete" tone="green" onClick={() => transition(r.id, adminCompletePickup, "Complete")} disabled={pending} />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatTile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-md bg-white p-3" style={{ border: "1px solid #ECEEF1" }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#7A8290" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: accent, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>{value}</p>
    </div>
  );
}

function StatusChip({ status }: { status: string }) {
  const map: Record<string, { bg: string; fg: string }> = {
    "Scheduled":  { bg: "rgba(51,116,133,0.10)", fg: "#0F5BD9" },
    "Checked-In": { bg: "rgba(245,166,35,0.14)", fg: "#92400e" },
    "Completed":  { bg: "rgba(22,163,74,0.14)",  fg: "#15803d" },
    "No-Show":    { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b" },
    "Cancelled":  { bg: "rgba(45,16,15,0.06)",   fg: "rgba(45,16,15,0.55)" },
  };
  const c = map[status] ?? map["Cancelled"];
  return (
    <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}

function ActionBtn({ label, tone, onClick, disabled }: { label: string; tone: "blue" | "green" | "danger" | "muted"; onClick: () => void; disabled?: boolean }) {
  const styles: Record<string, { bg: string; fg: string; border: string }> = {
    blue:   { bg: "white", fg: NOHO_BLUE_DEEP, border: NOHO_BLUE },
    green:  { bg: "linear-gradient(135deg,#22C55E,#15803d)", fg: "white", border: "#15803d" },
    danger: { bg: "white", fg: "#991b1b", border: "rgba(231,0,19,0.40)" },
    muted:  { bg: "white", fg: "rgba(45,16,15,0.55)", border: "#e8e5e0" },
  };
  const s = styles[tone];
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      className="px-2.5 py-1.5 rounded-lg text-[10.5px] font-black disabled:opacity-50 transition-opacity"
      style={{ background: s.bg, color: s.fg, border: `1px solid ${s.border}` }}>
      {label}
    </button>
  );
}
