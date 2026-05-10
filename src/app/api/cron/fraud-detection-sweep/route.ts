// iter-234 — Smart fraud detection cron route (Tier 17 #143).
//
// Schedule HOURLY with `Authorization: Bearer ${CRON_SECRET}`. Walks
// recent MailItems + Users, runs the 6 pure-rules detectors, idempotent-
// upserts FraudFlag rows + fires webhooks for new high+critical signals.

import { NextResponse } from "next/server";
import { runFraudDetectionSweep } from "@/app/actions/fraudFlags";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runFraudDetectionSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
