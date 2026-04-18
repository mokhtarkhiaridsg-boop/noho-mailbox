"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export async function getVaultItems() {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;

  return prisma.documentVaultItem.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteVaultItem(id: string) {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;

  // Verify ownership
  const item = await prisma.documentVaultItem.findUnique({ where: { id } });
  if (!item || item.userId !== userId) {
    throw new Error("Not found or unauthorized");
  }

  await prisma.documentVaultItem.delete({ where: { id } });
  revalidatePath("/dashboard");
}

export async function uploadVaultItem(input: {
  title: string;
  blobUrl: string;
  kind: string;
  mimeType: string;
  sizeBytes: number;
}) {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;

  await prisma.documentVaultItem.create({
    data: {
      userId,
      title: input.title,
      blobUrl: input.blobUrl,
      kind: input.kind,
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
    },
  });

  revalidatePath("/dashboard");
}
