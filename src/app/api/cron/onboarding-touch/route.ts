// iter-148 — Customer onboarding touch cron route.
//
// Configure your scheduler to GET this once per day with
// `Authorization: Bearer ${CRON_SECRET}`. Sends Day 0 / Day 2 / Day 5
// welcome emails to members whose mailbox was assigned within the last
// 14 days. Idempotent via `OnboardingTouch` rows.

import { NextResponse } from "next/server";
import { runOnboardingTouchSweep } from "@/app/actions/onboardingVideos";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runOnboardingTouchSweep();
    return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
