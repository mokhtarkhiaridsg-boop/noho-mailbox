// Campaign 3 — Refer-a-friend push to existing customers.
//
// Pulls all active non-Business customers (Business got Campaign 1 yesterday,
// don't double-tap them within 24 hours) plus skips test/internal accounts.
// For each, generates a personalized email driving them to /refer where they
// see their auto-generated code and one-tap share buttons.
//
// USAGE:
//   set -a && source .env && set +a
//   node sales-kit/_send-campaign-3.mjs           # dry run preview
//   node sales-kit/_send-campaign-3.mjs --send    # actually send

import { Resend } from "resend";
import { createClient } from "@libsql/client";

const args = new Set(process.argv.slice(2));
const SEND = args.has("--send");
const FROM = "Mokhtar at NOHO Mailbox <hello@nohomailbox.org>";
const REPLY_TO = "hello@nohomailbox.org";

if (!process.env.RESEND_API_KEY) {
  console.error("Missing RESEND_API_KEY. Source .env first.");
  process.exit(1);
}

const resend = new Resend(process.env.RESEND_API_KEY);
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Skip patterns — internal accounts and test data.
const SKIP_EMAIL_DOMAINS = ["nohomailbox.test", "noho.test", "noho.local", "noho.com"];
const SKIP_EMAILS = new Set([
  "mokhtar.khiari.dsg1@gmail.com", // owner
  "eklwmqmek@gkeg.com",             // test data
  "verify-1777439293738@nohomailbox.test", // test
]);

// Pull active non-Business customers.
const r = await db.execute(`
  SELECT id, name, email, plan
  FROM User
  WHERE role = 'USER'
    AND (plan IS NOT NULL AND plan != '' AND plan != 'Free')
    AND plan != 'Business'
    AND (planExpiresAt IS NULL OR planExpiresAt > strftime('%s','now') * 1000)
  ORDER BY createdAt DESC
`);

const customers = r.rows.filter((c) => {
  const email = String(c.email).toLowerCase();
  if (SKIP_EMAILS.has(email)) return false;
  if (SKIP_EMAIL_DOMAINS.some((d) => email.endsWith("@" + d) || email.endsWith("." + d))) return false;
  return true;
});

console.log(`\nCampaign 3 — Refer-a-friend push`);
console.log(`From: ${FROM}`);
console.log(`Eligible: ${customers.length}`);
console.log(`Mode: ${SEND ? "LIVE SEND" : "DRY RUN"}\n`);

function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function buildEmail(c) {
  const firstName = String(c.name).split(" ")[0] || "there";
  const subject = `${firstName} — share NOHO with a friend, both of you get $10`;
  const html = `<p>Hi ${firstName},</p>
<p>Mokhtar from NOHO Mailbox here. Quick one — we just opened up a refer-a-friend program and I wanted you to know first.</p>
<p><strong>Refer a friend to NOHO Mailbox and you both get $10 in wallet credits.</strong> No cap — refer 5 friends, earn $50. Credits never expire and work on mail scans, forwarding postage, same-day delivery, or your next renewal.</p>
<p>The whole thing takes 20 seconds:</p>
<ol>
  <li>Sign in at <a href="https://nohomailbox.org/refer">nohomailbox.org/refer</a></li>
  <li>Tap Copy / SMS / Email to share your code</li>
  <li>When your friend signs up, both wallets auto-credit $10</li>
</ol>
<p>Easiest neighbors to refer: anyone running an Etsy/Shopify shop, anyone forming an LLC, anyone whose mail keeps getting stolen on the porch, friends with home-based businesses, realtors, content creators.</p>
<p>Thanks for the trust — small NoHo shops grow because of word-of-mouth like this.</p>
<p>— Mokhtar<br>NOHO Mailbox · (818) 506-7744 · 5062 Lankershim Blvd, North Hollywood, CA 91601</p>
<p style="font-size:11px;color:#888">Reply STOP to opt out of NOHO offers.</p>`;
  return { subject, html };
}

async function logEmail({ userId, to, subject, body, status, providerId, error }) {
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
        "campaign-3-referral",
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

for (const [i, c] of customers.entries()) {
  const num = i + 1;
  const { subject, html } = buildEmail(c);
  console.log(`[${num}/${customers.length}] ${c.name} <${c.email}> [${c.plan}]`);
  console.log(`  Subject: ${subject}`);

  if (!SEND) {
    console.log(`  → DRY: would send. ${html.length} bytes of HTML.\n`);
    continue;
  }

  try {
    const res = await resend.emails.send({
      from: FROM,
      replyTo: REPLY_TO,
      to: [String(c.email)],
      subject,
      html,
      headers: {
        "List-Unsubscribe": "<mailto:hello@nohomailbox.org?subject=unsubscribe>",
      },
    });

    if (res.error) {
      console.log(`  ✗ FAILED: ${res.error.message ?? JSON.stringify(res.error)}`);
      await logEmail({
        userId: String(c.id),
        to: String(c.email),
        subject,
        body: html,
        status: "failed",
        error: res.error.message ?? JSON.stringify(res.error),
      });
      failed++;
    } else {
      console.log(`  ✓ Sent — Resend id ${res.data?.id ?? "?"}`);
      await logEmail({
        userId: String(c.id),
        to: String(c.email),
        subject,
        body: html,
        status: "sent",
        providerId: res.data?.id ?? null,
      });
      sent++;
    }
  } catch (e) {
    console.log(`  ✗ ERROR: ${e.message}`);
    await logEmail({
      userId: String(c.id),
      to: String(c.email),
      subject,
      body: html,
      status: "failed",
      error: e.message,
    });
    failed++;
  }

  if (num < customers.length) {
    await new Promise((r) => setTimeout(r, 5000));
  }
}

console.log(`\nDone. ${SEND ? `Sent ${sent}, failed ${failed}.` : "Dry run."}\n`);
process.exit(0);
