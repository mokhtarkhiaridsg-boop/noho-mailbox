// iter-113 — Holiday closure notice cron route.
//
// Configure your scheduler to GET this once a day with
// `Authorization: Bearer ${CRON_SECRET}`. Sends one email per active
// customer for any holiday landing in the next 2 days that hasn't been
// announced yet (idempotent via AuditLog).

import { NextResponse } from "next/server";
import { runHolidayNoticeSweep } from "@/app/actions/holidayNotifier";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runHolidayNoticeSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
