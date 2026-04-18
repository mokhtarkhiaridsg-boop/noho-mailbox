"use server";

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { getPlanStatus } from "@/lib/plan";
import { sendMailArrivedEmail } from "@/lib/email";
import { notifyMailArrived, notifyOversizePackage } from "@/app/actions/notifications";

export async function updateMailStatus(mailItemId: string, newStatus: string) {
  const user = await verifySession();

  // Verify ownership or admin
  const item = await prisma.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item) return { error: "Mail item not found" };

  if (item.userId !== user.id && user.role !== "ADMIN") {
    return { error: "Not authorized" };
  }

  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: {
      status: newStatus,
      scanned: newStatus === "Scanned" ? true : undefined,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function logMail(formData: FormData) {
  await verifyAdmin();

  const suiteNumber = formData.get("suite") as string;
  const from = formData.get("from") as string;
  const type = formData.get("type") as string;
  const label = (formData.get("label") as string) || null;
  const recipientName = (formData.get("recipientName") as string) || null;
  const recipientPhone = (formData.get("recipientPhone") as string) || null;
  const exteriorImageUrl = (formData.get("exteriorImageUrl") as string) || null;

  if (!suiteNumber || !from || !type) {
    return { error: "Suite number, sender, and type are required" };
  }

  const weightOzRaw = formData.get("weightOz") as string;
  const dimensions = (formData.get("dimensions") as string) || null;
  const weightOz = weightOzRaw ? parseFloat(weightOzRaw) : null;

  // Oversize = weight > 32oz (2 lbs) or any dimension > 18"
  const isOversize = (weightOz && weightOz > 32) ||
    (dimensions && /(\d+)/.test(dimensions) && parseInt(dimensions.match(/(\d+)/)?.[1] ?? "0") > 18);

  const customer = await prisma.user.findUnique({ where: { suiteNumber } });
  if (!customer) return { error: `No customer found for suite #${suiteNumber}` };

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  await prisma.mailItem.create({
    data: {
      userId: customer.id,
      from,
      type,
      status: "Received",
      scanned: false,
      label,
      date: dateStr,
      recipientName,
      recipientPhone,
      exteriorImageUrl,
      weightOz: weightOz ?? undefined,
      dimensions: dimensions ?? undefined,
    },
  });

  // Notify customer (email + in-app) — fire-and-forget, don't block response
  try {
    await Promise.all([
      sendMailArrivedEmail({
        email: customer.email,
        name: customer.name,
        suiteNumber,
        from,
        type,
        recipientName,
        photoUrl: exteriorImageUrl,
      }),
      isOversize
        ? notifyOversizePackage({ userId: customer.id, from, weightOz: weightOz ?? undefined, dimensions: dimensions ?? undefined })
        : notifyMailArrived({
            userId: customer.id,
            from,
            type: type as "Letter" | "Package",
          }),
    ]);
  } catch { /* non-fatal */ }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

async function createMailRequest(
  userId: string,
  mailItemId: string,
  kind: string,
  newStatus: string,
  notes?: string
) {
  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: { status: newStatus },
  });
  await prisma.mailRequest.create({
    data: {
      userId,
      mailItemId,
      kind,
      status: "Pending",
      notes: notes ?? null,
    },
  });
}

async function authorizeMailItem(mailItemId: string) {
  const user = await verifySession();
  const item = await prisma.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item || item.userId !== user.id) {
    return { error: "Not authorized" as const };
  }

  // Block requests when the plan is expired past the 10-day grace period
  if (user.role !== "ADMIN") {
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { planDueDate: true },
    });
    if (getPlanStatus(dbUser?.planDueDate) === "expired") {
      return { error: "Your plan has expired. Please renew to continue using mailbox services." as const };
    }
  }

  return { user, item };
}

