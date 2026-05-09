// iter-103 — Outbound webhook bridge.
// iter-134 — added retry & dead-letter queue.
//
// `fireWebhooks(event, payload)` is the single side-effect call sites use.
// It runs fire-and-forget against every active WebhookEndpoint subscribed
// to that event, formats the payload per provider (Slack | Discord |
// generic), and writes a WebhookDelivery row so admins can audit what
// went out. Errors are swallowed so the calling action's commit path
// is never blocked by a misconfigured webhook.
//
// Failed deliveries auto-schedule a retry via `nextRetryAt`. The cron at
// /api/cron/retry-webhooks drains those rows on an exponential backoff
// schedule. After MAX_ATTEMPTS the row is dead-lettered (admin can still
// replay it manually from the webhooks panel).

import { prisma } from "@/lib/prisma";
import { createHmac } from "node:crypto";

// iter-134 — Exponential backoff schedule (in seconds from last attempt).
// Index 0 = delay until 2nd attempt, index 1 = until 3rd, etc.
// Final entry capped at 12h. After 5 attempts the row is dead-lettered.
export const RETRY_DELAYS_SEC = [60, 5 * 60, 30 * 60, 2 * 60 * 60, 12 * 60 * 60] as const;
export const MAX_ATTEMPTS = RETRY_DELAYS_SEC.length + 1; // 6 total tries

export type WebhookEvent =
  | "mail.arrived"
  | "mail.picked_up"
  | "dropoff.logged"
  | "appointment.booked"
  | "id.expiring"
  | "storage.dispute_filed"
  | "storage.threshold_alert"
  | "door.code_issued"
  | "customer.of_month_awarded"
  | "renewal.discount_offer_sent"
  | "billing.auto_renewed"
  | "wallet.auto_top_up_fired"
  | "holiday.notice_sent"
  | "plan.upgraded"
  | "mailer.reply_received"
  | "suite.transfer_requested"
  | "test.ping";

export const ALL_WEBHOOK_EVENTS: { key: WebhookEvent; label: string; example: string }[] = [
  { key: "mail.arrived",         label: "Mail / package arrived", example: "📦 Package arrived for Mariem (suite #042) — UPS 1Z…" },
  { key: "mail.picked_up",       label: "Mail picked up",         example: "✅ Mariem picked up 2 packages from suite #042" },
  { key: "dropoff.logged",       label: "External dropoff logged", example: "📥 USPS dropoff from John D. (carrier-paid label)" },
  { key: "appointment.booked",   label: "Pickup appointment booked", example: "🗓 Karim booked pickup Tue 2:30pm (suite #043)" },
  { key: "id.expiring",          label: "Customer ID expiring",   example: "⚠️ Karim's DL expires in 7 days" },
  { key: "storage.dispute_filed", label: "Storage-fee dispute filed", example: "⚖️ Mariem disputed a $5.00 storage fee" },
  { key: "storage.threshold_alert", label: "Package crossed storage threshold", example: "📦 Karim · suite #042 · package on shelf 30 days · $156.00 (30d)" },
  { key: "door.code_issued",        label: "Door access code issued",          example: "🔑 New door code · Karim · suite #042 · rotates in 90d" },
  { key: "customer.of_month_awarded", label: "Customer of the month awarded",   example: "🌟 Mariem is Customer of the Month for May 2026" },
  { key: "renewal.discount_offer_sent", label: "Renewal discount offer sent",   example: "🎁 Karim got a 10% renewal discount (health: Watch)" },
  { key: "billing.auto_renewed", label: "Auto-renewal completed", example: "🔁 Auto-renewed Karim · $175 · Business 1mo" },
  { key: "wallet.auto_top_up_fired", label: "Wallet auto top-up triggered", example: "💳 Auto top-up fired for Mariem · $25 request" },
  { key: "holiday.notice_sent",  label: "Holiday closure notice sent",   example: "📣 Holiday notice sent · Memorial Day · 84/86 recipients" },
  { key: "plan.upgraded",        label: "Member upgraded plan",          example: "⬆️ Karim upgraded Basic → Business · charged $480" },
  { key: "mailer.reply_received", label: "Customer reply landed in mailbox", example: "📨 New reply from sarah@example.com · \"Question about my package\"" },
  { key: "suite.transfer_requested", label: "Member requested suite transfer", example: "🔀 Karim wants to move from suite #042 → #143" },
  { key: "test.ping",            label: "Test ping",              example: "🧪 NOHO webhook test — all good." },
];

