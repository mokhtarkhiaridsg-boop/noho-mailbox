"use client";

/**
 * iter-207 — Lobby selfie wall client (Tier 15 #116).
 *
 * Rotates entries every 8s with a soft cross-fade. When >1 entry is
 * Approved, also shows a 6-up grid below the spotlight so visitors
 * can scroll the whole community. Empty-state messages when no
 * approvals yet.
 */

import { useEffect, useState } from "react";
import type { PublicLobbyWallEntry } from "@/app/actions/lobbyWall";

const ROTATE_MS = 8000;

export default function LobbyWallClient({ entries }: { entries: PublicLobbyWallEntry[] }) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (entries.length <= 1) return;
    const id = setInterval(() => setI((n) => (n + 1) % entries.length), ROTATE_MS);
    return () => clearInterval(id);
  }, [entries.length]);

  if (entries.length === 0) {
    return (
      <main style={S.root}>
        <div style={S.emptyCard}>
          <p style={S.eyebrow}>📬 NOHO Mailbox · Member wall</p>
          <h1 style={S.h1}>Wall&apos;s warming up</h1>
          <p style={S.sub}>
            The community here is just getting started. Member spotlights coming soon — opt in from your dashboard if you&apos;re a NOHO member.
          </p>
        </div>
      </main>
    );
  }

  const current = entries[i] ?? entries[0]!;

  return (
    <main style={S.root}>
      <header style={S.header}>
        <p style={S.eyebrow}>📬 NOHO Mailbox</p>
        <h1 style={S.headerH1}>The community wall</h1>
        <p style={S.headerSub}>{entries.length} member{entries.length === 1 ? "" : "s"} strong</p>
      </header>

      {/* Spotlight */}
      <section style={S.spotlight}>
        {entries.map((e, idx) => (
          <SpotlightCard key={e.id} entry={e} active={idx === i} />
        ))}
      </section>

      {/* Grid below — only when more than 1 entry */}
      {entries.length > 1 && (
        <section style={S.gridWrap}>
          <p style={S.gridEyebrow}>The whole crew ({entries.length})</p>
          <div style={S.grid}>
            {entries.map((e) => (
              <button key={e.id} type="button" onClick={() => setI(entries.indexOf(e))}
                style={{ ...S.gridCell, outline: e.id === current.id ? `2px solid #1976FF` : "none" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={e.photoUrl} alt={e.displayName} style={S.gridImg} />
                <span style={S.gridName}>{e.displayName}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <style>{`
        @keyframes wallFade { 0% { opacity: 0; transform: scale(0.96); } 100% { opacity: 1; transform: scale(1); } }
      `}</style>
    </main>
  );
}

function SpotlightCard({ entry, active }: { entry: PublicLobbyWallEntry; active: boolean }) {
  if (!active) return null;
  return (
    <article style={{ ...S.card, animation: "wallFade 1s ease both" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={entry.photoUrl} alt={entry.displayName} style={S.photo} />
      <div style={S.caption}>
        <p style={S.captionName}>{entry.displayName}</p>
        <div style={S.captionMeta}>
          {entry.suiteNumber && (
            <span style={S.suitePill}>📍 Suite #{entry.suiteNumber}</span>
          )}
          <span style={S.sincePill}>since {entry.joinedYear}</span>
        </div>
      </div>
    </article>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "linear-gradient(160deg, #F8F2EA 0%, #F7E6C2 60%, #F0DBA9 100%)", color: "#2D100F", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', padding: "32px 16px" },
  header: { textAlign: "center", marginBottom: 24 },
  eyebrow: { margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: ".24em", textTransform: "uppercase", color: "#23596A" },
  headerH1: { margin: "6px 0 4px", fontSize: 40, fontWeight: 900, letterSpacing: "-.5px" },
  h1: { margin: "6px 0 4px", fontSize: 32, fontWeight: 900, letterSpacing: "-.5px" },
  headerSub: { margin: 0, fontSize: 14, color: "rgba(45,16,15,0.55)" },
  sub: { margin: "0 0 18px", fontSize: 14, color: "rgba(45,16,15,0.55)", lineHeight: 1.5 },
  spotlight: { display: "flex", justifyContent: "center", alignItems: "center", margin: "0 auto 32px", maxWidth: 540, position: "relative", minHeight: 540 },
  card: { background: "white", borderRadius: 24, padding: 24, boxShadow: "0 20px 60px rgba(45,16,15,0.18)", border: "1px solid #E8DDD0", maxWidth: 480, width: "100%" },
  photo: { width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 16, background: "#F4F5F7", border: "1px solid #E8DDD0" },
  caption: { textAlign: "center", marginTop: 18 },
  captionName: { fontSize: 32, fontWeight: 900, letterSpacing: "-.4px", margin: 0 },
  captionMeta: { display: "flex", justifyContent: "center", gap: 8, marginTop: 8, flexWrap: "wrap" },
  suitePill: { background: "#F7E6C2", color: "#5C4540", padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 800, letterSpacing: ".10em", textTransform: "uppercase" },
  sincePill: { background: "#337485", color: "white", padding: "6px 12px", borderRadius: 99, fontSize: 12, fontWeight: 800, letterSpacing: ".10em", textTransform: "uppercase" },
  gridWrap: { maxWidth: 720, margin: "0 auto" },
  gridEyebrow: { margin: "0 0 10px", fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "#5C4540", textAlign: "center" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))", gap: 8 },
  gridCell: { background: "white", border: "1px solid #E8DDD0", borderRadius: 12, padding: 4, cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: 4 },
  gridImg: { width: "100%", aspectRatio: "1 / 1", objectFit: "cover", borderRadius: 8 },
  gridName: { fontSize: 11, fontWeight: 800, color: "#2D100F", textAlign: "center", paddingBottom: 4 },
  emptyCard: { background: "white", borderRadius: 20, border: "1px solid #E8DDD0", padding: "32px 28px", maxWidth: 460, margin: "10vh auto", textAlign: "center" },
};
