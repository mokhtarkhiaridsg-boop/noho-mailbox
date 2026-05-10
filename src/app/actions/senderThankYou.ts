"use server";

/**
 * iter-168 — Sender thank-you notes (Tier 11 #77).
 *
 * Public, no-auth submission flow. The /p/[id]?t=… page renders a
 * "Send a note to the recipient" form; this action accepts the
 * payload, validates against the share token, rate-limits per IP,
 * persists, fires a notification + member webhook, and writes an audit
 * row.
 *
 * Privacy boundaries:
 *  - The submitter only sees their own note in the success state — past
 *    notes from other senders are NEVER exposed publicly.
 *  - The recipient sees ALL notes + can hide spammy ones.
 *  - We never echo back recipient's identity beyond what iter-93's
 *    public view already shows (initials + suite #).
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createNotification } from "@/app/actions/notifications";
import { fireMemberWebhooks } from "@/lib/memberWebhooks";

const RATE_LIMIT_PER_HOUR = 5;        // notes per IP per mailItem per hour
const RATE_LIMIT_GLOBAL_PER_HOUR = 30; // total notes per IP per hour across all packages

type SubmitInput = {
  mailItemId: string;
  shareToken: string;
  message: string;
  senderName?: string;
  senderEmail?: string;
};

export type SubmitResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

export async function submitSenderThankYou(input: SubmitInput): Promise<SubmitResult> {
  const message = (input.message ?? "").trim().slice(0, 500);
  if (message.length < 2) return { ok: false, error: "Message required (≥2 chars)." };

  const senderName = (input.senderName ?? "").trim().slice(0, 80) || null;
  const senderEmail = (input.senderEmail ?? "").trim().slice(0, 120) || null;
  if (senderEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(senderEmail)) {
    return { ok: false, error: "Email looks invalid." };
  }

  const token = (input.shareToken ?? "").trim();
  if (!token || token.length < 10) return { ok: false, error: "Invalid link." };

  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    select: {
      id: true, userId: true, from: true, type: true, publicShareToken: true,
      user: { select: { name: true } },
    },
  });
  if (!item || !item.publicShareToken || item.publicShareToken !== token) {
    return { ok: false, error: "This link is no longer valid." };
  }

  // Diagnostic-only IP + UA capture (never displayed). Used by the
  // hourly rate limiter so a single source can't flood a recipient.
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  const ip = (xff ? xff.split(",")[0]!.trim() : h.get("x-real-ip")) ?? null;
  const userAgent = h.get("user-agent")?.slice(0, 200) ?? null;

  if (ip) {
    const since = new Date(Date.now() - 60 * 60 * 1000);
    const [perItem, globalRecent] = await Promise.all([
      prisma.senderThankYou.count({
        where: { mailItemId: input.mailItemId, ip, createdAt: { gte: since } },
      }),
      prisma.senderThankYou.count({
        where: { ip, createdAt: { gte: since } },
      }),
    ]);
    if (perItem >= RATE_LIMIT_PER_HOUR) {
      return { ok: false, error: "Too many notes for this package — try again later." };
    }
    if (globalRecent >= RATE_LIMIT_GLOBAL_PER_HOUR) {
      return { ok: false, error: "Slow down — too many notes from this device today." };
    }
  }

  const created = await prisma.senderThankYou.create({
    data: {
      mailItemId: item.id,
      message,
      senderName,
      senderEmail,
      ip,
      userAgent,
    },
  });

  // Fire-and-forget side effects: notification + audit + member
  // webhook. Each is wrapped so a failure in one doesn't block the
  // submission response.
  void createNotification({
    userId: item.userId,
    type: "general",
    title: senderName ? `📬 Note from ${senderName}` : `📬 Note from sender`,
    body: message.length > 100 ? message.slice(0, 100) + "…" : message,
    link: `/dashboard?tab=packages`,
  }).catch(() => undefined);

  void prisma.auditLog.create({
    data: {
      actorId: "public",
      actorRole: "PUBLIC",
      action: "mail.sender_note_submitted",
      entityType: "MailItem",
      entityId: item.id,
      metadata: JSON.stringify({
        senderName, senderEmail, messageLength: message.length, ip,
      }),
    },
  }).catch(() => undefined);

  void fireMemberWebhooks(item.userId, "mail.scanned", {
    text: senderName
      ? `📬 ${senderName} left you a note about a ${item.type.toLowerCase()} from ${item.from}`
      : `📬 A sender left you a note about a ${item.type.toLowerCase()} from ${item.from}`,
    url: "https://nohomailbox.org/dashboard?tab=packages",
    detail: {
      mailItemId: item.id,
      kind: "sender_thank_you",
      senderName,
      messageLength: message.length,
    },
  });

  revalidatePath(`/p/${item.id}`);
  return { ok: true, id: created.id };
}

// ─── Member-side: list / hide / unhide my notes ──────────────────────
export type SenderNoteRow = {
  id: string;
  mailItemId: string;
  mailItemFrom: string;
  mailItemType: string;
  mailItemImageUrl: string | null;
  message: string;
  senderName: string | null;
  senderEmail: string | null;
  hidden: boolean;
  createdAtIso: string;
};

export async function listMySenderNotes(input: { limit?: number; includeHidden?: boolean } = {}): Promise<SenderNoteRow[]> {
  const session = await verifySession();
  const userId = session.id!;
  const limit = Math.max(5, Math.min(200, input.limit ?? 50));
  const where: Record<string, unknown> = {
    mailItem: { userId },
  };
  if (!input.includeHidden) where.hidden = false;
  const rows = await prisma.senderThankYou.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      mailItem: { select: { id: true, from: true, type: true, exteriorImageUrl: true } },
    },
  });
  return rows.map((r) => ({
    id: r.id,
    mailItemId: r.mailItemId,
    mailItemFrom: r.mailItem.from,
    mailItemType: r.mailItem.type,
    mailItemImageUrl: r.mailItem.exteriorImageUrl,
    message: r.message,
    senderName: r.senderName,
    senderEmail: r.senderEmail,
    hidden: r.hidden,
    createdAtIso: r.createdAt.toISOString(),
  }));
}

export async function hideSenderNote(input: { id: string; hidden: boolean }): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const row = await prisma.senderThankYou.findUnique({
    where: { id: input.id },
    include: { mailItem: { select: { userId: true } } },
  });
  if (!row) return { error: "Note not found" };
  if (row.mailItem.userId !== userId && session.role !== "ADMIN") {
    return { error: "Not your note to hide" };
  }
  await prisma.senderThankYou.update({
    where: { id: row.id },
    data: { hidden: input.hidden },
  });
  revalidatePath("/dashboard");
  return { success: true };
}

// Public-side count for the share page — shows "8 people have already
// thanked the recipient" social proof without exposing their messages.
export async function getSenderNoteCountForPublic(input: { mailItemId: string; shareToken: string }): Promise<number> {
  const token = (input.shareToken ?? "").trim();
  if (!token) return 0;
  const item = await prisma.mailItem.findUnique({
    where: { id: input.mailItemId },
    select: { publicShareToken: true },
  });
  if (!item || item.publicShareToken !== token) return 0;
  return prisma.senderThankYou.count({ where: { mailItemId: input.mailItemId, hidden: false } });
}
