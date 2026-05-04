// International CMRA SaaS landing pages. The CMRA SaaS engine
// scales globally — any operator with a mailbox/postal/private-mail
// business can license our platform regardless of country.
//
// Mailbox plans + same-day delivery + $2k bundle stay US-only
// (physical LA storefront), but the SaaS license is exportable.

export type IntlCMRAPage = {
  slug: string;
  country: string;
  countryAbbr: string;
  flag: string;
  marketDescription: string;
  cmraEquivalent: string; // local term for CMRA
  marketSize: string;
  topNetworks: string[]; // local network competitors
  ourPitch: string;
  pricingNote: string;
  paymentNote: string;
  legalNote: string;
  faq: { q: string; a: string }[];
};

export const INTL_SAAS_PAGES: IntlCMRAPage[] = [
  {
    slug: "united-kingdom",
    country: "United Kingdom",
    countryAbbr: "UK",
    flag: "🇬🇧",
    marketDescription:
      "The UK has 5,000+ private-mailbox / virtual-office providers serving over 4 million small businesses. The market is fragmented across small-operator chains and a few national brands.",
    cmraEquivalent:
      "Royal Mail Authorised Private Letter Box (PLB) operators or independent mailbox / mail forwarding services. Different regulatory regime than US CMRA — Royal Mail&apos;s rules apply rather than USPS.",
    marketSize: "~4M small businesses · ~5,000 operator locations",
    topNetworks: [
      "UK Postbox",
      "Mailroom UK",
      "Hold Everything",
      "Regus / IWG (virtual office)",
    ],
    ourPitch:
      "Our software handles the operator workflow that&apos;s universal across countries — customer dashboard, mail intake + scanning, dispatch, billing, compliance reporting. We don&apos;t replace your Royal Mail-specific workflows; we layer admin + customer experience on top.",
    pricingNote:
      "Pricing in USD per month. We do not charge VAT (we&apos;re a US company; UK customer responsible for any VAT on the service if applicable). Stripe Connect handles GBP payouts to your account at FX rate.",
    paymentNote:
      "Stripe Connect with GBP support. Your customers pay in GBP; you receive GBP. Our license is billed in USD via Stripe.",
    legalNote:
      "We do not provide legal advice on UK postal regulations. Consult Royal Mail&apos;s PLB authorization rules + GDPR compliance separately. Our platform is GDPR-compatible (data residency configurable).",
    faq: [
      {
        q: "Does your software work with Royal Mail&apos;s PLB workflow?",
        a: "Our software handles customer-facing workflow + admin operations. PLB-specific reporting to Royal Mail is your responsibility per their rules — we provide flexible export tools.",
      },
      {
        q: "GDPR compliance?",
        a: "Customer data can be hosted in EU regions (we use AWS multi-region). DPA available for UK / EU operators. Customer subject access requests handled via admin dashboard.",
      },
      {
        q: "Can I take payments in GBP?",
        a: "Yes — Stripe Connect supports GBP. Your customers pay in their local currency; you receive in your local currency.",
      },
    ],
  },
  {
    slug: "canada",
    country: "Canada",
    countryAbbr: "CA",
    flag: "🇨🇦",
    marketDescription:
      "Canada has 1.2M+ small businesses + 200,000+ home-based operators needing real business addresses. Canada Post + private mailbox operators serve this market with relatively few software platforms.",
    cmraEquivalent:
      "Private mailbox provider — typically registered with Canada Post if forwarding is involved. UPS Store franchises operate in CA with similar mailbox-rental services.",
    marketSize: "~1.2M small businesses · ~3,000 operator locations",
    topNetworks: ["UPS Store CA", "Mail Boxes Etc", "Canada Post xpresspost"],
    ourPitch:
      "Same software stack we run NOHO Mailbox on — adapted for Canadian carrier integrations (Canada Post + Purolator + Canpar instead of USPS + UPS + FedEx). Customer dashboard, member portal, dispatch, billing all work identically.",
    pricingNote:
      "Pricing in USD/month. Canadian customers pay USD or CAD via Stripe Connect. No GST/HST charged by us; customer responsible for own tax compliance.",
    paymentNote:
      "Stripe Connect supports CAD. Your customers pay in CAD; you receive in CAD.",
    legalNote:
      "We do not provide legal advice on Canadian postal regulations. Consult Canada Post + provincial business-licensing requirements.",
    faq: [
      {
        q: "Canada Post integration?",
        a: "Currently no native integration. Manual carrier entry works. Native Canada Post integration is on the roadmap — typical timeline 3-6 months once we have 5+ Canadian operators.",
      },
      {
        q: "Bilingual (French) support?",
        a: "Customer dashboard supports English. French translation is on the roadmap. Quebec operators can request priority for the translation if signing up.",
      },
      {
        q: "Quebec-specific compliance?",
        a: "Quebec has unique consumer-protection rules (Loi sur la protection du consommateur). Consult Quebec-specific counsel for your operator setup.",
      },
    ],
  },
  {
    slug: "australia",
    country: "Australia",
    countryAbbr: "AU",
    flag: "🇦🇺",
    marketDescription:
      "Australia has 2.5M+ active small businesses + a growing remote-worker / digital-nomad segment. Mailbox / virtual-office space is relatively concentrated — opportunity for software-licensed independent operators.",
    cmraEquivalent:
      "Australia Post box-holder or independent private mailbox operator. Australia Post&apos;s Locked Bag Service is the analog to USPS-CMRA.",
    marketSize: "~2.5M small businesses · ~1,500 operator locations",
    topNetworks: [
      "Australia Post Box / Locked Bag",
      "Hub Australia (virtual office)",
      "Servcorp",
    ],
    ourPitch:
      "Same battle-tested operator software — adapted for Australia Post / StarTrack / Aramex carrier integrations. Strong fit for independent operators competing with Australia Post + Servcorp on customer experience + price.",
    pricingNote:
      "Pricing in USD/month. Australian customers pay USD or AUD via Stripe Connect. We do not charge GST.",
    paymentNote: "Stripe Connect supports AUD. Local currency handling.",
    legalNote:
      "Australia Post&apos;s Postal Industry Code (PIC) applies to operators handling Australian mail. Consult an Australian commercial lawyer.",
    faq: [
      {
        q: "Australia Post integration?",
        a: "No native integration yet. Manual entry works. Native integration roadmap depends on operator demand.",
      },
      {
        q: "AUSTRAC reporting (financial transactions)?",
        a: "Operators handling money on customers&apos; behalf may have AUSTRAC reporting obligations. Our software supports CSV exports for any reporting; specific AUSTRAC compliance is your responsibility.",
      },
      {
        q: "Privacy Act 1988 compliance?",
        a: "Our platform supports the Australian Privacy Principles (APPs). Data residency in Australia available for higher tiers.",
      },
    ],
  },
  {
    slug: "mexico",
    country: "Mexico",
    countryAbbr: "MX",
    flag: "🇲🇽",
    marketDescription:
      "Mexico has 4.7M+ MIPYMES (micro/small/medium businesses) + a fast-growing e-commerce sector. Mailbox / parcel-receiving operators serving cross-border (Mexico-US) e-commerce are a particular high-growth niche.",
    cmraEquivalent:
      "Casilla privada / domicilio comercial. SEPOMEX (Mexican postal service) is the official channel; private operators are growing rapidly especially in border cities.",
    marketSize: "~4.7M MIPYMES · ~2,000 operator locations · cross-border boom",
    topNetworks: [
      "Mailboxes Etc México (UPS subsidiary)",
      "SEPOMEX",
      "Servicio Postal Privado",
    ],
    ourPitch:
      "Software optimized for cross-border e-commerce (Mexican operators serving US-Mexico shipping flows). Spanish-language customer dashboard on the roadmap. Strong fit for border-city operators in Tijuana / Juárez / Reynosa.",
    pricingNote:
      "Pricing in USD/month. Mexican customers pay USD or MXN via Stripe Connect. Mexican operators handle SAT (Mexican IRS) compliance separately.",
    paymentNote: "Stripe Connect supports MXN. Local currency handling.",
    legalNote:
      "Cross-border e-commerce has complex import/export rules. Consult Mexican aduana (customs) experts.",
    faq: [
      {
        q: "Spanish-language customer dashboard?",
        a: "On the roadmap. Operators committing to multi-month engagement can prioritize this with us — typically 3-6 months from commitment to ship.",
      },
      {
        q: "SEPOMEX integration?",
        a: "Manual carrier entry. Native integration depends on operator demand + SEPOMEX&apos;s API availability.",
      },
      {
        q: "Cross-border shipping (Mexico-US)?",
        a: "Our software handles forwarding workflows generically. Cross-border specific tax/customs documents are your responsibility per your customs broker.",
      },
    ],
  },
  {
    slug: "global",
    country: "Other countries",
    countryAbbr: "GLOBAL",
    flag: "🌐",
    marketDescription:
      "We license to CMRA / private-mailbox / virtual-office operators globally. The software is country-agnostic at the operator-workflow layer. Country-specific compliance, carrier integrations, and language support are your responsibility (or part of custom enterprise tier).",
    cmraEquivalent:
      "Each country has its own regulatory framework for handling mail on behalf of others. Common terms: virtual office, mailbox rental, postal forwarding, accommodation address.",
    marketSize:
      "~50M small businesses worldwide need real business addresses · enormous TAM",
    topNetworks: [
      "Local national post (varies by country)",
      "Regus / IWG (global)",
      "Servcorp (global)",
      "Local independents (most operators)",
    ],
    ourPitch:
      "Battle-tested operator software at $299-$1,499/mo flat. We don&apos;t scale to every country&apos;s regulatory bureaucracy in v1, but we provide the universal operator workflow layer that 80% of operators need anywhere.",
    pricingNote:
      "Pricing in USD/month. Stripe Connect handles 135+ currencies for your local customer payments.",
    paymentNote:
      "Stripe Connect available in most countries. Verify Stripe operates in your country before signing up.",
    legalNote:
      "We do not provide country-specific legal advice. You are responsible for understanding your country&apos;s postal / business / tax / privacy / data regulations.",
    faq: [
      {
        q: "Do you operate in [my country]?",
        a: "If Stripe operates there + you have internet + you can pay USD per month, yes. We don&apos;t require local presence.",
      },
      {
        q: "Language support?",
        a: "English. Other languages on roadmap. Operators committing to multi-month engagement can request prioritization.",
      },
      {
        q: "Compliance / regulatory help?",
        a: "We provide the software. You provide the local compliance expertise. Custom enterprise tier ($3k+/mo) can include local-compliance-mapping work.",
      },
    ],
  },
];

export const INTL_SAAS_BY_SLUG: Record<string, IntlCMRAPage> = Object.fromEntries(
  INTL_SAAS_PAGES.map((p) => [p.slug, p]),
);

export function getIntlSaasPage(slug: string): IntlCMRAPage | null {
  return INTL_SAAS_BY_SLUG[slug] ?? null;
}

export function getAllIntlSaasSlugs(): string[] {
  return INTL_SAAS_PAGES.map((p) => p.slug);
}
