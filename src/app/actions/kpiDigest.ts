"use server";

// iter-104 — Daily KPI digest email to admins.
//
// Cron-triggered every morning. Pulls "yesterday" counts across all the
// operational tables (intake, pickups, dropoffs, signups, revenue,
// churn, webhook health, expiring IDs, today's pickup queue) and emails
// every ADMIN user a single one-screen summary with deltas vs. the
// prior day so admin can scan it at coffee. Audit-logged on send.
//
// Reuses iter-83 wrapLayout aesthetic, iter-94/iter-102 cron auth, and
// the iter-95 audit pattern.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

export type KpiSnapshot = {
  windowStartIso: string;
  windowEndIso: string;
  windowLabel: string;
  cards: KpiCard[];
};

type KpiCard = {
  key: string;
  label: string;
  value: number | string;
  unit?: string;
  delta?: { value: number; direction: "up" | "down" | "flat"; label: string };
  detail?: string;
};

// Day boundaries in the bureau's timezone (PT) but expressed as UTC ranges
// for the prisma queries. Yesterday-PT in UTC is well-approximated as the
// 24h window ending at PT midnight (the bureau is closed by then).
function dayWindowsUtc(now: Date = new Date()) {
  const startOfTodayLocal = new Date(now);
  startOfTodayLocal.setHours(0, 0, 0, 0);
  const startOfYesterday = new Date(startOfTodayLocal.getTime() - 24 * 60 * 60 * 1000);
  const startOfDayBefore = new Date(startOfYesterday.getTime() - 24 * 60 * 60 * 1000);
  const endOfToday = new Date(startOfTodayLocal.getTime() + 24 * 60 * 60 * 1000);
  return {
    startOfYesterday,
    startOfToday: startOfTodayLocal,
    startOfDayBefore,
    endOfToday,
  };
}

function delta(yest: number, dayBefore: number) {
  if (dayBefore === 0 && yest === 0) return { value: 0, direction: "flat" as const, label: "no change" };
  if (dayBefore === 0) return { value: yest, direction: "up" as const, label: `+${yest} vs prev` };
  const diff = yest - dayBefore;
  const pct = Math.round((diff / dayBefore) * 100);
  if (diff === 0) return { value: 0, direction: "flat" as const, label: "no change" };
  return {
    value: pct,
    direction: diff > 0 ? "up" as const : "down" as const,
    label: `${diff > 0 ? "+" : ""}${pct}% vs prev (${dayBefore}→${yest})`,
  };
}

