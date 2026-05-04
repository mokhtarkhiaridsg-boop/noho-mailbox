"use server";

// iter-102 — ID-document expiry alerts.
//
// Daily cron sweeps every user's primary + secondary ID expiration date
// and fires a graduated reminder email at 90d / 30d / 7d / day-of.
// Member dashboard shows a banner; admin gets a "ID expiring soon" panel.
// Reuses iter-89 vacation-resume cron pattern, iter-91 single-template
// email shape, iter-95 audit-log structure.

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { sendEmail } from "@/lib/email";
import { revalidatePath } from "next/cache";
import { fireWebhooks } from "@/lib/webhooks";

const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

export type ExpiryStage = "90d" | "30d" | "7d" | "expired";
type DocSlot = "primary" | "secondary";

const THRESHOLD_DAYS: Record<ExpiryStage, number> = {
  "90d": 90, "30d": 30, "7d": 7, "expired": 0,
};

// Compare a YYYY-MM-DD string to today (UTC) and return days remaining.
// Negative = past, 0 = today, positive = future.
function daysUntil(isoDate: string): number {
  const [y, m, d] = isoDate.split("-").map((n) => parseInt(n, 10));
  if (!y || !m || !d) return Number.POSITIVE_INFINITY;
  const target = Date.UTC(y, m - 1, d);
  const now = new Date();
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((target - today) / (24 * 60 * 60 * 1000));
}

function classify(daysLeft: number): ExpiryStage | null {
  if (daysLeft <= 0) return "expired";
  if (daysLeft <= 7) return "7d";
  if (daysLeft <= 30) return "30d";
  if (daysLeft <= 90) return "90d";
  return null;
}

// ─── Member-side: my expiring IDs (for dashboard banner) ─────────────────
export async function getMyIdExpiryStatus(): Promise<Array<{
  document: DocSlot;
  type: string | null;
  expDate: string;
  daysLeft: number;
  stage: ExpiryStage;
}>> {
  const session = await verifySession();
  if (!session.id) return [];
  const u = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      idPrimaryType: true, idPrimaryExpDate: true,
      idSecondaryType: true, idSecondaryExpDate: true,
    },
  });
  if (!u) return [];

  const out: Array<{ document: DocSlot; type: string | null; expDate: string; daysLeft: number; stage: ExpiryStage }> = [];
  if (u.idPrimaryExpDate) {
    const dl = daysUntil(u.idPrimaryExpDate);
    const st = classify(dl);
    if (st) out.push({ document: "primary", type: u.idPrimaryType, expDate: u.idPrimaryExpDate, daysLeft: dl, stage: st });
  }
  if (u.idSecondaryExpDate) {
    const dl = daysUntil(u.idSecondaryExpDate);
    const st = classify(dl);
    if (st) out.push({ document: "secondary", type: u.idSecondaryType, expDate: u.idSecondaryExpDate, daysLeft: dl, stage: st });
  }
  return out;
}

// ─── Admin-side: list of customers with IDs expiring within 90 days ──────
export type AdminExpiryRow = {
  userId: string;
  name: string;
  email: string;
  suiteNumber: string | null;
  document: DocSlot;
  type: string | null;
  expDate: string;
  daysLeft: number;
  stage: ExpiryStage;
  lastAlertStage: ExpiryStage | null;
  lastAlertSentAt: string | null;
};

export async function listAdminExpiringIds(): Promise<AdminExpiryRow[]> {
  await verifyAdmin();
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { idPrimaryExpDate: { not: null } },
        { idSecondaryExpDate: { not: null } },
      ],
    },
    select: {
      id: true, name: true, email: true, suiteNumber: true,
      idPrimaryType: true, idPrimaryExpDate: true,
      idSecondaryType: true, idSecondaryExpDate: true,
    },
  });

  const recentAlerts = await prisma.idExpiryAlert.findMany({
    where: { userId: { in: users.map((u) => u.id) } },
    orderBy: { sentAt: "desc" },
  });
  const lastByKey = new Map<string, { stage: ExpiryStage; sentAt: Date }>();
  for (const a of recentAlerts) {
    const k = `${a.userId}:${a.document}`;
    if (!lastByKey.has(k)) lastByKey.set(k, { stage: a.threshold as ExpiryStage, sentAt: a.sentAt });
  }

  const rows: AdminExpiryRow[] = [];
  for (const u of users) {
    for (const slot of ["primary", "secondary"] as const) {
      const exp = slot === "primary" ? u.idPrimaryExpDate : u.idSecondaryExpDate;
      const type = slot === "primary" ? u.idPrimaryType : u.idSecondaryType;
      if (!exp) continue;
      const dl = daysUntil(exp);
      const st = classify(dl);
      if (!st) continue; // only those within 90 days or already past
      const last = lastByKey.get(`${u.id}:${slot}`) ?? null;
      rows.push({
        userId: u.id,
        name: u.name,
        email: u.email,
        suiteNumber: u.suiteNumber,
        document: slot,
        type,
        expDate: exp,
        daysLeft: dl,
        stage: st,
        lastAlertStage: last?.stage ?? null,
        lastAlertSentAt: last?.sentAt.toISOString() ?? null,
      });
    }
  }
  // Sort: most urgent first.
  rows.sort((a, b) => a.daysLeft - b.daysLeft);
  return rows;
}

