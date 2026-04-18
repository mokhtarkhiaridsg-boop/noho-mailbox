"use server";

/**
 * NOHO Mailbox — Express QR Pickup
 * Members show a QR code at the counter. Admin scans/enters the code to mark mail picked up.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Member: get or create a pickup token ────────────────────────────────────

export async function getPickupToken(): Promise<{ token: string; suiteNumber: string | null; name: string }> {
  const session = await verifySession();
  const userId = session.id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, suiteNumber: true, pickupToken: true },
  });

  if (!user) throw new Error("User not found");

  let token = (user as any).pickupToken as string | null;
  if (!token) {
    token = cuid().toUpperCase().slice(0, 8);
    await prisma.user.update({
      where: { id: userId },
      data: { pickupToken: token } as any,
    });
  }

  return { token, suiteNumber: user.suiteNumber, name: user.name };
}

// ─── Admin: look up customer by token and mark their mail picked up ───────────

export async function processPickupByToken(token: string) {
  await verifyAdmin();

  const user = await prisma.user.findFirst({
    where: { pickupToken: token } as any,
    select: {
      id: true,
      name: true,
      email: true,
      suiteNumber: true,
      pickupToken: true,
    },
  });

  if (!user) return { error: "Token not found — ask customer to show their QR code again" };

  // Find all mail awaiting pickup
  const pendingMail = await prisma.mailItem.findMany({
    where: {
      userId: user.id,
      status: { in: ["Received", "Scanned", "Awaiting Pickup"] },
    },
    select: { id: true, from: true, type: true, status: true },
  });

  if (pendingMail.length === 0) {
    return {
      success: true,
      user: { id: user.id, name: user.name, suiteNumber: user.suiteNumber },
      pickedUp: 0,
      items: [],
    };
  }

  // Mark all as Picked Up
  await prisma.mailItem.updateMany({
    where: { id: { in: pendingMail.map((m) => m.id) } },
    data: { status: "Picked Up" },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");

  return {
    success: true,
    user: { id: user.id, name: user.name, suiteNumber: user.suiteNumber },
    pickedUp: pendingMail.length,
    items: pendingMail,
  };
}
