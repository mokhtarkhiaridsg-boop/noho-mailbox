"use client";

/**
 * iter-226 — Public roadmap voting client (Tier 16 #135).
 *
 * Renders the public roadmap with one big upvote button per item.
 * Anonymous visitors see the list + counts but get a "Sign in to vote"
 * prompt when they tap. Members see ▲ Voted toggle.
 */

import { useState, useTransition } from "react";
import { castRoadmapVote, removeRoadmapVote, type RoadmapItemRow } from "@/app/actions/publicRoadmap";

const STATUS_META: Record<RoadmapItemRow["status"], { label: string; bg: string; fg: string }> = {
  Idea:       { label: "Idea",        bg: "rgba(122,130,144,0.10)", fg: "#3B4252" },
  Planned:    { label: "Planned",     bg: "rgba(25,118,255,0.10)",  fg: "#0F5BD9" },
  InProgress: { label: "In progress", bg: "rgba(245,158,11,0.12)",  fg: "#92400e" },
  Shipped:    { label: "Shipped ✓",   bg: "rgba(34,197,94,0.10)",   fg: "#15803d" },
  Declined:   { label: "Declined",    bg: "rgba(239,68,68,0.06)",   fg: "#b91c1c" },
};

export default function RoadmapClient({ initialItems }: { initialItems: RoadmapItemRow[] }) {
  const [items, setItems] = useState(initialItems);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function toggleVote(item: RoadmapItemRow) {
    setError(null);
    startTransition(async () => {
      const res = item.iVoted
        ? await removeRoadmapVote({ itemId: item.id })
        : await castRoadmapVote({ itemId: item.id });
      if (res.error) { setError(res.error); return; }
      setItems((prev) => prev.map((i) =>
        i.id === item.id
          ? { ...i, iVoted: !item.iVoted, voteCount: res.voteCount ?? i.voteCount + (item.iVoted ? -1 : 1) }
          : i,
      ));
    });
  }

  // Group by status for visual sections.
  const byStatus = (s: RoadmapItemRow["status"]) => items.filter((i) => i.status === s);
  const sections: Array<{ s: RoadmapItemRow["status"]; emoji: string; subtitle: string }> = [
    { s: "InProgress", emoji: "🛠️", subtitle: "We're building these now" },
    { s: "Planned",    emoji: "📅", subtitle: "Coming soon — your votes shape the order" },
    { s: "Idea",       emoji: "💡", subtitle: "Help us prioritize" },
  ];

  return (
    <main style={S.root}>
      <header style={S.header}>
        <p style={S.eyebrow}>📬 NOHO Mailbox · Public roadmap</p>
        <h1 style={S.h1}>Help shape what we build next</h1>
        <p style={S.sub}>
          Vote for the features you want most. Members&apos; votes drive the build queue. Sign in to vote — anonymous browsing is welcome.
        </p>
      </header>

      {error && <p style={S.errorBar}>{error}</p>}

      {items.length === 0 ? (
        <div style={S.emptyCard}>
          <p style={S.emptyEyebrow}>Roadmap is loading</p>
          <p style={S.emptyMsg}>Check back soon — we&apos;ll publish our next batch of ideas any day now.</p>
        </div>
      ) : (
        <div style={S.sections}>
          {sections.map((sec) => {
            const list = byStatus(sec.s);
            if (list.length === 0) return null;
            return (
              <section key={sec.s} style={S.section}>
                <header style={S.sectionHead}>
                  <h2 style={S.sectionH2}>{sec.emoji} {STATUS_META[sec.s].label}</h2>
                  <p style={S.sectionSub}>{sec.subtitle}</p>
                </header>
                <div style={S.list}>
                  {list.map((item) => {
                    const meta = STATUS_META[item.status];
                    return (
                      <div key={item.id} style={S.row}>
                        <button type="button" onClick={() => toggleVote(item)} disabled={busy}
                          style={{ ...S.voteBtn, ...(item.iVoted ? S.voteBtnActive : {}) }}>
                          <span style={S.voteArrow}>▲</span>
                          <span style={S.voteCount}>{item.voteCount}</span>
                        </button>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={S.titleRow}>
                            <h3 style={S.title}>{item.title}</h3>
                            <span style={{ ...S.statusPill, background: meta.bg, color: meta.fg }}>{meta.label}</span>
                            {item.category && <span style={S.categoryPill}>{item.category}</span>}
                          </div>
                          <p style={S.desc}>{item.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <footer style={S.foot}>
        Want to suggest something we haven&apos;t listed? Email <a href="mailto:nohomailbox@gmail.com" style={S.link}>nohomailbox@gmail.com</a>.
      </footer>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "linear-gradient(160deg, #F8F2EA 0%, #F7E6C2 60%, #F0DBA9 100%)", color: "#2D100F", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', padding: "32px 16px" },
  header: { textAlign: "center", maxWidth: 640, margin: "0 auto 28px" },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "#23596A", margin: 0 },
  h1: { fontSize: 38, fontWeight: 900, letterSpacing: "-.5px", margin: "8px 0 6px" },
  sub: { fontSize: 14.5, color: "rgba(45,16,15,0.65)", margin: 0, lineHeight: 1.55 },
  errorBar: { maxWidth: 640, margin: "0 auto 16px", background: "rgba(239,68,68,0.06)", color: "#b91c1c", padding: "10px 14px", borderRadius: 10, fontSize: 13, fontWeight: 700, border: "1px solid rgba(239,68,68,0.30)" },
  sections: { maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: 28 },
  section: {},
  sectionHead: { marginBottom: 10 },
  sectionH2: { margin: 0, fontSize: 18, fontWeight: 900 },
  sectionSub: { margin: "2px 0 0", fontSize: 12, color: "rgba(45,16,15,0.55)" },
  list: { display: "flex", flexDirection: "column", gap: 10 },
  row: { background: "white", borderRadius: 14, border: "1px solid #E8DDD0", padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 14 },
  voteBtn: { display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "10px 14px", background: "#F7E6C2", border: "1px solid #E8DDD0", borderRadius: 10, cursor: "pointer", color: "#5C4540", minWidth: 60 },
  voteBtnActive: { background: "#337485", color: "white", border: "1px solid #337485", boxShadow: "0 4px 12px rgba(51,116,133,0.30)" },
  voteArrow: { fontSize: 14, lineHeight: 1, fontWeight: 900 },
  voteCount: { fontSize: 18, lineHeight: 1, fontWeight: 900, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" },
  titleRow: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  title: { margin: 0, fontSize: 15, fontWeight: 900, lineHeight: 1.3 },
  statusPill: { fontSize: 9.5, fontWeight: 800, letterSpacing: ".10em", textTransform: "uppercase", padding: "3px 7px", borderRadius: 999 },
  categoryPill: { fontSize: 9.5, fontWeight: 800, letterSpacing: ".10em", textTransform: "uppercase", padding: "3px 7px", borderRadius: 999, background: "#F4F5F7", color: "#7A8290" },
  desc: { margin: "4px 0 0", fontSize: 13, color: "rgba(45,16,15,0.70)", lineHeight: 1.5 },
  foot: { maxWidth: 640, margin: "32px auto 0", textAlign: "center", fontSize: 12, color: "rgba(45,16,15,0.55)" },
  link: { color: "#23596A", fontWeight: 700 },
  emptyCard: { background: "white", borderRadius: 16, border: "1px solid #E8DDD0", padding: "32px 28px", maxWidth: 460, margin: "40px auto", textAlign: "center" },
  emptyEyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "#7A8290", margin: 0 },
  emptyMsg: { fontSize: 13, color: "rgba(45,16,15,0.65)", margin: "8px 0 0", lineHeight: 1.5 },
};
