"use server";

/**
 * iter-135 — Multi-photo intake gallery (Tier 8 #48).
 *
 * Admin attaches supplemental photo angles to a MailItem after intake:
 * back of package, label close-up, contents, damage shot, etc. The
 * primary `exteriorImageUrl` stays separate so AI photo analysis + the
 * existing single-thumbnail reads keep working unmodified — these are
 * extras stored as JSON on the MailItem row to avoid a new table.
 *
 * Each photo is `{ id, url, label?, addedAt }`. Atomic writes + audit
 * log mirror the iter-103 webhook + iter-95 audit patterns.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

export type ExtraPhoto = {
  id: string;
  url: string;
  label?: string;
  addedAt: string;
};

const MAX_EXTRA_PHOTOS = 10;

function parseExtras(raw: string | null | undefined): ExtraPhoto[] {
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter(
      (p): p is ExtraPhoto =>
        !!p &&
        typeof p === "object" &&
        typeof (p as ExtraPhoto).id === "string" &&
        typeof (p as ExtraPhoto).url === "string",
    );
  } catch {
    return [];
  }
}

export async function listExtraPhotos(mailItemId: string): Promise<ExtraPhoto[]> {
  await verifyAdmin();
  const item = await prisma.mailItem.findUnique({
    where: { id: mailItemId },
    select: { extraPhotosJson: true },
  });
  if (!item) return [];
  return parseExtras(item.extraPhotosJson);
}

export async function addExtraPhoto(input: {
  mailItemId: string;
  url: string;
  label?: string;
}): Promise<{ error?: string; photo?: ExtraPhoto; total?: number }> {
  const actor = await verifyAdmin();
  const url = input.url.trim();
  if (!url) return { error: "Photo URL required" };
  if (!/^https?:\/\//i.test(url) && !url.startsWith("/")) {
    return { error: "URL must start with http(s):// or /" };
  }
  const label = input.label?.trim().slice(0, 60) || undefined;

  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    select: { id: true, userId: true, extraPhotosJson: true },
  });
  if (!item) return { error: "Mail item not found" };

  const existing = parseExtras(item.extraPhotosJson);
  if (existing.length >= MAX_EXTRA_PHOTOS) {
    return { error: `Max ${MAX_EXTRA_PHOTOS} extra photos per package` };
  }
  // Idempotent — re-adding the same URL is a no-op (returns the existing).
  const dup = existing.find((p) => p.url === url);
  if (dup) {
    return { photo: dup, total: existing.length };
  }

  const photo: ExtraPhoto = {
    id: randomUUID(),
    url,
    label,
    addedAt: new Date().toISOString(),
  };
  const next = [...existing, photo];

  await prisma.$transaction([
    prisma.mailItem.update({
      where: { id: item.id },
      data: { extraPhotosJson: JSON.stringify(next) },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "mailitem.extra_photo_added",
        entityType: "MailItem",
        entityId: item.id,
        metadata: JSON.stringify({
          photoId: photo.id,
          label: label ?? null,
          totalAfter: next.length,
        }),
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { photo, total: next.length };
}

export async function removeExtraPhoto(input: {
  mailItemId: string;
  photoId: string;
}): Promise<{ error?: string; total?: number }> {
  const actor = await verifyAdmin();
  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    select: { id: true, extraPhotosJson: true },
  });
  if (!item) return { error: "Mail item not found" };

  const existing = parseExtras(item.extraPhotosJson);
  const removed = existing.find((p) => p.id === input.photoId);
  if (!removed) return { error: "Photo not found" };
  const next = existing.filter((p) => p.id !== input.photoId);

  await prisma.$transaction([
    prisma.mailItem.update({
      where: { id: item.id },
      data: { extraPhotosJson: next.length > 0 ? JSON.stringify(next) : null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "mailitem.extra_photo_removed",
        entityType: "MailItem",
        entityId: item.id,
        metadata: JSON.stringify({
          photoId: input.photoId,
          removedUrl: removed.url,
          totalAfter: next.length,
        }),
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { total: next.length };
}

export async function relabelExtraPhoto(input: {
  mailItemId: string;
  photoId: string;
  label: string;
}): Promise<{ error?: string; photo?: ExtraPhoto }> {
  const actor = await verifyAdmin();
  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    select: { id: true, extraPhotosJson: true },
  });
  if (!item) return { error: "Mail item not found" };

  const existing = parseExtras(item.extraPhotosJson);
  const idx = existing.findIndex((p) => p.id === input.photoId);
  if (idx < 0) return { error: "Photo not found" };

  const newLabel = input.label.trim().slice(0, 60) || undefined;
  const updated: ExtraPhoto = { ...existing[idx]!, label: newLabel };
  const next = [...existing];
  next[idx] = updated;

  await prisma.$transaction([
    prisma.mailItem.update({
      where: { id: item.id },
      data: { extraPhotosJson: JSON.stringify(next) },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "mailitem.extra_photo_relabeled",
        entityType: "MailItem",
        entityId: item.id,
        metadata: JSON.stringify({
          photoId: input.photoId,
          newLabel: newLabel ?? null,
        }),
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { photo: updated };
}

// Helper exposed for member-facing reads. Parses + returns the full
// gallery (primary + extras), labelled, in display order. Returns []
// when nothing exists. Member-safe (no auth gate; caller filters).
export async function getMailItemGallery(input: {
  mailItemId: string;
}): Promise<{
  photos: Array<{ id: string; url: string; label?: string; isPrimary: boolean }>;
}> {
  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    select: { id: true, exteriorImageUrl: true, extraPhotosJson: true },
  });
  if (!item) return { photos: [] };

  const out: Array<{ id: string; url: string; label?: string; isPrimary: boolean }> = [];
  if (item.exteriorImageUrl) {
    out.push({ id: "primary", url: item.exteriorImageUrl, label: "Front", isPrimary: true });
  }
  for (const p of parseExtras(item.extraPhotosJson)) {
    out.push({ id: p.id, url: p.url, label: p.label, isPrimary: false });
  }
  return { photos: out };
}
