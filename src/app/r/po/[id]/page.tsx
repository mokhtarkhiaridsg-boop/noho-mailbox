/**
 * Public pre-paid order receipt — /r/po/[id]
 *
 * Customer-facing branded page for LabelOrder rows. Same pattern as
 * /r/[id] (which is for ShippoLabel) but covers the upstream pre-pay flow.
 * Customer texts back to this URL to watch their order transition through
 * Awaiting payment → Link sent → Paid → Printed → tracking inline.
 *
 * Privacy: customer-pays price is shown (the customer already paid it via
 * Square), but Shippo wholesale + admin margin are NOT exposed.
 */

import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Image from "next/image";
import { getTrackingStatus } from "@/lib/shippo";
import PublicShareButton from "@/components/PublicShareButton";
import AutoRefresh from "@/components/AutoRefresh";
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

// Per-order metadata so social-share previews show the carrier + recipient
// instead of a generic NOHO card.
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!id || id.length < 6) {
    return {
      title: "NOHO Mailbox · Order receipt",
      description: "Track your shipping order from NOHO Mailbox.",
      robots: { index: false, follow: false },
    };
  }
  const order = await ((prisma as unknown) as {
    labelOrder: { findUnique: (args: unknown) => Promise<{ carrier: string; servicelevel: string; toName: string; toCity: string; toState: string; status: string } | null> };
  }).labelOrder.findUnique({
    where: { id },
    select: { carrier: true, servicelevel: true, toName: true, toCity: true, toState: true, status: true },
  }).catch(() => null);
  if (!order) {
    return {
      title: "NOHO Mailbox · Order receipt",
      description: "Track your shipping order from NOHO Mailbox.",
      robots: { index: false, follow: false },
    };
  }
  const dest = [order.toCity, order.toState].filter(Boolean).join(", ");
  const title = `${order.carrier} ${order.servicelevel} to ${order.toName} — NOHO Mailbox`;
  const description = `Order status for a ${order.carrier} ${order.servicelevel} shipment to ${dest}, paid through NOHO Mailbox in NoHo, CA.`;
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      siteName: "NOHO Mailbox",
      type: "website",
    },
    twitter: { card: "summary_large_image", title, description },
    robots: { index: false, follow: false },
  };
}

const NOHO_INK = "#2D100F";
const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_CREAM = "#F7E6C2";

function fmtMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default async function PublicPreOrderReceipt({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!id || id.length < 6) return notFound();

  // Use raw selection because Prisma client typing for LabelOrder may not be
  // generated in the consumer types — same trick the AdminPanel server uses.
  const order = await ((prisma as unknown) as {
    labelOrder: {
      findUnique: (args: unknown) => Promise<{
        id: string;
        customerName: string;
        toName: string;
        toCity: string;
        toState: string;
        toZip: string;
        carrier: string;
        servicelevel: string;
        customerPriceCents: number;
        status: string;
        estimatedDays: number | null;
        weightOz: number;
        lengthIn: number;
        widthIn: number;
        heightIn: number;
        shippoLabelId: string | null;
        notes: string | null;
        createdAt: Date;
        paidAt: Date | null;
        printedAt: Date | null;
      } | null>;
    };
  }).labelOrder.findUnique({ where: { id } });
  if (!order) return notFound();

  // If the order has been printed, look up the linked ShippoLabel for live
  // tracking. Best-effort.
  const linkedLabel = order.shippoLabelId
    ? await prisma.shippoLabel.findUnique({
        where: { id: order.shippoLabelId },
        select: { trackingNumber: true, trackingUrl: true, labelUrl: true, carrier: true, status: true },
      })
    : null;
  const live = linkedLabel?.trackingNumber
    ? await getTrackingStatus(linkedLabel.carrier, linkedLabel.trackingNumber).catch(() => null)
    : null;
  const liveStatusUpper = (live?.status ?? "").toUpperCase();

  // 4-stage funnel for the visual progress bar.
  const stage = (() => {
    const s = order.status;
    if (s === "Cancelled") return { pos: 0, current: -1, label: "Cancelled" };
    if (s === "Printed") return { pos: 1, current: 4, label: liveStatusUpper === "DELIVERED" ? "Delivered" : "Printed" };
    if (s === "Paid") return { pos: 0.66, current: 3, label: "Paid · printing soon" };
    if (s === "LinkSent") return { pos: 0.33, current: 2, label: "Awaiting payment" };
    return { pos: 0.05, current: 1, label: "Awaiting payment link" };
  })();

  const firstName = (order.customerName || "").split(" ")[0] || "there";

  // Absolute URL for Share — uses request headers when available, falls back
  // to nohomailbox.org so prerender paths still get a valid link.
  let absoluteUrl = `https://nohomailbox.org/r/po/${order.id}`;
  try {
    const h = await headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    const proto = h.get("x-forwarded-proto") ?? "https";
    if (host) absoluteUrl = `${proto}://${host}/r/po/${order.id}`;
  } catch {
    /* keep fallback */
  }

  // Stop polling once the order is in a terminal state. Cancelled never moves
  // again; Printed + Delivered means the carrier has done its part.
  const stopPolling =
    order.status === "Cancelled" ||
    (order.status === "Printed" && liveStatusUpper === "DELIVERED");

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
                Order receipt
              </p>
              <p style={{ margin: "2px 0 0", fontSize: 12, fontWeight: 700, color: NOHO_INK }}>
                NOHO Mailbox · NoHo, CA
              </p>
            </div>
          </div>
          <StatusPill stage={stage} />
        </div>

        {/* Share — Web Share API on supported devices, clipboard fallback. */}
        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <PublicShareButton
            url={absoluteUrl}
            title="Track my NOHO Mailbox order"
            text={`Order receipt for ${order.toName} via NOHO Mailbox`}
            brandColor={NOHO_BLUE}
          />
        </div>

        {/* Greeting + Recipient */}
        <div style={{ marginTop: 14 }}>
          <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: "rgba(45,16,15,0.65)" }}>
            Hi {firstName}, here&apos;s the latest on your shipment:
          </p>
        </div>

        <div style={{ marginTop: 12 }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>
            Going to
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 18, fontWeight: 900, color: NOHO_INK, letterSpacing: "-0.005em" }}>
            {order.toName}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: "rgba(45,16,15,0.65)" }}>
            {order.toCity}, {order.toState} {order.toZip}
          </p>
        </div>

        {/* Carrier + service + ETA */}
        <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 10 }}>
          <CarrierGlyph carrier={order.carrier} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 900, color: NOHO_INK }}>{order.carrier}</p>
            <p style={{ margin: 0, fontSize: 11, color: "rgba(45,16,15,0.60)" }}>{order.servicelevel}</p>
          </div>
          {order.estimatedDays != null && (
            <span style={{ fontSize: 10, fontWeight: 700, color: NOHO_BLUE_DEEP, padding: "3px 8px", borderRadius: 6, background: "rgba(51,116,133,0.10)" }}>
              ~{order.estimatedDays} day{order.estimatedDays === 1 ? "" : "s"}
            </span>
          )}
        </div>

        {/* Progress rail */}
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
                  : stage.current === 4
                    ? "linear-gradient(90deg, #16a34a, #15803d)"
                    : "linear-gradient(90deg, #337485, #23596A)",
                transition: "width 600ms",
              }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", marginTop: 6, gap: 6 }}>
            {[
              { n: 1, label: "Submitted" },
              { n: 2, label: "Awaiting payment" },
              { n: 3, label: "Paid" },
              { n: 4, label: "Shipped" },
            ].map((s, i) => {
              const reached = stage.current >= s.n || stage.current === 4;
              const isCurrent = stage.current === s.n;
              return (
                <p
                  key={s.n}
                  style={{
                    margin: 0,
                    fontSize: 9.5,
                    fontWeight: 800,
                    letterSpacing: "0.10em",
                    textTransform: "uppercase",
                    textAlign: i === 0 ? "left" : i === 3 ? "right" : "center",
                    color: reached ? "#15803d" : isCurrent ? NOHO_BLUE_DEEP : "rgba(45,16,15,0.40)",
                  }}
                >
                  {s.label}
                </p>
              );
            })}
          </div>
        </div>

        {/* Total — customer already paid this; show as confirmation */}
        <div style={{ marginTop: 14, padding: "12px 14px", borderRadius: 12, background: "#FAF6F0", border: "1px solid rgba(45,16,15,0.08)" }}>
          <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>
            Total
          </p>
          <p style={{ margin: "3px 0 0", fontSize: 22, fontWeight: 900, color: NOHO_INK, letterSpacing: "-0.01em" }}>
            {fmtMoney(order.customerPriceCents)}
          </p>
          <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "rgba(45,16,15,0.55)" }}>
            {order.weightOz > 0 && <>{(order.weightOz / 16).toFixed(1)} lb · </>}
            {order.lengthIn}×{order.widthIn}×{order.heightIn} in
          </p>
        </div>

        {/* Tracking — only when printed */}
        {linkedLabel?.trackingNumber && (
          <div style={{ marginTop: 12, padding: "12px 14px", borderRadius: 12, background: "#FAF6F0", border: "1px solid rgba(45,16,15,0.08)" }}>
            <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>
              Tracking number
            </p>
            <p style={{ margin: "3px 0 0", fontSize: 15, fontWeight: 800, color: NOHO_INK, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", wordBreak: "break-all", lineHeight: 1.2 }}>
              {linkedLabel.trackingNumber}
            </p>
            {linkedLabel.trackingUrl && (
              <a
                href={linkedLabel.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ display: "inline-block", marginTop: 8, padding: "8px 14px", borderRadius: 8, background: NOHO_BLUE, color: "white", fontWeight: 800, fontSize: 12, textDecoration: "none" }}
              >
                Track on {linkedLabel.carrier} →
              </a>
            )}
            {live?.location && (
              <p style={{ margin: "8px 0 0", fontSize: 11, color: "rgba(45,16,15,0.65)" }}>
                Last seen: <strong style={{ color: NOHO_INK }}>{live.location}</strong>
              </p>
            )}
            {live?.eta && (
              <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(45,16,15,0.65)" }}>
                ETA: <strong style={{ color: NOHO_INK }}>{new Date(live.eta).toLocaleDateString()}</strong>
              </p>
            )}
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
            Order {order.id.slice(0, 8)} · Submitted {order.createdAt.toLocaleString()} · Auto-refreshes when you reopen this page
          </p>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ stage }: { stage: { current: number; label: string } }) {
  const map: Record<number, { bg: string; fg: string }> = {
    [-1]: { bg: "#fee2e2", fg: "#991b1b" },
    [1]: { bg: "#f1f5f9", fg: "#475569" },
    [2]: { bg: "#fef3c7", fg: "#92400e" },
    [3]: { bg: "#dbeafe", fg: "#1e40af" },
    [4]: { bg: "#dcfce7", fg: "#166534" },
  };
  const c = map[stage.current] ?? map[1];
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
