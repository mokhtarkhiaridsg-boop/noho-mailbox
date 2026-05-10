"use client";

/**
 * iter-174 — Notary witness check-in admin panel (Tier 11 #83).
 *
 * Lives next to the iter-160 NotaryBookingCalendar member-side card.
 * Admin filters by date (defaults to today) + status, sees every
 * booking with one-tap action buttons:
 *   - Pending  → "Check in" (modal with ID picker + witness name)
 *   - Checked in → "Attach signed doc" + "Complete"
 *   - Any state → "Mark no-show" + "Cancel"
 *
 * Captured fields freeze on completion. Audit trail visible via the
 * existing audit-log panel.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  listNotaryCheckIns,
  checkInNotaryBooking,
  attachSignedDocument,
  completeNotaryBooking,
  noShowNotaryBooking,
  getNotaryCheckInCounts,
  type NotaryCheckInRow,
} from "@/app/actions/notaryCheckIn";

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

const STATUS_FILTERS = ["all", "Pending", "Confirmed", "Checked In", "Completed", "No Show", "Cancelled"];
const ID_TYPES = ["DL", "Passport", "State ID", "Military", "Other"] as const;
type IdType = typeof ID_TYPES[number];

export default function AdminNotaryCheckInPanel() {
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [status, setStatus] = useState<string>("all");
  const [rows, setRows] = useState<NotaryCheckInRow[] | null>(null);
  const [counts, setCounts] = useState<Awaited<ReturnType<typeof getNotaryCheckInCounts>> | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [checkingIn, setCheckingIn] = useState<NotaryCheckInRow | null>(null);
  const [completing, setCompleting] = useState<NotaryCheckInRow | null>(null);

  function refresh() {
    void listNotaryCheckIns({ date: date || undefined, status: status === "all" ? undefined : status }).then(setRows).catch(() => setRows([]));
    void getNotaryCheckInCounts().then(setCounts).catch(() => undefined);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [date, status]);

  function onNoShow(r: NotaryCheckInRow) {
    const reason = prompt(`Mark "${r.customerName}" as no-show? Reason (optional):`);
    if (reason === null) return;
    startTransition(async () => {
      const res = await noShowNotaryBooking({ id: r.id, reason: reason.trim() || undefined });
      if (res.error) setError(res.error);
      else refresh();
    });
  }

  function onAttachDoc(r: NotaryCheckInRow) {
    const url = prompt(`Paste the signed-document scan URL (Vercel Blob or other HTTPS):`, r.signedDocumentUrl ?? "");
    if (!url || url.trim().length < 8) return;
    startTransition(async () => {
      const res = await attachSignedDocument({ id: r.id, signedDocumentUrl: url.trim() });
      if (res.error) setError(res.error);
      else refresh();
    });
  }

  const grouped = useMemo(() => {
    const map = new Map<string, NotaryCheckInRow[]>();
    for (const r of rows ?? []) {
      const key = r.time;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Operations · Notary check-in
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>Notary check-in counter</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          One-tap workflow at the counter: when a member arrives for an iter-160 notary booking, capture the ID type + witness, attach a scan of the signed document, mark complete.
        </p>
      </div>

      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile label="Today booked" value={counts.todayBooked} accent={T.blue} />
          <Tile label="Checked in" value={counts.todayCheckedIn} accent={T.warning} />
          <Tile label="Completed" value={counts.todayCompleted} accent={T.success} />
          <Tile label="Still pending" value={counts.pendingNow} accent={T.blueDeep} />
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-1.5 rounded-lg text-[12px]" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
        <button type="button" onClick={() => { const d = new Date(); setDate(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`); }} className="text-[11px] font-bold px-2 py-1 rounded-md" style={{ background: "white", color: T.inkSoft, border: `1px solid ${T.border}` }}>
          Today
        </button>
        <span className="w-px h-5 mx-1" style={{ background: T.border }} />
        {STATUS_FILTERS.map((s) => (
          <button key={s} type="button" onClick={() => setStatus(s)} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{
            background: status === s ? T.blue : "white",
            color: status === s ? "white" : T.inkSoft,
            border: `1px solid ${status === s ? T.blue : T.border}`,
          }}>
            {s === "all" ? "All" : s}
          </button>
        ))}
      </div>

      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      {rows == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No bookings for this date+filter.
        </div>
      ) : (
        <div className="space-y-3">
          {grouped.map(([time, list]) => (
            <div key={time}>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: T.inkFaint }}>
                {fmt12hr(time)}
              </p>
              <ul className="space-y-2">
                {list.map((r) => (
                  <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}`, opacity: r.status === "Cancelled" ? 0.55 : 1 }}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[14px] font-black" style={{ color: T.ink }}>{r.customerName}</p>
                          <StatusPill status={r.status} />
                          {r.suiteNumber && <span className="text-[10.5px] font-mono" style={{ color: T.inkFaint }}>#{r.suiteNumber}</span>}
                        </div>
                        <p className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>
                          {r.type}
                          {r.notes && <span className="italic" style={{ color: T.inkFaint }}> · 💬 {r.notes}</span>}
                        </p>
                        {r.checkedInAtIso && (
                          <p className="text-[10.5px] mt-0.5" style={{ color: T.warning }}>
                            🕐 Checked in {new Date(r.checkedInAtIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            {r.idPresented ? ` · ID: ${r.idPresented}${r.idPresentedNumber ? ` (${r.idPresentedNumber})` : ""}` : ""}
                            {r.witnessName ? ` · 👤 ${r.witnessName}` : ""}
                          </p>
                        )}
                        {r.completedAtIso && (
                          <p className="text-[10.5px] mt-0.5" style={{ color: T.success }}>
                            ✓ Completed {new Date(r.completedAtIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            {r.signedDocumentUrl && <a href={r.signedDocumentUrl} target="_blank" rel="noopener noreferrer" className="ml-1 underline" style={{ color: T.blueDeep }}>· view scan ↗</a>}
                          </p>
                        )}
                        {r.noShowAtIso && (
                          <p className="text-[10.5px] mt-0.5" style={{ color: T.danger }}>
                            ⚠️ No-show at {new Date(r.noShowAtIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                            {r.noShowReason ? ` · ${r.noShowReason}` : ""}
                          </p>
                        )}
                        {r.adminNotes && (
                          <p className="text-[10.5px] mt-0.5 italic" style={{ color: T.inkSoft }}>📝 {r.adminNotes}</p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {!r.checkedInAtIso && !r.completedAtIso && r.status !== "Cancelled" && r.status !== "No Show" && (
                          <button type="button" onClick={() => setCheckingIn(r)} disabled={busy} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white disabled:opacity-50" style={{ background: T.blue }}>
                            🕐 Check in
                          </button>
                        )}
                        {r.checkedInAtIso && !r.completedAtIso && (
                          <>
                            <button type="button" onClick={() => onAttachDoc(r)} disabled={busy} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                              📎 {r.signedDocumentUrl ? "Replace doc" : "Attach doc"}
                            </button>
                            <button type="button" onClick={() => setCompleting(r)} disabled={busy} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md text-white disabled:opacity-50" style={{ background: T.success }}>
                              ✓ Complete
                            </button>
                          </>
                        )}
                        {!r.completedAtIso && r.status !== "Cancelled" && r.status !== "No Show" && (
                          <button type="button" onClick={() => onNoShow(r)} disabled={busy} className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                            No-show
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {checkingIn && <CheckInModal row={checkingIn} onClose={() => setCheckingIn(null)} onSaved={() => { setCheckingIn(null); refresh(); }} />}
      {completing && <CompleteModal row={completing} onClose={() => setCompleting(null)} onSaved={() => { setCompleting(null); refresh(); }} />}
    </div>
  );
}

function CheckInModal({ row, onClose, onSaved }: { row: NotaryCheckInRow; onClose: () => void; onSaved: () => void }) {
  const [idPresented, setIdPresented] = useState<IdType>(row.idPresented ?? "DL");
  const [idPresentedNumber, setIdPresentedNumber] = useState<string>(row.idPresentedNumber ?? "");
  const [witnessName, setWitnessName] = useState<string>(row.witnessName ?? "");
  const [adminNotes, setAdminNotes] = useState<string>(row.adminNotes ?? "");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await checkInNotaryBooking({
        id: row.id, idPresented,
        idPresentedNumber: idPresentedNumber.trim() || undefined,
        witnessName: witnessName.trim() || undefined,
        adminNotes: adminNotes.trim() || undefined,
      });
      if (res.error) { setError(res.error); return; }
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl flex flex-col max-h-[90vh]" style={{ background: T.surface, border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>Check in</p>
          <h3 className="text-lg font-black" style={{ color: T.ink }}>{row.customerName} · {fmt12hr(row.time)}</h3>
          <p className="text-[11px]" style={{ color: T.inkFaint }}>{row.type}</p>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>ID presented *</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {ID_TYPES.map((t) => (
                <button key={t} type="button" onClick={() => setIdPresented(t)} className="text-[11.5px] font-bold px-2.5 py-1.5 rounded-full" style={{
                  background: idPresented === t ? T.blue : "white",
                  color: idPresented === t ? "white" : T.ink,
                  border: `1px solid ${idPresented === t ? T.blue : T.border}`,
                }}>
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>ID number (optional · last 4 OK)</label>
            <input value={idPresentedNumber} onChange={(e) => setIdPresentedNumber(e.target.value)} maxLength={40} placeholder="••••1234" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Witness name (when applicable)</label>
            <input value={witnessName} onChange={(e) => setWitnessName(e.target.value)} maxLength={80} placeholder="Mariem K." className="mt-1 w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Admin notes</label>
            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={2} maxLength={500} className="mt-1 w-full px-3 py-2 rounded-lg text-[12.5px] resize-none" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}
        </div>
        <div className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
          <button type="button" onClick={onClose} className="text-[11.5px] font-bold px-3 py-2 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>Cancel</button>
          <button type="button" onClick={onSubmit} disabled={busy} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
            {busy ? "Saving…" : "🕐 Check in now"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CompleteModal({ row, onClose, onSaved }: { row: NotaryCheckInRow; onClose: () => void; onSaved: () => void }) {
  const [signedDocumentUrl, setSignedDocumentUrl] = useState<string>(row.signedDocumentUrl ?? "");
  const [adminNotes, setAdminNotes] = useState<string>(row.adminNotes ?? "");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit() {
    setError(null);
    startTransition(async () => {
      const res = await completeNotaryBooking({
        id: row.id,
        signedDocumentUrl: signedDocumentUrl.trim() || undefined,
        adminNotes: adminNotes.trim() || undefined,
      });
      if (res.error) { setError(res.error); return; }
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl flex flex-col max-h-[90vh]" style={{ background: T.surface, border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.success }}>Complete notarization</p>
          <h3 className="text-lg font-black" style={{ color: T.ink }}>{row.customerName}</h3>
          <p className="text-[11px]" style={{ color: T.inkFaint }}>{row.type} · {fmt12hr(row.time)}</p>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Signed document URL</label>
            <input value={signedDocumentUrl} onChange={(e) => setSignedDocumentUrl(e.target.value)} maxLength={500} placeholder="https://blob.vercel-storage.com/..." className="mt-1 w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            <p className="text-[10px] mt-0.5" style={{ color: T.inkFaint }}>Optional but recommended — paste the Blob URL of your scanned, signed document.</p>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Admin notes (final)</label>
            <textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} rows={3} maxLength={500} className="mt-1 w-full px-3 py-2 rounded-lg text-[12.5px] resize-none" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}
        </div>
        <div className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
          <button type="button" onClick={onClose} className="text-[11.5px] font-bold px-3 py-2 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>Cancel</button>
          <button type="button" onClick={onSubmit} disabled={busy} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.success }}>
            {busy ? "Completing…" : "✓ Mark complete"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const style = (() => {
    if (status === "Completed") return { bg: "rgba(34,197,94,0.10)", fg: "#15803d" };
    if (status === "Checked In") return { bg: "rgba(245,158,11,0.12)", fg: "#92400e" };
    if (status === "Confirmed") return { bg: "rgba(25,118,255,0.10)", fg: "#0F5BD9" };
    if (status === "Pending") return { bg: "rgba(120,113,108,0.12)", fg: "#57534e" };
    if (status === "No Show") return { bg: "rgba(239,68,68,0.10)", fg: "#991b1b" };
    if (status === "Cancelled") return { bg: "rgba(120,113,108,0.12)", fg: "#57534e" };
    return { bg: "rgba(120,113,108,0.12)", fg: "#57534e" };
  })();
  return <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ background: style.bg, color: style.fg }}>{status}</span>;
}

function Tile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="mt-0.5 text-[22px] font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function fmt12hr(time: string): string {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h)) return time;
  const ampm = (h ?? 0) < 12 ? "AM" : "PM";
  const h12 = (((h ?? 0) + 11) % 12) + 1;
  return `${h12}:${String(m ?? 0).padStart(2, "0")} ${ampm}`;
}
