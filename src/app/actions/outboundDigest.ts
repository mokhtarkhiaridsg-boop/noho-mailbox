"use server";

/**
 * iter-236 — Weekly outbound shipment digest server actions
 * (Tier 17 #145, closes Tier 17).
 *
 * Members who opt-in get a Sunday-morning recap email with every
 * package they shipped via NOHO ShippoLabel + iter-212 ShipmentReceipt
 * in the past 7 days — with carrier, tracking #, tracking URL, and
 * receipt link per row. Builds a "personal records" trail without the
 * member having to keep their own log.
 *
 * Reuses iter-228 atomic update + audit pattern, iter-225-style fire-
 * and-forget post-tx email, iter-227 cron-sweep + idempotent-via-
 * timestamp pattern.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

export type OutboundDigestRowView = {
  id: string;
  carrier: string;
  trackingNumber: string;
  trackingUrl: string;
  toName: string;
  toCity: string;
  toState: string;
  amountPaidCents: number;
  weightOz: number | null;
  shippedAtIso: string;
  receiptToken: string | null;     // links to /receipt/{token}
  source: "shippo" | "external";   // shippo via API vs admin-uploaded LabelUpload
};

export type OutboundDigestPreview = {
  optIn: boolean;
  lastSentAtIso: string | null;
  windowStartIso: string;
  windowEndIso: string;
  count: number;
  totalCents: number;
  rows: OutboundDigestRowView[];
};

function shippoToView(r: { id: string; carrier: string; trackingNumber: string; trackingUrl: string; toName: string; toCity: string; toState: string; amountPaid: number; weightOz: number | null; createdAt: Date; receiptToken: string | null }): OutboundDigestRowView {
  return {
    id: r.id, carrier: r.carrier, trackingNumber: r.trackingNumber,
    trackingUrl: r.trackingUrl, toName: r.toName,
    toCity: r.toCity, toState: r.toState,
    amountPaidCents: Math.round(r.amountPaid * 100),
    weightOz: r.weightOz,
    shippedAtIso: r.createdAt.toISOString(),
    receiptToken: r.receiptToken,
    source: "shippo",
  };
}

async function loadDigestRows(userId: string, sinceDate: Date): Promise<OutboundDigestRowView[]> {
  const labels = await prisma.shippoLabel.findMany({
    where: { userId, createdAt: { gte: sinceDate }, status: "purchased" },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: { id: true, carrier: true, trackingNumber: true, trackingUrl: true, toName: true, toCity: true, toState: true, amountPaid: true, weightOz: true, createdAt: true },
  });
  if (labels.length === 0) return [];
  // Pull iter-212 receipt tokens in one batch.
  const receipts = await prisma.shipmentReceipt.findMany({
    where: { shippoLabelId: { in: labels.map((l) => l.id) } },
    select: { shippoLabelId: true, verifyToken: true },
  });
  const tokenById = new Map(receipts.map((r) => [r.shippoLabelId!, r.verifyToken]));
  return labels.map((l) => shippoToView({ ...l, receiptToken: tokenById.get(l.id) ?? null }));
}

// ─── Member opt-in ────────────────────────────────────────────────────

export async function getMyOutboundDigestPreview(): Promise<OutboundDigestPreview> {
  const me = await verifySession();
  const u = await prisma.user.findUnique({ where: { id: me.id }, select: { outboundDigestOptIn: true, outboundDigestLastSentAt: true } });
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 3600_000);
  const rows = await loadDigestRows(me.id, since);
  return {
    optIn: u?.outboundDigestOptIn ?? false,
    lastSentAtIso: u?.outboundDigestLastSentAt?.toISOString() ?? null,
    windowStartIso: since.toISOString(),
    windowEndIso: now.toISOString(),
    count: rows.length,
    totalCents: rows.reduce((acc, r) => acc + r.amountPaidCents, 0),
    rows,
  };
}

export async function setMyOutboundDigestOptIn(input: { optIn: boolean }): Promise<{ success?: boolean; error?: string }> {
  const me = await verifySession();
  await prisma.$transaction([
    prisma.user.update({ where: { id: me.id }, data: { outboundDigestOptIn: !!input.optIn } }),
    prisma.auditLog.create({
      data: {
        actorId: me.id, actorRole: "MEMBER",
        action: input.optIn ? "outbound_digest.opted_in" : "outbound_digest.opted_out",
        entityType: "User", entityId: me.id,
        metadata: JSON.stringify({ optIn: !!input.optIn }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  return { success: true };
}

// Member can manually trigger an immediate one-shot digest (useful
// when previewing). Doesn't update lastSentAt so the cron still fires
// the regular weekly cadence.
export async function sendMyOutboundDigestNow(): Promise<{ count?: number; error?: string }> {
  const me = await verifySession();
  const u = await prisma.user.findUnique({ where: { id: me.id }, select: { id: true, name: true, email: true, suiteNumber: true } });
  if (!u?.email) return { error: "No email on file." };
  const since = new Date(Date.now() - 7 * 24 * 3600_000);
  const rows = await loadDigestRows(u.id, since);
  if (rows.length === 0) return { error: "Nothing shipped in the last 7 days." };
  await sendEmail({
    to: u.email, userId: u.id,
    subject: `Your weekly NOHO shipment recap — ${rows.length} package${rows.length === 1 ? "" : "s"}`,
    kind: "outbound_digest_manual",
    html: buildDigestEmail({
      memberName: u.name ?? "(member)", suiteNumber: u.suiteNumber ?? null,
      rows, windowStart: since, windowEnd: new Date(),
    }),
  });
  await prisma.auditLog.create({
    data: {
      actorId: u.id, actorRole: "MEMBER",
      action: "outbound_digest.manual_sent",
      entityType: "User", entityId: u.id,
      metadata: JSON.stringify({ count: rows.length, windowStart: since.toISOString() }),
    },
  }).catch(() => null);
  return { count: rows.length };
}

// ─── Cron sweep ───────────────────────────────────────────────────────

export async function runOutboundDigestWeeklySweep(): Promise<{
  scanned: number;
  emailsSent: number;
  skippedEmpty: number;
  skippedRecent: number;
}> {
  const now = new Date();
  const since = new Date(now.getTime() - 7 * 24 * 3600_000);
  // Don't re-fire if a digest already went out within the last 6 days.
  const recentCutoff = new Date(now.getTime() - 6 * 24 * 3600_000);

  const optedIn = await prisma.user.findMany({
    // email is non-nullable per schema; the legacy `not: null` filter was
    // a Prisma type error after the iter-183 schema tightened.
    where: { outboundDigestOptIn: true },
    select: { id: true, name: true, email: true, suiteNumber: true, outboundDigestLastSentAt: true },
    take: 2000,
  });

  let emailsSent = 0;
  let skippedEmpty = 0;
  let skippedRecent = 0;

  for (const u of optedIn) {
    if (u.outboundDigestLastSentAt && u.outboundDigestLastSentAt > recentCutoff) {
      skippedRecent += 1;
      continue;
    }
    const rows = await loadDigestRows(u.id, since);
    if (rows.length === 0) {
      skippedEmpty += 1;
      continue;
    }
    try {
      await sendEmail({
        to: u.email!, userId: u.id,
        subject: `Your weekly NOHO shipment recap — ${rows.length} package${rows.length === 1 ? "" : "s"}`,
        kind: "outbound_digest_weekly",
        html: buildDigestEmail({
          memberName: u.name ?? "(member)", suiteNumber: u.suiteNumber ?? null,
          rows, windowStart: since, windowEnd: now,
        }),
      });
      await prisma.user.update({ where: { id: u.id }, data: { outboundDigestLastSentAt: now } });
      await prisma.auditLog.create({
        data: {
          actorId: "system", actorRole: "ADMIN",
          action: "outbound_digest.weekly_sent",
          entityType: "User", entityId: u.id,
          metadata: JSON.stringify({ count: rows.length, totalCents: rows.reduce((a, r) => a + r.amountPaidCents, 0) }),
        },
      }).catch(() => null);
      emailsSent += 1;
    } catch {
      // Silent skip — email errors don't block other members.
    }
  }
  revalidatePath("/admin");
  return { scanned: optedIn.length, emailsSent, skippedEmpty, skippedRecent };
}

// ─── Email body builder ──────────────────────────────────────────────

function buildDigestEmail(args: { memberName: string; suiteNumber: string | null; rows: OutboundDigestRowView[]; windowStart: Date; windowEnd: Date }): string {
  const total = args.rows.reduce((acc, r) => acc + r.amountPaidCents, 0);
  const totalOz = args.rows.reduce((acc, r) => acc + (r.weightOz ?? 0), 0);
  const base = process.env.AUTH_URL ?? "https://nohomailbox.org";
  const fmtDate = (d: Date) => d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 640px; margin: 0 auto; color: #1A1D23;">
    <div style="background: linear-gradient(135deg, #337485 0%, #23596A 100%); padding: 32px 24px; border-radius: 12px; color: white; text-align: center;">
      <p style="font-size: 11px; font-weight: 800; letter-spacing: 0.24em; text-transform: uppercase; margin: 0; opacity: 0.85;">NOHO Mailbox · Weekly recap</p>
      <h1 style="font-size: 26px; font-weight: 800; margin: 8px 0 0;">📦 ${args.rows.length} package${args.rows.length === 1 ? "" : "s"} shipped this week</h1>
      <p style="font-size: 14px; margin: 8px 0 0; opacity: 0.85;">${fmtDate(args.windowStart)} — ${fmtDate(args.windowEnd)}</p>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 14px; line-height: 1.6;">Hi ${args.memberName}${args.suiteNumber ? ` (suite #${args.suiteNumber})` : ""},</p>
      <p style="font-size: 14px; line-height: 1.6;">Here's your shipping log for the week — keep this for your records.</p>

      <div style="margin: 18px 0; display: flex; gap: 12px; flex-wrap: wrap;">
        <div style="flex: 1; min-width: 140px; padding: 12px; background: #F4F5F7; border-radius: 8px; text-align: center;">
          <p style="font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #7A8290; margin: 0;">PACKAGES</p>
          <p style="font-size: 28px; font-weight: 900; color: #337485; margin: 4px 0 0; font-family: ui-monospace, 'SF Mono', Menlo, monospace;">${args.rows.length}</p>
        </div>
        <div style="flex: 1; min-width: 140px; padding: 12px; background: #F4F5F7; border-radius: 8px; text-align: center;">
          <p style="font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #7A8290; margin: 0;">POSTAGE</p>
          <p style="font-size: 28px; font-weight: 900; color: #15803d; margin: 4px 0 0; font-family: ui-monospace, 'SF Mono', Menlo, monospace;">$${(total / 100).toFixed(2)}</p>
        </div>
        ${totalOz > 0 ? `<div style="flex: 1; min-width: 140px; padding: 12px; background: #F4F5F7; border-radius: 8px; text-align: center;">
          <p style="font-size: 10px; font-weight: 800; letter-spacing: 0.16em; text-transform: uppercase; color: #7A8290; margin: 0;">TOTAL WEIGHT</p>
          <p style="font-size: 28px; font-weight: 900; color: #1A1D23; margin: 4px 0 0; font-family: ui-monospace, 'SF Mono', Menlo, monospace;">${(totalOz / 16).toFixed(1)} lb</p>
        </div>` : ""}
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 12px;">
        <thead>
          <tr style="background: #F4F5F7;">
            <th style="text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #7A8290;">Date</th>
            <th style="text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #7A8290;">Carrier</th>
            <th style="text-align: left; padding: 8px 10px; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #7A8290;">Recipient</th>
            <th style="text-align: right; padding: 8px 10px; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #7A8290;">Cost</th>
            <th style="text-align: right; padding: 8px 10px; font-size: 10px; font-weight: 800; letter-spacing: 0.12em; text-transform: uppercase; color: #7A8290;">Links</th>
          </tr>
        </thead>
        <tbody>
          ${args.rows.map((r) => `
            <tr style="border-bottom: 1px solid #ECEEF1;">
              <td style="padding: 10px; font-size: 11px; color: #3B4252; white-space: nowrap;">${fmtDate(new Date(r.shippedAtIso))}</td>
              <td style="padding: 10px; font-size: 11px; color: #3B4252; white-space: nowrap;"><span style="background: #E0F2FE; color: #0c4a6e; padding: 2px 6px; border-radius: 4px; font-weight: 700; font-size: 10px;">${r.carrier}</span></td>
              <td style="padding: 10px; font-size: 11px; color: #1A1D23;">
                <div style="font-weight: 600;">${r.toName}</div>
                <div style="font-size: 10px; color: #7A8290;">${r.toCity}, ${r.toState}</div>
              </td>
              <td style="padding: 10px; font-size: 11px; color: #1A1D23; text-align: right; font-family: ui-monospace, 'SF Mono', Menlo, monospace; font-weight: 700;">$${(r.amountPaidCents / 100).toFixed(2)}</td>
              <td style="padding: 10px; font-size: 10px; text-align: right;">
                <a href="${r.trackingUrl}" style="color: #337485; text-decoration: none; font-weight: 700;">Track</a>
                ${r.receiptToken ? ` · <a href="${base}/receipt/${r.receiptToken}" style="color: #7c3aed; text-decoration: none; font-weight: 700;">Receipt</a>` : ""}
              </td>
            </tr>
          `).join("")}
        </tbody>
      </table>

      <p style="font-size: 12px; color: #7A8290; margin-top: 24px; padding: 12px; background: #FEF3C7; border-radius: 6px; line-height: 1.5;">
        💡 <strong>Tip:</strong> Bookmark this email — it's your shipping records for the week. Each "Receipt" link gives you a 1-page proof-of-mailing certificate (great for tax-deductible business shipments).
      </p>
      <p style="font-size: 12px; color: #7A8290; line-height: 1.5; margin-top: 16px;">
        Don't want these? <a href="${base}/dashboard?tab=settings" style="color: #337485; font-weight: 700;">Turn off the weekly digest</a> from your dashboard settings.
      </p>
    </div>
    <p style="font-size: 10px; color: #A89484; text-align: center; margin: 20px 0 0;">NOHO Mailbox · 5062 Lankershim Blvd · North Hollywood, CA 91601</p>
  </div>`;
}
