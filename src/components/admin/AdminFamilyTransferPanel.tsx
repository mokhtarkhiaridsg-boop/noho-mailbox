"use client";

/**
 * iter-231 — Mailbox family-transfer admin panel (Tier 17 #140).
 *
 * Workflow per row: AwaitingVisit → admin uploads KYC docs + marks
 * visited → Approve (atomic: revoke iter-100 SharedMailboxAccess +
 * audit + email) → admin manually creates new User → Complete with
 * newUserId. Deny path also available with reason.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listMailboxFamilyTransfersAdmin,
  adminUpdateFamilyTransferKyc,
  approveMailboxFamilyTransfer,
  denyMailboxFamilyTransfer,
  completeMailboxFamilyTransfer,
  type FamilyTransferRow,
  type FamilyTransferStatus,
} from "@/app/actions/mailboxFamilyTransfer";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
};

const FILTER_TABS: Array<{ id: FamilyTransferStatus | "all"; label: string }> = [
  { id: "all", label: "All" },
  { id: "AwaitingVisit", label: "Awaiting visit" },
  { id: "Approved", label: "Approved" },
  { id: "Completed", label: "Completed" },
  { id: "Denied", label: "Denied" },
  { id: "Cancelled", label: "Cancelled" },
];

export default function AdminFamilyTransferPanel() {
  const [rows, setRows] = useState<FamilyTransferRow[] | null>(null);
  const [filter, setFilter] = useState<FamilyTransferStatus | "all">("all");
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editIdUrl, setEditIdUrl] = useState("");
  const [editForm1583Url, setEditForm1583Url] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editVisited, setEditVisited] = useState(false);

  function refresh() {
    void listMailboxFamilyTransfersAdmin({ status: filter === "all" ? undefined : filter, limit: 50 })
      .then(setRows)
      .catch(() => setRows([]));
  }

  useEffect(refresh, [filter]);

  function startEditing(r: FamilyTransferRow) {
    setEditingId(r.id);
    setEditIdUrl(r.kycIdImageUrl ?? "");
    setEditForm1583Url(r.kycForm1583Url ?? "");
    setEditNotes(r.kycNotes ?? "");
    setEditVisited(!!r.visitedBureauAtIso);
  }

  function saveKyc() {
    if (!editingId) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await adminUpdateFamilyTransferKyc({
        id: editingId,
        kycIdImageUrl: editIdUrl.trim() || undefined,
        kycForm1583Url: editForm1583Url.trim() || undefined,
        kycNotes: editNotes,
        markVisited: editVisited,
      });
      if (res.error) setError(res.error);
      else { setInfo("✓ KYC updated"); setEditingId(null); refresh(); }
    });
  }

  function onApprove(r: FamilyTransferRow) {
    if (!r.kycIdImageUrl || !r.kycForm1583Url || !r.visitedBureauAtIso) {
      setError("Upload KYC ID + signed 1583 + mark visited first.");
      return;
    }
    const note = prompt(`Approve transfer of suite #${r.primaryUserSuite ?? "—"} → ${r.recipientName}?\n\nThis will revoke ALL active shared-access grants for the primary user.\n\nOptional decision note:`);
    if (note === null) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await approveMailboxFamilyTransfer({ id: r.id, decisionNote: note.trim() || undefined });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Approved · ${res.row?.revokedSharedAccessCount ?? 0} shared-access grants revoked + emails sent`); refresh(); }
    });
  }

  function onDeny(r: FamilyTransferRow) {
    const reason = prompt(`Deny transfer for ${r.recipientName}? Reason (≥4 chars):`);
    if (!reason || reason.trim().length < 4) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await denyMailboxFamilyTransfer({ id: r.id, reason });
      if (res.error) setError(res.error);
      else { setInfo("✓ Denied + member notified"); refresh(); }
    });
  }

  function onComplete(r: FamilyTransferRow) {
    const newUserId = prompt(`Mark Completed: paste the new User.id you created for ${r.recipientName}:`);
    if (!newUserId || newUserId.trim().length < 8) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await completeMailboxFamilyTransfer({ id: r.id, newUserId: newUserId.trim() });
      if (res.error) setError(res.error);
      else { setInfo("✓ Completed"); refresh(); }
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
          Family Transfer
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
          keep it in the family
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {rows?.length ?? 0} transfers
        </span>
      </div>
      <p className="text-[11px] -mt-2" style={{ color: T.inkFaint }}>
        Member-initiated handovers of an entire mailbox to a spouse / child / parent / sibling. Per CMRA + KHIARI policy, recipient must visit the bureau in person; admin uploads ID scan + signed Form 1583 here, then approves to atomically revoke iter-100 SharedMailboxAccess and trigger handover emails.
      </p>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.green }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.red }}>{error}</p>}

      <div className="flex flex-wrap gap-1.5">
        {FILTER_TABS.map((t) => (
          <button key={t.id} type="button" onClick={() => setFilter(t.id)}
            className="text-[11px] font-bold px-2.5 py-1 rounded-md"
            style={{
              background: filter === t.id ? T.blue : T.surface,
              color: filter === t.id ? "white" : T.inkSoft,
              border: `1px solid ${filter === t.id ? T.blue : T.border}`,
            }}>
            {t.label}
          </button>
        ))}
      </div>

      {!rows ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : rows.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          No family transfers in this filter.
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => {
            const editing = editingId === r.id;
            const canApprove = r.status === "Pending" || r.status === "AwaitingVisit";
            const canComplete = r.status === "Approved";
            return (
              <li key={r.id} className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${r.status === "AwaitingVisit" ? `${T.amber}55` : T.border}` }}>
                <div className="flex items-start justify-between gap-2 flex-wrap">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-[12.5px] font-mono font-black" style={{ color: T.blue }}>#{r.primaryUserSuite ?? "—"}</span>
                      <span className="text-[12.5px] font-bold" style={{ color: T.ink }}>{r.primaryUserName ?? "(no name)"}</span>
                      <span className="text-[10px]" style={{ color: T.inkFaint }}>→ {r.relationship}</span>
                      <span className="text-[12px] font-black" style={{ color: T.ink }}>{r.recipientName}</span>
                      <StatusPill status={r.status} />
                    </div>
                    <p className="text-[10.5px] mt-0.5" style={{ color: T.inkFaint }}>
                      📧 {r.recipientEmail}
                      {r.recipientPhone && ` · ${r.recipientPhone}`}
                      {" · filed "}{new Date(r.createdAtIso).toLocaleDateString()}
                    </p>
                    {r.reason && <p className="text-[10.5px] italic mt-0.5" style={{ color: T.inkSoft }}>📝 {r.reason}</p>}
                    <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[10.5px]" style={{ color: T.inkSoft }}>
                      <span>{r.kycIdImageUrl ? "✓ ID uploaded" : "⏸ ID pending"}</span>
                      <span>{r.kycForm1583Url ? "✓ 1583 uploaded" : "⏸ 1583 pending"}</span>
                      <span>{r.visitedBureauAtIso ? `✓ Visited ${new Date(r.visitedBureauAtIso).toLocaleDateString()}` : "⏸ No visit logged"}</span>
                    </div>
                    {r.status === "Approved" && (
                      <p className="text-[11px] font-bold mt-1" style={{ color: T.green }}>
                        ✅ Approved {r.approvedAtIso && `· ${new Date(r.approvedAtIso).toLocaleString()}`} · {r.revokedSharedAccessCount} SharedAccess revoked
                      </p>
                    )}
                    {r.status === "Completed" && (
                      <p className="text-[11px] font-bold mt-1" style={{ color: T.green }}>
                        🏁 Completed {r.completedAtIso && `· ${new Date(r.completedAtIso).toLocaleString()}`} · new User {r.newUserId?.slice(0, 8)}…
                      </p>
                    )}
                    {r.deniedReason && <p className="text-[10.5px] italic mt-0.5" style={{ color: T.red }}>✕ Denied: {r.deniedReason}</p>}
                    {r.cancelledReason && <p className="text-[10.5px] italic mt-0.5" style={{ color: T.inkFaint }}>↩ Cancelled: {r.cancelledReason}</p>}
                    {r.decisionNote && <p className="text-[10px] italic mt-0.5" style={{ color: T.inkSoft }}>🗒 Decision note: {r.decisionNote}</p>}
                  </div>
                  <div className="flex flex-col gap-1 shrink-0 items-end">
                    {canApprove && !editing && (
                      <button type="button" onClick={() => startEditing(r)} disabled={busy}
                        className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                        style={{ background: T.surface, color: T.blue, border: `1px solid ${T.blue}40` }}>
                        Edit KYC
                      </button>
                    )}
                    {canApprove && (
                      <button type="button" onClick={() => onApprove(r)} disabled={busy}
                        className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                        style={{ background: T.green, color: "white" }}>
                        Approve
                      </button>
                    )}
                    {canApprove && (
                      <button type="button" onClick={() => onDeny(r)} disabled={busy}
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md disabled:opacity-50"
                        style={{ background: T.surface, color: T.red, border: `1px solid ${T.red}40` }}>
                        Deny
                      </button>
                    )}
                    {canComplete && (
                      <button type="button" onClick={() => onComplete(r)} disabled={busy}
                        className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                        style={{ background: T.blue, color: "white" }}>
                        Mark Completed
                      </button>
                    )}
                  </div>
                </div>

                {editing && (
                  <div className="mt-3 p-3 rounded-xl space-y-2" style={{ background: T.surfaceAlt }}>
                    <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Edit KYC docs</p>
                    <input value={editIdUrl} onChange={(e) => setEditIdUrl(e.target.value)} placeholder="ID scan URL (https://…)"
                      className="w-full px-3 py-1.5 rounded-lg text-[12px]"
                      style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }} />
                    <input value={editForm1583Url} onChange={(e) => setEditForm1583Url(e.target.value)} placeholder="Signed Form 1583 URL (https://…)"
                      className="w-full px-3 py-1.5 rounded-lg text-[12px]"
                      style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink }} />
                    <textarea value={editNotes} onChange={(e) => setEditNotes(e.target.value)} placeholder="KYC notes (optional)" rows={2} maxLength={1000}
                      className="w-full px-3 py-1.5 rounded-lg text-[12px]"
                      style={{ background: T.surface, border: `1px solid ${T.border}`, color: T.ink, resize: "none" }} />
                    <label className="text-[11px] font-bold flex items-center gap-1.5 cursor-pointer" style={{ color: T.inkSoft }}>
                      <input type="checkbox" checked={editVisited} onChange={(e) => setEditVisited(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
                      Mark in-person visit complete
                    </label>
                    <div className="flex gap-1.5">
                      <button type="button" onClick={saveKyc} disabled={busy}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
                        style={{ background: T.blue }}>
                        {busy ? "Saving…" : "Save KYC"}
                      </button>
                      <button type="button" onClick={() => setEditingId(null)}
                        className="text-[11px] font-bold px-3 py-1.5 rounded-lg"
                        style={{ background: T.surface, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function StatusPill({ status }: { status: FamilyTransferStatus }) {
  const meta: Record<FamilyTransferStatus, { bg: string; fg: string; label: string }> = {
    Pending:        { bg: T.surfaceAlt, fg: T.inkSoft, label: "⏸ Pending" },
    AwaitingVisit:  { bg: `${T.amber}1A`, fg: "#b45309", label: "📍 Awaiting visit" },
    Approved:       { bg: `${T.green}1A`, fg: "#15803d", label: "✓ Approved" },
    Completed:      { bg: `${T.blue}1A`, fg: "#1d4ed8", label: "🏁 Completed" },
    Denied:         { bg: `${T.red}1A`, fg: "#b91c1c", label: "✕ Denied" },
    Cancelled:      { bg: T.surfaceAlt, fg: T.inkFaint, label: "↩ Cancelled" },
  };
  const m = meta[status];
  return (
    <span className="text-[9.5px] font-black uppercase tracking-wide px-1.5 py-0.5 rounded"
      style={{ background: m.bg, color: m.fg, border: `1px solid ${m.fg}30` }}>
      {m.label}
    </span>
  );
}
