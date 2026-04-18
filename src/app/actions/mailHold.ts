"use server";

/**
 * NOHO Mailbox — Mail Hold Enforcement
 * Items held for 30+ days get flagged and users notified at 7, 14, and 30 days.
 * Admin can trigger batch check daily via cron.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/app/actions/notifications";

const HOLD_WARN_DAYS = [7, 14];
const HOLD_MAX_DAYS = 30;

// Active statuses = items still physically at the mailbox
const HELD_STATUSES = ["Received", "Scanned", "Awaiting Pickup", "Held"];

function daysSince(date: Date): number {
  const now = new Date();
  return Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
}

// ─── Batch: check all held mail and send warnings / flag overdue ──────────────

export async function runMailHoldCheck() {
  await verifyAdmin();

  const items = await prisma.mailItem.findMany({
    where: {
      status: { in: HELD_STATUSES },
    },
    select: {
      id: true,
      userId: true,
      from: true,
      type: true,
      status: true,
      createdAt: true,
      user: {
        select: { name: true, email: true },
      },
    },
  });

  let warned = 0;
  let flagged = 0;
  const errors: string[] = [];

  // Group by user to batch notifications
  const userItems = new Map<string, typeof items>();
  for (const item of items) {
    const existing = userItems.get(item.userId) ?? [];
    existing.push(item);
    userItems.set(item.userId, existing);
  }

  for (const [userId, userMailItems] of userItems) {
    const warningItems: { days: number; type: string; from: string }[] = [];
    const overdueItems: typeof items = [];

    for (const item of userMailItems) {
      const days = daysSince(item.createdAt);

      if (days >= HOLD_MAX_DAYS) {
        overdueItems.push(item);
      } else if (HOLD_WARN_DAYS.includes(days)) {
        warningItems.push({ days, type: item.type, from: item.from });
      }
    }

    // Send warning notification
    if (warningItems.length > 0) {
      const groupedByDay = new Map<number, typeof warningItems>();
      for (const w of warningItems) {
        const arr = groupedByDay.get(w.days) ?? [];
        arr.push(w);
        groupedByDay.set(w.days, arr);
      }

      for (const [days, dayItems] of groupedByDay) {
        try {
          await createNotification({
            userId,
            type: "general",
            title: `Mail Hold Reminder — ${days} Days`,
            body: `You have ${dayItems.length} item${dayItems.length !== 1 ? "s" : ""} that ${dayItems.length !== 1 ? "have" : "has"} been at our facility for ${days} days. Items are held for up to ${HOLD_MAX_DAYS} days. Please pick up or request forwarding.`,
            link: "/dashboard",
          });
          warned++;
        } catch (e: any) {
          errors.push(`warn ${userId}: ${e.message}`);
        }
      }
    }

    // Flag overdue items — update status to "Held" and notify
    if (overdueItems.length > 0) {
      try {
        await Promise.all(
          overdueItems.map((item) =>
            prisma.mailItem.update({
              where: { id: item.id },
              data: { status: "Held" },
            })
          )
        );

        await createNotification({
          userId,
          type: "general",
          title: "⚠️ Mail Hold Expired — Action Required",
          body: `${overdueItems.length} item${overdueItems.length !== 1 ? "s have" : " has"} been held for ${HOLD_MAX_DAYS}+ days. These items have been flagged. Please contact us immediately to arrange pickup or forwarding, or they may be returned to sender.`,
          link: "/dashboard",
        });
        flagged += overdueItems.length;
      } catch (e: any) {
        errors.push(`flag ${userId}: ${e.message}`);
      }
    }
  }

  revalidatePath("/admin");
  return { success: true, warned, flagged, errors, totalChecked: items.length };
}

// ─── Admin: get mail hold report ──────────────────────────────────────────────

export async function getMailHoldReport() {
  await verifyAdmin();

  const items = await prisma.mailItem.findMany({
    where: {
      status: { in: HELD_STATUSES },
    },
    select: {
      id: true,
      userId: true,
      from: true,
      type: true,
      status: true,
      createdAt: true,
      user: {
        select: { name: true, email: true, suiteNumber: true },
      },
    },
    orderBy: { createdAt: "asc" }, // oldest first
  });

  return items.map((item) => {
    const days = daysSince(item.createdAt);
    return {
      id: item.id,
      userId: item.userId,
      from: item.from,
      type: item.type,
      status: item.status,
      daysHeld: days,
      urgency: days >= HOLD_MAX_DAYS ? "overdue" : days >= 14 ? "high" : days >= 7 ? "medium" : "low",
      createdAt: item.createdAt.toISOString(),
      userName: item.user.name,
      userEmail: item.user.email,
      suiteNumber: item.user.suiteNumber,
    };
  });
}

// ─── Admin: manually release a held item (mark as return-to-sender or forward) ─

export async function releaseHeldItem(mailItemId: string, action: "return" | "forward") {
  await verifyAdmin();

  const newStatus = action === "return" ? "Forwarded" : "Forwarded"; // Both mark as Forwarded; admin handles physical action
  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: { status: newStatus },
  });

  revalidatePath("/admin");
  return { success: true };
}
