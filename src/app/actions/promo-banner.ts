"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_PROMO_BANNER,
  PROMO_BANNER_KEY,
  parsePromoBanner,
  type PromoBannerConfig,
} from "@/lib/promo-banner-config";

/**
 * Public-readable. Returns the current promo banner config, falling back to
 * defaults if no row exists yet (first-run / fresh deploy).
 */
export async function getPromoBanner(): Promise<PromoBannerConfig> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { key: PROMO_BANNER_KEY },
    });
    return parsePromoBanner(row?.value ?? null);
  } catch {
    // SiteConfig table might be missing on older deploys — never crash the
    // marketing layout because of it.
    return DEFAULT_PROMO_BANNER;
  }
}

/**
 * Admin-only. Persists the full config as JSON in SiteConfig and revalidates
 * the marketing layout so the next page render picks up the new copy.
 */
export async function updatePromoBanner(
  config: PromoBannerConfig
): Promise<{ success: true } | { error: string }> {
  await verifyAdmin();

  // Defensive normalisation — stop the admin from saving something that
  // breaks the layout (e.g. omitting required fields).
  const normalised: PromoBannerConfig = {
    enabled: !!config.enabled,
    audience: String(config.audience ?? "").trim(),
    message: String(config.message ?? "").trim(),
    ctaText: String(config.ctaText ?? "").trim(),
    ctaHref: String(config.ctaHref ?? "").trim(),
    hideAfter: String(config.hideAfter ?? "").trim(),
    countdownDate: String(config.countdownDate ?? "").trim(),
    bgFrom: String(config.bgFrom ?? DEFAULT_PROMO_BANNER.bgFrom),
    bgTo: String(config.bgTo ?? DEFAULT_PROMO_BANNER.bgTo),
    textColor: String(config.textColor ?? DEFAULT_PROMO_BANNER.textColor),
    iconEmoji: String(config.iconEmoji ?? "").trim(),
  };

  if (!normalised.message) {
    return { error: "Message is required" };
  }

  await prisma.siteConfig.upsert({
    where: { key: PROMO_BANNER_KEY },
    update: { value: JSON.stringify(normalised) },
    create: { key: PROMO_BANNER_KEY, value: JSON.stringify(normalised) },
  });

  // Marketing layout uses the banner — bust the cache.
  revalidatePath("/", "layout");
  return { success: true };
}
