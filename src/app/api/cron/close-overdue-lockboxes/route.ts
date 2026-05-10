// iter-171 — Auto-close any lockbox still showing "open" past its
// `expectedCloseBy` deadline. Run every 5 minutes. Bearer-CRON_SECRET.

import { NextResponse } from "next/server";
import { closeOverdueLockboxesSweep } from "@/app/actions/lockbox";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  try {
    const result = await closeOverdueLockboxesSweep();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
