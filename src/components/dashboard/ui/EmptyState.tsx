"use client";

import type { ComponentType, ReactNode, SVGProps } from "react";
import { motion } from "motion/react";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;

type Props = {
  /** Optional icon override. When omitted, the default branded mailbox is used. */
  Icon?: IconType;
  title: string;
  body?: string;
  action?: ReactNode;
  className?: string;
  /**
   * Tone of the illustration — "calm" for empty boxes, "neutral" for
   * filter-zero states. Defaults to "calm".
   */
  tone?: "calm" | "neutral";
};

// ─── Branded Empty Mailbox Illustration ──────────────────────────────────
// Compact version of the Overview hero mailbox: cream body, brown stroke,
// blue flag with cream heart. Door is closed (no mail), flag is down.
// Small floating envelopes drift gently around it for ambient life. This
// replaces the generic Icon-in-a-square treatment that was used across
// every empty state in the app.
function EmptyMailboxArt({ tone }: { tone: "calm" | "neutral" }) {
  // Neutral tone uses a slightly desaturated palette so it doesn't compete
  // when shown inside a "filter returned zero" state (where the user is
  // mid-task and shouldn't be drawn into a celebratory mailbox).
  const cream = tone === "calm" ? "#F7EEC2" : "#F0EAD8";
  const stroke = "#2D1D0F";
  const blue = tone === "calm" ? "#337485" : "#7a8d94";
  return (
    <div className="relative w-[152px] h-[120px]">
      <motion.svg
        viewBox="0 0 220 200"
        width="100%"
        height="100%"
        role="img"
        aria-hidden="true"
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Post (brown) */}
        <rect x="103" y="148" width="14" height="48" rx="2" fill={stroke} />
        <rect x="105" y="150" width="10" height="44" fill="#5a4318" />
        {/* Ground line */}
        <line x1="60" y1="196" x2="160" y2="196" stroke={stroke} strokeWidth="2" strokeLinecap="round" opacity="0.18" />
        {/* Mailbox body */}
        <path
          d="M 32 60 Q 32 30 60 30 L 160 30 Q 188 30 188 60 L 188 148 L 32 148 Z"
          fill={cream}
          stroke={stroke}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Front-face inset shadow */}
        <path
          d="M 38 64 Q 38 36 62 36 L 158 36 Q 182 36 182 64 L 182 142 L 38 142 Z"
          fill="none"
          stroke="rgba(45,29,15,0.10)"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        {/* Door — closed (no mail) */}
        <path
          d="M 32 60 Q 32 30 60 30 L 110 30 L 110 148 L 32 148 Z"
          fill={cream}
          stroke={stroke}
          strokeWidth="3"
          strokeLinejoin="round"
        />
        <circle cx="100" cy="100" r="3" fill={stroke} />
        <circle cx="100" cy="100" r="1.4" fill={cream} />
        {/* Flag — down (no mail) */}
        <rect x="186" y="80" width="4" height="46" fill={stroke} />
        <path
          d="M 190 80 L 215 80 L 215 100 L 200 100 L 195 110 L 190 100 Z"
          fill={blue}
          stroke={stroke}
          strokeWidth="2"
          strokeLinejoin="round"
        />
        <path
          d="M 198 86 a 2 2 0 0 1 4 0 a 2 2 0 0 1 4 0 q 0 3 -4 6 q -4 -3 -4 -6 Z"
          fill={cream}
        />
      </motion.svg>
      {/* Floating envelope motes — drift slowly upward across the top of
          the illustration, reinforcing "your mail will arrive here". */}
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="absolute"
          style={{
            left: `${18 + i * 32}%`,
            top: "10%",
            width: 12,
            height: 9,
            background: cream,
            border: `1px solid ${stroke}`,
            borderRadius: 1.5,
            boxShadow: `inset 0 -3px 0 ${cream}`,
          }}
          animate={{
            y: [-6, -14, -6],
            opacity: [0, 0.55, 0],
          }}
          transition={{
            duration: 4 + i * 0.6,
            delay: i * 1.2,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      ))}
    </div>
  );
}

export default function EmptyState({ Icon, title, body, action, className = "", tone = "calm" }: Props) {
  const useDefaultArt = !Icon;
  return (
    <motion.div
      className={`flex flex-col items-center justify-center text-center px-6 py-10 sm:py-12 ${className}`.trim()}
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
    >
      {useDefaultArt ? (
        <div className="mb-4">
          <EmptyMailboxArt tone={tone} />
        </div>
      ) : Icon ? (
        <span
          className="mb-4 inline-flex items-center justify-center w-14 h-14 rounded-2xl"
          style={{ background: "rgba(51,116,133,0.08)", color: "#337485" }}
        >
          <Icon className="w-7 h-7" />
        </span>
      ) : null}
      <p
        className="text-[15px] tracking-tight"
        style={{
          color: "#2D1D0F",
          fontFamily: "var(--font-baloo), system-ui, sans-serif",
          fontWeight: 800,
        }}
      >
        {title}
      </p>
      {body && (
        <p
          className="mt-1.5 text-[12.5px] leading-relaxed max-w-xs"
          style={{ color: "rgba(45,29,15,0.55)" }}
        >
          {body}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
