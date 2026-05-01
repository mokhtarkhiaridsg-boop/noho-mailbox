/**
 * Public tracking receipt — /r/[id]
 *
 * Customer-facing branded tracking page. Karim texts the customer one URL
 * (e.g. https://nohomailbox.org/r/abc123…) and they get a NOHO-branded
 * tracking page with live carrier status — no admin auth needed.
 *
 * Privacy: shows the recipient's name + city/state/zip + tracking number,
 * but NOT the wholesale Shippo cost or admin's margin. The cuid id is
 * unguessable (~120 bits) so the link is a soft access token by itself.
 */

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getTrackingStatus } from "@/lib/shippo";
import PublicShareButton from "@/components/PublicShareButton";
import AutoRefresh from "@/components/AutoRefresh";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// Per-shipment metadata so social shares (iMessage, WhatsApp, Slack, Discord)
// preview the carrier + recipient + branded NOHO card instead of a generic
// fallback. Indexers stay blocked — these are personal receipts, not content.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length < 6) {
    return {
      title: "NOHO Mailbox · Tracking",
      description: "Track your shipment from NOHO Mailbox.",
      robots: { index: false, follow: false },
    };
  }
  const row = await prisma.shippoLabel.findUnique({
    where: { id },
    select: { carrier: true, servicelevel: true, toName: true, toCity: true, toState: true, status: true },
  }).catch(() => null);
  if (!row) {
    return {
      title: "NOHO Mailbox · Tracking",
      description: "Track your shipment from NOHO Mailbox.",
      robots: { index: false, follow: false },
    };
  }
  const dest = [row.toCity, row.toState].filter(Boolean).join(", ");
  const isRefunded = row.status === "refunded";
  const title = isRefunded
    ? `Refunded · ${row.carrier} shipment to ${row.toName} — NOHO Mailbox`
    : `${row.carrier} ${row.servicelevel} to ${row.toName} — NOHO Mailbox`;
  const description = isRefunded
    ? `Refunded ${row.carrier} ${row.servicelevel} shipment to ${dest}. Shipped via NOHO Mailbox in NoHo, CA.`
    : `Track this ${row.carrier} ${row.servicelevel} shipment to ${dest}. Shipped via NOHO Mailbox in NoHo, CA.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "NOHO Mailbox",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    robots: { index: false, follow: false },
  };
}

const NOHO_INK = "#2D100F";
const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_CREAM = "#F7E6C2";

export default async function PublicTrackingReceipt({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || id.length < 6) return notFound();

  const row = await prisma.shippoLabel.findUnique({
    where: { id },
    select: {
      id: true,
      carrier: true,
      servicelevel: true,
      trackingNumber: true,
      trackingUrl: true,
      toName: true,
      toCity: true,
      toState: true,
      toZip: true,
      createdAt: true,
      status: true,
    },
  });
  if (!row) return notFound();

  const isRefunded = row.status === "refunded";
  const live = isRefunded ? null : await getTrackingStatus(row.carrier, row.trackingNumber).catch(() => null);

  // Absolute URL for the Share button. Headers may not be available during
  // some prerender paths, so fall back gracefully.
  let absoluteUrl = `https://nohomailbox.org/r/${row.id}`;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) absoluteUrl = `${proto}://${host}/r/${row.id}`;
  } catch {
    /* keep fallback */
  }
  const liveStatusUpper = (live?.status ?? "").toUpperCase();
  const stage = (() => {
    if (liveStatusUpper === "DELIVERED") return { pos: 1, current: 3, label: "Delivered" };
    if (liveStatusUpper === "TRANSIT") return { pos: 0.66, current: 2, label: "In transit" };
    if (liveStatusUpper === "PRE_TRANSIT") return { pos: 0.33, current: 1, label: "Awaiting pickup" };
    if (liveStatusUpper === "RETURNED" || liveStatusUpper === "FAILURE") return { pos: 0.5, current: -1, label: liveStatusUpper === "RETURNED" ? "Returned" : "Issue" };
    return { pos: 0.05, current: 0, label: liveStatusUpper || "Pending" };
  })();

  // Polling pause once the package is fully done. Refunded skips entirely;
  // Delivered just doesn't need updates anymore (final state on the carrier
  // side too).
  const stopPolling = isRefunded || liveStatusUpper === "DELIVERED";

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
      <AutoRefresh intervalMs={60_000} disabled={stopPolling} />
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
        {/* Brand strip */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, paddingBottom: 14, borderBottom: "1px solid rgba(45,16,15,0.08)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Image src="/brand/logo-trans.png" alt="NOHO Mailbox" width={56} height={32} style={{ height: 36, width: "auto", objectFit: "contain" }} />
            <div>
              <p style={{ margin: 0, fontSize: 9.5, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: NOHO_BLUE }}>
                Shipment receipt
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 700, color: NOHO_INK }}>
                NOHO Mailbox · NoHo, CA
              </p>
            </div>
          </div>
          {isRefunded ? (
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.14em", textTransform: "uppercase", padding: "3px 8px", borderRadius: 4, background: "#fee2e2", color: "#991b1b" }}>
              Refunded
            </span>
          ) : (
            <ShippedPill stage={stage} />
          )}
        </div>

        {/* Share — Web Share API on supported devices, clipboard fallback. */}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <PublicShareButton
            url={absoluteUrl}
            title="Track my NOHO Mailbox shipment"
            text={`Tracking ${row.toName}'s shipment via NOHO Mailbox`}
            brandColor={NOHO_BLUE}
          />
        </div>

        {/* Recipient */}
        <div style={{ marginTop: 14 }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>
            Going to
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 900, color: NOHO_INK, letterSpacing: "-0.005em" }}>
            {row.toName}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(45,16,15,0.65)" }}>
            {row.toCity}, {row.toState} {row.toZip}
          </p>
        </div>

        {/* Carrier + service */}
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <CarrierGlyph carrier={row.carrier} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: NOHO_INK }}>{row.carrier}</p>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(45,16,15,0.60)" }}>{row.servicelevel}</p>
          </div>
          {live?.eta && (
            <span style={{ fontSize: 10, fontWeight: 700, color: NOHO_BLUE_DEEP, padding: "3px 8px", borderRadius: 6, background: "rgba(51,116,133,0.10)" }}>
              ETA {new Date(live.eta).toLocaleDateString()}
            </span>
          )}
        </div>

        {/* Progress rail */}
        {!isRefunded && (
          <div style={{ marginTop: 18 }}>
            <div style={{ position: "relative", height: 8, borderRadius: 6, background: "#f1ede2", overflow: "hidden" }}>
              <div
                style={{
                  position: "absolute",
                  top: 0,
                  bottom: 0,
                  left: 0,
                  width: `${Math.max(4, stage.pos * 100)}%`,
                  borderRadius: 6,
                  background: stage.current === -1
                    ? "linear-gradient(90deg, #E70013, #991b1b)"
                    : stage.current === 3
                      ? "linear-gradient(90deg, #16a34a, #15803d)"
                      : "linear-gradient(90deg, #337485, #23596A)",
                  transition: "width 600ms",
                }}
              />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", marginTop: 6, gap: 6 }}>
              {[
                { n: 1, label: "Awaiting pickup" },
                { n: 2, label: "In transit" },
                { n: 3, label: "Delivered" },
              ].map((s) => {
                const reached = stage.current >= s.n || stage.current === 3;
                const isCurrent = stage.current === s.n;
                return (
                  <p
                    key={s.n}
                    style={{
                      margin: 0,
                      fontSize: 9.5,
                      fontWeight: 800,
                      letterSpacing: "0.12em",
                      textTransform: "uppercase",
                      textAlign: s.n === 1 ? "left" : s.n === 3 ? "right" : "center",
                      color: reached ? "#15803d" : isCurrent ? NOHO_BLUE_DEEP : "rgba(45,16,15,0.40)",
                    }}
                  >
                    {s.label}
                  </p>
                );
              })}
            </div>
          </div>
        )}

        {/* Tracking number */}
        <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: "#FAF6F0", border: "1px solid rgba(45,16,15,0.08)" }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>
            Tracking number
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 800, color: NOHO_INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", wordBreak: "break-all", lineHeight: 1.2 }}>
            {row.trackingNumber}
          </p>
          {row.trackingUrl && (
            <a
              href={row.trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: "inline-block", marginTop: 8, padding: "8px 14px", borderRadius: 8, background: NOHO_BLUE, color: "white", fontWeight: 800, fontSize: 12, textDecoration: "none" }}
            >
              Track on {row.carrier} →
            </a>
          )}
          {live?.location && (
            <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(45,16,15,0.65)" }}>
              Last seen: <strong style={{ color: NOHO_INK }}>{live.location}</strong>
            </p>
          )}
        </div>

        {/* Recent events */}
        {!isRefunded && live?.trackingHistory && live.trackingHistory.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <p style={{ margin: "0 0 6px", fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>
              Recent events
            </p>
            <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
              {live.trackingHistory.slice(0, 5).map((h, i) => (
                <li key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 11 }}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      marginTop: 4,
                      background: i === 0 ? NOHO_BLUE : "rgba(45,16,15,0.25)",
                      flexShrink: 0,
                    }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontWeight: 700, color: NOHO_INK }}>{h.status}</p>
                    <p style={{ margin: "1px 0 0", color: "rgba(45,16,15,0.55)", fontSize: 10 }}>
                      {h.date ? new Date(h.date).toLocaleString() : "—"}
                      {h.location && ` · ${h.location}`}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Footer */}
        <div style={{ marginTop: 18, paddingTop: 12, borderTop: "1px solid rgba(45,16,15,0.08)" }}>
          <p style={{ margin: 0, fontSize: 10.5, color: "rgba(45,16,15,0.65)", lineHeight: 1.45 }}>
            Shipped by <strong style={{ color: NOHO_INK }}>NOHO Mailbox</strong> · 5062 Lankershim Blvd · NoHo, CA 91601
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "rgba(45,16,15,0.65)" }}>
            Questions? <a href="tel:+18185067744" style={{ color: NOHO_BLUE, textDecoration: "none", fontWeight: 700 }}>(818) 506-7744</a>
          </p>
          <p style={{ margin: "8px 0 0", fontSize: 9, color: "rgba(45,16,15,0.40)" }}>
            Receipt {row.id.slice(0, 8)} · Generated {new Date().toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}

