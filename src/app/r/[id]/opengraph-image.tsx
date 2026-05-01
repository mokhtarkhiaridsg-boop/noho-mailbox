/**
 * Per-receipt Open Graph image — 1200×630 NOHO-branded card with carrier
 * glyph + recipient + tracking number + status. Rendered server-side via
 * Next.js `ImageResponse` (no headless browser, just a layout engine).
 *
 * Customer shares /r/[id] in iMessage / WhatsApp / Slack → preview shows
 * this card, not a generic site logo.
 */

import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const contentType = "image/png";
export const size = { width: 1200, height: 630 };
export const alt = "NOHO Mailbox shipment tracking receipt";

const NOHO_INK = "#2D100F";
const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_CREAM = "#F7E6C2";

function carrierStyle(carrier: string): { bg: string; fg: string; label: string } {
  const c = carrier.toLowerCase();
  if (c.includes("usps")) return { bg: "#1c3f7a", fg: "#fff", label: "USPS" };
  if (c.includes("ups")) return { bg: "#3F2410", fg: "#FFC107", label: "UPS" };
  if (c.includes("fedex")) return { bg: "#2E0A57", fg: "#FF6600", label: "FedEx" };
  if (c.includes("dhl")) return { bg: "#FFCC00", fg: "#D40511", label: "DHL" };
  return { bg: NOHO_BLUE_DEEP, fg: NOHO_CREAM, label: carrier.slice(0, 4).toUpperCase() };
}

export default async function OgImage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const row = id && id.length >= 6
    ? await prisma.shippoLabel.findUnique({
        where: { id },
        select: { carrier: true, servicelevel: true, trackingNumber: true, toName: true, toCity: true, toState: true, status: true },
      }).catch(() => null)
    : null;

  // Fallback card when the receipt is missing — keeps social previews from
  // showing a 404-looking card.
  if (!row) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: NOHO_CREAM,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui",
            color: NOHO_INK,
          }}
        >
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: NOHO_BLUE }}>NOHO Mailbox</div>
          <div style={{ fontSize: 64, fontWeight: 900, marginTop: 16 }}>Tracking</div>
          <div style={{ fontSize: 24, marginTop: 12, color: "rgba(45,16,15,0.65)" }}>5062 Lankershim Blvd · NoHo, CA</div>
        </div>
      ),
      { ...size },
    );
  }

  const isRefunded = row.status === "refunded";
  const cs = carrierStyle(row.carrier);
  const dest = [row.toCity, row.toState].filter(Boolean).join(", ");

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: NOHO_CREAM,
          display: "flex",
          flexDirection: "column",
          fontFamily: "system-ui",
          color: NOHO_INK,
          position: "relative",
        }}
      >
        {/* Brand bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "32px 56px 24px",
            borderBottom: `2px solid ${NOHO_INK}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: NOHO_BLUE }}>NOHO Mailbox</div>
            <div style={{ fontSize: 14, color: "rgba(45,16,15,0.55)" }}>· NoHo, CA · (818) 506-7744</div>
          </div>
          <div
            style={{
              padding: "8px 18px",
              borderRadius: 999,
              background: isRefunded ? "#fee2e2" : NOHO_BLUE,
              color: isRefunded ? "#991b1b" : "#fff",
              fontWeight: 800,
              fontSize: 14,
              letterSpacing: "0.2em",
              textTransform: "uppercase",
            }}
          >
            {isRefunded ? "Refunded" : "Tracking"}
          </div>
        </div>

        {/* Body */}
        <div style={{ display: "flex", flex: 1, padding: "40px 56px", gap: 40 }}>
          {/* Carrier glyph */}
          <div
            style={{
              width: 220,
              height: 220,
              borderRadius: 32,
              background: cs.bg,
              color: cs.fg,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 56,
              fontWeight: 900,
              letterSpacing: "0.04em",
              flexShrink: 0,
              boxShadow: "0 12px 40px rgba(45,16,15,0.20)",
            }}
          >
            {cs.label}
          </div>

          {/* Recipient + tracking */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: NOHO_BLUE }}>
              Going to
            </div>
            <div style={{ fontSize: 64, fontWeight: 900, lineHeight: 1.05, letterSpacing: "-0.01em", color: NOHO_INK, marginTop: 4 }}>
              {row.toName}
            </div>
            <div style={{ fontSize: 30, color: "rgba(45,16,15,0.65)", marginTop: 4 }}>{dest}</div>
            <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 6 }}>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(45,16,15,0.50)" }}>
                {row.carrier} {row.servicelevel}
              </div>
              <div style={{ fontSize: 28, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: NOHO_BLUE_DEEP, fontWeight: 700 }}>
                {row.trackingNumber}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            padding: "20px 56px 28px",
            background: NOHO_INK,
            color: NOHO_CREAM,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 700 }}>nohomailbox.org/track</div>
          <div style={{ fontSize: 14, color: "rgba(247,230,194,0.65)" }}>5062 Lankershim Blvd · North Hollywood, CA 91601</div>
        </div>
      </div>
    ),
    { ...size },
  );
}
