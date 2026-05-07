#!/usr/bin/env node
/**
 * Full Prisma-schema → Turso sync. Idempotent.
 *
 * Walks every `model X { ... }` block in prisma/schema.prisma, compares it
 * against the live Turso schema (PRAGMA table_info / sqlite_master), and:
 *   - CREATE TABLE for missing tables
 *   - ALTER TABLE ADD COLUMN for every scalar field missing on existing tables
 *
 * Skips relation-only fields (anything with @relation or [] type).
 * Type mapping: Int/Boolean → INTEGER, Float → REAL, DateTime → DATETIME,
 * everything else → TEXT.
 *
 * Usage:
 *   set -a && source .env && set +a && node scripts/sync-schema.mjs
 *   set -a && source .env && set +a && node scripts/sync-schema.mjs --dry
 */
import "dotenv/config";
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";

const DRY = process.argv.includes("--dry");
const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) { console.error("Missing TURSO_DATABASE_URL"); process.exit(1); }
const c = createClient({ url, authToken });

// ─── Parse schema.prisma into models ───────────────────────────────────
const schema = readFileSync(new URL("../prisma/schema.prisma", import.meta.url), "utf8");
const modelBlocks = [...schema.matchAll(/model\s+(\w+)\s*\{([\s\S]*?)\n\}/g)];

const SCALARS = new Set([
  "String", "Int", "Float", "Boolean", "DateTime", "Json", "Bytes", "BigInt", "Decimal",
]);
function sqlType(prismaType) {
  switch (prismaType) {
    case "Int": case "BigInt": case "Boolean": return "INTEGER";
    case "Float": case "Decimal": return "REAL";
    case "DateTime": return "DATETIME";
    case "Bytes": return "BLOB";
    default: return "TEXT";
  }
}

function parseFields(modelBody) {
  const fields = [];
  for (const rawLine of modelBody.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//") || line.startsWith("@@")) continue;
    if (line.includes("@relation")) continue; // skip relation-only fields
    // Match: fieldName Type[?!]  ...modifiers
    const m = line.match(/^(\w+)\s+(\w+)(\??)(\s|$|\[\])/);
    if (!m) continue;
    const [, name, type, optional, suffix] = m;
    if (suffix === "[]") continue; // array relation
    if (!SCALARS.has(type)) continue;
    const isOptional = optional === "?";
    const hasDefault = /@default\(/.test(line);
    const isPrimary = /@id\b/.test(line);
    const isUnique = /@unique\b/.test(line);
    fields.push({ name, type, optional: isOptional, hasDefault, isPrimary, isUnique, raw: line });
  }
  return fields;
}

// ─── Read live Turso schema ─────────────────────────────────────────────
async function liveTables() {
  // Bug fix: LIKE '_%' matches any 2+ char name, which excluded everything.
  // Use ESCAPE to make underscore literal, or just drop the filter since
  // sqlite_sequence is the only auto-generated table name in our schema.
  const r = await c.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite\\_%' ESCAPE '\\'`,
  );
  return new Set(r.rows.map((row) => row.name));
}
async function liveColumns(table) {
  const r = await c.execute(`PRAGMA table_info("${table}")`);
  return new Set(r.rows.map((row) => row.name));
}

const tables = await liveTables();
console.log(`Turso has ${tables.size} tables`);

// ─── Walk schema, sync ──────────────────────────────────────────────────
let createdTables = 0, addedColumns = 0, errors = 0;
const stmts = [];

for (const [, modelName, body] of modelBlocks) {
  const fields = parseFields(body);

  if (!tables.has(modelName)) {
    // CREATE TABLE
    const colDefs = fields.map((f) => {
      const parts = [`"${f.name}"`, sqlType(f.type)];
      if (f.isPrimary) parts.push("PRIMARY KEY");
      if (!f.optional && !f.hasDefault && !f.isPrimary) parts.push("NOT NULL");
      if (/@default\(now\(\)\)/.test(f.raw)) parts.push("DEFAULT (CURRENT_TIMESTAMP)");
      else if (/@default\(true\)/.test(f.raw)) parts.push("DEFAULT 1");
      else if (/@default\(false\)/.test(f.raw)) parts.push("DEFAULT 0");
      else if (/@default\(0\)/.test(f.raw)) parts.push("DEFAULT 0");
      else if (/@default\(""\)/.test(f.raw)) parts.push("DEFAULT ''");
      return parts.join(" ");
    });
    const sql = `CREATE TABLE IF NOT EXISTS "${modelName}" (${colDefs.join(", ")})`;
    stmts.push({ kind: "create", model: modelName, sql });
  } else {
    // ALTER for missing columns
    const cols = await liveColumns(modelName);
    for (const f of fields) {
      if (cols.has(f.name)) continue;
      const parts = [`ALTER TABLE "${modelName}" ADD COLUMN "${f.name}" ${sqlType(f.type)}`];
      if (/@default\(now\(\)\)/.test(f.raw)) parts.push("DEFAULT (CURRENT_TIMESTAMP)");
      else if (/@default\(true\)/.test(f.raw)) parts.push("DEFAULT 1");
      else if (/@default\(false\)/.test(f.raw)) parts.push("DEFAULT 0");
      else if (/@default\(0\)/.test(f.raw)) parts.push("DEFAULT 0");
      // SQLite ALTER TABLE ADD COLUMN can't add NOT NULL without a default;
      // intentionally skip NOT NULL on adds — Prisma will tolerate NULL on
      // older rows.
      stmts.push({ kind: "addCol", model: modelName, field: f.name, sql: parts.join(" ") });
    }
  }
}

console.log(`\nSync plan: ${stmts.length} statement(s)`);
for (const s of stmts) {
  console.log(`  · ${s.kind} ${s.model}${s.field ? `.${s.field}` : ""}`);
}

if (DRY) {
  console.log("\n--dry — no changes applied");
  process.exit(0);
}

console.log("\nApplying…");
for (const s of stmts) {
  try {
    await c.execute(s.sql);
    if (s.kind === "create") createdTables++;
    else addedColumns++;
    console.log(`  OK  ${s.model}${s.field ? `.${s.field}` : ""}`);
  } catch (e) {
    errors++;
    console.error(`  ERR ${s.model}${s.field ? `.${s.field}` : ""} — ${e.message.split("\n")[0]}`);
  }
}

console.log(`\nDone — created ${createdTables} tables, added ${addedColumns} columns, ${errors} errors`);
