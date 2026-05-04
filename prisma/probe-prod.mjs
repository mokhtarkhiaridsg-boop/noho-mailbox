#!/usr/bin/env node
// Quick probe — runs the same SELECTs the /dashboard and /admin pages
// run, so we can see which column or table is missing in prod and
// surfacing as "Something went wrong".

import { createClient } from "@libsql/client";
import { config } from "dotenv";
import path from "node:path";

config({ path: path.resolve(process.cwd(), ".env.production.local") });
config({ path: path.resolve(process.cwd(), ".env") });

const url = process.env.TURSO_DATABASE_URL;
const token = process.env.TURSO_AUTH_TOKEN;
if (!url || !token) {
  console.error("Missing TURSO_DATABASE_URL / TURSO_AUTH_TOKEN");
  process.exit(1);
}
const client = createClient({ url, authToken: token });

const tests = [
  ["User.* (full)", `SELECT * FROM User WHERE email='mokhtar.khiari.dsg@gmail.com' LIMIT 1`],
  ["User dashboard cols", `SELECT id, name, email, phone, plan, planTerm, suiteNumber, role, securityDepositCents, securityDepositTotalCents, walletBalanceCents, defaultCardId, totpEnabled, mailboxStatus, kycStatus, planDueDate FROM User LIMIT 1`],
  ["MailItem", `SELECT * FROM MailItem LIMIT 1`],
  ["MailRequest", `SELECT * FROM MailRequest LIMIT 1`],
  ["NotaryBooking", `SELECT * FROM NotaryBooking LIMIT 1`],
  ["DeliveryOrder", `SELECT * FROM DeliveryOrder LIMIT 1`],
  ["ShopOrder", `SELECT * FROM ShopOrder LIMIT 1`],
  ["MessageThread", `SELECT * FROM MessageThread LIMIT 1`],
  ["KeyRequest", `SELECT * FROM KeyRequest LIMIT 1`],
  ["MailerThread", `SELECT * FROM MailerThread LIMIT 1`],
  ["Card", `SELECT * FROM Card LIMIT 1`],
  ["WalletTransaction", `SELECT * FROM WalletTransaction LIMIT 1`],
  ["Invoice", `SELECT * FROM Invoice LIMIT 1`],
  ["AgentConversation", `SELECT * FROM AgentConversation LIMIT 1`],
  ["SuiteTransferRequest", `SELECT * FROM SuiteTransferRequest LIMIT 1`],
];

for (const [name, sql] of tests) {
  try {
    await client.execute(sql);
    console.log("OK  ", name);
  } catch (e) {
    console.error("FAIL", name, "→", e.message);
  }
}
process.exit(0);
