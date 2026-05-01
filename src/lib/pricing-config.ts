/**
 * Shared pricing-page types + defaults. Imported by both the server-action
 * file and the client editor. Kept out of the "use server" module because
 * Next.js requires those to export only async functions.
 */

export type PlanTermKey = "term3" | "term6" | "term14";

export type PricingPlan = {
  id: string;
  name: string;
  badge?: string;
  popular?: boolean;
  prices: { term3: number; term6: number; term14: number };
  keyFee: number;
  features: string[];
  cta: string;
};

export type ComparisonRow = {
  feature: string;
  basic: boolean | string;
  business: boolean | string;
  premium: boolean | string;
  sub?: string;
};

export type FeeRow = {
  label: string;
  amount: string;
  sub?: string;
};

export type PolicyItem = {
  title: string;
  body: string;
};

export type PricingConfig = {
  headline: string;
  subhead: string;
  plans: PricingPlan[];
  comparison: ComparisonRow[];
  fees: FeeRow[];
  policies: PolicyItem[];
};

export const PRICING_KEY = "pricing_v2";

export const DEFAULT_PRICING: PricingConfig = {
  headline: "Mailbox Plans",
  subhead:
    "All plans include a real Lankershim Blvd address — not a P.O. Box. No surprises, no hidden fees.",
  plans: [
    {
      id: "basic",
      name: "Basic Box",
      badge: "Standard",
      prices: { term3: 50, term6: 95, term14: 160 },
      keyFee: 15,
      features: [
        "Real Lankershim Blvd address",
        "Mail scanning dashboard",
        "Package alerts (SMS + email)",
        "In-store pickup, Mon–Sat",
      ],
      cta: "Choose Basic",
    },
    {
      id: "business",
      name: "Business Box",
      badge: "Most Popular",
      popular: true,
      prices: { term3: 80, term6: 150, term14: 230 },
      keyFee: 15,
      features: [
        "Everything in Basic",
        "Mail forwarding worldwide",
        "Free notary on Form 1583",
        "$5 flat same-day delivery in NoHo",
      ],
      cta: "Choose Business",
    },
    {
      id: "premium",
      name: "Premium Box",
      badge: "Concierge",
      prices: { term3: 95, term6: 180, term14: 295 },
      keyFee: 15,
      features: [
        "Everything in Business",
        "Same-day delivery credits",
        "Notary discount (15%)",
        "Concierge support line",
      ],
      cta: "Choose Premium",
    },
  ],
  comparison: [
    { feature: "Real Lankershim Blvd suite #", basic: true, business: true, premium: true },
    { feature: "All-carrier package acceptance", basic: true, business: true, premium: true, sub: "USPS, UPS, FedEx, DHL, Amazon" },
    { feature: "Mail scanning dashboard", basic: true, business: true, premium: true },
    { feature: "Mail forwarding worldwide", basic: false, business: true, premium: true },
    { feature: "Same-day NoHo delivery", basic: "Pay-as-you-go", business: "$5 flat", premium: "Credits included" },
    { feature: "Notary on USPS Form 1583", basic: "$15", business: "Free", premium: "Free" },
    { feature: "Priority intake", basic: false, business: false, premium: true, sub: "Logged within 1 hour" },
    { feature: "Package storage", basic: "30 days", business: "30 days", premium: "60 days" },
    { feature: "Concierge support line", basic: false, business: false, premium: true },
  ],
  fees: [
    { label: "Security deposit (refundable)", amount: "$50" },
    { label: "Key replacement", amount: "$25" },
    { label: "Late payment", amount: "$15", sub: "Charged after 10-day grace period" },
    { label: "Mail scanning", amount: "$2 / page" },
    { label: "Mail forwarding", amount: "Postage + $5", sub: "Plus carrier surcharge for oversized" },
    { label: "Notary services", amount: "$15 / signature", sub: "Free on USPS Form 1583 for Business / Premium" },
    { label: "Same-day delivery (NoHo)", amount: "$5 flat", sub: "$10–$24 elsewhere in LA" },
  ],
  policies: [
    {
      title: "30-day package holding",
      body: "We hold packages for 30 days from arrival. Past 30 days a $5/week storage fee applies. Premium plan extends this to 60 days.",
    },
    {
      title: "Oversized packages",
      body: "Anything over 32 oz or with any side > 18″ counts as oversized. We accept up to 70 lbs / 30″ on the longest side. Items over that need pickup within 48 hours of notification.",
    },
    {
      title: "CMRA compliance",
      body: "USPS-authorized CMRA (Form 1583 on file for every customer). Quarterly customer-record certification retained per DMM 508.1.8 + CA B&P §17538.5.",
    },
    {
      title: "Cancellation",
      body: "Cancel anytime. Pre-paid terms are pro-rated and refunded to the wallet within 1 business day. 30-day grace period for picking up final mail before mailbox release.",
    },
  ],
};
