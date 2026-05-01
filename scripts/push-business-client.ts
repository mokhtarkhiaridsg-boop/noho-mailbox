/**
 * One-time migration: create the BusinessClient table on Turso.
 * Run: npx tsx scripts/push-business-client.ts
 * Safe to re-run.
 */
import "dotenv/config";
import { createClient } from "@libsql/client";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) throw new Error("TURSO_DATABASE_URL not set");

const client = createClient({ url, authToken });

const sql = `
CREATE TABLE IF NOT EXISTS "BusinessClient" (
  "id"         TEXT PRIMARY KEY,
  "name"       TEXT NOT NULL,
  "email"      TEXT NOT NULL,
  "phone"      TEXT,
  "package"    TEXT NOT NULL DEFAULT 'Custom',
  "stage"      TEXT NOT NULL DEFAULT 'Intake',
  "progress"   INTEGER NOT NULL DEFAULT 0,
  "priceCents" INTEGER NOT NULL DEFAULT 0,
  "paidCents"  INTEGER NOT NULL DEFAULT 0,
  "notes"      TEXT,
  "createdAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "BusinessClient_stage_idx" ON "BusinessClient"("stage");
CREATE INDEX IF NOT EXISTS "BusinessClient_createdAt_idx" ON "BusinessClient"("createdAt");
`;

async function main() {
  for (const stmt of sql.split(";").map((s) => s.trim()).filter(Boolean)) {
    await client.execute(stmt);
    console.log("✓", stmt.slice(0, 60) + (stmt.length > 60 ? "…" : ""));
  }
  console.log("Done.");
}

main().catch((e) => { console.error(e); process.exit(1); });
