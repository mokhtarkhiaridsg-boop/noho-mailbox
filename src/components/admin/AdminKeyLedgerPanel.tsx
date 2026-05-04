"use client";

// iter-95 — Mailbox-key audit ledger panel.
//
// Inventory grid (every physical key on file) + click-to-expand history
// drawer per key. CSV export. Status filter chips. Designed for
// compliance audits — every issue/return/loss is tied to an actor
// timestamp + customer.

import { useEffect, useMemo, useState, useTransition } from "react";
import { getKeyInventoryWithLastEvent, getKeyHistory, type KeyInventoryRow } from "@/app/actions/keyLedger";
import { toCsv, downloadCsv, dateStampedName } from "@/lib/csv";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

const STATUS_STYLES: Record<string, { bg: string; fg: string }> = {
  InStock:  { bg: "rgba(22,163,74,0.10)",  fg: "#15803d" },
  Issued:   { bg: "rgba(245,166,35,0.14)", fg: "#92400e" },
  Returned: { bg: "rgba(45,16,15,0.06)",   fg: "rgba(45,16,15,0.55)" },
  Lost:     { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b" },
  Retired:  { bg: "rgba(45,16,15,0.06)",   fg: "rgba(45,16,15,0.45)" },
};

function humanizeAction(action: string): string {
  if (action === "key.add")     return "Added to inventory";
  if (action === "key.issue")   return "Issued to customer";
  if (action === "key.return")  return "Returned to inventory";
  if (action === "key.lost")    return "Marked LOST";
  if (action === "key.retire")  return "Retired";
  if (action === "key.reissue") return "Re-issued (replacement)";
  return action;
}

export default function AdminKeyLedgerPanel() {
  const [rows, setRows] = useState<KeyInventoryRow[] | null>(null);
  const [filter, setFilter] = useState<string>("ALL");
  const [openKeyId, setOpenKeyId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    void getKeyInventoryWithLastEvent().then(setRows).catch(() => setRows([]));
  }
  useEffect(() => { refresh(); }, []);

  const counts = useMemo(() => {
    if (!rows) return { total: 0, byStatus: {} as Record<string, number> };
    const byStatus: Record<string, number> = {};
    for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;
    return { total: rows.length, byStatus };
  }, [rows]);

  const visible = useMemo(() => {
    if (!rows) return [];
    if (filter === "ALL") return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  function exportCsv() {
    if (!rows) return;
    const csv = toCsv(
      rows.map((r) => ({
        KeyTag: r.keyTag,
        Suite: r.suiteNumber,
        Status: r.status,
        IssuedTo: r.issuedToName ?? "",
        IssuedAt: r.issuedAtIso ?? "",
        ReturnedAt: r.returnedAtIso ?? "",
        AddedAt: r.createdAtIso,
        LastAction: r.lastAction ?? "",
        LastActionAt: r.lastActionAtIso ?? "",
        Notes: r.notes ?? "",
      })),
      { headers: ["KeyTag", "Suite", "Status", "IssuedTo", "IssuedAt", "ReturnedAt", "AddedAt", "LastAction", "LastActionAt", "Notes"] },
    );
    downloadCsv(dateStampedName("noho-key-ledger"), csv);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
            Operations · Key audit ledger
          </p>
          <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Mailbox key audit ledger</h2>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
            Every physical key on file with full audit trail. Click any row for the per-key history. Export to CSV for end-of-quarter compliance review.
          </p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          className="px-3 py-2 rounded-xl text-[11px] font-bold border self-center"
          style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
          title="Download the entire key inventory as CSV"
        >
          Export CSV
        </button>
      </div>

      {/* Status filter chips */}
      <div className="flex items-center gap-1.5 flex-wrap">
        {(["ALL", "InStock", "Issued", "Returned", "Lost", "Retired"] as const).map((s) => {
          const active = filter === s;
          const n = s === "ALL" ? counts.total : (counts.byStatus[s] ?? 0);
          const stl = s === "ALL" ? { bg: "rgba(45,16,15,0.06)", fg: NOHO_INK } : STATUS_STYLES[s] ?? { bg: "rgba(45,16,15,0.06)", fg: NOHO_INK };
          return (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className="text-[10.5px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-full"
              style={{
                background: active ? NOHO_BLUE : stl.bg,
                color: active ? "white" : stl.fg,
              }}
            >
              {s} · {n}
            </button>
          );
        })}
      </div>

      {/* Inventory table */}
      {rows === null ? (
        <p className="text-sm" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
      ) : visible.length === 0 ? (
        <div className="rounded-md border border-dashed p-5 text-center" style={{ borderColor: "rgba(45,16,15,0.25)", color: "rgba(45,16,15,0.55)" }}>
          No keys match the current filter.
        </div>
      ) : (
        <div className="rounded-md bg-white overflow-hidden" style={{ border: "1px solid #E5DACA" }}>
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead>
                <tr style={{ color: "rgba(45,16,15,0.55)" }}>
                  <th className="text-left px-3 py-2 font-black text-[10px] uppercase tracking-wider">Key</th>
                  <th className="text-left px-3 py-2 font-black text-[10px] uppercase tracking-wider">Suite</th>
                  <th className="text-left px-3 py-2 font-black text-[10px] uppercase tracking-wider">Status</th>
                  <th className="text-left px-3 py-2 font-black text-[10px] uppercase tracking-wider">Issued to</th>
                  <th className="text-left px-3 py-2 font-black text-[10px] uppercase tracking-wider">Last event</th>
                  <th className="text-right px-3 py-2 font-black text-[10px] uppercase tracking-wider"></th>
                </tr>
              </thead>
              <tbody>
                {visible.map((r) => {
                  const stl = STATUS_STYLES[r.status] ?? { bg: "rgba(45,16,15,0.06)", fg: NOHO_INK };
                  return (
                    <tr key={r.id} style={{ borderTop: "1px solid #e8e5e0" }}>
                      <td className="px-3 py-2">
                        <span className="font-mono text-[12.5px] font-black" style={{ color: NOHO_INK }}>{r.keyTag}</span>
                      </td>
                      <td className="px-3 py-2 text-[12px] font-bold" style={{ color: NOHO_INK }}>
                        #{r.suiteNumber}
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: stl.bg, color: stl.fg }}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-[11.5px]" style={{ color: "rgba(45,16,15,0.65)" }}>
                        {r.issuedToName ?? <span style={{ color: "rgba(45,16,15,0.40)" }}>—</span>}
                        {r.issuedAtIso && (
                          <span style={{ marginLeft: 6, color: "rgba(45,16,15,0.40)" }}>
                            · {new Date(r.issuedAtIso).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-[11.5px]" style={{ color: "rgba(45,16,15,0.65)" }}>
                        {r.lastAction ? humanizeAction(r.lastAction) : <span style={{ color: "rgba(45,16,15,0.40)" }}>—</span>}
                        {r.lastActionAtIso && (
                          <span style={{ marginLeft: 6, color: "rgba(45,16,15,0.40)" }}>
                            · {new Date(r.lastActionAtIso).toLocaleDateString()}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => setOpenKeyId(r.id)}
                          className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold border"
                          style={{ borderColor: NOHO_BLUE, color: NOHO_BLUE_DEEP, background: "white" }}
                        >
                          History →
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Per-key history drawer */}
      {openKeyId && (
        <KeyHistoryDrawer keyId={openKeyId} onClose={() => setOpenKeyId(null)} />
      )}
    </div>
  );
}

function KeyHistoryDrawer({ keyId, onClose }: { keyId: string; onClose: () => void }) {
  const [data, setData] = useState<Awaited<ReturnType<typeof getKeyHistory>> | null>(null);

  useEffect(() => {
    void getKeyHistory(keyId).then(setData).catch(() => setData({ key: null, events: [] }));
  }, [keyId]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background: "rgba(45,16,15,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl rounded-md bg-white max-h-[85vh] overflow-hidden flex flex-col"
        style={{ border: "1px solid #E5DACA", boxShadow: "0 12px 36px rgba(26,23,20,0.18)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 py-4 border-b flex items-center justify-between gap-3" style={{ borderColor: "#e8e5e0" }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: NOHO_BLUE_DEEP }}>
              Key history
            </p>
            <p className="text-base font-black mt-0.5 font-mono" style={{ color: NOHO_INK }}>
              {data?.key?.keyTag ?? keyId.slice(0, 8)}
            </p>
            {data?.key && (
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                Suite #{data.key.suiteNumber} · current status <strong style={{ color: NOHO_INK }}>{data.key.status}</strong>
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="text-xs font-bold rounded-lg px-2 py-1 border" style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }} aria-label="Close">×</button>
        </div>

        <div className="overflow-y-auto p-5 flex-1">
          {!data ? (
            <p className="text-[12px]" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
          ) : data.events.length === 0 ? (
            <p className="text-[12px]" style={{ color: "rgba(45,16,15,0.55)" }}>No audit events on file for this key.</p>
          ) : (
            <ol className="space-y-3">
              {data.events.map((e, i) => {
                const meta = (() => {
                  if (!e.metadata) return null;
                  try { return JSON.parse(e.metadata) as Record<string, unknown>; } catch { return null; }
                })();
                return (
                  <li key={e.id} className="rounded-xl border p-3" style={{ borderColor: "#e8e5e0", background: i === 0 ? "rgba(51,116,133,0.04)" : "white" }}>
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[12.5px] font-black" style={{ color: NOHO_INK }}>
                        {humanizeAction(e.action)}
                      </p>
                      <span className="text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>
                        {new Date(e.createdAtIso).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[10.5px] mt-1" style={{ color: "rgba(45,16,15,0.55)" }}>
                      Actor: <strong style={{ color: NOHO_INK }}>{e.actorName ?? e.actorId.slice(0, 8)}</strong>
                      <span style={{ marginLeft: 6 }}>· {e.actorRole}</span>
                    </p>
                    {meta && (
                      <pre className="text-[10px] font-mono mt-1.5 whitespace-pre-wrap p-2 rounded" style={{ background: "rgba(45,16,15,0.04)", color: "rgba(45,16,15,0.65)" }}>
                        {JSON.stringify(meta, null, 2)}
                      </pre>
                    )}
                  </li>
                );
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}
