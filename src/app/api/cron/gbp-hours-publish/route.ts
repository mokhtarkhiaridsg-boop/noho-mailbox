// iter-205 — GBP hours auto-publish cron route (Tier 14 #114).
//
// Schedule DAILY with `Authorization: Bearer ${CRON_SECRET}`. The
// sweep no-ops gracefully when GBP_* env vars are missing (returns
// configured=false), and skips the API call when the payload hasn't
// changed since the last successful publish.

import { NextResponse } from "next/server";
import { runGbpHoursPublishSweep } from "@/app/actions/gbpHoursPublish";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runGbpHoursPublishSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
