"use server";

/**
 * iter-149 — Photo OCR address parser server action (Tier 9 #59).
 *
 * Admin uploads an envelope photo via /api/upload, then calls this with
 * the resulting URL. We delegate to `extractEnvelopeAddress` (which
 * hits Claude Vision), audit-log the attempt, and return the parsed
 * fields ready to pre-fill the intake form.
 *
 * If a recipient name was extracted, we ALSO run iter-139 smart routing
 * inline so the panel can directly suggest a customer match — saves the
 * admin a round trip.
 */

import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { extractEnvelopeAddress, type AddressOcrResult } from "@/lib/aiAddressOcr";
import { routeRecipientName, type SmartRouteCandidate } from "@/app/actions/smartRouting";

export type ParseEnvelopeResult = {
  ok: true;
  recipientName: string | null;
  recipientCo: string | null;
  suiteNumber: string | null;
  trackingNumber: string | null;
  carrier: AddressOcrResult["carrier"];
  senderName: string | null;
  confidence: "high" | "medium" | "low";
  notes: string | null;
  // iter-139 smart-routing overlay — empty when no recipient was extracted.
  routedTopMatch: SmartRouteCandidate | null;
} | {
  ok: false;
  error: string;
};

export async function parseEnvelopePhoto(input: { imageUrl: string }): Promise<ParseEnvelopeResult> {
  const actor = await verifyAdmin();
  const url = input.imageUrl.trim();
  if (!url) return { ok: false, error: "Image URL required" };

  const ocr = await extractEnvelopeAddress(url);
  if (!ocr.ok) {
    // Audit failures so admin knows when API key is missing / rate limited.
    void prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "intake.ocr_failed",
        entityType: "image",
        entityId: url.slice(-64),
        metadata: JSON.stringify({ reason: ocr.reason, detail: ocr.detail ?? null }),
      },
    }).catch(() => undefined);
    return {
      ok: false,
      error: ocr.reason === "no_api_key"
        ? "AI photo parsing isn't configured (ANTHROPIC_API_KEY missing) — fill the intake form manually."
        : ocr.reason === "rate_limited"
          ? "AI service is rate limited — try again in a minute."
          : `Couldn't read the photo: ${ocr.reason}${ocr.detail ? ` (${ocr.detail})` : ""}`,
    };
  }

  // Smart-routing inline overlay — only when we got a recipient name.
  // routeRecipientName already audit-logs `intake.smart_routed` so we
  // don't double-log here.
  let routedTopMatch: SmartRouteCandidate | null = null;
  if (ocr.recipientName) {
    try {
      const route = await routeRecipientName({ recipient: ocr.recipientName });
      routedTopMatch = route.autoPick ?? route.candidates[0] ?? null;
    } catch {
      routedTopMatch = null;
    }
  }

  void prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "intake.ocr_parsed",
      entityType: "image",
      entityId: url.slice(-64),
      metadata: JSON.stringify({
        confidence: ocr.confidence,
        carrier: ocr.carrier,
        hasRecipient: Boolean(ocr.recipientName),
        hasTracking: Boolean(ocr.trackingNumber),
        hasSuite: Boolean(ocr.suiteNumber),
        topMatchScore: routedTopMatch?.score ?? null,
        topMatchUserId: routedTopMatch?.userId ?? null,
      }),
    },
  }).catch(() => undefined);

  return {
    ok: true,
    recipientName: ocr.recipientName,
    recipientCo: ocr.recipientCo,
    suiteNumber: ocr.suiteNumber,
    trackingNumber: ocr.trackingNumber,
    carrier: ocr.carrier,
    senderName: ocr.senderName,
    confidence: ocr.confidence,
    notes: ocr.notes,
    routedTopMatch,
  };
}
