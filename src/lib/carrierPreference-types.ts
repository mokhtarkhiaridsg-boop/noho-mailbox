/**
 * Carrier preference types + non-async helpers — extracted from
 * src/app/actions/carrierPreference.ts because Next 16 forbids non-
 * async exports inside `"use server"` files.
 */

export const CARRIER_OPTIONS = ["Cheapest", "USPS", "UPS", "FedEx", "DHL"] as const;
export type CarrierPreference = typeof CARRIER_OPTIONS[number];

export const CARRIER_LABELS: Record<CarrierPreference, { label: string; emoji: string; sub: string }> = {
  Cheapest: { label: "Cheapest", emoji: "💰", sub: "Lowest-cost option across all carriers" },
  USPS:     { label: "USPS",     emoji: "📮", sub: "Best for letters + small packages, residential" },
  UPS:      { label: "UPS",      emoji: "🚚", sub: "Reliable for medium/large packages, business" },
  FedEx:    { label: "FedEx",    emoji: "📦", sub: "Fast express + international" },
  DHL:      { label: "DHL",      emoji: "✈️", sub: "International-only specialty" },
};

export function asCarrierPreference(s: string | null | undefined): CarrierPreference {
  if (!s) return "Cheapest";
  return (CARRIER_OPTIONS as readonly string[]).includes(s) ? (s as CarrierPreference) : "Cheapest";
}
