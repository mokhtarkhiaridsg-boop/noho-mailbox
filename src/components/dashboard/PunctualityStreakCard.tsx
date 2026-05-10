"use client";

/**
 * iter-220 — Pickup-punctuality streak card (Tier 16 #129).
 *
 * Shows current streak (e.g. 8/12) toward the iter-216 "Punctual pal"
 * badge with a progress bar + a "you're 4 pickups away from a free
 * 2-day storage buffer" hint. Renders nothing for members with zero
 * pickup history yet (don't pressure new members).
 */

import { useEffect, useState } from "react";
import { BRAND } from "./types";
import { getMyPunctualityStreak, type PunctualityResult } from "@/app/actions/punctuality";

export default function PunctualityStreakCard() {
  const [data, setData] = useState<PunctualityResult | null>(null);

  useEffect(() => {
    void getMyPunctualityStreak().then(setData).catch(() => setData(null));
  }, []);

  if (!data || data.total === 0) return null;

  const pct = Math.min(100, Math.round((data.streak / data.badgeThreshold) * 100));
  const accent = data.hasBadge ? "#15803d" : pct >= 75 ? "#0F766E" : pct >= 50 ? "#92400e" : BRAND.blueDeep;

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
            Community · Punctuality streak
          </p>
          <h3 className="text-base font-black tracking-tight mt-0.5" style={{ color: BRAND.ink }}>
            ⏱️ Your pickup streak
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            Members who pick up within 7 days of arrival earn a "Punctual pal" badge at 12 in a row + a 2-day storage-fee buffer perk going forward.
          </p>
        </div>
        {data.hasBadge && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-[0.10em]" style={{ background: "rgba(34,197,94,0.10)", color: "#15803d" }}>
            ✓ Earned
          </span>
        )}
      </div>

      <div className="mt-3 space-y-2">
        <div className="flex items-baseline gap-2">
          <span className="text-[36px] font-black tabular-nums" style={{ color: accent, fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace", lineHeight: 1 }}>
            {data.streak}
          </span>
          <span className="text-[14px] font-bold" style={{ color: BRAND.inkSoft }}>/ {data.badgeThreshold}</span>
          <span className="text-[11px] ml-auto" style={{ color: BRAND.inkFaint }}>{data.onTimeRatePct}% on-time lifetime</span>
        </div>

        <div className="rounded-full overflow-hidden" style={{ background: BRAND.bg, height: 8 }}>
          <div style={{ background: accent, width: `${pct}%`, height: "100%", transition: "width .4s ease" }} />
        </div>

        <p className="text-[11px]" style={{ color: BRAND.inkSoft }}>
          {data.hasBadge
            ? `🎉 Punctual pal earned — keep the streak alive for the storage-fee buffer perk.`
            : data.streak === 0
            ? "Your streak resets on a late pickup. Pick up your next package within 7 days to start fresh."
            : `${data.pickupsToBadge} more on-time pickup${data.pickupsToBadge === 1 ? "" : "s"} to earn the badge.`}
        </p>
        {data.mostRecentLatencyDays != null && (
          <p className="text-[10px]" style={{ color: BRAND.inkFaint }}>
            Most recent pickup took <strong>{data.mostRecentLatencyDays.toFixed(1)}d</strong> from intake · {data.onTime} of {data.total} lifetime pickups were on time
          </p>
        )}
      </div>
    </section>
  );
}
