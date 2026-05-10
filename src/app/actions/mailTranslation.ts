"use server";

/**
 * iter-194 — Auto-translate inbound mail scans server actions (Tier 13 #103).
 *
 * Member-callable: gates on userId match, requires the item to be
 * scanned (otherwise nothing to translate). Reuses the iter-108
 * aiAnalysis persistence pattern: result lives in MailItem.translationJson
 * as one JSON blob; calling again with a different target language
 * overwrites. Audit-logged so admin can see who translated what when.
 *
 * Default target language picks the member's iter-183 `User.locale` if
 * set, otherwise falls back to "en". This means a Tunisian member with
 * locale=ar gets Arabic by default; an American gets English.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import {
  translateMailScan,
  isLanguageCode,
  languageLabel,
  type LanguageCode,
  type TranslationResult,
  type TranslationFailure,
} from "@/lib/aiTranslation";

export type MailTranslationView = {
  ok: true;
  language: LanguageCode;
  languageLabel: string;
  sourceLanguage: string | null;
  originalText: string;
  translatedText: string;
  translatedAtIso: string;
} | {
  ok: false;
  reason: string;
  attemptedAtIso: string;
};

function toView(r: TranslationResult | TranslationFailure): MailTranslationView {
  if (r.ok) {
    return {
      ok: true,
      language: r.language,
      languageLabel: languageLabel(r.language),
      sourceLanguage: r.sourceLanguage,
      originalText: r.originalText,
      translatedText: r.translatedText,
      translatedAtIso: r.translatedAtIso,
    };
  }
  return { ok: false, reason: r.reason, attemptedAtIso: r.attemptedAtIso };
}

export async function translateMyMailItem(input: {
  mailItemId: string;
  targetLanguage?: string;
}): Promise<{ result?: MailTranslationView; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    select: {
      id: true,
      userId: true,
      scanned: true,
      scanImageUrl: true,
      translationJson: true,
    },
  });
  if (!item) return { error: "Mail item not found." };
  if (item.userId !== userId) return { error: "Not your mail item." };
  if (!item.scanImageUrl) return { error: "This item hasn't been scanned yet — request a scan first." };
  if (!item.scanned) return { error: "Scan still processing — try again in a minute." };

  // Pick target: explicit input → user.locale → "en"
  let target: LanguageCode = "en";
  if (input.targetLanguage && isLanguageCode(input.targetLanguage)) {
    target = input.targetLanguage;
  } else {
    try {
      const u = await prisma.user.findUnique({ where: { id: userId }, select: { locale: true } });
      if (u?.locale && isLanguageCode(u.locale)) target = u.locale;
    } catch { /* swallow — fallback to en */ }
  }

  // Cache hit: if we already translated to this target language, reuse it.
  if (item.translationJson) {
    try {
      const cached = JSON.parse(item.translationJson) as TranslationResult | TranslationFailure;
      if (cached.ok && cached.language === target) {
        return { result: toView(cached) };
      }
    } catch { /* re-translate */ }
  }

  const result = await translateMailScan({ imageUrl: item.scanImageUrl, targetLanguage: target });
  await prisma.mailItem.update({
    where: { id: item.id },
    data: { translationJson: JSON.stringify(result) },
  }).catch(() => null);

  // Audit only on successful translations (don't spam audit with failed
  // model fetches — those are infra concerns logged elsewhere).
  if (result.ok) {
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: session.role ?? "MEMBER",
        action: "mail.translation_requested",
        entityType: "MailItem",
        entityId: item.id,
        metadata: JSON.stringify({
          targetLanguage: result.language,
          sourceLanguage: result.sourceLanguage,
          originalLength: result.originalText.length,
          translatedLength: result.translatedText.length,
          model: result.model,
        }),
      },
    }).catch(() => null);
  }

  revalidatePath("/dashboard");
  return { result: toView(result) };
}

// Read-only fetch — used by the dashboard to hydrate the modal without
// re-translating. Returns null when no translation exists yet.
export async function getMyMailItemTranslation(input: {
  mailItemId: string;
}): Promise<MailTranslationView | null> {
  const session = await verifySession();
  const userId = session.id!;
  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    select: { userId: true, translationJson: true },
  });
  if (!item || item.userId !== userId) return null;
  if (!item.translationJson) return null;
  try {
    const parsed = JSON.parse(item.translationJson) as TranslationResult | TranslationFailure;
    return toView(parsed);
  } catch {
    return null;
  }
}
