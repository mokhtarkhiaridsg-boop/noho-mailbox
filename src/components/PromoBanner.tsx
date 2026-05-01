"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  isPromoBannerActive,
  renderPromoMessage,
  type PromoBannerConfig,
} from "@/lib/promo-banner-config";

const DISMISS_KEY = "promo-banner-dismissed-v1";

type Props = {
  config: PromoBannerConfig;
};

/**
 * Top-of-page promo banner ("the florists bar"). Reads its copy/colors/dates
 * from SiteConfig via the parent server component and renders only when the
 * config says it should — it never hardcodes a campaign.
 *
 * Dismissal:
 *   - Stored under DISMISS_KEY in localStorage along with the message hash, so
 *     editing the copy in admin re-shows the banner to anyone who'd dismissed
 *     the previous version. (Otherwise admins would push a new promo and
 *     return customers would never see it.)
 */
export default function PromoBanner({ config }: Props) {
  const [now, setNow] = useState<Date | null>(null);
  const [dismissed, setDismissed] = useState(false);

  // Per-message hash so dismissals don't leak across campaigns.
  const messageHash = config.message + "|" + config.audience + "|" + config.countdownDate;

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 60_000);
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (raw === messageHash) setDismissed(true);
    } catch {
      // localStorage unavailable — never dismiss permanently
    }
    return () => clearInterval(interval);
  }, [messageHash]);

  if (!now || dismissed) return null;
  if (!isPromoBannerActive(config, now)) return null;

  const messageText = renderPromoMessage(config, now);
  const audience = config.audience.trim();
  const ctaText = config.ctaText.trim();
  const ctaHref = config.ctaHref.trim();
  const icon = config.iconEmoji.trim();

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISS_KEY, messageHash);
    } catch {
      // ignore storage failures
    }
  }

  return (
    <div
      className="relative w-full px-4 py-3 text-center text-sm font-semibold flex items-center justify-center gap-3"
      style={{
        background: `linear-gradient(90deg, ${config.bgFrom} 0%, ${config.bgTo} 100%)`,
        color: config.textColor,
        boxShadow: "0 2px 8px rgba(45,16,15,0.18)",
      }}
      role="region"
      aria-label={audience ? `${audience} promotion` : "Promotion"}
    >
      {icon && (
        <span className="hidden sm:inline" aria-hidden>
          {icon}
        </span>
      )}
      <span>
        {audience && (
          <strong className="font-extrabold mr-2" style={{ color: "#FFFFFF" }}>
            {audience}:
          </strong>
        )}
        {messageText}
        {ctaText && ctaHref && (
          <>
            {" "}
            <Link
              href={ctaHref}
              className="underline font-bold hover:no-underline"
              style={{ color: "#FFFFFF" }}
            >
              {ctaText} →
            </Link>
          </>
        )}
      </span>
      <button
        type="button"
        onClick={dismiss}
        className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center transition-opacity hover:bg-white/15"
        style={{ color: config.textColor }}
        aria-label="Dismiss promo banner"
      >
        ×
      </button>
    </div>
  );
}
