"use client";

/**
 * Admin Invoice Builder — modal that lets admin compose a custom invoice
 * with line items (any of which can be hidden from the customer view),
 * tax rate, invoice-level discount, and send / record-payment / print
 * actions. Shares design tokens with AdminCashRegister + AdminOverviewPanel.
 *
 * Shape mirrors `InvoiceMeta` from src/lib/invoice-builder.ts. All math
 * happens in lib helpers so server + client agree on totals.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  computeInvoiceTotals,
  emptyMeta,
  newLine,
  DEFAULT_TAX_RATE,
  type InvoiceLine,
  type InvoiceMeta,
} from "@/lib/invoice-builder";
import {
  createCustomInvoice,
  updateCustomInvoice,
  sendInvoiceByEmail,
  recordInvoicePayment,
  voidInvoice,
} from "@/app/actions/invoice-builder";
import { searchPOSCustomers } from "@/app/actions/pos";
import InvoiceAdjustmentsModal from "./InvoiceAdjustmentsModal";

const T = {
  bg: "#FAF7F2",
  surface: "#FFFFFF",
  surfaceAlt: "#F4EEE3",
  border: "#E5DACA",
  ink: "#1A1614",
  inkSoft: "#5C4540",
  inkFaint: "#998877",
  accent: "#2D100F",
  accentDeep: "#1F0807",
  blue: "#337485",
  success: "#16A34A",
  danger: "#B91C1C",
  warning: "#B07030",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace";
const TAB_NUM: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: "'tnum' 1",
  fontFamily: MONO,
};
const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// ─── Public component ────────────────────────────────────────────────────

type Props = {
  /** Pass in to edit an existing invoice. Omit to compose a fresh one. */
  invoiceId?: string;
  initialMeta?: InvoiceMeta;
  initialDescription?: string;
  initialUserId?: string | null;
  onClose: () => void;
  onSaved?: (id: string, number: string) => void;
};

