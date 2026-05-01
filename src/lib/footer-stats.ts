/**
 * Read-only footer stats — used by the marketing footer to surface live
 * activity numbers. Best-effort: any DB error returns nulls so the footer
 * still renders cleanly.
 */
import { prisma } from "@/lib/prisma";

export type FooterStats = {
  todayIntake: number | null;
  lastDeliveryAt: string | null;
};

export async function getFooterStats(): Promise<FooterStats> {
  try {
    // "Today" is bounded to the local day in California — close enough since
    // we only show the count for ambient flavor.
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const [todayIntake, lastDelivery] = await Promise.all([
      prisma.mailItem.count({ where: { createdAt: { gte: start } } }),
      prisma.deliveryOrder.findFirst({
        where: { deliveredAt: { not: null } },
        orderBy: { deliveredAt: "desc" },
        select: { deliveredAt: true },
      }),
    ]);
    return {
      todayIntake,
      lastDeliveryAt: lastDelivery?.deliveredAt?.toISOString() ?? null,
    };
  } catch {
    return { todayIntake: null, lastDeliveryAt: null };
  }
}

export function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms) || ms < 0) return "just now";
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
