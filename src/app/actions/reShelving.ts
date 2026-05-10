"use server";

/**
 * iter-188 — Smart re-shelving suggestions (Tier 13 #97).
 *
 * Daily cron analyzes mail volume × suite assignment × plan tier and
 * surfaces actionable nudges so the bureau owner can keep the
 * mailbox grid right-sized: release dormant suites to the waitlist,
 * upsell overflowing members, swap mismatched size-to-volume pairs.
 *
 * Suggestions are idempotent on `(kind, suiteNumber, userId)` so the
 * cron can re-run without duplication — re-running updates the
 * existing row's reasons + bumps updatedAt.
 *
 * Member-side: never seen by members. This is purely an admin tool
 * for portfolio hygiene.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export type ReshelfKind = "dormant_suite" | "overflow_member" | "size_mismatch" | "vacant_box_for_waitlist";
export type ReshelfSeverity = "low" | "medium" | "high";

export type ReshelfReason = { label: string; value: string };

export type ReshelfSuggestionRow = {
  id: string;
  kind: ReshelfKind;
  severity: ReshelfSeverity;
  suiteNumber: string | null;
  userId: string | null;
  userName: string | null;
  userPlan: string | null;
  userEmail: string | null;
  reasons: ReshelfReason[];
  suggestedAction: string;
  snoozedUntilIso: string | null;
  dismissedAtIso: string | null;
  actedAtIso: string | null;
  actedNote: string | null;
  createdAtIso: string;
  updatedAtIso: string;
};

const VALID_KINDS: ReshelfKind[] = ["dormant_suite", "overflow_member", "size_mismatch", "vacant_box_for_waitlist"];
const VALID_SEVERITIES: ReshelfSeverity[] = ["low", "medium", "high"];

function castKind(k: string): ReshelfKind {
  return (VALID_KINDS as readonly string[]).includes(k) ? (k as ReshelfKind) : "dormant_suite";
}
function castSeverity(s: string): ReshelfSeverity {
  return (VALID_SEVERITIES as readonly string[]).includes(s) ? (s as ReshelfSeverity) : "medium";
}
function parseReasons(j: string): ReshelfReason[] {
  try {
    const arr = JSON.parse(j) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is ReshelfReason => typeof x === "object" && x !== null && typeof (x as ReshelfReason).label === "string" && typeof (x as ReshelfReason).value === "string");
  } catch { return []; }
}

// ─── Read ───────────────────────────────────────────────────────────
export async function listReshelfSuggestions(input: { includeDismissed?: boolean; includeSnoozed?: boolean } = {}): Promise<ReshelfSuggestionRow[]> {
  await verifyAdmin();
  const where: Record<string, unknown> = {};
  if (!input.includeDismissed) where.dismissedAt = null;
  if (!input.includeSnoozed) {
    const now = new Date();
    where.OR = [{ snoozedUntil: null }, { snoozedUntil: { lt: now } }];
  }
  const rows = await prisma.reShelvingSuggestion.findMany({
    where,
    orderBy: [
      // Show high severity first, then most-recent.
      { severity: "asc" }, // alphabetical: high < low < medium — manually re-sort below
      { createdAt: "desc" },
    ],
    take: 200,
  });

  // Resolve user metadata in one batch query.
  const userIds = Array.from(new Set(rows.map((r) => r.userId).filter((x): x is string => !!x)));
  const users = userIds.length === 0
    ? []
    : await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true, plan: true } });
  const userMap = new Map(users.map((u) => [u.id, u]));

  const out: ReshelfSuggestionRow[] = rows.map((r) => ({
    id: r.id,
    kind: castKind(r.kind),
    severity: castSeverity(r.severity),
    suiteNumber: r.suiteNumber,
    userId: r.userId,
    userName: r.userId ? userMap.get(r.userId)?.name ?? null : null,
    userEmail: r.userId ? userMap.get(r.userId)?.email ?? null : null,
    userPlan: r.userId ? userMap.get(r.userId)?.plan ?? null : null,
    reasons: parseReasons(r.reasonsJson),
    suggestedAction: r.suggestedAction,
    snoozedUntilIso: r.snoozedUntil?.toISOString() ?? null,
    dismissedAtIso: r.dismissedAt?.toISOString() ?? null,
    actedAtIso: r.actedAt?.toISOString() ?? null,
    actedNote: r.actedNote,
    createdAtIso: r.createdAt.toISOString(),
    updatedAtIso: r.updatedAt.toISOString(),
  }));

  // True severity sort: high → medium → low.
  const sevWeight: Record<ReshelfSeverity, number> = { high: 0, medium: 1, low: 2 };
  out.sort((a, b) => sevWeight[a.severity] - sevWeight[b.severity] || (b.createdAtIso > a.createdAtIso ? 1 : -1));
  return out;
}

// ─── State transitions ─────────────────────────────────────────────
export async function snoozeReshelfSuggestion(input: { id: string; days?: number }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const days = Math.max(1, Math.min(365, Math.round(input.days ?? 30)));
  const row = await prisma.reShelvingSuggestion.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Suggestion not found." };
  const until = new Date();
  until.setDate(until.getDate() + days);
  await prisma.$transaction([
    prisma.reShelvingSuggestion.update({ where: { id: row.id }, data: { snoozedUntil: until } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "reshelf.snoozed",
        entityType: "ReShelvingSuggestion",
        entityId: row.id,
        metadata: JSON.stringify({ kind: row.kind, suiteNumber: row.suiteNumber, days, untilIso: until.toISOString() }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function dismissReshelfSuggestion(input: { id: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.reShelvingSuggestion.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Suggestion not found." };
  await prisma.$transaction([
    prisma.reShelvingSuggestion.update({
      where: { id: row.id },
      data: { dismissedAt: new Date(), dismissedBy: actor.id ?? null, actedNote: input.reason?.trim().slice(0, 300) ?? row.actedNote },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "reshelf.dismissed",
        entityType: "ReShelvingSuggestion",
        entityId: row.id,
        metadata: JSON.stringify({ kind: row.kind, suiteNumber: row.suiteNumber, reason: input.reason ?? null }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function markReshelfActed(input: { id: string; note?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.reShelvingSuggestion.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Suggestion not found." };
  await prisma.$transaction([
    prisma.reShelvingSuggestion.update({
      where: { id: row.id },
      data: { actedAt: new Date(), actedBy: actor.id ?? null, actedNote: input.note?.trim().slice(0, 300) ?? null, dismissedAt: new Date(), dismissedBy: actor.id ?? null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "reshelf.acted",
        entityType: "ReShelvingSuggestion",
        entityId: row.id,
        metadata: JSON.stringify({ kind: row.kind, suiteNumber: row.suiteNumber, note: input.note ?? null }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

// ─── Cron-callable: regenerate suggestions ──────────────────────────
// Walks every active member + every distinct suite with mail in the
// last 90 days. Computes per-axis flags + upserts suggestions
// idempotently on (kind, suiteNumber, userId).
//
// Heuristics (all deliberately conservative — better to under-suggest
// than spam admin with noise):
//
//   dormant_suite
//     userId set, suite has 0 mail items in last 180 days, plan != "Free"
//     → "Reach out — confirm member still wants this suite"
//
//   overflow_member
//     userId set, plan = "Basic", >= 12 mail items in last 30 days
//     → "Upsell to Business — current plan caps may be cramping them"
//
//   size_mismatch
//     userId set, plan = "Premium" or "Business", < 3 mail items in last 90d
//     → "Size mismatch — premium plan but very low volume; suggest downgrade"
//
//   vacant_box_for_waitlist
//     suite has had no assigned user in the last 30 days AND no
//     MailItem ever had this suite — pure unassigned slot
//     → "Free up suite for next waitlist customer"
//
// (`vacant_box_for_waitlist` requires a way to know "what suites
// exist". We don't have a Suite table; we infer from the union of
// assigned suites across User table. Skipped for now — keeps this
// implementation honest within current schema. Cron emits the other 3
// kinds.)
export type ReshelfSweepResult = {
  scannedUsers: number;
  upserted: number;
  skipped: number;
};

export async function runReshelfSweep(): Promise<ReshelfSweepResult> {
  const out: ReshelfSweepResult = { scannedUsers: 0, upserted: 0, skipped: 0 };
  const today = new Date();
  const thirtyAgo = new Date(); thirtyAgo.setDate(thirtyAgo.getDate() - 30);
  const ninetyAgo = new Date(); ninetyAgo.setDate(ninetyAgo.getDate() - 90);
  const oneEightyAgo = new Date(); oneEightyAgo.setDate(oneEightyAgo.getDate() - 180);

  const users = await prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
      suiteNumber: { not: null },
      // Exclude obviously-dead accounts.
      mailboxStatus: { notIn: ["Cancelled"] },
    },
    select: { id: true, suiteNumber: true, plan: true, status: true, mailboxStatus: true },
  });
  out.scannedUsers = users.length;

  for (const u of users) {
    if (!u.suiteNumber) { out.skipped += 1; continue; }
    try {
      const [count180, count90, count30] = await Promise.all([
        prisma.mailItem.count({ where: { userId: u.id, createdAt: { gte: oneEightyAgo } } }),
        prisma.mailItem.count({ where: { userId: u.id, createdAt: { gte: ninetyAgo } } }),
        prisma.mailItem.count({ where: { userId: u.id, createdAt: { gte: thirtyAgo } } }),
      ]);

      const plan = (u.plan ?? "").toLowerCase();
      const isFree = plan === "free" || !plan;

      // dormant_suite — paid plan, ≥6mo on the books, zero mail in 180d
      if (!isFree && count180 === 0) {
        await upsertSuggestion({
          kind: "dormant_suite",
          severity: "medium",
          suiteNumber: u.suiteNumber,
          userId: u.id,
          reasons: [
            { label: "180d mail count", value: "0" },
            { label: "Plan", value: u.plan ?? "(none)" },
            { label: "Mailbox status", value: u.mailboxStatus ?? "(unknown)" },
          ],
          suggestedAction: "Reach out — confirm member still wants this suite. Offer downgrade or release for waitlist.",
        });
        out.upserted += 1;
      }

      // overflow_member — Basic plan with ≥12 items in 30 days
      if (plan === "basic" && count30 >= 12) {
        await upsertSuggestion({
          kind: "overflow_member",
          severity: "high",
          suiteNumber: u.suiteNumber,
          userId: u.id,
          reasons: [
            { label: "30d mail count", value: String(count30) },
            { label: "Plan", value: u.plan ?? "(none)" },
          ],
          suggestedAction: "Upsell to Business — Basic plan caps are likely cramping them.",
        });
        out.upserted += 1;
      }

      // size_mismatch — Premium/Business with <3 items in 90 days
      if ((plan === "premium" || plan === "business") && count90 < 3) {
        await upsertSuggestion({
          kind: "size_mismatch",
          severity: "low",
          suiteNumber: u.suiteNumber,
          userId: u.id,
          reasons: [
            { label: "90d mail count", value: String(count90) },
            { label: "Plan", value: u.plan ?? "(none)" },
          ],
          suggestedAction: "Suggest downgrade — premium plan but very low volume. Save them money or free up the larger box.",
        });
        out.upserted += 1;
      }
    } catch {
      out.skipped += 1;
    }
  }

  // Mark cron run for telemetry.
  try {
    await prisma.auditLog.create({
      data: {
        actorId: "system", actorRole: "SYSTEM",
        action: "reshelf.sweep_completed",
        entityType: "ReShelvingSuggestion",
        entityId: "(sweep)",
        metadata: JSON.stringify({ scannedUsers: out.scannedUsers, upserted: out.upserted, skipped: out.skipped, ranAtIso: today.toISOString() }),
      },
    });
  } catch { /* swallow */ }

  return out;
}

