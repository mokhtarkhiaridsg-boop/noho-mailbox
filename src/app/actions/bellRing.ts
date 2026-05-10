"use server";

/**
 * iter-217 — Smart pickup-bell QR server actions (Tier 16 #126).
 *
 * Three audiences:
 *   - Public walk-in customers: ringBell({suiteNumber}) — typed at the
 *     front-desk QR-scan landing page. Throttled per IP.
 *   - Admin: list rings (sorted unack-first), acknowledge.
 *   - Notification: every successful ring creates a Notification row
 *     for the on-duty admin (existing iter-X notifications surface).
 *
 * Audit: `bell.rang` per public ring, `bell.acknowledged` per admin
 * ack.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

const RING_THROTTLE_MS = 5 * 60 * 1000;     // 5 min
const RING_THROTTLE_MAX = 3;                 // max 3 rings per IP per window

export type BellRingRow = {
  id: string;
  suiteNumber: string;
  userId: string | null;
  userName: string | null;
  openPackageCount: number;
  ringedAtIso: string;
  acknowledgedAtIso: string | null;
  acknowledgedByName: string | null;
  ip: string | null;
  notes: string | null;
};

export type RingResult =
  | { ok: true; ringId: string; suiteResolved: boolean }
  | { ok: false; reason: "throttled" | "invalid_suite" | "internal" };

async function clientIp(): Promise<string | null> {
  try {
    const h = await headers();
    return (h.get("x-forwarded-for") ?? h.get("x-real-ip") ?? "").split(",")[0]?.trim() || null;
  } catch { return null; }
}

export async function ringBell(input: { suiteNumber: string }): Promise<RingResult> {
  const suite = input.suiteNumber.trim().slice(0, 12);
  if (!suite || !/^[\w-]{1,12}$/.test(suite)) return { ok: false, reason: "invalid_suite" };

  const ip = await clientIp();
  // Throttle: count rings from this IP in the last RING_THROTTLE_MS.
  if (ip) {
    const recent = await prisma.bellRing.count({
      where: { ip, ringedAt: { gte: new Date(Date.now() - RING_THROTTLE_MS) } },
    });
    if (recent >= RING_THROTTLE_MAX) return { ok: false, reason: "throttled" };
  }

  let userId: string | null = null;
  try {
    const u = await prisma.user.findUnique({ where: { suiteNumber: suite }, select: { id: true } });
    userId = u?.id ?? null;
  } catch { /* swallow */ }

  let userAgent: string | null = null;
  try { const h = await headers(); userAgent = h.get("user-agent")?.slice(0, 200) ?? null; } catch { /* swallow */ }

  let created;
  try {
    created = await prisma.bellRing.create({
      data: { suiteNumber: suite, userId, ip, userAgent },
    });
  } catch { return { ok: false, reason: "internal" }; }

  // Fan-out: notify every admin via the existing Notification model.
  try {
    const admins = await prisma.user.findMany({ where: { role: "ADMIN" }, select: { id: true, name: true } });
    if (admins.length > 0 && userId) {
      const member = await prisma.user.findUnique({ where: { id: userId }, select: { name: true } });
      const openCount = await prisma.mailItem.count({
        where: { userId, status: { in: ["Awaiting Pickup", "Received", "Scanned"] }, type: "Package" },
      });
      const title = `🛎️ Suite #${suite} at the counter`;
      const body = member ? `${member.name}${openCount > 0 ? ` · ${openCount} open package${openCount === 1 ? "" : "s"}` : ""}` : `Suite #${suite}`;
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id, type: "bell_ring",
          title, body, link: `/admin?tab=bellrings`,
        })),
      }).catch(() => null);
    } else if (admins.length > 0) {
      // Suite # didn't resolve to a member — still notify with raw suite.
      await prisma.notification.createMany({
        data: admins.map((a) => ({
          userId: a.id, type: "bell_ring",
          title: `🛎️ Walk-in (suite #${suite})`,
          body: `Suite # didn't match a member — verify at counter`,
          link: `/admin?tab=bellrings`,
        })),
      }).catch(() => null);
    }
  } catch { /* swallow — don't block the ring on notif failures */ }

  await prisma.auditLog.create({
    data: {
      actorId: "anonymous", actorRole: "PUBLIC",
      action: "bell.rang",
      entityType: "BellRing", entityId: created.id,
      metadata: JSON.stringify({ suite, userId, ip }),
    },
  }).catch(() => null);

  revalidatePath("/admin");
  return { ok: true, ringId: created.id, suiteResolved: !!userId };
}

export async function listBellRings(input: { onlyUnacked?: boolean; limit?: number } = {}): Promise<BellRingRow[]> {
  await verifyAdmin();
  const limit = Math.min(200, Math.max(1, input.limit ?? 60));
  const where = input.onlyUnacked ? { acknowledgedAt: null } : {};
  const rows = await prisma.bellRing.findMany({
    where,
    orderBy: [{ acknowledgedAt: "asc" }, { ringedAt: "desc" }],
    take: limit,
  });

  // Resolve user names + open-package counts in batch.
  const userIds = Array.from(new Set(rows.map((r) => r.userId).filter((x): x is string => !!x)));
  const ackerIds = Array.from(new Set(rows.map((r) => r.acknowledgedById).filter((x): x is string => !!x)));
  const allIds = Array.from(new Set([...userIds, ...ackerIds]));
  const users = allIds.length > 0
    ? await prisma.user.findMany({ where: { id: { in: allIds } }, select: { id: true, name: true } })
    : [];
  const userMap = new Map(users.map((u) => [u.id, u.name]));
  const openCounts: Record<string, number> = {};
  for (const uid of userIds) {
    openCounts[uid] = await prisma.mailItem.count({
      where: { userId: uid, status: { in: ["Awaiting Pickup", "Received", "Scanned"] }, type: "Package" },
    }).catch(() => 0);
  }

  return rows.map((r) => ({
    id: r.id,
    suiteNumber: r.suiteNumber,
    userId: r.userId,
    userName: r.userId ? (userMap.get(r.userId) ?? null) : null,
    openPackageCount: r.userId ? (openCounts[r.userId] ?? 0) : 0,
    ringedAtIso: r.ringedAt.toISOString(),
    acknowledgedAtIso: r.acknowledgedAt?.toISOString() ?? null,
    acknowledgedByName: r.acknowledgedById ? (userMap.get(r.acknowledgedById) ?? null) : null,
    ip: r.ip, notes: r.notes,
  }));
}

export async function acknowledgeBellRing(input: { id: string; notes?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.bellRing.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Ring not found." };
  if (row.acknowledgedAt) return { success: true };
  await prisma.$transaction([
    prisma.bellRing.update({
      where: { id: row.id },
      data: { acknowledgedAt: new Date(), acknowledgedById: actor.id, notes: input.notes?.trim().slice(0, 200) || null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "bell.acknowledged",
        entityType: "BellRing", entityId: row.id,
        metadata: JSON.stringify({ suite: row.suiteNumber, secondsToAck: Math.floor((Date.now() - row.ringedAt.getTime()) / 1000) }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}
