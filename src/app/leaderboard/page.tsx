// iter-223 — Public referral leaderboard (Tier 16 #132).
//
// Shareable / SEO-friendly page ranking opted-in members by credited
// referrals. Privacy-tight: only first name + last initial + suite #
// + earned-badge emojis surface.

import { getPublicReferralLeaderboard } from "@/app/actions/publicLeaderboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Member referral leaderboard",
  description: "Top NOHO Mailbox members by referrals. Top 3 each quarter earn a free month + Founder Ambassador badge.",
};

const BADGE_EMOJI: Record<string, string> = {
  tenure_1y: "🎂", tenure_3y: "🌳",
  packages_100: "📦", packages_500: "🚀",
  spend_1000: "💎", spend_5000: "👑",
  referrals_10: "📣", scans_50: "📑",
  forwards_50: "✈️", pickup_punctual_12: "⏱️",
};

function rankColor(rank: number): string {
  if (rank === 1) return "#F59E0B";        // gold
  if (rank === 2) return "#9CA3AF";        // silver
  if (rank === 3) return "#CD7F32";        // bronze
  return "#23596A";                          // brand blue
}

export default async function LeaderboardPage() {
  const rows = await getPublicReferralLeaderboard();

  return (
    <main style={S.root}>
      <header style={S.header}>
        <p style={S.eyebrow}>📬 NOHO Mailbox · Community</p>
        <h1 style={S.h1}>Referral leaderboard</h1>
        <p style={S.sub}>
          Top opted-in members by credited referrals. Top 3 each quarter earn a <strong>free month</strong> + a permanent
          🏆 <strong>Founder Ambassador</strong> badge.
        </p>
      </header>

      {rows.length === 0 ? (
        <div style={S.emptyCard}>
          <p style={S.emptyEyebrow}>The wall is warming up</p>
          <p style={S.emptyMsg}>Members can opt in from their dashboard settings to appear here. Be the first to grab gold.</p>
        </div>
      ) : (
        <div style={S.list}>
          {rows.map((r) => {
            const isPodium = r.rank <= 3;
            const accent = rankColor(r.rank);
            const badgeEmojis = r.badgeKeys.map((k) => BADGE_EMOJI[k.replace(/^founder_ambassador_.*/, "founder_ambassador")] ?? (k.startsWith("founder_ambassador") ? "🏆" : "")).filter(Boolean).slice(0, 8);
            return (
              <div key={r.rank} style={{ ...S.row, ...(isPodium ? S.podiumRow : {}), borderColor: isPodium ? `${accent}55` : "#E8DDD0" }}>
                <div style={{ ...S.rankBadge, background: accent, fontSize: isPodium ? 22 : 18 }}>
                  {isPodium ? (r.rank === 1 ? "🥇" : r.rank === 2 ? "🥈" : "🥉") : `#${r.rank}`}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ ...S.name, fontSize: isPodium ? 18 : 15, color: isPodium ? "#2D100F" : "#3B4252" }}>{r.publicName}</p>
                  <p style={S.meta}>
                    {r.suiteNumber && <span style={S.suite}>#{r.suiteNumber}</span>}
                    <span> since {r.joinedYear}</span>
                    {badgeEmojis.length > 0 && (
                      <span style={S.badges}>· {badgeEmojis.join(" ")}</span>
                    )}
                  </p>
                </div>
                <div style={S.creditWrap}>
                  <p style={{ ...S.creditNum, color: accent }}>{r.creditedReferrals}</p>
                  <p style={S.creditLabel}>{r.creditedReferrals === 1 ? "referral" : "referrals"}</p>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <footer style={S.foot}>
        <p>Want to be on this list? <a href="/dashboard?tab=settings" style={S.link}>Opt in from your dashboard</a> · Want to refer a friend? Get your code in dashboard settings.</p>
      </footer>
    </main>
  );
}

const S: Record<string, React.CSSProperties> = {
  root: { minHeight: "100vh", background: "linear-gradient(160deg, #F8F2EA 0%, #F7E6C2 60%, #F0DBA9 100%)", color: "#2D100F", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', padding: "32px 16px" },
  header: { textAlign: "center", maxWidth: 600, margin: "0 auto 28px" },
  eyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "#23596A", margin: 0 },
  h1: { fontSize: 40, fontWeight: 900, letterSpacing: "-.5px", margin: "8px 0 6px" },
  sub: { fontSize: 14, color: "rgba(45,16,15,0.65)", margin: 0, lineHeight: 1.55 },
  list: { maxWidth: 600, margin: "0 auto", display: "flex", flexDirection: "column", gap: 10 },
  row: { background: "white", borderRadius: 14, border: "1px solid #E8DDD0", padding: "14px 16px", display: "flex", alignItems: "center", gap: 14 },
  podiumRow: { background: "white", boxShadow: "0 12px 32px rgba(45,16,15,0.10)" },
  rankBadge: { color: "white", fontWeight: 900, padding: "8px 12px", borderRadius: 10, minWidth: 48, textAlign: "center", lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center" },
  name: { margin: 0, fontWeight: 900, letterSpacing: "-.2px" },
  meta: { margin: "2px 0 0", fontSize: 11, color: "rgba(45,16,15,0.55)" },
  suite: { fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", color: "#23596A", marginRight: 6 },
  badges: { marginLeft: 6, fontSize: 14 },
  creditWrap: { textAlign: "right" },
  creditNum: { margin: 0, fontSize: 28, fontWeight: 900, fontVariantNumeric: "tabular-nums", lineHeight: 1, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace" },
  creditLabel: { margin: "2px 0 0", fontSize: 10, fontWeight: 800, letterSpacing: ".10em", textTransform: "uppercase", color: "rgba(45,16,15,0.55)" },
  emptyCard: { background: "white", borderRadius: 16, border: "1px solid #E8DDD0", padding: "32px 28px", maxWidth: 460, margin: "40px auto", textAlign: "center" },
  emptyEyebrow: { fontSize: 11, fontWeight: 800, letterSpacing: ".22em", textTransform: "uppercase", color: "#7A8290", margin: 0 },
  emptyMsg: { fontSize: 13, color: "rgba(45,16,15,0.65)", margin: "8px 0 0", lineHeight: 1.5 },
  foot: { maxWidth: 600, margin: "28px auto 0", textAlign: "center", fontSize: 12, color: "rgba(45,16,15,0.55)" },
  link: { color: "#23596A", fontWeight: 700 },
};
