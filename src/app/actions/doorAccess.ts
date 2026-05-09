"use server";

/**
 * iter-147 — Door-access keypad codes (Tier 9 #57).
 *
 * Each customer can have ONE active 4-digit code at a time. Rotation
 * cadence defaults to 90 days; admin can force-rotate from the panel.
 * Every keypad entry attempt is logged so admin has chain-of-custody
 * for after-hours access disputes.
 *
 * Code uniqueness enforced in JS (Prisma can't express partial unique
 * indexes): on issue, we generate a fresh 4-digit code and re-roll
 * until no other ACTIVE row carries the same digits. With 10,000
 * possible codes and ~300 customers that converges in ~1 try.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { fireWebhooks } from "@/lib/webhooks";

const DEFAULT_ROTATION_DAYS = 90;
const MAX_GENERATION_ATTEMPTS = 100;

export type DoorCodeRow = {
  id: string;
  userId: string;
  customerName: string | null;
  customerEmail: string;
  suiteNumber: string | null;
  code: string;
  issuedAtIso: string;
  rotateAtIso: string;
  notes: string | null;
  daysUntilRotation: number;     // negative when overdue
  isStale: boolean;              // true when daysUntilRotation < 0
  entryCount: number;            // total entries against this code
  lastEntryAtIso: string | null;
};

export type DoorEntryRow = {
  id: string;
  codeId: string | null;
  userId: string | null;
  customerName: string | null;
  enteredCode: string;
  result: "granted" | "denied" | "denied_retired" | "denied_unknown";
  attemptedAtIso: string;
};

function generate4Digit(): string {
  return String(Math.floor(Math.random() * 10_000)).padStart(4, "0");
}

async function pickFreshCode(): Promise<string | null> {
  for (let i = 0; i < MAX_GENERATION_ATTEMPTS; i++) {
    const candidate = generate4Digit();
    const collision = await prisma.doorAccessCode.findFirst({
      where: { code: candidate, retiredAt: null },
      select: { id: true },
    });
    if (!collision) return candidate;
  }
  return null; // wildly unlikely
}

export async function listActiveDoorCodes(): Promise<DoorCodeRow[]> {
  await verifyAdmin();
  const codes = await prisma.doorAccessCode.findMany({
    where: { retiredAt: null },
    orderBy: { rotateAt: "asc" },
    include: {
      user: { select: { id: true, name: true, email: true, suiteNumber: true } },
      entries: {
        select: { id: true, attemptedAt: true },
        orderBy: { attemptedAt: "desc" },
        take: 1,
      },
      _count: { select: { entries: true } },
    },
  });
  const now = Date.now();
  return codes.map((c) => {
    const daysUntil = Math.floor((c.rotateAt.getTime() - now) / (24 * 60 * 60 * 1000));
    return {
      id: c.id,
      userId: c.userId,
      customerName: c.user.name,
      customerEmail: c.user.email,
      suiteNumber: c.user.suiteNumber,
      code: c.code,
      issuedAtIso: c.issuedAt.toISOString(),
      rotateAtIso: c.rotateAt.toISOString(),
      notes: c.notes,
      daysUntilRotation: daysUntil,
      isStale: daysUntil < 0,
      entryCount: c._count.entries,
      lastEntryAtIso: c.entries[0]?.attemptedAt.toISOString() ?? null,
    };
  });
}

export async function listRecentDoorEntries(limit = 100): Promise<DoorEntryRow[]> {
  await verifyAdmin();
  const rows = await prisma.doorAccessEntry.findMany({
    orderBy: { attemptedAt: "desc" },
    take: Math.min(500, Math.max(10, limit)),
    include: {
      code: { include: { user: { select: { name: true } } } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    codeId: r.codeId,
    userId: r.userId ?? r.code?.userId ?? null,
    customerName: r.code?.user.name ?? null,
    enteredCode: r.enteredCode,
    result: (["granted", "denied", "denied_retired", "denied_unknown"].includes(r.result)
      ? r.result
      : "denied") as DoorEntryRow["result"],
    attemptedAtIso: r.attemptedAt.toISOString(),
  }));
}

// Issue a new code — replaces any existing active code for this user.
// Triggers a webhook so the bureau Slack channel gets notified (helps
// staff confirm with the customer when they pick up after-hours).
export async function issueDoorCode(input: {
  userId: string;
  rotationDays?: number;
  notes?: string;
}): Promise<{ id?: string; code?: string; error?: string }> {
  const actor = await verifyAdmin();
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, name: true, email: true, suiteNumber: true },
  });
  if (!user) return { error: "Customer not found" };

  const rotation = Math.max(7, Math.min(365, Math.round(input.rotationDays ?? DEFAULT_ROTATION_DAYS)));
  const fresh = await pickFreshCode();
  if (!fresh) return { error: "Could not generate a unique code — try again" };

  const rotateAt = new Date(Date.now() + rotation * 24 * 60 * 60 * 1000);
  const now = new Date();

  const result = await prisma.$transaction(async (tx) => {
    // Retire any existing active code for this user.
    await tx.doorAccessCode.updateMany({
      where: { userId: input.userId, retiredAt: null },
      data: { retiredAt: now, retiredById: actor.id },
    });
    const created = await tx.doorAccessCode.create({
      data: {
        userId: input.userId,
        code: fresh,
        rotateAt,
        notes: input.notes?.trim().slice(0, 200) || null,
        createdById: actor.id,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "door.code_issued",
        entityType: "User",
        entityId: input.userId,
        metadata: JSON.stringify({
          codeId: created.id,
          rotationDays: rotation,
          customerName: user.name,
          suiteNumber: user.suiteNumber,
        }),
      },
    });
    return created;
  });

  // Best-effort ops notification (admin Slack/Discord, not the customer).
  void fireWebhooks("door.code_issued", {
    text: `🔑 New door code issued · ${user.name ?? user.email} · suite #${user.suiteNumber ?? "—"} · rotates in ${rotation}d`,
    emoji: "🔑",
    detail: { customerName: user.name ?? null, suiteNumber: user.suiteNumber, rotationDays: rotation },
  }).catch(() => undefined);

  revalidatePath("/admin");
  return { id: result.id, code: result.code };
}

export async function retireDoorCode(input: { codeId: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const code = await prisma.doorAccessCode.findUnique({
    where: { id: input.codeId },
    include: { user: { select: { name: true, suiteNumber: true } } },
  });
  if (!code) return { error: "Code not found" };
  if (code.retiredAt) return { error: "Code already retired" };

  await prisma.$transaction([
    prisma.doorAccessCode.update({
      where: { id: input.codeId },
      data: { retiredAt: new Date(), retiredById: actor.id },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "door.code_retired",
        entityType: "User",
        entityId: code.userId,
        metadata: JSON.stringify({
          codeId: code.id,
          customerName: code.user.name,
          suiteNumber: code.user.suiteNumber,
          reason: input.reason?.trim() || null,
        }),
      },
    }),
  ]);

  revalidatePath("/admin");
  return { success: true };
}

// Rotate-now = retire current + issue fresh in one atomic operation.
export async function rotateDoorCode(input: { userId: string; rotationDays?: number }): Promise<{ code?: string; error?: string }> {
  return issueDoorCode({ userId: input.userId, rotationDays: input.rotationDays });
}

// Public-facing entry-point (admin invokes after the bureau keypad
// pings the server). Logs the attempt and returns the customer (if
// granted) so the caller can unlock the door + flash the welcome.
export async function checkDoorCode(input: {
  enteredCode: string;
}): Promise<{
  result: "granted" | "denied_retired" | "denied_unknown";
  customer?: { id: string; name: string | null; suiteNumber: string | null };
}> {
  await verifyAdmin();
  const code = input.enteredCode.replace(/\D/g, "").slice(0, 4);
  if (code.length !== 4) {
    await prisma.doorAccessEntry.create({
      data: { enteredCode: code, result: "denied_unknown" },
    });
    return { result: "denied_unknown" };
  }

  const active = await prisma.doorAccessCode.findFirst({
    where: { code, retiredAt: null },
    include: { user: { select: { id: true, name: true, suiteNumber: true } } },
  });
  if (active) {
    await prisma.$transaction([
      prisma.doorAccessEntry.create({
        data: { codeId: active.id, userId: active.userId, enteredCode: code, result: "granted" },
      }),
      prisma.auditLog.create({
        data: {
          actorId: "system",
          actorRole: "ADMIN",
          action: "door.access_granted",
          entityType: "User",
          entityId: active.userId,
          metadata: JSON.stringify({ codeId: active.id, suiteNumber: active.user.suiteNumber }),
        },
      }),
    ]);
    return {
      result: "granted",
      customer: { id: active.user.id, name: active.user.name, suiteNumber: active.user.suiteNumber },
    };
  }

  // Check if it WAS a code (now retired) — distinguishes typo from
  // expired code so admin reports tell the difference.
  const retired = await prisma.doorAccessCode.findFirst({
    where: { code, retiredAt: { not: null } },
    include: { user: { select: { id: true } } },
  });
  if (retired) {
    await prisma.doorAccessEntry.create({
      data: { codeId: retired.id, userId: retired.userId, enteredCode: code, result: "denied_retired" },
    });
    return { result: "denied_retired" };
  }

  await prisma.doorAccessEntry.create({
    data: { enteredCode: code, result: "denied_unknown" },
  });
  return { result: "denied_unknown" };
}
