"use client";

// iter-122 — Admin suite transfer queue.

import { useEffect, useState, useTransition } from "react";
import {
  listAdminSuiteTransfers,
  adminApproveTransfer,
  adminDenyTransfer,
  type AdminTransferRow,
} from "@/app/actions/suiteTransfer";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

type StatusFilter = "Pending" | "Approved" | "Denied" | "Cancelled" | "all";

export default function AdminSuiteTransfersPanel() {
  const [data, setData] = useState<{ rows: AdminTransferRow[]; pendingCount: number } | null>(null);
  const [filter, setFilter] = useState<StatusFilter>("Pending");
  const [pending, startTransition] = useTransition();
  const [decideRow, setDecideRow] = useState<AdminTransferRow | null>(null);

  function refresh() {
    void listAdminSuiteTransfers({ status: filter })
      .then(setData)
      .catch(() => setData({ rows: [], pendingCount: 0 }));
  }
  useEffect(() => { refresh(); }, [filter]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          Operations · Suite transfers
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Suite transfer requests</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          Members can request to move to any vacant suite. Approving atomically updates User.suiteNumber + audit. Decisions email the customer.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        <Tile label="Pending queue" value={data?.pendingCount ?? 0} accent={(data?.pendingCount ?? 0) > 0 ? "#92400e" : "#15803d"} />
        <Tile label="Showing" value={data?.rows.length ?? 0} accent={NOHO_BLUE_DEEP} />
        <Tile label="Filter" value={filter === "all" ? "All" : filter} accent={NOHO_INK} />
      </div>

      <div className="flex flex-wrap gap-1.5">
        {(["Pending", "Approved", "Denied", "Cancelled", "all"] as StatusFilter[]).map((s) => {
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

      <div className="rounded-2xl bg-white border" style={{ borderColor: "#e8e5e0" }}>
        {!data ? (
          <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
        ) : data.rows.length === 0 ? (
          <p className="px-4 py-6 text-[12px] italic" style={{ color: "rgba(45,16,15,0.55)" }}>
            {filter === "Pending" ? "No pending requests — all clear. ✓" : "No requests in this view."}
          </p>
        ) : (
          <ul>
            {data.rows.map((r, i) => (
              <li key={r.id} className="px-4 py-3" style={{ borderTop: i === 0 ? "none" : "1px solid #e8e5e0" }}>
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-black truncate" style={{ color: NOHO_INK }}>
                      {r.userName} <StatusChip status={r.status} />
                    </p>
                    <p className="text-[12px] mt-0.5 font-mono tabular-nums" style={{ color: NOHO_INK }}>
                      <span style={{ color: "rgba(45,16,15,0.55)" }}>#{r.fromSuite}</span>
                      <span className="mx-1">→</span>
                      <span style={{ color: NOHO_BLUE_DEEP }}>#{r.toSuite}</span>
                      {r.status === "Pending" && !r.vacantNow && (
                        <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>
                          ⚠️ no longer vacant
                        </span>
                      )}
                    </p>
                    <p className="text-[10.5px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                      {r.userEmail} · filed {new Date(r.createdAtIso).toLocaleDateString()}
                    </p>
                    <p className="text-[11.5px] mt-1.5 italic" style={{ color: NOHO_INK, background: "rgba(245,166,35,0.06)", padding: "8px 10px", borderRadius: "8px" }}>
                      "{r.reason}"
                    </p>
                    {r.decisionNote && (
                      <p className="text-[11px] mt-1" style={{ color: "rgba(45,16,15,0.55)" }}>
                        <strong>Admin note:</strong> {r.decisionNote}
                        {r.decidedByName && <span className="opacity-70"> — {r.decidedByName}</span>}
                      </p>
                    )}
                  </div>
                  {r.status === "Pending" && (
                    <button type="button" onClick={() => setDecideRow(r)} disabled={pending}
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

      {decideRow && (
        <DecideModal row={decideRow} onClose={() => setDecideRow(null)} onDecided={() => { setDecideRow(null); refresh(); }} />
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

function StatusChip({ status }: { status: string }) {
  const c = status === "Pending"   ? { bg: "rgba(245,166,35,0.18)", fg: "#92400e" }
          : status === "Approved"  ? { bg: "rgba(22,163,74,0.14)",  fg: "#15803d" }
          : status === "Denied"    ? { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b" }
          :                          { bg: "rgba(45,16,15,0.06)",   fg: "rgba(45,16,15,0.55)" };
  return (
    <span className="ml-1 text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: c.bg, color: c.fg }}>
      {status}
    </span>
  );
}

function DecideModal({ row, onClose, onDecided }: {
  row: AdminTransferRow;
  onClose: () => void;
  onDecided: () => void;
}) {
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function decide(decision: "Approved" | "Denied") {
    setErr(null);
    startTransition(async () => {
      const fn = decision === "Approved" ? adminApproveTransfer : adminDenyTransfer;
      const res = await fn({ id: row.id, note });
      if (res.error) { setErr(res.error); return; }
      onDecided();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(45,16,15,0.55)" }}>
      <div className="rounded-2xl bg-white max-w-lg w-full p-5" style={{ border: "1px solid #e8e5e0" }}>
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
          Review transfer
        </p>
        <h3 className="text-lg font-black mt-1" style={{ color: NOHO_INK }}>
          {row.userName} · #{row.fromSuite} → #{row.toSuite}
        </h3>
        {!row.vacantNow && (
          <p className="mt-2 rounded-lg px-3 py-2 text-[11.5px] font-bold" style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>
            ⚠️ Suite #{row.toSuite} is no longer vacant. Approving will fail — deny instead, or have the member pick another.
          </p>
        )}
        <p className="text-[12px] mt-2 italic" style={{ color: NOHO_INK, background: "rgba(245,166,35,0.06)", padding: "10px 12px", borderRadius: "8px" }}>
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
            placeholder="Brief reason — appears in their email."
            className="mt-1 w-full rounded-lg border px-3 py-2 text-sm"
            style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
        </div>
        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={() => decide("Approved")} disabled={pending || !row.vacantNow}
            className="flex-1 py-2.5 rounded-lg text-white font-black disabled:opacity-50"
            style={{ background: "linear-gradient(135deg,#16A34A,#15803d)" }}>
            {pending ? "Saving…" : "✓ Approve + swap"}
          </button>
          <button type="button" onClick={() => decide("Denied")} disabled={pending}
            className="flex-1 py-2.5 rounded-lg font-black disabled:opacity-50 border"
            style={{ borderColor: "#dc2626", color: "#991b1b", background: "white" }}>
            Deny
          </button>
          <button type="button" onClick={onClose}
            className="px-3 py-2.5 rounded-lg text-xs font-bold border"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
