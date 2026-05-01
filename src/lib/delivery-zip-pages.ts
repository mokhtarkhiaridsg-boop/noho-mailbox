// ZIP-by-ZIP landing pages for SEO. Top zips inside our delivery footprint
// where local businesses are most likely to search "same day delivery [city]"
// or "courier [zip]".

export type ZipMeta = {
  zip: string;
  neighborhood: string; // e.g. "Studio City"
  zoneId: number;       // matches DELIVERY_ZONES[].id
  searchTerms: string[]; // additional terms users likely search
  // 1-2 sentence pitch about why local businesses there pick us
  hook: string;
  // 3-6 specific use cases for businesses in that zip
  useCases: string[];
};

export const ZIP_PAGES: ZipMeta[] = [
  {
    zip: "91601",
    neighborhood: "North Hollywood",
    zoneId: 1,
    searchTerms: ["same day delivery North Hollywood", "courier 91601", "NoHo same day"],
    hook:
      "Our flat $5 zone. Most of our daily volume is right here — court runs, lab work, lockbox keys, florist deliveries.",
    useCases: [
      "Solo attorneys filing at Stanley Mosk or San Fernando courthouses",
      "Florists running overflow on Mother&apos;s Day, Valentine&apos;s, Christmas",
      "Real estate agents dropping keys, earnest checks, signed paperwork",
      "Print shops handing off banners and signs to clients",
      "Single-doctor practices moving lab work and supplies",
      "Local Etsy / Shopify sellers shipping inside 91601",
    ],
  },
  {
    zip: "91602",
    neighborhood: "Toluca Lake",
    zoneId: 1,
    searchTerms: ["same day delivery Toluca Lake", "courier 91602", "Toluca Lake courier"],
    hook:
      "Flat $5 zone with us. Toluca Lake&apos;s post-production, talent agencies, and boutique businesses are some of our top recurring customers.",
    useCases: [
      "Post-production houses moving drives, reels, and proofs",
      "Talent agencies sending contracts and headshots",
      "Boutique law firms on Riverside Dr",
      "Florists and bakeries during peak holidays",
      "Vet hospitals moving lab samples",
    ],
  },
  {
    zip: "91604",
    neighborhood: "Studio City",
    zoneId: 2,
    searchTerms: ["same day delivery Studio City", "courier 91604", "Studio City same day"],
    hook:
      "Inner Valley at $9 flat — most of Studio City is 45–90 minutes door to door. Production-heavy zip, lots of last-mile signed paper between agents, agencies, and producers.",
    useCases: [
      "Production company drives, scripts, and notes between agents and writers",
      "Real estate agents on Ventura Blvd moving disclosures and addenda",
      "Recording studios moving masters and stems",
      "Small-firm attorneys moving filings to courthouses",
      "Local boutique e-com fulfilling same-zip orders",
    ],
  },
  {
    zip: "91605",
    neighborhood: "North Hollywood (West)",
    zoneId: 1,
    searchTerms: ["same day delivery 91605", "courier North Hollywood west"],
    hook:
      "$5 flat zone. Heavy auto and trades zone, plus growing residential blocks.",
    useCases: [
      "Auto shops moving parts to body shops",
      "Trades businesses moving supplies",
      "Residential same-day for online orders",
      "Local florists",
      "Print shops",
    ],
  },
  {
    zip: "91606",
    neighborhood: "North Hollywood (East)",
    zoneId: 1,
    searchTerms: ["same day delivery 91606", "courier 91606"],
    hook:
      "$5 flat zone covering Magnolia and Vanowen blocks.",
    useCases: [
      "Restaurants moving catering to nearby events",
      "Bakeries and party stores",
      "Mechanic shops",
      "Locksmiths needing fast key drops",
      "Same-zip Etsy / eBay shipping",
    ],
  },
  {
    zip: "91607",
    neighborhood: "Valley Village",
    zoneId: 1,
    searchTerms: ["same day delivery Valley Village", "courier 91607"],
    hook:
      "$5 flat zone bordering Studio City and NoHo. Quiet residential side with pockets of small business along Magnolia and Riverside.",
    useCases: [
      "Real estate agents and brokerages",
      "Home-based businesses shipping orders",
      "Small medical / dental practices",
      "Nannies and household services moving paperwork",
      "Local florists and bakeries",
    ],
  },
  {
    zip: "91505",
    neighborhood: "Burbank (Media District)",
    zoneId: 2,
    searchTerms: ["same day delivery Burbank", "courier Burbank 91505", "Burbank Media District"],
    hook:
      "$9 flat in our Inner Valley zone — Warner, Disney, Cartoon Network campuses. Production-heavy with small firm law support.",
    useCases: [
      "Production company drives, dailies, signed releases",
      "Studio adjacent law firms on Olive and Alameda",
      "Vendors moving deliveries to studio gates",
      "Talent agency runs",
      "CPAs moving documents during tax season",
    ],
  },
  {
    zip: "91506",
    neighborhood: "Burbank (Magnolia Park)",
    zoneId: 2,
    searchTerms: ["same day delivery 91506", "Burbank courier Magnolia Park"],
    hook:
      "$9 Inner Valley flat. Magnolia Park&apos;s vintage shops, boutiques, and small-biz corridor.",
    useCases: [
      "Boutique retail shipping to local customers",
      "Vintage & antique shops moving inventory",
      "Small-firm law (estate, family)",
      "Independent bakeries and florists",
      "Etsy sellers within Burbank",
    ],
  },
  {
    zip: "91423",
    neighborhood: "Sherman Oaks",
    zoneId: 2,
    searchTerms: ["same day delivery Sherman Oaks", "courier 91423"],
    hook:
      "$9 Inner Valley flat. Heavy professional services zone — law firms, financial advisors, real estate.",
    useCases: [
      "Law firms (Sherman Oaks Bar Assoc proximity)",
      "Real estate / escrow / title runs",
      "Wealth managers and CPAs during tax season",
      "Plastic surgeons and dermatology offices",
      "Galleria-area boutique retail",
    ],
  },
  {
    zip: "91316",
    neighborhood: "Encino",
    zoneId: 3,
    searchTerms: ["same day delivery Encino", "Encino courier 91316"],
    hook:
      "Mid Valley zone — $13 flat, 1–2 hour ETA. Heavy on professional offices and high-end residential.",
    useCases: [
      "Family law and estate planning firms",
      "Real estate luxury listings",
      "Wealth advisors moving client paperwork",
      "Cosmetic dental + dermatology",
      "High-end retail boutique deliveries",
    ],
  },
  {
    zip: "91436",
    neighborhood: "Encino (South)",
    zoneId: 3,
    searchTerms: ["same day delivery 91436", "Encino south courier"],
    hook: "Mid Valley — $13 flat. Sister zip to 91316 with similar professional density.",
    useCases: [
      "Estate planning and family law",
      "Real estate transactions",
      "Medical specialists",
      "High-end residential same-day",
    ],
  },
  {
    zip: "91356",
    neighborhood: "Tarzana",
    zoneId: 3,
    searchTerms: ["same day delivery Tarzana", "Tarzana courier 91356"],
    hook: "Mid Valley — $13 flat. Hospital-adjacent zip, plus growing professional corridor on Ventura.",
    useCases: [
      "Tarzana Medical Center adjacent practices",
      "Specialty law (medical malpractice, healthcare)",
      "Real estate",
      "Pharmacies moving prescriptions",
      "CPA / financial planners",
    ],
  },
  {
    zip: "91367",
    neighborhood: "Woodland Hills",
    zoneId: 4,
    searchTerms: ["same day delivery Woodland Hills", "Woodland Hills courier"],
    hook: "Greater LA zone — $17 flat. Warner Center high-rises and Topanga retail corridor.",
    useCases: [
      "Warner Center law firms and corporate offices",
      "Topanga Plaza boutique retail",
      "Real estate brokers covering West Valley",
      "Medical specialists",
    ],
  },
  {
    zip: "90028",
    neighborhood: "Hollywood",
    zoneId: 4,
    searchTerms: ["same day delivery Hollywood", "courier 90028", "Hollywood same day"],
    hook: "Greater LA — $17 flat. Production, post-production, talent agencies, casting.",
    useCases: [
      "Casting offices moving sides and contracts",
      "Talent agencies on Sunset",
      "Production drives and notes",
      "Hotel guest deliveries",
      "Boutique retail",
    ],
  },
  {
    zip: "90046",
    neighborhood: "West Hollywood / Beachwood",
    zoneId: 4,
    searchTerms: ["same day delivery 90046", "West Hollywood courier"],
    hook: "Greater LA — $17 flat. Heavy on entertainment and food/beverage businesses.",
    useCases: [
      "Restaurants and bars moving permits and supplies",
      "Talent and management agencies",
      "Boutique retail on Melrose",
      "Real estate (multiple boutique brokerages)",
    ],
  },
  {
    zip: "90210",
    neighborhood: "Beverly Hills",
    zoneId: 5,
    searchTerms: ["same day delivery Beverly Hills 90210", "Beverly Hills courier"],
    hook:
      "West LA — $21 flat. Boutique retail, family law, estate planning, plastic surgery.",
    useCases: [
      "Family law and high-net-worth estate planning",
      "Plastic surgery and cosmetic dental",
      "Beverly Hills boutique retail same-day",
      "Real estate luxury transactions",
    ],
  },
  {
    zip: "91201",
    neighborhood: "Glendale",
    zoneId: 3,
    searchTerms: ["same day delivery Glendale", "Glendale courier 91201"],
    hook: "Mid Valley — $13 flat. Glendale&apos;s Brand Blvd retail and downtown professional corridor.",
    useCases: [
      "Adventist Health Glendale adjacent practices",
      "Brand Blvd retail and restaurants",
      "Family-owned businesses (Armenian community fit)",
      "Small-firm law offices",
    ],
  },
  {
    zip: "91203",
    neighborhood: "Glendale (Downtown)",
    zoneId: 3,
    searchTerms: ["same day delivery 91203", "Glendale downtown courier"],
    hook: "Mid Valley — $13 flat. Galleria-adjacent retail and high-rise offices.",
    useCases: [
      "Galleria retailers shipping local",
      "High-rise law firms and accountants",
      "Tax / immigration attorneys (community fit)",
      "Real estate and escrow",
    ],
  },
  {
    zip: "91202",
    neighborhood: "Glendale (West / Verdugo)",
    zoneId: 3,
    searchTerms: ["same day delivery 91202", "courier 91202 Glendale"],
    hook: "Mid Valley — $13 flat. Established residential + light commercial.",
    useCases: [
      "Realtors moving keys + earnest checks",
      "Local print shops handing off banners",
      "Boutique fitness gyms restocking inventory",
      "Pediatric and family practices",
    ],
  },
  {
    zip: "91204",
    neighborhood: "Glendale (South Brand)",
    zoneId: 3,
    searchTerms: ["same day delivery 91204", "courier 91204"],
    hook: "Mid Valley — $13 flat. South Brand corridor — restaurants and retail.",
    useCases: [
      "Restaurant catering same-day for office events",
      "Retail boutiques handling local orders",
      "Real estate offices with active escrow",
      "Independent doctors moving lab samples",
    ],
  },
  {
    zip: "91207",
    neighborhood: "Glendale (Verdugo Woodlands)",
    zoneId: 3,
    searchTerms: ["same day delivery 91207", "Verdugo Woodlands courier"],
    hook: "Mid Valley — $13 flat. Affluent residential + boutique professional.",
    useCases: [
      "High-end real estate agents",
      "Estate planning attorneys",
      "Specialty contractors (designer + premium) moving samples",
      "Concierge medical practices",
    ],
  },
  {
    zip: "91208",
    neighborhood: "Glendale (La Crescenta-Montrose)",
    zoneId: 3,
    searchTerms: ["same day delivery 91208", "Montrose courier"],
    hook: "Mid Valley — $13 flat. Foothill villages with tight-knit business community.",
    useCases: [
      "Local florist same-day for foothill events",
      "Small-firm law and accounting practices",
      "Realtors covering 91020 / 91046 area",
      "Independent vets / pet specialty",
    ],
  },
  {
    zip: "91011",
    neighborhood: "La Cañada Flintridge",
    zoneId: 4,
    searchTerms: ["same day delivery 91011", "La Cañada courier"],
    hook: "Foothill cities — $18 flat. Affluent community, boutique service businesses.",
    useCases: [
      "Estate planning + family office attorneys",
      "Premium real estate agents (high-AOV listings)",
      "Specialty pediatric / orthodontic practices",
      "Boutique retail same-day for event prep",
    ],
  },
  {
    zip: "90028",
    neighborhood: "Hollywood",
    zoneId: 2,
    searchTerms: ["same day delivery 90028", "Hollywood courier"],
    hook: "Studio + entertainment corridor — $9.75 flat. Production-adjacent.",
    useCases: [
      "Production companies moving scripts, hard drives, props",
      "Casting offices handling NDAs and signed releases",
      "Specialty retailers and movie merchandise",
      "Talent agencies and entertainment law",
    ],
  },
  {
    zip: "90004",
    neighborhood: "Hancock Park / Larchmont Village",
    zoneId: 2,
    searchTerms: ["same day delivery 90004", "Larchmont courier"],
    hook: "Studio corridor — $9.75 flat. Affluent residential + boutique professional.",
    useCases: [
      "Boutique real estate agents (high-AOV)",
      "Specialty contractors and designers",
      "Estate-planning attorneys",
      "Independent specialty retailers",
    ],
  },
  {
    zip: "90069",
    neighborhood: "West Hollywood",
    zoneId: 5,
    searchTerms: ["same day delivery 90069", "West Hollywood courier"],
    hook: "WeHo — $24 flat. Premium AOV per run.",
    useCases: [
      "Entertainment law firms",
      "Talent management offices",
      "Boutique retail and luxury brands",
      "Specialty health + wellness practices",
    ],
  },
  {
    zip: "90291",
    neighborhood: "Venice",
    zoneId: 5,
    searchTerms: ["same day delivery 90291", "Venice courier"],
    hook: "Westside — $24 flat. Tech-startup density + creative agencies.",
    useCases: [
      "Tech startups moving signed contracts and hardware",
      "Creative agencies handling assets and props",
      "Boutique retail same-day for events",
      "Independent legal + creative-industry practices",
    ],
  },
  {
    zip: "90402",
    neighborhood: "Santa Monica (North)",
    zoneId: 5,
    searchTerms: ["same day delivery 90402", "Santa Monica north courier"],
    hook: "Westside — $24 flat. Premium residential + entertainment + tech.",
    useCases: [
      "Entertainment law and talent representation",
      "Premium real estate (high-AOV listings)",
      "Tech execs moving signed docs and hardware",
      "Concierge medicine and specialty practices",
    ],
  },
  {
    zip: "90064",
    neighborhood: "West LA / Cheviot Hills",
    zoneId: 5,
    searchTerms: ["same day delivery 90064", "West LA courier"],
    hook: "Westside — $24 flat. Office park + residential mix.",
    useCases: [
      "Mid-size law firms and accounting practices",
      "Real estate brokerages",
      "Specialty medical practices",
      "Tech-adjacent startups",
    ],
  },
];

export const ZIP_PAGE_BY_SLUG: Record<string, ZipMeta> = Object.fromEntries(
  ZIP_PAGES.map((z) => [z.zip, z]),
);

export function getZipPage(zip: string): ZipMeta | null {
  return ZIP_PAGE_BY_SLUG[zip] ?? null;
}

export function getAllZipSlugs(): string[] {
  return ZIP_PAGES.map((z) => z.zip);
}
