"use client";

// iter-124 — Thermal label printer (Jadens-friendly 4×6).
//
// Admin pastes/scans a tracking number → we lookup the MailItem +
// customer record → render a brand-styled, print-ready 4×6 label and
// trigger window.print() on demand. Print CSS sets `@page size: 4in 6in`
// so a Jadens (or any 4×6 thermal) outputs cleanly with no margins.

import { useEffect, useRef, useState, useTransition } from "react";
import { findLabelByTracking, type LabelData } from "@/app/actions/labelPrinter";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";
const NOHO_CREAM_DEEP = "#F0DBA9";

export default function AdminLabelPrinterPanel() {
  const [tracking, setTracking] = useState("");
  const [label, setLabel] = useState<LabelData | null>(null);
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function lookup(e?: React.FormEvent) {
    e?.preventDefault();
    setErr(null);
    if (!tracking.trim()) { setErr("Enter a tracking number"); return; }
    startTransition(async () => {
      const res = await findLabelByTracking({ tracking });
      if (res.error) { setErr(res.error); setLabel(null); return; }
      setLabel(res.label ?? null);
    });
  }

  function clear() {
    setTracking(""); setLabel(null); setErr(null); inputRef.current?.focus();
  }

  function print() {
    if (typeof window === "undefined") return;
    window.print();
  }

  // Auto-focus the tracking input on mount + after print.
  useEffect(() => { inputRef.current?.focus(); }, []);

  return (
    <div className="space-y-4">
      {/* Print stylesheet — applied only when window.print() runs. Kicks
          out the chrome and forces 4×6 page geometry. */}
      <style jsx global>{`
        @media print {
          @page { size: 4in 6in; margin: 0; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; }
          body * { visibility: hidden !important; }
          .label-print-area, .label-print-area * { visibility: visible !important; }
          .label-print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 4in !important;
            height: 6in !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: none !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print">
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          Operations · Label printer
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Thermal label printer</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
          Paste or scan a tracking #. We'll auto-fill from the package record and render a NOHO-branded 4×6 label. Hit Print → your Jadens (or any 4×6 thermal) outputs it.
        </p>
      </div>

      {/* Lookup row */}
      <form onSubmit={lookup} className="no-print rounded-2xl bg-white border p-4" style={{ borderColor: "#e8e5e0" }}>
        <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
          Tracking number
        </label>
        <div className="mt-1 flex items-stretch gap-2">
          <input
            ref={inputRef}
            type="text"
            value={tracking}
            onChange={(e) => setTracking(e.target.value)}
            placeholder="Scan or paste · e.g. 1Z999AA10123456784"
            autoComplete="off"
            spellCheck={false}
            className="flex-1 rounded-xl border px-4 py-3 text-lg font-mono"
            style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }}
          />
          <button type="submit" disabled={pending}
            className="px-5 py-3 rounded-xl text-white font-black text-[13px] disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}>
            {pending ? "Looking up…" : "Lookup →"}
          </button>
          {label && (
            <button type="button" onClick={clear}
              className="px-3 py-3 rounded-xl text-[12px] font-bold border"
              style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
              Clear
            </button>
          )}
        </div>
        {err && (
          <p className="mt-2 rounded-md px-3 py-1.5 text-[11.5px] font-bold" style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>
            {err}
          </p>
        )}
      </form>

      {/* Label preview + print bar */}
      {label && (
        <>
          <div className="no-print rounded-2xl bg-white border p-4 flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: "#e8e5e0" }}>
            <div className="min-w-0">
              <p className="text-[12.5px] font-black truncate" style={{ color: NOHO_INK }}>
                ✓ Found · {label.customerName}
                {label.suiteNumber && (
                  <span className="ml-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                    Suite #{label.suiteNumber}
                  </span>
                )}
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                {label.carrier ?? "Pkg"} · {label.trackingNumber} · intake {label.intakeDate}
              </p>
            </div>
            <button type="button" onClick={print}
              className="px-5 py-2.5 rounded-xl text-white font-black text-[13px]"
              style={{ background: "linear-gradient(135deg,#16A34A,#15803d)" }}>
              🖨 Print 4×6 label
            </button>
          </div>

          {/* The label itself — visible-only when printing, but we render
              it on screen too as a preview at scale-down zoom. */}
          <div className="no-print">
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "rgba(45,16,15,0.55)" }}>
              Preview · 4 × 6 inches @ 100%
            </p>
            <div style={{ overflow: "auto" }}>
              <div style={{ transform: "scale(0.85)", transformOrigin: "top left", width: "fit-content" }}>
                <Label data={label} />
              </div>
            </div>
          </div>

          {/* The actual print payload — full 1:1 size, hidden on screen. */}
          <div style={{ position: "absolute", left: -9999, top: 0 }}>
            <Label data={label} className="label-print-area" />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Label component ────────────────────────────────────────────────────
// Sized at 4×6 inches. Cream background. NOHO logo top-center, then
// addressed-to block, then a giant tracking row, then the QR + intake
// metadata. Brand colors are inline so print stylesheets can't strip them.

function Label({ data, className }: { data: LabelData; className?: string }) {
  return (
    <div
      className={className}
      style={{
        width: "4in",
        height: "6in",
        background: NOHO_CREAM,
        color: NOHO_INK,
        padding: "0.18in",
        boxSizing: "border-box",
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif",
        display: "flex",
        flexDirection: "column",
        gap: "0.10in",
        border: `2px solid ${NOHO_BLUE_DEEP}`,
        borderRadius: "0.10in",
        boxShadow: "0 4px 18px rgba(45,16,15,0.10)",
      }}
    >
      {/* Header — NOHO logo + suite chip */}
      <header style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: "0.06in", borderBottom: `2px dashed ${NOHO_BLUE_DEEP}` }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-trans.png" alt="NOHO Mailbox" style={{ height: "0.55in", width: "auto" }} />
        {data.suiteNumber && (
          <div style={{
            background: NOHO_BLUE_DEEP, color: NOHO_CREAM,
            fontWeight: 900, fontSize: "0.22in", letterSpacing: "0.01em",
            padding: "0.05in 0.12in", borderRadius: "0.06in",
            textAlign: "right",
            fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          }}>
            #{data.suiteNumber}
          </div>
        )}
      </header>

      {/* Addressed-to block */}
      <section style={{ display: "flex", flexDirection: "column", gap: "0.02in" }}>
        <p style={{ margin: 0, fontSize: "0.10in", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
          Addressed to
        </p>
        <p style={{ margin: 0, fontSize: "0.22in", fontWeight: 900, lineHeight: 1.15, letterSpacing: "-0.005em" }}>
          {data.recipientName ?? data.customerName}
        </p>
        {data.recipientName && data.recipientName !== data.customerName && (
          <p style={{ margin: 0, fontSize: "0.11in", fontWeight: 700, color: "rgba(45,16,15,0.65)" }}>
            c/o {data.customerName}
          </p>
        )}
        <p style={{ margin: "0.02in 0 0", fontSize: "0.10in", color: "rgba(45,16,15,0.55)" }}>
          5062 Lankershim Blvd · NoHo, CA 91601
        </p>
      </section>

      {/* Tracking — gigantic */}
      <section style={{
        background: "white",
        border: `1px solid ${NOHO_CREAM_DEEP}`,
        borderRadius: "0.06in",
        padding: "0.08in 0.10in",
        display: "flex", flexDirection: "column", gap: "0.02in",
      }}>
        <p style={{ margin: 0, fontSize: "0.09in", fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
          {data.carrier ?? "Carrier"} · Tracking
        </p>
        <p style={{
          margin: 0, fontSize: "0.18in", fontWeight: 900, lineHeight: 1.05,
          fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
          letterSpacing: "0.01em", wordBreak: "break-all",
        }}>
          {data.trackingNumber}
        </p>
      </section>

      {/* QR + metadata grid */}
      <section style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.10in", alignItems: "center", flex: 1 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.06in", fontSize: "0.10in", lineHeight: 1.3 }}>
          <Row label="Intake" value={data.intakeDate} />
          <Row label="Label #" value={data.labelNumber} mono />
          {data.weightOz != null && <Row label="Weight" value={`${data.weightOz} oz`} />}
          {data.dimensions && <Row label="Dimensions" value={data.dimensions} />}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.04in" }}>
          {data.qrDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={data.qrDataUrl} alt="QR" style={{ width: "1.2in", height: "1.2in" }} />
          ) : (
            <div style={{ width: "1.2in", height: "1.2in", background: "white", border: `1px dashed ${NOHO_BLUE_DEEP}` }} />
          )}
          <p style={{ margin: 0, fontSize: "0.08in", fontWeight: 700, color: NOHO_BLUE_DEEP }}>
            Scan to look up
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer style={{
        marginTop: "auto", paddingTop: "0.06in",
        borderTop: `2px dashed ${NOHO_BLUE_DEEP}`,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        fontSize: "0.09in",
      }}>
        <span style={{ fontWeight: 800, color: NOHO_INK }}>nohomailbox.org</span>
        <span style={{ color: "rgba(45,16,15,0.55)" }}>(818) 506-7744</span>
      </footer>
    </div>
  );
}

function Row({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: "0.06in" }}>
      <span style={{
        fontSize: "0.08in", fontWeight: 800, letterSpacing: "0.16em",
        textTransform: "uppercase", color: NOHO_BLUE_DEEP, minWidth: "0.65in",
      }}>
        {label}
      </span>
      <span style={{
        fontSize: "0.10in", fontWeight: 700,
        fontFamily: mono ? "ui-monospace, 'SF Mono', Menlo, monospace" : undefined,
        color: NOHO_INK,
      }}>
        {value}
      </span>
    </div>
  );
}
