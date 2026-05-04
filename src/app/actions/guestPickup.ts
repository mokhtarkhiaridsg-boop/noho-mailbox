"use server";

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendGuestPickupAuthEmail } from "@/lib/email";
import QRCode from "qrcode";

function cuid() {
  return crypto.randomUUID();
}

export async function addGuestPickup(input: {
  guestName: string;
  guestPhone?: string;
  guestEmail?: string;
  expiresAt?: string; // ISO date string
  notes?: string;
}) {
  const session = await verifySession();
  const userId = session.id as string;

  await (prisma as any).guestPickupAuth.create({
    data: {
      id: cuid(),
      userId,
      guestName: input.guestName,
      guestPhone: input.guestPhone ?? null,
      guestEmail: input.guestEmail ?? null,
      expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
      notes: input.notes ?? null,
      active: true,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function revokeGuestPickup(guestId: string) {
  const session = await verifySession();
  const userId = session.id as string;

  const guest = await (prisma as any).guestPickupAuth.findUnique({ where: { id: guestId } });
  if (!guest || guest.userId !== userId) return { error: "Not found" };

  await (prisma as any).guestPickupAuth.update({
    where: { id: guestId },
    data: { active: false },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function getMyGuestPickups() {
  const session = await verifySession();
  const userId = session.id as string;

  const guests = await (prisma as any).guestPickupAuth.findMany({
    where: { userId, active: true },
    orderBy: { createdAt: "desc" as const },
  });

  return guests.map((g: any) => ({
    id: g.id,
    guestName: g.guestName,
    guestPhone: g.guestPhone ?? null,
    guestEmail: g.guestEmail ?? null,
    expiresAt: g.expiresAt?.toISOString() ?? null,
    usedAt: g.usedAt?.toISOString() ?? null,
    notes: g.notes ?? null,
    createdAt: g.createdAt.toISOString(),
  }));
}


// ─── iter-88: QR + email + admin-scan handlers ──────────────────────────────
// Builds on the addGuestPickup primitive above. New flow:
//   - createGuestPickupAuth: like addGuestPickup but also generates a QR
//     and emails the guest if guestEmail is set
//   - getGuestPickupQr: regenerate QR for re-print on the dashboard
//   - findGuestPickupByToken: admin-side scan handler — returns auth +
//     customer + their active packages in the same shape
//     findCustomerByPickupToken uses, so the existing CustomerPickupCard
//     can render the result
//   - markGuestAuthUsed: admin marks the auth as consumed after at least
//     one package has been confirmed picked up

export async function createGuestPickupAuth(input: {
  guestName: string;
  guestEmail?: string;
  guestPhone?: string;
  expiresAt?: string | null;
  notes?: string;
}): Promise<{ error?: string; success?: boolean; authId?: string; qrDataUrl?: string }> {
  const session = await verifySession();
  const guestName = (input.guestName ?? "").trim();
  if (!guestName) return { error: "Guest name is required" };
  const expiresAt = input.expiresAt ? new Date(input.expiresAt) : null;
  if (input.expiresAt && (!expiresAt || isNaN(expiresAt.getTime()))) {
    return { error: "Invalid expiration date" };
  }

  const customer = await prisma.user.findUnique({
    where: { id: session.id },
    select: { name: true, suiteNumber: true },
  });
  if (!customer) return { error: "Customer not found" };

  const auth = await (prisma as any).guestPickupAuth.create({
    data: {
      id: cuid(),
      userId: session.id,
      guestName,
      guestEmail: input.guestEmail?.trim() || null,
      guestPhone: input.guestPhone?.trim() || null,
      expiresAt,
      notes: input.notes?.trim() || null,
      active: true,
    },
  });

  const qrText = `NOHO-GUEST:${auth.id}`;
  const qrDataUrl = await QRCode.toDataURL(qrText, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#2D100F", light: "#ffffff" },
  });

  if (input.guestEmail) {
    void sendGuestPickupAuthEmail({
      toEmail: input.guestEmail.trim(),
      guestName,
      customerName: customer.name ?? "the customer",
      customerSuiteNumber: customer.suiteNumber ?? "—",
      qrDataUrl,
      expiresAt,
      notes: input.notes?.trim() || null,
    }).catch((e) => console.error("[createGuestPickupAuth] email failed:", e));
  }

  await prisma.auditLog.create({
    data: {
      actorId: session.id,
      actorRole: session.role,
      action: "pickup.guest_authorized",
      entityType: "GuestPickupAuth",
      entityId: auth.id,
      metadata: JSON.stringify({
        guestName,
        guestEmail: input.guestEmail ?? null,
        expiresAt: expiresAt?.toISOString() ?? null,
      }),
    },
  });

  revalidatePath("/dashboard");
  return { success: true, authId: auth.id, qrDataUrl };
}

export async function getGuestPickupQr(authId: string): Promise<{ error?: string; qrDataUrl?: string }> {
  const session = await verifySession();
  const row = await (prisma as any).guestPickupAuth.findUnique({ where: { id: authId } });
  if (!row) return { error: "Authorization not found" };
  if (row.userId !== session.id) return { error: "Not authorized" };
  const qrText = `NOHO-GUEST:${row.id}`;
  const qrDataUrl = await QRCode.toDataURL(qrText, {
    width: 320,
    margin: 1,
    errorCorrectionLevel: "M",
    color: { dark: "#2D100F", light: "#ffffff" },
  });
  return { qrDataUrl };
}

export async function findGuestPickupByToken(token: string) {
  const actor = await verifyAdmin();
  const t = (token ?? "").trim();
  if (!t) return { error: "Empty token", auth: null, customer: null };

  const auth = await (prisma as any).guestPickupAuth.findUnique({
    where: { id: t },
    select: {
      id: true,
      guestName: true,
      guestEmail: true,
      guestPhone: true,
      expiresAt: true,
      usedAt: true,
      active: true,
      notes: true,
      createdAt: true,
      user: {
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
            orderBy: { createdAt: "desc" as const },
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
      },
    },
  });

  if (!auth) return { error: "QR not found — ask the customer to re-issue.", auth: null, customer: null };
  if (!auth.active) return { error: "This guest authorization has been revoked.", auth: null, customer: null };
  if (auth.expiresAt && auth.expiresAt < new Date()) return { error: "This guest authorization expired.", auth: null, customer: null };

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "pickup.guest_scan",
      entityType: "GuestPickupAuth",
      entityId: auth.id,
      metadata: JSON.stringify({ guestName: auth.guestName, packageCount: auth.user?.mailItems.length ?? 0 }),
    },
  }).catch(() => undefined);

  return {
    auth: {
      id: auth.id,
      guestName: auth.guestName,
      guestEmail: auth.guestEmail,
      guestPhone: auth.guestPhone,
      notes: auth.notes,
      expiresAtIso: auth.expiresAt?.toISOString() ?? null,
    },
    customer: auth.user ? {
      id: auth.user.id,
      name: auth.user.name,
      email: auth.user.email,
      suiteNumber: auth.user.suiteNumber,
      activePackages: auth.user.mailItems.map((m: any) => ({
        ...m,
        createdAtIso: m.createdAt.toISOString(),
      })),
    } : null,
  };
}

export async function markGuestAuthUsed(authId: string): Promise<{ success: boolean }> {
  const actor = await verifyAdmin();
  await prisma.$transaction([
    (prisma as any).guestPickupAuth.update({
      where: { id: authId },
      data: { usedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "pickup.guest_confirm",
        entityType: "GuestPickupAuth",
        entityId: authId,
        metadata: JSON.stringify({ at: new Date().toISOString() }),
      },
    }),
  ]).catch(() => undefined);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}
