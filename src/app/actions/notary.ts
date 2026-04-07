"use server";

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const bookingSchema = z.object({
  date: z.string().min(1, "Date is required"),
  time: z.string().min(1, "Time is required"),
  type: z.string().min(1, "Document type is required"),
});

export type NotaryState = {
  error?: string;
  success?: boolean;
};

export async function bookNotary(
  prevState: NotaryState,
  formData: FormData
): Promise<NotaryState> {
  const user = await verifySession();

  const raw = {
    date: formData.get("date") as string,
    time: formData.get("time") as string,
    type: formData.get("type") as string,
  };

  const result = bookingSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  await prisma.notaryBooking.create({
    data: {
      userId: user.id,
      ...result.data,
    },
  });

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true };
}

export async function updateNotaryStatus(bookingId: string, status: string) {
  await verifyAdmin();

  await prisma.notaryBooking.update({
    where: { id: bookingId },
    data: { status },
  });

  revalidatePath("/admin");
  return { success: true };
}
