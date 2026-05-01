/**
 * Public tracking router — /track?n=<tracking>
 *
 * Takes any tracking number from the customer-facing tracking widget on
 * /shipping (or pasted directly) and either:
 *   1. Redirects to /r/[id] if the tracking number matches a ShippoLabel
 *      we sold (branded NOHO experience).
 *   2. Auto-detects the carrier from the tracking-number format and shows
 *      a small NOHO-branded card with a "Open on {carrier} →" CTA.
 *   3. Falls back to a friendly "We can't tell which carrier" page when
 *      the format doesn't match anything.
 */

import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Track a shipment · NOHO Mailbox",
  description: "Look up the status of any shipment by its tracking number.",
  robots: { index: false, follow: false },
};

const NOHO_INK = "#2D100F";
const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_CREAM = "#F7E6C2";

// Same heuristics as the admin Track tab. Returns the canonical carrier name +
// a deep-link URL into the carrier's own tracking page.
function detectCarrier(t: string): { carrier: string; url: string } | null {
  const s = t.replace(/\s+/g, "").toUpperCase();
  if (s.startsWith("1Z") && s.length >= 16) {
    return { carrier: "UPS", url: `https://www.ups.com/track?tracknum=${encodeURIComponent(s)}` };
  }
  if (/^9[2-5]\d{20,}/.test(s)) {
    return { carrier: "USPS", url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(s)}` };
  }
  if (/^(EC|EI|HC|RA|RB|RE|RF|RR)/.test(s) && s.length >= 13) {
    return { carrier: "USPS", url: `https://tools.usps.com/go/TrackConfirmAction?tLabels=${encodeURIComponent(s)}` };
  }
  if (/^9612\d/.test(s) && s.length >= 14) {
    return { carrier: "FedEx", url: `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(s)}` };
  }
  if (/^\d{12}$/.test(s) || /^\d{15}$/.test(s)) {
    return { carrier: "FedEx", url: `https://www.fedex.com/fedextrack/?trknbr=${encodeURIComponent(s)}` };
  }
  if (/^\d{10}$/.test(s)) {
    return { carrier: "DHL Express", url: `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(s)}` };
  }
  if (/^JJ?D/.test(s) && s.length >= 10) {
    return { carrier: "DHL Express", url: `https://www.dhl.com/global-en/home/tracking/tracking-express.html?submit=1&tracking-id=${encodeURIComponent(s)}` };
  }
  return null;
}

function CarrierBadge({ carrier }: { carrier: string }) {
  const c = carrier.toLowerCase();
  let bg = "linear-gradient(135deg, #337485, #23596A)";
  let fg = NOHO_CREAM;
  let label = carrier.slice(0, 4).toUpperCase();
  if (c.includes("usps")) { bg = "linear-gradient(135deg, #2D5BA8, #1c3f7a)"; fg = "#fff"; label = "USPS"; }
  else if (c.includes("ups")) { bg = "linear-gradient(135deg, #6B3F1A, #3F2410)"; fg = "#FFC107"; label = "UPS"; }
  else if (c.includes("fedex")) { bg = "linear-gradient(135deg, #4D148C, #2E0A57)"; fg = "#FF6600"; label = "FedEx"; }
  else if (c.includes("dhl")) { bg = "#FFCC00"; fg = "#D40511"; label = "DHL"; }
  return (
    <span style={{ width: 56, height: 56, borderRadius: 14, background: bg, color: fg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 14, letterSpacing: "0.04em", flexShrink: 0 }}>
      {label}
    </span>
  );
}

