"use server";

/**
 * NOHO Mailbox — Annual Mail Summary
 * Year-in-review data for members — total items, scan usage, spending, etc.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export async function getAnnualSummary(year?: number) {
  const session = await verifySession();
  const userId = session.id as string;

  const targetYear = year ?? new Date().getFullYear();
  const startDate = new Date(`${targetYear}-01-01T00:00:00Z`);
  const endDate = new Date(`${targetYear + 1}-01-01T00:00:00Z`);

  const [mailItems, walletTxns, deliveries, mailRequests] = await Promise.all([
    prisma.mailItem.findMany({
      where: { userId, createdAt: { gte: startDate, lt: endDate } },
      select: { type: true, status: true, scanned: true, from: true, priority: true, junkBlocked: true },
    }),
    prisma.walletTransaction.findMany({
      where: { userId, createdAt: { gte: startDate, lt: endDate } },
      select: { amountCents: true, kind: true, description: true },
    }),
    prisma.deliveryOrder.findMany({
      where: { userId, createdAt: { gte: startDate, lt: endDate } },
      select: { status: true, price: true, tier: true, destination: true },
    }),
    prisma.mailRequest.findMany({
      where: { userId, createdAt: { gte: startDate, lt: endDate } },
      select: { kind: true, status: true },
    }),
  ]);

  // Mail stats
  const totalMail = mailItems.length;
  const letters = mailItems.filter((m) => m.type === "Letter").length;
  const packages = mailItems.filter((m) => m.type === "Package").length;
  const scanned = mailItems.filter((m) => m.scanned).length;
  const forwarded = mailItems.filter((m) => m.status === "Forwarded").length;
  const pickedUp = mailItems.filter((m) => m.status === "Picked Up").length;
  const priority = mailItems.filter((m) => m.priority).length;
  const junk = mailItems.filter((m) => m.junkBlocked).length;

  // Top senders
  const senderCounts = new Map<string, number>();
  for (const m of mailItems) {
    senderCounts.set(m.from, (senderCounts.get(m.from) ?? 0) + 1);
  }
  const topSenders = [...senderCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sender, count]) => ({ sender, count }));

  // Wallet stats
  const totalSpent = walletTxns
    .filter((t) => t.amountCents < 0)
    .reduce((sum, t) => sum + Math.abs(t.amountCents), 0);
  const totalDeposited = walletTxns
    .filter((t) => t.amountCents > 0)
    .reduce((sum, t) => sum + t.amountCents, 0);

  // Delivery stats
  const totalDeliveries = deliveries.length;
  const deliverySpend = deliveries.reduce((sum, d) => sum + d.price, 0);

  // Request stats
  const scanRequests = mailRequests.filter((r) => r.kind === "Scan").length;
  const forwardRequests = mailRequests.filter((r) => r.kind === "Forward").length;

  return {
    year: targetYear,
    mail: { totalMail, letters, packages, scanned, forwarded, pickedUp, priority, junk },
    topSenders,
    wallet: { totalSpentCents: totalSpent, totalDepositedCents: totalDeposited },
    deliveries: { total: totalDeliveries, totalSpend: deliverySpend },
    requests: { scans: scanRequests, forwards: forwardRequests },
  };
}
