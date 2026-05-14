/**
 * iter-227 — Persona landing pages for buyer-intent SEO.
 *
 * Targets queries like:
 *   "virtual mailbox for amazon seller"
 *   "virtual mailbox for digital nomad"
 *   "virtual mailbox for foreign llc"
 *   "virtual mailbox for expat"
 * etc.
 *
 * Sister of state-llc-pages but indexed by PERSONA rather than geography.
 * Each persona page renders the same iPad-OS cream/brown aesthetic and
 * emits Service + FAQPage + Breadcrumb JSON-LD for rich results.
 */

export type Persona = {
  slug: string;
  /** Plural, used in H1 ("Amazon FBA Sellers"). */
  name: string;
  /** Singular, used inline ("Amazon FBA seller"). */
  noun: string;
  /** 1-line problem this persona has. */
  painPoint: string;
  /** 1-line "how NOHO solves it". */
  benefit: string;
  /** 4-6 specific benefits for this persona. */
  features: string[];
  /** 3 persona-specific FAQs (for FAQPage JSON-LD). */
  faq: { q: string; a: string }[];
};

export const PERSONAS: Persona[] = [
  {
    slug: "amazon-seller",
    name: "Amazon FBA Sellers",
    noun: "Amazon FBA seller",
    painPoint:
      "You need a non-residential US address Amazon will accept for your Seller Central, returns, and verification — but you don't want your home leaked.",
    benefit:
      "Real LA street address that Amazon accepts. Returns auto-routed to us. Returns photographed + listed for resale or shredded.",
    features: [
      "Amazon Seller Central + Brand Registry-accepted street address",
      "FBA return processing — receive, photograph, sort, resell or shred",
      "Stripe / PayPal / merchant-account verification address",
      "Tax document forwarding to your home state",
      "Unlimited package volume (no overage fees)",
      "California sales-tax permit address (if you elect nexus)",
    ],
    faq: [
      {
        q: "Does Amazon accept a CMRA address?",
        a: "Yes. Amazon accepts CMRA addresses for Seller Central, Brand Registry, returns processing, and merchant verification. We complete the USPS Form 1583 that makes it federally legitimate.",
      },
      {
        q: "What about FBA returns?",
        a: "Returns auto-route to our address. We log, photograph, and store every return. You decide from the dashboard: resell (we ship to any FBA warehouse), refurb, donate, or shred.",
      },
      {
        q: "Does this work for Brand Registry?",
        a: "Yes. Brand Registry accepts our address. We provide the official Form 1583 + USPS-CMRA documentation as proof if Amazon requests it.",
      },
    ],
  },
  {
    slug: "digital-nomad",
    name: "Digital Nomads",
    noun: "digital nomad",
    painPoint:
      "You're moving every 3-6 months and your US mail piles up uncollected, gets returned, or worse — gets stolen from a family member's mailbox.",
    benefit:
      "Stable US address that follows you anywhere. Scan on demand, forward on request, shred what you don't want. From a phone, anywhere with WiFi.",
    features: [
      "Stable US address while you live abroad",
      "Real-time mail notifications via SMS or email",
      "Open + scan content from anywhere in the world",
      "International forwarding to 195+ countries",
      "Bank-statement, tax, and DMV mail handled",
      "Voting + jury-duty notice safekeeping",
    ],
    faq: [
      {
        q: "Will my US bank accept your address?",
        a: "Yes — banks accept real street addresses. We're not a P.O. Box. Some banks may ask for additional verification (lease, utility bill) which is your responsibility to provide separately.",
      },
      {
        q: "Can you forward mail internationally?",
        a: "Yes. We forward to 195+ countries via USPS International, FedEx, or DHL. You set the schedule (weekly, monthly, on-demand) and we batch + ship.",
      },
      {
        q: "What about taxes?",
        a: "Our address is a mailing address — not a tax residency address. You're still a resident of wherever you actually live. We are not tax advisors, but the IRS accepts CMRA addresses for mail.",
      },
    ],
  },
  {
    slug: "expat",
    name: "American Expats",
    noun: "American expat",
    painPoint:
      "Living abroad and still need US mail for SSA, Medicare, tax docs, banking, voting — but family-member addresses are unreliable and PO Boxes don't accept packages.",
    benefit:
      "A real US street address that handles everything: scan, forward, shred. Plus we accept all carriers (FedEx, UPS, DHL — not just USPS).",
    features: [
      "SSA / Medicare / VA mail handled and scanned same-day",
      "Voter-registration absentee-ballot address",
      "Bank + investment statements scanned + uploaded",
      "Tax documents (W-2, 1099, K-1) forwarded to you abroad",
      "USPS, FedEx, UPS, DHL — all carriers, not just USPS",
      "Multi-year storage of important docs",
    ],
    faq: [
      {
        q: "Will the SSA / IRS accept a CMRA address?",
        a: "Yes. Federal agencies accept CMRA addresses for mail. The USPS Form 1583 we file makes the address-mail-handling relationship official.",
      },
      {
        q: "How fast can I see new mail?",
        a: "Outside scan within 1 business hour during store hours. Content scan within 24 hours of your request. SMS/email notification the moment mail arrives.",
      },
      {
        q: "Can I use this for absentee voting?",
        a: "Yes — California allows CMRA addresses for voter registration. Check your home state's rules; some require a residential address for voter registration but allow a mailing address for ballot delivery.",
      },
    ],
  },
  {
    slug: "foreign-llc-owner",
    name: "Foreign LLC Owners",
    noun: "non-US founder",
    painPoint:
      "You formed a US LLC from abroad but the state requires a real US street address for the registered agent, IRS correspondence, and merchant accounts — and you have no US presence.",
    benefit:
      "A USPS-compliant California CMRA address that satisfies federal + state requirements. We sign Form 1583 as your agent + handle every piece of mail.",
    features: [
      "California registered-agent address (or partner-agent for other states)",
      "IRS, EIN, BOI report correspondence handled + scanned",
      "Stripe / PayPal / Mercury / Wise verification address",
      "Multi-state LLC support via our partner-agent network",
      "USPS Form 1583 handled digitally — no notary trip needed",
      "Mail forwarded to your home country weekly",
    ],
    faq: [
      {
        q: "Can a non-US person sign Form 1583?",
        a: "Yes. The IRS and USPS accept non-US identity documents (passport + national ID) for Form 1583. We'll guide you through the digital signing process.",
      },
      {
        q: "Will this satisfy my state's registered-agent requirement?",
        a: "California yes, directly. Other states: we partner with registered-agent services in each state and bundle that service for you. Pricing varies by state.",
      },
      {
        q: "How does the BOI report work?",
        a: "Your LLC files BOI with FinCEN once. Any updates (new owners, address changes) get re-filed. We monitor BOI deadlines and notify you 30 days before any filing window.",
      },
    ],
  },
  {
    slug: "freelancer",
    name: "Freelancers & Independent Contractors",
    noun: "freelancer",
    painPoint:
      "You run a business from home but don't want your home address on every contract, invoice, and client portal — and you don't want to pay for an unused office.",
    benefit:
      "A professional street address for $50/3mo. Clients see a real LA address. You keep your home address private. Done.",
    features: [
      "Real street address (not a P.O. Box) for contracts + invoices",
      "Business-registration address for DBA / sole-prop filings",
      "Stripe / PayPal / merchant verification",
      "Client packages + check intake",
      "Mail scanning + email notifications",
      "Same-day pickup if you're local to LA",
    ],
    faq: [
      {
        q: "Can I use this on my W-9 / 1099?",
        a: "Yes. W-9 accepts any mailing address. Some clients prefer a residence address but a CMRA is generally accepted. If the client requires SSN + home address (rare), provide that to them directly while keeping a CMRA address for general correspondence.",
      },
      {
        q: "Does this work for my LLC?",
        a: "Yes — combine with our $2k LLC + brand bundle and we form the LLC at our address + file Form 1583 + set up the EIN. Two-week turnaround typical.",
      },
      {
        q: "Is this cheaper than a coworking space?",
        a: "Most coworking is $300-800/mo. Our Business plan is ~$27/mo. If you only need the address (not a desk), this saves you $3,000-9,000/year.",
      },
    ],
  },
  {
    slug: "real-estate-agent",
    name: "Real Estate Agents",
    noun: "real estate agent",
    painPoint:
      "Your DRE license + business cards + transaction docs need a brokerage address — but you don't want every client mailing flyers to your home or the brokerage front desk losing your mail.",
    benefit:
      "Direct mail to YOUR address, not the brokerage. Client checks, escrow docs, gift baskets — all logged + alerted in real-time.",
    features: [
      "DRE-compliant California street address",
      "Earnest-money + commission check intake",
      "Escrow document handling",
      "Client gift + thank-you card intake",
      "Same-day pickup for time-sensitive contracts",
      "Notary on-site — sign documents without leaving",
    ],
    faq: [
      {
        q: "Will the DRE accept this as my address of record?",
        a: "Yes. DRE accepts CMRA addresses on license records. Brokerage rules may differ — check with your broker about their internal preferences.",
      },
      {
        q: "Can I get a notary same-day?",
        a: "Yes. Walk-ins welcome based on availability; book online for guaranteed slot. Premium members get discounted rate.",
      },
      {
        q: "What about earnest-money checks?",
        a: "We accept all carriers + log every check by amount + sender. SMS/email alert the moment it arrives. Same-day local delivery available.",
      },
    ],
  },
  {
    slug: "attorney",
    name: "Solo Attorneys",
    noun: "solo attorney",
    painPoint:
      "You need a confidential, professional business address — not a P.O. Box — for service of process, client correspondence, and bar registration. And clients expect a real building, not a residence.",
    benefit:
      "A real LA street address that the State Bar + Superior Court accept for service of process. Same-day notary on-site. Mail scanned + privileged.",
    features: [
      "State Bar of California-accepted address",
      "Service of process accepted at the storefront",
      "Same-day notary (walk-in or scheduled)",
      "Attorney-client privileged mail handling protocols",
      "Court filings + opposing counsel correspondence",
      "Confidential shred service for closed matter files",
    ],
    faq: [
      {
        q: "Can I accept service of process here?",
        a: "Yes — service can be accepted at our storefront during business hours. We log every service + notify you immediately. If you need a registered process-agent service for specific lawsuits, ask about our partner network.",
      },
      {
        q: "What about attorney-client privilege?",
        a: "We treat all incoming mail as privileged. We only scan envelopes (not contents) by default. You authorize content scans on a per-item basis from the dashboard.",
      },
      {
        q: "Does the State Bar accept this?",
        a: "Yes. CMRA addresses are accepted by the State Bar of California for license records and required address-of-record filings.",
      },
    ],
  },
  {
    slug: "contractor",
    name: "General Contractors",
    noun: "general contractor",
    painPoint:
      "Your CSLB license + insurance + client invoices need a business address — but you're on job sites all day and mail at your home gets lost or rained on.",
    benefit:
      "A real LA street address for CSLB, insurance certs, and 1099s. Mail logged + photographed the day it arrives. SMS alerts for time-sensitive docs.",
    features: [
      "CSLB-accepted California street address (not a P.O. Box)",
      "Insurance certificate intake + storage",
      "1099 + tax document handling",
      "Client check + lien notice intake",
      "Same-day delivery to job sites in LA",
      "Indoor secure package storage",
    ],
    faq: [
      {
        q: "Will CSLB accept a CMRA address?",
        a: "Yes. CSLB accepts CMRA addresses on contractor licenses. Some specialty boards (electrical, plumbing) have additional requirements — check with your specialty board.",
      },
      {
        q: "Can you deliver to my job site?",
        a: "Yes. Flat $5 in NoHo, $9-$28 across LA. Tracked the whole way. Most clients book recurring weekly drops to specific jobsites.",
      },
      {
        q: "What about lien notices?",
        a: "Lien notices are time-sensitive. We SMS-alert you the moment one arrives + same-day deliver to you if requested. Premium plan includes priority handling for time-sensitive mail.",
      },
    ],
  },
];

export const PERSONAS_BY_SLUG: Record<string, Persona> = Object.fromEntries(
  PERSONAS.map((p) => [p.slug, p]),
);

export function getPersona(slug: string): Persona | null {
  return PERSONAS_BY_SLUG[slug] ?? null;
}

export function getAllPersonaSlugs(): string[] {
  return PERSONAS.map((p) => p.slug);
}
