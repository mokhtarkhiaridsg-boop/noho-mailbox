import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.production.local" });
config({ path: ".env" });
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const r = await c.execute(`SELECT id, email, role, plan, mailboxStatus, totpEnabled FROM User WHERE email IN ('mokhtar.khiari.dsg@gmail.com','jnscanlon15@gmail.com','admin@noho.com','nohomailbox@gmail.com')`);
for (const row of r.rows) console.log(row);
