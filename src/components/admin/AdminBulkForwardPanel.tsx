"use client";

// iter-127 — Bulk forward batch admin panel.
//
// Pending forward queue with multi-select + per-row address picker +
// "Process N forwards" button. Selected rows show their target address
// inline; the process action atomically flips each MailItem to
// Forwarded + closes its MailRequest + audit-logs. Failures surface
// per-row so admin can retry just the broken ones.

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  listPendingForwardBatch,
  processBulkForward,
  type ForwardQueueRow,
} from "@/app/actions/bulkForward";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

export default function AdminBulkForwardPanel() {
  const [data, setData] = useState<{ rows: ForwardQueueRow[]; count: number } | null>(null);
  const [pending, startTransition] = useTransition();
  // Selected request IDs + chosen address ID per row.
  const [selected, setSelected] = useState<Map<string, string | null>>(new Map());
  const [adminNote, setAdminNote] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [failures, setFailures] = useState<Map<string, string>>(new Map());

  function refresh() {
    void listPendingForwardBatch().then((r) => {
      setData(r);
      // Auto-select all + default each to its first address.
      setSelected((prev) => {
        const next = new Map(prev);
        for (const row of r.rows) {
          if (!next.has(row.requestId)) {
            next.set(row.requestId, row.addresses[0]?.id ?? null);
          }
        }
        return next;
      });
    }).catch(() => setData({ rows: [], count: 0 }));
  }
  useEffect(() => { refresh(); }, []);

  function toggleRow(requestId: string, defaultAddressId: string | null) {
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(requestId)) next.delete(requestId);
      else next.set(requestId, defaultAddressId);
      return next;
    });
  }

  function setAddress(requestId: string, addressId: string | null) {
    setSelected((prev) => {
      const next = new Map(prev);
      next.set(requestId, addressId);
      return next;
    });
  }

  function selectAll() {
    if (!data) return;
    setSelected((prev) => {
      const next = new Map(prev);
      for (const r of data.rows) {
        if (!next.has(r.requestId)) next.set(r.requestId, r.addresses[0]?.id ?? null);
      }
      return next;
    });
  }
  function clearSelection() { setSelected(new Map()); }

  async function process() {
    if (selected.size === 0) { setMsg("Select at least one row"); return; }
    setMsg(null);
    setFailures(new Map());
    startTransition(async () => {
      const items = Array.from(selected.entries()).map(([requestId, addressId]) => ({ requestId, addressId }));
      const res = await processBulkForward({ items, adminNote: adminNote || null });
      setMsg(`✓ Processed ${res.succeeded}/${items.length} · ${res.failed} failed`);
      setFailures(new Map(res.failures.map((f) => [f.requestId, f.reason])));
      // Drop succeeded ones from selection.
      const failedIds = new Set(res.failures.map((f) => f.requestId));
      setSelected((prev) => {
        const next = new Map<string, string | null>();
        for (const [id, addr] of prev) if (failedIds.has(id)) next.set(id, addr);
        return next;
      });
      refresh();
    });
  }

  const visibleAddressTargets = useMemo(() => {
    if (!data) return new Map<string, string>();
    const m = new Map<string, string>();
    for (const row of data.rows) {
      const aId = selected.get(row.requestId);
      const a = row.addresses.find((x) => x.id === aId);
      if (a) m.set(row.requestId, `${a.label} · ${a.address.slice(0, 36)}${a.address.length > 36 ? "…" : ""}`);
    }
    return m;
  }, [data, selected]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          Operations · Bulk forward
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Bulk forward batch</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          Process multiple Forward requests in one shot. Pick the destination per row, hit Process — each item flips atomically + audit-logged. Failures stay selected so you can retry just the broken ones.
        </p>
      </div>

      {msg && (
        <div className="rounded-xl px-3 py-2 text-[11.5px] font-bold"
          style={{
            background: msg.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: msg.startsWith("✓") ? "#15803d" : "#991b1b",
          }}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Tile label="Pending forwards" value={data?.count ?? 0} accent={(data?.count ?? 0) > 0 ? "#92400e" : "#15803d"} />
        <Tile label="Selected" value={selected.size} accent={NOHO_BLUE_DEEP} />
        <Tile label="Failed last run" value={failures.size} accent={failures.size > 0 ? "#991b1b" : "#15803d"} />
        <Tile label="Action" value={selected.size > 0 ? "Ready" : "Pick rows"} accent={NOHO_INK} />
      </div>

      {/* Toolbar */}
      <div className="rounded-2xl bg-white border p-3 flex items-center gap-2 flex-wrap" style={{ borderColor: "#e8e5e0" }}>
        <button type="button" onClick={selectAll} disabled={pending || !data || data.rows.length === 0}
          className="px-3 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50"
          style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
          Select all ({data?.rows.length ?? 0})
        </button>
        <button type="button" onClick={clearSelection} disabled={pending || selected.size === 0}
          className="px-3 py-1.5 rounded-md text-[11px] font-bold border disabled:opacity-50"
          style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
          Clear
        </button>
        <input
          value={adminNote}
          onChange={(e) => setAdminNote(e.target.value)}
          placeholder="Optional admin note (audited per item)"
          className="flex-1 min-w-[160px] rounded-md border px-3 py-1.5 text-[12px]"
          style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }}
        />
        <button type="button" onClick={process} disabled={pending || selected.size === 0}
          className="px-4 py-1.5 rounded-md text-white text-[12px] font-black disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}>
          {pending ? "Processing…" : `Process ${selected.size} forward${selected.size === 1 ? "" : "s"}`}
        </button>
      </div>

      {/* Queue table */}
      <div className="rounded-2xl bg-white border" style={{ borderColor: "#e8e5e0" }}>
        {!data ? (
          <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading queue…</p>
        ) : data.rows.length === 0 ? (
          <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>
            No pending forward requests — caught up. ✓
          </p>
        ) : (
          <ul>
            {data.rows.map((row, i) => {
              const isSelected = selected.has(row.requestId);
              const failureReason = failures.get(row.requestId);
              return (
                <li key={row.requestId}
                  className="px-3 py-3"
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid #e8e5e0",
                    background: isSelected ? "rgba(51,116,133,0.04)" : failureReason ? "rgba(231,0,19,0.04)" : "white",
                  }}>
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleRow(row.requestId, row.addresses[0]?.id ?? null)}
                      className="mt-1.5"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-black truncate" style={{ color: NOHO_INK }}>
                        {row.customerName}
                        {row.suiteNumber && (
                          <span className="ml-1 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                            #{row.suiteNumber}
                          </span>
                        )}
                        {failureReason && (
                          <span className="ml-1.5 text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
                            style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>
                            ⚠️ {failureReason}
                          </span>
                        )}
                      </p>
                      <p className="text-[10.5px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                        {row.fromSender} · {row.carrier ?? "Pkg"} {row.trackingNumber ?? ""} · intake {row.intakeDate}
                        {row.notes && <span className="ml-1 italic">"{row.notes}"</span>}
                      </p>
                      {/* Address picker */}
                      {isSelected && (
                        <div className="mt-2">
                          {row.addresses.length === 0 ? (
                            <p className="text-[11px] italic" style={{ color: "#991b1b" }}>
                              ⚠️ No forwarding address on file — customer must add one before this can ship.
                            </p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {row.addresses.map((a) => {
                                const active = selected.get(row.requestId) === a.id;
                                return (
                                  <button key={a.id} type="button"
                                    onClick={() => setAddress(row.requestId, a.id)}
                                    className="px-2.5 py-1 rounded-md text-[10.5px] font-bold text-left max-w-[300px]"
                                    style={{
                                      background: active ? NOHO_BLUE : "white",
                                      color: active ? "white" : NOHO_INK,
                                      border: `1px solid ${active ? NOHO_BLUE : "#e8e5e0"}`,
                                    }}>
                                    <span className="font-black">{a.label}</span>
                                    <span className="opacity-80 ml-1.5 truncate inline-block max-w-[220px] align-bottom">
                                      {a.address.slice(0, 60)}{a.address.length > 60 ? "…" : ""}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                      {!isSelected && visibleAddressTargets.has(row.requestId) && (
                        <p className="text-[10px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                          → {visibleAddressTargets.get(row.requestId)}
                        </p>
                      )}
                    </div>
                    {row.exteriorImageUrl && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={row.exteriorImageUrl} alt="" className="w-12 h-12 rounded shrink-0 object-cover" style={{ border: "1px solid #e8e5e0" }} />
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function Tile({ label, value, accent }: { label: string; value: number | string; accent: string }) {
  return (
    <div className="rounded-md bg-white p-3" style={{ border: "1px solid #E5DACA" }}>
      <p className="text-[10px] font-bold uppercase tracking-[0.14em]" style={{ color: "#998877" }}>{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color: accent, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" }}>{value}</p>
    </div>
  );
}
