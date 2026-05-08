"use server";

// iter-103 — Webhook endpoint admin actions.
//
// CRUD + test-send for outbound webhook endpoints. Reuses the iter-95
// audit-log structure: every change is recorded with metadata and the
// actor's role. Test sends fire through fireWebhooks so the row gets
// the same provenance + delivery row as a real event.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import {
  ALL_WEBHOOK_EVENTS,
  fireWebhooks,
  retryDelivery,
  MAX_ATTEMPTS,
  type WebhookEvent,
} from "@/lib/webhooks";

export type WebhookRow = {
  id: string;
  label: string;
  url: string;
  format: "slack" | "discord" | "generic";
  events: WebhookEvent[];
  active: boolean;
  hasSecret: boolean;
  createdAt: string;
  lastFiredAt: string | null;
  lastStatus: string | null;
  recentDeliveries: number;
  recentFailures: number;
};

const VALID_FORMATS = new Set(["slack", "discord", "generic"]);
const VALID_EVENTS = new Set(ALL_WEBHOOK_EVENTS.map((e) => e.key));

function parseEvents(raw: string): WebhookEvent[] {
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is WebhookEvent => typeof x === "string" && VALID_EVENTS.has(x as WebhookEvent));
  } catch {
    return [];
  }
}

export async function listWebhooks(): Promise<WebhookRow[]> {
  await verifyAdmin();
  const eps = await prisma.webhookEndpoint.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });
  if (eps.length === 0) return [];

  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const grouped = await prisma.webhookDelivery.groupBy({
    by: ["endpointId", "status"],
    where: { endpointId: { in: eps.map((e) => e.id) }, sentAt: { gte: since } },
    _count: { _all: true },
  });
  const counts = new Map<string, { ok: number; failed: number }>();
  for (const g of grouped) {
    const k = g.endpointId;
    const slot = counts.get(k) ?? { ok: 0, failed: 0 };
    if (g.status === "ok") slot.ok += g._count._all;
    else slot.failed += g._count._all;
    counts.set(k, slot);
  }

  return eps.map((e) => {
    const c = counts.get(e.id) ?? { ok: 0, failed: 0 };
    return {
      id: e.id,
      label: e.label,
      url: e.url,
      format: (VALID_FORMATS.has(e.format) ? e.format : "generic") as "slack" | "discord" | "generic",
      events: parseEvents(e.events),
      active: e.active,
      hasSecret: Boolean(e.secret),
      createdAt: e.createdAt.toISOString(),
      lastFiredAt: e.lastFiredAt?.toISOString() ?? null,
      lastStatus: e.lastStatus,
      recentDeliveries: c.ok + c.failed,
      recentFailures: c.failed,
    };
  });
}

type UpsertInput = {
  id?: string;
  label: string;
  url: string;
  format: "slack" | "discord" | "generic";
  events: WebhookEvent[];
  active?: boolean;
  secret?: string | null; // pass empty string to clear
};

export async function upsertWebhook(input: UpsertInput): Promise<{ error?: string; id?: string }> {
  const actor = await verifyAdmin();
  const label = input.label.trim();
  const url = input.url.trim();
  if (!label) return { error: "Label required" };
  if (!/^https?:\/\//i.test(url)) return { error: "URL must start with https:// (or http:// for local dev)" };
  if (!VALID_FORMATS.has(input.format)) return { error: "Invalid format" };
  const events = (input.events ?? []).filter((e): e is WebhookEvent => VALID_EVENTS.has(e));
  if (events.length === 0) return { error: "Subscribe to at least one event" };

  const data = {
    label,
    url,
    format: input.format,
    events: JSON.stringify(events),
    active: input.active ?? true,
    secret: input.secret === undefined ? undefined : (input.secret?.trim() || null),
  };

  let id = input.id;
  if (id) {
    await prisma.webhookEndpoint.update({ where: { id }, data });
  } else {
    const created = await prisma.webhookEndpoint.create({
      data: { ...data, createdBy: actor.id },
    });
    id = created.id;
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: input.id ? "webhook.updated" : "webhook.created",
      entityType: "WebhookEndpoint",
      entityId: id,
      metadata: JSON.stringify({ label, url, format: input.format, events, active: input.active ?? true }),
    },
  });

  revalidatePath("/admin");
  return { id };
}

