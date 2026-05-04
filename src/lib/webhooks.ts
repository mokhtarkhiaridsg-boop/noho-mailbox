// iter-103 — Outbound webhook bridge.
//
// `fireWebhooks(event, payload)` is the single side-effect call sites use.
// It runs fire-and-forget against every active WebhookEndpoint subscribed
// to that event, formats the payload per provider (Slack | Discord |
// generic), and writes a WebhookDelivery row so admins can audit what
// went out. Errors are swallowed so the calling action's commit path
// is never blocked by a misconfigured webhook.

import { prisma } from "@/lib/prisma";
import { createHmac } from "node:crypto";

export type WebhookEvent =
  | "mail.arrived"
  | "mail.picked_up"
  | "dropoff.logged"
  | "appointment.booked"
  | "id.expiring"
  | "storage.dispute_filed"
  | "billing.auto_renewed"
  | "wallet.auto_top_up_fired"
  | "holiday.notice_sent"
  | "plan.upgraded"
  | "mailer.reply_received"
  | "test.ping";

export const ALL_WEBHOOK_EVENTS: { key: WebhookEvent; label: string; example: string }[] = [
  { key: "mail.arrived",         label: "Mail / package arrived", example: "📦 Package arrived for Mariem (suite #042) — UPS 1Z…" },
  { key: "mail.picked_up",       label: "Mail picked up",         example: "✅ Mariem picked up 2 packages from suite #042" },
  { key: "dropoff.logged",       label: "External dropoff logged", example: "📥 USPS dropoff from John D. (carrier-paid label)" },
  { key: "appointment.booked",   label: "Pickup appointment booked", example: "🗓 Karim booked pickup Tue 2:30pm (suite #043)" },
  { key: "id.expiring",          label: "Customer ID expiring",   example: "⚠️ Karim's DL expires in 7 days" },
  { key: "storage.dispute_filed", label: "Storage-fee dispute filed", example: "⚖️ Mariem disputed a $5.00 storage fee" },
  { key: "billing.auto_renewed", label: "Auto-renewal completed", example: "🔁 Auto-renewed Karim · $175 · Business 1mo" },
  { key: "wallet.auto_top_up_fired", label: "Wallet auto top-up triggered", example: "💳 Auto top-up fired for Mariem · $25 request" },
  { key: "holiday.notice_sent",  label: "Holiday closure notice sent",   example: "📣 Holiday notice sent · Memorial Day · 84/86 recipients" },
  { key: "plan.upgraded",        label: "Member upgraded plan",          example: "⬆️ Karim upgraded Basic → Business · charged $480" },
  { key: "mailer.reply_received", label: "Customer reply landed in mailbox", example: "📨 New reply from sarah@example.com · \"Question about my package\"" },
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
  // Best-effort log + lastFiredAt update. Trim oldest deliveries to keep
  // storage bounded (capped at ~200 per endpoint).
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
        },
      }),
      prisma.webhookEndpoint.update({
        where: { id: ep.id },
        data: { lastFiredAt: new Date(), lastStatus: status === "ok" ? "ok" : `failed:${httpStatus ?? "net"}` },
      }),
    ]);
    // Trim — keep the 200 most recent per endpoint.
    const count = await prisma.webhookDelivery.count({ where: { endpointId: ep.id } });
    if (count > 200) {
      const oldest = await prisma.webhookDelivery.findMany({
        where: { endpointId: ep.id },
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