export async function getYesterdayKpis(): Promise<KpiSnapshot> {
  const w = dayWindowsUtc();
  const yest = { gte: w.startOfYesterday, lt: w.startOfToday };
  const prev = { gte: w.startOfDayBefore, lt: w.startOfYesterday };
  const today = { gte: w.startOfToday, lt: w.endOfToday };

  const [
    intakeYest, intakePrev,
    pickupsYest, pickupsPrev,
    dropoffsYest, dropoffsPrev,
    signupsYest, signupsPrev,
    paymentsYest,
    cancelsYest,
    webhookOk7d, webhookFail7d,
    pickupQueueToday,
    idsExpiring7d,
    awaitingPickupNow,
  ] = await Promise.all([
    prisma.mailItem.count({ where: { createdAt: yest } }),
    prisma.mailItem.count({ where: { createdAt: prev } }),
    prisma.auditLog.count({ where: { action: "mail.status.picked_up", createdAt: yest } }),
    prisma.auditLog.count({ where: { action: "mail.status.picked_up", createdAt: prev } }),
    safeCount(() => prisma.externalDropoff.count({ where: { createdAt: yest } })),
    safeCount(() => prisma.externalDropoff.count({ where: { createdAt: prev } })),
    prisma.user.count({ where: { createdAt: yest, role: "USER" } }),
    prisma.user.count({ where: { createdAt: prev, role: "USER" } }),
    prisma.payment.aggregate({
      where: { syncedAt: yest, status: "COMPLETED" },
      _sum: { amount: true }, _count: { _all: true },
    }).catch(() => ({ _sum: { amount: 0 }, _count: { _all: 0 } })),
    prisma.cancellationRequest.count({ where: { requestedAt: yest } }).catch(() => 0),
    safeCount(() => prisma.webhookDelivery.count({ where: { sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, status: "ok" } })),
    safeCount(() => prisma.webhookDelivery.count({ where: { sentAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }, status: "failed" } })),
    safeCount(() => prisma.pickupAppointment.count({ where: { scheduledAt: today, status: { in: ["Scheduled", "Checked-In"] } } })),
    safeCount(() => prisma.idExpiryAlert.count({ where: { sentAt: yest, threshold: { in: ["7d", "expired"] } } })),
    prisma.mailItem.count({ where: { status: "Awaiting Pickup" } }),
  ]);

  const cards: KpiCard[] = [
    { key: "intake", label: "Mail intake", value: intakeYest, unit: "items", delta: delta(intakeYest, intakePrev) },
    { key: "pickups", label: "Pickups completed", value: pickupsYest, unit: "items", delta: delta(pickupsYest, pickupsPrev) },
    { key: "dropoffs", label: "External dropoffs", value: dropoffsYest, unit: "labels", delta: delta(dropoffsYest, dropoffsPrev) },
    { key: "signups", label: "New customer signups", value: signupsYest, unit: "users", delta: delta(signupsYest, signupsPrev) },
    {
      key: "revenue",
      label: "Revenue (Square)",
      value: `$${((paymentsYest._sum.amount ?? 0) / 100).toFixed(2)}`,
      detail: `${paymentsYest._count._all} payment${paymentsYest._count._all === 1 ? "" : "s"}`,
    },
    {
      key: "churn",
      label: "Cancellation requests",
      value: cancelsYest,
      detail: cancelsYest === 0 ? "✓ none" : "needs review",
    },
    {
      key: "today_queue",
      label: "Pickups scheduled today",
      value: pickupQueueToday,
      detail: "open or checked-in",
    },
    {
      key: "ids_urgent",
      label: "ID expiry alerts (yesterday, urgent)",
      value: idsExpiring7d,
      detail: idsExpiring7d === 0 ? "✓ none flagged" : "≤7 days or expired",
    },
    {
      key: "shelf",
      label: "Awaiting pickup right now",
      value: awaitingPickupNow,
      unit: "items",
    },
    {
      key: "webhooks",
      label: "Webhook delivery health (7d)",
      value: webhookOk7d + webhookFail7d === 0 ? "—" : `${webhookOk7d}/${webhookOk7d + webhookFail7d}`,
      detail: webhookFail7d > 0 ? `${webhookFail7d} failed` : "all clear",
    },
  ];

  return {
    windowStartIso: w.startOfYesterday.toISOString(),
    windowEndIso: w.startOfToday.toISOString(),
    windowLabel: new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric" }).format(w.startOfYesterday),
    cards,
  };
}

async function safeCount(fn: () => Promise<number>): Promise<number> {
  try { return await fn(); } catch { return 0; }
}

// ─── Send to all admins ──────────────────────────────────────────────────
export async function sendDailyKpiDigest(): Promise<{
  recipients: number;
  sent: number;
  failed: number;
  windowLabel: string;
}> {
  const snap = await getYesterdayKpis();
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, name: true, email: true },
  });
  const html = renderDigestHtml(snap);
  const subject = `NOHO daily · ${snap.windowLabel} — ${kpiHeadline(snap)}`;

  let sent = 0, failed = 0;
  for (const a of admins) {
    if (!a.email) continue;
    try {
      const r = await sendEmail({
        to: a.email,
        subject,
        html,
        kind: "kpi_digest",
        userId: a.id,
      });
      if (r.status === "sent" || r.status === "not_sent") sent += 1;
      else failed += 1;
    } catch {
      failed += 1;
    }
  }

  await prisma.auditLog.create({
    data: {
      actorId: admins[0]?.id ?? "system",
      actorRole: "SYSTEM",
      action: "kpi.digest_sent",
      entityType: "KpiDigest",
      entityId: snap.windowStartIso,
      metadata: JSON.stringify({
        windowLabel: snap.windowLabel,
        recipients: admins.length,
        sent, failed,
        cards: snap.cards.map((c) => ({ key: c.key, value: c.value })),
      }),
    },
  });

  return { recipients: admins.length, sent, failed, windowLabel: snap.windowLabel };
}

// ─── Admin: trigger now (preview + send) ────────────────────────────────
export async function adminPreviewKpiDigest(): Promise<{ snap: KpiSnapshot; html: string }> {
  await verifyAdmin();
  const snap = await getYesterdayKpis();
  return { snap, html: renderDigestHtml(snap) };
}

