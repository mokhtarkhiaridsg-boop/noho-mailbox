"use server";

/**
 * NOHO Mailbox — Package Tracking Aggregator
 * Links tracking numbers to packages, generates carrier tracking URLs.
 * No API keys needed — uses carrier public tracking pages.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

type Carrier = "UPS" | "USPS" | "FedEx" | "DHL" | "Amazon" | "OnTrac" | "LaserShip" | "Other";

// Generate tracking URL for a given carrier + tracking number
export function getTrackingUrl(carrier: string, trackingNumber: string): string {
  switch (carrier) {
    case "UPS":
      return `https://www.ups.com/track?tracknum=${trackingNumber}`;
    case "USPS":
      return `https://tools.usps.com/go/TrackConfirmAction?tLabels=${trackingNumber}`;
    case "FedEx":
      return `https://www.fedex.com/fedextrack/?trknbr=${trackingNumber}`;
    case "DHL":
      return `https://www.dhl.com/us-en/home/tracking.html?tracking-id=${trackingNumber}`;
    case "Amazon":
      return `https://www.amazon.com/progress-tracker/package?_encoding=UTF8&orderId=${trackingNumber}`;
    case "OnTrac":
      return `https://www.ontrac.com/tracking/?number=${trackingNumber}`;
    case "LaserShip":
      return `https://www.lasership.com/track/${trackingNumber}`;
    default:
      return `https://www.google.com/search?q=${encodeURIComponent(trackingNumber + " tracking")}`;
  }
}

// Auto-detect carrier from tracking number format
export function detectCarrier(trackingNumber: string): Carrier {
  const t = trackingNumber.trim().toUpperCase();

  // UPS: starts with 1Z
  if (t.startsWith("1Z") && t.length === 18) return "UPS";

  // USPS: 9400, 9205, 9261, 9274, 9300, 9361, etc.
  if (/^(9400|9205|9261|9274|9300|9361|9400|9470|9505|420)\d/.test(t)) return "USPS";
  if (/^\d{20,22}$/.test(t)) return "USPS";

  // FedEx: 12 or 15 or 20 digits
  if (/^\d{12}$/.test(t) || /^\d{15}$/.test(t) || /^\d{20}$/.test(t)) return "FedEx";

  // DHL: starts with JD or has specific patterns
  if (t.startsWith("JD") || t.startsWith("GM") || t.startsWith("LY")) return "DHL";

  // Amazon: TBA prefix
  if (t.startsWith("TBA")) return "Amazon";

  return "Other";
}

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
