"use client";

/**
 * Admin Notary — formal hairline rewrite.
 *
 * Was a chunky two-up grid with 32px padded cards, blue gradient buttons,
 * and emoji icons (📅 📋). This rewrite uses the same neutral T-token
 * system as the rest of the admin: white surfaces, hairline borders,
 * monospace numerals, ink-on-cream buttons.
 */

import { StatusBadge } from "./StatusBadge";
import type { NotaryItem } from "./types";

type Props = {
  notaryQueue: NotaryItem[];
  isPending: boolean;
  handleNotaryAction: (bookingId: string, status: string) => void;
  setShowNewApptModal: (show: boolean) => void;
};

const T = {
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  accent: "#1A1D23",
  blue: "#1976FF",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace";
const TAB_NUM: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: "'tnum' 1",
  fontFamily: MONO,
};

export function AdminNotaryPanel({
  notaryQueue,
  isPending,
  handleNotaryAction,
  setShowNewApptModal,
}: Props) {
  // Bucket counts for the header strip.
  const active = notaryQueue.filter(
    (n) => n.status !== "Completed" && n.status !== "Cancelled",
  );
  const today = notaryQueue.filter((n) => {
    const d = new Date(n.date);
    const t = new Date();
    return (
      d.getUTCFullYear() === t.getUTCFullYear() &&
      d.getUTCMonth() === t.getUTCMonth() &&
      d.getUTCDate() === t.getUTCDate()
    );
  });

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-baseline gap-3 flex-wrap">
          <h2
            className="text-2xl font-bold"
            style={{
              color: "#1A1D23",
              letterSpacing: "-0.01em",
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
            }}
          >
            Notary
          </h2>
          <span
            className="text-[15px] hidden sm:inline"
            style={{
              color: "#1976FF",
              fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
              transform: "translateY(-1px)",
              display: "inline-block",
            }}
          >
            today&apos;s appointments
          </span>
          <span
            className="text-[12px] ml-1 hidden md:inline"
            style={{ color: "#7A8290", ...TAB_NUM }}
          >
            · {active.length} active · {today.length} today · {notaryQueue.length} total
          </span>
        </div>
        <button
          onClick={() => setShowNewApptModal(true)}
          className="px-3 h-8 rounded-md text-[11px] font-bold uppercase tracking-[0.10em] transition-colors"
          style={{
            background: T.accent,
            color: "#FFFFFF",
            border: `1px solid ${T.accent}`,
          }}
        >
          + New appointment
        </button>
      </div>

      {/* Empty state */}
      {notaryQueue.length === 0 && (
        <div
          className="rounded-md px-6 py-12 text-center"
          style={{
            background: T.surface,
            border: `1px solid ${T.border}`,
          }}
        >
          <p
            className="text-[12px] font-bold"
            style={{ color: T.inkSoft }}
          >
            No notary appointments yet
          </p>
          <p
            className="text-[11px] mt-1 max-w-md mx-auto"
            style={{ color: T.inkFaint }}
          >
            Bookings come in through /notary or by phone — they&apos;ll show up
            here as soon as a customer schedules.
          </p>
        </div>
      )}

      {/* Cards grid */}
      {notaryQueue.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {notaryQueue.map((n) => {
            const isDone = n.status === "Completed" || n.status === "Cancelled";
            return (
              <div
                key={n.id}
                className="rounded-md p-4 transition-colors"
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  opacity: isDone ? 0.7 : 1,
                }}
                onMouseEnter={(e) => {
                  if (!isDone) e.currentTarget.style.background = T.surfaceAlt;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = T.surface;
                }}
              >
                <div className="flex items-center justify-between mb-3 gap-2">
                  <p
                    className="font-bold text-[13px] truncate"
                    style={{ color: T.ink }}
                  >
                    {n.customerName}
                  </p>
                  <StatusBadge status={n.status} />
                </div>
                <div
                  className="space-y-1.5 text-[11px]"
                  style={{ color: T.inkSoft }}
                >
                  <div className="flex items-center gap-2">
                    <svg
                      viewBox="0 0 16 16"
                      className="w-3 h-3 shrink-0"
                      fill="none"
                      stroke={T.inkFaint}
                      strokeWidth="1.6"
                    >
                      <rect x="2.5" y="3.5" width="11" height="10" rx="1" />
                      <path d="M2.5 6 L13.5 6 M5 2 L5 5 M11 2 L11 5" />
                    </svg>
                    <span style={TAB_NUM}>
                      {n.date} · {n.time}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg
                      viewBox="0 0 16 16"
                      className="w-3 h-3 shrink-0"
                      fill="none"
                      stroke={T.inkFaint}
                      strokeWidth="1.6"
                    >
                      <rect x="3" y="2" width="10" height="12" rx="1" />
                      <path d="M5.5 5 L10.5 5 M5.5 8 L10.5 8 M5.5 11 L9 11" />
                    </svg>
                    <span>{n.type}</span>
                  </div>
                </div>
                {!isDone && (
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => handleNotaryAction(n.id, "Completed")}
                      disabled={isPending}
                      className="flex-1 text-center text-[10px] font-bold uppercase tracking-[0.10em] h-7 rounded-md disabled:opacity-40 transition-colors"
                      style={{
                        background: T.accent,
                        color: "#FFFFFF",
                        border: `1px solid ${T.accent}`,
                      }}
                    >
                      Complete
                    </button>
                    <button
                      onClick={() => handleNotaryAction(n.id, "Cancelled")}
                      disabled={isPending}
                      className="flex-1 text-center text-[10px] font-bold uppercase tracking-[0.10em] h-7 rounded-md disabled:opacity-40 transition-colors"
                      style={{
                        background: T.surface,
                        color: T.inkSoft,
                        border: `1px solid ${T.border}`,
                      }}
                    >
                      Reschedule
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
