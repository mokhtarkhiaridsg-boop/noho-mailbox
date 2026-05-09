"use server";

/**
 * iter-153 — Renewal-discount auto-offer (Tier 9 #63).
 *
 * Daily cron sweep:
 *  1. Pull every paying member with planDueDate within next 30 days.
 *  2. Compute iter-140 health score for each.
 *  3. For Watch + At Risk members WITHOUT an active offer, generate a
 *     unique 6-char code, persist a `RenewalDiscountOffer` row, fire
 *     the discount email, audit-log + webhook.
 *
 * Member-side: `getMyActiveRenewalOffer()` returns the in-flight
 * (non-redeemed, non-expired) offer so the dashboard can surface it.
 * `redeemRenewalDiscountOffer({code})` marks it redeemed at renewal
 * time; the actual % discount is applied by whatever invoice flow the
 * member uses next (existing iter-116 plan-upgrade or recurring billing).
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendRenewalDiscountOfferEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhooks";
import { getCustomerHealthScores } from "@/app/actions/customerHealthScore";
import { randomBytes } from "node:crypto";

const DEFAULT_PERCENT_OFF = 10;
const OFFER_VALID_DAYS = 21;
const RENEWAL_WINDOW_DAYS = 30;
const MIN_DAYS_BETWEEN_OFFERS = 90;

function generateCode(): string {
  // 8-char base32-ish (no ambiguous chars). Prefix "NOHO" for brand.
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(8);
  let out = "";
  for (let i = 0; i < 8; i++) out += alphabet[bytes[i]! % alphabet.length];
  return `NOHO-${out.slice(0, 4)}-${out.slice(4)}`;
}

async function pickFreshCode(): Promise<string | null> {
  for (let i = 0; i < 100; i++) {
    const c = generateCode();
    const dup = await prisma.renewalDiscountOffer.findUnique({ where: { code: c }, select: { id: true } });
    if (!dup) return c;
  }
  return null;
}

export type SweepResult = {
  scanned: number;
  candidates: number;     // at-risk + due soon
  sent: number;
  skipped: number;        // already had an active offer
  errors: number;
};

export async function runRenewalDiscountSweep(opts: { percentOff?: number } = {}): Promise<SweepResult> {
  const result: SweepResult = { scanned: 0, candidates: 0, sent: 0, skipped: 0, errors: 0 };
  const now = new Date();
  const percentOff = Math.max(1, Math.min(50, Math.round(opts.percentOff ?? DEFAULT_PERCENT_OFF)));

  // Renewal window — planDueDate as YYYY-MM-DD lives on User.
  const dueCutoffDate = new Date(now.getTime() + RENEWAL_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const dueCutoffStr = dueCutoffDate.toISOString().slice(0, 10);
  const todayStr = now.toISOString().slice(0, 10);

  const due = await prisma.user.findMany({
    where: {
      role: "USER",
      mailboxStatus: "Active",
      planDueDate: { gte: todayStr, lte: dueCutoffStr },
    },
    select: { id: true, name: true, email: true, planDueDate: true },
  });
  result.scanned = due.length;
  if (due.length === 0) return result;

  const minOfferAgeCutoff = new Date(now.getTime() - MIN_DAYS_BETWEEN_OFFERS * 24 * 60 * 60 * 1000);
  // Pull every recent offer for this candidate set in one query so we
  // can dedupe before generating new ones.
  const recentOffers = await prisma.renewalDiscountOffer.findMany({
    where: {
      userId: { in: due.map((u) => u.id) },
      OR: [
        { redeemedAt: null, expiresAt: { gt: now } },     // active (not yet expired or redeemed)
        { sentAt: { gt: minOfferAgeCutoff } },             // sent within cooldown window
      ],
    },
    select: { userId: true, sentAt: true, redeemedAt: true, expiresAt: true },
  });
  const blockedUserIds = new Set(recentOffers.map((o) => o.userId));

  // Health score for the eligible (un-blocked) candidates.
  const eligibleIds = due.filter((u) => !blockedUserIds.has(u.id)).map((u) => u.id);
  if (eligibleIds.length === 0) return result;
  const scores = await getCustomerHealthScores({ userIds: eligibleIds });
  const targets = scores.filter((s) => s.bucket === "Watch" || s.bucket === "At Risk");
  result.candidates = targets.length;
  result.skipped = due.length - eligibleIds.length;

  for (const score of targets) {
    const user = due.find((u) => u.id === score.userId);
    if (!user || !user.email) continue;
    try {
      const code = await pickFreshCode();
      if (!code) { result.errors++; continue; }
      const expiresAt = new Date(now.getTime() + OFFER_VALID_DAYS * 24 * 60 * 60 * 1000);
      const reason = `health=${score.bucket} (score=${score.score}); planDueDate=${user.planDueDate}`;

      const offer = await prisma.$transaction(async (tx) => {
        const created = await tx.renewalDiscountOffer.create({
          data: {
            userId: user.id,
            code, percentOff, expiresAt, reason,
          },
        });
        await tx.auditLog.create({
          data: {
            actorId: "system",
            actorRole: "ADMIN",
            action: "renewal.discount_offer_sent",
            entityType: "User",
            entityId: user.id,
            metadata: JSON.stringify({
              offerId: created.id,
              code, percentOff,
              expiresAtIso: expiresAt.toISOString(),
              healthBucket: score.bucket,
              healthScore: score.score,
            }),
          },
        });
        return created;
      });

      // Fire-and-forget side effects.
      void sendRenewalDiscountOfferEmail({
        email: user.email,
        name: user.name ?? user.email,
        code: offer.code,
        percentOff,
        expiresAtIso: expiresAt.toISOString(),
      }).catch((err) => console.error("[renewalDiscount] email failed:", err));

      void fireWebhooks("renewal.discount_offer_sent", {
        text: `🎁 ${user.name ?? user.email} got a ${percentOff}% renewal discount (health: ${score.bucket})`,
        emoji: "🎁",
        detail: { customerName: user.name ?? null, code, percentOff, healthBucket: score.bucket, healthScore: score.score },
      }).catch(() => undefined);

      result.sent++;
    } catch (e) {
      console.error("[renewalDiscount] failed:", user.id, e);
      result.errors++;
    }
  }

  return result;
}

// ─── Member-side ──────────────────────────────────────────────────

export type ActiveRenewalOffer = {
  id: string;
  code: string;
  percentOff: number;
  expiresAtIso: string;
  daysRemaining: number;
};

export async function getMyActiveRenewalOffer(): Promise<ActiveRenewalOffer | null> {
  const session = await verifySession();
  const userId = session.id!;
  const now = new Date();
  const offer = await prisma.renewalDiscountOffer.findFirst({
    where: { userId, redeemedAt: null, expiresAt: { gt: now } },
    orderBy: { sentAt: "desc" },
  });
  if (!offer) return null;
  const days = Math.max(0, Math.ceil((offer.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)));
  return {
    id: offer.id,
    code: offer.code,
    percentOff: offer.percentOff,
    expiresAtIso: offer.expiresAt.toISOString(),
    daysRemaining: days,
  };
}

// Member redeems via dashboard form OR via auto-pickup at renewal time.
// The actual % discount is applied by whichever invoice flow the
// caller uses next — this just marks the offer as redeemed and audits.
export async function redeemRenewalDiscountOffer(input: { code: string }): Promise<{
  success?: boolean;
  percentOff?: number;
  error?: string;
}> {
  const session = await verifySession();
  const userId = session.id!;
  const code = input.code.trim().toUpperCase();
  if (!code) return { error: "Code required" };

  const offer = await prisma.renewalDiscountOffer.findUnique({ where: { code } });
  if (!offer) return { error: "Code not found" };
  if (offer.userId !== userId && session.role !== "ADMIN") {
    return { error: "This code isn't tied to your account" };
  }
  if (offer.redeemedAt) return { error: "This code has already been redeemed" };
  if (offer.expiresAt <= new Date()) return { error: "This code has expired" };

  await prisma.$transaction([
    prisma.renewalDiscountOffer.update({
      where: { id: offer.id },
      data: { redeemedAt: new Date(), redeemedById: userId },
    }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role ?? "MEMBER",
        action: "renewal.discount_offer_redeemed",
        entityType: "RenewalDiscountOffer",
        entityId: offer.id,
        metadata: JSON.stringify({ code, percentOff: offer.percentOff }),
      },
    }),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true, percentOff: offer.percentOff };
}

// ─── Admin reads ──────────────────────────────────────────────────

export type AdminRenewalOfferRow = {
  id: string;
  customerName: string;
  customerEmail: string;
  code: string;
  percentOff: number;
  sentAtIso: string;
  expiresAtIso: string;
  redeemedAtIso: string | null;
  reason: string | null;
};

export async function listRenewalOffers(opts: { limit?: number } = {}): Promise<AdminRenewalOfferRow[]> {
  await verifyAdmin();
  const rows = await prisma.renewalDiscountOffer.findMany({
    orderBy: { sentAt: "desc" },
    take: Math.min(200, Math.max(10, opts.limit ?? 50)),
    include: { user: { select: { name: true, email: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    customerName: r.user.name,
    customerEmail: r.user.email,
    code: r.code,
    percentOff: r.percentOff,
    sentAtIso: r.sentAt.toISOString(),
    expiresAtIso: r.expiresAt.toISOString(),
    redeemedAtIso: r.redeemedAt ? r.redeemedAt.toISOString() : null,
    reason: r.reason,
  }));
}
