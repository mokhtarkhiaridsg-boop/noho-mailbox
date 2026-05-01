/**
 * NOHO Mailbox — 7-Zone LA Delivery System
 * Base: 5062 Lankershim Blvd, North Hollywood, CA 91601
 */

export type DeliveryZone = {
  id: number;
  name: string;
  label: string;
  description: string;
  basePrice: number;   // Standard tier, no Rush
  rushMultiplier: number;
  whiteGloveMultiplier: number;
  etaWindow: string;   // e.g. "1–2 hours"
  color: string;       // for zone map
};

export const DELIVERY_ZONES: DeliveryZone[] = [
  {
    id: 1,
    name: "NoHo",
    label: "North Hollywood",
    description: "91601–91608 — Your neighborhood",
    basePrice: 5.00,
    rushMultiplier: 1.5,
    whiteGloveMultiplier: 2.2,
    etaWindow: "30–60 min",
    color: "#337485",
  },
  {
    id: 2,
    name: "Inner Valley",
    label: "Studio City · Sherman Oaks · Burbank",
    description: "0–5 miles from store",
    basePrice: 9.00,
    rushMultiplier: 1.5,
    whiteGloveMultiplier: 2.2,
    etaWindow: "45–90 min",
    color: "#23596A",
  },
  {
    id: 3,
    name: "Mid Valley",
    label: "Van Nuys · Glendale · Los Feliz",
    description: "5–10 miles from store",
    basePrice: 13.00,
    rushMultiplier: 1.5,
    whiteGloveMultiplier: 2.2,
    etaWindow: "1–2 hours",
    color: "#B07030",
  },
  {
    id: 4,
    name: "Greater LA",
    label: "Hollywood · Silver Lake · Echo Park",
    description: "10–15 miles from store",
    basePrice: 17.00,
    rushMultiplier: 1.6,
    whiteGloveMultiplier: 2.5,
    etaWindow: "1.5–3 hours",
    color: "#7A6050",
  },
  {
    id: 5,
    name: "West LA",
    label: "Culver City · Beverly Hills · Pasadena",
    description: "15–20 miles from store",
    basePrice: 21.00,
    rushMultiplier: 1.6,
    whiteGloveMultiplier: 2.5,
    etaWindow: "2–4 hours",
    color: "#2D100F",
  },
  {
    id: 6,
    name: "Far LA",
    label: "Santa Monica · Long Beach · Torrance",
    description: "20–30 miles from store",
    basePrice: 28.00,
    rushMultiplier: 1.75,
    whiteGloveMultiplier: 2.75,
    etaWindow: "3–5 hours",
    color: "#110E0B",
  },
  {
    id: 7,
    name: "Extended",
    label: "Malibu · Calabasas · Pomona",
    description: "30+ miles — call for quote",
    basePrice: 0,    // call for quote
    rushMultiplier: 1,
    whiteGloveMultiplier: 1,
    etaWindow: "Call for ETA",
    color: "#6B6560",
  },
];

// ─── Zip → Zone mapping ──────────────────────────────────────────────────────

