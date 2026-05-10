"use server";

/**
 * iter-190 — Bureau revenue forecast (Tier 13 #99).
 *
 * Combines two signals:
 *   1. Trailing-average extrapolation — sum of past 90 days realized
 *      revenue (iter-89 Square Payment + iter-83 MailboxRenewal),
 *      divided by 90, multiplied by forecast window. Catches steady-
 *      state revenue + non-renewal items (POS sales, supplies, etc).
 *   2. Renewal pipeline — sum of plan-implied amounts for every User
 *      whose planDueDate falls inside the forecast window. Auto-renew
 *      members get 95% confidence; manual renewals get 65% (the
 *      historical churn rate at renewal in our cohort).
 *
 * Final number = max(trailing, pipeline × 0.85). Conservative — we
 * don't want admin to over-spend on the forecast.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";

const PLAN_MONTHLY_CENTS: Record<string, number> = {
  Basic: 9500,
  Business: 17500,
  Premium: 27500,
};

const AUTO_RENEW_CONFIDENCE = 0.95;
const MANUAL_RENEW_CONFIDENCE = 0.65;
const TRAILING_VS_PIPELINE_HAIRCUT = 0.85;

export type RevenueWindow = {
  windowDays: number;
  realizedCents: number;            // sum of completed payments in PAST windowDays
  trailingExtrapolatedCents: number; // (past 90d / 90) * windowDays
  pipelineCents: number;             // expected from upcoming planDueDates inside window
  pipelineCount: number;             // how many renewals expected
  forecastCents: number;             // max(trailingExtrap, pipeline*0.85)
  confidence: number;                // 0-1 weighting
};

export type RevenueForecastResult = {
  windows: RevenueWindow[];
  windowsByDays: Record<number, RevenueWindow>;
  pipeline: Array<{
    userId: string; userName: string; suiteNumber: string | null;
    plan: string | null; planTerm: number | null; planDueDate: string | null;
    impliedCents: number; autoRenew: boolean; confidence: number;
  }>;
  realizedLast90Cents: number;
  generatedAtIso: string;
};

function ymdToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function addDaysYmd(base: string, days: number): string {
  const d = new Date(`${base}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export async function getRevenueForecast(input: { windowsDays?: number[] } = {}): Promise<RevenueForecastResult> {
  await verifyAdmin();
  const windowsDays = (input.windowsDays ?? [30, 60, 90]).map((n) => Math.max(1, Math.min(365, Math.round(n))));

  // ── Realized revenue: past 90 days from Payment + MailboxRenewal.
  // Many tables, so try/catch each so a schema mismatch doesn't kill
  // the whole forecast.
  const today = new Date();
  const ninetyAgo = new Date(); ninetyAgo.setDate(ninetyAgo.getDate() - 90);
  let realizedLast90Cents = 0;
  try {
    const pay = await prisma.payment.aggregate({
      where: { syncedAt: { gte: ninetyAgo }, status: "COMPLETED" },
      _sum: { amount: true },
    });
    realizedLast90Cents += pay._sum.amount ?? 0;
  } catch { /* swallow */ }
  try {
    const ren = await prisma.mailboxRenewal.aggregate({
      where: { paidAt: { gte: ninetyAgo } },
      _sum: { amountCents: true },
    });
    realizedLast90Cents += ren._sum.amountCents ?? 0;
  } catch { /* swallow */ }

  // ── Renewal pipeline: every User with planDueDate inside the LARGEST
  // forecast window (we'll filter per-window below).
  const maxWindow = Math.max(...windowsDays);
  const todayYmd = ymdToday();
  const horizonYmd = addDaysYmd(todayYmd, maxWindow);
  const upcomers = await prisma.user.findMany({
    where: {
      role: { not: "ADMIN" },
      planDueDate: { gte: todayYmd, lte: horizonYmd, not: null },
      mailboxStatus: { notIn: ["Cancelled"] },
    },
    select: { id: true, name: true, suiteNumber: true, plan: true, planTerm: true, planDueDate: true, planAutoRenew: true },
  });

  const pipeline = upcomers.map((u) => {
    const monthly = u.plan && PLAN_MONTHLY_CENTS[u.plan] ? PLAN_MONTHLY_CENTS[u.plan]! : 0;
    const term = parseInt(u.planTerm ?? "1", 10);
    const months = Number.isFinite(term) && term > 0 ? term : 1;
    const impliedCents = monthly * months;
    const confidence = u.planAutoRenew ? AUTO_RENEW_CONFIDENCE : MANUAL_RENEW_CONFIDENCE;
    return {
      userId: u.id,
      userName: u.name,
      suiteNumber: u.suiteNumber,
      plan: u.plan,
      planTerm: months,
      planDueDate: u.planDueDate,
      impliedCents,
      autoRenew: u.planAutoRenew,
      confidence,
    };
  });

  // ── Build per-window forecasts.
  const windowsByDays: Record<number, RevenueWindow> = {};
  const windows: RevenueWindow[] = [];
  for (const days of windowsDays) {
    const winStart = todayYmd;
    const winEnd = addDaysYmd(todayYmd, days);
    // Realized: revenue within the past `days` days.
    const sinceWindow = new Date(); sinceWindow.setDate(sinceWindow.getDate() - days);
    let realizedCents = 0;
    try {
      const pay = await prisma.payment.aggregate({
        where: { syncedAt: { gte: sinceWindow }, status: "COMPLETED" },
        _sum: { amount: true },
      });
      realizedCents += pay._sum.amount ?? 0;
    } catch { /* swallow */ }
    try {
      const ren = await prisma.mailboxRenewal.aggregate({
        where: { paidAt: { gte: sinceWindow } },
        _sum: { amountCents: true },
      });
      realizedCents += ren._sum.amountCents ?? 0;
    } catch { /* swallow */ }

    // Trailing extrapolated: (past 90d total / 90) × this window's day count.
    const trailingExtrapolatedCents = Math.round((realizedLast90Cents / 90) * days);

    // Pipeline expected within window: sum of impliedCents × confidence
    // for users whose planDueDate falls inside [today, today+days].
    const inWindow = pipeline.filter((p) => p.planDueDate && p.planDueDate >= winStart && p.planDueDate <= winEnd);
    const pipelineCents = Math.round(inWindow.reduce((s, p) => s + p.impliedCents * p.confidence, 0));
    const pipelineCount = inWindow.length;

    // Final forecast: take the higher of the two signals (haircut the
    // pipeline so we don't double-count items the trailing average
    // already absorbed).
    const forecastCents = Math.max(trailingExtrapolatedCents, Math.round(pipelineCents * TRAILING_VS_PIPELINE_HAIRCUT));
    // Confidence: bias higher when both signals agree (within 25%).
    const agreement = trailingExtrapolatedCents > 0 && pipelineCents > 0
      ? Math.min(trailingExtrapolatedCents, pipelineCents) / Math.max(trailingExtrapolatedCents, pipelineCents)
      : 0;
    const confidence = Math.max(0.55, Math.min(0.95, 0.6 + agreement * 0.35));

    const w: RevenueWindow = {
      windowDays: days,
      realizedCents,
      trailingExtrapolatedCents,
      pipelineCents,
      pipelineCount,
      forecastCents,
      confidence,
    };
    windows.push(w);
    windowsByDays[days] = w;
  }

  return {
    windows,
    windowsByDays,
    pipeline: pipeline.slice().sort((a, b) => (a.planDueDate ?? "").localeCompare(b.planDueDate ?? "")),
    realizedLast90Cents,
    generatedAtIso: new Date().toISOString(),
  };
}
