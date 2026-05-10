// iter-222 — Smart renewal-reminder cadence (Tier 16 #131).
//
// Learns each member's preferred renewal lead time by walking
// MailboxRenewal history. The "lead time" is how many days before
// the previous planDueDate they actually paid: a member who
// renews 1d before due date is "last-minute"; one who renews 14d
// before is "early bird". We fire the smart reminder a couple
// days BEFORE their personal sweet spot — early enough to nudge,
// not so early they ignore it.
//
// No new dep — pure-math + median calculation in JS.

const MIN_SAMPLES_FOR_PERSONAL = 2;
const FALLBACK_LEAD_TIME_DAYS = 7;          // matches iter-111 baseline
const NUDGE_BUFFER_DAYS = 2;                 // fire ~2d ahead of their sweet spot
const MIN_LEAD_DAYS = 1;
const MAX_LEAD_DAYS = 30;

export type RenewalCadenceProfile = {
  leadTimeDays: number;          // when to fire the smart reminder
  sampleSize: number;             // # of past renewals observed
  avgLatencyDays: number;         // mean days early/late vs prevDueDate
  medianLatencyDays: number;
  source: "personal" | "default";
  recomputedAtIso: string;
};

export type RenewalHistoryRow = {
  prevPlanDueDate: string | null;          // YYYY-MM-DD
  paidAt: Date;
};

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = values.slice().sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export function computeRenewalCadence(history: RenewalHistoryRow[]): RenewalCadenceProfile {
  const latencies: number[] = [];
  for (const r of history) {
    if (!r.prevPlanDueDate || !/^\d{4}-\d{2}-\d{2}$/.test(r.prevPlanDueDate)) continue;
    const due = new Date(`${r.prevPlanDueDate}T12:00:00Z`).getTime();   // noon to dodge DST edge
    const paid = r.paidAt.getTime();
    // Days BEFORE due date (positive = paid early; negative = paid late)
    const daysEarly = (due - paid) / (24 * 3600 * 1000);
    // Cap obvious outliers (they renewed 200d early or 200d late = data quirk)
    if (daysEarly < -60 || daysEarly > 60) continue;
    latencies.push(daysEarly);
  }

  if (latencies.length < MIN_SAMPLES_FOR_PERSONAL) {
    return {
      leadTimeDays: FALLBACK_LEAD_TIME_DAYS,
      sampleSize: latencies.length,
      avgLatencyDays: 0,
      medianLatencyDays: 0,
      source: "default",
      recomputedAtIso: new Date().toISOString(),
    };
  }

  const avg = latencies.reduce((s, v) => s + v, 0) / latencies.length;
  const med = median(latencies);
  // The member typically pays at +medianLatencyDays before due. Nudge
  // them BEFORE that window so the reminder lands while they're still
  // open to it. Buffer = 2d ahead of their sweet spot.
  // Clamp to [1, 30] day window.
  const sweetSpot = Math.max(0, med);
  const lead = Math.max(MIN_LEAD_DAYS, Math.min(MAX_LEAD_DAYS, Math.round(sweetSpot + NUDGE_BUFFER_DAYS)));

  return {
    leadTimeDays: lead,
    sampleSize: latencies.length,
    avgLatencyDays: Math.round(avg * 10) / 10,
    medianLatencyDays: Math.round(med * 10) / 10,
    source: "personal",
    recomputedAtIso: new Date().toISOString(),
  };
}

export function parseCadence(raw: string | null | undefined): RenewalCadenceProfile | null {
  if (!raw) return null;
  try {
    const j = JSON.parse(raw);
    if (typeof j !== "object" || !j) return null;
    return {
      leadTimeDays: typeof j.leadTimeDays === "number" ? j.leadTimeDays : FALLBACK_LEAD_TIME_DAYS,
      sampleSize: typeof j.sampleSize === "number" ? j.sampleSize : 0,
      avgLatencyDays: typeof j.avgLatencyDays === "number" ? j.avgLatencyDays : 0,
      medianLatencyDays: typeof j.medianLatencyDays === "number" ? j.medianLatencyDays : 0,
      source: j.source === "personal" ? "personal" : "default",
      recomputedAtIso: typeof j.recomputedAtIso === "string" ? j.recomputedAtIso : new Date().toISOString(),
    };
  } catch { return null; }
}
