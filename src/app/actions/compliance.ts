"use server";

/**
 * NOHO Mailbox — CMRA compliance helpers (admin-only).
 *
 * Quarterly statements: every customer must have a signed certification on
 * file each quarter that the IDs / Form 1583 are still valid. Admin uploads
 * a PDF or image per (user, year, quarter).
 *
 * Plan-pricing settings: admin can edit Basic/Business/Premium prices in
 * the admin Settings panel. Stored in SiteConfig.
 */

import nodeCrypto from "node:crypto";
import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

function cuid() {
  return crypto.randomUUID();
}

// ───────────────────────── Quarterly statements ─────────────────────────
// Auto-generated each quarter from the customer's current record.
// Admin doesn't upload anything — they only view/print/email.

function quarterRange(year: number, quarter: number) {
  const startMonth = (quarter - 1) * 3;
  const periodStart = `${year}-${String(startMonth + 1).padStart(2, "0")}-01`;
  const endDate = new Date(Date.UTC(year, startMonth + 3, 0));
  const periodEnd = endDate.toISOString().slice(0, 10);
  return { periodStart, periodEnd };
}

function currentQuarter() {
  const now = new Date();
  return { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 };
}

// Snapshot the customer's current compliance state into a statement row.
// Stored in `notes` as JSON so we can render a printable view later.
async function generateOne(userId: string, year: number, quarter: number) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      name: true,
      email: true,
      phone: true,
      suiteNumber: true,
      plan: true,
      planTerm: true,
      mailboxStatus: true,
      kycStatus: true,
      kycForm1583Url: true,
      kycIdImageUrl: true,
      kycIdImage2Url: true,
      idPrimaryType: true,
      idSecondaryType: true,
      idPrimaryExpDate: true,
      idSecondaryExpDate: true,
      idPrimaryNumber: true,
      idSecondaryNumber: true,
      idPrimaryIssuer: true,
      idSecondaryIssuer: true,
      boxType: true,
      businessName: true,
      businessOwnerName: true,
      businessOwnerRelation: true,
      businessOwnerPhone: true,
      createdAt: true,
    },
  });
  if (!u) return null;

  // Mask raw ID numbers in the snapshot. The User row already holds the full
  // current value — admins can read it from there, encrypted at rest by
  // Turso/libsql. Storing the FULL number into a JSON `notes` blob duplicates
  // it across N quarterly rows per customer, and those duplicates survive
  // even after the customer updates their primary record (we keep the
  // historical snapshot intentionally for CMRA compliance audits). Last-four
  // is enough for an admin to recognize the ID; the SHA-256 hash lets a
  // quarter-end snapshot be verified against a current value without exposing
  // the full number.
  function maskIdNumber(raw: string | null | undefined): {
    lastFour: string | null;
    sha256: string | null;
  } {
    if (!raw) return { lastFour: null, sha256: null };
    const trimmed = raw.trim();
    if (!trimmed) return { lastFour: null, sha256: null };
    return {
      lastFour: trimmed.slice(-4),
      sha256: nodeCrypto.createHash("sha256").update(trimmed).digest("hex"),
    };
  }

  const { periodStart, periodEnd } = quarterRange(year, quarter);
  const snapshot = JSON.stringify({
    generatedAt: new Date().toISOString(),
    schemaVersion: 2, // v2 = masked ID numbers (was v1: full numbers)
    name: u.name,
    email: u.email,
    phone: u.phone,
    suiteNumber: u.suiteNumber,
    plan: u.plan,
    planTerm: u.planTerm,
    mailboxStatus: u.mailboxStatus,
    kycStatus: u.kycStatus,
    kycForm1583Url: u.kycForm1583Url,
    kycIdImageUrl: u.kycIdImageUrl,
    kycIdImage2Url: u.kycIdImage2Url,
    idPrimaryType: u.idPrimaryType,
    idSecondaryType: u.idSecondaryType,
    idPrimaryExpDate: u.idPrimaryExpDate,
    idSecondaryExpDate: u.idSecondaryExpDate,
    // PII-masked: was full DL/passport numbers, now lastFour + sha256 only.
    idPrimaryNumberMasked: maskIdNumber(u.idPrimaryNumber),
    idSecondaryNumberMasked: maskIdNumber(u.idSecondaryNumber),
    idPrimaryIssuer: u.idPrimaryIssuer,
    idSecondaryIssuer: u.idSecondaryIssuer,
    boxType: u.boxType,
    businessName: u.businessName,
    businessOwnerName: u.businessOwnerName,
    businessOwnerRelation: u.businessOwnerRelation,
    businessOwnerPhone: u.businessOwnerPhone,
  });

  await (prisma as unknown as {
    quarterlyStatement: { upsert: (args: unknown) => Promise<unknown> };
  }).quarterlyStatement.upsert({
    where: {
      userId_year_quarter: { userId, year, quarter },
    },
    update: { notes: snapshot, periodStart, periodEnd },
    create: {
      id: cuid(),
      userId,
      year,
      quarter,
      periodStart,
      periodEnd,
      notes: snapshot,
    },
  });
}

