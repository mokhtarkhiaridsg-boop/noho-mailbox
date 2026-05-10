// iter-197 — Onboarding first-pickup reminder cron route (Tier 14 #106).
//
// Schedule HOURLY with `Authorization: Bearer ${CRON_SECRET}`. The
// sweep self-checks whether we're inside the 3.5–4.5h-before-open
// window and no-ops outside it; if you fire this every 5 min it'll
// still only send each member once (idempotent via OnboardingTouch).

import { NextResponse } from "next/server";
import { runFirstPickupReminderSweep } from "@/app/actions/onboardingFirstPickup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runFirstPickupReminderSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
