"use server";

/**
 * iter-139 — Smart routing for inbound mail (Tier 8 #51).
 *
 * Admin types/scans a recipient name from the envelope; we fuzzy-match
 * against the customer database and rank candidates so admin can
 * one-click the best fit instead of typing the suite manually.
 *
 * Scoring lives in this file (no third-party fuzzy lib — we don't need
 * one for ~300 customers and a 7-axis weighted score). Returns top 5
 * sorted by score DESC with a `confidence` label (high/med/low) the
 * UI uses to color the chip.
 *
 * Audit-logs every routing call so we can later analyze hit rate +
 * tune the weights.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";

export type SmartRouteCandidate = {
  userId: string;
  customerName: string;
  email: string;
  suiteNumber: string | null;
  plan: string | null;
  mailboxStatus: string | null;
  businessName: string | null;
  /** 0-100 raw score; UI doesn't usually show this, just confidence. */
  score: number;
  /** "high" → > 75, "med" → 40-75, "low" → < 40. */
  confidence: "high" | "med" | "low";
  /** Human-readable list of why this candidate matched (for the tooltip). */
  reasons: string[];
  /** ISO timestamp of latest mail item; helps the recency tiebreak. */
  lastMailAt: string | null;
};

export type SmartRouteResult = {
  query: string;
  tokens: string[];
  candidates: SmartRouteCandidate[];
  /** When the top candidate has a clear ≥85 score AND no near-tie below
   *  it, we mark it as auto-pickable. The UI can render it pre-selected. */
  autoPick: SmartRouteCandidate | null;
};

// Words we ignore — common labels, prefixes, suffixes that aren't names.
const STOPWORDS = new Set([
  "the", "and", "of", "for", "to", "co", "c/o", "co.", "c.o.", "att", "attn",
  "mr", "mrs", "ms", "miss", "dr", "prof", "sr", "jr", "ii", "iii", "iv",
  "esq", "esq.", "llc", "inc", "inc.", "ltd", "corp", "corp.", "llp", "p.c.",
  "p.o.", "po", "box", "suite", "ste", "apt", "unit", "#",
]);

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(s: string): string[] {
  return normalize(s)
    .split(" ")
    .map((t) => t.replace(/^[-]+|[-]+$/g, ""))
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
}

// Simple Levenshtein on short strings. Used only when an exact-token
// match misses by 1–2 chars (typo on the envelope). Caps at length 16.
function lev(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  const m = Math.min(a.length, 16);
  const n = Math.min(b.length, 16);
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i]![0] = i;
  for (let j = 0; j <= n; j++) dp[0]![j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a.charAt(i - 1) === b.charAt(j - 1) ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  return dp[m]![n]!;
}

// Token ≈ token. Returns:
//  - 1.0 exact
//  - 0.85 exact substring (>= 4 chars)
//  - 0.7 lev ≤ 1 on names ≥ 4 chars
//  - 0.5 lev ≤ 2 on names ≥ 6 chars
//  - 0   otherwise
function tokenSim(a: string, b: string): number {
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.length >= 4 && b.length >= 4 && (a.includes(b) || b.includes(a))) return 0.85;
  if (a.length >= 4 && b.length >= 4 && lev(a, b) <= 1) return 0.7;
  if (a.length >= 6 && b.length >= 6 && lev(a, b) <= 2) return 0.5;
  return 0;
}

