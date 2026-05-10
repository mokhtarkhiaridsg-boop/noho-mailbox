"use server";

/**
 * iter-176 — In-person dropoff barcode kiosk (Tier 11 #85).
 *
 * Public kiosk flow:
 *   1. Member fills suite + sender + (optional) tracking + carrier
 *   2. Server creates DropoffBarcode row + returns short code
 *   3. /dropoff page renders the printable receipt with Code 128
 *
 * Admin flow:
 *   1. At intake, scan the barcode
 *   2. Admin panel calls `lookupDropoffBarcode({code})` → fields
 *      auto-fill the existing intake form
 *   3. After saving the MailItem, `claimDropoffBarcode` freezes the
 *      barcode row + audits
 *
 * No-auth public path: anyone with a code can view the printable
 * receipt (so members can re-print or carriers can scan from the
 * package). Generation is rate-limited per IP so no spam.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import {
  generateDropoffCode,
  normalizeDropoffCode,
  DROPOFF_CARRIERS,
  DROPOFF_EXPIRY_DAYS,
  type DropoffCarrier,
} from "@/lib/dropoff-barcode";

const RATE_LIMIT_PER_IP_PER_HR = 8;

export type DropoffBarcodeRow = {
  id: string;
  code: string;
  userId: string | null;
  suiteNumber: string;
  expectedSender: string;
  expectedTracking: string | null;
  expectedCarrier: DropoffCarrier | null;
  photoUrl: string | null;
  notes: string | null;
  expiresAtIso: string;
  claimedAtIso: string | null;
  claimedById: string | null;
  claimedMailItemId: string | null;
  createdAtIso: string;
};

function toRow(r: { id: string; code: string; userId: string | null; suiteNumber: string; expectedSender: string; expectedTracking: string | null; expectedCarrier: string | null; photoUrl: string | null; notes: string | null; expiresAt: Date; claimedAt: Date | null; claimedById: string | null; claimedMailItemId: string | null; createdAt: Date }): DropoffBarcodeRow {
  return {
    id: r.id,
    code: r.code,
    userId: r.userId,
    suiteNumber: r.suiteNumber,
    expectedSender: r.expectedSender,
    expectedTracking: r.expectedTracking,
    expectedCarrier: (DROPOFF_CARRIERS as readonly string[]).includes(r.expectedCarrier ?? "") ? (r.expectedCarrier as DropoffCarrier) : null,
    photoUrl: r.photoUrl,
    notes: r.notes,
    expiresAtIso: r.expiresAt.toISOString(),
    claimedAtIso: r.claimedAt?.toISOString() ?? null,
    claimedById: r.claimedById,
    claimedMailItemId: r.claimedMailItemId,
    createdAtIso: r.createdAt.toISOString(),
  };
}

// ─── Public: generate barcode ────────────────────────────────────────
export type GenerateInput = {
  suiteNumber: string;
  expectedSender: string;
  expectedTracking?: string;
  expectedCarrier?: DropoffCarrier;
  photoUrl?: string;
  notes?: string;
};

export type GenerateResult =
  | { ok: true; code: string; row: DropoffBarcodeRow }
  | { ok: false; error: string };

export async function generateDropoffBarcode(input: GenerateInput): Promise<GenerateResult> {
  const suite = input.suiteNumber.trim().slice(0, 12);
  if (suite.length < 1) return { ok: false, error: "Suite # required." };
  const sender = input.expectedSender.trim().slice(0, 80);
  if (sender.length < 1) return { ok: false, error: "Sender required." };

  // Member opportunistic resolution: if there's a session, attach userId
  // so admin can see who generated the code. Public anonymous use also
  // allowed (kiosk in lobby, etc.).
  let userId: string | null = null;
  try {
    const session = await verifySession();
    userId = session.id ?? null;
  } catch {
    // No session — that's fine for the public kiosk flow.
  }

  // Rate limit per IP so a script can't burn the alphabet.
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip = (xff ? xff.split(",")[0]!.trim() : h.get("x-real-ip")) ?? null;
  if (ip) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    // Don't have an `ip` column on DropoffBarcode (intentional — codes
    // are not PII themselves). Use AuditLog as the rate-limit ledger.
    const recent = await prisma.auditLog.count({
      where: { action: "dropoff.barcode_generated", createdAt: { gte: since }, metadata: { contains: `"ip":"${ip}"` } },
    });
    if (recent >= RATE_LIMIT_PER_IP_PER_HR) {
      return { ok: false, error: "Too many codes generated. Try again later." };
    }
  }

  // Generate a code, retry up to 5 times on (very rare) collision.
  let code: string | null = null;
  for (let attempt = 0; attempt < 5 && !code; attempt++) {
    const candidate = generateDropoffCode();
    const exists = await prisma.dropoffBarcode.findUnique({ where: { code: candidate }, select: { id: true } });
    if (!exists) code = candidate;
  }
  if (!code) return { ok: false, error: "Could not generate code, try again." };

  const expiresAt = new Date(Date.now() + DROPOFF_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
  const carrier = input.expectedCarrier && (DROPOFF_CARRIERS as readonly string[]).includes(input.expectedCarrier)
    ? input.expectedCarrier
    : null;

  const created = await prisma.dropoffBarcode.create({
    data: {
      code,
      userId,
      suiteNumber: suite,
      expectedSender: sender,
      expectedTracking: input.expectedTracking?.trim().slice(0, 80) || null,
      expectedCarrier: carrier,
      photoUrl: input.photoUrl?.trim().slice(0, 500) || null,
      notes: input.notes?.trim().slice(0, 500) || null,
      expiresAt,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId ?? "public",
      actorRole: userId ? "MEMBER" : "PUBLIC",
      action: "dropoff.barcode_generated",
      entityType: "DropoffBarcode",
      entityId: created.id,
      metadata: JSON.stringify({ suite, sender, hasTracking: !!input.expectedTracking, ip: ip ?? null }),
    },
  });
  revalidatePath("/dropoff");
  revalidatePath(`/dropoff/${code}`);
  revalidatePath("/admin");
  return { ok: true, code, row: toRow(created) };
}

// ─── Public: lookup by code (for the printable receipt page) ─────────
export async function getDropoffBarcodeByCode(input: { code: string }): Promise<DropoffBarcodeRow | null> {
  const code = normalizeDropoffCode(input.code);
  if (code.length < 6) return null;
  const row = await prisma.dropoffBarcode.findUnique({ where: { code } });
  if (!row) return null;
  return toRow(row);
}

// ─── Admin: scan + claim ─────────────────────────────────────────────
export type AdminScanResult =
  | { ok: true; row: DropoffBarcodeRow }
  | { ok: false; error: string };

// Returns the prefilled fields for the admin intake form. Does NOT
// claim the row yet — claim happens after MailItem creation succeeds.
export async function lookupDropoffBarcode(input: { code: string }): Promise<AdminScanResult> {
  await verifyAdmin();
  const code = normalizeDropoffCode(input.code);
  if (code.length < 6) return { ok: false, error: "Invalid code." };
  const row = await prisma.dropoffBarcode.findUnique({ where: { code } });
  if (!row) return { ok: false, error: "Barcode not found." };
  if (row.claimedAt) return { ok: false, error: `Already claimed at ${row.claimedAt.toISOString()}` };
  if (row.expiresAt < new Date()) return { ok: false, error: "Barcode expired (max 14 days)." };
  return { ok: true, row: toRow(row) };
}

// Mark a barcode consumed once admin saved a MailItem from it.
export async function claimDropoffBarcode(input: { code: string; mailItemId: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const code = normalizeDropoffCode(input.code);
  const row = await prisma.dropoffBarcode.findUnique({ where: { code } });
  if (!row) return { error: "Barcode not found." };
  if (row.claimedAt) return { error: "Already claimed." };
  await prisma.$transaction([
    prisma.dropoffBarcode.update({
      where: { id: row.id },
      data: {
        claimedAt: new Date(),
        claimedById: actor.id ?? null,
        claimedMailItemId: input.mailItemId,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "dropoff.barcode_claimed",
        entityType: "DropoffBarcode",
        entityId: row.id,
        metadata: JSON.stringify({ code, mailItemId: input.mailItemId, suite: row.suiteNumber, sender: row.expectedSender }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

// ─── Admin: list recent codes ────────────────────────────────────────
export async function listRecentDropoffBarcodes(input: { limit?: number; status?: "all" | "pending" | "claimed" | "expired" } = {}): Promise<DropoffBarcodeRow[]> {
  await verifyAdmin();
  const where: Record<string, unknown> = {};
  const now = new Date();
  if (input.status === "pending") {
    where.claimedAt = null;
    where.expiresAt = { gte: now };
  } else if (input.status === "claimed") {
    where.claimedAt = { not: null };
  } else if (input.status === "expired") {
    where.claimedAt = null;
    where.expiresAt = { lt: now };
  }
  const rows = await prisma.dropoffBarcode.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: Math.max(5, Math.min(100, input.limit ?? 30)),
  });
  return rows.map(toRow);
}

// Member-side: pending barcodes for the dashboard (so members see what
// they pre-generated but haven't dropped off yet).
export async function listMyPendingDropoffBarcodes(): Promise<DropoffBarcodeRow[]> {
  const session = await verifySession();
  const userId = session.id!;
  const now = new Date();
  const rows = await prisma.dropoffBarcode.findMany({
    where: { userId, claimedAt: null, expiresAt: { gte: now } },
    orderBy: { createdAt: "desc" },
    take: 20,
  });
  return rows.map(toRow);
}
