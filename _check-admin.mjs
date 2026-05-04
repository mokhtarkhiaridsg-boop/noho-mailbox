import { createClient } from "@libsql/client";
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const r = await c.execute("SELECT id, email, password, plan FROM User WHERE email = 'admin@noho.com'");
console.log(JSON.stringify(r.rows[0], null, 2));
