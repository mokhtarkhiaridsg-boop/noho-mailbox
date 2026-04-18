"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { calculateDeliveryPrice } from "@/lib/delivery-zones";
import { notifyDeliveryUpdate } from "@/app/actions/notifications";

const deliverySchema = z.object({
  customerName: z.string().min(1, "Name is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email"),
  pickupAddr: z.string().optional(),
  destination: z.string().min(1, "Delivery address is required"),
  zip: z.string().min(5, "Zip code is required"),
  tier: z.enum(["Standard", "Rush", "WhiteGlove"]).optional(),
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
    tier: (formData.get("tier") as string) || "Standard",
    itemType: formData.get("itemType") as string,
    instructions: (formData.get("instructions") as string) || undefined,
  };

  const result = deliverySchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { zip, tier, ...data } = result.data;
  const safeTier = (tier ?? "Standard") as "Standard" | "Rush" | "WhiteGlove";
  const pricing = calculateDeliveryPrice(zip, safeTier);

  if (!pricing) {
    return { error: "Sorry, this address is outside our delivery area. Zones beyond 30 miles — please call us for a custom quote." };
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
      pickupAddr: data.pickupAddr || "NOHO Mailbox, 5062 Lankershim Blvd, North Hollywood, CA 91601",
      destination: data.destination,
      zip,
      zone: pricing.zone.name,
      price: pricing.price,
      itemType: data.itemType,
      instructions: data.instructions || null,
      tier: safeTier,
      etaWindow: pricing.zone.etaWindow,
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

  const pricing = calculateDeliveryPrice(input.zip, input.tier);
  if (!pricing) return { error: "Address outside delivery range. Please call us for a custom quote." };

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
      pickupAddr: "NOHO Mailbox, 5062 Lankershim Blvd, North Hollywood, CA 91601",
      destination: input.destination,
      zip: input.zip,
      zone: pricing.zone.name,
      price: pricing.price,
      itemType: input.itemType,
      instructions: input.instructions ?? null,
      tier: input.tier,
      etaWindow: pricing.zone.etaWindow,
      recipientName: input.recipientName,
      recipientPhone: input.recipientPhone,
      dimensions: input.dimensions ?? null,
      weightOz: input.weightOz ?? null,
      date: dateStr,
    },
  });

  // Charge wallet (simple)
  const cents = Math.round(pricing.price * 100);
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
        description: `Delivery #${order.id.slice(-6)} (${input.tier} · Zone ${pricing.zone.name})`,
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
  const order = await prisma.deliveryOrder.update({ where: { id: orderId }, data });
  // In-app notification for logged-in customers
  if (order.userId) {
    try {
      await notifyDeliveryUpdate({
        userId: order.userId,
        status,
        destination: order.destination,
      });
    } catch { /* non-fatal */ }
  }
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Public quote endpoint (no auth needed) ─────────────────────────────────
export async function getDeliveryQuote(zip: string, tier: "Standard" | "Rush" | "WhiteGlove" = "Standard") {
  const pricing = calculateDeliveryPrice(zip, tier);
  if (!pricing) return null;
  return {
    zone: pricing.zone.name,
    zoneLabel: pricing.zone.label,
    description: pricing.zone.description,
    price: pricing.price,
    etaWindow: pricing.zone.etaWindow,
  };
}
