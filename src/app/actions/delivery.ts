"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
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

// ============================================================
// In-dashboard same-day delivery scheduler (members)
// ============================================================

export async function scheduleDelivery(input: {
  destination: string;
  zip: string;
  itemType: string;
  tier: "Standard" | "Rush" | "WhiteGlove";
  recipientName: string;
  recipientPhone: string;
  dimensions?: string;
  weightOz?: number;
  instructions?: string;
}) {
  const sessionUser = await verifySession();
  const userId = sessionUser.id!;

  const pricing = calculatePrice(input.zip);
  if (!pricing) return { error: "Address outside delivery range" };

  const tierMultiplier =
    input.tier === "WhiteGlove" ? 2.5 : input.tier === "Rush" ? 1.6 : 1;
  const price = +(pricing.price * tierMultiplier).toFixed(2);

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, email: true, phone: true, walletBalanceCents: true },
  });
  if (!user) return { error: "User not found" };

  const today = new Date();
  const dateStr = today.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  const order = await prisma.deliveryOrder.create({
    data: {
      userId,
      customerName: user.name,
      phone: user.phone ?? "",
      email: user.email,
      pickupAddr: "NOHO Mailbox, North Hollywood, CA",
      destination: input.destination,
      zip: input.zip,
      zone: pricing.zone,
      price,
      itemType: input.itemType,
      instructions: input.instructions ?? null,
      tier: input.tier,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      dimensions: input.dimensions ?? null,
      weightOz: input.weightOz ?? null,
      date: dateStr,
    },
  });

  // Charge wallet (simple)
  const cents = Math.round(price * 100);
  if (user.walletBalanceCents >= cents) {
    const newBal = user.walletBalanceCents - cents;
    await prisma.user.update({
      where: { id: userId },
      data: { walletBalanceCents: newBal },
    });
    await prisma.walletTransaction.create({
      data: {
        userId,
        kind: "Charge",
        amountCents: -cents,
        description: `Delivery #${order.id.slice(-6)} (${input.tier})`,
        balanceAfterCents: newBal,
      },
    });
  }

  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { success: true, orderId: order.id };
}

export async function updateDeliveryTimeline(
  orderId: string,
  status: "Picked Up" | "In Transit" | "Delivered",
  podPhotoUrl?: string
) {
  await verifyAdmin();
  const data: Record<string, unknown> = { status };
  if (status === "Picked Up") data.pickedUpAt = new Date();
  if (status === "In Transit") data.inTransitAt = new Date();
  if (status === "Delivered") {
    data.deliveredAt = new Date();
    if (podPhotoUrl) data.podPhotoUrl = podPhotoUrl;
  }
  await prisma.deliveryOrder.update({ where: { id: orderId }, data });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}
