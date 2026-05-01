"use server";

/**
 * NOHO Mailbox — public pricing page configuration (server actions).
 * Reads/writes the JSON record in SiteConfig under `pricing_v2`. Types
 * and defaults live in `@/lib/pricing-config` so this file can stay a
 * pure async-only "use server" module.
 */
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_PRICING,
  PRICING_KEY,
  type PricingConfig,
} from "@/lib/pricing-config";

export async function getPricingConfig(): Promise<PricingConfig> {
  const row = await prisma.siteConfig.findUnique({ where: { key: PRICING_KEY } });
  if (!row?.value) return DEFAULT_PRICING;
  try {
    const parsed = JSON.parse(row.value) as Partial<PricingConfig>;
    return {
      headline: parsed.headline ?? DEFAULT_PRICING.headline,
      subhead: parsed.subhead ?? DEFAULT_PRICING.subhead,
      plans: parsed.plans?.length ? parsed.plans : DEFAULT_PRICING.plans,
      comparison: parsed.comparison?.length
        ? parsed.comparison
        : DEFAULT_PRICING.comparison,
      fees: parsed.fees?.length ? parsed.fees : DEFAULT_PRICING.fees,
      policies: parsed.policies?.length
        ? parsed.policies
        : DEFAULT_PRICING.policies,
    };
  } catch {
    return DEFAULT_PRICING;
  }
}

export async function updatePricingConfig(input: PricingConfig) {
  await verifyAdmin();
  if (!input.plans?.length) return { error: "At least one plan is required" };
  for (const p of input.plans) {
    if (!p.name?.trim()) return { error: "Every plan needs a name" };
    if (!p.id?.trim()) return { error: "Every plan needs an id" };
  }
  await prisma.siteConfig.upsert({
    where: { key: PRICING_KEY },
    update: { value: JSON.stringify(input) },
    create: { key: PRICING_KEY, value: JSON.stringify(input) },
  });
  revalidatePath("/pricing");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}
