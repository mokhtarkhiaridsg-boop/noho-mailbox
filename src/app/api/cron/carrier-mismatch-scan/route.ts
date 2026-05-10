// iter-198 — Carrier-mismatch coaching cron route (Tier 14 #107).
//
// Schedule DAILY with `Authorization: Bearer ${CRON_SECRET}`. Counts
// admin-typed-vs-AI-detected carrier disagreements in the rolling 7d
// window; if ≥ threshold AND not coached in the last 6d, fires a
// coaching email to the admin.

import { NextResponse } from "next/server";
import { runCarrierMismatchSweep } from "@/app/actions/carrierMismatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runCarrierMismatchSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
