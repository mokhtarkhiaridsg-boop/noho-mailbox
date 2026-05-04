// iter-118 — Inbound email webhook.
//
// Configure your email provider's inbound parsing to POST here when a
// reply lands at the bureau's reply-to address. Body shape is normalized
// to: { from, to, subject, html, text, providerId? }.
//
// Auth: requires header `x-noho-inbound-secret` matching INBOUND_EMAIL_SECRET
// env var so randos can't spoof inbound mail. Set the same secret in
// your provider's webhook config.
//
// Provider mapping (admin-side glue, not done here):
//   - Resend Inbound: forwards a JSON {from, to, subject, html, text, ...}
//   - SendGrid Inbound Parse: posts multipart/form-data
//   - Postmark Inbound: posts JSON {From, To, Subject, HtmlBody, TextBody}
// We accept JSON only here; a tiny adapter per provider can normalize
// upstream if needed.

import { NextResponse } from "next/server";
import { ingestInboundEmail } from "@/app/actions/mailerInbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const headerSecret = req.headers.get("x-noho-inbound-secret") ?? "";
  const expected = process.env.INBOUND_EMAIL_SECRET ?? "";
  if (!expected || headerSecret !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const b = body as {
    from?: string; to?: string; subject?: string;
    html?: string; text?: string; providerId?: string;
    // Postmark-style fallbacks
    From?: string; To?: string; Subject?: string;
    HtmlBody?: string; TextBody?: string; MessageID?: string;
  };
  const fromEmail = (b.from ?? b.From ?? "").trim();
  const toEmail = (b.to ?? b.To ?? "").trim();
  const subject = (b.subject ?? b.Subject ?? "").trim();
  const html = (b.html ?? b.HtmlBody ?? "").trim();
  const text = (b.text ?? b.TextBody ?? "").trim();
  const providerId = (b.providerId ?? b.MessageID ?? "").trim() || undefined;

  if (!fromEmail) return NextResponse.json({ error: "from required" }, { status: 400 });
  if (!subject && !html && !text) return NextResponse.json({ error: "empty body" }, { status: 400 });

  try {
    const result = await ingestInboundEmail({
      fromEmail, toEmail, subject,
      bodyHtml: html || undefined,
      bodyText: text || undefined,
      providerId,
    });
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