export async function requestForward(mailItemId: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await createMailRequest(auth.user.id ?? "", mailItemId, "Forward", "Forward Requested");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function requestScan(mailItemId: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await createMailRequest(auth.user.id ?? "", mailItemId, "Scan", "Scan Requested");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

// Quick Peek — $0.50 exterior scan, charged immediately from wallet
export async function requestQuickPeek(mailItemId: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;

  const QUICK_PEEK_CENTS = 50;
  const userId = auth.user.id as string;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { walletBalanceCents: true },
  });

  if (!user || user.walletBalanceCents < QUICK_PEEK_CENTS) {
    return { error: "Insufficient wallet balance ($0.50 needed for Quick Peek)" };
  }

  const newBal = user.walletBalanceCents - QUICK_PEEK_CENTS;

  await Promise.all([
    prisma.user.update({ where: { id: userId }, data: { walletBalanceCents: newBal } }),
    prisma.walletTransaction.create({
      data: {
        id: Math.random().toString(36).slice(2),
        userId,
        kind: "Charge",
        amountCents: -QUICK_PEEK_CENTS,
        description: "Quick Peek scan ($0.50)",
        balanceAfterCents: newBal,
      },
    }),
    createMailRequest(userId, mailItemId, "QuickPeek", "Scan Requested"),
  ]);

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true, chargedCents: QUICK_PEEK_CENTS };
}

export async function requestDiscard(mailItemId: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await createMailRequest(auth.user.id ?? "", mailItemId, "Discard", "Discard Requested");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function requestPickup(mailItemId: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await createMailRequest(auth.user.id ?? "", mailItemId, "Pickup", "Pickup Requested");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function requestHold(mailItemId: string, untilDate: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: { status: "Held", holdUntil: new Date(untilDate) },
  });
  await prisma.mailRequest.create({
    data: {
      userId: auth.user.id ?? "",
      mailItemId,
      kind: "Hold",
      status: "Pending",
      notes: `Hold until ${untilDate}`,
    },
  });
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function requestReturnToSender(mailItemId: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await createMailRequest(auth.user.id ?? "", mailItemId, "Return", "Return Requested");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function requestShred(mailItemId: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await createMailRequest(auth.user.id ?? "", mailItemId, "Shred", "Shred Requested");
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function requestDeposit(mailItemId: string, bankRef: string) {
  const auth = await authorizeMailItem(mailItemId);
  if ("error" in auth) return auth;
  await createMailRequest(
    auth.user.id ?? "",
    mailItemId,
    "Deposit",
    "Deposit Requested",
    `Bank ref: ${bankRef}`
  );
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function fulfillMailRequest(requestId: string, completionNote?: string) {
  const admin = await verifyAdmin();
  const req = await prisma.mailRequest.findUnique({ where: { id: requestId } });
  if (!req) return { error: "Request not found" };

  await prisma.mailRequest.update({
    where: { id: requestId },
    data: {
      status: "Completed",
      completedAt: new Date(),
      completedBy: admin.id ?? null,
      notes: completionNote ?? req.notes,
    },
  });

  // Update the underlying mail item to its final state
  const finalStatus: Record<string, string> = {
    Scan: "Scanned",
    Forward: "Forwarded",
    Discard: "Discarded",
    Pickup: "Picked Up",
    Hold: "Held",
    Shred: "Shredded",
    Deposit: "Deposited",
  };
  await prisma.mailItem.update({
    where: { id: req.mailItemId },
    data: {
      status: finalStatus[req.kind] ?? "Completed",
      ...(req.kind === "Scan" ? { scanned: true } : {}),
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function setMailIntakeDetails(
  mailItemId: string,
  data: { weightOz?: number; dimensions?: string; exteriorImageUrl?: string }
) {
  await verifyAdmin();
  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: {
      weightOz: data.weightOz ?? undefined,
      dimensions: data.dimensions ?? undefined,
      exteriorImageUrl: data.exteriorImageUrl ?? undefined,
    },
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function updateMailLabel(mailItemId: string, label: string | null) {
  const user = await verifySession();

  const item = await prisma.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item) return { error: "Mail item not found" };

  if (item.userId !== user.id && user.role !== "ADMIN") {
    return { error: "Not authorized" };
  }

  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: { label },
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function setScanImage(mailItemId: string, scanImageUrl: string) {
  await verifyAdmin();

  const item = await prisma.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item) return { error: "Mail item not found" };

  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: {
      scanImageUrl,
      scanned: true,
      status: item.status === "Received" ? "Scanned" : item.status,
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}
