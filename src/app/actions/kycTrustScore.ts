"use server";

/**
 * iter-189 — KYC trust score (Tier 13 #98).
 *
 * Composite 0-100 score per member computed from existing User
 * columns + ForwardingAddress count. Surfaces in admin customer
 * drawer + a dedicated "low trust" panel for compliance triage.
 *
 * Scoring axes (signed, capped):
 *   has_kyc_form          0 → +10   Form 1583 uploaded
 *   has_primary_id_image  0 → +20   Primary ID photo on file
 *   has_secondary_id      0 → +15   Secondary ID photo on file
 *   primary_id_type       0 → +10   Type recorded (DL/Passport/etc)
 *   primary_id_number     0 → +10   Number captured
 *   primary_id_not_expired -25 → +15  Penalty when past, credit when future
 *   secondary_id_not_expired -10 → +5
 *   kyc_status            0 → +20   Status === "Approved"
 *   has_phone             0 → +5    Contact-on-file
 *   email_well_formed     0 → +5    Sanity check
 *   has_forwarding        0 → +5    At least one ForwardingAddress
 *
 * Raw range: -35 to +120 → clamped to 0-100.
 *
 * Cron-callable: `runKycTrustSweep()` recomputes everyone nightly.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { bandFor, type KycAxis, type KycTrustResult } from "@/lib/kyc-trust";

function isFutureYmd(s: string | null | undefined): boolean | null {
  if (!s) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const today = new Date();
  const todayYmd = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  return s >= todayYmd;
}

async function computeForUserInternal(userId: string): Promise<KycTrustResult | null> {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      kycStatus: true,
      kycForm1583Url: true,
      kycIdImageUrl: true,
      kycIdImage2Url: true,
      idPrimaryType: true,
      idPrimaryNumber: true,
      idPrimaryExpDate: true,
      idSecondaryType: true,
      idSecondaryExpDate: true,
      forwardingAddresses: { select: { id: true } },
    },
  });
  if (!u) return null;

  const axes: KycAxis[] = [];
  const flags: string[] = [];

  // ── Form 1583 + ID images
  axes.push(passOrFail("has_kyc_form", "Form 1583 uploaded", !!u.kycForm1583Url, +10, 0,
    !!u.kycForm1583Url ? "uploaded" : "missing"));
  axes.push(passOrFail("has_primary_id_image", "Primary ID photo on file", !!u.kycIdImageUrl, +20, 0,
    !!u.kycIdImageUrl ? "uploaded" : "missing"));
  axes.push(passOrFail("has_secondary_id", "Secondary ID photo on file", !!u.kycIdImage2Url, +15, 0,
    !!u.kycIdImage2Url ? "uploaded" : "missing"));

  // ── ID type + number
  axes.push(passOrFail("primary_id_type", "Primary ID type recorded", !!u.idPrimaryType, +10, 0,
    u.idPrimaryType ?? "(missing)"));
  axes.push(passOrFail("primary_id_number", "Primary ID # captured", !!u.idPrimaryNumber, +10, 0,
    u.idPrimaryNumber ? `…${u.idPrimaryNumber.slice(-4)}` : "(missing)"));

  // ── Expirations: penalize if past, credit if future, neutral if absent
  const primaryExpFuture = isFutureYmd(u.idPrimaryExpDate);
  if (primaryExpFuture === true) {
    axes.push({ key: "primary_id_not_expired", label: "Primary ID not expired", contribution: +15, detail: `expires ${u.idPrimaryExpDate}`, passed: true });
  } else if (primaryExpFuture === false) {
    axes.push({ key: "primary_id_not_expired", label: "Primary ID not expired", contribution: -25, detail: `EXPIRED ${u.idPrimaryExpDate}`, passed: false });
    flags.push("primary_id_not_expired");
  } else {
    axes.push({ key: "primary_id_not_expired", label: "Primary ID not expired", contribution: 0, detail: "no expiration on file", passed: false });
    flags.push("primary_id_not_expired");
  }
  const secondaryExpFuture = isFutureYmd(u.idSecondaryExpDate);
  if (secondaryExpFuture === true) {
    axes.push({ key: "secondary_id_not_expired", label: "Secondary ID not expired", contribution: +5, detail: `expires ${u.idSecondaryExpDate}`, passed: true });
  } else if (secondaryExpFuture === false) {
    axes.push({ key: "secondary_id_not_expired", label: "Secondary ID not expired", contribution: -10, detail: `EXPIRED ${u.idSecondaryExpDate}`, passed: false });
    flags.push("secondary_id_not_expired");
  } else {
    axes.push({ key: "secondary_id_not_expired", label: "Secondary ID not expired", contribution: 0, detail: "no expiration on file", passed: false });
    // Don't flag — secondary is optional for some plans.
  }

  // ── KYC status
  const isApproved = u.kycStatus === "Approved";
  axes.push({ key: "kyc_status", label: "KYC status = Approved", contribution: isApproved ? +20 : 0, detail: u.kycStatus ?? "(unset)", passed: isApproved });
  if (!isApproved) flags.push("kyc_status");

  // ── Contact + sanity
  axes.push(passOrFail("has_phone", "Phone on file", !!u.phone, +5, 0, u.phone ?? "(missing)"));
  const emailGood = !!u.email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email);
  axes.push(passOrFail("email_well_formed", "Email well-formed", emailGood, +5, 0, u.email ?? "(missing)"));
  axes.push(passOrFail("has_forwarding", "Forwarding address on file", u.forwardingAddresses.length > 0, +5, 0, `${u.forwardingAddresses.length} on file`));

  // Collect failed axes into flags (idempotent — already pushed for some).
  for (const a of axes) {
    if (!a.passed && !flags.includes(a.key)) flags.push(a.key);
  }

  // Sum + clamp.
  const raw = axes.reduce((s, a) => s + a.contribution, 0);
  const score = Math.max(0, Math.min(100, raw));
  return {
    userId,
    score,
    band: bandFor(score),
    axes,
    flags,
    computedAtIso: new Date().toISOString(),
  };
}

function passOrFail(key: string, label: string, passed: boolean, creditOnPass: number, creditOnFail: number, detail: string): KycAxis {
  return { key, label, contribution: passed ? creditOnPass : creditOnFail, detail, passed };
}

// ─── Compute (single member) ─────────────────────────────────────────
export async function getMemberKycTrustScore(input: { userId: string }): Promise<KycTrustResult | null> {
  await verifyAdmin();
  return computeForUserInternal(input.userId);
}

export async function getMyKycTrustScore(): Promise<KycTrustResult | null> {
  const session = await verifySession();
  return computeForUserInternal(session.id!);
}

// ─── Persist + cron sweep ─────────────────────────────────────────
async function persistResult(r: KycTrustResult): Promise<void> {
  await prisma.user.update({
    where: { id: r.userId },
    data: {
      kycTrustScore: r.score,
      kycTrustComputedAt: new Date(r.computedAtIso),
      kycTrustFlagsJson: JSON.stringify(r.flags),
    },
  }).catch(() => undefined);
}

export async function recomputeUserKycTrust(input: { userId: string }): Promise<{ ok: boolean; score?: number; band?: string; error?: string }> {
  const actor = await verifyAdmin();
  const result = await computeForUserInternal(input.userId);
  if (!result) return { ok: false, error: "User not found." };
  await persistResult(result);
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: actor.role,
      action: "kyc.trust_recomputed",
      entityType: "User",
      entityId: input.userId,
      metadata: JSON.stringify({ score: result.score, band: result.band, flagCount: result.flags.length }),
    },
  });
  revalidatePath("/admin");
  return { ok: true, score: result.score, band: result.band };
}

export type KycTrustSweepResult = { scanned: number; updated: number; failed: number };

export async function runKycTrustSweep(): Promise<KycTrustSweepResult> {
  const out: KycTrustSweepResult = { scanned: 0, updated: 0, failed: 0 };
  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    select: { id: true },
  });
  out.scanned = users.length;
  for (const u of users) {
    try {
      const r = await computeForUserInternal(u.id);
      if (!r) { out.failed += 1; continue; }
      await persistResult(r);
      out.updated += 1;
    } catch {
      out.failed += 1;
    }
  }
  return out;
}

// ─── Admin: low-trust queue ─────────────────────────────────────────
export type KycTrustRow = {
  userId: string;
  userName: string;
  userEmail: string;
  suiteNumber: string | null;
  plan: string | null;
  score: number | null;
  band: string;
  flagCount: number;
  flags: string[];
  computedAtIso: string | null;
};

export async function listLowTrustMembers(input: { thresholdScore?: number; limit?: number } = {}): Promise<KycTrustRow[]> {
  await verifyAdmin();
  const threshold = Math.max(0, Math.min(100, Math.round(input.thresholdScore ?? 65)));
  const limit = Math.max(5, Math.min(200, input.limit ?? 50));
  const users = await prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
      OR: [
        { kycTrustScore: { lt: threshold } },
        { kycTrustScore: null },
      ],
    },
    orderBy: [{ kycTrustScore: "asc" }, { name: "asc" }],
    take: limit,
    select: {
      id: true, name: true, email: true, suiteNumber: true, plan: true,
      kycTrustScore: true, kycTrustComputedAt: true, kycTrustFlagsJson: true,
    },
  });
  return users.map((u) => {
    let flags: string[] = [];
    try { const arr = JSON.parse(u.kycTrustFlagsJson ?? "[]") as unknown; if (Array.isArray(arr)) flags = arr.filter((x): x is string => typeof x === "string"); } catch { /* swallow */ }
    return {
      userId: u.id,
      userName: u.name,
      userEmail: u.email,
      suiteNumber: u.suiteNumber,
      plan: u.plan,
      score: u.kycTrustScore,
      band: u.kycTrustScore == null ? "—" : bandFor(u.kycTrustScore),
      flagCount: flags.length,
      flags,
      computedAtIso: u.kycTrustComputedAt?.toISOString() ?? null,
    };
  });
}
