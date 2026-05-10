import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.production.local" });
config({ path: ".env" });
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

// 1. Confirm User.locale exists
const cols = await c.execute("PRAGMA table_info('User')");
const hasLocale = cols.rows.some(x => x.name === "locale");
console.log("User.locale present:", hasLocale);

// 2. Stuck rows backfilled?
const stuck = await c.execute("SELECT count(*) as n FROM SquareSyncLog WHERE status='running' AND completedAt IS NULL");
console.log("Stuck running rows:", stuck.rows[0].n, "(should be 0)");

// 3. Latest 5 sync log entries
const recent = await c.execute("SELECT syncType, status, itemsSynced, datetime(startedAt,'unixepoch') as started, datetime(completedAt,'unixepoch') as completed, errors FROM SquareSyncLog ORDER BY startedAt DESC LIMIT 5");
console.log("Recent 5 sync logs:");
for (const r of recent.rows) console.log("  ", r);

// 4. Payment count
const pmt = await c.execute("SELECT count(*) as n, max(squareCreatedAt) as latest FROM Payment");
console.log("Payments:", pmt.rows[0].n, "rows, latest:", pmt.rows[0].latest);
