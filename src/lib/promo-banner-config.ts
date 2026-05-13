// Types + defaults for the marketing promo banner (the "florists bar" in the
// admin's words). Lives outside any "use server" file so types/constants can
// be imported from client components.
//
// One config rules them all — Mother's Day, Valentine's, Black Friday, summer
// $5/stop pushes for restaurants, etc. The admin edits in /admin → Settings,
// the change persists to SiteConfig and the public banner re-renders on the
// next page load.

export type PromoBannerConfig = {
  /** Master switch — turn the banner off without deleting the config. */
  enabled: boolean;
  /**
   * Audience tag rendered bold on the left ("Florists:", "Restaurants:",
   * "Couriers:"). Empty string hides the tag entirely.
   */
  audience: string;
  /**
   * Pitch line. Supports a single `{daysLeft}` placeholder which expands to
   * the number of days until `countdownDate` (capped at 0).
   */
  message: string;
  /** CTA text — empty string hides the link. */
  ctaText: string;
  /** Where the CTA links. Relative or absolute. */
  ctaHref: string;
  /**
   * ISO date — banner stops rendering after this moment. Empty string means
   * no expiry; rely on `enabled` instead.
   */
  hideAfter: string;
  /**
   * ISO date used for the `{daysLeft}` placeholder. Empty string means no
   * countdown — the message renders verbatim.
   */
  countdownDate: string;
  /** Optional gradient override. Empty string falls back to defaults. */
  bgFrom: string;
  bgTo: string;
  /** Text color for the line. */
  textColor: string;
  /** Decorative emoji on the left (e.g. "🌹"). Empty string hides it. */
  iconEmoji: string;
};

export const DEFAULT_PROMO_BANNER: PromoBannerConfig = {
  enabled: true,
  audience: "Florists",
  message:
    "{daysLeft} days to Mother's Day — reserve overflow drivers now. $5/stop in NoHo, $9–$13 across the Valley.",
  ctaText: "Reserve",
  ctaHref: "/delivery/for-florists",
  hideAfter: "2026-05-12T00:00:00-07:00",
  countdownDate: "2026-05-10T09:00:00-07:00",
  bgFrom: "#B07030",
  bgTo: "#8A5520",
  textColor: "#FFE4A0",
  iconEmoji: "🌹",
};

export const PROMO_BANNER_KEY = "promo_banner_v1";

/**
 * Parse stored JSON, falling back to defaults when missing or invalid. The
 * caller passes the raw SiteConfig.value (or null when no row exists yet).
 */
export function parsePromoBanner(raw: string | null): PromoBannerConfig {
  if (!raw) return DEFAULT_PROMO_BANNER;
  try {
    const parsed = JSON.parse(raw) as Partial<PromoBannerConfig>;
    return { ...DEFAULT_PROMO_BANNER, ...parsed };
  } catch {
    return DEFAULT_PROMO_BANNER;
  }
}

/** Render the message with `{daysLeft}` filled in (or stripped if no countdown). */
export function renderPromoMessage(cfg: PromoBannerConfig, now: Date): string {
  if (!cfg.countdownDate) {
    return cfg.message.replace(/\{daysLeft\}/g, "").replace(/\s+/g, " ").trim();
  }
  const target = new Date(cfg.countdownDate);
  if (isNaN(target.getTime())) return cfg.message;
  const ms = target.getTime() - now.getTime();
  const daysLeft = Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
  let msg = cfg.message.replace(/\{daysLeft\}/g, String(daysLeft));
  // Grammar polish — the literal substitution leaves awkward phrasing on the
  // boundary days. The admin writes the message once with "{daysLeft} days
  // to Mother's Day" and we make it read naturally for these edge cases:
  //   daysLeft === 0  →  "0 days to Mother's Day"   →  "Today is Mother's Day"
  //   daysLeft === 1  →  "1 days to Mother's Day"   →  "1 day to Mother's Day"
  if (daysLeft === 0) {
    msg = msg.replace(/^0 days (to|until|before|'?til|till) /i, "Today is ");
  } else if (daysLeft === 1) {
    msg = msg.replace(/^1 days /, "1 day ");
  }
  return msg;
}

/** Should the banner render right now? Combines `enabled` + `hideAfter`. */
export function isPromoBannerActive(cfg: PromoBannerConfig, now: Date): boolean {
  if (!cfg.enabled) return false;
  // If a countdown date is set and it's already passed by more than 12 hours,
  // hide the banner regardless of `hideAfter`. Otherwise the message renders
  // "Today is X" indefinitely after the event (because daysLeft is clamped
  // to 0). This catches the common admin oversight where `countdownDate` is
  // set but `hideAfter` was given too generous a buffer.
  if (cfg.countdownDate) {
    const target = new Date(cfg.countdownDate);
    if (!isNaN(target.getTime()) && now.getTime() - target.getTime() > 12 * 60 * 60 * 1000) {
      return false;
    }
  }
  if (cfg.hideAfter) {
    const hide = new Date(cfg.hideAfter);
    if (!isNaN(hide.getTime()) && now >= hide) return false;
  }
  return true;
}
