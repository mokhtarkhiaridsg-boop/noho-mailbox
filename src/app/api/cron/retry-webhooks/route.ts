// iter-134 — Webhook retry cron route.
//
// Configure your scheduler to GET this every minute (or every 5 min — the
// drain handles whatever has come due since last tick). Drains every
// WebhookDelivery whose nextRetryAt has passed and re-fires it through
// the existing format/sign path. Each call processes up to 100 due
// deliveries (safety cap to keep tick latency bounded).
//
// Auth: Bearer ${CRON_SECRET}, identical to every other cron in this app.

import { NextResponse } from "next/server";
import { drainWebhookRetries } from "@/lib/webhooks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await drainWebhookRetries();
    return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
