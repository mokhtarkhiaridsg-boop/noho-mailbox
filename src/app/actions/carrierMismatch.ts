"use server";

/**
 * iter-198 — Auto carrier-mismatch flag (Tier 14 #107).
 *
 * Compares iter-94 admin-typed `MailItem.carrier` against iter-108
 * Vision-detected `aiAnalysisJson.carrierGuess`. When ≥THRESHOLD
 * mismatches accumulate in the rolling N-day window, fires an
 * "intake-quality coaching" email to the admin and surfaces a panel
 * for one-click correction.
 *
 * Why this matters: a typo'd carrier breaks tracking polls (iter-94),
 * routes claims to the wrong portal (iter-196), and costs the bureau
 * time + money. AI-vs-typed disagreement is a strong heuristic for
 * "intake admin needs coaching" or "this row needs a quick fix".
 *
 * Reuses iter-108 aiAnalysisJson (no schema changes), uses the same
 * Bearer-CRON_SECRET pattern as 24 sibling cron routes, audits per
 * fix and per coaching-email send.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

const COACHING_THRESHOLD = 5;
const SCAN_WINDOW_DAYS = 7;
const COACHING_DEDUPE_HOURS = 24 * 6;            // don't send the same coaching email more than once a week

const CARRIERS_RECOGNIZED = new Set(["USPS", "UPS", "FedEx", "DHL", "Amazon"]);

export type CarrierMismatchRow = {
  id: string;                                     // mail item id
  userName: string | null;
  suiteNumber: string | null;
  fromSender: string;
  trackingNumber: string | null;
  typedCarrier: string;
  aiCarrier: string;                              // never null — only mismatches surface
  intakeAtIso: string;
  exteriorImageUrl: string | null;
  aiAnalyzedAtIso: string | null;
};

export type CarrierMismatchSummary = {
  windowDays: number;
  total: number;
  byTypedCarrier: Array<{ carrier: string; count: number }>;
  byAiCarrier: Array<{ carrier: string; count: number }>;
  pairs: Array<{ typed: string; ai: string; count: number }>;
  thresholdExceeded: boolean;
  threshold: number;
  lastCoachingSentIso: string | null;
};

function parseAi(raw: string | null): { carrierGuess: string | null; analyzedAtIso: string | null } {
  if (!raw) return { carrierGuess: null, analyzedAtIso: null };
  try {
    const j = JSON.parse(raw) as { ok?: boolean; carrierGuess?: string | null; analyzedAtIso?: string };
    if (j.ok && typeof j.carrierGuess === "string" && CARRIERS_RECOGNIZED.has(j.carrierGuess)) {
      return { carrierGuess: j.carrierGuess, analyzedAtIso: j.analyzedAtIso ?? null };
    }
  } catch { /* swallow */ }
  return { carrierGuess: null, analyzedAtIso: null };
}

function isMismatch(typed: string | null, ai: string | null): boolean {
  if (!typed || !ai) return false;                // need both sides to disagree
  if (typed.trim() === ai.trim()) return false;
  // Ignore trivial casing differences (e.g. "Usps" vs "USPS").
  if (typed.trim().toUpperCase() === ai.trim().toUpperCase()) return false;
  return CARRIERS_RECOGNIZED.has(ai);             // only surface when AI is confident
}

