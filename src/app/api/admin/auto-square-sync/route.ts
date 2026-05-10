/**
 * iter-225 — Square auto-sync route handler (admin-triggered).
 *
 * Replaces the broken fire-and-forget `void (async () => …)()` IIFE
 * that used to live inside src/app/admin/page.tsx render. That IIFE
 * created SquareSyncLog rows in `running` state but Vercel terminated
 * the serverless function as soon as the React response stream
 * finished, so the `finally` finalizer in @/lib/square-sync never ran
 * and rows stayed `running` forever (10+ stuck rows visible in the
 * SYNC HISTORY pane after only a few /admin loads).
 *
 * Now: AdminDashboardClient hits this route from a `useEffect` after
 * mount. The request keeps the function alive for the full
 * maxDuration, the `finally` finalizer fires, the row gets closed.
 *
 * Auth: server-side verifyAdmin() — same JWT cookie the dashboard
 * already presents. Skips the cron-route Bearer auth pattern because
 * this is admin-triggered, not Vercel-triggered.
 *
 * Idempotent: re-checks "stale" before launching. Multiple admin tabs
 * won't fan-out duplicate syncs because the freshness check happens
 * inside the request, not on the client side.
 */

import { NextResponse } from "next/server";
import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { isSquareConfigured } from "@/lib/square";
import { runSyncSquareCustomers, runSyncSquarePayments } from "@/lib/square-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Square pagination + per-row Prisma writes can run 40-90s on a large
// account. Bump to the Hobby-plan max (60) — Pro users can lift this
// to 300 by editing manually if needed.
export const maxDuration = 60;

const STALE_AFTER_MS = 10 * 60 * 1000; // 10 minutes

export async function POST() {
  // Same gate the rest of admin uses. If the cookie isn't valid, we
  // bounce — never silently sync on a non-admin's request.
  await verifyAdmin();

  if (!isSquareConfigured()) {
    return NextResponse.json({ ok: true, skipped: "Square not configured" });
  }

  const lastSync = await prisma.squareSyncLog.findFirst({
    where: { syncType: "payments", status: "completed" },
    orderBy: { completedAt: "desc" },
  });
  const stale =
    !lastSync?.completedAt ||
    Date.now() - lastSync.completedAt.getTime() > STALE_AFTER_MS;

  if (!stale) {
    return NextResponse.json({
      ok: true,
      skipped: "Recent sync",
      lastCompletedAt: lastSync?.completedAt?.toISOString() ?? null,
    });
  }

  // Order matters: customers first so payments can resolve userId via
  // the squareCustomerId map. Each is awaited so the finalizer in
  // each run* function reaches its `finally` before we return.
  const customers = await runSyncSquareCustomers();
  const payments = await runSyncSquarePayments();

  return NextResponse.json({
    ok: customers.success && payments.success,
    customers,
    payments,
  });
}
