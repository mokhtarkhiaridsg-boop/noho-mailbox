"use client";

/**
 * iter-171 — Lockbox keypad live status board (Tier 11 #80).
 *
 * Tablet-friendly grid of every lockbox with live state. Polls every
 * 5 seconds. Tile colors:
 *   - GREEN  : closed
 *   - BLUE   : open (within window)
 *   - RED    : open + overdue (past expectedCloseBy)
 *   - AMBER  : ajar / fault
 *   - GREY   : inactive
 *
 * Click a tile to open the inspector drawer with: open/close manual
 * controls, fault toggle, recent events for that box, edit button.
 *
 * Top stat strip: total / open / overdue counters update live with the
 * grid.
 *
 * Recent-activity feed (right side on desktop, below grid on tablet):
 * last 20 events across all boxes.
 */

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  getLockboxBoard,
  upsertLockbox,
  deleteLockbox,
  markLockboxOpened,
  markLockboxClosed,
  setLockboxFault,
  type LockboxBoard,
  type LockboxBoardTile,
  type LockboxEventRow,
} from "@/app/actions/lockbox";
import { fmtDuration } from "@/lib/lockbox-config";

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

const POLL_MS = 5_000;

export default function AdminLockboxBoardPanel() {
  const [board, setBoard] = useState<LockboxBoard | null>(null);
  const [editing, setEditing] = useState<LockboxBoardTile | "new" | null>(null);
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const liveRef = useRef<HTMLParagraphElement>(null);

  function refresh() {
    void getLockboxBoard().then(setBoard).catch(() => undefined);
  }
  useEffect(() => {
    refresh();
    const handle = window.setInterval(refresh, POLL_MS);
    // Tick drives the live duration counters on each tile. Per-second
    // re-renders flooded the board (FPS audit, May 2026); 30 s is plenty
    // since tile copy is rendered as `2h 14m`-style minute-level deltas.
    const tickHandle = window.setInterval(() => setTick((t) => t + 1), 30_000);
    return () => { window.clearInterval(handle); window.clearInterval(tickHandle); };
  }, []);

  const drawerTile = useMemo(() => board?.tiles.find((t) => t.id === drawerId) ?? null, [board, drawerId]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Operations · Lockbox board
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>Lockbox live board</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Auto-refreshes every 5s. Click a tile to open / close / mark fault. Boxes open past their window light up red and fire an admin webhook.
        </p>
        <p ref={liveRef} className="sr-only" aria-live="polite">{board?.openCount ?? 0} open · {board?.overdueCount ?? 0} overdue</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Lockboxes" value={board?.tiles.length ?? 0} accent={T.blueDeep} />
        <Tile label="Open now" value={board?.openCount ?? 0} accent={T.blue} />
        <Tile label="Overdue" value={board?.overdueCount ?? 0} accent={(board?.overdueCount ?? 0) > 0 ? T.danger : T.success} />
        <button type="button" onClick={() => setEditing("new")} className="rounded-xl p-3 text-left" style={{ background: T.blue, color: "white", border: `1px solid ${T.blue}` }}>
          <p className="text-[9px] font-black uppercase tracking-[0.14em] opacity-80">New</p>
          <p className="mt-0.5 text-[18px] font-black">+ Add lockbox</p>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-3">
        <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          {!board ? (
            <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
          ) : board.tiles.length === 0 ? (
            <div className="rounded-xl px-4 py-10 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
              No lockboxes configured yet. Click <strong style={{ color: T.blue }}>+ Add lockbox</strong> to register your first.
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
              {board.tiles.map((t) => <BoxTile key={t.id} tile={t} tick={tick} onOpen={() => setDrawerId(t.id)} />)}
            </div>
          )}
        </div>

        <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>Recent activity</p>
          {!board ? (
            <p className="text-[11px]" style={{ color: T.inkFaint }}>Loading…</p>
          ) : board.recentEvents.length === 0 ? (
            <p className="text-[11px] italic" style={{ color: T.inkFaint }}>No events yet.</p>
          ) : (
            <ul className="space-y-1">
              {board.recentEvents.map((e) => <ActivityRow key={e.id} ev={e} />)}
            </ul>
          )}
        </div>
      </div>

      {editing && (
        <LockboxEditor row={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} />
      )}
      {drawerTile && (
        <LockboxInspector tile={drawerTile} tick={tick} onClose={() => setDrawerId(null)} onChanged={refresh} />
      )}
    </div>
  );
}

