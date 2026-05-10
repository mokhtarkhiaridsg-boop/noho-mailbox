// iter-178 — Sender normalization for photo album grouping.
// Carriers + retailers stamp packages with wildly varying sender
// names. We bucket "AMAZON.COM SERVICES LLC", "Amazon Logistics",
// and "Amazon" into one "Amazon" bucket so members get a clean
// "all my Amazon packages" view instead of 8 near-duplicate buckets.
//
// Lives outside any "use server" file so server actions + UI both use
// the same normalization (e.g. a future intake form could auto-tag).

// Lowercase contains-checks → canonical bucket name + emoji + accent
// color. Order matters — first match wins (so "amazon fresh" matches
// before bare "amazon").
type SenderRule = {
  needles: string[];
  bucket: string;
  emoji: string;
  accent: string;
};

const RULES: SenderRule[] = [
  { needles: ["amazon fresh", "whole foods"], bucket: "Amazon Fresh", emoji: "🥬", accent: "#16A34A" },
  { needles: ["amazon", "amzn"],              bucket: "Amazon",       emoji: "📦", accent: "#FF9900" },
  { needles: ["ups"],                          bucket: "UPS",          emoji: "🟫", accent: "#7B5C2D" },
  { needles: ["fedex", "fed ex", "fedx"],     bucket: "FedEx",        emoji: "🟣", accent: "#4D148C" },
  { needles: ["usps", "u.s. post"],            bucket: "USPS",         emoji: "📬", accent: "#004B87" },
  { needles: ["dhl"],                          bucket: "DHL",          emoji: "✈️", accent: "#FFCC00" },
  { needles: ["temu"],                         bucket: "Temu",         emoji: "🛍️", accent: "#FF6B35" },
  { needles: ["shein"],                        bucket: "Shein",        emoji: "👗", accent: "#000000" },
  { needles: ["wayfair"],                      bucket: "Wayfair",      emoji: "🛋️", accent: "#7B189F" },
  { needles: ["ikea"],                         bucket: "IKEA",         emoji: "🟦", accent: "#0051BA" },
  { needles: ["walmart"],                      bucket: "Walmart",      emoji: "⭐", accent: "#0071CE" },
  { needles: ["target"],                       bucket: "Target",       emoji: "🎯", accent: "#CC0000" },
  { needles: ["costco"],                       bucket: "Costco",       emoji: "🛒", accent: "#E31837" },
  { needles: ["best buy", "bestbuy"],          bucket: "Best Buy",     emoji: "💻", accent: "#0046BE" },
  { needles: ["apple", "appl"],                bucket: "Apple",        emoji: "🍎", accent: "#A2AAAD" },
  { needles: ["microsoft", "msft"],            bucket: "Microsoft",    emoji: "🪟", accent: "#0078D4" },
  { needles: ["chewy"],                        bucket: "Chewy",        emoji: "🐾", accent: "#0E5197" },
  { needles: ["sephora"],                      bucket: "Sephora",      emoji: "💄", accent: "#000000" },
  { needles: ["ulta"],                         bucket: "Ulta",         emoji: "💋", accent: "#FF1493" },
  { needles: ["nike"],                         bucket: "Nike",         emoji: "👟", accent: "#000000" },
  { needles: ["lululemon"],                    bucket: "Lululemon",    emoji: "🧘", accent: "#C8102E" },
  { needles: ["etsy"],                         bucket: "Etsy",         emoji: "🎨", accent: "#F45800" },
  { needles: ["irs", "internal revenue"],     bucket: "IRS",          emoji: "🏛️", accent: "#003366" },
  { needles: ["california franchise tax"],     bucket: "CA Tax Board", emoji: "🏛️", accent: "#FFB81C" },
  { needles: ["bank of america", "boa"],      bucket: "Bank of America", emoji: "🏦", accent: "#012169" },
  { needles: ["chase", "jpmorgan"],            bucket: "Chase",        emoji: "🏦", accent: "#117ACA" },
  { needles: ["wells fargo"],                  bucket: "Wells Fargo",  emoji: "🏦", accent: "#D71E28" },
  { needles: ["capital one"],                  bucket: "Capital One",  emoji: "💳", accent: "#D03027" },
  { needles: ["american express", "amex"],     bucket: "Amex",         emoji: "💳", accent: "#006FCF" },
];

export type SenderBucket = {
  key: string;          // canonical key — used as sort/groupBy key
  bucket: string;       // display name
  emoji: string;
  accent: string;
};

// Returns the bucket for a raw sender string. Falls back to a
// title-cased version of the original string with a default emoji.
export function bucketForSender(rawSender: string | null | undefined): SenderBucket {
  const raw = (rawSender ?? "").trim();
  if (!raw) return { key: "(unknown)", bucket: "Unknown sender", emoji: "✉️", accent: "#7A8290" };
  const low = raw.toLowerCase();
  for (const r of RULES) {
    for (const n of r.needles) {
      if (low.includes(n)) {
        return { key: r.bucket, bucket: r.bucket, emoji: r.emoji, accent: r.accent };
      }
    }
  }
  // No rule match — bucket by the original sender (title-cased) so
  // members can still group "Marie Khiari" → all letters from Marie.
  // Strip trailing punctuation + Inc/LLC suffixes.
  const cleaned = raw
    .replace(/[,.;:]+$/g, "")
    .replace(/\b(inc|llc|corp|company|co)\.?$/i, "")
    .trim();
  // Title case (lower except first letter of each word).
  const titleCased = cleaned
    .split(/\s+/)
    .map((w) => (w.length === 0 ? w : w[0]!.toUpperCase() + w.slice(1).toLowerCase()))
    .join(" ");
  return {
    key: cleaned.toLowerCase(),
    bucket: titleCased || raw,
    emoji: "✉️",
    accent: "#0F5BD9",
  };
}
