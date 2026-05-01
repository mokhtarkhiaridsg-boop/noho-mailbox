/**
 * Printable thermal receipt for a scanned inbound package.
 *
 * 4×6 thermal-ready layout matching the existing label receipt
 * (`/admin/shippo/receipt/[id]`). Admin clicks "Print" after scanning a
 * package → this page opens in a new tab → admin's thermal printer (Jadens,
 * Zebra, Brother, Dymo) prints a stub the customer can pick up with.
 *
 * Includes a QR code linking to /track or the member's dashboard so the
 * customer can self-serve.
 */

import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { PrintButton } from "@/app/admin/statements/[id]/PrintButton";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export default async function InboundReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifyAdmin();
  const { id } = await params;

  const row = await prisma.mailItem.findUnique({
    where: { id },
    include: { user: { select: { name: true, suiteNumber: true, email: true, phone: true } } },
  });
  if (!row) return notFound();

  // QR points to the customer's dashboard, which has the Mail tab + the
  // arrived item ready for them. They scan from the printed stub and
  // self-serve.
  const publicOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") ||
    "https://nohomailbox.org";
  const qrTarget = `${publicOrigin}/dashboard?tab=packages`;
  const qrDataUrl = await QRCode.toDataURL(qrTarget, {
    width: 180,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#2D100F", light: "#ffffff" },
  }).catch(() => null);

  // Strip the protocol prefix from any tracking-style URL for display.
  const trackingShort = row.trackingNumber ?? "—";

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
        /* Thermal label printer — 4 × 6 portrait, zero margins so the
           printer driver maps content 1:1 to a standard shipping label roll. */
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

      {/* Toolbar */}
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
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, paddingBottom: 8, borderBottom: "2px solid #2D100F" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Image src="/brand/logo-trans.png" alt="NOHO Mailbox" width={56} height={32} style={{ height: 28, width: "auto", objectFit: "contain" }} />
            <div>
              <p style={{ margin: 0, fontSize: 7.5, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#337485", lineHeight: 1.2 }}>
                Package received
              </p>
              <p style={{ margin: "1px 0 0", fontSize: 9.5, fontWeight: 700, color: "#2D100F" }}>NOHO Mailbox · NoHo, CA</p>
            </div>
          </div>
          <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#666" }}>
            #{row.id.slice(0, 6)}
          </span>
        </div>

        {/* Recipient */}
        <div style={{ marginTop: 8 }}>
          <p style={{ margin: 0, fontSize: 6.5, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666" }}>
            Recipient
          </p>
          <p style={{ margin: "1px 0 0", fontSize: 14, fontWeight: 900, color: "#2D100F", lineHeight: 1.15 }}>
            {row.user?.name ?? row.recipientName ?? "—"}
          </p>
          {row.user?.suiteNumber && (
            <p style={{ margin: "1px 0 0", fontSize: 22, fontWeight: 900, color: "#337485", letterSpacing: "-0.01em", lineHeight: 1.05 }}>
              Suite #{row.user.suiteNumber}
            </p>
          )}
          {row.recipientName && row.user?.name && row.recipientName !== row.user.name && (
            <p style={{ margin: "1px 0 0", fontSize: 8, color: "#666" }}>
              Addressed to: <strong style={{ color: "#2D100F" }}>{row.recipientName}</strong>
            </p>
          )}
        </div>

        {/* Carrier + tracking */}
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed #c9c4bc" }}>
          <p style={{ margin: 0, fontSize: 6.5, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666" }}>
            Carrier
          </p>
          <p style={{ margin: "1px 0 0", fontSize: 11, fontWeight: 800, color: "#2D100F" }}>{row.carrier ?? row.from}</p>
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
            {trackingShort}
          </p>
        </div>

        {/* Date */}
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed #c9c4bc", display: "flex", justifyContent: "space-between", gap: 6 }}>
          <span style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#666" }}>Received</span>
          <span style={{ fontSize: 8.5, fontWeight: 700, color: "#2D100F" }}>
            {row.createdAt.toLocaleString()}
          </span>
        </div>

        {/* Optional intake details — only render when admin captured them */}
        {(row.weightOz != null || row.dimensions) && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #c9c4bc", display: "flex", justifyContent: "space-between", gap: 6, fontSize: 8.5, color: "#444" }}>
            {row.weightOz != null && (
              <span>
                <strong style={{ color: "#1a1714" }}>{(row.weightOz / 16).toFixed(2)} lb</strong>{" "}
                <span style={{ color: "#888" }}>({row.weightOz.toFixed(0)} oz)</span>
              </span>
            )}
            {row.dimensions && (
              <span>
                <strong style={{ color: "#1a1714" }}>{row.dimensions}</strong>
              </span>
            )}
          </div>
        )}

        {/* Exterior photo — shows the customer this is their package. */}
        {row.exteriorImageUrl && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #c9c4bc", textAlign: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={row.exteriorImageUrl}
              alt="Package exterior"
              style={{ maxWidth: "100%", maxHeight: 180, borderRadius: 4, border: "1px solid #c9c4bc", display: "inline-block" }}
            />
          </div>
        )}

        {/* QR */}
        {qrDataUrl && (
          <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed #c9c4bc", textAlign: "center" }}>
            <p style={{ margin: "0 0 3px", fontSize: 6.5, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666" }}>
              Pickup details on your phone
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="View pickup details" style={{ width: 88, height: 88, display: "inline-block" }} />
            <p style={{ margin: "2px 0 0", fontSize: 6, color: "#888", lineHeight: 1.25 }}>
              {qrTarget.replace(/^https?:\/\//, "")}
            </p>
          </div>
        )}

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
