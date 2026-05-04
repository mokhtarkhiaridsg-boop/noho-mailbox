#!/usr/bin/env node
/**
 * Reset (or create) an admin's password on the production DB.
 *
 * Usage:
 *   node prisma/reset-admin-password.mjs <email> <newPassword>
 *
 * Behavior:
 *   - If a user with that email exists → updates passwordHash + role=ADMIN.
 *   - If no user exists → creates a new ADMIN user with that email/password.
 *   - Always sets totpEnabled=false so the admin can sign in without 2FA.
 *
 * Reads TURSO_DATABASE_URL + TURSO_AUTH_TOKEN from .env (or your shell env).
 *
 * The script prints what it did and exits 0 on success, 1 on failure.
 * No auto-run — invoke explicitly.
 */
import { createClient } from "@libsql/client";
import bcrypt from "bcryptjs";
import { config } from "dotenv";
import path from "node:path";

// Load .env then .env.production (Vercel env pull) — local takes precedence.
config({ path: path.resolve(process.cwd(), ".env.production") });
config({ path: path.resolve(process.cwd(), ".env") });

const [, , emailArg, passwordArg] = process.argv;
if (!emailArg || !passwordArg) {
  console.error("usage: node prisma/reset-admin-password.mjs <email> <newPassword>");
  process.exit(1);
}
const email = emailArg.trim().toLowerCase();
const password = passwordArg;

if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;
if (!url || !token) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN in env.");
  console.error("Run: vercel env pull .env.production");
  process.exit(1);
}

const client = createClient({ url, authToken: token });
const hash = await bcrypt.hash(password, 12);

const existing = await client.execute({
  sql: "SELECT id, role FROM User WHERE lower(email) = ? LIMIT 1",
  args: [email],
});

if (existing.rows.length === 0) {
  // Create a new admin user
  const id = crypto.randomUUID();
  await client.execute({
    sql: `INSERT INTO User (id, email, name, role, passwordHash, totpEnabled, createdAt, updatedAt)
          VALUES (?, ?, ?, 'ADMIN', ?, 0, datetime('now'), datetime('now'))`,
    args: [id, email, email.split("@")[0], hash],
  });
  console.log(`✓ Created new ADMIN user ${email}`);
} else {
  const userId = existing.rows[0].id;
  await client.execute({
    sql: `UPDATE User SET passwordHash = ?, role = 'ADMIN', totpEnabled = 0, updatedAt = datetime('now') WHERE id = ?`,
    args: [hash, userId],
  });
  console.log(`✓ Reset password for ${email} (id=${userId}) — role=ADMIN, 2FA disabled`);
}

console.log(`\nSign in at https://nohomailbox.org/login with:`);
console.log(`  Email:    ${email}`);
console.log(`  Password: ${password}`);
process.exit(0);
