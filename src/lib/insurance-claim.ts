// iter-196 — Carrier insurance claim assistant lib (Tier 13 #105).
//
// Per-carrier form metadata + the prefill-shape that the assistant
// builds. Each carrier exposes a slightly different claim portal with
// slightly different field names, so we keep a registry of "this is
// what USPS wants in field X" and "this is what UPS calls it".
//
// We don't auto-submit (no public claim API at any major carrier).
// Goal: collapse the 30-min "find all the evidence + fill the form"
// busywork into a 2-min copy-paste job.

export type ClaimCarrier = "USPS" | "UPS" | "FedEx" | "DHL" | "Amazon" | "Other";
export type ClaimType = "damaged" | "lost" | "missing_contents" | "other";
export type ClaimStatus = "Draft" | "Filed" | "Paid" | "Denied" | "Closed";

export const CLAIM_CARRIERS: ClaimCarrier[] = ["USPS", "UPS", "FedEx", "DHL", "Amazon", "Other"];
export const CLAIM_TYPES: ClaimType[] = ["damaged", "lost", "missing_contents", "other"];

export const CLAIM_TYPE_LABELS: Record<ClaimType, string> = {
  damaged: "📦💥 Damaged",
  lost: "❓ Lost in transit",
  missing_contents: "🕳️ Contents missing",
  other: "📝 Other",
};

export const CLAIM_STATUS_LABELS: Record<ClaimStatus, string> = {
  Draft: "Draft",
  Filed: "Filed with carrier",
  Paid: "Paid",
  Denied: "Denied",
  Closed: "Closed",
};

export const CLAIM_STATUS_COLORS: Record<ClaimStatus, { bg: string; fg: string }> = {
  Draft:  { bg: "rgba(122,130,144,0.10)", fg: "#3B4252" },
  Filed:  { bg: "rgba(25,118,255,0.10)",  fg: "#0F5BD9" },
  Paid:   { bg: "rgba(34,197,94,0.10)",   fg: "#15803d" },
  Denied: { bg: "rgba(239,68,68,0.10)",   fg: "#b91c1c" },
  Closed: { bg: "rgba(107,114,128,0.10)", fg: "#374151" },
};

// Public-facing portal URLs admin opens in a new tab. We don't deep-link
// to specific forms (those URLs change too often) — landing pages are
// stable.
export const CARRIER_PORTAL_URLS: Record<ClaimCarrier, string> = {
  USPS:   "https://www.usps.com/help/claims.htm",
  UPS:    "https://www.ups.com/us/en/support/file-a-claim.page",
  FedEx:  "https://www.fedex.com/en-us/customer-support/claims.html",
  DHL:    "https://www.dhl.com/us-en/home/customer-service/claims.html",
  Amazon: "https://www.amazon.com/contact-us",
  Other:  "",
};

// Required windows the carriers enforce. Used to surface a warning if
// admin tries to file too late.
export const CARRIER_FILING_WINDOWS_DAYS: Record<ClaimCarrier, number | null> = {
  USPS:   60,    // 60d for damaged/missing contents; 15d for express
  UPS:    60,    // 60d after delivery for most claims
  FedEx:  21,    // 21d after delivery for damaged
  DHL:    30,    // 30d after delivery
  Amazon: 30,    // A-to-z guarantee window
  Other:  null,
};

// Pre-fill shape — what the assistant generates so admin can paste each
// row into the matching carrier-portal field. We keep it carrier-
// agnostic; the UI groups them under headings the admin recognizes.
export type ClaimPrefill = {
  carrier: ClaimCarrier;
  claimType: ClaimType;
  trackingNumber: string | null;
  intakeDateIso: string;
  daysSinceIntake: number;
  filingWindowDays: number | null;
  filingWindowExceeded: boolean;
  senderName: string;
  recipientName: string;
  recipientAddress: string | null;
  declaredValueDollars: string;          // "125.00"
  claimedAmountDollars: string;          // same as declared by default
  weightOz: number | null;
  dimensions: string | null;
  description: string;                   // composed from claimType + sender + carrier
  evidenceList: string[];                // bullet list admin pastes into carrier "describe damage" box
};

export type ClaimEvidence = {
  photos: Array<{ url: string; label: string; addedAtIso: string }>;
  timeline: Array<{ atIso: string; label: string; detail?: string }>;
  trackingNumber: string | null;
  carrier: string | null;
  intakeDateIso: string;
  pickupSignedAtIso: string | null;
  pickupSignerName: string | null;
  declaredValueCents: number | null;
  insuranceFeeCents: number | null;
  weightOz: number | null;
  dimensions: string | null;
  fromSender: string;
  recipientName: string | null;
  aiWarnings: string[];                  // iter-108
  scanImageUrl: string | null;
};

export function dollarFmt(cents: number): string {
  return (cents / 100).toFixed(2);
}

export function describeClaim(c: { claimType: ClaimType; carrier: ClaimCarrier; fromSender: string; trackingNumber: string | null }): string {
  const verb =
    c.claimType === "damaged" ? "arrived damaged" :
    c.claimType === "lost" ? "never arrived (lost in transit)" :
    c.claimType === "missing_contents" ? "arrived with missing contents" :
    "had an issue requiring a claim";
  const trk = c.trackingNumber ? ` (tracking ${c.trackingNumber})` : "";
  return `${c.carrier} package from ${c.fromSender}${trk} ${verb}. Filing on behalf of the recipient via NOHO Mailbox.`;
}

export function evidenceBullets(e: ClaimEvidence): string[] {
  const lines: string[] = [];
  lines.push(`Intake at NOHO Mailbox: ${new Date(e.intakeDateIso).toLocaleString()}`);
  if (e.trackingNumber) lines.push(`Tracking number: ${e.trackingNumber} (${e.carrier ?? "carrier"})`);
  if (e.declaredValueCents) lines.push(`Declared value at intake: $${dollarFmt(e.declaredValueCents)}`);
  if (e.weightOz) lines.push(`Weight: ${e.weightOz}oz`);
  if (e.dimensions) lines.push(`Dimensions: ${e.dimensions}`);
  if (e.aiWarnings.length > 0) lines.push(`Intake AI warnings: ${e.aiWarnings.join(", ")}`);
  if (e.photos.length > 0) lines.push(`${e.photos.length} intake photo${e.photos.length === 1 ? "" : "s"} on file (URLs available below)`);
  if (e.pickupSignedAtIso && e.pickupSignerName) {
    lines.push(`Pickup signed by ${e.pickupSignerName} at ${new Date(e.pickupSignedAtIso).toLocaleString()}`);
  }
  if (e.timeline.length > 0) {
    lines.push("Timeline:");
    for (const t of e.timeline.slice(0, 8)) {
      lines.push(`  • ${new Date(t.atIso).toLocaleDateString()} — ${t.label}${t.detail ? ` (${t.detail})` : ""}`);
    }
  }
  return lines;
}
