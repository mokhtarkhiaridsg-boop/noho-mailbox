"use client";

/**
 * iter-221 — Admin bureau-junk-blocklist panel (Tier 16 #130).
 *
 * Lists the crowdsourced + manual blocklist with per-row evidence
 * count + remove action + manual-add form.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listBureauJunkSenders,
  adminAddBureauJunkSender,
  adminRemoveBureauJunkSender,
  type BureauJunkSenderRow,
} from "@/app/actions/bureauJunkSenders";

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

const STATUS_FILTERS: Array<{ id: "all" | BureauJunkSenderRow["status"]; label: string }> = [
  { id: "Active", label: "Active" },
  { id: "Removed", label: "Removed" },
  { id: "all", label: "All" },
];

export default function AdminBureauJunkPanel() {
  const [filter, setFilter] = useState<"all" | BureauJunkSenderRow["status"]>("Active");
  const [rows, setRows] = useState<BureauJunkSenderRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newSender, setNewSender] = useState("");
  const [newNotes, setNewNotes] = useState("");

  function refresh() {
    void listBureauJunkSenders({ status: filter === "all" ? undefined : filter, limit: 200 }).then(setRows).catch(() => setRows([]));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [filter]);

  function onAdd() {
    if (!newSender.trim()) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await adminAddBureauJunkSender({ senderRaw: newSender, notes: newNotes.trim() || undefined });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Added "${res.row?.displayName}"`); setNewSender(""); setNewNotes(""); refresh(); }
    });
  }
  function onRemove(r: BureauJunkSenderRow) {
    const reason = prompt(`Remove "${r.displayName}" from the blocklist? Reason (optional):`);
    if (reason === null) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await adminRemoveBureauJunkSender({ id: r.id, reason: reason.trim() || undefined });
      if (res.error) setError(res.error); else { setInfo(`Removed "${r.displayName}"`); refresh(); }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Marketing · Crowdsourced junk
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>Bureau-wide junk blocklist</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Senders that ≥10 unique members have flagged as junk auto-promote here. Members opted into shared learning (default on) can have inbound mail from these senders auto-blocked. Use the manual add for known scammers / mass mailers you want to block proactively.
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}

      <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>+ Add sender to blocklist (manual)</p>
        <div className="flex flex-wrap gap-2 items-center">
          <input value={newSender} onChange={(e) => setNewSender(e.target.value)}
            placeholder="Sender name or substring (e.g. 'Resident at')"
            className="flex-1 min-w-[260px] px-3 py-1.5 rounded-lg text-[12.5px]"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          <input value={newNotes} onChange={(e) => setNewNotes(e.target.value)}
            placeholder="Notes (optional)"
            className="px-3 py-1.5 rounded-lg text-[12px] w-44"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          <button type="button" onClick={onAdd} disabled={busy || !newSender.trim()}
            className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
            {busy ? "Adding…" : "Add"}
          </button>
        </div>
      </div>

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
          No senders in this view. The cron sweep promotes after ≥10 unique reporters.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black uppercase tracking-[0.10em] inline-block px-1.5 py-0.5 rounded"
                      style={{
                        background: r.status === "Active" ? "rgba(239,68,68,0.10)" : "rgba(122,130,144,0.10)",
                        color: r.status === "Active" ? T.danger : T.inkSoft,
                      }}>
                      🚫 {r.status}
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft }}>{r.source}</span>
                    {r.evidenceCount > 0 && (
                      <span className="text-[10.5px] font-mono font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(245,158,11,0.10)", color: "#92400e" }}>
                        {r.evidenceCount} reporters
                      </span>
                    )}
                  </div>
                  <p className="text-[12.5px] font-black mt-1" style={{ color: T.ink }}>{r.displayName}</p>
                  <p className="text-[10.5px]" style={{ color: T.inkFaint }}>
                    Added {new Date(r.addedAtIso).toLocaleDateString()}
                    {r.lastReportedAtIso && <span> · last reported {new Date(r.lastReportedAtIso).toLocaleDateString()}</span>}
                  </p>
                  {r.notes && <p className="text-[10px] italic mt-0.5" style={{ color: T.inkFaint }}>📝 {r.notes}</p>}
                  {r.removedReason && <p className="text-[10px] italic mt-0.5" style={{ color: T.danger }}>Removed: {r.removedReason}</p>}
                </div>
                {r.status === "Active" && (
                  <button type="button" onClick={() => onRemove(r)} disabled={busy}
                    className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50 shrink-0"
                    style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
