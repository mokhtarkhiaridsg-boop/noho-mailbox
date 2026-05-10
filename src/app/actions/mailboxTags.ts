"use server";

/**
 * iter-193 — Mailbox color-tag system server actions (Tier 13 #102).
 *
 * Admin-only CRUD on the tag library + per-suite assignment surface.
 * Reuses the iter-189 audit pattern (one AuditLog per mutation) and
 * the iter-101/iter-122 suite-lookup heuristic (lookup by suite # OR
 * email so admin can paste either).
 *
 * Two read paths optimized for distinct callers:
 *   - getAllUserTagAssignments() returns Map<userId, tag[]> for the
 *     iter-117 occupancy heatmap (one query, one render pass).
 *   - getUserMailboxTags({userId}) returns assignments+tag for the
 *     drilldown drawer / customer admin view.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { isHexColor } from "@/lib/mailbox-tags";

export type MailboxTagRow = {
  id: string;
  name: string;
  color: string;
  description: string | null;
  assignmentCount: number;
  createdAtIso: string;
};

export type MailboxTagAssignmentRow = {
  id: string;
  tagId: string;
  tagName: string;
  tagColor: string;
  tagDescription: string | null;
  userId: string;
  userName: string;
  userEmail: string;
  suiteNumber: string | null;
  note: string | null;
  createdAtIso: string;
};

async function requireAdmin() {
  const session = await verifySession();
  if (session.role !== "ADMIN") throw new Error("Admin only.");
  return session;
}

export async function listMailboxTags(): Promise<MailboxTagRow[]> {
  await requireAdmin();
  const rows = await prisma.mailboxTag.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { assignments: true } } },
  });
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    description: r.description,
    assignmentCount: r._count.assignments,
    createdAtIso: r.createdAt.toISOString(),
  }));
}

export async function createMailboxTag(input: { name: string; color: string; description?: string }): Promise<{ id?: string; error?: string }> {
  const session = await requireAdmin();
  const name = input.name.trim().slice(0, 60);
  if (name.length < 1) return { error: "Name required." };
  const color = input.color.trim();
  if (!isHexColor(color)) return { error: "Color must be a 6-digit hex like #E70013." };
  const description = input.description?.trim().slice(0, 200) || null;

  const existing = await prisma.mailboxTag.findUnique({ where: { name } });
  if (existing) return { error: `A tag named "${name}" already exists.` };

  const tag = await prisma.mailboxTag.create({
    data: { name, color, description, createdById: session.id! },
  });
  await prisma.auditLog.create({
    data: {
      actorId: session.id!,
      actorRole: "ADMIN",
      action: "mailbox_tag.created",
      entityType: "MailboxTag",
      entityId: tag.id,
      metadata: JSON.stringify({ name, color }),
    },
  });
  revalidatePath("/admin");
  return { id: tag.id };
}

export async function updateMailboxTag(input: { id: string; name?: string; color?: string; description?: string | null }): Promise<{ success?: boolean; error?: string }> {
  const session = await requireAdmin();
  const tag = await prisma.mailboxTag.findUnique({ where: { id: input.id } });
  if (!tag) return { error: "Tag not found." };

  const data: { name?: string; color?: string; description?: string | null } = {};
  if (input.name !== undefined) {
    const n = input.name.trim().slice(0, 60);
    if (n.length < 1) return { error: "Name required." };
    if (n !== tag.name) {
      const dup = await prisma.mailboxTag.findUnique({ where: { name: n } });
      if (dup) return { error: `A tag named "${n}" already exists.` };
    }
    data.name = n;
  }
  if (input.color !== undefined) {
    if (!isHexColor(input.color)) return { error: "Color must be a 6-digit hex." };
    data.color = input.color;
  }
  if (input.description !== undefined) {
    data.description = input.description ? input.description.trim().slice(0, 200) : null;
  }

  await prisma.mailboxTag.update({ where: { id: tag.id }, data });
  await prisma.auditLog.create({
    data: {
      actorId: session.id!,
      actorRole: "ADMIN",
      action: "mailbox_tag.updated",
      entityType: "MailboxTag",
      entityId: tag.id,
      metadata: JSON.stringify(data),
    },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function deleteMailboxTag(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const session = await requireAdmin();
  const tag = await prisma.mailboxTag.findUnique({
    where: { id: input.id },
    include: { _count: { select: { assignments: true } } },
  });
  if (!tag) return { error: "Tag not found." };

  // Cascade is defined on MailboxTagAssignment so this single delete
  // also drops every assignment. We log the count so audit reflects
  // the blast radius.
  const assignmentCount = tag._count.assignments;
  await prisma.mailboxTag.delete({ where: { id: tag.id } });
  await prisma.auditLog.create({
    data: {
      actorId: session.id!,
      actorRole: "ADMIN",
      action: "mailbox_tag.deleted",
      entityType: "MailboxTag",
      entityId: tag.id,
      metadata: JSON.stringify({ name: tag.name, assignmentsDropped: assignmentCount }),
    },
  });
  revalidatePath("/admin");
  return { success: true };
}

// Looks up a user by suite # OR email. Suite-first since admin almost
// always pastes a suite # off the heatmap.
async function resolveUser(input: { userId?: string; suiteNumber?: string; email?: string }): Promise<{ id: string; name: string; email: string; suiteNumber: string | null } | null> {
  if (input.userId) {
    const u = await prisma.user.findUnique({ where: { id: input.userId } });
    return u ? { id: u.id, name: u.name, email: u.email, suiteNumber: u.suiteNumber } : null;
  }
  if (input.suiteNumber) {
    const u = await prisma.user.findUnique({ where: { suiteNumber: input.suiteNumber.trim() } });
    if (u) return { id: u.id, name: u.name, email: u.email, suiteNumber: u.suiteNumber };
  }
  if (input.email) {
    const u = await prisma.user.findUnique({ where: { email: input.email.trim().toLowerCase() } });
    if (u) return { id: u.id, name: u.name, email: u.email, suiteNumber: u.suiteNumber };
  }
  return null;
}

export async function assignMailboxTag(input: { tagId: string; userId?: string; suiteNumber?: string; email?: string; note?: string }): Promise<{ assignmentId?: string; error?: string }> {
  const session = await requireAdmin();
  const tag = await prisma.mailboxTag.findUnique({ where: { id: input.tagId } });
  if (!tag) return { error: "Tag not found." };
  const user = await resolveUser(input);
  if (!user) return { error: "Member not found. Try suite # or email." };

  const note = input.note?.trim().slice(0, 200) || null;

  // Idempotent: if already assigned, just refresh note.
  const existing = await prisma.mailboxTagAssignment.findUnique({
    where: { userId_tagId: { userId: user.id, tagId: tag.id } },
  });
  if (existing) {
    if (note !== existing.note) {
      await prisma.mailboxTagAssignment.update({ where: { id: existing.id }, data: { note } });
    }
    return { assignmentId: existing.id };
  }

  const a = await prisma.mailboxTagAssignment.create({
    data: { userId: user.id, tagId: tag.id, note, createdById: session.id! },
  });
  await prisma.auditLog.create({
    data: {
      actorId: session.id!,
      actorRole: "ADMIN",
      action: "mailbox_tag.assigned",
      entityType: "MailboxTagAssignment",
      entityId: a.id,
      metadata: JSON.stringify({ tagName: tag.name, userId: user.id, userEmail: user.email, suite: user.suiteNumber, note }),
    },
  });
  revalidatePath("/admin");
  return { assignmentId: a.id };
}

export async function unassignMailboxTag(input: { assignmentId: string }): Promise<{ success?: boolean; error?: string }> {
  const session = await requireAdmin();
  const row = await prisma.mailboxTagAssignment.findUnique({
    where: { id: input.assignmentId },
    include: { tag: true, user: true },
  });
  if (!row) return { error: "Assignment not found." };

  await prisma.mailboxTagAssignment.delete({ where: { id: row.id } });
  await prisma.auditLog.create({
    data: {
      actorId: session.id!,
      actorRole: "ADMIN",
      action: "mailbox_tag.unassigned",
      entityType: "MailboxTagAssignment",
      entityId: row.id,
      metadata: JSON.stringify({ tagName: row.tag.name, userId: row.userId, userEmail: row.user.email }),
    },
  });
  revalidatePath("/admin");
  return { success: true };
}

export async function getUserMailboxTags(input: { userId: string }): Promise<MailboxTagAssignmentRow[]> {
  await requireAdmin();
  const rows = await prisma.mailboxTagAssignment.findMany({
    where: { userId: input.userId },
    include: { tag: true, user: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({
    id: r.id,
    tagId: r.tagId,
    tagName: r.tag.name,
    tagColor: r.tag.color,
    tagDescription: r.tag.description,
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
    suiteNumber: r.user.suiteNumber,
    note: r.note,
    createdAtIso: r.createdAt.toISOString(),
  }));
}

export async function listMembersByTag(input: { tagId: string }): Promise<MailboxTagAssignmentRow[]> {
  await requireAdmin();
  const rows = await prisma.mailboxTagAssignment.findMany({
    where: { tagId: input.tagId },
    include: { tag: true, user: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return rows.map((r) => ({
    id: r.id,
    tagId: r.tagId,
    tagName: r.tag.name,
    tagColor: r.tag.color,
    tagDescription: r.tag.description,
    userId: r.userId,
    userName: r.user.name,
    userEmail: r.user.email,
    suiteNumber: r.user.suiteNumber,
    note: r.note,
    createdAtIso: r.createdAt.toISOString(),
  }));
}

export type SuiteTagSummary = {
  userId: string;
  suiteNumber: string | null;
  tags: Array<{ id: string; tagId: string; name: string; color: string; description: string | null; note: string | null }>;
};

// One-shot fetch for the iter-117 heatmap render: returns every
// suite that has at least one tag, keyed by user. Heatmap maps each
// SuiteCell.userId → SuiteTagSummary.
export async function getAllUserTagAssignments(): Promise<SuiteTagSummary[]> {
  await requireAdmin();
  const rows = await prisma.mailboxTagAssignment.findMany({
    include: { tag: true, user: { select: { id: true, suiteNumber: true } } },
    orderBy: { createdAt: "desc" },
  });
  const byUser = new Map<string, SuiteTagSummary>();
  for (const r of rows) {
    let s = byUser.get(r.userId);
    if (!s) {
      s = { userId: r.userId, suiteNumber: r.user.suiteNumber, tags: [] };
      byUser.set(r.userId, s);
    }
    s.tags.push({
      id: r.id,
      tagId: r.tagId,
      name: r.tag.name,
      color: r.tag.color,
      description: r.tag.description,
      note: r.note,
    });
  }
  return Array.from(byUser.values());
}
