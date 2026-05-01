"use server";

import { prisma } from "@/lib/prisma";
import { sendContactNotification, sendContactConfirmation } from "@/lib/email";
import { z } from "zod";

const affiliateAppSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email required"),
  channel: z.string().min(1, "Audience / channel is required"),
  audienceSize: z.string().optional(),
  niche: z.string().optional(),
  notes: z.string().optional(),
});

export type AffiliateApplicationState = {
  error?: string;
  success?: boolean;
};

export async function submitAffiliateApplication(
  prevState: AffiliateApplicationState,
  formData: FormData
): Promise<AffiliateApplicationState> {
  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    channel: formData.get("channel") as string,
    audienceSize: (formData.get("audienceSize") as string) || undefined,
    niche: (formData.get("niche") as string) || undefined,
    notes: (formData.get("notes") as string) || undefined,
  };

  const result = affiliateAppSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const composed = [
    `Channel: ${result.data.channel}`,
    `Audience size: ${result.data.audienceSize ?? "(not specified)"}`,
    `Niche: ${result.data.niche ?? "(not specified)"}`,
    "",
    result.data.notes || "(no additional notes)",
  ].join("\n");

  await prisma.contactSubmission.create({
    data: {
      name: result.data.name,
      email: result.data.email,
      service: "affiliate-application",
      message: composed,
    },
  });

  try {
    await Promise.all([
      sendContactNotification({
        name: result.data.name,
        email: result.data.email,
        service: "affiliate-application",
        message: composed,
      }),
      sendContactConfirmation({
        name: result.data.name,
        email: result.data.email,
      }),
    ]);
  } catch {
    // Non-fatal.
  }

  return { success: true };
}
