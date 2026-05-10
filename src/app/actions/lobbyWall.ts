"use server";

/**
 * iter-207 — Lobby selfie wall server actions (Tier 15 #116).
 *
 * Three audiences:
 *   - Member: opt-in (creates Pending entry) + revoke (flips own
 *     entry to Removed). Can re-opt-in by replacing the photo.
 *   - Admin: review queue + approve / remove with audit log.
 *   - Public: getActiveLobbyWallEntries returns Approved entries for
 *     the /wall route + the iter-195 lobby kiosk loop. PII-light:
 *     first name + suite # + joined year only.
 *
 * Audit: `lobby_wall.{opted_in,revoked,approved,removed}` per action.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

const VALID_STATUSES = new Set(["Pending", "Approved", "Removed"]);

export type LobbyWallEntryView = {
  id: string;
  userId: string;
  photoUrl: string;
  displayName: string;
  suiteNumber: string | null;
  joinedYear: number;
  status: "Pending" | "Approved" | "Removed";
  consentedAtIso: string;
  reviewedAtIso: string | null;
  removedReason: string | null;
  createdAtIso: string;
};

export type PublicLobbyWallEntry = {
  id: string;
  photoUrl: string;
  displayName: string;
  suiteNumber: string | null;
  joinedYear: number;
};

function asStatus(s: string): LobbyWallEntryView["status"] {
  if (s === "Approved" || s === "Removed") return s;
  return "Pending";
}

function toView(r: { id: string; userId: string; photoUrl: string; displayName: string; suiteNumber: string | null; joinedYear: number; status: string; consentedAt: Date; reviewedAt: Date | null; removedReason: string | null; createdAt: Date }): LobbyWallEntryView {
  return {
    id: r.id, userId: r.userId, photoUrl: r.photoUrl, displayName: r.displayName,
    suiteNumber: r.suiteNumber, joinedYear: r.joinedYear, status: asStatus(r.status),
    consentedAtIso: r.consentedAt.toISOString(),
    reviewedAtIso: r.reviewedAt?.toISOString() ?? null,
    removedReason: r.removedReason, createdAtIso: r.createdAt.toISOString(),
  };
}

// ─── Member ────────────────────────────────────────────────────────────

export async function getMyLobbyWallEntry(): Promise<LobbyWallEntryView | null> {
  const session = await verifySession();
  const userId = session.id!;
  const row = await prisma.lobbyWallEntry.findFirst({
    where: { userId, status: { in: ["Pending", "Approved"] } },
    orderBy: { createdAt: "desc" },
  });
  return row ? toView(row) : null;
}

export async function optInToLobbyWall(input: { photoUrl: string; displayName?: string }): Promise<{ row?: LobbyWallEntryView; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const photoUrl = input.photoUrl.trim();
  if (!/^https?:\/\//i.test(photoUrl)) return { error: "Photo URL must be https://." };
  if (photoUrl.length > 600) return { error: "Photo URL too long." };

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { name: true, suiteNumber: true, mailboxAssignedAt: true, createdAt: true },
  });
  if (!user) return { error: "User not found." };

  const displayName = (input.displayName?.trim() || user.name.split(/\s+/)[0] || user.name).slice(0, 40);
  const joinedYear = (user.mailboxAssignedAt ?? user.createdAt).getUTCFullYear();

  // If the member already has a Pending or Approved entry, replace it
  // (treat as a photo update). Removing the old entry preserves audit.
  const existing = await prisma.lobbyWallEntry.findFirst({
    where: { userId, status: { in: ["Pending", "Approved"] } },
  });

  let createdRow;
  if (existing) {
    await prisma.$transaction([
      prisma.lobbyWallEntry.update({
        where: { id: existing.id },
        data: { status: "Removed", removedReason: "replaced_by_member", reviewedAt: new Date() },
      }),
    ]);
  }
  createdRow = await prisma.lobbyWallEntry.create({
    data: {
      userId, photoUrl, displayName,
      suiteNumber: user.suiteNumber ?? null,
      joinedYear, status: "Pending",
    },
  });
  await prisma.auditLog.create({
    data: {
      actorId: userId, actorRole: session.role ?? "MEMBER",
      action: "lobby_wall.opted_in",
      entityType: "LobbyWallEntry", entityId: createdRow.id,
      metadata: JSON.stringify({ replacedExisting: !!existing, displayName, joinedYear }),
    },
  }).catch(() => null);
  revalidatePath("/dashboard");
  revalidatePath("/wall");
  revalidatePath("/lobby");
  return { row: toView(createdRow) };
}

export async function revokeMyLobbyWallEntry(): Promise<{ success?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const row = await prisma.lobbyWallEntry.findFirst({
    where: { userId, status: { in: ["Pending", "Approved"] } },
    orderBy: { createdAt: "desc" },
  });
  if (!row) return { error: "No active wall entry to revoke." };
  await prisma.$transaction([
    prisma.lobbyWallEntry.update({
      where: { id: row.id },
      data: { status: "Removed", removedReason: "revoked_by_member", reviewedAt: new Date() },
    }),
    prisma.auditLog.create({
      data: {
        actorId: userId, actorRole: session.role ?? "MEMBER",
        action: "lobby_wall.revoked",
        entityType: "LobbyWallEntry", entityId: row.id,
        metadata: JSON.stringify({ status: "Removed" }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  revalidatePath("/wall");
  revalidatePath("/lobby");
  return { success: true };
}

// ─── Admin ─────────────────────────────────────────────────────────────

export async function listAdminLobbyWallEntries(input: { status?: string } = {}): Promise<LobbyWallEntryView[]> {
  await verifyAdmin();
  const where: { status?: string } = {};
  if (input.status && VALID_STATUSES.has(input.status)) where.status = input.status;
  const rows = await prisma.lobbyWallEntry.findMany({
    where,
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });
  return rows.map(toView);
}

export async function approveLobbyWallEntry(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.lobbyWallEntry.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Entry not found." };
  if (row.status === "Approved") return { success: true };
  await prisma.$transaction([
    prisma.lobbyWallEntry.update({
      where: { id: row.id },
      data: { status: "Approved", reviewedAt: new Date(), reviewedById: actor.id },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "lobby_wall.approved",
        entityType: "LobbyWallEntry", entityId: row.id,
        metadata: JSON.stringify({ displayName: row.displayName, suite: row.suiteNumber }),
      },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/wall");
  revalidatePath("/lobby");
  return { success: true };
}

export async function adminRemoveLobbyWallEntry(input: { id: string; reason?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.lobbyWallEntry.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Entry not found." };
  await prisma.$transaction([
    prisma.lobbyWallEntry.update({
      where: { id: row.id },
      data: { status: "Removed", reviewedAt: new Date(), reviewedById: actor.id, removedReason: input.reason?.trim().slice(0, 200) || "removed_by_admin" },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "lobby_wall.removed",
        entityType: "LobbyWallEntry", entityId: row.id,
        metadata: JSON.stringify({ displayName: row.displayName, reason: input.reason ?? null }),
      },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/wall");
  revalidatePath("/lobby");
  return { success: true };
}

// ─── Public (no auth) ──────────────────────────────────────────────────

// Used by /wall route + iter-195 lobby kiosk. Privacy-tight: no userId,
// no email, no phone — only display name + suite # + joined year.
export async function getActiveLobbyWallEntries(): Promise<PublicLobbyWallEntry[]> {
  const rows = await prisma.lobbyWallEntry.findMany({
    where: { status: "Approved" },
    orderBy: { reviewedAt: "desc" },
    take: 60,
    select: { id: true, photoUrl: true, displayName: true, suiteNumber: true, joinedYear: true },
  });
  return rows;
}
