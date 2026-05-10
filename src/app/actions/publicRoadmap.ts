"use server";

/**
 * iter-226 — Public roadmap voting (Tier 16 #135).
 *
 * Three audiences:
 *   - Public: list active items + vote counts (auth-aware: shows
 *     whether the current user voted)
 *   - Member: cast/remove vote (one per item, idempotent)
 *   - Admin: CRUD items + status transitions
 *
 * Audit: `roadmap.{added,updated,removed,voted,unvoted}` per action.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { headers } from "next/headers";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

const VALID_STATUSES = new Set(["Idea", "Planned", "InProgress", "Shipped", "Declined"]);

export type RoadmapItemRow = {
  id: string;
  title: string;
  description: string;
  category: string | null;
  status: "Idea" | "Planned" | "InProgress" | "Shipped" | "Declined";
  position: number;
  shippedIter: number | null;
  voteCount: number;
  iVoted: boolean;             // when caller is signed in + voted on this item
  createdAtIso: string;
};

function asStatus(s: string): RoadmapItemRow["status"] {
  if (s === "Planned" || s === "InProgress" || s === "Shipped" || s === "Declined") return s;
  return "Idea";
}

// Best-effort session lookup that doesn't throw for anonymous visitors —
// we want public visibility but want to render "✓ You voted" when signed in.
async function maybeUserId(): Promise<string | null> {
  try {
    const c = await cookies();
    void c; // typed dance — actual session-cookie name varies; rely on verifySession
    const { verifySession } = await import("@/lib/dal");
    const s = await verifySession().catch(() => null);
    return s?.id ?? null;
  } catch { return null; }
}

export async function listRoadmapItems(input: { status?: string } = {}): Promise<RoadmapItemRow[]> {
  // PUBLIC — but we want to know if the caller is signed in to mark
  // their own votes. Don't gate the read on auth.
  const where: { status?: string | { in: string[] } } = {};
  if (input.status && VALID_STATUSES.has(input.status)) where.status = input.status;
  else where.status = { in: ["Idea", "Planned", "InProgress"] };  // public list hides Shipped + Declined by default

  const rows = await prisma.roadmapItem.findMany({
    where, orderBy: [{ position: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { votes: true } } },
    take: 200,
  }).catch(() => []);

  const userId = await maybeUserId();
  let myVotes = new Set<string>();
  if (userId && rows.length > 0) {
    const v = await prisma.roadmapVote.findMany({
      where: { userId, roadmapItemId: { in: rows.map((r) => r.id) } },
      select: { roadmapItemId: true },
    }).catch(() => []);
    myVotes = new Set(v.map((x) => x.roadmapItemId));
  }

  // Sort: position desc → vote count desc → recency desc
  const composed = rows.map((r) => ({
    id: r.id, title: r.title, description: r.description,
    category: r.category,
    status: asStatus(r.status),
    position: r.position,
    shippedIter: r.shippedIter,
    voteCount: r._count.votes,
    iVoted: myVotes.has(r.id),
    createdAtIso: r.createdAt.toISOString(),
  }));
  composed.sort((a, b) => b.position - a.position || b.voteCount - a.voteCount || b.createdAtIso.localeCompare(a.createdAtIso));
  return composed;
}

export async function castRoadmapVote(input: { itemId: string }): Promise<{ success?: boolean; voteCount?: number; error?: string }> {
  const userId = await maybeUserId();
  if (!userId) return { error: "Sign in to vote." };
  const item = await prisma.roadmapItem.findUnique({ where: { id: input.itemId } });
  if (!item) return { error: "Item not found." };
  if (item.status === "Shipped" || item.status === "Declined") return { error: "Voting closed for this item." };

  // Idempotent upsert via unique constraint.
  try {
    await prisma.roadmapVote.upsert({
      where: { roadmapItemId_userId: { roadmapItemId: item.id, userId } },
      create: { roadmapItemId: item.id, userId },
      update: {},
    });
  } catch { /* swallow race */ }

  await prisma.auditLog.create({
    data: {
      actorId: userId, actorRole: "MEMBER",
      action: "roadmap.voted",
      entityType: "RoadmapItem", entityId: item.id,
      metadata: JSON.stringify({ title: item.title }),
    },
  }).catch(() => null);

  const count = await prisma.roadmapVote.count({ where: { roadmapItemId: item.id } });
  revalidatePath("/roadmap");
  return { success: true, voteCount: count };
}

