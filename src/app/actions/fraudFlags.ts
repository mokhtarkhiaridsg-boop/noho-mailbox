"use server";

/**
 * iter-234 — Smart fraud detection server actions (Tier 17 #143).
 *
 * `runFraudDetectionSweep()` is cron-callable: scans recent MailItems
 * + Users against the 6 detector rules in `src/lib/fraud-detector.ts`,
 * upserts FraudFlag rows (idempotent via signalKey @@unique), audits
 * `fraud.flag_raised` per-newly-detected signal, fires
 * `fraud.flag_raised` webhook for high+critical.
 *
 * Reuses iter-227 cron-sweep + idempotent-upsert pattern, iter-228
 * atomic-tx + audit pattern, iter-230 webhook event registration.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { fireWebhooks } from "@/lib/webhooks";
import {
  detectHighVolumeSameSender,
  detectSuspendedAccountActivity,
  detectLowKycHighValue,
  detectRecipientMismatch,
  detectCrossSuiteTracking,
  detectNewAccountSpike,
  TUNING,
  type RawFraudSignal,
  SIGNAL_TYPE_LABEL,
  SEVERITY_META,
} from "@/lib/fraud-detector";

export type FraudFlagRow = {
  id: string;
  signalType: string;
  signalLabel: string;
  signalEmoji: string;
  severity: "low" | "medium" | "high" | "critical";
  severityLabel: string;
  severityBg: string;
  severityFg: string;
  entityType: string;
  entityId: string;
  userId: string | null;
  userName: string | null;
  suiteNumber: string | null;
  summary: string;
  detail: Record<string, unknown>;
  evidenceCount: number;
  status: "Open" | "Reviewed" | "Dismissed" | "Escalated";
  reviewedAtIso: string | null;
  reviewedByName: string | null;
  reviewNote: string | null;
  firstSeenAtIso: string;
  lastSeenAtIso: string;
};

function toView(r: { id: string; signalType: string; severity: string; entityType: string; entityId: string; userId: string | null; suiteNumber: string | null; summary: string; detailJson: string; evidenceCount: number; status: string; reviewedAt: Date | null; reviewedById: string | null; reviewNote: string | null; firstSeenAt: Date; lastSeenAt: Date }, userNameById: Map<string, string | null>): FraudFlagRow {
  const sev = (["low", "medium", "high", "critical"] as const).includes(r.severity as never) ? (r.severity as FraudFlagRow["severity"]) : "low";
  const sigMeta = SIGNAL_TYPE_LABEL[r.signalType] ?? { label: r.signalType, emoji: "🔎" };
  const sevMeta = SEVERITY_META[sev];
  const status: FraudFlagRow["status"] =
    r.status === "Reviewed" ? "Reviewed" :
    r.status === "Dismissed" ? "Dismissed" :
    r.status === "Escalated" ? "Escalated" : "Open";
  let detail: Record<string, unknown> = {};
  try { detail = JSON.parse(r.detailJson) as Record<string, unknown>; } catch { /* ignore */ }
  return {
    id: r.id, signalType: r.signalType,
    signalLabel: sigMeta.label, signalEmoji: sigMeta.emoji,
    severity: sev, severityLabel: sevMeta.label, severityBg: sevMeta.bg, severityFg: sevMeta.fg,
    entityType: r.entityType, entityId: r.entityId,
    userId: r.userId, userName: r.userId ? userNameById.get(r.userId) ?? null : null,
    suiteNumber: r.suiteNumber, summary: r.summary, detail,
    evidenceCount: r.evidenceCount, status,
    reviewedAtIso: r.reviewedAt?.toISOString() ?? null,
    reviewedByName: r.reviewedById ? userNameById.get(r.reviewedById) ?? null : null,
    reviewNote: r.reviewNote,
    firstSeenAtIso: r.firstSeenAt.toISOString(),
    lastSeenAtIso: r.lastSeenAt.toISOString(),
  };
}

// ─── Sweep ─────────────────────────────────────────────────────────────