function ShippedPill({ stage }: { stage: { current: number; label: string } }) {
  const map: Record<number, { bg: string; fg: string }> = {
    [-1]: { bg: "#fee2e2", fg: "#991b1b" },
    [0]: { bg: "#f1f5f9", fg: "#475569" },
    [1]: { bg: "#fef3c7", fg: "#92400e" },
    [2]: { bg: "#dbeafe", fg: "#1e40af" },
    [3]: { bg: "#dcfce7", fg: "#166534" },
  };
  const c = map[stage.current] ?? map[0];
  return (
    <span style={{ fontSize: 10, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase", padding: "4px 10px", borderRadius: 999, background: c.bg, color: c.fg, whiteSpace: "nowrap" }}>
      {stage.label}
    </span>
  );
}

function CarrierGlyph({ carrier }: { carrier: string }) {
  const c = (carrier || "").toLowerCase();
  let bg = "linear-gradient(135deg, #337485, #23596A)";
  let fg = NOHO_CREAM;
  let label = carrier.slice(0, 4).toUpperCase();
  if (c.includes("usps")) { bg = "linear-gradient(135deg, #2D5BA8, #1c3f7a)"; fg = "#fff"; label = "USPS"; }
  else if (c.includes("ups")) { bg = "linear-gradient(135deg, #6B3F1A, #3F2410)"; fg = "#FFC107"; label = "UPS"; }
  else if (c.includes("fedex")) { bg = "linear-gradient(135deg, #4D148C, #2E0A57)"; fg = "#FF6600"; label = "FedEx"; }
  else if (c.includes("dhl")) { bg = "#FFCC00"; fg = "#D40511"; label = "DHL"; }
  return (
    <span style={{ width: 40, height: 40, borderRadius: 10, background: bg, color: fg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 11, letterSpacing: "0.04em", flexShrink: 0 }}>
      {label}
    </span>
  );
}
