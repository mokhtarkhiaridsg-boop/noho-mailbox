// iter-214 — Alumni quarterly newsletter cron route (Tier 15 #123).
//
// Schedule weekly with `Authorization: Bearer ${CRON_SECRET}` — the
// sweep self-throttles to one newsletter per alumni per 90d so weekly
// firing is safe (each alumni gets exactly 4/year).

import { NextResponse } from "next/server";
import { runAlumniNewsletterSweep } from "@/app/actions/alumni";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runAlumniNewsletterSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
