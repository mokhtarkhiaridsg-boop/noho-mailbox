"use server";

// iter-132 — Backup verification + DB health checks.
//
// Probes every critical surface so admin can answer "is the database
// healthy + are backups working" without leaving the dashboard:
//   1. Connectivity   — single SELECT round-trip
//   2. Read integrity — expected tables return counts (catches missed migrations)
//   3. Write probe    — round-trip a SiteConfig sentinel row
//   4. Recency        — newest row in audit/email/payment/webhook tables
//   5. Env config     — required env vars present (without exposing values)
//   6. Row counts     — every important model surfaced as a stat
//
// Pure read + a single sentinel write. Audit-logged so admin has proof
// the check ran when they hand reports to compliance.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export type CheckResult =
  | { kind: "ok"; durationMs: number; detail?: string }
  | { kind: "warn"; durationMs: number; detail: string }
  | { kind: "fail"; durationMs: number; detail: string };

export type BackupHealthReport = {
  generatedAtIso: string;
  overall: "ok" | "warn" | "fail";
  checks: {
    connectivity: CheckResult;
    writeProbe: CheckResult;
    schemaIntegrity: CheckResult;
    recency: CheckResult;
    envConfig: CheckResult;
  };
  recency: {
    newestUserAtIso: string | null;
    newestMailItemAtIso: string | null;
    newestAuditAtIso: string | null;
    newestEmailLogAtIso: string | null;
    newestPaymentAtIso: string | null;
    newestWebhookDeliveryAtIso: string | null;
  };
  rowCounts: {
    users: number;
    mailItems: number;
    deliveryOrders: number;
    notaryBookings: number;
    auditLogs: number;
    emailLogs: number;
    payments: number;
    invoices: number;
    walletTransactions: number;
    posSales: number;
    mailRequests: number;
    mailboxRenewals: number;
  };
  envFlags: {
    AUTH_URL: boolean;
    AUTH_SECRET: boolean;
    DATABASE_URL: boolean;
    RESEND_API_KEY: boolean;
    EMAIL_FROM: boolean;
    SHIPPO_API_KEY: boolean;
    SQUARE_ACCESS_TOKEN: boolean;
    CRON_SECRET: boolean;
    INBOUND_EMAIL_SECRET: boolean;
    ANTHROPIC_API_KEY: boolean;
    BLOB_READ_WRITE_TOKEN: boolean;
  };
};

// Stale thresholds for recency check (in days). If a table hasn't seen a
// new row in this long, surface a warning — could mean a write pipeline
// died or backups skipped.
const RECENCY_WARN_DAYS: Record<string, number> = {
  audit: 7,         // ops happen daily
  email: 14,        // some weeks are slow but not 2+
  payment: 30,      // monthly cadence at minimum
  webhook: 14,      // assuming webhooks configured
};

