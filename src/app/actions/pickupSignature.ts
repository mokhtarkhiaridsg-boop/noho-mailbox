"use server";

/**
 * iter-137 — Pickup signature capture (Tier 8 #49).
 *
 * Customer signs on a tablet at the bureau counter when picking up
 * their package. The signature SVG (path data only — admin renderer
 * wraps it in <svg>/<path> at display time) is stored on MailItem
 * alongside the typed legal name + signed timestamp. Audit log row
 * captures who flipped the bit + the byte count for chain-of-custody.
 *
 * The status flip to "Picked Up" happens via the existing
 * `updateMailStatus` flow — this action is a SEPARATE atomic write
 * that the admin panel calls BEFORE the status flip, so the receipt
 * email + SMS that fire on Picked Up can already include the captured
 * signature.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

const MAX_SVG_BYTES = 50_000; // ~50 KB — way more than a real signature ever needs

export type PickupSignaturePayload = {
  mailItemId: string;
  signaturePathData: string; // SVG path-data string (no <svg>/<path> wrapper)
  signerName: string;        // typed legal name shown beneath the signature
  viewBox?: string;          // optional — defaults to "0 0 600 200"
};

export async function recordPickupSignature(
  input: PickupSignaturePayload,
): Promise<{ error?: string; success?: boolean; signedAtIso?: string }> {
  const actor = await verifyAdmin();
  const id = input.mailItemId.trim();
  const path = input.signaturePathData.trim();
  const name = input.signerName.trim();
  const viewBox = (input.viewBox ?? "0 0 600 200").trim();

  if (!id) return { error: "Mail item id required" };
  if (!path) return { error: "Signature can't be empty — ask the customer to sign" };
  if (path.length > MAX_SVG_BYTES) {
    return { error: `Signature too large (${path.length} > ${MAX_SVG_BYTES} bytes)` };
  }
  if (!name) return { error: "Signer name required (typed legal name under the signature)" };
  if (name.length > 120) return { error: "Signer name max 120 chars" };
  // Guard against malicious markup — we ONLY accept path-data syntax.
  if (/<|>|script|onload|onerror|javascript:/i.test(path)) {
    return { error: "Signature path contains disallowed characters" };
  }

  const item = await prisma.mailItem.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!item) return { error: "Mail item not found" };

  // Compose a wrapped SVG document on write so the rendered version is
  // self-contained in any context (receipt email, audit page, PDF).
  const fullSvg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewBox}" preserveAspectRatio="xMidYMid meet">` +
    `<path d="${path}" fill="none" stroke="#1A1D23" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>` +
    `</svg>`;

  const signedAt = new Date();

  await prisma.$transaction([
    prisma.mailItem.update({
      where: { id },
      data: {
        pickupSignatureSvg: fullSvg,
        pickupSignerName: name,
        pickupSignedAt: signedAt,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "mail.pickup_signature_captured",
        entityType: "MailItem",
        entityId: id,
        metadata: JSON.stringify({
          status: item.status,
          signerName: name,
          svgBytes: fullSvg.length,
        }),
      },
    }),
  ]);

  revalidatePath("/admin");
  return { success: true, signedAtIso: signedAt.toISOString() };
}

export async function clearPickupSignature(
  input: { mailItemId: string },
): Promise<{ error?: string; success?: boolean }> {
  const actor = await verifyAdmin();
  const id = input.mailItemId.trim();
  const item = await prisma.mailItem.findUnique({
    where: { id },
    select: { id: true, pickupSignerName: true },
  });
  if (!item) return { error: "Mail item not found" };
  if (!item.pickupSignerName) return { success: true }; // nothing to clear

  await prisma.$transaction([
    prisma.mailItem.update({
      where: { id },
      data: {
        pickupSignatureSvg: null,
        pickupSignerName: null,
        pickupSignedAt: null,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "mail.pickup_signature_cleared",
        entityType: "MailItem",
        entityId: id,
        metadata: JSON.stringify({ previousSigner: item.pickupSignerName }),
      },
    }),
  ]);

  revalidatePath("/admin");
  return { success: true };
}

export async function getPickupSignature(
  input: { mailItemId: string },
): Promise<{
  has: boolean;
  svg: string | null;
  signerName: string | null;
  signedAtIso: string | null;
}> {
  await verifyAdmin();
  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId.trim() },
    select: { pickupSignatureSvg: true, pickupSignerName: true, pickupSignedAt: true },
  });
  if (!item) return { has: false, svg: null, signerName: null, signedAtIso: null };
  return {
    has: Boolean(item.pickupSignatureSvg && item.pickupSignerName),
    svg: item.pickupSignatureSvg,
    signerName: item.pickupSignerName,
    signedAtIso: item.pickupSignedAt ? item.pickupSignedAt.toISOString() : null,
  };
}
