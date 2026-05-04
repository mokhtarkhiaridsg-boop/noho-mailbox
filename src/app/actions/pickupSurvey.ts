"use server";

// iter-92 — One-tap pickup-feedback surveys.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

const URL_TOKEN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789"; // no 0/O/1/I/L

function newToken(len = 22): string {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => URL_TOKEN_ALPHABET[b % URL_TOKEN_ALPHABET.length]).join("");
}

// Internal helper called from updateMailStatus(Picked Up). Idempotent —
// returns the existing token if one was already minted for this MailItem.
export async function ensurePickupSurveyToken(input: { mailItemId: string; userId: string }): Promise<{ token: string }> {
  const existing = await prisma.pickupSurvey.findUnique({
    where: { mailItemId: input.mailItemId },
    select: { token: true },
  });
  if (existing) return { token: existing.token };
  const token = newToken();
  await prisma.pickupSurvey.create({
    data: {
      mailItemId: input.mailItemId,
      userId: input.userId,
      token,
    },
  });
  return { token };
}

// Public — fetch a survey by its token. Returns the data needed to
// render the feedback page (item summary + already-submitted check).
export async function getSurveyByToken(token: string) {
  if (!token || token.length < 10) return { error: "Invalid token", row: null as null };
  const row = await prisma.pickupSurvey.findUnique({
    where: { token },
    select: {
      id: true,
      mailItemId: true,
      rating: true,
      comment: true,
      submittedAt: true,
      createdAt: true,
      // Inline the item + customer info so the public page can render
      // a recognizable summary without exposing more than the customer
      // already knows about their own pickup.
    },
  });
  if (!row) return { error: "Not found", row: null as null };

  const item = await prisma.mailItem.findUnique({
    where: { id: row.mailItemId },
    select: {
      id: true,
      from: true,
      carrier: true,
      trackingNumber: true,
      user: { select: { name: true, suiteNumber: true } },
    },
  });

  return {
    row: {
      id: row.id,
      submittedAt: row.submittedAt?.toISOString() ?? null,
      rating: row.rating,
      comment: row.comment,
      createdAtIso: row.createdAt.toISOString(),
    },
    item: item
      ? {
          from: item.from,
          carrier: item.carrier,
          trackingNumber: item.trackingNumber,
          customerName: item.user?.name ?? null,
          suiteNumber: item.user?.suiteNumber ?? null,
        }
      : null,
  };
}

// Public — submit a rating + optional comment via the token. Single
// submission per token (refuses if submittedAt is already set).
export async function submitPickupSurvey(input: { token: string; rating: number; comment?: string }): Promise<{ error?: string; success?: boolean }> {
  const rating = Math.max(1, Math.min(5, Math.round(input.rating)));
  if (!input.token || input.token.length < 10) return { error: "Invalid token" };
  const row = await prisma.pickupSurvey.findUnique({ where: { token: input.token }, select: { id: true, submittedAt: true } });
  if (!row) return { error: "Survey not found" };
  if (row.submittedAt) return { error: "You already submitted feedback for this pickup. Thanks!" };

  await prisma.pickupSurvey.update({
    where: { id: row.id },
    data: {
      rating,
      comment: (input.comment ?? "").trim() || null,
      submittedAt: new Date(),
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

// Admin — aggregate stats for the Insights panel.
export async function getPickupSurveyAggregate(): Promise<{
  total: number;
  responded: number;
  responseRate: number;            // 0..1
  avgRating: number | null;
  recent7dAvg: number | null;
  recent30dAvg: number | null;
  promoterPct: number;             // % of responses with rating === 5
  detractorPct: number;            // % of responses with rating <= 2
  recentComments: Array<{ id: string; rating: number; comment: string; submittedAt: string; customerName: string | null; suiteNumber: string | null }>;
}> {
  await verifyAdmin();
  const now = Date.now();
  const d7 = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const d30 = new Date(now - 30 * 24 * 60 * 60 * 1000);

  const [totalCount, responses, recent7d, recent30d, recentComments] = await Promise.all([
    prisma.pickupSurvey.count(),
    prisma.pickupSurvey.findMany({
      where: { submittedAt: { not: null }, rating: { not: null } },
      select: { rating: true },
    }),
    prisma.pickupSurvey.findMany({
      where: { submittedAt: { gte: d7 }, rating: { not: null } },
      select: { rating: true },
    }),
    prisma.pickupSurvey.findMany({
      where: { submittedAt: { gte: d30 }, rating: { not: null } },
      select: { rating: true },
    }),
    prisma.pickupSurvey.findMany({
      where: { submittedAt: { not: null }, comment: { not: null } },
      orderBy: { submittedAt: "desc" },
      take: 10,
      select: {
        id: true,
        rating: true,
        comment: true,
        submittedAt: true,
        mailItemId: true,
      },
    }),
  ]);

  const responded = responses.length;
  const responseRate = totalCount === 0 ? 0 : responded / totalCount;
  const avg = (rows: Array<{ rating: number | null }>): number | null =>
    rows.length === 0 ? null : rows.reduce((s, r) => s + (r.rating ?? 0), 0) / rows.length;

  const promoters = responses.filter((r) => r.rating === 5).length;
  const detractors = responses.filter((r) => (r.rating ?? 0) <= 2).length;

  // Hydrate recent comments with customer name (separate query — we
  // already have the mailItemId, fetch in batch).
  const ids = recentComments.map((c) => c.mailItemId);
  const items = ids.length === 0
    ? []
    : await prisma.mailItem.findMany({
        where: { id: { in: ids } },
        select: { id: true, user: { select: { name: true, suiteNumber: true } } },
      });
  const itemById = new Map(items.map((i) => [i.id, i] as const));

  return {
    total: totalCount,
    responded,
    responseRate,
    avgRating: avg(responses),
    recent7dAvg: avg(recent7d),
    recent30dAvg: avg(recent30d),
    promoterPct: responded === 0 ? 0 : (promoters / responded) * 100,
    detractorPct: responded === 0 ? 0 : (detractors / responded) * 100,
    recentComments: recentComments.map((c) => ({
      id: c.id,
      rating: c.rating ?? 0,
      comment: c.comment ?? "",
      submittedAt: c.submittedAt!.toISOString(),
      customerName: itemById.get(c.mailItemId)?.user?.name ?? null,
      suiteNumber: itemById.get(c.mailItemId)?.user?.suiteNumber ?? null,
    })),
  };
}
