import Database from "better-sqlite3";
import path from "path";
const db = new Database(path.join(process.cwd(), "prisma/dev.db"));
const cols = ["cardLast4 TEXT", "cardBrand TEXT", "cardExpiry TEXT", "cardholderName TEXT", "cardDiscountPct INTEGER DEFAULT 0"];
for (const col of cols) {
  try { db.exec(`ALTER TABLE User ADD COLUMN ${col}`); } catch {}
}
try {
  db.exec(`CREATE TABLE IF NOT EXISTS SiteConfig (key TEXT PRIMARY KEY, value TEXT NOT NULL, updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP)`);
} catch {}
console.log("Local migration done");
db.close();