export async function removeRoadmapVote(input: { itemId: string }): Promise<{ success?: boolean; voteCount?: number; error?: string }> {
  const userId = await maybeUserId();
  if (!userId) return { error: "Sign in to manage votes." };
  await prisma.roadmapVote.delete({
    where: { roadmapItemId_userId: { roadmapItemId: input.itemId, userId } },
  }).catch(() => null);
  await prisma.auditLog.create({
    data: {
      actorId: userId, actorRole: "MEMBER",
      action: "roadmap.unvoted",
      entityType: "RoadmapItem", entityId: input.itemId,
      metadata: JSON.stringify({}),
    },
  }).catch(() => null);
  const count = await prisma.roadmapVote.count({ where: { roadmapItemId: input.itemId } });
  revalidatePath("/roadmap");
  return { success: true, voteCount: count };
}

// ─── Admin CRUD ────────────────────────────────────────────────────────

export async function adminAddRoadmapItem(input: { title: string; description: string; category?: string; status?: string; position?: number }): Promise<{ id?: string; error?: string }> {
  const actor = await verifyAdmin();
  const title = input.title.trim().slice(0, 80);
  const description = input.description.trim().slice(0, 500);
  if (title.length < 1 || description.length < 5) return { error: "Title + description required." };
  const status = input.status && VALID_STATUSES.has(input.status) ? input.status : "Idea";
  const created = await prisma.roadmapItem.create({
    data: {
      title, description, category: input.category?.trim().slice(0, 40) || null,
      status, position: Math.floor(input.position ?? 0),
      createdById: actor.id,
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "roadmap.added",
      entityType: "RoadmapItem", entityId: created.id,
      metadata: JSON.stringify({ title, status }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  revalidatePath("/roadmap");
  return { id: created.id };
}

export async function adminUpdateRoadmapItem(input: { id: string; title?: string; description?: string; category?: string | null; status?: string; position?: number; shippedIter?: number | null }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const item = await prisma.roadmapItem.findUnique({ where: { id: input.id } });
  if (!item) return { error: "Item not found." };
  const data: { title?: string; description?: string; category?: string | null; status?: string; position?: number; shippedIter?: number | null } = {};
  if (input.title !== undefined) data.title = input.title.trim().slice(0, 80);
  if (input.description !== undefined) data.description = input.description.trim().slice(0, 500);
  if (input.category !== undefined) data.category = input.category ? input.category.trim().slice(0, 40) : null;
  if (input.status !== undefined && VALID_STATUSES.has(input.status)) data.status = input.status;
  if (input.position !== undefined) data.position = Math.floor(input.position);
  if (input.shippedIter !== undefined) data.shippedIter = input.shippedIter;
  await prisma.roadmapItem.update({ where: { id: item.id }, data });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "roadmap.updated",
      entityType: "RoadmapItem", entityId: item.id,
      metadata: JSON.stringify({ changed: Object.keys(data) }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  revalidatePath("/roadmap");
  return { success: true };
}

export async function adminRemoveRoadmapItem(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const item = await prisma.roadmapItem.findUnique({ where: { id: input.id } });
  if (!item) return { error: "Item not found." };
  await prisma.roadmapItem.delete({ where: { id: item.id } });
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: "ADMIN",
      action: "roadmap.removed",
      entityType: "RoadmapItem", entityId: item.id,
      metadata: JSON.stringify({ title: item.title }),
    },
  }).catch(() => null);
  revalidatePath("/admin");
  revalidatePath("/roadmap");
  return { success: true };
}

export async function listRoadmapAllForAdmin(): Promise<RoadmapItemRow[]> {
  await verifyAdmin();
  const rows = await prisma.roadmapItem.findMany({
    orderBy: [{ status: "asc" }, { position: "desc" }, { createdAt: "desc" }],
    include: { _count: { select: { votes: true } } },
  });
  return rows.map((r) => ({
    id: r.id, title: r.title, description: r.description, category: r.category,
    status: asStatus(r.status), position: r.position, shippedIter: r.shippedIter,
    voteCount: r._count.votes, iVoted: false, createdAtIso: r.createdAt.toISOString(),
  }));
}

void headers;        // silence unused-import warning if we expand later
