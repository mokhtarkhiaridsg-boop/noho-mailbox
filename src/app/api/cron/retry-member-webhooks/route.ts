// iter-167 — Retry sweep for member-registered webhook deliveries.
//
// Configure your scheduler to GET this every 5 minutes with
// `Authorization: Bearer ${CRON_SECRET}`. It drains every delivery
// whose `nextRetryAt` is due, replays it, and dead-letters anything
// that exhausts the 6-attempt curve.

import { NextResponse } from "next/server";
import { drainMemberWebhookRetries } from "@/lib/memberWebhooks";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await drainMemberWebhookRetries();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
