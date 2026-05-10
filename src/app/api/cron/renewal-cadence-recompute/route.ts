// iter-222 — Renewal-cadence recompute cron route (Tier 16 #131).
//
// Schedule WEEKLY with `Authorization: Bearer ${CRON_SECRET}`.
// Walks members, computes personalized leadTimeDays from their
// MailboxRenewal history, persists to User.renewalCadenceJson.

import { NextResponse } from "next/server";
import { runRenewalCadenceRecomputeSweep } from "@/app/actions/renewalCadence";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runRenewalCadenceRecomputeSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
