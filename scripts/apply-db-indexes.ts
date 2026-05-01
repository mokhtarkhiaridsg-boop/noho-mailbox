/**
 * One-shot DDL script to apply iter-31's schema changes to Turso.
 *
 * Background: `prisma db push` doesn't support `libsql://` URLs (Prisma CLI
 * has no libsql adapter for migrations). The runtime adapter does, so the
 * schema lives in `prisma/schema.prisma` and the Prisma client picks up the
 * new index/uniqueness types — but the actual DDL has to be executed via
 * libsql's own SDK.
 *
 * Run with:
 *   npx tsx scripts/apply-db-indexes.ts
 *
 * Idempotent: every statement uses `IF NOT EXISTS`, so re-running is safe.
 */

import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL?.trim();
const authToken = process.env.TURSO_AUTH_TOKEN?.trim();

if (!url) {
  console.error("Missing TURSO_DATABASE_URL — aborting");
  process.exit(1);
}

const client = createClient({ url, authToken });

const statements: Array<{ name: string; sql: string }> = [
  // User.pickupToken — unique so concurrent token-regen can't collide.
  {
    name: "User.pickupToken @unique",
    sql: 'CREATE UNIQUE INDEX IF NOT EXISTS "User_pickupToken_key" ON "User"("pickupToken")',
  },

  // MailItem hot-path indexes (admin /dashboard reads).
  {
    name: "MailItem(userId, status)",
    sql: 'CREATE INDEX IF NOT EXISTS "MailItem_userId_status_idx" ON "MailItem"("userId", "status")',
  },
  {
    name: "MailItem(userId, createdAt)",
    sql: 'CREATE INDEX IF NOT EXISTS "MailItem_userId_createdAt_idx" ON "MailItem"("userId", "createdAt")',
  },
  {
    name: "MailItem(status)",
    sql: 'CREATE INDEX IF NOT EXISTS "MailItem_status_idx" ON "MailItem"("status")',
  },
  {
    name: "MailItem(date)",
    sql: 'CREATE INDEX IF NOT EXISTS "MailItem_date_idx" ON "MailItem"("date")',
  },

  // WalletTransaction — late-fee idempotency check + dashboard history sort.
  {
    name: "WalletTransaction(userId, createdAt)",
    sql: 'CREATE INDEX IF NOT EXISTS "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt")',
  },
  {
    name: "WalletTransaction(userId, kind, createdAt)",
    sql: 'CREATE INDEX IF NOT EXISTS "WalletTransaction_userId_kind_createdAt_idx" ON "WalletTransaction"("userId", "kind", "createdAt")',
  },

  // AuditLog — read by entity (e.g. all logs for a user) and by action
  // (e.g. last 24h wallet topups for the rolling cap).
  {
    name: "AuditLog(entityType, entityId, createdAt)",
    sql: 'CREATE INDEX IF NOT EXISTS "AuditLog_entityType_entityId_createdAt_idx" ON "AuditLog"("entityType", "entityId", "createdAt")',
  },
  {
    name: "AuditLog(action, entityId, createdAt)",
    sql: 'CREATE INDEX IF NOT EXISTS "AuditLog_action_entityId_createdAt_idx" ON "AuditLog"("action", "entityId", "createdAt")',
  },
  {
    name: "AuditLog(actorId, createdAt)",
    sql: 'CREATE INDEX IF NOT EXISTS "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt")',
  },
  {
    name: "AuditLog(createdAt)",
    sql: 'CREATE INDEX IF NOT EXISTS "AuditLog_createdAt_idx" ON "AuditLog"("createdAt")',
  },

  // Referral — referrer's "find my own pending code" + referee lookup.
  {
    name: "Referral(referrerId, refereeId)",
    sql: 'CREATE INDEX IF NOT EXISTS "Referral_referrerId_refereeId_idx" ON "Referral"("referrerId", "refereeId")',
  },
  {
    name: "Referral(refereeId)",
    sql: 'CREATE INDEX IF NOT EXISTS "Referral_refereeId_idx" ON "Referral"("refereeId")',
  },

  // EmailLog — member dashboard email-history + admin email-logs panel +
  // failed-delivery diagnostics.
  {
    name: "EmailLog(userId, createdAt)",
    sql: 'CREATE INDEX IF NOT EXISTS "EmailLog_userId_createdAt_idx" ON "EmailLog"("userId", "createdAt")',
  },
  {
    name: "EmailLog(status, createdAt)",
    sql: 'CREATE INDEX IF NOT EXISTS "EmailLog_status_createdAt_idx" ON "EmailLog"("status", "createdAt")',
  },

  // Payment — admin payments view + refund-cap aggregations.
  {
    name: "Payment(userId, status)",
    sql: 'CREATE INDEX IF NOT EXISTS "Payment_userId_status_idx" ON "Payment"("userId", "status")',
  },
  {
    name: "Payment(status, syncedAt)",
    sql: 'CREATE INDEX IF NOT EXISTS "Payment_status_syncedAt_idx" ON "Payment"("status", "syncedAt")',
  },
];

async function main() {
  console.log(`Applying ${statements.length} index statements to ${url}…\n`);
  let ok = 0;
  let skipped = 0;
  let failed = 0;
  for (const stmt of statements) {
    try {
      await client.execute(stmt.sql);
      console.log(`  ✓ ${stmt.name}`);
      ok++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      // libsql throws on duplicate-index attempts even with IF NOT EXISTS
      // sometimes, depending on adapter version. Treat "already exists" as
      // a no-op rather than failure.
      if (msg.toLowerCase().includes("already exists")) {
        console.log(`  ~ ${stmt.name} (already present)`);
        skipped++;
      } else {
        console.error(`  ✗ ${stmt.name}: ${msg}`);
        failed++;
      }
    }
  }
  console.log(`\nDone: ${ok} created, ${skipped} already present, ${failed} failed.`);
  if (failed > 0) process.exit(1);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
