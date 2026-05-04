#!/usr/bin/env node
/**
 * Import the imported-roster.tsv into the User table on Turso.
 *
 * Each row maps to a User row keyed by suiteNumber. We upsert so re-running
 * is safe — existing users at a suite have their plan/term/dueDate refreshed
 * and only get a new record on first import.
 *
 * Status mapping: Current → Active, Past Due → Active (planDueDate is past),
 * Available → skip (no customer to import).
 *
 * Size → plan: Regular → Basic, Large → Business, Corporate → Premium.
 *
 * Usage:
 *   set -a && source .env && set +a && node scripts/import-roster.mjs
 *   # or
 *   node scripts/import-roster.mjs --dry  # preview without writing
 */
import "dotenv/config";
import { createClient } from "@libsql/client";
import { readFileSync } from "node:fs";
import { randomUUID, randomBytes, createHash } from "node:crypto";

const DRY = process.argv.includes("--dry");

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url) {
  console.error("Missing TURSO_DATABASE_URL");
  process.exit(1);
}
const c = createClient({ url, authToken });

// ─── Read + parse the TSV ────────────────────────────────────────────────
const tsvPath = new URL("./imported-roster.tsv", import.meta.url);
const lines = readFileSync(tsvPath, "utf8").split("\n").filter(Boolean);
const records = [];
for (const line of lines) {
  const cols = line.split("\t");
  const [suite, size, status, name, phone, term, dueDate, amount] = cols;
  if (!suite) continue;
  if (status === "Available") continue;
  records.push({
    suite: String(suite).trim(),
    size: (size || "").trim(),
    status: (status || "").trim(),
    name: (name || "").trim(),
    phone: (phone || "").trim(),
    term: (term || "").trim(),
    dueDate: (dueDate || "").trim(),
    amountDue: amount ? parseFloat(amount.trim()) : 0,
  });
}

console.log(`Parsed ${records.length} active customer rows`);

// ─── Map size → plan name (matches pricing-config) ──────────────────────
function planFor(size) {
  switch (size) {
    case "Regular":   return "Basic";
    case "Large":     return "Business";
    case "Corporate": return "Premium";
    default:          return "Basic";
  }
}
function boxTypeFor(size) {
  return size === "Corporate" ? "Business" : "Personal";
}

// ─── Heuristic: extract embedded business name from customer string ──
// e.g. "Roberto Cerletti Jack and Jack LLC" → name="Roberto Cerletti", biz="Jack and Jack LLC"
const BIZ_KEYWORDS = /\b(LLC|L\.L\.C\.|Inc\.?|Corp\.?|Co\.|Ltd\.?|Cafe|Center|Centre|Agency|Studios?|Solutions|Wellness|Performing Arts|Arts Center|Bookcase|Direct Primary|Bar|Arcade|Solehue|Numaade|Nvisionfit|Bookcase Literary|Synthesis|Smith Global)\b/i;
function splitBusiness(raw) {
  const m = raw.match(BIZ_KEYWORDS);
  if (!m) return { name: raw, businessName: null };
  // Try to detect where the business chunk starts. Common shape:
  // "First Last Business Name" — the business chunk usually starts after
  // the first 1-2 words of the personal name. We split on the LAST 2-word
  // capitalized run before the keyword.
  const idx = raw.indexOf(m[0]);
  // Walk back to a likely split point — the previous capitalized word
  // boundary that isn't part of the personal name's first 2 tokens.
  const parts = raw.split(/\s+/);
  if (parts.length <= 2) return { name: raw, businessName: null };
  // Default: assume first 2-3 tokens are personal name; rest is business.
  // Use idx to find which token the keyword sits in.
  let cum = 0;
  let keywordTokenIdx = -1;
  for (let i = 0; i < parts.length; i++) {
    cum += (i === 0 ? 0 : 1) + parts[i].length;
    if (cum >= idx) {
      keywordTokenIdx = i;
      break;
    }
  }
  // Personal name is everything before the business chunk start.
  // We pick the split such that personal name has at least 2 tokens.
  // Heuristic: business name starts at the FIRST capitalized word that
  // creates a remainder with the keyword.
  const splitAt = Math.min(parts.length - 1, Math.max(2, keywordTokenIdx - 1));
  const personal = parts.slice(0, splitAt).join(" ");
  const business = parts.slice(splitAt).join(" ");
  if (!personal.trim()) return { name: raw, businessName: null };
  return { name: personal.trim(), businessName: business.trim() };
}

// ─── Date helper: M/D/YYYY → YYYY-MM-DD ──────────────────────────────────
function isoDate(s) {
  if (!s) return null;
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const month = m[1].padStart(2, "0");
  const day = m[2].padStart(2, "0");
  return `${m[3]}-${month}-${day}`;
}

// ─── Phone normalize ────────────────────────────────────────────────────
function cleanPhone(s) {
  if (!s) return null;
  const digits = s.replace(/\D/g, "");
  if (digits.length === 0) return null;
  if (digits === "5555555555") return null; // placeholder
  // 11-digit starting with 1 → 10-digit
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  // 13-digit starting with 1 (e.g. "13236371221") → 10-digit
  if (digits.length === 13 && digits.startsWith("1")) return digits.slice(3);
  return digits;
}

