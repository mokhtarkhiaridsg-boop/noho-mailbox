"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export async function addGuestPickup(input: {
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  expiresAt?: string; // ISO date string
  notes?: string;
}) {
  const session = await verifySession();
  const userId = session.id as string;

  await (prisma as any).guestPickupAuth.create({
    data: {
      id: cuid(),
      userId,
      guestName: input.guestName,
      guestPhone: input.guestPhone ?? null,
      guestEmail: input.guestEmail ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      notes: input.notes ?? null,
      active: true,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function revokeGuestPickup(guestId: string) {
  const session = await verifySession();
  const userId = session.id as string;

  const guest = await (prisma as any).guestPickupAuth.findUnique({ where: { id: guestId } });
  if (!guest || guest.userId !== userId) return { error: "Not found" };

  await (prisma as any).guestPickupAuth.update({
    where: { id: guestId },
    data: { active: false },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getMyGuestPickups() {
  const session = await verifySession();
  const userId = session.id as string;

  const guests = await (prisma as any).guestPickupAuth.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "desc" as const },
  });

  return guests.map((g: any) => ({
    id: g.id,
    guestName: g.guestName,
    guestPhone: g.guestPhone ?? null,
    guestEmail: g.guestEmail ?? null,
    expiresAt: g.expiresAt?.toISOString() ?? null,
    usedAt: g.usedAt?.toISOString() ?? null,
    notes: g.notes ?? null,
    createdAt: g.createdAt.toISOString(),
  }));
}
