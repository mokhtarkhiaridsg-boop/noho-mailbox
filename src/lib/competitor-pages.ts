// Competitor comparison pages. Captures high-conversion "[competitor] alternative"
// and "[us] vs [them]" buying-intent searches. Honest but pointed positioning.

export type CompetitorPage = {
  slug: string;
  competitorName: string;
  competitorTag: string; // short tag like "the original CMRA SaaS"
  ourAngle: string; // 1-line summary of why we win for the right ICP
  rows: { feature: string; us: string; them: string; usWins?: boolean }[];
  ourBest: string[];
  theirBest: string[];
  switchPitch: string; // copy block for "why switch"
  cta: { title: string; body: string; href: string; label: string };
};

export const COMPETITOR_PAGES: CompetitorPage[] = [
  {
    slug: "ipostal1",
    competitorName: "iPostal1",
    competitorTag: "the most popular CMRA SaaS — bought by post offices, mailbox stores, and virtual addresses across the US.",
    ourAngle:
      "iPostal1 is fine if you want a virtual mailbox and are willing to pay $10–$30/month plus per-piece fees. We&apos;re cheaper at scale, transparent on pricing, and built for both customers AND CMRA operators (we sell to both).",
    rows: [
      { feature: "Real LA street address", us: "5062 Lankershim, NoHo CA", them: "100+ locations across US" },
      { feature: "Mail scanning", us: "Free up to 25 pieces/month, $2/page after", them: "$2 per piece scan, sometimes more" },
      { feature: "Mail forwarding", us: "Postage + $5", them: "Postage + 25-50% markup" },
      { feature: "Notary on Form 1583", us: "Free with Business + Premium plans", them: "Customer&apos;s expense" },
      { feature: "Same-day delivery", us: "$5 flat in NoHo, $9.75–$24 LA", them: "Not offered" },
      { feature: "Walk-in storefront", us: "Yes — 5062 Lankershim, Mon-Sat", them: "Operator-dependent" },
      { feature: "USPS-CMRA certification", us: "Yes — fully compliant", them: "Yes — varies by location" },
      { feature: "Pricing transparency", us: "Listed on /pricing, no hidden fees", them: "Variable per-location, per-action fees" },
      { feature: "Operator software (B2B SaaS)", us: "Licensed at $299/mo (Solo) or $799/mo (Multi)", them: "Operator joins iPostal1 network", usWins: true },
    ],
    ourBest: [
      "Operating CMRA — we ship customers daily so the platform has been battle-tested",
      "Better for LA-area customers (hyperlocal pricing, walk-in counter)",
      "License our platform if you&apos;re an operator vs joining iPostal1&apos;s network",
      "$5 flat same-day delivery available — not a feature on iPostal1",
    ],
    theirBest: [
      "100+ physical locations across US (we&apos;re LA-only as a storefront)",
      "Established brand for non-local virtual mailbox needs",
      "Multiple-package consolidation across address pickups",
    ],
    switchPitch:
      "Most of our switchers come from iPostal1 NoHo / Burbank / Studio City locations because (1) we&apos;re cheaper on monthly + scanning, (2) we have a real walk-in counter, and (3) we offer same-day delivery as part of the box. If you&apos;re outside LA, iPostal1 is probably the better fit. If you&apos;re in LA, walk in and we&apos;ll show you the difference.",
    cta: {
      title: "Try us first run free",
      body: "If you&apos;re in NoHo / Burbank / Studio City and have an iPostal1 account, walk in once. We&apos;ll do a side-by-side. No commitment.",
      href: "/pricing",
      label: "See plans",
    },
  },
  {
    slug: "anytime-mailbox",
    competitorName: "Anytime Mailbox",
    competitorTag: "another major virtual mailbox network with 1,500+ partner addresses.",
    ourAngle:
      "Anytime Mailbox excels at being a network — they have addresses everywhere. We excel at being a real shop with real humans. If you need an address in 50 cities, use them. If you need a real mailroom in NoHo, walk in.",
    rows: [
      { feature: "Locations", us: "1 (5062 Lankershim, NoHo)", them: "1,500+ across US + international" },
      { feature: "Same-day delivery", us: "$5 NoHo, $9.75–$24 LA", them: "Not offered" },
      { feature: "Free mail scanning", us: "Up to 25 pieces/mo on most plans", them: "Varies by location, often $2/scan" },
      { feature: "Plan types", us: "Basic / Business / Premium ($50–$95 / 3mo)", them: "$10–$30/mo per location, varies" },
      { feature: "Walk-in storefront", us: "Yes, Mon-Sat", them: "Operator-dependent" },
      { feature: "Notary on Form 1583", us: "Free on Business+", them: "Customer pays separately" },
      { feature: "Storefront services (notary, shipping)", us: "All under one roof", them: "Mail-only at most locations" },
      { feature: "Operator software (B2B SaaS)", us: "Licensed at $299–$1,499/mo per location", them: "Anytime franchise terms" },
    ],
    ourBest: [
      "Local depth in LA — same-day delivery, walk-in, in-person notary",
      "All-in-one shop (mail + delivery + notary + business solutions)",
      "Transparent flat pricing",
      "Open the platform for license to other CMRAs",
    ],
    theirBest: [
      "1,500+ locations is unbeatable for non-local virtual addresses",
      "Cross-location address transfers if you move cities",
      "International network",
    ],
    switchPitch:
      "If you&apos;re in LA and use Anytime Mailbox at a local partner, switch costs are low and you get full storefront services + same-day delivery. If you live somewhere else, Anytime Mailbox&apos;s network is hard to beat.",
    cta: {
      title: "If you&apos;re in LA, walk in",
      body: "5062 Lankershim, Mon-Sat. We&apos;ll show you what same-day delivery + walk-in notary + Form 1583 free means in practice.",
      href: "/pricing",
      label: "Plans + pricing",
    },
  },
  {
    slug: "legalzoom",
    competitorName: "LegalZoom",
    competitorTag: "the largest online business formation service — millions of LLCs filed.",
    ourAngle:
      "LegalZoom is fine for the bare-bones $79 + state fee LLC filing. If you want LLC + EIN + brand kit + website + 12 months of real business address, our $2,000 bundle is cheaper than buying those separately from LegalZoom and you talk to a human in NoHo.",
    rows: [
      { feature: "LLC filing", us: "Included in $2,000 bundle", them: "$79 (Basic) / $349 (Pro)" },
      { feature: "EIN with the IRS", us: "Included", them: "$79 add-on" },
      { feature: "Operating Agreement", us: "Included template + customization", them: "$99 add-on" },
      { feature: "Brand book (logo, type, color, 50 cards)", us: "Included", them: "Not offered" },
      { feature: "5-page website on your domain", us: "Included", them: "Not offered (separate Squarespace/Wix)" },
      { feature: "Real business address (12 months)", us: "Included (5062 Lankershim, NoHo)", them: "$249/yr add-on (just mail forwarding)" },
      { feature: "Form 1583 notary", us: "Included", them: "Customer&apos;s expense" },
      { feature: "Phone support during setup", us: "Real human in NoHo", them: "Phone tree, escalation" },
      { feature: "Total piecemeal year-1 cost", us: "$2,000 flat", them: "$2,500–$3,500 with all add-ons" },
    ],
    ourBest: [
      "All-in-one bundle vs LegalZoom&apos;s 6-add-on cart pattern",
      "Real LA address included (vs LegalZoom&apos;s $249/yr add-on)",
      "Brand kit + website included",
      "Walk into our shop in NoHo if you&apos;re LA-based",
    ],
    theirBest: [
      "Brand recognition and trust",
      "Can file in any state (we partner with state agents but are LA-rooted)",
      "Self-service web flow if you don&apos;t want to talk to anyone",
    ],
    switchPitch:
      "If you want to talk to a real human in NoHo who&apos;ll handle the whole stack, we&apos;re cheaper than the LegalZoom Pro plan with all the add-ons. If you&apos;re a click-and-go DIY-er, LegalZoom is fine.",
    cta: {
      title: "$2,000 all-in vs ~$3,000 piecemeal",
      body: "California LLC + EIN + brand book + 5-page website + 12 months of real LA address — $2,000 flat. Real shop, no upsell cart.",
      href: "/business-solutions",
      label: "See the bundle",
    },
  },
  {
    slug: "northwest-registered-agent",
    competitorName: "Northwest Registered Agent",
    competitorTag: "premium registered-agent service with strong reviews and a privacy-first reputation.",
    ourAngle:
      "Northwest is the best at registered-agent service alone. We&apos;re different — we bundle formation + brand + website + a real LA business address into one $2,000 transaction.",
    rows: [
      { feature: "LLC filing", us: "Included in bundle", them: "$100 + state fee" },
      { feature: "Registered agent year 1", us: "Partnered for non-CA states", them: "Free year 1 with formation, $125/yr after" },
      { feature: "Real business address", us: "Yes (5062 Lankershim)", them: "Not offered (registered agent address only)" },
      { feature: "EIN service", us: "Included free", them: "$200 add-on" },
      { feature: "Brand book + website", us: "Included", them: "Not offered" },
      { feature: "Mail forwarding", us: "Postage + $5", them: "Limited mail forwarding included" },
      { feature: "Privacy", us: "Strong (CMRA address)", them: "Strong (registered agent privacy)" },
      { feature: "Total year-1 cost", us: "$2,000", them: "~$300 + add-ons (~$700 with EIN + Operating Agreement)" },
    ],
    ourBest: [
      "All-in-one stack vs registered-agent-only",
      "Real LA business address (good for local credibility, banking, marketplaces)",
      "Brand and website included",
    ],
    theirBest: [
      "Best-in-class registered agent service if that&apos;s ALL you need",
      "Lower cost if you only want filing + agent + privacy",
      "Privacy-focused reputation",
    ],
    switchPitch:
      "We&apos;re not really the same product. If you only need a registered agent, Northwest is great. If you want the brand + website + real address bundled, talk to us.",
    cta: {
      title: "Different products, different needs",
      body: "If you need a $2,000 launch package vs a $300 registered-agent only, we&apos;re your call.",
      href: "/business-solutions",
      label: "See the bundle",
    },
  },
  {
    slug: "earth-class-mail",
    competitorName: "Earth Class Mail",
    competitorTag: "premium virtual mailbox + check deposit + bank-grade integrations.",
    ourAngle:
      "Earth Class Mail is excellent if you&apos;re a remote-first company that needs ACH check deposit and bank-grade integrations and you can pay $69-$199/month. We&apos;re built for solopreneurs and operators who don&apos;t want to pay enterprise prices for a real address.",
    rows: [
      { feature: "Real LA street address", us: "5062 Lankershim, NoHo CA", them: "Major US metros — premium addresses" },
      { feature: "Starting price", us: "$50/3 months ($16/mo)", them: "$69/mo (Mailroom plan)" },
      { feature: "Mail scanning", us: "25 free, $2 after", them: "Included in plan up to limits" },
      { feature: "Check deposit (ACH)", us: "Not offered (we&apos;re a CMRA, not a bank)", them: "Yes — bank deposit by mail" },
      { feature: "Same-day local delivery", us: "$5 flat in NoHo", them: "Not offered" },
      { feature: "Walk-in storefront", us: "Yes", them: "No" },
      { feature: "QuickBooks / Xero integration", us: "Manual export", them: "Native integrations" },
      { feature: "Best for", us: "LA-area solopreneurs, small biz, CMRA operators", them: "Remote-first cos with check-heavy AR" },
    ],
    ourBest: [
      "Way cheaper for the basic real-address use case",
      "Walk-in storefront for LA customers",
      "Same-day delivery option built in",
      "Free notary on Form 1583 with Business + Premium plans",
    ],
    theirBest: [
      "Check deposit by mail (we don&apos;t do this)",
      "Bank/QuickBooks/Xero integrations",
      "Multiple metro addresses if presence in many cities matters",
    ],
    switchPitch:
      "If you don&apos;t need check deposit and you don&apos;t need 5 city addresses, you&apos;re paying for features you won&apos;t use. We do the real-address-and-mail-scanning core for ~75% less.",
    cta: {
      title: "Try us if check deposit isn&apos;t a must",
      body: "Most of our switchers from Earth Class Mail downgraded their needs and saved $40-$150/month.",
      href: "/pricing",
      label: "See plans",
    },
  },
  {
    slug: "stable",
    competitorName: "Stable",
    competitorTag: "modern virtual mailbox aimed at startups and remote-first teams.",
    ourAngle:
      "Stable is well-designed and integrates with modern accounting tools. We&apos;re a real CMRA with a real walk-in counter and our own SaaS license — built by operators, not VCs.",
    rows: [
      { feature: "Real address", us: "5062 Lankershim, NoHo CA", them: "SF / NY / multiple metros" },
      { feature: "Starting price", us: "$50/3 mo ($16/mo)", them: "$25/mo (Starter)" },
      { feature: "Annual discount", us: "Quarter prepay (3 mo)", them: "Annual prepay (saves 20%)" },
      { feature: "Mail scanning", us: "25 free / $2 after", them: "Limited per-tier, then per-piece" },
      { feature: "Check deposit", us: "No", them: "Yes (paid add-on)" },
      { feature: "Same-day local delivery", us: "$5 in NoHo", them: "Not offered" },
      { feature: "Walk-in storefront", us: "Yes", them: "No (operator-staffed depot)" },
      { feature: "Free notary on 1583", us: "Yes (Business + Premium)", them: "No" },
      { feature: "Best for", us: "LA solopreneurs + CMRA operators", them: "Remote-first early-stage startups" },
    ],
    ourBest: [
      "Real walk-in storefront customers can visit",
      "Free notary saves customers $25 every Form 1583",
      "Same-day delivery feature ($5 NoHo / $9.75 LA / $24 boutique runs)",
      "License our platform if you&apos;re an operator",
    ],
    theirBest: [
      "Slick UX optimized for VC-backed startups",
      "Multi-city address presence",
      "Check deposit add-on if you need it",
    ],
    switchPitch:
      "If you&apos;re an LA-based startup, walk in and we&apos;ll show you the difference. The pricing is roughly equivalent on the basic tier, but you get notary + walk-in counter + same-day delivery + a real human at the front counter.",
    cta: {
      title: "Walk in for a side-by-side",
      body: "Bring your Stable bill. We&apos;ll match or beat for LA-based customers.",
      href: "/pricing",
      label: "See plans",
    },
  },
  {
    slug: "postscan-mail",
    competitorName: "PostScan Mail",
    competitorTag: "long-running virtual mailbox network with US locations + scanning.",
    ourAngle:
      "PostScan Mail is widely available but operator-quality is uneven. We&apos;re an operator-first CMRA in LA with our own software stack — and we license that stack to operators tired of joining a network.",
    rows: [
      { feature: "Real LA street address", us: "5062 Lankershim, NoHo CA — verified", them: "Multiple LA-area locations — quality varies" },
      { feature: "Starting price", us: "$50/3 mo ($16/mo)", them: "$10-$30/mo (varies by location)" },
      { feature: "Mail scanning", us: "25 free / $2 after", them: "Per-piece — varies" },
      { feature: "Walk-in storefront", us: "Yes — Mon-Sat", them: "Operator-dependent" },
      { feature: "Same-day delivery", us: "$5 in NoHo", them: "Not standard" },
      { feature: "Notary", us: "Free with Business / Premium", them: "Customer&apos;s expense" },
      { feature: "B2B SaaS license", us: "$299-$1,499/mo (own your platform)", them: "Operator joins PostScan network", usWins: true },
    ],
    ourBest: [
      "Direct operator — you&apos;re not relying on a 3rd-party franchisee",
      "Free notary saves customers per Form 1583",
      "Operator option: license our software vs. joining a network",
      "Same-day local delivery is built in",
    ],
    theirBest: [
      "Wider US footprint",
      "Established brand recognition",
      "Multiple metro addresses if you need presence everywhere",
    ],
    switchPitch:
      "If you&apos;re LA-based and tired of the location lottery (some PostScan operators are great, some aren&apos;t), we&apos;re a single direct CMRA you can walk into. If you&apos;re an operator currently paying PostScan licensing, we&apos;ll show you what owning your platform looks like.",
    cta: {
      title: "Direct operator, real walk-in",
      body: "We don&apos;t outsource the storefront. You walk in to the same building that runs the platform.",
      href: "/pricing",
      label: "See plans",
    },
  },
  {
    slug: "traveling-mailbox",
    competitorName: "Traveling Mailbox",
    competitorTag: "virtual mailbox brand focused on simple per-piece pricing.",
    ourAngle:
      "Traveling Mailbox is straightforward and works fine if you live anywhere in the US. We win for LA-area customers because we have the storefront, the same-day delivery network, and free notary on Form 1583.",
    rows: [
      { feature: "Real LA street address", us: "5062 Lankershim, NoHo CA", them: "NC + multiple US locations" },
      { feature: "Starting price", us: "$50/3 mo ($16/mo)", them: "$15/mo (Basic)" },
      { feature: "Pieces per month", us: "Unlimited recipient addresses", them: "Per-piece scanning limits" },
      { feature: "Same-day delivery", us: "$5 NoHo, $9.75-$24 LA", them: "Not offered" },
      { feature: "Walk-in counter", us: "Yes", them: "No" },
      { feature: "Notary on 1583", us: "Free with Business + Premium", them: "Customer expense" },
      { feature: "Operator licensing", us: "$299-$1,499/mo", them: "Not offered", usWins: true },
    ],
    ourBest: [
      "Walk-in storefront LA customers can use",
      "Same-day delivery built in",
      "Free notary on Form 1583",
      "License our SaaS if you&apos;re an operator",
    ],
    theirBest: [
      "Lower base price for the absolute minimum mail-scanning case",
      "Multiple US locations if you don&apos;t care about LA",
    ],
    switchPitch:
      "If you&apos;re LA-based and want a real walk-in counter, free notary, and same-day delivery as part of your mailbox plan, we win. If you&apos;re anywhere else and just want cheap mail scanning, Traveling Mailbox is fine.",
    cta: {
      title: "LA-based?",
      body: "If you&apos;re in LA, walk in and we&apos;ll show you the difference. Bring your Traveling Mailbox bill — we&apos;ll match or beat.",
      href: "/pricing",
      label: "See plans",
    },
  },
  {
    slug: "zenbusiness",
    competitorName: "ZenBusiness",
    competitorTag: "LLC formation + ongoing compliance services aimed at first-time founders.",
    ourAngle:
      "ZenBusiness is fine for the absolute basics if you live anywhere in the US. We win when you actually need a real LA address that works for banking and platforms — and a real human who picks up the phone when something goes wrong.",
    rows: [
      { feature: "Base LLC formation price", us: "$2,000 (full bundle)", them: "$0 + state fee (Starter)" },
      { feature: "What's actually included", us: "LLC + EIN + Brand + 5-page site + 12mo mailbox + notary", them: "LLC filing only" },
      { feature: "EIN", us: "Included", them: "$70+ add-on" },
      { feature: "Operating Agreement", us: "Included", them: "Premium tier only ($199+)" },
      { feature: "Real LA street address", us: "Included (Premium tier of address)", them: "Address service add-on (varies by state)" },
      { feature: "Website", us: "5-page custom included", them: "Add-on $90+/mo" },
      { feature: "Brand kit (logo, colors, type)", us: "Included", them: "Not offered" },
      { feature: "Personal account manager", us: "Yes — direct line", them: "Tiered support, no dedicated rep" },
      { feature: "Walk-in counter", us: "Yes (LA)", them: "No physical location" },
    ],
    ourBest: [
      "Real LA-based human who owns your engagement start to finish",
      "Bundle includes brand kit + website that ZenBusiness doesn&apos;t do at all",
      "$2,000 flat — most piecemeal services run $4-6k for the same components",
      "Walk-in storefront for wet-signature paperwork",
    ],
    theirBest: [
      "Cheaper if you only need the absolute minimum (LLC filing only)",
      "Operates in all 50 states (we focus on CA + LA-area founders)",
      "Bundled compliance / annual report reminders for ongoing fees",
    ],
    switchPitch:
      "ZenBusiness's $0 starter is bait — by the time you add EIN ($70), Operating Agreement ($199), Address service ($199/yr+), and a basic website ($90+/mo), you're at $1500-$2500. We charge a flat $2,000 and you get a real LA address, a brand kit, and a 5-page site that they don&apos;t even offer.",
    cta: {
      title: "Bundle vs piecemeal",
      body: "If you live anywhere in the US and just need the LLC paperwork, ZenBusiness works. If you need the LLC + brand + site + LA address, our bundle is cheaper and cleaner.",
      href: "/business-solutions",
      label: "See the bundle",
    },
  },
  {
    slug: "bizee",
    competitorName: "Bizee (formerly Incfile)",
    competitorTag: "free LLC filing + state filing services with optional add-ons.",
    ourAngle:
      "Bizee&apos;s free filing is real but minimal — you get the LLC filed, and then they upsell hard on EIN, registered agent, website, etc. We win for founders who'd rather pay one bundled price for everything done right.",
    rows: [
      { feature: "Filing fee", us: "$2,000 (full bundle)", them: "$0 + state fee" },
      { feature: "EIN", us: "Included", them: "$70 (or DIY)" },
      { feature: "Registered agent year 1", us: "Included via our address", them: "Free 1st year, then $119/yr" },
      { feature: "Operating Agreement", us: "Included", them: "Add-on (Gold tier $199+)" },
      { feature: "Real LA street address", us: "Included (Premium mailbox)", them: "Not offered" },
      { feature: "Website", us: "5-page custom included", them: "Domain only ($15/yr)" },
      { feature: "Brand kit", us: "Included", them: "Not offered" },
      { feature: "Form 1583 notary", us: "Included free", them: "Not offered" },
      { feature: "Walk-in counter", us: "Yes (LA)", them: "Online only" },
    ],
    ourBest: [
      "Bundle includes everything: brand, site, address, mail, EIN, OA",
      "Free notary on Form 1583 (saves $25 each)",
      "Real LA storefront for in-person paperwork",
      "Single accountable owner of your launch (not a help-desk queue)",
    ],
    theirBest: [
      "$0 base price for LLC-only customers (we charge for the bundle)",
      "Operates nationwide (we focus on CA + LA founders)",
      "Self-service tools for cost-conscious filers",
    ],
    switchPitch:
      "Bizee's free LLC + their upsells (EIN, OA, RA, basic site) typically lands at $1500-$2500 by year 2. We're $2,000 flat for substantially more (brand kit, real 5-page site, LA address, notary). And after year 1, our address is just $50-$295 / 3 months — Bizee's RA is $119/yr forever.",
    cta: {
      title: "When the bundle wins",
      body: "If you only need a filed LLC and you'll DIY everything else, Bizee is fine. If you want the whole launch handled, our bundle gets you there in 14 days.",
      href: "/business-solutions",
      label: "See the bundle",
    },
  },
  {
    slug: "ups-store",
    competitorName: "UPS Store (PMB)",
    competitorTag: "private mailbox at any UPS Store franchise — the most ubiquitous CMRA in the US.",
    ourAngle:
      "UPS Store works. It's a real CMRA-certified address. We win when you want a single human-staffed local CMRA with mail scanning, free notary, and same-day delivery — features most UPS Store franchises don&apos;t bundle.",
    rows: [
      { feature: "Real LA street address", us: "5062 Lankershim, NoHo CA", them: "20+ UPS Store locations in LA" },
      { feature: "Starting price", us: "$50/3 mo ($16/mo)", them: "$20-$50/mo (varies by location)" },
      { feature: "Mail scanning", us: "25 free / $2 after", them: "Not standard — physical pickup only" },
      { feature: "Mail forwarding", us: "Postage + $5", them: "Postage + per-piece handling fee" },
      { feature: "Notary on Form 1583", us: "Free with Business + Premium", them: "$10-$20 per notarization" },
      { feature: "Same-day delivery", us: "$5 NoHo, $9.75-$24 LA", them: "Not offered" },
      { feature: "Walk-in counter", us: "Yes — Mon-Sat", them: "Yes — Mon-Sat at every franchise" },
      { feature: "Operator licensing", us: "$299-$1,499/mo", them: "Not offered to operators", usWins: true },
    ],
    ourBest: [
      "Mail scanning included — most UPS Store franchises don&apos;t scan",
      "Free notary saves $10-$20 per Form 1583",
      "Same-day local delivery is a feature, not a separate service",
      "License our software if you&apos;re an operator",
    ],
    theirBest: [
      "100+ UPS Store locations in LA — physically closer to wherever you live",
      "USPS + UPS shipping done at the same counter",
      "Strong brand recognition — clients recognize the address",
    ],
    switchPitch:
      "If you want to physically pick up your mail and you live near a UPS Store, that store works. If you want mail scanning, free notary on every Form 1583, and same-day delivery built into your plan, our bundle wins on features and on price (we're cheaper than most LA UPS Store boxes by $5-$15/mo).",
    cta: {
      title: "Mail scanning included",
      body: "Most UPS Stores charge per-piece for scanning, or don&apos;t offer it at all. Ours is included up to 25 pieces/mo, $2 after. Big difference for digital-first owners.",
      href: "/pricing",
      label: "See plans",
    },
  },
];

export const COMPETITOR_BY_SLUG: Record<string, CompetitorPage> = Object.fromEntries(
  COMPETITOR_PAGES.map((c) => [c.slug, c]),
);

export function getCompetitor(slug: string): CompetitorPage | null {
  return COMPETITOR_BY_SLUG[slug] ?? null;
}

export function getAllCompetitorSlugs(): string[] {
  return COMPETITOR_PAGES.map((c) => c.slug);
}
