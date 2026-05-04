"use client";

// iter-114 — Member onboarding checklist card.
//
// Top-of-overview card. While items are pending: shows a progress arc
// + the next ~3 incomplete items inline. Once all done: collapses to
// a small celebratory chip ("✓ Onboarding complete") that doesn't
// take real estate. Self-dismissing — no schema flag needed.

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { BRAND } from "./types";
import { getMyOnboardingChecklist, type ChecklistResult } from "@/app/actions/onboardingChecklist";

export default function OnboardingChecklistCard() {
  const [data, setData] = useState<ChecklistResult | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [pending, startTransition] = useTransition();

  function refresh() {
    void getMyOnboardingChecklist().then(setData).catch(() => setData(null));
  }
  useEffect(() => { refresh(); }, []);

  // Hide entirely if the action returns nothing (anonymous / errored).
  if (!data) return null;
  if (data.totalCount === 0) return null;

  // Collapsed celebratory chip when 100%.
  if (data.allDone) {
    return (
      <div
        className="rounded-2xl px-4 py-2.5 mt-3 flex items-center gap-2.5"
        style={{
          background: "rgba(22,163,74,0.06)",
          border: "1px solid rgba(22,163,74,0.20)",
        }}
        role="status"
      >
        <span className="text-base">🎉</span>
        <p className="text-[12px] font-black flex-1" style={{ color: "#15803d" }}>
          Your account setup is complete · all {data.totalCount} items done
        </p>
      </div>
    );
  }

  // Active checklist card.
  const visible = collapsed
    ? []
    : data.items.filter((i) => !i.done).slice(0, 4);
  const hiddenIncomplete = Math.max(0, (data.totalCount - data.doneCount) - visible.length);
  const arcRadius = 18;
  const arcCircumference = 2 * Math.PI * arcRadius;
  const arcOffset = arcCircumference * (1 - data.percentComplete / 100);

  return (
    <div
      className="rounded-3xl p-5 sm:p-6 mt-3"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      <div className="flex items-center gap-3 mb-3">
        {/* Progress arc */}
        <svg width="48" height="48" viewBox="0 0 48 48" className="shrink-0">
          <circle cx="24" cy="24" r={arcRadius} fill="none" stroke={BRAND.border} strokeWidth="4" />
          <circle
            cx="24" cy="24" r={arcRadius}
            fill="none"
            stroke={BRAND.blue}
            strokeWidth="4"
            strokeDasharray={arcCircumference}
            strokeDashoffset={arcOffset}
            strokeLinecap="round"
            transform="rotate(-90 24 24)"
            style={{ transition: "stroke-dashoffset 0.5s ease-out" }}
          />
          <text
            x="24" y="24" textAnchor="middle" dominantBaseline="central"
            fontSize="12" fontWeight="900"
            fill={BRAND.ink}
          >
            {data.percentComplete}%
          </text>
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.blueDeep }}>
            Get set up
          </p>
          <h3 className="text-sm font-black" style={{ color: BRAND.ink }}>
            {data.doneCount} of {data.totalCount} done
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            Knock these out and your mailbox is fully operational.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setCollapsed((v) => !v)}
          className="text-[10.5px] font-bold opacity-70 hover:opacity-100"
          style={{ color: BRAND.inkSoft }}
        >
          {collapsed ? "Show" : "Hide"}
        </button>
      </div>

      {!collapsed && visible.length > 0 && (
        <ul className="space-y-1.5">
          {visible.map((item) => (
            <li
              key={item.key}
              className="flex items-center gap-3 rounded-xl px-3 py-2 transition-colors"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}
            >
              <span className="text-base shrink-0">{item.emoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-[12.5px] font-black truncate" style={{ color: BRAND.ink }}>
                  {item.label}
                </p>
                <p className="text-[10.5px] mt-0.5" style={{ color: BRAND.inkSoft }}>
                  {item.description}
                </p>
              </div>
              <Link
                href={item.href}
                className="px-2.5 py-1.5 rounded-lg text-[10.5px] font-black text-white shrink-0"
                style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}
              >
                Go →
              </Link>
            </li>
          ))}
        </ul>
      )}

      {!collapsed && hiddenIncomplete > 0 && (
        <p className="text-[10.5px] mt-2 italic text-center" style={{ color: BRAND.inkFaint }}>
          + {hiddenIncomplete} more pending item{hiddenIncomplete === 1 ? "" : "s"}
        </p>
      )}

      {!collapsed && data.doneCount > 0 && (
        <div className="mt-3 pt-3 border-t" style={{ borderColor: BRAND.border }}>
          <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: BRAND.inkSoft }}>
            Already done ({data.doneCount})
          </p>
          <div className="flex flex-wrap gap-1">
            {data.items.filter((i) => i.done).map((i) => (
              <span
                key={i.key}
                className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                style={{ background: "rgba(22,163,74,0.10)", color: "#15803d" }}
                title={i.label}
              >
                ✓ {i.emoji} {i.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
