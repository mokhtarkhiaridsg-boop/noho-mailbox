"use server";

/**
 * iter-197 — Member onboarding first-pickup reminder (Tier 14 #106).
 *
 * Hourly cron sweep. Finds members whose FIRST package just arrived
 * and is awaiting pickup, computes the next bureau-open instant, and
 * if we're inside the 3.5h–4.5h window before opening, fires a
 * friendly SMS + email with hours / map / what to bring.
 *
 * Idempotency: reuses iter-148 `OnboardingTouch` model with a new
 * touchKey `first_pickup_reminder` so we never double-send.
 *
 * Pause conditions: skip if the member already has a future
 * `PickupAppointment` within the next 48h (they've already committed
 * to a slot — don't be redundant).
 *
 * Audit: `onboarding.first_pickup_reminded` per fired member.
 */

import { prisma } from "@/lib/prisma";
import { getOperatingHours } from "@/app/actions/operatingHours";
import { nextOpenDate } from "@/lib/operating-hours";
import { sendSms } from "@/lib/sms";
import { sendEmail } from "@/lib/email";

const TOUCH_KEY = "first_pickup_reminder";
const FIRE_WINDOW_BEFORE_MIN = 4 * 60 + 30;     // ≥3h30m before open
const FIRE_WINDOW_AFTER_MIN = 3 * 60 + 30;      // ≤4h30m before open
const APPT_PAUSE_HOURS = 48;

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

type Reminded = {
  userId: string;
  userName: string;
  mailItemId: string;
  smsStatus: string | null;
  emailStatus: string | null;
};

export type FirstPickupSweepResult = {
  scanned: number;
  fired: number;
  skippedNotInWindow: boolean;
  skippedHasAppointment: number;
  skippedAlreadyTouched: number;
  reminded: Reminded[];
  ranAtIso: string;
  windowStartIso: string | null;
  windowEndIso: string | null;
  openAtIso: string | null;
  minutesUntilOpen: number | null;
};

