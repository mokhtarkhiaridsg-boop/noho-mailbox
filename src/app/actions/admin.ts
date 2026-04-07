"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";

export async function createCustomer(formData: FormData) {
  await verifyAdmin();

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const plan = formData.get("plan") as string;
  const suiteNumber = formData.get("suite") as string;
  const password = formData.get("password") as string;

  if (!name || !email || !plan || !suiteNumber) {
    return { error: "All fields are required" };
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return { error: "Email already exists" };

  const existingSuite = await prisma.user.findUnique({ where: { suiteNumber } });
  if (existingSuite) return { error: "Suite number already taken" };

  // Use provided password or generate a random temporary one
  const tempPassword = password || Math.random().toString(36).slice(-10) + "A1!";
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await prisma.user.create({
    data: {
      name,
      email,
      passwordHash,
      plan,
      suiteNumber,
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateDeliveryStatus(
  orderId: string,
  status: string,
  courier?: string
) {
  await verifyAdmin();

  await prisma.deliveryOrder.update({
    where: { id: orderId },
    data: {
      status,
      ...(courier ? { courier } : {}),
    },
  });

  revalidatePath("/admin");
  return { success: true };
}

export async function updateShopOrderStatus(orderId: string, status: string) {
  await verifyAdmin();

  await prisma.shopOrder.update({
    where: { id: orderId },
    data: { status },
  });

  revalidatePath("/admin");
  return { success: true };
}
