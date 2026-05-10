"use server";

/**
 * iter-225 — Lockbox auto-assign for month-pass members (Tier 16 #134).
 *
 * Cron sweep walks newly-arrived MailItems for users with a current
 * `lockboxMonthPassUntil`, finds the next free auto-assign-enabled
 * Lockbox, generates a 6-digit pickup PIN, fires SMS via existing
 * iter-84 sendSms, persists a LockboxAssignment row.
 *
 * Status lifecycle:
 *   Open      → PIN issued, member can collect anytime before expiresAt
 *   PickedUp  → member entered the PIN (door opened by their code)
 *   Released  → admin manually marked complete (or auto on expiresAt)
 *   Expired   → expiresAt passed without pickup (admin-handle)
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { randomInt } from "node:crypto";
import { sendSms } from "@/lib/sms";

const PIN_EXPIRY_DAYS = 7;
const SWEEP_BATCH = 100;
const PIN_LENGTH = 6;

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

function gen6DigitPin(): string {
  return randomInt(0, 1_000_000).toString().padStart(PIN_LENGTH, "0");
}

export type LockerAssignmentRow = {
  id: string;
  lockboxLabel: string;
  lockboxLocation: string | null;
  mailItemId: string;
  mailItemFrom: string;
  userId: string;
  userName: string;
  userPhone: string | null;
  pickupPin: string;
  status: "Open" | "PickedUp" | "Released" | "Expired";
  assignedAtIso: string;
  expiresAtIso: string;
  pickedUpAtIso: string | null;
  releasedAtIso: string | null;
  smsStatus: string | null;
  notes: string | null;
};

function asStatus(s: string): LockerAssignmentRow["status"] {
  if (s === "PickedUp" || s === "Released" || s === "Expired") return s;
  return "Open";
}

export type AutoAssignSweepResult = {
  scanned: number;
  assigned: number;
  skippedNoPass: number;
  skippedNoLocker: number;
  errors: string[];
  ranAtIso: string;
};

export async function runLockboxAutoAssignSweep(): Promise<AutoAssignSweepResult> {
  const result: AutoAssignSweepResult = { scanned: 0, assigned: 0, skippedNoPass: 0, skippedNoLocker: 0, errors: [], ranAtIso: new Date().toISOString() };
  const now = new Date();

  // Candidates: recent MailItems with status="Awaiting Pickup" + type="Package"
  // that don't already have a lockbox assignment.
  const items = await prisma.mailItem.findMany({
    where: {
      type: "Package",
      status: "Awaiting Pickup",
      createdAt: { gte: new Date(Date.now() - 7 * 24 * 3600 * 1000) },
    },
    select: { id: true, userId: true, from: true },
    orderBy: { createdAt: "asc" },
    take: SWEEP_BATCH,
  });
  result.scanned = items.length;
  if (items.length === 0) return result;

  // Filter out items that already have an assignment.
  const itemIds = items.map((i) => i.id);
  const existing = await prisma.lockboxAssignment.findMany({
    where: { mailItemId: { in: itemIds } },
    select: { mailItemId: true },
  });
  const skip = new Set(existing.map((e) => e.mailItemId));

  for (const it of items) {
    if (skip.has(it.id)) continue;

    // Member must have an active month-pass.
    const u = await prisma.user.findUnique({
      where: { id: it.userId },
      select: { id: true, name: true, phone: true, suiteNumber: true, lockboxMonthPassUntil: true },
    });
    if (!u || !u.lockboxMonthPassUntil || u.lockboxMonthPassUntil < now) {
      result.skippedNoPass += 1;
      continue;
    }

    // Find the next free auto-assign-enabled lockbox: any Lockbox with
    // isActive + autoAssignEnabled + no current Open assignment.
    const allBoxes = await prisma.lockbox.findMany({
      where: { isActive: true, autoAssignEnabled: true },
      select: { id: true, label: true, location: true },
      orderBy: { label: "asc" },
    });
    if (allBoxes.length === 0) { result.skippedNoLocker += 1; continue; }

    const occupied = await prisma.lockboxAssignment.findMany({
      where: { lockboxId: { in: allBoxes.map((b) => b.id) }, status: "Open" },
      select: { lockboxId: true },
    });
    const occupiedSet = new Set(occupied.map((o) => o.lockboxId));
    const free = allBoxes.find((b) => !occupiedSet.has(b.id));
    if (!free) { result.skippedNoLocker += 1; continue; }

    const pin = gen6DigitPin();
    const expiresAt = new Date(now.getTime() + PIN_EXPIRY_DAYS * 24 * 3600 * 1000);

    let smsStatus: string | null = null;
    if (u.phone) {
      try {
        const r = await sendSms({
          to: u.phone, userId: u.id, kind: "locker_assigned",
          body: `NOHO Mailbox: 📦 Your package is in locker ${free.label}. PIN: ${pin}. Expires ${expiresAt.toLocaleDateString()}. ${BASE_URL}/dashboard?tab=packages`,
        });
        smsStatus = r.status;
      } catch (e) { smsStatus = `failed: ${e instanceof Error ? e.message : String(e)}`; }
    }

    try {
      await prisma.lockboxAssignment.create({
        data: {
          lockboxId: free.id, mailItemId: it.id, userId: u.id,
          pickupPin: pin, status: "Open",
          expiresAt, smsStatus,
        },
      });
      await prisma.auditLog.create({
        data: {
          actorId: "system", actorRole: "SYSTEM",
          action: "locker.auto_assigned",
          entityType: "LockboxAssignment", entityId: it.id,
          metadata: JSON.stringify({ lockbox: free.label, userId: u.id, smsStatus, expiresAtIso: expiresAt.toISOString() }),
        },
      }).catch(() => null);
      result.assigned += 1;
    } catch (e) {
      result.errors.push(`${it.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return result;
}

// Walks Open assignments past expiresAt + flips them to Expired so
// the locker frees up for re-assignment. Idempotent.
export async function runLockboxExpirySweep(): Promise<{ expired: number; ranAtIso: string }> {
  const now = new Date();
  const overdue = await prisma.lockboxAssignment.findMany({
    where: { status: "Open", expiresAt: { lt: now } },
    take: 200,
  });
  let expired = 0;
  for (const a of overdue) {
    try {
      await prisma.lockboxAssignment.update({ where: { id: a.id }, data: { status: "Expired" } });
      await prisma.auditLog.create({
        data: {
          actorId: "system", actorRole: "SYSTEM",
          action: "locker.expired",
          entityType: "LockboxAssignment", entityId: a.id,
          metadata: JSON.stringify({ lockboxId: a.lockboxId, userId: a.userId }),
        },
      }).catch(() => null);
      expired += 1;
    } catch { /* swallow */ }
  }
  return { expired, ranAtIso: now.toISOString() };
}

