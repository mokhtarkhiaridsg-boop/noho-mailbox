import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.production.local" });
config({ path: ".env" });
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
try {
  const r = await c.execute("SELECT key FROM SiteConfig LIMIT 5");
  console.log("OK SiteConfig has", r.rows.length, "rows. Keys:", r.rows.map(x => x.key).join(", "));
} catch (e) { console.error("FAIL SiteConfig:", e.message); }