export default function AdminInvoiceBuilder({
  invoiceId,
  initialMeta,
  initialDescription,
  initialUserId,
  onClose,
  onSaved,
}: Props) {
  const [meta, setMeta] = useState<InvoiceMeta>(() =>
    initialMeta ?? { ...emptyMeta(), lines: [newLine()] },
  );
  const [description, setDescription] = useState(initialDescription ?? "Custom invoice");
  const [userId, setUserId] = useState<string | null>(initialUserId ?? null);
  const [customerLabel, setCustomerLabel] = useState<string>("");
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [savedId, setSavedId] = useState<string | null>(invoiceId ?? null);
  const [savedNumber, setSavedNumber] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ tone: "ok" | "err"; text: string } | null>(null);
  // iter-138 — open the adjustments modal for a saved invoice. Local
  // state because the modal handles its own data fetching.
  const [showAdjustments, setShowAdjustments] = useState(false);

  const totals = useMemo(() => computeInvoiceTotals(meta), [meta]);
  const lineCount = meta.lines.length;
  const visibleLineCount = meta.lines.filter((l) => !l.hidden).length;

  // ─── State helpers ────────────────────────────────────────────────
  function patchLine(id: string, patch: Partial<InvoiceLine>) {
    setMeta((m) => ({
      ...m,
      lines: m.lines.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    }));
  }
  function addLine() {
    setMeta((m) => ({ ...m, lines: [...m.lines, newLine()] }));
  }
  function removeLine(id: string) {
    setMeta((m) => ({ ...m, lines: m.lines.filter((l) => l.id !== id) }));
  }
  function patchMeta<K extends keyof InvoiceMeta>(key: K, value: InvoiceMeta[K]) {
    setMeta((m) => ({ ...m, [key]: value }));
  }

  // ─── Save (create or update) ──────────────────────────────────────
  function save(after?: "send" | "payment" | "print") {
    setMsg(null);
    startTransition(async () => {
      let id = savedId;
      let num = savedNumber;
      if (!id) {
        const res = await createCustomInvoice({
          userId: userId ?? undefined,
          description,
          meta,
        });
        if ("error" in res) {
          setMsg({ tone: "err", text: res.error });
          return;
        }
        id = res.invoiceId;
        num = res.number;
        setSavedId(id);
        setSavedNumber(num);
        onSaved?.(id, num);
      } else {
        const res = await updateCustomInvoice({ invoiceId: id, description, meta });
        if ("error" in res) {
          setMsg({ tone: "err", text: res.error });
          return;
        }
      }

      if (after === "send") {
        const r = await sendInvoiceByEmail({ invoiceId: id });
        setMsg(
          "error" in r
            ? { tone: "err", text: r.error }
            : { tone: "ok", text: "Saved + emailed to recipient." },
        );
      } else if (after === "print") {
        // Open print page in a new tab so admin keeps the builder open.
        window.open(`/admin/invoice/${id}?print=1`, "_blank");
        setMsg({ tone: "ok", text: "Saved. Print dialog opened in a new tab." });
      } else {
        setMsg({ tone: "ok", text: num ? `Saved as ${num}` : "Saved." });
      }
    });
  }

  // ─── Record payment ───────────────────────────────────────────────
  const [showPayment, setShowPayment] = useState(false);
  const [paidVia, setPaidVia] = useState<"Cash" | "Square" | "Zelle" | "Check" | "Wire" | "Other">("Cash");
  const [paidRef, setPaidRef] = useState("");
  function recordPayment() {
    if (!savedId) {
      setMsg({ tone: "err", text: "Save the invoice first." });
      return;
    }
    setMsg(null);
    startTransition(async () => {
      const r = await recordInvoicePayment({ invoiceId: savedId, paidVia, paidRef });
      if ("error" in r) setMsg({ tone: "err", text: r.error });
      else {
        setMsg({ tone: "ok", text: `✓ Marked paid via ${paidVia}.` });
        setShowPayment(false);
      }
    });
  }

  // ─── Void ─────────────────────────────────────────────────────────
  function doVoid() {
    if (!savedId) return;
    if (!window.confirm("Void this invoice? This can't be undone.")) return;
    startTransition(async () => {
      const r = await voidInvoice(savedId);
      if ("error" in r) setMsg({ tone: "err", text: r.error });
      else {
        setMsg({ tone: "ok", text: "Voided." });
        onClose();
      }
    });
  }

  // ─── Esc to close ─────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[120] flex items-start justify-center pt-[6vh] px-3 pb-3 overflow-y-auto"
      style={{ background: "rgba(26,22,20,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Invoice builder"
    >
      <div
        className="w-full max-w-3xl rounded-md overflow-hidden"
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          boxShadow: "0 16px 48px rgba(26,22,20,0.24)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* ─── Header ────────────────────────────────────────────── */}
        <div
          className="flex items-center justify-between px-5 h-12"
          style={{ background: T.surfaceAlt, borderBottom: `1px solid ${T.border}` }}
        >
          <div className="flex items-center gap-3 min-w-0">
            <h2 className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: T.ink }}>
              {savedId ? "Edit invoice" : "New invoice"}
            </h2>
            {savedNumber && (
              <span className="text-[11px]" style={{ color: T.inkFaint, ...TAB_NUM }}>
                {savedNumber}
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-7 h-7 text-[14px]" style={{ color: T.inkFaint }}>
            ✕
          </button>
        </div>

        {/* ─── Recipient ────────────────────────────────────────── */}
        <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <FieldLabel>Customer (optional)</FieldLabel>
            {userId && customerLabel ? (
              <div
                className="flex items-center justify-between gap-2 px-3 h-10 rounded-md text-[13px]"
                style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }}
              >
                <span className="truncate">{customerLabel}</span>
                <button
                  onClick={() => {
                    setUserId(null);
                    setCustomerLabel("");
                  }}
                  className="text-[11px] font-bold"
                  style={{ color: T.inkFaint }}
                >
                  Remove
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowCustomerSearch(true)}
                className="w-full h-10 px-3 rounded-md text-left text-[13px]"
                style={{
                  background: "transparent",
                  border: `1px dashed ${T.border}`,
                  color: T.inkSoft,
                }}
              >
                + Attach customer
              </button>
            )}
          </div>
          <div>
            <FieldLabel>Recipient name (override)</FieldLabel>
            <input
              type="text"
              value={meta.recipientName ?? ""}
              onChange={(e) => patchMeta("recipientName", e.target.value)}
              placeholder={customerLabel || "Walk-in / one-off"}
              className="w-full h-10 px-3 rounded-md text-[13px] focus:outline-none"
              style={inputStyle()}
            />
          </div>
          <div>
            <FieldLabel>Recipient email (override)</FieldLabel>
            <input
              type="email"
              value={meta.recipientEmail ?? ""}
              onChange={(e) => patchMeta("recipientEmail", e.target.value)}
              placeholder="email for sending"
              className="w-full h-10 px-3 rounded-md text-[13px] focus:outline-none"
              style={inputStyle()}
            />
          </div>
          <div>
            <FieldLabel>Memo / kind label</FieldLabel>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-10 px-3 rounded-md text-[13px] focus:outline-none"
              style={inputStyle()}
            />
          </div>
        </div>

        {/* ─── Lines ─────────────────────────────────────────────── */}
        <div className="px-5 py-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] font-bold uppercase tracking-[0.16em]" style={{ color: T.inkSoft }}>
              Line items
            </p>
            <p className="text-[11px]" style={{ color: T.inkFaint }}>
              {visibleLineCount} visible · {lineCount - visibleLineCount} hidden
            </p>
          </div>

          <div
            className="rounded-md overflow-hidden"
            style={{ border: `1px solid ${T.border}`, background: T.surface }}
          >
            <div
              className="grid grid-cols-[1fr_60px_90px_90px_30px] items-center gap-2 px-3 h-9"
              style={{ background: T.surfaceAlt, borderBottom: `1px solid ${T.border}` }}
            >
              <Th>Description</Th>
              <Th align="center">Qty</Th>
              <Th align="right">Unit</Th>
              <Th align="right">Total</Th>
              <Th />
            </div>
            <ul>
              {meta.lines.map((l) => {
                const lineGross = Math.round(l.qty * l.unitPriceCents);
                const lineNet = lineGross - (l.discountCents ?? 0);
                return (
                  <li
                    key={l.id}
                    className="grid grid-cols-[1fr_60px_90px_90px_30px] items-center gap-2 px-3 py-2"
                    style={{
                      borderTop: `1px solid ${T.border}`,
                      background: l.hidden ? T.surfaceAlt : "transparent",
                      opacity: l.hidden ? 0.7 : 1,
                    }}
                  >
                    <div className="min-w-0">
                      <input
                        value={l.description}
                        onChange={(e) => patchLine(l.id, { description: e.target.value })}
                        placeholder="What is this charge?"
                        className="w-full h-8 px-2 rounded text-[13px] focus:outline-none"
                        style={inputStyle()}
                      />
                      <div className="flex items-center gap-3 mt-1.5 text-[10px]" style={{ color: T.inkFaint }}>
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={!!l.hidden}
                            onChange={(e) => patchLine(l.id, { hidden: e.target.checked })}
                            className="w-3 h-3"
                          />
                          Hide from customer
                        </label>
                        <label className="inline-flex items-center gap-1 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={l.taxable !== false}
                            onChange={(e) => patchLine(l.id, { taxable: e.target.checked })}
                            className="w-3 h-3"
                          />
                          Taxable
                        </label>
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={(l.discountCents ?? 0) / 100 || ""}
                          onChange={(e) => patchLine(l.id, { discountCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                          placeholder="$ disc"
                          className="w-16 h-5 px-1 rounded text-[10px] focus:outline-none"
                          style={{ ...inputStyle(), ...TAB_NUM }}
                        />
                      </div>
                    </div>
                    <input
                      type="number"
                      min={0}
                      step="0.5"
                      value={l.qty || ""}
                      onChange={(e) => patchLine(l.id, { qty: parseFloat(e.target.value || "0") })}
                      className="h-8 px-1 rounded text-[13px] text-center focus:outline-none"
                      style={{ ...inputStyle(), ...TAB_NUM }}
                    />
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={l.unitPriceCents / 100 || ""}
                      onChange={(e) => patchLine(l.id, { unitPriceCents: Math.round(parseFloat(e.target.value || "0") * 100) })}
                      className="h-8 px-2 rounded text-[13px] text-right focus:outline-none"
                      style={{ ...inputStyle(), ...TAB_NUM }}
                    />
                    <span className="text-[13px] font-bold text-right" style={{ ...TAB_NUM, color: T.ink }}>
                      {fmt(lineNet)}
                    </span>
                    <button
                      onClick={() => removeLine(l.id)}
                      className="w-6 h-6 text-[12px] mx-auto"
                      style={{ color: T.inkFaint }}
                      aria-label="Remove line"
                    >
                      ✕
                    </button>
                  </li>
                );
              })}
            </ul>
            <button
              onClick={addLine}
              className="w-full h-9 text-[11px] font-bold uppercase tracking-[0.06em]"
              style={{
                background: "transparent",
                color: T.inkSoft,
                borderTop: `1px dashed ${T.border}`,
              }}
            >
              + Add line
            </button>
          </div>
        </div>

        {/* ─── Tax + Discount + Notes ──────────────────────────── */}
        <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <FieldLabel>Tax rate</FieldLabel>
            <select
              value={String(meta.taxRate ?? DEFAULT_TAX_RATE)}
              onChange={(e) => patchMeta("taxRate", parseFloat(e.target.value))}
              className="w-full h-10 px-2 rounded-md text-[13px] focus:outline-none"
              style={inputStyle()}
            >
              <option value="0">No tax (0%)</option>
              <option value="0.0925">9.25%</option>
              <option value="0.095">9.50% · LA</option>
              <option value="0.0975">9.75%</option>
              <option value="0.105">10.50%</option>
            </select>
          </div>
          <div>
            <FieldLabel>Invoice discount ($)</FieldLabel>
            <input
              type="number"
              min={0}
              step="0.01"
              value={(meta.invoiceDiscountCents ?? 0) / 100 || ""}
              onChange={(e) => patchMeta("invoiceDiscountCents", Math.round(parseFloat(e.target.value || "0") * 100))}
              placeholder="0.00"
              className="w-full h-10 px-3 rounded-md text-[13px] focus:outline-none"
              style={{ ...inputStyle(), ...TAB_NUM }}
            />
          </div>
          <div>
            <FieldLabel>Notes (printed)</FieldLabel>
            <input
              type="text"
              value={meta.notes ?? ""}
              onChange={(e) => patchMeta("notes", e.target.value)}
              placeholder="Thank you, etc."
              className="w-full h-10 px-3 rounded-md text-[13px] focus:outline-none"
              style={inputStyle()}
            />
          </div>
        </div>

        {/* ─── Totals ───────────────────────────────────────────── */}
        <div
          className="px-5 py-4"
          style={{ borderTop: `1px solid ${T.border}`, background: T.surfaceAlt }}
        >
          <div className="ml-auto max-w-xs">
            <Row label="Subtotal" value={fmt(totals.subtotalVisible)} />
            {totals.subtotalHidden > 0 && (
              <Row label="Hidden subtotal" value={fmt(totals.subtotalHidden)} mute />
            )}
            {totals.discount > 0 && <Row label="Discount" value={`−${fmt(totals.discount)}`} negative />}
            {totals.tax > 0 && <Row label="Tax" value={fmt(totals.tax)} mute />}
            <div
              className="flex items-center justify-between pt-2 mt-2"
              style={{ borderTop: `1px solid ${T.border}` }}
            >
              <span className="text-[12px] font-bold uppercase tracking-[0.10em]" style={{ color: T.ink }}>
                Total
              </span>
              <span className="text-[20px] font-bold" style={{ ...TAB_NUM, color: T.ink }}>
                {fmt(totals.total)}
              </span>
            </div>
          </div>
        </div>

        {/* ─── Footer actions ───────────────────────────────────── */}
        <div
          className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap"
          style={{ borderTop: `1px solid ${T.border}`, background: T.surface }}
        >
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => save()}
              disabled={pending}
              className="h-9 px-3 rounded-md text-[11px] font-bold uppercase tracking-[0.06em] disabled:opacity-50"
              style={{ background: T.surface, color: T.ink, border: `1px solid ${T.border}` }}
            >
              {savedId ? "Save changes" : "Save draft"}
            </button>
            <button
              onClick={() => save("send")}
              disabled={pending}
              className="h-9 px-3 rounded-md text-[11px] font-bold uppercase tracking-[0.06em] disabled:opacity-50"
              style={{ background: T.surface, color: T.ink, border: `1px solid ${T.border}` }}
            >
              Save + Email
            </button>
            <button
              onClick={() => save("print")}
              disabled={pending}
              className="h-9 px-3 rounded-md text-[11px] font-bold uppercase tracking-[0.06em] disabled:opacity-50"
              style={{ background: T.surface, color: T.ink, border: `1px solid ${T.border}` }}
            >
              Save + Print
            </button>
            <button
              onClick={() => setShowPayment(true)}
              disabled={pending}
              className="h-9 px-3 rounded-md text-[11px] font-bold uppercase tracking-[0.06em] disabled:opacity-50"
              style={{
                background: T.ink,
                color: "#FFFFFF",
                border: "none",
              }}
            >
              Record payment
            </button>
            {savedId && (
              <button
                onClick={() => setShowAdjustments(true)}
                disabled={pending}
                className="h-9 px-3 rounded-md text-[11px] font-bold uppercase tracking-[0.06em] disabled:opacity-50"
                style={{
                  background: "transparent",
                  color: T.blue,
                  border: `1px solid rgba(51,116,133,0.30)`,
                }}
                title="Apply discount, waiver, or surcharge with reason"
              >
                Adjust
                {(meta.adjustments?.filter((a) => !a.voidedAt).length ?? 0) > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full text-[9px] font-black"
                    style={{ background: T.blue, color: "white" }}>
                    {meta.adjustments!.filter((a) => !a.voidedAt).length}
                  </span>
                )}
              </button>
            )}
            {savedId && (
              <button
                onClick={doVoid}
                disabled={pending}
                className="h-9 px-3 rounded-md text-[11px] font-bold uppercase tracking-[0.06em] disabled:opacity-50"
                style={{ background: "transparent", color: T.danger, border: `1px solid rgba(185,28,28,0.30)` }}
              >
                Void
              </button>
            )}
          </div>
          {msg && (
            <p
              className="text-[12px] font-bold"
              style={{ color: msg.tone === "ok" ? T.success : T.danger }}
            >
              {msg.text}
            </p>
          )}
        </div>
      </div>

      {/* ─── Customer search modal ────────────────────────────── */}
      {showCustomerSearch && (
        <CustomerSearchModal
          onClose={() => setShowCustomerSearch(false)}
          onPick={(c) => {
            setUserId(c.id);
            setCustomerLabel(`${c.name} · ${c.email}`.trim());
            setMeta((m) => ({
              ...m,
              recipientName: m.recipientName || c.name,
              recipientEmail: m.recipientEmail || c.email,
            }));
            setShowCustomerSearch(false);
          }}
        />
      )}

      {/* ─── Payment modal ────────────────────────────────────── */}
      {showPayment && (
        <Modal title="Record payment" onClose={() => setShowPayment(false)}>
          <p className="text-[13px] mb-3" style={{ color: T.inkSoft }}>
            How was this paid?
          </p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {(["Cash", "Square", "Zelle", "Check", "Wire", "Other"] as const).map((m) => {
              const active = paidVia === m;
              return (
                <button
                  key={m}
                  onClick={() => setPaidVia(m)}
                  className="h-9 rounded-md text-[11px] font-bold uppercase tracking-[0.06em]"
                  style={
                    active
                      ? { background: T.ink, color: "#FFFFFF", border: "none" }
                      : { background: T.surface, color: T.ink, border: `1px solid ${T.border}` }
                  }
                >
                  {m}
                </button>
              );
            })}
          </div>
          <FieldLabel>Reference (optional)</FieldLabel>
          <input
            value={paidRef}
            onChange={(e) => setPaidRef(e.target.value)}
            placeholder="Square txn id, check #, last 4, …"
            className="w-full h-10 px-3 rounded-md text-[13px] focus:outline-none mb-4"
            style={inputStyle()}
          />
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => setShowPayment(false)}
              className="h-9 px-3 rounded-md text-[11px] font-bold uppercase tracking-[0.06em]"
              style={{ background: T.surface, color: T.ink, border: `1px solid ${T.border}` }}
            >
              Cancel
            </button>
            <button
              onClick={recordPayment}
              disabled={pending}
              className="h-9 px-3 rounded-md text-[11px] font-bold uppercase tracking-[0.06em] disabled:opacity-50"
              style={{
                background: T.ink,
                color: "#FFFFFF",
              }}
            >
              {pending ? "Saving…" : "Mark paid"}
            </button>
          </div>
        </Modal>
      )}

      {/* iter-138 — Adjustments modal. The modal handles its own data
          fetching via listInvoiceAdjustments; we just give it the id +
          customer label. On close, refresh the local meta from the
          server (next save will pick up the latest adjustments). */}
      {showAdjustments && savedId && (
        <InvoiceAdjustmentsModal
          invoiceId={savedId}
          invoiceNumber={savedNumber ?? "(unsaved)"}
          invoiceStatus="Sent"
          customerName={customerLabel || "Customer"}
          onClose={() => setShowAdjustments(false)}
          onChanged={() => setMsg({ tone: "ok", text: "Adjustment saved + audit-logged" })}
        />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function Row({
  label,
  value,
  mute,
  negative,
}: {
  label: string;
  value: string;
  mute?: boolean;
  negative?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[12px]" style={{ color: mute ? T.inkFaint : T.inkSoft }}>
        {label}
      </span>
      <span
        className="text-[13px] font-bold"
        style={{
          ...TAB_NUM,
          color: negative ? T.danger : mute ? T.inkSoft : T.ink,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[10px] font-bold uppercase tracking-[0.12em] mb-1"
      style={{ color: T.inkFaint }}
    >
      {children}
    </p>
  );
}

function Th({
  children,
  align = "left",
}: {
  children?: React.ReactNode;
  align?: "left" | "center" | "right";
}) {
  return (
    <span
      className="text-[10px] font-bold uppercase tracking-[0.12em]"
      style={{ color: T.inkSoft, textAlign: align }}
    >
      {children}
    </span>
  );
}

function inputStyle(): React.CSSProperties {
  return {
    background: T.surface,
    border: `1px solid ${T.border}`,
    color: T.ink,
  };
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      style={{ background: "rgba(26,22,20,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-md overflow-hidden"
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          boxShadow: "0 16px 48px rgba(26,22,20,0.24)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 h-11"
          style={{ borderBottom: `1px solid ${T.border}` }}
        >
          <h3 className="text-[12px] font-bold uppercase tracking-[0.16em]" style={{ color: T.ink }}>
            {title}
          </h3>
          <button onClick={onClose} className="w-6 h-6 text-[14px]" style={{ color: T.inkFaint }}>
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function CustomerSearchModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (c: { id: string; name: string; email: string }) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; email: string; suiteNumber: string | null }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchPOSCustomers(q.trim());
        setResults(r.map((x) => ({ id: x.id, name: x.name, email: x.email, suiteNumber: x.suiteNumber })));
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <Modal title="Attach customer" onClose={onClose}>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, email, suite #…"
        className="w-full h-10 px-3 rounded-md text-sm focus:outline-none mb-3"
        style={inputStyle()}
      />
      {loading && (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>
          Searching…
        </p>
      )}
      {!loading && q.trim().length < 2 && (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>
          Type at least 2 characters.
        </p>
      )}
      {!loading && q.trim().length >= 2 && results.length === 0 && (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>
          No matches.
        </p>
      )}
      {results.length > 0 && (
        <ul className="divide-y max-h-72 overflow-y-auto" style={{ borderColor: T.border }}>
          {results.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onPick(c)}
                className="w-full text-left py-2.5 flex items-center justify-between gap-3 hover:bg-[#F4EEE3] rounded"
              >
                <div className="min-w-0 px-2">
                  <p className="text-[13px] font-bold truncate" style={{ color: T.ink }}>
                    {c.name}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: T.inkFaint }}>
                    {c.email}
                    {c.suiteNumber ? ` · Suite #${c.suiteNumber}` : ""}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}
