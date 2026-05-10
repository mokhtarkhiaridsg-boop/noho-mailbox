import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.production.local" });
config({ path: ".env" });
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });

const recent = await c.execute("SELECT syncType, status, itemsSynced, datetime(startedAt,'unixepoch') as started, datetime(completedAt,'unixepoch') as completed, errors FROM SquareSyncLog ORDER BY startedAt DESC LIMIT 10");
console.log("Latest 10 sync logs:");
for (const r of recent.rows) console.log("  ", JSON.stringify(r));

const pmt = await c.execute("SELECT count(*) as n, max(squareCreatedAt) as latest FROM Payment");
console.log("\nPayments table:", pmt.rows[0].n, "rows, latest:", pmt.rows[0].latest);

const stuck = await c.execute("SELECT count(*) as n FROM SquareSyncLog WHERE status='running' AND completedAt IS NULL");
console.log("Stuck running rows:", stuck.rows[0].n, "(should be 0)");
