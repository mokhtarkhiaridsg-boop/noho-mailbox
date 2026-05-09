"use server";

/**
 * iter-159 — Weekly bureau newsletter (Tier 10 #69).
 *
 * Compiles the previous-7-days recap from existing tables, optionally
 * overlays an admin editorial intro, renders a branded HTML email, and
 * sends it to every active member. Idempotent via `NewsletterIssue`
 * unique-on-weekKey so the cron can't double-send.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";
import { getOperatingHours } from "@/app/actions/operatingHours";

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

export type WeeklyDigest = {
  weekKey: string;            // e.g. "2026-W19"
  weekLabel: string;          // "May 5–11, 2026"
  weekStartIso: string;
  weekEndIso: string;
  totalMailHandled: number;
  totalPackages: number;
  totalPickups: number;
  totalForwarded: number;
  topReferrer: { name: string; count: number } | null;
  customerOfMonth: { name: string; suiteNumber: string | null; citation: string } | null;
  upcomingHolidays: Array<{ date: string; label: string }>;   // next 30 days
  upcomingHolidayWindow: { startIso: string; endIso: string };
};

function isoWeekKey(d: Date): string {
  // ISO week — Thursday rule.
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const year = t.getUTCFullYear();
  const start = new Date(Date.UTC(year, 0, 1));
  const week = Math.ceil(((t.getTime() - start.getTime()) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

function weekRange(now: Date = new Date()): { start: Date; end: Date; label: string; key: string } {
  // Prev Mon 00:00 → prev Sun 23:59:59 (the "this past week" view sent
  // on Monday morning).
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const day = today.getDay() || 7;
  // last Monday = today - (day - 1) - 7 days = today - day + 1 - 7
  const lastMon = new Date(today);
  lastMon.setDate(today.getDate() - day + 1 - 7);
  const lastSun = new Date(lastMon);
  lastSun.setDate(lastMon.getDate() + 6);
  lastSun.setHours(23, 59, 59, 999);
  const fmt = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const yearStr = lastMon.getFullYear();
  const label = `${fmt(lastMon)}–${fmt(lastSun)}, ${yearStr}`;
  return { start: lastMon, end: lastSun, label, key: isoWeekKey(lastMon) };
}

export async function compileWeeklyDigest(opts: { atDate?: Date } = {}): Promise<WeeklyDigest> {
  const now = opts.atDate ?? new Date();
  const { start, end, label, key } = weekRange(now);

  const [
    totalMailHandled,
    totalPackages,
    totalPickups,
    totalForwarded,
    topReferrerGroup,
    cotmRow,
    operatingHours,
  ] = await Promise.all([
    prisma.mailItem.count({ where: { createdAt: { gte: start, lte: end } } }),
    prisma.mailItem.count({ where: { createdAt: { gte: start, lte: end }, type: "Package" } }),
    prisma.auditLog.count({ where: { action: "mail.status.picked_up", createdAt: { gte: start, lte: end } } }),
    prisma.auditLog.count({ where: { action: "mail.status.forwarded", createdAt: { gte: start, lte: end } } }),
    prisma.referral.groupBy({
      by: ["referrerId"],
      where: { status: "credited", creditedAt: { gte: start, lte: end } },
      _count: { _all: true },
      orderBy: { _count: { referrerId: "desc" } },
      take: 1,
    }),
    prisma.customerOfMonthAward.findFirst({
      where: { year: now.getFullYear(), month: now.getMonth() + 1 },
      include: { user: { select: { name: true, suiteNumber: true } } },
    }),
    getOperatingHours(),
  ]);

  let topReferrer: WeeklyDigest["topReferrer"] = null;
  if (topReferrerGroup[0]) {
    const u = await prisma.user.findUnique({
      where: { id: topReferrerGroup[0].referrerId },
      select: { name: true },
    });
    if (u) topReferrer = { name: u.name, count: topReferrerGroup[0]._count._all };
  }

  // Upcoming holidays — next 30 days from the iter-90 operating-hours config.
  const horizon = new Date(now);
  horizon.setDate(horizon.getDate() + 30);
  const horizonIso = horizon.toISOString().slice(0, 10);
  const todayIso = now.toISOString().slice(0, 10);
  const upcomingHolidays = (operatingHours.holidays ?? [])
    .filter((h) => h.date >= todayIso && h.date <= horizonIso)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 4)
    .map((h) => ({ date: h.date, label: h.label }));

  return {
    weekKey: key,
    weekLabel: label,
    weekStartIso: start.toISOString(),
    weekEndIso: end.toISOString(),
    totalMailHandled,
    totalPackages,
    totalPickups,
    totalForwarded,
    topReferrer,
    customerOfMonth: cotmRow ? {
      name: cotmRow.user.name,
      suiteNumber: cotmRow.user.suiteNumber ?? null,
      citation: cotmRow.citation,
    } : null,
    upcomingHolidays,
    upcomingHolidayWindow: { startIso: now.toISOString(), endIso: horizon.toISOString() },
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function renderNewsletterHtml(digest: WeeklyDigest, editorial: string | null): string {
  const wallet = `${BASE_URL}/dashboard`;
  const editorialBlock = editorial && editorial.trim().length > 0
    ? `<div style="background:#fffbeb;border-left:3px solid #F5A623;border-radius:6px;padding:14px 18px;margin:18px 0;font-size:13px;line-height:1.55;color:#5C2A0A;">
        <p style="margin:0;font-style:italic;">${escapeHtml(editorial.trim()).replace(/\n+/g, "<br/>")}</p>
        <p style="margin:6px 0 0;font-size:11px;font-weight:800;color:#92400e;">— The team</p>
       </div>`
    : "";

  const cotmBlock = digest.customerOfMonth
    ? `<div style="margin:20px 0;padding:16px 18px;background:linear-gradient(135deg,#FFF5DC,#FFE7B0);border-radius:12px;border:1px solid rgba(245,166,35,0.30);">
        <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:#92400e;">🌟 Customer of the Month</p>
        <p style="margin:4px 0 0;font-size:18px;font-weight:900;color:#5C2A0A;">${escapeHtml(digest.customerOfMonth.name)}${digest.customerOfMonth.suiteNumber ? ` · #${digest.customerOfMonth.suiteNumber}` : ""}</p>
        <blockquote style="margin:8px 0 0;padding:6px 12px;background:rgba(255,255,255,0.55);border-radius:6px;font-style:italic;color:#5C2A0A;font-size:13px;">${escapeHtml(digest.customerOfMonth.citation)}</blockquote>
       </div>`
    : "";

  const referrerBlock = digest.topReferrer
    ? `<p style="margin:14px 0;font-size:13px;color:#334155;"><strong>Top referrer this week:</strong> ${escapeHtml(digest.topReferrer.name)} with ${digest.topReferrer.count} new sign-up${digest.topReferrer.count === 1 ? "" : "s"}. <a href="${BASE_URL}/dashboard?tab=referrals" style="color:#337485;font-weight:700;">Get your code</a> — both you and the friend earn $10.</p>`
    : "";

  const holidaysBlock = digest.upcomingHolidays.length > 0
    ? `<div style="margin:16px 0;padding:14px 16px;background:#f0f9ff;border:1px solid #7dd3fc;border-radius:10px;">
        <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#23596A;">Upcoming closures</p>
        <ul style="margin:8px 0 0;padding-left:18px;color:#23596A;font-size:13px;line-height:1.6;">
          ${digest.upcomingHolidays.map((h) => `<li><strong>${escapeHtml(new Date(h.date).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }))}</strong> · ${escapeHtml(h.label)}</li>`).join("")}
        </ul>
       </div>`
    : "";

  return `<div style="font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;color:#2D100F;max-width:600px;margin:0 auto;background:white;border-radius:14px;overflow:hidden;border:1px solid #E8DDD0;">
    <div style="background:linear-gradient(135deg,#337485,#23596A);color:#F7E6C2;padding:24px;">
      <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;opacity:0.85;">NOHO Mailbox · Weekly</p>
      <h1 style="margin:6px 0 0;font-size:24px;font-weight:900;letter-spacing:-0.01em;">${escapeHtml(digest.weekLabel)}</h1>
    </div>
    <div style="padding:22px;">
      ${editorialBlock}
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin:0 0 18px;">
        ${[
          { label: "Mail handled", value: digest.totalMailHandled, color: "#337485" },
          { label: "Packages", value: digest.totalPackages, color: "#15803d" },
          { label: "Pickups", value: digest.totalPickups, color: "#23596A" },
          { label: "Forwarded", value: digest.totalForwarded, color: "#92400e" },
        ].map((s) => `
          <div style="flex:1;min-width:120px;padding:12px 14px;border:1px solid #E8DDD0;border-radius:10px;background:#FAFAF7;">
            <p style="margin:0;font-size:10px;font-weight:800;letter-spacing:0.14em;text-transform:uppercase;color:#7A8290;">${s.label}</p>
            <p style="margin:2px 0 0;font-size:24px;font-weight:900;color:${s.color};font-variant-numeric:tabular-nums;">${s.value}</p>
          </div>`).join("")}
      </div>
      ${cotmBlock}
      ${referrerBlock}
      ${holidaysBlock}
      <div style="margin-top:22px;text-align:center;">
        <a href="${wallet}" style="display:inline-block;padding:11px 24px;border-radius:10px;background:#337485;color:white;font-weight:800;font-size:13px;text-decoration:none;">Open my dashboard</a>
      </div>
      <p style="margin:18px 0 0;font-size:11px;color:#94a3b8;line-height:1.6;text-align:center;">
        NOHO Mailbox · 5062 Lankershim Blvd · North Hollywood, CA 91601 · (818) 506-7744<br/>
        You're receiving this because you have an active mailbox with us. Reply STOP to opt out of weekly recaps.
      </p>
    </div>
  </div>`;
}

export type SendNewsletterResult = {
  weekKey: string;
  alreadySent: boolean;
  recipients: number;
  failed: number;
  issueId?: string;
};

// Internal sender — also called by the unauthenticated cron route
// after Bearer-token gate. `actorId` is "system" for cron sends.
async function _sendWeeklyNewsletter(actorId: string, actorRole: string, input: { editorial?: string; force?: boolean }): Promise<SendNewsletterResult> {
  const digest = await compileWeeklyDigest();

  // Idempotency: skip if already sent (unless force is on).
  if (!input.force) {
    const existing = await prisma.newsletterIssue.findUnique({ where: { weekKey: digest.weekKey }, select: { id: true } });
    if (existing) {
      return { weekKey: digest.weekKey, alreadySent: true, recipients: 0, failed: 0, issueId: existing.id };
    }
  }

  const editorialNorm = input.editorial?.trim() ?? "";
  const html = renderNewsletterHtml(digest, editorialNorm || null);
  const subject = `NOHO Weekly · ${digest.weekLabel}`;

  // Active members with email + emailMarketing notif pref. We don't
  // currently model per-channel "weekly_recap" so we treat any email-
  // enabled active member as opted-in. Easy to tighten later via
  // notifPrefs.weeklyRecap.
  const recipients = await prisma.user.findMany({
    where: {
      role: "USER",
      mailboxStatus: "Active",
      email: { not: undefined },
    },
    select: { id: true, email: true, name: true },
    take: 5000,
  });

  let succeeded = 0;
  let failed = 0;
  for (const r of recipients) {
    if (!r.email) continue;
    try {
      await sendEmail({
        to: r.email,
        subject,
        html,
        kind: "weekly_newsletter",
        userId: r.id,
        skipBcc: true,
      });
      succeeded++;
    } catch (e) {
      console.error("[weeklyNewsletter] send failed for", r.id, e);
      failed++;
    }
  }

  // Persist the issue snapshot + audit even if some sends failed.
  let issueId: string | undefined;
  if (input.force && (await prisma.newsletterIssue.count({ where: { weekKey: digest.weekKey } })) > 0) {
    // Force-resend overwrites the prior issue's counts so reporting
    // reflects the latest send.
    const updated = await prisma.newsletterIssue.update({
      where: { weekKey: digest.weekKey },
      data: {
        editorial: editorialNorm || null,
        bodyHtml: html,
        recipientCount: succeeded,
        failedCount: failed,
        sentAt: new Date(),
        sentById: actorId,
        subject,
      },
    });
    issueId = updated.id;
  } else {
    const created = await prisma.newsletterIssue.create({
      data: {
        weekKey: digest.weekKey,
        weekStart: new Date(digest.weekStartIso),
        weekEnd: new Date(digest.weekEndIso),
        subject,
        editorial: editorialNorm || null,
        bodyHtml: html,
        recipientCount: succeeded,
        failedCount: failed,
        sentById: actorId,
      },
    });
    issueId = created.id;
  }

  await prisma.auditLog.create({
    data: {
      actorId,
      actorRole,
      action: "newsletter.weekly_sent",
      entityType: "NewsletterIssue",
      entityId: issueId ?? "(unknown)",
      metadata: JSON.stringify({
        weekKey: digest.weekKey,
        recipients: succeeded,
        failed,
        forced: Boolean(input.force),
      }),
    },
  });

  revalidatePath("/admin");
  return { weekKey: digest.weekKey, alreadySent: false, recipients: succeeded, failed, issueId };
}

// Admin-callable wrapper. Requires verifyAdmin gate.
export async function sendWeeklyNewsletter(input: { editorial?: string; force?: boolean } = {}): Promise<SendNewsletterResult> {
  const actor = await verifyAdmin();
  return _sendWeeklyNewsletter(actor.id ?? "admin", actor.role ?? "ADMIN", input);
}

// System-callable wrapper for the unauthenticated cron route. The
// cron route Bearer-gates the HTTP call before invoking this.
export async function sendWeeklyNewsletterAsSystem(input: { editorial?: string; force?: boolean } = {}): Promise<SendNewsletterResult> {
  return _sendWeeklyNewsletter("system", "ADMIN", input);
}

export async function previewWeeklyNewsletter(input: { editorial?: string } = {}): Promise<{
  digest: WeeklyDigest;
  html: string;
  subject: string;
}> {
  await verifyAdmin();
  const digest = await compileWeeklyDigest();
  const html = renderNewsletterHtml(digest, input.editorial?.trim() || null);
  return { digest, html, subject: `NOHO Weekly · ${digest.weekLabel}` };
}

export type NewsletterIssueRow = {
  id: string;
  weekKey: string;
  subject: string;
  recipientCount: number;
  failedCount: number;
  sentAtIso: string;
};

export async function listNewsletterIssues(limit = 12): Promise<NewsletterIssueRow[]> {
  await verifyAdmin();
  const rows = await prisma.newsletterIssue.findMany({
    orderBy: { sentAt: "desc" },
    take: Math.min(50, Math.max(3, limit)),
    select: { id: true, weekKey: true, subject: true, recipientCount: true, failedCount: true, sentAt: true },
  });
  return rows.map((r) => ({
    id: r.id,
    weekKey: r.weekKey,
    subject: r.subject,
    recipientCount: r.recipientCount,
    failedCount: r.failedCount,
    sentAtIso: r.sentAt.toISOString(),
  }));
}
