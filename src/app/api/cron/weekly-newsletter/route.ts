// iter-159 — Weekly newsletter cron route.
//
// Configure your scheduler to GET this Mondays at 09:00 local with
// `Authorization: Bearer ${CRON_SECRET}`. Compiles the previous week
// + sends to every active member. Idempotent via NewsletterIssue
// unique-on-weekKey so overlapping cron fires can't double-send.

import { NextResponse } from "next/server";
import { sendWeeklyNewsletterAsSystem } from "@/app/actions/weeklyNewsletter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await sendWeeklyNewsletterAsSystem();
    return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
