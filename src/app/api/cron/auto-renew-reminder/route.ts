// iter-111 — 7-day-out auto-renew reminder cron route.
//
// Runs runAutoRenewReminderSweep every day. Recommended cadence: once per
// day. Will send to anyone whose planDueDate == today + 7d AND
// planAutoRenew=true.

import { NextResponse } from "next/server";
import { runAutoRenewReminderSweep } from "@/app/actions/recurringBilling";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runAutoRenewReminderSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
