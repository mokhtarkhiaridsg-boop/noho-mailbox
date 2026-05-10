"use client";

/**
 * iter-173 — Carrier-pickup scheduling admin panel (Tier 11 #82).
 *
 * Admin schedules USPS/UPS/FedEx/DHL pickups for the day's outbound
 * batch. Each row tracks the carrier portal confirmation #, package
 * count, and a state machine (draft → scheduled → completed/missed/
 * cancelled). The cron auto-flips to "missed" 60min after the window
 * closes if no completion stamp.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  listCarrierPickups,
  upsertCarrierPickup,
  markPickupScheduled,
  markPickupCompleted,
  cancelCarrierPickup,
  deleteCarrierPickup,
  getCarrierPickupCounts,
  type CarrierPickupRow,
} from "@/app/actions/carrierPickup";
import {
  CARRIER_PICKUP_CARRIERS,
  CARRIER_PICKUP_STATUSES,
  pickupStatusStyle,
  carrierMeta,
  type CarrierPickupCarrier,
  type CarrierPickupStatus,
} from "@/lib/carrier-pickup-config";

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

type Filter = CarrierPickupStatus | "all";

export default function AdminCarrierPickupPanel() {
  const [rows, setRows] = useState<CarrierPickupRow[] | null>(null);
  const [counts, setCounts] = useState<Awaited<ReturnType<typeof getCarrierPickupCounts>> | null>(null);
  const [filter, setFilter] = useState<Filter>("scheduled");
  const [carrierFilter, setCarrierFilter] = useState<CarrierPickupCarrier | "all">("all");
  const [editing, setEditing] = useState<CarrierPickupRow | "new" | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    void listCarrierPickups({ status: filter === "all" ? undefined : filter, carrier: carrierFilter === "all" ? undefined : carrierFilter }).then(setRows).catch(() => setRows([]));
    void getCarrierPickupCounts().then(setCounts).catch(() => undefined);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [filter, carrierFilter]);

  function onSchedule(p: CarrierPickupRow) {
    const conf = prompt(`Confirmation # from ${p.carrier} portal:`, p.confirmationNumber ?? "");
    if (!conf || conf.trim().length < 2) return;
    startTransition(async () => {
      const res = await markPickupScheduled({ id: p.id, confirmationNumber: conf.trim() });
      if (res.error) setError(res.error);
      else refresh();
    });
  }
  function onComplete(p: CarrierPickupRow) {
    const actual = prompt(`Actual packages picked up (estimate was ${p.packageCount}):`, String(p.packageCount));
    if (actual == null) return;
    const n = parseInt(actual, 10);
    if (!Number.isFinite(n) || n < 0) return;
    const driver = prompt("Driver name (optional):") ?? undefined;
    startTransition(async () => {
      const res = await markPickupCompleted({ id: p.id, actualPackageCount: n, driverName: driver?.trim() || undefined });
      if (res.error) setError(res.error);
      else refresh();
    });
  }
  function onCancel(p: CarrierPickupRow) {
    const reason = prompt(`Cancel ${p.carrier} pickup ${p.pickupDate}? Reason (optional):`);
    if (reason === null) return;
    startTransition(async () => {
      const res = await cancelCarrierPickup({ id: p.id, reason: reason.trim() || undefined });
      if (res.error) setError(res.error);
      else refresh();
    });
  }
  function onDelete(p: CarrierPickupRow) {
    if (!confirm(`Permanently delete ${p.carrier} pickup ${p.pickupDate}? Audit log keeps a record.`)) return;
    startTransition(async () => {
      const res = await deleteCarrierPickup({ id: p.id });
      if (res.error) setError(res.error);
      else refresh();
    });
  }

  const grouped = useMemo(() => {
    if (!rows) return new Map<string, CarrierPickupRow[]>();
    const map = new Map<string, CarrierPickupRow[]>();
    for (const r of rows) {
      const key = r.pickupDate;
      const arr = map.get(key) ?? [];
      arr.push(r);
      map.set(key, arr);
    }
    return map;
  }, [rows]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Operations · Carrier pickups
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>Carrier pickup scheduling</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Schedule USPS/UPS/FedEx/DHL pickups for outbound batches. Confirmation # is captured from the carrier portal. No-show alerts auto-fire 60min after the window closes.
        </p>
      </div>

      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Tile label="Today scheduled" value={counts.todayScheduled} accent={T.blue} />
          <Tile label="Today drafts" value={counts.todayPending} accent={T.warning} />
          <Tile label="Missed (7d)" value={counts.missedLast7d} accent={counts.missedLast7d > 0 ? T.danger : T.success} />
          {counts.nextPickup ? (
            <button type="button" onClick={() => setEditing(counts.nextPickup)} className="rounded-xl p-3 text-left" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>Next pickup</p>
              <p className="mt-0.5 text-[14px] font-black" style={{ color: T.ink }}>
                {carrierMeta(counts.nextPickup.carrier).emoji} {counts.nextPickup.pickupDate}
              </p>
              <p className="text-[10px]" style={{ color: T.inkFaint }}>
                {counts.nextPickup.pickupWindowOpen}–{counts.nextPickup.pickupWindowClose} · {counts.nextPickup.packageCount} pkg
              </p>
            </button>
          ) : (
            <Tile label="Next pickup" value="—" accent={T.inkFaint} />
          )}
        </div>
      )}

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filter === "all"} label="All" onClick={() => setFilter("all")} />
          {CARRIER_PICKUP_STATUSES.map((s) => (
            <Chip key={s.key} active={filter === s.key} label={`${s.emoji} ${s.label}`} onClick={() => setFilter(s.key)} bg={s.bg} fg={s.fg} />
          ))}
          <span className="w-px h-5 mx-0.5" style={{ background: T.border }} />
          <Chip active={carrierFilter === "all"} label="All carriers" onClick={() => setCarrierFilter("all")} />
          {CARRIER_PICKUP_CARRIERS.map((c) => (
            <Chip key={c.key} active={carrierFilter === c.key} label={`${c.emoji} ${c.label}`} onClick={() => setCarrierFilter(c.key)} />
          ))}
        </div>
        <button type="button" onClick={() => setEditing("new")} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white" style={{ background: T.blue }}>
          + Schedule pickup
        </button>
      </div>

      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      {rows == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No pickups in this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {Array.from(grouped.entries()).map(([date, list]) => (
            <div key={date}>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: T.inkFaint }}>
                {fmtDateHeader(date)}
              </p>
              <ul className="space-y-2">
                {list.map((p) => (
                  <li key={p.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <span className="text-[28px]" aria-hidden>{carrierMeta(p.carrier).emoji}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-[14px] font-black" style={{ color: T.ink }}>{p.carrier} · {p.pickupWindowOpen}–{p.pickupWindowClose}</p>
                            <StatusPill status={p.status} />
                          </div>
                          <p className="text-[11px] mt-0.5" style={{ color: T.inkSoft }}>
                            {p.packageCount} package{p.packageCount === 1 ? "" : "s"}
                            {p.totalWeightOz != null ? ` · ${(p.totalWeightOz / 16).toFixed(1)} lb` : ""}
                            {p.locationNote ? ` · ${p.locationNote}` : ""}
                          </p>
                          {p.confirmationNumber && (
                            <p className="text-[10.5px] font-mono mt-0.5" style={{ color: T.blueDeep }}>
                              Conf: {p.confirmationNumber}
                            </p>
                          )}
                          {p.instructions && (
                            <p className="text-[10.5px] italic mt-0.5" style={{ color: T.inkSoft }}>
                              📝 {p.instructions}
                            </p>
                          )}
                          {p.status === "completed" && p.completedAtIso && (
                            <p className="text-[10.5px] mt-0.5" style={{ color: T.success }}>
                              ✓ {p.completedActualCount ?? p.packageCount} picked up at {new Date(p.completedAtIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                              {p.driverName ? ` · ${p.driverName}` : ""}
                            </p>
                          )}
                          {p.status === "missed" && p.missedAtIso && (
                            <p className="text-[10.5px] mt-0.5" style={{ color: T.danger }}>
                              ⚠️ Auto-marked missed at {new Date(p.missedAtIso).toLocaleString("en-US", { hour: "numeric", minute: "2-digit" })}
                            </p>
                          )}
                          {p.cancelReason && (
                            <p className="text-[10.5px] mt-0.5" style={{ color: T.inkFaint }}>
                              Cancelled: {p.cancelReason}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {(p.status === "draft" || p.status === "missed") && (
                          <button type="button" onClick={() => onSchedule(p)} disabled={busy} className="text-[10.5px] font-bold px-2 py-1 rounded-md text-white disabled:opacity-50" style={{ background: T.blue }}>
                            🗓 Schedule
                          </button>
                        )}
                        {(p.status === "scheduled" || p.status === "missed") && (
                          <button type="button" onClick={() => onComplete(p)} disabled={busy} className="text-[10.5px] font-bold px-2 py-1 rounded-md text-white disabled:opacity-50" style={{ background: T.success }}>
                            ✓ Mark done
                          </button>
                        )}
                        {(p.status === "draft" || p.status === "scheduled") && (
                          <button type="button" onClick={() => onCancel(p)} disabled={busy} className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                            Cancel
                          </button>
                        )}
                        <button type="button" onClick={() => setEditing(p)} disabled={busy} className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                          Edit
                        </button>
                        {p.carrier !== "Other" && (
                          <a href={carrierMeta(p.carrier).portalUrl} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold px-2 py-1 rounded-md text-center" style={{ background: T.surfaceAlt, color: T.blueDeep, border: `1px solid ${T.border}`, textDecoration: "none" }}>
                            Open portal ↗
                          </a>
                        )}
                        <button type="button" onClick={() => onDelete(p)} disabled={busy} className="text-[10px] font-bold px-2 py-0.5 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                          ×
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <Editor row={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
      )}
    </div>
  );
}

function Editor({ row, onClose, onSaved }: { row: CarrierPickupRow | null; onClose: () => void; onSaved: () => void }) {
  const today = new Date().toISOString().slice(0, 10);
  const [carrier, setCarrier] = useState<CarrierPickupCarrier>(row?.carrier ?? "USPS");
  const [pickupDate, setPickupDate] = useState(row?.pickupDate ?? today);
  const [winOpen, setWinOpen] = useState(row?.pickupWindowOpen ?? "10:00");
  const [winClose, setWinClose] = useState(row?.pickupWindowClose ?? "14:00");
  const [packageCount, setPackageCount] = useState(row?.packageCount ?? 0);
  const [weightLb, setWeightLb] = useState(row?.totalWeightOz != null ? (row.totalWeightOz / 16).toFixed(1) : "");
  const [locationNote, setLocationNote] = useState(row?.locationNote ?? "Front desk");
  const [instructions, setInstructions] = useState(row?.instructions ?? "");
  const [confirmationNumber, setConfirmationNumber] = useState(row?.confirmationNumber ?? "");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSave() {
    setError(null);
    const totalWeightOz = weightLb.trim() ? Math.round(parseFloat(weightLb) * 16) : undefined;
    startTransition(async () => {
      const res = await upsertCarrierPickup({
        id: row?.id, carrier,
        pickupDate, pickupWindowOpen: winOpen, pickupWindowClose: winClose,
        packageCount: Math.max(0, Math.round(packageCount)),
        totalWeightOz,
        locationNote: locationNote.trim() || undefined,
        instructions: instructions.trim() || undefined,
        confirmationNumber: confirmationNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      if (res.error) { setError(res.error); return; }
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={onClose}>
      <div className="relative w-full max-w-lg rounded-2xl flex flex-col max-h-[90vh]" style={{ background: T.surface, border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>{row ? "Edit pickup" : "New pickup"}</p>
          <h3 className="text-lg font-black" style={{ color: T.ink }}>
            {row ? `${row.carrier} · ${row.pickupDate}` : "Schedule a carrier pickup"}
          </h3>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Carrier</label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {CARRIER_PICKUP_CARRIERS.map((c) => (
                <button key={c.key} type="button" onClick={() => setCarrier(c.key)} className="text-[11.5px] font-bold px-2.5 py-1.5 rounded-full" style={{ background: carrier === c.key ? T.blue : "white", color: carrier === c.key ? "white" : T.ink, border: `1px solid ${carrier === c.key ? T.blue : T.border}` }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Date</label>
              <input type="date" value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Window open</label>
              <input type="time" value={winOpen} onChange={(e) => setWinOpen(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Window close</label>
              <input type="time" value={winClose} onChange={(e) => setWinClose(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Package count</label>
              <input type="number" min={0} value={packageCount} onChange={(e) => setPackageCount(Math.max(0, parseInt(e.target.value) || 0))} className="mt-1 w-full px-3 py-2 rounded-lg text-[13px] tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </div>
            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Total weight (lb)</label>
              <input value={weightLb} onChange={(e) => setWeightLb(e.target.value)} placeholder="0.0" inputMode="decimal" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px] tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Location note</label>
            <input value={locationNote} onChange={(e) => setLocationNote(e.target.value)} maxLength={200} placeholder="Front desk" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Driver instructions</label>
            <textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} maxLength={500} placeholder="Ring the bell, packages stacked behind the front desk" className="mt-1 w-full px-3 py-2 rounded-lg text-[12.5px] resize-none" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Carrier confirmation # (skip to save as draft)</label>
            <input value={confirmationNumber} onChange={(e) => setConfirmationNumber(e.target.value)} maxLength={80} placeholder="WS3KH..." className="mt-1 w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            <p className="text-[10px] mt-0.5" style={{ color: T.inkFaint }}>Add this after you book on the carrier portal — flips status from draft to scheduled.</p>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Internal notes</label>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={500} placeholder="Optional admin note" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}
        </div>
        <div className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
          <button type="button" onClick={onClose} className="text-[11.5px] font-bold px-3 py-2 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>Cancel</button>
          <button type="button" onClick={onSave} disabled={busy} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
            {busy ? "Saving…" : row ? "Save changes" : "Create"}
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: CarrierPickupStatus }) {
  const s = pickupStatusStyle(status);
  return (
    <span className="text-[9.5px] font-black px-1.5 py-0.5 rounded" style={{ background: s.bg, color: s.fg }}>
      {s.emoji} {s.label}
    </span>
  );
}

function Tile({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="mt-0.5 text-[22px] font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function Chip({ active, label, onClick, bg, fg }: { active: boolean; label: string; onClick: () => void; bg?: string; fg?: string }) {
  return (
    <button type="button" onClick={onClick} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{
      background: active ? T.blue : (bg ?? "white"),
      color: active ? "white" : (fg ?? T.inkSoft),
      border: `1px solid ${active ? T.blue : T.border}`,
    }}>
      {label}
    </button>
  );
}

function fmtDateHeader(ymd: string): string {
  const d = new Date(`${ymd}T00:00:00`);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  if (diffDays === 0) return `Today · ${label}`;
  if (diffDays === 1) return `Tomorrow · ${label}`;
  if (diffDays === -1) return `Yesterday · ${label}`;
  return label;
}
