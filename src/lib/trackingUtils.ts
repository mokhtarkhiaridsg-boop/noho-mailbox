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
  const t = trackingNumber.trim().toUpperCase();
  if (t.startsWith("1Z") && t.length === 18) return "UPS";
  if (/^(9400|9205|9261|9274|9300|9361|9400|9470|9505|420)\d/.test(t)) return "USPS";
  if (/^\d{20,22}$/.test(t)) return "USPS";
  if (/^\d{12}$/.test(t) || /^\d{15}$/.test(t) || /^\d{20}$/.test(t)) return "FedEx";
  if (t.startsWith("JD") || t.startsWith("GM") || t.startsWith("LY")) return "DHL";
  if (t.startsWith("TBA")) return "Amazon";
  return "Other";
}
