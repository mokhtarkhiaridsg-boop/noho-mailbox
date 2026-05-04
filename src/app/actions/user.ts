"use server";

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parsePrefs, patchPrefs, type NotifEvent, type ChannelPrefs, type NotifPrefs } from "@/lib/notifPrefs";

const profileSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  phone: z.string().optional(),
});

export type ProfileState = {
  error?: string;
  success?: boolean;
};

export async function updateProfile(
  prevState: ProfileState,
  formData: FormData
): Promise<ProfileState> {
  const user = await verifySession();

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: (formData.get("phone") as string) || undefined,
  };

  const result = profileSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  // Check if email is taken by someone else
  if (result.data.email !== user.email) {
    const existing = await prisma.user.findUnique({
      where: { email: result.data.email },
    });
    if (existing) {
      return { error: "This email is already in use" };
    }
  }

  await prisma.user.update({
    where: { id: user.id },
    data: result.data,
  });

  revalidatePath("/dashboard");
  return { success: true };
}

const addressSchema = z.object({
  label: z.string().min(1, "Label is required"),
  address: z.string().min(1, "Address is required"),
});

export type AddressState = {
  error?: string;
  success?: boolean;
};

export async function addForwardingAddress(
  prevState: AddressState,
  formData: FormData
): Promise<AddressState> {
  const user = await verifySession();

  const raw = {
    label: formData.get("label") as string,
    address: formData.get("address") as string,
  };

  const result = addressSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  await prisma.forwardingAddress.create({
    data: {
      userId: user.id,
      ...result.data,
    },
  });

  revalidatePath("/dashboard");
  return { success: true };
}

export async function deleteForwardingAddress(id: string) {
  const user = await verifySession();

  const addr = await prisma.forwardingAddress.findUnique({ where: { id } });
  if (!addr || addr.userId !== user.id) {
    return { error: "Not authorized" };
  }

  await prisma.forwardingAddress.delete({ where: { id } });
  revalidatePath("/dashboard");
  return { success: true };
}

/**
 * Member: list emails sent to them (password resets, mail-arrived notices,
 * receipts, etc.). Used by the dashboard "Email History" panel.
 */
export async function getMyEmailHistory(limit = 50) {
  const user = await verifySession();
  return prisma.emailLog.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: Math.min(limit, 200),
    select: {
      id: true,
      toEmail: true,
      subject: true,
      kind: true,
      status: true,
      createdAt: true,
      sentAt: true,
    },
  });
}


// iter-84: Notification preferences. Read+write the JSON blob on User.notifPrefs.
export async function getMyNotifPrefs(): Promise<NotifPrefs> {
  const session = await verifySession();
  const u = await prisma.user.findUnique({
    where: { id: session.id },
    select: { notifPrefs: true },
  });
  return parsePrefs(u?.notifPrefs);
}

export async function updateMyNotifPrefs(event: NotifEvent, patch: Partial<ChannelPrefs>) {
  const session = await verifySession();
  const u = await prisma.user.findUnique({
    where: { id: session.id },
    select: { notifPrefs: true, phone: true },
  });
  if (!u) return { error: "User not found" };
  // SMS opt-in requires a phone number on file. Otherwise the toggle
  // would silently no-op for every send.
  if (patch.sms === true && !u.phone) {
    return { error: "Add a phone number to your profile before enabling SMS." };
  }
  const next = patchPrefs(parsePrefs(u.notifPrefs), event, patch);
  await prisma.user.update({
    where: { id: session.id },
    data: { notifPrefs: JSON.stringify(next) },
  });
  revalidatePath("/dashboard");
  return { success: true, prefs: next };
}
