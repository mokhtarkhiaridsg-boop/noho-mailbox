// iter-167 — Member-registered webhook dispatcher.
//
// Counterpart to lib/webhooks.ts (admin-side). The single side-effect
// call is `fireMemberWebhooks(userId, event, payload)`. It loads every
// active webhook owned by THAT user that subscribes to the event,
// signs the payload with each webhook's per-row HMAC secret, posts to
// the user-supplied URL, logs the attempt, and schedules a retry on
// failure. Errors are swallowed so the calling action's commit path
// is never blocked.
//
// Privacy boundary: the userId filter is the entire reason this lib is
// separate from the admin webhook system. We MUST never broadcast a
// member's events to a different member's webhook.
//
// Auto-disable: after 50 consecutive failures the webhook flips
// `active = false` so a misconfigured URL doesn't burn outbound
// bandwidth forever.

import { prisma } from "@/lib/prisma";
import { createHmac, randomBytes } from "node:crypto";

// Same backoff curve as iter-134 admin webhook retries: 6 attempts
// total, exponentially spaced. After exhausting attempts the row is
// dead-lettered (member can replay manually from the panel).
export const MEMBER_RETRY_DELAYS_SEC = [60, 5 * 60, 30 * 60, 2 * 60 * 60, 12 * 60 * 60] as const;
export const MEMBER_MAX_ATTEMPTS = MEMBER_RETRY_DELAYS_SEC.length + 1;

// Auto-disable threshold — protects us from a permanently 4xx URL.
export const AUTO_DISABLE_AFTER = 50;

// Member-scoped event vocabulary. Smaller than the admin set on
// purpose: members only see their OWN events, never aggregate / ops
// signals (no `id.expiring` for other members, no `holiday.notice_sent`
// roll-ups, etc).
export type MemberWebhookEvent =
  | "mail.arrived"
  | "mail.scanned"
  | "mail.picked_up"
  | "mail.forwarded"
  | "package.arrived"
  | "package.picked_up"
  | "id.expiring"
  | "plan.expiring_soon"
  | "appointment.upcoming"
  | "test.ping";

export const ALL_MEMBER_WEBHOOK_EVENTS: { key: MemberWebhookEvent; label: string; description: string }[] = [
  { key: "mail.arrived",         label: "Mail arrived",         description: "Any letter/document arrived for you" },
  { key: "mail.scanned",         label: "Mail scanned",         description: "We scanned a letter and the image is available" },
  { key: "mail.picked_up",       label: "Mail picked up",       description: "You picked up mail at the bureau" },
  { key: "mail.forwarded",       label: "Mail forwarded",       description: "Your mail was forwarded to a saved address" },
  { key: "package.arrived",      label: "Package arrived",      description: "A package landed in your mailbox" },
  { key: "package.picked_up",    label: "Package picked up",    description: "You signed for a package" },
  { key: "id.expiring",          label: "ID expiring soon",     description: "One of your IDs expires within 90 days" },
  { key: "plan.expiring_soon",   label: "Plan expiring soon",   description: "Mailbox plan due within 14 days" },
  { key: "appointment.upcoming", label: "Appointment upcoming", description: "Notary or pickup appointment in the next 24h" },
  { key: "test.ping",            label: "Test ping",            description: "Manual test from the dashboard" },
];

export type MemberWebhookPayload = {
  text: string;                                                 // human-readable summary
  url?: string;                                                 // optional dashboard deeplink
  detail?: Record<string, string | number | boolean | null>;    // structured event data
};

// Generate a per-webhook secret. Returned plaintext is shown ONCE in
// the create modal; only this string ever appears in plaintext.
export function generateWebhookSecret(): string {
  return `whsec_${randomBytes(24).toString("hex")}`; // 48 hex chars = 192 bits
}