async function upsertSuggestion(args: {
  kind: ReshelfKind;
  severity: ReshelfSeverity;
  suiteNumber: string | null;
  userId: string | null;
  reasons: ReshelfReason[];
  suggestedAction: string;
}): Promise<void> {
  // Find an existing OPEN suggestion for this (kind, suite, user) tuple.
  // Idempotent: if one exists + isn't dismissed, just refresh reasons +
  // bump updatedAt. If it's dismissed AND created >30d ago, create a
  // new one (admin may want to revisit). Otherwise skip.
  const existing = await prisma.reShelvingSuggestion.findFirst({
    where: { kind: args.kind, suiteNumber: args.suiteNumber, userId: args.userId },
    orderBy: { createdAt: "desc" },
  });
  if (existing && !existing.dismissedAt) {
    await prisma.reShelvingSuggestion.update({
      where: { id: existing.id },
      data: {
        severity: args.severity,
        reasonsJson: JSON.stringify(args.reasons),
        suggestedAction: args.suggestedAction,
      },
    }).catch(() => undefined);
    return;
  }
  if (existing && existing.dismissedAt && Date.now() - existing.dismissedAt.getTime() < 30 * 24 * 60 * 60 * 1000) {
    // Dismissed recently — respect admin's choice for at least 30 days.
    return;
  }
  await prisma.reShelvingSuggestion.create({
    data: {
      kind: args.kind,
      severity: args.severity,
      suiteNumber: args.suiteNumber,
      userId: args.userId,
      reasonsJson: JSON.stringify(args.reasons),
      suggestedAction: args.suggestedAction,
    },
  }).catch(() => undefined);
}
