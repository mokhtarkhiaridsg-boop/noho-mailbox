import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { PrintButton } from "@/app/admin/statements/[id]/PrintButton";
import { priceWithMargin } from "@/lib/label-orders";
import { getTrackingStatus } from "@/lib/shippo";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

export default async function ShippoReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await verifyAdmin();
  const { id } = await params;

  const row = await prisma.shippoLabel.findUnique({
    where: { id },
    include: { user: { select: { name: true, suiteNumber: true, email: true, phone: true } } },
  });
  if (!row) return notFound();

  const isRefunded = row.status === "refunded";

  // Strip the protocol prefix from the tracking URL so it fits in 4" of width.
  const shortTrack = row.trackingUrl?.replace(/^https?:\/\//, "") ?? "";

  // Fetch live carrier tracking on render. Best-effort — if Shippo is down or
  // the carrier hasn't scanned yet, fall through silently.
  const liveTracking = isRefunded
    ? null
    : await getTrackingStatus(row.carrier, row.trackingNumber).catch(() => null);

  // Generate a QR code data URL pointing to the public customer-facing
  // tracking page (`/r/[id]`). Customer scans with their phone after admin
  // hands them the printed thermal receipt → opens branded NOHO tracking.
  const publicOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") ||
    "https://nohomailbox.org";
  const publicReceiptUrl = `${publicOrigin}/r/${row.id}`;
  const qrDataUrl = await QRCode.toDataURL(publicReceiptUrl, {
    width: 180,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#2D100F", light: "#ffffff" },
  }).catch(() => null);
  const liveStatusUpper = (liveTracking?.status ?? "").toUpperCase();
  const liveStatusInfo = (() => {
    if (!liveTracking || !liveStatusUpper) return null;
    if (liveStatusUpper === "DELIVERED") return { bg: "#dcfce7", fg: "#166534", label: "Delivered" };
    if (liveStatusUpper === "TRANSIT") return { bg: "#dbeafe", fg: "#1e40af", label: "In transit" };
    if (liveStatusUpper === "PRE_TRANSIT") return { bg: "#fef3c7", fg: "#92400e", label: "Awaiting pickup" };
    if (liveStatusUpper === "RETURNED" || liveStatusUpper === "FAILURE") return { bg: "#fee2e2", fg: "#991b1b", label: liveStatusUpper === "RETURNED" ? "Returned" : "Failed" };
    return { bg: "#f1f5f9", fg: "#475569", label: liveStatusUpper };
  })();

  return (
    <div
      style={{
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        background: "#efefe9",
        minHeight: "100vh",
        padding: "24px 12px",
        color: "#111",
      }}
    >
      <style>{`
        /* ─── Print: thermal label printer (JADENS 280BT / Zebra ZD420 / Brother / Dymo) ───
           Forces 4 × 6 inch portrait page with zero margins so the printer
           driver maps the content 1:1 to a standard shipping label roll. */
        @page {
          size: 4in 6in;
          margin: 0;
        }
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
            border-radius: 0 !important;
            border: none !important;
            margin: 0 !important;
            width: 4in !important;
            min-height: 6in !important;
            padding: 0.18in !important;
            page-break-after: always;
          }
        }
        /* Screen preview also uses 4×6 aspect so what you see is what prints. */
        .receipt-card {
          width: 4in;
          min-height: 6in;
          margin: 0 auto;
          padding: 0.18in;
          background: white;
          border-radius: 4px;
          border: 1px solid #d8d4ce;
          box-shadow: 0 4px 18px rgba(0,0,0,0.06);
          font-size: 9pt;
          line-height: 1.35;
          color: #111;
        }
      `}</style>

      <div className="no-print" style={{ maxWidth: "4in", margin: "0 auto 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <a href="/admin" style={{ fontSize: 12, color: "#337485", textDecoration: "none", fontWeight: 600 }}>
          ← Admin
        </a>
        <span style={{ fontSize: 10, color: "#888", fontWeight: 600 }}>4×6 thermal label · JADENS / Zebra / Brother</span>
        <PrintButton />
      </div>

      <div className="receipt-card">
        {/* Header — logo + brand band */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, paddingBottom: 6, borderBottom: "1.5px solid #2D100F" }}>
          <Image
            src="/brand/logo-trans.png"
            alt="NOHO Mailbox"
            width={596}
            height={343}
            priority
            style={{ height: 36, width: "auto" }}
          />
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 7.5, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#337485", margin: 0, lineHeight: 1.2 }}>
              Shipping<br />Receipt
            </p>
            {isRefunded && (
              <span style={{ display: "inline-block", marginTop: 3, color: "#b91c1c", border: "1.2px solid #b91c1c", padding: "0 5px", borderRadius: 999, fontSize: 7, fontWeight: 800, letterSpacing: "0.18em" }}>
                REFUNDED
              </span>
            )}
          </div>
        </div>

        {/* Top-line summary */}
        <div style={{ marginTop: 6 }}>
          <p style={{ fontSize: 12, fontWeight: 800, margin: 0, color: "#1a1714", lineHeight: 1.2 }}>
            {row.carrier}
          </p>
          <p style={{ fontSize: 9, fontWeight: 600, margin: "1px 0 0", color: "#444" }}>
            {row.servicelevel}
          </p>
          {(() => {
            // Customer-facing price = wholesale Shippo cost + markup. Same
            // helper as the public /shipping flow so admin walk-in receipts
            // and online orders charge identically.
            const wholesaleCents = Math.round(row.amountPaid * 100);
            const { customerPriceCents, marginCents } = priceWithMargin(wholesaleCents);
            return (
              <>
                <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666", margin: "3px 0 0" }}>
                  Customer pays
                </p>
                <p style={{ fontSize: 18, fontWeight: 900, margin: "1px 0 0", color: "#2D100F", letterSpacing: "-0.01em" }}>
                  ${(customerPriceCents / 100).toFixed(2)}{" "}
                  <span style={{ fontSize: 8, fontWeight: 700, color: "#888" }}>{row.currency}</span>
                </p>
                <p style={{ fontSize: 7.5, color: "#888", margin: "2px 0 0", lineHeight: 1.3 }}>
                  Cost ${row.amountPaid.toFixed(2)} · Margin +${(marginCents / 100).toFixed(2)}
                </p>
              </>
            );
          })()}
          <p style={{ fontSize: 7.5, color: "#888", margin: "2px 0 0", lineHeight: 1.3 }}>
            {row.createdAt.toLocaleString()}
          </p>
        </div>

        {/* Recipient block — most important on a shipping receipt */}
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed #c9c4bc" }}>
          <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666", margin: "0 0 2px" }}>
            Ship to
          </p>
          <p style={{ fontSize: 11, fontWeight: 800, margin: 0, color: "#1a1714", lineHeight: 1.25 }}>
            {row.toName}
          </p>
          <p style={{ fontSize: 9, margin: "1px 0 0", color: "#333", lineHeight: 1.3 }}>
            {row.toStreet}
            <br />
            {row.toCity}, {row.toState} {row.toZip}
          </p>
        </div>

        {/* Sender block */}
        {(row.user?.name || row.user?.email) && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #c9c4bc" }}>
            <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666", margin: "0 0 2px" }}>
              From
            </p>
            <p style={{ fontSize: 9, fontWeight: 700, margin: 0, color: "#1a1714", lineHeight: 1.3 }}>
              {row.user?.name ?? "NOHO Mailbox"}
              {row.user?.suiteNumber && (
                <span style={{ color: "#337485", fontWeight: 700 }}> · Suite #{row.user.suiteNumber}</span>
              )}
            </p>
            <p style={{ fontSize: 8, margin: "1px 0 0", color: "#666", lineHeight: 1.3 }}>
              5062 Lankershim Blvd · North Hollywood, CA 91601
            </p>
          </div>
        )}

        {/* Shipment + tracking */}
        <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #c9c4bc" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
            <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666", margin: "0 0 2px" }}>
              Tracking
            </p>
            {liveStatusInfo && (
              <span
                style={{
                  fontSize: 7.5,
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  background: liveStatusInfo.bg,
                  color: liveStatusInfo.fg,
                  padding: "2px 6px",
                  borderRadius: 4,
                }}
                title={liveTracking?.location ? `${liveStatusInfo.label} · ${liveTracking.location}` : liveStatusInfo.label}
              >
                {liveStatusInfo.label}
              </span>
            )}
          </div>
          <p style={{ fontSize: 10, fontWeight: 700, margin: 0, color: "#1a1714", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", wordBreak: "break-all", lineHeight: 1.3 }}>
            {row.trackingNumber}
          </p>
          {shortTrack && (
            <p style={{ fontSize: 7.5, color: "#337485", margin: "1px 0 0", wordBreak: "break-all", lineHeight: 1.3 }}>
              {shortTrack}
            </p>
          )}
          {liveTracking?.location && (
            <p style={{ fontSize: 7.5, color: "#666", margin: "2px 0 0", lineHeight: 1.3 }}>
              Last seen: {liveTracking.location}
            </p>
          )}
          {liveTracking?.eta && (
            <p style={{ fontSize: 7.5, color: "#666", margin: "1px 0 0", lineHeight: 1.3 }}>
              ETA: {new Date(liveTracking.eta).toLocaleDateString()}
            </p>
          )}
          {liveTracking && liveTracking.trackingHistory && liveTracking.trackingHistory.length > 0 && (
            <div style={{ marginTop: 4, paddingTop: 3, borderTop: "1px dashed #e2dccd" }}>
              {liveTracking.trackingHistory.slice(0, 3).map((h, i) => (
                <div key={i} style={{ fontSize: 7, color: "#444", margin: "1px 0", display: "flex", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ color: "#999", whiteSpace: "nowrap" }}>{h.date ? new Date(h.date).toLocaleDateString() : "—"}</span>
                  <span style={{ flex: 1, marginLeft: 4, textAlign: "right" }}>{h.status}{h.location ? ` · ${h.location}` : ""}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* QR — customer scans the printed thermal receipt to open the
            branded NOHO tracking page on their phone. Big enough that a
            5MP cam locks on instantly under bad indoor light. */}
        {!isRefunded && qrDataUrl && (
          <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px dashed #c9c4bc", textAlign: "center" }}>
            <p style={{ fontSize: 7, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#666", margin: "0 0 4px" }}>
              Scan to track
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="Track this shipment on nohomailbox.org" style={{ width: 110, height: 110, display: "inline-block" }} />
            <p style={{ fontSize: 6.5, color: "#999", margin: "2px 0 0", lineHeight: 1.3, wordBreak: "break-all" }}>
              {publicReceiptUrl.replace(/^https?:\/\//, "")}
            </p>
          </div>
        )}

        {/* Parcel */}
        {(row.lengthIn || row.weightOz) && (
          <div style={{ marginTop: 6, paddingTop: 6, borderTop: "1px dashed #c9c4bc", display: "flex", justifyContent: "space-between", gap: 8, fontSize: 8.5, color: "#444" }}>
            {row.lengthIn && (
              <span>
                <strong style={{ color: "#1a1714" }}>{row.lengthIn} × {row.widthIn} × {row.heightIn}</strong> in
              </span>
            )}
            {row.weightOz && (
              <span>
                <strong style={{ color: "#1a1714" }}>{row.weightOz}</strong> oz
              </span>
            )}
            <span style={{ textTransform: "uppercase", letterSpacing: "0.12em", fontWeight: 700, color: "#337485" }}>
              {row.labelFormat}
            </span>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 8, paddingTop: 6, borderTop: "1px solid #2D100F", fontSize: 6.5, color: "#888", lineHeight: 1.4 }}>
          <p style={{ margin: 0, fontWeight: 700, color: "#2D100F", letterSpacing: "0.1em", textTransform: "uppercase" }}>
            NOHO Mailbox · (818) 506-7744
          </p>
          <p style={{ margin: "1px 0 0", wordBreak: "break-all" }}>
            Receipt {row.id} · TX {row.transactionId}
          </p>
          {row.refundedAt && (
            <p style={{ margin: "1px 0 0", color: "#b91c1c", fontWeight: 700 }}>
              Refunded {row.refundedAt.toLocaleString()}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
