"use client";

/**
 * iter-156 — Member-facing referral leaderboard.
 *
 * Lives on the dashboard near the existing referral CTA. Shows the
 * top 5 referrers this month + the member's own standing ("you're #4
 * with 3 — invite 2 more to take #1").
 */

import { useEffect, useState } from "react";
import {
  getReferralLeaderboard,
  getMyReferralStanding,
  type ReferralLeaderboard,
  type MyReferralStanding,
} from "@/app/actions/referralLeaderboard";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_GOLD = "#F5A623";

export default function ReferralLeaderboardCard() {
  const [board, setBoard] = useState<ReferralLeaderboard | null>(null);
  const [standing, setStanding] = useState<MyReferralStanding | null>(null);

  useEffect(() => {
    let cancel = false;
    void Promise.all([
      getReferralLeaderboard({ window: "month" }),
      getMyReferralStanding(),
    ])
      .then(([b, s]) => { if (!cancel) { setBoard(b); setStanding(s); } })
      .catch(() => { if (!cancel) { setBoard(null); setStanding(null); } });
    return () => { cancel = true; };
  }, []);

  if (!board) return null;

  const visibleRows = board.top.slice(0, 5);
  const noActivity = board.totalCreditedReferrals === 0;

  // "Invite N more to tie/take #1"
  const standingCallout = (() => {
    if (!standing) return null;
    if (standing.monthCount === 0) return "Be the first to refer this month — both you and your friend get $10.";
    if (standing.monthRank === 1) return "You're #1 this month 🥇 — keep it going.";
    const gap = standing.topCount - standing.monthCount;
    if (gap > 0) return `Invite ${gap} more friend${gap === 1 ? "" : "s"} to take #1.`;
    return "You're tied for #1 — invite one more to clinch it.";
  })();

  return (
    <section
      className="rounded-3xl overflow-hidden"
      style={{
        background: "linear-gradient(180deg, #FFFCF3 0%, #FBFAF6 100%)",
        border: "1px solid rgba(45,29,15,0.08)",
      }}
    >
      <div className="px-5 sm:px-6 pt-5 sm:pt-6 flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: NOHO_BLUE_DEEP }}>
            Referral leaderboard · {board.monthLabel}
          </p>
          <h2 className="text-xl sm:text-2xl font-black mt-0.5" style={{ color: NOHO_INK, letterSpacing: "-0.01em" }}>
            Top referrers this month
          </h2>
          {standing && (
            <p className="text-[12.5px] mt-1" style={{ color: NOHO_INK }}>
              {standing.monthRank ? (
                <>You're <strong>#{standing.monthRank}</strong> with <strong>{standing.monthCount}</strong>{standing.totalCreditCents > 0 && <> · ${(standing.totalCreditCents / 100).toFixed(0)} earned all-time</>}.</>
              ) : standing.totalCreditCents > 0 ? (
                <>${(standing.totalCreditCents / 100).toFixed(0)} earned all-time. Make a referral this month to enter the leaderboard.</>
              ) : (
                <>{standingCallout}</>
              )}
            </p>
          )}
        </div>
        <a
          href="/dashboard?tab=referrals"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] font-black"
          style={{
            background: NOHO_BLUE,
            color: "white",
            boxShadow: "0 4px 12px rgba(51,116,133,0.32)",
            textDecoration: "none",
          }}
        >
          🎁 Get my code
        </a>
      </div>

      {noActivity ? (
        <div className="px-5 sm:px-6 py-6">
          <p className="text-[13px]" style={{ color: NOHO_INK }}>
            No one&rsquo;s referred yet this month — the leaderboard is wide open.
          </p>
          <p className="text-[12px] mt-1" style={{ color: NOHO_INK + "B0" }}>
            Both you and the friend you refer get a credit when they sign up.
          </p>
        </div>
      ) : (
        <ul className="divide-y" style={{ borderColor: "rgba(45,29,15,0.06)" }}>
          {visibleRows.map((entry) => {
            const medal = entry.rank === 1 ? "🥇" : entry.rank === 2 ? "🥈" : entry.rank === 3 ? "🥉" : null;
            return (
              <li
                key={entry.userId}
                className="px-5 sm:px-6 py-3 flex items-center gap-3"
                style={{
                  background: entry.rank <= 3 ? "rgba(245,166,35,0.06)" : "transparent",
                  borderTop: "1px solid rgba(45,29,15,0.06)",
                }}
              >
                <span className="shrink-0 w-7 text-[14px] font-black text-center tabular-nums" style={{ color: entry.rank <= 3 ? NOHO_GOLD : NOHO_INK + "70" }}>
                  {medal ?? `#${entry.rank}`}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold truncate" style={{ color: NOHO_INK }}>
                    {entry.customerName}
                    {entry.suiteNumber && <span className="ml-1.5 text-[10px] font-mono" style={{ color: NOHO_INK + "70" }}>#{entry.suiteNumber}</span>}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[15px] font-black tabular-nums" style={{ color: NOHO_INK }}>
                    {entry.count}
                  </p>
                  <p className="text-[9.5px]" style={{ color: NOHO_INK + "60" }}>referrals</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="px-5 sm:px-6 pb-4 pt-1 text-[10.5px]" style={{ color: NOHO_INK + "75" }}>
        Top of the month gets shoutouts &amp; a small thank-you from the bureau.
      </div>
    </section>
  );
}
