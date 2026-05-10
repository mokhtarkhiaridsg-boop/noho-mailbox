import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.production.local" });
config({ path: ".env" });
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const r = await c.execute("SELECT syncType, status, itemsSynced, startedAt, completedAt FROM SquareSyncLog ORDER BY startedAt DESC LIMIT 10");
for (const row of r.rows) console.log(row);
