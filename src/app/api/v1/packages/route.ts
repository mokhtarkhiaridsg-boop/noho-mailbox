// iter-166 — GET /api/v1/packages — packages for the token's user.
// Convenience wrapper over the mail filter with hardcoded type=Package.
// By default excludes terminal states ("Picked Up" + "Forwarded"); pass
// `?includeDelivered=1` to see everything.

import { prisma } from "@/lib/prisma";
import { withApiToken } from "../_handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiToken("packages:read", async ({ userId, req }) => {
  const url = new URL(req.url);
  const limit = clamp(parseInt(url.searchParams.get("limit") ?? "25", 10), 1, 200, 25);
  const offset = clamp(parseInt(url.searchParams.get("offset") ?? "0", 10), 0, 100000, 0);
  const includeDelivered = url.searchParams.get("includeDelivered") === "1";

  const where: Record<string, unknown> = {
    userId,
    type: "Package",
  };
  if (!includeDelivered) where.status = { notIn: ["Picked Up", "Forwarded"] };

  const [total, items] = await Promise.all([
    prisma.mailItem.count({ where }),
    prisma.mailItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true, status: true, from: true, label: true,
        date: true, weightOz: true, dimensions: true,
        carrier: true, trackingNumber: true,
        exteriorImageUrl: true,
        priority: true, pickupSignedAt: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    total, limit, offset,
    nextOffset: offset + items.length < total ? offset + items.length : null,
    items: items.map((i) => ({
      id: i.id,
      status: i.status,
      from: i.from,
      label: i.label,
      date: i.date,
      weightOz: i.weightOz,
      dimensions: i.dimensions,
      carrier: i.carrier,
      trackingNumber: i.trackingNumber,
      exteriorImageUrl: i.exteriorImageUrl,
      priority: i.priority,
      pickedUpAt: i.pickupSignedAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
    })),
  };
});

function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