function BoxTile({ tile, tick, onOpen }: { tile: LockboxBoardTile; tick: number; onOpen: () => void }) {
  // Recompute the live elapsed seconds on every tick.
  const liveSeconds = useMemo(() => {
    if (tile.state !== "open" || !tile.openedAtIso) return null;
    return Math.floor((Date.now() - new Date(tile.openedAtIso).getTime()) / 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tile.openedAtIso, tile.state, tick]);

  const style = STATE_TILE[tile.state];
  const overdue = tile.isOverdue;
  const bg = !tile.isActive ? "#E5E7EB" : overdue ? "#FCA5A5" : style.bg;
  const fg = !tile.isActive ? "#6B7280" : overdue ? "#7F1D1D" : style.fg;
  const ring = !tile.isActive ? "#D1D5DB" : overdue ? "#DC2626" : style.ring;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="rounded-xl p-3 text-left transition-shadow hover:shadow-md cursor-pointer"
      style={{ background: bg, color: fg, border: `2px solid ${ring}`, minHeight: 120 }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[18px] font-black tracking-tight">{tile.label}</span>
        <span className="text-[18px]" aria-hidden>{style.emoji}</span>
      </div>
      <p className="text-[10px] font-black uppercase tracking-[0.14em] mt-1 opacity-80">
        {!tile.isActive ? "INACTIVE" : overdue ? "OVERDUE" : style.label}
      </p>
      {tile.state === "open" && liveSeconds != null && (
        <p className="text-[15px] font-black tabular-nums mt-1.5">
          {fmtDuration(liveSeconds)}
        </p>
      )}
      {tile.state === "open" && tile.openedByUserName && (
        <p className="text-[10.5px] mt-0.5 truncate">{tile.openedByUserName}</p>
      )}
      {tile.state === "open" && tile.openedReason && (
        <p className="text-[9.5px] opacity-75 truncate">{tile.openedReason}</p>
      )}
      {tile.state === "closed" && tile.lastClosedAtIso && (
        <p className="text-[9.5px] opacity-75 mt-1.5">last closed {new Date(tile.lastClosedAtIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
      )}
      {tile.location && (
        <p className="text-[9px] opacity-60 mt-0.5 truncate">{tile.location}</p>
      )}
    </button>
  );
}

const STATE_TILE: Record<string, { bg: string; fg: string; ring: string; label: string; emoji: string }> = {
  closed: { bg: "#D1FAE5", fg: "#065F46", ring: "#10B981", label: "CLOSED", emoji: "🔒" },
  open:   { bg: "#DBEAFE", fg: "#1E3A8A", ring: "#1976FF", label: "OPEN",   emoji: "🔓" },
  ajar:   { bg: "#FEF3C7", fg: "#92400E", ring: "#F59E0B", label: "AJAR",   emoji: "⚠️" },
  fault:  { bg: "#FEE2E2", fg: "#7F1D1D", ring: "#DC2626", label: "FAULT",  emoji: "🛠" },
};

function ActivityRow({ ev }: { ev: LockboxEventRow }) {
  const style = ev.kind === "opened" ? { c: T.blueDeep, t: "🔓 OPENED" }
    : ev.kind === "closed" ? { c: T.success, t: "🔒 CLOSED" }
    : ev.kind === "fault" ? { c: T.danger, t: "🛠 FAULT" }
    : { c: T.warning, t: "↺ MANUAL" };
  return (
    <li className="text-[10.5px] flex items-center gap-1.5 py-1" style={{ borderBottom: `1px solid ${T.border}` }}>
      <span className="font-black w-12 truncate" style={{ color: T.inkSoft }}>{ev.lockboxLabel}</span>
      <span className="font-black" style={{ color: style.c }}>{style.t}</span>
      {ev.userName && <span className="truncate flex-1" style={{ color: T.inkFaint }}>· {ev.userName}</span>}
      {ev.durationSec != null && <span className="tabular-nums" style={{ color: T.inkFaint }}>{fmtDuration(ev.durationSec)}</span>}
      <span className="ml-auto tabular-nums" style={{ color: T.inkFaint }}>
        {new Date(ev.recordedAtIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
      </span>
    </li>
  );
}

function LockboxInspector({ tile, tick, onClose, onChanged }: {
  tile: LockboxBoardTile;
  tick: number;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const liveSeconds = useMemo(() => {
    if (tile.state !== "open" || !tile.openedAtIso) return null;
    return Math.floor((Date.now() - new Date(tile.openedAtIso).getTime()) / 1000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tile.openedAtIso, tile.state, tick]);

  function open(reason: string) {
    setError(null);
    startTransition(async () => {
      const res = await markLockboxOpened({ id: tile.id, reason, expectedOpenSeconds: 5 * 60 });
      if (res.error) setError(res.error);
      else onChanged();
    });
  }
  function close() {
    setError(null);
    startTransition(async () => {
      const res = await markLockboxClosed({ id: tile.id, reason: "admin manual close" });
      if (res.error) setError(res.error);
      else onChanged();
    });
  }
  function fault(toggle: boolean) {
    setError(null);
    startTransition(async () => {
      const res = await setLockboxFault({ id: tile.id, isFault: toggle, reason: toggle ? "admin marked fault" : "admin cleared fault" });
      if (res.error) setError(res.error);
      else onChanged();
    });
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-3" style={{ background: "rgba(15,23,42,0.55)" }} onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh]" style={{ background: T.surface, border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>Lockbox · live</p>
            <h3 className="text-2xl font-black" style={{ color: T.ink }}>{tile.label}</h3>
            {tile.location && <p className="text-[11px]" style={{ color: T.inkFaint }}>{tile.location}</p>}
          </div>
          <button type="button" onClick={onClose} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-black hover:bg-[#F4F5F7]" style={{ color: T.inkSoft }}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <div className="rounded-xl p-3" style={{ background: STATE_TILE[tile.state].bg, color: STATE_TILE[tile.state].fg, border: `2px solid ${STATE_TILE[tile.state].ring}` }}>
            <p className="text-[11px] font-black uppercase tracking-[0.16em]">{STATE_TILE[tile.state].emoji} {tile.isOverdue ? "OPEN · OVERDUE" : STATE_TILE[tile.state].label}</p>
            {tile.state === "open" && liveSeconds != null && (
              <p className="text-[28px] font-black tabular-nums mt-1">{fmtDuration(liveSeconds)}</p>
            )}
            {tile.state === "open" && tile.openedByUserName && (
              <p className="text-[12px] mt-1">Opened by <strong>{tile.openedByUserName}</strong></p>
            )}
            {tile.state === "open" && tile.openedReason && (
              <p className="text-[11px] opacity-80">Reason: {tile.openedReason}</p>
            )}
            {tile.state === "open" && tile.expectedCloseByIso && (
              <p className="text-[11px] opacity-80">Should close by {new Date(tile.expectedCloseByIso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
            )}
            {tile.state === "closed" && tile.lastClosedAtIso && (
              <p className="text-[11px] mt-1">Last closed {new Date(tile.lastClosedAtIso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
            )}
          </div>

          {tile.state === "closed" ? (
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={pending || !tile.isActive} onClick={() => open("admin_manual")} className="text-[12.5px] font-black px-3 py-2.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
                🔓 Open · admin
              </button>
              <button type="button" disabled={pending || !tile.isActive} onClick={() => open("service")} className="text-[12.5px] font-black px-3 py-2.5 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                🛠 Service open
              </button>
            </div>
          ) : tile.state === "open" || tile.state === "ajar" ? (
            <button type="button" disabled={pending} onClick={close} className="w-full text-[13px] font-black px-3 py-3 rounded-lg text-white disabled:opacity-50" style={{ background: T.success }}>
              🔒 Mark closed
            </button>
          ) : null}

          {tile.state === "fault" ? (
            <button type="button" disabled={pending} onClick={() => fault(false)} className="w-full text-[12.5px] font-black px-3 py-2 rounded-lg" style={{ background: T.success, color: "white" }}>
              ✓ Clear fault
            </button>
          ) : (
            <button type="button" disabled={pending || !tile.isActive} onClick={() => fault(true)} className="w-full text-[11.5px] font-bold px-3 py-1.5 rounded-md" style={{ background: "rgba(239,68,68,0.06)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.30)" }}>
              🛠 Mark fault
            </button>
          )}

          {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

          {tile.notes && (
            <div className="rounded-lg p-2.5 text-[11px] italic" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
              📝 {tile.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LockboxEditor({ row, onClose, onSaved }: {
  row: LockboxBoardTile | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [label, setLabel] = useState(row?.label ?? "");
  const [location, setLocation] = useState(row?.location ?? "");
  const [serial, setSerial] = useState("");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [isActive, setIsActive] = useState(row?.isActive ?? true);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSave() {
    setError(null);
    startTransition(async () => {
      const res = await upsertLockbox({
        id: row?.id, label, location: location.trim() || undefined,
        serial: serial.trim() || undefined,
        notes: notes.trim() || undefined,
        isActive,
      });
      if (res.error) { setError(res.error); return; }
      onSaved();
    });
  }
  function onDelete() {
    if (!row) return;
    if (!confirm(`Delete lockbox "${row.label}"? Event history will also be deleted.`)) return;
    startTransition(async () => {
      const res = await deleteLockbox({ id: row.id });
      if (res.error) { setError(res.error); return; }
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl flex flex-col" style={{ background: T.surface, border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>{row ? "Edit lockbox" : "New lockbox"}</p>
          <h3 className="text-lg font-black" style={{ color: T.ink }}>{row?.label ?? "Register a lockbox"}</h3>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Label *</label>
            <input value={label} onChange={(e) => setLabel(e.target.value)} maxLength={40} placeholder="Box 14" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Location</label>
            <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={120} placeholder="Front room east wall, top row" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Serial / model</label>
            <input value={serial} onChange={(e) => setSerial(e.target.value)} maxLength={80} placeholder="MASTER-1875D-S/N-XXXXX" className="mt-1 w-full px-3 py-2 rounded-lg text-[13px] font-mono" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={300} className="mt-1 w-full px-3 py-2 rounded-lg text-[12.5px] resize-none" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <label className="text-[11.5px] font-bold flex items-center gap-2 cursor-pointer" style={{ color: T.inkSoft }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
            Active (show on the live board)
          </label>
          {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}
        </div>
        <div className="px-5 py-3 flex items-center justify-between gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
          {row ? (
            <button type="button" onClick={onDelete} disabled={pending} className="text-[10.5px] font-bold px-2 py-1 rounded disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
              Delete
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="text-[11.5px] font-bold px-3 py-2 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>Cancel</button>
            <button type="button" onClick={onSave} disabled={pending} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
              {pending ? "Saving…" : row ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number; accent: string }) {
  return (
    <div className="rounded-xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="mt-0.5 text-[22px] font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}
