"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { generateSecret, generateUri, verifyToken } from "@/lib/totp";

export async function enable2FA() {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;

  const secret = generateSecret();
  // Persist secret but DO NOT enable until confirmed by token
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: secret, totpEnabled: false },
  });
  return {
    success: true,
    secret,
    uri: generateUri(secret, sessionUser.email ?? userId),
  };
}

export async function confirm2FA(token: string) {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true },
  });
  if (!user?.totpSecret) return { error: "Run enable first" };
  if (!verifyToken(user.totpSecret, token)) return { error: "Invalid code" };
  await prisma.user.update({
    where: { id: userId },
    data: { totpEnabled: true },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

export async function disable2FA(token: string) {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { totpSecret: true, totpEnabled: true },
  });
  if (!user?.totpSecret || !user.totpEnabled) return { error: "Not enabled" };
  if (!verifyToken(user.totpSecret, token)) return { error: "Invalid code" };
  await prisma.user.update({
    where: { id: userId },
    data: { totpSecret: null, totpEnabled: false },
  });
  revalidatePath("/dashboard");
  return { success: true };
}
