"use client";

/**
 * iter-138 — Invoice adjustments editor (Tier 8 #50).
 *
 * After an invoice has been sent, admin opens this modal to apply a
 * discount, waiver, or surcharge with a customer-facing description AND
 * an internal reason note. Existing adjustments are listed below; void
 * keeps them in the audit trail (greyed out, strikethrough).
 *
 * Paid invoices reject all writes server-side (admin sees the error
 * message inline). The math + revalidation are handled by the actions.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  addInvoiceAdjustment,
  voidInvoiceAdjustment,
  listInvoiceAdjustments,
} from "@/app/actions/invoice-builder";

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

type Kind = "discount" | "waiver" | "surcharge";

const KIND_META: Record<Kind, { label: string; sign: string; tone: string; bg: string; fg: string }> = {
  discount:  { label: "Discount",  sign: "−", tone: "good", bg: "rgba(34,197,94,0.10)",  fg: "#15803d" },
  waiver:    { label: "Waiver",    sign: "−", tone: "good", bg: "rgba(34,197,94,0.10)",  fg: "#15803d" },
  surcharge: { label: "Surcharge", sign: "+", tone: "warn", bg: "rgba(245,158,11,0.12)", fg: "#92400e" },
};

type Adjustment = {
  id: string;
  kind: Kind;
  signedCents: number;
  description: string;
  reason: string;
  byActorName: string | null;
  atIso: string;
  voidedAt: string | null;
  voidedReason: string | null;
};

type Props = {
  invoiceId: string;
  invoiceNumber: string;
  invoiceStatus: string;
  customerName: string;
  onClose: () => void;
  onChanged?: () => void;
};

export default function InvoiceAdjustmentsModal({
  invoiceId,
  invoiceNumber,
  invoiceStatus,
  customerName,
  onClose,
  onChanged,
}: Props) {
  const [data, setData] = useState<{
    adjustments: Adjustment[];
    totalBeforeAdjustments: number;
    total: number;
    adjustmentsCents: number;
  } | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // Form state for the new-adjustment fieldset.
  const [kind, setKind] = useState<Kind>("discount");
  const [amountStr, setAmountStr] = useState("");
  const [description, setDescription] = useState("");
  const [reason, setReason] = useState("");

  function refresh() {
    void listInvoiceAdjustments(invoiceId).then((r) => {
      if ("error" in r) {
        setErrorMsg(r.error);
        return;
      }
      setData(r);
    });
  }
  useEffect(refresh, [invoiceId]);

  // ESC closes.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const amountCents = useMemo(() => {
    const cleaned = amountStr.replace(/[^0-9.]/g, "");
    if (!cleaned) return 0;
    const n = Number.parseFloat(cleaned);
    if (!Number.isFinite(n)) return 0;
    return Math.round(n * 100);
  }, [amountStr]);

  function onApply() {
    setErrorMsg(null);
    if (amountCents <= 0) { setErrorMsg("Enter a positive amount"); return; }
    if (description.trim().length < 2) { setErrorMsg("Customer-visible description required"); return; }
    if (reason.trim().length < 2) { setErrorMsg("Internal reason required (audit trail)"); return; }
    startTransition(async () => {
      const res = await addInvoiceAdjustment({
        invoiceId,
        kind,
        amountCents,
        description: description.trim(),
        reason: reason.trim(),
      });
      if ("error" in res) { setErrorMsg(res.error); return; }
      setAmountStr("");
      setDescription("");
      setReason("");
      refresh();
      onChanged?.();
    });
  }

  function onVoid(adj: Adjustment) {
    const reason = window.prompt(
      `Void this ${KIND_META[adj.kind].label.toLowerCase()} of ${(Math.abs(adj.signedCents) / 100).toFixed(2)}? Type a reason:`,
      "",
    );
    if (reason === null) return;
    if (reason.trim().length < 2) { alert("Void reason required"); return; }
    setBusyId(adj.id);
    startTransition(async () => {
      const res = await voidInvoiceAdjustment({
        invoiceId,
        adjustmentId: adj.id,
        reason: reason.trim(),
      });
      setBusyId(null);
      if ("error" in res) { setErrorMsg(res.error); return; }
      refresh();
      onChanged?.();
    });
  }

  const fmt = (c: number) => `$${(Math.abs(c) / 100).toFixed(2)}`;
  const isPaid = invoiceStatus === "Paid";
  const isVoid = invoiceStatus === "Void";

  const activeAdjustments = (data?.adjustments ?? []).filter((a) => !a.voidedAt);
  const voidedAdjustments = (data?.adjustments ?? []).filter((a) => a.voidedAt);

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.55)" }}
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>
              Invoice adjustments
            </p>
            <h3 className="text-lg font-black truncate" style={{ color: T.ink }}>
              {invoiceNumber} · {customerName}
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
              Apply discounts, waivers, or surcharges after the invoice has been sent. Each entry shows on the receipt with the description; reason is audit-only.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base font-black transition-colors hover:bg-[#F4F5F7] disabled:opacity-40"
            style={{ color: T.inkSoft }}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {/* Totals strip */}
          {data && (
            <div className="grid grid-cols-3 gap-2">
              <Stat label="Original total" value={fmt(data.totalBeforeAdjustments)} />
              <Stat
                label="Adjustments"
                value={`${data.adjustmentsCents >= 0 ? "+" : "−"}${fmt(data.adjustmentsCents)}`}
                color={data.adjustmentsCents > 0 ? T.warning : data.adjustmentsCents < 0 ? T.success : T.inkFaint}
              />
              <Stat label="Adjusted total" value={fmt(data.total)} bold />
            </div>
          )}

          {/* New adjustment form */}
          <div
            className="rounded-xl p-4 space-y-3"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, opacity: isPaid || isVoid ? 0.55 : 1 }}
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
                Apply a new adjustment
              </p>
              {isPaid && (
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.10)", color: "#15803d" }}>
                  Paid · refund only
                </span>
              )}
              {isVoid && (
                <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(231,0,19,0.08)", color: "#991b1b" }}>
                  Voided
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-1.5">
              {(Object.entries(KIND_META) as Array<[Kind, typeof KIND_META[Kind]]>).map(([k, meta]) => (
                <button
                  key={k}
                  type="button"
                  disabled={isPaid || isVoid}
                  onClick={() => setKind(k)}
                  className="text-[11.5px] font-bold px-3 py-1.5 rounded-full transition-colors disabled:opacity-50"
                  style={{
                    background: kind === k ? T.blue : "white",
                    color: kind === k ? "white" : T.inkSoft,
                    border: `1px solid ${kind === k ? T.blue : T.border}`,
                  }}
                >
                  {meta.sign} {meta.label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-2">
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.16em] block" style={{ color: T.inkFaint }}>
                  Amount
                </label>
                <div className="mt-1 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-black" style={{ color: T.inkSoft }}>$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amountStr}
                    onChange={(e) => setAmountStr(e.target.value)}
                    disabled={isPaid || isVoid}
                    placeholder="0.00"
                    className="w-full pl-6 pr-3 py-2 rounded-lg outline-none text-sm tabular-nums"
                    style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase tracking-[0.16em] block" style={{ color: T.inkFaint }}>
                  Customer-facing description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  disabled={isPaid || isVoid}
                  placeholder="e.g. Loyalty 10% off, Waived storage fee"
                  maxLength={200}
                  className="mt-1 w-full px-3 py-2 rounded-lg outline-none text-sm"
                  style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
                />
              </div>
            </div>

            <div>
              <label className="text-[10px] font-black uppercase tracking-[0.16em] block" style={{ color: T.inkFaint }}>
                Internal reason · audit trail
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                disabled={isPaid || isVoid}
                placeholder="Why this adjustment was applied (e.g. customer reported damage; per Karim 5/12)"
                rows={2}
                maxLength={500}
                className="mt-1 w-full px-3 py-2 rounded-lg outline-none text-[12.5px] resize-none"
                style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}
              />
              <p className="text-[10px] mt-1" style={{ color: T.inkFaint }}>
                Internal — not visible to customer. {reason.length}/500
              </p>
            </div>

            {errorMsg && (
              <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>
                {errorMsg}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                disabled={isPaid || isVoid || pending}
                onClick={onApply}
                className="px-3 py-2 rounded-lg text-[11.5px] font-black text-white disabled:opacity-50"
                style={{ background: T.blue }}
              >
                {pending ? "Applying…" : `Apply ${KIND_META[kind].label.toLowerCase()}`}
              </button>
            </div>
          </div>

          {/* Active adjustments */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>
              Applied adjustments {data && `(${activeAdjustments.length})`}
            </p>
            {!data ? (
              <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
            ) : activeAdjustments.length === 0 ? (
              <div className="rounded-lg px-3 py-4 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
                No adjustments applied yet.
              </div>
            ) : (
              <ul className="space-y-2">
                {activeAdjustments.map((a) => {
                  const meta = KIND_META[a.kind];
                  const at = new Date(a.atIso);
                  return (
                    <li
                      key={a.id}
                      className="rounded-lg p-3 flex items-start justify-between gap-3"
                      style={{ background: "white", border: `1px solid ${T.border}` }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: meta.bg, color: meta.fg }}>
                            {meta.label}
                          </span>
                          <span className="text-[13px] font-black tabular-nums" style={{ color: meta.fg }}>
                            {meta.sign}{fmt(a.signedCents)}
                          </span>
                          <span className="text-[10.5px]" style={{ color: T.inkFaint }}>
                            · {at.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                            {a.byActorName && ` · ${a.byActorName}`}
                          </span>
                        </div>
                        <p className="text-[12.5px] mt-1 font-bold" style={{ color: T.ink }}>
                          {a.description}
                        </p>
                        <p className="text-[11px] mt-0.5 italic" style={{ color: T.inkFaint }}>
                          Reason: {a.reason}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={isPaid || isVoid || pending && busyId === a.id}
                        onClick={() => onVoid(a)}
                        className="shrink-0 text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50"
                        style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}
                        title="Void this adjustment (audit-logged)"
                      >
                        {pending && busyId === a.id ? "…" : "Void"}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Voided adjustments */}
          {voidedAdjustments.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>
                Voided history ({voidedAdjustments.length})
              </p>
              <ul className="space-y-1">
                {voidedAdjustments.map((a) => {
                  const meta = KIND_META[a.kind];
                  return (
                    <li
                      key={a.id}
                      className="rounded-md px-3 py-2 text-[11px] flex items-center gap-2 flex-wrap"
                      style={{ background: T.surfaceAlt, color: T.inkFaint }}
                    >
                      <span className="line-through font-bold" style={{ color: meta.fg, opacity: 0.7 }}>
                        {meta.label} {meta.sign}{fmt(a.signedCents)}
                      </span>
                      <span>· {a.description}</span>
                      {a.voidedReason && <span className="italic">· voided: {a.voidedReason}</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 flex items-center justify-end gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-[11.5px] font-black"
            style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className="rounded-lg px-3 py-2" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>
        {label}
      </p>
      <p
        className="mt-0.5 tabular-nums"
        style={{
          color: color ?? T.ink,
          fontSize: bold ? 18 : 15,
          fontWeight: bold ? 900 : 800,
        }}
      >
        {value}
      </p>
    </div>
  );
}
