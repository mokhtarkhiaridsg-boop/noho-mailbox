/**
 * NOHO Mailbox — Package Tracking Utilities
 * Pure synchronous helpers (no server actions) for tracking URLs and carrier detection.
 */

export type Carrier = "UPS" | "USPS" | "FedEx" | "DHL" | "Amazon" | "OnTrac" | "LaserShip" | "Other";

export function getTrackingUrl(carrier: string, trackingNumber: string): string {
  switch (carrier) {
    case "UPS":
      return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    case "DHL":
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}`;
    case "Amazon":
      return `https://www.amazon.com/progress-tracker/package?_encoding=UTF8&orderId=${trackingNumber}`;
    case "OnTrac":
      return `https://www.ontrac.com/tracking/?number=${trackingNumber}`;
    case "LaserShip":
      return `https://www.lasership.com/track/${trackingNumber}`;
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(trackingNumber + " tracking")}`;
  }
}

export function detectCarrier(trackingNumber: string): Carrier {
  // Strip ALL whitespace + dashes — drivers often paste "9334 6208 4550 …"
  // with spaces from the PDF label. Without this strip, the digit-only
  // regexes silently fall through to "Other" and Shippo never gets called.
  const t = trackingNumber.replace(/[\s-]/g, "").toUpperCase();
  if (!t) return "Other";

  // UPS — 1Z + 16 alphanumeric
  if (/^1Z[0-9A-Z]{16}$/.test(t)) return "UPS";

  // USPS — explicit prefixes (Priority Mail / Express / Certified / Signature
  // Confirmation / Insured Mail / Tracking variants). 9333-9337 covers the
  // newer Priority Mail block (e.g. 9334... that bot a real customer).
  if (/^(9400|9405|9407|9410|9411|9303|9305|9311|9312|9320|9321|9322|9323|9324|9333|9334|9335|9336|9337|9305|9261|9274|9300|9361|9362|9470|9505|9211|9214|9171|9172|9173|9174|9175|82\d{2}|420\d{4,})\d/.test(t)) {
    return "USPS";
  }
  // USPS — 22-digit catch-all (most USPS labels). Runs AFTER specific
  // prefixes so we don't shadow FedEx-20-digit detection below.
  if (/^\d{22}$/.test(t)) return "USPS";
  // USPS — 13-char ending in "US" (international tracking).
  if (/^[A-Z]{2}\d{9}US$/.test(t)) return "USPS";

  // FedEx — 12, 15, or 20 digits
  if (/^\d{12}$/.test(t) || /^\d{15}$/.test(t) || /^\d{20}$/.test(t)) return "FedEx";

  // DHL — 10 digits, or JD / GM / LY prefixes
  if (/^\d{10}$/.test(t)) return "DHL";
  if (t.startsWith("JD") || t.startsWith("GM") || t.startsWith("LY")) return "DHL";

  // Amazon Logistics
  if (t.startsWith("TBA") && /^TBA\d{12,}$/.test(t)) return "Amazon";

  // OnTrac — 1Z-style or 15 digits starting with C/D
  if (/^[CD]\d{14}$/.test(t)) return "OnTrac";
  // LaserShip — usually starts with LX or LW
  if (/^L[A-Z]\d{8,}$/.test(t)) return "LaserShip";

  return "Other";
}
