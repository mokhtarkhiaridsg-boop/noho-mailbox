// iter-223 — Quarterly referral-leaderboard award cron route (Tier 16 #132).
//
// Schedule MONTHLY with `Authorization: Bearer ${CRON_SECRET}`. Runs
// the award sweep — but the badgeKey is suffixed with the quarter
// label, so re-running within the same quarter is idempotent (the
// `userId_badgeKey` upsert guards). Top 3 opted-in referrers each
// quarter get the "Founder ambassador" badge.

import { NextResponse } from "next/server";
import { runQuarterlyReferralAwardSweep } from "@/app/actions/publicLeaderboard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runQuarterlyReferralAwardSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
