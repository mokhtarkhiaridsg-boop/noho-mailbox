"use client";

/**
 * Admin Mailbox Key Replacement Requests — formal hairline rewrite.
 *
 * Was using legacy `#162d3a` navy text + chunky rounded-2xl cards. Now
 * matches the rest of the admin's T-token system with hairline borders,
 * tabular monospace numerals, and a flat dark Issue Key button.
 */

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { issueNewKey } from "@/app/actions/admin";
import type { KeyRequestRow } from "./types";

type Props = {
  keyRequests: KeyRequestRow[];
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
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace";
const TAB_NUM: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: "'tnum' 1",
  fontFamily: MONO,
};

export function AdminKeysPanel({ keyRequests }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const pending = keyRequests.filter((r) => r.status === "Pending").length;

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2
            className="text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: T.ink }}
          >
            Mailbox key replacements
          </h2>
          <p
            className="text-[11px] mt-1"
            style={{ color: T.inkFaint, ...TAB_NUM }}
          >
            {keyRequests.length} total · {pending} pending
          </p>
        </div>
      </div>

      {/* List */}
      <div
        className="rounded-md overflow-hidden"
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
        }}
      >
        {keyRequests.length === 0 ? (
          <div className="p-12 text-center">
            <svg
              viewBox="0 0 48 48"
              className="w-10 h-10 mx-auto mb-3"
              fill="none"
              stroke={T.inkFaint}
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="14" cy="24" r="6" />
              <path d="M20 24 L40 24" />
              <path d="M34 24 L34 30 M40 24 L40 32" />
            </svg>
            <p
              className="text-[12px] font-bold"
              style={{ color: T.inkSoft }}
            >
              No pending key requests
            </p>
            <p
              className="text-[11px] mt-1 max-w-md mx-auto"
              style={{ color: T.inkFaint }}
            >
              Customers request replacements from the Member dashboard.
            </p>
          </div>
        ) : (
          <ul>
            {keyRequests.map((r, i) => (
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
                  <p
                    className="text-[12px] font-bold truncate"
                    style={{ color: T.ink }}
                  >
                    {r.userName}
                  </p>
                  <p
                    className="text-[11px] truncate mt-0.5"
                    style={{ color: T.inkSoft }}
                  >
                    {r.reason}
                  </p>
                  <p
                    className="text-[10px] mt-1"
                    style={{ color: T.inkFaint, ...TAB_NUM }}
                  >
                    ${(r.feeCents / 100).toFixed(2)} · {r.status} ·{" "}
                    {new Date(r.createdAt).toLocaleDateString()}
                  </p>
                </div>
                {r.status === "Pending" && (
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await issueNewKey(r.userId, r.id);
                        router.refresh();
                      })
                    }
                    className="text-[10px] font-bold uppercase tracking-[0.10em] px-3 h-8 rounded-md text-white disabled:opacity-50 transition-colors shrink-0"
                    style={{
                      background: T.accent,
                      border: `1px solid ${T.accent}`,
                    }}
                  >
                    Issue key · −$25
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
