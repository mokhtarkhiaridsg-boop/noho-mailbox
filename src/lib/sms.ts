// iter-84 — SMS provider wrapper.
//
// Mirrors lib/email.ts's contract: every send writes to SmsLog so admin
// can audit + manually retry. NEVER throws — callers complete their
// work even if SMS is misconfigured. When TWILIO_* env vars are unset
// we log status="not_sent" with the body intact for manual delivery
// (or for testing in dev).
//
// Phone numbers in the User table are free-text; we do a best-effort
// normalize to E.164 (assumes US/Tunisia defaults if no country code).

import { prisma } from "@/lib/prisma";

const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID?.trim();
const TWILIO_AUTH_TOKEN  = process.env.TWILIO_AUTH_TOKEN?.trim();
const TWILIO_FROM_PHONE  = process.env.TWILIO_FROM_PHONE?.trim();
const SMS_DEFAULT_COUNTRY = (process.env.SMS_DEFAULT_COUNTRY ?? "US").toUpperCase();

const twilioReady = Boolean(TWILIO_ACCOUNT_SID && TWILIO_AUTH_TOKEN && TWILIO_FROM_PHONE);

if (typeof window === "undefined" && process.env.NODE_ENV === "production" && !twilioReady) {
  console.warn(
    "[sms] Twilio env not fully configured — TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM_PHONE. " +
      "SMS sends will log only.",
  );
}

// E.164 normalize. Strips formatting, applies country prefix when missing.
//   "(818) 506-7744"   → "+18185067744"  (US default)
//   "+216 22 123 456"  → "+21622123456"
//   "0612345678"       → "+33612345678"  if SMS_DEFAULT_COUNTRY=FR
//   "21622123456"      → "+21622123456"  (already a country code prefix)
export function normalizePhoneE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Strip everything except digits and a leading +.
  let s = raw.trim().replace(/[^\d+]/g, "");
  if (!s) return null;
  if (s.startsWith("+")) {
    return s.length >= 8 ? s : null;
  }
  // No leading +. Country-code rules:
  if (SMS_DEFAULT_COUNTRY === "US") {
    if (s.length === 10) return `+1${s}`;          // 10-digit US
    if (s.length === 11 && s.startsWith("1")) return `+${s}`;
  }
  if (SMS_DEFAULT_COUNTRY === "TN") {
    if (s.length === 8) return `+216${s}`;          // Tunisia mobile
    if (s.startsWith("0") && s.length === 9) return `+216${s.slice(1)}`;
  }
  if (SMS_DEFAULT_COUNTRY === "FR") {
    if (s.startsWith("0") && s.length === 10) return `+33${s.slice(1)}`;
  }
  // Last-resort: assume already-prefixed without the +.
  if (s.length >= 10 && s.length <= 15) return `+${s}`;
  return null;
}

type SendArgs = {
  to: string;
  body: string;
  kind: string;
  userId?: string | null;
};

export async function sendSms(args: SendArgs): Promise<{ logId: string; status: string }> {
  const normalized = normalizePhoneE164(args.to);
  const log = await prisma.smsLog.create({
    data: {
      userId: args.userId ?? null,
      toPhone: normalized ?? args.to,
      fromPhone: TWILIO_FROM_PHONE ?? null,
      body: args.body,
      kind: args.kind,
      status: "queued",
      provider: twilioReady ? "twilio" : null,
    },
  });

  if (!normalized) {
    await prisma.smsLog.update({
      where: { id: log.id },
      data: { status: "failed", error: "Could not normalize phone to E.164" },
    });
    return { logId: log.id, status: "failed" };
  }

  if (!twilioReady) {
    await prisma.smsLog.update({
      where: { id: log.id },
      data: { status: "not_sent", error: "Twilio not configured. Body stored for manual delivery." },
    });
    return { logId: log.id, status: "not_sent" };
  }

  // Inline Twilio REST call — saves us from a heavy SDK dep. The classic
  // POST /Accounts/{Sid}/Messages.json with HTTP Basic auth. Returns JSON
  // with `sid` and `num_segments`.
  try {
    const auth = Buffer.from(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`).toString("base64");
    const form = new URLSearchParams();
    form.set("From", TWILIO_FROM_PHONE!);
    form.set("To", normalized);
    form.set("Body", args.body);
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form.toString(),
    });
    const j = (await res.json().catch(() => ({}))) as { sid?: string; num_segments?: string; message?: string; code?: number };
    if (!res.ok) {
      await prisma.smsLog.update({
        where: { id: log.id },
        data: { status: "failed", error: j.message ?? `Twilio HTTP ${res.status}` },
      });
      return { logId: log.id, status: "failed" };
    }
    await prisma.smsLog.update({
      where: { id: log.id },
      data: {
        status: "sent",
        providerId: j.sid ?? null,
        segments: j.num_segments ? parseInt(j.num_segments, 10) : null,
        sentAt: new Date(),
      },
    });
    return { logId: log.id, status: "sent" };
  } catch (e) {
    await prisma.smsLog.update({
      where: { id: log.id },
      data: { status: "failed", error: e instanceof Error ? e.message : String(e) },
    });
    return { logId: log.id, status: "failed" };
  }
}

// ─── Branded SMS templates — short (160 chars where possible) ──────────────

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

export async function sendMailArrivedSms(data: {
  userId: string;
  toPhone: string;
  firstName: string;
  suiteNumber: string;
  type: "Letter" | "Package" | string;
  from: string;
}) {
  const typeLabel = data.type === "Package" ? "package" : "letter";
  const body = `NOHO Mailbox: A ${typeLabel} from ${truncate(data.from, 24)} arrived for suite #${data.suiteNumber}, ${data.firstName}. Details: ${BASE_URL}/dashboard?tab=packages`;
  return sendSms({ to: data.toPhone, body, kind: "mail_arrived", userId: data.userId });
}

export async function sendMailPickedUpSms(data: {
  userId: string;
  toPhone: string;
  firstName: string;
  suiteNumber: string;
  carrier?: string | null;
  trackingNumber?: string | null;
}) {
  const tag = data.carrier ? ` (${data.carrier})` : "";
  const body = `NOHO Mailbox: Picked up ✓ — your package${tag} was handed off in person at suite #${data.suiteNumber}. Reply HELP if this wasn't you.`;
  return sendSms({ to: data.toPhone, body, kind: "package_picked_up", userId: data.userId });
}

export async function sendStorageWarningSms(data: {
  userId: string;
  toPhone: string;
  firstName: string;
  suiteNumber: string;
  daysOnShelf: number;
}) {
  const body = `NOHO Mailbox: Hi ${data.firstName}, you have a package waiting at suite #${data.suiteNumber} (${data.daysOnShelf}d). Storage starts at day 4 ($6.50/day). ${BASE_URL}/dashboard?tab=packages`;
  return sendSms({ to: data.toPhone, body, kind: "storage_warning", userId: data.userId });
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}
