"use server";

/**
 * iter-151 — Email deliverability dashboard (Tier 9 #61).
 *
 * Rolls up `EmailLog` into per-kind health stats so admin can spot a
 * Mailer Daemon outbreak before it tanks reputation. Also runs live
 * DNS checks for SPF / DKIM / DMARC on the sender domain so admin
 * knows when an envelope-from misconfiguration starts dropping mail
 * silently.
 *
 * Audit log entry on each report run for traceability + to make the
 * action discoverable in the audit feed.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";

export type EmailKindStat = {
  kind: string;
  total: number;
  sent: number;
  failed: number;
  bounced: number;
  queued: number;
  failureRate: number;       // 0-100
  bounceRate: number;        // 0-100
  lastSentIso: string | null;
};

export type DnsCheck = {
  record: "SPF" | "DKIM" | "DMARC";
  status: "ok" | "warn" | "fail" | "unchecked";
  detail: string;
  values: string[];
};

export type EmailDeliverabilityReport = {
  windowDays: number;
  generatedAtIso: string;
  totals: { total: number; sent: number; failed: number; bounced: number; queued: number };
  byKind: EmailKindStat[];
  byDay: Array<{ dateIso: string; total: number; sent: number; failed: number; bounced: number }>;
  recentFailures: Array<{
    id: string; toEmail: string; kind: string; status: string;
    error: string | null; subject: string; createdAtIso: string;
  }>;
  senderDomain: string;
  dns: DnsCheck[];
};

const DEFAULT_WINDOW_DAYS = 30;

function dayKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function senderDomainFromEnv(): string {
  // Use AUTH_URL host as our brand domain; fall back to a sane default.
  const url = process.env.AUTH_URL ?? "https://nohomailbox.org";
  try { return new URL(url).hostname; } catch { return "nohomailbox.org"; }
}

// iter-151 — Run a single TXT DNS lookup against Cloudflare's free
// DoH endpoint. No third-party libs, no env config. Resolves to an
// array of TXT record strings (joined by spaces — TXT records can be
// chunked into multiple sub-strings in the response payload).
async function lookupTxt(name: string): Promise<string[]> {
  try {
    const res = await fetch(
      `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=TXT`,
      { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(5000) },
    );
    if (!res.ok) return [];
    const body = (await res.json()) as { Answer?: Array<{ data?: string; type?: number }> };
    const answers = (body.Answer ?? []).filter((a) => a.type === 16 && typeof a.data === "string");
    return answers.map((a) => {
      const raw = a.data!;
      // DNS-JSON wraps each character-string in quotes joined with " ".
      // Strip the quotes + spaces between adjacent strings.
      return raw.replace(/"\s+"/g, "").replace(/^"|"$/g, "");
    });
  } catch {
    return [];
  }
}

async function checkSpf(domain: string): Promise<DnsCheck> {
  const records = await lookupTxt(domain);
  const spf = records.filter((r) => /^v=spf1/i.test(r));
  if (spf.length === 0) {
    return { record: "SPF", status: "fail", detail: `No SPF record on ${domain} — receiving mail servers may flag your mail as spoofed.`, values: [] };
  }
  if (spf.length > 1) {
    return { record: "SPF", status: "warn", detail: `Multiple SPF records found — RFC 7208 requires exactly one. Consolidate.`, values: spf };
  }
  const value = spf[0]!;
  // Quick correctness checks.
  const includesResend = /include:\s*[\w.-]*resend/i.test(value);
  const allMechanism = /(\?all|~all|-all)/i.exec(value)?.[1] ?? null;
  const detailBits: string[] = [];
  if (includesResend) detailBits.push("includes Resend");
  if (allMechanism === "-all") detailBits.push("strict (-all)");
  else if (allMechanism === "~all") detailBits.push("soft-fail (~all)");
  else if (allMechanism) detailBits.push(`permissive (${allMechanism})`);
  else detailBits.push("missing all-mechanism");
  return {
    record: "SPF",
    status: !allMechanism ? "warn" : "ok",
    detail: detailBits.join(" · ") || value.slice(0, 80),
    values: [value],
  };
}

async function checkDkim(domain: string): Promise<DnsCheck> {
  // Common selectors first; we don't know which the sender uses without
  // env config. We probe a handful and consider OK if any returns a
  // valid v=DKIM1 record. If admin uses a custom selector they can
  // ignore this check.
  const SELECTORS = ["resend", "default", "selector1", "selector2", "google", "k1", "s1", "s2"];
  for (const sel of SELECTORS) {
    const records = await lookupTxt(`${sel}._domainkey.${domain}`);
    const dkim = records.find((r) => /v=DKIM1/i.test(r));
    if (dkim) {
      return {
        record: "DKIM",
        status: "ok",
        detail: `Selector "${sel}" returns a valid DKIM1 record.`,
        values: [dkim],
      };
    }
  }
  return {
    record: "DKIM",
    status: "warn",
    detail: `No DKIM record found at common selectors (${SELECTORS.slice(0, 4).join(", ")}…). If you use a custom selector, ignore this warning. Otherwise, set up DKIM with your provider.`,
    values: [],
  };
}

async function checkDmarc(domain: string): Promise<DnsCheck> {
  const records = await lookupTxt(`_dmarc.${domain}`);
  const dmarc = records.find((r) => /^v=DMARC1/i.test(r));
  if (!dmarc) {
    return {
      record: "DMARC",
      status: "warn",
      detail: `No DMARC record on _dmarc.${domain}. Adding "v=DMARC1; p=none; rua=mailto:..." gives you visibility without affecting delivery.`,
      values: [],
    };
  }
  const policy = /p=(none|quarantine|reject)/i.exec(dmarc)?.[1] ?? "none";
  const status: DnsCheck["status"] =
    policy === "reject"   ? "ok" :
    policy === "quarantine" ? "ok" :
                              "warn";
  return {
    record: "DMARC",
    status,
    detail: `Policy: ${policy}${policy === "none" ? " · monitoring only — promote to quarantine when ready" : ""}`,
    values: [dmarc],
  };
}

export async function getEmailDeliverabilityReport(input: { windowDays?: number } = {}): Promise<EmailDeliverabilityReport> {
  const actor = await verifyAdmin();
  const windowDays = Math.max(1, Math.min(365, Math.round(input.windowDays ?? DEFAULT_WINDOW_DAYS)));
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  const [logs, totals, recentFailures] = await Promise.all([
    prisma.emailLog.findMany({
      where: { createdAt: { gte: since } },
      select: { id: true, kind: true, status: true, createdAt: true, sentAt: true },
    }),
    prisma.emailLog.groupBy({
      by: ["status"],
      where: { createdAt: { gte: since } },
      _count: { _all: true },
    }),
    prisma.emailLog.findMany({
      where: { createdAt: { gte: since }, status: { in: ["failed", "bounced"] } },
      orderBy: { createdAt: "desc" },
      take: 25,
      select: { id: true, toEmail: true, kind: true, status: true, error: true, subject: true, createdAt: true },
    }),
  ]);

  // Per-kind aggregation.
  const byKindMap = new Map<string, EmailKindStat>();
  const dayMap = new Map<string, { total: number; sent: number; failed: number; bounced: number }>();
  for (const l of logs) {
    const k = l.kind || "other";
    const slot = byKindMap.get(k) ?? {
      kind: k, total: 0, sent: 0, failed: 0, bounced: 0, queued: 0,
      failureRate: 0, bounceRate: 0, lastSentIso: null,
    };
    slot.total++;
    if (l.status === "sent") slot.sent++;
    else if (l.status === "failed") slot.failed++;
    else if (l.status === "bounced") slot.bounced++;
    else slot.queued++;
    if (l.sentAt && (!slot.lastSentIso || l.sentAt.toISOString() > slot.lastSentIso)) {
      slot.lastSentIso = l.sentAt.toISOString();
    }
    byKindMap.set(k, slot);

    const dk = dayKey(l.createdAt);
    const dslot = dayMap.get(dk) ?? { total: 0, sent: 0, failed: 0, bounced: 0 };
    dslot.total++;
    if (l.status === "sent") dslot.sent++;
    else if (l.status === "failed") dslot.failed++;
    else if (l.status === "bounced") dslot.bounced++;
    dayMap.set(dk, dslot);
  }
  const byKind = Array.from(byKindMap.values()).map((s) => ({
    ...s,
    failureRate: s.total > 0 ? Math.round((s.failed / s.total) * 1000) / 10 : 0,
    bounceRate: s.total > 0 ? Math.round((s.bounced / s.total) * 1000) / 10 : 0,
  })).sort((a, b) => b.total - a.total);

  // Fill in missing days so the chart isn't gappy.
  const byDay: EmailDeliverabilityReport["byDay"] = [];
  for (let i = windowDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    const key = dayKey(d);
    const slot = dayMap.get(key) ?? { total: 0, sent: 0, failed: 0, bounced: 0 };
    byDay.push({ dateIso: d.toISOString(), ...slot });
  }

  const totalsObj = { total: 0, sent: 0, failed: 0, bounced: 0, queued: 0 };
  for (const t of totals) {
    totalsObj.total += t._count._all;
    if (t.status === "sent") totalsObj.sent += t._count._all;
    else if (t.status === "failed") totalsObj.failed += t._count._all;
    else if (t.status === "bounced") totalsObj.bounced += t._count._all;
    else totalsObj.queued += t._count._all;
  }

  const senderDomain = senderDomainFromEnv();
  const dns = await Promise.all([checkSpf(senderDomain), checkDkim(senderDomain), checkDmarc(senderDomain)]);

  // Audit log — fire-and-forget, captures who ran the report + which window.
  void prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "email.deliverability_report_ran",
      entityType: "EmailLog",
      entityId: "(rollup)",
      metadata: JSON.stringify({
        windowDays,
        senderDomain,
        totals: totalsObj,
        dnsStatuses: dns.map((d) => `${d.record}:${d.status}`),
      }),
    },
  }).catch(() => undefined);

  return {
    windowDays,
    generatedAtIso: new Date().toISOString(),
    totals: totalsObj,
    byKind,
    byDay,
    recentFailures: recentFailures.map((r) => ({
      id: r.id,
      toEmail: r.toEmail,
      kind: r.kind,
      status: r.status,
      error: r.error,
      subject: r.subject,
      createdAtIso: r.createdAt.toISOString(),
    })),
    senderDomain,
    dns,
  };
}
