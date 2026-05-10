// iter-227 — AI mail-priority inference (Tier 17 #136).
//
// Pure-rules scorer. Combines iter-218 doc-classifier category +
// regex hits in OCR'd text + sender pattern + member flags into a
// 0-100 "this needs your attention now" score. Each contributing
// signal returns a `{reason, weight}` so the dashboard can show
// "Why is this priority 95?".
//
// Scoring ladder (curated heuristics — no AI call needed):
//   90-100 = court summons / IRS / time-sensitive govt → must act now
//   70-89  = bills, medical, legal, banking → act this week
//   40-69  = recurring statements, subscriptions → for the record
//   10-39  = generic mail / unknown
//   0-9    = junk-blocked / marketing / advertising

export type PriorityReason = { reason: string; weight: number };

export type PriorityScore = {
  score: number;          // 0-100, clamped
  reasons: PriorityReason[];
  band: "Urgent" | "Important" | "Normal" | "Low" | "Junk";
};

export type ScoringInput = {
  classifierCategory: string | null;          // iter-218 (e.g. "tax_form")
  classifierTitle: string | null;
  ocrText: string | null;                     // iter-194 originalText/translatedText
  senderRaw: string | null;
  isJunkBlocked: boolean;
  intakeAtIso: string;
};

const URGENT_REGEX: Array<{ re: RegExp; weight: number; reason: string }> = [
  { re: /\b(jury duty|summons|subpoena|appear before|court date)\b/i,            weight: 95, reason: "Court summons / jury duty" },
  { re: /\b(IRS|internal revenue|tax court|notice of (deficiency|levy|lien))\b/i, weight: 92, reason: "IRS / tax notice" },
  { re: /\b(notice of (default|eviction)|three[- ]day notice|pay or quit)\b/i,    weight: 95, reason: "Eviction / default notice" },
  { re: /\b(immediate action|urgent|time sensitive|response required by)\b/i,    weight: 30, reason: "Sender flagged urgent" },
  { re: /\b(passport|USCIS|biometric appointment|naturalization)\b/i,            weight: 80, reason: "Immigration / passport" },
  { re: /\b(disability|workers'? comp|EDD|unemployment claim)\b/i,                weight: 75, reason: "Disability / EDD" },
  { re: /\b(jury qualification|federal jury)\b/i,                                 weight: 88, reason: "Federal jury" },
];

const CATEGORY_WEIGHTS: Record<string, number> = {
  court_summons:  95,
  tax_form:       88,
  government:     78,
  legal:          80,
  medical:        70,
  utility_bill:   55,
  bank_statement: 50,
  insurance:      55,
  credit_card:    45,
  voter_card:     40,
  subscription:   25,
  official:       45,
  other:          15,
};

export function computeMailPriority(input: ScoringInput): PriorityScore {
  // Junk override: nothing trumps a member-blocked sender.
  if (input.isJunkBlocked) {
    return { score: 0, reasons: [{ reason: "Member marked junk", weight: 0 }], band: "Junk" };
  }

  const reasons: PriorityReason[] = [];
  let best = 10;                                 // baseline "unknown letter" score

  if (input.classifierCategory && CATEGORY_WEIGHTS[input.classifierCategory] != null) {
    const w = CATEGORY_WEIGHTS[input.classifierCategory]!;
    reasons.push({ reason: `Classifier: ${input.classifierCategory.replace(/_/g, " ")}`, weight: w });
    best = Math.max(best, w);
  }

  if (input.ocrText) {
    for (const rule of URGENT_REGEX) {
      if (rule.re.test(input.ocrText)) {
        reasons.push({ reason: rule.reason, weight: rule.weight });
        best = Math.max(best, rule.weight);
      }
    }
  }

  // Aging boost: a flagged item that's been sitting for >5 days nudges
  // up by ~5 points to surface stale urgent stuff. Cap at +10.
  const intakeMs = new Date(input.intakeAtIso).getTime();
  const ageDays = (Date.now() - intakeMs) / (24 * 3600 * 1000);
  if (best >= 70 && ageDays > 5) {
    const boost = Math.min(10, Math.floor(ageDays - 5));
    reasons.push({ reason: `Sitting ${Math.floor(ageDays)}d unread`, weight: boost });
    best = Math.min(100, best + boost);
  }

  // Marketing-heavy senders get a small downward nudge unless an
  // urgent regex already pushed score high.
  if (input.senderRaw && best < 70) {
    if (/\b(marketing|sweepstakes|special offer|shop now|exclusive deal)\b/i.test(input.senderRaw)) {
      reasons.push({ reason: "Sender looks promotional", weight: -10 });
      best = Math.max(0, best - 10);
    }
  }

  const score = Math.max(0, Math.min(100, best));
  return {
    score,
    reasons,
    band:
      score >= 90 ? "Urgent" :
      score >= 70 ? "Important" :
      score >= 40 ? "Normal" :
      score >= 10 ? "Low" :
      "Junk",
  };
}

export function bandStyle(band: PriorityScore["band"]): { bg: string; fg: string; emoji: string } {
  switch (band) {
    case "Urgent":    return { bg: "rgba(239,68,68,0.10)", fg: "#b91c1c", emoji: "🚨" };
    case "Important": return { bg: "rgba(245,158,11,0.12)", fg: "#92400e", emoji: "⚠️" };
    case "Normal":    return { bg: "rgba(25,118,255,0.10)", fg: "#0F5BD9", emoji: "📩" };
    case "Low":       return { bg: "rgba(122,130,144,0.10)", fg: "#3B4252", emoji: "📃" };
    case "Junk":      return { bg: "rgba(122,130,144,0.05)", fg: "#7A8290", emoji: "🚫" };
  }
}
