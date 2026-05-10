// iter-222 — Smart renewal-reminder cron route (Tier 16 #131).
//
// Schedule DAILY with `Authorization: Bearer ${CRON_SECRET}`. Looks
// up each member's personalized leadTimeDays from
// User.renewalCadenceJson and fires the iter-87 renewal reminder
// when their planDueDate matches `today + leadTimeDays`. Idempotent
// per cycle via auditLog dedupe.

import { NextResponse } from "next/server";
import { runSmartRenewalReminderSweep } from "@/app/actions/renewalCadence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runSmartRenewalReminderSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
