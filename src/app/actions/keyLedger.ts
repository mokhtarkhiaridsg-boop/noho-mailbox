"use server";

// iter-95 — Mailbox-key audit ledger.
//
// Reads off the existing AuditLog rows that customerOps.ts already
// writes for key.add / key.issue / key.return / key.lost / key.retire.
// No new schema needed.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";

export type KeyInventoryRow = {
  id: string;
  keyTag: string;
  suiteNumber: string;
  status: string;
  issuedToId: string | null;
  issuedToName: string | null;
  issuedAtIso: string | null;
  returnedAtIso: string | null;
  notes: string | null;
  createdAtIso: string;
  // Latest audit event for the key, joined in.
  lastAction: string | null;
  lastActionAtIso: string | null;
};

// Whole inventory + the last event per key. Powers the AdminKeyLedgerPanel
// table — admin sees current status, who has it, and when something last
// happened, all in one row.
export async function getKeyInventoryWithLastEvent(): Promise<KeyInventoryRow[]> {
  await verifyAdmin();

  const keys = await prisma.mailboxKey.findMany({
    orderBy: [{ status: "asc" }, { keyTag: "asc" }],
    select: {
      id: true,
      keyTag: true,
      suiteNumber: true,
      status: true,
      issuedToId: true,
      issuedAt: true,
      returnedAt: true,
      notes: true,
      createdAt: true,
    },
  });
  const ids = keys.map((k) => k.id);
  const userIds = keys.map((k) => k.issuedToId).filter((id): id is string => Boolean(id));

  const [users, lastEvents] = await Promise.all([
    userIds.length === 0 ? [] : prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, suiteNumber: true },
    }),
    ids.length === 0 ? [] : prisma.auditLog.findMany({
      where: { entityType: "MailboxKey", entityId: { in: ids } },
      orderBy: { createdAt: "desc" },
      select: { entityId: true, action: true, createdAt: true },
    }),
  ]);

  const userById = new Map(users.map((u) => [u.id, u] as const));
  // Pull the first (= newest, due to desc) event per key id.
  const lastByKey = new Map<string, { action: string; createdAt: Date }>();
  for (const e of lastEvents) {
    if (!e.entityId) continue;
    if (!lastByKey.has(e.entityId)) {
      lastByKey.set(e.entityId, { action: e.action, createdAt: e.createdAt });
    }
  }

  return keys.map((k) => {
    const u = k.issuedToId ? userById.get(k.issuedToId) : undefined;
    const last = lastByKey.get(k.id);
    return {
      id: k.id,
      keyTag: k.keyTag,
      suiteNumber: k.suiteNumber,
      status: k.status,
      issuedToId: k.issuedToId,
      issuedToName: u?.name ?? null,
      issuedAtIso: k.issuedAt?.toISOString() ?? null,
      returnedAtIso: k.returnedAt?.toISOString() ?? null,
      notes: k.notes,
      createdAtIso: k.createdAt.toISOString(),
      lastAction: last?.action ?? null,
      lastActionAtIso: last?.createdAt.toISOString() ?? null,
    };
  });
}

// Full timeline for a single key. Used by the per-key drawer.
export async function getKeyHistory(keyId: string): Promise<{
  key: KeyInventoryRow | null;
  events: Array<{ id: string; action: string; createdAtIso: string; actorId: string; actorRole: string; metadata: string | null; actorName: string | null }>;
}> {
  await verifyAdmin();
  const key = await prisma.mailboxKey.findUnique({
    where: { id: keyId },
    select: {
      id: true,
      keyTag: true,
      suiteNumber: true,
      status: true,
      issuedToId: true,
      issuedAt: true,
      returnedAt: true,
      notes: true,
      createdAt: true,
    },
  });
  if (!key) return { key: null, events: [] };

  const [events, issuedToUser] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entityType: "MailboxKey", entityId: keyId },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: { id: true, action: true, createdAt: true, actorId: true, actorRole: true, metadata: true },
    }),
    key.issuedToId ? prisma.user.findUnique({
      where: { id: key.issuedToId },
      select: { name: true },
    }) : Promise.resolve(null),
  ]);

  const actorIds = Array.from(new Set(events.map((e) => e.actorId)));
  const actors = actorIds.length === 0
    ? []
    : await prisma.user.findMany({
        where: { id: { in: actorIds } },
        select: { id: true, name: true },
      });
  const actorById = new Map(actors.map((a) => [a.id, a] as const));

  return {
    key: {
      id: key.id,
      keyTag: key.keyTag,
      suiteNumber: key.suiteNumber,
      status: key.status,
      issuedToId: key.issuedToId,
      issuedToName: issuedToUser?.name ?? null,
      issuedAtIso: key.issuedAt?.toISOString() ?? null,
      returnedAtIso: key.returnedAt?.toISOString() ?? null,
      notes: key.notes,
      createdAtIso: key.createdAt.toISOString(),
      lastAction: events[0]?.action ?? null,
      lastActionAtIso: events[0]?.createdAt.toISOString() ?? null,
    },
    events: events.map((e) => ({
      id: e.id,
      action: e.action,
      createdAtIso: e.createdAt.toISOString(),
      actorId: e.actorId,
      actorRole: e.actorRole,
      metadata: e.metadata,
      actorName: actorById.get(e.actorId)?.name ?? null,
    })),
  };
}

// Per-customer view — every key event involving them (was issued, was
// returned, was lost on their watch, etc.).
export async function getCustomerKeyHistory(userId: string): Promise<{
  events: Array<{ id: string; action: string; createdAtIso: string; metadata: string | null; entityId: string | null }>;
}> {
  await verifyAdmin();
  // We can't FK-query because the user-side reference lives in audit
  // metadata JSON. Pull all key events + filter client-side. (For a
  // bureau with thousands of keys this could grow — for now adequate.)
  const events = await prisma.auditLog.findMany({
    where: { entityType: "MailboxKey" },
    orderBy: { createdAt: "desc" },
    take: 1000,
    select: { id: true, action: true, createdAt: true, metadata: true, entityId: true },
  });
  const filtered = events.filter((e) => {
    if (!e.metadata) return false;
    try {
      const j = JSON.parse(e.metadata);
      return j.userId === userId;
    } catch { return false; }
  });
  return {
    events: filtered.map((e) => ({
      id: e.id,
      action: e.action,
      createdAtIso: e.createdAt.toISOString(),
      metadata: e.metadata,
      entityId: e.entityId,
    })),
  };
}
