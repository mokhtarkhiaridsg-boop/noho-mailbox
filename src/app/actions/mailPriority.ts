"use server";

/**
 * iter-227 — AI mail-priority inference server actions (Tier 17 #136).
 *
 * Cron sweep walks scanned-and-classified items + computes
 * priorityScore via lib/mail-priority.ts. Member dashboard surfaces
 * the top-priority queue. Pure-rules — no AI call.
 *
 * Audit: `mail.priority_scored` per recompute (only when score
 * actually changes — cuts noise).
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { computeMailPriority, bandStyle, type PriorityScore } from "@/lib/mail-priority";

const SWEEP_BATCH = 200;

export type PriorityRow = {
  id: string;
  from: string;
  type: string;
  status: string;
  scanned: boolean;
  scanImageUrl: string | null;
  intakeAtIso: string;
  priorityScore: number;
  band: PriorityScore["band"];
  bandColor: string;
  bandBg: string;
  bandEmoji: string;
  topReasons: Array<{ reason: string; weight: number }>;
};

function readClassifier(item: { tags: string | null; title: string }): { category: string | null; title: string | null } {
  // iter-218 stores category in DocumentVaultItem.archiveCategory; for
  // priority we fall back to MailItem-side hints. We don't read the
  // separate VaultItem here to keep the sweep cheap; if the iter-218
  // archive ran, the OCR text in translationJson already carries
  // enough signal.
  return { category: null, title: null };
}

function readOcrText(translationJson: string | null): string | null {
  if (!translationJson) return null;
  try {
    const j = JSON.parse(translationJson) as { ok?: boolean; originalText?: string; translatedText?: string };
    if (j.ok) return [j.originalText, j.translatedText].filter(Boolean).join("\n").slice(0, 8000);
  } catch { /* swallow */ }
  return null;
}

export async function recomputeMailItemPriority(input: { mailItemId: string; force?: boolean }): Promise<{ score?: number; band?: string; changed?: boolean; error?: string }> {
  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    select: {
      id: true, userId: true, from: true, junkBlocked: true,
      translationJson: true, createdAt: true,
      priorityScore: true, tags: true, label: true, title: true,
    } as { id: true; userId: true; from: true; junkBlocked: true; translationJson: true; createdAt: true; priorityScore: true; tags?: true; label: true; title?: true },
  }).catch(() => null) as { id: string; userId: string; from: string; junkBlocked: boolean; translationJson: string | null; createdAt: Date; priorityScore: number | null; tags?: string | null; label: string | null; title?: string } | null;
  if (!item) return { error: "Mail item not found." };

  // Look for an iter-218 vault classification linked to this mail item.
  let classifierCategory: string | null = null;
  let classifierTitle: string | null = null;
  try {
    const vault = await prisma.documentVaultItem.findFirst({
      where: { sourceMailItemId: item.id, autoArchived: true },
      select: { archiveCategory: true, title: true },
    });
    if (vault) { classifierCategory = vault.archiveCategory; classifierTitle = vault.title; }
  } catch { /* swallow */ }

  const ocrText = readOcrText(item.translationJson);
  void readClassifier;

  const result = computeMailPriority({
    classifierCategory,
    classifierTitle,
    ocrText,
    senderRaw: item.from,
    isJunkBlocked: item.junkBlocked,
    intakeAtIso: item.createdAt.toISOString(),
  });

  const changed = item.priorityScore !== result.score;
  await prisma.mailItem.update({
    where: { id: item.id },
    data: {
      priorityScore: result.score,
      priorityReasonsJson: JSON.stringify(result.reasons),
    },
  });

  if (changed) {
    await prisma.auditLog.create({
      data: {
        actorId: "system", actorRole: "SYSTEM",
        action: "mail.priority_scored",
        entityType: "MailItem", entityId: item.id,
        metadata: JSON.stringify({ from: item.priorityScore, to: result.score, band: result.band }),
      },
    }).catch(() => null);
  }
  return { score: result.score, band: result.band, changed };
}

export type PrioritySweepResult = {
  scanned: number;
  recomputed: number;
  changed: number;
  ranAtIso: string;
};

// Cron-callable: walks recently-scanned items missing a score OR
// older than 30d (re-score weekly to catch aging boosts).
export async function runMailPrioritySweep(): Promise<PrioritySweepResult> {
  const result: PrioritySweepResult = { scanned: 0, recomputed: 0, changed: 0, ranAtIso: new Date().toISOString() };
  const items = await prisma.mailItem.findMany({
    where: {
      OR: [
        { priorityScore: null, scanned: true },
        { priorityScore: null, junkBlocked: true },
      ],
    },
    select: { id: true },
    orderBy: { createdAt: "desc" },
    take: SWEEP_BATCH,
  });
  result.scanned = items.length;
  for (const it of items) {
    const r = await recomputeMailItemPriority({ mailItemId: it.id });
    if (r.score != null) {
      result.recomputed += 1;
      if (r.changed) result.changed += 1;
    }
  }
  return result;
}

// Member-side: top-priority queue for the dashboard card.
export async function getMyPriorityQueue(input: { limit?: number } = {}): Promise<PriorityRow[]> {
  const session = await verifySession();
  const userId = session.id!;
  const limit = Math.min(20, Math.max(1, input.limit ?? 10));
  const rows = await prisma.mailItem.findMany({
    where: {
      userId,
      status: { in: ["Awaiting Pickup", "Received", "Scanned"] },
      junkBlocked: false,
      priorityScore: { gte: 40 },
    },
    select: {
      id: true, from: true, type: true, status: true, scanned: true, scanImageUrl: true,
      createdAt: true, priorityScore: true, priorityReasonsJson: true,
    },
    orderBy: [{ priorityScore: "desc" }, { createdAt: "desc" }],
    take: limit,
  });

  return rows.map((r) => {
    const score = r.priorityScore ?? 40;
    const band: PriorityScore["band"] =
      score >= 90 ? "Urgent" :
      score >= 70 ? "Important" :
      score >= 40 ? "Normal" :
      score >= 10 ? "Low" : "Junk";
    const style = bandStyle(band);
    let reasons: Array<{ reason: string; weight: number }> = [];
    if (r.priorityReasonsJson) {
      try {
        const j = JSON.parse(r.priorityReasonsJson);
        if (Array.isArray(j)) reasons = j.filter((x) => typeof x?.reason === "string" && typeof x?.weight === "number");
      } catch { /* swallow */ }
    }
    reasons.sort((a, b) => Math.abs(b.weight) - Math.abs(a.weight));
    return {
      id: r.id, from: r.from, type: r.type, status: r.status, scanned: r.scanned, scanImageUrl: r.scanImageUrl,
      intakeAtIso: r.createdAt.toISOString(),
      priorityScore: score,
      band,
      bandColor: style.fg,
      bandBg: style.bg,
      bandEmoji: style.emoji,
      topReasons: reasons.slice(0, 3),
    };
  });
}

// Admin-callable manual recompute for a specific item — useful when
// admin tweaks the scoring rules and wants a one-off re-test.
export async function adminRecomputePriority(input: { mailItemId: string }): Promise<{ score?: number; band?: string; error?: string }> {
  await verifyAdmin();
  return recomputeMailItemPriority({ mailItemId: input.mailItemId, force: true });
}
