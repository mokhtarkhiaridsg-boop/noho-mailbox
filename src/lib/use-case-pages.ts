// Use-case / buyer-persona landing pages. Highly targeted at specific
// search intent like "best mailing address for Etsy sellers" or
// "virtual address for online coaches". Each page funnels to either
// /pricing (mailbox plans) or /business-solutions (LLC bundle), depending
// on which conversion path fits the persona best.

export type UseCasePage = {
  slug: string;
  persona: string; // short tag — "Etsy sellers", "Online coaches"
  searchQueries: string[]; // queries this page targets
  hero: {
    eyebrow: string;
    headline: string;
    sub: string;
  };
  problem: { title: string; body: string };
  whyOurAddress: string[]; // bullets
  bundleAngle: string; // pitch for the $2k bundle for this persona
  primaryCta: { label: string; href: string };
  secondaryCta: { label: string; href: string };
  faq: { q: string; a: string }[];
};

export const USE_CASE_PAGES: UseCasePage[] = [
  {
    slug: "etsy-sellers",
    persona: "Etsy sellers",
    searchQueries: [
      "etsy LLC address",
      "real address for etsy shop",
      "etsy seller virtual mailbox",
      "etsy 1099 home address protection",
    ],
    hero: {
      eyebrow: "Etsy + Shopify Sellers",
      headline: "A real address Etsy accepts — without putting your home on every order.",
      sub: "Etsy requires a verified physical address for your seller profile. Don&apos;t use your apartment. Use a real Los Angeles street address you can also use for your LLC, your bank, and your 1099-K.",
    },
    problem: {
      title: "Why your home address is the wrong choice",
      body:
        "Etsy displays your business address inside dispute resolution, and platforms occasionally surface it on order documents. PO boxes are rejected by Etsy&apos;s verification. Coworking addresses get blocked when their lease holders flag them. You need a real, USPS-accepted, CMRA-certified address — and ours is.",
    },
    whyOurAddress: [
      "Real Los Angeles street address — Etsy accepts it on signup and verification",
      "USPS-accepted CMRA — also works for your seller bank account",
      "Free notarized Form 1583 with Business + Premium plans (most other CMRAs charge $25)",
      "Mail scanning included — see 1099-Ks and tax documents the day they arrive",
      "$50 / 3 months entry tier (versus $20+/mo for non-LA virtual mailboxes)",
    ],
    bundleAngle:
      "Pairing well with the $2,000 Business Launch Bundle: a real address is one piece. Most serious Etsy sellers also need an LLC (for liability when a customer sues over a damaged listing), an EIN (for sales tax), and a basic 5-page website. We do all of it for $2,000 all-in.",
    primaryCta: { label: "See mailbox plans", href: "/pricing" },
    secondaryCta: { label: "$2k Etsy launch bundle", href: "/business-solutions" },
    faq: [
      {
        q: "Will Etsy accept a CMRA address?",
        a: "Yes. Etsy verifies that the address is a real physical location it can mail to. Our 5062 Lankershim Blvd address is USPS-CMRA certified and used by thousands of sellers.",
      },
      {
        q: "Can I use the address for my Etsy seller bank account?",
        a: "Yes. Major banks (Chase, BofA, Wells Fargo, Mercury, Novo) accept our Lankershim address with a notarized Form 1583. We provide the notary free with our Business and Premium plans.",
      },
      {
        q: "What if Etsy mails me something — like a tax form?",
        a: "Mail comes to our box. We scan the envelope (free, up to 25 pieces/month) and you decide: forward, shred, or pick up. Tax forms typically arrive late January.",
      },
      {
        q: "Is this just a virtual address or can I actually walk in?",
        a: "Real walk-in storefront. 5062 Lankershim Blvd, North Hollywood, CA 91601. Mon-Sat. Bring ID and we&apos;ll set you up in 15 minutes.",
      },
    ],
  },
  {
    slug: "amazon-sellers",
    persona: "Amazon FBA + Seller Central sellers",
    searchQueries: [
      "amazon seller central business address",
      "amazon FBA virtual address",
      "real address for amazon seller verification",
      "amazon LLC formation address",
    ],
    hero: {
      eyebrow: "Amazon FBA + Seller Central",
      headline: "Pass Amazon&apos;s Seller Central verification on the first try.",
      sub: "Amazon&apos;s seller verification rejects PO boxes, mail-forwarding addresses with too many flagged accounts, and any address it can&apos;t verify against USPS. Our Lankershim Blvd address is USPS-CMRA certified, has zero verification flags in our records, and works for both Seller Central and FBA inventory.",
    },
    problem: {
      title: "Why most CMRA addresses fail Amazon",
      body:
        "Amazon checks the address against a USPS database AND a private fraud database. Mass-market virtual mailbox networks (especially the cheap ones) get flagged because thousands of suspended accounts share the same address. We&apos;re a single direct CMRA in LA — much smaller verification surface, much cleaner fraud profile.",
    },
    whyOurAddress: [
      "USPS-CMRA certified — verifiable in Amazon&apos;s checks",
      "Single-CMRA address (not a multi-tenant national network with thousands of seller accounts)",
      "Mail scanning catches Amazon&apos;s verification postcards (so you don&apos;t miss the verification window)",
      "Free notarized Form 1583 with Business + Premium plans",
      "Real walk-in counter if Amazon ever asks for a wet-signature document",
    ],
    bundleAngle:
      "If you&apos;re scaling to 7-figure FBA, you need an LLC (liability protection), EIN (Amazon Tax Interview), and a real website (brand registry application). Our $2,000 Business Launch Bundle does all three — most sellers spend $4-6k buying these piecemeal.",
    primaryCta: { label: "See mailbox plans", href: "/pricing" },
    secondaryCta: { label: "$2k Amazon launch bundle", href: "/business-solutions" },
    faq: [
      {
        q: "Has anyone actually passed Amazon verification with this address?",
        a: "Yes — multiple of our customers run active Seller Central accounts on this address. We don&apos;t guarantee Amazon&apos;s decisions (they change criteria), but our records show clean verification rates.",
      },
      {
        q: "What about the Amazon postcard verification?",
        a: "Amazon sometimes mails a postcard with a verification code. It comes to our box, we scan it within 24 hours, you read the code in your dashboard, and you enter it before the verification window closes.",
      },
      {
        q: "Can I use this address for Amazon Brand Registry?",
        a: "Yes — Brand Registry uses your business address from Seller Central. The same address we set up for you works.",
      },
    ],
  },
  {
    slug: "online-coaches",
    persona: "Online coaches and consultants",
    searchQueries: [
      "real address for online coaching business",
      "LLC for life coach",
      "virtual mailbox for consultants",
      "business address for solopreneur consultant",
    ],
    hero: {
      eyebrow: "Coaches · Consultants · Course creators",
      headline: "A real business address — so your clients see a brand, not your spare bedroom.",
      sub: "When you put your home address in your Stripe receipts, your contracts, your email signature, and your course landing page, you&apos;re trusting every prospect and every client with where you live. Our Lankershim address replaces that — and it works for your LLC, your bank, your tax filings, and every form that asks for a business address.",
    },
    problem: {
      title: "What you don&apos;t want on your contract",
      body:
        "Stripe receipts include the merchant&apos;s registered address. SEC and state regulations may require it on certain marketing emails. Most coaches end up with their home address on hundreds of public-facing documents before they realize the privacy cost. Replacing it later is a project. Doing it right from day one is $50.",
    },
    whyOurAddress: [
      "USPS-accepted real LA address — accepted by Stripe, PayPal, Mercury, Chase",
      "Mail scanning means tax forms (1099-NEC, 1099-K) and IRS letters don&apos;t pile up",
      "$50/3-month entry tier — cheaper than most coaching software subscriptions",
      "Free notary on Form 1583 with Business + Premium plans",
      "Walk-in counter Mon-Sat — handy if the IRS ever sends certified mail",
    ],
    bundleAngle:
      "Most online coaches benefit from a single-member LLC (liability protection if a client sues over results), an EIN (so 1099s don&apos;t go to your SSN), and a basic professional website. Our $2,000 Business Launch Bundle handles all three plus 12 months of mail at our address.",
    primaryCta: { label: "$2k Launch Bundle", href: "/business-solutions" },
    secondaryCta: { label: "Mailbox plans only", href: "/pricing" },
    faq: [
      {
        q: "Why do I need an LLC as a coach?",
        a: "If a client claims your coaching caused them harm (financial, emotional, or business), they can sue. Without an LLC, they can come after your personal assets. With one, they&apos;re limited to the LLC&apos;s assets. For ~$800/year in CA franchise tax, it&apos;s the cheapest insurance you can buy.",
      },
      {
        q: "Can I run my coaching business from this address even if I live in another state?",
        a: "You can use the address for mail and as a business contact address. To register an LLC AT this address, you need to file with California (the $2,000 bundle handles this). If you want to register in your home state, the address still works as a contact address.",
      },
      {
        q: "What about clients who Google the address?",
        a: "It&apos;s a real LA mailing address with no negative associations. Many of our coaches list it on their websites and have never had a client raise it as a concern.",
      },
    ],
  },
  {
    slug: "digital-nomads",
    persona: "Digital nomads and remote workers",
    searchQueries: [
      "virtual mailbox for digital nomads",
      "us address for nomad",
      "best mail forwarding for traveling",
      "mailing address for remote worker",
    ],
    hero: {
      eyebrow: "Digital nomads · Travelers · Remote workers",
      headline: "A US address that follows you everywhere.",
      sub: "If you&apos;re traveling for months at a time — or living abroad — you still need a US address for your bank, your taxes, your DMV, and your government correspondence. We&apos;re your home base in LA: scan everything, forward what matters, ignore the junk.",
    },
    problem: {
      title: "What can&apos;t come to a hostel",
      body:
        "Bank cards, tax forms, IRS letters, jury duty notices, court correspondence, social security mail. Some of these need to reach you within days or you&apos;re in trouble. A US address that scans every piece of mail and forwards on demand is the cleanest solution — and it&apos;s ~$16-$30/month with us.",
    },
    whyOurAddress: [
      "Mail scanning included — 25 free per month, $2/page after",
      "International forwarding — DHL / FedEx / USPS Priority — choose by mail piece",
      "Real LA street address (not a PO Box) for bank, tax, IRS, DMV",
      "Free notary on Form 1583 with Business + Premium plans",
      "Walk-in counter open Mon-Sat for the days you&apos;re actually in LA",
    ],
    bundleAngle:
      "If you&apos;re a digital nomad operating an online business (course, freelance, consulting), our $2,000 Business Launch Bundle handles the LLC + EIN + website + 12 months of mail — so you can run the business legally without flying back to file paperwork.",
    primaryCta: { label: "See mailbox plans", href: "/pricing" },
    secondaryCta: { label: "$2k Nomad launch bundle", href: "/business-solutions" },
    faq: [
      {
        q: "How fast can mail be forwarded internationally?",
        a: "DHL Express to most countries: 3-5 days. FedEx International Priority: 4-7 days. USPS Priority Mail International: 7-14 days. We charge postage at cost + $5 handling per forward.",
      },
      {
        q: "Can I get a phone number tied to this address?",
        a: "We don&apos;t do phone service ourselves, but our address pairs with any US phone service (Google Voice, OpenPhone, Sideline, etc.). The address is what you put on the application.",
      },
      {
        q: "What about state residency / DMV?",
        a: "If you intend to maintain California residency, our address is accepted by the DMV for license renewal (with appropriate documents). If you&apos;re a nomad maintaining residency elsewhere, the address is for mail only — not residency.",
      },
    ],
  },
  {
    slug: "real-estate-investors",
    persona: "Real estate investors",
    searchQueries: [
      "LLC for rental property",
      "virtual address for real estate investor",
      "real estate LLC formation california",
      "anonymous LLC real estate",
    ],
    hero: {
      eyebrow: "Real estate investors · Rental property owners",
      headline: "Don&apos;t put your home address on every property record.",
      sub: "When you buy rental property in your own name (or even an LLC tied to your home address), every county recording, every tenant lookup, every public-records site lists where you live. A separate business address breaks that chain. Our LA address works for the LLC formation, the bank, and the property records.",
    },
    problem: {
      title: "Why you don&apos;t want your home tied to rental properties",
      body:
        "Disgruntled tenants, evicted residents, and property-records fishing trips are a real risk. The cleanest defense is a properly-formed LLC at a separate address — not your home, not your office. And if you&apos;re scaling beyond 1-2 properties, layered LLCs (one per property + a holding LLC) is the standard playbook.",
    },
    whyOurAddress: [
      "Real LA address for LLC formation (CA Secretary of State accepts it)",
      "Mail scanning catches property tax bills, insurance renewals, lender letters",
      "Free notary on Form 1583 with Business + Premium plans (you&apos;ll need 1 per LLC)",
      "Walk-in counter Mon-Sat — useful for collecting wet-signature legal docs",
      "Volume pricing: 5+ LLCs at our address gets a discount (call for quote)",
    ],
    bundleAngle:
      "$2,000 Business Launch Bundle is per-LLC. For 1-2 rental properties this is cheaper than LegalZoom ($4-6k for the same components). For 5+ properties, ask about volume pricing — most investors save 30-50% buying in bulk.",
    primaryCta: { label: "$2k Bundle (per LLC)", href: "/business-solutions" },
    secondaryCta: { label: "Volume LLC pricing", href: "/contact" },
    faq: [
      {
        q: "Should I form a CA LLC for an out-of-state property?",
        a: "Generally no — form the LLC in the state where the property is located, then optionally have a CA holding LLC own it. Our $2k bundle is for CA LLCs specifically. For out-of-state, we can refer you or you can use Northwest / a state-specific service.",
      },
      {
        q: "Anonymous LLC?",
        a: "California does NOT support anonymous LLCs (member names appear on public filings). For anonymity, register the LLC in Wyoming or New Mexico, then have it own the property. Our address still works as the registered-agent address.",
      },
      {
        q: "Can I use this address for property recording?",
        a: "The county records the LLC address as listed in the formation documents. If you list our address on the LLC, that&apos;s what shows up on county records — not your home.",
      },
    ],
  },
  {
    slug: "ecommerce-brands",
    persona: "DTC e-commerce brands",
    searchQueries: [
      "real address for shopify store",
      "ecommerce business address",
      "LLC for shopify dtc",
      "stripe acceptable business address",
    ],
    hero: {
      eyebrow: "Shopify · DTC · WooCommerce",
      headline: "Stripe-acceptable. Shopify-acceptable. Tax-form-acceptable.",
      sub: "If you&apos;re running a DTC e-commerce brand, your business address shows up on Stripe receipts, in Shopify checkout footers (per CAN-SPAM rules for marketing emails), on customer-facing emails, and on every 1099-K from your payment processors. Use a real address that&apos;s designed for this.",
    },
    problem: {
      title: "The receipts problem",
      body:
        "Stripe and Shopify both append your registered business address to customer receipts. CAN-SPAM requires a real physical mailing address in every marketing email you send. Once your home address is in 100,000 customer inboxes, you can&apos;t take it back. Get this right from order #1.",
    },
    whyOurAddress: [
      "Stripe-accepted real address — works on Stripe receipts and Stripe Identity verification",
      "Shopify-accepted — works in checkout footer and email compliance fields",
      "USPS-CMRA — also works for Klaviyo / Mailchimp CAN-SPAM compliance",
      "Mail scanning catches 1099-K from payment processors, supplier invoices, returns",
      "Walk-in counter for the days a wet-signature W-9 needs to go out",
    ],
    bundleAngle:
      "DTC brands hitting $100k+/year revenue almost always need: LLC (liability when a product injures someone), EIN (sales tax + payroll), professional website (brand registration, wholesale onboarding). Our $2,000 Business Launch Bundle is the cleanest way to get all three at once.",
    primaryCta: { label: "$2k DTC Launch Bundle", href: "/business-solutions" },
    secondaryCta: { label: "Mailbox plans", href: "/pricing" },
    faq: [
      {
        q: "Will Klaviyo / Mailchimp accept this address?",
        a: "Yes. CAN-SPAM requires a real physical mailing address. Our Lankershim address satisfies this — it&apos;s a real building you could mail a letter to. PO Boxes don&apos;t qualify; ours does.",
      },
      {
        q: "What about international expansion (UK, EU)?",
        a: "Our address is US-only. For UK/EU, you&apos;ll need a UK/EU registered office address from a UK/EU service. We can refer you.",
      },
      {
        q: "Returns from customers — can they ship to this address?",
        a: "Yes for small parcels (under 1ft³). Larger returns need a fulfillment center, not a CMRA. We can refer you to LA-area 3PLs if needed.",
      },
    ],
  },
  {
    slug: "saas-founders",
    persona: "SaaS founders + indie hackers",
    searchQueries: [
      "real address for SaaS founder",
      "indie hacker llc",
      "stripe address for SaaS",
      "saas founder business address",
    ],
    hero: {
      eyebrow: "SaaS founders · Indie hackers · One-person companies",
      headline: "A real address for the company you&apos;re still bootstrapping.",
      sub: "If you&apos;re running a SaaS as a one-person company, you still need a verifiable business address — for Stripe, for your CAN-SPAM-required marketing emails, for AWS&apos;s tax forms, for whatever app store you ship through. Use a real address from day one. Replacing it later means updating receipts, invoices, contracts, and footer text in dozens of places.",
    },
    problem: {
      title: "The receipts trail problem",
      body:
        "Your Stripe receipts include your registered business address. Your transactional emails include it (CAN-SPAM). Your privacy policy lists it. Your About page lists it. By the time you have 1,000 customers, your home address is in 1,000 inboxes. Indie founders especially: the LLC + bank + Stripe + AWS chain all want the same address, and changing it later is a 10-vendor update.",
    },
    whyOurAddress: [
      "Stripe-verified real address — works on receipts and Stripe Identity",
      "Mail scanning catches the verification postcards Stripe + Plaid sometimes mail",
      "Free notary on Form 1583 with Business + Premium tiers",
      "Walk-in counter for wet-signature W-9s, EIN letters, IRS notices",
      "$50 / 3-month entry tier — cheaper than most SaaS team subscriptions",
    ],
    bundleAngle:
      "Most SaaS founders need an LLC for liability separation (even one customer dispute can be a problem) and an EIN for tax forms. Our $2,000 Business Launch Bundle handles the LLC + EIN + brand kit + 5-page marketing site + 12 months of mail. Most piecemeal services run $4-6k for the same components.",
    primaryCta: { label: "$2k SaaS launch bundle", href: "/business-solutions" },
    secondaryCta: { label: "Mailbox plans", href: "/pricing" },
    faq: [
      {
        q: "Will Mercury / Brex / Chase accept this address?",
        a: "Yes. Mercury, Brex, Chase, BofA, Wells, and Novo all accept our 5062 Lankershim address with a notarized Form 1583 (we provide free notary on Business and Premium plans).",
      },
      {
        q: "What about app store submissions (Apple / Google)?",
        a: "Apple Developer Program and Google Play Console both ask for a business address. Our address is accepted by both — multiple of our SaaS customers ship through both stores on this address.",
      },
      {
        q: "Should I form a Delaware C-corp instead?",
        a: "Only if you&apos;re planning to raise from US institutional VCs. Otherwise an LLC is cheaper and simpler. The Delaware-vs-LLC decision is mostly about future fundraising — not about address or operations.",
      },
    ],
  },
  {
    slug: "content-creators",
    persona: "Content creators + creators",
    searchQueries: [
      "address for youtube creator",
      "podcaster business address",
      "creator llc address",
      "tiktok creator real address",
    ],
    hero: {
      eyebrow: "YouTubers · Podcasters · TikTok creators · Newsletters",
      headline: "Sponsor checks, 1099-NECs, and brand deals — somewhere you actually want them.",
      sub: "When sponsorship deals start coming in, brands need to mail you contracts, tax forms, and sometimes physical product samples. None of that should go to your apartment. Use a real LA address that works with the platforms (YouTube creator program, Patreon, Substack, etc.) and the brands paying you.",
    },
    problem: {
      title: "What you don&apos;t want on your tax forms",
      body:
        "Your 1099-NEC arrives in late January from every brand that paid you over $600. Your Patreon, YouTube AdSense, Substack, and Twitch all 1099 you. By year-end you might have 20 tax forms going to one address. If that&apos;s your apartment, every brand has your home. If you ever move, you&apos;re chasing forwards from 20 senders.",
    },
    whyOurAddress: [
      "Real LA address — accepted by YouTube creator program, Patreon, Substack, Twitch",
      "Mail scanning catches every 1099, contract, and product sample",
      "International forwarding for sponsors that mail product from overseas",
      "Free notary on Form 1583 with Business + Premium plans",
      "$50 / 3 months entry tier — pays for itself with one sponsor deal",
    ],
    bundleAngle:
      "Once you&apos;re past $50k/year in creator income, an LLC starts making real sense (liability + tax flexibility). Our $2,000 Business Launch Bundle handles LLC + EIN + brand kit + 5-page creator site + 12 months of mail. Designed for creators who want a clean business identity without 6 vendor accounts.",
    primaryCta: { label: "See mailbox plans", href: "/pricing" },
    secondaryCta: { label: "$2k Creator launch bundle", href: "/business-solutions" },
    faq: [
      {
        q: "Can I get product samples shipped here?",
        a: "Yes — small parcels (under 1ft³). Larger items: contact us first; sometimes we can hold for 24 hours. PR boxes from beauty / fashion brands routinely come through here.",
      },
      {
        q: "What about my fans mailing me?",
        a: "Fan mail is fine — comes to your box. We don&apos;t open it (per Form 1583 requirements). You decide what to do with it on pickup or forwarding.",
      },
      {
        q: "Privacy concerns — can a fan look up the address?",
        a: "The address shows up if someone Googles it, but it&apos;s a real LA mailing address with no negative associations — many of our creators list it on their bio pages without concern.",
      },
    ],
  },
  {
    slug: "agencies",
    persona: "Marketing + creative agencies",
    searchQueries: [
      "agency business address",
      "marketing agency llc",
      "creative agency real address",
      "freelance agency address",
    ],
    hero: {
      eyebrow: "Marketing agencies · Creative shops · Freelance collectives",
      headline: "A real LA address for the agency that doesn&apos;t need an office yet.",
      sub: "Most agencies bootstrap as a 2-3 person remote team. You don&apos;t need a $4k/month WeWork to look professional — you need a real LA address on your contracts, your invoices, your website footer, and your client checks. We&apos;re that address: real building, walk-in storefront, real human at the front counter.",
    },
    problem: {
      title: "Why a coworking address can fall through",
      body:
        "Coworking addresses sometimes get blocked by client AP departments — they recognize WeWork addresses as third-party and want a real entity address. Some platforms (LinkedIn business accounts, Google Business Profile, certain ad platforms) have flagged coworking addresses for misuse. A single-CMRA address is cleaner across all of these.",
    },
    whyOurAddress: [
      "Real LA business address — passes all common B2B client AP checks",
      "Mail scanning catches client checks, invoices, 1099s, contract amendments",
      "Same-day delivery available — useful for rushed creative deliverables",
      "Walk-in counter for wet-signature contracts and notarized documents",
      "Volume discount for agencies registering multiple LLCs (holding + per-client structure)",
    ],
    bundleAngle:
      "Many agencies form an LLC for the agency itself + separate LLCs for each major brand they manage (when client requires it). Our $2,000 Business Launch Bundle is per-LLC. For 3+ LLCs at the same agency, ask about volume pricing.",
    primaryCta: { label: "$2k Agency launch bundle", href: "/business-solutions" },
    secondaryCta: { label: "Volume LLC pricing", href: "/contact" },
    faq: [
      {
        q: "Can my agency use the same address for multiple LLCs?",
        a: "Yes. Each LLC needs its own Form 1583 + box assignment, but they can share the same physical address. We do this for several investor + agency stacks.",
      },
      {
        q: "What about client check pickup — same-day?",
        a: "Yes. Walk-in pickup Mon-Sat, or we can same-day deliver to your office for $5-$24 depending on zone.",
      },
      {
        q: "Is the address professional-looking on contracts?",
        a: "5062 Lankershim Blvd, North Hollywood CA 91601. Real building. Real street address. Looks identical to any LA office on a contract footer.",
      },
    ],
  },
  {
    slug: "freelance-consultants",
    persona: "Freelance consultants + 1099 contractors",
    searchQueries: [
      "freelancer business address",
      "consultant llc address",
      "1099 contractor real address",
      "self-employed business address",
    ],
    hero: {
      eyebrow: "Freelancers · Consultants · 1099 contractors",
      headline: "Your home address shouldn&apos;t be on every contract you sign.",
      sub: "Every consulting contract you sign asks for your business address. Every 1099-NEC arrives with your home on it. Every wire transfer to your bank verifies your address against the address on the LLC. Get a separate business address from day one — clean separation between your home and your work.",
    },
    problem: {
      title: "The contract footer problem",
      body:
        "Your business address shows up on every consulting contract, every NDA, every SOW, every change order. Once your home is on 100 contracts, you can&apos;t take it back. Your clients show their attorneys your home if there&apos;s ever a dispute. Your address ends up in every CRM that any client uses.",
    },
    whyOurAddress: [
      "Real LA address for clean home/business separation",
      "Mail scanning catches client checks, contracts, IRS letters",
      "Free notary on Form 1583 with Business + Premium plans (you&apos;ll need it once for your CMRA setup)",
      "$50 / 3-month entry tier — most freelancers cover the cost on their first invoice",
      "Walk-in counter — useful for in-person client meetings if needed",
    ],
    bundleAngle:
      "Once your freelance income is approaching $50k/year, an LLC starts making real sense (personal asset protection + tax flexibility via S-corp election). Our $2,000 Business Launch Bundle handles LLC + EIN + brand kit + 5-page consulting site + 12 months of mail. Beats the 5-vendor maze most consultants stumble through.",
    primaryCta: { label: "Mailbox plans", href: "/pricing" },
    secondaryCta: { label: "$2k Consultant launch bundle", href: "/business-solutions" },
    faq: [
      {
        q: "Should I S-corp elect my LLC?",
        a: "Generally yes once net consulting income exceeds ~$80k-$100k — the self-employment-tax savings start to outweigh the payroll-processing overhead. Below that, default LLC pass-through is simpler.",
      },
      {
        q: "Can I deduct your service as a business expense?",
        a: "Yes. Mailbox plans, LLC formation costs, and bundled services are all deductible business expenses. Keep your invoices.",
      },
      {
        q: "What if I&apos;m a 1099 contractor for one main client?",
        a: "Even with one main client, an LLC + separate address is cleaner. If you ever take on a second client, a third — you&apos;re already set up. And the home/work separation matters from day one.",
      },
    ],
  },
];

export const USE_CASE_BY_SLUG: Record<string, UseCasePage> = Object.fromEntries(
  USE_CASE_PAGES.map((u) => [u.slug, u]),
);

export function getUseCase(slug: string): UseCasePage | null {
  return USE_CASE_BY_SLUG[slug] ?? null;
}

export function getAllUseCaseSlugs(): string[] {
  return USE_CASE_PAGES.map((u) => u.slug);
}
