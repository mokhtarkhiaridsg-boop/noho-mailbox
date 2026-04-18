"use server";

/**
 * NOHO Mailbox — Shared Mailbox Access
 * Primary member can grant read-only access to another registered user by email.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Grant access to another user by email
export async function grantSharedAccess(sharedUserEmail: string) {
  const session = await verifySession();
  const primaryUserId = session.id as string;

  if (session.email === sharedUserEmail) {
    return { error: "You cannot share with yourself" };
  }

  const sharedUser = await prisma.user.findUnique({
    where: { email: sharedUserEmail },
    select: { id: true, name: true },
  });
  if (!sharedUser) return { error: "No user found with that email address" };

  // Check for existing active grant
  const existing = await (prisma as any).sharedMailboxAccess.findFirst({
    where: { primaryUserId, sharedUserId: sharedUser.id, active: true },
  });
  if (existing) return { error: "Access already granted to this user" };

  await (prisma as any).sharedMailboxAccess.create({
    data: {
      id: cuid(),
      primaryUserId,
      sharedUserId: sharedUser.id,
      active: true,
    },
  });

  revalidatePath("/dashboard");
  return { success: true, sharedWith: sharedUser.name };
}

// Revoke access
export async function revokeSharedAccess(accessId: string) {
  const session = await verifySession();
  const primaryUserId = session.id as string;

  const access = await (prisma as any).sharedMailboxAccess.findUnique({ where: { id: accessId } });
  if (!access || access.primaryUserId !== primaryUserId) return { error: "Not found" };

  await (prisma as any).sharedMailboxAccess.update({
    where: { id: accessId },
    data: { active: false },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// Get users who have access to MY mailbox
export async function getMySharedAccess() {
  const session = await verifySession();
  const primaryUserId = session.id as string;

  const grants = await (prisma as any).sharedMailboxAccess.findMany({
    where: { primaryUserId, active: true },
    include: { sharedUser: { select: { name: true, email: true } } },
  });

  return grants.map((g: any) => ({
    id: g.id,
    name: g.sharedUser.name,
    email: g.sharedUser.email,
    createdAt: g.createdAt.toISOString(),
  }));
}

// Get mailboxes I have access to (as the shared user)
export async function getMailboxesICanAccess() {
  const session = await verifySession();
  const sharedUserId = session.id as string;

  const grants = await (prisma as any).sharedMailboxAccess.findMany({
    where: { sharedUserId, active: true },
    include: {
      primaryUser: {
        select: { name: true, email: true, suiteNumber: true },
      },
    },
  });

  return grants.map((g: any) => ({
    id: g.id,
    primaryUserId: g.primaryUserId,
    name: g.primaryUser.name,
    email: g.primaryUser.email,
    suiteNumber: g.primaryUser.suiteNumber,
  }));
}
