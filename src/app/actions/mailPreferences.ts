"use server";

/**
 * NOHO Mailbox — Mail Preferences
 * Priority flagging, junk sender blocking, vacation hold, stale mail reminders
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/app/actions/notifications";

function cuid() {
  return crypto.randomUUID();
}

// ─── Priority flagging ────────────────────────────────────────────────────────

export async function togglePriorityFlag(mailItemId: string) {
  const session = await verifySession();
  const userId = session.id as string;

  const item = await prisma.mailItem.findUnique({
    where: { id: mailItemId },
    select: { userId: true, priority: true },
  });
  if (!item || item.userId !== userId) return { error: "Not found" };

  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: { priority: !item.priority },
  });

  revalidatePath("/dashboard");
  return { success: true, priority: !item.priority };
}

// ─── Junk sender management ───────────────────────────────────────────────────

export async function addJunkSender(sender: string) {
  const session = await verifySession();
  const userId = session.id as string;

  const existing = await (prisma as any).junkSender.findFirst({
    where: { userId, sender },
  });
  if (existing) return { error: "Already blocked" };

  await (prisma as any).junkSender.create({
    data: { id: cuid(), userId, sender },
  });

  // Mark existing mail from this sender as junk-blocked
  await prisma.mailItem.updateMany({
    where: { userId, from: { contains: sender } },
    data: { junkBlocked: true },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function removeJunkSender(junkSenderId: string) {
  const session = await verifySession();
  const userId = session.id as string;

  const item = await (prisma as any).junkSender.findUnique({
    where: { id: junkSenderId },
  });
  if (!item || item.userId !== userId) return { error: "Not found" };

  await (prisma as any).junkSender.delete({ where: { id: junkSenderId } });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getMyJunkSenders() {
  const session = await verifySession();
  const userId = session.id as string;

  const senders = await (prisma as any).junkSender.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" as const },
  });

  return senders.map((s: any) => ({
    id: s.id,
    sender: s.sender,
    createdAt: s.createdAt.toISOString(),
  }));
}

// ─── Vacation hold ────────────────────────────────────────────────────────────

export async function setVacationHold(input: {
  startDate: string;
  endDate: string;
  digest: boolean;
}) {
  const session = await verifySession();
  const userId = session.id as string;

  await (prisma as any).vacationHold.upsert({
    where: { userId },
    create: {
      id: cuid(),
      userId,
      startDate: input.startDate,
      endDate: input.endDate,
      digest: input.digest,
      active: true,
    },
    update: {
      startDate: input.startDate,
      endDate: input.endDate,
      digest: input.digest,
      active: true,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function cancelVacationHold() {
  const session = await verifySession();
  const userId = session.id as string;

  await (prisma as any).vacationHold.updateMany({
    where: { userId },
    data: { active: false },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getMyVacationHold() {
  const session = await verifySession();
  const userId = session.id as string;

  const hold = await (prisma as any).vacationHold.findUnique({
    where: { userId },
  });

  if (!hold || !hold.active) return null;
  return {
    id: hold.id,
    startDate: hold.startDate,
    endDate: hold.endDate,
    digest: hold.digest,
    active: hold.active,
  };
}

// ─── Admin: stale mail reminders (batch) ─────────────────────────────────────

export async function sendStaleMailReminders() {
  await verifyAdmin();

  const STALE_DAYS = [7, 14, 30];
  const now = new Date();

  const items = await prisma.mailItem.findMany({
    where: {
      status: { in: ["Received", "Scanned", "Awaiting Pickup"] },
    },
    select: {
      id: true,
      userId: true,
      from: true,
      type: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });

  // Group by user + day bucket
  const userBuckets = new Map<string, Map<number, number>>();
  for (const item of items) {
    const days = Math.floor((now.getTime() - item.createdAt.getTime()) / 86400000);
    if (!STALE_DAYS.includes(days)) continue;

    if (!userBuckets.has(item.userId)) userBuckets.set(item.userId, new Map());
    const bucket = userBuckets.get(item.userId)!;
    bucket.set(days, (bucket.get(days) ?? 0) + 1);
  }

  let notified = 0;
  for (const [userId, buckets] of userBuckets) {
    for (const [days, count] of buckets) {
      await createNotification({
        userId,
        type: "general",
        title: `${count} item${count !== 1 ? "s" : ""} waiting ${days} days`,
        body: `You have ${count} mail item${count !== 1 ? "s" : ""} that ${count !== 1 ? "have" : "has"} been waiting for ${days} days. Log in to pick up, forward, or request a scan.`,
        link: "/dashboard",
      });
      notified++;
    }
  }

  return { success: true, notified };
}

// ─── Admin: apply junk sender rule to all incoming mail ───────────────────────

export async function applyJunkRules() {
  await verifyAdmin();

  const junkRules = await (prisma as any).junkSender.findMany({
    select: { userId: true, sender: true },
  });

  let blocked = 0;
  for (const rule of junkRules) {
    const result = await prisma.mailItem.updateMany({
      where: {
        userId: rule.userId,
        from: { contains: rule.sender },
        junkBlocked: false,
      },
      data: { junkBlocked: true },
    });
    blocked += result.count;
  }

  return { success: true, blocked };
}
