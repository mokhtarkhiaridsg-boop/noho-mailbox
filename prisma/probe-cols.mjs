import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.production.local" });
config({ path: ".env" });
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
for (const t of ["POSSale", "POSLineItem"]) {
  const r = await c.execute(`PRAGMA table_info(${t})`);
  console.log("==", t, "==");
  for (const row of r.rows) console.log("  ", row.name);
}