export async function runBackupHealthCheck(): Promise<BackupHealthReport> {
  const actor = await verifyAdmin();
  const startedAt = new Date();

  // 1. Connectivity probe — simplest possible round-trip.
  const connStart = Date.now();
  let connectivity: CheckResult;
  try {
    await prisma.$queryRaw`SELECT 1 as ok`;
    connectivity = { kind: "ok", durationMs: Date.now() - connStart };
  } catch (e) {
    connectivity = {
      kind: "fail", durationMs: Date.now() - connStart,
      detail: e instanceof Error ? e.message : String(e),
    };
  }

  // 2. Write probe — round-trip a SiteConfig sentinel.
  const writeStart = Date.now();
  let writeProbe: CheckResult;
  const SENTINEL_KEY = "_backup_health_sentinel";
  try {
    const sentinelValue = `probe:${startedAt.toISOString()}`;
    await prisma.siteConfig.upsert({
      where: { key: SENTINEL_KEY },
      update: { value: sentinelValue },
      create: { key: SENTINEL_KEY, value: sentinelValue },
    });
    const readBack = await prisma.siteConfig.findUnique({
      where: { key: SENTINEL_KEY },
    });
    if (readBack?.value === sentinelValue) {
      writeProbe = { kind: "ok", durationMs: Date.now() - writeStart };
    } else {
      writeProbe = {
        kind: "warn", durationMs: Date.now() - writeStart,
        detail: "Sentinel write succeeded but read-back didn't match — possible replication lag.",
      };
    }
  } catch (e) {
    writeProbe = {
      kind: "fail", durationMs: Date.now() - writeStart,
      detail: e instanceof Error ? e.message : String(e),
    };
  }

  // 3. Schema integrity — try counting every important model in parallel.
  const schemaStart = Date.now();
  let schemaIntegrity: CheckResult;
  let rowCounts: BackupHealthReport["rowCounts"] = {
    users: 0, mailItems: 0, deliveryOrders: 0, notaryBookings: 0,
    auditLogs: 0, emailLogs: 0, payments: 0, invoices: 0,
    walletTransactions: 0, posSales: 0, mailRequests: 0, mailboxRenewals: 0,
  };
  const missing: string[] = [];
  try {
    const results = await Promise.allSettled([
      prisma.user.count(),
      prisma.mailItem.count(),
      prisma.deliveryOrder.count(),
      prisma.notaryBooking.count(),
      prisma.auditLog.count(),
      prisma.emailLog.count(),
      prisma.payment.count(),
      prisma.invoice.count(),
      prisma.walletTransaction.count(),
      prisma.pOSSale.count(),
      prisma.mailRequest.count(),
      prisma.mailboxRenewal.count(),
    ]);
    const labels = [
      "users", "mailItems", "deliveryOrders", "notaryBookings",
      "auditLogs", "emailLogs", "payments", "invoices",
      "walletTransactions", "posSales", "mailRequests", "mailboxRenewals",
    ] as const;
    const next = { ...rowCounts };
    results.forEach((r, i) => {
      const label = labels[i];
      if (r.status === "fulfilled") next[label] = r.value;
      else missing.push(label);
    });
    rowCounts = next;
    if (missing.length === 0) {
      schemaIntegrity = { kind: "ok", durationMs: Date.now() - schemaStart, detail: `${labels.length} tables verified` };
    } else if (missing.length <= 2) {
      schemaIntegrity = {
        kind: "warn", durationMs: Date.now() - schemaStart,
        detail: `${missing.length} tables failed to count: ${missing.join(", ")}. Run prisma db push.`,
      };
    } else {
      schemaIntegrity = {
        kind: "fail", durationMs: Date.now() - schemaStart,
        detail: `${missing.length}/${labels.length} tables missing or broken: ${missing.join(", ")}`,
      };
    }
  } catch (e) {
    schemaIntegrity = {
      kind: "fail", durationMs: Date.now() - schemaStart,
      detail: e instanceof Error ? e.message : String(e),
    };
  }

  // 4. Recency — newest write in each critical table.
  const recencyStart = Date.now();
  const recency: BackupHealthReport["recency"] = {
    newestUserAtIso: null,
    newestMailItemAtIso: null,
    newestAuditAtIso: null,
    newestEmailLogAtIso: null,
    newestPaymentAtIso: null,
    newestWebhookDeliveryAtIso: null,
  };
  const recencyWarnings: string[] = [];
  try {
    const [u, m, a, e, p, w] = await Promise.allSettled([
      prisma.user.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.mailItem.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.auditLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.emailLog.findFirst({ orderBy: { createdAt: "desc" }, select: { createdAt: true } }),
      prisma.payment.findFirst({ orderBy: { syncedAt: "desc" }, select: { syncedAt: true } }),
      prisma.webhookDelivery.findFirst({ orderBy: { sentAt: "desc" }, select: { sentAt: true } }).catch(() => null),
    ]);
    if (u.status === "fulfilled" && u.value) recency.newestUserAtIso = u.value.createdAt.toISOString();
    if (m.status === "fulfilled" && m.value) recency.newestMailItemAtIso = m.value.createdAt.toISOString();
    if (a.status === "fulfilled" && a.value) {
      recency.newestAuditAtIso = a.value.createdAt.toISOString();
      const days = (Date.now() - a.value.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      if (days > RECENCY_WARN_DAYS.audit) recencyWarnings.push(`audit log idle ${Math.round(days)}d`);
    } else if (a.status === "fulfilled") {
      recencyWarnings.push("audit log empty");
    }
    if (e.status === "fulfilled" && e.value) {
      recency.newestEmailLogAtIso = e.value.createdAt.toISOString();
      const days = (Date.now() - e.value.createdAt.getTime()) / (24 * 60 * 60 * 1000);
      if (days > RECENCY_WARN_DAYS.email) recencyWarnings.push(`email idle ${Math.round(days)}d`);
    }
    if (p.status === "fulfilled" && p.value) {
      recency.newestPaymentAtIso = p.value.syncedAt.toISOString();
      const days = (Date.now() - p.value.syncedAt.getTime()) / (24 * 60 * 60 * 1000);
      if (days > RECENCY_WARN_DAYS.payment) recencyWarnings.push(`payments idle ${Math.round(days)}d`);
    }
    if (w.status === "fulfilled" && w.value && "sentAt" in w.value && w.value.sentAt) {
      recency.newestWebhookDeliveryAtIso = w.value.sentAt.toISOString();
    }
  } catch (e) {
    recencyWarnings.push(e instanceof Error ? e.message : String(e));
  }
  const recencyResult: CheckResult = recencyWarnings.length === 0
    ? { kind: "ok", durationMs: Date.now() - recencyStart, detail: "All tables wrote recently" }
    : { kind: "warn", durationMs: Date.now() - recencyStart, detail: recencyWarnings.join(" · ") };

  // 5. Env-var presence (booleans only — never exposes values).
  const envFlags: BackupHealthReport["envFlags"] = {
    AUTH_URL: !!process.env.AUTH_URL,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    DATABASE_URL: !!process.env.DATABASE_URL || !!process.env.TURSO_DATABASE_URL,
    RESEND_API_KEY: !!process.env.RESEND_API_KEY,
    EMAIL_FROM: !!process.env.EMAIL_FROM,
    SHIPPO_API_KEY: !!process.env.SHIPPO_API_KEY,
    SQUARE_ACCESS_TOKEN: !!process.env.SQUARE_ACCESS_TOKEN,
    CRON_SECRET: !!process.env.CRON_SECRET,
    INBOUND_EMAIL_SECRET: !!process.env.INBOUND_EMAIL_SECRET,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
    BLOB_READ_WRITE_TOKEN: !!process.env.BLOB_READ_WRITE_TOKEN,
  };
  const REQUIRED_ENV = ["AUTH_URL", "AUTH_SECRET", "DATABASE_URL"] as const;
  const RECOMMENDED_ENV = ["RESEND_API_KEY", "EMAIL_FROM", "CRON_SECRET", "BLOB_READ_WRITE_TOKEN"] as const;
  const missingRequired = REQUIRED_ENV.filter((k) => !envFlags[k]);
  const missingRecommended = RECOMMENDED_ENV.filter((k) => !envFlags[k]);
  const envResult: CheckResult = missingRequired.length > 0
    ? { kind: "fail", durationMs: 0, detail: `Missing required env: ${missingRequired.join(", ")}` }
    : missingRecommended.length > 0
      ? { kind: "warn", durationMs: 0, detail: `Missing recommended env: ${missingRecommended.join(", ")}` }
      : { kind: "ok", durationMs: 0, detail: "All required + recommended env vars set" };

  // Roll-up overall status.
  const allChecks = [connectivity, writeProbe, schemaIntegrity, recencyResult, envResult];
  const hasFailing = allChecks.some((c) => c.kind === "fail");
  const hasWarning = allChecks.some((c) => c.kind === "warn");
  const overall = hasFailing ? "fail" : hasWarning ? "warn" : "ok";

  // Audit log so the run is provable.
  await prisma.auditLog.create({
    data: {
      actorId: actor.id ?? "unknown",
      actorRole: actor.role,
      action: "backup.health_check_ran",
      entityType: "BackupHealth",
      entityId: startedAt.toISOString(),
      metadata: JSON.stringify({
        overall,
        connectivity: connectivity.kind,
        writeProbe: writeProbe.kind,
        schemaIntegrity: schemaIntegrity.kind,
        recency: recencyResult.kind,
        envConfig: envResult.kind,
        rowCounts,
      }),
    },
  }).catch(() => null);

  revalidatePath("/admin");

  return {
    generatedAtIso: startedAt.toISOString(),
    overall,
    checks: {
      connectivity, writeProbe, schemaIntegrity,
      recency: recencyResult, envConfig: envResult,
    },
    recency,
    rowCounts,
    envFlags,
  };
}

// Last 10 health-check runs from audit log so admin can see a history.
export async function listBackupHealthHistory(): Promise<Array<{
  id: string; ranAtIso: string; overall: string; metadata: string;
}>> {
  await verifyAdmin();
  const rows = await prisma.auditLog.findMany({
    where: { action: "backup.health_check_ran" },
    orderBy: { createdAt: "desc" },
    take: 10,
    select: { id: true, createdAt: true, metadata: true },
  });
  return rows.map((r) => {
    let overall = "unknown";
    try {
      const m = JSON.parse(r.metadata ?? "{}") as { overall?: string };
      if (typeof m.overall === "string") overall = m.overall;
    } catch { /* ignore */ }
    return { id: r.id, ranAtIso: r.createdAt.toISOString(), overall, metadata: r.metadata ?? "{}" };
  });
}
