import { createClient } from "@libsql/client";
import { config } from "dotenv";
config({ path: ".env.production.local" });
config({ path: ".env" });
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
for (const t of ["Card","DeliveryOrder","DocumentVaultItem","ForwardingAddress","Invoice","KeyRequest","MailItem","MailItemTrackingState","MessageThread","NotaryBooking","Notification","ShippoLabel","User","WalletTransaction"]) {
  try { await c.execute(`SELECT * FROM ${t} LIMIT 1`); console.log("OK", t); }
  catch (e) { console.error("FAIL", t, "→", e.message); }
}
