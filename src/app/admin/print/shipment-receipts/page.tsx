/**
 * iter-212 — Printable 1×1in QR-sticker sheet (Tier 15 #121).
 *
 * Bulk-prints a sheet of 1"×1" stickers, one per recent ShipmentReceipt,
 * in Avery 22806 layout (12 per page, 4 cols × 3 rows). Each sticker
 * has the NOHO logo + a 0.7"×0.7" QR + the reference token.
 */

import QRCode from "qrcode";
import { listShipmentReceipts, ensureReceiptsForRecentLabels } from "@/app/actions/shipmentReceipt";
import AutoPrint from "../insurance-claim/[id]/AutoPrint";

export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function PrintShipmentReceiptsPage({ searchParams }: Props) {
  const sp = await searchParams;
  const ensure = sp.ensure === "1" || sp.ensure === "true";
  if (ensure) {
    await ensureReceiptsForRecentLabels({ sinceDays: 30 });
  }
  const limit = Math.min(60, parseInt(typeof sp.limit === "string" ? sp.limit : "24", 10) || 24);
  const receipts = await listShipmentReceipts({ limit });

  const labels = await Promise.all(receipts.map(async (r) => ({
    token: r.verifyToken,
    sender: r.senderDisplay,
    qr: await QRCode.toDataURL(r.receiptUrl, { width: 110, margin: 0, errorCorrectionLevel: "M" }),
  })));

  return (
    <main style={S.page}>
      <AutoPrint />
      <header style={S.banner} className="print-hide">
        <div>
          <p style={S.bannerEyebrow}>📄 Shipment QR stickers · Print-to-PDF</p>
          <p style={S.bannerSub}>1"×1" stickers · 12 per Letter page (Avery 22806). Use <code>?ensure=1</code> to first auto-create receipts for any recent ShippoLabel that doesn&apos;t have one.</p>
        </div>
        <a href="/admin?tab=shipreceipts" style={S.bannerBack}>← Back</a>
      </header>

      {labels.length === 0 ? (
        <div style={S.emptyCard}>
          <p style={S.emptyEyebrow}>No receipts yet</p>
          <p style={S.emptyMsg}>
            Add <code style={S.code}>?ensure=1</code> to the URL to auto-create receipts for the last 30 days of ShippoLabel rows, then reload.
          </p>
        </div>
      ) : (
        <div style={S.sheet}>
          {labels.map((l) => (
            <div key={l.token} style={S.label}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={l.qr} alt={`QR ${l.token}`} style={S.labelQr} />
              <div style={S.labelText}>
                <p style={S.labelEyebrow}>NOHO Mailbox</p>
                <p style={S.labelToken}>{l.token}</p>
                <p style={S.labelHint}>Scan to verify</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <style>{`
        @media print {
          .print-hide { display: none !important; }
          @page { size: Letter; margin: 0.5in 0.16in 0.5in 0.16in; }
          body { background: white !important; }
        }
      `}</style>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  page: { background: "#F4F5F7", minHeight: "100vh", padding: "24px 16px", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' },
  banner: { display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, maxWidth: 720, margin: "0 auto 16px", padding: "12px 18px", background: "white", borderRadius: 12, border: "1px solid #ECEEF1" },
  bannerEyebrow: { margin: 0, fontSize: 12, fontWeight: 800, color: "#0F5BD9" },
  bannerSub: { margin: "4px 0 0", fontSize: 12, color: "rgba(0,0,0,0.65)" },
  bannerBack: { fontSize: 11, fontWeight: 800, padding: "6px 12px", background: "#F4F5F7", color: "#3B4252", border: "1px solid #ECEEF1", borderRadius: 8, textDecoration: "none", whiteSpace: "nowrap" },
  emptyCard: { background: "white", borderRadius: 12, padding: "24px", maxWidth: 460, margin: "40px auto", textAlign: "center", border: "1px solid #ECEEF1" },
  emptyEyebrow: { margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "#7A8290" },
  emptyMsg: { margin: "8px 0 0", fontSize: 13, color: "rgba(0,0,0,0.65)", lineHeight: 1.5 },
  code: { fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", padding: "1px 5px", background: "#F4F5F7", borderRadius: 4, color: "#1F2937", fontSize: 12 },
  sheet: { background: "white", maxWidth: 720, margin: "0 auto", padding: "24px 18px", borderRadius: 6, boxShadow: "0 8px 28px rgba(0,0,0,0.08)", border: "1px solid #ECEEF1", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 },
  label: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 4, border: "1px dashed #d1d5db", borderRadius: 4, height: 96, gap: 2 },
  labelQr: { width: 56, height: 56 },
  labelText: { textAlign: "center" },
  labelEyebrow: { margin: 0, fontSize: 7, fontWeight: 800, letterSpacing: ".14em", textTransform: "uppercase", color: "#7A8290", lineHeight: 1 },
  labelToken: { margin: "1px 0 0", fontSize: 9, fontWeight: 800, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", letterSpacing: ".05em", color: "#1F2937", lineHeight: 1 },
  labelHint: { margin: "1px 0 0", fontSize: 6.5, color: "#7A8290", lineHeight: 1 },
};