export async function adminSendKpiDigestNow(): Promise<{ recipients: number; sent: number; failed: number; windowLabel: string }> {
  await verifyAdmin();
  const r = await sendDailyKpiDigest();
  revalidatePath("/admin");
  return r;
}

// ─── Render ──────────────────────────────────────────────────────────────
function kpiHeadline(snap: KpiSnapshot): string {
  const intake = snap.cards.find((c) => c.key === "intake")?.value ?? 0;
  const pickups = snap.cards.find((c) => c.key === "pickups")?.value ?? 0;
  const revenue = snap.cards.find((c) => c.key === "revenue")?.value ?? "$0.00";
  return `${intake} in · ${pickups} out · ${revenue}`;
}

function renderDigestHtml(snap: KpiSnapshot): string {
  const cardsHtml = snap.cards.map((c) => {
    const arrow = c.delta?.direction === "up" ? "▲" : c.delta?.direction === "down" ? "▼" : "•";
    const arrowColor = c.delta?.direction === "up" ? "#15803d" : c.delta?.direction === "down" ? "#991b1b" : "#94a3b8";
    return `
      <td width="50%" valign="top" style="padding:0;">
        <div style="background:#f7faff;border:1px solid #e8f0fa;border-radius:12px;padding:14px 16px;margin:6px;">
          <p style="margin:0;font-size:10px;font-weight:900;color:#94a3b8;letter-spacing:0.06em;text-transform:uppercase;">${c.label}</p>
          <p style="margin:4px 0 0;font-size:24px;font-weight:900;color:#0e2240;letter-spacing:-0.5px;">${c.value}${c.unit ? `<span style='font-size:13px;color:#64748b;font-weight:700;margin-left:4px;'>${c.unit}</span>` : ""}</p>
          ${c.delta ? `<p style="margin:6px 0 0;font-size:11px;font-weight:700;color:${arrowColor};">${arrow} ${c.delta.label}</p>` : ""}
          ${c.detail && !c.delta ? `<p style="margin:6px 0 0;font-size:11px;color:#64748b;">${c.detail}</p>` : ""}
        </div>
      </td>`;
  });

  // Pair up cards into rows of two.
  const rows: string[] = [];
  for (let i = 0; i < cardsHtml.length; i += 2) {
    rows.push(`<tr>${cardsHtml[i] ?? ""}${cardsHtml[i + 1] ?? "<td width=\"50%\"></td>"}</tr>`);
  }

  const headline = kpiHeadline(snap);
  return `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f8fd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8fd;padding:32px 16px;">
    <tr><td align="center">
      <table width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(14,34,64,0.10);">
        <tr><td style="background:linear-gradient(135deg,#337485 0%,#23596A 100%);padding:32px 40px;">
          <p style="margin:0;font-size:11px;font-weight:900;color:rgba(255,255,255,0.7);letter-spacing:0.18em;text-transform:uppercase;">NOHO Mailbox · Daily digest</p>
          <h1 style="margin:6px 0 0;font-size:24px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">${snap.windowLabel}</h1>
          <p style="margin:8px 0 0;font-size:14px;font-weight:700;color:rgba(255,255,255,0.92);">${headline}</p>
        </td></tr>
        <tr><td style="padding:24px 28px 16px;">
          <table width="100%" cellpadding="0" cellspacing="0">
            ${rows.join("\n")}
          </table>
        </td></tr>
        <tr><td style="padding:8px 40px 28px;">
          <p style="margin:0 0 12px;font-size:12px;color:#64748b;line-height:1.5;">
            Numbers compare to the day before. Want more or fewer cards?
            <a href="${BASE_URL}/admin?tab=webhooks" style="color:#337485;font-weight:700;">Configure outbound webhooks</a>
            to mirror these signals into Slack/Discord in real time.
          </p>
          <a href="${BASE_URL}/admin?tab=insights" style="display:inline-block;background:#337485;color:#ffffff;font-weight:800;font-size:13px;text-decoration:none;padding:12px 24px;border-radius:100px;">Open Insights →</a>
        </td></tr>
        <tr><td style="background:#f7faff;padding:18px 40px;border-top:1px solid #e8f0fa;">
          <p style="margin:0;font-size:11px;color:#8a9bb0;line-height:1.5;">
            NOHO Mailbox · 5062 Lankershim Blvd · North Hollywood, CA 91601<br/>
            Sent automatically by the daily KPI cron. Manage in admin → Insights.
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;
}