const ZIP_ZONE_MAP: Record<string, number> = {
  // Zone 1 — North Hollywood (91601–91608)
  "91601": 1, "91602": 1, "91603": 1, "91604": 1,
  "91605": 1, "91606": 1, "91607": 1, "91608": 1,

  // Zone 2 — Inner Valley (5 miles)
  "91423": 2, // Sherman Oaks
  "91501": 2, "91502": 2, "91503": 2, "91504": 2, "91505": 2, // Burbank
  "91506": 2, "91507": 2, "91508": 2, "91510": 2,
  "91352": 2, // Sun Valley
  "91326": 2, // Porter Ranch (borderline)
  "91040": 2, // Sunland / Tujunga
  "91042": 2,
  "91343": 2, // North Hills
  "91344": 2, // Granada Hills
  "91367": 2, // Woodland Hills (close side)
  "91335": 2, // Reseda
  "91401": 2, // Van Nuys
  "91402": 2, "91405": 2, "91406": 2, "91411": 2,

  // Zone 3 — Mid Valley / Near East LA (5–10 miles)
  "91201": 3, "91202": 3, "91203": 3, "91204": 3, "91205": 3, // Glendale
  "91206": 3, "91207": 3, "91208": 3, "91210": 3,
  "91011": 3, // La Cañada Flintridge
  "90068": 3, // Hollywood Hills
  "90046": 3, // West Hollywood (north)
  "90039": 3, // Los Feliz / Atwater Village
  "90027": 3, // Los Feliz
  "90065": 3, // Mt Washington / Glassell Park
  "90041": 3, // Eagle Rock
  "91001": 3, // Altadena (east side)
  "90290": 3, // Topanga (west side)

  // Zone 4 — Greater LA (10–15 miles)
  "90028": 4, // Hollywood
  "90038": 4, // Hollywood / Melrose
  "90029": 4, // East Hollywood
  "90026": 4, // Silver Lake / Echo Park
  "90031": 4, // Lincoln Heights
  "90032": 4, // El Sereno
  "90042": 4, // Highland Park
  "90050": 4,
  "90004": 4, // Koreatown / Mid-City
  "90005": 4, "90006": 4,
  "90048": 4, // Fairfax / Melrose
  "90036": 4, // Miracle Mile
  "90101": 4, "91101": 4, "91103": 4, "91104": 4, // Pasadena
  "91105": 4, "91106": 4, "91107": 4,
  "91108": 4, // San Marino

  // Zone 5 — West LA / Far East (15–20 miles)
  "90210": 5, // Beverly Hills
  "90211": 5, "90212": 5,
  "90034": 5, // Culver City
  "90230": 5, "90232": 5, // Culver City zip variants
  "90007": 5, // USC area / South Central
  "90018": 5, "90019": 5, "90022": 5,
  "90001": 5, "90002": 5, "90003": 5, "90011": 5, // South LA
  "90012": 5, // Downtown LA (Civic Center)
  "90013": 5, "90014": 5, "90015": 5, "90017": 5, // Downtown core
  "90021": 5,
  "91030": 5, // South Pasadena
  "91731": 5, "91732": 5, // El Monte
  "91750": 5, // La Verne

  // Zone 6 — Far LA (20–30 miles)
  "90401": 6, "90402": 6, "90403": 6, "90404": 6, "90405": 6, // Santa Monica
  "90291": 6, // Venice
  "90292": 6, // Marina del Rey
  "90066": 6, // Mar Vista
  "90301": 6, "90302": 6, // Inglewood
  "90501": 6, "90502": 6, "90503": 6, "90504": 6, "90505": 6, // Torrance
  "90260": 6, // Lawndale
  "90245": 6, // El Segundo
  "90710": 6, // Harbor City
  "90731": 6, // San Pedro
  "90801": 6, "90802": 6, "90803": 6, "90804": 6, // Long Beach
  "90805": 6, "90806": 6, "90807": 6, "90808": 6,
  "91765": 6, "91766": 6, // Pomona
  "91768": 6,

  // Zone 7 — Extended (30+ miles) — call for quote
  "90265": 7, // Malibu
  "91302": 7, // Calabasas
  "91301": 7, // Agoura Hills
  "93063": 7, // Simi Valley
  "93065": 7,
  "91360": 7, "91361": 7, "91362": 7, // Thousand Oaks / Westlake
  "91384": 7, // Castaic
  "93534": 7, "93536": 7, // Lancaster / Palmdale
  "91702": 7, // Azusa
  "91741": 7, // Glendora
  "91773": 7, // San Dimas
  "92821": 7, // Brea
  "92833": 7, // Fullerton
  "92835": 7,
};

export function getZoneByZip(zip: string): DeliveryZone | null {
  const clean = zip.trim().slice(0, 5);
  const zoneId = ZIP_ZONE_MAP[clean];
  if (!zoneId) return null;
  return DELIVERY_ZONES.find((z) => z.id === zoneId) ?? null;
}

export function calculateDeliveryPrice(
  zip: string,
  tier: "Standard" | "Rush" | "WhiteGlove" = "Standard"
): { zone: DeliveryZone; price: number } | null {
  const zone = getZoneByZip(zip);
  if (!zone) return null;
  if (zone.id === 7) return null; // call for quote

  const multiplier =
    tier === "WhiteGlove" ? zone.whiteGloveMultiplier :
    tier === "Rush" ? zone.rushMultiplier : 1;

  const price = +(zone.basePrice * multiplier).toFixed(2);
  return { zone, price };
}
