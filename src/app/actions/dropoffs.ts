"use server";

// iter-57: External dropoffs — non-customer carrier-pickup access point.
// Someone walks in with a pre-paid label (USPS Click-N-Ship, FedEx Drop &
// Go, UPS My Choice, etc.), drops the package off, the bureau holds it
// for the carrier to sweep that day. Different from MailItem because the
// dropper-offer is NOT one of our customers — they don't get a dashboard,
// they don't get a suite #, they just get a paper receipt.
//
// Lifecycle: Awaiting Carrier → Picked Up by Carrier (terminal). Optional
// "Returned" terminal state for packages we couldn't send.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export async function logExternalDropoff(input: {
  trackingNumber: string;
  carrier: string;
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  destination?: string;
  exteriorImageUrl?: string;
  notes?: string;
}) {
  const actor = await verifyAdmin();

  const tracking = (input.trackingNumber ?? "").trim();
  if (!tracking || tracking.length < 6) {
    return { error: "Tracking number is required (≥6 chars)." };
  }
  const carrier = (input.carrier ?? "").trim() || "Unknown";

  // Atomic create + audit log so dropoffs always have an actor record.
  const created = await prisma.$transaction(async (tx) => {
    const row = await tx.externalDropoff.create({
      data: {
        trackingNumber: tracking,
        carrier,
        senderName: input.senderName?.trim() || null,
        senderPhone: input.senderPhone?.trim() || null,
        receiverName: input.receiverName?.trim() || null,
        destination: input.destination?.trim() || null,
        exteriorImageUrl: input.exteriorImageUrl?.trim() || null,
        notes: input.notes?.trim() || null,
        loggedById: actor.id,
      },
    });
    await tx.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "dropoff.intake",
        entityType: "ExternalDropoff",
        entityId: row.id,
        metadata: JSON.stringify({ carrier, trackingTail: tracking.slice(-6) }),
      },
    });
    return row;
  });

  revalidatePath("/admin");
  return { success: true, dropoffId: created.id };
}

// Recent dropoffs feed for the InboundScanPanel — last 48h, oldest first
// (so admin can see what's still waiting for the carrier sweep).
export async function getRecentDropoffs(limit = 12) {
  await verifyAdmin();
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const rows = await prisma.externalDropoff.findMany({
    where: { createdAt: { gte: cutoff } },
    orderBy: [
      // Awaiting Carrier first (sorted oldest), then terminal states (newest).
      { status: "asc" },
      { createdAt: "asc" },
    ],
    take: limit,
    select: {
      id: true,
      trackingNumber: true,
      carrier: true,
      senderName: true,
      receiverName: true,
      destination: true,
      exteriorImageUrl: true,
      status: true,
      createdAt: true,
      carrierPickedUpAt: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    createdAtIso: r.createdAt.toISOString(),
    carrierPickedUpAtIso: r.carrierPickedUpAt?.toISOString() ?? null,
  }));
}

// iter-62: Bulk-sweep — when the FedEx / USPS / UPS truck arrives, admin
// clicks one button and every awaiting dropoff for that carrier flips to
// "Picked Up by Carrier" in one transaction. Saves the bureau from
// confirming 12 boxes one at a time during a busy sweep.
//
// Carrier match is case-insensitive `contains` so "FedEx" / "fedex" /
// "FedEx Ground" all collapse together. Returns the number swept so the
// UI can show "Marked 12 FedEx packages picked up". Audit log captures
// every individual dropoff plus a parent "sweep" event so we have both
// the granular and rollup history.
export async function bulkMarkDropoffsPickedUpByCarrier(carrier: string) {
  const actor = await verifyAdmin();
  const carrierTrim = (carrier ?? "").trim();
  if (!carrierTrim) return { error: "Carrier is required.", count: 0 };

  // Find all matching active dropoffs first so we can audit-log each one
  // before the bulk update wipes the carrier-vs-id mapping.
  const matching = await prisma.externalDropoff.findMany({
    where: {
      status: "Awaiting Carrier",
      carrier: { contains: carrierTrim },
    },
    select: { id: true, carrier: true, trackingNumber: true },
  });
  if (matching.length === 0) {
    return { error: `No active dropoffs awaiting ${carrierTrim} sweep.`, count: 0 };
  }

  const now = new Date();
  await prisma.$transaction([
    prisma.externalDropoff.updateMany({
      where: { id: { in: matching.map((m) => m.id) } },
      data: { status: "Picked Up by Carrier", carrierPickedUpAt: now },
    }),
    // Per-item audit so individual lookups have an actor record. (Same
    // shape as the single-item action above so downstream tooling doesn't
    // need to special-case sweeps.)
    ...matching.map((m) =>
      prisma.auditLog.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          action: "dropoff.carrier_pickup",
          entityType: "ExternalDropoff",
          entityId: m.id,
          metadata: JSON.stringify({
            carrier: m.carrier,
            trackingTail: m.trackingNumber.slice(-6),
            sweptInBatch: true,
          }),
        },
      })
    ),
    // Rollup audit so reports can group sweeps as one event.
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "dropoff.carrier_sweep",
        entityType: "ExternalDropoff",
        entityId: null, // sweep affects multiple — no single entity
        metadata: JSON.stringify({
          carrier: carrierTrim,
          count: matching.length,
          ids: matching.map((m) => m.id),
        }),
      },
    }),
  ]);

  revalidatePath("/admin");
  return { success: true, count: matching.length };
}

// Mark a dropoff as picked up by the carrier. Terminal — once flagged
// the dropoff is done. Audit-logged so we have a record of when each
// package left the bureau.
export async function markDropoffPickedUpByCarrier(dropoffId: string) {
  const actor = await verifyAdmin();
  const row = await prisma.externalDropoff.findUnique({ where: { id: dropoffId } });
  if (!row) return { error: "Dropoff not found" };
  if (row.status !== "Awaiting Carrier") {
    return { error: `Already in terminal state "${row.status}".` };
  }
  await prisma.$transaction([
    prisma.externalDropoff.update({
      where: { id: dropoffId },
      data: { status: "Picked Up by Carrier", carrierPickedUpAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "dropoff.carrier_pickup",
        entityType: "ExternalDropoff",
        entityId: dropoffId,
        metadata: JSON.stringify({ carrier: row.carrier, trackingTail: row.trackingNumber.slice(-6) }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}
