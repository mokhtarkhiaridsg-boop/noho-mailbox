"use server";

// iter-108 — AI photo analysis on intake.
//
// Server action wrapper around lib/aiAnalysis. Persists the result on
// MailItem.aiAnalysisJson so subsequent reads (member dashboard, admin
// intake panel) don't re-call the model. Audit-logged with the model
// + warnings list. Idempotent: skips items that already have analysis.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { analyzePackagePhoto, type AiAnalysisResult, type AiAnalysisFailure } from "@/lib/aiAnalysis";

const MODEL_TAG = "claude-haiku-4-5";

export async function analyzeMailItemPhoto(input: {
  mailItemId: string;
  force?: boolean; // re-run even if analysis exists
}): Promise<{ skipped?: string; ok?: boolean; warnings?: number }> {
  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    select: { id: true, exteriorImageUrl: true, aiAnalysisJson: true, userId: true },
  });
  if (!item) return { skipped: "not_found" };
  if (!item.exteriorImageUrl) return { skipped: "no_photo" };
  if (!input.force && item.aiAnalysisJson) return { skipped: "already_analyzed" };

  const result = await analyzePackagePhoto(item.exteriorImageUrl);
  if (!result.ok) {
    // Persist the failure too so admin can see WHY analysis is missing.
    await prisma.mailItem.update({
      where: { id: input.mailItemId },
      data: { aiAnalysisJson: JSON.stringify(result) },
    }).catch(() => null);
    return { skipped: result.reason };
  }

  await prisma.$transaction([
    prisma.mailItem.update({
      where: { id: input.mailItemId },
      data: { aiAnalysisJson: JSON.stringify(result) },
    }),
    prisma.auditLog.create({
      data: {
        actorId: "system",
        actorRole: "SYSTEM",
        action: "ai.photo_analyzed",
        entityType: "MailItem",
        entityId: input.mailItemId,
        metadata: JSON.stringify({
          model: result.model,
          promptVersion: result.promptVersion,
          warnings: result.warnings,
          carrierGuess: result.carrierGuess,
          hasTrackingLabel: result.hasTrackingLabel,
        }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  revalidatePath("/admin");
  return { ok: true, warnings: result.warnings.length };
}

// Admin: explicit re-analyze button.
export async function adminReanalyzeMailItem(mailItemId: string): Promise<{ error?: string; ok?: boolean; warnings?: number }> {
  await verifyAdmin();
  const r = await analyzeMailItemPhoto({ mailItemId, force: true });
  if (r.skipped) return { error: r.skipped };
  return { ok: true, warnings: r.warnings };
}

// Admin: sweep recent items missing analysis. Capped to keep the API
// bill bounded and to leave wall-clock for normal traffic.
export async function adminBackfillAiAnalysis(input: { limit?: number } = {}): Promise<{
  scanned: number;
  succeeded: number;
  failed: number;
  failures: Array<{ id: string; reason: string }>;
}> {
  await verifyAdmin();
  const limit = Math.min(50, Math.max(1, input.limit ?? 20));
  const candidates = await prisma.mailItem.findMany({
    where: {
      exteriorImageUrl: { not: null },
      aiAnalysisJson: null,
    },
    orderBy: { createdAt: "desc" },
    take: limit,
    select: { id: true },
  });

  let succeeded = 0;
  let failed = 0;
  const failures: Array<{ id: string; reason: string }> = [];
  for (const c of candidates) {
    const r = await analyzeMailItemPhoto({ mailItemId: c.id });
    if (r.ok) succeeded += 1;
    else { failed += 1; failures.push({ id: c.id, reason: r.skipped ?? "unknown" }); }
  }
  return { scanned: candidates.length, succeeded, failed, failures };
}

// Read helper — used by member + admin to render warning chips.
export async function getAiAnalysisFor(mailItemId: string): Promise<AiAnalysisResult | AiAnalysisFailure | null> {
  const row = await prisma.mailItem.findUnique({
    where: { id: mailItemId },
    select: { aiAnalysisJson: true },
  });
  if (!row?.aiAnalysisJson) return null;
  try {
    return JSON.parse(row.aiAnalysisJson) as AiAnalysisResult | AiAnalysisFailure;
  } catch {
    return null;
  }
}

// Next.js "use server" files can only export async functions — wrap the
// model tag in an async getter so test/diagnostic code can still read it.
export async function __aiPhotoAnalysisModel(): Promise<string> {
  return MODEL_TAG;
}
