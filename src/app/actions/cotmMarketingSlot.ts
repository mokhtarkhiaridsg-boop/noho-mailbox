"use server";

/**
 * iter-169 — Customer-of-the-month marketing spotlight (Tier 11 #78).
 *
 * Lifecycle:
 *  pending  → member submits opt-in form
 *  published → admin approves; appears on the homepage
 *  retracted → member opts out
 *  rejected  → admin rejects with optional reason (member sees + can resubmit)
 *
 * The homepage shows ONLY the most recent `published` slot. Admins
 * review pending submissions in `<AdminCotmSpotlightPanel>`. Both
 * publish + retract write audit logs so the public-facing trail is
 * provable.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export type CotmSlotStatus = "pending" | "published" | "retracted" | "rejected";

export type MyCotmSlotRow = {
  id: string;
  awardId: string;
  year: number;
  month: number;
  status: CotmSlotStatus;
  businessName: string;
  quote: string;
  photoUrl: string | null;
  websiteUrl: string | null;
  rejectionReason: string | null;
  publishedAtIso: string | null;
  createdAtIso: string;
};

export type MarketingSpotlightView = {
  id: string;
  userName: string;        // user's full name from the user table
  businessName: string;
  quote: string;
  photoUrl: string | null;
  websiteUrl: string | null;
  monthLabel: string;      // e.g. "May 2026"
  publishedAtIso: string;
};

// Member-side helper: resolve the awardId for the current user given a
// year+month. Used by the opt-in form so we don't need to expose the
// full awards list with raw IDs.
export async function getMyAwardIdForMonth(input: { year: number; month: number }): Promise<string | null> {
  const session = await verifySession();
  const userId = session.id!;
  const award = await prisma.customerOfMonthAward.findFirst({
    where: { userId, year: input.year, month: input.month },
    select: { id: true },
  });
  return award?.id ?? null;
}

// ─── Member-side ─────────────────────────────────────────────────────
export async function getMyCotmSlots(): Promise<MyCotmSlotRow[]> {
  const session = await verifySession();
  const userId = session.id!;
  const rows = await prisma.cotmMarketingSlot.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 12,
    include: { award: { select: { year: true, month: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    awardId: r.awardId,
    year: r.award.year,
    month: r.award.month,
    status: r.status as CotmSlotStatus,
    businessName: r.businessName,
    quote: r.quote,
    photoUrl: r.photoUrl,
    websiteUrl: r.websiteUrl,
    rejectionReason: r.rejectionReason,
    publishedAtIso: r.publishedAt?.toISOString() ?? null,
    createdAtIso: r.createdAt.toISOString(),
  }));
}

export type SubmitCotmSpotlightInput = {
  awardId: string;
  businessName: string;
  quote: string;
  photoUrl?: string | null;
  websiteUrl?: string | null;
};

export async function submitCotmSpotlight(input: SubmitCotmSpotlightInput): Promise<{ ok: boolean; id?: string; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const businessName = input.businessName.trim().slice(0, 80);
  const quote = input.quote.trim().slice(0, 200);
  if (businessName.length < 2) return { ok: false, error: "Business name required (≥2 chars)." };
  if (quote.length < 5) return { ok: false, error: "Quote required (≥5 chars)." };

  const award = await prisma.customerOfMonthAward.findUnique({
    where: { id: input.awardId },
    include: { marketingSlot: true },
  });
  if (!award) return { ok: false, error: "Award not found." };
  if (award.userId !== userId) return { ok: false, error: "Not your award." };

  // Light-weight URL sanity checks. Photo can be a Vercel Blob URL or
  // an external HTTPS image; website is optional.
  const photoUrl = (input.photoUrl ?? "").trim() || null;
  const websiteUrl = (input.websiteUrl ?? "").trim() || null;
  for (const u of [photoUrl, websiteUrl]) {
    if (!u) continue;
    try {
      const parsed = new URL(u);
      if (parsed.protocol !== "https:") return { ok: false, error: "URLs must be HTTPS." };
    } catch { return { ok: false, error: "URL looks invalid." }; }
  }

  let slotId: string;
  if (award.marketingSlot) {
    // Re-submission flow — clear rejection state, set back to pending.
    const updated = await prisma.cotmMarketingSlot.update({
      where: { id: award.marketingSlot.id },
      data: {
        businessName, quote, photoUrl, websiteUrl,
        status: "pending",
        rejectedAt: null,
        rejectionReason: null,
        retractedAt: null,
      },
    });
    slotId = updated.id;
  } else {
    const created = await prisma.cotmMarketingSlot.create({
      data: {
        awardId: award.id,
        userId,
        status: "pending",
        businessName, quote, photoUrl, websiteUrl,
      },
    });
    slotId = created.id;
  }

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: session.role ?? "MEMBER",
      action: "cotm.spotlight_submitted",
      entityType: "CotmMarketingSlot",
      entityId: slotId,
      metadata: JSON.stringify({ awardId: award.id, businessName, quoteLength: quote.length, hasPhoto: !!photoUrl, hasWebsite: !!websiteUrl }),
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/");
  return { ok: true, id: slotId };
}

export async function retractMyCotmSpotlight(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const row = await prisma.cotmMarketingSlot.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Slot not found." };
  if (row.userId !== userId && session.role !== "ADMIN") return { error: "Not your slot." };
  if (row.status === "retracted") return { error: "Already retracted." };
  await prisma.$transaction([
    prisma.cotmMarketingSlot.update({
      where: { id: row.id },
      data: { status: "retracted", retractedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role ?? "MEMBER",
        action: "cotm.spotlight_retracted",
        entityType: "CotmMarketingSlot",
        entityId: row.id,
        metadata: JSON.stringify({ businessName: row.businessName, prevStatus: row.status }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  revalidatePath("/");
  return { success: true };
}

// ─── Admin-side ──────────────────────────────────────────────────────
export type AdminCotmSlotRow = MyCotmSlotRow & {
  userId: string;
  userName: string;
  userEmail: string;
  suiteNumber: string | null;
  awardCitation: string;
};

export async function listAdminCotmSlots(input: { status?: CotmSlotStatus | "all" } = {}): Promise<AdminCotmSlotRow[]> {
  await verifyAdmin();
  const where: Record<string, unknown> = {};
  if (input.status && input.status !== "all") where.status = input.status;
  const rows = await prisma.cotmMarketingSlot.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 100,
    include: {
      award: { select: { year: true, month: true, citation: true } },
      user: { select: { name: true, email: true, suiteNumber: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    awardId: r.awardId,
    year: r.award.year,
    month: r.award.month,
    status: r.status as CotmSlotStatus,
    businessName: r.businessName,
    quote: r.quote,
    photoUrl: r.photoUrl,
    websiteUrl: r.websiteUrl,
    rejectionReason: r.rejectionReason,
    publishedAtIso: r.publishedAt?.toISOString() ?? null,
    createdAtIso: r.createdAt.toISOString(),
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
    suiteNumber: r.user.suiteNumber,
    awardCitation: r.award.citation,
  }));
}

export async function publishCotmSpotlight(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.cotmMarketingSlot.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Slot not found." };
  if (row.status === "published") return { error: "Already published." };
  await prisma.$transaction([
    prisma.cotmMarketingSlot.update({
      where: { id: row.id },
      data: { status: "published", publishedAt: new Date(), publishedById: actor.id, rejectedAt: null, rejectionReason: null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "cotm.spotlight_published",
        entityType: "CotmMarketingSlot",
        entityId: row.id,
        metadata: JSON.stringify({ businessName: row.businessName, userId: row.userId, awardId: row.awardId }),
      },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/");
  return { success: true };
}

export async function rejectCotmSpotlight(input: { id: string; reason: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const reason = input.reason.trim().slice(0, 300);
  if (reason.length < 2) return { error: "Reason required." };
  const row = await prisma.cotmMarketingSlot.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Slot not found." };
  await prisma.$transaction([
    prisma.cotmMarketingSlot.update({
      where: { id: row.id },
      data: { status: "rejected", rejectedAt: new Date(), rejectionReason: reason },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "cotm.spotlight_rejected",
        entityType: "CotmMarketingSlot",
        entityId: row.id,
        metadata: JSON.stringify({ businessName: row.businessName, userId: row.userId, reason }),
      },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Public-side: homepage spotlight ───────────────────────────────────
// Returns the single most-recent published slot for the marketing
// homepage to render. Cache-friendly: pure read, joins user for the
// display name. Returns null when there's no spotlight to show.
export async function getCurrentMarketingSpotlight(): Promise<MarketingSpotlightView | null> {
  try {
    const row = await prisma.cotmMarketingSlot.findFirst({
      where: { status: "published" },
      orderBy: { publishedAt: "desc" },
      include: {
        user: { select: { name: true } },
        award: { select: { year: true, month: true } },
      },
    });
    if (!row) return null;
    const monthName = new Date(row.award.year, row.award.month - 1, 1).toLocaleDateString("en-US", { month: "long" });
    return {
      id: row.id,
      userName: row.user.name,
      businessName: row.businessName,
      quote: row.quote,
      photoUrl: row.photoUrl,
      websiteUrl: row.websiteUrl,
      monthLabel: `${monthName} ${row.award.year}`,
      publishedAtIso: row.publishedAt!.toISOString(),
    };
  } catch {
    return null;
  }
}