export async function runFraudDetectionSweep(): Promise<{
  scanned: number;
  raisedCount: number;
  updatedCount: number;
  skippedCount: number;
}> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - TUNING.HIGH_VOLUME_WINDOW_DAYS * 24 * 3600_000);
  const recipientWindowStart = new Date(now.getTime() - TUNING.RECIPIENT_NAME_MISMATCH_LOOKBACK_DAYS * 24 * 3600_000);
  const newAccountSince = new Date(now.getTime() - TUNING.NEW_ACCOUNT_AGE_DAYS * 24 * 3600_000);

  const allSignals: RawFraudSignal[] = [];
  let scanned = 0;

  // ─── Signal 1: high-volume same sender per suite (last 7d) ───
  // Pull all intakes in window + group by (suite, lowercased sender).
  const recentIntakes = await prisma.mailItem.findMany({
    where: { createdAt: { gte: windowStart } },
    select: { id: true, userId: true, from: true, user: { select: { suiteNumber: true } } },
    take: 5000,
  });
  scanned += recentIntakes.length;
  type Bucket = { suite: string; userId: string | null; sender: string; count: number };
  const buckets = new Map<string, Bucket>();
  for (const it of recentIntakes) {
    const suite = it.user?.suiteNumber;
    if (!suite || !it.from) continue;
    const senderKey = it.from.toLowerCase().trim();
    const k = `${suite}|${senderKey}`;
    const existing = buckets.get(k);
    if (existing) { existing.count += 1; }
    else { buckets.set(k, { suite, userId: it.userId, sender: it.from, count: 1 }); }
  }
  for (const b of buckets.values()) {
    const sig = detectHighVolumeSameSender({
      suiteNumber: b.suite, userId: b.userId, senderName: b.sender,
      packageCount: b.count, windowStart, windowEnd: now,
    });
    if (sig) allSignals.push(sig);
  }

  // ─── Signal 2: suspended account receiving packages ───
  const suspended = await prisma.user.findMany({
    where: { mailboxStatus: "Suspended" },
    select: { id: true, name: true, suiteNumber: true, updatedAt: true },
    take: 200,
  });
  for (const u of suspended) {
    const since = new Date(now.getTime() - TUNING.SUSPENDED_ACCOUNT_PACKAGE_LOOKBACK_DAYS * 24 * 3600_000);
    const cutoff = u.updatedAt > since ? u.updatedAt : since;
    const pkgs = await prisma.mailItem.findMany({
      where: { userId: u.id, createdAt: { gte: cutoff } },
      select: { id: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    if (pkgs.length === 0) continue;
    scanned += pkgs.length;
    const sig = detectSuspendedAccountActivity({
      userId: u.id, userName: u.name, suiteNumber: u.suiteNumber,
      suspendedAt: u.updatedAt,
      newPackageCount: pkgs.length, latestPackageAt: pkgs[0]!.createdAt,
    });
    if (sig) allSignals.push(sig);
  }

  // ─── Signal 3: low KYC + high value packages (last 7d) ───
  const recentItems = await prisma.mailItem.findMany({
    where: { createdAt: { gte: windowStart }, declaredValueCents: { not: null, gte: TUNING.HIGH_VALUE_DECLARED_CENTS } },
    select: { id: true, userId: true, declaredValueCents: true, createdAt: true, user: { select: { name: true, suiteNumber: true, kycTrustScore: true } } },
    take: 500,
  });
  scanned += recentItems.length;
  for (const it of recentItems) {
    if (!it.user || it.user.kycTrustScore == null) continue;
    if (!it.declaredValueCents) continue;
    const sig = detectLowKycHighValue({
      mailItemId: it.id, userId: it.userId,
      userName: it.user.name, suiteNumber: it.user.suiteNumber,
      kycTrustScore: it.user.kycTrustScore,
      declaredValueCents: it.declaredValueCents,
      intakeAt: it.createdAt,
    });
    if (sig) allSignals.push(sig);
  }

  // ─── Signal 4: recipient-name mismatch (last 30d) ───
  const recipientItems = await prisma.mailItem.findMany({
    where: { createdAt: { gte: recipientWindowStart }, recipientName: { not: null } },
    select: { recipientName: true, userId: true, user: { select: { name: true, suiteNumber: true } } },
    take: 5000,
  });
  scanned += recipientItems.length;
  type RBucket = { userId: string; name: string | null; suite: string; mismatchSet: Set<string>; examples: string[] };
  const rBuckets = new Map<string, RBucket>();
  for (const it of recipientItems) {
    if (!it.user?.suiteNumber || !it.recipientName) continue;
    const ownerName = (it.user.name ?? "").toLowerCase().trim();
    const recipName = it.recipientName.toLowerCase().trim();
    if (!ownerName || ownerName === recipName) continue;
    // Loose match: skip if owner first-name appears in recipient (handles "Karim K." vs "Karim")
    const ownerFirst = ownerName.split(" ")[0]!;
    if (ownerFirst.length > 2 && recipName.includes(ownerFirst)) continue;
    const k = it.userId;
    let bucket = rBuckets.get(k);
    if (!bucket) { bucket = { userId: it.userId, name: it.user.name, suite: it.user.suiteNumber, mismatchSet: new Set(), examples: [] }; rBuckets.set(k, bucket); }
    bucket.mismatchSet.add(recipName);
    if (bucket.examples.length < 8 && !bucket.examples.includes(it.recipientName)) bucket.examples.push(it.recipientName);
  }
  for (const b of rBuckets.values()) {
    const sig = detectRecipientMismatch({
      userId: b.userId, userName: b.name, suiteNumber: b.suite,
      mismatchedRecipientCount: b.mismatchSet.size,
      exampleNames: b.examples, windowEnd: now,
    });
    if (sig) allSignals.push(sig);
  }

  // ─── Signal 5: cross-suite tracking dupes (last 30d) ───
  const trackingItems = await prisma.mailItem.findMany({
    where: { createdAt: { gte: recipientWindowStart }, trackingNumber: { not: null } },
    select: { id: true, trackingNumber: true, user: { select: { suiteNumber: true } } },
    take: 5000,
  });
  scanned += trackingItems.length;
  type TBucket = { tracking: string; suites: Set<string>; ids: string[] };
  const tBuckets = new Map<string, TBucket>();
  for (const it of trackingItems) {
    if (!it.trackingNumber || !it.user?.suiteNumber) continue;
    const t = it.trackingNumber.trim().toUpperCase();
    let b = tBuckets.get(t);
    if (!b) { b = { tracking: t, suites: new Set(), ids: [] }; tBuckets.set(t, b); }
    b.suites.add(it.user.suiteNumber);
    if (b.ids.length < 10) b.ids.push(it.id);
  }
  for (const b of tBuckets.values()) {
    if (b.suites.size < TUNING.CROSS_SUITE_TRACKING_THRESHOLD) continue;
    const sig = detectCrossSuiteTracking({
      trackingNumber: b.tracking,
      suiteNumbers: Array.from(b.suites).sort(),
      itemIds: b.ids,
    });
    if (sig) allSignals.push(sig);
  }

  // ─── Signal 6: new account package spike (≤7d old, ≥5 packages) ───
  const newUsers = await prisma.user.findMany({
    where: { createdAt: { gte: newAccountSince }, role: { not: "ADMIN" } },
    select: { id: true, name: true, suiteNumber: true, createdAt: true },
    take: 200,
  });
  for (const u of newUsers) {
    const pkgCount = await prisma.mailItem.count({ where: { userId: u.id, createdAt: { gte: u.createdAt } } });
    scanned += 1;
    const sig = detectNewAccountSpike({
      userId: u.id, userName: u.name, suiteNumber: u.suiteNumber,
      accountCreatedAt: u.createdAt, packageCount: pkgCount,
    });
    if (sig) allSignals.push(sig);
  }

  // ─── Persist signals (idempotent upsert) ───
  let raisedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  const newlyHighSignals: RawFraudSignal[] = [];

  for (const sig of allSignals) {
    const existing = await prisma.fraudFlag.findUnique({ where: { signalKey: sig.signalKey } });
    if (existing) {
      // Update lastSeenAt + counts; don't overwrite admin status
      if (existing.status === "Dismissed") { skippedCount += 1; continue; }
      await prisma.fraudFlag.update({
        where: { id: existing.id },
        data: {
          lastSeenAt: now,
          evidenceCount: Math.max(existing.evidenceCount, sig.evidenceCount),
          summary: sig.summary,
          detailJson: JSON.stringify(sig.detail),
          severity: sig.severity,                         // bump severity if it grew
        },
      });
      updatedCount += 1;
    } else {
      await prisma.fraudFlag.create({
        data: {
          signalKey: sig.signalKey, signalType: sig.signalType,
          severity: sig.severity,
          entityType: sig.entityType, entityId: sig.entityId,
          userId: sig.userId, suiteNumber: sig.suiteNumber,
          summary: sig.summary, detailJson: JSON.stringify(sig.detail),
          evidenceCount: sig.evidenceCount,
          firstSeenAt: now, lastSeenAt: now,
        },
      });
      await prisma.auditLog.create({
        data: {
          actorId: "system", actorRole: "ADMIN",
          action: "fraud.flag_raised",
          entityType: "FraudFlag", entityId: sig.signalKey,
          metadata: JSON.stringify({ signalType: sig.signalType, severity: sig.severity, summary: sig.summary }),
        },
      }).catch(() => null);
      raisedCount += 1;
      if (sig.severity === "high" || sig.severity === "critical") newlyHighSignals.push(sig);
    }
  }

  // Fire webhooks for the new high-severity signals only (don't spam on
  // every sweep — only when something genuinely escalates).
  for (const sig of newlyHighSignals.slice(0, 20)) {
    void fireWebhooks("fraud.flag_raised", {
      text: `🚨 [${sig.severity.toUpperCase()}] ${sig.summary}`,
      emoji: "🚨",
      detail: { signalType: sig.signalType, severity: sig.severity, summary: sig.summary, suiteNumber: sig.suiteNumber, userId: sig.userId, evidenceCount: sig.evidenceCount },
    });
  }

  revalidatePath("/admin");
  return { scanned, raisedCount, updatedCount, skippedCount };
}

// ─── Admin review ──────────────────────────────────────────────────────

export async function listFraudFlags(input: { status?: "Open" | "Reviewed" | "Dismissed" | "Escalated"; severity?: "low" | "medium" | "high" | "critical"; limit?: number } = {}): Promise<FraudFlagRow[]> {
  await verifyAdmin();
  const limit = Math.min(200, Math.max(1, input.limit ?? 50));
  const where: { status?: string; severity?: string } = {};
  if (input.status) where.status = input.status;
  if (input.severity) where.severity = input.severity;
  const rows = await prisma.fraudFlag.findMany({
    where, orderBy: [{ severity: "desc" }, { firstSeenAt: "desc" }], take: limit,
  });
  // Batch user-name enrichment
  const userIds = Array.from(new Set([
    ...rows.map((r) => r.userId).filter((v): v is string => !!v),
    ...rows.map((r) => r.reviewedById).filter((v): v is string => !!v),
  ]));
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  return rows.map((r) => toView(r, nameById));
}

export async function reviewFraudFlag(input: { id: string; status: "Reviewed" | "Dismissed" | "Escalated"; note?: string }): Promise<{ row?: FraudFlagRow; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.fraudFlag.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Flag not found." };
  if (input.status !== "Reviewed" && input.status !== "Dismissed" && input.status !== "Escalated") return { error: "Invalid status." };
  await prisma.$transaction([
    prisma.fraudFlag.update({
      where: { id: row.id },
      data: {
        status: input.status,
        reviewedAt: new Date(),
        reviewedById: actor.id,
        reviewNote: input.note?.trim().slice(0, 500) || null,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: input.status === "Dismissed" ? "fraud.flag_dismissed" : input.status === "Escalated" ? "fraud.flag_escalated" : "fraud.flag_reviewed",
        entityType: "FraudFlag", entityId: row.id,
        metadata: JSON.stringify({ signalType: row.signalType, severity: row.severity, note: input.note ?? null }),
      },
    }),
  ]);
  const fresh = await prisma.fraudFlag.findUnique({ where: { id: row.id } });
  if (!fresh) return { error: "Reload failed." };
  const userIds = [fresh.userId, fresh.reviewedById].filter((v): v is string => !!v);
  const users = userIds.length ? await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } }) : [];
  revalidatePath("/admin");
  return { row: toView(fresh, new Map(users.map((u) => [u.id, u.name]))) };
}

export async function getFraudFlagsSummary(): Promise<{
  openTotal: number;
  openCritical: number;
  openHigh: number;
  openMedium: number;
  last7Raised: number;
}> {
  await verifyAdmin();
  const since = new Date(Date.now() - 7 * 24 * 3600_000);
  const [openTotal, openCritical, openHigh, openMedium, last7] = await Promise.all([
    prisma.fraudFlag.count({ where: { status: "Open" } }),
    prisma.fraudFlag.count({ where: { status: "Open", severity: "critical" } }),
    prisma.fraudFlag.count({ where: { status: "Open", severity: "high" } }),
    prisma.fraudFlag.count({ where: { status: "Open", severity: "medium" } }),
    prisma.fraudFlag.count({ where: { firstSeenAt: { gte: since } } }),
  ]);
  return { openTotal, openCritical, openHigh, openMedium, last7Raised: last7 };
}
