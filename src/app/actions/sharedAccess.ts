"use server";

// iter-100 — Shared mailbox access.
//
// Primary owner invites another existing NOHO member by email to view
// their packages + receive notifications. Refused if invitee isn't
// already a NOHO member (no "create on the fly" — bureau wants
// signed-up + KYC'd participants).

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

export async function inviteSharedAccess(input: { sharedUserEmail: string }): Promise<{
  error?: string;
  success?: boolean;
}> {
  const session = await verifySession();
  const primaryUserId = session.id!;
  const inviteEmail = (input.sharedUserEmail ?? "").trim().toLowerCase();
  if (!inviteEmail || !/.+@.+\..+/.test(inviteEmail)) return { error: "Valid email required" };

  const [primary, target] = await Promise.all([
    prisma.user.findUnique({ where: { id: primaryUserId }, select: { id: true, name: true, email: true, suiteNumber: true } }),
    prisma.user.findFirst({ where: { email: inviteEmail }, select: { id: true, name: true, email: true } }),
  ]);
  if (!primary) return { error: "Primary user not found" };
  if (!target) return { error: "Invitee must already be a NOHO member. Ask them to sign up first." };
  if (target.id === primaryUserId) return { error: "Can't share your mailbox with yourself" };

  // Idempotent: if a share already exists (active or revoked), reactivate.
  const existing = await prisma.sharedMailboxAccess.findFirst({
    where: { primaryUserId, sharedUserId: target.id },
  });
  if (existing) {
    if (existing.active) return { error: `Already shared with ${target.name ?? target.email}` };
    await prisma.sharedMailboxAccess.update({
      where: { id: existing.id },
      data: { active: true },
    });
  } else {
    await prisma.sharedMailboxAccess.create({
      data: { primaryUserId, sharedUserId: target.id },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: primaryUserId,
      actorRole: session.role,
      action: "share.access_granted",
      entityType: "SharedMailboxAccess",
      entityId: primaryUserId,
      metadata: JSON.stringify({ sharedUserId: target.id, sharedEmail: target.email }),
    },
  });

  // Email both sides — primary as receipt, secondary as a heads-up.
  void (async () => {
    try {
      await sendEmail({
        to: target.email,
        subject: `${primary.name ?? "A NOHO member"} shared their mailbox with you`,
        kind: "share_invited",
        userId: target.id,
        html: `<p>Hi ${(target.name ?? "there").split(" ")[0]},</p>
        <p><strong>${primary.name ?? primary.email}</strong> (suite #${primary.suiteNumber ?? "—"}) has given you read access to their NOHO Mailbox.</p>
        <p>You'll now see their incoming mail, packages, and tracking from your dashboard. The owner can revoke access any time.</p>
        <p><a href="${BASE_URL}/dashboard?tab=settings" style="color:#23596A;font-weight:700;">Open dashboard →</a></p>`,
      });
      await sendEmail({
        to: primary.email,
        subject: `Access granted to ${target.name ?? target.email}`,
        kind: "share_granted_receipt",
        userId: primaryUserId,
        html: `<p>Hi ${(primary.name ?? "there").split(" ")[0]},</p>
        <p>You shared mailbox suite #${primary.suiteNumber ?? "—"} with <strong>${target.name ?? target.email}</strong>. They can now view your incoming mail.</p>
        <p>Manage or revoke from your <a href="${BASE_URL}/dashboard?tab=settings" style="color:#23596A;font-weight:700;">settings page</a>.</p>`,
      });
    } catch (e) { console.error("[inviteSharedAccess] email failed:", e); }
  })();

  revalidatePath("/dashboard");
  return { success: true };
}

export async function listMySharedAccess(): Promise<{
  granted: Array<{ id: string; email: string; name: string | null; sinceIso: string }>;
  receivedFrom: Array<{ id: string; primaryUserId: string; email: string; name: string | null; suiteNumber: string | null; sinceIso: string }>;
}> {
  const session = await verifySession();
  const userId = session.id!;
  const [grantedRows, receivedRows] = await Promise.all([
    prisma.sharedMailboxAccess.findMany({
      where: { primaryUserId: userId, active: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, sharedUserId: true, createdAt: true },
    }),
    prisma.sharedMailboxAccess.findMany({
      where: { sharedUserId: userId, active: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, primaryUserId: true, createdAt: true },
    }),
  ]);
  const userIds = Array.from(new Set([
    ...grantedRows.map((r) => r.sharedUserId),
    ...receivedRows.map((r) => r.primaryUserId),
  ]));
  const users = userIds.length === 0
    ? []
    : await prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, name: true, email: true, suiteNumber: true },
      });
  const byId = new Map(users.map((u) => [u.id, u] as const));
  return {
    granted: grantedRows.map((r) => ({
      id: r.id,
      email: byId.get(r.sharedUserId)?.email ?? "(unknown)",
      name: byId.get(r.sharedUserId)?.name ?? null,
      sinceIso: r.createdAt.toISOString(),
    })),
    receivedFrom: receivedRows.map((r) => ({
      id: r.id,
      primaryUserId: r.primaryUserId,
      email: byId.get(r.primaryUserId)?.email ?? "(unknown)",
      name: byId.get(r.primaryUserId)?.name ?? null,
      suiteNumber: byId.get(r.primaryUserId)?.suiteNumber ?? null,
      sinceIso: r.createdAt.toISOString(),
    })),
  };
}

export async function revokeSharedAccess(shareId: string): Promise<{ error?: string; success?: boolean }> {
  const session = await verifySession();
  const userId = session.id!;
  const share = await prisma.sharedMailboxAccess.findUnique({
    where: { id: shareId },
    select: { id: true, primaryUserId: true, sharedUserId: true },
  });
  if (!share) return { error: "Share not found" };
  // Both sides can revoke — primary owner OR the shared user.
  if (share.primaryUserId !== userId && share.sharedUserId !== userId) return { error: "Not authorized" };

  await prisma.$transaction([
    prisma.sharedMailboxAccess.update({
      where: { id: shareId },
      data: { active: false },
    }),
    prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role,
        action: "share.access_revoked",
        entityType: "SharedMailboxAccess",
        entityId: shareId,
        metadata: JSON.stringify({
          primaryUserId: share.primaryUserId,
          sharedUserId: share.sharedUserId,
          revokedBy: userId === share.primaryUserId ? "primary" : "shared",
        }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  return { success: true };
}
