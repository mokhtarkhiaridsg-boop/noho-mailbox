"use server";

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

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

  if (!suiteNumber || !from || !type) {
    return { error: "All fields are required" };
  }

  const customer = await prisma.user.findUnique({ where: { suiteNumber } });
  if (!customer) return { error: "No customer with that suite number" };

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
    },
  });

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function requestForward(mailItemId: string) {
  const user = await verifySession();

  const item = await prisma.mailItem.findUnique({ where: { id: mailItemId } });
  if (!item || item.userId !== user.id) {
    return { error: "Not authorized" };
  }

  await prisma.mailItem.update({
    where: { id: mailItemId },
    data: { status: "Forwarded" },
  });

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
