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
  plan: z.string().min(1, "Please select a plan"),
});

export type AuthState = {
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

  // Parse plan ID (e.g., "business-6" → plan "Business", term "6")
  const [planName, planTerm] = plan.split("-");
  const planCapitalized = planName.charAt(0).toUpperCase() + planName.slice(1);

  // Generate suite number
  const suiteNumber = String(Math.floor(Math.random() * 900) + 100);

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.create({
    data: {
      name: `${firstName} ${lastName}`,
      email,
      phone,
      passwordHash,
      plan: planCapitalized,
      planTerm: planTerm,
      suiteNumber,
    },
  });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/dashboard",
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

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  // Look up user role to determine redirect destination
  const user = await prisma.user.findUnique({
    where: { email },
    select: { role: true },
  });
  const redirectTo = user?.role === "ADMIN" ? "/admin" : "/dashboard";

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return { error: "Invalid email or password" };
    }
    throw error; // redirect throws are expected
  }

  return { success: true };
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}