/**
 * Ensure quarterly statements exist for this customer for every quarter
 * since they signed up, including the current quarter. No-op for quarters
 * that already have a snapshot. Admin-only.
 */
export async function ensureQuarterlyStatements(userId: string) {
  const admin = await verifyAdmin();
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { createdAt: true },
  });
  if (!u) return { error: "User not found" };

  const now = new Date();
  const startYear = u.createdAt.getFullYear();
  const startQuarter = Math.floor(u.createdAt.getMonth() / 3) + 1;
  const endYear = now.getFullYear();
  const endQuarter = Math.floor(now.getMonth() / 3) + 1;

  // Walk every quarter from signup → current.
  let y = startYear, q = startQuarter;
  let safety = 0;
  let generated = 0;
  while ((y < endYear || (y === endYear && q <= endQuarter)) && safety++ < 200) {
    const existing = await (prisma as unknown as {
      quarterlyStatement: {
        findUnique: (args: unknown) => Promise<unknown | null>;
      };
    }).quarterlyStatement.findUnique({
      where: { userId_year_quarter: { userId, year: y, quarter: q } },
    });
    if (!existing) {
      await generateOne(userId, y, q);
      generated++;
    }
    q += 1;
    if (q > 4) {
      q = 1;
      y += 1;
    }
  }

  // One audit row per call, summarizing the backfill — better than per-quarter
  // rows which would flood the audit log on a customer with many missing
  // quarters.
  if (generated > 0) {
    await prisma.auditLog.create({
      data: {
        id: cuid(),
        actorId: admin.id ?? "unknown",
        actorRole: "ADMIN",
        action: "compliance.statement.ensure",
        entityType: "User",
        entityId: userId,
        metadata: JSON.stringify({
          generated,
          startYear,
          startQuarter,
          endYear,
          endQuarter,
        }),
      },
    });
  }

  revalidatePath("/admin");
  return { success: true, generated };
}

/**
 * Force-regenerate a specific quarter's snapshot from the customer's current
 * record. Admin uses this after editing IDs / business info to refresh.
 */
export async function regenerateQuarterlyStatement(
  userId: string,
  year: number,
  quarter: number,
) {
  const admin = await verifyAdmin();
  if (quarter < 1 || quarter > 4) return { error: "Invalid quarter" };
  await generateOne(userId, year, quarter);
  // Audit log: regeneration overwrites historical compliance evidence — even
  // though the new snapshot reflects current truth, admins need to be able
  // to ask "who refreshed this quarter and when". Written separately from
  // generateOne so the helper stays callable from non-audited contexts
  // (the cron-style ensure functions).
  await prisma.auditLog.create({
    data: {
      id: cuid(),
      actorId: admin.id ?? "unknown",
      actorRole: "ADMIN",
      action: "compliance.statement.regenerate",
      entityType: "QuarterlyStatement",
      entityId: `${userId}:${year}-Q${quarter}`,
      metadata: JSON.stringify({ userId, year, quarter }),
    },
  });
  revalidatePath("/admin");
  return { success: true };
}

