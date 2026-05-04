// iter-91 — Package insurance tier ladder.
//
// Free coverage up to $100 declared. Above that, a flat fee per tier
// caps the customer's exposure if a package is lost / stolen / damaged
// while in our shelf custody.

export type InsuranceTier = {
  id: string;
  label: string;
  maxValueCents: number;     // declared value ceiling for this tier (inclusive)
  feeCents: number;          // flat fee
  description: string;
};

export const INSURANCE_TIERS: InsuranceTier[] = [
  { id: "free",  label: "Standard care",          maxValueCents:    10000, feeCents:     0, description: "Free coverage up to $100. Default for every package." },
  { id: "low",   label: "Insured · up to $500",    maxValueCents:    50000, feeCents:   150, description: "$1.50 fee. Covers loss/damage up to $500 declared." },
  { id: "med",   label: "Insured · up to $1,000",  maxValueCents:   100000, feeCents:   500, description: "$5 fee. Covers loss/damage up to $1,000 declared." },
  { id: "high",  label: "Insured · up to $2,500",  maxValueCents:   250000, feeCents:  1500, description: "$15 fee. Covers loss/damage up to $2,500 declared." },
  { id: "max",   label: "Insured · up to $5,000",  maxValueCents:   500000, feeCents:  3500, description: "$35 fee. Covers loss/damage up to $5,000 declared. Maximum we cover in-house." },
];

export const MAX_INSURED_VALUE_CENTS = INSURANCE_TIERS[INSURANCE_TIERS.length - 1].maxValueCents;

// Pick the cheapest tier that covers a declared value. Returns null if
// the value is over our max coverage.
export function pickTier(declaredValueCents: number): InsuranceTier | null {
  if (declaredValueCents < 0) return null;
  for (const t of INSURANCE_TIERS) {
    if (declaredValueCents <= t.maxValueCents) return t;
  }
  return null;
}

export function findTierById(id: string): InsuranceTier | null {
  return INSURANCE_TIERS.find((t) => t.id === id) ?? null;
}
