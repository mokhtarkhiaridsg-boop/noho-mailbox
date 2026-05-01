"use server";

import { prisma } from "@/lib/prisma";
import { sendContactNotification, sendContactConfirmation } from "@/lib/email";
import { z } from "zod";

const partnerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  businessName: z.string().min(1, "Business name is required"),
  phone: z.string().optional(),
  category: z.string().min(1, "Category is required"),
  clientCount: z.string().optional(),
  message: z.string().optional(),
});

export type PartnerApplicationState = {
  error?: string;
  success?: boolean;
};

export async function submitPartnerApplication(
  prevState: PartnerApplicationState,
  formData: FormData
): Promise<PartnerApplicationState> {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    businessName: formData.get("businessName") as string,
    phone: (formData.get("phone") as string) || undefined,
    category: formData.get("category") as string,
    clientCount: (formData.get("clientCount") as string) || undefined,
    message: (formData.get("message") as string) || undefined,
  };

  const result = partnerSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  // Compose a structured message body that the admin sees in the contact log.
  const composed = [
    `Business: ${result.data.businessName}`,
    `Category: ${result.data.category}`,
    result.data.phone ? `Phone: ${result.data.phone}` : null,
    result.data.clientCount ? `Approx. clients/month sent: ${result.data.clientCount}` : null,
    "",
    result.data.message || "(no additional message)",
  ]
    .filter(Boolean)
    .join("\n");

  await prisma.contactSubmission.create({
    data: {
      name: result.data.name,
      email: result.data.email,
      service: "partner-program",
      message: composed,
    },
  });

  // Fire-and-forget email notifications.
  try {
    await Promise.all([
      sendContactNotification({
        name: result.data.name,
        email: result.data.email,
        service: "partner-program",
        message: composed,
      }),
      sendContactConfirmation({
        name: result.data.name,
        email: result.data.email,
      }),
    ]);
  } catch {
    // Non-fatal — submission is saved.
  }

  return { success: true };
}