// ─── Email: synthesize unique placeholder per suite ────────────────────
function emailFor(suite, name) {
  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, ".").replace(/^\.|\.$/g, "");
  return `suite${suite}.${slug.slice(0, 24)}@noho.imported.placeholder`;
}

// ─── PasswordHash — bcrypt-style $2a placeholder ─────────────────────
// We're not using bcrypt at import time — these users can't login. We
// generate a random unguessable hash so the column is populated.
function fakeHash() {
  return "$2a$10$" + randomBytes(40).toString("base64").slice(0, 53);
}

// ─── Compute one-renewal price (just for record-keeping) ─────────────
const PRICES = {
  Basic:    { 3: 5000,  6: 9500,  12: 16000, 1: 1700  },
  Business: { 3: 8000,  6: 15000, 12: 23000, 1: 2500  },
  Premium:  { 3: 9500,  6: 18000, 12: 29500, 1: 3000  },
};
function priceCents(plan, term) {
  const t = parseInt(term, 10);
  return PRICES[plan]?.[t] ?? 0;
}

// ─── Get existing User columns so we can match the schema dynamically ───
async function getColumns() {
  const r = await c.execute(`PRAGMA table_info(User)`);
  return new Set(r.rows.map((row) => row.name));
}

const cols = await getColumns();
console.log(`User table has ${cols.size} columns`);

const REQUIRED = ["id", "email", "passwordHash", "role", "createdAt", "updatedAt"];
for (const r of REQUIRED) {
  if (!cols.has(r)) {
    console.error(`Missing required column on User: ${r}`);
    process.exit(2);
  }
}

// ─── Upsert each row ────────────────────────────────────────────────────
let created = 0,
  updated = 0,
  skipped = 0,
  errors = 0;

for (const r of records) {
  const { name, businessName } = r.size === "Corporate" || /\b(LLC|Inc|Cafe|Arcade|Center|Agency|Bookcase|Wellness|Solutions|Solehue|Synthesis|Numaade|Nvisionfit|Performing Arts)\b/i.test(r.name)
    ? splitBusiness(r.name)
    : { name: r.name, businessName: null };
  const plan = planFor(r.size);
  const boxType = boxTypeFor(r.size);
  const dueDateIso = isoDate(r.dueDate);
  const phone = cleanPhone(r.phone);
  const email = emailFor(r.suite, name || `suite${r.suite}`);
  const id = randomUUID();
  const now = new Date().toISOString();

  // Check existence by suite first
  let existing = null;
  try {
    const rs = await c.execute({
      sql: `SELECT id, email FROM User WHERE suiteNumber = ? LIMIT 1`,
      args: [r.suite],
    });
    if (rs.rows.length > 0) existing = rs.rows[0];
  } catch (e) {
    console.error(`lookup ${r.suite}:`, e.message);
  }

  if (existing) {
    if (DRY) { updated++; continue; }
    try {
      await c.execute({
        sql: `UPDATE User SET
                name = ?,
                phone = COALESCE(?, phone),
                plan = ?,
                planTerm = ?,
                planDueDate = ?,
                mailboxStatus = ?,
                status = ?,
                boxType = ?,
                businessName = ?,
                updatedAt = ?
              WHERE id = ?`,
        args: [
          name || `Suite ${r.suite}`,
          phone,
          plan,
          r.term || null,
          dueDateIso,
          "Active",
          "Active",
          boxType,
          businessName,
          now,
          existing.id,
        ],
      });
      updated++;
    } catch (e) {
      errors++;
      console.error(`update ${r.suite}: ${e.message}`);
    }
  } else {
    if (DRY) { created++; continue; }
    try {
      // Build INSERT dynamically based on which optional columns exist
      const fields = [
        "id", "email", "passwordHash", "name", "role",
        "phone", "plan", "planTerm", "planDueDate",
        "suiteNumber", "mailboxStatus", "status",
        "boxType", "businessName", "createdAt", "updatedAt",
      ].filter((f) => cols.has(f));
      const values = {
        id,
        email,
        passwordHash: fakeHash(),
        name: name || `Suite ${r.suite}`,
        role: "USER",
        phone,
        plan,
        planTerm: r.term || null,
        planDueDate: dueDateIso,
        suiteNumber: r.suite,
        mailboxStatus: "Active",
        status: "Active",
        boxType,
        businessName,
        createdAt: now,
        updatedAt: now,
      };
      const placeholders = fields.map(() => "?").join(", ");
      const args = fields.map((f) => values[f]);
      await c.execute({
        sql: `INSERT INTO User (${fields.join(", ")}) VALUES (${placeholders})`,
        args,
      });
      created++;
    } catch (e) {
      // P2002 → email collision (very unlikely with our scheme), or another constraint
      errors++;
      console.error(`insert ${r.suite} (${name}): ${e.message}`);
    }
  }
}

console.log(`\nDone — created: ${created}, updated: ${updated}, skipped: ${skipped}, errors: ${errors}`);
console.log(`Outstanding past-due amount in roster: $${records.reduce((a, r) => a + (r.amountDue || 0), 0).toFixed(2)}`);
console.log(`Total customers in roster: ${records.length}`);
console.log(`Past-due count: ${records.filter(r => r.status === "Past Due").length}`);
