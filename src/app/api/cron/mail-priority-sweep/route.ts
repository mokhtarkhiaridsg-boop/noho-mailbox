// iter-227 — AI mail-priority inference cron route (Tier 17 #136).
//
// Schedule HOURLY with `Authorization: Bearer ${CRON_SECRET}`. Walks
// scanned + classified items missing a priorityScore + recomputes via
// pure-rules scorer. Cheap (no API call).

import { NextResponse } from "next/server";
import { runMailPrioritySweep } from "@/app/actions/mailPriority";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runMailPrioritySweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
