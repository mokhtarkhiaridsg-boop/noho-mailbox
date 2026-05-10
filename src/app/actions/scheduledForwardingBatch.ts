"use server";

/**
 * iter-170 — Recurring scheduled forwarding sweep + batch actions.
 *
 * Splits the recurring sweep logic out of iter-129's
 * `runScheduledForwardings` (which is admin-gated) into:
 *  - `runScheduledForwardingSweep()` — system entry, callable by cron
 *    bearer route OR member's "run now" button without admin auth
 *  - `processForwardingRow(forwarding)` — single-row processor used by
 *    both the sweep and the manual-run path
 *  - `runMyForwardingNow()` — member-side immediate fire
 *  - `pauseMyForwarding({untilDate})` / `resumeMyForwarding()` —
 *    vacation-mode toggles
 *  - `listMyForwardingBatches({limit})` — history for the dashboard
 *  - `setRecurringForwarding({frequency, addressId, notes})` — full
 *    upsert with notes + restored-from-pause state cleanup
 *
 * Audit: every batch writes `mail.scheduled_forward_batch` with the
 * full item list + address snapshot for chain-of-custody.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendScheduledForwardingBatchEmail } from "@/lib/email";
import { fireMemberWebhooks } from "@/lib/memberWebhooks";
import { fireWebhooks } from "@/lib/webhooks";
import { computeNextRunDate, todayYmd, isDueNow, type ForwardingFrequency } from "@/lib/scheduledForwarding";

export type ForwardingBatchRow = {
  id: string;
  forwardingId: string;
  addressLabel: string;
  addressBody: string;
  itemCount: number;
  notes: string | null;
  source: "cron" | "manual" | "test";
  shippedAtIso: string;
};

// ─── Member-side ─────────────────────────────────────────────────────
export async function setRecurringForwarding(input: {
  frequency: ForwardingFrequency;
  addressId?: string;
  notes?: string;
}): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;

  const existing = await prisma.scheduledForwarding.findFirst({
    where: { userId, active: true },
  });
  const data = {
    frequency: input.frequency,
    addressId: input.addressId ?? null,
    nextRunDate: computeNextRunDate(input.frequency),
    notes: input.notes?.trim().slice(0, 200) || null,
    enabled: true,
    pauseUntil: null,
    active: true,
  };
  if (existing) {
    await prisma.scheduledForwarding.update({ where: { id: existing.id }, data });
  } else {
    await prisma.scheduledForwarding.create({ data: { userId, ...data } });
  }
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: session.role ?? "MEMBER",
      action: "mail.scheduled_forward_set",
      entityType: "ScheduledForwarding",
      entityId: existing?.id ?? "(new)",
      metadata: JSON.stringify({ frequency: input.frequency, addressId: input.addressId ?? null }),
    },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function pauseMyForwarding(input: { untilDate: string }): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.untilDate)) return { error: "Invalid date." };
  if (input.untilDate <= todayYmd()) return { error: "Date must be in the future." };
  const sf = await prisma.scheduledForwarding.findFirst({ where: { userId, active: true } });
  if (!sf) return { error: "No active forwarding to pause." };
  await prisma.$transaction([
    prisma.scheduledForwarding.update({ where: { id: sf.id }, data: { pauseUntil: input.untilDate } }),
    prisma.auditLog.create({
      data: {
        actorId: userId, actorRole: session.role ?? "MEMBER",
        action: "mail.scheduled_forward_paused",
        entityType: "ScheduledForwarding",
        entityId: sf.id,
        metadata: JSON.stringify({ untilDate: input.untilDate }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function resumeMyForwarding(): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const sf = await prisma.scheduledForwarding.findFirst({ where: { userId, active: true } });
  if (!sf) return { error: "No forwarding to resume." };
  await prisma.scheduledForwarding.update({ where: { id: sf.id }, data: { pauseUntil: null } });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function runMyForwardingNow(): Promise<{ success?: boolean; itemCount?: number; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const sf = await prisma.scheduledForwarding.findFirst({
    where: { userId, active: true, enabled: true },
  });
  if (!sf) return { error: "No active forwarding configured." };
  const result = await processForwardingRowInternal(sf.id, "manual");
  if (result.error) return { error: result.error };
  return { success: true, itemCount: result.itemCount };
}

export async function listMyForwardingBatches(input: { limit?: number } = {}): Promise<ForwardingBatchRow[]> {
  const session = await verifySession();
  const userId = session.id!;
  const limit = Math.max(5, Math.min(100, input.limit ?? 12));
  const rows = await prisma.scheduledForwardingBatch.findMany({
    where: { userId },
    orderBy: { shippedAt: "desc" },
    take: limit,
  });
  return rows.map((r) => ({
    id: r.id,
    forwardingId: r.forwardingId,
    addressLabel: r.addressLabel,
    addressBody: r.addressBody,
    itemCount: r.itemCount,
    notes: r.notes,
    source: r.source as "cron" | "manual" | "test",
    shippedAtIso: r.shippedAt.toISOString(),
  }));
}

// ─── System / cron entry ─────────────────────────────────────────────
export type SweepResult = {
  processed: number;
  shipped: number;       // batches that actually had items
  empty: number;         // due rows with zero pending items (still rolls forward)
  skippedPaused: number;
  failed: number;
  totalItems: number;
};

export async function runScheduledForwardingSweep(): Promise<SweepResult> {
  // No auth — designed to be called from the bearer-CRON_SECRET route
  // OR composed by an admin tool. We deliberately don't gate here so
  // tests can drive it freely.
  const today = todayYmd();
  const due = await prisma.scheduledForwarding.findMany({
    where: { active: true, enabled: true, nextRunDate: { lte: today } },
    select: { id: true, pauseUntil: true },
  });

  const out: SweepResult = { processed: 0, shipped: 0, empty: 0, skippedPaused: 0, failed: 0, totalItems: 0 };

  for (const row of due) {
    if (row.pauseUntil && row.pauseUntil > today) {
      out.skippedPaused += 1;
      continue;
    }
    out.processed += 1;
    try {
      const result = await processForwardingRowInternal(row.id, "cron");
      if (result.error) { out.failed += 1; continue; }
      out.totalItems += result.itemCount;
      if (result.itemCount > 0) out.shipped += 1;
      else out.empty += 1;
    } catch {
      out.failed += 1;
    }
  }
  return out;
}

// Internal — atomic per-row processor.
async function processForwardingRowInternal(forwardingId: string, source: "cron" | "manual" | "test"): Promise<{ itemCount: number; error?: string }> {
  const sf = await prisma.scheduledForwarding.findUnique({
    where: { id: forwardingId },
    include: {
      user: { select: { id: true, name: true, email: true, suiteNumber: true, forwardingAddresses: true } },
    },
  });
  if (!sf) return { itemCount: 0, error: "forwarding_not_found" };
  if (!sf.user) return { itemCount: 0, error: "user_not_found" };

  // Resolve destination address. If `addressId` is null, use the
  // member's default forwarding address (first on file).
  const addr = sf.addressId
    ? sf.user.forwardingAddresses.find((a) => a.id === sf.addressId)
    : (sf.user.forwardingAddresses[0] ?? null);
  if (!addr) {
    // Roll the next-run date forward anyway so we don't infinitely
    // retry on the same day. Audit it as a skip.
    const nextRunDate = computeNextRunDate(sf.frequency as ForwardingFrequency);
    await prisma.scheduledForwarding.update({
      where: { id: sf.id },
      data: { nextRunDate, lastRunDate: todayYmd() },
    });
    await prisma.auditLog.create({
      data: {
        actorId: "system", actorRole: "SYSTEM",
        action: "mail.scheduled_forward_skipped_no_address",
        entityType: "ScheduledForwarding",
        entityId: sf.id,
        metadata: JSON.stringify({ userId: sf.userId, source }),
      },
    });
    return { itemCount: 0 };
  }

  // Find every eligible MailItem to ship in this batch.
  const eligible = await prisma.mailItem.findMany({
    where: {
      userId: sf.userId,
      status: { in: ["Received", "Scanned", "Awaiting Pickup", "Held"] },
    },
    select: { id: true, type: true, from: true },
  });

  const itemIds = eligible.map((m) => m.id);
  const today = todayYmd();
  const nextRunDate = computeNextRunDate(sf.frequency as ForwardingFrequency);

  // Atomic: flip mail items + create batch row + roll forward + audit.
  if (itemIds.length > 0) {
    const batch = await prisma.$transaction(async (tx) => {
      await tx.mailItem.updateMany({
        where: { id: { in: itemIds } },
        data: { status: "Forwarded" },
      });
      const created = await tx.scheduledForwardingBatch.create({
        data: {
          forwardingId: sf.id,
          userId: sf.userId,
          addressLabel: addr.label,
          addressBody: addr.address,
          itemCount: itemIds.length,
          itemIdsJson: JSON.stringify(itemIds),
          notes: sf.notes,
          source,
        },
      });
      await tx.scheduledForwarding.update({
        where: { id: sf.id },
        data: {
          lastRunDate: today,
          nextRunDate,
          lastBatchSize: itemIds.length,
          lastBatchAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: source === "manual" ? sf.userId : "system",
          actorRole: source === "manual" ? "MEMBER" : "SYSTEM",
          action: "mail.scheduled_forward_batch",
          entityType: "ScheduledForwarding",
          entityId: sf.id,
          metadata: JSON.stringify({
            userId: sf.userId,
            batchId: created.id,
            itemCount: itemIds.length,
            itemIds,
            addressLabel: addr.label,
            source,
            nextRunDate,
          }),
        },
      });
      return created;
    });

    // Fire-and-forget: email + member webhook + admin Slack/Discord.
    if (sf.user.email) {
      void sendScheduledForwardingBatchEmail({
        toEmail: sf.user.email,
        userId: sf.userId,
        name: sf.user.name,
        itemCount: itemIds.length,
        addressLabel: addr.label,
        addressBody: addr.address,
        nextRunDate,
        notes: sf.notes,
        source,
      }).catch(() => undefined);
    }
    void fireMemberWebhooks(sf.userId, "mail.forwarded", {
      text: `📬 Scheduled forwarding batch shipped — ${itemIds.length} item${itemIds.length === 1 ? "" : "s"} to ${addr.label}`,
      url: "https://nohomailbox.org/dashboard?tab=settings",
      detail: {
        batchId: batch.id,
        itemCount: itemIds.length,
        addressLabel: addr.label,
        source,
        nextRunDate,
      },
    });
    void fireWebhooks("mail.picked_up", {
      // Re-using the existing admin webhook event for "stuff left the
      // bureau". A future iter could add a dedicated `mail.batched`
      // event; for now this surfaces the batch in admin Slack/Discord.
      text: `📬 *${sf.user.name}* (suite #${sf.user.suiteNumber ?? "—"}) — ${itemIds.length} item${itemIds.length === 1 ? "" : "s"} forwarded to ${addr.label}`,
      emoji: "📬",
      detail: {
        userId: sf.userId,
        suiteNumber: sf.user.suiteNumber ?? null,
        itemCount: itemIds.length,
        addressLabel: addr.label,
        source,
      },
    });
  } else {
    // No items eligible — still roll forward + audit so the next
    // batch lands on schedule.
    await prisma.$transaction([
      prisma.scheduledForwarding.update({
        where: { id: sf.id },
        data: { lastRunDate: today, nextRunDate },
      }),
      prisma.auditLog.create({
        data: {
          actorId: source === "manual" ? sf.userId : "system",
          actorRole: source === "manual" ? "MEMBER" : "SYSTEM",
          action: "mail.scheduled_forward_empty",
          entityType: "ScheduledForwarding",
          entityId: sf.id,
          metadata: JSON.stringify({ userId: sf.userId, source, nextRunDate }),
        },
      }),
    ]);
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { itemCount: itemIds.length };
}

// Convenience for the dashboard card: returns full state including
// derived "is due now" + paused flag.
export async function getMyForwardingStatus() {
  const session = await verifySession();
  const userId = session.id!;
  const sf = await prisma.scheduledForwarding.findFirst({
    where: { userId, active: true },
    include: { user: { select: { forwardingAddresses: true } } },
  });
  if (!sf) return null;
  return {
    id: sf.id,
    frequency: sf.frequency as ForwardingFrequency,
    addressId: sf.addressId,
    nextRunDate: sf.nextRunDate,
    lastRunDate: sf.lastRunDate,
    lastBatchSize: sf.lastBatchSize,
    lastBatchAtIso: sf.lastBatchAt?.toISOString() ?? null,
    enabled: sf.enabled,
    pauseUntil: sf.pauseUntil,
    notes: sf.notes,
    isDueNow: isDueNow({
      nextRunDate: sf.nextRunDate, pauseUntil: sf.pauseUntil,
      enabled: sf.enabled, active: sf.active,
    }),
    addresses: sf.user.forwardingAddresses,
  };
}
