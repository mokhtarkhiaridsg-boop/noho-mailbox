// iter-153 — Renewal-discount auto-offer cron route.
//
// Configure your scheduler to GET this once per day with
// `Authorization: Bearer ${CRON_SECRET}`. Finds at-risk customers (per
// iter-140 health score) whose renewal is in the next 30 days and
// sends them a one-time discount code. Idempotent via the
// RenewalDiscountOffer 90-day cooldown check.

import { NextResponse } from "next/server";
import { runRenewalDiscountSweep } from "@/app/actions/renewalDiscountOffer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runRenewalDiscountSweep();
    return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
