"use server";

/**
 * iter-142 — Storage tier auto-graduation (Tier 8 #54).
 *
 * Daily cron sweep that finds packages crossing graduation thresholds
 * (14d, 30d, 60d on shelf) and sends ONE heads-up email per threshold
 * per package, escalating each time. Idempotent via the
 * `StorageThresholdAlert` table — once an alert is recorded for a
 * (mailItemId, threshold) pair, it never re-fires.
 *
 * The sweep also reports the per-tier fee preview so the customer can
 * decide whether to pick up before crossing into the next tier.
 *
 * Fee math (used here AND by `applyStorageFeeOnPickup` via
 * `tieredStorageFeeCents`):
 *
 *   days  0–3   →  free
 *   days  4–13  →  $6.50/day      (base tier)
 *   days 14–29  →  $9.75/day      (1.5×)
 *   days 30–59  →  $13.00/day     (2×)
 *   days 60+    →  $19.50/day     (3×, final)
 *
 * Each tier is APPLIED PER DAY in that tier — so a 35-day package owes:
 *   10×$6.50 + 16×$9.75 + 6×$13.00  =  $221.00
 */

import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";
import { fireWebhooks } from "@/lib/webhooks";

const FREE_DAYS = 3;
const RATE_BASE_CENTS = 650;   // days 4-13
const RATE_T1_CENTS   = 975;   // days 14-29  (1.5×)
const RATE_T2_CENTS   = 1300;  // days 30-59  (2×)
const RATE_T3_CENTS   = 1950;  // days 60+    (3×)

const THRESHOLDS = [
  { key: "14d", day: 14, nextLabel: "30 days", nextRate: RATE_T2_CENTS, urgency: "early"  },
  { key: "30d", day: 30, nextLabel: "60 days", nextRate: RATE_T3_CENTS, urgency: "mid"    },
  { key: "60d", day: 60, nextLabel: null,      nextRate: RATE_T3_CENTS, urgency: "final"  },
] as const;

// iter-142 — Tiered fee math. Returns total cents owed if a package were
// picked up today after `daysOnShelf` days. Used by both the sweep
// (preview in the email) and the at-pickup charge logic.
export async function tieredStorageFeeCents(daysOnShelf: number): Promise<number> {
  if (daysOnShelf <= FREE_DAYS) return 0;
  let total = 0;
  // base tier, days 4..13
  const baseTo = Math.min(13, daysOnShelf);
  total += Math.max(0, baseTo - FREE_DAYS) * RATE_BASE_CENTS;
  if (daysOnShelf <= 13) return total;
  // tier 1, days 14..29
  const t1To = Math.min(29, daysOnShelf);
  total += (t1To - 13) * RATE_T1_CENTS;
  if (daysOnShelf <= 29) return total;
  // tier 2, days 30..59
  const t2To = Math.min(59, daysOnShelf);
  total += (t2To - 29) * RATE_T2_CENTS;
  if (daysOnShelf <= 59) return total;
  // tier 3, days 60+
  total += (daysOnShelf - 59) * RATE_T3_CENTS;
  return total;
}

export type StorageSweepResult = {
  scanned: number;
  alertsSent: number;
  byThreshold: Record<string, number>;
  errors: number;
};

