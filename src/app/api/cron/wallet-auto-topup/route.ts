// iter-112 — Wallet auto top-up cron route.
//
// Configure your scheduler to GET this once a day with
// `Authorization: Bearer ${CRON_SECRET}`. For each user with a configured
// threshold + amount where wallet < threshold (and not fired in last 24h),
// creates a CreditRequest, emails the customer, and pings the admin
// webhook.

import { NextResponse } from "next/server";
import { runWalletAutoTopUpSweep } from "@/app/actions/walletAutoTopUp";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runWalletAutoTopUpSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
