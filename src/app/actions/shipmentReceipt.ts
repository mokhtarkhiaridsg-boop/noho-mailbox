"use server";

/**
 * iter-212 — Postage-stamp QR receipt (Tier 15 #121).
 *
 * Admin-side: create receipts (one per outbound shipment) + bulk-print
 * 1×1in stickers. Public-side: lookup-by-token returns a recipient-
 * facing certificate page proving "this came from NOHO Mailbox".
 *
 * Privacy: recipient name on the public page is blurred to "First L."
 * — the QR ends up on a public-facing box, anyone who scans it sees
 * just enough to verify legitimacy without leaking PII.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";

const BUREAU_NAME = "NOHO Mailbox · Studio City";

export type ShipmentReceiptRow = {
  id: string;
  verifyToken: string;
  shippoLabelId: string | null;
  userId: string | null;
  senderDisplay: string;
  recipientDisplay: string;
  carrier: string | null;
  trackingNumber: string | null;
  shippedFrom: string;
  shippedAtIso: string;
  scanCount: number;
  lastScannedAtIso: string | null;
  createdAtIso: string;
  receiptUrl: string;
};

function genToken(): string {
  // 12 chars from a 9-byte buffer, base64url. ~72 bits entropy is more
  // than enough; QRs encode shorter strings as smaller modules so the
  // 1×1in sticker stays scannable.
  return randomBytes(9).toString("base64url").slice(0, 12);
}

function publicUrlFor(token: string): string {
  const base = process.env.AUTH_URL ?? "https://nohomailbox.org";
  return `${base.replace(/\/$/, "")}/receipt/${token}`;
}

function rowToView(r: { id: string; verifyToken: string; shippoLabelId: string | null; userId: string | null; senderDisplay: string; recipientDisplay: string; carrier: string | null; trackingNumber: string | null; shippedFrom: string; shippedAt: Date; scanCount: number; lastScannedAt: Date | null; createdAt: Date }): ShipmentReceiptRow {
  return {
    id: r.id, verifyToken: r.verifyToken,
    shippoLabelId: r.shippoLabelId, userId: r.userId,
    senderDisplay: r.senderDisplay, recipientDisplay: r.recipientDisplay,
    carrier: r.carrier, trackingNumber: r.trackingNumber,
    shippedFrom: r.shippedFrom,
    shippedAtIso: r.shippedAt.toISOString(),
    scanCount: r.scanCount, lastScannedAtIso: r.lastScannedAt?.toISOString() ?? null,
    createdAtIso: r.createdAt.toISOString(),
    receiptUrl: publicUrlFor(r.verifyToken),
  };
}

function blurName(full: string): string {
  const parts = full.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "—";
  if (parts.length === 1) return parts[0]!;
  return `${parts[0]} ${parts[parts.length - 1]![0]!.toUpperCase()}.`;
}

// ─── Admin: create + list ─────────────────────────────────────────────

export type CreateReceiptInput = {
  shippoLabelId?: string;
  userId?: string;
  senderName?: string;             // overrides — when admin issues for hand-shipped packages
  recipientName?: string;
  carrier?: string;
  trackingNumber?: string;
};

export async function createShipmentReceipt(input: CreateReceiptInput): Promise<{ row?: ShipmentReceiptRow; error?: string }> {
  await verifyAdmin();

  let senderName = input.senderName?.trim();
  let recipientName = input.recipientName?.trim();
  let carrier = input.carrier?.trim() || null;
  let trackingNumber = input.trackingNumber?.trim() || null;
  let shippedFrom = BUREAU_NAME;
  let userId = input.userId ?? null;

  // Resolve from ShippoLabel when provided.
  if (input.shippoLabelId) {
    const lbl = await prisma.shippoLabel.findUnique({
      where: { id: input.shippoLabelId },
      include: { user: { select: { id: true, name: true, suiteNumber: true } } },
    }).catch(() => null);
    if (!lbl) return { error: "Shippo label not found." };
    if (!senderName) senderName = lbl.user?.name ?? "NOHO Mailbox member";
    if (!recipientName) recipientName = lbl.toName;
    if (!carrier) carrier = lbl.carrier;
    if (!trackingNumber) trackingNumber = lbl.trackingNumber;
    if (!userId) userId = lbl.user?.id ?? null;
    if (lbl.user?.suiteNumber) shippedFrom = `${BUREAU_NAME} · suite #${lbl.user.suiteNumber}`;
  } else if (userId) {
    const u = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, suiteNumber: true } });
    if (u) {
      if (!senderName) senderName = u.name;
      if (u.suiteNumber) shippedFrom = `${BUREAU_NAME} · suite #${u.suiteNumber}`;
    }
  }
  if (!senderName) return { error: "Sender name required (or pass shippoLabelId / userId)." };
  if (!recipientName) return { error: "Recipient name required (or pass shippoLabelId)." };

  // Idempotency: if a receipt already exists for this Shippo label, return it.
  if (input.shippoLabelId) {
    const existing = await prisma.shipmentReceipt.findFirst({
      where: { shippoLabelId: input.shippoLabelId },
    });
    if (existing) return { row: rowToView(existing) };
  }

  // Generate a unique token (retry up to 5x in the unlikely 72-bit collision).
  let token = genToken();
  for (let i = 0; i < 5; i++) {
    const dup = await prisma.shipmentReceipt.findUnique({ where: { verifyToken: token } });
    if (!dup) break;
    token = genToken();
  }

  const created = await prisma.shipmentReceipt.create({
    data: {
      verifyToken: token,
      shippoLabelId: input.shippoLabelId ?? null,
      userId,
      senderDisplay: senderName.slice(0, 80),
      recipientDisplay: blurName(recipientName).slice(0, 80),
      carrier, trackingNumber,
      shippedFrom: shippedFrom.slice(0, 120),
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: "system", actorRole: "ADMIN",
      action: "shipment_receipt.created",
      entityType: "ShipmentReceipt", entityId: created.id,
      metadata: JSON.stringify({ token, carrier, trackingNumber, userId }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  return { row: rowToView(created) };
}

export async function listShipmentReceipts(input: { limit?: number } = {}): Promise<ShipmentReceiptRow[]> {
  await verifyAdmin();
  const limit = Math.min(200, Math.max(1, input.limit ?? 50));
  const rows = await prisma.shipmentReceipt.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return rows.map(rowToView);
}

// Admin-only quick lookup by ShippoLabel — used by the bulk-printable
// QR-sticker sheet to ensure all recent labels have a receipt.
export async function ensureReceiptsForRecentLabels(input: { sinceDays?: number } = {}): Promise<{ created: number; existing: number; total: number }> {
  await verifyAdmin();
  const sinceDays = Math.min(60, Math.max(1, input.sinceDays ?? 30));
  const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000);
  const labels = await prisma.shippoLabel.findMany({
    where: { createdAt: { gte: since }, status: { not: "refunded" } },
    select: { id: true },
    take: 500,
  });
  let created = 0, existing = 0;
  for (const l of labels) {
    const has = await prisma.shipmentReceipt.findFirst({ where: { shippoLabelId: l.id } });
    if (has) { existing += 1; continue; }
    const res = await createShipmentReceipt({ shippoLabelId: l.id });
    if (res.row) created += 1;
  }
  return { created, existing, total: labels.length };
}

// ─── Public verify ────────────────────────────────────────────────────

export type ReceiptView = {
  ok: true;
  verifyToken: string;
  senderDisplay: string;
  recipientDisplay: string;          // blurred — "First L."
  shippedFrom: string;
  shippedAtIso: string;
  carrier: string | null;
  trackingNumber: string | null;
  scanCount: number;
} | {
  ok: false;
  reason: "not_found";
};

export async function getShipmentReceiptByToken(input: { token: string }): Promise<ReceiptView> {
  const token = input.token.trim();
  if (!token) return { ok: false, reason: "not_found" };
  const row = await prisma.shipmentReceipt.findUnique({ where: { verifyToken: token } });
  if (!row) return { ok: false, reason: "not_found" };
  // Bump scan count + timestamp + audit. Throttle to once per minute
  // to avoid double-counting from React StrictMode + curl probes.
  const now = new Date();
  const lastMs = row.lastScannedAt?.getTime() ?? 0;
  if (now.getTime() - lastMs > 60_000) {
    await prisma.shipmentReceipt.update({
      where: { id: row.id },
      data: { scanCount: { increment: 1 }, lastScannedAt: now },
    }).catch(() => null);
    await prisma.auditLog.create({
      data: {
        actorId: "anonymous", actorRole: "PUBLIC",
        action: "shipment_receipt.scanned",
        entityType: "ShipmentReceipt", entityId: row.id,
        metadata: JSON.stringify({ token }),
      },
    }).catch(() => null);
  }
  return {
    ok: true,
    verifyToken: row.verifyToken,
    senderDisplay: row.senderDisplay,
    recipientDisplay: row.recipientDisplay,
    shippedFrom: row.shippedFrom,
    shippedAtIso: row.shippedAt.toISOString(),
    carrier: row.carrier,
    trackingNumber: row.trackingNumber,
    scanCount: row.scanCount + 1,    // include the just-incremented value
  };
}

// Returns the public receipt URL for a session-owner's most recent
// outbound shipments. Member dashboard uses this to surface their
// own receipts (not yet wired in this iter — server action exists for
// the next stage).
export async function listMyShipmentReceipts(): Promise<ShipmentReceiptRow[]> {
  const session = await verifySession();
  const userId = session.id!;
  const rows = await prisma.shipmentReceipt.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return rows.map(rowToView);
}
