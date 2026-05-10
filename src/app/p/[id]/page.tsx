// iter-93 — Public package-tracking page.
//
// `/p/[id]?t={token}` — no login. Customer shares with anyone (sender,
// recipient, family). Renders photo, status, timeline, and a deeplink
// to the carrier's own tracking site.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getMailPublicShareView } from "@/app/actions/mail";
import { getSenderNoteCountForPublic } from "@/app/actions/senderThankYou";
import SenderThankYouForm from "./SenderThankYouForm";

export const dynamic = "force-dynamic";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

// Map status → human label + color for the badge.
const STATUS_STYLE: Record<string, { bg: string; fg: string; label: string; complete?: boolean }> = {
  Received:           { bg: "rgba(51,116,133,0.12)",  fg: "#23596A", label: "Received at NOHO" },
  Scanned:            { bg: "rgba(124,58,237,0.12)",  fg: "#5B21B6", label: "Scanned" },
  "Awaiting Pickup":  { bg: "rgba(245,166,35,0.14)",  fg: "#92400e", label: "Awaiting pickup at NOHO" },
  Held:               { bg: "rgba(245,166,35,0.14)",  fg: "#92400e", label: "Held on shelf" },
  "Picked Up":        { bg: "rgba(22,163,74,0.14)",   fg: "#15803d", label: "Picked up by recipient", complete: true },
  Forwarded:          { bg: "rgba(22,163,74,0.10)",   fg: "#15803d", label: "Forwarded", complete: true },
  Returned:           { bg: "rgba(231,0,19,0.10)",    fg: "#991b1b", label: "Returned to sender", complete: true },
  Discarded:          { bg: "rgba(231,0,19,0.10)",    fg: "#991b1b", label: "Discarded", complete: true },
};

// Carrier deeplink builders. Falls back to /track?n=… for unknowns.
function carrierTrackingUrl(carrier: string | null, tracking: string | null): string | null {
  if (!tracking) return null;
  const t = encodeURIComponent(tracking);
  const c = (carrier ?? "").toLowerCase();
  if (c.includes("usps")) return `https://tools.usps.com/go/TrackConfirmAction?qtc_tLabels1=${t}`;
  if (c.includes("ups"))  return `https://www.ups.com/track?tracknum=${t}`;
  if (c.includes("fedex")) return `https://www.fedex.com/fedextrack/?trknbr=${t}`;
  if (c.includes("dhl"))  return `https://www.dhl.com/us-en/home/tracking/tracking-express.html?submit=1&tracking-id=${t}`;
  return `/track?n=${t}`;
}

