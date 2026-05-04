// Sender for Campaign 1 — Business-tier upsell.
//
// USAGE:
//   set -a && source .env && set +a
//   node sales-kit/_send-campaign-1.mjs --dry          # preview only (default)
//   node sales-kit/_send-campaign-1.mjs --send         # actually send
//
// Sends 6 personalized emails via Resend. Logs each to the EmailLog table
// (status: "sent" or "failed"). Uses 5-second spacing between sends to keep
// the new domain warm.

import { readFileSync } from "node:fs";
import { Resend } from "resend";
import { createClient } from "@libsql/client";

const args = new Set(process.argv.slice(2));
const SEND = args.has("--send");
const FROM = "Mokhtar at NOHO Mailbox <hello@nohomailbox.org>";
const REPLY_TO = "hello@nohomailbox.org";

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const TURSO_DATABASE_URL = process.env.TURSO_DATABASE_URL;
const TURSO_AUTH_TOKEN = process.env.TURSO_AUTH_TOKEN;

if (!RESEND_API_KEY) {
  console.error("Missing RESEND_API_KEY. Source .env first.");
  process.exit(1);
}

const resend = new Resend(RESEND_API_KEY);
const db = TURSO_DATABASE_URL && TURSO_AUTH_TOKEN
  ? createClient({ url: TURSO_DATABASE_URL, authToken: TURSO_AUTH_TOKEN })
  : null;

const drafts = JSON.parse(
  readFileSync(new URL("./_campaign-1-drafts.json", import.meta.url), "utf8"),
);

console.log(`\nCampaign: ${drafts.campaign}`);
console.log(`From: ${drafts.from}`);
console.log(`Drafts: ${drafts.drafts.length}`);
console.log(`Mode: ${SEND ? "LIVE SEND" : "DRY RUN (use --send to actually send)"}\n`);

function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

async function logEmail({ userId, to, subject, body, status, providerId, error }) {
  if (!db) return;
  try {
    await db.execute({
      sql: `INSERT INTO EmailLog
        (id, userId, toEmail, fromEmail, subject, body, kind, status, provider, providerId, error, createdAt, sentAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), ?)`,
      args: [
        cuid(),
        userId,
        to,
        FROM,
        subject,
        body,
        "campaign-1-upsell",
        status,
        "resend",
        providerId ?? null,
        error ?? null,
        status === "sent" ? new Date().toISOString() : null,
      ],
    });
  } catch (e) {
    console.warn(`  (could not log to EmailLog: ${e.message})`);
  }
}

let sent = 0;
let failed = 0;

for (const [i, d] of drafts.drafts.entries()) {
  const num = i + 1;
  console.log(`[${num}/${drafts.drafts.length}] ${d.firstName} <${d.to}>`);
  console.log(`  Subject: ${d.subject}`);

  if (!SEND) {
    console.log(`  → DRY: would send. ${d.html.length} bytes of HTML.\n`);
    continue;
  }

  try {
    const res = await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to: [d.to],
      subject: d.subject,
      html: d.html,
      headers: {
        "List-Unsubscribe": "<mailto:hello@nohomailbox.org?subject=unsubscribe>",
      },
    });

    if (res.error) {
      console.log(`  ✗ FAILED: ${res.error.message ?? JSON.stringify(res.error)}`);
      await logEmail({
        userId: d.userId,
        to: d.to,
        subject: d.subject,
        body: d.html,
        status: "failed",
        error: res.error.message ?? JSON.stringify(res.error),
      });
      failed++;
    } else {
      console.log(`  ✓ Sent — Resend id ${res.data?.id ?? "?"}`);
      await logEmail({
        userId: d.userId,
        to: d.to,
        subject: d.subject,
        body: d.html,
        status: "sent",
        providerId: res.data?.id ?? null,
      });
      sent++;
    }
  } catch (e) {
    console.log(`  ✗ ERROR: ${e.message}`);
    await logEmail({
      userId: d.userId,
      to: d.to,
      subject: d.subject,
      body: d.html,
      status: "failed",
      error: e.message,
    });
    failed++;
  }

  // Spacing — 5 seconds between sends to keep the domain warm.
  if (num < drafts.drafts.length) {
    await new Promise((r) => setTimeout(r, 5000));
  }
}

console.log(`\nDone. ${SEND ? `Sent ${sent}, failed ${failed}.` : "Dry run."}\n`);

if (db) {
  // libsql client doesn't need explicit close, but be polite.
  process.exit(0);
}