export async function runStorageTierSweep(): Promise<StorageSweepResult> {
  const result: StorageSweepResult = {
    scanned: 0,
    alertsSent: 0,
    byThreshold: { "14d": 0, "30d": 0, "60d": 0 },
    errors: 0,
  };

  const now = new Date();
  // Cutoff = packages created on or before (now - 14 days). We don't
  // need to look at younger packages — the lowest threshold is 14d.
  const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  // Status filter — packages still on shelf (not picked up / forwarded /
  // returned / discarded).
  const TERMINAL = ["Picked Up", "Forwarded", "Returned", "Discarded"];

  const candidates = await prisma.mailItem.findMany({
    where: {
      type: "Package",
      createdAt: { lte: cutoff },
      status: { notIn: TERMINAL },
      feeChargedCents: null,
    },
    select: {
      id: true,
      from: true,
      createdAt: true,
      trackingNumber: true,
      carrier: true,
      userId: true,
      user: { select: { email: true, name: true, suiteNumber: true, notifPrefs: true } },
      storageAlerts: { select: { threshold: true } },
    },
    orderBy: { createdAt: "asc" },
    take: 500,
  });

  result.scanned = candidates.length;

  for (const m of candidates) {
    if (!m.user || !m.user.email) continue;
    const days = Math.floor((now.getTime() - m.createdAt.getTime()) / (24 * 60 * 60 * 1000));
    const sentSet = new Set(m.storageAlerts.map((a) => a.threshold));

    for (const t of THRESHOLDS) {
      if (days < t.day) continue;        // hasn't crossed this threshold yet
      if (sentSet.has(t.key)) continue;  // already alerted at this threshold

      try {
        const feeNow = await tieredStorageFeeCents(days);
        const previewDays = t.nextLabel ? (t.day === 14 ? 30 : 60) : days;
        const feePreview = await tieredStorageFeeCents(previewDays);

        const sendRes = await sendEmail({
          to: m.user.email,
          subject: storageEmailSubject(t.urgency, days, m.user.suiteNumber),
          html: storageEmailHtml({
            firstName: (m.user.name ?? "there").split(/\s+/)[0]!,
            suite: m.user.suiteNumber ?? "—",
            from: m.from,
            tracking: m.trackingNumber,
            carrier: m.carrier,
            daysOnShelf: days,
            feeNowCents: feeNow,
            urgency: t.urgency,
            nextThresholdLabel: t.nextLabel,
            nextFeeCents: t.nextLabel ? feePreview : null,
          }),
          kind: `storage_alert_${t.key}`,
          userId: m.userId,
        }).catch((e) => {
          console.error("[storageTierSweep] sendEmail failed:", e);
          return null;
        });

        // Record the alert + fire webhook even if the email provider
        // hiccuped — admin still wants visibility.
        await prisma.$transaction([
          prisma.storageThresholdAlert.create({
            data: {
              mailItemId: m.id,
              threshold: t.key,
              feeAtAlertCents: feeNow,
            },
          }),
          prisma.auditLog.create({
            data: {
              actorId: "system",
              actorRole: "ADMIN",
              action: "storage.threshold_alert_sent",
              entityType: "MailItem",
              entityId: m.id,
              metadata: JSON.stringify({
                threshold: t.key,
                daysOnShelf: days,
                feeAtAlertCents: feeNow,
                emailDelivered: Boolean(sendRes),
              }),
            },
          }),
        ]);

        void fireWebhooks("storage.threshold_alert", {
          text: `📦 ${m.user.name ?? m.user.email} · suite #${m.user.suiteNumber ?? "—"} · package on shelf ${days} days · fee $${(feeNow / 100).toFixed(2)} (${t.key})`,
          emoji: t.urgency === "final" ? "🚨" : t.urgency === "mid" ? "⚠️" : "📦",
          detail: { threshold: t.key, daysOnShelf: days, feeCents: feeNow, mailItemId: m.id },
        }).catch(() => undefined);

        result.alertsSent++;
        result.byThreshold[t.key] = (result.byThreshold[t.key] ?? 0) + 1;
      } catch (e) {
        console.error("[storageTierSweep] threshold fire failed:", m.id, t.key, e);
        result.errors++;
      }
    }
  }

  return result;
}

