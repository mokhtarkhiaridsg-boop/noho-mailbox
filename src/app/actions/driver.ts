"use server";

// iter-97 — Driver app server actions.
//
// Driver is an admin user assigned to deliveries via DeliveryOrder.assignedDriverId.
// They visit /driver, see their route, and update each stop's status as they go.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

const DRIVER_STATUSES = ["Pending", "Picked Up", "In Transit"] as const;

export async function getMyDriverRoute(): Promise<Array<{
  id: string;
  customerName: string;
  destination: string;
  zip: string;
  zone: string;
  itemType: string;
  instructions: string | null;
  status: string;
  tier: string;
  etaWindow: string | null;
  phone: string;
  date: string;
  pickedUpAtIso: string | null;
  inTransitAtIso: string | null;
  deliveredAtIso: string | null;
  podPhotoUrl: string | null;
  recipientName: string | null;
}>> {
  const actor = await verifyAdmin();
  // Today's local-date string (YYYY-MM-DD) — DeliveryOrder.date is a free-form
  // string column, so we just match anything queued for today OR active.
  const today = new Date().toISOString().slice(0, 10);
  const rows = await prisma.deliveryOrder.findMany({
    where: {
      assignedDriverId: actor.id,
      OR: [
        { status: { in: ["Pending", "Picked Up", "In Transit"] } },
        // Show same-day delivered ones at the bottom of the route so
        // driver has them in the rear-view.
        { AND: [{ status: "Delivered" }, { date: { contains: today } }] },
      ],
    },
    orderBy: [{ status: "asc" }, { date: "asc" }],
    take: 50,
    select: {
      id: true,
      customerName: true,
      destination: true,
      zip: true,
      zone: true,
      itemType: true,
      instructions: true,
      status: true,
      tier: true,
      etaWindow: true,
      phone: true,
      date: true,
      pickedUpAt: true,
      inTransitAt: true,
      deliveredAt: true,
      podPhotoUrl: true,
      recipientName: true,
    },
  });
  return rows.map((r) => ({
    ...r,
    pickedUpAtIso: r.pickedUpAt?.toISOString() ?? null,
    inTransitAtIso: r.inTransitAt?.toISOString() ?? null,
    deliveredAtIso: r.deliveredAt?.toISOString() ?? null,
  }));
}

// One step forward in the lifecycle. Picked Up → In Transit → Delivered.
// Pending is the start; calling once moves to Picked Up.
export async function advanceDeliveryStatus(deliveryId: string): Promise<{ error?: string; newStatus?: string }> {
  const actor = await verifyAdmin();
  const order = await prisma.deliveryOrder.findUnique({
    where: { id: deliveryId },
    select: { id: true, status: true, assignedDriverId: true },
  });
  if (!order) return { error: "Delivery not found" };
  if (order.assignedDriverId !== actor.id) return { error: "Not your delivery" };

  const next = (() => {
    if (order.status === "Pending") return "Picked Up";
    if (order.status === "Picked Up") return "In Transit";
    return null;
  })();
  if (!next) return { error: `Can't advance from ${order.status}` };

  await prisma.$transaction([
    prisma.deliveryOrder.update({
      where: { id: deliveryId },
      data: {
        status: next,
        ...(next === "Picked Up" ? { pickedUpAt: new Date() } : {}),
        ...(next === "In Transit" ? { inTransitAt: new Date() } : {}),
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: `delivery.status.${next.toLowerCase().replace(/\s+/g, "_")}`,
        entityType: "DeliveryOrder",
        entityId: deliveryId,
        metadata: JSON.stringify({ from: order.status, to: next, byDriver: true }),
      },
    }),
  ]);

  revalidatePath("/driver");
  revalidatePath("/admin");
  return { newStatus: next };
}

// Final confirm-delivered with POD: photo URL (already uploaded to
// Vercel Blob via /api/upload) + recipient name. Atomic flip + audit.
export async function confirmDelivery(input: {
  deliveryId: string;
  podPhotoUrl: string;
  recipientName?: string;
}): Promise<{ error?: string; success?: boolean }> {
  const actor = await verifyAdmin();
  if (!input.podPhotoUrl) return { error: "POD photo is required" };
  const order = await prisma.deliveryOrder.findUnique({
    where: { id: input.deliveryId },
    select: { id: true, status: true, assignedDriverId: true },
  });
  if (!order) return { error: "Delivery not found" };
  if (order.assignedDriverId !== actor.id) return { error: "Not your delivery" };
  if (order.status === "Delivered") return { error: "Already delivered" };

  await prisma.$transaction([
    prisma.deliveryOrder.update({
      where: { id: input.deliveryId },
      data: {
        status: "Delivered",
        deliveredAt: new Date(),
        podPhotoUrl: input.podPhotoUrl,
        recipientName: input.recipientName?.trim() || null,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "delivery.status.delivered",
        entityType: "DeliveryOrder",
        entityId: input.deliveryId,
        metadata: JSON.stringify({
          from: order.status,
          to: "Delivered",
          recipientName: input.recipientName ?? null,
          podPhotoUrlTail: input.podPhotoUrl.slice(-24),
          byDriver: true,
        }),
      },
    }),
  ]);

  revalidatePath("/driver");
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

// Read for /driver/deliver/[id] page.
export async function getDeliveryForDriver(deliveryId: string) {
  const actor = await verifyAdmin();
  const order = await prisma.deliveryOrder.findUnique({
    where: { id: deliveryId },
    select: {
      id: true,
      customerName: true,
      destination: true,
      zip: true,
      zone: true,
      tier: true,
      itemType: true,
      instructions: true,
      phone: true,
      email: true,
      status: true,
      assignedDriverId: true,
      podPhotoUrl: true,
      recipientName: true,
      etaWindow: true,
    },
  });
  if (!order) return { error: "Delivery not found" as const, order: null };
  if (order.assignedDriverId !== actor.id) return { error: "Not your delivery" as const, order: null };
  return { order };
}
