// Hyper-local neighborhood landing pages for LA + San Fernando Valley queries.
// Targets low-competition phrases like "private mailbox burbank", "mailbox
// rental studio city", etc. Each entry feeds a static page at
// /private-mailbox/[neighborhood] with distance + drive time from our
// 5062 Lankershim storefront. Distances are approximate driving values from
// the storefront, not straight-line.

export type Neighborhood = {
  slug: string;
  name: string;
  distance: string;        // "1.2 mi" — from 5062 Lankershim
  driveTime: string;       // "5 min"
  zip: string;             // primary ZIP
  notes: string;           // one-liner local context
  nearbyAreas: string[];   // 2-3 adjacent areas for content
};

export const NEIGHBORHOODS: Neighborhood[] = [
  { slug: "burbank", name: "Burbank", distance: "3.4 mi", driveTime: "10 min", zip: "91502", notes: "Major media-studio hub — Warner Bros, Disney, NBC headquarters within 2 miles.", nearbyAreas: ["North Hollywood", "Toluca Lake", "Glendale"] },
  { slug: "studio-city", name: "Studio City", distance: "2.1 mi", driveTime: "7 min", zip: "91604", notes: "Ventura Blvd corridor — heavy small-business + freelance population.", nearbyAreas: ["North Hollywood", "Sherman Oaks", "Toluca Lake"] },
  { slug: "sherman-oaks", name: "Sherman Oaks", distance: "4.8 mi", driveTime: "12 min", zip: "91403", notes: "Family + small-business hub with the Galleria district.", nearbyAreas: ["Studio City", "Encino", "Van Nuys"] },
  { slug: "glendale", name: "Glendale", distance: "5.6 mi", driveTime: "15 min", zip: "91204", notes: "Diverse business district with the Americana + major retail.", nearbyAreas: ["Burbank", "Atwater Village", "Eagle Rock"] },
  { slug: "hollywood", name: "Hollywood", distance: "5.1 mi", driveTime: "14 min", zip: "90028", notes: "Entertainment district — film, music, content creators.", nearbyAreas: ["West Hollywood", "Los Feliz", "Universal City"] },
  { slug: "van-nuys", name: "Van Nuys", distance: "5.9 mi", driveTime: "15 min", zip: "91405", notes: "Major SFV civic center with the Van Nuys airport.", nearbyAreas: ["North Hollywood", "Sherman Oaks", "Reseda"] },
  { slug: "encino", name: "Encino", distance: "6.8 mi", driveTime: "17 min", zip: "91436", notes: "Affluent residential + professional services hub on Ventura.", nearbyAreas: ["Tarzana", "Sherman Oaks", "Reseda"] },
  { slug: "toluca-lake", name: "Toluca Lake", distance: "2.0 mi", driveTime: "6 min", zip: "91602", notes: "Quiet residential adjacent to the studios — celebrity-heavy.", nearbyAreas: ["Burbank", "North Hollywood", "Studio City"] },
  { slug: "universal-city", name: "Universal City", distance: "3.7 mi", driveTime: "10 min", zip: "91608", notes: "Universal Studios + CityWalk + Comcast/NBCUniversal corporate HQ.", nearbyAreas: ["Studio City", "Hollywood", "Burbank"] },
  { slug: "valley-village", name: "Valley Village", distance: "1.5 mi", driveTime: "5 min", zip: "91607", notes: "Quiet residential pocket just south of NoHo — heavy renter population.", nearbyAreas: ["North Hollywood", "Studio City", "Van Nuys"] },
  { slug: "los-angeles", name: "Los Angeles", distance: "15.0 mi (DTLA)", driveTime: "30 min", zip: "90012", notes: "We cover all of LA County via same-day courier — flat rates by zone.", nearbyAreas: ["Hollywood", "Beverly Hills", "Santa Monica"] },
  { slug: "santa-monica", name: "Santa Monica", distance: "16.5 mi", driveTime: "35 min", zip: "90401", notes: "Tech + creative agency hub on the westside — courier delivery available.", nearbyAreas: ["Venice", "Brentwood", "West LA"] },
  { slug: "beverly-hills", name: "Beverly Hills", distance: "10.4 mi", driveTime: "25 min", zip: "90210", notes: "Premium business + retail district — courier delivery available.", nearbyAreas: ["West Hollywood", "Bel Air", "Century City"] },
  { slug: "west-hollywood", name: "West Hollywood", distance: "7.8 mi", driveTime: "20 min", zip: "90069", notes: "Creator + agency hub on Sunset/Melrose.", nearbyAreas: ["Hollywood", "Beverly Hills", "Hancock Park"] },
  { slug: "pasadena", name: "Pasadena", distance: "11.2 mi", driveTime: "25 min", zip: "91101", notes: "Old Town + Caltech + JPL — engineering and professional services.", nearbyAreas: ["Glendale", "Eagle Rock", "South Pasadena"] },
];

export const NEIGHBORHOODS_BY_SLUG: Record<string, Neighborhood> = Object.fromEntries(
  NEIGHBORHOODS.map((n) => [n.slug, n])
);

export function getNeighborhood(slug: string): Neighborhood | null {
  return NEIGHBORHOODS_BY_SLUG[slug] ?? null;
}

export function getAllNeighborhoodSlugs(): string[] {
  return NEIGHBORHOODS.map((n) => n.slug);
}
