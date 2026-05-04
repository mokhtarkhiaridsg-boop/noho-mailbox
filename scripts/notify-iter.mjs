#!/usr/bin/env node
/**
 * Per-loop iteration notification helper.
 *
 * Usage:
 *   node scripts/notify-iter.mjs <iter-number> <title> <body...>
 *
 * Sends a styled HTML email to Jessie + Mokhtar via Resend with what
 * landed in this iteration. Reads RESEND_API_KEY + EMAIL_FROM from the
 * environment (load .env first via `set -a && source .env && set +a`).
 */
import "dotenv/config";

const RECIPIENTS = ["jscanlon15@gmail.com", "mokhtar.khiari.dsg@gmail.com"];
const FROM = process.env.EMAIL_FROM || "NOHO Mailbox <noreply@nohomailbox.org>";
const KEY = process.env.RESEND_API_KEY;

if (!KEY) {
  console.error("Missing RESEND_API_KEY");
  process.exit(1);
}

const [iterNum, title, ...bodyParts] = process.argv.slice(2);
if (!iterNum || !title) {
  console.error("usage: notify-iter.mjs <iter-number> <title> <body...>");
  process.exit(1);
}
const body = bodyParts.join(" ");
const subject = `NOHO admin · iter ${iterNum} · ${title}`;

// Render the body as HTML — split markdown-style bullet lines into a list
// and render plain paragraphs. Keep it brand-cream + ink, no clutter.
function htmlFromBody(raw) {
  const lines = raw.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  return lines
    .map((line) => {
      if (/^[-*]\s/.test(line)) {
        return `<li style="margin:6px 0;">${line.replace(/^[-*]\s/, "")}</li>`;
      }
      return `<p style="margin:8px 0;line-height:1.55;">${line}</p>`;
    })
    .reduce((acc, item) => {
      const isLi = item.startsWith("<li");
      const last = acc[acc.length - 1];
      if (isLi && last && last.startsWith("<ul")) {
        acc[acc.length - 1] = last.replace("</ul>", `${item}</ul>`);
      } else if (isLi) {
        acc.push(`<ul style="padding-left:18px;margin:8px 0;">${item}</ul>`);
      } else {
        acc.push(item);
      }
      return acc;
    }, [])
    .join("\n");
}

const html = `<!doctype html>
<html><body style="margin:0;padding:0;background:#F7E6C2;font-family:system-ui,sans-serif;color:#2D100F;">
  <div style="max-width:560px;margin:0 auto;padding:32px 24px;">
    <div style="display:flex;align-items:center;gap:8px;font-size:11px;font-weight:900;letter-spacing:0.2em;text-transform:uppercase;color:rgba(45,16,15,0.55);margin-bottom:8px;">
      <span style="display:inline-block;width:6px;height:6px;border-radius:50%;background:#E70013;box-shadow:0 0 8px rgba(231,0,19,0.5);"></span>
      NOHO Admin · Iteration ${iterNum}
    </div>
    <h1 style="margin:0 0 16px;font-size:24px;font-weight:800;color:#2D100F;letter-spacing:-0.01em;">
      ${title}
    </h1>
    <div style="background:#fff;border:1px solid rgba(45,16,15,0.12);border-radius:14px;padding:18px 20px;font-size:14px;color:#2D100F;">
      ${htmlFromBody(body)}
    </div>
    <p style="margin:18px 0 0;font-size:11px;color:rgba(45,16,15,0.5);">
      Live at <a href="https://nohomailbox.org/admin" style="color:#337485;text-decoration:none;">nohomailbox.org/admin</a>
    </p>
  </div>
</body></html>`;

const res = await fetch("https://api.resend.com/emails", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${KEY}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    from: FROM,
    to: RECIPIENTS,
    subject,
    html,
  }),
});

if (!res.ok) {
  console.error("Resend error", res.status, await res.text());
  process.exit(2);
}
const data = await res.json();
console.log("sent", data.id);
