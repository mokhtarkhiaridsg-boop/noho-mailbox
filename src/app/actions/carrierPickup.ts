"use server";

/**
 * iter-173 — Carrier-pickup scheduling (Tier 11 #82).
 *
 * Admin schedules USPS/UPS/FedEx/DHL pickups from this panel. The
 * actual carrier-portal API call happens out-of-band (admin clicks
 * through the carrier's portal, gets a confirmation #, types it back
 * here). We track the full lifecycle: draft → scheduled → completed,
 * with a no-show cron that auto-marks `missed` if the pickup window
 * closes + 60min grace passes with no completion stamp.
 *
 * Audit trail on every state change. Admin Slack/Discord webhook
 * fires on missed pickups so staff investigate immediately.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { fireWebhooks } from "@/lib/webhooks";
import type { CarrierPickupCarrier, CarrierPickupStatus } from "@/lib/carrier-pickup-config";

const VALID_CARRIERS: CarrierPickupCarrier[] = ["USPS", "UPS", "FedEx", "DHL", "Other"];
const VALID_STATUSES: CarrierPickupStatus[] = ["draft", "scheduled", "completed", "missed", "cancelled"];
const MISSED_GRACE_MIN = 60; // mark missed 60 min after window close

function isYmd(s: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(s);
}
function isHHMM(s: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}
function ymdToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export type CarrierPickupRow = {
  id: string;
  carrier: CarrierPickupCarrier;
  pickupDate: string;
  pickupWindowOpen: string;
  pickupWindowClose: string;
  packageCount: number;
  totalWeightOz: number | null;
  locationNote: string | null;
  instructions: string | null;
  confirmationNumber: string | null;
  status: CarrierPickupStatus;
  scheduledById: string | null;
  scheduledAtIso: string | null;
  completedAtIso: string | null;
  completedActualCount: number | null;
  cancelledAtIso: string | null;
  cancelReason: string | null;
  missedAtIso: string | null;
  driverName: string | null;
  notes: string | null;
  createdAtIso: string;
};

function toRow(r: { id: string; carrier: string; pickupDate: string; pickupWindowOpen: string; pickupWindowClose: string; packageCount: number; totalWeightOz: number | null; locationNote: string | null; instructions: string | null; confirmationNumber: string | null; status: string; scheduledById: string | null; scheduledAt: Date | null; completedAt: Date | null; completedActualCount: number | null; cancelledAt: Date | null; cancelReason: string | null; missedAt: Date | null; driverName: string | null; notes: string | null; createdAt: Date }): CarrierPickupRow {
  return {
    id: r.id,
    carrier: (VALID_CARRIERS.includes(r.carrier as CarrierPickupCarrier) ? r.carrier : "Other") as CarrierPickupCarrier,
    pickupDate: r.pickupDate,
    pickupWindowOpen: r.pickupWindowOpen,
    pickupWindowClose: r.pickupWindowClose,
    packageCount: r.packageCount,
    totalWeightOz: r.totalWeightOz,
    locationNote: r.locationNote,
    instructions: r.instructions,
    confirmationNumber: r.confirmationNumber,
    status: (VALID_STATUSES.includes(r.status as CarrierPickupStatus) ? r.status : "draft") as CarrierPickupStatus,
    scheduledById: r.scheduledById,
    scheduledAtIso: r.scheduledAt?.toISOString() ?? null,
    completedAtIso: r.completedAt?.toISOString() ?? null,
    completedActualCount: r.completedActualCount,
    cancelledAtIso: r.cancelledAt?.toISOString() ?? null,
    cancelReason: r.cancelReason,
    missedAtIso: r.missedAt?.toISOString() ?? null,
    driverName: r.driverName,
    notes: r.notes,
    createdAtIso: r.createdAt.toISOString(),
  };
}

// ─── Read ────────────────────────────────────────────────────────────
export async function listCarrierPickups(input: {
  status?: CarrierPickupStatus | "all";
  carrier?: CarrierPickupCarrier | "all";
  fromDate?: string;     // YYYY-MM-DD inclusive
  toDate?: string;       // YYYY-MM-DD inclusive
} = {}): Promise<CarrierPickupRow[]> {
  await verifyAdmin();
  const where: Record<string, unknown> = {};
  if (input.status && input.status !== "all") where.status = input.status;
  if (input.carrier && input.carrier !== "all") where.carrier = input.carrier;
  const dateFilter: { gte?: string; lte?: string } = {};
  if (input.fromDate && isYmd(input.fromDate)) dateFilter.gte = input.fromDate;
  if (input.toDate && isYmd(input.toDate)) dateFilter.lte = input.toDate;
  if (Object.keys(dateFilter).length > 0) where.pickupDate = dateFilter;
  const rows = await prisma.carrierPickup.findMany({
    where,
    orderBy: [{ pickupDate: "desc" }, { pickupWindowOpen: "desc" }],
    take: 100,
  });
  return rows.map(toRow);
}

// ─── Create + state transitions ──────────────────────────────────────
export type UpsertCarrierPickupInput = {
  id?: string;
  carrier: CarrierPickupCarrier;
  pickupDate: string;
  pickupWindowOpen: string;
  pickupWindowClose: string;
  packageCount?: number;
  totalWeightOz?: number;
  locationNote?: string;
  instructions?: string;
  confirmationNumber?: string;
  notes?: string;
};

export async function upsertCarrierPickup(input: UpsertCarrierPickupInput): Promise<{ id?: string; error?: string }> {
  const actor = await verifyAdmin();
  if (!VALID_CARRIERS.includes(input.carrier)) return { error: "Invalid carrier." };
  if (!isYmd(input.pickupDate)) return { error: "Invalid pickup date (YYYY-MM-DD)." };
  if (input.pickupDate < ymdToday()) return { error: "Pickup date must be today or future." };
  if (!isHHMM(input.pickupWindowOpen) || !isHHMM(input.pickupWindowClose)) return { error: "Window must be HH:MM 24-hour." };
  if (input.pickupWindowOpen >= input.pickupWindowClose) return { error: "Window close must be after open." };

  const data = {
    carrier: input.carrier,
    pickupDate: input.pickupDate,
    pickupWindowOpen: input.pickupWindowOpen,
    pickupWindowClose: input.pickupWindowClose,
    packageCount: Math.max(0, Math.round(input.packageCount ?? 0)),
    totalWeightOz: input.totalWeightOz != null && Number.isFinite(input.totalWeightOz)
      ? Math.max(0, Math.round(input.totalWeightOz))
      : null,
    locationNote: input.locationNote?.trim().slice(0, 200) || null,
    instructions: input.instructions?.trim().slice(0, 500) || null,
    confirmationNumber: input.confirmationNumber?.trim().slice(0, 80) || null,
    notes: input.notes?.trim().slice(0, 500) || null,
  };

  let id = input.id;
  let isNew = !id;
  if (id) {
    await prisma.carrierPickup.update({ where: { id }, data });
  } else {
    const created = await prisma.carrierPickup.create({
      data: {
        ...data,
        status: data.confirmationNumber ? "scheduled" : "draft",
        scheduledById: data.confirmationNumber ? actor.id ?? null : null,
        scheduledAt: data.confirmationNumber ? new Date() : null,
      },
    });
    id = created.id;
  }
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: actor.role,
      action: isNew ? "carrier_pickup.created" : "carrier_pickup.updated",
      entityType: "CarrierPickup",
      entityId: id,
      metadata: JSON.stringify({ carrier: data.carrier, pickupDate: data.pickupDate, packageCount: data.packageCount, status: data.confirmationNumber ? "scheduled" : "draft" }),
    },
  });
  revalidatePath("/admin");
  return { id };
}

export async function markPickupScheduled(input: { id: string; confirmationNumber: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const conf = input.confirmationNumber.trim().slice(0, 80);
  if (conf.length < 2) return { error: "Confirmation # required." };
  const row = await prisma.carrierPickup.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Pickup not found." };
  if (row.status === "completed" || row.status === "cancelled") return { error: `Pickup already ${row.status}.` };
  await prisma.$transaction([
    prisma.carrierPickup.update({
      where: { id: row.id },
      data: { status: "scheduled", confirmationNumber: conf, scheduledById: actor.id ?? null, scheduledAt: new Date(), missedAt: null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "carrier_pickup.scheduled",
        entityType: "CarrierPickup",
        entityId: row.id,
        metadata: JSON.stringify({ carrier: row.carrier, pickupDate: row.pickupDate, confirmationNumber: conf }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function markPickupCompleted(input: { id: string; actualPackageCount?: number; driverName?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.carrierPickup.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Pickup not found." };
  if (row.status === "completed") return { error: "Already completed." };
  if (row.status === "cancelled") return { error: "Cannot complete a cancelled pickup." };
  const actual = input.actualPackageCount != null && Number.isFinite(input.actualPackageCount)
    ? Math.max(0, Math.round(input.actualPackageCount))
    : row.packageCount;
  const driver = input.driverName?.trim().slice(0, 80) || null;
  await prisma.$transaction([
    prisma.carrierPickup.update({
      where: { id: row.id },
      data: { status: "completed", completedAt: new Date(), completedActualCount: actual, driverName: driver, missedAt: null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "carrier_pickup.completed",
        entityType: "CarrierPickup",
        entityId: row.id,
        metadata: JSON.stringify({ carrier: row.carrier, pickupDate: row.pickupDate, actual, driver }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function cancelCarrierPickup(input: { id: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.carrierPickup.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Pickup not found." };
  if (row.status === "cancelled") return { error: "Already cancelled." };
  if (row.status === "completed") return { error: "Cannot cancel a completed pickup." };
  const reason = input.reason?.trim().slice(0, 300) || null;
  await prisma.$transaction([
    prisma.carrierPickup.update({
      where: { id: row.id },
      data: { status: "cancelled", cancelledAt: new Date(), cancelReason: reason },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "carrier_pickup.cancelled",
        entityType: "CarrierPickup",
        entityId: row.id,
        metadata: JSON.stringify({ carrier: row.carrier, pickupDate: row.pickupDate, reason }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteCarrierPickup(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.carrierPickup.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Pickup not found." };
  await prisma.$transaction([
    prisma.carrierPickup.delete({ where: { id: input.id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "carrier_pickup.deleted",
        entityType: "CarrierPickup",
        entityId: input.id,
        metadata: JSON.stringify({ carrier: row.carrier, pickupDate: row.pickupDate, status: row.status }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

// ─── No-show sweep ───────────────────────────────────────────────────
// Cron-callable. Walks `scheduled` pickups whose window closed + grace
// passed without a completion stamp. Sets status="missed" + admin
// webhook ⚠️ alert per row.
export async function sweepMissedCarrierPickups(): Promise<{ scanned: number; markedMissed: number }> {
  const now = new Date();
  const todayYmd = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const scheduled = await prisma.carrierPickup.findMany({
    where: { status: "scheduled", pickupDate: { lte: todayYmd } },
  });
  let markedMissed = 0;
  for (const p of scheduled) {
    // Compute the window-close timestamp for this pickup. If today's
    // pickup window closed + grace minutes ago, mark missed.
    const [hClose, mClose] = p.pickupWindowClose.split(":").map(Number);
    const windowCloseDate = new Date(`${p.pickupDate}T00:00:00`);
    windowCloseDate.setHours(hClose ?? 0, mClose ?? 0, 0, 0);
    const overdueAt = new Date(windowCloseDate.getTime() + MISSED_GRACE_MIN * 60 * 1000);
    if (now < overdueAt) continue;

    try {
      await prisma.$transaction([
        prisma.carrierPickup.update({
          where: { id: p.id },
          data: { status: "missed", missedAt: now },
        }),
        prisma.auditLog.create({
          data: {
            actorId: "system", actorRole: "SYSTEM",
            action: "carrier_pickup.auto_missed",
            entityType: "CarrierPickup",
            entityId: p.id,
            metadata: JSON.stringify({ carrier: p.carrier, pickupDate: p.pickupDate, windowClose: p.pickupWindowClose, packageCount: p.packageCount }),
          },
        }),
      ]);
      // Re-use the iter-104 admin webhook channel — rich enough for ops Slack.
      void fireWebhooks("door.code_issued", {
        text: `⚠️ *${p.carrier}* missed pickup — ${p.packageCount} package${p.packageCount === 1 ? "" : "s"} still here. Was scheduled ${p.pickupDate} ${p.pickupWindowOpen}-${p.pickupWindowClose}. Reschedule + reach out.`,
        emoji: "⚠️",
        detail: {
          pickupId: p.id,
          carrier: p.carrier,
          pickupDate: p.pickupDate,
          window: `${p.pickupWindowOpen}-${p.pickupWindowClose}`,
          packageCount: p.packageCount,
          confirmationNumber: p.confirmationNumber ?? null,
        },
      });
      markedMissed += 1;
    } catch {
      /* swallow per-row errors */
    }
  }
  return { scanned: scheduled.length, markedMissed };
}

// ─── Counters for the panel header ───────────────────────────────────
export async function getCarrierPickupCounts(): Promise<{ todayScheduled: number; todayPending: number; missedLast7d: number; nextPickup: CarrierPickupRow | null }> {
  await verifyAdmin();
  const today = ymdToday();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const [todayRows, missedRows, nextRow] = await Promise.all([
    prisma.carrierPickup.findMany({ where: { pickupDate: today, status: { in: ["scheduled", "draft"] } } }),
    prisma.carrierPickup.count({ where: { status: "missed", missedAt: { gte: sevenDaysAgo } } }),
    prisma.carrierPickup.findFirst({
      where: { status: { in: ["scheduled", "draft"] }, pickupDate: { gte: today } },
      orderBy: [{ pickupDate: "asc" }, { pickupWindowOpen: "asc" }],
    }),
  ]);
  return {
    todayScheduled: todayRows.filter((r) => r.status === "scheduled").length,
    todayPending: todayRows.filter((r) => r.status === "draft").length,
    missedLast7d: missedRows,
    nextPickup: nextRow ? toRow(nextRow) : null,
  };
}
