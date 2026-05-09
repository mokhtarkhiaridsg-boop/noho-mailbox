/**
 * iter-155 — 80mm thermal receipt printer route (Tier 9 #65).
 *
 * Auto-printing receipt page sized for Star Micronics / Epson narrow
 * thermal receipt printers (80mm = 3.15in wide). Distinct from the
 * existing 4×6 LABEL printers (Jadens) — those use width: 4in.
 *
 * Two kinds today, easy to add more:
 *   - intake  · prints when admin scans a new package at intake
 *   - pickup  · prints when admin marks a package Picked Up
 *
 * URL shape: /admin/print/thermal/{kind}/{mailItemId}
 *
 * Page auto-fires window.print() on load (via the AutoPrint client
 * component) so the OS dialog appears with the admin's pre-selected
 * receipt printer. Admin can also reprint via the Print button.
 */

import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import AutoPrint from "./AutoPrint";

export const dynamic = "force-dynamic";

const VALID_KINDS = new Set(["intake", "pickup"]);

export default async function ThermalReceiptPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  await verifyAdmin();
  const { kind, id } = await params;
  if (!VALID_KINDS.has(kind)) return notFound();

  const item = await prisma.mailItem.findUnique({
    where: { id },
    include: { user: { select: { name: true, suiteNumber: true, email: true, phone: true } } },
  });
  if (!item) return notFound();

  const publicOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    process.env.AUTH_URL?.replace(/\/+$/, "") ||
    "https://nohomailbox.org";
  const qrTarget = `${publicOrigin}/dashboard?tab=packages`;
  const qrDataUrl = await QRCode.toDataURL(qrTarget, {
    width: 130,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#000", light: "#fff" },
  }).catch(() => null);

  const at = new Date();
  const stamp = at.toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const ref = item.id.slice(-6).toUpperCase();

  const heading =
    kind === "pickup" ? "PICKUP RECEIPT"
    : "INTAKE RECEIPT";

  return (
    <main
      style={{
        // 80mm = 3.15in wide. Width here drives the on-screen preview;
        // print CSS clamps to @page size below.
        width: "3.0in",
        margin: "0 auto",
        padding: "0.16in 0.18in",
        fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
        color: "#000",
        background: "white",
        fontSize: "10.5px",
        lineHeight: 1.45,
      }}
    >
      {/* Print CSS — single page, no margins, no chrome. */}
      <style>{`
        @page { size: 80mm auto; margin: 0; }
        @media print {
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
        }
      `}</style>

      {/* Page-level controls — hidden in print */}
      <div className="no-print" style={{ display: "flex", gap: 6, marginBottom: 10, justifyContent: "center" }}>
        <a href="/admin" style={{ padding: "5px 10px", borderRadius: 6, background: "#f4f5f7", color: "#1A1D23", fontWeight: 700, textDecoration: "none", fontSize: 11 }}>
          ← Admin
        </a>
        <button onClick={() => { if (typeof window !== "undefined") window.print(); }}
          style={{ padding: "5px 10px", borderRadius: 6, background: "#337485", color: "white", fontWeight: 700, fontSize: 11, border: "none", cursor: "pointer" }}>
          Reprint
        </button>
      </div>

      {/* Auto-fire print dialog on first load. */}
      <AutoPrint />

      {/* Brand header */}
      <div style={{ textAlign: "center", borderBottom: "2px dashed #000", paddingBottom: "0.10in", marginBottom: "0.10in" }}>
        <p style={{ margin: 0, fontSize: 16, fontWeight: 900, letterSpacing: "0.04em" }}>NOHO MAILBOX</p>
        <p style={{ margin: "2px 0 0", fontSize: 9, fontWeight: 600 }}>5062 Lankershim Blvd</p>
        <p style={{ margin: 0, fontSize: 9, fontWeight: 600 }}>North Hollywood, CA 91601</p>
        <p style={{ margin: "3px 0 0", fontSize: 9 }}>(818) 506-7744 · nohomailbox.org</p>
      </div>

      {/* Receipt heading */}
      <div style={{ textAlign: "center", marginBottom: "0.10in" }}>
        <p style={{ margin: 0, fontSize: 12, fontWeight: 900, letterSpacing: "0.16em" }}>{heading}</p>
        <p style={{ margin: "2px 0 0", fontSize: 9 }}>{stamp}</p>
        <p style={{ margin: 0, fontSize: 9 }}>Ref · {ref}</p>
      </div>

      {/* Customer block */}
      <Section label="Customer">
        <Row label="Name" value={item.user?.name ?? "—"} />
        <Row label="Suite" value={item.user?.suiteNumber ? `#${item.user.suiteNumber}` : "—"} />
        {item.user?.phone && <Row label="Phone" value={item.user.phone} />}
      </Section>

      {/* Package block */}
      <Section label="Package">
        <Row label="From" value={item.from} />
        {item.recipientName && item.recipientName !== item.user?.name && (
          <Row label="Recipient" value={item.recipientName} />
        )}
        {item.carrier && <Row label="Carrier" value={item.carrier} />}
        {item.trackingNumber && (
          <Row label="Tracking" value={item.trackingNumber} mono />
        )}
        {item.weightOz != null && (
          <Row label="Weight" value={`${(item.weightOz / 16).toFixed(2)} lb (${item.weightOz} oz)`} />
        )}
        {item.dimensions && <Row label="Dim" value={item.dimensions} />}
      </Section>

      {/* Status / fee block (pickup only) */}
      {kind === "pickup" && item.feeChargedCents != null && item.feeChargedCents > 0 && (
        <Section label="Storage fee">
          <Row label="Total" value={`$${(item.feeChargedCents / 100).toFixed(2)}`} bold />
          <p style={{ margin: "4px 0 0", fontSize: 8.5, fontStyle: "italic", color: "#444" }}>
            Charged at pickup per Terms of Service.
          </p>
        </Section>
      )}

      {/* Pickup-specific signature block */}
      {kind === "pickup" && item.pickupSignerName && (
        <Section label="Signed for by">
          <p style={{ margin: 0, fontSize: 11, fontWeight: 800 }}>{item.pickupSignerName}</p>
          {item.pickupSignedAt && (
            <p style={{ margin: 0, fontSize: 8.5 }}>
              {new Date(item.pickupSignedAt).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" })}
            </p>
          )}
        </Section>
      )}

      {/* QR + footer */}
      <div style={{ textAlign: "center", marginTop: "0.10in", paddingTop: "0.10in", borderTop: "2px dashed #000" }}>
        {qrDataUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img src={qrDataUrl} alt="" style={{ width: "1.05in", height: "1.05in", display: "block", margin: "0 auto" }} />
        )}
        <p style={{ margin: "4px 0 0", fontSize: 8.5, fontWeight: 700 }}>
          Scan to view in your dashboard
        </p>
        <p style={{ margin: "8px 0 0", fontSize: 9.5, fontWeight: 800, letterSpacing: "0.06em" }}>
          {kind === "pickup" ? "THANK YOU — STOP IN ANYTIME" : "WE'LL HOLD IT FOR YOU"}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 8 }}>nohomailbox.org · (818) 506-7744</p>
        <p style={{ margin: "10px 0 0", fontSize: 8, color: "#444" }}>· · · · · · · · · ·</p>
      </div>
    </main>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "0.10in", paddingBottom: "0.06in", borderBottom: "1px dotted #888" }}>
      <p style={{ margin: 0, fontSize: 8.5, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", color: "#666" }}>
        {label}
      </p>
      <div style={{ marginTop: "0.04in" }}>{children}</div>
    </div>
  );
}

function Row({ label, value, mono = false, bold = false }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.10in", marginBottom: "0.02in" }}>
      <span style={{ fontSize: 9, color: "#444" }}>{label}</span>
      <span style={{
        fontSize: bold ? 12 : 10,
        fontWeight: bold ? 900 : 600,
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace" : undefined,
        textAlign: "right",
        wordBreak: "break-word",
      }}>{value}</span>
    </div>
  );
}
