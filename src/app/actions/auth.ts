"use server";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";

const signupSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(1, "Phone number is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  plan: z.string().optional(),
});

export type AuthState = {
  twoFactorRequired?: boolean;
  error?: string;
  success?: boolean;
};

export async function signup(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const raw = {
    firstName: formData.get("firstName") as string,
    lastName: formData.get("lastName") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    password: formData.get("password") as string,
    plan: formData.get("plan") as string,
  };

  const result = signupSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { firstName, lastName, email, phone, password, plan } = result.data;

  // Check if email already exists
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  // Plan is optional — free members sign up without a mailbox; paid members
  // wait in /dashboard/pending until an admin assigns them a suite number.
  let planCapitalized: string | null = null;
  let planTerm: string | null = null;
  const isPaid = !!plan && plan.length > 0 && plan !== "free";

  if (isPaid) {
    const parts = plan!.split("-");
    const planName = parts[0] ?? "";
    planTerm = parts[1] ?? null;
    planCapitalized = planName.charAt(0).toUpperCase() + planName.slice(1);
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name: `${firstName} ${lastName}`,
      email,
      phone,
      passwordHash,
      plan: planCapitalized,
      planTerm: planTerm,
      // Suite assignment is now an admin workflow; mailboxStatus drives gating.
      mailboxStatus: "Pending",
    },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: isPaid ? "/dashboard/pending" : "/pricing?upgrade=1",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Failed to sign in after signup" };
    }
    throw error; // redirect throws are expected
  }

  return { success: true };
}

export async function login(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const totpToken = (formData.get("totpToken") as string | null)?.trim() || "";

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  // Look up user role + plan + mailbox status to determine redirect destination
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true, plan: true, mailboxStatus: true },
  });
  let redirectTo = "/dashboard";
  if (user?.role === "ADMIN") {
    redirectTo = "/admin";
  } else if (!user?.plan || user.plan === "Free") {
    redirectTo = "/pricing?upgrade=1";
  } else if (user.mailboxStatus !== "Active") {
    redirectTo = "/dashboard/pending";
  }

  try {
    await signIn("credentials", {
      email,
      password,
      totpToken,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const cause = (error as AuthError & { cause?: { err?: { message?: string } } }).cause?.err?.message;
      if (cause === "2FA_REQUIRED") {
        return { twoFactorRequired: true };
      }
      if (cause === "2FA_INVALID") {
        return { twoFactorRequired: true, error: "Invalid 2FA code" };
      }
      return { error: "Invalid email or password" };
    }
    throw error; // redirect throws are expected
  }

  return { success: true };
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}

export async function googleSignIn() {
  try {
    await signIn("google", { redirectTo: "/dashboard" });
  } catch (error) {
    // signIn throws a NEXT_REDIRECT on success — rethrow those
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    // Also rethrow redirect-like errors from NextAuth
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: "Google sign-in is not available. Please use email login." };
  }
}

export async function appleSignIn() {
  try {
    await signIn("apple", { redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: "Apple sign-in is not available. Please use email login." };
  }
}

export async function getOAuthConfig() {
  const { isGoogleEnabled, isAppleEnabled } = await import("@/lib/auth");
  return { isGoogleEnabled, isAppleEnabled };
}
