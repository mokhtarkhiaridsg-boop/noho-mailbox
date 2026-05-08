// iter-130 — Cron route: drain deferred-email queue.
//
// Schedule daily (or hourly) GETs with `Authorization: Bearer ${CRON_SECRET}`.
// Each call drains up to 50 ready rows (status=Pending, deferUntilIso ≤ now).

import { NextResponse } from "next/server";
import { runDeferredEmailDrain } from "@/app/actions/deferredEmail";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runDeferredEmailDrain();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
