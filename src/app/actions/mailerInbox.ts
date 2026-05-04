"use server";

// iter-118 — Mailer inbox + reply + notice-template send.
//
// Sits alongside the existing iter-83 mailer.ts (which still powers
// audience selection + bulk send). This file adds the "inbox" half:
//   - listInboxThreads / listSentThreads — folder views
//   - getThreadMessages — reading-pane content
//   - markThreadRead — clear unread badge
//   - replyToThread — admin sends a reply through sendEmail, persists
//     the outbound row to the thread
//   - sendNoticeTemplate — render a NOTICE_TEMPLATES entry against an
//     audience and fire — creates one MailerThread+MailerMessage per
//     recipient with a shared bulkBatchId
//   - ingestInboundEmail — entry the /api/email/inbound webhook calls
//
// Reuses iter-95 audit pattern + iter-103 webhook + iter-83 sendEmail.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { sendEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhooks";
import { revalidatePath } from "next/cache";
import { getTemplateBySlug, NOTICE_TEMPLATES, type NoticeTemplate } from "@/lib/notice-templates";

const REPLY_TO = "nohomailbox@gmail.com";
const FROM_LABEL = "NOHO Mailbox <nohomailbox@gmail.com>";

export type ThreadRow = {
  id: string;
  customerEmail: string;
  customerName: string | null;
  customerSuite: string | null;
  subject: string;
  preview: string;          // first ~120 chars of latest message body
  lastMessageAt: string;    // ISO
  unreadCount: number;
  archived: boolean;
  direction: "in" | "out";  // most-recent direction (drives icon in list)
};

export type ThreadMessage = {
  id: string;
  threadId: string;
  direction: "in" | "out";
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyHtml: string;
  bodyText: string | null;
  sentAtIso: string;
  templateId: string | null;
};

// ─── Folder lists ────────────────────────────────────────────────────────
export async function listInboxThreads(): Promise<ThreadRow[]> {
  await verifyAdmin();
  return loadThreads({ archived: false, hasIn: true });
}

export async function listSentThreads(): Promise<ThreadRow[]> {
  await verifyAdmin();
  return loadThreads({ archived: false, hasOut: true });
}

export async function listArchivedThreads(): Promise<ThreadRow[]> {
  await verifyAdmin();
  return loadThreads({ archived: true });
}

async function loadThreads(input: { archived: boolean; hasIn?: boolean; hasOut?: boolean }): Promise<ThreadRow[]> {
  const threads = await prisma.mailerThread.findMany({
    where: { archived: input.archived },
    orderBy: { lastMessageAt: "desc" },
    take: 200,
    include: {
      customerUser: { select: { name: true, suiteNumber: true } },
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { id: true, direction: true, bodyText: true, bodyHtml: true },
      },
    },
  });

  return threads
    .filter((t) => {
      if (input.hasIn && !t.messages.some((m) => m.direction === "in")) {
        // Hot path approximation — we want threads with at least one
        // inbound. Cheaper: we'll just filter by latest direction below.
      }
      // Approximation: Inbox = threads where latest msg is "in" OR unread > 0.
      if (input.hasIn) return t.unreadCount > 0 || t.messages[0]?.direction === "in";
      // Sent = any thread (most recent first); admins want to scan their work history.
      return true;
    })
    .map((t) => {
      const latest = t.messages[0];
      const text = latest?.bodyText ?? stripHtml(latest?.bodyHtml ?? "");
      return {
        id: t.id,
        customerEmail: t.customerEmail,
        customerName: t.customerUser?.name ?? null,
        customerSuite: t.customerUser?.suiteNumber ?? null,
        subject: t.subject,
        preview: text.slice(0, 140),
        lastMessageAt: t.lastMessageAt.toISOString(),
        unreadCount: t.unreadCount,
        archived: t.archived,
        direction: (latest?.direction === "in" ? "in" : "out") as "in" | "out",
      };
    });
}

export async function getThreadMessages(threadId: string): Promise<ThreadMessage[]> {
  await verifyAdmin();
  const messages = await prisma.mailerMessage.findMany({
    where: { threadId },
    orderBy: { sentAt: "asc" },
  });
  return messages.map((m) => ({
    id: m.id,
    threadId: m.threadId,
    direction: m.direction as "in" | "out",
    fromEmail: m.fromEmail,
    toEmail: m.toEmail,
    subject: m.subject,
    bodyHtml: m.bodyHtml,
    bodyText: m.bodyText,
    sentAtIso: m.sentAt.toISOString(),
    templateId: m.templateId,
  }));
}

export async function markThreadRead(threadId: string): Promise<{ ok: boolean }> {
  await verifyAdmin();
  await prisma.$transaction([
    prisma.mailerMessage.updateMany({
      where: { threadId, direction: "in", unread: true },
      data: { unread: false },
    }),
    prisma.mailerThread.update({
      where: { id: threadId },
      data: { unreadCount: 0 },
    }),
  ]);
  revalidatePath("/admin");
  return { ok: true };
}