// Helper for the receiver to verify our signature on their side.
// Same shape we send: `X-NOHO-Signature: sha256=<hex>` over the raw
// request body using the shared secret.
export function signPayload(secret: string, body: string): string {
  return `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;
}

export async function fireMemberWebhooks(
  userId: string,
  event: MemberWebhookEvent,
  payload: MemberWebhookPayload,
): Promise<void> {
  let webhooks: Array<{ id: string; url: string; secret: string; events: string }>;
  try {
    webhooks = await prisma.memberWebhook.findMany({
      where: { userId, active: true, revokedAt: null },
      select: { id: true, url: true, secret: true, events: true },
    });
  } catch {
    // Schema not pushed yet — silent no-op so the feature ships clean
    // when the migration hasn't run on this environment.
    return;
  }
  if (webhooks.length === 0) return;

  const matches = webhooks.filter((w) => {
    try {
      const evts = JSON.parse(w.events) as string[];
      return Array.isArray(evts) && evts.includes(event);
    } catch {
      return false;
    }
  });
  if (matches.length === 0) return;

  await Promise.allSettled(matches.map((w) => deliver(w, event, payload)));
}

async function deliver(
  webhook: { id: string; url: string; secret: string },
  event: MemberWebhookEvent,
  payload: MemberWebhookPayload,
): Promise<void> {
  const body = {
    event,
    text: payload.text,
    url: payload.url ?? null,
    detail: payload.detail ?? {},
    sentAt: new Date().toISOString(),
  };
  const bodyJson = JSON.stringify(body);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-NOHO-Event": event,
    "X-NOHO-Signature": signPayload(webhook.secret, bodyJson),
    "User-Agent": "NOHOMailbox-Webhook/1.0",
  };

  const start = Date.now();
  let status: "ok" | "failed" = "ok";
  let httpStatus: number | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(webhook.url, {
      method: "POST",
      headers,
      body: bodyJson,
      signal: AbortSignal.timeout(8000),
      // Disallow following redirects: the receiver must own the URL,
      // not bounce us to a different one.
      redirect: "manual",
    });
    httpStatus = res.status;
    if (!res.ok) {
      status = "failed";
      error = `HTTP ${res.status}`;
    }
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : String(e);
  }

  const durationMs = Date.now() - start;
  const now = new Date();
  const nextRetryAt = status === "ok" ? null : new Date(now.getTime() + MEMBER_RETRY_DELAYS_SEC[0]! * 1000);

  // Best-effort log + counter update + auto-disable check.
  try {
    await prisma.$transaction([
      prisma.memberWebhookDelivery.create({
        data: {
          webhookId: webhook.id,
          event,
          payload: bodyJson.slice(0, 4000),
          status,
          httpStatus,
          error,
          durationMs,
          attempt: 1,
          nextRetryAt,
          lastTriedAt: now,
        },
      }),
      prisma.memberWebhook.update({
        where: { id: webhook.id },
        data: {
          lastFiredAt: now,
          lastStatus: status === "ok" ? "ok" : `failed:${httpStatus ?? "net"}`,
          failureCount: status === "ok" ? 0 : { increment: 1 },
        },
      }),
    ]);

    // Auto-disable after threshold. Re-read failureCount to decide.
    if (status !== "ok") {
      const fresh = await prisma.memberWebhook.findUnique({
        where: { id: webhook.id },
        select: { failureCount: true, active: true, userId: true },
      });
      if (fresh && fresh.active && fresh.failureCount >= AUTO_DISABLE_AFTER) {
        await prisma.memberWebhook.update({
          where: { id: webhook.id },
          data: { active: false },
        });
        await prisma.auditLog.create({
          data: {
            actorId: "system",
            actorRole: "SYSTEM",
            action: "member.webhook_auto_disabled",
            entityType: "MemberWebhook",
            entityId: webhook.id,
            metadata: JSON.stringify({ failureCount: fresh.failureCount, userId: fresh.userId }),
          },
        }).catch(() => undefined);
      }
    }

    // Trim oldest successful deliveries to keep storage bounded.
    const okCount = await prisma.memberWebhookDelivery.count({
      where: { webhookId: webhook.id, status: "ok", deadLettered: false },
    });
    if (okCount > 200) {
      const oldest = await prisma.memberWebhookDelivery.findMany({
        where: { webhookId: webhook.id, status: "ok", deadLettered: false },
        orderBy: { sentAt: "asc" },
        take: okCount - 200,
        select: { id: true },
      });
      if (oldest.length > 0) {
        await prisma.memberWebhookDelivery.deleteMany({ where: { id: { in: oldest.map((o) => o.id) } } });
      }
    }
  } catch {
    /* swallow logging errors */
  }
}

// Cron-callable retry sweep — same shape as drainWebhookRetries() in
// the admin webhook lib. Wires up via /api/cron/retry-member-webhooks.
export async function retryMemberDelivery(deliveryId: string): Promise<{
  status: "ok" | "failed" | "dead_lettered" | "skipped";
  attempt: number;
}> {
  const row = await prisma.memberWebhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { webhook: { select: { id: true, url: true, secret: true, active: true, revokedAt: true } } },
  });
  if (!row) return { status: "skipped", attempt: 0 };
  if (row.deadLettered) return { status: "skipped", attempt: row.attempt };
  if (!row.webhook.active || row.webhook.revokedAt) {
    await prisma.memberWebhookDelivery.update({
      where: { id: deliveryId },
      data: { deadLettered: true, nextRetryAt: null, error: "Webhook disabled" },
    });
    return { status: "dead_lettered", attempt: row.attempt };
  }
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-NOHO-Event": row.event,
    "X-NOHO-Signature": signPayload(row.webhook.secret, row.payload),
    "X-NOHO-Retry": String(row.attempt + 1),
    "User-Agent": "NOHOMailbox-Webhook/1.0",
  };
  const start = Date.now();
  let status: "ok" | "failed" = "ok";
  let httpStatus: number | null = null;
  let error: string | null = null;
  try {
    const res = await fetch(row.webhook.url, {
      method: "POST",
      headers,
      body: row.payload,
      signal: AbortSignal.timeout(8000),
      redirect: "manual",
    });
    httpStatus = res.status;
    if (!res.ok) { status = "failed"; error = `HTTP ${res.status}`; }
  } catch (e) {
    status = "failed";
    error = e instanceof Error ? e.message : String(e);
  }
  const durationMs = Date.now() - start;
  const now = new Date();
  const nextAttempt = row.attempt + 1;
  const exhausted = nextAttempt >= MEMBER_MAX_ATTEMPTS;
  const nextRetryAt =
    status === "ok"
      ? null
      : exhausted
        ? null
        : new Date(now.getTime() + MEMBER_RETRY_DELAYS_SEC[Math.min(nextAttempt - 1, MEMBER_RETRY_DELAYS_SEC.length - 1)]! * 1000);
  await prisma.$transaction([
    prisma.memberWebhookDelivery.update({
      where: { id: deliveryId },
      data: { attempt: nextAttempt, status, httpStatus, error, durationMs, lastTriedAt: now, nextRetryAt, deadLettered: status !== "ok" && exhausted },
    }),
    prisma.memberWebhook.update({
      where: { id: row.webhook.id },
      data: {
        lastFiredAt: now,
        lastStatus: status === "ok" ? "ok" : `failed:${httpStatus ?? "net"}`,
        failureCount: status === "ok" ? 0 : { increment: 1 },
      },
    }),
  ]);
  if (status !== "ok" && exhausted) return { status: "dead_lettered", attempt: nextAttempt };
  return { status, attempt: nextAttempt };
}

export async function drainMemberWebhookRetries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
  skipped: number;
}> {
  const now = new Date();
  const due = await prisma.memberWebhookDelivery.findMany({
    where: { deadLettered: false, status: "failed", nextRetryAt: { lte: now } },
    select: { id: true },
    take: 100,
  });
  let succeeded = 0, failed = 0, deadLettered = 0, skipped = 0;
  for (const r of due) {
    const result = await retryMemberDelivery(r.id);
    if (result.status === "ok") succeeded++;
    else if (result.status === "dead_lettered") deadLettered++;
    else if (result.status === "skipped") skipped++;
    else failed++;
  }
  return { processed: due.length, succeeded, failed, deadLettered, skipped };
}
