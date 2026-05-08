"use server";

/**
 * iter-141 — Mailer auto-reply rules (Tier 8 #53).
 *
 * Admin defines keyword triggers; when an inbound MailerMessage matches
 * an active rule, we auto-fire a templated reply ONCE per thread per
 * cooldown window. Powered by:
 *
 *   - matchInboundAgainstRules({ messageId }) — called from
 *     ingestInboundEmail right after the inbound row is persisted.
 *   - listAutoReplyRules / upsertAutoReplyRule / deleteAutoReplyRule —
 *     admin CRUD.
 *
 * All side effects (rule fire, sendEmail, audit) are wrapped so a single
 * misconfigured rule never blocks the inbound ingest path.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

const REPLY_FROM = process.env.MAILER_REPLY_FROM ?? "NOHO Mailbox <hello@nohomailbox.org>";

export type AutoReplyRuleRow = {
  id: string;
  label: string;
  matchOn: "any" | "subject" | "body";
  keywords: string[];
  replySubject: string;
  replyBodyHtml: string;
  active: boolean;
  cooldownHours: number;
  businessHours: "any" | "open" | "closed";
  sendCount: number;
  lastFiredAt: string | null;
  createdAt: string;
};

const VALID_MATCH = new Set(["any", "subject", "body"]);
const VALID_HOURS = new Set(["any", "open", "closed"]);

function parseKeywords(raw: string): string[] {
  try {
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return [];
    return arr.filter((x): x is string => typeof x === "string").map((s) => s.trim()).filter(Boolean);
  } catch {
    return [];
  }
}

// Renders the body with template substitution. Supported placeholders:
//   {customerName}, {firstName}, {originalSubject}, {firstLine}
function renderTemplate(
  template: string,
  ctx: { customerName: string; firstName: string; originalSubject: string; firstLine: string },
): string {
  return template
    .replaceAll("{customerName}", ctx.customerName)
    .replaceAll("{firstName}", ctx.firstName)
    .replaceAll("{originalSubject}", ctx.originalSubject)
    .replaceAll("{firstLine}", ctx.firstLine);
}

// iter-141 — Called from ingestInboundEmail. Returns the count of rules
// that fired so the caller can audit-log it. NEVER throws.
export async function matchInboundAgainstRules(input: {
  messageId: string;
}): Promise<{ fired: number; ruleIds: string[] }> {
  try {
    const msg = await prisma.mailerMessage.findUnique({
      where: { id: input.messageId },
      include: {
        thread: {
          include: { customerUser: { select: { id: true, name: true } } },
        },
      },
    });
    if (!msg) return { fired: 0, ruleIds: [] };
    if (msg.direction !== "in") return { fired: 0, ruleIds: [] };

    const rules = await prisma.mailerAutoReplyRule.findMany({
      where: { active: true },
      orderBy: { createdAt: "asc" },
    });
    if (rules.length === 0) return { fired: 0, ruleIds: [] };

    // Determine the haystack per rule.
    const subjectLc = (msg.subject ?? "").toLowerCase();
    const bodyLc = (msg.bodyText ?? msg.bodyHtml ?? "").toLowerCase();
    const customerEmail = msg.fromEmail.toLowerCase();
    const customerName = msg.thread?.customerUser?.name?.trim() || customerEmail.split("@")[0]!;
    const firstName = customerName.split(/\s+/)[0] ?? customerName;
    const firstLine = (msg.bodyText ?? "").split(/\n+/).map((l) => l.trim()).find(Boolean) ?? "";
    const now = new Date();
    const fired: string[] = [];

    // Optional business-hours gate. We treat the bureau hours from
    // SiteConfig as the source of truth; missing config = always "open".
    const insideOpen = await isCurrentlyOpen().catch(() => true);

    for (const rule of rules) {
      try {
        if (rule.businessHours === "open" && !insideOpen) continue;
        if (rule.businessHours === "closed" && insideOpen) continue;

        const kws = parseKeywords(rule.keywords);
        if (kws.length === 0) continue;
        const haystack = rule.matchOn === "subject"
          ? subjectLc
          : rule.matchOn === "body"
            ? bodyLc
            : `${subjectLc}\n${bodyLc}`;
        const hit = kws.some((k) => haystack.includes(k.toLowerCase()));
        if (!hit) continue;

        // Cooldown — was this same rule fired for this customer within
        // the last cooldownHours? (We check against MailerMessage by
        // autoReplyRuleId + customerEmail to be safe even if the thread
        // was archived/recreated.)
        const cooldownMs = Math.max(1, rule.cooldownHours) * 60 * 60 * 1000;
        const cutoff = new Date(now.getTime() - cooldownMs);
        const recentFire = await prisma.mailerMessage.findFirst({
          where: {
            autoReplyRuleId: rule.id,
            toEmail: customerEmail,
            sentAt: { gte: cutoff },
          },
          select: { id: true },
        });
        if (recentFire) continue;

        // Compose + send.
        const renderedSubject = renderTemplate(rule.replySubject, {
          customerName, firstName, originalSubject: msg.subject, firstLine,
        }).trim();
        const renderedBody = renderTemplate(rule.replyBodyHtml, {
          customerName, firstName, originalSubject: msg.subject, firstLine,
        });
        const sendRes = await sendEmail({
          to: customerEmail,
          subject: renderedSubject || `Re: ${msg.subject}`,
          html: renderedBody,
          kind: "mailer_auto_reply",
          userId: msg.thread?.customerUser?.id ?? undefined,
        }).catch((e) => {
          console.error("[mailerAutoReply] sendEmail failed:", e);
          return null;
        });

        if (!sendRes) continue;

        // Persist as outbound MailerMessage + bump rule counters.
        await prisma.$transaction([
          prisma.mailerMessage.create({
            data: {
              threadId: msg.threadId,
              direction: "out",
              fromEmail: REPLY_FROM,
              toEmail: customerEmail,
              subject: renderedSubject,
              bodyHtml: renderedBody,
              bodyText: stripHtml(renderedBody),
              providerId: sendRes.logId ?? null,
              autoReplyRuleId: rule.id,
              unread: false,
            },
          }),
          prisma.mailerThread.update({
            where: { id: msg.threadId },
            data: { lastMessageAt: now, subject: renderedSubject || msg.subject },
          }),
          prisma.mailerAutoReplyRule.update({
            where: { id: rule.id },
            data: { sendCount: { increment: 1 }, lastFiredAt: now },
          }),
          prisma.auditLog.create({
            data: {
              actorId: "system",
              actorRole: "ADMIN",
              action: "mailer.auto_reply_fired",
              entityType: "MailerAutoReplyRule",
              entityId: rule.id,
              metadata: JSON.stringify({
                threadId: msg.threadId,
                customerEmail,
                ruleLabel: rule.label,
                matchedKeywords: kws.filter((k) => haystack.includes(k.toLowerCase())),
              }),
            },
          }),
        ]);
        fired.push(rule.id);
      } catch (e) {
        console.error("[mailerAutoReply] rule fire failed:", rule.id, e);
      }
    }

    return { fired: fired.length, ruleIds: fired };
  } catch (e) {
    console.error("[mailerAutoReply] matcher failed:", e);
    return { fired: 0, ruleIds: [] };
  }
}

// ─── Admin CRUD ────────────────────────────────────────────────────

export async function listAutoReplyRules(): Promise<AutoReplyRuleRow[]> {
  await verifyAdmin();
  const rows = await prisma.mailerAutoReplyRule.findMany({
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    matchOn: (VALID_MATCH.has(r.matchOn) ? r.matchOn : "any") as "any" | "subject" | "body",
    keywords: parseKeywords(r.keywords),
    replySubject: r.replySubject,
    replyBodyHtml: r.replyBodyHtml,
    active: r.active,
    cooldownHours: r.cooldownHours,
    businessHours: (VALID_HOURS.has(r.businessHours) ? r.businessHours : "any") as "any" | "open" | "closed",
    sendCount: r.sendCount,
    lastFiredAt: r.lastFiredAt ? r.lastFiredAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
  }));
}

export async function upsertAutoReplyRule(input: {
  id?: string;
  label: string;
  matchOn: "any" | "subject" | "body";
  keywords: string[];
  replySubject: string;
  replyBodyHtml: string;
  active?: boolean;
  cooldownHours?: number;
  businessHours?: "any" | "open" | "closed";
}): Promise<{ id?: string; error?: string }> {
  const actor = await verifyAdmin();

  const label = input.label.trim();
  if (!label) return { error: "Label required" };
  const keywords = (input.keywords ?? []).map((k) => k.trim()).filter(Boolean);
  if (keywords.length === 0) return { error: "Add at least one keyword to trigger on" };
  if (!VALID_MATCH.has(input.matchOn)) return { error: "Invalid matchOn" };
  if (!VALID_HOURS.has(input.businessHours ?? "any")) return { error: "Invalid businessHours" };
  const replySubject = input.replySubject.trim();
  const replyBodyHtml = input.replyBodyHtml.trim();
  if (!replySubject) return { error: "Reply subject required" };
  if (!replyBodyHtml) return { error: "Reply body required" };
  const cooldownHours = Math.max(1, Math.min(720, Math.round(input.cooldownHours ?? 24)));

  const data = {
    label,
    matchOn: input.matchOn,
    keywords: JSON.stringify(keywords),
    replySubject,
    replyBodyHtml,
    active: input.active ?? true,
    cooldownHours,
    businessHours: input.businessHours ?? "any",
  };

  let id = input.id;
  if (id) {
    await prisma.mailerAutoReplyRule.update({ where: { id }, data });
  } else {
    const created = await prisma.mailerAutoReplyRule.create({
      data: { ...data, createdBy: actor.id },
    });
    id = created.id;
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: input.id ? "mailer.auto_reply_rule_updated" : "mailer.auto_reply_rule_created",
      entityType: "MailerAutoReplyRule",
      entityId: id,
      metadata: JSON.stringify({ label, matchOn: input.matchOn, keywordCount: keywords.length, active: input.active ?? true }),
    },
  });

  revalidatePath("/admin");
  return { id };
}

export async function deleteAutoReplyRule(id: string): Promise<{ success: true } | { error: string }> {
  const actor = await verifyAdmin();
  const rule = await prisma.mailerAutoReplyRule.findUnique({ where: { id }, select: { id: true, label: true } });
  if (!rule) return { error: "Rule not found" };
  await prisma.$transaction([
    prisma.mailerAutoReplyRule.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "mailer.auto_reply_rule_deleted",
        entityType: "MailerAutoReplyRule",
        entityId: id,
        metadata: JSON.stringify({ label: rule.label }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function toggleAutoReplyRuleActive(id: string): Promise<{ active?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const rule = await prisma.mailerAutoReplyRule.findUnique({ where: { id }, select: { id: true, label: true, active: true } });
  if (!rule) return { error: "Rule not found" };
  const next = !rule.active;
  await prisma.$transaction([
    prisma.mailerAutoReplyRule.update({ where: { id }, data: { active: next } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: next ? "mailer.auto_reply_rule_activated" : "mailer.auto_reply_rule_deactivated",
        entityType: "MailerAutoReplyRule",
        entityId: id,
        metadata: JSON.stringify({ label: rule.label }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { active: next };
}

// ─── Helpers ───────────────────────────────────────────────────────

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// Look up the bureau's operating hours config and decide whether right
// now is "open". Defaults to true when no config exists. Keeps the
// matcher self-contained so we don't import the full operating-hours
// admin module here.
async function isCurrentlyOpen(): Promise<boolean> {
  try {
    const cfg = await prisma.siteConfig.findFirst({
      where: { key: "operatingHours" },
      select: { value: true },
    });
    if (!cfg?.value) return true;
    const parsed = JSON.parse(cfg.value) as {
      hours?: Record<string, { open: string; close: string; closed?: boolean }>;
    };
    if (!parsed.hours) return true;
    const now = new Date();
    const dayKey = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"][now.getDay()]!;
    const slot = parsed.hours[dayKey];
    if (!slot || slot.closed) return false;
    const [oH, oM] = slot.open.split(":").map(Number);
    const [cH, cM] = slot.close.split(":").map(Number);
    const minsNow = now.getHours() * 60 + now.getMinutes();
    const openMins = (oH ?? 0) * 60 + (oM ?? 0);
    const closeMins = (cH ?? 0) * 60 + (cM ?? 0);
    return minsNow >= openMins && minsNow < closeMins;
  } catch {
    return true;
  }
}
