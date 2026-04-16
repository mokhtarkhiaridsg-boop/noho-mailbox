"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export async function requestNewKey(reason: string) {
  const user = await verifySession();

  if (!reason || reason.trim().length < 3) {
    return { error: "Please describe why you need a new key" };
  }

  await prisma.keyRequest.create({
    data: {
      userId: user.id ?? "",
      reason: reason.trim(),
      status: "Pending",
      feeCents: 2500,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}
