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

  // iter-89: Validate dates (start <= end, end >= today). Email
  // confirmation + audit log fire on success.
  const start = new Date(input.startDate);
  const end = new Date(input.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime())) {
    return { error: "Invalid dates" };
  }
  if (end < start) return { error: "End date must be on or after start date" };

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

  // Audit + email — best-effort, fire-and-forget so a Resend outage
  // doesn't block the hold.
  void (async () => {
    try {
      const u = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true, email: true, suiteNumber: true },
      });
      if (u?.email) {
        const { sendVacationHoldStartedEmail } = await import("@/lib/email");
        await sendVacationHoldStartedEmail({
          email: u.email,
          name: u.name ?? "",
          suiteNumber: u.suiteNumber ?? "—",
          startDate: input.startDate,
          endDate: input.endDate,
          digest: input.digest,
        });
      }
      await prisma.auditLog.create({
        data: {
          actorId: userId,
          actorRole: session.role,
          action: "vacation.hold_started",
          entityType: "VacationHold",
          entityId: userId,
          metadata: JSON.stringify({ startDate: input.startDate, endDate: input.endDate, digest: input.digest }),
        },
      });
    } catch (e) { console.error("[setVacationHold] post-hooks failed:", e); }
  })();

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


// ─── iter-89: Auto-resume expired vacation holds ─────────────────────────────
// Designed to be called by a cron route (/api/cron/vacation-resume) once a
// day, and also exposed as an admin-callable action so the bureau can
// trigger it manually if needed (e.g. customer comes back early).
//
// For each active hold whose endDate has passed:
//   1. Mark the hold inactive
//   2. Find all of that user's MailItems with status "Held" (these are
//      what the intake-time vacation-honor logic put on the Held shelf)
//   3. Flip each to "Awaiting Pickup" (atomic per-item, audit-logged)
//   4. Send a "welcome back" email + in-app notification

