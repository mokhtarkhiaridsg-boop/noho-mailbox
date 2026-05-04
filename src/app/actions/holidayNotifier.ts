"use server";

// iter-113 — Holiday closure auto-emails.
//
// Daily cron checks the next 14 days of holidays from the iter-90
// operating-hours config and emails every active customer 2 days
// before each closure. Idempotent via an AuditLog presence check —
// once we've sent the heads-up for a (date, label) pair, we won't
// re-send. Reuses iter-90 holidays config + iter-89 email layout +
// iter-95 audit pattern + iter-103 webhook bridge.

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhooks";
import { getOperatingHours } from "./operatingHours";
import type { Holiday } from "@/lib/operating-hours";

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";
const ADVANCE_DAYS = 2;             // notify 2 days before
const LOOKAHEAD_DAYS = 14;          // scan 2 weeks ahead
const AUDIT_ACTION = "holiday.notice_sent";

function todayLocalIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function daysBetween(aIso: string, bIso: string): number {
  const a = Date.UTC(...(aIso.split("-").map(Number) as [number, number, number]));
  const b = Date.UTC(...(bIso.split("-").map(Number) as [number, number, number]));
  // Subtract 1 from month is implicit in Date.UTC; rely on arithmetic only.
  const aDate = new Date(aIso + "T00:00:00Z").getTime();
  const bDate = new Date(bIso + "T00:00:00Z").getTime();
  void a; void b;
  return Math.round((bDate - aDate) / (24 * 60 * 60 * 1000));
}

export type HolidayNoticeRunResult = {
  scannedHolidays: number;
  notified: Array<{ date: string; label: string; recipients: number; sent: number; failed: number }>;
  skippedAlreadySent: string[];
};

// ─── System: cron sweep ──────────────────────────────────────────────────
export async function runHolidayNoticeSweep(): Promise<HolidayNoticeRunResult> {
  const cfg = await getOperatingHours();
  const today = todayLocalIso();
  // Holidays within the next ADVANCE_DAYS..ADVANCE_DAYS window —
  // intentionally narrow so we send EXACTLY at -2d (not -1, -3 too).
  // But to forgive missed runs we pull anything in the next 14 days and
  // skip if already-sent OR not yet at the -2d trigger.
  const upcoming = cfg.holidays
    .filter((h) => {
      const dl = daysBetween(today, h.date);
      return dl >= 0 && dl <= LOOKAHEAD_DAYS;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const notified: HolidayNoticeRunResult["notified"] = [];
  const skippedAlreadySent: string[] = [];

  for (const h of upcoming) {
    const dl = daysBetween(today, h.date);
    if (dl > ADVANCE_DAYS) continue; // not yet ripe

    // Idempotency: have we already sent the notice for this exact
    // (date, label) pair?
    const already = await prisma.auditLog.findFirst({
      where: {
        action: AUDIT_ACTION,
        entityType: "Holiday",
        entityId: `${h.date}:${h.label}`,
      },
      select: { id: true },
    });
    if (already) {
      skippedAlreadySent.push(`${h.date}:${h.label}`);
      continue;
    }

    // Recipient set: every active customer with an email + suite. Skip
    // ADMINs (they get the daily KPI digest already).
    const recipients = await prisma.user.findMany({
      where: {
        role: "USER",
        status: "Active",
        email: { not: "" },
      },
      select: { id: true, name: true, email: true, suiteNumber: true },
    });

    let sent = 0; let failed = 0;
    for (const u of recipients) {
      try {
        await sendEmail({
          to: u.email,
          subject: `Heads up · NOHO closed ${h.date} for ${h.label}`,
          kind: "holiday_notice",
          userId: u.id,
          html: emailHoliday({
            firstName: (u.name ?? "there").split(" ")[0],
            suiteNumber: u.suiteNumber ?? "—",
            holiday: h,
            daysOut: dl,
          }),
        });
        sent += 1;
      } catch (e) {
        console.error("[runHolidayNoticeSweep] email failed:", e);
        failed += 1;
      }
    }

    // Audit row that doubles as our "already sent" sentinel.
    await prisma.auditLog.create({
      data: {
        actorId: "system",
        actorRole: "SYSTEM",
        action: AUDIT_ACTION,
        entityType: "Holiday",
        entityId: `${h.date}:${h.label}`,
        metadata: JSON.stringify({
          date: h.date,
          label: h.label,
          closed: h.closed,
          openClose: h.openClose ?? null,
          recipients: recipients.length,
          sent, failed,
          daysOut: dl,
        }),
      },
    });

    // Best-effort webhook ping so admin sees the broadcast in Slack.
    void fireWebhooks("holiday.notice_sent", {
      text: `📣 Holiday notice sent · *${h.label}* (${h.date}) · ${sent}/${recipients.length} recipients`,
      emoji: "📣",
      detail: { date: h.date, label: h.label, sent, failed },
    });

    notified.push({ date: h.date, label: h.label, recipients: recipients.length, sent, failed });
  }

  return {
    scannedHolidays: upcoming.length,
    notified,
    skippedAlreadySent,
  };
}

// ─── Email template ──────────────────────────────────────────────────────
function emailHoliday(args: {
  firstName: string;
  suiteNumber: string;
  holiday: Holiday;
  daysOut: number;
}) {
  const open = args.holiday.openClose;
  const headline = args.holiday.closed
    ? `We're closed on ${args.holiday.date} for ${args.holiday.label}`
    : `Special hours on ${args.holiday.date}: ${open?.open}–${open?.close} (${args.holiday.label})`;
  const body = args.holiday.closed
    ? `<p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Hi ${args.firstName}, just a heads up — NOHO Mailbox will be closed for <strong>${args.holiday.label}</strong> on <strong>${args.holiday.date}</strong>. Packages that arrive on closed days are accepted by the building and brought into your shelf the next business day.</p>`
    : `<p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Hi ${args.firstName}, ${args.holiday.label} hours: <strong>${open?.open}–${open?.close}</strong>. Plan your pickup accordingly.</p>`;

  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f8fd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8fd;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(14,34,64,0.10);">
        <tr><td style="background:linear-gradient(135deg,#337485 0%,#23596A 100%);padding:32px 40px;">
          <span style="font-size:20px;font-weight:900;color:#ffffff;">NOHO Mailbox</span>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);font-weight:600;">5062 Lankershim Blvd · North Hollywood, CA 91601</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:900;color:#0e2240;letter-spacing:-0.3px;">${headline}</h1>
          ${body}
          <div style="background:#fef3c7;border-left:3px solid #f59e0b;border-radius:4px;padding:14px 18px;margin:16px 0;">
            <p style="margin:0 0 4px;font-size:13px;color:#334155;"><strong>Suite:</strong> #${args.suiteNumber}</p>
            <p style="margin:0;font-size:13px;color:#334155;"><strong>Heads up given:</strong> ${args.daysOut} day${args.daysOut === 1 ? "" : "s"} ahead</p>
          </div>
          <p style="margin:0 0 16px;font-size:13px;color:#334155;line-height:1.55;">Need something during the closure? Schedule a pickup for the next business day from your dashboard, or reply to this email.</p>
          <a href="${BASE_URL}/dashboard?tab=settings" style="display:inline-block;background:#337485;color:#ffffff;font-weight:800;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:100px;">Schedule pickup</a>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">Mon–Fri 9:30am–5:30pm · Sat 10am–1:30pm · (818) 506-7744</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
