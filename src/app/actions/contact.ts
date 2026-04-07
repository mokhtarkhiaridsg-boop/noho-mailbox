"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  service: z.string().optional(),
  message: z.string().min(1, "Message is required"),
});

export type ContactState = {
  error?: string;
  success?: boolean;
};

export async function submitContact(
  prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    service: (formData.get("service") as string) || undefined,
    message: formData.get("message") as string,
  };

  const result = contactSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  await prisma.contactSubmission.create({
    data: result.data,
  });

  return { success: true };
}
