// iter-212 — Public shipment receipt page (Tier 15 #121).
//
// Recipients scan the 1×1in QR sticker on their NOHO-Mailbox-shipped
// package and land here. Verifies the package came from the bureau,
// shows blurred recipient name + carrier + tracking + sent-from
// suite. Public, no auth — privacy is preserved by only blurring
// recipient name and never exposing sender's email/phone.

import Link from "next/link";
import { getShipmentReceiptByToken } from "@/app/actions/shipmentReceipt";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props) {
  const { token } = await params;
  return {
    // `absolute` to avoid root template doubling: "Shipment receipt · NOHO Mailbox | NOHO Mailbox".
    title: { absolute: `Shipment receipt · NOHO Mailbox` },
    description: `Verify a package shipped from NOHO Mailbox. Reference ${token}.`,
  };
}

export default async function ReceiptPage({ params }: Props) {
  const { token } = await params;
  const r = await getShipmentReceiptByToken({ token });

  if (!r.ok) {
    return (
      <main style={S.root}>
        <article style={S.card}>
          <p style={S.eyebrow}>Receipt not found</p>
          <h1 style={S.h1}>This QR isn&apos;t in our system</h1>
          <p style={S.sub}>
            The reference <code style={S.code}>{token}</code> doesn&apos;t match any shipment we&apos;ve sent.
            If you&apos;re unsure about a package, contact us at <a href="tel:+18185067744" style={S.link}>(818) 506-7744</a>.
          </p>
          <Link href="/" style={S.btn}>NOHO Mailbox home →</Link>
        </article>
      </main>
    );
  }

  const shippedDate = new Date(r.shippedAtIso).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const trackingHref = r.trackingNumber && r.carrier === "USPS"
    ? `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${encodeURIComponent(r.trackingNumber)}`
    : r.trackingNumber && r.carrier === "UPS"
    ? `https://www.ups.com/track?tracknum=${encodeURIComponent(r.trackingNumber)}`
    : r.trackingNumber && r.carrier === "FedEx"
    ? `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(r.trackingNumber)}`
    : r.trackingNumber && r.carrier === "DHL"
    ? `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(r.trackingNumber)}`
    : null;

  return (
    <main style={S.root}>
      <article style={S.card}>
        <div style={S.greenBadge}>
          <span style={{ fontSize: 24 }}>✓</span>
          <p style={S.greenText}>VERIFIED · Shipped from NOHO Mailbox</p>
        </div>

        <p style={S.eyebrow}>📦 Shipment receipt</p>
        <h1 style={S.h1}>This package is real.</h1>
        <p style={S.sub}>
          A NOHO Mailbox member shipped this to you on <strong>{shippedDate}</strong>. Below is everything we can share without violating sender or recipient privacy.
        </p>

        <div style={S.factGrid}>
          <KV label="Sent by" value={r.senderDisplay} />
          <KV label="Sent to" value={r.recipientDisplay} sub="(privacy-blurred)" />
          <KV label="From" value={r.shippedFrom} mono />
          {r.carrier && <KV label="Carrier" value={r.carrier} />}
          {r.trackingNumber && <KV label="Tracking #" value={r.trackingNumber} mono />}
          <KV label="Reference" value={r.verifyToken} mono />
        </div>

        {trackingHref && (
          <a href={trackingHref} target="_blank" rel="noopener noreferrer" style={S.btn}>
            Track package with {r.carrier} ↗
          </a>
        )}

        <hr style={S.divider} />

        <p style={S.aboutEyebrow}>About NOHO Mailbox</p>
        <p style={S.about}>
          NOHO Mailbox is a CMRA-licensed virtual mailbox in North Hollywood, CA. Members receive packages at our suite and forward them to recipients like you. The QR sticker on this package proves the shipment came through us — not a phishing label.
        </p>
        <p style={S.foot}>
          📍 5062 Lankershim Blvd, North Hollywood, CA 91601 · ☎️ <a href="tel:+18185067744" style={S.link}>(818) 506-7744</a>
        </p>
        <p style={S.scanFoot}>
          Scanned {r.scanCount === 1 ? "once" : `${r.scanCount.toLocaleString()} times`} · Reference {r.verifyToken}
        </p>
      </article>
    </main>
  );
}

function KV({ label, value, sub, mono }: { label: string; value: string; sub?: string; mono?: boolean }) {
  return (
    <div style={S.kv}>
      <p style={S.kvLabel}>{label}</p>
      <p style={{ ...S.kvValue, fontFamily: mono ? "ui-monospace, 'SF Mono', Menlo, monospace" : undefined }}>{value}</p>
      {sub && <p style={S.kvSub}>{sub}</p>}
    </div>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "linear-gradient(160deg, #F8F2EA 0%, #F7E6C2 60%, #F0DBA9 100%)", color: "#2D100F", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', display: "flex", alignItems: "flex-start", justifyContent: "center", padding: "32px 16px" },
  card: { background: "white", borderRadius: 20, border: "1px solid #E8DDD0", padding: "28px 32px", maxWidth: 520, width: "100%", boxShadow: "0 12px 48px rgba(45,16,15,0.10)" },
  greenBadge: { display: "flex", alignItems: "center", gap: 10, background: "rgba(34,197,94,0.10)", padding: "10px 14px", borderRadius: 999, marginBottom: 20, color: "#15803d", border: "1px solid rgba(34,197,94,0.30)" },
  greenText: { margin: 0, fontSize: 11, fontWeight: 900, letterSpacing: ".18em", textTransform: "uppercase" },
  eyebrow: { margin: 0, fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "#23596A" },
  h1: { margin: "6px 0 6px", fontSize: 28, fontWeight: 900, letterSpacing: "-.5px" },
  sub: { margin: "0 0 18px", fontSize: 14, color: "rgba(45,16,15,0.65)", lineHeight: 1.5 },
  factGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, margin: "16px 0" },
  kv: { background: "#F4F5F7", borderRadius: 8, padding: "10px 12px" },
  kvLabel: { margin: 0, fontSize: 9.5, fontWeight: 800, letterSpacing: ".16em", textTransform: "uppercase", color: "#7A8290" },
  kvValue: { margin: "3px 0 0", fontSize: 13, fontWeight: 700, color: "#1A1D23", overflowWrap: "anywhere" },
  kvSub: { margin: "2px 0 0", fontSize: 10, color: "#7A8290", fontStyle: "italic" },
  btn: { display: "inline-block", marginTop: 8, padding: "11px 22px", background: "#337485", color: "white", textDecoration: "none", borderRadius: 10, fontWeight: 900, fontSize: 13 },
  divider: { border: 0, borderTop: "1px dashed #E8DDD0", margin: "22px 0 14px" },
  aboutEyebrow: { margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" },
  about: { margin: "6px 0 16px", fontSize: 12.5, color: "rgba(45,16,15,0.70)", lineHeight: 1.55 },
  foot: { margin: "0 0 8px", fontSize: 11, color: "rgba(45,16,15,0.55)" },
  scanFoot: { margin: 0, fontSize: 10, color: "rgba(45,16,15,0.40)", textAlign: "center" },
  link: { color: "#23596A", fontWeight: 700 },
  code: { fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", padding: "1px 5px", background: "#F4F5F7", borderRadius: 4, color: "#1F2937" },
};
