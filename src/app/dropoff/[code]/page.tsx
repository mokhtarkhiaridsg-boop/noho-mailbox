// iter-176 — Public printable barcode receipt page.
// `/dropoff/<CODE>` — no auth. Shows the barcode + the metadata the
// member typed at the kiosk, with a print stylesheet that hides chrome
// and centers the receipt on a single sheet.

import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDropoffBarcodeByCode } from "@/app/actions/dropoffBarcode";
import { generateCode128 } from "@/lib/barcode128";
import { formatDropoffCode } from "@/lib/dropoff-barcode";
import PrintButton from "./PrintButton";

export const dynamic = "force-dynamic";

// One-shot tokenized barcode receipt — nothing to index in SERPs.
export const metadata: Metadata = {
  title: "Dropoff receipt",
  description: "Printable barcode receipt for a NOHO Mailbox dropoff.",
  robots: { index: false, follow: false },
};

export default async function DropoffReceiptPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const row = await getDropoffBarcodeByCode({ code });
  if (!row) return notFound();

  // Render the barcode SVG inline so print preview gets it instantly.
  const barcodeSvg = generateCode128(row.code, {
    height: 110, moduleWidth: 2, showText: false, margin: 16,
    foreground: "#000", background: "transparent",
  });
  const claimed = !!row.claimedAtIso;
  const expiresAt = new Date(row.expiresAtIso);
  const expired = expiresAt < new Date();
  const expLabel = expiresAt.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div style={{ minHeight: "100vh", background: "#F8F2EA", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', color: "#2D100F", padding: "32px 16px" }}>
      <style>{`
        @media print {
          @page { size: 4in 6in; margin: 0; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          .receipt, .receipt * { visibility: visible !important; }
          .receipt {
            position: fixed !important;
            left: 0 !important; top: 0 !important;
            width: 4in !important; height: 6in !important;
            margin: 0 !important; padding: 0 !important;
            box-shadow: none !important; border: none !important;
            overflow: hidden !important;
            box-sizing: border-box !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <Link href="/" className="no-print" style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(45,16,15,0.10)", color: "#2D100F", textDecoration: "none", fontWeight: 700, fontSize: 11, marginBottom: 12 }}>
          ← NOHO Mailbox
        </Link>

        {claimed && (
          <div className="no-print" style={{ marginBottom: 14, padding: "12px 16px", background: "rgba(34,197,94,0.10)", border: "1px solid rgba(34,197,94,0.40)", borderRadius: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#15803d" }}>
              ✓ Already dropped off. This barcode was claimed at {new Date(row.claimedAtIso!).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}.
            </p>
          </div>
        )}
        {expired && !claimed && (
          <div className="no-print" style={{ marginBottom: 14, padding: "12px 16px", background: "rgba(239,68,68,0.10)", border: "1px solid rgba(239,68,68,0.40)", borderRadius: 12 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: "#b91c1c" }}>
              ⚠️ This code expired on {expLabel}. <Link href="/dropoff" style={{ color: "#b91c1c" }}>Generate a new one →</Link>
            </p>
          </div>
        )}

        <div className="receipt" style={{
          background: "white",
          width: "4in", height: "6in", margin: "0 auto",
          border: "1px solid rgba(45,16,15,0.15)", borderRadius: 12,
          padding: "0.30in",
          boxSizing: "border-box",
          display: "flex", flexDirection: "column",
          boxShadow: "0 6px 18px rgba(45,16,15,0.10)",
        }}>
          {/* Header: brand + identity */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "1pt solid #2D100F", paddingBottom: "0.10in" }}>
            <div>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "#23596A" }}>
                NOHO Mailbox · Dropoff
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 11, fontWeight: 700, color: "#2D100F" }}>
                5062 Lankershim Blvd · NoHo, CA
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>
                Suite
              </p>
              <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: "#2D100F", lineHeight: 1 }}>
                #{row.suiteNumber}
              </p>
            </div>
          </div>

          {/* Sender + tracking */}
          <div style={{ marginTop: "0.10in" }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 900, letterSpacing: "0.14em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>
              From
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 900, color: "#2D100F" }}>
              {row.expectedSender}
            </p>
            {(row.expectedCarrier || row.expectedTracking) && (
              <p style={{ margin: "4px 0 0", fontSize: 11, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#23596A" }}>
                {row.expectedCarrier ? `${row.expectedCarrier} · ` : ""}{row.expectedTracking ?? ""}
              </p>
            )}
          </div>

          {row.notes && (
            <p style={{ margin: "0.10in 0 0", fontSize: 10, fontStyle: "italic", color: "rgba(45,16,15,0.65)", borderLeft: "2pt solid #337485", paddingLeft: 6, lineHeight: 1.4 }}>
              📝 {row.notes}
            </p>
          )}

          {/* Barcode block — flex grow + center */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", marginTop: "0.12in" }}>
            <div style={{ width: "3.4in", maxWidth: "100%" }} dangerouslySetInnerHTML={{ __html: barcodeSvg.replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;" ').replace(/\swidth="\d+"\s/, " ").replace(/\sheight="\d+"\s/, " ") }} />
            <p style={{ margin: "0.06in 0 0", fontSize: 17, fontWeight: 900, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", letterSpacing: "0.10em", color: "#2D100F" }}>
              {formatDropoffCode(row.code)}
            </p>
          </div>

          {/* Footer */}
          <div style={{ marginTop: "0.10in", paddingTop: "0.08in", borderTop: "1pt solid rgba(45,16,15,0.15)" }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: "rgba(45,16,15,0.65)", textAlign: "center", lineHeight: 1.4 }}>
              Show at the front desk — we scan once + you're done.<br />
              Expires {expLabel}.
            </p>
          </div>
        </div>

        <PrintButton />
      </div>
    </div>
  );
}
