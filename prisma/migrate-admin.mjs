import { createClient } from "@libsql/client";
import { config } from "dotenv";
config();

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const stmts = [
  `ALTER TABLE User ADD COLUMN cardLast4 TEXT`,
  `ALTER TABLE User ADD COLUMN cardBrand TEXT`,
  `ALTER TABLE User ADD COLUMN cardExpiry TEXT`,
  `ALTER TABLE User ADD COLUMN cardholderName TEXT`,
  `ALTER TABLE User ADD COLUMN cardDiscountPct INTEGER NOT NULL DEFAULT 0`,
  `CREATE TABLE IF NOT EXISTS SiteConfig (key TEXT PRIMARY KEY, value TEXT NOT NULL, updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP)`,
];

for (const sql of stmts) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("duplicate column") || e.message?.includes("already exists")) {
      console.log("SKIP (already exists):", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message, "| SQL:", sql);
    }
  }
}
console.log("Done.");
