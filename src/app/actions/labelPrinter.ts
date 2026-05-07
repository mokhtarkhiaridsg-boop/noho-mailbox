"use server";

// iter-124 — Thermal label printer.
//
// Look up a MailItem by tracking number and return everything the
// AdminLabelPrinter UI needs to render a brand-styled, print-ready
// 4×6 thermal label. Plus a QR data-URL of the tracking # for the
// scanner-friendly side.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import QRCode from "qrcode";

export type LabelData = {
  mailItemId: string;
  trackingNumber: string;
  carrier: string | null;
  customerName: string;
  customerEmail: string;
  suiteNumber: string | null;
  recipientName: string | null;
  intakeDate: string;            // free-form display from MailItem.date
  intakeAtIso: string;
  weightOz: number | null;
  dimensions: string | null;
  exteriorImageUrl: string | null;
  qrDataUrl: string;             // PNG data URL for the QR code
  labelNumber: string;           // human-friendly short ID (last 6 of MailItem.id, upper)
};

export async function findLabelByTracking(input: { tracking: string }): Promise<{ error?: string; label?: LabelData }> {
  await verifyAdmin();
  const q = input.tracking.trim();
  if (q.length < 4) return { error: "Enter at least 4 chars of the tracking number" };

  // Match exact first, then trailing/contains. Most-recent wins on ties.
  const item = await prisma.mailItem.findFirst({
    where: { trackingNumber: { contains: q } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, trackingNumber: true, carrier: true, recipientName: true,
      date: true, createdAt: true, weightOz: true, dimensions: true,
      exteriorImageUrl: true,
      user: { select: { name: true, email: true, suiteNumber: true } },
    },
  });
  if (!item) return { error: `No package found with tracking matching "${q}"` };

  // Generate a PNG QR data URL with the tracking number. Margin=1
  // keeps the quiet-zone tight so the QR is readable but compact on
  // a 4×6 thermal.
  const qrDataUrl = await QRCode.toDataURL(item.trackingNumber ?? q, {
    margin: 1, scale: 6, color: { dark: "#2D100F", light: "#F7E6C2" },
  }).catch(() => "");

  return {
    label: {
      mailItemId: item.id,
      trackingNumber: item.trackingNumber ?? q,
      carrier: item.carrier,
      customerName: item.user?.name ?? "(unknown)",
      customerEmail: item.user?.email ?? "",
      suiteNumber: item.user?.suiteNumber ?? null,
      recipientName: item.recipientName,
      intakeDate: item.date,
      intakeAtIso: item.createdAt.toISOString(),
      weightOz: item.weightOz,
      dimensions: item.dimensions,
      exteriorImageUrl: item.exteriorImageUrl,
      qrDataUrl,
      labelNumber: item.id.slice(-6).toUpperCase(),
    },
  };
}
