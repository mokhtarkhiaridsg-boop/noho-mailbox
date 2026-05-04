"use client";

// iter-105 — Admin storage-fee disputes panel.

import { useEffect, useState, useTransition } from "react";
import {
  listAdminStorageDisputes,
  adminResolveStorageDispute,
} from "@/app/actions/storageDispute";
import type { AdminDisputeRow } from "@/lib/storage-dispute-types";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

type StatusFilter = "Open" | "Waived" | "Upheld" | "all";

export default function AdminStorageDisputesPanel() {
  const [data, setData] = useState<{ rows: AdminDisputeRow[]; openCount: number; waivedRefundedCents: number } | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("Open");
  const [pending, startTransition] = useTransition();
  const [resolving, setResolving] = useState<AdminDisputeRow | null>(null);

  function refresh() {
    void listAdminStorageDisputes({ status: filter })
      .then(setData)
      .catch(() => setData({ rows: [], openCount: 0, waivedRefundedCents: 0 }));
  }
  useEffect(() => { refresh(); }, [filter]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          Money · Storage-fee disputes
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Storage-fee disputes</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          Review customer disputes against storage fees applied at pickup. Waiving credits the wallet automatically and writes a WalletTransaction. All decisions are audit-logged.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Tile label="Open queue" value={data?.openCount ?? 0} accent="#92400e" />
        <Tile label="Refunded (lifetime)" value={`$${(((data?.waivedRefundedCents ?? 0)) / 100).toFixed(2)}`} accent="#15803d" />
        <Tile label="Showing" value={data?.rows.length ?? 0} accent={NOHO_BLUE_DEEP} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["Open", "Waived", "Upheld", "all"] as StatusFilter[]).map((s) => {
          const active = filter === s;
          return (
            <button key={s} type="button" onClick={() => setFilter(s)}
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

      <div className="rounded-md bg-white" style={{ border: "1px solid #E5DACA" }}>
        {!data ? (
          <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
        ) : data.rows.length === 0 ? (
          <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>
            {filter === "Open" ? "No open disputes — all clear. ✓" : "No disputes in this view."}
          </p>
        ) : (
          <ul>
            {data.rows.map((r, i) => (
              <li key={r.id} className="px-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid #e8e5e0" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-black truncate" style={{ color: NOHO_INK }}>
                      {r.filedByName} {r.suiteNumber && (
                        <span className="ml-1 text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                          Suite #{r.suiteNumber}
                        </span>
                      )} <StatusChip status={r.status} />
                    </p>
                    <p className="text-[10.5px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                      {r.itemSummary} · disputed <strong>${(r.feeCents / 100).toFixed(2)}</strong>
                      {r.refundCents != null && r.refundCents > 0 && <> · refunded <strong>${(r.refundCents / 100).toFixed(2)}</strong></>}
                    </p>
                    <p className="text-[11.5px] mt-1.5 italic" style={{ color: NOHO_INK, background: "rgba(245,166,35,0.06)", padding: "8px 10px", borderRadius: "8px" }}>
                      "{r.reason}"
                    </p>
                    {r.resolution && (
                      <p className="text-[11.5px] mt-1.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                        <strong>Admin note:</strong> {r.resolution} {r.resolvedByName && <span className="opacity-70">— {r.resolvedByName}</span>}
                      </p>
                    )}
                  </div>
                  {r.status === "Open" && (
                    <button type="button" onClick={() => setResolving(r)} disabled={pending}
                      className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white disabled:opacity-50"
                      style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}>
                      Review
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {resolving && (
        <ResolveModal row={resolving} onClose={() => setResolving(null)} onResolved={() => { setResolving(null); refresh(); }} />
      )}
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

function StatusChip({ status }: { status: AdminDisputeRow["status"] }) {
  const c = status === "Open"   ? { bg: "rgba(245,166,35,0.18)", fg: "#92400e" }
          : status === "Waived" ? { bg: "rgba(22,163,74,0.14)",  fg: "#15803d" }
          :                       { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b" };
  return (
    <span className="ml-1 text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}

function ResolveModal({ row, onClose, onResolved }: {
  row: AdminDisputeRow;
  onClose: () => void;
  onResolved: () => void;
}) {
  const [note, setNote] = useState("");
  const [refundDollars, setRefundDollars] = useState<string>(((row.feeCents) / 100).toFixed(2));
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function decide(decision: "Waived" | "Upheld") {
    setErr(null);
    startTransition(async () => {
      const refundCentsOverride = decision === "Waived"
        ? Math.round(parseFloat(refundDollars || "0") * 100)
        : null;
      const res = await adminResolveStorageDispute({ id: row.id, decision, note, refundCentsOverride });
      if (res.error) { setErr(res.error); return; }
      onResolved();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(45,16,15,0.55)" }}>
      <div className="rounded-2xl bg-white max-w-lg w-full p-5" style={{ border: "1px solid #e8e5e0" }}>
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
          Resolve dispute
        </p>
        <h3 className="text-lg font-black mt-1" style={{ color: NOHO_INK }}>
          {row.filedByName} · ${(row.feeCents / 100).toFixed(2)}
        </h3>
        <p className="text-[11.5px] mt-0.5 italic" style={{ color: "rgba(45,16,15,0.55)" }}>
          {row.itemSummary}
        </p>
        <p className="text-[12px] mt-3" style={{ color: NOHO_INK, background: "rgba(245,166,35,0.06)", padding: "10px 12px", borderRadius: "8px" }}>
          "{row.reason}"
        </p>

        {err && (
          <p className="mt-2 rounded-lg px-3 py-2 text-[11.5px] font-bold" style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>
            {err}
          </p>
        )}

        <div className="mt-3">
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>Note to customer (optional)</label>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2}
            placeholder="Brief reasoning — appears in their email."
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
        </div>

        <div className="mt-3">
          <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>If waiving, refund amount ($)</label>
          <input type="number" step="0.01" min={0} max={(row.feeCents / 100).toFixed(2)}
            value={refundDollars} onChange={(e) => setRefundDollars(e.target.value)}
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm font-mono"
            style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
          <p className="text-[10.5px] mt-1 italic" style={{ color: "rgba(45,16,15,0.55)" }}>
            Default = full ${(row.feeCents / 100).toFixed(2)}. Lower for partial waiver.
          </p>
        </div>

        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={() => decide("Waived")} disabled={pending}
            className="flex-1 py-2.5 rounded-lg text-white font-black disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#16A34A,#15803d)" }}>
            {pending ? "Saving…" : "Waive + refund"}
          </button>
          <button type="button" onClick={() => decide("Upheld")} disabled={pending}
            className="flex-1 py-2.5 rounded-lg font-black disabled:opacity-50 border"
            style={{ borderColor: "#dc2626", color: "#991b1b", background: "white" }}>
            Uphold (no refund)
          </button>
          <button type="button" onClick={onClose}
            className="px-3 py-2.5 rounded-lg text-xs font-bold border"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
