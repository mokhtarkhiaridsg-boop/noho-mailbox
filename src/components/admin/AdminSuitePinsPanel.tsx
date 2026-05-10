"use client";

/**
 * iter-182 — Per-mailbox sticky pin notes admin panel.
 *
 * Distinct from iter-120 PinnedNotes (per-customer). Pins are keyed
 * on suite # and surface on every iter-83 intake for that suite.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listSuitePinNotes,
  upsertSuitePinNote,
  dismissSuitePinNote,
  deleteSuitePinNote,
  getSuitePinCounts,
  type SuitePinNoteRow,
} from "@/app/actions/suitePinNotes";

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

const COLOR_META: Record<string, { bg: string; fg: string; border: string; label: string }> = {
  amber: { bg: "#FEF3C7", fg: "#92400E", border: "#F59E0B", label: "🟡 Standard" },
  red:   { bg: "#FEE2E2", fg: "#991B1B", border: "#DC2626", label: "🔴 Urgent" },
  blue:  { bg: "#DBEAFE", fg: "#1E3A8A", border: "#1976FF", label: "🔵 Info" },
  green: { bg: "#D1FAE5", fg: "#065F46", border: "#16A34A", label: "🟢 Resolved" },
};

export default function AdminSuitePinsPanel() {
  const [rows, setRows] = useState<SuitePinNoteRow[] | null>(null);
  const [counts, setCounts] = useState<Awaited<ReturnType<typeof getSuitePinCounts>> | null>(null);
  const [filterSuite, setFilterSuite] = useState("");
  const [activeOnly, setActiveOnly] = useState(true);
  const [editing, setEditing] = useState<SuitePinNoteRow | "new" | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    void listSuitePinNotes({ suiteNumber: filterSuite.trim() || undefined, activeOnly }).then(setRows).catch(() => setRows([]));
    void getSuitePinCounts().then(setCounts).catch(() => undefined);
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [filterSuite, activeOnly]);

  function onDismiss(r: SuitePinNoteRow) {
    if (!confirm(`Dismiss this pin for suite #${r.suiteNumber}?`)) return;
    startTransition(async () => {
      const res = await dismissSuitePinNote({ id: r.id });
      if (res.error) setError(res.error);
      else refresh();
    });
  }
  function onDelete(r: SuitePinNoteRow) {
    if (!confirm(`Permanently delete this pin? Audit log keeps a record.`)) return;
    startTransition(async () => {
      const res = await deleteSuitePinNote({ id: r.id });
      if (res.error) setError(res.error);
      else refresh();
    });
  }

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
          Suite Pins
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
          sticky notes at the counter
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {counts?.activePins ?? 0} active · {counts?.activeSuites ?? 0} suites
        </span>
      </div>
      <div>
        <p className="text-[11px]" style={{ color: T.inkFaint }}>
          Pin a quick note to a suite #. It shows up on every iter-83 intake and pickup involving that suite, so counter staff never miss "hold for K. on Tues" or "verify ID before release".
        </p>
      </div>

      {counts && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <Tile label="Active pins" value={counts.activePins} accent={T.warning} />
          <Tile label="Suites pinned" value={counts.activeSuites} accent={T.blue} />
          <Tile label="Expiring 7d" value={counts.expiringSoon} accent={counts.expiringSoon > 0 ? T.danger : T.success} />
        </div>
      )}

      <div className="flex items-center gap-2 flex-wrap">
        <input value={filterSuite} onChange={(e) => setFilterSuite(e.target.value)} placeholder="Filter by suite # (e.g. 042)" className="text-[12px] px-3 py-1.5 rounded-lg font-mono" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink, width: 220 }} />
        <label className="text-[11px] font-bold flex items-center gap-1.5 cursor-pointer" style={{ color: T.inkSoft }}>
          <input type="checkbox" checked={activeOnly} onChange={(e) => setActiveOnly(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
          Active only
        </label>
        <button type="button" onClick={() => setEditing("new")} className="ml-auto text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white" style={{ background: T.blue }}>
          + Pin a note
        </button>
      </div>

      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      {rows == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No pins {filterSuite ? `for suite #${filterSuite}` : ""} match this filter.
        </div>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
          {rows.map((r) => {
            const c = COLOR_META[r.color] ?? COLOR_META.amber!;
            const isExpired = !!r.expiresAtIso && new Date(r.expiresAtIso) < new Date();
            const isDismissed = !!r.dismissedAtIso;
            return (
              <li key={r.id} className="rounded-2xl p-3 relative" style={{
                background: c.bg, border: `2px solid ${c.border}`,
                opacity: isDismissed || isExpired ? 0.55 : 1,
                boxShadow: "0 4px 12px rgba(0,0,0,0.06), 2px 2px 0 0 rgba(0,0,0,0.06)",
                transform: "rotate(-0.25deg)",
              }}>
                <div className="flex items-start justify-between gap-2">
                  <p className="text-[15px] font-black tabular-nums" style={{ color: c.fg }}>
                    📌 #{r.suiteNumber}
                  </p>
                  <div className="flex items-center gap-1">
                    {isDismissed && <span className="text-[9px] font-black px-1 py-0.5 rounded uppercase" style={{ background: "rgba(120,113,108,0.18)", color: "#57534e" }}>DISMISSED</span>}
                    {isExpired && <span className="text-[9px] font-black px-1 py-0.5 rounded uppercase" style={{ background: "rgba(120,113,108,0.18)", color: "#57534e" }}>EXPIRED</span>}
                  </div>
                </div>
                <p className="text-[12.5px] mt-1.5 whitespace-pre-wrap" style={{ color: c.fg, lineHeight: 1.4 }}>
                  {r.body}
                </p>
                <div className="mt-2 text-[9.5px] flex items-center gap-1.5 flex-wrap" style={{ color: c.fg, opacity: 0.75 }}>
                  {r.createdByName && <span>by {r.createdByName}</span>}
                  <span>· {fmtRel(r.createdAtIso)}</span>
                  {r.expiresAtIso && !isExpired && <span>· expires {new Date(r.expiresAtIso).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                  {isDismissed && r.dismissedByName && <span>· dismissed by {r.dismissedByName}</span>}
                </div>
                <div className="mt-2 flex gap-1">
                  <button type="button" onClick={() => setEditing(r)} disabled={busy} className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: "white", color: c.fg, border: `1px solid ${c.border}50` }}>
                    Edit
                  </button>
                  {!isDismissed && (
                    <button type="button" onClick={() => onDismiss(r)} disabled={busy} className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: "white", color: c.fg, border: `1px solid ${c.border}50` }}>
                      Dismiss
                    </button>
                  )}
                  <button type="button" onClick={() => onDelete(r)} disabled={busy} className="text-[10px] font-bold px-2 py-0.5 rounded-md" style={{ background: "rgba(239,68,68,0.10)", color: "#991B1B", border: `1px solid rgba(239,68,68,0.40)` }}>
                    ×
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {editing && (
        <Editor row={editing === "new" ? null : editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); refresh(); }} initialSuite={filterSuite.trim() || undefined} />
      )}
    </div>
  );
}

function Editor({ row, onClose, onSaved, initialSuite }: { row: SuitePinNoteRow | null; onClose: () => void; onSaved: () => void; initialSuite?: string }) {
  const [suiteNumber, setSuiteNumber] = useState(row?.suiteNumber ?? initialSuite ?? "");
  const [body, setBody] = useState(row?.body ?? "");
  const [color, setColor] = useState<string>(row?.color ?? "amber");
  const [expiresAt, setExpiresAt] = useState(row?.expiresAtIso ? row.expiresAtIso.slice(0, 10) : "");
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSave() {
    setError(null);
    startTransition(async () => {
      const res = await upsertSuitePinNote({
        id: row?.id, suiteNumber, body,
        color: color as "amber" | "red" | "blue" | "green",
        expiresAt: expiresAt || null,
      });
      if (res.error) { setError(res.error); return; }
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={onClose}>
      <div className="relative w-full max-w-md rounded-2xl flex flex-col" style={{ background: T.surface, border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>{row ? "Edit pin" : "New pin"}</p>
          <h3 className="text-lg font-black" style={{ color: T.ink }}>{row ? `Suite #${row.suiteNumber}` : "Pin a suite note"}</h3>
        </div>
        <div className="p-5 space-y-3">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Suite # *</label>
            <input value={suiteNumber} onChange={(e) => setSuiteNumber(e.target.value)} maxLength={12} placeholder="042" className="mt-1 w-full px-3 py-2 rounded-lg text-[14px] font-mono" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Note *</label>
            <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} maxLength={500} placeholder="Hold rent check for K. on Tues — they'll pick up in person." className="mt-1 w-full px-3 py-2 rounded-lg text-[12.5px] resize-none" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            <p className="text-[10px] mt-0.5 text-right" style={{ color: T.inkFaint }}>{body.length}/500</p>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Urgency</label>
            <div className="mt-1 flex gap-1.5 flex-wrap">
              {Object.entries(COLOR_META).map(([k, m]) => (
                <button key={k} type="button" onClick={() => setColor(k)} className="text-[11px] font-bold px-2.5 py-1 rounded-full" style={{
                  background: color === k ? m.border : "white",
                  color: color === k ? "white" : m.fg,
                  border: `1px solid ${m.border}`,
                }}>
                  {m.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Expires (optional)</label>
            <input type="date" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-[13px]" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            <p className="text-[10px] mt-0.5" style={{ color: T.inkFaint }}>Leave blank for no expiration. Use for time-bounded notes ("hold until next Tues").</p>
          </div>
          {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}
        </div>
        <div className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
          <button type="button" onClick={onClose} className="text-[11.5px] font-bold px-3 py-2 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>Cancel</button>
          <button type="button" onClick={onSave} disabled={busy} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
            {busy ? "Saving…" : row ? "Save" : "Pin it"}
          </button>
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

function fmtRel(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
