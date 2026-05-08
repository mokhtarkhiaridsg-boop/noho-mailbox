// iter-142 — Storage tier auto-graduation cron route.
//
// Configure your scheduler to GET this once per day with
// `Authorization: Bearer ${CRON_SECRET}`. Sends one heads-up email per
// (mailItemId × threshold) the first time a package crosses 14d / 30d /
// 60d on the shelf. Idempotent via `StorageThresholdAlert` rows.

import { NextResponse } from "next/server";
import { runStorageTierSweep } from "@/app/actions/storageTierSweep";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await runStorageTierSweep();
    return NextResponse.json({ ok: true, ...result, ranAt: new Date().toISOString() });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    );
  }
}