export async function deleteWebhook(id: string): Promise<{ error?: string; success?: boolean }> {
  const actor = await verifyAdmin();
  const ep = await prisma.webhookEndpoint.findUnique({ where: { id }, select: { id: true, label: true } });
  if (!ep) return { error: "Webhook not found" };
  await prisma.$transaction([
    prisma.webhookEndpoint.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "webhook.deleted",
        entityType: "WebhookEndpoint",
        entityId: id,
        metadata: JSON.stringify({ label: ep.label }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function toggleWebhookActive(id: string): Promise<{ error?: string; active?: boolean }> {
  const actor = await verifyAdmin();
  const ep = await prisma.webhookEndpoint.findUnique({ where: { id }, select: { id: true, active: true, label: true } });
  if (!ep) return { error: "Webhook not found" };
  const next = !ep.active;
  await prisma.$transaction([
    prisma.webhookEndpoint.update({ where: { id }, data: { active: next } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: next ? "webhook.activated" : "webhook.deactivated",
        entityType: "WebhookEndpoint",
        entityId: id,
        metadata: JSON.stringify({ label: ep.label }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { active: next };
}

// Fire a synthetic test ping so the admin can confirm the URL works. The
// delivery is logged like any other; the row appears in the deliveries
// list immediately on refresh.
export async function testWebhook(id: string): Promise<{ error?: string; success?: boolean }> {
  const actor = await verifyAdmin();
  const ep = await prisma.webhookEndpoint.findUnique({ where: { id }, select: { id: true, label: true, active: true } });
  if (!ep) return { error: "Webhook not found" };
  if (!ep.active) return { error: "Webhook is paused — activate it first" };

  await fireWebhooks("test.ping", {
    text: `Test ping from NOHO admin → ${ep.label}`,
    emoji: "🧪",
    url: `${process.env.AUTH_URL ?? "https://nohomailbox.org"}/admin?tab=webhooks`,
    detail: { label: ep.label, triggeredBy: actor.id ?? "admin" },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "webhook.tested",
      entityType: "WebhookEndpoint",
      entityId: id,
      metadata: JSON.stringify({ label: ep.label }),
    },
  });
  return { success: true };
}

export async function listWebhookDeliveries(input: { endpointId: string; limit?: number }): Promise<Array<{
  id: string;
  event: string;
  status: string;
  httpStatus: number | null;
  error: string | null;
  durationMs: number | null;
  sentAt: string;
  payloadPreview: string;
}>> {
  await verifyAdmin();
  const rows = await prisma.webhookDelivery.findMany({
    where: { endpointId: input.endpointId },
    orderBy: { sentAt: "desc" },
    take: Math.min(50, Math.max(5, input.limit ?? 20)),
  });
  return rows.map((r) => ({
    id: r.id,
    event: r.event,
    status: r.status,
    httpStatus: r.httpStatus,
    error: r.error,
    durationMs: r.durationMs,
    sentAt: r.sentAt.toISOString(),
    payloadPreview: r.payload.slice(0, 240),
  }));
}

// ─── iter-134 — Retry & dead-letter queue admin surface ──────────────

export type WebhookProblemRow = {
  id: string;
  endpointId: string;
  endpointLabel: string;
  endpointActive: boolean;
  event: string;
  attempt: number;
  maxAttempts: number;
  httpStatus: number | null;
  error: string | null;
  sentAt: string;       // ISO — original first-attempt time
  lastTriedAt: string | null;
  nextRetryAt: string | null;
  deadLettered: boolean;
  payloadPreview: string;
};

// Returns ALL currently-problematic deliveries — both pending retries
// and dead-lettered ones. Drives the new "Failed deliveries" admin
// section. Capped at 200 rows; pending retries first (sorted by next
// retry time), then dead-letters (newest first).
export async function listWebhookProblems(): Promise<{
  pendingRetries: WebhookProblemRow[];
  deadLetters: WebhookProblemRow[];
  totals: { pending: number; deadLettered: number };
}> {
  await verifyAdmin();

  const [pending, dl, totals] = await Promise.all([
    prisma.webhookDelivery.findMany({
      where: { deadLettered: false, status: "failed" },
      include: { endpoint: { select: { label: true, active: true } } },
      orderBy: [{ nextRetryAt: "asc" }, { sentAt: "asc" }],
      take: 100,
    }),
    prisma.webhookDelivery.findMany({
      where: { deadLettered: true },
      include: { endpoint: { select: { label: true, active: true } } },
      orderBy: { sentAt: "desc" },
      take: 100,
    }),
    Promise.all([
      prisma.webhookDelivery.count({ where: { deadLettered: false, status: "failed" } }),
      prisma.webhookDelivery.count({ where: { deadLettered: true } }),
    ]),
  ]);

  const toRow = (r: typeof pending[number]): WebhookProblemRow => ({
    id: r.id,
    endpointId: r.endpointId,
    endpointLabel: r.endpoint.label,
    endpointActive: r.endpoint.active,
    event: r.event,
    attempt: r.attempt,
    maxAttempts: MAX_ATTEMPTS,
    httpStatus: r.httpStatus,
    error: r.error,
    sentAt: r.sentAt.toISOString(),
    lastTriedAt: r.lastTriedAt ? r.lastTriedAt.toISOString() : null,
    nextRetryAt: r.nextRetryAt ? r.nextRetryAt.toISOString() : null,
    deadLettered: r.deadLettered,
    payloadPreview: r.payload.slice(0, 240),
  });

  return {
    pendingRetries: pending.map(toRow),
    deadLetters: dl.map(toRow),
    totals: { pending: totals[0], deadLettered: totals[1] },
  };
}

// Admin clicks "Replay" on a failed/dead-lettered row. Resets attempt
// count to 0 (so the upcoming retry counts as attempt 1 again) and
// clears the dead-lettered flag, then immediately fires it. Audit-logged
// so we know who replayed what.
export async function replayWebhookDelivery(deliveryId: string): Promise<{
  error?: string;
  status?: "ok" | "failed" | "dead_lettered" | "skipped";
  attempt?: number;
}> {
  const actor = await verifyAdmin();
  const row = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    select: { id: true, endpointId: true, deadLettered: true, event: true, attempt: true },
  });
  if (!row) return { error: "Delivery not found" };

  // Reset retry state so retryDelivery() runs from a fresh attempt 0
  // (it always increments, so the post-attempt count lands at 1).
  await prisma.webhookDelivery.update({
    where: { id: deliveryId },
    data: { attempt: 0, deadLettered: false, nextRetryAt: null, error: null, status: "failed" },
  });
  const result = await retryDelivery(deliveryId);

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "webhook.replayed",
      entityType: "WebhookDelivery",
      entityId: deliveryId,
      metadata: JSON.stringify({
        event: row.event,
        endpointId: row.endpointId,
        previousAttempt: row.attempt,
        wasDeadLettered: row.deadLettered,
        result: result.status,
      }),
    },
  });

  revalidatePath("/admin");
  return { status: result.status, attempt: result.attempt };
}

// Admin discards a permanently dead-lettered row from the queue.
// Useful for clearing test webhooks or noise from a misconfigured
// endpoint that's since been deleted.
export async function discardDeadLetter(deliveryId: string): Promise<{ error?: string; success?: boolean }> {
  const actor = await verifyAdmin();
  const row = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    select: { id: true, endpointId: true, event: true, deadLettered: true },
  });
  if (!row) return { error: "Delivery not found" };
  if (!row.deadLettered) return { error: "Only dead-lettered deliveries can be discarded" };

  await prisma.$transaction([
    prisma.webhookDelivery.delete({ where: { id: deliveryId } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "webhook.deadletter_discarded",
        entityType: "WebhookDelivery",
        entityId: deliveryId,
        metadata: JSON.stringify({ event: row.event, endpointId: row.endpointId }),
      },
    }),
  ]);

  revalidatePath("/admin");
  return { success: true };
}
