"use client";

/**
 * iter-235 — Member-side lobby playlist card.
 *
 * Suggest a song + vote on others. Top 25 (by vote) play in the
 * bureau lobby rotation. Member's own suggestions show a Delete button.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  suggestLobbySong,
  voteForLobbySong,
  unvoteForLobbySong,
  deleteMyLobbySong,
  getLobbyPlaylist,
  type LobbyPlaylistSongRow,
} from "@/app/actions/lobbyPlaylist";

export default function LobbyPlaylistCard() {
  const [songs, setSongs] = useState<LobbyPlaylistSongRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [link, setLink] = useState("");
  const [notes, setNotes] = useState("");
  const [sort, setSort] = useState<"top" | "newest">("top");

  function refresh() {
    void getLobbyPlaylist({ limit: 25, sort }).then(setSongs).catch(() => setSongs([]));
  }

  useEffect(refresh, [sort]);

  function onSuggest() {
    if (!title.trim() || !artist.trim()) { setError("Title + artist required."); return; }
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await suggestLobbySong({ title, artist, link: link.trim() || undefined, notes: notes.trim() || undefined });
      if (res.error) setError(res.error);
      else { setInfo("✓ Added · auto-voted for you"); setTitle(""); setArtist(""); setLink(""); setNotes(""); setOpen(false); refresh(); }
    });
  }

  function onToggleVote(s: LobbyPlaylistSongRow) {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = s.myVote ? await unvoteForLobbySong({ songId: s.id }) : await voteForLobbySong({ songId: s.id });
      if (res.error) setError(res.error);
      else refresh();
    });
  }

  function onDelete(s: LobbyPlaylistSongRow) {
    if (!confirm(`Delete your suggestion "${s.title} — ${s.artist}"?`)) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await deleteMyLobbySong({ id: s.id });
      if (res.error) setError(res.error);
      else { setInfo("✓ Deleted"); refresh(); }
    });
  }

  if (!songs) return null;

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#7c3aed" }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: "#7c3aed", boxShadow: "0 0 6px #7c3aed" }} />
            🎵 NOHO Lobby Playlist
          </p>
          <h3 className="text-base font-black tracking-tight mt-0.5" style={{ color: BRAND.ink }}>
            Suggest songs · top 25 play in the lobby
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            Pitch a track for the bureau speakers. Vote up your neighbors&apos; picks. Top 25 by votes drive the in-store rotation.
          </p>
        </div>
      </div>

      {info && <p className="text-[11.5px] font-semibold mt-2" style={{ color: "#15803d" }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold mt-2" style={{ color: "#b91c1c" }}>{error}</p>}

      <div className="mt-3 flex items-center gap-1.5 flex-wrap">
        {!open && (
          <button type="button" onClick={() => setOpen(true)}
            className="text-[11px] font-black px-3 py-1.5 rounded-lg text-white"
            style={{ background: "#7c3aed" }}>
            + Suggest a song
          </button>
        )}
        <a href="/lobby/playlist" target="_blank" rel="noopener" className="text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ background: "white", color: "#7c3aed", border: "1px solid #7c3aed40", textDecoration: "none" }}>
          📺 NOHO TV view
        </a>
        <div className="ml-auto flex gap-1">
          {(["top", "newest"] as const).map((s) => (
            <button key={s} type="button" onClick={() => setSort(s)}
              className="text-[10.5px] font-bold px-2 py-1 rounded-md"
              style={{
                background: sort === s ? BRAND.ink : "white",
                color: sort === s ? "white" : BRAND.inkSoft,
                border: `1px solid ${sort === s ? BRAND.ink : BRAND.border}`,
              }}>
              {s === "top" ? "🔥 Top" : "🆕 Newest"}
            </button>
          ))}
        </div>
      </div>

      {open && (
        <div className="mt-3 rounded-xl p-3 space-y-2" style={{ background: "#FAF5FF", border: "1px solid #E9D5FF" }}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Song title" maxLength={120}
              className="px-3 py-1.5 rounded-lg text-[12.5px]"
              style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
            <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist" maxLength={120}
              className="px-3 py-1.5 rounded-lg text-[12.5px]"
              style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
          </div>
          <input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Link (Spotify / YouTube / Apple Music — optional)"
            className="w-full px-3 py-1.5 rounded-lg text-[12px]"
            style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
          <input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Why this song? (optional, ≤120 chars)" maxLength={120}
            className="w-full px-3 py-1.5 rounded-lg text-[12px]"
            style={{ background: "white", border: `1px solid ${BRAND.border}`, color: BRAND.ink }} />
          <div className="flex gap-1.5">
            <button type="button" onClick={onSuggest} disabled={busy || !title.trim() || !artist.trim()}
              className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white disabled:opacity-50"
              style={{ background: "#7c3aed" }}>
              {busy ? "Adding…" : "Add to playlist"}
            </button>
            <button type="button" onClick={() => setOpen(false)}
              className="text-[11.5px] font-bold px-3 py-1.5 rounded-lg"
              style={{ background: "white", color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {songs.length === 0 ? (
        <div className="mt-3 rounded-xl px-4 py-6 text-center text-[12px]" style={{ background: "#F4F5F7", color: BRAND.inkFaint, border: "1px dashed #ECEEF1" }}>
          No songs yet. Be the first — kick off the playlist!
        </div>
      ) : (
        <ol className="mt-3 space-y-1">
          {songs.map((s, i) => (
            <li key={s.id} className="flex items-center gap-3 p-2 rounded-lg" style={{ background: i < 3 ? "#FAF5FF" : "white", border: `1px solid ${i < 3 ? "#E9D5FF" : BRAND.border}` }}>
              <p className="font-mono font-black tabular-nums text-center" style={{ width: 24, fontSize: 14, color: i < 3 ? "#7c3aed" : BRAND.inkFaint }}>{i + 1}</p>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold truncate" style={{ color: BRAND.ink }}>
                  {s.title}
                  {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-[10.5px]" style={{ color: "#7c3aed", textDecoration: "none" }}>↗</a>}
                </p>
                <p className="text-[11px] truncate" style={{ color: BRAND.inkSoft }}>
                  {s.artist}
                  <span className="text-[10px] ml-1.5" style={{ color: BRAND.inkFaint }}>· {s.suggestedByName ?? "anon"}{s.suggestedBySuite && ` #${s.suggestedBySuite}`}</span>
                </p>
                {s.notes && <p className="text-[10px] italic mt-0.5" style={{ color: BRAND.inkSoft }}>"{s.notes}"</p>}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button type="button" onClick={() => onToggleVote(s)} disabled={busy || s.isMine}
                  className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50"
                  style={{
                    background: s.myVote ? "#7c3aed" : "white",
                    color: s.myVote ? "white" : "#7c3aed",
                    border: `1px solid ${s.myVote ? "#7c3aed" : "#7c3aed40"}`,
                    cursor: s.isMine ? "default" : "pointer",
                  }}
                  title={s.isMine ? "You auto-voted for your own song" : s.myVote ? "Unvote" : "Vote"}>
                  ▲ <span className="font-mono tabular-nums">{s.votesCount}</span>
                </button>
                {s.isMine && (
                  <button type="button" onClick={() => onDelete(s)} disabled={busy}
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-md disabled:opacity-50"
                    style={{ background: "white", color: "#b91c1c", border: "1px solid #EF444440" }}>
                    Delete
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