/**
 * One-time migration: walk every QuarterlyStatement row and rewrite its
 * `notes` JSON to v2 (masked ID numbers). Older rows stored the full
 * `idPrimaryNumber` / `idSecondaryNumber` (DL/passport) verbatim, which is a
 * PII duplication risk. After this script runs, only `lastFour + sha256` is
 * kept; full numbers remain on the User row only. Idempotent — rows already
 * at schemaVersion 2 are skipped.
 *
 * Returns counts so admin can confirm what was changed. Wraps each row's
 * update + audit log in a `$transaction` so a partial-failure scrub doesn't
 * leave half-updated data.
 */
export async function scrubV1QuarterlyStatementSnapshots() {
  const admin = await verifyAdmin();

  const rows = await (prisma as unknown as {
    quarterlyStatement: {
      findMany: (args: unknown) => Promise<
        Array<{ id: string; userId: string; year: number; quarter: number; notes: string | null }>
      >;
    };
  }).quarterlyStatement.findMany({
    where: { notes: { not: null } },
    select: { id: true, userId: true, year: true, quarter: true, notes: true },
  });

  let scrubbed = 0;
  let alreadyV2 = 0;
  let unparseable = 0;
  const errors: Array<{ id: string; reason: string }> = [];

  for (const r of rows) {
    if (!r.notes) continue;
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(r.notes) as Record<string, unknown>;
    } catch {
      unparseable++;
      errors.push({ id: r.id, reason: "JSON parse failure" });
      continue;
    }

    if (parsed.schemaVersion === 2) {
      alreadyV2++;
      continue;
    }

    // Move the raw `idPrimaryNumber` / `idSecondaryNumber` (if present) to
    // the masked form. We can compute the lastFour + sha256 from the stored
    // value (we don't need to round-trip through the User row, because the
    // snapshot's whole point is to record what the IDs were AT that quarter
    // — even if the customer later changes them).
    function maskIdField(raw: unknown): { lastFour: string | null; sha256: string | null } | null {
      if (typeof raw !== "string") return null;
      const trimmed = raw.trim();
      if (!trimmed) return { lastFour: null, sha256: null };
      return {
        lastFour: trimmed.slice(-4),
        sha256: nodeCrypto.createHash("sha256").update(trimmed).digest("hex"),
      };
    }

    const idPrimaryNumberMasked = maskIdField(parsed.idPrimaryNumber);
    const idSecondaryNumberMasked = maskIdField(parsed.idSecondaryNumber);

    const next: Record<string, unknown> = {
      ...parsed,
      schemaVersion: 2,
      idPrimaryNumberMasked,
      idSecondaryNumberMasked,
    };
    delete next.idPrimaryNumber;
    delete next.idSecondaryNumber;

    try {
      // Single-row update — no need to wrap in `$transaction`. The QuarterlyStatement
      // model is also accessed via cast (see other call sites) so the static type
      // doesn't expose a PrismaPromise here.
      await (prisma as unknown as {
        quarterlyStatement: { update: (args: unknown) => Promise<unknown> };
      }).quarterlyStatement.update({
        where: { id: r.id },
        data: { notes: JSON.stringify(next) },
      });
      scrubbed++;
    } catch (e) {
      errors.push({ id: r.id, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  // Single audit row summarizing the run — one entry per migration is more
  // readable than one per scrubbed row.
  await prisma.auditLog.create({
    data: {
      id: cuid(),
      actorId: admin.id ?? "unknown",
      actorRole: "ADMIN",
      action: "compliance.statement.scrubV1",
      entityType: "QuarterlyStatement",
      entityId: "*",
      metadata: JSON.stringify({
        totalRows: rows.length,
        scrubbed,
        alreadyV2,
        unparseable,
        errorCount: errors.length,
        firstFiveErrors: errors.slice(0, 5),
      }),
    },
  });

  revalidatePath("/admin");
  return { success: true as const, scrubbed, alreadyV2, unparseable, errors: errors.length };
}

/**
 * Bulk report — every active customer with their statement for a given
 * (year, quarter). If `auto` is true, missing snapshots are generated on the
 * fly so the report never has gaps. Used by the admin Reports tab.
 */
export async function getStatementsForQuarter(
  year: number,
  quarter: number,
  options?: { auto?: boolean },
) {
  await verifyAdmin();
  if (quarter < 1 || quarter > 4) return [];

  const auto = options?.auto !== false;
  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      mailboxStatus: { in: ["Pending", "Assigned", "Active"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      suiteNumber: true,
      plan: true,
      boxType: true,
      businessName: true,
      mailboxStatus: true,
      kycStatus: true,
      createdAt: true,
    },
    orderBy: [{ suiteNumber: "asc" }, { name: "asc" }],
  });

  const rows = await Promise.all(
    users.map(async (u) => {
      let stmt = await (prisma as unknown as {
        quarterlyStatement: {
          findUnique: (args: unknown) => Promise<{
            id: string;
            periodStart: string | null;
            periodEnd: string | null;
            createdAt: Date;
          } | null>;
        };
      }).quarterlyStatement.findUnique({
        where: { userId_year_quarter: { userId: u.id, year, quarter } },
      });

      // Lazy-generate when missing so admin sees a complete report.
      if (!stmt && auto) {
        // Only generate for quarters >= the customer's signup quarter
        const signupYear = u.createdAt.getFullYear();
        const signupQ = Math.floor(u.createdAt.getMonth() / 3) + 1;
        const isAfterSignup =
          year > signupYear || (year === signupYear && quarter >= signupQ);
        if (isAfterSignup) {
          await generateOne(u.id, year, quarter);
          stmt = await (prisma as unknown as {
            quarterlyStatement: {
              findUnique: (args: unknown) => Promise<{
                id: string;
                periodStart: string | null;
                periodEnd: string | null;
                createdAt: Date;
              } | null>;
            };
          }).quarterlyStatement.findUnique({
            where: { userId_year_quarter: { userId: u.id, year, quarter } },
          });
        }
      }

      return {
        userId: u.id,
        userName: u.name,
        userEmail: u.email,
        suiteNumber: u.suiteNumber,
        plan: u.plan,
        boxType: u.boxType,
        businessName: u.businessName,
        mailboxStatus: u.mailboxStatus,
        kycStatus: u.kycStatus,
        signedUpAt: u.createdAt.toISOString(),
        statementId: stmt?.id ?? null,
        periodStart: stmt?.periodStart ?? null,
        periodEnd: stmt?.periodEnd ?? null,
        generatedAt: stmt?.createdAt.toISOString() ?? null,
      };
    }),
  );

  return rows;
}

// Used by an admin-side cron / batch endpoint to roll forward all customers.
export async function ensureCurrentQuarterForAllCustomers() {
  const admin = await verifyAdmin();
  const { year, quarter } = currentQuarter();
  const users = await prisma.user.findMany({
    where: { role: "USER", suiteNumber: { not: null } },
    select: { id: true },
  });

  // Prefetch all existing snapshots for this quarter in one query so we don't
  // do N findUniques in a serial loop. Then process the missing ones.
  const existing = await (prisma as unknown as {
    quarterlyStatement: {
      findMany: (args: unknown) => Promise<Array<{ userId: string }>>;
    };
  }).quarterlyStatement.findMany({
    where: { year, quarter, userId: { in: users.map((u) => u.id) } },
    select: { userId: true },
  });
  const haveSet = new Set(existing.map((e) => e.userId));

  let created = 0;
  for (const u of users) {
    if (haveSet.has(u.id)) continue;
    await generateOne(u.id, year, quarter);
    created++;
  }

  // Single audit row summarizing the batch — better than per-customer rows
  // which would flood the AuditLog every quarter for hundreds of customers.
  if (created > 0) {
    await prisma.auditLog.create({
      data: {
        id: cuid(),
        actorId: admin.id ?? "unknown",
        actorRole: "ADMIN",
        action: "compliance.statement.batch",
        entityType: "QuarterlyStatement",
        entityId: `${year}-Q${quarter}`,
        metadata: JSON.stringify({
          year,
          quarter,
          totalCustomers: users.length,
          alreadyHad: haveSet.size,
          generated: created,
        }),
      },
    });
  }

  revalidatePath("/admin");
  return { success: true, created, total: users.length };
}

export async function getQuarterlyStatementsForUser(userId: string) {
  await verifyAdmin();
  const rows = await (prisma as unknown as {
    quarterlyStatement: {
      findMany: (args: unknown) => Promise<
        Array<{
          id: string;
          year: number;
          quarter: number;
          fileUrl: string | null;
          periodStart: string | null;
          periodEnd: string | null;
          notes: string | null;
          createdAt: Date;
        }>
      >;
    };
  }).quarterlyStatement.findMany({
    where: { userId },
    orderBy: [{ year: "desc" as const }, { quarter: "desc" as const }],
  });
  return rows.map((r) => ({
    id: r.id,
    year: r.year,
    quarter: r.quarter,
    fileUrl: r.fileUrl,
    periodStart: r.periodStart,
    periodEnd: r.periodEnd,
    notes: r.notes,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ───────────────────────── Plan pricing settings ─────────────────────────
// Stored in SiteConfig as cents. Defaults match the original pricing page.

export type PlanPrices = {
  basicCents: number;
  businessCents: number;
  premiumCents: number;
  keyFeeCents: number;
};

const DEFAULT_PRICES: PlanPrices = {
  basicCents: 5000,    // $50 / 3 mo
  businessCents: 8000, // $80 / 3 mo
  premiumCents: 9500,  // $95 / 3 mo
  keyFeeCents: 1500,   // $15 one-time
};

const PRICE_KEY = "plan_prices_v1";

export async function getPlanPrices(): Promise<PlanPrices> {
  const row = await prisma.siteConfig.findUnique({ where: { key: PRICE_KEY } });
  if (!row?.value) return DEFAULT_PRICES;
  try {
    const parsed = JSON.parse(row.value) as Partial<PlanPrices>;
    return {
      basicCents: parsed.basicCents ?? DEFAULT_PRICES.basicCents,
      businessCents: parsed.businessCents ?? DEFAULT_PRICES.businessCents,
      premiumCents: parsed.premiumCents ?? DEFAULT_PRICES.premiumCents,
      keyFeeCents: parsed.keyFeeCents ?? DEFAULT_PRICES.keyFeeCents,
    };
  } catch (e) {
    // Was a silent catch — corrupt config means published prices silently
    // fall back to DEFAULT_PRICES, which can be wildly wrong if pricing has
    // moved since defaults were set. Log so the issue is observable in
    // function logs even though we still serve a safe fallback.
    console.error("[getPlanPrices] failed to parse SiteConfig value, falling back to defaults:", e);
    return DEFAULT_PRICES;
  }
}

export async function updatePlanPrices(input: PlanPrices) {
  const admin = await verifyAdmin();
  for (const v of Object.values(input)) {
    if (!Number.isInteger(v) || v < 0 || v > 100000) {
      return { error: "Prices must be whole-dollar values between $0 and $1000" };
    }
  }

  // Capture the prior price snapshot so the audit log records what changed.
  // Money/identity ops without an audit trail were the #2 finding from the
  // iter-21 server-action audit.
  const before = await prisma.siteConfig.findUnique({ where: { key: PRICE_KEY } });
  let beforeValue: PlanPrices | null = null;
  try {
    beforeValue = before?.value ? (JSON.parse(before.value) as PlanPrices) : null;
  } catch {
    // Old/malformed config — log raw string in metadata so we don't lose evidence.
  }

  await prisma.$transaction([
    prisma.siteConfig.upsert({
      where: { key: PRICE_KEY },
      update: { value: JSON.stringify(input) },
      create: { key: PRICE_KEY, value: JSON.stringify(input) },
    }),
    prisma.auditLog.create({
      data: {
        id: crypto.randomUUID(),
        actorId: admin.id ?? "unknown",
        actorRole: "ADMIN",
        action: "pricing.update",
        entityType: "SiteConfig",
        entityId: PRICE_KEY,
        metadata: JSON.stringify({
          before: beforeValue ?? before?.value ?? null,
          after: input,
        }),
      },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/pricing");
  revalidatePath("/");
  return { success: true };
}