export type WebhookPayload = {
  text: string;            // human-readable, used for Slack/Discord and as fallback
  emoji?: string;          // fallback to event default
  url?: string;            // optional click-through (e.g. dashboard deeplink)
  detail?: Record<string, string | number | boolean | null>; // structured data for generic format
};

export async function fireWebhooks(event: WebhookEvent, payload: WebhookPayload): Promise<void> {
  let endpoints: Array<{ id: string; url: string; format: string; events: string; secret: string | null }>;
  try {
    endpoints = await prisma.webhookEndpoint.findMany({
      where: { active: true },
      select: { id: true, url: true, format: true, events: true, secret: true },
    });
  } catch (e) {
    // Schema not yet pushed to this DB — silent no-op so feature ships
    // cleanly when the migration hasn't run.
    return;
  }
  if (endpoints.length === 0) return;

  const matches = endpoints.filter((e) => {
    try {
      const evts = JSON.parse(e.events) as string[];
      return Array.isArray(evts) && evts.includes(event);
    } catch {
      return false;
    }
  });

  await Promise.allSettled(matches.map((ep) => deliver(ep, event, payload)));
}

async function deliver(
  ep: { id: string; url: string; format: string; secret: string | null },
  event: WebhookEvent,
  payload: WebhookPayload,
): Promise<void> {
  const body = formatBody(ep.format, event, payload);
  const bodyJson = JSON.stringify(body);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ep.secret) {
    const sig = createHmac("sha256", ep.secret).update(bodyJson).digest("hex");
    headers["X-NOHO-Signature"] = `sha256=${sig}`;
  }

  const start = Date.now();
  let status = "ok";
  let httpStatus: number | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(ep.url, {
      method: "POST",
      headers,
      body: bodyJson,
      signal: AbortSignal.timeout(8000),
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
  // iter-134 — On failure, schedule retry attempt #2 at +60s. Successful
  // deliveries leave nextRetryAt null. attempt is always 1 here (this is
  // the FIRST try); cron uses retryDelivery() for subsequent attempts.
  const nextRetryAt = status === "ok" ? null : new Date(now.getTime() + RETRY_DELAYS_SEC[0]! * 1000);

  // Best-effort log + lastFiredAt update. Trim oldest deliveries to keep
  // storage bounded (capped at ~200 per endpoint, but never trim rows
  // still pending retry or dead-lettered — admin needs visibility).
  try {
    await prisma.$transaction([
      prisma.webhookDelivery.create({
        data: {
          endpointId: ep.id,
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
      prisma.webhookEndpoint.update({
        where: { id: ep.id },
        data: { lastFiredAt: now, lastStatus: status === "ok" ? "ok" : `failed:${httpStatus ?? "net"}` },
      }),
    ]);
    // Trim — keep the 200 most recent SUCCESSFUL deliveries per endpoint.
    // Failed/pending/dead-lettered rows are preserved so admin can audit
    // them no matter how busy the endpoint gets.
    const count = await prisma.webhookDelivery.count({
      where: { endpointId: ep.id, status: "ok", deadLettered: false },
    });
    if (count > 200) {
      const oldest = await prisma.webhookDelivery.findMany({
        where: { endpointId: ep.id, status: "ok", deadLettered: false },
        orderBy: { sentAt: "asc" },
        take: count - 200,
        select: { id: true },
      });
      if (oldest.length > 0) {
        await prisma.webhookDelivery.deleteMany({ where: { id: { in: oldest.map((o) => o.id) } } });
      }
    }
  } catch {
    // Logging itself failed — swallow.
  }
}

// iter-134 — Re-fire a previously-failed delivery and update the row in
// place. Used by the retry cron. Returns the new attempt count + status.
// If the endpoint has been deleted or paused, the row is dead-lettered
// immediately (no point retrying against an inactive target).
export async function retryDelivery(deliveryId: string): Promise<{
  status: "ok" | "failed" | "dead_lettered" | "skipped";
  attempt: number;
  nextRetryAt: Date | null;
  error?: string;
}> {
  const row = await prisma.webhookDelivery.findUnique({
    where: { id: deliveryId },
    include: { endpoint: { select: { id: true, url: true, format: true, secret: true, active: true } } },
  });
  if (!row) return { status: "skipped", attempt: 0, nextRetryAt: null, error: "Delivery not found" };
  if (row.deadLettered) {
    return { status: "skipped", attempt: row.attempt, nextRetryAt: null, error: "Already dead-lettered" };
  }
  if (!row.endpoint.active) {
    // Endpoint paused since the original attempt — dead-letter and stop.
    await prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: { deadLettered: true, nextRetryAt: null, error: "Endpoint paused" },
    });
    return { status: "dead_lettered", attempt: row.attempt, nextRetryAt: null, error: "Endpoint paused" };
  }

  const ep = row.endpoint;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (ep.secret) {
    const sig = createHmac("sha256", ep.secret).update(row.payload).digest("hex");
    headers["X-NOHO-Signature"] = `sha256=${sig}`;
  }

  const start = Date.now();
  let status: "ok" | "failed" = "ok";
  let httpStatus: number | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(ep.url, {
      method: "POST",
      headers,
      body: row.payload,
      signal: AbortSignal.timeout(8000),
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
  const nextAttempt = row.attempt + 1;
  const exhausted = nextAttempt >= MAX_ATTEMPTS;
  // Schedule the NEXT retry only if we still have attempts left + this
  // one failed. exhausted == true → dead-letter the row.
  const nextRetryAt =
    status === "ok"
      ? null
      : exhausted
        ? null
        : new Date(now.getTime() + RETRY_DELAYS_SEC[Math.min(nextAttempt - 1, RETRY_DELAYS_SEC.length - 1)]! * 1000);

  await prisma.$transaction([
    prisma.webhookDelivery.update({
      where: { id: deliveryId },
      data: {
        attempt: nextAttempt,
        status,
        httpStatus,
        error,
        durationMs,
        lastTriedAt: now,
        nextRetryAt,
        deadLettered: status !== "ok" && exhausted,
      },
    }),
    prisma.webhookEndpoint.update({
      where: { id: ep.id },
      data: { lastFiredAt: now, lastStatus: status === "ok" ? "ok" : `failed:${httpStatus ?? "net"}` },
    }),
  ]);

  if (status !== "ok" && exhausted) {
    return { status: "dead_lettered", attempt: nextAttempt, nextRetryAt: null, error: error ?? "exhausted" };
  }
  return { status, attempt: nextAttempt, nextRetryAt, error: error ?? undefined };
}

// iter-134 — Drain pending retries: pulls every delivery whose
// nextRetryAt has come due and replays it. Caller is the cron route.
export async function drainWebhookRetries(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  deadLettered: number;
  skipped: number;
}> {
  const now = new Date();
  const due = await prisma.webhookDelivery.findMany({
    where: {
      deadLettered: false,
      status: "failed",
      nextRetryAt: { lte: now },
    },
    select: { id: true },
    take: 100, // safety cap per cron tick
  });
  let succeeded = 0;
  let failed = 0;
  let deadLettered = 0;
  let skipped = 0;
  for (const r of due) {
    const result = await retryDelivery(r.id);
    if (result.status === "ok") succeeded++;
    else if (result.status === "dead_lettered") deadLettered++;
    else if (result.status === "skipped") skipped++;
    else failed++;
  }
  return { processed: due.length, succeeded, failed, deadLettered, skipped };
}

function formatBody(format: string, event: WebhookEvent, payload: WebhookPayload): unknown {
  const text = payload.emoji ? `${payload.emoji} ${payload.text}` : payload.text;
  if (format === "slack") {
    // Slack incoming-webhook format with optional context block for URL.
    const blocks: unknown[] = [
      { type: "section", text: { type: "mrkdwn", text } },
    ];
    if (payload.url) {
      blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: `<${payload.url}|Open in dashboard>` }] });
    }
    return { text, blocks, username: "NOHO Mailbox", icon_emoji: ":mailbox_with_mail:" };
  }
  if (format === "discord") {
    return {
      content: text,
      username: "NOHO Mailbox",
      embeds: payload.url ? [{ url: payload.url, title: "Open in dashboard", color: 0x337485 }] : undefined,
    };
  }
  // Generic JSON.
  return {
    event,
    text,
    url: payload.url ?? null,
    detail: payload.detail ?? {},
    sentAt: new Date().toISOString(),
  };
}
