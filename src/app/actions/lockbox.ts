"use server";

/**
 * iter-171 — Lockbox keypad live status board (Tier 11 #80).
 *
 * The admin tablet board polls `getLockboxBoard()` every 5s and
 * renders a live grid of every lockbox: who opened it, when, how long
 * it's been open. Open events older than `expectedCloseBy` light up
 * red and fire an admin webhook so a forgotten-open box doesn't sit
 * unattended overnight.
 *
 * Bridges:
 *  - Admin manually marks open / close from the board (until we add
 *    real keypad hardware).
 *  - When iter-147 keypad entry resolves to a Lockbox (via label
 *    lookup), `recordKeypadOpen({lockboxLabel, doorEntryId, userId})`
 *    flips state without admin involvement.
 *  - `closeOverdueLockboxesSweep()` runs on a cron — auto-closes
 *    boxes still showing "open" past their `expectedCloseBy` and
 *    fires an "auto-closed by timeout" event so admin can investigate.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { fireWebhooks } from "@/lib/webhooks";
import { fireMemberWebhooks } from "@/lib/memberWebhooks";
import {
  DEFAULT_OPEN_WINDOW_SEC,
  type LockboxState,
  type LockboxOpenReason,
} from "@/lib/lockbox-config";

// ─── Types ────────────────────────────────────────────────────────────
export type LockboxBoardTile = {
  id: string;
  label: string;
  location: string | null;
  isActive: boolean;
  state: LockboxState;
  openedAtIso: string | null;
  openedByUserName: string | null;
  openedByUserId: string | null;
  openedReason: string | null;
  expectedCloseByIso: string | null;
  lastClosedAtIso: string | null;
  notes: string | null;
  // Derived:
  openSeconds: number | null;     // null when closed
  isOverdue: boolean;             // open > expectedCloseBy
};

export type LockboxBoard = {
  tiles: LockboxBoardTile[];
  openCount: number;
  overdueCount: number;
  recentEvents: LockboxEventRow[];
};

export type LockboxEventRow = {
  id: string;
  lockboxId: string;
  lockboxLabel: string;
  kind: "opened" | "closed" | "fault" | "manual_override";
  userName: string | null;
  reason: string | null;
  durationSec: number | null;
  recordedAtIso: string;
};

// ─── Board read ──────────────────────────────────────────────────────
export async function getLockboxBoard(): Promise<LockboxBoard> {
  await verifyAdmin();
  const [boxes, events] = await Promise.all([
    prisma.lockbox.findMany({
      orderBy: [{ isActive: "desc" }, { label: "asc" }],
    }),
    prisma.lockboxEvent.findMany({
      orderBy: { recordedAt: "desc" },
      take: 20,
      include: { lockbox: { select: { label: true } } },
    }),
  ]);
  // Resolve openedBy user names in one batch query.
  const userIds = Array.from(new Set([
    ...boxes.map((b) => b.openedByUserId).filter((x): x is string => !!x),
    ...events.map((e) => e.userId).filter((x): x is string => !!x),
  ]));
  const users = userIds.length === 0
    ? []
    : await prisma.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true } });
  const userMap = new Map(users.map((u) => [u.id, u.name]));

  const now = Date.now();
  let openCount = 0;
  let overdueCount = 0;
  const tiles: LockboxBoardTile[] = boxes.map((b) => {
    const openSeconds = b.state === "open" && b.openedAt
      ? Math.floor((now - b.openedAt.getTime()) / 1000)
      : null;
    const isOverdue = !!(b.state === "open" && b.expectedCloseBy && b.expectedCloseBy.getTime() < now);
    if (b.state === "open") openCount += 1;
    if (isOverdue) overdueCount += 1;
    return {
      id: b.id,
      label: b.label,
      location: b.location,
      isActive: b.isActive,
      state: b.state as LockboxState,
      openedAtIso: b.openedAt?.toISOString() ?? null,
      openedByUserName: b.openedByUserId ? (userMap.get(b.openedByUserId) ?? null) : null,
      openedByUserId: b.openedByUserId,
      openedReason: b.openedReason,
      expectedCloseByIso: b.expectedCloseBy?.toISOString() ?? null,
      lastClosedAtIso: b.lastClosedAt?.toISOString() ?? null,
      notes: b.notes,
      openSeconds,
      isOverdue,
    };
  });

  const recentEvents: LockboxEventRow[] = events.map((e) => ({
    id: e.id,
    lockboxId: e.lockboxId,
    lockboxLabel: e.lockbox.label,
    kind: e.kind as "opened" | "closed" | "fault" | "manual_override",
    userName: e.userId ? (userMap.get(e.userId) ?? null) : null,
    reason: e.reason,
    durationSec: e.durationSec,
    recordedAtIso: e.recordedAt.toISOString(),
  }));

  return { tiles, openCount, overdueCount, recentEvents };
}

export async function listLockboxes(): Promise<LockboxBoardTile[]> {
  const board = await getLockboxBoard();
  return board.tiles;
}

// ─── CRUD ────────────────────────────────────────────────────────────
export async function upsertLockbox(input: {
  id?: string;
  label: string;
  location?: string;
  serial?: string;
  isActive?: boolean;
  notes?: string;
}): Promise<{ id?: string; error?: string }> {
  const actor = await verifyAdmin();
  const label = input.label.trim().slice(0, 40);
  if (label.length < 1) return { error: "Label required" };
  const data = {
    label,
    location: input.location?.trim() || null,
    serial: input.serial?.trim() || null,
    isActive: input.isActive ?? true,
    notes: input.notes?.trim() || null,
  };
  let id = input.id;
  try {
    if (id) {
      await prisma.lockbox.update({ where: { id }, data });
    } else {
      const created = await prisma.lockbox.create({ data });
      id = created.id;
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes("Unique")) {
      return { error: `Label "${label}" is already taken.` };
    }
    throw e;
  }
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: actor.role,
      action: input.id ? "lockbox.updated" : "lockbox.created",
      entityType: "Lockbox",
      entityId: id,
      metadata: JSON.stringify({ label, location: data.location, isActive: data.isActive }),
    },
  });
  revalidatePath("/admin");
  return { id };
}

export async function deleteLockbox(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.lockbox.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Lockbox not found" };
  await prisma.$transaction([
    prisma.lockbox.delete({ where: { id: input.id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "lockbox.deleted",
        entityType: "Lockbox",
        entityId: input.id,
        metadata: JSON.stringify({ label: row.label }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

// ─── State transitions ──────────────────────────────────────────────
export async function markLockboxOpened(input: {
  id: string;
  userId?: string | null;          // member, when known
  doorEntryId?: string | null;     // DoorAccessEntry.id, when keypad-driven
  reason?: LockboxOpenReason | string;
  expectedOpenSeconds?: number;    // override window for this open (e.g. 30min for service)
}): Promise<{ success?: boolean; error?: string; eventId?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.lockbox.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Lockbox not found" };
  if (row.state === "open") return { error: "Already open" };

  const windowSec = input.expectedOpenSeconds ?? DEFAULT_OPEN_WINDOW_SEC;
  const now = new Date();
  const expectedCloseBy = new Date(now.getTime() + windowSec * 1000);
  const reason = input.reason ?? "admin_manual";

  let eventId: string | undefined;
  await prisma.$transaction(async (tx) => {
    await tx.lockbox.update({
      where: { id: row.id },
      data: {
        state: "open",
        openedAt: now,
        openedByUserId: input.userId ?? null,
        openedByEntryId: input.doorEntryId ?? null,
        openedReason: reason,
        expectedCloseBy,
      },
    });
    const ev = await tx.lockboxEvent.create({
      data: {
        lockboxId: row.id,
        kind: "opened",
        userId: input.userId ?? null,
        doorEntryId: input.doorEntryId ?? null,
        reason,
        expectedCloseBy,
      },
    });
    eventId = ev.id;
    await tx.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "lockbox.opened",
        entityType: "Lockbox",
        entityId: row.id,
        metadata: JSON.stringify({ label: row.label, userId: input.userId ?? null, reason, windowSec }),
      },
    });
  });

  // Fire-and-forget admin webhook — board is real-time, but a chat
  // ping is useful when staff aren't watching the tablet.
  void fireWebhooks("door.code_issued", {
    text: `🔓 Lockbox *${row.label}* opened${input.userId ? ` for member` : ""} — closes by ${expectedCloseBy.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`,
    emoji: "🔓",
    detail: {
      lockboxId: row.id,
      label: row.label,
      userId: input.userId ?? null,
      reason: String(reason),
      expectedCloseBy: expectedCloseBy.toISOString(),
    },
  });
  if (input.userId) {
    void fireMemberWebhooks(input.userId, "package.picked_up", {
      text: `🔓 Lockbox ${row.label} unlocked for you — please close it before you leave.`,
      url: "https://nohomailbox.org/dashboard?tab=packages",
      detail: { lockboxId: row.id, label: row.label, reason: String(reason) },
    });
  }

  revalidatePath("/admin");
  return { success: true, eventId };
}

export async function markLockboxClosed(input: { id: string; reason?: string }): Promise<{ success?: boolean; durationSec?: number; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.lockbox.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Lockbox not found" };
  if (row.state === "closed") return { error: "Already closed" };

  const now = new Date();
  const durationSec = row.openedAt ? Math.floor((now.getTime() - row.openedAt.getTime()) / 1000) : null;
  await prisma.$transaction([
    prisma.lockbox.update({
      where: { id: row.id },
      data: {
        state: "closed",
        lastClosedAt: now,
        openedAt: null,
        openedByUserId: null,
        openedByEntryId: null,
        openedReason: null,
        expectedCloseBy: null,
      },
    }),
    prisma.lockboxEvent.create({
      data: {
        lockboxId: row.id,
        kind: "closed",
        userId: row.openedByUserId,
        reason: input.reason?.trim().slice(0, 200) || null,
        durationSec,
        expectedCloseBy: row.expectedCloseBy,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "lockbox.closed",
        entityType: "Lockbox",
        entityId: row.id,
        metadata: JSON.stringify({ label: row.label, durationSec, reason: input.reason ?? null }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true, durationSec: durationSec ?? undefined };
}

// Manual fault / clear-fault toggle (keypad jammed, sensor broken, etc).
export async function setLockboxFault(input: { id: string; isFault: boolean; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.lockbox.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Lockbox not found" };
  await prisma.$transaction([
    prisma.lockbox.update({
      where: { id: row.id },
      data: { state: input.isFault ? "fault" : "closed", lastClosedAt: input.isFault ? row.lastClosedAt : new Date() },
    }),
    prisma.lockboxEvent.create({
      data: { lockboxId: row.id, kind: input.isFault ? "fault" : "closed", reason: input.reason?.trim() || null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: input.isFault ? "lockbox.fault_marked" : "lockbox.fault_cleared",
        entityType: "Lockbox",
        entityId: row.id,
        metadata: JSON.stringify({ label: row.label, reason: input.reason ?? null }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

// Cron-callable: auto-close boxes still "open" past their
// `expectedCloseBy`. Returns counts so the cron route can emit a JSON
// summary. Each auto-close fires an admin webhook so staff see what
// happened overnight.
export async function closeOverdueLockboxesSweep(): Promise<{ scanned: number; autoClosed: number }> {
  const now = new Date();
  const overdue = await prisma.lockbox.findMany({
    where: { state: "open", expectedCloseBy: { lt: now } },
    select: { id: true, label: true, openedAt: true, openedByUserId: true, expectedCloseBy: true },
  });
  let autoClosed = 0;
  for (const b of overdue) {
    const durationSec = b.openedAt ? Math.floor((now.getTime() - b.openedAt.getTime()) / 1000) : null;
    try {
      await prisma.$transaction([
        prisma.lockbox.update({
          where: { id: b.id },
          data: {
            state: "closed",
            lastClosedAt: now,
            openedAt: null,
            openedByUserId: null,
            openedByEntryId: null,
            openedReason: null,
            expectedCloseBy: null,
          },
        }),
        prisma.lockboxEvent.create({
          data: {
            lockboxId: b.id,
            kind: "manual_override",
            userId: b.openedByUserId,
            reason: "auto_closed_overdue",
            durationSec,
            expectedCloseBy: b.expectedCloseBy,
          },
        }),
        prisma.auditLog.create({
          data: {
            actorId: "system", actorRole: "SYSTEM",
            action: "lockbox.auto_closed_overdue",
            entityType: "Lockbox",
            entityId: b.id,
            metadata: JSON.stringify({ label: b.label, durationSec, expectedCloseBy: b.expectedCloseBy?.toISOString() ?? null }),
          },
        }),
      ]);
      void fireWebhooks("door.code_issued", {
        text: `⚠️ Lockbox *${b.label}* was open past its window — auto-closed after ${durationSec ?? "?"}s. Investigate.`,
        emoji: "⚠️",
        detail: { lockboxId: b.id, label: b.label, durationSec, autoClosed: true },
      });
      autoClosed += 1;
    } catch {
      /* swallow per-row errors */
    }
  }
  return { scanned: overdue.length, autoClosed };
}
