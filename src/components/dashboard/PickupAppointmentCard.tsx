"use client";

// iter-101 — Pickup-time scheduling (member side).
//
// Two stacked sections:
//   1. "Schedule pickup" — date picker (next 14 days) → fetched 15-min
//      slots as chips → optional package count + guest name + notes.
//   2. "Your appointments" — Scheduled rows with Cancel; the rest as
//      a small history strip.
//
// Reuses BRAND palette + the same card chrome as SharedMailboxCard /
// ReferAndEarnCard so it slots cleanly under them in SettingsPanel.

import { useEffect, useMemo, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  getAvailableSlots,
  bookPickupAppointment,
  getMyPickupAppointments,
  cancelMyPickupAppointment,
  type AvailableSlot,
} from "@/app/actions/pickupScheduling";

type MyAppt = Awaited<ReturnType<typeof getMyPickupAppointments>>[number];

function nextNDays(n: number): { iso: string; label: string }[] {
  const out: { iso: string; label: string }[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getTime() + i * 24 * 60 * 60 * 1000);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    const label = i === 0 ? "Today"
      : i === 1 ? "Tomorrow"
      : new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric" }).format(d);
    out.push({ iso, label });
  }
  return out;
}

export default function PickupAppointmentCard() {
  const days = useMemo(() => nextNDays(14), []);
  const [selectedDate, setSelectedDate] = useState<string>(days[0].iso);
  const [slots, setSlots] = useState<AvailableSlot[] | null>(null);
  const [closedReason, setClosedReason] = useState<string | null>(null);
  const [selectedSlotIso, setSelectedSlotIso] = useState<string | null>(null);
  const [packageCount, setPackageCount] = useState<string>("");
  const [guestName, setGuestName] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [appts, setAppts] = useState<MyAppt[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function loadSlots(date: string) {
    setSlots(null);
    setSelectedSlotIso(null);
    setClosedReason(null);
    startTransition(async () => {
      const res = await getAvailableSlots({ date });
      if (res.closed) setClosedReason(res.closed);
      setSlots(res.slots);
    });
  }

  function refreshAppts() {
    void getMyPickupAppointments().then(setAppts).catch(() => setAppts([]));
  }

  useEffect(() => { loadSlots(selectedDate); }, [selectedDate]);
  useEffect(() => { refreshAppts(); }, []);

  function book() {
    if (!selectedSlotIso) { setMsg("Pick a time slot first"); return; }
    setMsg(null);
    startTransition(async () => {
      const res = await bookPickupAppointment({
        startIso: selectedSlotIso,
        packageCount: packageCount ? Math.max(1, Math.min(99, parseInt(packageCount, 10) || 0)) : null,
        guestName: guestName || null,
        notes: notes || null,
      });
      if (res.error) { setMsg(res.error); return; }
      setMsg("✓ Pickup scheduled — check your email for confirmation");
      setSelectedSlotIso(null);
      setPackageCount("");
      setGuestName("");
      setNotes("");
      loadSlots(selectedDate);
      refreshAppts();
    });
  }

  function cancel(id: string) {
    if (!confirm("Cancel this pickup appointment?")) return;
    startTransition(async () => {
      const res = await cancelMyPickupAppointment(id);
      if (res.error) { alert(res.error); return; }
      refreshAppts();
      loadSlots(selectedDate);
    });
  }

  const upcomingScheduled = (appts ?? []).filter((a) => a.status === "Scheduled");
  const history = (appts ?? []).filter((a) => a.status !== "Scheduled").slice(0, 6);

  return (
    <div
      className="rounded-3xl p-6 mt-3"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
        <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
          Schedule a pickup
        </h3>
      </div>
      <p className="text-[11.5px] mb-4" style={{ color: BRAND.inkSoft }}>
        Skip the line: book a 15-minute slot and we'll have your packages staged at the counter when you arrive.
      </p>

      {msg && (
        <div className="rounded-xl px-3 py-2 mb-3 text-[11.5px] font-bold"
          style={{
            background: msg.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: msg.startsWith("✓") ? "#15803d" : "#991b1b",
          }}>
          {msg}
        </div>
      )}

      {/* Step 1: pick a date */}
      <div className="mb-3">
        <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: BRAND.inkSoft }}>
          1 · Pick a date
        </p>
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {days.map((d) => {
            const active = d.iso === selectedDate;
            return (
              <button
                key={d.iso}
                type="button"
                onClick={() => setSelectedDate(d.iso)}
                className="px-3 py-1.5 rounded-full text-[11px] font-bold whitespace-nowrap transition-colors"
                style={{
                  background: active ? BRAND.blue : "white",
                  color: active ? "white" : BRAND.ink,
                  border: `1px solid ${active ? BRAND.blue : BRAND.border}`,
                }}>
                {d.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Step 2: pick a slot */}
      <div className="mb-3">
        <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: BRAND.inkSoft }}>
          2 · Pick a time
        </p>
        {!slots ? (
          <p className="text-[11.5px]" style={{ color: BRAND.inkFaint }}>Loading slots…</p>
        ) : closedReason ? (
          <p className="text-[11.5px] italic" style={{ color: BRAND.inkFaint }}>{closedReason}.</p>
        ) : slots.length === 0 ? (
          <p className="text-[11.5px] italic" style={{ color: BRAND.inkFaint }}>No slots available for that day.</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {slots.map((s) => {
              const full = s.remaining === 0;
              const active = s.startIso === selectedSlotIso;
              return (
                <button
                  key={s.startIso}
                  type="button"
                  disabled={full}
                  onClick={() => setSelectedSlotIso(s.startIso)}
                  className="px-3 py-1.5 rounded-lg text-[11.5px] font-black tabular-nums disabled:opacity-40 transition-colors"
                  style={{
                    background: active ? BRAND.blue : full ? "rgba(45,16,15,0.04)" : "white",
                    color: active ? "white" : full ? BRAND.inkFaint : BRAND.ink,
                    border: `1px solid ${active ? BRAND.blue : BRAND.border}`,
                    cursor: full ? "not-allowed" : "pointer",
                  }}
                  title={full ? "Slot full" : `${s.remaining} left at this slot`}
                >
                  {s.startLocal}{full && " · full"}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Step 3: details + confirm */}
      {selectedSlotIso && (
        <div className="rounded-xl border p-3 space-y-2 mb-1" style={{ borderColor: BRAND.border, background: BRAND.blueSoft }}>
          <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: BRAND.blueDeep }}>
            3 · Add details (optional) · then confirm
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input
              type="number" min={1} max={99}
              value={packageCount}
              onChange={(e) => setPackageCount(e.target.value)}
              placeholder="# packages (estimate)"
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }}
            />
            <input
              type="text"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              placeholder="Guest doing pickup (optional)"
              className="rounded-lg border px-3 py-2 text-sm"
              style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }}
            />
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Anything we should know? (optional)"
            className="w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }}
          />
          <button type="button" onClick={book} disabled={pending}
            className="w-full py-2.5 rounded-lg text-white text-[12px] font-black uppercase tracking-[0.10em] disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}>
            {pending ? "Scheduling…" : "Confirm pickup"}
          </button>
        </div>
      )}

      {/* Your appointments */}
      <div className="mt-4">
        <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: BRAND.inkSoft }}>
          Upcoming ({upcomingScheduled.length})
        </p>
        {!appts ? (
          <p className="text-[11.5px]" style={{ color: BRAND.inkFaint }}>Loading…</p>
        ) : upcomingScheduled.length === 0 ? (
          <p className="text-[11.5px]" style={{ color: BRAND.inkFaint }}>No pickups scheduled.</p>
        ) : (
          <ul className="space-y-1.5">
            {upcomingScheduled.map((a) => (
              <li key={a.id} className="rounded-lg border px-3 py-2 flex items-center justify-between gap-2"
                style={{ borderColor: BRAND.border, background: "white" }}>
                <div className="min-w-0">
                  <p className="text-[12.5px] font-black truncate" style={{ color: BRAND.ink }}>{a.scheduledAtLocal}</p>
                  <p className="text-[10.5px] mt-0.5" style={{ color: BRAND.inkSoft }}>
                    {a.packageCount ? `${a.packageCount} pkg · ` : ""}
                    {a.guestName ? `Guest: ${a.guestName} · ` : ""}
                    {a.notes ? a.notes : "Scheduled"}
                  </p>
                </div>
                <button type="button" onClick={() => cancel(a.id)} disabled={pending}
                  className="px-2 py-1 rounded-lg text-[10.5px] font-bold disabled:opacity-50"
                  style={{ color: "#991b1b", background: "rgba(231,0,19,0.06)" }}>
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        )}
        {history.length > 0 && (
          <details className="mt-2.5">
            <summary className="text-[10px] font-black uppercase tracking-[0.18em] cursor-pointer" style={{ color: BRAND.inkSoft }}>
              History · {history.length}
            </summary>
            <ul className="mt-1.5 space-y-1">
              {history.map((a) => (
                <li key={a.id} className="text-[10.5px] flex items-center justify-between" style={{ color: BRAND.inkSoft }}>
                  <span>{a.scheduledAtLocal}</span>
                  <span className="font-black px-1.5 py-0.5 rounded" style={{
                    background: a.status === "Completed" ? "rgba(22,163,74,0.10)" : a.status === "No-Show" ? "rgba(231,0,19,0.10)" : "rgba(45,16,15,0.04)",
                    color: a.status === "Completed" ? "#15803d" : a.status === "No-Show" ? "#991b1b" : BRAND.ink,
                  }}>{a.status}</span>
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </div>
  );
}
