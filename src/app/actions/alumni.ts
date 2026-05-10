"use server";

/**
 * iter-214 — Bureau alumni network (Tier 15 #123).
 *
 * Three audiences:
 *   - Admin: convert cancelled members → alumni, list, mark
 *     reactivated, manually add ex-bureau owners, soft-purge after
 *     5y retention.
 *   - Cron (next file): quarterly "we miss you" newsletter sweep.
 *   - Public: one-click unsubscribe via token in every newsletter.
 *
 * Audit: `alumni.{converted,reactivated,added,purged,unsubscribed,
 * newsletter_sent}` per action.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { sendEmail } from "@/lib/email";

const CMRA_RETENTION_YEARS = 5;
const QUARTERLY_GAP_DAYS = 90;

export type AlumniRow = {
  id: string;
  originalUserId: string | null;
  email: string;
  name: string;
  alumniSinceIso: string;
  planEndDate: string | null;
  source: string;
  status: "Active" | "Reactivated" | "Unsubscribed" | "Purged";
  reactivatedAtIso: string | null;
  reactivatedToUserId: string | null;
  lastNewsletterAtIso: string | null;
  newsletterSentCount: number;
  unsubscribedAtIso: string | null;
  notes: string | null;
  yearsArchived: number;
};

function asStatus(s: string): AlumniRow["status"] {
  if (s === "Reactivated" || s === "Unsubscribed" || s === "Purged") return s;
  return "Active";
}

function rowToView(r: { id: string; originalUserId: string | null; email: string; name: string; alumniSince: Date; planEndDate: string | null; source: string; status: string; reactivatedAt: Date | null; reactivatedToUserId: string | null; lastNewsletterAt: Date | null; newsletterSentCount: number; unsubscribedAt: Date | null; notes: string | null }): AlumniRow {
  const years = Math.max(0, (Date.now() - r.alumniSince.getTime()) / (365 * 24 * 3600 * 1000));
  return {
    id: r.id, originalUserId: r.originalUserId, email: r.email, name: r.name,
    alumniSinceIso: r.alumniSince.toISOString(),
    planEndDate: r.planEndDate, source: r.source,
    status: asStatus(r.status),
    reactivatedAtIso: r.reactivatedAt?.toISOString() ?? null,
    reactivatedToUserId: r.reactivatedToUserId,
    lastNewsletterAtIso: r.lastNewsletterAt?.toISOString() ?? null,
    newsletterSentCount: r.newsletterSentCount,
    unsubscribedAtIso: r.unsubscribedAt?.toISOString() ?? null,
    notes: r.notes,
    yearsArchived: Math.round(years * 10) / 10,
  };
}

function genUnsubscribeToken(): string {
  return randomBytes(12).toString("base64url").slice(0, 16);
}

// ─── Admin ─────────────────────────────────────────────────────────────

export async function convertUserToAlumni(input: { userId: string; notes?: string }): Promise<{ row?: AlumniRow; error?: string }> {
  const actor = await verifyAdmin();
  const user = await prisma.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, name: true, planDueDate: true, kycForm1583Url: true },
  });
  if (!user) return { error: "User not found." };
  if (!user.email) return { error: "User has no email — can't add to alumni." };

  const email = user.email.trim().toLowerCase();
  const existing = await prisma.alumniMember.findUnique({ where: { email } });
  if (existing) return { row: rowToView(existing) };

  // Generate token (retry on collision).
  let token = genUnsubscribeToken();
  for (let i = 0; i < 5; i++) {
    const dup = await prisma.alumniMember.findUnique({ where: { unsubscribeToken: token } });
    if (!dup) break;
    token = genUnsubscribeToken();
  }

  const created = await prisma.alumniMember.create({
    data: {
      originalUserId: user.id,
      email,
      name: user.name.slice(0, 80),
      planEndDate: user.planDueDate ?? null,
      kycForm1583Url: user.kycForm1583Url ?? null,
      source: "cancellation",
      unsubscribeToken: token,
      notes: input.notes?.trim().slice(0, 300) || null,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "alumni.converted",
      entityType: "AlumniMember", entityId: created.id,
      metadata: JSON.stringify({ userId: user.id, email, planEndDate: user.planDueDate }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  return { row: rowToView(created) };
}

export async function addAlumniManually(input: { email: string; name: string; planEndDate?: string; notes?: string }): Promise<{ row?: AlumniRow; error?: string }> {
  const actor = await verifyAdmin();
  const email = input.email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Invalid email." };
  const name = input.name.trim().slice(0, 80);
  if (name.length < 1) return { error: "Name required." };

  const existing = await prisma.alumniMember.findUnique({ where: { email } });
  if (existing) return { error: `Already in alumni as "${existing.name}".` };

  let token = genUnsubscribeToken();
  for (let i = 0; i < 5; i++) {
    const dup = await prisma.alumniMember.findUnique({ where: { unsubscribeToken: token } });
    if (!dup) break;
    token = genUnsubscribeToken();
  }

  const created = await prisma.alumniMember.create({
    data: {
      originalUserId: null,
      email, name,
      planEndDate: input.planEndDate ?? null,
      source: "manual",
      unsubscribeToken: token,
      notes: input.notes?.trim().slice(0, 300) || null,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "alumni.added",
      entityType: "AlumniMember", entityId: created.id,
      metadata: JSON.stringify({ email, source: "manual" }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  return { row: rowToView(created) };
}

export async function listAdminAlumni(input: { status?: string; limit?: number } = {}): Promise<AlumniRow[]> {
  await verifyAdmin();
  const limit = Math.min(500, Math.max(1, input.limit ?? 200));
  const where: { status?: string } = {};
  if (input.status && ["Active", "Reactivated", "Unsubscribed", "Purged"].includes(input.status)) where.status = input.status;
  const rows = await prisma.alumniMember.findMany({
    where,
    orderBy: [{ status: "asc" }, { alumniSince: "desc" }],
    take: limit,
  });
  return rows.map(rowToView);
}

export async function markAlumniReactivated(input: { id: string; newUserId: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.alumniMember.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Alumni not found." };
  const u = await prisma.user.findUnique({ where: { id: input.newUserId }, select: { id: true } });
  if (!u) return { error: "New User not found." };
  await prisma.$transaction([
    prisma.alumniMember.update({
      where: { id: row.id },
      data: { status: "Reactivated", reactivatedAt: new Date(), reactivatedToUserId: u.id },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "alumni.reactivated",
        entityType: "AlumniMember", entityId: row.id,
        metadata: JSON.stringify({ newUserId: u.id, daysAlumni: Math.floor((Date.now() - row.alumniSince.getTime()) / (24 * 3600 * 1000)) }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function purgeAlumniRow(input: { id: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.alumniMember.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Alumni not found." };
  const ageYears = (Date.now() - row.alumniSince.getTime()) / (365 * 24 * 3600 * 1000);
  if (ageYears < CMRA_RETENTION_YEARS) {
    return { error: `Cannot purge before ${CMRA_RETENTION_YEARS}y CMRA retention window (currently ${Math.round(ageYears * 10) / 10}y).` };
  }
  await prisma.$transaction([
    prisma.alumniMember.update({
      where: { id: row.id },
      // Soft-purge: keep the row but null out sensitive fields + flip status.
      data: {
        status: "Purged",
        kycForm1583Url: null,
        notes: input.reason?.trim().slice(0, 200) || "purged_after_cmra_retention",
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "alumni.purged",
        entityType: "AlumniMember", entityId: row.id,
        metadata: JSON.stringify({ email: row.email, ageYears: Math.round(ageYears * 10) / 10, reason: input.reason ?? null }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export type AlumniSummary = {
  active: number;
  reactivated: number;
  unsubscribed: number;
  purged: number;
  reactivationRatePct: number;
  newsletterSentTotal: number;
};

export async function getAlumniSummary(): Promise<AlumniSummary> {
  await verifyAdmin();
  const [active, reactivated, unsubscribed, purged, newsletterAgg] = await Promise.all([
    prisma.alumniMember.count({ where: { status: "Active" } }),
    prisma.alumniMember.count({ where: { status: "Reactivated" } }),
    prisma.alumniMember.count({ where: { status: "Unsubscribed" } }),
    prisma.alumniMember.count({ where: { status: "Purged" } }),
    prisma.alumniMember.aggregate({ _sum: { newsletterSentCount: true } }),
  ]);
  const total = active + reactivated + unsubscribed + purged;
  const rate = total > 0 ? Math.round((reactivated / total) * 1000) / 10 : 0;
  return {
    active, reactivated, unsubscribed, purged,
    reactivationRatePct: rate,
    newsletterSentTotal: newsletterAgg._sum.newsletterSentCount ?? 0,
  };
}

// ─── Public ────────────────────────────────────────────────────────────

export async function unsubscribeAlumniByToken(input: { token: string; reason?: string }): Promise<{ ok: boolean; alreadyUnsubscribed?: boolean; name?: string }> {
  const tok = input.token.trim();
  if (!tok) return { ok: false };
  const row = await prisma.alumniMember.findUnique({ where: { unsubscribeToken: tok } });
  if (!row) return { ok: false };
  if (row.status === "Unsubscribed") return { ok: true, alreadyUnsubscribed: true, name: row.name };
  await prisma.$transaction([
    prisma.alumniMember.update({
      where: { id: row.id },
      data: { status: "Unsubscribed", unsubscribedAt: new Date(), unsubscribedReason: input.reason?.trim().slice(0, 200) || null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: "anonymous", actorRole: "PUBLIC",
        action: "alumni.unsubscribed",
        entityType: "AlumniMember", entityId: row.id,
        metadata: JSON.stringify({ reason: input.reason ?? null }),
      },
    }),
  ]);
  return { ok: true, name: row.name };
}

// ─── Cron: quarterly "we miss you" newsletter ──────────────────────────

export type AlumniNewsletterResult = {
  scanned: number;
  sent: number;
  skippedTooSoon: number;
  errors: string[];
  ranAtIso: string;
};

export async function runAlumniNewsletterSweep(): Promise<AlumniNewsletterResult> {
  const result: AlumniNewsletterResult = { scanned: 0, sent: 0, skippedTooSoon: 0, errors: [], ranAtIso: new Date().toISOString() };
  const cutoff = new Date(Date.now() - QUARTERLY_GAP_DAYS * 24 * 3600 * 1000);
  const candidates = await prisma.alumniMember.findMany({
    where: {
      status: "Active",
      OR: [{ lastNewsletterAt: null }, { lastNewsletterAt: { lt: cutoff } }],
    },
    take: 500,
  });
  result.scanned = candidates.length;

  const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";
  for (const a of candidates) {
    const firstName = a.name.split(/\s+/)[0] ?? a.name;
    try {
      const sendRes = await sendEmail({
        kind: "alumni_newsletter",
        to: a.email,
        userId: a.originalUserId ?? "alumni",
        subject: `We miss you, ${firstName} — quarterly NOHO Mailbox check-in`,
        html: alumniNewsletterHtml({
          firstName,
          alumniSinceLabel: new Date(a.alumniSince).toLocaleDateString("en-US", { month: "long", year: "numeric" }),
          unsubscribeUrl: `${BASE_URL.replace(/\/$/, "")}/alumni/unsubscribe/${a.unsubscribeToken}`,
          rejoinUrl: `${BASE_URL.replace(/\/$/, "")}/signup?from=alumni&ref=${encodeURIComponent(a.email.split("@")[0]!.slice(0, 12).toUpperCase())}`,
        }),
      }).catch((e) => ({ status: "failed", error: e instanceof Error ? e.message : String(e) }));

      const status = ("status" in sendRes) ? sendRes.status : "unknown";
      if (status === "failed") {
        result.errors.push(`${a.email}: ${(sendRes as { error?: string }).error ?? "send failed"}`);
        continue;
      }
      await prisma.alumniMember.update({
        where: { id: a.id },
        data: { lastNewsletterAt: new Date(), newsletterSentCount: { increment: 1 } },
      }).catch(() => null);
      await prisma.auditLog.create({
        data: {
          actorId: "system", actorRole: "SYSTEM",
          action: "alumni.newsletter_sent",
          entityType: "AlumniMember", entityId: a.id,
          metadata: JSON.stringify({ status, count: a.newsletterSentCount + 1 }),
        },
      }).catch(() => null);
      result.sent += 1;
    } catch (e) {
      result.errors.push(`${a.email}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  return result;
}

function alumniNewsletterHtml(d: { firstName: string; alumniSinceLabel: string; unsubscribeUrl: string; rejoinUrl: string }): string {
  return `<!doctype html><html><body style="margin:0;background:#F8F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#2D100F;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F8F2EA;padding:32px 16px;">
  <tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:white;border-radius:14px;border:1px solid #E8DDD0;padding:28px 32px;">
      <tr><td>
        <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:.20em;text-transform:uppercase;color:#23596A;">📬 Alumni · We miss you!</p>
        <h1 style="margin:6px 0 4px;font-size:24px;font-weight:900;letter-spacing:-.4px;">Hey ${escapeHtml(d.firstName)} — quick check-in</h1>
        <p style="margin:0 0 16px;font-size:14px;color:rgba(45,16,15,.65);line-height:1.55;">
          You&apos;ve been part of NOHO Mailbox alumni since <strong>${escapeHtml(d.alumniSinceLabel)}</strong>. We&apos;re writing to say hi (and to remind you we&apos;re still here if you ever need a virtual mailbox again).
        </p>
        <div style="background:#F7E6C2;border-radius:10px;padding:14px 18px;margin:14px 0;">
          <p style="margin:0;font-size:13px;color:#5C4540;">📦 New since you left:</p>
          <ul style="margin:6px 0 0;padding-left:18px;font-size:12.5px;color:#5C4540;line-height:1.5;">
            <li>Auto-translate scanned letters into 12 languages</li>
            <li>Snowbird playbook for travelers — pause your plan, resume on a date</li>
            <li>Member supply marketplace (boxes, tape, labels at member pricing)</li>
            <li>Smart mail predictions — know what&apos;s coming before it arrives</li>
          </ul>
        </div>
        <p style="margin:14px 0;text-align:center;">
          <a href="${d.rejoinUrl}" style="display:inline-block;padding:11px 22px;background:#337485;color:white;text-decoration:none;border-radius:10px;font-weight:900;font-size:13px;">Welcome back — rejoin →</a>
        </p>
        <p style="margin:14px 0 0;font-size:11px;color:rgba(45,16,15,.45);line-height:1.4;">
          We send these about once a quarter. <a href="${d.unsubscribeUrl}" style="color:#23596A;">Unsubscribe</a> anytime — we&apos;ll keep your records on file for the CMRA-required 5y retention either way.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}
