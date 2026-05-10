// iter-170 — Daily sweep of recurring scheduled-forwarding rows.
//
// Configure your scheduler to GET this once a day with
// `Authorization: Bearer ${CRON_SECRET}`. It walks every active +
// enabled forwarding whose `nextRunDate <= today`, batches all
// eligible mail items, atomically transitions them to Forwarded,
// records a `ScheduledForwardingBatch` row, audits, emails the
// member, and fires their `mail.forwarded` member webhook.

import { NextResponse } from "next/server";
import { runScheduledForwardingSweep } from "@/app/actions/scheduledForwardingBatch";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runScheduledForwardingSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