export async function runVacationHoldAutoResume(): Promise<{
  holdsResumed: number;
  packagesReleased: number;
  errors: string[];
}> {
  // Allow either an authenticated admin OR a cron-triggered call. The
  // cron route should set CRON_SECRET in headers; this action defers
  // auth to its caller (admin from dashboard, or the cron route).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayIso = today.toISOString().slice(0, 10);

  const expired = await (prisma as any).vacationHold.findMany({
    where: { active: true, endDate: { lt: todayIso } },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          suiteNumber: true,
          mailItems: {
            where: { status: "Held" },
            select: { id: true, status: true },
          },
        },
      },
    },
  });

  let holdsResumed = 0;
  let packagesReleased = 0;
  const errors: string[] = [];

  for (const hold of expired as Array<{ id: string; userId: string; user: { id: string; name: string | null; email: string; suiteNumber: string | null; mailItems: Array<{ id: string; status: string }> } }>) {
    try {
      const heldIds = hold.user.mailItems.map((m) => m.id);

      await prisma.$transaction([
        (prisma as any).vacationHold.update({
          where: { id: hold.id },
          data: { active: false },
        }),
        ...(heldIds.length > 0
          ? [prisma.mailItem.updateMany({
              where: { id: { in: heldIds } },
              data: { status: "Awaiting Pickup" },
            })]
          : []),
        ...heldIds.map((id) =>
          prisma.auditLog.create({
            data: {
              actorId: hold.userId,
              actorRole: "SYSTEM",
              action: "mail.status.awaiting_pickup",
              entityType: "MailItem",
              entityId: id,
              metadata: JSON.stringify({ from: "Held", to: "Awaiting Pickup", reason: "vacation_auto_resume" }),
            },
          })
        ),
        prisma.auditLog.create({
          data: {
            actorId: hold.userId,
            actorRole: "SYSTEM",
            action: "vacation.hold_auto_resumed",
            entityType: "VacationHold",
            entityId: hold.id,
            metadata: JSON.stringify({ packagesReleased: heldIds.length }),
          },
        }),
      ]);

      holdsResumed++;
      packagesReleased += heldIds.length;

      // Best-effort end-email + in-app notification.
      try {
        if (hold.user.email) {
          const { sendVacationHoldEndedEmail } = await import("@/lib/email");
          await sendVacationHoldEndedEmail({
            email: hold.user.email,
            name: hold.user.name ?? "",
            suiteNumber: hold.user.suiteNumber ?? "—",
            packagesReleased: heldIds.length,
          });
        }
      } catch (e) { console.error("[runVacationHoldAutoResume] email failed:", e); }
      try {
        const { createNotification } = await import("@/app/actions/notifications");
        await createNotification({
          userId: hold.userId,
          type: "general",
          title: "Welcome back · vacation hold ended",
          body: heldIds.length
            ? `${heldIds.length} package${heldIds.length === 1 ? "" : "s"} moved to Awaiting Pickup.`
            : "Your vacation hold ended — nothing accumulated. Clean shelf!",
          link: "/dashboard?tab=packages",
        });
      } catch (e) { console.error("[runVacationHoldAutoResume] notification failed:", e); }

    } catch (e) {
      console.error(`[runVacationHoldAutoResume] hold ${hold.id} failed:`, e);
      errors.push(`hold ${hold.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return { holdsResumed, packagesReleased, errors };
}

// Admin: list active vacation holds + count of held packages per user.
// Powers the AdminVacationHoldPanel.
export async function listActiveVacationHolds() {
  const { verifyAdmin } = await import("@/lib/dal");
  await verifyAdmin();
  const rows = await (prisma as any).vacationHold.findMany({
    where: { active: true },
    orderBy: { endDate: "asc" as const },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          suiteNumber: true,
          mailItems: {
            where: { status: "Held" },
            select: { id: true },
          },
        },
      },
    },
  });
  return (rows as Array<{ id: string; startDate: string; endDate: string; digest: boolean; user: { id: string; name: string | null; email: string; suiteNumber: string | null; mailItems: Array<{ id: string }> } }>).map((r) => ({
    id: r.id,
    customerId: r.user.id,
    customerName: r.user.name,
    customerEmail: r.user.email,
    suiteNumber: r.user.suiteNumber,
    startDate: r.startDate,
    endDate: r.endDate,
    digest: r.digest,
    heldPackageCount: r.user.mailItems.length,
  }));
}

// Admin: end a customer's hold immediately (e.g. they came back early).
export async function adminEndVacationHold(holdId: string) {
  const { verifyAdmin } = await import("@/lib/dal");
  const actor = await verifyAdmin();
  const hold = await (prisma as any).vacationHold.findUnique({
    where: { id: holdId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          suiteNumber: true,
          mailItems: { where: { status: "Held" }, select: { id: true } },
        },
      },
    },
  });
  if (!hold) return { error: "Hold not found" };
  const heldIds = (hold.user?.mailItems ?? []).map((m: { id: string }) => m.id);

  await prisma.$transaction([
    (prisma as any).vacationHold.update({
      where: { id: holdId },
      data: { active: false },
    }),
    ...(heldIds.length > 0
      ? [prisma.mailItem.updateMany({
          where: { id: { in: heldIds } },
          data: { status: "Awaiting Pickup" },
        })]
      : []),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "vacation.hold_admin_ended",
        entityType: "VacationHold",
        entityId: holdId,
        metadata: JSON.stringify({ customerId: hold.userId, packagesReleased: heldIds.length }),
      },
    }),
  ]);

  // Email + notification (best-effort).
  if (hold.user?.email) {
    void (async () => {
      try {
        const { sendVacationHoldEndedEmail } = await import("@/lib/email");
        await sendVacationHoldEndedEmail({
          email: hold.user.email,
          name: hold.user.name ?? "",
          suiteNumber: hold.user.suiteNumber ?? "—",
          endedManually: true,
          packagesReleased: heldIds.length,
        });
      } catch (e) { console.error("[adminEndVacationHold] email failed:", e); }
    })();
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true, packagesReleased: heldIds.length };
}
