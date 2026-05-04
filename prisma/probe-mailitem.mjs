import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.production.local" });
config({ path: ".env" });
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
for (const t of ["MailItem","Card","DeliveryOrder","Invoice","ShippoLabel","NotaryBooking","ForwardingAddress","MessageThread","Notification","DocumentVaultItem"]) {
  const r = await c.execute(`PRAGMA table_info(${t})`);
  const cols = r.rows.map(x => x.name);
  console.log(t, "→", cols.length, "cols:", cols.join(","));
}
