"use client";

/**
 * Admin Mail Request Queue — formal hairline rewrite.
 *
 * Was using legacy `#162d3a` navy text and a chunky rounded-2xl card.
 * Now matches the rest of the admin: T-token palette, hairline borders,
 * tabular monospace timestamps, flat dark Fulfill button.
 */

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { fulfillMailRequest } from "@/app/actions/mail";
import type { MailRequestRow } from "./types";

type Props = {
  mailRequests: MailRequestRow[];
};

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4EEE3",
  border: "#E5DACA",
  ink: "#1A1614",
  inkSoft: "#5C4540",
  inkFaint: "#998877",
  accent: "#2D100F",
  blue: "#337485",
  warning: "#B07030",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace";
const TAB_NUM: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: "'tnum' 1",
  fontFamily: MONO,
};

export function AdminRequestsPanel({ mailRequests }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Bucket counts for the header strip — Scan / Forward / Discard / Pickup.
  const counts: Record<string, number> = {};
  for (const r of mailRequests) counts[r.kind] = (counts[r.kind] ?? 0) + 1;

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2
            className="text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: T.ink }}
          >
            Mail request queue
          </h2>
          <p
            className="text-[11px] mt-1"
            style={{ color: T.inkFaint, ...TAB_NUM }}
          >
            {mailRequests.length} pending
            {mailRequests.length > 0 &&
              " · " +
                Object.entries(counts)
                  .map(([k, n]) => `${n} ${k.toLowerCase()}`)
                  .join(" · ")}
          </p>
        </div>
      </div>

      {/* List card */}
      <div
        className="rounded-md overflow-hidden"
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
        }}
      >
        {mailRequests.length === 0 ? (
          <div
            className="px-6 py-12 text-center text-[12px]"
            style={{ color: T.inkFaint }}
          >
            No pending mail requests.
          </div>
        ) : (
          <ul>
            {mailRequests.map((r, i) => (
              <li
                key={r.id}
                className="flex items-center justify-between gap-3 px-4 py-3 transition-colors"
                style={{
                  borderTop: i === 0 ? "none" : `1px solid ${T.border}`,
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.surfaceAlt;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = T.surface;
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    {/* Kind badge — small uppercase pill. */}
                    <span
                      className="text-[10px] font-bold uppercase tracking-[0.10em] px-1.5 h-5 rounded inline-flex items-center"
                      style={{
                        background: T.surfaceAlt,
                        color:
                          r.kind === "Discard"
                            ? "#B91C1C"
                            : r.kind === "Forward"
                            ? T.warning
                            : T.blue,
                        border: `1px solid ${T.border}`,
                      }}
                    >
                      {r.kind}
                    </span>
                    <p
                      className="text-[12px] font-bold truncate"
                      style={{ color: T.ink }}
                    >
                      {r.mailFrom}
                    </p>
                  </div>
                  <p
                    className="text-[11px] mt-1 truncate"
                    style={{ color: T.inkFaint, ...TAB_NUM }}
                  >
                    {r.userName}
                    {r.suiteNumber ? ` · #${r.suiteNumber}` : ""} ·{" "}
                    {new Date(r.createdAt).toLocaleString()}
                  </p>
                  {r.notes && (
                    <p
                      className="text-[10px] mt-1 italic"
                      style={{ color: T.inkFaint }}
                    >
                      {r.notes}
                    </p>
                  )}
                </div>
                <button
                  disabled={isPending}
                  onClick={() => {
                    let scanPages: number | undefined;
                    if (r.kind === "Scan") {
                      const ans = window.prompt(
                        `How many pages did you scan for ${r.userName}? (charges $2/page from their wallet)`,
                        "1",
                      );
                      if (ans === null) return; // cancelled
                      const n = parseInt(ans, 10);
                      if (!Number.isFinite(n) || n < 1) {
                        alert("Enter a whole number ≥ 1");
                        return;
                      }
                      scanPages = n;
                    }
                    startTransition(async () => {
                      await fulfillMailRequest(r.id, undefined, scanPages);
                      router.refresh();
                    });
                  }}
                  className="text-[10px] font-bold uppercase tracking-[0.10em] px-3 h-8 rounded-md text-white disabled:opacity-50 transition-colors shrink-0"
                  style={{
                    background: T.accent,
                    border: `1px solid ${T.accent}`,
                  }}
                >
                  Fulfill
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
