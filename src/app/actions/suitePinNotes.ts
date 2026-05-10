"use server";

/**
 * iter-182 — Per-mailbox sticky pin notes (Tier 12 #91).
 *
 * Distinct from iter-120 PinnedNotes (per-customer). This is keyed on
 * suite # so the moment a counter staffer scans a package addressed
 * to suite 042, they see "Box 042: hold rent check for K. on Tues."
 *
 * Active = dismissedAt is null AND (expiresAt is null OR expiresAt >
 * now). The intake-surface helper `getActivePinsForSuite(s)` runs on
 * every relevant admin scan/pickup so staff never miss a note.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

const VALID_COLORS = ["amber", "red", "blue", "green"] as const;
type PinColor = typeof VALID_COLORS[number];

export type SuitePinNoteRow = {
  id: string;
  suiteNumber: string;
  body: string;
  color: PinColor;
  expiresAtIso: string | null;
  dismissedAtIso: string | null;
  dismissedByName: string | null;
  createdByName: string | null;
  createdAtIso: string;
  updatedAtIso: string;
};

function castColor(c: string): PinColor {
  return (VALID_COLORS as readonly string[]).includes(c) ? (c as PinColor) : "amber";
}

async function resolveActorNames(ids: Array<string | null>): Promise<Map<string, string>> {
  const distinct = Array.from(new Set(ids.filter((x): x is string => !!x)));
  if (distinct.length === 0) return new Map();
  const users = await prisma.user.findMany({ where: { id: { in: distinct } }, select: { id: true, name: true } });
  return new Map(users.map((u) => [u.id, u.name]));
}

function toRow(r: { id: string; suiteNumber: string; body: string; color: string; expiresAt: Date | null; dismissedAt: Date | null; dismissedById: string | null; createdById: string | null; createdAt: Date; updatedAt: Date }, names: Map<string, string>): SuitePinNoteRow {
  return {
    id: r.id,
    suiteNumber: r.suiteNumber,
    body: r.body,
    color: castColor(r.color),
    expiresAtIso: r.expiresAt?.toISOString() ?? null,
    dismissedAtIso: r.dismissedAt?.toISOString() ?? null,
    dismissedByName: r.dismissedById ? (names.get(r.dismissedById) ?? null) : null,
    createdByName: r.createdById ? (names.get(r.createdById) ?? null) : null,
    createdAtIso: r.createdAt.toISOString(),
    updatedAtIso: r.updatedAt.toISOString(),
  };
}

// ─── Hot-path: surface active pins for a suite during intake/pickup ──
// Cheap, no admin gate (called server-side from other admin actions).
// Active = not dismissed AND not expired.
export async function getActivePinsForSuite(suiteNumber: string): Promise<SuitePinNoteRow[]> {
  if (!suiteNumber) return [];
  const now = new Date();
  const rows = await prisma.suitePinNote.findMany({
    where: {
      suiteNumber,
      dismissedAt: null,
      OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
    },
    orderBy: { createdAt: "desc" },
  });
  const names = await resolveActorNames(rows.flatMap((r) => [r.createdById, r.dismissedById]));
  return rows.map((r) => toRow(r, names));
}

// ─── Admin: list (filterable + includes dismissed/expired by default) ──
export async function listSuitePinNotes(input: { suiteNumber?: string; activeOnly?: boolean } = {}): Promise<SuitePinNoteRow[]> {
  await verifyAdmin();
  const where: Record<string, unknown> = {};
  if (input.suiteNumber?.trim()) where.suiteNumber = input.suiteNumber.trim();
  if (input.activeOnly) {
    where.dismissedAt = null;
    where.OR = [{ expiresAt: null }, { expiresAt: { gt: new Date() } }];
  }
  const rows = await prisma.suitePinNote.findMany({
    where,
    orderBy: [{ dismissedAt: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  const names = await resolveActorNames(rows.flatMap((r) => [r.createdById, r.dismissedById]));
  return rows.map((r) => toRow(r, names));
}

// ─── Admin: upsert ──────────────────────────────────────────────────
export type UpsertSuitePinInput = {
  id?: string;
  suiteNumber: string;
  body: string;
  color?: PinColor;
  expiresAt?: string | null;       // ISO date string or YYYY-MM-DD
};

export async function upsertSuitePinNote(input: UpsertSuitePinInput): Promise<{ id?: string; error?: string }> {
  const actor = await verifyAdmin();
  const suiteNumber = input.suiteNumber.trim().slice(0, 12);
  if (suiteNumber.length < 1) return { error: "Suite # required." };
  const body = input.body.trim().slice(0, 500);
  if (body.length < 2) return { error: "Body required (≥2 chars)." };
  const color = input.color && (VALID_COLORS as readonly string[]).includes(input.color) ? input.color : "amber";

  let expiresAt: Date | null = null;
  if (input.expiresAt && input.expiresAt.trim()) {
    const raw = input.expiresAt.trim();
    const d = /^\d{4}-\d{2}-\d{2}$/.test(raw) ? new Date(`${raw}T23:59:59`) : new Date(raw);
    if (Number.isNaN(d.getTime())) return { error: "Invalid expiresAt date." };
    expiresAt = d;
  }

  let id = input.id;
  if (id) {
    await prisma.suitePinNote.update({
      where: { id },
      data: { suiteNumber, body, color, expiresAt, dismissedAt: null, dismissedById: null },
    });
  } else {
    const created = await prisma.suitePinNote.create({
      data: { suiteNumber, body, color, expiresAt, createdById: actor.id ?? null },
    });
    id = created.id;
  }
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: actor.role,
      action: input.id ? "suite_pin.updated" : "suite_pin.created",
      entityType: "SuitePinNote",
      entityId: id,
      metadata: JSON.stringify({ suiteNumber, color, expiresAt: expiresAt?.toISOString() ?? null, bodyLength: body.length }),
    },
  });
  revalidatePath("/admin");
  return { id };
}

export async function dismissSuitePinNote(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.suitePinNote.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Pin not found." };
  if (row.dismissedAt) return { error: "Already dismissed." };
  await prisma.$transaction([
    prisma.suitePinNote.update({
      where: { id: row.id },
      data: { dismissedAt: new Date(), dismissedById: actor.id ?? null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "suite_pin.dismissed",
        entityType: "SuitePinNote",
        entityId: row.id,
        metadata: JSON.stringify({ suiteNumber: row.suiteNumber }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteSuitePinNote(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.suitePinNote.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Pin not found." };
  await prisma.$transaction([
    prisma.suitePinNote.delete({ where: { id: row.id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "suite_pin.deleted",
        entityType: "SuitePinNote",
        entityId: row.id,
        metadata: JSON.stringify({ suiteNumber: row.suiteNumber, bodyLength: row.body.length }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

// ─── Header counters ────────────────────────────────────────────────
export async function getSuitePinCounts(): Promise<{ activePins: number; activeSuites: number; expiringSoon: number }> {
  await verifyAdmin();
  const now = new Date();
  const sevenDays = new Date();
  sevenDays.setDate(sevenDays.getDate() + 7);
  const active = await prisma.suitePinNote.findMany({
    where: { dismissedAt: null, OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
    select: { suiteNumber: true, expiresAt: true },
  });
  return {
    activePins: active.length,
    activeSuites: new Set(active.map((a) => a.suiteNumber)).size,
    expiringSoon: active.filter((a) => a.expiresAt && a.expiresAt < sevenDays).length,
  };
}
