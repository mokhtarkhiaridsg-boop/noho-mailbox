// iter-102 — Daily cron sweep for ID-document expiry alerts.
//
// Configure in vercel.json (or any external scheduler) to GET this path
// once a day. CRON_SECRET env var gates access. Returns JSON summary.

import { NextResponse } from "next/server";
import { runIdExpirySweep } from "@/app/actions/idExpiry";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runIdExpirySweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
