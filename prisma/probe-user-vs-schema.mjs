import { createClient } from "@libsql/client";
import { config } from "dotenv";
import { readFileSync } from "node:fs";
config({ path: ".env.production.local" });
config({ path: ".env" });
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
const r = await c.execute("PRAGMA table_info('User')");
const prodCols = new Set(r.rows.map(x => x.name));

// Parse schema.prisma User model fields — keep only SCALAR cols (relations are uppercase types)
const schema = readFileSync("prisma/schema.prisma", "utf8");
const userBlock = schema.match(/model User \{([\s\S]*?)\n\}/)?.[1] ?? "";
const schemaCols = new Set();
const SCALAR = /^(String|Int|Float|Boolean|DateTime|Bytes|Decimal|BigInt|Json)\??(\s|$)/;
for (const line of userBlock.split("\n")) {
  const m = line.match(/^\s+(\w+)\s+(\S+)/);
  if (!m) continue;
  const [, col, type] = m;
  if (col === "id") { schemaCols.add(col); continue; }
  if (!SCALAR.test(type)) continue;
  schemaCols.add(col);
}
const missing = [...schemaCols].filter(c => !prodCols.has(c));
console.log("Schema scalar cols:", schemaCols.size);
console.log("Prod cols:", prodCols.size);
console.log("MISSING in prod:");
for (const m of missing) {
  // Find type
  const line = userBlock.split("\n").find(l => l.match(new RegExp(`^\\s+${m}\\s+`)));
  console.log("  -", m, "(", line?.trim(), ")");
}
