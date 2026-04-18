"use server";

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import {
  getShippingRates,
  purchaseLabel,
  getTrackingStatus,
  isShippoConfigured,
  NOHO_ORIGIN,
  type ShippoAddress,
  type ShippoParcel,
} from "@/lib/shippo";
function cuid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// ─── Get live rates ──────────────────────────────────────────────────────────

export async function getShippoRates(input: {
  toName: string;
  toStreet: string;
  toCity: string;
  toState: string;
  toZip: string;
  toPhone?: string;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightOz: number;
  fromAddress?: ShippoAddress;
}) {
  await verifyAdmin();

  if (!isShippoConfigured()) {
    return { error: "Shippo not configured. Add SHIPPO_API_KEY to your environment." };
  }

  const to: ShippoAddress = {
    name: input.toName,
    street1: input.toStreet,
    city: input.toCity,
    state: input.toState,
    zip: input.toZip,
    country: "US",
    phone: input.toPhone,
  };

  const parcel: ShippoParcel = {
    lengthIn: input.lengthIn,
    widthIn: input.widthIn,
    heightIn: input.heightIn,
    weightOz: input.weightOz,
  };

  const rates = await getShippingRates(to, parcel, input.fromAddress ?? NOHO_ORIGIN);
  if (!rates) return { error: "Failed to fetch rates from Shippo. Check your API key." };
  return { rates };
}

// ─── Buy a label (admin quick-ship) ─────────────────────────────────────────

export async function buyShippoLabel(input: {
  rateObjectId: string;
  toName: string;
  toStreet: string;
  toCity: string;
  toState: string;
  toZip: string;
  lengthIn?: number;
  widthIn?: number;
  heightIn?: number;
  weightOz?: number;
  userId?: string;
  mailItemId?: string;
  deliveryOrderId?: string;
  labelFormat?: "PDF" | "PNG" | "ZPLII";
}) {
  await verifyAdmin();

  if (!isShippoConfigured()) {
    return { error: "Shippo not configured." };
  }

  const label = await purchaseLabel(input.rateObjectId, input.labelFormat ?? "PDF");
  if (!label) return { error: "Label purchase failed. Check your Shippo account balance." };

  const id = cuid();

  await prisma.shippoLabel.create({
    data: {
      id,
      userId: input.userId ?? null,
      mailItemId: input.mailItemId ?? null,
      deliveryOrderId: input.deliveryOrderId ?? null,
      transactionId: label.transactionId,
      shipmentId: label.shipmentId,
      carrier: label.carrier,
      servicelevel: label.servicelevel,
      trackingNumber: label.trackingNumber,
      trackingUrl: label.trackingUrlProvider,
      labelUrl: label.labelUrl,
      amountPaid: parseFloat(label.amountPaid),
      toName: input.toName,
      toStreet: input.toStreet,
      toCity: input.toCity,
      toState: input.toState,
      toZip: input.toZip,
      lengthIn: input.lengthIn ?? null,
      widthIn: input.widthIn ?? null,
      heightIn: input.heightIn ?? null,
      weightOz: input.weightOz ?? null,
    },
  });

  revalidatePath("/admin");
  return { success: true, label, id };
}

// ─── Get labels list (admin) ──────────────────────────────────────────────────

export async function getShippoLabels(limit = 50) {
  await verifyAdmin();
  const labels = await prisma.shippoLabel.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { user: { select: { name: true, suiteNumber: true } } },
  });
  return labels;
}

// ─── Track a label ─────────────────────────────────────────────────────────────

export async function trackShippoLabel(carrier: string, trackingNumber: string) {
  await verifyAdmin();
  if (!isShippoConfigured()) return { error: "Shippo not configured." };
  const status = await getTrackingStatus(carrier, trackingNumber);
  if (!status) return { error: "Could not fetch tracking status." };
  return { status };
}

// ─── Member uploads their own pre-paid label ──────────────────────────────────

export async function uploadMemberLabel(input: {
  filename: string;
  url: string;
  carrier?: string;
  trackingNum?: string;
  notes?: string;
}) {
  const session = await verifySession();
  const id = cuid();

  await prisma.labelUpload.create({
    data: {
      id,
      userId: session.id!,
      filename: input.filename,
      url: input.url,
      carrier: input.carrier ?? null,
      trackingNum: input.trackingNum ?? null,
      notes: input.notes ?? null,
    },
  });

  revalidatePath("/dashboard");
  return { success: true, id };
}

// ─── Admin updates label upload status ───────────────────────────────────────

export async function updateLabelUploadStatus(
  uploadId: string,
  status: "uploaded" | "picked_up" | "shipped"
) {
  await verifyAdmin();
  await prisma.labelUpload.update({ where: { id: uploadId }, data: { status } });
  revalidatePath("/admin");
  return { success: true };
}
