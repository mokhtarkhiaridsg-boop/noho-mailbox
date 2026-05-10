// iter-184 — Carrier rate-shop heuristic engine.
//
// Lives outside any "use server" file so admin UI + future carrier-
// API integration share the same shape. Heuristic for now — zone
// derived from a coarse first-digit-of-zip lookup, multiplied by a
// weight ramp. Numbers calibrated against USPS Priority Mail and UPS
// Ground retail rates as of 2025; close enough that the side-by-side
// comparison surfaces the right "cheapest" carrier without burning
// API credits on every quote. Real carrier APIs swap in via
// `getLiveRates()` later — this signature is the contract.

const BUREAU_ORIGIN_ZIP = "91601"; // NoHo, CA — first digit "9"

export type CarrierKey = "USPS" | "UPS" | "FedEx" | "DHL";

export type Quote = {
  carrier: CarrierKey;
  service: string;                  // "Ground Advantage", "Priority Mail", "UPS Ground", "FedEx Home Delivery", etc.
  etaDays: { min: number; max: number };
  totalCents: number;
  insuranceCents: number;           // additional cost line for declared value (or 0)
  hasTracking: boolean;
  isCheapest?: boolean;             // computed at the end
  isFastest?: boolean;              // computed at the end
};

// Rough USPS zone table by first digit of destination zip (origin = 9).
// Lower = closer = cheaper. Approximates the 8-zone tariff grid.
const ZONE_BY_FIRST_DIGIT: Record<string, number> = {
  "9": 1,  // West coast (CA/OR/WA/NV/AZ/UT/etc)
  "8": 2,  // Mountain
  "7": 4,  // Central
  "6": 5,
  "5": 5,
  "4": 6,
  "3": 7,
  "2": 7,
  "1": 8,  // East coast
  "0": 8,
};

function zoneFor(destZip: string): number {
  const first = destZip[0] ?? "9";
  return ZONE_BY_FIRST_DIGIT[first] ?? 5;
}

function lbFromOz(oz: number): number {
  return Math.max(0.0625, oz / 16);
}

// Simple insurance fee model: $1.50 base + $1 per $100 of declared value
// over $100. Matches USPS-ish posted rates, close enough for the
// comparison table.
function insuranceCentsFor(declaredCents: number | null | undefined): number {
  if (!declaredCents || declaredCents <= 10000) return 0;
  const over100 = Math.ceil((declaredCents - 10000) / 10000);
  return 150 + over100 * 100;
}

export type RateRequest = {
  originZip?: string;            // defaults to bureau
  destZip: string;
  weightOz: number;
  declaredValueCents?: number;
};

export function getRateQuotes(req: RateRequest): Quote[] {
  const origin = (req.originZip ?? BUREAU_ORIGIN_ZIP).slice(0, 5);
  const dest = req.destZip.slice(0, 5);
  const zone = zoneFor(dest);
  const lb = lbFromOz(req.weightOz);
  const insurance = insuranceCentsFor(req.declaredValueCents);

  // ── USPS Ground Advantage (1-5 day, ≤70lb) ──────────────────────
  // Base $4.65 + $0.85/lb + $0.25/zone-step beyond zone 1.
  const uspsGroundBase = 465 + Math.round(lb * 85) + Math.max(0, (zone - 1) * 25);
  const uspsGround: Quote = {
    carrier: "USPS",
    service: "Ground Advantage",
    etaDays: { min: 2, max: zone <= 2 ? 3 : zone <= 5 ? 4 : 5 },
    totalCents: uspsGroundBase + insurance,
    insuranceCents: insurance,
    hasTracking: true,
  };

  // ── USPS Priority Mail (1-3 day, ≤70lb) — pricier, faster ──────
  const uspsPriority: Quote = {
    carrier: "USPS",
    service: "Priority Mail",
    etaDays: { min: 1, max: zone <= 2 ? 2 : 3 },
    totalCents: 880 + Math.round(lb * 110) + Math.max(0, (zone - 1) * 50) + insurance,
    insuranceCents: insurance,
    hasTracking: true,
  };

  // ── UPS Ground (1-5 day, ≤150lb) — usually competitive on >5lb
  const upsGround: Quote = {
    carrier: "UPS",
    service: "UPS Ground",
    etaDays: { min: 1, max: zone <= 2 ? 2 : zone <= 5 ? 4 : 5 },
    totalCents: 760 + Math.round(lb * 95) + Math.max(0, (zone - 1) * 35) + insurance,
    insuranceCents: insurance,
    hasTracking: true,
  };

  // ── FedEx Home Delivery (1-5 day, residential) ─────────────────
  const fedexHome: Quote = {
    carrier: "FedEx",
    service: "Home Delivery",
    etaDays: { min: 1, max: zone <= 2 ? 2 : zone <= 5 ? 4 : 5 },
    totalCents: 800 + Math.round(lb * 100) + Math.max(0, (zone - 1) * 40) + insurance,
    insuranceCents: insurance,
    hasTracking: true,
  };

  // ── FedEx 2Day — premium fast option
  const fedex2Day: Quote = {
    carrier: "FedEx",
    service: "FedEx 2Day",
    etaDays: { min: 2, max: 2 },
    totalCents: 1640 + Math.round(lb * 180) + Math.max(0, (zone - 1) * 90) + insurance,
    insuranceCents: insurance,
    hasTracking: true,
  };

  // ── DHL Express — very expensive, fastest international (we
  // include for parity in the picker even on domestic).
  const dhlExpress: Quote = {
    carrier: "DHL",
    service: "DHL Express",
    etaDays: { min: 1, max: 2 },
    totalCents: 2200 + Math.round(lb * 220) + Math.max(0, (zone - 1) * 110) + insurance,
    insuranceCents: insurance,
    hasTracking: true,
  };

  const quotes = [uspsGround, uspsPriority, upsGround, fedexHome, fedex2Day, dhlExpress];

  // Mark cheapest + fastest for the UI.
  const cheapest = quotes.reduce((min, q) => q.totalCents < min.totalCents ? q : min);
  const fastest = quotes.reduce((min, q) => q.etaDays.max < min.etaDays.max ? q : min);
  cheapest.isCheapest = true;
  fastest.isFastest = true;

  // Note: we silently ignore the origin override beyond using it for
  // a (future) origin-zone lookup. Kept in the signature so live-API
  // swap-in needs zero call-site change.
  void origin;

  return quotes;
}
