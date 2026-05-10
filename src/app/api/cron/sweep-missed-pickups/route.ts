// iter-173 — Auto-mark missed carrier pickups.
// Runs every 15min via Bearer-CRON_SECRET. Walks scheduled pickups
// whose window closed + 60min grace passed without a completion stamp,
// flips them to "missed", writes audit, fires admin webhook.

import { NextResponse } from "next/server";
import { sweepMissedCarrierPickups } from "@/app/actions/carrierPickup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await sweepMissedCarrierPickups();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
