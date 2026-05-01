"use server";

import { prisma } from "@/lib/prisma";
import { sendContactNotification, sendContactConfirmation } from "@/lib/email";
import { z } from "zod";

const lawfirmQuoteSchema = z.object({
  name: z.string().min(1, "Name is required"),
  firm: z.string().min(1, "Firm name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email"),
  destination: z.string().min(1, "Destination is required"),
  urgency: z.string().min(1, "Urgency is required"),
  notes: z.string().optional(),
});

export type LawFirmQuoteState = {
  error?: string;
  success?: boolean;
};

export async function submitLawFirmQuote(
  prevState: LawFirmQuoteState,
  formData: FormData
): Promise<LawFirmQuoteState> {
  const raw = {
    name: formData.get("name") as string,
    firm: formData.get("firm") as string,
    phone: formData.get("phone") as string,
    email: formData.get("email") as string,
    destination: formData.get("destination") as string,
    urgency: formData.get("urgency") as string,
    notes: (formData.get("notes") as string) || undefined,
  };

  const result = lawfirmQuoteSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const composed = [
    `Firm: ${result.data.firm}`,
    `Phone: ${result.data.phone}`,
    `Destination: ${result.data.destination}`,
    `Urgency: ${result.data.urgency}`,
    "",
    result.data.notes || "(no additional notes)",
  ].join("\n");

  await prisma.contactSubmission.create({
    data: {
      name: result.data.name,
      email: result.data.email,
      service: "lawfirm-delivery-quote",
      message: composed,
    },
  });

  // Best-effort email notifications.
  try {
    await Promise.all([
      sendContactNotification({
        name: result.data.name,
        email: result.data.email,
        service: "lawfirm-delivery-quote",
        message: composed,
      }),
      sendContactConfirmation({
        name: result.data.name,
        email: result.data.email,
      }),
    ]);
  } catch {
    // Non-fatal — submission saved.
  }

  return { success: true };
}
