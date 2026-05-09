"use client";

/**
 * iter-160 — Notary booking calendar (Tier 10 #70).
 *
 * Member-facing date strip + 30-min slot grid. Pulls availability from
 * `getNotaryAvailability` (which respects iter-90 operating hours +
 * holidays). Clicking a slot opens the type/notes form; submit calls
 * `createNotaryBookingForSlot` with the double-book guard. Pending/
 * confirmed bookings show a small list below with cancel.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  getNotaryAvailability,
  createNotaryBookingForSlot,
  cancelMyNotaryBooking,
  listMyNotaryBookings,
  type NotaryAvailability,
  type MyNotaryBooking,
} from "@/app/actions/notaryCalendar";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";

const DOC_TYPES = [
  "Acknowledgment",
  "Jurat / sworn statement",
  "Real-estate document",
  "Power of attorney",
  "Affidavit",
  "Loan / mortgage paperwork",
  "Other",
];

export default function NotaryBookingCalendar() {
  const [avail, setAvail] = useState<NotaryAvailability | null>(null);
  const [bookings, setBookings] = useState<MyNotaryBooking[] | null>(null);
  const [activeDate, setActiveDate] = useState<string | null>(null);
  const [pendingSlot, setPendingSlot] = useState<{ date: string; time: string } | null>(null);
  const [docType, setDocType] = useState<string>(DOC_TYPES[0]!);
  const [customType, setCustomType] = useState<string>("");
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  function refresh() {
    void getNotaryAvailability({ dayCount: 14 }).then((a) => {
      setAvail(a);
      // Default-select the first OPEN day in the strip.
      const firstOpen = a.days.find((d) => d.isOpen && d.slots.some((s) => !s.taken));
      setActiveDate(firstOpen?.date ?? a.days[0]?.date ?? null);
    }).catch(() => setAvail({ days: [], earliestSlot: null }));
    void listMyNotaryBookings().then(setBookings).catch(() => setBookings([]));
  }
  useEffect(refresh, []);

  function onSlot(date: string, time: string) {
    setPendingSlot({ date, time });
    setErrorMsg(null); setSuccessMsg(null);
  }

  function onSubmit() {
    if (!pendingSlot) return;
    setErrorMsg(null);
    const type = docType === "Other" ? customType.trim() : docType;
    if (!type) { setErrorMsg("Pick or type a document type"); return; }
    startTransition(async () => {
      const res = await createNotaryBookingForSlot({
        date: pendingSlot.date, time: pendingSlot.time, type,
      });
      if (res.error) { setErrorMsg(res.error); return; }
      setSuccessMsg(`✓ Booked ${pendingSlot.date} at ${pendingSlot.time}`);
      setPendingSlot(null);
      refresh();
    });
  }

  function onCancel(b: MyNotaryBooking) {
    if (!confirm(`Cancel notary booking on ${b.date} at ${b.time}?`)) return;
    startTransition(async () => {
      const res = await cancelMyNotaryBooking({ id: b.id });
      if (res.error) { setErrorMsg(res.error); return; }
      refresh();
    });
  }

  const activeDay = useMemo(() => avail?.days.find((d) => d.date === activeDate) ?? null, [avail, activeDate]);
  const upcoming = useMemo(() => {
    return (bookings ?? []).filter((b) => b.status === "Pending" || b.status === "Confirmed");
  }, [bookings]);

  return (
    <div className="space-y-4">
      {avail == null ? (
        <p className="text-[12px]" style={{ color: NOHO_INK + "70" }}>Loading availability…</p>
      ) : (
        <>
          {/* Date strip */}
          <div className="overflow-x-auto -mx-1 px-1 pb-1">
            <ul className="flex gap-2 min-w-max">
              {avail.days.map((d) => {
                const open = d.isOpen && d.slots.some((s) => !s.taken);
                const isActive = d.date === activeDate;
                return (
                  <li key={d.date}>
                    <button
                      type="button"
                      disabled={!open}
                      onClick={() => setActiveDate(d.date)}
                      className="min-w-[64px] py-2.5 px-2 rounded-2xl text-center transition-all"
                      style={{
                        background: isActive ? NOHO_BLUE : open ? "white" : "#F4F5F7",
                        color: isActive ? "white" : open ? NOHO_INK : NOHO_INK + "55",
                        border: `1px solid ${isActive ? NOHO_BLUE : "rgba(45,16,15,0.10)"}`,
                        opacity: open ? 1 : 0.6,
                      }}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-wider opacity-80">{d.weekdayLabel}</p>
                      <p className="text-[14px] font-black mt-0.5">{d.monthDayLabel}</p>
                      {!open && (
                        <p className="text-[8.5px] mt-0.5" style={{ color: NOHO_INK + "55" }}>
                          {d.closedReason ?? "Closed"}
                        </p>
                      )}
                      {open && (
                        <p className="text-[9px] mt-0.5" style={{ color: isActive ? "white" : NOHO_BLUE_DEEP, opacity: isActive ? 0.85 : 1 }}>
                          {d.slots.filter((s) => !s.taken).length} slots
                        </p>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Slot grid for active day */}
          {activeDay && (
            <div className="rounded-2xl p-4" style={{ background: "white", border: `1px solid rgba(45,16,15,0.10)` }}>
              <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: NOHO_INK + "70" }}>
                {activeDay.weekdayLabel}, {activeDay.monthDayLabel}
              </p>
              {!activeDay.isOpen ? (
                <p className="text-[12px] mt-2" style={{ color: NOHO_INK + "85" }}>
                  Bureau is {activeDay.closedReason?.toLowerCase() ?? "closed"} that day. Pick another date.
                </p>
              ) : activeDay.slots.length === 0 ? (
                <p className="text-[12px] mt-2" style={{ color: NOHO_INK + "85" }}>
                  No remaining slots today. Pick another date.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-1.5">
                  {activeDay.slots.map((s) => {
                    const isPicked = pendingSlot?.date === s.date && pendingSlot?.time === s.time;
                    return (
                      <button
                        key={`${s.date}T${s.time}`}
                        type="button"
                        disabled={s.taken}
                        onClick={() => onSlot(s.date, s.time)}
                        className="text-[12px] font-bold py-2 px-1.5 rounded-lg transition-all"
                        style={{
                          background: s.taken ? "rgba(45,16,15,0.05)" : isPicked ? NOHO_BLUE : NOHO_CREAM,
                          color: s.taken ? NOHO_INK + "45" : isPicked ? "white" : NOHO_INK,
                          border: `1px solid ${isPicked ? NOHO_BLUE : "rgba(45,16,15,0.10)"}`,
                          textDecoration: s.taken ? "line-through" : "none",
                          cursor: s.taken ? "not-allowed" : "pointer",
                        }}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Booking form revealed when a slot is picked */}
          {pendingSlot && (
            <div className="rounded-2xl p-4 space-y-3" style={{ background: "white", border: `1px solid ${NOHO_BLUE}40`, boxShadow: "0 4px 14px rgba(51,116,133,0.18)" }}>
              <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: NOHO_BLUE_DEEP }}>
                Confirm booking · {pendingSlot.date} @ {pendingSlot.time}
              </p>
              <div>
                <label className="text-[10.5px] font-black uppercase tracking-wider block" style={{ color: NOHO_INK + "70" }}>
                  Document type
                </label>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {DOC_TYPES.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setDocType(t)}
                      className="text-[11px] font-bold px-2.5 py-1 rounded-full"
                      style={{
                        background: docType === t ? NOHO_BLUE : "white",
                        color: docType === t ? "white" : NOHO_INK + "85",
                        border: `1px solid ${docType === t ? NOHO_BLUE : "rgba(45,16,15,0.10)"}`,
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
                {docType === "Other" && (
                  <input
                    type="text"
                    value={customType}
                    onChange={(e) => setCustomType(e.target.value)}
                    placeholder="Describe the document"
                    maxLength={80}
                    className="mt-2 w-full px-3 py-2 rounded-lg text-sm"
                    style={{ background: "#F4F5F7", border: `1px solid rgba(45,16,15,0.10)`, color: NOHO_INK }}
                  />
                )}
              </div>
              {errorMsg && <p className="text-[11.5px] font-semibold" style={{ color: "#991b1b" }}>{errorMsg}</p>}
              <div className="flex justify-end gap-2">
                <button type="button" onClick={() => setPendingSlot(null)} disabled={pending} className="text-[11.5px] font-bold px-3 py-2 rounded-lg" style={{ background: "#F4F5F7", color: NOHO_INK + "85", border: `1px solid rgba(45,16,15,0.10)` }}>
                  Cancel
                </button>
                <button type="button" onClick={onSubmit} disabled={pending} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: NOHO_BLUE }}>
                  {pending ? "Booking…" : "📒 Book this slot"}
                </button>
              </div>
            </div>
          )}

          {successMsg && <p className="text-[12px] font-semibold" style={{ color: "#15803d" }}>{successMsg}</p>}
        </>
      )}

      {/* My upcoming bookings */}
      {upcoming.length > 0 && (
        <div className="rounded-2xl overflow-hidden" style={{ background: "white", border: `1px solid rgba(45,16,15,0.10)` }}>
          <div className="px-4 py-2.5 text-[10px] font-black uppercase tracking-[0.16em]" style={{ background: "#F4F5F7", color: NOHO_INK + "70", borderBottom: `1px solid rgba(45,16,15,0.10)` }}>
            Your upcoming notary bookings
          </div>
          <ul>
            {upcoming.map((b) => (
              <li key={b.id} className="px-4 py-2.5 flex items-center gap-3" style={{ borderTop: `1px solid rgba(45,16,15,0.10)` }}>
                <span className="text-[12px] font-black tabular-nums" style={{ color: NOHO_BLUE_DEEP }}>{b.date}</span>
                <span className="text-[12px] font-mono" style={{ color: NOHO_INK }}>{b.time}</span>
                <span className="text-[11.5px] truncate flex-1" style={{ color: NOHO_INK + "85" }}>{b.type}</span>
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0" style={{ background: b.status === "Confirmed" ? "rgba(34,197,94,0.10)" : "rgba(245,158,11,0.12)", color: b.status === "Confirmed" ? "#15803d" : "#92400e" }}>
                  {b.status}
                </span>
                <button type="button" disabled={pending} onClick={() => onCancel(b)} className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: "#991b1b", border: "1px solid rgba(239,68,68,0.20)" }}>
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
