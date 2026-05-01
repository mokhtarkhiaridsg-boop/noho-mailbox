/**
 * Virtual mailbox — types + defaults.
 *
 * Distinct product line from the physical CMRA boxes (Basic / Business /
 * Premium). Virtual mailbox customers never come into the store; everything
 * is online — scan, forward, shred, deposit checks, archive. Billed monthly
 * with annual discount.
 *
 * Pricing model is iPostal-style: tiers indexed by number of recipients +
 * mail items per month. The admin edits prices/feature copy in /admin →
 * Settings → Virtual Mailbox.
 *
 * Lives outside any "use server" file so types/constants can be imported
 * from client components.
 */

export type VirtualMailboxPlan = {
  /** Stable id used by signup flow + admin actions. */
  id: string;
  /** Display name. */
  name: string;
  /** Optional pill copy ("Most Popular", "Best Value"). */
  badge?: string;
  /** Show as the highlighted column on /virtual-mailbox. */
  popular?: boolean;
  /** Monthly billing in dollars. */
  monthly: number;
  /**
   * Annual billing in dollars (per year, total). When set, surface a
   * "save $X / year" pill versus 12 × monthly. Empty/zero means
   * monthly-only.
   */
  annual: number;
  /** Number of recipients allowed on the plan. */
  recipients: number;
  /** Mail items received per month (0 = unlimited). */
  itemsPerMonth: number;
  /** Free scans per month. Beyond this, $X/page charges apply. */
  freeScans: number;
  /** Bullet copy on the plan card. */
  features: string[];
  /** CTA copy on the card. */
  cta: string;
};

export type VirtualMailboxConfig = {
  /** Master switch — hide the entire offering from the marketing site without
   *  deleting config. */
  enabled: boolean;
  /** Hero headline + subhead on /virtual-mailbox. */
  headline: string;
  subhead: string;
  /** Tier list, in display order left → right. */
  plans: VirtualMailboxPlan[];
  /** Address shown to customers when they sign up. Defaults to NOHO Mailbox. */
  digitalAddressLabel: string;
  digitalAddressLine: string;
  /** Marketing benefits row under hero. */
  benefits: { title: string; body: string }[];
  /** FAQ entries shown beneath the pricing grid. */
  faqs: { question: string; answer: string }[];
};

export const VIRTUAL_MAILBOX_KEY = "virtual_mailbox_v1";

