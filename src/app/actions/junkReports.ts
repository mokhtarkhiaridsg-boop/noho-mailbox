"use server";

/**
 * iter-202 — One-click junk-rule learning (Tier 14 #111).
 *
 * Flow:
 *   1. Member taps "🚫 Block junk" on a single mail item
 *      → reportMailItemAsJunk creates a JunkReport row + flips
 *        MailItem.junkBlocked=true (but does NOT add a sender rule yet)
 *   2. After 3+ reports stack up for the same normalized sender (and
 *      no JunkSender rule already covers that sender), the dashboard
 *      surfaces a suggestion via getMyJunkSuggestions
 *   3. One-tap promoteJunkSuggestion creates the JunkSender rule via
 *      the existing iter-149 path + marks reports promotedToRule=true
 *      so they stop nudging
 *
 * Why this matters: members rarely think to set up rules proactively
 * but happily tap "Block" once. By learning from their behavior we
 * automate the rule creation while keeping it consensual + reversible.
 *
 * Audit: `mail.junk_reported` per individual report,
 *        `mail.junk_suggestion_promoted` when admin/member converts to a rule.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";

const SUGGESTION_THRESHOLD = 3;
const SUGGESTION_WINDOW_DAYS = 90;

function normalizeSender(s: string): string {
  return s.trim().toLowerCase().slice(0, 120);
}

export async function reportMailItemAsJunk(input: { mailItemId: string }): Promise<{ success?: boolean; error?: string; suggestPromotion?: boolean; reportCount?: number; normalizedSender?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const item = await prisma.mailItem.findUnique({ where: { id: input.mailItemId }, select: { userId: true, from: true, junkBlocked: true } });
  if (!item) return { error: "Mail item not found." };
  if (item.userId !== userId) return { error: "Not your mail item." };
  const normalized = normalizeSender(item.from);

  // Idempotent — re-tapping just refreshes junkBlocked + audit.
  await prisma.junkReport.upsert({
    where: { userId_mailItemId: { userId, mailItemId: input.mailItemId } },
    create: { userId, mailItemId: input.mailItemId, senderRaw: item.from, normalizedSender: normalized },
    update: {},
  });
  await prisma.mailItem.update({ where: { id: input.mailItemId }, data: { junkBlocked: true } }).catch(() => null);
  await prisma.auditLog.create({
    data: {
      actorId: userId, actorRole: session.role ?? "MEMBER",
      action: "mail.junk_reported",
      entityType: "MailItem", entityId: input.mailItemId,
      metadata: JSON.stringify({ sender: item.from, normalized }),
    },
  }).catch(() => null);

  // Should we surface a "promote to rule" suggestion?
  const since = new Date(Date.now() - SUGGESTION_WINDOW_DAYS * 24 * 3600 * 1000);
  const reportCount = await prisma.junkReport.count({
    where: { userId, normalizedSender: normalized, promotedToRule: false, createdAt: { gte: since } },
  });
  const ruleExists = await prisma.junkSender.findFirst({
    where: { userId, sender: { contains: normalized.slice(0, 40) } },
    select: { id: true },
  });
  const suggestPromotion = reportCount >= SUGGESTION_THRESHOLD && !ruleExists;

  revalidatePath("/dashboard");
  return { success: true, suggestPromotion, reportCount, normalizedSender: normalized };
}

export type JunkSuggestion = {
  normalizedSender: string;
  senderDisplay: string;       // most recent senderRaw — preserves casing for UI
  reportCount: number;
  firstReportedAtIso: string;
  lastReportedAtIso: string;
  recentMailItemIds: string[]; // up to 4 — for the "saw N pieces" UI
};

export async function getMyJunkSuggestions(): Promise<JunkSuggestion[]> {
  const session = await verifySession();
  const userId = session.id!;
  const since = new Date(Date.now() - SUGGESTION_WINDOW_DAYS * 24 * 3600 * 1000);

  const reports = await prisma.junkReport.findMany({
    where: { userId, promotedToRule: false, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  // Existing rules — used to suppress already-covered senders.
  const rules = await prisma.junkSender.findMany({ where: { userId }, select: { sender: true } });
  const ruleNeedles = rules.map((r) => r.sender.toLowerCase());

  const buckets = new Map<string, JunkSuggestion>();
  for (const r of reports) {
    if (ruleNeedles.some((n) => r.normalizedSender.includes(n))) continue;
    let b = buckets.get(r.normalizedSender);
    if (!b) {
      b = {
        normalizedSender: r.normalizedSender,
        senderDisplay: r.senderRaw,
        reportCount: 0,
        firstReportedAtIso: r.createdAt.toISOString(),
        lastReportedAtIso: r.createdAt.toISOString(),
        recentMailItemIds: [],
      };
      buckets.set(r.normalizedSender, b);
    }
    b.reportCount += 1;
    if (r.createdAt.toISOString() < b.firstReportedAtIso) b.firstReportedAtIso = r.createdAt.toISOString();
    if (r.createdAt.toISOString() > b.lastReportedAtIso) b.lastReportedAtIso = r.createdAt.toISOString();
    if (b.recentMailItemIds.length < 4) b.recentMailItemIds.push(r.mailItemId);
  }
  return Array.from(buckets.values())
    .filter((b) => b.reportCount >= SUGGESTION_THRESHOLD)
    .sort((a, b) => b.reportCount - a.reportCount);
}

export async function promoteJunkSuggestion(input: { normalizedSender: string }): Promise<{ success?: boolean; error?: string; rulePattern?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const normalized = input.normalizedSender.trim().toLowerCase();
  if (!normalized) return { error: "Sender required." };

  // Already promoted? Reflect success.
  const existingRule = await prisma.junkSender.findFirst({
    where: { userId, sender: { contains: normalized.slice(0, 40) } },
    select: { id: true },
  });
  if (existingRule) return { success: true, rulePattern: normalized };

  // Use the most-recent reported senderRaw for the rule pattern (preserves
  // capitalization the member is used to seeing). Limit to a reasonable
  // substring so future senders with e.g. trailing UID still match.
  const recent = await prisma.junkReport.findFirst({
    where: { userId, normalizedSender: normalized, promotedToRule: false },
    orderBy: { createdAt: "desc" },
  });
  const pattern = (recent?.senderRaw ?? normalized).trim().slice(0, 80);

  await prisma.$transaction([
    prisma.junkSender.create({ data: { userId, sender: pattern } }),
    prisma.junkReport.updateMany({ where: { userId, normalizedSender: normalized }, data: { promotedToRule: true } }),
    prisma.mailItem.updateMany({ where: { userId, from: { contains: pattern } }, data: { junkBlocked: true } }),
    prisma.auditLog.create({
      data: {
        actorId: userId, actorRole: session.role ?? "MEMBER",
        action: "mail.junk_suggestion_promoted",
        entityType: "JunkSender", entityId: pattern,
        metadata: JSON.stringify({ normalized, pattern }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  return { success: true, rulePattern: pattern };
}

export async function dismissJunkSuggestion(input: { normalizedSender: string }): Promise<{ success?: boolean }> {
  const session = await verifySession();
  const userId = session.id!;
  const normalized = input.normalizedSender.trim().toLowerCase();
  // "Dismiss" = mark all matching reports as promoted-to-rule=true so
  // they stop showing up. We DON'T create a rule; the member said "I
  // don't want a rule for this".
  await prisma.junkReport.updateMany({
    where: { userId, normalizedSender: normalized, promotedToRule: false },
    data: { promotedToRule: true },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId, actorRole: session.role ?? "MEMBER",
      action: "mail.junk_suggestion_dismissed",
      entityType: "JunkReport", entityId: normalized,
      metadata: JSON.stringify({ normalized }),
    },
  }).catch(() => null);
  revalidatePath("/dashboard");
  return { success: true };
}
