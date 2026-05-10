// iter-179 — Daily applier for approved plan downgrades whose
// effectiveAt has come due. Bearer-CRON_SECRET. Run once a day.

import { NextResponse } from "next/server";
import { applyDuePlanDowngradesSweep } from "@/app/actions/planDowngrade";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await applyDuePlanDowngradesSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
