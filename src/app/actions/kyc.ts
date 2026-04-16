"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { put } from "@vercel/blob";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per file

async function uploadToBlob(file: File, prefix: string): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error(`${file.name} is larger than 8 MB`);
  }
  const ext = file.name.split(".").pop() ?? "bin";
  const filename = `${prefix}-${Date.now()}.${ext}`;
  const blob = await put(filename, file, { access: "public" });
  return blob.url;
}

export async function submitKyc(formData: FormData) {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;

  const form1583 = formData.get("form1583") as File | null;
  const idImage = formData.get("idImage") as File | null;
  const idImage2 = formData.get("idImage2") as File | null;
  const idPrimaryExp = formData.get("idPrimaryExpDate") as string | null;
  const idSecondaryExp = formData.get("idSecondaryExpDate") as string | null;

  if (!form1583 || form1583.size === 0 || !idImage || idImage.size === 0) {
    throw new Error("Both Form 1583 and primary ID image are required");
  }
  if (!idImage2 || idImage2.size === 0) {
    throw new Error("A second form of ID is required (CMRA compliance)");
  }

  const [form1583Url, idImageUrl, idImage2Url] = await Promise.all([
    uploadToBlob(form1583, `kyc/${userId}/form1583`),
    uploadToBlob(idImage, `kyc/${userId}/id-primary`),
    uploadToBlob(idImage2, `kyc/${userId}/id-secondary`),
  ]);

  await prisma.user.update({
    where: { id: userId },
    data: {
      kycForm1583Url: form1583Url,
      kycIdImageUrl: idImageUrl,
      kycIdImage2Url: idImage2Url,
      idPrimaryExpDate: idPrimaryExp || null,
      idSecondaryExpDate: idSecondaryExp || null,
      kycStatus: "Submitted",
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: "USER",
      action: "kyc.submit",
      entityType: "User",
      entityId: userId,
    },
  });

  revalidatePath("/dashboard/pending");
  revalidatePath("/dashboard/onboarding");
  redirect("/dashboard/pending");
}
