// iter-206 — Plan-pause activation/auto-resume cron route (Tier 14 #115).
//
// Schedule DAILY with `Authorization: Bearer ${CRON_SECRET}`. Activates
// Scheduled→Active when startDate ≤ today, and Active→Resumed when
// endDate ≤ today. Idempotent — status filter prevents double-fire.

import { NextResponse } from "next/server";
import { runPlanPauseSweep } from "@/app/actions/planPause";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runPlanPauseSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
