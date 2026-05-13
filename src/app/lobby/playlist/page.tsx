/**
 * iter-235 — Public NOHO TV lobby playlist display (Tier 17 #144).
 *
 * Big-screen-friendly layout for the bureau lobby monitor. Shows the
 * top 25 songs with member attribution. Auto-refreshes every 60s via
 * the public action; no auth (no PII beyond display names + suite #).
 */

import type { Metadata } from "next";
import { getLobbyPlaylistPublic } from "@/app/actions/lobbyPlaylist";

export const dynamic = "force-dynamic";
export const revalidate = 60;

export const metadata: Metadata = {
  title: "Lobby Playlist",
  description: "Top 25 songs voted by NOHO Mailbox members. Now playing in the bureau lobby. Want to add a track? Sign into your dashboard and suggest one.",
  openGraph: {
    title: "🎵 NOHO Mailbox · Lobby Playlist",
    description: "Member-curated top 25 playing in the bureau.",
    url: "https://nohomailbox.org/lobby/playlist",
  },
  alternates: { canonical: "https://nohomailbox.org/lobby/playlist" },
  robots: { index: false, follow: true },
};

export default async function LobbyPlaylistPage() {
  const songs = await getLobbyPlaylistPublic({ limit: 25 }).catch(() => []);

  return (
    <main style={{
      minHeight: "100vh",
      background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #581c87 100%)",
      color: "white",
      padding: "32px 24px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif",
    }}>
      <header style={{ textAlign: "center", marginBottom: 32 }}>
        <p style={{ fontSize: 12, fontWeight: 800, letterSpacing: "0.3em", textTransform: "uppercase", color: "rgba(255,255,255,0.6)", margin: 0 }}>NOHO MAILBOX · LOBBY TV</p>
        <h1 style={{ fontSize: 48, fontWeight: 900, letterSpacing: "-0.02em", margin: "8px 0 0" }}>🎵 The Playlist</h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", margin: "8px 0 0" }}>Curated by NOHO members · Top 25 by vote</p>
      </header>

      {songs.length === 0 ? (
        <p style={{ textAlign: "center", color: "rgba(255,255,255,0.6)", marginTop: 60 }}>
          The playlist is empty. Members can suggest songs from their dashboard!
        </p>
      ) : (
        <ol style={{ maxWidth: 720, margin: "0 auto", padding: 0, listStyle: "none", display: "grid", gap: 8 }}>
          {songs.map((s, i) => (
            <li key={s.id} style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              padding: "12px 18px",
              background: i < 3 ? "rgba(168,85,247,0.20)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${i < 3 ? "rgba(168,85,247,0.50)" : "rgba(255,255,255,0.10)"}`,
              borderRadius: 12,
              backdropFilter: "blur(8px)",
            }}>
              <p style={{
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                fontWeight: 900,
                fontSize: 28,
                width: 48,
                textAlign: "center",
                color: i === 0 ? "#FBBF24" : i === 1 ? "#E5E7EB" : i === 2 ? "#FB923C" : "rgba(255,255,255,0.5)",
                margin: 0,
                lineHeight: 1,
              }}>
                {i + 1}
              </p>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 18, fontWeight: 800, margin: 0, color: "white" }}>{s.title}</p>
                <p style={{ fontSize: 14, fontWeight: 600, margin: "2px 0 0", color: "rgba(255,255,255,0.75)" }}>{s.artist}</p>
                <p style={{ fontSize: 11, margin: "2px 0 0", color: "rgba(255,255,255,0.55)" }}>
                  Suggested by {s.suggestedByName ?? "anon"}{s.suggestedBySuite && <span> · suite #{s.suggestedBySuite}</span>}
                </p>
              </div>
              <div style={{ textAlign: "center", minWidth: 60 }}>
                <p style={{
                  fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                  fontWeight: 900,
                  fontSize: 22,
                  margin: 0,
                  color: "#a855f7",
                  lineHeight: 1,
                }}>
                  ▲ {s.votesCount}
                </p>
                <p style={{ fontSize: 9, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.5)", margin: "4px 0 0" }}>VOTES</p>
              </div>
            </li>
          ))}
        </ol>
      )}

      <footer style={{ textAlign: "center", marginTop: 48, fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
        <p>Want to add to the rotation? Sign into nohomailbox.org and suggest a song from your dashboard.</p>
        <p style={{ marginTop: 8, fontSize: 10 }}>Refreshes every minute.</p>
      </footer>
    </main>
  );
}