// ─── Sweep: idempotent batch fire of new alerts ──────────────────────────
//
// Returns counts for visibility from the cron route. Idempotent because of
// the @@unique([userId, document, threshold, expDate]) — we INSERT-on-create
// and skip silently if it's already there. That means re-running the cron
// the same day is safe.
export async function runIdExpirySweep(): Promise<{
  scanned: number;
  emailed: number;
  alertsCreated: number;
  errors: Array<{ userId: string; document: DocSlot; reason: string }>;
}> {
  const users = await prisma.user.findMany({
    where: {
      OR: [
        { idPrimaryExpDate: { not: null } },
        { idSecondaryExpDate: { not: null } },
      ],
    },
    select: {
      id: true, name: true, email: true, suiteNumber: true,
      idPrimaryType: true, idPrimaryExpDate: true,
      idSecondaryType: true, idSecondaryExpDate: true,
    },
  });
  const errors: Array<{ userId: string; document: DocSlot; reason: string }> = [];
  let emailed = 0;
  let alertsCreated = 0;

  for (const u of users) {
    for (const slot of ["primary", "secondary"] as const) {
      const exp = slot === "primary" ? u.idPrimaryExpDate : u.idSecondaryExpDate;
      const type = slot === "primary" ? u.idPrimaryType : u.idSecondaryType;
      if (!exp) continue;
      const dl = daysUntil(exp);
      const stage = classify(dl);
      if (!stage) continue;

      // Already alerted at this stage for this expDate? Skip.
      const existing = await prisma.idExpiryAlert.findUnique({
        where: {
          userId_document_threshold_expDate: {
            userId: u.id, document: slot, threshold: stage, expDate: exp,
          },
        },
      });
      if (existing) continue;

      try {
        await prisma.idExpiryAlert.create({
          data: { userId: u.id, document: slot, threshold: stage, expDate: exp },
        });
        alertsCreated += 1;

        await sendIdExpiringEmail({
          to: u.email,
          firstName: (u.name ?? "there").split(" ")[0],
          suiteNumber: u.suiteNumber ?? "—",
          documentLabel: `${type ?? "ID"} (${slot})`,
          expDate: exp,
          daysLeft: dl,
          stage,
          userId: u.id,
        });
        emailed += 1;

        await prisma.notification.create({
          data: {
            userId: u.id,
            type: "id_expiring",
            title: stage === "expired" ? "Your ID has expired" : `Your ID expires in ${dl} day${dl === 1 ? "" : "s"}`,
            body: `${type ?? "ID"} on file expires ${exp}. Upload a renewed version from the Compliance tab.`,
            link: `${BASE_URL}/dashboard?tab=settings`,
          },
        });

        // iter-103: outbound webhook bridge — admin Slack/Discord channel.
        void fireWebhooks("id.expiring", {
          text: `*${u.name ?? u.email}* (suite #${u.suiteNumber ?? "—"}) — ${type ?? "ID"} ${stage === "expired" ? `expired ${Math.abs(dl)}d ago` : `expires in ${dl}d`}`,
          emoji: stage === "expired" ? "⛔️" : stage === "7d" ? "⚠️" : "📅",
          detail: { userId: u.id, document: slot, expDate: exp, stage, daysLeft: dl },
        });
      } catch (e) {
        const reason = e instanceof Error ? e.message : String(e);
        errors.push({ userId: u.id, document: slot, reason });
      }
    }
  }

  return { scanned: users.length, emailed, alertsCreated, errors };
}

