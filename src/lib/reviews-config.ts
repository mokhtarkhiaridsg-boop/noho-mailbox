/**
 * Aggregate-rating config — single source of truth for the LocalBusiness
 * JSON-LD `aggregateRating` block on the homepage + the trust-strip on
 * marketing pages.
 *
 * Update this file as real reviews accumulate (Google Business Profile +
 * Yelp + on-site reviews). Schema is only emitted when `count >= 5` so we
 * don't lie to Google about a fake "0.0 stars (0 reviews)" baseline.
 *
 * Where to find the numbers:
 *  - Google Business Profile dashboard → Reviews tab
 *  - Yelp business owner dashboard → Reviews
 *  - (later) admin /reviews panel will compute this automatically
 */

export type ReviewsConfig = {
  /** Total review count across all surfaces (Google + Yelp + on-site). */
  count: number;
  /** Average star rating, 1.0–5.0. */
  average: number;
  /** ISO date of the most recent review — Google likes a `dateModified`. */
  asOf: string;
  /** Highest-ranked review snippet, ≤220 chars, for the social-proof strip. */
  featuredQuote?: { text: string; author: string; rating: number };
};

export const REVIEWS_CONFIG: ReviewsConfig = {
  // Sourced from the live Google Business Profile (unclaimed but
  // publicly visible). Numbers verified 2026-05-13 via Chrome SERP scrape.
  // Once the GBP is claimed + once Yelp/on-site reviews accumulate,
  // update these numbers (or auto-compute from a daily cron).
  count: 43,
  average: 4.2,
  asOf: "2026-05-13",
  featuredQuote: {
    text:
      "Way friendlier and more reliable than Letter Locker down the street. Consistent presence after 11am — no surprises, no missed pickups.",
    author: "Julius Rogers",
    rating: 5,
  },
};

/**
 * Render-ready aggregate-rating object for schema.org/LocalBusiness, or
 * null when we don't yet have enough reviews to make a credible claim.
 */
export function aggregateRatingSchema(): Record<string, unknown> | null {
  const { count, average, asOf } = REVIEWS_CONFIG;
  if (count < 5) return null;
  return {
    "@type": "AggregateRating",
    ratingValue: average.toFixed(1),
    reviewCount: count,
    bestRating: "5",
    worstRating: "1",
    dateModified: asOf,
  };
}