export default async function PublicPackagePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const [{ id }, { t }] = await Promise.all([params, searchParams]);
  const res = await getMailPublicShareView(id, t ?? "");
  if ((res as { error?: string }).error || !(res as { view?: unknown }).view) return notFound();
  const v = (res as { view: NonNullable<Awaited<ReturnType<typeof getMailPublicShareView>>["view"]> }).view;
  // iter-168 — Sender thank-you note count (social proof + initial state).
  const noteCount = await getSenderNoteCountForPublic({ mailItemId: id, shareToken: t ?? "" });
  // Recipient's first name for the form copy. Fall back to initials if
  // the customerInitials look like the actual recipient's name (e.g.
  // single first name).
  const firstName = (v.recipientName ?? "").trim().split(" ")[0] || null;

  const statusStyle = STATUS_STYLE[v.status] ?? { bg: "rgba(45,16,15,0.06)", fg: NOHO_INK, label: v.status };
  const carrierUrl = carrierTrackingUrl(v.carrier, v.trackingNumber);
  const arrived = new Date(v.createdAtIso).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F2EA",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        color: NOHO_INK,
        padding: "32px 16px",
      }}
    >
      <div style={{ maxWidth: 560, margin: "0 auto" }}>
        <Link
          href="/"
          style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(45,16,15,0.10)", color: NOHO_INK, textDecoration: "none", fontWeight: 700, fontSize: 11, marginBottom: 12 }}
        >
          ← NOHO Mailbox
        </Link>

        {/* Hero card */}
        <div
          style={{
            background: "white",
            border: "1px solid rgba(45,16,15,0.10)",
            borderRadius: 20,
            padding: 24,
            boxShadow: "0 6px 18px rgba(45,16,15,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
              Package tracking
            </p>
            <span
              style={{
                fontSize: 10,
                fontWeight: 900,
                letterSpacing: "0.10em",
                textTransform: "uppercase",
                padding: "4px 10px",
                borderRadius: 999,
                background: statusStyle.bg,
                color: statusStyle.fg,
              }}
            >
              {statusStyle.label}
            </span>
          </div>

          <p style={{ margin: 0, fontSize: 22, fontWeight: 900, letterSpacing: "-0.01em" }}>
            {v.from}
          </p>
          <p style={{ margin: "6px 0 0", fontSize: 13, color: "rgba(45,16,15,0.65)" }}>
            For <strong style={{ color: NOHO_INK }}>{v.customerInitials}</strong>{v.suiteNumber ? ` · suite #${v.suiteNumber}` : ""} — {v.type.toLowerCase()} arrived <strong style={{ color: NOHO_INK }}>{arrived}</strong>
          </p>

          {v.exteriorImageUrl && (
            <div style={{ marginTop: 16, textAlign: "center" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={v.exteriorImageUrl}
                alt="Package exterior photo"
                style={{ maxWidth: "100%", maxHeight: 320, borderRadius: 12, border: "1px solid rgba(45,16,15,0.10)" }}
              />
            </div>
          )}

          {/* Carrier + tracking + deeplink */}
          {(v.carrier || v.trackingNumber) && (
            <div style={{ marginTop: 16, padding: "12px 14px", borderRadius: 10, border: "1px solid rgba(45,16,15,0.10)", background: "#fafaf7" }}>
              <p style={{ margin: 0, fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" }}>
                {v.carrier ?? "Carrier"}
              </p>
              {v.trackingNumber && (
                <p style={{ margin: "4px 0 0", fontSize: 13, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: NOHO_INK, wordBreak: "break-all" }}>
                  {v.trackingNumber}
                </p>
              )}
              {carrierUrl && (
                <a
                  href={carrierUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ display: "inline-block", marginTop: 10, padding: "8px 14px", background: NOHO_BLUE_DEEP, color: "white", textDecoration: "none", borderRadius: 8, fontWeight: 800, fontSize: 12 }}
                >
                  Track with {v.carrier ?? "carrier"} →
                </a>
              )}
            </div>
          )}

          {/* Weight + dims if captured */}
          {(v.weightOz != null || v.dimensions) && (
            <p style={{ margin: "12px 0 0", fontSize: 12, color: "rgba(45,16,15,0.55)" }}>
              {v.weightOz != null && <span><strong style={{ color: NOHO_INK }}>{(v.weightOz / 16).toFixed(2)} lb</strong></span>}
              {v.weightOz != null && v.dimensions && <span> · </span>}
              {v.dimensions && <span><strong style={{ color: NOHO_INK }}>{v.dimensions}</strong></span>}
            </p>
          )}
        </div>

        {/* iter-94: Carrier tracking events (live from carrier API). */}
        {v.trackingEvents.length > 0 && (
          <div
            style={{
              marginTop: 14,
              background: "white",
              border: "1px solid rgba(45,16,15,0.10)",
              borderRadius: 20,
              padding: 24,
              boxShadow: "0 6px 18px rgba(45,16,15,0.08)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
                Carrier tracking
              </p>
              {v.trackingState?.etaIso && (
                <span style={{ fontSize: 11, fontWeight: 800, color: "#15803d" }}>
                  ETA · {new Date(v.trackingState.etaIso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              )}
            </div>
            <ol style={{ margin: "12px 0 0", padding: 0, listStyle: "none" }}>
              {v.trackingEvents.slice().reverse().map((e, i) => {
                const ts = new Date(e.eventTimeIso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
                const dot =
                  e.statusKey === "delivered" ? "#16A34A"
                  : e.statusKey === "out_for_delivery" ? "#F5A623"
                  : e.statusKey === "exception" ? "#E70013"
                  : i === 0 ? "#23596A" : "rgba(45,16,15,0.20)";
                return (
                  <li key={e.id} style={{ display: "flex", gap: 12, padding: "8px 0", borderTop: i === 0 ? "none" : "1px solid rgba(45,16,15,0.06)" }}>
                    <span style={{ width: 10, height: 10, borderRadius: 999, marginTop: 6, background: dot, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: NOHO_INK }}>{e.statusDetails}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(45,16,15,0.55)" }}>
                        {ts}{e.location ? ` · ${e.location}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
            {v.trackingState?.polledAtIso && (
              <p style={{ margin: "10px 0 0", fontSize: 10, color: "rgba(45,16,15,0.40)", textAlign: "right" }}>
                Last polled {new Date(v.trackingState.polledAtIso).toLocaleString()}
              </p>
            )}
          </div>
        )}

        {/* Timeline */}
        {v.timeline.length > 0 && (
          <div
            style={{
              marginTop: 14,
              background: "white",
              border: "1px solid rgba(45,16,15,0.10)",
              borderRadius: 20,
              padding: 24,
              boxShadow: "0 6px 18px rgba(45,16,15,0.08)",
            }}
          >
            <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
              Status timeline
            </p>
            <ol style={{ margin: "12px 0 0", padding: 0, listStyle: "none" }}>
              {v.timeline.map((t, i) => {
                const ts = new Date(t.createdAtIso).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
                const human = humanizeAction(t.action);
                return (
                  <li key={t.id} style={{ display: "flex", gap: 12, padding: "8px 0", borderTop: i === 0 ? "none" : "1px solid rgba(45,16,15,0.06)" }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 999,
                        marginTop: 6,
                        background: i === v.timeline.length - 1 ? "#16A34A" : "rgba(45,16,15,0.20)",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 800, color: NOHO_INK }}>{human}</p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(45,16,15,0.55)" }}>{ts}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        )}

        {/* iter-168 — Sender thank-you note form. Lets anyone with the
            share link drop a short message that lands in the recipient's
            dashboard + fires their member webhooks. Only shown for
            non-terminal statuses (no point sending a thank-you for a
            package that was returned/discarded). */}
        {!STATUS_STYLE[v.status]?.complete || v.status === "Picked Up" || v.status === "Forwarded" ? (
          <SenderThankYouForm
            mailItemId={v.id}
            shareToken={t ?? ""}
            recipientFirstName={firstName}
            initialNoteCount={noteCount}
          />
        ) : null}

        <p style={{ marginTop: 20, fontSize: 11, color: "rgba(45,16,15,0.45)", textAlign: "center" }}>
          NOHO Mailbox · 5062 Lankershim Blvd · NoHo, CA 91601 · (818) 506-7744<br />
          Anyone with this link can see this page. The owner can revoke from their dashboard.
        </p>
      </div>
    </div>
  );
}

function humanizeAction(action: string): string {
  if (action === "mail.intake.scan") return "Scanned in at NOHO";
  if (action === "mail.intake.edit") return "Intake details updated";
  if (action === "mail.reassign") return "Reassigned to a different mailbox";
  if (action === "mail.nudge") return "Owner notified about pickup";
  if (action === "mail.insurance_declared") return "Insurance added";
  if (action === "mail.storage_fee_charged") return "Storage fee charged";
  if (action === "mail.share_token_created") return "Share link created";
  if (action.startsWith("mail.status.")) {
    const s = action.slice("mail.status.".length).replace(/_/g, " ");
    return `Status → ${s.replace(/\b\w/g, (c) => c.toUpperCase())}`;
  }
  return action;
}
