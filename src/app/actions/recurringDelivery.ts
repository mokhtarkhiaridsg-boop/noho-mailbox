"use server";

/**
 * NOHO Mailbox — Recurring Delivery Schedule
 * Members can set up automatic weekly/biweekly/monthly delivery of their mail.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function cuid() {
  return crypto.randomUUID();
}

// UTC-safe: setDate / setMonth on a local-TZ Date drifts at DST boundaries.
// Anchor every computation to UTC midnight so the next run lands on the same
// calendar day regardless of where the cron fires from.
function nextRunDate(frequency: string): string {
  const now = new Date();
  const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (frequency === "weekly") d.setUTCDate(d.getUTCDate() + 7);
  else if (frequency === "biweekly") d.setUTCDate(d.getUTCDate() + 14);
  else d.setUTCMonth(d.getUTCMonth() + 1);
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

  // Validate destination — was being stored verbatim from the client. A
  // blank / overlong / obvious-junk address would later get pushed to a
  // courier and either fail or burn margin. Require something address-shaped:
  // at least 10 chars, max 500.
  const destination = input.destination.trim();
  if (destination.length < 10) {
    return { error: "Please provide a complete delivery address (at least 10 chars)." };
  }
  if (destination.length > 500) {
    return { error: "Delivery address is too long (max 500 chars)." };
  }
  if (!["weekly", "biweekly", "monthly"].includes(input.frequency)) {
    return { error: "Frequency must be weekly, biweekly, or monthly." };
  }
  if (!["standard", "express"].includes(input.tier)) {
    return { error: "Tier must be standard or express." };
  }

  // Active-plan gate: members on Inactive / Suspended / Cancelled accounts
  // shouldn't be able to schedule new deliveries. The admin batch
  // (runRecurringDeliveries) re-checks this at execution time too — defense
  // in depth, since the customer's plan status can change between scheduling
  // and the next run.
  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: { status: true, mailboxStatus: true, plan: true },
  });
  if (!me) return { error: "User not found." };
  if (me.status !== "Active" || me.mailboxStatus === "Cancelled" || me.mailboxStatus === "Suspended") {
    return { error: "Account isn't active — recurring delivery can't be scheduled. Renew your plan first." };
  }

  const existing = await (prisma as any).recurringDelivery.findFirst({
    where: { userId, active: true },
  });

  if (existing) {
    await (prisma as any).recurringDelivery.update({
      where: { id: existing.id },
      data: {
        frequency: input.frequency,
        destination,
        tier: input.tier,
        notes: input.notes?.trim().slice(0, 1000) ?? null,
        nextRunDate: nextRunDate(input.frequency),
      },
    });
  } else {
    await (prisma as any).recurringDelivery.create({
      data: {
        id: cuid(),
        userId,
        frequency: input.frequency,
        destination,
        tier: input.tier,
        notes: input.notes?.trim().slice(0, 1000) ?? null,
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

// Admin: run all due recurring deliveries. Skips users whose plan/account
// has gone inactive between schedule and run — the prior implementation
// would happily dispatch a $15 express delivery for a cancelled customer.
export async function runRecurringDeliveries() {
  await verifyAdmin();

  const today = new Date().toISOString().split("T")[0];
  const due = await (prisma as any).recurringDelivery.findMany({
    where: { active: true, nextRunDate: { lte: today } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          phone: true,
          email: true,
          status: true,
          mailboxStatus: true,
        },
      },
    },
  });

  let processed = 0;
  let skippedInactive = 0;
  const skippedDetails: Array<{ userId: string; reason: string }> = [];

  for (const rd of due) {
    const user = rd.user;
    // Defense-in-depth: re-verify the user is still active before billing.
    if (
      !user ||
      user.status !== "Active" ||
      user.mailboxStatus === "Cancelled" ||
      user.mailboxStatus === "Suspended"
    ) {
      skippedInactive++;
      skippedDetails.push({
        userId: rd.userId,
        reason: !user ? "user-deleted" : `${user.status}/${user.mailboxStatus}`,
      });
      // Auto-deactivate the schedule so we don't keep checking it every day.
      await (prisma as any).recurringDelivery.update({
        where: { id: rd.id },
        data: { active: false },
      });
      continue;
    }

    // Create a delivery order
    await prisma.deliveryOrder.create({
      data: {
        userId: rd.userId,
        customerName: user.name ?? "Member",
        phone: user.phone ?? "",
        email: user.email ?? "",
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

  return { success: true, processed, skippedInactive, skippedDetails };
}
