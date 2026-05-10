// iter-166 — GET /api/v1/mail — paginated mail items for the token's user.
// Requires `mail:read` scope. Query params:
//   ?limit=50  (default 25, max 200)
//   ?offset=0
//   ?type=Letter|Package|... (optional filter)
//   ?status=Received|Picked%20Up|... (optional filter)
//   ?since=ISO8601  (only items created on/after this timestamp)

import { prisma } from "@/lib/prisma";
import { withApiToken } from "../_handler";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const GET = withApiToken("mail:read", async ({ userId, req }) => {
  const url = new URL(req.url);
  const limit = clamp(parseInt(url.searchParams.get("limit") ?? "25", 10), 1, 200, 25);
  const offset = clamp(parseInt(url.searchParams.get("offset") ?? "0", 10), 0, 100000, 0);
  const type = url.searchParams.get("type") || undefined;
  const status = url.searchParams.get("status") || undefined;
  const sinceParam = url.searchParams.get("since");
  const since = sinceParam ? new Date(sinceParam) : null;

  const where: Record<string, unknown> = { userId };
  if (type) where.type = type;
  if (status) where.status = status;
  if (since && !Number.isNaN(since.getTime())) where.createdAt = { gte: since };

  const [total, items] = await Promise.all([
    prisma.mailItem.count({ where }),
    prisma.mailItem.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
      select: {
        id: true, type: true, from: true, status: true,
        date: true, weightOz: true, dimensions: true, label: true,
        carrier: true, trackingNumber: true,
        recipientName: true, priority: true,
        exteriorImageUrl: true, scanImageUrl: true,
        pickupSignedAt: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    total, limit, offset,
    nextOffset: offset + items.length < total ? offset + items.length : null,
    items: items.map((i) => ({
      id: i.id,
      type: i.type,
      status: i.status,
      from: i.from,
      date: i.date,
      label: i.label,
      weightOz: i.weightOz,
      dimensions: i.dimensions,
      carrier: i.carrier,
      trackingNumber: i.trackingNumber,
      recipientName: i.recipientName,
      priority: i.priority,
      exteriorImageUrl: i.exteriorImageUrl,
      scanImageUrl: i.scanImageUrl,
      pickedUpAt: i.pickupSignedAt?.toISOString() ?? null,
      createdAt: i.createdAt.toISOString(),
    })),
  };
});

function clamp(n: number, min: number, max: number, fallback: number): number {
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
