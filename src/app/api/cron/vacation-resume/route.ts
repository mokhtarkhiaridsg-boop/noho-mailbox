// iter-89 — Cron route to auto-resume expired vacation holds.
//
// Configure in vercel.json (or any external scheduler) to GET this path
// once a day. CRON_SECRET env var gates access; set it in Vercel + the
// scheduler. Returns JSON summary.

import { NextResponse } from "next/server";
import { runVacationHoldAutoResume } from "@/app/actions/mailPreferences";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  // Vercel Cron sends `Authorization: Bearer ${CRON_SECRET}` automatically
  // when configured via vercel.json. Reject anything else.
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runVacationHoldAutoResume();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
