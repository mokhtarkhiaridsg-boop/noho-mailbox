"use server";

/**
 * iter-222 — Smart renewal-reminder cadence (Tier 16 #131).
 *
 * Two cron sweeps + admin/member view:
 *   1. recompute sweep — walks members, computes their personal
 *      lead-time from MailboxRenewal history, persists to
 *      User.renewalCadenceJson
 *   2. reminder sweep — for each member with planDueDate matching
 *      `today + cadence.leadTimeDays`, fires the iter-87 reminder
 *      email (uses fallback 7d when profile is null/default)
 *
 * Idempotency: each member gets at most one smart-reminder email per
 * cycle (audit log dedupe via `smart_renewal.reminded` action).
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { sendPlanRenewalReminder } from "@/lib/email";
import { computeRenewalCadence, parseCadence, type RenewalCadenceProfile } from "@/lib/renewal-cadence";

const RECOMPUTE_BATCH = 500;
const REMINDER_BATCH = 200;

export type CadenceRecomputeResult = {
  scanned: number;
  recomputed: number;
  personalProfiles: number;
  ranAtIso: string;
};

export async function runRenewalCadenceRecomputeSweep(): Promise<CadenceRecomputeResult> {
  const result: CadenceRecomputeResult = { scanned: 0, recomputed: 0, personalProfiles: 0, ranAtIso: new Date().toISOString() };
  const members = await prisma.user.findMany({
    where: { role: "USER", planDueDate: { not: null } },
    select: { id: true },
    take: RECOMPUTE_BATCH,
  });
  result.scanned = members.length;

  for (const m of members) {
    const history = await prisma.mailboxRenewal.findMany({
      where: { userId: m.id },
      select: { prevPlanDueDate: true, paidAt: true },
      orderBy: { paidAt: "desc" },
      take: 12,                                  // last 12 renewals = ~3 years on quarterly plans
    }).catch(() => [] as Array<{ prevPlanDueDate: string | null; paidAt: Date }>);

    const profile = computeRenewalCadence(history);
    try {
      await prisma.user.update({
        where: { id: m.id },
        data: { renewalCadenceJson: JSON.stringify(profile) },
      });
      result.recomputed += 1;
      if (profile.source === "personal") result.personalProfiles += 1;
    } catch { /* swallow */ }
  }
  return result;
}

export type SmartReminderResult = {
  scanned: number;
  fired: number;
  skippedAlreadyReminded: number;
  skippedNotInWindow: number;
  errors: string[];
  ranAtIso: string;
};

function ymdAddDays(today: string, days: number): string {
  const d = new Date(`${today}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function runSmartRenewalReminderSweep(): Promise<SmartReminderResult> {
  const result: SmartReminderResult = { scanned: 0, fired: 0, skippedAlreadyReminded: 0, skippedNotInWindow: 0, errors: [], ranAtIso: new Date().toISOString() };
  const todayYmd = new Date().toISOString().slice(0, 10);

  // Pull every member with an upcoming planDueDate within the next 35d.
  // We over-fetch a bit so we can match per-member personalized lead times.
  const cutoff = ymdAddDays(todayYmd, 35);
  const members = await prisma.user.findMany({
    where: {
      role: "USER",
      planDueDate: { not: null, gte: todayYmd, lte: cutoff },
      mailboxStatus: { in: ["Active", "Assigned"] },
    },
    select: { id: true, name: true, email: true, planDueDate: true, plan: true, planTerm: true, renewalCadenceJson: true },
    take: REMINDER_BATCH,
  });
  result.scanned = members.length;

  for (const m of members) {
    if (!m.planDueDate || !m.email) continue;
    const profile = parseCadence(m.renewalCadenceJson) ?? { leadTimeDays: 7, source: "default" as const };
    const targetYmd = ymdAddDays(todayYmd, profile.leadTimeDays);
    if (m.planDueDate !== targetYmd) {
      result.skippedNotInWindow += 1;
      continue;
    }

    // Idempotency: have we already fired smart_renewal.reminded for
    // this member's current cycle (any time after their previous
    // planDueDate / since last reminder)?
    const lastReminder = await prisma.auditLog.findFirst({
      where: { actorId: "system", action: "smart_renewal.reminded", entityType: "User", entityId: m.id },
      orderBy: { createdAt: "desc" },
      select: { metadata: true, createdAt: true },
    }).catch(() => null);
    if (lastReminder) {
      try {
        const meta = JSON.parse(lastReminder.metadata ?? "{}") as { planDueDate?: string };
        if (meta.planDueDate === m.planDueDate) {
          result.skippedAlreadyReminded += 1;
          continue;
        }
      } catch { /* fall through and re-fire */ }
    }

    try {
      // Reuse iter-87 sendPlanRenewalReminder (or graceful fallback).
      const fn = sendPlanRenewalReminder as (email: string, name: string, dueDate: string, leadTimeDays?: number) => Promise<unknown>;
      await fn(m.email, m.name, m.planDueDate, profile.leadTimeDays);
      await prisma.auditLog.create({
        data: {
          actorId: "system", actorRole: "SYSTEM",
          action: "smart_renewal.reminded",
          entityType: "User", entityId: m.id,
          metadata: JSON.stringify({
            planDueDate: m.planDueDate,
            leadTimeDays: profile.leadTimeDays,
            source: profile.source,
            plan: m.plan, planTerm: m.planTerm,
          }),
        },
      }).catch(() => null);
      result.fired += 1;
    } catch (e) {
      result.errors.push(`${m.email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return result;
}

// ─── Admin / member views ──────────────────────────────────────────────

export type CadenceRow = {
  userId: string;
  userName: string;
  email: string;
  planDueDate: string | null;
  profile: RenewalCadenceProfile;
};

export async function listRenewalCadences(input: { source?: "personal" | "default"; limit?: number } = {}): Promise<CadenceRow[]> {
  await verifyAdmin();
  const limit = Math.min(500, Math.max(1, input.limit ?? 100));
  const members = await prisma.user.findMany({
    where: { role: "USER", planDueDate: { not: null } },
    select: { id: true, name: true, email: true, planDueDate: true, renewalCadenceJson: true },
    orderBy: { planDueDate: "asc" },
    take: limit,
  });
  return members.map((m) => ({
    userId: m.id, userName: m.name, email: m.email,
    planDueDate: m.planDueDate,
    profile: parseCadence(m.renewalCadenceJson) ?? {
      leadTimeDays: 7, sampleSize: 0, avgLatencyDays: 0, medianLatencyDays: 0,
      source: "default", recomputedAtIso: new Date().toISOString(),
    },
  })).filter((r) => input.source ? r.profile.source === input.source : true);
}

export async function adminRecomputeAllCadences(): Promise<CadenceRecomputeResult> {
  await verifyAdmin();
  return runRenewalCadenceRecomputeSweep();
}
