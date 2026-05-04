import { createClient } from "@libsql/client";

const client = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Add the missing nullable TEXT column
await client.execute(`ALTER TABLE User ADD COLUMN totpRecoveryCodes TEXT`);

console.log("✓ Added totpRecoveryCodes column to User");

// Verify
const r = await client.execute(`PRAGMA table_info(User)`);
const found = r.rows.find((row) => row.name === "totpRecoveryCodes");
console.log("Verified:", found);
