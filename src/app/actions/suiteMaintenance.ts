"use server";

/**
 * iter-143 — Suite cleaning / maintenance log (Tier 8 #55).
 *
 * Track when each suite was cleaned, inspected, or had work done.
 * Surfaces "overdue" suites so admin can stay on top of the bureau's
 * physical condition without spreadsheets.
 *
 * Cadence thresholds (defaults, hard-coded for now — could move to
 * SiteConfig later):
 *   cleaning  : due-soon at 21d since last, overdue at 30d
 *   inspection: due-soon at 60d since last, overdue at 90d
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export type MaintKind = "cleaned" | "inspected" | "repaired" | "lock_changed" | "other";

export const MAINT_KINDS: Array<{ key: MaintKind; label: string; emoji: string }> = [
  { key: "cleaned",      label: "Cleaned",       emoji: "🧹" },
  { key: "inspected",    label: "Inspected",     emoji: "🔍" },
  { key: "repaired",     label: "Repaired",      emoji: "🔧" },
  { key: "lock_changed", label: "Lock changed",  emoji: "🔑" },
  { key: "other",        label: "Other",         emoji: "📝" },
];

const VALID_KINDS = new Set<MaintKind>(MAINT_KINDS.map((k) => k.key));

const CLEAN_DUE_DAYS = 21;
const CLEAN_OVERDUE_DAYS = 30;
const INSPECT_DUE_DAYS = 60;
const INSPECT_OVERDUE_DAYS = 90;

export type MaintLogRow = {
  id: string;
  suiteNumber: string;
  kind: MaintKind;
  notes: string | null;
  performedByName: string | null;
  performedAtIso: string;
};

export type SuiteMaintStatus = "good" | "due_soon" | "overdue" | "never";

export type SuiteMaintOverviewRow = {
  suiteNumber: string;
  customerName: string | null;
  customerEmail: string | null;
  mailboxStatus: string;
  lastCleanedIso: string | null;
  lastInspectedIso: string | null;
  daysSinceCleaned: number | null;
  daysSinceInspected: number | null;
  cleaningStatus: SuiteMaintStatus;
  inspectionStatus: SuiteMaintStatus;
  totalLogs: number;
};

function statusForCleaning(days: number | null): SuiteMaintStatus {
  if (days == null) return "never";
  if (days >= CLEAN_OVERDUE_DAYS) return "overdue";
  if (days >= CLEAN_DUE_DAYS) return "due_soon";
  return "good";
}
function statusForInspection(days: number | null): SuiteMaintStatus {
  if (days == null) return "never";
  if (days >= INSPECT_OVERDUE_DAYS) return "overdue";
  if (days >= INSPECT_DUE_DAYS) return "due_soon";
  return "good";
}

export async function logSuiteMaintenance(input: {
  suiteNumber: string;
  kind: MaintKind;
  notes?: string;
  performedAtIso?: string;
}): Promise<{ id?: string; error?: string }> {
  const actor = await verifyAdmin();
  const suiteNumber = input.suiteNumber.trim();
  if (!suiteNumber) return { error: "Suite number required" };
  if (!VALID_KINDS.has(input.kind)) return { error: "Invalid maintenance kind" };
  const notes = input.notes?.trim().slice(0, 500) || null;
  const performedAt = input.performedAtIso ? new Date(input.performedAtIso) : new Date();
  if (Number.isNaN(performedAt.getTime())) return { error: "Invalid performedAt" };

  const row = await prisma.suiteMaintenanceLog.create({
    data: {
      suiteNumber,
      kind: input.kind,
      notes,
      performedById: actor.id,
      performedAt,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: `suite.maintenance_${input.kind}`,
      entityType: "Suite",
      entityId: suiteNumber,
      metadata: JSON.stringify({ kind: input.kind, notes, performedAtIso: performedAt.toISOString() }),
    },
  });
  revalidatePath("/admin");
  return { id: row.id };
}

export async function deleteSuiteMaintenance(id: string): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.suiteMaintenanceLog.findUnique({ where: { id } });
  if (!row) return { error: "Log entry not found" };
  await prisma.$transaction([
    prisma.suiteMaintenanceLog.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "suite.maintenance_deleted",
        entityType: "Suite",
        entityId: row.suiteNumber,
        metadata: JSON.stringify({ logId: id, kind: row.kind, performedAtIso: row.performedAt.toISOString() }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function listSuiteMaintenanceForSuite(input: { suiteNumber: string; limit?: number }): Promise<MaintLogRow[]> {
  await verifyAdmin();
  const limit = Math.min(200, Math.max(5, input.limit ?? 50));
  const rows = await prisma.suiteMaintenanceLog.findMany({
    where: { suiteNumber: input.suiteNumber },
    orderBy: { performedAt: "desc" },
    take: limit,
  });
  // Look up admin names in a single batch.
  const actorIds = Array.from(new Set(rows.map((r) => r.performedById).filter((x): x is string => Boolean(x))));
  const actors = actorIds.length === 0
    ? []
    : await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
  const actorMap = new Map(actors.map((a) => [a.id, a.name]));
  return rows.map((r) => ({
    id: r.id,
    suiteNumber: r.suiteNumber,
    kind: VALID_KINDS.has(r.kind as MaintKind) ? (r.kind as MaintKind) : "other",
    notes: r.notes,
    performedByName: r.performedById ? (actorMap.get(r.performedById) ?? null) : null,
    performedAtIso: r.performedAt.toISOString(),
  }));
}

// Overview report — every assigned suite (or seen in the maintenance log)
// joined with last-cleaned + last-inspected timestamps + status. Powers
// the admin maintenance panel + the "overdue" chip on the suite occupancy
// heatmap.
export async function getSuiteMaintenanceOverview(): Promise<SuiteMaintOverviewRow[]> {
  await verifyAdmin();

  // Pull every suite-numbered customer in one query.
  const customers = await prisma.user.findMany({
    where: { suiteNumber: { not: null } },
    select: { suiteNumber: true, name: true, email: true, mailboxStatus: true },
  });
  // Pull every maintenance log row at once. We compute "last per kind"
  // in JS so we don't run 4N queries (N=200+ suites).
  const allLogs = await prisma.suiteMaintenanceLog.findMany({
    select: { suiteNumber: true, kind: true, performedAt: true },
    orderBy: { performedAt: "desc" },
  });
  const lastCleanedBySuite = new Map<string, Date>();
  const lastInspectedBySuite = new Map<string, Date>();
  const totalsBySuite = new Map<string, number>();
  for (const log of allLogs) {
    totalsBySuite.set(log.suiteNumber, (totalsBySuite.get(log.suiteNumber) ?? 0) + 1);
    if (log.kind === "cleaned" && !lastCleanedBySuite.has(log.suiteNumber)) {
      lastCleanedBySuite.set(log.suiteNumber, log.performedAt);
    }
    if (log.kind === "inspected" && !lastInspectedBySuite.has(log.suiteNumber)) {
      lastInspectedBySuite.set(log.suiteNumber, log.performedAt);
    }
  }

  // Include suites that have logs but no current customer assignment
  // (admin may have moved a customer out and we still want the history).
  const allSuiteNumbers = new Set<string>();
  for (const c of customers) {
    if (c.suiteNumber) allSuiteNumbers.add(c.suiteNumber);
  }
  for (const sn of totalsBySuite.keys()) allSuiteNumbers.add(sn);

  const now = Date.now();
  const rows: SuiteMaintOverviewRow[] = [];
  for (const suiteNumber of allSuiteNumbers) {
    const cust = customers.find((c) => c.suiteNumber === suiteNumber);
    const lastCleaned = lastCleanedBySuite.get(suiteNumber) ?? null;
    const lastInspected = lastInspectedBySuite.get(suiteNumber) ?? null;
    const daysSinceCleaned = lastCleaned
      ? Math.floor((now - lastCleaned.getTime()) / (24 * 60 * 60 * 1000))
      : null;
    const daysSinceInspected = lastInspected
      ? Math.floor((now - lastInspected.getTime()) / (24 * 60 * 60 * 1000))
      : null;
    rows.push({
      suiteNumber,
      customerName: cust?.name ?? null,
      customerEmail: cust?.email ?? null,
      mailboxStatus: cust?.mailboxStatus ?? "Vacant",
      lastCleanedIso: lastCleaned ? lastCleaned.toISOString() : null,
      lastInspectedIso: lastInspected ? lastInspected.toISOString() : null,
      daysSinceCleaned,
      daysSinceInspected,
      cleaningStatus: statusForCleaning(daysSinceCleaned),
      inspectionStatus: statusForInspection(daysSinceInspected),
      totalLogs: totalsBySuite.get(suiteNumber) ?? 0,
    });
  }

  // Sort: overdue cleaning first, then due_soon, then never, then good.
  // Within a tier, oldest-cleaned first so the most pressing are at top.
  const tierRank: Record<SuiteMaintStatus, number> = { overdue: 0, due_soon: 1, never: 2, good: 3 };
  rows.sort((a, b) => {
    const t = tierRank[a.cleaningStatus] - tierRank[b.cleaningStatus];
    if (t !== 0) return t;
    return (b.daysSinceCleaned ?? -1) - (a.daysSinceCleaned ?? -1);
  });
  return rows;
}
