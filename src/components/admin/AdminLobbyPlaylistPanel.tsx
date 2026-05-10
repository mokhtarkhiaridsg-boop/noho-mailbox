"use client";

/**
 * iter-235 — Admin lobby-playlist moderation panel (Tier 17 #144).
 *
 * Lists all suggested songs (active + hidden). Admin can hide
 * inappropriate suggestions with a reason or unhide if a previous
 * decision was wrong. Shows the running totals + a quick link to the
 * public NOHO TV display.
 */

import { useEffect, useState, useTransition } from "react";
import {
  listAllLobbySongsAdmin,
  adminHideLobbySong,
  adminUnhideLobbySong,
  type LobbyPlaylistSongRow,
} from "@/app/actions/lobbyPlaylist";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  green: "#22C55E",
  amber: "#F59E0B",
  red: "#EF4444",
  purple: "#7c3aed",
};

export default function AdminLobbyPlaylistPanel() {
  const [songs, setSongs] = useState<LobbyPlaylistSongRow[] | null>(null);
  const [showHidden, setShowHidden] = useState(false);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    void listAllLobbySongsAdmin({ showHidden, limit: 200 }).then(setSongs).catch(() => setSongs([]));
  }

  useEffect(refresh, [showHidden]);

  function onHide(s: LobbyPlaylistSongRow) {
    const reason = prompt(`Hide "${s.title} — ${s.artist}"? Reason (≥4 chars):`);
    if (!reason || reason.trim().length < 4) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await adminHideLobbySong({ id: s.id, reason });
      if (res.error) setError(res.error);
      else { setInfo("✓ Hidden"); refresh(); }
    });
  }

  function onUnhide(s: LobbyPlaylistSongRow) {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await adminUnhideLobbySong({ id: s.id });
      if (res.error) setError(res.error);
      else { setInfo("✓ Unhidden"); refresh(); }
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.purple}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.purple, boxShadow: `0 0 6px ${T.purple}` }} />
          Community · Lobby playlist
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>🎵 NOHO lobby playlist moderation</h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Members suggest + vote on songs for the lobby speakers. Top 25 (by vote) display on `/lobby/playlist` (the NOHO TV page). Hide anything inappropriate with a reason — the action audits + the song stops appearing in member views immediately.
        </p>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.green }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.red }}>{error}</p>}

      <div className="flex items-center gap-2 flex-wrap">
        <a href="/lobby/playlist" target="_blank" rel="noopener" className="text-[11px] font-bold px-3 py-1.5 rounded-lg" style={{ background: T.purple, color: "white", textDecoration: "none" }}>
          📺 Open NOHO TV view
        </a>
        <label className="text-[11px] font-bold flex items-center gap-1.5 cursor-pointer ml-2" style={{ color: T.inkSoft }}>
          <input type="checkbox" checked={showHidden} onChange={(e) => setShowHidden(e.target.checked)} className="w-3.5 h-3.5 accent-[#7c3aed]" />
          Show hidden songs too
        </label>
      </div>

      {!songs ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : songs.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          {showHidden ? "No songs at all yet." : "No active songs. Members can suggest from their dashboard."}
        </div>
      ) : (
        <ol className="space-y-1.5">
          {songs.map((s, i) => (
            <li key={s.id} className="flex items-start gap-3 p-2.5 rounded-lg" style={{ background: T.surface, border: `1px solid ${s.hiddenAt ? `${T.red}40` : T.border}`, opacity: s.hiddenAt ? 0.6 : 1 }}>
              <p className="font-mono font-black tabular-nums text-center shrink-0" style={{ width: 24, fontSize: 14, color: T.inkFaint }}>{i + 1}</p>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-bold" style={{ color: T.ink }}>
                  {s.title} <span style={{ color: T.inkSoft, fontWeight: 600 }}>— {s.artist}</span>
                  {s.link && <a href={s.link} target="_blank" rel="noopener noreferrer" className="ml-1.5 text-[10.5px]" style={{ color: T.purple, textDecoration: "none" }}>↗</a>}
                </p>
                <p className="text-[10.5px]" style={{ color: T.inkFaint }}>
                  Suggested by <span style={{ color: T.inkSoft, fontWeight: 600 }}>{s.suggestedByName ?? "anon"}</span>
                  {s.suggestedBySuite && <span> · #{s.suggestedBySuite}</span>}
                  {" · "}{new Date(s.createdAtIso).toLocaleDateString()}
                </p>
                {s.notes && <p className="text-[10px] italic mt-0.5" style={{ color: T.inkSoft }}>"{s.notes}"</p>}
                {s.hiddenAt && (
                  <p className="text-[10.5px] font-bold mt-1" style={{ color: T.red }}>
                    ✕ Hidden {new Date(s.hiddenAt).toLocaleDateString()}{s.hiddenReason && ` · ${s.hiddenReason}`}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono font-black text-[14px]" style={{ color: T.purple }}>▲ {s.votesCount}</span>
                {s.hiddenAt ? (
                  <button type="button" onClick={() => onUnhide(s)} disabled={busy}
                    className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50"
                    style={{ background: T.surface, color: T.green, border: `1px solid ${T.green}40` }}>
                    Unhide
                  </button>
                ) : (
                  <button type="button" onClick={() => onHide(s)} disabled={busy}
                    className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50"
                    style={{ background: T.surface, color: T.red, border: `1px solid ${T.red}40` }}>
                    Hide
                  </button>
                )}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