export async function runFirstPickupReminderSweep(): Promise<FirstPickupSweepResult> {
  const now = new Date();
  const cfg = await getOperatingHours();
  const openAt = nextOpenDate(cfg, now);
  const result: FirstPickupSweepResult = {
    scanned: 0, fired: 0, skippedNotInWindow: false,
    skippedHasAppointment: 0, skippedAlreadyTouched: 0,
    reminded: [], ranAtIso: now.toISOString(),
    windowStartIso: null, windowEndIso: null,
    openAtIso: openAt?.toISOString() ?? null,
    minutesUntilOpen: null,
  };
  if (!openAt) return result;

  const minutesUntilOpen = Math.round((openAt.getTime() - now.getTime()) / 60_000);
  result.minutesUntilOpen = minutesUntilOpen;
  const inWindow = minutesUntilOpen >= FIRE_WINDOW_AFTER_MIN && minutesUntilOpen <= FIRE_WINDOW_BEFORE_MIN;
  result.windowStartIso = new Date(openAt.getTime() - FIRE_WINDOW_BEFORE_MIN * 60_000).toISOString();
  result.windowEndIso = new Date(openAt.getTime() - FIRE_WINDOW_AFTER_MIN * 60_000).toISOString();

  if (!inWindow) {
    result.skippedNotInWindow = true;
    return result;
  }

  // Candidates: every Awaiting Pickup package. We dedupe to first-package-
  // per-user in JS since SQLite doesn't have window functions in our
  // Prisma version. Sample is small (handful of new arrivals/day).
  const candidates = await prisma.mailItem.findMany({
    where: { status: "Awaiting Pickup", type: "Package" },
    select: {
      id: true, userId: true, createdAt: true, from: true,
      user: { select: { id: true, name: true, email: true, phone: true, suiteNumber: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  result.scanned = candidates.length;

  const seenUser = new Set<string>();
  for (const c of candidates) {
    if (seenUser.has(c.userId)) continue;          // only act on the OLDEST awaiting package per user
    seenUser.add(c.userId);
    if (!c.user || !c.user.suiteNumber) continue;

    // Confirm this is actually their first-ever package (not just first
    // currently awaiting). Cheap count.
    const otherPackages = await prisma.mailItem.count({
      where: { userId: c.userId, type: "Package", id: { not: c.id } },
    });
    if (otherPackages > 0) continue;                // not their first — skip

    // Idempotency check.
    const already = await prisma.onboardingTouch.findUnique({
      where: { userId_touchKey: { userId: c.userId, touchKey: TOUCH_KEY } },
    });
    if (already) { result.skippedAlreadyTouched += 1; continue; }

    // Pause if they have a future appointment.
    const futureAppt = await prisma.pickupAppointment.findFirst({
      where: {
        userId: c.userId,
        status: { in: ["Scheduled", "Checked-In"] },
        scheduledAt: { gte: now, lt: new Date(now.getTime() + APPT_PAUSE_HOURS * 3600 * 1000) },
      },
      select: { id: true },
    });
    if (futureAppt) { result.skippedHasAppointment += 1; continue; }

    // FIRE.
    const firstName = c.user.name.split(/\s+/)[0] || c.user.name;
    const opensIn = humanDelta(minutesUntilOpen);
    const opensLabel = new Intl.DateTimeFormat("en-US", { timeZone: cfg.timezone, hour: "numeric", minute: "2-digit" }).format(openAt);

    let smsStatus: string | null = null;
    let emailStatus: string | null = null;

    if (c.user.phone) {
      try {
        const r = await sendSms({
          to: c.user.phone,
          userId: c.user.id,
          kind: "first_pickup_reminder",
          body: `NOHO Mailbox: Hi ${firstName}, your first package is here! 🎉 We open at ${opensLabel} (in ${opensIn}). Bring photo ID + suite #${c.user.suiteNumber}. ${BASE_URL}/dashboard?tab=packages`,
        });
        smsStatus = r.status;
      } catch (e) { smsStatus = `failed: ${e instanceof Error ? e.message : String(e)}`; }
    }

    if (c.user.email) {
      try {
        const r = await sendEmail({
          to: c.user.email,
          userId: c.user.id,
          kind: "first_pickup_reminder",
          subject: `Your first package is here! Pickup tips for suite #${c.user.suiteNumber}`,
          html: firstPickupEmailHtml({
            firstName,
            suiteNumber: c.user.suiteNumber,
            from: c.from,
            opensLabel,
            opensIn,
            todayLabel: cfg.weekly[new Date().getDay()]?.hours ?? "today's hours",
            timezone: cfg.timezone,
          }),
        });
        emailStatus = r.status;
      } catch (e) { emailStatus = `failed: ${e instanceof Error ? e.message : String(e)}`; }
    }

    if (smsStatus !== null || emailStatus !== null) {
      await prisma.onboardingTouch.create({
        data: { userId: c.user.id, touchKey: TOUCH_KEY },
      }).catch(() => null);
      await prisma.auditLog.create({
        data: {
          actorId: "system", actorRole: "SYSTEM",
          action: "onboarding.first_pickup_reminded",
          entityType: "User", entityId: c.user.id,
          metadata: JSON.stringify({
            mailItemId: c.id, opensAtIso: openAt.toISOString(),
            smsStatus, emailStatus,
          }),
        },
      }).catch(() => null);
      result.fired += 1;
      result.reminded.push({
        userId: c.user.id, userName: c.user.name, mailItemId: c.id,
        smsStatus, emailStatus,
      });
    }
  }

  return result;
}

function humanDelta(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  if (r === 0) return `${h}h`;
  return `${h}h ${r}m`;
}

function firstPickupEmailHtml(data: {
  firstName: string; suiteNumber: string; from: string;
  opensLabel: string; opensIn: string; todayLabel: string; timezone: string;
}): string {
  return `<!doctype html><html><body style="margin:0;background:#F8F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#2D100F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F2EA;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:white;border-radius:14px;border:1px solid #E8DDD0;padding:28px 32px;">
      <tr><td>
        <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:.20em;text-transform:uppercase;color:#23596A;">📦 Your first package is here!</p>
        <h1 style="margin:6px 0 4px;font-size:24px;font-weight:900;letter-spacing:-.4px;">Welcome to NOHO Mailbox, ${escapeHtml(data.firstName)}</h1>
        <p style="margin:0 0 16px;font-size:14px;color:rgba(45,16,15,.65);line-height:1.5;">
          A package from <strong>${escapeHtml(data.from)}</strong> is waiting for you at suite <strong>#${escapeHtml(data.suiteNumber)}</strong>.
          We'll be ready when you walk in.
        </p>
        <div style="background:#F7E6C2;border-radius:10px;padding:16px 20px;margin:14px 0;">
          <p style="margin:0 0 6px;font-size:13px;color:#5C4540;">⏰ <strong>We open at ${escapeHtml(data.opensLabel)}</strong> (in ${escapeHtml(data.opensIn)})</p>
          <p style="margin:0 0 6px;font-size:13px;color:#5C4540;">🪪 <strong>Bring photo ID</strong> — first pickup requires it</p>
          <p style="margin:0 0 6px;font-size:13px;color:#5C4540;">🔢 <strong>Suite #${escapeHtml(data.suiteNumber)}</strong> — tell the front desk</p>
          <p style="margin:0;font-size:13px;color:#5C4540;">📅 Today: ${escapeHtml(data.todayLabel)}</p>
        </div>
        <p style="margin:14px 0;text-align:center;">
          <a href="${BASE_URL}/dashboard?tab=packages" style="display:inline-block;padding:11px 22px;background:#337485;color:white;text-decoration:none;border-radius:10px;font-weight:900;font-size:13px;">View package details →</a>
        </p>
        <p style="margin:18px 0 0;font-size:12px;color:rgba(45,16,15,.55);line-height:1.5;">
          Can't make it during open hours? <a href="${BASE_URL}/dashboard?tab=settings" style="color:#23596A;">Schedule a pickup time</a> or set up <a href="${BASE_URL}/dashboard?tab=settings" style="color:#23596A;">guest pickup</a> for someone else.
        </p>
        <p style="margin:14px 0 0;font-size:11px;color:rgba(45,16,15,.45);line-height:1.5;">
          📍 11288 Ventura Blvd #1006, Studio City, CA 91604 · ${escapeHtml(data.timezone)}<br>
          ☎️ <a href="tel:+18185067744" style="color:#23596A;">(818) 506-7744</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
