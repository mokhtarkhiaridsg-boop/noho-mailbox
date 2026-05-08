"use server";

// iter-127 — Bulk forward batch.
//
// Admin processes pending Forward MailRequests in one shot:
//   - List every Pending request with kind="Forward" + the customer's
//     forwarding addresses + mail item details
//   - Admin picks an address per row (default = customer's first)
//   - Bulk-process: atomic per item — flips MailItem.status="Forwarded",
//     closes the MailRequest, audit-log, optional admin note. Returns
//     per-item success/failure so the panel can mark each row.
//
// No schema changes — uses existing MailRequest + MailItem + ForwardingAddress.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export type ForwardQueueRow = {
  requestId: string;
  mailItemId: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  suiteNumber: string | null;
  trackingNumber: string | null;
  carrier: string | null;
  fromSender: string;
  intakeDate: string;
  exteriorImageUrl: string | null;
  notes: string | null;
  filedAtIso: string;
  addresses: Array<{ id: string; label: string; address: string }>;
};

export async function listPendingForwardBatch(): Promise<{ rows: ForwardQueueRow[]; count: number }> {
  await verifyAdmin();
  const requests = await prisma.mailRequest.findMany({
    where: { kind: "Forward", status: { in: ["Pending", "In Progress"] } },
    orderBy: { createdAt: "asc" },
    take: 200,
    include: {
      mailItem: {
        select: { id: true, trackingNumber: true, carrier: true, from: true, date: true, exteriorImageUrl: true },
      },
      user: {
        select: {
          id: true, name: true, email: true, suiteNumber: true,
          forwardingAddresses: { select: { id: true, label: true, address: true } },
        },
      },
    },
  });
  return {
    count: requests.length,
    rows: requests.map((r) => ({
      requestId: r.id,
      mailItemId: r.mailItemId,
      userId: r.userId,
      customerName: r.user.name,
      customerEmail: r.user.email,
      suiteNumber: r.user.suiteNumber,
      trackingNumber: r.mailItem.trackingNumber,
      carrier: r.mailItem.carrier,
      fromSender: r.mailItem.from,
      intakeDate: r.mailItem.date,
      exteriorImageUrl: r.mailItem.exteriorImageUrl,
      notes: r.notes,
      filedAtIso: r.createdAt.toISOString(),
      addresses: r.user.forwardingAddresses,
    })),
  };
}

export type BatchInput = {
  items: Array<{
    requestId: string;
    addressId: string | null; // null = no specific address chosen → marker only
  }>;
  adminNote?: string | null;
};

export type BatchResult = {
  succeeded: number;
  failed: number;
  failures: Array<{ requestId: string; reason: string }>;
};

export async function processBulkForward(input: BatchInput): Promise<BatchResult> {
  const actor = await verifyAdmin();
  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { succeeded: 0, failed: 0, failures: [] };
  }
  const failures: Array<{ requestId: string; reason: string }> = [];
  let succeeded = 0;

  for (const it of input.items) {
    try {
      const r = await prisma.mailRequest.findUnique({
        where: { id: it.requestId },
        select: {
          id: true, mailItemId: true, userId: true, status: true, kind: true,
          mailItem: { select: { id: true, trackingNumber: true, carrier: true } },
        },
      });
      if (!r) { failures.push({ requestId: it.requestId, reason: "request_not_found" }); continue; }
      if (r.kind !== "Forward") { failures.push({ requestId: it.requestId, reason: "wrong_kind" }); continue; }
      if (r.status === "Completed") { failures.push({ requestId: it.requestId, reason: "already_completed" }); continue; }
      if (r.status === "Cancelled") { failures.push({ requestId: it.requestId, reason: "already_cancelled" }); continue; }

      let addressLabel: string | null = null;
      let addressBody: string | null = null;
      if (it.addressId) {
        const a = await prisma.forwardingAddress.findUnique({
          where: { id: it.addressId },
          select: { id: true, userId: true, label: true, address: true },
        });
        if (!a) { failures.push({ requestId: it.requestId, reason: "address_not_found" }); continue; }
        if (a.userId !== r.userId) { failures.push({ requestId: it.requestId, reason: "address_not_owned" }); continue; }
        addressLabel = a.label;
        addressBody = a.address;
      }

      await prisma.$transaction([
        prisma.mailRequest.update({
          where: { id: r.id },
          data: { status: "Completed", completedAt: new Date(), completedBy: actor.id ?? null },
        }),
        prisma.mailItem.update({
          where: { id: r.mailItemId },
          data: { status: "Forwarded" },
        }),
        prisma.auditLog.create({
          data: {
            actorId: actor.id ?? "unknown",
            actorRole: actor.role,
            action: "mail.forward_batch_processed",
            entityType: "MailItem",
            entityId: r.mailItemId,
            metadata: JSON.stringify({
              requestId: r.id,
              userId: r.userId,
              addressLabel, addressBody,
              tracking: r.mailItem.trackingNumber ?? null,
              carrier: r.mailItem.carrier ?? null,
              note: input.adminNote ?? null,
            }),
          },
        }),
      ]);
      succeeded += 1;
    } catch (e) {
      failures.push({ requestId: it.requestId, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  // One roll-up audit so the batch is provable as a single ops event.
  await prisma.auditLog.create({
    data: {
      actorId: actor.id ?? "unknown",
      actorRole: actor.role,
      action: "mail.forward_batch_run",
      entityType: "MailRequest",
      entityId: "(bulk)",
      metadata: JSON.stringify({
        totalRequested: input.items.length,
        succeeded, failed: failures.length,
        note: input.adminNote ?? null,
      }),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { succeeded, failed: failures.length, failures };
}
