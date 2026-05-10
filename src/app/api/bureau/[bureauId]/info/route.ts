// iter-215 — Federated bureau identity API (Tier 15 #124).
//
// GET /api/bureau/{bureauId}/info — public, returns the bureau's
// PublicBureauInfo when bureauId matches this install. 404 when the
// install is a different bureau (lets a caller fan out across a
// known list of franchise URLs and only get hits where they match).

import { NextResponse } from "next/server";
import { getBureauIdentity } from "@/app/actions/bureauIdentity";
import { toPublicInfo } from "@/lib/bureau-identity";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_req: Request, { params }: { params: Promise<{ bureauId: string }> }) {
  const { bureauId } = await params;
  const id = decodeURIComponent(bureauId).trim().toLowerCase();
  const ident = await getBureauIdentity();
  if (ident.bureauId !== id) {
    return NextResponse.json({ error: "bureau_not_found", knownBureauId: ident.bureauId }, { status: 404, headers: { "x-noho-federation": "v1" } });
  }
  return NextResponse.json(toPublicInfo(ident), {
    status: 200,
    headers: { "x-noho-federation": "v1", "cache-control": "public, max-age=300" },
  });
}
