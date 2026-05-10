// iter-236 — Weekly outbound shipment digest cron route (Tier 17 #145).
//
// Schedule WEEKLY (Sunday 8am local) with `Authorization: Bearer
// ${CRON_SECRET}`. Walks opted-in members + emails each one a recap
// of their past 7 days of ShippoLabel + iter-212 ShipmentReceipt.
// Idempotent — skips members whose last digest was within 6 days.

import { NextResponse } from "next/server";
import { runOutboundDigestWeeklySweep } from "@/app/actions/outboundDigest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runOutboundDigestWeeklySweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
