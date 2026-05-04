"use server";

// iter-119 — Saved package contacts (per-customer recipient autocomplete).
//
// When admin scans a package, the "Addressed to" field often repeats —
// same household members, same business names. We mine the customer's
// own MailItem history and surface the top 6 distinct recipientNames as
// click-to-fill chips. Zero schema changes; pure read.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";

export type RecipientSuggestion = {
  name: string;
  count: number;            // how many past packages used this exact name
  lastUsedIso: string;
};

const MAX_SUGGESTIONS = 6;
const LOOKBACK_LIMIT = 200;  // scan most recent N items per user — keeps it cheap

export async function getRecipientSuggestions(input: { userId: string }): Promise<RecipientSuggestion[]> {
  await verifyAdmin();
  if (!input.userId) return [];

  const rows = await prisma.mailItem.findMany({
    where: {
      userId: input.userId,
      recipientName: { not: null },
    },
    orderBy: { createdAt: "desc" },
    take: LOOKBACK_LIMIT,
    select: { recipientName: true, createdAt: true },
  });

  // Aggregate distinct names with frequency + last-used.
  const byName = new Map<string, { count: number; last: Date }>();
  for (const r of rows) {
    const name = r.recipientName?.trim();
    if (!name) continue;
    const existing = byName.get(name);
    if (existing) {
      existing.count += 1;
      if (r.createdAt > existing.last) existing.last = r.createdAt;
    } else {
      byName.set(name, { count: 1, last: r.createdAt });
    }
  }

  // Rank by recency-weighted frequency. Recent + frequent wins.
  return Array.from(byName.entries())
    .map(([name, { count, last }]) => ({
      name,
      count,
      lastUsedIso: last.toISOString(),
      score: count + Math.max(0, 30 - daysAgo(last)) * 0.1,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_SUGGESTIONS)
    .map(({ name, count, lastUsedIso }) => ({ name, count, lastUsedIso }));
}

function daysAgo(d: Date): number {
  return Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
}
