// iter-216 — Member milestone badges definitions (Tier 15 #125).
//
// Each badge is a small evaluator that, given the member's lifetime
// stats, returns either `null` (not earned) or `{label, emoji, color,
// description, evidence}` (earned). The cron sweep walks every active
// member, runs all evaluators, and inserts new MemberBadge rows.

export type BadgeAward = {
  label: string;
  emoji: string;
  color: string;
  description: string;
  awardedReason: string;
};

export type MemberStats = {
  joinedAt: Date;
  totalPackagesReceived: number;
  totalLifetimeSpendCents: number;
  creditedReferrals: number;
  totalScansRequested: number;
  totalForwardingShipped: number;
  // iter-220: Pickup-punctuality streak — count of most-recent
  // consecutive on-time pickups (≤7 days from intake to pickup).
  // Streak resets to 0 on the first late pickup; breaks but doesn't
  // erase the underlying badge once awarded.
  consecutiveOnTimePickups: number;
};

export type BadgeDef = {
  key: string;
  evaluator: (s: MemberStats) => BadgeAward | null;
};

export const BADGE_DEFS: BadgeDef[] = [
  // ─── Tenure ────────────────────────────────────────────────────
  {
    key: "tenure_1y",
    evaluator: (s) => {
      const days = (Date.now() - s.joinedAt.getTime()) / (24 * 3600 * 1000);
      if (days < 365) return null;
      return {
        label: "1-year member",
        emoji: "🎂",
        color: "#F59E0B",
        description: "365 days as a NOHO Mailbox member.",
        awardedReason: `Joined ${s.joinedAt.toISOString().slice(0, 10)} · ${Math.floor(days)} days ago`,
      };
    },
  },
  {
    key: "tenure_3y",
    evaluator: (s) => {
      const days = (Date.now() - s.joinedAt.getTime()) / (24 * 3600 * 1000);
      if (days < 365 * 3) return null;
      return {
        label: "3-year member",
        emoji: "🌳",
        color: "#15803d",
        description: "Three years strong with NOHO Mailbox.",
        awardedReason: `Joined ${s.joinedAt.toISOString().slice(0, 10)} · ${Math.floor(days)} days ago`,
      };
    },
  },
  // ─── Volume ────────────────────────────────────────────────────
  {
    key: "packages_100",
    evaluator: (s) => {
      if (s.totalPackagesReceived < 100) return null;
      return {
        label: "Century club",
        emoji: "📦",
        color: "#7C3AED",
        description: "Received 100+ packages at NOHO Mailbox.",
        awardedReason: `${s.totalPackagesReceived} packages received`,
      };
    },
  },
  {
    key: "packages_500",
    evaluator: (s) => {
      if (s.totalPackagesReceived < 500) return null;
      return {
        label: "Power shipper",
        emoji: "🚀",
        color: "#1976FF",
        description: "Received 500+ packages — you're an e-commerce machine.",
        awardedReason: `${s.totalPackagesReceived} packages received`,
      };
    },
  },
  // ─── Spend ─────────────────────────────────────────────────────
  {
    key: "spend_1000",
    evaluator: (s) => {
      if (s.totalLifetimeSpendCents < 100_000) return null;
      return {
        label: "$1k club",
        emoji: "💎",
        color: "#0F5BD9",
        description: "$1,000+ in lifetime spend with NOHO.",
        awardedReason: `Lifetime spend $${(s.totalLifetimeSpendCents / 100).toFixed(2)}`,
      };
    },
  },
  {
    key: "spend_5000",
    evaluator: (s) => {
      if (s.totalLifetimeSpendCents < 500_000) return null;
      return {
        label: "$5k club",
        emoji: "👑",
        color: "#92400e",
        description: "$5,000+ in lifetime spend — VIP territory.",
        awardedReason: `Lifetime spend $${(s.totalLifetimeSpendCents / 100).toFixed(2)}`,
      };
    },
  },
  // ─── Referrals ─────────────────────────────────────────────────
  {
    key: "referrals_10",
    evaluator: (s) => {
      if (s.creditedReferrals < 10) return null;
      return {
        label: "Super referrer",
        emoji: "📣",
        color: "#DB2777",
        description: "10+ friends signed up using your code.",
        awardedReason: `${s.creditedReferrals} credited referrals`,
      };
    },
  },
  // ─── Engagement ────────────────────────────────────────────────
  {
    key: "scans_50",
    evaluator: (s) => {
      if (s.totalScansRequested < 50) return null;
      return {
        label: "Paperless pro",
        emoji: "📑",
        color: "#0F766E",
        description: "Requested 50+ scans — paperless living.",
        awardedReason: `${s.totalScansRequested} scans requested`,
      };
    },
  },
  {
    key: "forwards_50",
    evaluator: (s) => {
      if (s.totalForwardingShipped < 50) return null;
      return {
        label: "Globe trotter",
        emoji: "✈️",
        color: "#A16207",
        description: "Forwarded 50+ items — your mail travels too.",
        awardedReason: `${s.totalForwardingShipped} forwards shipped`,
      };
    },
  },
  // ─── Pickup punctuality (iter-220) ─────────────────────────────
  {
    key: "pickup_punctual_12",
    evaluator: (s) => {
      if (s.consecutiveOnTimePickups < 12) return null;
      return {
        label: "Punctual pal",
        emoji: "⏱️",
        color: "#0F766E",
        description: "12+ on-time pickups in a row. Earns a 2-day storage-fee threshold buffer.",
        awardedReason: `${s.consecutiveOnTimePickups} consecutive on-time pickups`,
      };
    },
  },
];

// iter-220 — Punctuality streak helper used by member-side
// `getMyPunctualityStreak` + the cron sweep. Walks pickup history
// newest-first; consecutive on-time pickups (≤7d intake→pickup) form
// the current streak; a single late one breaks it.
const ON_TIME_THRESHOLD_DAYS = 7;
export const PUNCTUAL_BADGE_THRESHOLD = 12;

export function computePunctualityStreak(
  pickups: Array<{ createdAt: Date; pickupSignedAt: Date }>,
): { streak: number; mostRecentLatencyDays: number | null; total: number; onTime: number } {
  const sorted = pickups.slice().sort((a, b) => b.pickupSignedAt.getTime() - a.pickupSignedAt.getTime());
  let streak = 0;
  let recentLatency: number | null = null;
  let onTime = 0;
  let streakBroken = false;
  for (const p of sorted) {
    const days = (p.pickupSignedAt.getTime() - p.createdAt.getTime()) / (24 * 3600 * 1000);
    if (recentLatency === null) recentLatency = days;
    const ok = days <= ON_TIME_THRESHOLD_DAYS;
    if (ok) onTime += 1;
    if (!streakBroken) {
      if (ok) streak += 1; else streakBroken = true;
    }
  }
  return { streak, mostRecentLatencyDays: recentLatency, total: sorted.length, onTime };
}