function fmt(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function storageEmailSubject(urgency: "early" | "mid" | "final", days: number, suite: string | null): string {
  const suiteFrag = suite ? ` · suite #${suite}` : "";
  if (urgency === "final") return `🚨 FINAL NOTICE — package on shelf ${days} days${suiteFrag}`;
  if (urgency === "mid")   return `⚠️ Storage fee escalating — ${days} days on shelf${suiteFrag}`;
  return `📦 Heads up — your package has been on our shelf ${days} days${suiteFrag}`;
}

function storageEmailHtml(args: {
  firstName: string;
  suite: string;
  from: string;
  tracking: string | null;
  carrier: string | null;
  daysOnShelf: number;
  feeNowCents: number;
  urgency: "early" | "mid" | "final";
  nextThresholdLabel: string | null;
  nextFeeCents: number | null;
}): string {
  const accent = args.urgency === "final" ? "#991b1b" : args.urgency === "mid" ? "#92400e" : "#23596A";
  const accentBg = args.urgency === "final" ? "#fef2f2" : args.urgency === "mid" ? "#fffbeb" : "#f0f9ff";
  const accentBorder = args.urgency === "final" ? "#fca5a5" : args.urgency === "mid" ? "#fbbf24" : "#7dd3fc";
  const headline =
    args.urgency === "final"
      ? `Final notice — please pick up immediately`
      : args.urgency === "mid"
        ? `Storage fee has escalated — please pick up soon`
        : `Just a heads up — your package has been waiting`;
  const tail = args.tracking
    ? `${args.carrier ?? "Tracking"}: <span style="font-family: ui-monospace, monospace;">${args.tracking}</span>`
    : "";

  const nextSentence = args.nextThresholdLabel && args.nextFeeCents != null
    ? `<p style="margin:12px 0 0;font-size:13px;color:#5C4540;">If still on shelf at <strong>${args.nextThresholdLabel}</strong>, the accumulated fee will be <strong>${fmt(args.nextFeeCents)}</strong>.</p>`
    : `<p style="margin:12px 0 0;font-size:13px;color:#991b1b;font-weight:700;">After 60 days we may be required to forward or return the package per our Terms.</p>`;

  return `
    <div style="font-family:-apple-system,BlinkMacSystemFont,Inter,sans-serif;color:#2D100F;max-width:560px;margin:0 auto;padding:24px 16px;">
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:900;letter-spacing:-0.01em;color:${accent};">${headline}</h1>
      <p style="margin:0 0 16px;font-size:14px;color:#5C4540;line-height:1.55;">
        Hi ${escapeHtml(args.firstName)}, your package from <strong>${escapeHtml(args.from)}</strong> has been waiting at the bureau for <strong>${args.daysOnShelf} days</strong>.
        ${tail}
      </p>
      <div style="background:${accentBg};border:1px solid ${accentBorder};border-radius:10px;padding:16px 18px;">
        <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.16em;text-transform:uppercase;color:${accent};">
          Accumulated storage fee today
        </p>
        <p style="margin:4px 0 0;font-size:28px;font-weight:900;color:${accent};font-feature-settings:'tnum' 1;">
          ${fmt(args.feeNowCents)}
        </p>
        <p style="margin:8px 0 0;font-size:12px;color:#5C4540;">
          Suite #${escapeHtml(args.suite)} · billed at pickup. Free up to 3 days, then graduated tiers
          ($6.50 → $9.75 → $13.00 → $19.50/day).
        </p>
        ${nextSentence}
      </div>
      <div style="margin-top:18px;text-align:center;">
        <a href="${process.env.AUTH_URL ?? "https://nohomailbox.org"}/dashboard?tab=packages"
           style="display:inline-block;padding:10px 20px;border-radius:10px;background:#337485;color:#fff;font-weight:800;font-size:13px;text-decoration:none;">
          View package + schedule pickup
        </a>
      </div>
      <p style="margin:18px 0 0;font-size:11px;color:#94a3b8;line-height:1.6;">
        Bureau hours: Mon–Fri 9:30am–5:30pm · Sat 10am–1:30pm. Questions? Call (818) 506-7744.
      </p>
    </div>
  `;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
