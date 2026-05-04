#!/usr/bin/env node
/**
 * Apply agent schema changes to Turso.
 * Idempotent: uses CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
 *
 * Tables added: AgentConversation, AgentMessage, AgentMemory.
 *
 * Usage: set -a && source .env && set +a && node scripts/migrate-agent.mjs
 */
import "dotenv/config";
import { createClient } from "@libsql/client";

const c = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

const STATEMENTS = [
  `CREATE TABLE IF NOT EXISTS AgentConversation (
    id          TEXT PRIMARY KEY,
    ownerId     TEXT NOT NULL,
    title       TEXT,
    archivedAt  DATETIME,
    createdAt   DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
    updatedAt   DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
    FOREIGN KEY (ownerId) REFERENCES User(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS AgentConversation_owner_updated
    ON AgentConversation(ownerId, updatedAt)`,

  `CREATE TABLE IF NOT EXISTS AgentMessage (
    id              TEXT PRIMARY KEY,
    conversationId  TEXT NOT NULL,
    role            TEXT NOT NULL,
    content         TEXT NOT NULL,
    toolName        TEXT,
    toolInput       TEXT,
    toolResult      TEXT,
    toolStatus      TEXT,
    toolError       TEXT,
    inputTokens     INTEGER,
    outputTokens    INTEGER,
    cacheReadTokens INTEGER,
    createdAt       DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
    FOREIGN KEY (conversationId) REFERENCES AgentConversation(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS AgentMessage_conv_created
    ON AgentMessage(conversationId, createdAt)`,
  `CREATE INDEX IF NOT EXISTS AgentMessage_status
    ON AgentMessage(toolStatus)`,

  `CREATE TABLE IF NOT EXISTS AgentMemory (
    id        TEXT PRIMARY KEY,
    scope     TEXT NOT NULL DEFAULT 'global',
    key       TEXT NOT NULL,
    body      TEXT NOT NULL,
    pinned    INTEGER NOT NULL DEFAULT 0,
    createdAt DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL,
    updatedAt DATETIME DEFAULT (CURRENT_TIMESTAMP) NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS AgentMemory_scope_key ON AgentMemory(scope, key)`,
  `CREATE INDEX IF NOT EXISTS AgentMemory_pinned ON AgentMemory(pinned)`,
];

let okCount = 0;
let errCount = 0;
for (const sql of STATEMENTS) {
  try {
    await c.execute(sql);
    const head = sql.split("\n")[0].slice(0, 70);
    console.log("OK   ", head);
    okCount++;
  } catch (e) {
    console.error("ERR  ", sql.split("\n")[0].slice(0, 70), "—", e.message);
    errCount++;
  }
}
console.log(`\nApplied ${okCount} statements (${errCount} errors)`);