async function fetchMismatchesInWindow(windowDays: number): Promise<CarrierMismatchRow[]> {
  const since = new Date(Date.now() - windowDays * 24 * 3600 * 1000);
  const items = await prisma.mailItem.findMany({
    where: {
      type: "Package",
      carrier: { not: null },
      aiAnalysisJson: { not: null },
      createdAt: { gte: since },
    },
    select: {
      id: true, from: true, trackingNumber: true,
      carrier: true, exteriorImageUrl: true,
      aiAnalysisJson: true, createdAt: true,
      user: { select: { name: true, suiteNumber: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });
  const out: CarrierMismatchRow[] = [];
  for (const it of items) {
    const ai = parseAi(it.aiAnalysisJson);
    if (!ai.carrierGuess) continue;
    if (!isMismatch(it.carrier, ai.carrierGuess)) continue;
    out.push({
      id: it.id,
      userName: it.user?.name ?? null,
      suiteNumber: it.user?.suiteNumber ?? null,
      fromSender: it.from,
      trackingNumber: it.trackingNumber,
      typedCarrier: it.carrier!,
      aiCarrier: ai.carrierGuess,
      intakeAtIso: it.createdAt.toISOString(),
      exteriorImageUrl: it.exteriorImageUrl,
      aiAnalyzedAtIso: ai.analyzedAtIso,
    });
  }
  return out;
}

export async function listCarrierMismatches(input: { windowDays?: number } = {}): Promise<{
  rows: CarrierMismatchRow[];
  summary: CarrierMismatchSummary;
}> {
  await verifyAdmin();
  const windowDays = Math.min(60, Math.max(1, input.windowDays ?? SCAN_WINDOW_DAYS));
  const rows = await fetchMismatchesInWindow(windowDays);

  const byTyped = new Map<string, number>();
  const byAi = new Map<string, number>();
  const pairs = new Map<string, number>();
  for (const r of rows) {
    byTyped.set(r.typedCarrier, (byTyped.get(r.typedCarrier) ?? 0) + 1);
    byAi.set(r.aiCarrier, (byAi.get(r.aiCarrier) ?? 0) + 1);
    const key = `${r.typedCarrier}→${r.aiCarrier}`;
    pairs.set(key, (pairs.get(key) ?? 0) + 1);
  }

  // Find when we last fired the coaching email.
  const lastCoach = await prisma.auditLog.findFirst({
    where: { action: "intake.carrier_mismatch_coached" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  }).catch(() => null);

  return {
    rows,
    summary: {
      windowDays,
      total: rows.length,
      byTypedCarrier: Array.from(byTyped.entries()).sort((a, b) => b[1] - a[1]).map(([carrier, count]) => ({ carrier, count })),
      byAiCarrier: Array.from(byAi.entries()).sort((a, b) => b[1] - a[1]).map(([carrier, count]) => ({ carrier, count })),
      pairs: Array.from(pairs.entries()).sort((a, b) => b[1] - a[1]).map(([key, count]) => {
        const [typed, ai] = key.split("→");
        return { typed: typed ?? "", ai: ai ?? "", count };
      }),
      thresholdExceeded: rows.length >= COACHING_THRESHOLD,
      threshold: COACHING_THRESHOLD,
      lastCoachingSentIso: lastCoach?.createdAt.toISOString() ?? null,
    },
  };
}

export async function applyCarrierFix(input: { mailItemId: string; newCarrier: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const carrier = input.newCarrier.trim();
  if (!CARRIERS_RECOGNIZED.has(carrier) && carrier !== "Other") {
    return { error: `Unknown carrier: ${carrier}` };
  }
  const item = await prisma.mailItem.findUnique({ where: { id: input.mailItemId }, select: { carrier: true, from: true } });
  if (!item) return { error: "Mail item not found." };
  await prisma.$transaction([
    prisma.mailItem.update({ where: { id: input.mailItemId }, data: { carrier } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "intake.carrier_corrected",
        entityType: "MailItem", entityId: input.mailItemId,
        metadata: JSON.stringify({ from: item.carrier, to: carrier, sender: item.from }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function dismissCarrierMismatch(input: { mailItemId: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  // "Dismiss" means: trust the typed carrier, mark the AI analysis as
  // overridden so it stops surfacing. We persist a flag inside the
  // existing aiAnalysisJson blob so no schema change is needed.
  const actor = await verifyAdmin();
  const item = await prisma.mailItem.findUnique({ where: { id: input.mailItemId }, select: { aiAnalysisJson: true, carrier: true } });
  if (!item) return { error: "Mail item not found." };
  let ai: Record<string, unknown> = {};
  try { if (item.aiAnalysisJson) ai = JSON.parse(item.aiAnalysisJson); } catch { /* swallow */ }
  ai.carrierGuess = null;                          // null out so isMismatch fails on next scan
  ai.carrierMismatchDismissedAtIso = new Date().toISOString();
  ai.carrierMismatchDismissedBy = actor.id;
  if (input.reason) ai.carrierMismatchDismissalReason = input.reason.trim().slice(0, 200);
  await prisma.$transaction([
    prisma.mailItem.update({ where: { id: input.mailItemId }, data: { aiAnalysisJson: JSON.stringify(ai) } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "intake.carrier_mismatch_dismissed",
        entityType: "MailItem", entityId: input.mailItemId,
        metadata: JSON.stringify({ typed: item.carrier, reason: input.reason ?? null }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export type MismatchSweepResult = {
  scanned: number;
  mismatches: number;
  thresholdExceeded: boolean;
  coachingSent: boolean;
  ranAtIso: string;
  lastCoachingSentIso: string | null;
};

// Daily sweep — invoked from /api/cron/carrier-mismatch-scan. Counts
// mismatches in the rolling SCAN_WINDOW_DAYS window; if ≥ threshold
// AND we haven't sent the coaching email recently, fires it.
export async function runCarrierMismatchSweep(): Promise<MismatchSweepResult> {
  const since = new Date(Date.now() - SCAN_WINDOW_DAYS * 24 * 3600 * 1000);
  const scannedCount = await prisma.mailItem.count({
    where: { type: "Package", carrier: { not: null }, aiAnalysisJson: { not: null }, createdAt: { gte: since } },
  });
  const rows = await fetchMismatchesInWindow(SCAN_WINDOW_DAYS);
  const result: MismatchSweepResult = {
    scanned: scannedCount,
    mismatches: rows.length,
    thresholdExceeded: rows.length >= COACHING_THRESHOLD,
    coachingSent: false,
    ranAtIso: new Date().toISOString(),
    lastCoachingSentIso: null,
  };

  if (!result.thresholdExceeded) return result;

  // Dedupe — only re-coach once per COACHING_DEDUPE_HOURS.
  const lastCoach = await prisma.auditLog.findFirst({
    where: { action: "intake.carrier_mismatch_coached" },
    orderBy: { createdAt: "desc" },
    select: { createdAt: true },
  });
  result.lastCoachingSentIso = lastCoach?.createdAt.toISOString() ?? null;
  if (lastCoach && Date.now() - lastCoach.createdAt.getTime() < COACHING_DEDUPE_HOURS * 3600 * 1000) {
    return result;
  }

  // Fire coaching email.
  const topPairs = (() => {
    const m = new Map<string, number>();
    for (const r of rows) {
      const k = `${r.typedCarrier}→${r.aiCarrier}`;
      m.set(k, (m.get(k) ?? 0) + 1);
    }
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1]).slice(0, 6);
  })();

  try {
    await sendEmail({
      kind: "intake_quality_coaching",
      to: process.env.ADMIN_EMAIL ?? "nohomailbox@gmail.com",
      subject: `🪪 Intake quality alert · ${rows.length} carrier-mismatches this week`,
      html: coachingEmailHtml({ count: rows.length, windowDays: SCAN_WINDOW_DAYS, threshold: COACHING_THRESHOLD, topPairs }),
    });
    await prisma.auditLog.create({
      data: {
        actorId: "system", actorRole: "SYSTEM",
        action: "intake.carrier_mismatch_coached",
        entityType: "AuditLog", entityId: "carrier_mismatch_sweep",
        metadata: JSON.stringify({ count: rows.length, windowDays: SCAN_WINDOW_DAYS, topPairs }),
      },
    });
    result.coachingSent = true;
    result.lastCoachingSentIso = new Date().toISOString();
  } catch { /* swallow — don't fail the cron over a flaky SMTP */ }

  return result;
}

function coachingEmailHtml(data: { count: number; windowDays: number; threshold: number; topPairs: Array<[string, number]> }): string {
  const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";
  const rows = data.topPairs.map(([k, c]) =>
    `<tr><td style="padding:6px 10px;font-family:monospace;color:#1F2937;">${escapeHtml(k)}</td><td style="padding:6px 10px;text-align:right;font-weight:900;color:#92400E;">${c}</td></tr>`
  ).join("");
  return `<!doctype html><html><body style="margin:0;background:#F8F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#2D100F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F2EA;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:white;border-radius:14px;border:1px solid #E8DDD0;padding:28px 32px;">
      <tr><td>
        <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:.20em;text-transform:uppercase;color:#92400E;">⚠️ Intake-quality coaching</p>
        <h1 style="margin:6px 0 4px;font-size:22px;font-weight:900;letter-spacing:-.4px;">${data.count} carrier-mismatches in the last ${data.windowDays}d</h1>
        <p style="margin:0 0 16px;font-size:13px;color:rgba(45,16,15,.65);line-height:1.5;">
          The intake admin typed one carrier; iter-108 AI Vision detected another.
          Above ${data.threshold} mismatches/week is a coaching signal — wrong carrier breaks tracking polls + routes insurance claims to the wrong portal.
        </p>
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FEF3C7;border-radius:10px;margin:14px 0;">
          <tr><th style="padding:8px 10px;text-align:left;font-size:11px;color:#92400E;text-transform:uppercase;letter-spacing:.10em;">Typed → AI</th><th style="padding:8px 10px;text-align:right;font-size:11px;color:#92400E;text-transform:uppercase;letter-spacing:.10em;">Count</th></tr>
          ${rows}
        </table>
        <p style="margin:14px 0;text-align:center;">
          <a href="${BASE_URL}/admin?tab=carriermismatch" style="display:inline-block;padding:11px 22px;background:#337485;color:white;text-decoration:none;border-radius:10px;font-weight:900;font-size:13px;">Review + correct mismatches →</a>
        </p>
        <p style="margin:14px 0 0;font-size:11px;color:rgba(45,16,15,.45);line-height:1.5;">
          This alert sends at most once per 6 days even if the mismatch count keeps climbing.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
