"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { z } from "zod";

const NOHO_ZIPS = ["91601", "91602", "91603", "91604", "91605", "91606", "91607", "91608"];

function calculatePrice(zip: string, distance?: number): { zone: string; price: number } | null {
  if (NOHO_ZIPS.includes(zip)) {
    return { zone: "NoHo", price: 5.0 };
  }
  const d = distance ?? 3;
  if (d <= 5) {
    return { zone: "Extended", price: 9.75 };
  }
  if (d <= 15) {
    return { zone: "Extended", price: 9.75 + (d - 5) * 0.75 };
  }
  return null; // out of range
}

const deliverySchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email"),
  pickupAddr: z.string().optional(),
  destination: z.string().min(1, "Delivery address is required"),
  zip: z.string().min(5, "Zip code is required"),
  distance: z.string().optional(),
  itemType: z.string().min(1, "Item type is required"),
  instructions: z.string().optional(),
});

export type DeliveryState = {
  error?: string;
  success?: boolean;
};

export async function requestDelivery(
  prevState: DeliveryState,
  formData: FormData
): Promise<DeliveryState> {
  const raw = {
    customerName: formData.get("customerName") as string,
    phone: formData.get("phone") as string,
    email: formData.get("email") as string,
    pickupAddr: (formData.get("pickupAddr") as string) || undefined,
    destination: formData.get("destination") as string,
    zip: formData.get("zip") as string,
    distance: (formData.get("distance") as string) || undefined,
    itemType: formData.get("itemType") as string,
    instructions: (formData.get("instructions") as string) || undefined,
  };

  const result = deliverySchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { zip, distance: distStr, ...data } = result.data;
  const distance = distStr ? parseFloat(distStr) : undefined;
  const pricing = calculatePrice(zip, distance);

  if (!pricing) {
    return { error: "Sorry, this address is outside our delivery range (15 mile max)" };
  }

  // Check if user is authenticated
  const session = await auth();
  const userId = session?.user?.id ?? null;

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  await prisma.deliveryOrder.create({
    data: {
      userId,
      customerName: data.customerName,
      phone: data.phone,
      email: data.email,
      pickupAddr: data.pickupAddr || "NOHO Mailbox, North Hollywood, CA",
      destination: data.destination,
      zip,
      zone: pricing.zone,
      price: pricing.price,
      itemType: data.itemType,
      instructions: data.instructions || null,
      date: dateStr,
    },
  });

  return { success: true };
}
