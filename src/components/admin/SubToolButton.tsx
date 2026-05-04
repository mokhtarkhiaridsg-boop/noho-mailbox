"use client";

/**
 * SubToolButton — iPad-OS-style pill that jumps to a sibling admin tab.
 *
 * Used by parent panels (Mailbox Center, Settings, Keys, Billing,
 * Insights…) to expose folded-in sub-tools as buttons rather than
 * separate sidebar items. Apple HIG: keep nav ≤2 levels deep; sub-tools
 * belong with their parent, not at top level.
 *
 * Visual: white pill, hairline border, blue icon stroke, optional red
 * count badge for urgency. Hover lifts to soft gray.
 */

import type React from "react";

export function SubToolButton({
  icon,
  label,
  count,
  danger,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-2 h-9 px-3.5 rounded-full text-[12px] font-medium transition-colors whitespace-nowrap"
      style={{
        background: "#FFFFFF",
        color: "#3B4252",
        border: "1px solid #ECEEF1",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.background = "#F4F5F7"; }}
      onMouseLeave={(e) => { e.currentTarget.style.background = "#FFFFFF"; }}
    >
      <span style={{ color: "#1976FF" }}>{icon}</span>
      <span>{label}</span>
      {typeof count === "number" && count > 0 && (
        <span
          className="text-[10px] font-semibold px-1.5 min-w-[16px] h-4 rounded-full inline-flex items-center justify-center"
          style={{
            background: danger ? "#FF3B30" : "#1976FF",
            color: "#FFFFFF",
          }}
        >
          {count}
        </span>
      )}
    </button>
  );
}
