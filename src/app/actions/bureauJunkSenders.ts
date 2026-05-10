"use server";

/**
 * iter-221 — Bureau-wide crowdsourced junk-sender directory (Tier 16 #130).
 *
 * Cron sweep promotes senders to the shared blocklist when ≥10
 * unique members have flagged them via iter-202 JunkReport (or
 * iter-149 JunkSender rule). Admin can manually add/remove. Members
 * opt in via `User.shareJunkLearning` (defaults to true).
 *
 * Audit: `bureau_junk.{promoted,added,removed,opted_out}` per action.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

const PROMOTION_THRESHOLD = 10;            // unique members
const PROMOTION_WINDOW_DAYS = 180;          // only count reports in this window
const SWEEP_BATCH = 200;                    // cap per cron tick

export type BureauJunkSenderRow = {
  id: string;
  normalizedSender: string;
  displayName: string;
  status: "Active" | "Removed";
  evidenceCount: number;
  source: "crowdsourced" | "manual";
  notes: string | null;
  addedAtIso: string;
  lastReportedAtIso: string | null;
  removedAtIso: string | null;
  removedReason: string | null;
};

function asStatus(s: string): BureauJunkSenderRow["status"] {
  if (s === "Removed") return "Removed";
  return "Active";
}
function asSource(s: string): BureauJunkSenderRow["source"] {
  if (s === "manual") return "manual";
  return "crowdsourced";
}
function rowToView(r: { id: string; normalizedSender: string; displayName: string; status: string; evidenceCount: number; source: string; notes: string | null; addedAt: Date; lastReportedAt: Date | null; removedAt: Date | null; removedReason: string | null }): BureauJunkSenderRow {
  return {
    id: r.id, normalizedSender: r.normalizedSender, displayName: r.displayName,
    status: asStatus(r.status),
    evidenceCount: r.evidenceCount,
    source: asSource(r.source),
    notes: r.notes,
    addedAtIso: r.addedAt.toISOString(),
    lastReportedAtIso: r.lastReportedAt?.toISOString() ?? null,
    removedAtIso: r.removedAt?.toISOString() ?? null,
    removedReason: r.removedReason,
  };
}

// ─── Cron sweep ────────────────────────────────────────────────────────

export type PromotionSweepResult = {
  scanned: number;
  promoted: number;
  alreadyPromoted: number;
  promotedSenders: Array<{ normalizedSender: string; displayName: string; uniqueReporters: number }>;
  ranAtIso: string;
};

export async function runBureauJunkPromotionSweep(): Promise<PromotionSweepResult> {
  const result: PromotionSweepResult = { scanned: 0, promoted: 0, alreadyPromoted: 0, promotedSenders: [], ranAtIso: new Date().toISOString() };
  const since = new Date(Date.now() - PROMOTION_WINDOW_DAYS * 24 * 3600 * 1000);

  // Pull JunkReports in the window. Group by normalizedSender + count
  // unique userIds in JS (SQLite doesn't easily do COUNT(DISTINCT) per
  // group via Prisma's groupBy across our adapter).
  const reports = await prisma.junkReport.findMany({
    where: { createdAt: { gte: since } },
    select: { normalizedSender: true, senderRaw: true, userId: true },
    take: 5000,
    orderBy: { createdAt: "desc" },
  }).catch(() => [] as Array<{ normalizedSender: string; senderRaw: string; userId: string }>);
  result.scanned = reports.length;

  type Bucket = { displayName: string; users: Set<string> };
  const buckets = new Map<string, Bucket>();
  for (const r of reports) {
    let b = buckets.get(r.normalizedSender);
    if (!b) { b = { displayName: r.senderRaw, users: new Set() }; buckets.set(r.normalizedSender, b); }
    b.users.add(r.userId);
    b.displayName = r.senderRaw;             // most-recent senderRaw (preserves casing)
  }

  for (const [normalized, b] of buckets.entries()) {
    if (b.users.size < PROMOTION_THRESHOLD) continue;
    const existing = await prisma.bureauJunkSender.findUnique({ where: { normalizedSender: normalized } }).catch(() => null);
    if (existing) {
      // Bump the lastReportedAt + evidenceCount snapshot if higher.
      try {
        await prisma.bureauJunkSender.update({
          where: { id: existing.id },
          data: {
            lastReportedAt: new Date(),
            evidenceCount: Math.max(existing.evidenceCount, b.users.size),
          },
        });
        result.alreadyPromoted += 1;
      } catch { /* swallow */ }
      continue;
    }
    try {
      await prisma.bureauJunkSender.create({
        data: {
          normalizedSender: normalized,
          displayName: b.displayName.slice(0, 120),
          status: "Active",
          evidenceCount: b.users.size,
          source: "crowdsourced",
          lastReportedAt: new Date(),
        },
      });
      await prisma.auditLog.create({
        data: {
          actorId: "system", actorRole: "SYSTEM",
          action: "bureau_junk.promoted",
          entityType: "BureauJunkSender", entityId: normalized,
          metadata: JSON.stringify({ uniqueReporters: b.users.size, displayName: b.displayName }),
        },
      }).catch(() => null);
      result.promoted += 1;
      result.promotedSenders.push({ normalizedSender: normalized, displayName: b.displayName, uniqueReporters: b.users.size });
    } catch { /* swallow race condition */ }
    if (result.promoted >= SWEEP_BATCH) break;
  }
  return result;
}

