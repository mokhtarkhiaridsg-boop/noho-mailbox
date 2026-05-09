"use server";

/**
 * iter-157 — Geo-radius marketing flyer intel (Tier 10 #67).
 *
 * Pulls customer density signals from existing data without a
 * geocoding API: counts deliveries-to-ZIP and forwarding-address-ZIPs
 * to surface "where do our customers actually live/ship to" patterns.
 * Admin uses this when picking a ZIP to print door-hangers for.
 *
 * No new schema. The flyer template is the deliverable; this action
 * just powers the intel sidebar.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";

export type ZipMarketIntel = {
  zip: string;
  deliveriesToZip: number;
  forwardingAddrCount: number;
  topAdjacentZips: Array<{ zip: string; deliveries: number }>;
  totalDeliveriesAllZips: number;
  pctOfBureauActivity: number;   // 0-100
};

const ZIP_RE = /^\d{5}$/;

function normalizeZip(raw: string): string {
  const m = String(raw ?? "").trim().match(/^\d{5}/);
  return m ? m[0] : "";
}

export async function getZipMarketIntel(input: { zip: string }): Promise<{ ok: true; intel: ZipMarketIntel } | { ok: false; error: string }> {
  await verifyAdmin();
  const zip = normalizeZip(input.zip);
  if (!zip || !ZIP_RE.test(zip)) return { ok: false, error: "Enter a 5-digit ZIP" };

  // Count deliveries TO this ZIP. DeliveryOrder.zip is a string column.
  const [deliveriesToZip, forwardingMatches, allDeliveries, byZipGroup] = await Promise.all([
    prisma.deliveryOrder.count({ where: { zip } }),
    // Forwarding addresses are free-form — match any address line that
    // contains the ZIP.
    prisma.forwardingAddress.count({ where: { address: { contains: zip } } }),
    prisma.deliveryOrder.count(),
    prisma.deliveryOrder.groupBy({
      by: ["zip"],
      _count: { _all: true },
      orderBy: { _count: { zip: "desc" } },
      take: 50,
    }),
  ]);

  // Top adjacent ZIPs — heuristic: 5-digit ZIPs that share the first
  // 3 digits are "nearby" in most US ZCTAs. We exclude the queried
  // ZIP itself + return up to 5.
  const prefix = zip.slice(0, 3);
  const topAdjacentZips = byZipGroup
    .filter((g) => g.zip !== zip && g.zip.startsWith(prefix))
    .slice(0, 5)
    .map((g) => ({ zip: g.zip, deliveries: g._count._all }));

  const pct = allDeliveries > 0 ? (deliveriesToZip / allDeliveries) * 100 : 0;

  return {
    ok: true,
    intel: {
      zip,
      deliveriesToZip,
      forwardingAddrCount: forwardingMatches,
      topAdjacentZips,
      totalDeliveriesAllZips: allDeliveries,
      pctOfBureauActivity: Math.round(pct * 10) / 10,
    },
  };
}

// Top-N ZIPs by delivery count — feeds the "where to flyer next"
// suggestion list on the panel.
export async function getTopZipsByActivity(limit = 10): Promise<Array<{ zip: string; deliveries: number; pct: number }>> {
  await verifyAdmin();
  const all = await prisma.deliveryOrder.count();
  if (all === 0) return [];
  const grouped = await prisma.deliveryOrder.groupBy({
    by: ["zip"],
    _count: { _all: true },
    orderBy: { _count: { zip: "desc" } },
    take: Math.min(50, Math.max(3, limit)),
  });
  return grouped
    .filter((g) => /^\d{5}/.test(g.zip))
    .map((g) => ({
      zip: g.zip.slice(0, 5),
      deliveries: g._count._all,
      pct: Math.round((g._count._all / all) * 1000) / 10,
    }));
}
