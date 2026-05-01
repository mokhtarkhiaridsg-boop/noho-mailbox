"use server";

import { prisma } from "@/lib/prisma";
import { z } from "zod";

const subscribeSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  source: z.string().default("footer"),
});

export type NewsletterState = {
  error?: string;
  success?: boolean;
};

export async function subscribeNewsletter(
  prevState: NewsletterState,
  formData: FormData
): Promise<NewsletterState> {
  const raw = {
    email: ((formData.get("email") as string) ?? "").trim().toLowerCase(),
    source: ((formData.get("source") as string) ?? "footer").trim() || "footer",
  };

  const result = subscribeSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  // Idempotent — if they already subscribed, succeed silently.
  // Use cast to access NewsletterSubscriber model since the typed client may not be regenerated yet.
  const client = (prisma as unknown) as {
    newsletterSubscriber: {
      findUnique: (args: { where: { email: string } }) => Promise<{ id: string } | null>;
      create: (args: { data: { id: string; email: string; source: string } }) => Promise<unknown>;
    };
  };

  try {
    const existing = await client.newsletterSubscriber.findUnique({
      where: { email: result.data.email },
    });
    if (existing) return { success: true };

    await client.newsletterSubscriber.create({
      data: {
        id: Math.random().toString(36).slice(2) + Date.now().toString(36),
        email: result.data.email,
        source: result.data.source,
      },
    });
    return { success: true };
  } catch (e) {
    // Don't expose DB errors to public.
    console.error("[newsletter] subscribe failed:", e);
    return { error: "Could not subscribe right now. Try again in a sec." };
  }
}