export default async function PublicTrackingRouter({ searchParams }: { searchParams?: Promise<{ n?: string }> }) {
  const sp = (await searchParams) ?? {};
  const raw = (sp.n ?? "").trim();

  // No input → land on a small "paste tracking number" page.
  if (!raw) {
    return (
      <Frame>
        <p style={{ margin: 0, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: NOHO_BLUE }}>
          Track a shipment
        </p>
        <h1 style={{ margin: "4px 0 0", fontSize: 24, fontWeight: 900, color: NOHO_INK, letterSpacing: "-0.005em" }}>Paste your tracking number</h1>
        <p style={{ margin: "6px 0 14px", fontSize: 12.5, color: "rgba(45,16,15,0.65)" }}>
          Any USPS / UPS / FedEx / DHL number works. We&apos;ll route you to a NOHO-branded receipt if it&apos;s one we shipped, or straight to the carrier&apos;s tracking page otherwise.
        </p>
        <form method="get" action="/track" style={{ display: "flex", gap: 8 }}>
          <input
            type="text"
            name="n"
            placeholder="9400 1118 9922 3397 9812 01"
            autoFocus
            style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(45,16,15,0.18)", fontSize: 14, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: NOHO_INK, background: "white" }}
          />
          <button
            type="submit"
            style={{ padding: "10px 16px", borderRadius: 10, background: NOHO_BLUE, color: "white", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
          >
            Track →
          </button>
        </form>
        <BackToShipping />
      </Frame>
    );
  }

  // 1) Did NOHO ship it? Match by trackingNumber on ShippoLabel.
  const noho = await prisma.shippoLabel.findFirst({
    where: { trackingNumber: raw },
    select: { id: true },
  }).catch(() => null);

  if (noho) {
    redirect(`/r/${noho.id}`);
  }

  // 2) Auto-detect the carrier from format. If we know it, link out.
  const detected = detectCarrier(raw);

  if (detected) {
    return (
      <Frame>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <CarrierBadge carrier={detected.carrier} />
          <div>
            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: NOHO_BLUE }}>
              We didn&apos;t ship this — but we know who did
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 16, fontWeight: 800, color: NOHO_INK }}>{detected.carrier}</p>
            <p style={{ margin: "2px 0 0", fontSize: 11.5, color: "rgba(45,16,15,0.55)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>{raw}</p>
          </div>
        </div>
        <a
          href={detected.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{ display: "inline-block", marginTop: 14, padding: "10px 16px", borderRadius: 10, background: NOHO_BLUE, color: "white", textDecoration: "none", fontWeight: 800, fontSize: 13 }}
        >
          Track on {detected.carrier} →
        </a>
        <p style={{ margin: "12px 0 0", fontSize: 11, color: "rgba(45,16,15,0.45)" }}>
          Need help? Call us at <a href="tel:+18185067744" style={{ color: NOHO_BLUE, textDecoration: "none", fontWeight: 700 }}>(818) 506-7744</a>.
        </p>
        <BackToShipping />
      </Frame>
    );
  }

  // 3) Unknown format — friendly fallback.
  return (
    <Frame>
      <p style={{ margin: 0, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#92400e" }}>
        We can&apos;t tell which carrier
      </p>
      <h1 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, color: NOHO_INK, letterSpacing: "-0.005em" }}>
        That doesn&apos;t look like a USPS / UPS / FedEx / DHL number
      </h1>
      <p style={{ margin: "8px 0 0", fontSize: 12.5, color: "rgba(45,16,15,0.65)" }}>
        Double-check the digits and try again, or call us at{" "}
        <a href="tel:+18185067744" style={{ color: NOHO_BLUE, textDecoration: "none", fontWeight: 700 }}>(818) 506-7744</a>{" "}
        and we&apos;ll look it up for you.
      </p>
      <p style={{ margin: "8px 0 0", fontSize: 11.5, color: "rgba(45,16,15,0.55)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
        You entered: {raw}
      </p>
      <form method="get" action="/track" style={{ marginTop: 14, display: "flex", gap: 8 }}>
        <input
          type="text"
          name="n"
          placeholder="9400 1118 9922 3397 9812 01"
          style={{ flex: 1, padding: "10px 12px", borderRadius: 10, border: "1px solid rgba(45,16,15,0.18)", fontSize: 14, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: NOHO_INK, background: "white" }}
        />
        <button
          type="submit"
          style={{ padding: "10px 16px", borderRadius: 10, background: NOHO_BLUE, color: "white", border: "none", fontWeight: 800, fontSize: 13, cursor: "pointer" }}
        >
          Try again →
        </button>
      </form>
      <BackToShipping />
    </Frame>
  );
}

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        background: "#FAF6F0",
        minHeight: "100vh",
        padding: "20px 14px 60px",
        color: NOHO_INK,
      }}
    >
      <div
        style={{
          maxWidth: 520,
          margin: "0 auto",
          background: "white",
          borderRadius: 16,
          padding: "20px 18px 22px",
          boxShadow: "0 12px 36px rgba(45,16,15,0.10)",
          border: "1px solid rgba(45,16,15,0.08)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 14, borderBottom: "1px solid rgba(45,16,15,0.08)", marginBottom: 14 }}>
          <Image src="/brand/logo-trans.png" alt="NOHO Mailbox" width={56} height={32} style={{ height: 36, width: "auto", objectFit: "contain" }} />
          <div>
            <p style={{ margin: 0, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: NOHO_BLUE }}>
              Tracking
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 700, color: NOHO_INK }}>NOHO Mailbox · NoHo, CA</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}

function BackToShipping() {
  return (
    <p style={{ margin: "16px 0 0", fontSize: 11.5, color: "rgba(45,16,15,0.55)" }}>
      ← <Link href="/shipping" style={{ color: NOHO_BLUE_DEEP, textDecoration: "none", fontWeight: 700 }}>Get a shipping quote instead</Link>
    </p>
  );
}
