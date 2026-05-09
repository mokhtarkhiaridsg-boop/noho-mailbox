"use server";

/**
 * iter-145 — Equipment / scanner inventory (Tier 9 #56).
 *
 * Tracks every physical device in the bureau. Status auto-derives from
 * the most recent service-log entry: anything serviced in the last 30d
 * is "fresh", anything past 180d since last inspection is "stale".
 * Lifecycle: active → needs_service → retired/lost.
 *
 * All writes audit-logged so we can answer "who took the Honeywell
 * scanner home in November" months later.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
// iter-11.5 — Types + constants moved to /lib so the "use server"
// constraint (only async exports) doesn't blow up the admin shell.
import {
  EQUIP_CATEGORIES,
  EQUIP_SERVICE_KINDS,
  type EquipCategory,
  type EquipServiceKind,
  type EquipStatus,
} from "@/lib/equipment-config";

const VALID_CATEGORIES = new Set<EquipCategory>(EQUIP_CATEGORIES.map((c) => c.key));
const VALID_SERVICE_KINDS = new Set<EquipServiceKind>(EQUIP_SERVICE_KINDS.map((c) => c.key));
const VALID_STATUSES = new Set<EquipStatus>(["active", "needs_service", "retired", "lost"]);

const FRESH_DAYS = 30;
const STALE_DAYS = 180;

export type EquipmentRow = {
  id: string;
  name: string;
  category: EquipCategory;
  serial: string;
  vendor: string | null;
  model: string | null;
  purchasedAtIso: string | null;
  purchasePriceCents: number | null;
  warrantyEndsAtIso: string | null;
  location: string;
  assignedToUserId: string | null;
  assignedToName: string | null;
  status: EquipStatus;
  notes: string | null;
  lastServiceIso: string | null;
  daysSinceLastService: number | null;
  freshness: "fresh" | "ok" | "stale" | "never";
  serviceCount: number;
  createdAtIso: string;
};

export type EquipmentServiceLogRow = {
  id: string;
  kind: EquipServiceKind;
  notes: string | null;
  costCents: number | null;
  performedByName: string | null;
  performedAtIso: string;
};

function freshnessFromDays(days: number | null): EquipmentRow["freshness"] {
  if (days == null) return "never";
  if (days <= FRESH_DAYS) return "fresh";
  if (days >= STALE_DAYS) return "stale";
  return "ok";
}

export async function listEquipment(): Promise<EquipmentRow[]> {
  await verifyAdmin();
  const rows = await prisma.equipment.findMany({
    orderBy: [{ status: "asc" }, { name: "asc" }],
    include: {
      serviceLog: {
        select: { performedAt: true },
        orderBy: { performedAt: "desc" },
        take: 1,
      },
      _count: { select: { serviceLog: true } },
    },
  });

  // Resolve assignedTo names in a single batch.
  const assigneeIds = Array.from(new Set(rows.map((r) => r.assignedToUserId).filter((x): x is string => Boolean(x))));
  const assignees = assigneeIds.length === 0
    ? []
    : await prisma.user.findMany({ where: { id: { in: assigneeIds } }, select: { id: true, name: true } });
  const assigneeMap = new Map(assignees.map((a) => [a.id, a.name]));

  const now = Date.now();
  return rows.map((r) => {
    const lastService = r.serviceLog[0]?.performedAt ?? null;
    const daysSince = lastService
      ? Math.floor((now - lastService.getTime()) / (24 * 60 * 60 * 1000))
      : null;
    return {
      id: r.id,
      name: r.name,
      category: (VALID_CATEGORIES.has(r.category as EquipCategory) ? r.category : "other") as EquipCategory,
      serial: r.serial,
      vendor: r.vendor,
      model: r.model,
      purchasedAtIso: r.purchasedAt ? r.purchasedAt.toISOString() : null,
      purchasePriceCents: r.purchasePriceCents,
      warrantyEndsAtIso: r.warrantyEndsAt ? r.warrantyEndsAt.toISOString() : null,
      location: r.location,
      assignedToUserId: r.assignedToUserId,
      assignedToName: r.assignedToUserId ? (assigneeMap.get(r.assignedToUserId) ?? null) : null,
      status: (VALID_STATUSES.has(r.status as EquipStatus) ? r.status : "active") as EquipStatus,
      notes: r.notes,
      lastServiceIso: lastService ? lastService.toISOString() : null,
      daysSinceLastService: daysSince,
      freshness: freshnessFromDays(daysSince),
      serviceCount: r._count.serviceLog,
      createdAtIso: r.createdAt.toISOString(),
    };
  });
}

export async function listEquipmentServiceLog(input: { equipmentId: string }): Promise<EquipmentServiceLogRow[]> {
  await verifyAdmin();
  const rows = await prisma.equipmentServiceLog.findMany({
    where: { equipmentId: input.equipmentId },
    orderBy: { performedAt: "desc" },
    take: 100,
  });
  const actorIds = Array.from(new Set(rows.map((r) => r.performedById).filter((x): x is string => Boolean(x))));
  const actors = actorIds.length === 0
    ? []
    : await prisma.user.findMany({ where: { id: { in: actorIds } }, select: { id: true, name: true } });
  const actorMap = new Map(actors.map((a) => [a.id, a.name]));
  return rows.map((r) => ({
    id: r.id,
    kind: (VALID_SERVICE_KINDS.has(r.kind as EquipServiceKind) ? r.kind : "other") as EquipServiceKind,
    notes: r.notes,
    costCents: r.costCents,
    performedByName: r.performedById ? (actorMap.get(r.performedById) ?? null) : null,
    performedAtIso: r.performedAt.toISOString(),
  }));
}

export type UpsertEquipmentInput = {
  id?: string;
  name: string;
  category: EquipCategory;
  serial: string;
  vendor?: string;
  model?: string;
  purchasedAtIso?: string;
  purchasePriceCents?: number;
  warrantyEndsAtIso?: string;
  location?: string;
  assignedToUserId?: string | null;
  status?: EquipStatus;
  notes?: string;
};

export async function upsertEquipment(input: UpsertEquipmentInput): Promise<{ id?: string; error?: string }> {
  const actor = await verifyAdmin();

  const name = input.name.trim();
  const serial = input.serial.trim();
  if (!name) return { error: "Name required" };
  if (!serial) return { error: "Serial required" };
  if (!VALID_CATEGORIES.has(input.category)) return { error: "Invalid category" };
  const status = input.status ?? "active";
  if (!VALID_STATUSES.has(status)) return { error: "Invalid status" };

  // Uniqueness check on serial when creating OR when serial changes.
  if (input.id) {
    const existing = await prisma.equipment.findUnique({ where: { id: input.id }, select: { serial: true } });
    if (!existing) return { error: "Equipment not found" };
    if (existing.serial !== serial) {
      const dup = await prisma.equipment.findUnique({ where: { serial } });
      if (dup) return { error: `Serial "${serial}" is already used by another piece of equipment` };
    }
  } else {
    const dup = await prisma.equipment.findUnique({ where: { serial } });
    if (dup) return { error: `Serial "${serial}" is already used by another piece of equipment` };
  }

  const data = {
    name,
    category: input.category,
    serial,
    vendor: input.vendor?.trim() || null,
    model: input.model?.trim() || null,
    purchasedAt: input.purchasedAtIso ? new Date(input.purchasedAtIso) : null,
    purchasePriceCents: Number.isFinite(input.purchasePriceCents) ? Math.round(input.purchasePriceCents!) : null,
    warrantyEndsAt: input.warrantyEndsAtIso ? new Date(input.warrantyEndsAtIso) : null,
    location: input.location?.trim() || "Bureau",
    assignedToUserId: input.assignedToUserId === null ? null : (input.assignedToUserId?.trim() || null),
    status,
    notes: input.notes?.trim() || null,
  };

  let id = input.id;
  if (id) {
    await prisma.equipment.update({ where: { id }, data });
  } else {
    const created = await prisma.equipment.create({ data });
    id = created.id;
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: input.id ? "equipment.updated" : "equipment.created",
      entityType: "Equipment",
      entityId: id,
      metadata: JSON.stringify({ name, serial, category: input.category, status, location: data.location }),
    },
  });
  revalidatePath("/admin");
  return { id };
}

export async function deleteEquipment(id: string): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.equipment.findUnique({ where: { id } });
  if (!row) return { error: "Equipment not found" };
  await prisma.$transaction([
    prisma.equipment.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "equipment.deleted",
        entityType: "Equipment",
        entityId: id,
        metadata: JSON.stringify({ name: row.name, serial: row.serial }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function logEquipmentService(input: {
  equipmentId: string;
  kind: EquipServiceKind;
  notes?: string;
  costCents?: number;
  performedAtIso?: string;
}): Promise<{ id?: string; error?: string }> {
  const actor = await verifyAdmin();
  if (!VALID_SERVICE_KINDS.has(input.kind)) return { error: "Invalid service kind" };
  const eq = await prisma.equipment.findUnique({ where: { id: input.equipmentId } });
  if (!eq) return { error: "Equipment not found" };

  const performedAt = input.performedAtIso ? new Date(input.performedAtIso) : new Date();
  if (Number.isNaN(performedAt.getTime())) return { error: "Invalid performedAt" };
  const cost = Number.isFinite(input.costCents)
    ? Math.max(0, Math.round(input.costCents!))
    : null;

  const log = await prisma.equipmentServiceLog.create({
    data: {
      equipmentId: input.equipmentId,
      kind: input.kind,
      notes: input.notes?.trim().slice(0, 500) || null,
      costCents: cost,
      performedById: actor.id,
      performedAt,
    },
  });

  // Auto-clear "needs_service" status when admin logs a fresh repair.
  if (eq.status === "needs_service" && (input.kind === "service" || input.kind === "repair" || input.kind === "calibration")) {
    await prisma.equipment.update({ where: { id: input.equipmentId }, data: { status: "active" } });
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: `equipment.service_${input.kind}`,
      entityType: "Equipment",
      entityId: input.equipmentId,
      metadata: JSON.stringify({ kind: input.kind, costCents: cost, performedAtIso: performedAt.toISOString() }),
    },
  });

  revalidatePath("/admin");
  return { id: log.id };
}

export async function deleteEquipmentService(id: string): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.equipmentServiceLog.findUnique({ where: { id } });
  if (!row) return { error: "Service log entry not found" };
  await prisma.$transaction([
    prisma.equipmentServiceLog.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "equipment.service_deleted",
        entityType: "Equipment",
        entityId: row.equipmentId,
        metadata: JSON.stringify({ logId: id, kind: row.kind, performedAtIso: row.performedAt.toISOString() }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}
