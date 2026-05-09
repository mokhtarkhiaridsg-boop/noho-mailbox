/**
 * Supplies — types + constants.
 *
 * Lives outside the "use server" boundary so non-async exports don't
 * crash any /admin POST request. The server-action file at
 * src/app/actions/supplies.ts re-exports the runtime constants from
 * here so existing import paths keep working.
 */

export type SupplyCategory =
  | "boxes" | "tape" | "labels" | "poly_mailers" | "envelopes" | "printer_ribbon" | "other";

export type SupplyUnit = "each" | "roll" | "box" | "case" | "ream";

export type SupplyMovementKind =
  | "restock" | "sale" | "internal_use" | "loss" | "adjust";

export const SUPPLY_CATEGORIES: Array<{ key: SupplyCategory; label: string; emoji: string }> = [
  { key: "boxes",          label: "Boxes",          emoji: "📦" },
  { key: "tape",           label: "Tape",           emoji: "🩹" },
  { key: "labels",         label: "Labels",         emoji: "🏷" },
  { key: "poly_mailers",   label: "Poly mailers",   emoji: "✉️" },
  { key: "envelopes",      label: "Envelopes",      emoji: "📨" },
  { key: "printer_ribbon", label: "Printer ribbon", emoji: "🎀" },
  { key: "other",          label: "Other",          emoji: "🧰" },
];

export const SUPPLY_UNITS: SupplyUnit[] = ["each", "roll", "box", "case", "ream"];

export const SUPPLY_MOVEMENT_KINDS: Array<{ key: SupplyMovementKind; label: string; emoji: string; sign: 1 | -1 | 0 }> = [
  { key: "restock",      label: "Restock",      emoji: "📥", sign: 1 },
  { key: "sale",         label: "Sold",         emoji: "💰", sign: -1 },
  { key: "internal_use", label: "Internal use", emoji: "🛠", sign: -1 },
  { key: "loss",         label: "Loss / damage", emoji: "💥", sign: -1 },
  { key: "adjust",       label: "Adjust",       emoji: "✏️", sign: 0 },
];

export type SupplyStatus = "ok" | "low" | "out";

// iter-164 — Suggested default tier presets the panel uses when admin
// adds the first tier on a new supply. Admin can override the labels
// freely; these are just sensible starting points so a fresh row is
// usable in one click.
export const DEFAULT_TIER_PRESETS: Array<{ label: string; markupPct: number; description: string }> = [
  { label: "Retail",    markupPct: 100, description: "Standard storefront price (2x cost)" },
  { label: "Member",    markupPct: 60,  description: "Active mailbox members" },
  { label: "Wholesale", markupPct: 25,  description: "Bulk / business clients" },
];

// Compute markup % from cost + sale price. Returns null when cost is
// missing or zero (avoids divide-by-zero + nonsensical infinity).
export function computeMarkupPct(costCents: number | null | undefined, salePriceCents: number | null | undefined): number | null {
  if (!costCents || costCents <= 0) return null;
  if (salePriceCents == null) return null;
  return Math.round(((salePriceCents - costCents) / costCents) * 100);
}

// Compute gross margin % (different from markup): margin = profit / sale
// This is what most retailers use in P&L reports.
export function computeMarginPct(costCents: number | null | undefined, salePriceCents: number | null | undefined): number | null {
  if (!salePriceCents || salePriceCents <= 0) return null;
  if (costCents == null) return null;
  return Math.round(((salePriceCents - costCents) / salePriceCents) * 100);
}
