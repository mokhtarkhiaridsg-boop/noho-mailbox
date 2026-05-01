"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function cuid() {
  return crypto.randomUUID();
}

function nextDate(frequency: string): string {
  const d = new Date();
  if (frequency === "weekly") d.setDate(d.getDate() + 7);
  else if (frequency === "biweekly") d.setDate(d.getDate() + 14);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString().split("T")[0];
}

export async function setScheduledForwarding(input: {
  frequency: "weekly" | "biweekly" | "monthly";
  addressId?: string;
}) {
  const session = await verifySession();
  const userId = session.id as string;

  // Upsert — one per user
  const existing = await (prisma as any).scheduledForwarding.findFirst({
    where: { userId, active: true },
  });

  if (existing) {
    await (prisma as any).scheduledForwarding.update({
      where: { id: existing.id },
      data: {
        frequency: input.frequency,
        addressId: input.addressId ?? null,
        nextRunDate: nextDate(input.frequency),
      },
    });
  } else {
    await (prisma as any).scheduledForwarding.create({
      data: {
        id: cuid(),
        userId,
        frequency: input.frequency,
        addressId: input.addressId ?? null,
        nextRunDate: nextDate(input.frequency),
        active: true,
      },
    });
  }

  revalidatePath("/dashboard");
  return { success: true };
}

export async function cancelScheduledForwarding() {
  const session = await verifySession();
  const userId = session.id as string;

  await (prisma as any).scheduledForwarding.updateMany({
    where: { userId, active: true },
    data: { active: false },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getMyScheduledForwarding() {
  const session = await verifySession();
  const userId = session.id as string;

  const sf = await (prisma as any).scheduledForwarding.findFirst({
    where: { userId, active: true },
  });

  if (!sf) return null;
  return {
    id: sf.id,
    frequency: sf.frequency,
    nextRunDate: sf.nextRunDate,
    lastRunDate: sf.lastRunDate ?? null,
    addressId: sf.addressId ?? null,
  };
}

// Admin: run scheduled forwardings that are due today
export async function runScheduledForwardings() {
  await verifyAdmin();

  const today = new Date().toISOString().split("T")[0];

  const due = await (prisma as any).scheduledForwarding.findMany({
    where: { active: true, nextRunDate: { lte: today } },
    include: {
      user: { select: { id: true, name: true, email: true } },
    },
  });

  let processed = 0;
  for (const sf of due) {
    // Get all unforwarded mail for this user
    const pendingMail = await prisma.mailItem.findMany({
      where: {
        userId: sf.userId,
        status: { in: ["Received", "Scanned", "Awaiting Pickup"] },
      },
      select: { id: true },
    });

    if (pendingMail.length > 0) {
      // Mark all as forwarded
      await prisma.mailItem.updateMany({
        where: { id: { in: pendingMail.map((m: any) => m.id) } },
        data: { status: "Forwarded" },
      });
    }

    // Update next run date
    const next = nextDate(sf.frequency);
    await (prisma as any).scheduledForwarding.update({
      where: { id: sf.id },
      data: { lastRunDate: today, nextRunDate: next },
    });

    processed++;
  }

  return { success: true, processed };
}
