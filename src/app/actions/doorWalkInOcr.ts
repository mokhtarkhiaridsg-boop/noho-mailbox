"use server";

/**
 * iter-211 — Door-camera OCR walk-in matching (Tier 15 #120).
 *
 * When iter-156 DoorAccessEntry logs an unknown attempt (or any
 * camera frame the integration uploads), we run iter-108 Vision OCR
 * via lib/aiDoorOcr.ts, suggest a User match based on detected
 * suite # or name, and queue for admin review.
 *
 * Reuses iter-108 audit pattern. No new email — admin pulls the queue
 * from the panel; if we surface a notification too aggressively we'd
 * spam them on every UPS driver.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { runDoorWalkInOcr, type DoorOcrHints } from "@/lib/aiDoorOcr";

export type DoorWalkInOcrRow = {
  id: string;
  capturedAtIso: string;
  imageUrl: string;
  doorEntryId: string | null;
  ocrText: string | null;
  ocrConfidence: number | null;
  hints: DoorOcrHints | null;
  matchedUserId: string | null;
  matchedUserName: string | null;
  matchedSuiteNumber: string | null;
  status: "Pending" | "Matched" | "Dismissed";
  reviewedAtIso: string | null;
  notes: string | null;
};

function asStatus(s: string): DoorWalkInOcrRow["status"] {
  if (s === "Matched" || s === "Dismissed") return s;
  return "Pending";
}

function rowToView(r: { id: string; capturedAt: Date; imageUrl: string; doorEntryId: string | null; ocrText: string | null; ocrConfidence: number | null; detectedHints: string | null; matchedUserId: string | null; matchedUser: { name: string; suiteNumber: string | null } | null; status: string; reviewedAt: Date | null; notes: string | null }): DoorWalkInOcrRow {
  let hints: DoorOcrHints | null = null;
  if (r.detectedHints) {
    try { hints = JSON.parse(r.detectedHints) as DoorOcrHints; } catch { /* swallow */ }
  }
  return {
    id: r.id,
    capturedAtIso: r.capturedAt.toISOString(),
    imageUrl: r.imageUrl,
    doorEntryId: r.doorEntryId,
    ocrText: r.ocrText, ocrConfidence: r.ocrConfidence, hints,
    matchedUserId: r.matchedUserId,
    matchedUserName: r.matchedUser?.name ?? null,
    matchedSuiteNumber: r.matchedUser?.suiteNumber ?? null,
    status: asStatus(r.status),
    reviewedAtIso: r.reviewedAt?.toISOString() ?? null,
    notes: r.notes,
  };
}

export type SubmitResult = {
  id?: string;
  ocrOk?: boolean;
  ocrReason?: string;
  suggestedUserId?: string | null;
  suggestedSuiteNumber?: string | null;
  error?: string;
};

