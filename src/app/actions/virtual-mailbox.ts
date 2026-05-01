"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import {
  DEFAULT_VIRTUAL_MAILBOX,
  VIRTUAL_MAILBOX_KEY,
  parseVirtualMailbox,
  type VirtualMailboxConfig,
} from "@/lib/virtual-mailbox-config";

/**
 * Public-readable. Returns the current virtual-mailbox config, falling back
 * to defaults when the SiteConfig row is missing (fresh deploy).
 */
export async function getVirtualMailbox(): Promise<VirtualMailboxConfig> {
  try {
    const row = await prisma.siteConfig.findUnique({
      where: { key: VIRTUAL_MAILBOX_KEY },
    });
    return parseVirtualMailbox(row?.value ?? null);
  } catch {
    return DEFAULT_VIRTUAL_MAILBOX;
  }
}

/**
 * Admin-only. Persists the entire config (so callers can do partial edits +
 * pass back the whole thing). Defensive normalisation on every field.
 */
export async function updateVirtualMailbox(
  config: VirtualMailboxConfig,
): Promise<{ success: true } | { error: string }> {
  await verifyAdmin();

  if (!Array.isArray(config.plans) || config.plans.length === 0) {
    return { error: "At least one plan is required" };
  }
  for (const p of config.plans) {
    if (!p.id || !p.name) return { error: "Every plan needs an id and name" };
    if (typeof p.monthly !== "number" || p.monthly < 0) {
      return { error: `Plan "${p.name}" has an invalid monthly price` };
    }
  }

  const normalised: VirtualMailboxConfig = {
    enabled: !!config.enabled,
    headline: String(config.headline ?? "").trim(),
    subhead: String(config.subhead ?? "").trim(),
    digitalAddressLabel: String(config.digitalAddressLabel ?? "").trim(),
    digitalAddressLine: String(config.digitalAddressLine ?? "").trim(),
    plans: config.plans.map((p) => ({
      id: String(p.id).trim(),
      name: String(p.name).trim(),
      badge: p.badge ? String(p.badge).trim() : undefined,
      popular: !!p.popular,
      monthly: Number(p.monthly) || 0,
      annual: Number(p.annual) || 0,
      recipients: Math.max(1, Math.floor(Number(p.recipients) || 1)),
      itemsPerMonth: Math.max(0, Math.floor(Number(p.itemsPerMonth) || 0)),
      freeScans: Math.max(0, Math.floor(Number(p.freeScans) || 0)),
      features: Array.isArray(p.features)
        ? p.features.map((f) => String(f).trim()).filter(Boolean)
        : [],
      cta: String(p.cta ?? "Choose").trim() || "Choose",
    })),
    benefits: Array.isArray(config.benefits)
      ? config.benefits.map((b) => ({
          title: String(b.title ?? "").trim(),
          body: String(b.body ?? "").trim(),
        }))
      : [],
    faqs: Array.isArray(config.faqs)
      ? config.faqs.map((f) => ({
          question: String(f.question ?? "").trim(),
          answer: String(f.answer ?? "").trim(),
        }))
      : [],
  };

  await prisma.siteConfig.upsert({
    where: { key: VIRTUAL_MAILBOX_KEY },
    update: { value: JSON.stringify(normalised) },
    create: { key: VIRTUAL_MAILBOX_KEY, value: JSON.stringify(normalised) },
  });

  // Marketing layout shows a header link; /virtual-mailbox renders the
  // full page. Revalidate the layout so both update.
  revalidatePath("/", "layout");
  revalidatePath("/virtual-mailbox");
  return { success: true };
}
