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
    competitorTag: "the largest CMRA marketplace in the US — a SaaS network that signs up local mailbox stores and post offices as franchised operators.",
    ourAngle:
      "iPostal1 is a marketplace — they rent storefronts and take a 20-40% cut on every handling fee. We&apos;re a single LA storefront that owns the operation end-to-end. No middleman, lower handling fees, and the same human handles your mail every day.",
    rows: [
      { feature: "Business model", us: "Single owner-operated storefront in NoHo", them: "Marketplace / franchise network across US" },
      { feature: "Plan range", us: "$50/3 mo ($16/mo) – $95/3 mo (~$32/mo)", them: "$9.99 – $49.99/mo (varies by location)" },
      { feature: "Real LA street address", us: "5062 Lankershim, NoHo CA", them: "2,500+ franchised locations across US" },
      { feature: "Mail scanning", us: "Free up to 25 pieces/month, $2/page after", them: "$2 per piece scan, sometimes more" },
      { feature: "Handling fees", us: "Flat, listed on /pricing", them: "iPostal1 takes ~20-40% cut on top of operator fees" },
      { feature: "Mail forwarding", us: "Postage + $5", them: "Postage + 25-50% markup" },
      { feature: "Notary on Form 1583", us: "Free with Business + Premium plans", them: "Customer&apos;s expense" },
      { feature: "Same-day delivery", us: "$5 flat in NoHo, $9–$28 LA", them: "Not offered" },
      { feature: "Walk-in storefront", us: "Yes — 5062 Lankershim, Mon-Sat", them: "Operator-dependent (quality varies)" },
      { feature: "Customer-service consistency", us: "Same humans every day", them: "Varies — every franchise is its own shop" },
      { feature: "Operator software (B2B SaaS)", us: "Licensed at $299/mo (Solo) or $799/mo (Multi)", them: "Operator joins iPostal1 network", usWins: true },
    ],
    ourBest: [
      "Single-storefront, not a marketplace — no middleman taking a cut on every handling fee",
      "Same human handles your mail every day — service quality is consistent",
      "Lower handling fees because we&apos;re not paying a SaaS network 20-40%",
      "Same-day local delivery in LA is built into the plan, not a separate add-on",
    ],
    theirBest: [
      "2,500+ physical locations across the US — biggest footprint in the industry",
      "Best choice if you live outside LA and need a local address near you",
      "Established 15-year brand for non-local virtual mailbox needs",
    ],
    switchPitch:
      "iPostal1 is genuinely the largest network and if you live outside LA, they probably have a location near you — that&apos;s a real advantage. But most franchises are individually owned, so customer-service quality varies wildly by operator, and iPostal1 takes a cut of every action which inflates handling fees. We&apos;re a single LA storefront — same humans every day, no middleman cut, lower handling fees.",
    cta: {
      title: "Marketplace vs. real storefront",
      body: "If you&apos;re in LA and have an iPostal1 account at a NoHo / Burbank / Studio City franchise, walk in once. We&apos;ll do a side-by-side. No commitment.",
      href: "/pricing",
      label: "See plans",
    },
  },
  {
    slug: "anytime-mailbox",
    competitorName: "Anytime Mailbox",
    competitorTag: "a SaaS layer that sits on top of rented storefronts — 2,000+ partner addresses across US and international.",
    ourAngle:
      "Anytime Mailbox is a SaaS layer over rented storefronts — they sell the software, partner operators rent shelf space, and you&apos;re really a customer of whoever rents the shelf. We&apos;re operator-owned: same building runs the platform, the storefront, and the delivery. Our same-day delivery is local and cheap; theirs is variable per operator.",
    rows: [
      { feature: "Business model", us: "Operator-owned (we run the shop AND the software)", them: "SaaS layer over rented storefronts" },
      { feature: "Plan range", us: "$50/3 mo ($16/mo) – $95/3 mo (~$32/mo)", them: "$9.99 – $59.95/mo (varies by partner location)" },
      { feature: "Locations", us: "1 (5062 Lankershim, NoHo)", them: "2,000+ partner addresses (US + international)" },
      { feature: "Same-day delivery", us: "$5 NoHo, $9–$28 LA (predictable)", them: "Variable per operator — not standardized" },
      { feature: "Free mail scanning", us: "Up to 25 pieces/mo on most plans", them: "Varies by location, often $2/scan" },
      { feature: "Walk-in storefront", us: "Yes, Mon-Sat — same crew", them: "Operator-dependent — every partner is different" },
      { feature: "Notary on Form 1583", us: "Free on Business+", them: "Customer pays separately" },
      { feature: "Storefront services (notary, shipping)", us: "All under one roof", them: "Mail-only at most partner locations" },
      { feature: "Service-quality consistency", us: "Same operator, every day", them: "Network-wide quality varies by partner" },
      { feature: "Operator software (B2B SaaS)", us: "Licensed at $299–$1,499/mo per location", them: "Anytime SaaS terms (partner pays the network)" },
    ],
    ourBest: [
      "Operator-owned — the same team that runs the software runs the storefront",
      "Same-day delivery is local, predictable, and cheap (not variable per partner)",
      "Free notary in-house saves customers $25 per Form 1583",
      "License our platform if you&apos;re an operator who&apos;d rather own than rent",
    ],
    theirBest: [
      "2,000+ partner locations is unbeatable for non-local virtual addresses",
      "Cross-location address transfers if you move cities",
      "International partner network in 60+ countries",
    ],
    switchPitch:
      "Anytime Mailbox is genuinely the right call if you need an address outside LA — their partner footprint is enormous. The trade-off is that you&apos;re always one layer removed from the operator who actually handles your mail. We&apos;re the operator. Walk in, same building, same humans, same-day delivery on a flat fee schedule.",
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
    competitorTag: "premium B2B virtual mailbox + check deposit + bank-grade integrations, targeted at remote-first enterprises.",
    ourAngle:
      "Earth Class Mail is built for enterprise — $79-$269/month, multi-seat workflows, QuickBooks/NetSuite integrations. We&apos;re ~1/10th the price for the same real-address core. We serve the actual founders; they serve the legal department.",
    rows: [
      { feature: "Target customer", us: "Solo founders + small biz (1-10 person teams)", them: "Enterprise + multi-entity remote-first cos" },
      { feature: "Plan range", us: "$50/3 mo ($16/mo) – $95/3 mo (~$32/mo)", them: "$79/mo (starter) – $269/mo (enterprise)" },
      { feature: "Cost vs Earth Class", us: "Roughly 1/10 the monthly cost on starter tiers", them: "Reflects enterprise feature set" },
      { feature: "Real LA street address", us: "5062 Lankershim, NoHo CA", them: "Major US metros — premium addresses" },
      { feature: "Mail scanning", us: "25 free, $2 after", them: "Included in plan up to plan limits" },
      { feature: "Check deposit (ACH)", us: "Not offered (we&apos;re a CMRA, not a bank)", them: "Yes — bank deposit by mail" },
      { feature: "Same-day local delivery", us: "$5 flat in NoHo, $9–$28 LA", them: "Not offered" },
      { feature: "Walk-in storefront", us: "Yes — Mon-Sat", them: "No physical walk-in" },
      { feature: "QuickBooks / NetSuite integration", us: "Manual export", them: "Native enterprise integrations" },
      { feature: "Multi-user / multi-entity seats", us: "Single-user account model", them: "Multi-user team workspaces" },
      { feature: "Best for", us: "Solo founders + small LA biz", them: "Remote-first enterprise + check-heavy AR teams" },
    ],
    ourBest: [
      "~1/10th the price for solo founders + small biz who don&apos;t need enterprise features",
      "Real walk-in LA storefront — founders can drop in and talk to a human",
      "Same-day local delivery is built in, not a bolt-on enterprise add-on",
      "Free notary on Form 1583 with Business + Premium plans",
    ],
    theirBest: [
      "Check deposit by mail (we don&apos;t do this)",
      "QuickBooks / NetSuite / bank-grade integrations for enterprise AR",
      "Multi-user team workspaces with role-based permissions",
      "Multiple premium metro addresses if enterprise presence in many cities matters",
    ],
    switchPitch:
      "Earth Class Mail is excellent at what it does — enterprise check deposit + accounting integrations. The problem is that 90% of solo founders pay $79-$269/month and never use those features. If you&apos;re a one-person LLC or a 3-person agency, you&apos;re paying enterprise prices for a real-address-and-scanning core that we deliver for ~1/10th the cost. If you actually need ACH deposit and NetSuite sync, stay with them.",
    cta: {
      title: "Enterprise pricing for solo needs?",
      body: "Most of our switchers from Earth Class Mail saved $40-$200/month by paying for the real-address core they actually use, not the enterprise stack they don&apos;t.",
      href: "/pricing",
      label: "See plans",
    },
  },
  {
    slug: "stable",
    competitorName: "Stable",
    competitorTag: "modern digital-only virtual mailbox aimed at remote-first startups — slick UX, no physical retail.",
    ourAngle:
      "Stable is digital-only — they scan and forward, but there&apos;s no walk-in counter and no local delivery network. We have a real LA storefront you can visit and same-day local delivery; they have a portal and USPS mail forwarding. Different products for different customers.",
    rows: [
      { feature: "Storefront model", us: "Real walk-in counter in NoHo, Mon-Sat", them: "Digital-only — no physical retail" },
      { feature: "Local delivery", us: "Same-day, $5 NoHo, $9–$28 LA across 7 zones", them: "Mail forwarding only (USPS/courier)" },
      { feature: "Real address", us: "5062 Lankershim, NoHo CA", them: "SF / NY / multiple metros" },
      { feature: "Plan range", us: "$50/3 mo ($16/mo) – $95/3 mo (~$32/mo)", them: "$35/mo (Starter) – $75/mo (Business)" },
      { feature: "Mail scanning", us: "25 free / $2 after", them: "Limited per-tier, then per-piece" },
      { feature: "Check deposit", us: "No", them: "Yes (paid add-on)" },
      { feature: "Walk-in pickup", us: "Yes — drop in any time during open hours", them: "Not available — forward only" },
      { feature: "Same-day local delivery", us: "Yes — built into the operation", them: "Not offered" },
      { feature: "In-person notary on 1583", us: "Free in-store (Business + Premium)", them: "Customer arranges separately" },
      { feature: "Best for", us: "LA-based founders who want a real storefront", them: "Remote-first early-stage startups, no LA presence needed" },
    ],
    ourBest: [
      "Real walk-in storefront — drop in, pick up, ask questions in person",
      "Same-day local delivery in LA ($5 NoHo / $9–$28 LA) — Stable is forward-only",
      "Free notary on Form 1583 in-store saves $25 each",
      "Single-operator service quality, not a remote SaaS support queue",
    ],
    theirBest: [
      "Slick UX optimized for fully-remote, geography-agnostic teams",
      "Multi-city address presence (SF / NY / etc.)",
      "Check deposit add-on if your business takes physical checks",
      "Better choice if you never want to step into a physical store",
    ],
    switchPitch:
      "Stable is a clean digital product and works great if you&apos;re fully remote and never want to interact with a physical store. But if you&apos;re LA-based, walking in to drop off a wet-signature, picking up a package the same day, or getting a Form 1583 notarized at the counter — that&apos;s not something Stable does. If those moments matter to you, we win. If they don&apos;t, Stable&apos;s product is fine.",
    cta: {
      title: "Digital-only vs. real counter",
      body: "Bring your Stable bill. We&apos;ll match or beat for LA-based customers — and show you what a same-day delivery + walk-in counter actually adds.",
      href: "/pricing",
      label: "See plans",
    },
  },
  {
    slug: "postscan-mail",
    competitorName: "PostScan Mail",
    competitorTag: "mid-market virtual mailbox network — broad US coverage, scanning + forwarding, partner-operator model.",
    ourAngle:
      "PostScan Mail is a solid mid-market network at $15-$45/mo, but you&apos;re still buying service from whichever partner operator runs that local storefront — quality varies. We have lower-cost starting tiers AND we own the storefront, so the service quality is consistent every single visit.",
    rows: [
      { feature: "Business model", us: "We own the storefront — single owner-operated CMRA", them: "Partner-operator network across US" },
      { feature: "Plan range", us: "$50/3 mo ($16/mo) – $95/3 mo (~$32/mo)", them: "$15/mo – $45/mo (varies by location)" },
      { feature: "Lowest entry tier", us: "$50/3 mo ($16.67/mo) — lower than PostScan&apos;s $15/mo Basic when comparing scanning included", them: "$15/mo Basic — usually scanning-extra" },
      { feature: "Real LA street address", us: "5062 Lankershim, NoHo CA — verified", them: "Multiple LA-area partner locations — quality varies" },
      { feature: "Mail scanning", us: "25 free / $2 after", them: "Per-piece — varies by partner" },
      { feature: "Walk-in storefront", us: "Yes — Mon-Sat, same team", them: "Operator-dependent — every partner is different" },
      { feature: "Service-quality consistency", us: "Same operator, every day", them: "Quality varies by partner location" },
      { feature: "Same-day delivery", us: "$5 in NoHo, $9–$28 LA", them: "Not standard" },
      { feature: "Notary on Form 1583", us: "Free with Business / Premium", them: "Customer&apos;s expense" },
      { feature: "B2B SaaS license", us: "$299-$1,499/mo (own your platform)", them: "Operator joins PostScan network", usWins: true },
    ],
    ourBest: [
      "Owner-operated — the same crew handles your mail every visit, not a different partner",
      "Lower-cost starting tier when you factor in included scanning + free notary",
      "Same-day local delivery is built in, not partner-dependent",
      "License our software if you&apos;re an operator tired of joining a network",
    ],
    theirBest: [
      "Much wider US footprint than a single LA storefront",
      "Established 20+ year brand recognition in the virtual-mailbox category",
      "Multiple metro addresses if you need presence in many cities",
    ],
    switchPitch:
      "PostScan Mail&apos;s broader footprint is a real advantage if you live outside LA — they have partner operators across most US metros. The catch is that you&apos;re buying service quality from whichever partner runs the location, and that varies. If you&apos;re LA-based and want a single storefront where you know the same humans handle your mail every day, walk in.",
    cta: {
      title: "Lower-cost tier + consistent service",
      body: "We own the storefront and the platform. Same humans every day, free notary, same-day delivery built in.",
      href: "/pricing",
      label: "See plans",
    },
  },
  {
    slug: "traveling-mailbox",
    competitorName: "Traveling Mailbox",
    competitorTag: "popular nomad-focused virtual mailbox — built around USPS forwarding for travelers and expats.",
    ourAngle:
      "Traveling Mailbox is excellent for digital nomads who only need USPS handled — but they&apos;re USPS-focused. We accept all carriers (FedEx, UPS, DHL, Amazon, freight) and we have a real LA storefront. If a package shows up via UPS or you want a same-day pickup, we&apos;re built for that; they aren&apos;t.",
    rows: [
      { feature: "Carrier coverage", us: "All carriers — USPS, FedEx, UPS, DHL, Amazon, freight", them: "Primarily USPS-focused" },
      { feature: "Plan range", us: "$50/3 mo ($16/mo) – $95/3 mo (~$32/mo)", them: "$15/mo (Basic) – $55/mo (Premium)" },
      { feature: "Physical storefront", us: "Real LA storefront — walk in Mon-Sat", them: "No public walk-in counter" },
      { feature: "Real LA street address", us: "5062 Lankershim, NoHo CA", them: "NC + multiple US locations (no LA)" },
      { feature: "FedEx / UPS / DHL acceptance", us: "Yes — all carriers received and logged", them: "Limited / not the focus" },
      { feature: "Amazon package handling", us: "Yes — high volume welcome", them: "Not the focus" },
      { feature: "Same-day local delivery", us: "$5 NoHo, $9–$28 LA across 7 zones", them: "Not offered" },
      { feature: "Mail scanning", us: "25 free / $2 after", them: "Per-piece scanning limits" },
      { feature: "Notary on 1583", us: "Free with Business + Premium", them: "Customer expense" },
      { feature: "Walk-in counter", us: "Yes", them: "No" },
      { feature: "Operator licensing", us: "$299-$1,499/mo", them: "Not offered", usWins: true },
    ],
    ourBest: [
      "Accept all carriers — FedEx, UPS, DHL, Amazon, freight (not just USPS)",
      "Real LA walk-in storefront, Mon-Sat",
      "Same-day local delivery in LA built into the operation",
      "Free notary on Form 1583 (saves $25 per Form)",
    ],
    theirBest: [
      "Strong reputation in the digital-nomad and expat community for USPS mail forwarding",
      "Lower entry-tier price for USPS-only customers ($15/mo Basic)",
      "Multiple US locations if you don&apos;t need LA specifically",
      "Established workflow optimized for travelers receiving only USPS",
    ],
    switchPitch:
      "Traveling Mailbox is genuinely well-built for the nomad use case — if you only get USPS mail and your priority is reliable scanning + forwarding while you&apos;re overseas, they&apos;re a great fit. But if you&apos;re an LA-based founder or small biz, you probably get FedEx and UPS deliveries too, and you probably want a real address you can walk into. We accept everything and we have the storefront.",
    cta: {
      title: "All carriers, real storefront",
      body: "If you&apos;re in LA and get more than just USPS — FedEx, UPS, DHL, Amazon — walk in. We accept everything.",
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
      { feature: "Same-day delivery", us: "$5 NoHo, $9–$28 LA", them: "Not offered" },
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
