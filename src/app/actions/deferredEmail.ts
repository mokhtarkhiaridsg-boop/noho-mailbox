"use server";

// iter-130 — Deferred-email queue server actions.
//
// Three flows:
//   1. enqueueDeferredEmail — called by senders (or sendOrDefer) when
//      the bureau is closed and the kind is deferable. Persists the
//      fully-rendered email so the drain cron can fire it as-is.
//   2. runDeferredEmailDrain — called by the cron route. Picks up rows
//      where status=Pending + deferUntilIso <= now, calls sendEmail,
//      flips status. Bounded batch.
//   3. listAdminDeferredEmails / cancelDeferredEmail — admin queue
//      management.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { decideHolidayDeferral } from "@/lib/holidayAwareSend";
import { getOperatingHours } from "./operatingHours";

const DRAIN_BATCH = 50;

// Caller-side helper: send-or-defer in one call. Returns whether it
// landed immediately or got queued + the queue row id when queued.
export async function sendOrDefer(args: {
  to: string;
  subject: string;
  html: string;
  kind: string;
  userId?: string | null;
  atDate?: Date;
}): Promise<
  | { status: "sent"; logId: string }
  | { status: "deferred"; deferredId: string; deferUntilIso: string; reason: string }
  | { status: "skipped"; reason: string }
> {
  const cfg = await getOperatingHours();
  const decision = decideHolidayDeferral({
    kind: args.kind,
    cfg,
    atDate: args.atDate,
  });
  if (!decision.defer) {
    const r = await sendEmail({
      to: args.to,
      subject: args.subject,
      html: args.html,
      kind: args.kind,
      userId: args.userId ?? null,
    });
    return { status: "sent", logId: r.logId };
  }
  const row = await prisma.deferredEmail.create({
    data: {
      kind: args.kind,
      recipientEmail: args.to,
      recipientUserId: args.userId ?? null,
      subject: args.subject,
      bodyHtml: args.html,
      deferUntilIso: decision.deferUntil,
      reason: decision.reason,
    },
  });
  return {
    status: "deferred",
    deferredId: row.id,
    deferUntilIso: decision.deferUntil.toISOString(),
    reason: decision.reason,
  };
}

// Cron: drain anything ready to send.
export async function runDeferredEmailDrain(): Promise<{
  picked: number; sent: number; failed: number;
}> {
  const now = new Date();
  const ready = await prisma.deferredEmail.findMany({
    where: { status: "Pending", deferUntilIso: { lte: now } },
    orderBy: { deferUntilIso: "asc" },
    take: DRAIN_BATCH,
  });
  let sent = 0; let failed = 0;
  for (const row of ready) {
    try {
      const r = await sendEmail({
        to: row.recipientEmail,
        subject: row.subject,
        html: row.bodyHtml,
        kind: row.kind,
        userId: row.recipientUserId ?? null,
      });
      const ok = r.status === "sent" || r.status === "not_sent";
      await prisma.deferredEmail.update({
        where: { id: row.id },
        data: {
          status: ok ? "Sent" : "Failed",
          sentAt: ok ? new Date() : null,
          attemptCount: row.attemptCount + 1,
          lastError: ok ? null : `provider:${r.status}`,
        },
      });
      if (ok) sent += 1; else failed += 1;
    } catch (e) {
      failed += 1;
      await prisma.deferredEmail.update({
        where: { id: row.id },
        data: {
          attemptCount: row.attemptCount + 1,
          lastError: e instanceof Error ? e.message : String(e),
          status: row.attemptCount + 1 >= 5 ? "Failed" : "Pending",
        },
      }).catch(() => null);
    }
  }
  return { picked: ready.length, sent, failed };
}

// Admin queue.
export type DeferredRow = {
  id: string;
  kind: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  deferUntilIso: string;
  status: string;
  reason: string;
  attemptCount: number;
  lastError: string | null;
  enqueuedAtIso: string;
  sentAtIso: string | null;
};

export async function listAdminDeferredEmails(input: {
  status?: "Pending" | "Sent" | "Failed" | "Cancelled" | "all";
} = {}): Promise<{ rows: DeferredRow[]; pendingCount: number }> {
  await verifyAdmin();
  const filter = input.status ?? "Pending";
  const rows = await prisma.deferredEmail.findMany({
    where: filter === "all" ? {} : { status: filter },
    orderBy: { deferUntilIso: "asc" },
    take: 200,
  });
  const userIds = Array.from(new Set(rows.map((r) => r.recipientUserId).filter((x): x is string => Boolean(x))));
  const users = userIds.length === 0 ? [] : await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true },
  });
  const userById = new Map(users.map((u) => [u.id, u] as const));
  const pendingCount = await prisma.deferredEmail.count({ where: { status: "Pending" } });

  return {
    pendingCount,
    rows: rows.map((r) => ({
      id: r.id,
      kind: r.kind,
      recipientEmail: r.recipientEmail,
      recipientName: r.recipientUserId ? (userById.get(r.recipientUserId)?.name ?? null) : null,
      subject: r.subject,
      deferUntilIso: r.deferUntilIso.toISOString(),
      status: r.status,
      reason: r.reason,
      attemptCount: r.attemptCount,
      lastError: r.lastError,
      enqueuedAtIso: r.enqueuedAt.toISOString(),
      sentAtIso: r.sentAt?.toISOString() ?? null,
    })),
  };
}

export async function adminCancelDeferred(id: string): Promise<{ error?: string; ok?: boolean }> {
  const actor = await verifyAdmin();
  const row = await prisma.deferredEmail.findUnique({ where: { id } });
  if (!row) return { error: "Not found" };
  if (row.status !== "Pending") return { error: `Already ${row.status.toLowerCase()}` };
  await prisma.$transaction([
    prisma.deferredEmail.update({
      where: { id },
      data: { status: "Cancelled" },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id ?? "unknown",
        actorRole: actor.role,
        action: "deferred_email.cancelled",
        entityType: "DeferredEmail",
        entityId: id,
        metadata: JSON.stringify({ kind: row.kind, recipientEmail: row.recipientEmail, subject: row.subject }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { ok: true };
}

export async function adminSendDeferredNow(id: string): Promise<{ error?: string; ok?: boolean }> {
  await verifyAdmin();
  const row = await prisma.deferredEmail.findUnique({ where: { id } });
  if (!row) return { error: "Not found" };
  if (row.status !== "Pending") return { error: `Already ${row.status.toLowerCase()}` };
  try {
    const r = await sendEmail({
      to: row.recipientEmail,
      subject: row.subject,
      html: row.bodyHtml,
      kind: row.kind,
      userId: row.recipientUserId ?? null,
    });
    const ok = r.status === "sent" || r.status === "not_sent";
    await prisma.deferredEmail.update({
      where: { id },
      data: {
        status: ok ? "Sent" : "Failed",
        sentAt: ok ? new Date() : null,
        attemptCount: row.attemptCount + 1,
        lastError: ok ? null : `provider:${r.status}`,
      },
    });
    revalidatePath("/admin");
    return ok ? { ok: true } : { error: `Send failed: ${r.status}` };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
