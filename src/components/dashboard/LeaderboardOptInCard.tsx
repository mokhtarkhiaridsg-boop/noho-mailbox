"use client";

/**
 * iter-223 — Member opt-in card for the public referral leaderboard.
 *
 * Tiny settings card. Defaults OFF (privacy preserves first). Once
 * opted in, member's first name + last initial + suite # + credited
 * referral count surface at /leaderboard.
 */

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { BRAND } from "./types";
import { getMyLeaderboardOptIn, setMyLeaderboardOptIn } from "@/app/actions/publicLeaderboard";

export default function LeaderboardOptInCard() {
  const [data, setData] = useState<{ optedIn: boolean; creditedReferrals: number } | null>(null);
  const [busy, startTransition] = useTransition();

  useEffect(() => {
    void getMyLeaderboardOptIn().then(setData).catch(() => setData({ optedIn: false, creditedReferrals: 0 }));
  }, []);

  if (!data) return null;

  function toggle() {
    if (!data) return;
    startTransition(async () => {
      const next = !data.optedIn;
      const res = await setMyLeaderboardOptIn({ optedIn: next });
      if (res.success) setData({ ...data, optedIn: next });
    });
  }

  return (
    <div className="rounded-2xl p-4" style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.22em] inline-flex items-center gap-1.5" style={{ color: BRAND.blueDeep }}>
            🏆 Public referral leaderboard
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            Show up on the public <Link href="/leaderboard" target="_blank" rel="noopener noreferrer" className="font-bold underline" style={{ color: BRAND.blueDeep }}>/leaderboard</Link> — top 3 each quarter get a free month + a "Founder ambassador" badge. We only show your first name + last initial + suite #. You currently have <strong>{data.creditedReferrals}</strong> credited referral{data.creditedReferrals === 1 ? "" : "s"}.
          </p>
        </div>
        <button type="button" onClick={toggle} disabled={busy}
          className="text-[11.5px] font-black px-3 py-1.5 rounded-lg shrink-0 disabled:opacity-50"
          style={{
            background: data.optedIn ? "#15803d" : "white",
            color: data.optedIn ? "white" : BRAND.inkSoft,
            border: `1px solid ${data.optedIn ? "#15803d" : BRAND.border}`,
          }}>
          {data.optedIn ? "✓ Visible" : "Opt in"}
        </button>
      </div>
    </div>
  );
}
