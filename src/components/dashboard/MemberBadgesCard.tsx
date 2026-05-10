"use client";

/**
 * iter-216 — Member milestone badges card (Tier 15 #125).
 *
 * Renders the member's earned milestone badges as colored chips with
 * emoji + label + earned-date tooltip. Includes a "Recompute now"
 * button so members don't wait for the daily cron after they hit a
 * threshold. Renders nothing when no badges yet (don't surface an
 * empty state — wait until they earn something so the first-time
 * surfacing feels rewarding).
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import { listMyBadges, recomputeMyBadges, type MemberBadgeRow } from "@/app/actions/memberBadges";

export default function MemberBadgesCard() {
  const [badges, setBadges] = useState<MemberBadgeRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);

  function refresh() {
    void listMyBadges().then(setBadges).catch(() => setBadges([]));
  }
  useEffect(refresh, []);

  function onRecompute() {
    setInfo(null);
    startTransition(async () => {
      const res = await recomputeMyBadges();
      if (res.awarded > 0) {
        setInfo(`🎉 Earned ${res.awarded} new badge${res.awarded === 1 ? "" : "s"}!`);
      } else {
        setInfo("No new milestones yet — keep going.");
      }
      refresh();
    });
  }

  if (badges == null) return null;

  // Collapsed/empty state: render a dim CTA so members know the
  // feature exists.
  if (badges.length === 0) {
    return (
      <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
              Community · Milestones
            </p>
            <h3 className="text-base font-black tracking-tight mt-0.5" style={{ color: BRAND.ink }}>
              Earn milestone badges
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
              Hit milestones (1y member, 100 packages, $1k spend, 10 referrals) to earn badges that show on your profile + neighbor card.
            </p>
          </div>
          <button type="button" onClick={onRecompute} disabled={busy}
            className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50" style={{ background: BRAND.bg, color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
            ↻ Check now
          </button>
        </div>
        {info && <p className="text-[11.5px] mt-2 italic" style={{ color: BRAND.inkSoft }}>{info}</p>}
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
            Community · Milestones
          </p>
          <h3 className="text-base font-black tracking-tight mt-0.5" style={{ color: BRAND.ink }}>
            🏆 Your badges ({badges.length})
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            Auto-awarded as you cross milestones. Visible to neighbors who&apos;ve opted into the directory.
          </p>
        </div>
        <button type="button" onClick={onRecompute} disabled={busy}
          className="text-[10.5px] font-bold px-2.5 py-1 rounded-md disabled:opacity-50" style={{ background: BRAND.bg, color: BRAND.inkSoft, border: `1px solid ${BRAND.border}` }}>
          ↻ Recheck
        </button>
      </div>

      {info && <p className="text-[11.5px] mt-2 font-semibold" style={{ color: "#15803d" }}>{info}</p>}

      <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {badges.map((b) => (
          <li key={b.id} className="rounded-xl p-3 flex items-start gap-3" style={{ background: `${b.color}10`, border: `1px solid ${b.color}55` }}>
            <span style={{ fontSize: 32, lineHeight: 1 }} aria-hidden>{b.emoji}</span>
            <div className="min-w-0 flex-1">
              <p className="text-[12.5px] font-black" style={{ color: b.color }}>{b.label}</p>
              <p className="text-[11px]" style={{ color: BRAND.inkSoft }}>{b.description}</p>
              <p className="text-[10px] mt-0.5" style={{ color: BRAND.inkFaint }}>
                Earned {new Date(b.awardedAtIso).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                {b.awardedReason && <span> · {b.awardedReason}</span>}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
