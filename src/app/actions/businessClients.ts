"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export async function createBusinessClient(input: {
  name: string;
  email: string;
  phone?: string;
  package: string;
  priceCents?: number;
}) {
  await verifyAdmin();
  if (!input.name?.trim() || !input.email?.trim()) {
    return { error: "Name and email are required" };
  }
  const client = await prisma.businessClient.create({
    data: {
      name: input.name.trim(),
      email: input.email.trim(),
      phone: input.phone?.trim() || null,
      package: input.package || "Custom",
      priceCents: input.priceCents ?? 0,
    },
  });
  revalidatePath("/admin");
  return { success: true, id: client.id };
}

export async function listBusinessClients() {
  await verifyAdmin();
  return prisma.businessClient.findMany({
    orderBy: { updatedAt: "desc" },
    take: 200,
  });
}

export async function updateBusinessClient(
  id: string,
  data: Partial<{
    stage: string;
    progress: number;
    paidCents: number;
    notes: string | null;
    package: string;
    priceCents: number;
  }>
) {
  await verifyAdmin();
  const clean = {
    ...(data.stage !== undefined && { stage: data.stage }),
    ...(data.progress !== undefined && { progress: Math.max(0, Math.min(100, data.progress)) }),
    ...(data.paidCents !== undefined && { paidCents: Math.max(0, data.paidCents) }),
    ...(data.notes !== undefined && { notes: data.notes }),
    ...(data.package !== undefined && { package: data.package }),
    ...(data.priceCents !== undefined && { priceCents: Math.max(0, data.priceCents) }),
  };
  await prisma.businessClient.update({ where: { id }, data: clean });
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteBusinessClient(id: string) {
  await verifyAdmin();
  await prisma.businessClient.delete({ where: { id } });
  revalidatePath("/admin");
  return { success: true };
}
