"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type NotificationType =
  | "mail_arrived"
  | "package_arrived"
  | "plan_expiring"
  | "kyc_approved"
  | "kyc_rejected"
  | "delivery_update"
  | "key_ready"
  | "general";

// ─── Create a notification (used internally / by admin) ───────────────────────

export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}) {
  const id = cuid();
  await prisma.notification.create({
    data: {
      id,
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link ?? null,
    },
  });
  revalidatePath("/dashboard");
  return { id };
}

// ─── Admin: send notification to a user ───────────────────────────────────────

export async function adminSendNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
}) {
  await verifyAdmin();
  return createNotification(input);
}

// ─── Member: get my notifications ─────────────────────────────────────────────

export async function getMyNotifications() {
  const session = await verifySession();
  const notifications = await prisma.notification.findMany({
    where: { userId: session.id! },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return notifications;
}

// ─── Member: mark as read ─────────────────────────────────────────────────────

export async function markNotificationRead(notificationId: string) {
  const session = await verifySession();
  await prisma.notification.updateMany({
    where: { id: notificationId, userId: session.id! },
    data: { read: true, readAt: new Date() },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Member: mark all as read ─────────────────────────────────────────────────

export async function markAllNotificationsRead() {
  const session = await verifySession();
  await prisma.notification.updateMany({
    where: { userId: session.id!, read: false },
    data: { read: true, readAt: new Date() },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Convenience: notify all users of mail arrival (called from admin mail intake) ─

export async function notifyMailArrived(input: {
  userId: string;
  from: string;
  type: "Letter" | "Package";
  mailItemId?: string;
}) {
  const icon = input.type === "Package" ? "📦" : "✉️";
  return createNotification({
    userId: input.userId,
    type: input.type === "Package" ? "package_arrived" : "mail_arrived",
    title: `${icon} ${input.type} from ${input.from}`,
    body: `A ${input.type.toLowerCase()} from ${input.from} has arrived at NOHO Mailbox.`,
    link: "/dashboard?tab=mail",
  });
}

// ─── Notify plan expiring soon ────────────────────────────────────────────────

export async function notifyPlanExpiring(input: {
  userId: string;
  daysLeft: number;
  planDueDate: string;
}) {
  return createNotification({
    userId: input.userId,
    type: "plan_expiring",
    title: `⚠️ Plan renewal due in ${input.daysLeft} days`,
    body: `Your mailbox plan is due on ${input.planDueDate}. Renew early to avoid interruption.`,
    link: "/dashboard?tab=settings",
  });
}

// ─── Notify KYC status change ─────────────────────────────────────────────────

export async function notifyKycStatus(input: {
  userId: string;
  status: "Approved" | "Rejected";
  notes?: string;
}) {
  const approved = input.status === "Approved";
  return createNotification({
    userId: input.userId,
    type: approved ? "kyc_approved" : "kyc_rejected",
    title: approved ? "✅ Identity Verified" : "❌ Identity Verification Issue",
    body: approved
      ? "Your identity has been verified. Your mailbox is fully activated."
      : `There was an issue with your verification${input.notes ? ": " + input.notes : ". Please resubmit."}`,
    link: "/dashboard?tab=settings",
  });
}

// ─── Notify delivery update ───────────────────────────────────────────────────

export async function notifyOversizePackage(input: {
  userId: string;
  from: string;
  weightOz?: number;
  dimensions?: string;
}) {
  const sizeNote = input.dimensions ? ` (${input.dimensions})` : "";
  const weightNote = input.weightOz ? ` · ${(input.weightOz / 16).toFixed(1)} lbs` : "";
  return createNotification({
    userId: input.userId,
    type: "package_arrived",
    title: "📦 Oversize Package Arrived",
    body: `An oversize package from ${input.from} has arrived${sizeNote}${weightNote}. Additional storage fees may apply after 30 days.`,
    link: "/dashboard?tab=mail",
  });
}

export async function notifyDeliveryUpdate(input: {
  userId: string;
  status: "Picked Up" | "In Transit" | "Delivered";
  destination: string;
}) {
  const icons: Record<string, string> = { "Picked Up": "🚗", "In Transit": "🚚", "Delivered": "✅" };
  return createNotification({
    userId: input.userId,
    type: "delivery_update",
    title: `${icons[input.status]} Delivery ${input.status}`,
    body: `Your delivery to ${input.destination} is now ${input.status.toLowerCase()}.`,
    link: "/dashboard?tab=deliveries",
  });
}
