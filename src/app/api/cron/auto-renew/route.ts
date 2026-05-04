// iter-111 — Daily auto-renew cron route.
//
// Runs runAutoRenewSystemSweep every day. Configure your scheduler to GET
// this with `Authorization: Bearer ${CRON_SECRET}`. Recommended cadence:
// once per day in the morning so retries have all day if Square is down.

import { NextResponse } from "next/server";
import { runAutoRenewSystemSweep } from "@/app/actions/recurringBilling";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runAutoRenewSystemSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
