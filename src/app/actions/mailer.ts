"use server";

/**
 * iter-83 — Admin Bulk Mailer
 *
 * Powers the AdminMailerPanel so admin can blast targeted email
 * announcements to customers. Audience filters: all members, by plan,
 * by KYC status, expired-plan, by suite #, single email. Body supports
 * `{{name}}` / `{{firstName}}` / `{{suiteNumber}}` / `{{planDueDate}}`
 * variables substituted per recipient.
 *
 * Every send writes to EmailLog (kind = "bulk") so admin can audit. A
 * parent AuditLog "mailer.bulk_send" entry rolls up the campaign.
 *
 * Test sends fire to a single explicit address (admin's own email,
 * usually) and skip the audience pass entirely. Use to verify rendering.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { sendEmail } from "@/lib/email";

export type MailerAudience =
  | { kind: "all" }
  | { kind: "plan"; plan: string }
  | { kind: "kyc"; kycStatus: string }
  | { kind: "expired" }                  // status === "Expired" OR plan past due
  | { kind: "suite"; suiteNumber: string }
  | { kind: "explicit"; emails: string[] };

export type SendBulkInput = {
  audience: MailerAudience;
  subject: string;
  bodyHtml: string;       // raw HTML body — wrapped in standard layout
  testEmail?: string;     // when set, ignore audience and send a single test
  dryRun?: boolean;       // when true, return preview count only, don't send
};

// Brand-aligned layout matching the rest of the email templates. Kept
// inline here so the mailer doesn't need to import lib/email's private
// `layout()` (it isn't exported).
function wrapLayout(subject: string, innerHtml: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#F8F2EA;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Inter,sans-serif;color:#2D100F;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F8F2EA;padding:32px 16px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:white;border-radius:16px;overflow:hidden;box-shadow:0 6px 18px rgba(45,16,15,0.08);">
        <tr><td style="padding:24px 28px;background:linear-gradient(135deg,#337485,#23596A);">
          <p style="margin:0;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:#F7E6C2;">NOHO Mailbox</p>
          <p style="margin:4px 0 0;font-size:11px;color:rgba(247,230,194,0.80);">5062 Lankershim Blvd · NoHo, CA 91601</p>
        </td></tr>
        <tr><td style="padding:28px;font-size:14px;line-height:1.55;color:#2D100F;">
          ${innerHtml}
        </td></tr>
        <tr><td style="padding:18px 28px;background:#F8F2EA;border-top:1px solid #E8DDD0;font-size:11px;color:#5C4540;text-align:center;">
          (818) 506-7744 · <a href="https://nohomailbox.org" style="color:#23596A;text-decoration:none;">nohomailbox.org</a><br>
          Mon–Fri 9:30am–5:30pm · Sat 10am–1:30pm
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// Render `{{var}}` placeholders against a recipient. Unknown vars are
// preserved verbatim so admins notice typos in test mode.
function renderTemplate(
  body: string,
  ctx: { name: string | null; firstName: string; suiteNumber: string | null; planDueDate: string | null },
): string {
  return body
    .replace(/\{\{\s*name\s*\}\}/gi, ctx.name ?? "")
    .replace(/\{\{\s*firstName\s*\}\}/gi, ctx.firstName)
    .replace(/\{\{\s*suiteNumber\s*\}\}/gi, ctx.suiteNumber ?? "")
    .replace(/\{\{\s*suite\s*\}\}/gi, ctx.suiteNumber ?? "")
    .replace(/\{\{\s*planDueDate\s*\}\}/gi, ctx.planDueDate ?? "");
}

// ─── Audience preview — count + sample for confirmation UI ─────────────────
export async function previewAudience(audience: MailerAudience): Promise<{
  count: number;
  sample: Array<{ id: string; name: string; email: string; suiteNumber: string | null }>;
}> {
  await verifyAdmin();
  const where = buildAudienceWhere(audience);
  if (!where) return { count: 0, sample: [] };
  const [count, sample] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { suiteNumber: "asc" },
      take: 8,
      select: { id: true, name: true, email: true, suiteNumber: true },
    }),
  ]);
  return { count, sample };
}

// Translate an audience selector into a Prisma `where` clause. Returns
// null for the explicit-emails path (handled separately by the sender).
function buildAudienceWhere(audience: MailerAudience):
  | Record<string, unknown> | null {
  if (audience.kind === "explicit") return null;
  // Always exclude admins — bulk announcements are for customers.
  const base: Record<string, unknown> = { role: { not: "ADMIN" } };
  if (audience.kind === "all") return base;
  if (audience.kind === "plan") return { ...base, plan: audience.plan };
  if (audience.kind === "kyc") return { ...base, kycStatus: audience.kycStatus };
  if (audience.kind === "suite") return { ...base, suiteNumber: audience.suiteNumber };
  if (audience.kind === "expired") return { ...base, status: "Expired" };
  return base;
}

// ─── The send action ────────────────────────────────────────────────────────
export async function sendBulkMail(input: SendBulkInput): Promise<{
  ok?: boolean;
  total: number;
  sent: number;
  failed: number;
  notSent: number;       // EmailLog status === "not_sent" (no provider configured)
  errors: Array<{ email: string; reason: string }>;
  testMode: boolean;
}> {
  const actor = await verifyAdmin();

  const subject = (input.subject ?? "").trim();
  const body = (input.bodyHtml ?? "").trim();
  if (!subject) return { total: 0, sent: 0, failed: 0, notSent: 0, errors: [{ email: "", reason: "Subject is required" }], testMode: false };
  if (!body || body.length < 10) return { total: 0, sent: 0, failed: 0, notSent: 0, errors: [{ email: "", reason: "Body is required (≥10 chars)" }], testMode: false };

  // Test send path — single explicit recipient, no audience, no per-rcp
  // template substitution beyond a fake context.
  if (input.testEmail) {
    const testTo = input.testEmail.trim();
    if (!/.+@.+\..+/.test(testTo)) {
      return { total: 0, sent: 0, failed: 1, notSent: 0, errors: [{ email: testTo, reason: "Invalid email address" }], testMode: true };
    }
    const renderedBody = renderTemplate(body, {
      name: "Test Customer",
      firstName: "Test",
      suiteNumber: "042",
      planDueDate: "2026-12-31",
    });
    const html = wrapLayout(`[TEST] ${subject}`, renderedBody);
    try {
      const res = await sendEmail({
        to: testTo,
        subject: `[TEST] ${subject}`,
        html,
        kind: "bulk_test",
        userId: actor.id,
      });
      return {
        ok: true,
        total: 1,
        sent: res.status === "sent" || res.status === "queued" ? 1 : 0,
        failed: res.status === "failed" ? 1 : 0,
        notSent: res.status === "not_sent" ? 1 : 0,
        errors: [],
        testMode: true,
      };
    } catch (e) {
      return {
        total: 1,
        sent: 0,
        failed: 1,
        notSent: 0,
        errors: [{ email: testTo, reason: e instanceof Error ? e.message : String(e) }],
        testMode: true,
      };
    }
  }

  if (input.dryRun) {
    const where = buildAudienceWhere(input.audience);
    if (!where && input.audience.kind === "explicit") {
      const valid = input.audience.emails.filter((e) => /.+@.+\..+/.test(e));
      return { ok: true, total: valid.length, sent: 0, failed: 0, notSent: 0, errors: [], testMode: false };
    }
    const total = where ? await prisma.user.count({ where }) : 0;
    return { ok: true, total, sent: 0, failed: 0, notSent: 0, errors: [], testMode: false };
  }

  // Real send. Resolve audience to a list of recipient rows.
  type Recipient = { id: string | null; name: string | null; email: string; suiteNumber: string | null; planDueDate: string | null };
  let recipients: Recipient[] = [];

  if (input.audience.kind === "explicit") {
    const valid = Array.from(new Set(input.audience.emails.map((e) => e.trim()).filter((e) => /.+@.+\..+/.test(e))));
    recipients = valid.map((e) => ({ id: null, name: null, email: e, suiteNumber: null, planDueDate: null }));
  } else {
    const where = buildAudienceWhere(input.audience);
    if (!where) return { total: 0, sent: 0, failed: 0, notSent: 0, errors: [{ email: "", reason: "Empty audience" }], testMode: false };
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, suiteNumber: true, planDueDate: true },
    });
    recipients = users.map((u) => ({
      id: u.id, name: u.name, email: u.email, suiteNumber: u.suiteNumber, planDueDate: u.planDueDate,
    }));
  }

  if (recipients.length === 0) {
    return { total: 0, sent: 0, failed: 0, notSent: 0, errors: [{ email: "", reason: "Audience matched 0 recipients" }], testMode: false };
  }

  // Roll-up audit log so reports / compliance can see the campaign as a
  // single event with N children (one EmailLog per recipient).
  const audit = await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "mailer.bulk_send",
      entityType: "EmailCampaign",
      entityId: null,
      metadata: JSON.stringify({
        audience: input.audience,
        subject,
        recipientCount: recipients.length,
      }),
    },
  });

  // Fire serially to avoid spiking Resend rate limits. With ~100ms per
  // send + small audience this is fine; for huge audiences the bureau
  // can run multiple campaigns or we'll batch later.
  let sent = 0, failed = 0, notSent = 0;
  const errors: Array<{ email: string; reason: string }> = [];

  for (const r of recipients) {
    const firstName = (r.name ?? "").split(" ")[0] || "there";
    const renderedBody = renderTemplate(body, {
      name: r.name,
      firstName,
      suiteNumber: r.suiteNumber,
      planDueDate: r.planDueDate,
    });
    const html = wrapLayout(subject, renderedBody);
    try {
      const res = await sendEmail({
        to: r.email,
        subject,
        html,
        kind: `bulk:${input.audience.kind}`,
        userId: r.id ?? actor.id,
      });
      if (res.status === "sent" || res.status === "queued") sent++;
      else if (res.status === "not_sent") notSent++;
      else { failed++; errors.push({ email: r.email, reason: res.status }); }
    } catch (e) {
      failed++;
      errors.push({ email: r.email, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  // Update the rollup audit log with final counts (best-effort).
  await prisma.auditLog.update({
    where: { id: audit.id },
    data: {
      metadata: JSON.stringify({
        audience: input.audience,
        subject,
        recipientCount: recipients.length,
        sent, failed, notSent,
      }),
    },
  }).catch(() => undefined);

  return { ok: true, total: recipients.length, sent, failed, notSent, errors: errors.slice(0, 10), testMode: false };
}

// Plan + kycStatus distinct values for the audience picker dropdowns.
export async function getMailerAudienceOptions() {
  await verifyAdmin();
  const [plans, kycStatuses, totalActive] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: "ADMIN" }, plan: { not: null } },
      select: { plan: true },
      distinct: ["plan"],
    }),
    prisma.user.findMany({
      where: { role: { not: "ADMIN" } },
      select: { kycStatus: true },
      distinct: ["kycStatus"],
    }),
    prisma.user.count({ where: { role: { not: "ADMIN" } } }),
  ]);
  return {
    plans: plans.map((p) => p.plan!).filter(Boolean).sort(),
    kycStatuses: kycStatuses.map((k) => k.kycStatus).filter(Boolean).sort(),
    totalActive,
  };
}
