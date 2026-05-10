// iter-221 — Bureau-wide junk-sender promotion cron route (Tier 16 #130).
//
// Schedule DAILY with `Authorization: Bearer ${CRON_SECRET}`. Walks
// JunkReport rows + promotes any sender with ≥10 unique reporters to
// the BureauJunkSender blocklist. Idempotent — re-running on the same
// data just bumps lastReportedAt for already-promoted entries.

import { NextResponse } from "next/server";
import { runBureauJunkPromotionSweep } from "@/app/actions/bureauJunkSenders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runBureauJunkPromotionSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
