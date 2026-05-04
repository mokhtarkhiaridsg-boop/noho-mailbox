"use client";

// iter-105 — Member: file a storage-fee dispute on a picked-up package.
// Renders a "Dispute fee" link if feeChargedCents is set + we don't already
// have an existing dispute for this MailItem; otherwise renders the
// existing dispute's status as a small chip.

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  fileMyStorageDispute,
  getMyStorageDisputes,
} from "@/app/actions/storageDispute";
import type { MyDisputeRow } from "@/lib/storage-dispute-types";

export default function StorageFeeDisputeButton({ mailItemId, feeCents }: { mailItemId: string; feeCents: number }) {
  const [existing, setExisting] = useState<MyDisputeRow | null | undefined>(undefined);

  useEffect(() => {
    let cancel = false;
    getMyStorageDisputes()
      .then((map) => { if (!cancel) setExisting(map[mailItemId] ?? null); })
      .catch(() => { if (!cancel) setExisting(null); });
    return () => { cancel = true; };
  }, [mailItemId]);

  const [open, setOpen] = useState(false);

  if (existing === undefined) return null;
  if (existing) {
    const c = existing.status === "Open"   ? { bg: "rgba(245,166,35,0.18)", fg: "#92400e" }
            : existing.status === "Waived" ? { bg: "rgba(22,163,74,0.14)",  fg: "#15803d" }
            :                                { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b" };
    return (
      <span className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
        style={{ background: c.bg, color: c.fg }}
        title={existing.status === "Waived" ? `Refunded $${((existing.refundCents ?? 0) / 100).toFixed(2)}` : existing.status === "Upheld" ? "Admin upheld the fee" : "Under review"}>
        Dispute · {existing.status.toLowerCase()}
      </span>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}
        className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0 underline"
        style={{ color: "#991b1b", background: "rgba(231,0,19,0.06)" }}
        title={`Dispute the $${(feeCents / 100).toFixed(2)} storage fee`}>
        Dispute fee
      </button>
      {open && (
        <DisputeModal mailItemId={mailItemId} feeCents={feeCents}
          onClose={() => setOpen(false)}
          onFiled={(d) => { setExisting(d); setOpen(false); }} />
      )}
    </>
  );
}

function DisputeModal({ mailItemId, feeCents, onClose, onFiled }: {
  mailItemId: string;
  feeCents: number;
  onClose: () => void;
  onFiled: (d: MyDisputeRow) => void;
}) {
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function file() {
    setErr(null);
    startTransition(async () => {
      const res = await fileMyStorageDispute({ mailItemId, reason });
      if (res.error) { setErr(res.error); return; }
      // Synthesize a MyDisputeRow shape for instant UI feedback.
      onFiled({
        id: res.disputeId ?? "(pending)",
        mailItemId,
        status: "Open",
        feeCents,
        refundCents: null,
        reason,
        resolution: null,
        createdAtIso: new Date().toISOString(),
        resolvedAtIso: null,
      });
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(45,16,15,0.55)" }}>
      <div className="rounded-2xl bg-white max-w-md w-full p-5" style={{ border: `1px solid ${BRAND.border}` }}>
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: BRAND.inkSoft }}>
          File a dispute
        </p>
        <h3 className="text-lg font-black mt-1" style={{ color: BRAND.ink }}>
          Dispute the ${(feeCents / 100).toFixed(2)} storage fee
        </h3>
        <p className="text-[11.5px] mt-1" style={{ color: BRAND.inkSoft }}>
          Tell us why you think the fee was applied in error. An admin reviews within 2 business days.
        </p>

        {err && (
          <p className="mt-2 rounded-lg px-3 py-2 text-[11.5px] font-bold" style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>
            {err}
          </p>
        )}

        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={5}
          placeholder="e.g. I was out of town and you held my package — there was no email letting me know it arrived."
          className="mt-3 w-full rounded-lg border px-3 py-2 text-sm"
          style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }} />
        <p className="text-[10.5px] mt-1" style={{ color: BRAND.inkFaint }}>
          {reason.length}/2000 characters · minimum 10
        </p>

        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={file} disabled={pending || reason.trim().length < 10}
            className="flex-1 py-2.5 rounded-lg text-white font-black disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}>
            {pending ? "Filing…" : "File dispute"}
          </button>
          <button type="button" onClick={onClose}
            className="px-3 py-2.5 rounded-lg text-xs font-bold border"
            style={{ borderColor: BRAND.border, color: BRAND.ink, background: "white" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
