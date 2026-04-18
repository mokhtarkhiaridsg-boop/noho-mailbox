"use server";

/**
 * NOHO Mailbox — Recurring Delivery Schedule
 * Members can set up automatic weekly/biweekly/monthly delivery of their mail.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function nextRunDate(frequency: string): string {
  const d = new Date();
  if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else if (frequency === "biweekly") d.setDate(d.getDate() + 14);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

export async function setRecurringDelivery(input: {
  frequency: "weekly" | "biweekly" | "monthly";
  destination: string;
  tier: "standard" | "express";
  notes?: string;
}) {
  const session = await verifySession();
  const userId = session.id as string;

  const existing = await (prisma as any).recurringDelivery.findFirst({
    where: { userId, active: true },
  });

  if (existing) {
    await (prisma as any).recurringDelivery.update({
      where: { id: existing.id },
      data: {
        frequency: input.frequency,
        destination: input.destination,
        tier: input.tier,
        notes: input.notes ?? null,
        nextRunDate: nextRunDate(input.frequency),
      },
    });
  } else {
    await (prisma as any).recurringDelivery.create({
      data: {
        id: cuid(),
        userId,
        frequency: input.frequency,
        destination: input.destination,
        tier: input.tier,
        notes: input.notes ?? null,
        nextRunDate: nextRunDate(input.frequency),
        active: true,
      },
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function cancelRecurringDelivery() {
  const session = await verifySession();
  const userId = session.id as string;

  await (prisma as any).recurringDelivery.updateMany({
    where: { userId, active: true },
    data: { active: false },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getMyRecurringDelivery() {
  const session = await verifySession();
  const userId = session.id as string;

  const rd = await (prisma as any).recurringDelivery.findFirst({
    where: { userId, active: true },
  });

  if (!rd) return null;
  return {
    id: rd.id,
    frequency: rd.frequency,
    destination: rd.destination,
    tier: rd.tier,
    notes: rd.notes ?? null,
    nextRunDate: rd.nextRunDate,
    lastRunDate: rd.lastRunDate ?? null,
  };
}

// Admin: run all due recurring deliveries
export async function runRecurringDeliveries() {
  await verifyAdmin();

  const today = new Date().toISOString().split("T")[0];
  const due = await (prisma as any).recurringDelivery.findMany({
    where: { active: true, nextRunDate: { lte: today } },
    include: { user: { select: { id: true, name: true } } },
  });

  let processed = 0;
  for (const rd of due) {
    // Get user info for required fields
    const user = await prisma.user.findUnique({
      where: { id: rd.userId },
      select: { name: true, phone: true, email: true },
    });

    // Create a delivery order
    await prisma.deliveryOrder.create({
      data: {
        userId: rd.userId,
        customerName: user?.name ?? "Member",
        phone: user?.phone ?? "",
        email: user?.email ?? "",
        destination: rd.destination,
        zip: "",
        zone: "1",
        tier: rd.tier === "express" ? "Rush" : "Standard",
        status: "Pending",
        price: rd.tier === "express" ? 15 : 8,
        date: today,
        itemType: "Mail Bundle",
        courier: "TBD",
      },
    });

    // Advance next run
    const next = nextRunDate(rd.frequency);
    await (prisma as any).recurringDelivery.update({
      where: { id: rd.id },
      data: { lastRunDate: today, nextRunDate: next },
    });

    processed++;
  }

  return { success: true, processed };
}
