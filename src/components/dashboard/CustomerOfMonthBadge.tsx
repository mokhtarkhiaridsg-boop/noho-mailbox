"use client";

/**
 * iter-152 — Member-facing Customer-of-the-Month badge.
 *
 * Renders the most recent award (if the current user has one) at the
 * top of the dashboard overview. When no award exists, renders nothing
 * — never adds vertical chrome for non-winners.
 */

import { useEffect, useState } from "react";
import { getMyCotmAwards, type MyCotmAward } from "@/app/actions/customerOfMonth";

export default function CustomerOfMonthBadge() {
  const [awards, setAwards] = useState<MyCotmAward[] | null>(null);
  useEffect(() => {
    void getMyCotmAwards().then(setAwards).catch(() => setAwards([]));
  }, []);

  if (!awards || awards.length === 0) return null;
  const latest = awards[0]!;

  return (
    <section
      className="relative overflow-hidden rounded-3xl p-5 sm:p-6"
      style={{
        background: "linear-gradient(135deg, #FFF5DC, #FFE7B0)",
        border: "1px solid rgba(245,166,35,0.30)",
        boxShadow: "0 4px 18px rgba(245,166,35,0.18)",
      }}
    >
      {/* Decorative star burst — purely visual, position absolute. */}
      <div
        aria-hidden
        className="absolute -top-12 -right-12 pointer-events-none opacity-20"
        style={{
          width: 220, height: 220,
          background: "radial-gradient(circle, #F5A623 0%, transparent 70%)",
        }}
      />
      <div className="relative flex items-start gap-4 flex-wrap">
        <div
          className="shrink-0 inline-flex items-center justify-center rounded-full"
          style={{
            width: 64, height: 64,
            background: "linear-gradient(135deg, #F5A623, #F5C242)",
            boxShadow: "0 6px 18px rgba(245,166,35,0.35)",
          }}
        >
          <span style={{ fontSize: 32 }} aria-hidden>🌟</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#92400e" }}>
            Customer of the Month · {latest.monthName} {latest.year}
          </p>
          <h2 className="text-xl sm:text-2xl font-black mt-0.5" style={{ color: "#5C2A0A", letterSpacing: "-0.01em" }}>
            That&rsquo;s you. 🎉
          </h2>
          <blockquote
            className="mt-2 text-[12.5px] italic"
            style={{
              color: "#5C2A0A",
              borderLeft: "3px solid #F5A623",
              padding: "6px 12px",
              background: "rgba(255,255,255,0.55)",
              borderRadius: 6,
              lineHeight: 1.55,
            }}
          >
            {latest.citation}
          </blockquote>
          {awards.length > 1 && (
            <p className="mt-2 text-[10.5px] font-bold" style={{ color: "#92400e" }}>
              You&rsquo;ve earned this {awards.length} times — thank you.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
