"use server";

/**
 * NOHO Mailbox — Package Tracking Aggregator
 * Links tracking numbers to packages, generates carrier tracking URLs.
 * No API keys needed — uses carrier public tracking pages.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { getTrackingUrl, detectCarrier } from "@/lib/trackingUtils";

// Member: add tracking number to their package
export async function addTrackingToPackage(mailItemId: string, trackingNumber: string, carrier?: string) {
  const session = await verifySession();
  const userId = session.id as string;

  const item = await prisma.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item || item.userId !== userId) return { error: "Not found" };

  const detectedCarrier = carrier || detectCarrier(trackingNumber);

  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: {
      trackingNumber: trackingNumber.trim(),
      carrier: detectedCarrier,
    },
  });

  revalidatePath("/dashboard");
  return {
    success: true,
    carrier: detectedCarrier,
    trackingUrl: getTrackingUrl(detectedCarrier, trackingNumber.trim()),
  };
}

// Member: remove tracking number
export async function removeTrackingFromPackage(mailItemId: string) {
  const session = await verifySession();
  const userId = session.id as string;

  const item = await prisma.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item || item.userId !== userId) return { error: "Not found" };

  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: { trackingNumber: null, carrier: null },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// Admin: set tracking info on any package
export async function adminSetTracking(mailItemId: string, trackingNumber: string, carrier: string) {
  await verifyAdmin();

  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: { trackingNumber, carrier },
  });

  revalidatePath("/admin");
  return { success: true };
}

// Member: get all their packages with tracking
export async function getMyTrackedPackages() {
  const session = await verifySession();
  const userId = session.id as string;

  const items = await prisma.mailItem.findMany({
    where: {
      userId,
      trackingNumber: { not: null },
    },
    select: {
      id: true,
      from: true,
      type: true,
      status: true,
      date: true,
      trackingNumber: true,
      carrier: true,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return items.map((item) => ({
    ...item,
    trackingUrl: item.trackingNumber && item.carrier
      ? getTrackingUrl(item.carrier, item.trackingNumber)
      : null,
  }));
}