export const DEFAULT_VIRTUAL_MAILBOX: VirtualMailboxConfig = {
  enabled: true,
  headline: "A real street address — without ever leaving home.",
  subhead:
    "Get a 5062 Lankershim Blvd address, a digital dashboard, and unlimited scans. Mail forwarded anywhere on demand. No PO box, no contract, cancel anytime.",
  digitalAddressLabel: "Your address",
  digitalAddressLine: "5062 Lankershim Blvd, Suite #[YOUR-SUITE], North Hollywood, CA 91601",
  plans: [
    {
      id: "virtual-solo",
      name: "Solo",
      badge: "Starter",
      monthly: 9.99,
      annual: 99,
      recipients: 1,
      itemsPerMonth: 30,
      freeScans: 5,
      features: [
        "1 recipient name",
        "30 mail items / month",
        "5 free scans / month",
        "Unlimited mail forwarding (postage extra)",
        "Secure check deposit",
        "Mobile app",
      ],
      cta: "Start Solo",
    },
    {
      id: "virtual-plus",
      name: "Plus",
      badge: "Most Popular",
      popular: true,
      monthly: 19.99,
      annual: 199,
      recipients: 4,
      itemsPerMonth: 100,
      freeScans: 25,
      features: [
        "4 recipient names (family / business)",
        "100 mail items / month",
        "25 free scans / month",
        "Priority intake (1-hour SLA)",
        "Free shred & secure disposal",
        "Junk-mail auto-block",
      ],
      cta: "Choose Plus",
    },
    {
      id: "virtual-pro",
      name: "Pro",
      badge: "Concierge",
      monthly: 39.99,
      annual: 399,
      recipients: 10,
      itemsPerMonth: 0,
      freeScans: 100,
      features: [
        "10 recipient names",
        "Unlimited mail items",
        "100 free scans / month",
        "Same-business-day scanning",
        "Dedicated concierge line",
        "Free notary (Form 1583)",
      ],
      cta: "Go Pro",
    },
  ],
  benefits: [
    {
      title: "Real street address",
      body:
        "5062 Lankershim Blvd is a USPS-authorized CMRA — accepted by banks, the DMV, the IRS, and every shipping carrier. Not a P.O. box.",
    },
    {
      title: "Scan, forward, or shred",
      body:
        "Every mail item is logged with an exterior photo. Open, forward, or destroy from your phone in one tap. No more piles on the kitchen table.",
    },
    {
      title: "Built for movers + remote teams",
      body:
        "Travel for months without missing important mail. Onboard a remote team under one address. Cancel anytime — no contract.",
    },
    {
      title: "Compliance built-in",
      body:
        "USPS Form 1583 signed online with our notary partner. Quarterly KYC certifications retained per DMM 508.1.8.",
    },
  ],
  faqs: [
    {
      question: "Is this a real street address?",
      answer:
        "Yes. 5062 Lankershim Blvd, North Hollywood, CA 91601 is a USPS-authorized Commercial Mail Receiving Agency. You can use it on driver's licenses, business filings, banking applications, IRS forms, and any carrier (USPS, UPS, FedEx, DHL, Amazon).",
    },
    {
      question: "Do I need to come into the store?",
      answer:
        "No. Virtual mailbox customers complete USPS Form 1583 entirely online with our remote notary. Identity verification happens via secure ID upload + a brief video call. You'll never need to set foot in our location.",
    },
    {
      question: "What happens to my packages?",
      answer:
        "We accept packages from every carrier. You can have them forwarded to any address (we'll quote postage), held for pickup, or — if you ever visit LA — picked up in-store. Packages are stored free for 30 days; longer storage is $5/week.",
    },
    {
      question: "Can I cancel?",
      answer:
        "Yes — anytime, no penalty. We pro-rate the unused portion to your wallet within 1 business day. You have 30 days after cancellation to forward or pick up any remaining mail.",
    },
    {
      question: "How is this different from the physical mailbox plans?",
      answer:
        "Physical (Basic / Business / Premium) plans give you a key, a suite number, and in-store pickup access. Virtual is fully digital — same address, no key, everything happens through the dashboard. Pick the physical tier if you live in NoHo and like collecting your own mail; pick virtual if you live anywhere else or want to skip the trip.",
    },
  ],
};

export function parseVirtualMailbox(raw: string | null): VirtualMailboxConfig {
  if (!raw) return DEFAULT_VIRTUAL_MAILBOX;
  try {
    const parsed = JSON.parse(raw) as Partial<VirtualMailboxConfig>;
    return {
      ...DEFAULT_VIRTUAL_MAILBOX,
      ...parsed,
      // Always keep at least one plan — fall back if admin nuked the array.
      plans:
        Array.isArray(parsed.plans) && parsed.plans.length > 0
          ? (parsed.plans as VirtualMailboxPlan[])
          : DEFAULT_VIRTUAL_MAILBOX.plans,
      benefits: Array.isArray(parsed.benefits)
        ? (parsed.benefits as { title: string; body: string }[])
        : DEFAULT_VIRTUAL_MAILBOX.benefits,
      faqs: Array.isArray(parsed.faqs)
        ? (parsed.faqs as { question: string; answer: string }[])
        : DEFAULT_VIRTUAL_MAILBOX.faqs,
    };
  } catch {
    return DEFAULT_VIRTUAL_MAILBOX;
  }
}

/** True when an annual price exists AND undercuts 12× monthly. */
export function annualSavings(plan: VirtualMailboxPlan): number {
  if (!plan.annual || plan.annual <= 0) return 0;
  const monthlyTotal = plan.monthly * 12;
  const savings = monthlyTotal - plan.annual;
  return savings > 0 ? Math.round(savings) : 0;
}