// ─── Email template ──────────────────────────────────────────────────────
async function sendIdExpiringEmail(args: {
  to: string;
  firstName: string;
  suiteNumber: string;
  documentLabel: string;
  expDate: string;
  daysLeft: number;
  stage: ExpiryStage;
  userId: string;
}) {
  const expired = args.stage === "expired";
  const urgent = args.stage === "7d" || expired;

  const headlineColor = expired ? "#991b1b" : urgent ? "#92400e" : "#0e2240";
  const bannerBg = expired ? "rgba(231,0,19,0.08)" : urgent ? "rgba(245,166,35,0.12)" : "rgba(51,116,133,0.08)";
  const bannerBorder = expired ? "#E70013" : urgent ? "#F5A623" : "#337485";
  const headline = expired
    ? "Your ID on file has expired"
    : args.stage === "7d"
      ? `Your ID expires in ${args.daysLeft} day${args.daysLeft === 1 ? "" : "s"}`
      : args.stage === "30d"
        ? "Your ID expires soon"
        : "ID renewal heads-up";
  const subject = expired
    ? `Action required · ID on file has expired — NOHO Mailbox`
    : `Heads up · ${args.documentLabel} expires ${args.expDate} — NOHO Mailbox`;

  const html = `<!DOCTYPE html><html><body style="margin:0;padding:0;background:#f4f8fd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8fd;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(14,34,64,0.10);">
        <tr><td style="background:linear-gradient(135deg,#337485 0%,#23596A 100%);padding:32px 40px;">
          <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">NOHO Mailbox</span>
          <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);font-weight:600;">5062 Lankershim Blvd · North Hollywood, CA 91601</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:${headlineColor};letter-spacing:-0.5px;">${headline}</h1>
          <p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">Hi ${args.firstName}, the ID on file for your NOHO Mailbox is${expired ? " <strong>past its expiration date</strong>" : ` expiring on <strong>${args.expDate}</strong>`}.</p>
          <div style="background:${bannerBg};border-left:3px solid ${bannerBorder};border-radius:4px;padding:16px 20px;margin:16px 0;">
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Document:</strong> ${args.documentLabel}</p>
            <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Suite:</strong> #${args.suiteNumber}</p>
            <p style="margin:0;font-size:13px;color:#334155;"><strong>${expired ? "Expired" : "Expires"}:</strong> ${args.expDate}</p>
          </div>
          <p style="margin:0 0 8px;font-size:13px;color:#334155;font-weight:700;">Why this matters</p>
          <p style="margin:0 0 16px;font-size:13px;color:#334155;line-height:1.55;">USPS Form 1583 requires a current, valid ID for every CMRA customer. Without an unexpired ID on file, we may need to pause incoming mail acceptance until you renew.</p>
          <a href="${BASE_URL}/dashboard?tab=settings" style="display:inline-block;margin-top:8px;background:#337485;color:#ffffff;font-weight:800;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:100px;">Upload renewed ID</a>
          <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">Questions? Reply to this email or call (818) 506-7744.</p>
        </td></tr>
      </table>
    </td></tr>
  </table></body></html>`;

  return sendEmail({
    to: args.to, subject, html, kind: "id_expiring", userId: args.userId,
  });
}

// ─── Admin actions ───────────────────────────────────────────────────────
export async function adminMarkIdRenewed(input: {
  userId: string;
  document: DocSlot;
  newExpDate: string; // YYYY-MM-DD
  newType?: string | null;
  newNumber?: string | null;
  newIssuer?: string | null;
}): Promise<{ error?: string; success?: boolean }> {
  const actor = await verifyAdmin();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.newExpDate)) {
    return { error: "newExpDate must be YYYY-MM-DD" };
  }
  const newDate = daysUntil(input.newExpDate);
  if (newDate < 0) return { error: "newExpDate is in the past — pick a future date" };

  const data: Record<string, unknown> = input.document === "primary"
    ? {
        idPrimaryExpDate: input.newExpDate,
        ...(input.newType ? { idPrimaryType: input.newType } : {}),
        ...(input.newNumber ? { idPrimaryNumber: input.newNumber } : {}),
        ...(input.newIssuer ? { idPrimaryIssuer: input.newIssuer } : {}),
      }
    : {
        idSecondaryExpDate: input.newExpDate,
        ...(input.newType ? { idSecondaryType: input.newType } : {}),
        ...(input.newNumber ? { idSecondaryNumber: input.newNumber } : {}),
        ...(input.newIssuer ? { idSecondaryIssuer: input.newIssuer } : {}),
      };

  await prisma.$transaction([
    prisma.user.update({ where: { id: input.userId }, data }),
    // Clear all existing alert-history rows so future stage thresholds
    // re-fire if the new date itself somehow triggers one.
    prisma.idExpiryAlert.deleteMany({
      where: { userId: input.userId, document: input.document },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "id_expiry.renewed",
        entityType: "User",
        entityId: input.userId,
        metadata: JSON.stringify({
          document: input.document,
          newExpDate: input.newExpDate,
          newType: input.newType ?? null,
        }),
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

// Manually re-fire an alert email for a single customer (admin button).
export async function adminResendIdExpiringEmail(input: {
  userId: string;
  document: DocSlot;
}): Promise<{ error?: string; success?: boolean }> {
  const actor = await verifyAdmin();
  const u = await prisma.user.findUnique({
    where: { id: input.userId },
    select: {
      name: true, email: true, suiteNumber: true,
      idPrimaryType: true, idPrimaryExpDate: true,
      idSecondaryType: true, idSecondaryExpDate: true,
    },
  });
  if (!u) return { error: "User not found" };
  const exp = input.document === "primary" ? u.idPrimaryExpDate : u.idSecondaryExpDate;
  const type = input.document === "primary" ? u.idPrimaryType : u.idSecondaryType;
  if (!exp) return { error: "No expiry on file for that document" };
  const dl = daysUntil(exp);
  const stage = classify(dl) ?? "90d";

  await sendIdExpiringEmail({
    to: u.email,
    firstName: (u.name ?? "there").split(" ")[0],
    suiteNumber: u.suiteNumber ?? "—",
    documentLabel: `${type ?? "ID"} (${input.document})`,
    expDate: exp,
    daysLeft: dl,
    stage,
    userId: input.userId,
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "id_expiry.email_resent",
      entityType: "User",
      entityId: input.userId,
      metadata: JSON.stringify({ document: input.document, stage, expDate: exp }),
    },
  });
  return { success: true };
}