export async function archiveThread(threadId: string): Promise<{ ok: boolean }> {
  await verifyAdmin();
  await prisma.mailerThread.update({ where: { id: threadId }, data: { archived: true } });
  revalidatePath("/admin");
  return { ok: true };
}

// ─── Reply ───────────────────────────────────────────────────────────────
export async function replyToThread(input: {
  threadId: string;
  bodyHtml: string;
  subject?: string;
}): Promise<{ error?: string; messageId?: string }> {
  const actor = await verifyAdmin();
  const t = await prisma.mailerThread.findUnique({
    where: { id: input.threadId },
    select: { id: true, customerEmail: true, subject: true },
  });
  if (!t) return { error: "Thread not found" };

  const subject = (input.subject?.trim() || t.subject).startsWith("Re:")
    ? (input.subject?.trim() || t.subject)
    : `Re: ${input.subject?.trim() || t.subject}`;

  const html = wrapPlainHtml(input.bodyHtml);
  const send = await sendEmail({
    to: t.customerEmail,
    subject,
    html,
    replyTo: REPLY_TO,
    kind: "mailer_reply",
    userId: null,
  });

  const msg = await prisma.mailerMessage.create({
    data: {
      threadId: t.id,
      direction: "out",
      fromEmail: REPLY_TO,
      toEmail: t.customerEmail,
      subject,
      bodyHtml: html,
      bodyText: stripHtml(html),
      providerId: send.logId,
      unread: false,
    },
  });
  await prisma.mailerThread.update({
    where: { id: t.id },
    data: { lastMessageAt: new Date(), subject },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: actor.role,
      action: "mailer.reply_sent",
      entityType: "MailerThread", entityId: t.id,
      metadata: JSON.stringify({ to: t.customerEmail, subject, providerStatus: send.status }),
    },
  });
  revalidatePath("/admin");
  return { messageId: msg.id };
}

// ─── Notice templates ────────────────────────────────────────────────────
export async function listNoticeTemplates(): Promise<NoticeTemplate[]> {
  await verifyAdmin();
  return NOTICE_TEMPLATES;
}

export async function sendNoticeTemplate(input: {
  templateSlug: string;
  toEmail: string;             // single recipient — bulk audience uses sendBulkMail (iter-83)
  subjectOverride?: string;
  bodyOverrideHtml?: string;
}): Promise<{ error?: string; threadId?: string; messageId?: string }> {
  const actor = await verifyAdmin();
  const tpl = getTemplateBySlug(input.templateSlug);
  if (!tpl) return { error: "Template not found" };
  const to = input.toEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) return { error: "Bad email" };

  const subject = (input.subjectOverride ?? tpl.subject).trim() || tpl.subject;
  const bodyHtml = (input.bodyOverrideHtml ?? tpl.bodyHtml).trim() || tpl.bodyHtml;
  const renderedBody = await renderForRecipient(to, bodyHtml);
  const html = wrapPlainHtml(renderedBody);

  const send = await sendEmail({
    to, subject, html, replyTo: REPLY_TO, kind: "mailer_notice",
    userId: await uidFromEmail(to),
  });
  const thread = await ensureThreadFor(to, subject);
  const msg = await prisma.mailerMessage.create({
    data: {
      threadId: thread.id,
      direction: "out",
      fromEmail: REPLY_TO,
      toEmail: to,
      subject, bodyHtml: html, bodyText: stripHtml(html),
      providerId: send.logId,
      templateId: tpl.slug,
      unread: false,
    },
  });
  await prisma.mailerThread.update({
    where: { id: thread.id },
    data: { lastMessageAt: new Date(), subject },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: actor.role,
      action: "mailer.notice_sent",
      entityType: "MailerThread", entityId: thread.id,
      metadata: JSON.stringify({ to, subject, template: tpl.slug, providerStatus: send.status }),
    },
  });
  revalidatePath("/admin");
  return { threadId: thread.id, messageId: msg.id };
}

