"use client";

/**
 * iter-156 — Admin referral leaderboard panel (Tier 10 #66).
 *
 * Shows the same monthly + all-time rankings members see, plus a few
 * extra ops figures (total credited count, total customers with
 * credited referrals). Useful for picking the monthly prize winner +
 * spotting power-referrers.
 */

import { useEffect, useState, useTransition } from "react";
import {
  getReferralLeaderboardAdmin,
  type ReferralLeaderboard,
  type LeaderboardEntry,
} from "@/app/actions/referralLeaderboard";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  blueDeep: "#0F5BD9",
  gold: "#F5A623",
};

export default function AdminReferralLeaderboardPanel() {
  const [data, setData] = useState<{ month: ReferralLeaderboard; allTime: ReferralLeaderboard } | null>(null);
  const [pending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      try {
        const res = await getReferralLeaderboardAdmin();
        setData(res);
      } catch {
        setData(null);
      }
    });
  }
  useEffect(refresh, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Money &amp; Comms · Referrals leaderboard
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>
          Member referral leaderboard
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          Top referrers by credited signups. Pending invites that never converted don&rsquo;t count — keeps the rankings honest.
        </p>
      </div>

      <div className="flex justify-end">
        <button type="button" disabled={pending} onClick={refresh} className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
          ↻ Refresh
        </button>
      </div>

      {data == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          <Board title="This month" subtitle={data.month.monthLabel} board={data.month} />
          <Board title="All time" subtitle={`${data.allTime.totalCustomersWithCredited} referrers · ${data.allTime.totalCreditedReferrals} credited`} board={data.allTime} />
        </div>
      )}
    </div>
  );
}

function Board({ title, subtitle, board }: { title: string; subtitle: string; board: ReferralLeaderboard }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="px-4 py-2.5 flex items-center justify-between" style={{ background: T.surfaceAlt, borderBottom: `1px solid ${T.border}` }}>
        <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
          {title}
        </p>
        <p className="text-[11px] font-bold" style={{ color: T.inkFaint }}>{subtitle}</p>
      </div>
      {board.top.length === 0 ? (
        <div className="p-6 text-center text-[12px]" style={{ color: T.inkFaint }}>
          No credited referrals {board.window === "month" ? "yet this month" : "yet"}.
        </div>
      ) : (
        <ul>
          {board.top.map((e) => <Row key={e.userId} entry={e} />)}
        </ul>
      )}
    </div>
  );
}

function Row({ entry }: { entry: LeaderboardEntry }) {
  const isMedal = entry.rank <= 3;
  const medalEmoji = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;
  return (
    <li className="px-4 py-2.5 flex items-center gap-3" style={{ borderTop: `1px solid ${T.border}`, background: isMedal ? "rgba(245,166,35,0.04)" : "white" }}>
      <span className="shrink-0 w-7 text-[13px] font-black tabular-nums text-center" style={{ color: isMedal ? T.gold : T.inkFaint }}>
        {medalEmoji ?? `#${entry.rank}`}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-[12.5px] font-bold truncate" style={{ color: T.ink }}>{entry.customerName}</p>
        {entry.suiteNumber && (
          <p className="text-[10px] font-mono" style={{ color: T.inkFaint }}>#{entry.suiteNumber}</p>
        )}
      </div>
      <div className="shrink-0 text-right">
        <p className="text-[15px] font-black tabular-nums" style={{ color: T.ink }}>{entry.count}</p>
        <p className="text-[9.5px]" style={{ color: T.inkFaint }}>${(entry.creditCents / 100).toFixed(0)} earned</p>
      </div>
    </li>
  );
}
