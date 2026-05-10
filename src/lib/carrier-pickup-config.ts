// iter-173 — Carrier-pickup primitives.
// Lives outside any "use server" file so the admin panel + cron sweep
// + server actions all share the same vocabulary.

export type CarrierPickupCarrier = "USPS" | "UPS" | "FedEx" | "DHL" | "Other";
export type CarrierPickupStatus = "draft" | "scheduled" | "completed" | "missed" | "cancelled";

export const CARRIER_PICKUP_CARRIERS: Array<{ key: CarrierPickupCarrier; label: string; emoji: string; portalUrl: string }> = [
  { key: "USPS",  label: "USPS",  emoji: "📬", portalUrl: "https://tools.usps.com/schedule-pickup-steps.htm" },
  { key: "UPS",   label: "UPS",   emoji: "📦", portalUrl: "https://wwwapps.ups.com/pickup/schedule" },
  { key: "FedEx", label: "FedEx", emoji: "🚚", portalUrl: "https://www.fedex.com/en-us/shipping/schedule-manage-pickups.html" },
  { key: "DHL",   label: "DHL",   emoji: "✈️", portalUrl: "https://mydhl.express.dhl/us/en/schedule-pickup.html" },
  { key: "Other", label: "Other", emoji: "🚛", portalUrl: "" },
];

export const CARRIER_PICKUP_STATUSES: Array<{ key: CarrierPickupStatus; label: string; emoji: string; bg: string; fg: string }> = [
  { key: "draft",     label: "Draft",     emoji: "📝", bg: "rgba(120,113,108,0.12)", fg: "#57534e" },
  { key: "scheduled", label: "Scheduled", emoji: "🗓",  bg: "rgba(25,118,255,0.10)",  fg: "#0F5BD9" },
  { key: "completed", label: "Completed", emoji: "✓",  bg: "rgba(34,197,94,0.10)",   fg: "#15803d" },
  { key: "missed",    label: "MISSED",    emoji: "⚠️", bg: "rgba(239,68,68,0.10)",   fg: "#991b1b" },
  { key: "cancelled", label: "Cancelled", emoji: "✕",  bg: "rgba(120,113,108,0.12)", fg: "#57534e" },
];

export function pickupStatusStyle(s: string) {
  return CARRIER_PICKUP_STATUSES.find((x) => x.key === s) ?? CARRIER_PICKUP_STATUSES[0]!;
}

export function carrierMeta(c: string) {
  return CARRIER_PICKUP_CARRIERS.find((x) => x.key === c) ?? CARRIER_PICKUP_CARRIERS[4]!;
}
