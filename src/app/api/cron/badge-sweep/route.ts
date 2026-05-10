// iter-216 — Member milestone badges cron route (Tier 15 #125).
//
// Schedule DAILY with `Authorization: Bearer ${CRON_SECRET}`. Walks
// every active member, computes lifetime stats, awards new milestone
// badges via idempotent upsert. Cheap to run since stats are
// per-user counts.

import { NextResponse } from "next/server";
import { runBadgeAwardSweep } from "@/app/actions/memberBadges";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runBadgeAwardSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