// ─── Admin views ───────────────────────────────────────────────────────

export async function listLockerAssignments(input: { status?: string; limit?: number } = {}): Promise<LockerAssignmentRow[]> {
  await verifyAdmin();
  const limit = Math.min(200, Math.max(1, input.limit ?? 60));
  const where: { status?: string } = {};
  if (input.status && ["Open", "PickedUp", "Released", "Expired"].includes(input.status)) where.status = input.status;
  const rows = await prisma.lockboxAssignment.findMany({
    where,
    orderBy: [{ status: "asc" }, { assignedAt: "desc" }],
    take: limit,
  });
  if (rows.length === 0) return [];

  // Batch-resolve lockbox + mail item + user details.
  const lockboxIds = Array.from(new Set(rows.map((r) => r.lockboxId)));
  const mailIds = Array.from(new Set(rows.map((r) => r.mailItemId)));
  const userIds = Array.from(new Set(rows.map((r) => r.userId)));
  const [boxes, items, users] = await Promise.all([
    prisma.lockbox.findMany({ where: { id: { in: lockboxIds } }, select: { id: true, label: true, location: true } }),
    prisma.mailItem.findMany({ where: { id: { in: mailIds } }, select: { id: true, from: true } }),
    prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, phone: true } }),
  ]);
  const boxMap = new Map(boxes.map((b) => [b.id, b]));
  const itemMap = new Map(items.map((i) => [i.id, i]));
  const userMap = new Map(users.map((u) => [u.id, u]));

  return rows.map((r) => {
    const b = boxMap.get(r.lockboxId);
    const i = itemMap.get(r.mailItemId);
    const u = userMap.get(r.userId);
    return {
      id: r.id,
      lockboxLabel: b?.label ?? "?",
      lockboxLocation: b?.location ?? null,
      mailItemId: r.mailItemId,
      mailItemFrom: i?.from ?? "(unknown)",
      userId: r.userId,
      userName: u?.name ?? "(unknown)",
      userPhone: u?.phone ?? null,
      pickupPin: r.pickupPin,
      status: asStatus(r.status),
      assignedAtIso: r.assignedAt.toISOString(),
      expiresAtIso: r.expiresAt.toISOString(),
      pickedUpAtIso: r.pickedUpAt?.toISOString() ?? null,
      releasedAtIso: r.releasedAt?.toISOString() ?? null,
      smsStatus: r.smsStatus,
      notes: r.notes,
    };
  });
}

export async function markLockerAssignmentReleased(input: { id: string; notes?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.lockboxAssignment.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Assignment not found." };
  await prisma.$transaction([
    prisma.lockboxAssignment.update({
      where: { id: row.id },
      data: { status: "Released", releasedAt: new Date(), releasedById: actor.id, notes: input.notes?.trim().slice(0, 200) || row.notes },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "locker.released",
        entityType: "LockboxAssignment", entityId: row.id,
        metadata: JSON.stringify({ lockboxId: row.lockboxId, userId: row.userId }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}
