"use server";

import { prisma } from "@/lib/prisma";
import { sendPasswordResetEmail } from "@/lib/email";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";

export type ResetState = { error?: string; success?: boolean };

// ─── Step 1: Request a password reset link ────────────────────────────────────
export async function requestPasswordReset(
  prevState: ResetState,
  formData: FormData
): Promise<ResetState> {
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  if (!email) return { error: "Email is required." };

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, name: true, email: true },
  });

  // Always return success to avoid user-enumeration
  if (!user) return { success: true };

  // Invalidate old tokens
  await prisma.passwordResetToken.deleteMany({ where: { userId: user.id } });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt },
  });

  await sendPasswordResetEmail(user.email, user.name ?? "there", token);

  return { success: true };
}

// ─── Step 2: Validate token (used on /reset-password page load) ───────────────
export async function validateResetToken(
  token: string
): Promise<{ valid: boolean; email?: string }> {
  if (!token) return { valid: false };

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record) return { valid: false };
  if (record.usedAt) return { valid: false };
  if (record.expiresAt < new Date()) return { valid: false };

  const user = await prisma.user.findUnique({
    where: { id: record.userId },
    select: { email: true },
  });

  return { valid: true, email: user?.email };
}

// ─── Step 3: Set the new password ─────────────────────────────────────────────
export async function resetPassword(
  prevState: ResetState,
  formData: FormData
): Promise<ResetState> {
  const token = formData.get("token") as string;
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm") as string;

  if (!token || !password) return { error: "Missing required fields." };
  if (password.length < 8) return { error: "Password must be at least 8 characters." };
  if (password !== confirm) return { error: "Passwords do not match." };

  const record = await prisma.passwordResetToken.findUnique({ where: { token } });

  if (!record || record.usedAt || record.expiresAt < new Date()) {
    return { error: "This reset link is invalid or has expired." };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.update({
    where: { id: record.userId },
    data: { passwordHash },
  });

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { success: true };
}
