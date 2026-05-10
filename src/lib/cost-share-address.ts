// iter-230 — Address normalization for forwarding cost-share matching.
//
// Used by `ForwardingCostShareGroup.destAddressHash` to match shipments
// going to "the same place" even when the typed address has noisy
// whitespace, suite suffixes, abbreviations etc. We don't try to do
// real USPS-style canonicalization — just enough to dedupe near-twins.
//
// hashLine("123 Main St, Apt 4B, New York NY 10128") ===
// hashLine("123 main street apt 4b new york ny 10128")

const STREET_ABBR: Record<string, string> = {
  street: "st",
  road: "rd",
  avenue: "ave",
  av: "ave",
  boulevard: "blvd",
  drive: "dr",
  lane: "ln",
  court: "ct",
  parkway: "pkwy",
  highway: "hwy",
  place: "pl",
  terrace: "ter",
  apartment: "apt",
  suite: "ste",
  unit: "u",
  number: "no",
};

export function normalizeAddress(raw: string): {
  hash: string;
  city: string | null;
  state: string | null;
  zip: string | null;
  label: string;
} {
  const cleaned = raw.replace(/[​-‏]/g, "").trim();
  const lower = cleaned.toLowerCase().replace(/[.,\n]+/g, " ").replace(/\s+/g, " ").trim();
  // Best-effort zip extraction
  const zipMatch = lower.match(/\b(\d{5})(?:-\d{4})?\b/);
  const zip = zipMatch?.[1] ?? null;
  // State (2-letter US code) — pulls the right-most token before zip
  let state: string | null = null;
  const stateMatch = lower.match(/\b(al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy|dc)\b\s*\d{5}/);
  if (stateMatch) state = stateMatch[1]!.toUpperCase();
  // City: token immediately before state — heuristic
  let city: string | null = null;
  if (state) {
    const before = lower.split(state.toLowerCase())[0]?.trim();
    if (before) {
      const tokens = before.split(/\s+/);
      // last 1-3 tokens that aren't street-like
      const last = tokens.slice(-3).filter((t) => !/^\d/.test(t) && t.length > 1).join(" ");
      if (last) city = last;
    }
  }
  // Tokenize + abbreviate street type words for hash
  const tokens = lower.split(/\s+/).map((t) => STREET_ABBR[t] ?? t).filter((t) => t.length > 0);
  // Hash = zip + sorted set of street-distinctive tokens (drop 1-letter / pure-junk tokens)
  const distinctive = tokens.filter((t) => t.length > 1 && !/^[,.;:]+$/.test(t));
  const sorted = Array.from(new Set(distinctive)).sort();
  const hash = `${zip ?? "00000"}|${sorted.join("-")}`;
  return { hash, city, state, zip, label: cleaned };
}

// For UI: a one-line abbreviated address like "123 Main St · NYC 10128"
export function shortLabel(rawOrLabel: string): string {
  const norm = normalizeAddress(rawOrLabel);
  if (norm.city && norm.zip) return `${norm.city.replace(/\b\w/g, (c) => c.toUpperCase())} ${norm.zip}`;
  if (norm.zip) return `ZIP ${norm.zip}`;
  return rawOrLabel.split("\n")[0] ?? rawOrLabel.slice(0, 60);
}
