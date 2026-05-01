"use server";

import { prisma } from "@/lib/prisma";
import { sendContactNotification, sendContactConfirmation } from "@/lib/email";
import { z } from "zod";

const tenantAppSchema = z.object({
  businessName: z.string().min(1, "Business name is required"),
  ownerName: z.string().min(1, "Your name is required"),
  ownerEmail: z.string().email("Valid email required"),
  ownerPhone: z.string().optional(),
  legalCity: z.string().optional(),
  legalState: z.string().optional(),
  customerCount: z.string().optional(),
  currentPlatform: z.string().optional(),
  tier: z.string().default("Solo"),
  notes: z.string().optional(),
});

export type TenantApplicationState = {
  error?: string;
  success?: boolean;
};

function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40) || "tenant";
}

export async function submitTenantApplication(
  prevState: TenantApplicationState,
  formData: FormData
): Promise<TenantApplicationState> {
  const raw = {
    businessName: formData.get("businessName") as string,
    ownerName: formData.get("ownerName") as string,
    ownerEmail: formData.get("ownerEmail") as string,
    ownerPhone: (formData.get("ownerPhone") as string) || undefined,
    legalCity: (formData.get("legalCity") as string) || undefined,
    legalState: (formData.get("legalState") as string) || undefined,
    customerCount: (formData.get("customerCount") as string) || undefined,
    currentPlatform: (formData.get("currentPlatform") as string) || undefined,
    tier: ((formData.get("tier") as string) || "Solo"),
    notes: (formData.get("notes") as string) || undefined,
  };

  const result = tenantAppSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  // Check for existing tenant with same email.
  const client = (prisma as unknown) as {
    tenant: {
      findUnique: (args: { where: { ownerEmail: string } }) => Promise<unknown>;
      create: (args: { data: Record<string, unknown> }) => Promise<{ id: string; slug: string }>;
    };
  };

  try {
    const existing = await client.tenant.findUnique({
      where: { ownerEmail: result.data.ownerEmail },
    });
    if (existing) {
      return {
        error: "An application with this email already exists. We'll be in touch shortly.",
      };
    }

    // Generate a unique slug (best-effort; collision unlikely at this scale).
    const baseSlug = slugify(result.data.businessName);
    let slug = baseSlug;
    let attempt = 0;
    while (
      await client.tenant
        .findUnique({ where: { ownerEmail: `__slugcheck:${slug}` } })
        .catch(() => null)
    ) {
      attempt++;
      slug = `${baseSlug}-${attempt}`;
      if (attempt > 10) break;
    }

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 30);

    const tenant = await client.tenant.create({
      data: {
        id: cuid(),
        name: result.data.businessName,
        slug,
        ownerName: result.data.ownerName,
        ownerEmail: result.data.ownerEmail,
        ownerPhone: result.data.ownerPhone || null,
        legalCity: result.data.legalCity || null,
        legalState: result.data.legalState || null,
        status: "trial",
        trialEndsAt,
        tier: result.data.tier,
        pricePerMonthCents:
          result.data.tier === "Enterprise"
            ? 149900
            : result.data.tier === "Multi-Location"
              ? 79900
              : 29900,
        notes: [
          result.data.currentPlatform ? `Current platform: ${result.data.currentPlatform}` : null,
          result.data.customerCount ? `Customer count: ${result.data.customerCount}` : null,
          result.data.notes || null,
        ]
          .filter(Boolean)
          .join("\n") || null,
      },
    });

    // Also save as ContactSubmission so admin sees it in Messages panel.
    const composedMsg = [
      `BUSINESS: ${result.data.businessName}`,
      `LOCATION: ${result.data.legalCity ?? "?"} ${result.data.legalState ?? ""}`,
      `TIER: ${result.data.tier}`,
      `CURRENT PLATFORM: ${result.data.currentPlatform ?? "(not specified)"}`,
      `CUSTOMER COUNT: ${result.data.customerCount ?? "(not specified)"}`,
      `PHONE: ${result.data.ownerPhone ?? "(not specified)"}`,
      "",
      `TENANT ID: ${tenant.id}`,
      `SLUG: ${tenant.slug}`,
      `TRIAL ENDS: ${trialEndsAt.toISOString().slice(0, 10)}`,
      "",
      result.data.notes || "",
    ].join("\n");

    await prisma.contactSubmission.create({
      data: {
        name: result.data.ownerName,
        email: result.data.ownerEmail,
        service: "saas-cmra-application",
        message: composedMsg,
      },
    });

    // Notify admin + confirmation to applicant.
    try {
      await Promise.all([
        sendContactNotification({
          name: result.data.ownerName,
          email: result.data.ownerEmail,
          service: "saas-cmra-application",
          message: composedMsg,
        }),
        sendContactConfirmation({
          name: result.data.ownerName,
          email: result.data.ownerEmail,
        }),
      ]);
    } catch {
      // Non-fatal.
    }

    return { success: true };
  } catch (e) {
    console.error("[tenant-application] error", e);
    return {
      error: "Something went wrong. Please call (818) 506-7744 and we'll handle it manually.",
    };
  }
}
