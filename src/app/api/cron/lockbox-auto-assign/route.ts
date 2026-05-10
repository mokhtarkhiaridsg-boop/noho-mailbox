// iter-225 — Lockbox auto-assign cron route (Tier 16 #134).
//
// Schedule HOURLY with `Authorization: Bearer ${CRON_SECRET}`. Walks
// recent Awaiting-Pickup packages for members with a current month-pass,
// assigns to the next free auto-enabled Lockbox, fires SMS with PIN.
// Also runs the expiry sweep so unclaimed lockers free up automatically.

import { NextResponse } from "next/server";
import { runLockboxAutoAssignSweep, runLockboxExpirySweep } from "@/app/actions/lockboxAutoAssign";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const [assigned, expired] = await Promise.all([
      runLockboxAutoAssignSweep(),
      runLockboxExpirySweep(),
    ]);
    return NextResponse.json({ ok: true, assigned, expired });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
