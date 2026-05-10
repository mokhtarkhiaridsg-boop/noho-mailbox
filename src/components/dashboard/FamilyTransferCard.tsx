"use client";

/**
 * iter-231 — Member-side family-transfer card.
 *
 * Shows nothing by default. Member opens via "Transfer mailbox to
 * family" button → fills recipient name/email/relationship/reason →
 * submits → bureau emails recipient with in-person-visit instructions.
 * Once submitted, card flips to a status mode showing the in-flight
 * request + Cancel button.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  requestMailboxFamilyTransfer,
  cancelMyMailboxFamilyTransfer,
  getMyMailboxFamilyTransfers,
  type FamilyTransferRow,
} from "@/app/actions/mailboxFamilyTransfer";

const RELATIONSHIPS: Array<{ id: "spouse" | "child" | "parent" | "sibling" | "other"; label: string; emoji: string }> = [
  { id: "spouse", label: "Spouse", emoji: "💍" },
  { id: "child", label: "Child", emoji: "👶" },
  { id: "parent", label: "Parent", emoji: "👴" },
  { id: "sibling", label: "Sibling", emoji: "👫" },
  { id: "other", label: "Other family", emoji: "👨‍👩‍👧" },
];

export default function FamilyTransferCard() {
  const [rows, setRows] = useState<FamilyTransferRow[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [recipientPhone, setRecipientPhone] = useState("");
  const [relationship, setRelationship] = useState<"spouse" | "child" | "parent" | "sibling" | "other">("spouse");
  const [reason, setReason] = useState("");

  function refresh() {
    void getMyMailboxFamilyTransfers().then(setRows).catch(() => setRows([]));
  }

  useEffect(refresh, []);

  const inflight = rows?.find((r) => r.status === "Pending" || r.status === "AwaitingVisit" || r.status === "Approved");

  function onSubmit() {
    if (!recipientEmail.trim() || !recipientName.trim()) { setError("Email + name required."); return; }
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await requestMailboxFamilyTransfer({
        recipientEmail, recipientName,
        recipientPhone: recipientPhone.trim() || undefined,
        relationship,
        reason: reason.trim() || undefined,
      });
      if (res.error) setError(res.error);
      else {
        setInfo("✓ Request filed. Bureau emailed both of you.");
        setRecipientEmail(""); setRecipientName(""); setRecipientPhone(""); setReason("");
        setOpen(false);
        refresh();
      }
    });
  }

  function onCancel(r: FamilyTransferRow) {
    const reason = prompt(`Cancel transfer to ${r.recipientName}? Reason (optional):`);
    if (reason === null) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await cancelMyMailboxFamilyTransfer({ id: r.id, reason: reason.trim() || undefined });
      if (res.error) setError(res.error);
      else { setInfo("✓ Cancelled"); refresh(); }
    });
  }

  if (rows === null) return null;

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#5B21B6" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#5B21B6", boxShadow: "0 0 6px #5B21B6" }} />
            👨‍👩‍👧 Family transfer
          </p>
          <h3 className="text-base font-black tracking-tight mt-0.5" style={{ color: BRAND.ink }}>
            Transfer this mailbox to a family member
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            Hand your suite over to a spouse, child, parent, or sibling. They visit the bureau once with ID + sign Form 1583, and the mailbox becomes theirs.
          </p>
        </div>
      </div>

      {info && <p className="text-[11.5px] font-semibold mt-2" style={{ color: "#15803d" }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold mt-2" style={{ color: "#b91c1c" }}>{error}</p>}

      {inflight ? (
        <div className="mt-3 rounded-xl p-3" style={{ background: inflight.status === "Approved" ? "#DCFCE7" : "#FEF3C7", border: `1px solid ${inflight.status === "Approved" ? "#22C55E40" : "#F59E0B40"}` }}>
          <p className="text-[11.5px] font-bold" style={{ color: inflight.status === "Approved" ? "#15803d" : "#b45309" }}>
            {inflight.status === "Approved" ? "✅ Approved · awaiting completion" : inflight.status === "AwaitingVisit" ? "📍 Awaiting in-person visit" : "⏸ Pending"}
          </p>
          <p className="text-[12px] mt-1" style={{ color: BRAND.ink }}>
            <span className="font-bold">{inflight.recipientName}</span> · {inflight.recipientEmail} · <span style={{ color: BRAND.inkSoft }}>{inflight.relationship}</span>
          </p>
          {inflight.reason && <p className="text-[11px] italic mt-0.5" style={{ color: BRAND.inkSoft }}>📝 {inflight.reason}</p>}
          <p className="text-[10.5px] mt-1" style={{ color: BRAND.inkFaint }}>
            Filed {new Date(inflight.createdAtIso).toLocaleDateString()}
          </p>
          {inflight.status !== "Approved" && (
            <button type="button" onClick={() => onCancel(inflight)} disabled={busy}
              className="mt-2 text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
              style={{ background: "white", color: "#b91c1c", border: "1px solid #EF444440" }}>
              Cancel request
            </button>
          )}
        </div>
      ) : open ? (
        <div className="mt-3 rounded-xl p-3 space-y-2" style={{ background: "#F4F5F7" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Recipient name"
              className="px-3 py-1.5 rounded-lg text-[12.5px]"
              style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
            <input value={recipientEmail} onChange={(e) => setRecipientEmail(e.target.value)} placeholder="Recipient email" type="email"
              className="px-3 py-1.5 rounded-lg text-[12.5px]"
              style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
          </div>
          <input value={recipientPhone} onChange={(e) => setRecipientPhone(e.target.value)} placeholder="Recipient phone (optional)"
            className="w-full px-3 py-1.5 rounded-lg text-[12px]"
            style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
          <div className="flex flex-wrap gap-1.5">
            {RELATIONSHIPS.map((r) => (
              <button key={r.id} type="button" onClick={() => setRelationship(r.id)}
                className="text-[10.5px] font-bold px-2.5 py-1 rounded-md"
                style={{
                  background: relationship === r.id ? "#5B21B6" : "white",
                  color: relationship === r.id ? "white" : BRAND.inkSoft,
                  border: `1px solid ${relationship === r.id ? "#5B21B6" : BRAND.border}`,
                }}>
                {r.emoji} {r.label}
              </button>
            ))}
          </div>
          <textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why are you transferring? (optional)" rows={2} maxLength={500}
            className="w-full px-3 py-1.5 rounded-lg text-[12px]"
            style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink, resize: "none" }} />
          <p className="text-[10.5px] italic" style={{ color: BRAND.inkSoft }}>
            ⚠️ Per CMRA rules, recipient must visit the bureau in person with photo ID + sign Form 1583 to complete the handover.
          </p>
          <div className="flex gap-1.5">
            <button type="button" onClick={onSubmit} disabled={busy || !recipientEmail.trim() || !recipientName.trim()}
              className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
              style={{ background: "#5B21B6" }}>
              {busy ? "Filing…" : "Send request"}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg"
              style={{ background: "white", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => setOpen(true)}
          className="mt-3 text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white"
          style={{ background: "#5B21B6" }}>
          Transfer to family →
        </button>
      )}

      {rows.length > 0 && rows.some((r) => r.status === "Completed" || r.status === "Denied" || r.status === "Cancelled") && (
        <details className="mt-3 text-[10.5px]">
          <summary className="cursor-pointer font-bold" style={{ color: BRAND.inkFaint }}>Past requests ({rows.filter((r) => r.status === "Completed" || r.status === "Denied" || r.status === "Cancelled").length})</summary>
          <ul className="mt-1.5 space-y-1">
            {rows.filter((r) => r.status === "Completed" || r.status === "Denied" || r.status === "Cancelled").map((r) => (
              <li key={r.id} className="text-[10.5px]" style={{ color: BRAND.inkSoft }}>
                <span className="font-bold">{r.recipientName}</span> · {r.recipientEmail} · {r.status} · {new Date(r.createdAtIso).toLocaleDateString()}
              </li>
            ))}
          </ul>
        </details>
      )}
    </section>
  );
}