export async function routeRecipientName(input: {
  recipient: string;
}): Promise<SmartRouteResult> {
  await verifyAdmin();
  const raw = input.recipient.trim();
  const tokens = tokenize(raw);

  if (tokens.length === 0) {
    return { query: raw, tokens: [], candidates: [], autoPick: null };
  }

  // Broad SQL prefilter: any of the longest 3 tokens contained in name,
  // email, or businessName. We then re-rank in JS — Prisma can't express
  // the multi-axis weighted score we want.
  const probes = [...tokens]
    .sort((a, b) => b.length - a.length)
    .slice(0, 3)
    .filter((t) => t.length >= 2);
  if (probes.length === 0) {
    return { query: raw, tokens, candidates: [], autoPick: null };
  }

  const candidatePool = await prisma.user.findMany({
    where: {
      role: "USER",
      OR: probes.flatMap((p) => [
        { name: { contains: p } },
        { email: { contains: p } },
        { businessName: { contains: p } },
      ]),
    },
    take: 60,
    select: {
      id: true,
      name: true,
      email: true,
      suiteNumber: true,
      plan: true,
      mailboxStatus: true,
      businessName: true,
    },
  });

  if (candidatePool.length === 0) {
    return { query: raw, tokens, candidates: [], autoPick: null };
  }

  // Recency lookup — single batched query so we don't N+1.
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const recentCounts = await prisma.mailItem.groupBy({
    by: ["userId"],
    where: { userId: { in: candidatePool.map((c) => c.id) }, createdAt: { gte: since } },
    _count: { _all: true },
    _max: { createdAt: true },
  });
  const recentMap = new Map(recentCounts.map((r) => [r.userId, { n: r._count._all, latestIso: r._max.createdAt?.toISOString() ?? null }]));

  const candidates: SmartRouteCandidate[] = candidatePool.map((c) => {
    const candTokens = tokenize([c.name, c.businessName ?? "", c.email.split("@")[0] ?? ""].join(" "));
    let score = 0;
    const reasons: string[] = [];

    // Per-token best-match: each input token earns the BEST sim against any
    // candidate token. We weight by token position in the recipient name —
    // surnames (last token) typically anchor a recipient line.
    let lastTokenSim = 0;
    let firstTokenSim = 0;
    let totalTokenSim = 0;
    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i]!;
      let best = 0;
      let bestCand = "";
      for (const ct of candTokens) {
        const sim = tokenSim(t, ct);
        if (sim > best) { best = sim; bestCand = ct; }
      }
      if (best > 0) {
        if (i === tokens.length - 1) lastTokenSim = best;
        if (i === 0) firstTokenSim = best;
        totalTokenSim += best;
        if (best === 1) reasons.push(`exact match: "${t}"`);
        else if (best >= 0.7) reasons.push(`fuzzy "${t}" ≈ "${bestCand}"`);
      }
    }
    // Surname weighted heaviest (60), first-name lighter (25), residue (15).
    score += lastTokenSim * 60;
    score += firstTokenSim * 25;
    const residue = totalTokenSim - lastTokenSim - firstTokenSim;
    score += Math.max(0, residue) * 15;

    // Business name exact in recipient — common for c/o intake.
    if (c.businessName) {
      const bn = normalize(c.businessName);
      const haystack = normalize(raw);
      if (bn.length >= 3 && haystack.includes(bn)) {
        score += 50;
        reasons.push(`business name "${c.businessName}"`);
      }
    }

    // Email-prefix match — mostly a tiebreak for admin-typed nicknames.
    const emailPrefix = c.email.split("@")[0]!.toLowerCase();
    for (const t of tokens) {
      if (emailPrefix.includes(t) && t.length >= 3) {
        score += 8;
        reasons.push(`email starts with "${t}"`);
        break;
      }
    }

    // Recency bonus.
    const recent = recentMap.get(c.id);
    if (recent && recent.n > 0) {
      score += Math.min(15, 3 + recent.n * 1.5);
      reasons.push(`${recent.n} mail item${recent.n === 1 ? "" : "s"} in past 30 days`);
    }

    // Active-mailbox bonus.
    if (c.mailboxStatus === "Active") {
      score += 5;
    }

    // Cap and confidence label.
    const capped = Math.max(0, Math.min(100, Math.round(score)));
    const confidence: "high" | "med" | "low" = capped >= 75 ? "high" : capped >= 40 ? "med" : "low";

    return {
      userId: c.id,
      customerName: c.name,
      email: c.email,
      suiteNumber: c.suiteNumber,
      plan: c.plan,
      mailboxStatus: c.mailboxStatus,
      businessName: c.businessName,
      score: capped,
      confidence,
      reasons,
      lastMailAt: recent?.latestIso ?? null,
    };
  });

  candidates.sort((a, b) => b.score - a.score);
  const top = candidates.slice(0, 5);

  // Auto-pick rule: top score ≥ 85 AND second place ≥ 25 points behind.
  const autoPick = (() => {
    const first = top[0];
    const second = top[1];
    if (!first || first.score < 85) return null;
    if (second && first.score - second.score < 25) return null;
    return first;
  })();

  // Audit log — fire-and-forget. Captures what was tried + how many hit.
  void prisma.auditLog.create({
    data: {
      actorId: "system",
      actorRole: "ADMIN",
      action: "intake.smart_routed",
      entityType: "tracking",
      entityId: raw.slice(0, 64),
      metadata: JSON.stringify({
        tokens,
        topScore: top[0]?.score ?? null,
        topUserId: top[0]?.userId ?? null,
        autoPickable: Boolean(autoPick),
        candidateCount: candidates.length,
      }),
    },
  }).catch(() => undefined);

  return { query: raw, tokens, candidates: top, autoPick };
}
