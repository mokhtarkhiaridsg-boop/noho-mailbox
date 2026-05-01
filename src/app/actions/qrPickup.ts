"use server";

/**
 * NOHO Mailbox — Express QR Pickup
 * Members show a QR code at the counter. Admin scans/enters the code to mark mail picked up.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function cuid() {
  return crypto.randomUUID();
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
    // 12-char Crockford-base32 token = ~60 bits of entropy (was 8 chars of
    // UUID-hex = ~32 bits, brute-forceable). Crockford base32 also drops the
    // confusable I/O/L/U so admins reading it off a screen don't mis-key.
    const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // 32 chars
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    token = Array.from(bytes, (b) => ALPHABET[b % 32]).join("");
    await prisma.user.update({
      where: { id: userId },
      data: { pickupToken: token } as any,
    });
  }

  return { token, suiteNumber: user.suiteNumber, name: user.name };
}

// iter-82: Admin-side QR Express Pickup — look up customer by their
// pickup token and return them + their active packages in the same shape
// findCustomersWithActivePackages uses, so the existing CustomerPickupCard
// can render the result. Each individual confirm still flows through
// updateMailStatus so audit + email + notification fire properly (the
// older bulk-flip path skipped all of those).
export async function findCustomerByPickupToken(token: string) {
  await verifyAdmin();
  const t = (token ?? "").trim();
  if (!t) return null;
  const user = await prisma.user.findFirst({
    where: { pickupToken: t },
    select: {
      id: true,
      name: true,
      email: true,
      suiteNumber: true,
      mailItems: {
        where: {
          type: "Package",
          status: { in: ["Awaiting Pickup", "Received", "Scanned"] },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          trackingNumber: true,
          carrier: true,
          from: true,
          recipientName: true,
          status: true,
          exteriorImageUrl: true,
          createdAt: true,
        },
      },
    },
  });
  if (!user) return null;
  // Audit-log the QR scan itself so we have a record even if no
  // packages get confirmed.
  await prisma.auditLog.create({
    data: {
      actorId: (await verifyAdmin()).id,
      actorRole: "ADMIN",
      action: "pickup.qr_scan",
      entityType: "User",
      entityId: user.id,
      metadata: JSON.stringify({ tokenTail: t.slice(-4), packageCount: user.mailItems.length }),
    },
  }).catch(() => undefined);
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    suiteNumber: user.suiteNumber,
    activePackages: user.mailItems.map((m) => ({
      ...m,
      createdAtIso: m.createdAt.toISOString(),
    })),
  };
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
