// Square auto-sync cron — keeps Payment table in step with Square.
//
// Was missing entirely, so admin couldn't see today's transactions
// until they manually clicked "Sync All". Now fires every 15 min via
// Vercel cron + the same route can be hand-pinged for a force sync.
//
// Auth: Bearer ${CRON_SECRET} header — same pattern as the other cron
// routes in this folder. Returns JSON with the per-table sync counts.

import { NextResponse } from "next/server";
import {
  runSyncSquareCustomers,
  runSyncSquarePayments,
  runSyncSquareCatalog,
} from "@/lib/square-sync";
import { isSquareConfigured } from "@/lib/square";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  // Vercel automatically appends ?cron=1 + Authorization: Bearer for
  // scheduled jobs. Manual pings still work via the Bearer header.
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  if (!isSquareConfigured()) {
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "Square not configured",
    });
  }

  // Order matters: customers first so payment.userId can resolve via
  // the squareCustomerId map; catalog last because it's the slowest +
  // least time-sensitive. Each call is independent — one failure
  // doesn't break the others.
  const url = new URL(req.url);
  const skipCatalog = url.searchParams.get("skipCatalog") === "1";

  const [customers, payments, catalog] = await Promise.all([
    safe(runSyncSquareCustomers, "customers"),
    safe(runSyncSquarePayments, "payments"),
    skipCatalog
      ? Promise.resolve({ success: true, syncType: "catalog" as const, itemsSynced: 0, skipped: true })
      : safe(runSyncSquareCatalog, "catalog"),
  ]);

  const ok = customers.success && payments.success && catalog.success;
  return NextResponse.json({ ok, customers, payments, catalog }, { status: ok ? 200 : 207 });
}

async function safe(
  fn: () => Promise<{ success: boolean; syncType: string; itemsSynced: number; error?: string }>,
  syncType: string,
) {
  try {
    return await fn();
  } catch (e) {
    return {
      success: false,
      syncType,
      itemsSynced: 0,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
