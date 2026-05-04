#!/usr/bin/env node
/**
 * Temporary admin user for Chrome MCP testing. Deletes any existing
 * row with the same email first, then inserts a fresh row with a known
 * password hash. After testing is done, run with --delete to remove it.
 *
 * Usage:
 *   set -a && source .env && set +a && node scripts/temp-admin.mjs           # create
 *   set -a && source .env && set +a && node scripts/temp-admin.mjs --delete  # remove
 */
import "dotenv/config";
import { createClient } from "@libsql/client";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

const TEST_EMAIL = "claude-test@noho.local";
const TEST_PASSWORD = "NohoTest2026!";

const c = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const isDelete = process.argv.includes("--delete");

if (isDelete) {
  const r = await c.execute({ sql: `DELETE FROM User WHERE email = ?`, args: [TEST_EMAIL] });
  console.log(`Deleted ${r.rowsAffected} test admin row(s)`);
  process.exit(0);
}

// Cleanup any prior row to avoid email-uniqueness conflicts
await c.execute({ sql: `DELETE FROM User WHERE email = ?`, args: [TEST_EMAIL] });

const hash = await bcrypt.hash(TEST_PASSWORD, 10);
const id = randomUUID();
const now = new Date().toISOString();

await c.execute({
  sql: `INSERT INTO User (id, email, passwordHash, name, role, status, mailboxStatus, createdAt, updatedAt)
        VALUES (?, ?, ?, 'Claude Test Admin', 'ADMIN', 'Active', 'Active', ?, ?)`,
  args: [id, TEST_EMAIL, hash, now, now],
});

console.log(`OK — temporary admin created`);
console.log(`  email:    ${TEST_EMAIL}`);
console.log(`  password: ${TEST_PASSWORD}`);
console.log(`  Run with --delete when finished testing.`);
