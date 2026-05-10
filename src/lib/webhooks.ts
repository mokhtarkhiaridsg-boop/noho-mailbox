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
  | "cashdrawer.variance_flagged"
  | "forwarding.cost_share_split"
  | "family_transfer.requested"
  | "family_transfer.approved"
  | "fraud.flag_raised"
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
  { key: "cashdrawer.variance_flagged", label: "Cash-drawer variance flagged", example: "💰 Drawer #042 closed −$8.25 over expected · needs sign-off" },
  { key: "forwarding.cost_share_split", label: "Forwarding cost-share split applied", example: "🤝 Karim + Mariem batched to NYC 10128 · saved $4.25 each" },
  { key: "family_transfer.requested", label: "Mailbox family-transfer requested", example: "👨‍👩‍👧 Karim filed transfer of suite #042 → spouse Mariem (in-person visit pending)" },
  { key: "family_transfer.approved",  label: "Mailbox family-transfer approved",  example: "✅ Suite #042 family-transfer approved · 1 SharedAccess revoked" },
  { key: "fraud.flag_raised",         label: "Smart fraud signal raised",          example: "🚨 [HIGH] Suite #042 · 12 packages from same sender in 7 days" },
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
  // iter-185 — Pushover + ntfy use provider-specific request shapes
  // (form-encoded for Pushover, plain-text for ntfy). Both swap the
  // standard JSON body + headers for their own. Slack/Discord/generic
  // keep the iter-103 JSON path.
  const built = buildRequest(ep.format, ep.url, event, payload);
  const headers: Record<string, string> = { ...built.headers };
  if (ep.secret && built.signableBody) {
    const sig = createHmac("sha256", ep.secret).update(built.signableBody).digest("hex");
    headers["X-NOHO-Signature"] = `sha256=${sig}`;
  }

  const start = Date.now();
  let status = "ok";
  let httpStatus: number | null = null;
  let error: string | null = null;

  try {
    const res = await fetch(built.url, {
      method: "POST",
      headers,
      body: built.body,
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
          payload: (built.persistableBody ?? "").slice(0, 4000),
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
  // iter-185 — On retry we replay the persisted body with the format-
  // appropriate URL + headers. For Pushover/ntfy `row.payload` is
  // already in their wire format (form-string for pushover, plain
  // text for ntfy) — the persistence path stored the right shape.
  const isPushover = ep.format === "pushover";
  const isNtfy = ep.format === "ntfy";
  const headers: Record<string, string> = isPushover
    ? { "Content-Type": "application/x-www-form-urlencoded" }
    : isNtfy
      ? { "Content-Type": "text/plain; charset=utf-8" }
      : { "Content-Type": "application/json" };
  // ntfy retry: rebuild headers from the raw event/payload would be
  // ideal but we don't keep those — payload is the body only. Slack/
  // Discord/generic + Pushover sign with the secret if set; ntfy doesn't.
  if (ep.secret && !isNtfy) {
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

// iter-185 — Build the per-provider request shape (URL + headers + body).
// Slack / Discord / generic share JSON-POST conventions. Pushover uses
// form-encoded with `token`+`user`+`message` fields. ntfy uses raw
// text-body POST with `Title:` / `Tags:` / `Priority:` headers.
//
// Return contract:
//   - `body` is what gets POSTed (string, type-aligned to headers).
//   - `signableBody` is what we HMAC-sign with the secret (if set).
//     ntfy is signature-less by spec, so this is null for ntfy.
//   - `persistableBody` is what we write to WebhookDelivery.payload
//     for retry replay — same as body for all formats.
type BuiltRequest = {
  url: string;
  headers: Record<string, string>;
  body: string;
  signableBody: string | null;
  persistableBody: string;
};

function buildRequest(format: string, url: string, event: WebhookEvent, payload: WebhookPayload): BuiltRequest {
  const text = payload.emoji ? `${payload.emoji} ${payload.text}` : payload.text;

  if (format === "pushover") {
    // Pushover expects token + user in the form body. Admin pre-bakes
    // them into the URL as ?token=…&user=… and we lift them out so
    // the actual POST goes to the canonical endpoint.
    let token = "", userKey = "", parsedHost = "https://api.pushover.net";
    try {
      const u = new URL(url);
      token = u.searchParams.get("token") ?? "";
      userKey = u.searchParams.get("user") ?? "";
      parsedHost = `${u.protocol}//${u.host}`;
    } catch { /* swallow */ }
    const form = new URLSearchParams();
    form.set("token", token);
    form.set("user", userKey);
    form.set("title", `NOHO Mailbox · ${event}`);
    form.set("message", text.slice(0, 1024));
    if (payload.url) form.set("url", payload.url);
    if (payload.url) form.set("url_title", "Open in dashboard");
    const body = form.toString();
    return {
      url: `${parsedHost}/1/messages.json`,
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signableBody: body,
      persistableBody: body,
    };
  }

  if (format === "ntfy") {
    // ntfy: plain text body, headers carry title/priority/tags/click.
    const headers: Record<string, string> = {
      "Content-Type": "text/plain; charset=utf-8",
      Title: `NOHO Mailbox · ${event}`,
      Tags: payload.emoji ? "mailbox," + payload.emoji.replace(/[^\x20-\x7E]/g, "").trim() || "mailbox" : "mailbox",
      Priority: "default",
    };
    if (payload.url) headers.Click = payload.url;
    return {
      url,
      headers,
      body: text,
      signableBody: null,            // ntfy is signature-less
      persistableBody: text,
    };
  }

  // ── JSON-body formats (slack / discord / generic) ──────────────
  let bodyObj: unknown;
  if (format === "slack") {
    const blocks: unknown[] = [{ type: "section", text: { type: "mrkdwn", text } }];
    if (payload.url) {
      blocks.push({ type: "context", elements: [{ type: "mrkdwn", text: `<${payload.url}|Open in dashboard>` }] });
    }
    bodyObj = { text, blocks, username: "NOHO Mailbox", icon_emoji: ":mailbox_with_mail:" };
  } else if (format === "discord") {
    bodyObj = {
      content: text,
      username: "NOHO Mailbox",
      embeds: payload.url ? [{ url: payload.url, title: "Open in dashboard", color: 0x337485 }] : undefined,
    };
  } else {
    bodyObj = {
      event, text,
      url: payload.url ?? null,
      detail: payload.detail ?? {},
      sentAt: new Date().toISOString(),
    };
  }
  const bodyJson = JSON.stringify(bodyObj);
  return {
    url,
    headers: { "Content-Type": "application/json" },
    body: bodyJson,
    signableBody: bodyJson,
    persistableBody: bodyJson,
  };
}
