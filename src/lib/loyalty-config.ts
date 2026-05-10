// iter-175 — Member loyalty tier definitions.
// Pure types + thresholds + benefits — no async, lives outside any
// "use server" file so member dashboard + cron sweep both read it.

export type LoyaltyTier = "Bronze" | "Silver" | "Gold" | "Platinum";

export const LOYALTY_TIERS: LoyaltyTier[] = ["Bronze", "Silver", "Gold", "Platinum"];

export type LoyaltyTierMeta = {
  key: LoyaltyTier;
  label: string;
  emoji: string;
  // Visual tokens for member card.
  bg: string;
  fg: string;
  accent: string;
  // Marketing copy.
  tagline: string;
  // Benefits surfaced to the member + admin.
  benefits: string[];
};

export const TIER_META: Record<LoyaltyTier, LoyaltyTierMeta> = {
  Bronze: {
    key: "Bronze",
    label: "Bronze",
    emoji: "🥉",
    bg: "#FBE7CD",
    fg: "#7B3F00",
    accent: "#CD7F32",
    tagline: "Welcome aboard.",
    benefits: [
      "Standard mailbox + 24/7 access",
      "Free intake + holding (4 days)",
      "Member-only newsletter",
    ],
  },
  Silver: {
    key: "Silver",
    label: "Silver",
    emoji: "🥈",
    bg: "#E8EAED",
    fg: "#374151",
    accent: "#9CA3AF",
    tagline: "Reliable. We see you.",
    benefits: [
      "Everything in Bronze",
      "5% off renewals + add-ons",
      "Free first storage day waived",
      "Priority email response (24h)",
    ],
  },
  Gold: {
    key: "Gold",
    label: "Gold",
    emoji: "🥇",
    bg: "#FFF1C2",
    fg: "#92400E",
    accent: "#D4A017",
    tagline: "A pillar of the bureau.",
    benefits: [
      "Everything in Silver",
      "10% off renewals + add-ons",
      "Free notary stamp once a quarter",
      "Free 1-day forwarding rush",
      "Priority front-desk pickup",
    ],
  },
  Platinum: {
    key: "Platinum",
    label: "Platinum",
    emoji: "💎",
    bg: "#E0F2FE",
    fg: "#075985",
    accent: "#0EA5E9",
    tagline: "We're family.",
    benefits: [
      "Everything in Gold",
      "15% off renewals + add-ons",
      "Free monthly notary stamp",
      "Free same-day delivery in zone 1",
      "First-look at new services",
      "Direct line to bureau ops",
    ],
  },
};

// Discount % each tier earns at renewal time. Used by the renewal flow
// to auto-apply the discount when a Silver+ member renews.
export const TIER_RENEWAL_DISCOUNT: Record<LoyaltyTier, number> = {
  Bronze: 0,
  Silver: 5,
  Gold: 10,
  Platinum: 15,
};

// Qualification rules. Cron checks each axis in order; the highest tier
// where ALL prerequisites are met wins. Lower tiers are inclusive (a
// Gold member also automatically meets Bronze + Silver).
export type LoyaltyAxis = {
  key: string;
  label: string;
  // For the panel: human-readable threshold.
  threshold: string;
};

export const TIER_REQUIREMENTS: Record<LoyaltyTier, LoyaltyAxis[]> = {
  Bronze: [
    { key: "active",  label: "Active mailbox",            threshold: "Plan ≥ Free, mailbox not Cancelled" },
  ],
  Silver: [
    { key: "tenure6", label: "Member ≥ 6 months",         threshold: "Account age ≥ 180 days" },
    { key: "noOverdue", label: "No overdue invoice",      threshold: "Zero outstanding invoices past due" },
  ],
  Gold: [
    { key: "tenure12", label: "Member ≥ 12 months",       threshold: "Account age ≥ 365 days" },
    { key: "paidPlan", label: "Paid plan",                threshold: "Plan ∈ {Basic, Premium, Business}" },
    { key: "noOverdue", label: "No overdue invoice",      threshold: "Zero outstanding invoices past due" },
    { key: "engagement", label: "Active engagement",      threshold: "≥1 mail item in last 90 days" },
  ],
  Platinum: [
    { key: "tenure24", label: "Member ≥ 24 months",       threshold: "Account age ≥ 730 days" },
    { key: "premiumPlan", label: "Premium or Business",   threshold: "Plan ∈ {Premium, Business}" },
    { key: "noOverdue", label: "No overdue invoice",      threshold: "Zero outstanding invoices past due" },
    { key: "highHealth", label: "Health score ≥ 80",      threshold: "iter-140 score in Excellent band" },
  ],
};

export function tierIndex(t: LoyaltyTier): number {
  return LOYALTY_TIERS.indexOf(t);
}

export function nextTierAbove(t: LoyaltyTier): LoyaltyTier | null {
  const i = tierIndex(t);
  return i >= 0 && i + 1 < LOYALTY_TIERS.length ? LOYALTY_TIERS[i + 1]! : null;
}
