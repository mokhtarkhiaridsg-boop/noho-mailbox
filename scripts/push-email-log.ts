/**
 * One-time migration: create the EmailLog table on Turso.
 * Run with: npx tsx scripts/push-email-log.ts
 * Safe to re-run — uses CREATE TABLE IF NOT EXISTS.
 */
import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url) {
  console.error("TURSO_DATABASE_URL not set");
  process.exit(1);
}

const client = createClient({ url, authToken });

const sql = `
CREATE TABLE IF NOT EXISTS "EmailLog" (
  "id"         TEXT PRIMARY KEY,
  "userId"     TEXT,
  "toEmail"    TEXT NOT NULL,
  "fromEmail"  TEXT NOT NULL DEFAULT 'noreply@nohomailbox.org',
  "subject"    TEXT NOT NULL,
  "body"       TEXT NOT NULL,
  "kind"       TEXT NOT NULL,
  "status"     TEXT NOT NULL DEFAULT 'queued',
  "provider"   TEXT,
  "providerId" TEXT,
  "error"      TEXT,
  "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "sentAt"     DATETIME
);
CREATE INDEX IF NOT EXISTS "EmailLog_userId_idx" ON "EmailLog"("userId");
CREATE INDEX IF NOT EXISTS "EmailLog_createdAt_idx" ON "EmailLog"("createdAt");
`;

async function main() {
  const statements = sql.split(";").map((s) => s.trim()).filter(Boolean);
  for (const stmt of statements) {
    await client.execute(stmt);
    console.log("✓", stmt.slice(0, 60) + (stmt.length > 60 ? "…" : ""));
  }
  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