// Public-ish action: bureau door-cam integrations call this with an
// already-uploaded image URL. We OCR it, suggest a member, queue for
// admin review. Verify admin so only operators (or our own integration
// using an admin token) can write.
export async function submitDoorWalkInImage(input: { imageUrl: string; doorEntryId?: string }): Promise<SubmitResult> {
  await verifyAdmin();
  const url = input.imageUrl.trim();
  if (!/^https?:\/\//i.test(url)) return { error: "Image URL must be https://." };
  if (url.length > 600) return { error: "Image URL too long." };

  const ocr = await runDoorWalkInOcr({ imageUrl: url });
  let suggestedUserId: string | null = null;
  let suggestedSuiteNumber: string | null = null;

  if (ocr.ok && ocr.hints.suiteNumber) {
    const u = await prisma.user.findUnique({
      where: { suiteNumber: ocr.hints.suiteNumber },
      select: { id: true, suiteNumber: true },
    }).catch(() => null);
    if (u) { suggestedUserId = u.id; suggestedSuiteNumber = u.suiteNumber; }
  }
  // Fallback: name-prefix match if suite # didn't resolve.
  if (!suggestedUserId && ocr.ok && ocr.hints.memberName) {
    const needle = ocr.hints.memberName.split(/\s+/)[0]?.toLowerCase();
    if (needle && needle.length >= 3) {
      const u = await prisma.user.findFirst({
        where: { name: { contains: needle } },
        select: { id: true, suiteNumber: true },
      }).catch(() => null);
      if (u) { suggestedUserId = u.id; suggestedSuiteNumber = u.suiteNumber; }
    }
  }

  const created = await prisma.doorWalkInOcr.create({
    data: {
      imageUrl: url,
      doorEntryId: input.doorEntryId ?? null,
      ocrText: ocr.ok ? ocr.ocrText : null,
      ocrConfidence: ocr.ok ? ocr.ocrConfidence : null,
      detectedHints: ocr.ok ? JSON.stringify(ocr.hints) : null,
      matchedUserId: suggestedUserId,         // pre-fill suggestion; admin still confirms via match action
      status: "Pending",
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: "system", actorRole: "SYSTEM",
      action: "door_walkin.captured",
      entityType: "DoorWalkInOcr", entityId: created.id,
      metadata: JSON.stringify({
        ocrOk: ocr.ok, ocrReason: ocr.ok ? null : ocr.reason,
        suggestedUserId, suggestedSuiteNumber,
        confidence: ocr.ok ? ocr.ocrConfidence : null,
      }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  return {
    id: created.id,
    ocrOk: ocr.ok,
    ocrReason: ocr.ok ? undefined : ocr.reason,
    suggestedUserId,
    suggestedSuiteNumber,
  };
}

export async function listDoorWalkInOcr(input: { status?: string; limit?: number } = {}): Promise<DoorWalkInOcrRow[]> {
  await verifyAdmin();
  const limit = Math.min(200, Math.max(1, input.limit ?? 50));
  const where: { status?: string } = {};
  if (input.status && ["Pending", "Matched", "Dismissed"].includes(input.status)) where.status = input.status;
  const rows = await prisma.doorWalkInOcr.findMany({
    where,
    include: { matchedUser: { select: { name: true, suiteNumber: true } } },
    orderBy: { capturedAt: "desc" },
    take: limit,
  });
  return rows.map(rowToView);
}

export async function confirmDoorWalkInMatch(input: { id: string; userId: string; notes?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.doorWalkInOcr.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Capture not found." };
  const user = await prisma.user.findUnique({ where: { id: input.userId }, select: { id: true, name: true } });
  if (!user) return { error: "Member not found." };
  await prisma.$transaction([
    prisma.doorWalkInOcr.update({
      where: { id: row.id },
      data: { status: "Matched", matchedUserId: user.id, reviewedAt: new Date(), reviewedById: actor.id, notes: input.notes?.trim().slice(0, 300) || row.notes },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "door_walkin.matched",
        entityType: "DoorWalkInOcr", entityId: row.id,
        metadata: JSON.stringify({ userId: user.id, userName: user.name }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function dismissDoorWalkIn(input: { id: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.doorWalkInOcr.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Capture not found." };
  await prisma.$transaction([
    prisma.doorWalkInOcr.update({
      where: { id: row.id },
      data: { status: "Dismissed", reviewedAt: new Date(), reviewedById: actor.id, notes: input.reason?.trim().slice(0, 300) || "false_positive" },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "door_walkin.dismissed",
        entityType: "DoorWalkInOcr", entityId: row.id,
        metadata: JSON.stringify({ reason: input.reason ?? "false_positive" }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function rerunDoorWalkInOcr(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.doorWalkInOcr.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Capture not found." };
  const ocr = await runDoorWalkInOcr({ imageUrl: row.imageUrl });
  if (!ocr.ok) return { error: `OCR failed: ${ocr.reason}` };

  let suggestedUserId: string | null = row.matchedUserId;
  if (!suggestedUserId && ocr.hints.suiteNumber) {
    const u = await prisma.user.findUnique({ where: { suiteNumber: ocr.hints.suiteNumber }, select: { id: true } }).catch(() => null);
    suggestedUserId = u?.id ?? null;
  }
  await prisma.$transaction([
    prisma.doorWalkInOcr.update({
      where: { id: row.id },
      data: {
        ocrText: ocr.ocrText, ocrConfidence: ocr.ocrConfidence,
        detectedHints: JSON.stringify(ocr.hints),
        matchedUserId: row.matchedUserId ?? suggestedUserId,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "door_walkin.ocr_rerun",
        entityType: "DoorWalkInOcr", entityId: row.id,
        metadata: JSON.stringify({ confidence: ocr.ocrConfidence, suggestedUserId }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}