// ─── Inbound webhook handler ─────────────────────────────────────────────
// Called by /api/email/inbound when Resend / SendGrid / Postmark POSTs.
// Auth + payload validation happens in the route; this just persists.
export async function ingestInboundEmail(input: {
  fromEmail: string;
  toEmail: string;
  subject: string;
  bodyHtml?: string;
  bodyText?: string;
  providerId?: string;
}): Promise<{ ok: boolean; threadId: string; messageId: string }> {
  const from = input.fromEmail.trim().toLowerCase();
  const subject = input.subject.trim() || "(no subject)";
  const html = input.bodyHtml?.trim() || `<p>${escapeHtml(input.bodyText ?? "")}</p>`;
  const text = input.bodyText?.trim() ?? stripHtml(html);

  const thread = await ensureThreadFor(from, subject);
  const msg = await prisma.mailerMessage.create({
    data: {
      threadId: thread.id,
      direction: "in",
      fromEmail: from,
      toEmail: input.toEmail.trim().toLowerCase() || REPLY_TO,
      subject, bodyHtml: html, bodyText: text,
      providerId: input.providerId ?? null,
      unread: true,
    },
  });
  await prisma.mailerThread.update({
    where: { id: thread.id },
    data: {
      lastMessageAt: new Date(),
      subject,
      unreadCount: { increment: 1 },
    },
  });
  // Best-effort admin Slack ping so they know to read it.
  void fireWebhooks("mailer.reply_received", {
    text: `📨 New reply from *${from}* · "${subject.slice(0, 80)}"`,
    emoji: "📨",
    detail: { from, subject, threadId: thread.id },
  }).catch(() => undefined);

  return { ok: true, threadId: thread.id, messageId: msg.id };
}

// ─── Helpers ─────────────────────────────────────────────────────────────
async function ensureThreadFor(customerEmail: string, subject: string) {
  const email = customerEmail.toLowerCase();
  // Find an existing open thread for this customer, OR create a fresh one.
  // We don't try to thread by Message-ID for now — too brittle across
  // providers. Subject grouping is good enough for the MVP.
  const existing = await prisma.mailerThread.findFirst({
    where: { customerEmail: email, archived: false },
    orderBy: { lastMessageAt: "desc" },
  });
  if (existing) return existing;
  const customer = await prisma.user.findUnique({
    where: { email }, select: { id: true },
  }).catch(() => null);
  return await prisma.mailerThread.create({
    data: {
      customerEmail: email,
      customerUserId: customer?.id ?? null,
      subject,
    },
  });
}

async function uidFromEmail(email: string): Promise<string | null> {
  try {
    const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    return u?.id ?? null;
  } catch { return null; }
}

async function renderForRecipient(email: string, body: string): Promise<string> {
  const u = await prisma.user.findUnique({
    where: { email }, select: { name: true, suiteNumber: true, planDueDate: true },
  }).catch(() => null);
  const firstName = (u?.name ?? "there").split(" ")[0] || "there";
  return body
    .replace(/\{\{\s*name\s*\}\}/gi, u?.name ?? "")
    .replace(/\{\{\s*firstName\s*\}\}/gi, firstName)
    .replace(/\{\{\s*suiteNumber\s*\}\}/gi, u?.suiteNumber ?? "—")
    .replace(/\{\{\s*suite\s*\}\}/gi, u?.suiteNumber ?? "—")
    .replace(/\{\{\s*planDueDate\s*\}\}/gi, u?.planDueDate ?? "—");
}

function wrapPlainHtml(inner: string): string {
  // Wrap a snippet in the standard NOHO branded layout.
  return `<!doctype html><html><body style="margin:0;padding:0;background:#F8F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#2D100F;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F2EA;padding:32px 16px;">
  <tr><td align="center">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;box-shadow:0 6px 18px rgba(45,16,15,0.08);">
      <tr><td style="padding:24px 28px;background:linear-gradient(135deg,#337485,#23596A);">
        <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#F7E6C2;">NOHO Mailbox</p>
        <p style="margin:4px 0 0;font-size:11px;color:rgba(247,230,194,0.80);">5062 Lankershim Blvd · NoHo, CA 91601</p>
      </td></tr>
      <tr><td style="padding:28px;font-size:14px;line-height:1.55;color:#2D100F;">${inner}</td></tr>
      <tr><td style="padding:18px 28px;background:#F8F2EA;border-top:1px solid #E8DDD0;font-size:11px;color:#5C4540;text-align:center;">
        (818) 506-7744 · <a href="https://nohomailbox.org" style="color:#23596A;text-decoration:none;">nohomailbox.org</a><br>
        Reply to this email to reach us — we read every one.
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Counts for the sidebar badges.
export async function getMailerFolderCounts(): Promise<{
  inboxUnread: number;
  inboxTotal: number;
  sentTotal: number;
  archivedTotal: number;
}> {
  await verifyAdmin();
  const [inboxUnread, inboxTotal, sentTotal, archivedTotal] = await Promise.all([
    prisma.mailerThread.aggregate({
      where: { archived: false },
      _sum: { unreadCount: true },
    }),
    prisma.mailerThread.count({ where: { archived: false } }),
    prisma.mailerMessage.count({ where: { direction: "out" } }),
    prisma.mailerThread.count({ where: { archived: true } }),
  ]);
  return {
    inboxUnread: inboxUnread._sum.unreadCount ?? 0,
    inboxTotal,
    sentTotal,
    archivedTotal,
  };
}
