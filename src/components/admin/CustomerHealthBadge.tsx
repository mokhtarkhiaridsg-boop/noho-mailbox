"use client";

/**
 * iter-140 — Customer health score pill + breakdown popover.
 *
 * Compact badge for the customer-list rows; expands to a detail
 * popover on click showing the per-axis breakdown so admin can see
 * WHY a customer is at-risk without leaving the list.
 */

import { useEffect, useRef, useState } from "react";
import type { CustomerHealthScore, HealthBucket } from "@/app/actions/customerHealthScore";

const BUCKET_STYLE: Record<HealthBucket, { bg: string; fg: string; ring: string; emoji: string }> = {
  "Excellent": { bg: "rgba(22,163,74,0.12)",  fg: "#15803d", ring: "rgba(22,163,74,0.30)", emoji: "★" },
  "Healthy":   { bg: "rgba(51,116,133,0.12)", fg: "#23596A", ring: "rgba(51,116,133,0.30)", emoji: "✓" },
  "Watch":     { bg: "rgba(245,158,11,0.14)", fg: "#92400e", ring: "rgba(245,158,11,0.40)", emoji: "!" },
  "At Risk":   { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b", ring: "rgba(231,0,19,0.40)",  emoji: "!!" },
};

export function CustomerHealthBadge({
  score,
  compact = false,
}: {
  score: CustomerHealthScore | null | undefined;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onAway(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onAway);
    return () => document.removeEventListener("mousedown", onAway);
  }, [open]);

  if (!score) {
    return (
      <span
        className="inline-flex items-center gap-1 text-[9.5px] font-bold px-1.5 py-0.5 rounded-full"
        style={{ background: "rgba(0,0,0,0.04)", color: "rgba(0,0,0,0.40)" }}
        title="No health data yet"
      >
        —
      </span>
    );
  }

  const s = BUCKET_STYLE[score.bucket];

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        className="inline-flex items-center gap-1 text-[10.5px] font-black px-2 py-0.5 rounded-full transition-colors"
        style={{ background: s.bg, color: s.fg, border: `1px solid ${s.ring}` }}
        title={`${score.bucket} · ${score.score}/100 — click for breakdown`}
      >
        <span style={{ fontSize: 10, lineHeight: 1 }} aria-hidden>{s.emoji}</span>
        <span className="tabular-nums">{score.score}</span>
        {!compact && <span className="opacity-80">· {score.bucket}</span>}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-1 w-72 rounded-xl shadow-2xl z-30 p-3 space-y-2"
          style={{ background: "white", border: "1px solid #ECEEF1" }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between">
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: "#7A8290" }}>
              Health breakdown
            </p>
            <span
              className="text-[10.5px] font-black px-2 py-0.5 rounded-full"
              style={{ background: s.bg, color: s.fg, border: `1px solid ${s.ring}` }}
            >
              {score.score}/100 · {score.bucket}
            </span>
          </div>
          <ul className="space-y-1.5">
            {score.axes.map((a) => {
              const tone =
                a.contribution > 0 ? "#15803d"
                : a.contribution < 0 ? "#991b1b"
                : "#7A8290";
              return (
                <li key={a.key}>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11.5px] font-bold" style={{ color: "#1A1D23" }}>
                      {a.label}
                    </span>
                    <span className="text-[11.5px] font-black tabular-nums" style={{ color: tone }}>
                      {a.contribution > 0 ? "+" : ""}{a.contribution}
                    </span>
                  </div>
                  <p className="text-[10px] leading-tight" style={{ color: "#7A8290" }}>
                    {a.detail}
                  </p>
                </li>
              );
            })}
          </ul>
          <p className="text-[9.5px] pt-1.5 border-t" style={{ borderColor: "#ECEEF1", color: "#7A8290" }}>
            Raw score: {score.raw} (range −65 to +95) · normalized to 0–100
          </p>
        </div>
      )}
    </div>
  );
}
