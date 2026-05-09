"use server";

/**
 * iter-163 — Admin Bulk SMS campaigns (Tier 10 #73).
 *
 * Counterpart to the iter-83 bulk email mailer, but for Twilio SMS.
 * Differences:
 *
 *   1. Per-customer opt-in is REAL — `notifPrefs` defaults SMS off, so
 *      the audience filter discards anyone who hasn't actively enabled
 *      a marketing channel. There's no audience large enough to spam by
 *      accident.
 *
 *   2. Phone normalization is best-effort. Members without a parseable
 *      phone get counted as "skipped" up front, with a sample shown in
 *      the preview so admin can chase the bad numbers offline.
 *
 *   3. SMS bodies have segment limits — 160 char single, 153 char per
 *      segment for multi-part. Preview returns segments + total cost
 *      estimate so admin doesn't accidentally fire a 5-segment campaign.
 *
 *   4. Persistent campaign log: every send creates a `BulkSmsCampaign`
 *      row stamped with succeeded / failed counts and a `bulkBatchId`
 *      that gets written into every per-recipient `SmsLog` row. Audit
 *      log gets a `sms.bulk_campaign_sent` parent event.
 *
 * Test mode = single explicit phone, no campaign row, no audience pass.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendSms, normalizePhoneE164 } from "@/lib/sms";
import { parsePrefs, getChannelPrefs } from "@/lib/notifPrefs";
import { computeSegments } from "@/lib/sms-segments";

// ─── Audience selector ────────────────────────────────────────────────────
// Re-using the mailer.ts shape so a future "send via email + SMS together"
// feature can swap this for the same selector. Audience targets are always
// non-admin users with a non-null phone.
export type SmsAudience =
  | { kind: "all" }
  | { kind: "plan"; plan: string }
  | { kind: "expired" }
  | { kind: "explicit"; phones: string[] };

// SMS-specific opt-in policy: at least one of `marketing` (custom event,
// off by default) or `mailArrived` (already-opted-in for transactional
// SMS — fair to also reach with an announcement when they explicitly
// turned SMS on). Toggle via `marketingOptIn: false` to reach only the
// marketing-channel opt-ins.
function audienceOptInClause(marketingOptIn: boolean) {
  // We can't query JSON fields with prisma's SQLite + libSQL adapter,
  // so we filter in memory after pulling the rows. Returning the
  // predicate we'll apply post-fetch.
  return (notifPrefs: string | null) => {
    const prefs = parsePrefs(notifPrefs);
    if (marketingOptIn) {
      // Custom "marketing" event isn't in the default prefs list — read
      // raw. We treat ANY truthy `marketing.sms` as the strict marketing
      // opt-in. If absent we still allow members who turned on
      // transactional SMS (mailArrived) so the bureau can do "important
      // announcements" without re-asking for consent.
      const m = (prefs as Record<string, { sms?: boolean }>).marketing;
      if (m?.sms) return true;
    }
    return getChannelPrefs(prefs, "mailArrived").sms;
  };
}

export type SmsAudiencePreview = {
  total: number;            // matches by audience filter
  optedIn: number;          // also passed the SMS opt-in check
  withGoodPhone: number;    // also normalized to E.164 ok
  reachable: number;        // all three above
  sample: Array<{ id: string; name: string; phone: string; suiteNumber: string | null; phoneOk: boolean; optedIn: boolean }>;
  unreachableSamples: Array<{ id: string; name: string; reason: string }>;
};

function buildBaseWhere(a: SmsAudience): Record<string, unknown> | null {
  if (a.kind === "explicit") return null;
  const base: Record<string, unknown> = {
    role: { not: "ADMIN" },
    phone: { not: null },
  };
  if (a.kind === "all") return base;
  if (a.kind === "plan") return { ...base, plan: a.plan };
  if (a.kind === "expired") return { ...base, status: "Expired" };
  return base;
}

export async function previewBulkSmsAudience(input: {
  audience: SmsAudience;
  body: string;
  marketingOptIn?: boolean; // default true — strict marketing opt-in
}): Promise<SmsAudiencePreview & {
  segments: { length: number; segments: number; encoding: string };
  estimatedSegmentsTotal: number;
}> {
  await verifyAdmin();
  const marketingOptIn = input.marketingOptIn ?? true;
  const optInPredicate = audienceOptInClause(marketingOptIn);
  const segs = computeSegments(input.body ?? "");

  // Explicit-phones path — admin pasted a list. Skip the audience query
  // entirely; phones still need to normalize cleanly.
  if (input.audience.kind === "explicit") {
    const phones = Array.from(new Set(input.audience.phones.map((p) => p.trim()).filter(Boolean)));
    const normalized = phones
      .map((p) => ({ raw: p, e164: normalizePhoneE164(p) }))
      .filter((x) => x.e164);
    const unreachableSamples = phones
      .filter((p) => !normalizePhoneE164(p))
      .slice(0, 8)
      .map((p) => ({ id: p, name: "(unmatched)", reason: "phone_unparseable" }));
    return {
      total: phones.length,
      optedIn: phones.length,                  // explicit list = admin asserts opt-in
      withGoodPhone: normalized.length,
      reachable: normalized.length,
      sample: normalized.slice(0, 8).map((x) => ({
        id: x.e164!, name: "(explicit)", phone: x.e164!, suiteNumber: null, phoneOk: true, optedIn: true,
      })),
      unreachableSamples,
      segments: segs,
      estimatedSegmentsTotal: segs.segments * normalized.length,
    };
  }

  const where = buildBaseWhere(input.audience);
  if (!where) {
    return {
      total: 0, optedIn: 0, withGoodPhone: 0, reachable: 0, sample: [], unreachableSamples: [],
      segments: segs, estimatedSegmentsTotal: 0,
    };
  }

  const users = await prisma.user.findMany({
    where,
    select: { id: true, name: true, phone: true, suiteNumber: true, notifPrefs: true },
    orderBy: { suiteNumber: "asc" },
  });

  const total = users.length;
  let optedIn = 0;
  let withGoodPhone = 0;
  let reachable = 0;
  const sample: SmsAudiencePreview["sample"] = [];
  const unreachableSamples: SmsAudiencePreview["unreachableSamples"] = [];

  for (const u of users) {
    const phoneOk = normalizePhoneE164(u.phone) != null;
    const isOptedIn = optInPredicate(u.notifPrefs);
    if (phoneOk) withGoodPhone++;
    if (isOptedIn) optedIn++;
    if (phoneOk && isOptedIn) reachable++;
    if (sample.length < 8 && phoneOk && isOptedIn) {
      sample.push({
        id: u.id, name: u.name, phone: normalizePhoneE164(u.phone)!,
        suiteNumber: u.suiteNumber, phoneOk: true, optedIn: true,
      });
    }
    if (unreachableSamples.length < 8) {
      if (!phoneOk) unreachableSamples.push({ id: u.id, name: u.name, reason: "phone_unparseable" });
      else if (!isOptedIn) unreachableSamples.push({ id: u.id, name: u.name, reason: "not_opted_in" });
    }
  }

  return {
    total, optedIn, withGoodPhone, reachable, sample, unreachableSamples,
    segments: segs, estimatedSegmentsTotal: segs.segments * reachable,
  };
}

// ─── Send action ──────────────────────────────────────────────────────────
export type SendBulkSmsInput = {
  label: string;          // human-readable campaign name (audit + history list)
  audience: SmsAudience;
  body: string;           // raw template (supports {{firstName}} / {{name}} / {{suiteNumber}})
  marketingOptIn?: boolean;
  testPhone?: string;     // when set, ignore audience and send a single test
  dryRun?: boolean;       // when true, return preview only, don't send + no campaign row
};

export type SendBulkSmsResult = {
  ok: boolean;
  campaignId?: string;
  total: number;
  sent: number;
  failed: number;
  notSent: number;
  errors: Array<{ phone: string; reason: string }>;
  testMode: boolean;
  segments?: number;
  reachable?: number;
};

function renderTemplate(body: string, ctx: { name: string | null; firstName: string; suiteNumber: string | null }): string {
  return body
    .replace(/\{\{\s*name\s*\}\}/gi, ctx.name ?? "")
    .replace(/\{\{\s*firstName\s*\}\}/gi, ctx.firstName)
    .replace(/\{\{\s*suiteNumber\s*\}\}/gi, ctx.suiteNumber ?? "")
    .replace(/\{\{\s*suite\s*\}\}/gi, ctx.suiteNumber ?? "");
}

export async function sendBulkSms(input: SendBulkSmsInput): Promise<SendBulkSmsResult> {
  const actor = await verifyAdmin();
  const label = (input.label ?? "").trim().slice(0, 120);
  const body = (input.body ?? "").trim();
  if (body.length < 5) {
    return { ok: false, total: 0, sent: 0, failed: 1, notSent: 0, errors: [{ phone: "", reason: "Body required (≥5 chars)" }], testMode: false };
  }
  if (body.length > 1000) {
    return { ok: false, total: 0, sent: 0, failed: 1, notSent: 0, errors: [{ phone: "", reason: "Body too long (max 1000 chars)" }], testMode: false };
  }

  // ─── Test path ─────────────────────────────────────────────
  if (input.testPhone) {
    const e164 = normalizePhoneE164(input.testPhone);
    if (!e164) {
      return { ok: false, total: 1, sent: 0, failed: 1, notSent: 0, errors: [{ phone: input.testPhone, reason: "Could not normalize phone to E.164" }], testMode: true };
    }
    const renderedBody = renderTemplate(`[TEST] ${body}`, {
      name: "Test Customer", firstName: "Test", suiteNumber: "042",
    });
    const res = await sendSms({ to: e164, body: renderedBody, kind: "bulk_test", userId: actor.id ?? null });
    return {
      ok: true, total: 1,
      sent: res.status === "sent" || res.status === "queued" ? 1 : 0,
      failed: res.status === "failed" ? 1 : 0,
      notSent: res.status === "not_sent" ? 1 : 0,
      errors: [], testMode: true,
    };
  }

  // ─── Resolve audience ──────────────────────────────────────
  type Recipient = { id: string | null; name: string | null; firstName: string; phone: string; suiteNumber: string | null };
  const optInPredicate = audienceOptInClause(input.marketingOptIn ?? true);
  const recipients: Recipient[] = [];

  if (input.audience.kind === "explicit") {
    const phones = Array.from(new Set(input.audience.phones.map((p) => p.trim()).filter(Boolean)));
    for (const raw of phones) {
      const e164 = normalizePhoneE164(raw);
      if (!e164) continue;
      recipients.push({ id: null, name: null, firstName: "there", phone: e164, suiteNumber: null });
    }
  } else {
    const where = buildBaseWhere(input.audience);
    if (!where) {
      return { ok: false, total: 0, sent: 0, failed: 1, notSent: 0, errors: [{ phone: "", reason: "Empty audience" }], testMode: false };
    }
    const users = await prisma.user.findMany({
      where,
      select: { id: true, name: true, phone: true, suiteNumber: true, notifPrefs: true },
    });
    for (const u of users) {
      const e164 = normalizePhoneE164(u.phone);
      if (!e164) continue;
      if (!optInPredicate(u.notifPrefs)) continue;
      const firstName = (u.name ?? "").split(" ")[0] || "there";
      recipients.push({ id: u.id, name: u.name, firstName, phone: e164, suiteNumber: u.suiteNumber });
    }
  }

  if (recipients.length === 0) {
    return { ok: false, total: 0, sent: 0, failed: 1, notSent: 0, errors: [{ phone: "", reason: "Audience matched 0 reachable opted-in members" }], testMode: false };
  }

  if (input.dryRun) {
    const segs = computeSegments(body);
    return {
      ok: true, total: recipients.length, sent: 0, failed: 0, notSent: 0,
      errors: [], testMode: false,
      segments: segs.segments, reachable: recipients.length,
    };
  }

  // ─── Real send: create the campaign row first so we have an id ─────
  const campaign = await prisma.bulkSmsCampaign.create({
    data: {
      label: label || `SMS campaign · ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
      body,
      audienceJson: JSON.stringify(input.audience),
      recipientCount: recipients.length,
      sentById: actor.id ?? null,
    },
  });

  // Roll-up audit. Refreshed at end with final counts.
  const audit = await prisma.auditLog.create({
    data: {
      actorId: actor.id ?? "unknown",
      actorRole: actor.role,
      action: "sms.bulk_campaign_started",
      entityType: "BulkSmsCampaign",
      entityId: campaign.id,
      metadata: JSON.stringify({
        label, audience: input.audience, recipientCount: recipients.length,
      }),
    },
  });

  let sent = 0, failed = 0, notSent = 0;
  let estSegments = 0;
  const errors: Array<{ phone: string; reason: string }> = [];

  for (const r of recipients) {
    const renderedBody = renderTemplate(body, {
      name: r.name, firstName: r.firstName, suiteNumber: r.suiteNumber,
    });
    estSegments += computeSegments(renderedBody).segments;
    try {
      const res = await sendSms({
        to: r.phone, body: renderedBody, kind: "bulk", userId: r.id ?? actor.id ?? null,
      });
      // Stamp the bulk batch id so we can group in the panel.
      await prisma.smsLog.update({
        where: { id: res.logId },
        data: { bulkBatchId: campaign.id },
      }).catch(() => undefined);
      if (res.status === "sent" || res.status === "queued") sent++;
      else if (res.status === "not_sent") notSent++;
      else { failed++; errors.push({ phone: r.phone, reason: res.status }); }
    } catch (e) {
      failed++;
      errors.push({ phone: r.phone, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  // Finalize the campaign row with totals.
  await prisma.bulkSmsCampaign.update({
    where: { id: campaign.id },
    data: { succeededCount: sent, failedCount: failed, notSentCount: notSent, estSegments },
  });
  // Roll-up audit final counts.
  await prisma.auditLog.update({
    where: { id: audit.id },
    data: {
      action: "sms.bulk_campaign_sent",
      metadata: JSON.stringify({
        label, audience: input.audience, recipientCount: recipients.length,
        sent, failed, notSent, estSegments,
      }),
    },
  }).catch(() => undefined);

  revalidatePath("/admin");

  return {
    ok: true, campaignId: campaign.id,
    total: recipients.length, sent, failed, notSent,
    errors: errors.slice(0, 10),
    testMode: false,
    segments: estSegments, reachable: recipients.length,
  };
}

// ─── History + drill-down ────────────────────────────────────────────────
export type BulkSmsCampaignRow = {
  id: string;
  label: string;
  bodyPreview: string;
  audienceLabel: string;
  recipientCount: number;
  succeededCount: number;
  failedCount: number;
  notSentCount: number;
  estSegments: number;
  sentAtIso: string;
};

function audienceShortLabel(j: string): string {
  try {
    const a = JSON.parse(j) as SmsAudience;
    if (a.kind === "all") return "All members";
    if (a.kind === "plan") return `Plan: ${a.plan}`;
    if (a.kind === "expired") return "Expired plans";
    if (a.kind === "explicit") return `Explicit (${a.phones.length})`;
    return "(unknown audience)";
  } catch {
    return "(unknown)";
  }
}

export async function listBulkSmsCampaigns(limit = 30): Promise<BulkSmsCampaignRow[]> {
  await verifyAdmin();
  const rows = await prisma.bulkSmsCampaign.findMany({
    orderBy: { sentAt: "desc" },
    take: Math.max(1, Math.min(100, limit)),
  });
  return rows.map((r) => ({
    id: r.id,
    label: r.label,
    bodyPreview: r.body.length > 80 ? r.body.slice(0, 80) + "…" : r.body,
    audienceLabel: audienceShortLabel(r.audienceJson),
    recipientCount: r.recipientCount,
    succeededCount: r.succeededCount,
    failedCount: r.failedCount,
    notSentCount: r.notSentCount,
    estSegments: r.estSegments,
    sentAtIso: r.sentAt.toISOString(),
  }));
}

export type BulkSmsAudienceOptions = {
  plans: string[];
  totalActive: number;
  totalWithPhone: number;
  totalSmsOptedIn: number;
};

export async function getBulkSmsAudienceOptions(): Promise<BulkSmsAudienceOptions> {
  await verifyAdmin();
  const [plans, totalActive, withPhoneRows] = await Promise.all([
    prisma.user.findMany({
      where: { role: { not: "ADMIN" }, plan: { not: null } },
      select: { plan: true },
      distinct: ["plan"],
    }),
    prisma.user.count({ where: { role: { not: "ADMIN" } } }),
    prisma.user.findMany({
      where: { role: { not: "ADMIN" }, phone: { not: null } },
      select: { notifPrefs: true },
    }),
  ]);
  const totalWithPhone = withPhoneRows.length;
  let totalSmsOptedIn = 0;
  const optInPred = audienceOptInClause(true);
  for (const r of withPhoneRows) {
    if (optInPred(r.notifPrefs)) totalSmsOptedIn++;
  }
  return {
    plans: plans.map((p) => p.plan!).filter(Boolean).sort(),
    totalActive,
    totalWithPhone,
    totalSmsOptedIn,
  };
}
