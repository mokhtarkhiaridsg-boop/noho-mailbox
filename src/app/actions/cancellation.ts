"use server";

/**
 * NOHO Mailbox — Cancellation Workflow
 * Member requests → admin reviews → grace period → mailbox release → record retention
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { createNotification } from "@/app/actions/notifications";

function cuid() {
  return crypto.randomUUID();
}

// Member submits cancellation request
export async function requestCancellation(reason: string) {
  const session = await verifySession();
  const userId = session.id as string;

  // Check for existing pending request
  const existing = await (prisma as any).cancellationRequest.findFirst({
    where: { userId, status: { in: ["Pending", "Approved"] } },
  });
  if (existing) {
    return { error: "You already have a pending cancellation request." };
  }

  await (prisma as any).cancellationRequest.create({
    data: {
      id: cuid(),
      userId,
      reason,
      status: "Pending",
    },
  });

  await createNotification({
    userId,
    type: "general",
    title: "Cancellation Request Received",
    body: "Your cancellation request has been received and is under review. We'll notify you once it's processed.",
  });

  revalidatePath("/dashboard");
  return { success: true };
}

// Member can view their own cancellation request
export async function getMyCancellationRequest() {
  const session = await verifySession();
  const userId = session.id as string;

  const req = await (prisma as any).cancellationRequest.findFirst({
    where: { userId },
    orderBy: { requestedAt: "desc" },
  });

  if (!req) return null;
  return {
    ...req,
    requestedAt: req.requestedAt.toISOString(),
    gracePeriodEnd: req.gracePeriodEnd?.toISOString() ?? null,
    completedAt: req.completedAt?.toISOString() ?? null,
  };
}

// Admin: get all cancellation requests
export async function getCancellationRequests() {
  await verifyAdmin();

  const requests = await (prisma as any).cancellationRequest.findMany({
    orderBy: { requestedAt: "desc" },
    include: {
      user: {
        select: { id: true, name: true, email: true, suiteNumber: true, plan: true },
      },
    },
  });

  return requests.map((r: any) => ({
    ...r,
    requestedAt: r.requestedAt.toISOString(),
    gracePeriodEnd: r.gracePeriodEnd?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
  }));
}

// Admin: approve cancellation — starts 30-day grace period
export async function approveCancellation(requestId: string, adminNotes?: string) {
  const admin = await verifyAdmin();

  const req = await (prisma as any).cancellationRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });
  if (!req) return { error: "Request not found" };
  if (req.status !== "Pending") return { error: "Request is not in Pending state" };

  // UTC-safe 30-day grace: was using local-TZ setDate which drifts at DST.
  const gracePeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  // Atomic: request status flip + user status flip + audit log all commit
  // together. Was two separate awaits; partial failure left customer in a
  // half-cancelled state with no record of who approved it.
  await prisma.$transaction([
    (prisma as any).cancellationRequest.update({
      where: { id: requestId },
      data: {
        status: "Approved",
        gracePeriodEnd,
        adminNotes: adminNotes ?? null,
      },
    }),
    prisma.user.update({
      where: { id: req.userId },
      data: { status: "Cancelling" },
    }),
    prisma.auditLog.create({
      data: {
        id: cuid(),
        actorId: admin.id ?? "unknown",
        actorRole: "ADMIN",
        action: "cancellation.approve",
        entityType: "User",
        entityId: req.userId,
        metadata: JSON.stringify({
          cancellationRequestId: requestId,
          gracePeriodEnd: gracePeriodEnd.toISOString(),
          adminNotes: adminNotes ?? null,
          customerReason: req.reason ?? null,
        }),
      },
    }),
  ]);

  await createNotification({
    userId: req.userId,
    type: "general",
    title: "Cancellation Approved",
    body: `Your cancellation has been approved. Your mailbox remains active until ${gracePeriodEnd.toDateString()}. Please collect any remaining mail before then.`,
  });

  revalidatePath("/admin");
  return { success: true, gracePeriodEnd: gracePeriodEnd.toISOString() };
}

// Admin: complete cancellation — releases mailbox, marks record
export async function completeCancellation(requestId: string) {
  const admin = await verifyAdmin();

  const req = await (prisma as any).cancellationRequest.findUnique({
    where: { id: requestId },
    include: { user: true },
  });
  if (!req) return { error: "Request not found" };
  if (req.status !== "Approved") return { error: "Request must be Approved before completing" };

  // Atomic: was Promise.all — partial failure left an inconsistent customer
  // state (e.g. user still Active but request marked Completed). Now adds an
  // audit row to the same transaction so account closures always have a
  // record of who triggered them and when.
  await prisma.$transaction([
    (prisma as any).cancellationRequest.update({
      where: { id: requestId },
      data: { status: "Completed", completedAt: new Date() },
    }),
    prisma.user.update({
      where: { id: req.userId },
      data: {
        status: "Cancelled",
        mailboxStatus: "Inactive",
        planAutoRenew: false,
      },
    }),
    prisma.auditLog.create({
      data: {
        id: cuid(),
        actorId: admin.id ?? "unknown",
        actorRole: "ADMIN",
        action: "cancellation.complete",
        entityType: "User",
        entityId: req.userId,
        metadata: JSON.stringify({
          cancellationRequestId: requestId,
          finalStatus: "Cancelled",
          mailboxStatus: "Inactive",
        }),
      },
    }),
  ]);

  await createNotification({
    userId: req.userId,
    type: "general",
    title: "Mailbox Closed",
    body: "Your mailbox has been officially closed. Records retained per CMRA regulations. Thank you for being a NOHO Mailbox member.",
  });

  revalidatePath("/admin");
  return { success: true };
}

// Admin: deny cancellation request
export async function denyCancellation(requestId: string, adminNotes?: string) {
  await verifyAdmin();

  const req = await (prisma as any).cancellationRequest.findUnique({ where: { id: requestId } });
  if (!req) return { error: "Request not found" };

  await (prisma as any).cancellationRequest.update({
    where: { id: requestId },
    data: { status: "Denied", adminNotes: adminNotes ?? null },
  });

  await prisma.user.update({
    where: { id: req.userId },
    data: { status: "Active" },
  });

  await createNotification({
    userId: req.userId,
    type: "general",
    title: "Cancellation Request Denied",
    body: adminNotes ?? "Your cancellation request has been denied. Please contact us if you have questions.",
  });

  revalidatePath("/admin");
  return { success: true };
}
