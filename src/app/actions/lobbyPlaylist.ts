"use server";

/**
 * iter-235 — Member-curated lobby playlist server actions
 * (Tier 17 #144).
 *
 * Members suggest songs (title + artist + optional link/notes) and
 * vote on each other's suggestions. Top 25 by votes drive the bureau
 * lobby's NOHO-TV display page (`/lobby/playlist`). Admin can hide
 * inappropriate songs.
 *
 * Reuses iter-228 atomic update + audit pattern, idempotent vote via
 * @@unique([songId, userId]).
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";

export type LobbyPlaylistSongRow = {
  id: string;
  title: string;
  artist: string;
  link: string | null;
  notes: string | null;
  suggestedByName: string | null;
  suggestedBySuite: string | null;
  votesCount: number;
  myVote: boolean;
  isMine: boolean;
  hiddenAt: string | null;
  hiddenReason: string | null;
  createdAtIso: string;
};

function toView(r: { id: string; title: string; artist: string; link: string | null; notes: string | null; suggestedByName: string | null; suggestedBySuite: string | null; suggestedById: string; votesCount: number; hiddenAt: Date | null; hiddenReason: string | null; createdAt: Date }, myUserId: string | null, votedSet: Set<string>): LobbyPlaylistSongRow {
  return {
    id: r.id, title: r.title, artist: r.artist, link: r.link, notes: r.notes,
    suggestedByName: r.suggestedByName, suggestedBySuite: r.suggestedBySuite,
    votesCount: r.votesCount,
    myVote: votedSet.has(r.id),
    isMine: !!myUserId && r.suggestedById === myUserId,
    hiddenAt: r.hiddenAt?.toISOString() ?? null,
    hiddenReason: r.hiddenReason,
    createdAtIso: r.createdAt.toISOString(),
  };
}

function normalize(s: string): string {
  return s.toLowerCase().trim().replace(/\s+/g, " ");
}

// ─── Member ────────────────────────────────────────────────────────────

export async function suggestLobbySong(input: { title: string; artist: string; link?: string; notes?: string }): Promise<{ row?: LobbyPlaylistSongRow; error?: string }> {
  const me = await verifySession();
  const title = input.title?.trim().slice(0, 120);
  const artist = input.artist?.trim().slice(0, 120);
  if (!title || title.length < 2) return { error: "Song title required (≥2 chars)." };
  if (!artist || artist.length < 1) return { error: "Artist name required." };
  const link = input.link?.trim().slice(0, 500);
  if (link && !/^https?:\/\//i.test(link)) return { error: "Link must be a full https:// URL." };

  // Per-member rate-limit: max 5 active songs at a time.
  const myActive = await prisma.lobbyPlaylistSong.count({ where: { suggestedById: me.id, hiddenAt: null } });
  if (myActive >= 5) return { error: "You already have 5 active suggestions. Wait or delete one first." };

  // Dedup against existing songs (case-insensitive title+artist match).
  const allSongs = await prisma.lobbyPlaylistSong.findMany({
    where: { hiddenAt: null },
    select: { id: true, title: true, artist: true },
  });
  const dup = allSongs.find((s) => normalize(s.title) === normalize(title) && normalize(s.artist) === normalize(artist));
  if (dup) return { error: "That song is already on the playlist — vote for it instead." };

  const fullMe = await prisma.user.findUnique({ where: { id: me.id }, select: { name: true, suiteNumber: true } });

  const created = await prisma.lobbyPlaylistSong.create({
    data: {
      suggestedById: me.id,
      suggestedByName: fullMe?.name ?? null,
      suggestedBySuite: fullMe?.suiteNumber ?? null,
      title, artist,
      link: link || null,
      notes: input.notes?.trim().slice(0, 120) || null,
      votesCount: 1,
    },
  });
  // Auto-vote for own song
  await prisma.lobbyPlaylistVote.create({ data: { songId: created.id, userId: me.id } }).catch(() => null);
  await prisma.auditLog.create({
    data: {
      actorId: me.id, actorRole: "MEMBER",
      action: "lobby_playlist.song_suggested",
      entityType: "LobbyPlaylistSong", entityId: created.id,
      metadata: JSON.stringify({ title, artist, hasLink: !!link }),
    },
  }).catch(() => null);
  revalidatePath("/dashboard"); revalidatePath("/lobby/playlist");
  return { row: toView({ ...created, suggestedById: me.id }, me.id, new Set([created.id])) };
}

export async function voteForLobbySong(input: { songId: string }): Promise<{ row?: LobbyPlaylistSongRow; error?: string }> {
  const me = await verifySession();
  const song = await prisma.lobbyPlaylistSong.findUnique({ where: { id: input.songId } });
  if (!song) return { error: "Song not found." };
  if (song.hiddenAt) return { error: "Song is hidden." };
  // Idempotent: check if already voted.
  const existing = await prisma.lobbyPlaylistVote.findUnique({ where: { songId_userId: { songId: song.id, userId: me.id } } });
  if (existing) return { error: "You already voted for this song." };
  await prisma.$transaction([
    prisma.lobbyPlaylistVote.create({ data: { songId: song.id, userId: me.id } }),
    prisma.lobbyPlaylistSong.update({ where: { id: song.id }, data: { votesCount: { increment: 1 } } }),
  ]);
  const fresh = await prisma.lobbyPlaylistSong.findUnique({ where: { id: song.id } });
  if (!fresh) return { error: "Reload failed." };
  revalidatePath("/dashboard"); revalidatePath("/lobby/playlist");
  return { row: toView(fresh, me.id, new Set([song.id])) };
}

export async function unvoteForLobbySong(input: { songId: string }): Promise<{ success?: boolean; error?: string }> {
  const me = await verifySession();
  const existing = await prisma.lobbyPlaylistVote.findUnique({ where: { songId_userId: { songId: input.songId, userId: me.id } } });
  if (!existing) return { error: "You haven't voted for this song." };
  await prisma.$transaction([
    prisma.lobbyPlaylistVote.delete({ where: { id: existing.id } }),
    prisma.lobbyPlaylistSong.update({ where: { id: input.songId }, data: { votesCount: { decrement: 1 } } }),
  ]);
  revalidatePath("/dashboard"); revalidatePath("/lobby/playlist");
  return { success: true };
}

export async function deleteMyLobbySong(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const me = await verifySession();
  const row = await prisma.lobbyPlaylistSong.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Song not found." };
  if (row.suggestedById !== me.id) return { error: "Not your suggestion." };
  await prisma.$transaction([
    prisma.lobbyPlaylistSong.delete({ where: { id: row.id } }),
    prisma.auditLog.create({
      data: {
        actorId: me.id, actorRole: "MEMBER",
        action: "lobby_playlist.song_deleted",
        entityType: "LobbyPlaylistSong", entityId: row.id,
        metadata: JSON.stringify({ title: row.title, artist: row.artist }),
      },
    }),
  ]);
  revalidatePath("/dashboard"); revalidatePath("/lobby/playlist");
  return { success: true };
}

export async function getLobbyPlaylist(input: { limit?: number; sort?: "top" | "newest" } = {}): Promise<LobbyPlaylistSongRow[]> {
  const me = await verifySession().catch(() => null);
  const limit = Math.min(50, Math.max(5, input.limit ?? 25));
  const sort = input.sort ?? "top";
  const rows = await prisma.lobbyPlaylistSong.findMany({
    where: { hiddenAt: null },
    orderBy: sort === "newest" ? [{ createdAt: "desc" }] : [{ votesCount: "desc" }, { createdAt: "asc" }],
    take: limit,
  });
  // Pull this user's votes in one query
  let votedSet = new Set<string>();
  if (me) {
    const myVotes = await prisma.lobbyPlaylistVote.findMany({
      where: { userId: me.id, songId: { in: rows.map((r) => r.id) } },
      select: { songId: true },
    });
    votedSet = new Set(myVotes.map((v) => v.songId));
  }
  return rows.map((r) => toView(r, me?.id ?? null, votedSet));
}

// Public — used by the lobby TV display. No auth (no PII other than
// member display names + suite #).
export async function getLobbyPlaylistPublic(input: { limit?: number } = {}): Promise<Array<{ id: string; title: string; artist: string; link: string | null; suggestedByName: string | null; suggestedBySuite: string | null; votesCount: number }>> {
  const limit = Math.min(50, Math.max(5, input.limit ?? 25));
  const rows = await prisma.lobbyPlaylistSong.findMany({
    where: { hiddenAt: null },
    orderBy: [{ votesCount: "desc" }, { createdAt: "asc" }],
    take: limit,
    select: { id: true, title: true, artist: true, link: true, suggestedByName: true, suggestedBySuite: true, votesCount: true },
  });
  return rows;
}

// ─── Admin moderation ─────────────────────────────────────────────────

export async function adminHideLobbySong(input: { id: string; reason: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.lobbyPlaylistSong.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Song not found." };
  if (row.hiddenAt) return { success: true };
  const reason = input.reason?.trim();
  if (!reason || reason.length < 4) return { error: "Hide reason (≥4 chars) required." };
  await prisma.$transaction([
    prisma.lobbyPlaylistSong.update({
      where: { id: row.id },
      data: { hiddenAt: new Date(), hiddenReason: reason.slice(0, 200), hiddenById: actor.id },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "lobby_playlist.song_hidden",
        entityType: "LobbyPlaylistSong", entityId: row.id,
        metadata: JSON.stringify({ title: row.title, artist: row.artist, reason: reason.slice(0, 80) }),
      },
    }),
  ]);
  revalidatePath("/admin"); revalidatePath("/dashboard"); revalidatePath("/lobby/playlist");
  return { success: true };
}

export async function adminUnhideLobbySong(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.lobbyPlaylistSong.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Song not found." };
  if (!row.hiddenAt) return { success: true };
  await prisma.$transaction([
    prisma.lobbyPlaylistSong.update({
      where: { id: row.id },
      data: { hiddenAt: null, hiddenReason: null, hiddenById: null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "lobby_playlist.song_unhidden",
        entityType: "LobbyPlaylistSong", entityId: row.id,
        metadata: JSON.stringify({ title: row.title, artist: row.artist }),
      },
    }),
  ]);
  revalidatePath("/admin"); revalidatePath("/dashboard"); revalidatePath("/lobby/playlist");
  return { success: true };
}

export async function listAllLobbySongsAdmin(input: { showHidden?: boolean; limit?: number } = {}): Promise<LobbyPlaylistSongRow[]> {
  await verifyAdmin();
  const limit = Math.min(200, Math.max(1, input.limit ?? 100));
  const where = input.showHidden ? {} : { hiddenAt: null };
  const rows = await prisma.lobbyPlaylistSong.findMany({
    where, orderBy: [{ votesCount: "desc" }, { createdAt: "desc" }], take: limit,
  });
  return rows.map((r) => toView(r, null, new Set()));
}
