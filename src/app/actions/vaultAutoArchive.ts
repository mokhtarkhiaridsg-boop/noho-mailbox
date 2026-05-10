"use server";

/**
 * iter-218 — Auto-archive scanned letters → vault (Tier 16 #127).
 *
 * Hooks into the iter-194 translation flow: when a member translates
 * a scanned letter (or admin manually triggers), we run iter-218
 * classifier against the OCR'd text. If it's an official document
 * (tax form, utility bill, medical, government, etc), we auto-create
 * a DocumentVaultItem with the OCR text + AI-suggested title + tags
 * indexed for full-text search.
 *
 * Member-side: searchMyVault({q}) does substring match against title
 * + extractedText + tags so members find old letters by typing
 * keywords ("ira", "PG&E", "court summons").
 *
 * Audit: `vault.auto_archived` per archive, `vault.searched` is NOT
 * audited (privacy — searches are personal).
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { classifyDocText, type DocClassification } from "@/lib/aiDocClassify";

export type AutoArchiveResult =
  | { ok: true; vaultItemId: string; category: string; title: string; alreadyArchived?: boolean }
  | { ok: false; reason: "mail_not_found" | "no_translation" | "classifier_failed" | "not_archive_worthy"; detail?: string };

// Owner OR admin can trigger. Looks up the most recent translation
// blob from MailItem.translationJson (iter-194), runs the classifier,
// upserts a DocumentVaultItem when it's archive-worthy.
export async function autoArchiveMailScan(input: { mailItemId: string }): Promise<AutoArchiveResult> {
  const session = await verifySession();
  const userId = session.id!;
  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    select: {
      id: true, userId: true, from: true, type: true,
      scanImageUrl: true, translationJson: true,
    },
  });
  if (!item) return { ok: false, reason: "mail_not_found" };
  if (item.userId !== userId && session.role !== "ADMIN") return { ok: false, reason: "mail_not_found" };

  if (!item.translationJson) return { ok: false, reason: "no_translation", detail: "Translate the scan first (lib/aiTranslation)" };

  let extractedText = "";
  try {
    const t = JSON.parse(item.translationJson) as { ok?: boolean; originalText?: string; translatedText?: string };
    if (t.ok) extractedText = (t.originalText || t.translatedText || "").trim();
  } catch { /* swallow */ }
  if (!extractedText) return { ok: false, reason: "no_translation", detail: "Translation has no readable text" };

  // Already archived? Just return it.
  const existing = await prisma.documentVaultItem.findFirst({
    where: { userId: item.userId, sourceMailItemId: item.id, autoArchived: true },
    select: { id: true, archiveCategory: true, title: true },
  });
  if (existing) {
    return { ok: true, vaultItemId: existing.id, category: existing.archiveCategory ?? "other", title: existing.title, alreadyArchived: true };
  }

  let cls: DocClassification;
  try {
    cls = await classifyDocText({ text: extractedText });
  } catch (e) {
    return { ok: false, reason: "classifier_failed", detail: e instanceof Error ? e.message : String(e) };
  }
  if (!cls.ok) return { ok: false, reason: "classifier_failed", detail: cls.reason };
  if (!cls.shouldArchive) return { ok: false, reason: "not_archive_worthy", detail: `category=${cls.category}` };

  // Combine sender into the title for member-side scannability.
  const title = `${cls.title} · ${item.from}`.slice(0, 80);
  const tags = JSON.stringify(Array.from(new Set([...cls.tags, item.from.toLowerCase().slice(0, 20)])));

  const created = await prisma.documentVaultItem.create({
    data: {
      userId: item.userId,
      kind: cls.vaultKind,
      title,
      blobUrl: item.scanImageUrl ?? "",
      mimeType: "image/jpeg",                 // scan images; PDFs will be handled when admin attaches them
      sizeBytes: 0,
      sourceMailItemId: item.id,
      tags,
      extractedText: extractedText.slice(0, 8000),
      autoArchived: true,
      archiveCategory: cls.category,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: session.id!, actorRole: session.role ?? "MEMBER",
      action: "vault.auto_archived",
      entityType: "DocumentVaultItem", entityId: created.id,
      metadata: JSON.stringify({
        mailItemId: item.id, category: cls.category, title: cls.title,
        tags: cls.tags, confidence: cls.confidence, source: cls.source,
      }),
    },
  }).catch(() => null);
  revalidatePath("/dashboard");
  return { ok: true, vaultItemId: created.id, category: cls.category, title };
}

// Member-side full-text search across own vault.
export type VaultSearchHit = {
  id: string;
  title: string;
  kind: string;
  category: string | null;
  autoArchived: boolean;
  blobUrl: string;
  createdAtIso: string;
  excerpt: string | null;
  tags: string[];
};

export async function searchMyVault(input: { q: string; limit?: number }): Promise<VaultSearchHit[]> {
  const session = await verifySession();
  const userId = session.id!;
  const q = input.q.trim().toLowerCase();
  const limit = Math.min(60, Math.max(1, input.limit ?? 25));
  if (q.length < 2) return [];

  // SQLite case-insensitive contains via two queries: title + extractedText
  // + tags. We OR them in JS rather than fighting the SQLite query planner.
  const candidates = await prisma.documentVaultItem.findMany({
    where: {
      userId,
      OR: [
        { title: { contains: q } },
        { extractedText: { contains: q } },
        { tags: { contains: q } },
        { archiveCategory: { contains: q } },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  return candidates.map((r) => {
    let excerpt: string | null = null;
    if (r.extractedText) {
      const idx = r.extractedText.toLowerCase().indexOf(q);
      if (idx >= 0) {
        const start = Math.max(0, idx - 50);
        const end = Math.min(r.extractedText.length, idx + q.length + 80);
        excerpt = `${start > 0 ? "…" : ""}${r.extractedText.slice(start, end)}${end < r.extractedText.length ? "…" : ""}`;
      } else {
        excerpt = r.extractedText.slice(0, 140) + (r.extractedText.length > 140 ? "…" : "");
      }
    }
    let tags: string[] = [];
    if (r.tags) {
      try { const j = JSON.parse(r.tags); if (Array.isArray(j)) tags = j.filter((t): t is string => typeof t === "string"); }
      catch { /* swallow */ }
    }
    return {
      id: r.id, title: r.title, kind: r.kind,
      category: r.archiveCategory, autoArchived: r.autoArchived,
      blobUrl: r.blobUrl, createdAtIso: r.createdAt.toISOString(),
      excerpt, tags,
    };
  });
}

// Admin-callable: backfill auto-archives for any translated-but-not-
// yet-archived MailItem in the last 90d.
export async function adminBackfillAutoArchive(input: { sinceDays?: number; limit?: number } = {}): Promise<{ scanned: number; archived: number; skipped: number; errors: number }> {
  await verifyAdmin();
  const sinceDays = Math.min(180, Math.max(1, input.sinceDays ?? 90));
  const limit = Math.min(200, Math.max(1, input.limit ?? 50));
  const since = new Date(Date.now() - sinceDays * 24 * 3600 * 1000);

  const candidates = await prisma.mailItem.findMany({
    where: {
      createdAt: { gte: since },
      translationJson: { not: null },
    },
    select: { id: true },
    take: limit,
  });
  let archived = 0, skipped = 0, errors = 0;
  for (const c of candidates) {
    try {
      const r = await autoArchiveMailScan({ mailItemId: c.id });
      if (r.ok) {
        if (r.alreadyArchived) skipped += 1;
        else archived += 1;
      } else {
        skipped += 1;
      }
    } catch { errors += 1; }
  }
  return { scanned: candidates.length, archived, skipped, errors };
}
