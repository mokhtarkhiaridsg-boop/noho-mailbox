"use server";

// iter-120 — Pinned-notes board: cross-customer view of every CustomerNote
// flagged pinned=true so admin sees critical context up front.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";

export type PinnedNoteRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  suiteNumber: string | null;
  kind: string;
  body: string;
  authorName: string | null;
  createdAtIso: string;
};

export async function listAllPinnedNotes(): Promise<PinnedNoteRow[]> {
  await verifyAdmin();
  // Use the typed accessor (CustomerNote is in the generated client).
  const rows = await prisma.customerNote.findMany({
    where: { pinned: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  if (rows.length === 0) return [];
  const userIds = Array.from(new Set(rows.map((r) => r.userId)));
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, suiteNumber: true },
  });
  const byId = new Map(users.map((u) => [u.id, u] as const));
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: byId.get(r.userId)?.name ?? "(unknown)",
    userEmail: byId.get(r.userId)?.email ?? "(unknown)",
    suiteNumber: byId.get(r.userId)?.suiteNumber ?? null,
    kind: r.kind,
    body: r.body,
    authorName: r.authorName,
    createdAtIso: r.createdAt.toISOString(),
  }));
}

// Browse all customer notes for a single user (pinned first, then chronological).
export async function listUserNotesForBoard(userId: string): Promise<PinnedNoteRow[]> {
  await verifyAdmin();
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, suiteNumber: true },
  });
  if (!u) return [];
  const rows = await prisma.customerNote.findMany({
    where: { userId },
    orderBy: [{ pinned: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  return rows.map((r) => ({
    id: r.id,
    userId: r.userId,
    userName: u.name,
    userEmail: u.email,
    suiteNumber: u.suiteNumber,
    kind: r.kind,
    body: r.body,
    authorName: r.authorName,
    createdAtIso: r.createdAt.toISOString(),
  }));
}

// Light-weight customer search for the "add a note about…" picker.
export async function findCustomersForNote(query: string): Promise<Array<{
  id: string; name: string; email: string; suiteNumber: string | null;
}>> {
  await verifyAdmin();
  const q = query.trim();
  if (q.length < 2) return [];
  const rows = await prisma.user.findMany({
    where: {
      role: "USER",
      OR: [
        { name: { contains: q } },
        { email: { contains: q } },
        { suiteNumber: { contains: q } },
      ],
    },
    take: 8,
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true, suiteNumber: true },
  });
  return rows;
}
