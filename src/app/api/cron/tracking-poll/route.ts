// iter-94 — Cron route to poll carrier tracking events.
//
// Configure as an hourly Vercel Cron job (or external scheduler). Uses
// CRON_SECRET bearer auth. Limits to 50 stale items per run by default
// — increase via `?limit=` query param if needed.

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const url = new URL(req.url);
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50));
  const staleMinutes = Math.min(1440, Math.max(5, parseInt(url.searchParams.get("staleMinutes") ?? "60", 10) || 60));

  // Cron route bypasses verifyAdmin — call the inner sweep directly to
  // avoid the auth dance (we already proved we're the cron via bearer).
  // Re-implement the candidate selection here so the action stays
  // admin-gated for the manual-trigger button.
  const cutoff = new Date(Date.now() - staleMinutes * 60 * 1000);
  const candidates = await prisma.mailItem.findMany({
    where: {
      status: { in: ["Received", "Scanned", "Awaiting Pickup", "Held"] },
      carrier: { not: null },
      trackingNumber: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: limit * 4,
    select: { id: true },
  });
  const ids = candidates.map((c) => c.id);
  const states = ids.length === 0
    ? []
    : await prisma.mailItemTrackingState.findMany({
        where: { mailItemId: { in: ids } },
        select: { mailItemId: true, lastPolledAt: true },
      });
  const stateById = new Map(states.map((s) => [s.mailItemId, s] as const));
  const stale = candidates.filter((c) => {
    const s = stateById.get(c.id);
    return !s || s.lastPolledAt == null || s.lastPolledAt < cutoff;
  }).slice(0, limit);

  // Inline sweep — duplicates the action body but skips admin-auth.
  const { pollMailItemTracking } = await import("@/app/actions/tracking");
  let succeeded = 0, newEvents = 0, errors = 0;
  for (const c of stale) {
    const r = await pollMailItemTracking(c.id);
    if ((r as { error?: string }).error) errors++;
    else { succeeded++; newEvents += (r as { newEvents?: number }).newEvents ?? 0; }
  }

  return NextResponse.json({
    ok: true,
    attempted: stale.length,
    succeeded,
    newEvents,
    errors,
  });
}