// ─── Admin ─────────────────────────────────────────────────────────────

export async function listBureauJunkSenders(input: { status?: string; limit?: number } = {}): Promise<BureauJunkSenderRow[]> {
  await verifyAdmin();
  const limit = Math.min(500, Math.max(1, input.limit ?? 200));
  const where: { status?: string } = {};
  if (input.status && ["Active", "Removed"].includes(input.status)) where.status = input.status;
  const rows = await prisma.bureauJunkSender.findMany({
    where, orderBy: [{ status: "asc" }, { evidenceCount: "desc" }], take: limit,
  });
  return rows.map(rowToView);
}

export async function adminAddBureauJunkSender(input: { senderRaw: string; notes?: string }): Promise<{ row?: BureauJunkSenderRow; error?: string }> {
  const actor = await verifyAdmin();
  const senderRaw = input.senderRaw.trim().slice(0, 120);
  if (!senderRaw) return { error: "Sender required." };
  const normalized = senderRaw.toLowerCase();
  const existing = await prisma.bureauJunkSender.findUnique({ where: { normalizedSender: normalized } });
  if (existing) {
    if (existing.status === "Removed") {
      const reactivated = await prisma.bureauJunkSender.update({
        where: { id: existing.id }, data: { status: "Active", removedAt: null, removedById: null, removedReason: null, displayName: senderRaw },
      });
      return { row: rowToView(reactivated) };
    }
    return { row: rowToView(existing) };
  }
  const created = await prisma.bureauJunkSender.create({
    data: {
      normalizedSender: normalized, displayName: senderRaw,
      status: "Active", evidenceCount: 0, source: "manual",
      notes: input.notes?.trim().slice(0, 200) || null,
      addedById: actor.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "bureau_junk.added",
      entityType: "BureauJunkSender", entityId: created.id,
      metadata: JSON.stringify({ senderRaw, source: "manual" }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  return { row: rowToView(created) };
}

export async function adminRemoveBureauJunkSender(input: { id: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.bureauJunkSender.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Sender not found." };
  await prisma.$transaction([
    prisma.bureauJunkSender.update({
      where: { id: row.id },
      data: { status: "Removed", removedAt: new Date(), removedById: actor.id, removedReason: input.reason?.trim().slice(0, 200) || "removed_by_admin" },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "bureau_junk.removed",
        entityType: "BureauJunkSender", entityId: row.id,
        metadata: JSON.stringify({ normalized: row.normalizedSender, reason: input.reason ?? null }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

// ─── Member opt-in / out ───────────────────────────────────────────────

export async function getMyJunkSharingPreference(): Promise<{ enabled: boolean }> {
  const session = await verifySession();
  const u = await prisma.user.findUnique({ where: { id: session.id! }, select: { shareJunkLearning: true } });
  return { enabled: u?.shareJunkLearning ?? true };
}

export async function setMyJunkSharingPreference(input: { enabled: boolean }): Promise<{ success: boolean }> {
  const session = await verifySession();
  await prisma.user.update({ where: { id: session.id! }, data: { shareJunkLearning: !!input.enabled } });
  await prisma.auditLog.create({
    data: {
      actorId: session.id!, actorRole: session.role ?? "MEMBER",
      action: input.enabled ? "bureau_junk.opted_in" : "bureau_junk.opted_out",
      entityType: "User", entityId: session.id!,
      metadata: JSON.stringify({ enabled: input.enabled }),
    },
  }).catch(() => null);
  revalidatePath("/dashboard");
  return { success: true };
}

// Helper used by intake (NOT wired automatically — admin/intake panel
// can call this on each new MailItem to check the shared blocklist).
// Returns true if the sender is on the bureau-wide blocklist AND the
// member is opted in to shared learning.
export async function shouldAutoBlockForMember(input: { userId: string; senderRaw: string }): Promise<boolean> {
  const normalized = input.senderRaw.trim().toLowerCase();
  if (!normalized) return false;
  const [user, blockEntry] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.userId }, select: { shareJunkLearning: true } }),
    prisma.bureauJunkSender.findFirst({
      where: { status: "Active", normalizedSender: { contains: normalized.slice(0, 40) } },
      select: { id: true },
    }),
  ]);
  if (!user?.shareJunkLearning) return false;
  return !!blockEntry;
}
