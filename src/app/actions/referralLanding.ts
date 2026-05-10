"use server";

/**
 * iter-200 — Public referral landing-page actions (Tier 14 #109).
 *
 * Both actions are PUBLIC — no auth — because the /r/{code} page is
 * meant to be shared on social/email/SMS by members. Risk-bounded:
 *   - lookupReferralLanding only returns first-name + suite # (no
 *     email/phone), so a malicious scraper learns nothing useful
 *   - recordReferralLandingVisit just bumps a counter; rate-limit is
 *     enforced via auditLog throttling for spam-protection
 *
 * Audit logs every visit so admin can spot abuse + measure conversion.
 */

import { prisma } from "@/lib/prisma";

export type ReferralLanding = {
  ok: true;
  code: string;
  referrerFirstName: string;
  referrerSuiteNumber: string | null;
  creditDollars: number;
  visitCount: number;
} | {
  ok: false;
  code: string;
  reason: "not_found" | "claimed";
};

export async function lookupReferralLanding(input: { code: string }): Promise<ReferralLanding> {
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false, code, reason: "not_found" };

  const ref = await prisma.referral.findUnique({
    where: { code },
    include: { referrer: { select: { name: true, suiteNumber: true } } },
  });
  if (!ref) return { ok: false, code, reason: "not_found" };

  const firstName = (ref.referrer?.name?.split(/\s+/)[0] ?? "Your friend").slice(0, 30);
  return {
    ok: true,
    code,
    referrerFirstName: firstName,
    referrerSuiteNumber: ref.referrer?.suiteNumber ?? null,
    creditDollars: Math.round(ref.creditCents / 100),
    visitCount: ref.landingVisits,
  };
}

const VISIT_THROTTLE_MS = 60_000;     // dedupe rapid double-fires from React StrictMode etc.

export async function recordReferralLandingVisit(input: { code: string }): Promise<{ ok: boolean }> {
  const code = input.code.trim().toUpperCase();
  if (!code) return { ok: false };

  const ref = await prisma.referral.findUnique({ where: { code }, select: { id: true, lastLandingAt: true } });
  if (!ref) return { ok: false };

  // Throttle to avoid double-bumping on dev StrictMode / fast back-button.
  if (ref.lastLandingAt && Date.now() - ref.lastLandingAt.getTime() < VISIT_THROTTLE_MS) {
    return { ok: true };
  }

  await prisma.$transaction([
    prisma.referral.update({
      where: { id: ref.id },
      data: { landingVisits: { increment: 1 }, lastLandingAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: "anonymous",
        actorRole: "PUBLIC",
        action: "referral.landing_visited",
        entityType: "Referral",
        entityId: ref.id,
        metadata: JSON.stringify({ code }),
      },
    }),
  ]).catch(() => null);

  return { ok: true };
}
