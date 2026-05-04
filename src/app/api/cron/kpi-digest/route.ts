// iter-104 — Daily KPI digest cron route.
//
// Configure your scheduler to GET this once a day (e.g. 7:30am PT) with
// `Authorization: Bearer ${CRON_SECRET}`. Returns JSON summary.

import { NextResponse } from "next/server";
import { sendDailyKpiDigest } from "@/app/actions/kpiDigest";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendDailyKpiDigest();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
