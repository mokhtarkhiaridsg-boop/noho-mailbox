/**
 * Printable thermal receipt for an external dropoff (iter-58).
 *
 * Different from the inbound receipt at /admin/inbound/receipt/[id]:
 *   - dropper-offer is NOT one of our customers, so no suite #
 *   - we hold the package until the carrier sweeps; no "pickup" QR
 *   - the receipt is the dropper-offer's only paper trail — they take it home
 *
 * Same 4×6 thermal-ready layout as the inbound receipt so both fit the
 * same printer roll without driver swaps.
 */

import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { PrintButton } from "@/app/admin/statements/[id]/PrintButton";

export const dynamic = "force-dynamic";

export default async function DropoffReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifyAdmin();
  const { id } = await params;

  const row = await prisma.externalDropoff.findUnique({ where: { id } });
  if (!row) return notFound();

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        background: "#efefe9",
        minHeight: "100vh",
        padding: "24px 12px",
        color: "#111",
      }}
    >
      <style>{`
        @page { size: 4in 6in; margin: 0; }
        @media print {
          html, body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          .no-print { display: none !important; }
          .receipt-card {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            padding: 12px 14px !important;
          }
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: "4in", margin: "0 auto 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <a
          href="/admin?tab=shipping"
          style={{ padding: "6px 12px", borderRadius: 8, border: "1px solid #2D100F22", color: "#2D100F", textDecoration: "none", fontWeight: 700, fontSize: 12, background: "#fff" }}
        >
          ← Shipping Center
        </a>
        <PrintButton />
      </div>

      <div
        className="receipt-card"
        style={{
          maxWidth: "4in",
          margin: "0 auto",
          background: "white",
          padding: "16px 18px",
          boxShadow: "0 6px 18px rgba(45,16,15,0.10)",
          border: "1px solid #2D100F1A",
          borderRadius: 6,
        }}
      >
        {/* Header — same brand block as inbound, different label */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingBottom: 8, borderBottom: "2px solid #2D100F" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Image src="/brand/logo-trans.png" alt="NOHO Mailbox" width={56} height={32} style={{ height: 28, width: "auto", objectFit: "contain" }} />
            <div>
              <p style={{ margin: 0, fontSize: 7.5, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#15803d", lineHeight: 1.2 }}>
                Dropoff received
              </p>
              <p style={{ margin: "1px 0 0", fontSize: 9.5, fontWeight: 700, color: "#2D100F" }}>NOHO Mailbox · NoHo, CA</p>
            </div>
          </div>
          <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#666" }}>
            #{row.id.slice(0, 6)}
          </span>
        </div>

        {/* Sender */}
        <div style={{ marginTop: 8 }}>
          <p style={{ margin: 0, fontSize: 6.5, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666" }}>
            Sender
          </p>
          <p style={{ margin: "1px 0 0", fontSize: 14, fontWeight: 900, color: "#2D100F", lineHeight: 1.15 }}>
            {row.senderName ?? "—"}
          </p>
          {row.senderPhone && (
            <p style={{ margin: "1px 0 0", fontSize: 8.5, color: "#444", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
              {row.senderPhone}
            </p>
          )}
        </div>

        {/* Receiver + destination */}
        {(row.receiverName || row.destination) && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #c9c4bc" }}>
            <p style={{ margin: 0, fontSize: 6.5, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666" }}>
              Going to
            </p>
            {row.receiverName && (
              <p style={{ margin: "1px 0 0", fontSize: 11, fontWeight: 800, color: "#2D100F" }}>
                {row.receiverName}
              </p>
            )}
            {row.destination && (
              <p style={{ margin: "1px 0 0", fontSize: 9, color: "#444" }}>
                {row.destination}
              </p>
            )}
          </div>
        )}

        {/* Carrier + tracking */}
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed #c9c4bc" }}>
          <p style={{ margin: 0, fontSize: 6.5, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666" }}>
            Carrier
          </p>
          <p style={{ margin: "1px 0 0", fontSize: 11, fontWeight: 800, color: "#2D100F" }}>{row.carrier}</p>
          <p style={{ margin: "4px 0 0", fontSize: 6.5, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666" }}>
            Tracking
          </p>
          <p
            style={{
              margin: "1px 0 0",
              fontSize: 9.5,
              fontWeight: 700,
              color: "#1a1714",
              fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
              wordBreak: "break-all",
              lineHeight: 1.25,
            }}
          >
            {row.trackingNumber}
          </p>
        </div>

        {/* Date dropped off */}
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed #c9c4bc", display: "flex", justifyContent: "space-between", gap: 6 }}>
          <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#666" }}>Dropped off</span>
          <span style={{ fontSize: 8.5, fontWeight: 700, color: "#2D100F" }}>
            {row.createdAt.toLocaleString()}
          </span>
        </div>

        {row.notes && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #c9c4bc" }}>
            <p style={{ margin: 0, fontSize: 6.5, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666" }}>
              Notes
            </p>
            <p style={{ margin: "1px 0 0", fontSize: 9, color: "#444", whiteSpace: "pre-wrap" }}>
              {row.notes}
            </p>
          </div>
        )}

        {row.exteriorImageUrl && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #c9c4bc", textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.exteriorImageUrl}
              alt="Dropoff exterior"
              style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 4, border: "1px solid #c9c4bc", display: "inline-block" }}
            />
          </div>
        )}

        {/* What happens next */}
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed #c9c4bc", background: "#f0fdf4", borderRadius: 4, padding: "6px 8px" }}>
          <p style={{ margin: 0, fontSize: 7.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#15803d" }}>
            What happens next
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 8.5, color: "#1a1714", lineHeight: 1.35 }}>
            We'll hold this for the {row.carrier} carrier sweep. Track it directly with {row.carrier} using the number above.
          </p>
        </div>

        {/* Footer */}
        <div style={{ marginTop: 10, paddingTop: 6, borderTop: "1px solid #2D100F", fontSize: 6.5, color: "#777", lineHeight: 1.35, textAlign: "center" }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#2D100F", letterSpacing: "0.10em", textTransform: "uppercase" }}>
            5062 Lankershim Blvd · NoHo, CA 91601
          </p>
          <p style={{ margin: "1px 0 0" }}>(818) 506-7744 · nohomailbox.org</p>
        </div>
      </div>
    </div>
  );
}
