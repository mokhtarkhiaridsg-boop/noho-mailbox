"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const MAX_BYTES = 8 * 1024 * 1024; // 8 MB per file

async function fileToDataUrl(file: File): Promise<string> {
  if (file.size > MAX_BYTES) {
    throw new Error(`${file.name} is larger than 8 MB`);
  }
  const buf = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "application/octet-stream";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

export async function submitKyc(formData: FormData) {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;

  const form1583 = formData.get("form1583") as File | null;
  const idImage = formData.get("idImage") as File | null;

  if (!form1583 || form1583.size === 0 || !idImage || idImage.size === 0) {
    throw new Error("Both Form 1583 and ID image are required");
  }

  const [form1583Url, idImageUrl] = await Promise.all([
    fileToDataUrl(form1583),
    fileToDataUrl(idImage),
  ]);

  await prisma.user.update({
    where: { id: userId },
    data: {
      kycForm1583Url: form1583Url,
      kycIdImageUrl: idImageUrl,
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
