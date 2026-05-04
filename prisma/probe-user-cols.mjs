import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.production.local" });
config({ path: ".env" });
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const r = await c.execute("PRAGMA table_info(User)");
const cols = r.rows.map(x => x.name);
console.log("User columns ("+cols.length+"):");
console.log(cols.join(", "));
