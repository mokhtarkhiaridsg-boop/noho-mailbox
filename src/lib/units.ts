/**
 * NOHO Mailbox — unit conversion + parsing helpers.
 *
 * Real postal scales report weight as either decimal lbs ("2.4 lb"), mixed
 * lb+oz ("2 lb 6 oz"), or pure ounces ("38 oz"). The DB stores weight as
 * canonical ounces (Float). Use these helpers everywhere admins type weight.
 */

// ─── Weight ──────────────────────────────────────────────────────────────────

export type WeightUnit = "oz" | "lb";

/** Parse a free-form weight string into ounces. Returns null on bad input. */
export function parseWeightInput(input: string, defaultUnit: WeightUnit = "oz"): number | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  if (!s) return null;

  // Mixed format: "2 lb 6 oz", "2lb 6oz", "2lb6oz"
  const mixed = s.match(/^([\d.]+)\s*(?:lb|lbs|pound|pounds|#)\s*([\d.]+)\s*(?:oz|ounce|ounces)?$/);
  if (mixed) {
    const lb = parseFloat(mixed[1]);
    const oz = parseFloat(mixed[2]);
    if (!isFinite(lb) || !isFinite(oz)) return null;
    return lb * 16 + oz;
  }

  // Single unit: "2.5 lb", "36 oz"
  const single = s.match(/^([\d.]+)\s*(lb|lbs|pound|pounds|#|oz|ounce|ounces|g|kg)?$/);
  if (single) {
    const value = parseFloat(single[1]);
    if (!isFinite(value)) return null;
    const unit = single[2] ?? defaultUnit;
    if (unit === "lb" || unit === "lbs" || unit === "pound" || unit === "pounds" || unit === "#") return value * 16;
    if (unit === "g") return value / 28.3495;
    if (unit === "kg") return (value * 1000) / 28.3495;
    return value; // oz
  }

  return null;
}

/** Format ounces as the most natural admin-readable string. */
export function formatWeightOz(oz: number, preferred: WeightUnit = "lb"): string {
  if (!isFinite(oz)) return "—";
  if (oz < 16 || preferred === "oz") {
    return `${oz.toFixed(oz < 1 ? 2 : 1)} oz`;
  }
  const lb = Math.floor(oz / 16);
  const remOz = +(oz - lb * 16).toFixed(1);
  if (remOz === 0) return `${lb} lb`;
  return `${lb} lb ${remOz} oz`;
}

/** Convert ounces ↔ pounds (decimal). */
export const ozToLb = (oz: number) => oz / 16;
export const lbToOz = (lb: number) => lb * 16;

// ─── Length ──────────────────────────────────────────────────────────────────

export type LengthUnit = "in" | "cm";

/** Parse a length input. Returns null on bad input. */
export function parseLengthInput(input: string, defaultUnit: LengthUnit = "in"): number | null {
  if (!input) return null;
  const s = input.trim().toLowerCase();
  if (!s) return null;
  const m = s.match(/^([\d.]+)\s*(in|inch|inches|"|cm|centimeter|centimeters|mm)?$/);
  if (!m) return null;
  const value = parseFloat(m[1]);
  if (!isFinite(value)) return null;
  const unit = m[2] ?? defaultUnit;
  if (unit === "cm" || unit === "centimeter" || unit === "centimeters") return value / 2.54;
  if (unit === "mm") return value / 25.4;
  return value; // in
}

export const inToCm = (n: number) => n * 2.54;
export const cmToIn = (n: number) => n / 2.54;
