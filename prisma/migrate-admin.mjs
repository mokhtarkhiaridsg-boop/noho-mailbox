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

// Phase 3 — Shippo Labels + Label Uploads
const phase3 = [
  `CREATE TABLE IF NOT EXISTS ShippoLabel (
    id TEXT PRIMARY KEY,
    userId TEXT,
    mailItemId TEXT,
    deliveryOrderId TEXT,
    transactionId TEXT UNIQUE NOT NULL,
    shipmentId TEXT NOT NULL,
    carrier TEXT NOT NULL,
    servicelevel TEXT NOT NULL,
    trackingNumber TEXT NOT NULL,
    trackingUrl TEXT NOT NULL,
    labelUrl TEXT NOT NULL,
    amountPaid REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    labelFormat TEXT NOT NULL DEFAULT 'PDF',
    status TEXT NOT NULL DEFAULT 'purchased',
    toName TEXT NOT NULL,
    toStreet TEXT NOT NULL,
    toCity TEXT NOT NULL,
    toState TEXT NOT NULL,
    toZip TEXT NOT NULL,
    lengthIn REAL,
    widthIn REAL,
    heightIn REAL,
    weightOz REAL,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    refundedAt DATETIME,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE SET NULL
  )`,
  `CREATE TABLE IF NOT EXISTS LabelUpload (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    filename TEXT NOT NULL,
    url TEXT NOT NULL,
    carrier TEXT,
    trackingNum TEXT,
    notes TEXT,
    status TEXT NOT NULL DEFAULT 'uploaded',
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,
];

for (const sql of phase3) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 3 migration done.");

// Phase 4 — Notifications
const phase4 = [
  `CREATE TABLE IF NOT EXISTS Notification (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    type TEXT NOT NULL,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    read INTEGER NOT NULL DEFAULT 0,
    link TEXT,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    readAt DATETIME,
    FOREIGN KEY (userId) REFERENCES User(id) ON DELETE CASCADE
  )`,
];

for (const sql of phase4) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 4 migration done.");

// Phase 4b — Referral program
const phase4b = [
  `CREATE TABLE IF NOT EXISTS Referral (
    id TEXT PRIMARY KEY,
    referrerId TEXT NOT NULL,
    refereeId TEXT,
    code TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    creditCents INTEGER NOT NULL DEFAULT 1000,
    createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    creditedAt DATETIME,
    FOREIGN KEY (referrerId) REFERENCES User(id) ON DELETE CASCADE
  )`,
];

for (const sql of phase4b) {
  try {
    await client.execute(sql);
    console.log("OK:", sql.slice(0, 60));
  } catch (e) {
    if (e.message?.includes("already exists")) {
      console.log("SKIP:", sql.slice(0, 60));
    } else {
      console.error("ERR:", e.message);
    }
  }
}
console.log("Phase 4b migration done.");
