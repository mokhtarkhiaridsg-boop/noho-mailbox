"use server";

/**
 * iter-205 — Google Business Profile auto-publish (Tier 14 #114).
 *
 * Daily cron pushes iter-90 OperatingHoursConfig (weekly + holidays)
 * to the bureau's GBP listing so customers searching Google see
 * accurate hours + holiday closures without admin manually editing
 * the GBP dashboard.
 *
 * Two modes:
 *   - Live publish (when all GBP_* env vars are set): OAuth refresh →
 *     PATCH location → audit `gbp.hours_published`
 *   - Dry run (when env vars are missing OR force=true): builds the
 *     payload, returns it, no HTTP call. Lets admin preview what would
 *     ship without configuring credentials yet.
 *
 * Idempotency: we hash the published payload + compare against the
 * hash of the last successful publish. Skip if unchanged — saves
 * GBP API quota + avoids audit-log noise.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { getOperatingHours } from "@/app/actions/operatingHours";
import { createHash } from "node:crypto";
import {
  checkGbpEnv,
  buildGbpRegularHours,
  buildGbpSpecialHours,
  getGbpAccessToken,
  pushHoursToGbp,
  type GbpRegularHours,
  type GbpSpecialHours,
} from "@/lib/gbp";

export type GbpPublishResult = {
  ranAtIso: string;
  configured: boolean;                   // false when env vars missing
  missing?: string[];                    // names of unset vars
  dryRun: boolean;
  pushed: boolean;
  unchanged?: boolean;                   // last hash matches — skipped push
  payloadHash: string;
  payloadPreview?: { regular: GbpRegularHours; special: GbpSpecialHours };
  error?: string;
  appliedAtIso?: string;
  periodsRegular?: number;
  periodsSpecial?: number;
  lastPublishedAtIso: string | null;
};

function hashPayload(regular: GbpRegularHours, special: GbpSpecialHours): string {
  return createHash("sha256")
    .update(JSON.stringify({ regular, special }))
    .digest("hex")
    .slice(0, 16);
}

async function lastPublishedHash(): Promise<{ hash: string | null; atIso: string | null }> {
  const last = await prisma.auditLog.findFirst({
    where: { action: "gbp.hours_published" },
    orderBy: { createdAt: "desc" },
    select: { metadata: true, createdAt: true },
  }).catch(() => null);
  if (!last) return { hash: null, atIso: null };
  try {
    const meta = JSON.parse(last.metadata ?? "{}") as { hash?: string };
    return { hash: meta.hash ?? null, atIso: last.createdAt.toISOString() };
  } catch {
    return { hash: null, atIso: last.createdAt.toISOString() };
  }
}

// Cron-callable. force=true bypasses the unchanged-hash skip + always
// runs in dry-run preview when env vars are missing.
export async function runGbpHoursPublishSweep(input: { force?: boolean; dryRun?: boolean } = {}): Promise<GbpPublishResult> {
  const cfg = await getOperatingHours();
  const regular = buildGbpRegularHours(cfg);
  const special = buildGbpSpecialHours(cfg);
  const payloadHash = hashPayload(regular, special);
  const last = await lastPublishedHash();

  const env = checkGbpEnv();
  const result: GbpPublishResult = {
    ranAtIso: new Date().toISOString(),
    configured: env.ok,
    missing: env.ok ? undefined : env.missing,
    dryRun: !env.ok || !!input.dryRun,
    pushed: false,
    payloadHash,
    payloadPreview: { regular, special },
    lastPublishedAtIso: last.atIso,
  };

  // Dry run path — no env, no force, or admin requested preview.
  if (!env.ok || input.dryRun) {
    return result;
  }

  // Skip if nothing changed since last publish.
  if (!input.force && last.hash === payloadHash) {
    result.unchanged = true;
    return result;
  }

  // Live publish.
  const tok = await getGbpAccessToken({ clientId: env.clientId, clientSecret: env.clientSecret, refreshToken: env.refreshToken });
  if (!tok.ok) {
    result.error = `oauth: ${tok.reason}${tok.detail ? ` · ${tok.detail}` : ""}`;
    return result;
  }
  const push = await pushHoursToGbp({
    accessToken: tok.accessToken, accountId: env.accountId, locationId: env.locationId,
    regular, special,
  });
  if (!push.ok) {
    result.error = `gbp: ${push.reason}${push.detail ? ` · ${push.detail}` : ""}`;
    return result;
  }
  result.pushed = true;
  result.appliedAtIso = push.appliedAtIso;
  result.periodsRegular = push.periodsRegular;
  result.periodsSpecial = push.periodsSpecial;
  await prisma.auditLog.create({
    data: {
      actorId: "system", actorRole: "SYSTEM",
      action: "gbp.hours_published",
      entityType: "SiteConfig", entityId: "operating_hours_v1",
      metadata: JSON.stringify({ hash: payloadHash, periodsRegular: push.periodsRegular, periodsSpecial: push.periodsSpecial, accountId: env.accountId, locationId: env.locationId }),
    },
  }).catch(() => null);
  return result;
}

// Admin-callable preview wrapper. Always returns the payload so the
// admin panel can show "this is what we'd push" before configuring
// credentials.
export async function previewGbpHoursPublish(): Promise<GbpPublishResult> {
  await verifyAdmin();
  return runGbpHoursPublishSweep({ dryRun: true });
}

// Admin-callable force-republish. Bypasses unchanged-hash skip so
// admin can reprint after a catalog edit even if hours haven't changed.
export async function forceGbpHoursPublish(): Promise<GbpPublishResult> {
  await verifyAdmin();
  return runGbpHoursPublishSweep({ force: true });
}
