"use server";

/**
 * iter-204 — Sender-side mail predictions (Tier 14 #113).
 *
 * Walks the member's last 180d of MailItems, groups by normalized
 * sender, and predicts the NEXT arrival per sender using the average
 * inter-arrival gap. Surfaces high-confidence predictions ("you'll get
 * an Amazon package in the next 7 days") so the member can pre-stage
 * forwarding instructions instead of reacting after intake.
 *
 * Pure-read — no schema changes. Confidence weights:
 *   - cadenceConsistency = 1 - (stddev / mean)  (clamped 0..1)
 *   - sampleSize         = log10(N)/2 capped at 1
 *   - recencyBoost       = 1 when last arrival within ~1 cadence; falls
 *                          off linearly past that
 *   - Final score = 0.45*cadence + 0.35*sample + 0.20*recency
 *
 * Only senders with ≥3 arrivals in 180d AND average cadence ≤90d are
 * eligible — anything sparser is too noisy to predict usefully.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

const WINDOW_DAYS = 180;
const MIN_ARRIVALS = 3;
const MAX_AVG_CADENCE_DAYS = 90;
const PREDICTION_HORIZON_DAYS = 14;
const DAY_MS = 24 * 3600 * 1000;

export type MailPrediction = {
  senderDisplay: string;            // most-recent senderRaw — preserves casing
  normalizedSender: string;         // lowercased + trimmed for grouping
  arrivalCount: number;             // # of items in 180d window
  avgCadenceDays: number;           // mean days between arrivals
  cadenceStdDevDays: number;        // dispersion of inter-arrival gaps
  lastArrivalIso: string;           // when the most recent item came in
  nextArrivalEstimateIso: string;   // lastArrival + avgCadence (clamped to ≥ today)
  daysUntilEstimate: number;        // floor((nextArrival − now) / day)
  windowStartIso: string;           // estimate − cadenceStdDev
  windowEndIso: string;             // estimate + cadenceStdDev
  withinHorizon: boolean;           // arrival estimate ≤ today + 14d
  confidence: number;               // 0..1
  confidenceLabel: "high" | "medium" | "low";
  category: "package" | "letter" | "mixed";
};

function normalizeSender(s: string): string {
  return s.trim().toLowerCase().slice(0, 120);
}

function stdev(values: number[], mean: number): number {
  if (values.length < 2) return 0;
  const sumSq = values.reduce((s, v) => s + (v - mean) ** 2, 0);
  return Math.sqrt(sumSq / (values.length - 1));
}

export async function getMyMailPredictions(): Promise<MailPrediction[]> {
  const session = await verifySession();
  const userId = session.id!;
  const since = new Date(Date.now() - WINDOW_DAYS * DAY_MS);

  const items = await prisma.mailItem.findMany({
    where: {
      userId,
      createdAt: { gte: since },
      junkBlocked: false,                       // junk doesn't predict useful arrivals
    },
    select: { from: true, type: true, createdAt: true },
    orderBy: { createdAt: "asc" },
    take: 1000,
  });
  if (items.length < MIN_ARRIVALS) return [];

  type Bucket = { display: string; norm: string; arrivals: Date[]; types: Set<string> };
  const buckets = new Map<string, Bucket>();
  for (const it of items) {
    const norm = normalizeSender(it.from);
    let b = buckets.get(norm);
    if (!b) {
      b = { display: it.from, norm, arrivals: [], types: new Set() };
      buckets.set(norm, b);
    }
    b.arrivals.push(it.createdAt);
    b.types.add(it.type);
    // Keep the most-recent display string (case-preserved).
    b.display = it.from;
  }

  const now = Date.now();
  const predictions: MailPrediction[] = [];
  for (const b of buckets.values()) {
    if (b.arrivals.length < MIN_ARRIVALS) continue;
    const sorted = b.arrivals.map((d) => d.getTime()).sort((a, c) => a - c);
    const gapsMs: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      gapsMs.push(sorted[i]! - sorted[i - 1]!);
    }
    const meanMs = gapsMs.reduce((s, v) => s + v, 0) / gapsMs.length;
    const meanDays = meanMs / DAY_MS;
    if (meanDays > MAX_AVG_CADENCE_DAYS || meanDays < 0.5) continue;

    const sdMs = stdev(gapsMs, meanMs);
    const sdDays = sdMs / DAY_MS;
    const lastMs = sorted[sorted.length - 1]!;
    const nextEstMs = Math.max(now, lastMs + meanMs);
    const horizonMs = now + PREDICTION_HORIZON_DAYS * DAY_MS;
    const withinHorizon = nextEstMs <= horizonMs;

    const cadenceConsistency = Math.max(0, Math.min(1, 1 - sdDays / Math.max(meanDays, 0.5)));
    const sampleScore = Math.min(1, Math.log10(b.arrivals.length) / 0.6);   // 4 arrivals → ~1.0
    const daysSinceLast = (now - lastMs) / DAY_MS;
    const recencyBoost = Math.max(0, Math.min(1, 1 - Math.max(0, daysSinceLast - meanDays) / Math.max(meanDays, 1)));
    const confidence = Math.max(0, Math.min(1, 0.45 * cadenceConsistency + 0.35 * sampleScore + 0.20 * recencyBoost));
    const confidenceLabel: MailPrediction["confidenceLabel"] = confidence >= 0.65 ? "high" : confidence >= 0.40 ? "medium" : "low";

    const category: MailPrediction["category"] = b.types.size > 1 ? "mixed" : (b.types.has("Package") ? "package" : "letter");

    predictions.push({
      senderDisplay: b.display,
      normalizedSender: b.norm,
      arrivalCount: b.arrivals.length,
      avgCadenceDays: Math.round(meanDays * 10) / 10,
      cadenceStdDevDays: Math.round(sdDays * 10) / 10,
      lastArrivalIso: new Date(lastMs).toISOString(),
      nextArrivalEstimateIso: new Date(nextEstMs).toISOString(),
      daysUntilEstimate: Math.max(0, Math.floor((nextEstMs - now) / DAY_MS)),
      windowStartIso: new Date(Math.max(now, nextEstMs - sdMs)).toISOString(),
      windowEndIso: new Date(nextEstMs + sdMs).toISOString(),
      withinHorizon,
      confidence: Math.round(confidence * 100) / 100,
      confidenceLabel,
      category,
    });
  }

  // Sort: within-horizon first, then by confidence desc, then sooner first.
  predictions.sort((a, b) => {
    if (a.withinHorizon !== b.withinHorizon) return a.withinHorizon ? -1 : 1;
    if (b.confidence !== a.confidence) return b.confidence - a.confidence;
    return a.daysUntilEstimate - b.daysUntilEstimate;
  });
  return predictions.slice(0, 6);
}
