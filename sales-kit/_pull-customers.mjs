// Pull the prioritized sales-outreach lists from Turso.
// Run with: set -a && source .env && set +a && node sales-kit/_pull-customers.mjs
//
// Outputs three CSVs (gitignored) into sales-kit/:
//   _customers-business-tier.csv   — Business-plan, active
//   _customers-premium-tier.csv    — Premium-plan, active
//   _customers-all-active.csv      — every active customer (for the referral campaign)
//
// PII never leaves the local box; the .gitignore prevents commits.

import { createClient } from "@libsql/client";
import { writeFileSync } from "node:fs";

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!url || !authToken) {
  console.error("Missing TURSO_DATABASE_URL or TURSO_AUTH_TOKEN. Source .env first.");
  process.exit(1);
}

const c = createClient({ url, authToken });

function csvEscape(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (s.includes(",") || s.includes("\n") || s.includes('"')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function rowsToCsv(rows, columns) {
  const header = columns.join(",");
  const body = rows
    .map((r) => columns.map((col) => csvEscape(r[col])).join(","))
    .join("\n");
  return header + "\n" + body + "\n";
}

const COLS = [
  "id",
  "name",
  "email",
  "phone",
  "plan",
  "planTerm",
  "boxType",
  "businessName",
  "suiteNumber",
  "planExpiresAt",
  "createdAt",
];

async function pull(label, where) {
  const sql = `
    SELECT id, name, email, phone, plan, planTerm, boxType, businessName,
           suiteNumber, planExpiresAt, createdAt
    FROM User
    WHERE ${where}
    ORDER BY createdAt DESC
  `;
  const r = await c.execute(sql);
  console.log(`${label}: ${r.rows.length} rows`);
  return r.rows;
}

const businessTier = await pull(
  "Business-tier active",
  `plan = 'Business' AND (planExpiresAt IS NULL OR planExpiresAt > strftime('%s','now') * 1000)`,
);
const premiumTier = await pull(
  "Premium-tier active",
  `plan = 'Premium' AND (planExpiresAt IS NULL OR planExpiresAt > strftime('%s','now') * 1000)`,
);
const allActive = await pull(
  "All active",
  `(plan IS NOT NULL AND plan != '') AND (planExpiresAt IS NULL OR planExpiresAt > strftime('%s','now') * 1000)`,
);

writeFileSync(
  new URL("./_customers-business-tier.csv", import.meta.url),
  rowsToCsv(businessTier, COLS),
);
writeFileSync(
  new URL("./_customers-premium-tier.csv", import.meta.url),
  rowsToCsv(premiumTier, COLS),
);
writeFileSync(
  new URL("./_customers-all-active.csv", import.meta.url),
  rowsToCsv(allActive, COLS),
);

console.log("\nWrote 3 CSVs into sales-kit/. They are gitignored.");
console.log("Use them with the campaigns in 08-customer-upsell.md.");
