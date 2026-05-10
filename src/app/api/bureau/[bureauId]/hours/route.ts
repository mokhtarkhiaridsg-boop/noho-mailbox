// iter-215 — Federated bureau hours API (Tier 15 #124).
//
// GET /api/bureau/{bureauId}/hours — public, returns the iter-90
// OperatingHoursConfig + isOpenNow result for that bureau. Used by
// franchise-network sites to show "is the {city} bureau open right
// now" without scraping.

import { NextResponse } from "next/server";
import { getBureauIdentity } from "@/app/actions/bureauIdentity";
import { getOperatingHours } from "@/app/actions/operatingHours";
import { isOpenNow } from "@/lib/operating-hours";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ bureauId: string }> }) {
  const { bureauId } = await params;
  const id = decodeURIComponent(bureauId).trim().toLowerCase();
  const ident = await getBureauIdentity();
  if (ident.bureauId !== id) {
    return NextResponse.json({ error: "bureau_not_found", knownBureauId: ident.bureauId }, { status: 404 });
  }
  const cfg = await getOperatingHours();
  const status = isOpenNow(cfg);
  return NextResponse.json({
    bureauId: ident.bureauId,
    name: ident.name,
    timezone: cfg.timezone,
    weekly: cfg.weekly,
    holidays: cfg.holidays,
    status: status.status,
    todayLabel: status.todayLabel,
    minutesUntilClose: status.minutesUntilClose ?? null,
  }, {
    status: 200,
    headers: { "x-noho-federation": "v1", "cache-control": "public, max-age=60" },
  });
}
