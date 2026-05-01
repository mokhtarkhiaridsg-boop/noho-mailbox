/**
 * NOHO Mailbox — Animated branded icons.
 *
 * Self-animating SVG icons that pair an idle micro-animation with a hover
 * reaction. Apple-restrained: small, slow, purposeful. All animations live
 * in globals.css under the .ai-* prefix and respect prefers-reduced-motion.
 *
 * Usage:
 *   <AiMailbox className="w-12 h-12" />
 *   <AiTruck className="w-16 h-12" />
 *
 * Pass any standard SVG className for sizing. The wrapper class `ai-icon`
 * is added automatically so hover states fire.
 */

import { type SVGProps } from "react";

const BRAND = {
  cream: "#F7E6C2",
  blue: "#337485",
  ink: "#2D100F",
  paper: "#FFF9F3",
  body: "#EBF2FA",
  red: "#E70013",
  amber: "#F5A623",
} as const;

type IconProps = SVGProps<SVGSVGElement>;

function withAi(props: IconProps): IconProps {
  const cls = ["ai-icon", props.className].filter(Boolean).join(" ");
  return { ...props, className: cls, fill: "none", xmlns: "http://www.w3.org/2000/svg" };
}

/* ─── Mailbox — idle flag flutter, hover lifts ────────────────────────────── */
export function AiMailbox(props: IconProps) {
  return (
    <svg viewBox="0 0 120 140" {...withAi(props)}>
      <rect x="52" y="90" width="16" height="40" rx="2" fill={BRAND.body} stroke={BRAND.ink} strokeWidth="3" />
      <rect x="40" y="126" width="40" height="6" rx="3" fill={BRAND.body} stroke={BRAND.ink} strokeWidth="2.5" />
      <rect x="16" y="30" width="84" height="52" rx="10" fill={BRAND.body} stroke={BRAND.ink} strokeWidth="3.5" />
      <path d="M16 48 Q16 18 58 18 Q100 18 100 48" fill={BRAND.body} stroke={BRAND.ink} strokeWidth="3.5" />
      {/* Flag pole */}
      <rect x="98" y="30" width="5" height="28" rx="2" fill={BRAND.blue} stroke={BRAND.ink} strokeWidth="2" />
      {/* Flag — fluttering, Tunisian-red on hover via tint */}
      <g className="ai-flag" style={{ transformOrigin: "98px 30px", transformBox: "fill-box" }}>
        <rect x="96" y="26" width="14" height="9" rx="2.5" fill={BRAND.red} stroke={BRAND.ink} strokeWidth="2" />
      </g>
      {/* Heart on body — heartbeat */}
      <g className="ai-heart">
        <path d="M48 52 C48 45 38 42 38 49 C38 57 48 63 48 63 C48 63 58 57 58 49 C58 42 48 45 48 52Z" fill={BRAND.blue} />
      </g>
    </svg>
  );
}

/* ─── Delivery Truck — idle gentle roll, hover spins wheels ───────────────── */
export function AiTruck(props: IconProps) {
  return (
    <svg viewBox="0 0 120 80" {...withAi(props)}>
      <g className="ai-truck">
        <rect x="4" y="16" width="68" height="40" rx="6" fill={BRAND.body} stroke={BRAND.ink} strokeWidth="3" />
        <path d="M72 30 L72 56 L108 56 L108 40 L92 30 Z" fill={BRAND.body} stroke={BRAND.ink} strokeWidth="3" strokeLinejoin="round" />
        <rect x="78" y="36" width="14" height="10" rx="2" fill={BRAND.blue} opacity="0.3" stroke={BRAND.ink} strokeWidth="1.5" />
        <line x1="4" y1="56" x2="108" y2="56" stroke={BRAND.ink} strokeWidth="3" />
        <g>
          <circle cx="30" cy="60" r="10" fill={BRAND.body} stroke={BRAND.ink} strokeWidth="3" />
          <g className="ai-wheel" style={{ transformOrigin: "30px 60px" }}>
            <circle cx="30" cy="60" r="4" fill={BRAND.blue} />
            <path d="M30 53 L30 67 M23 60 L37 60" stroke={BRAND.ink} strokeWidth="1.2" />
          </g>
        </g>
        <g>
          <circle cx="90" cy="60" r="10" fill={BRAND.body} stroke={BRAND.ink} strokeWidth="3" />
          <g className="ai-wheel" style={{ transformOrigin: "90px 60px" }}>
            <circle cx="90" cy="60" r="4" fill={BRAND.blue} />
            <path d="M90 53 L90 67 M83 60 L97 60" stroke={BRAND.ink} strokeWidth="1.2" />
          </g>
        </g>
      </g>
    </svg>
  );
}

/* ─── Shield with check — idle quiet, hover glows ─────────────────────────── */
export function AiShield(props: IconProps) {
  return (
    <svg viewBox="0 0 48 56" {...withAi(props)}>
      <g className="ai-shield-body">
        <path
          d="M24 4 L4 14 L4 28 C4 40 12 50 24 54 C36 50 44 40 44 28 L44 14 Z"
          fill={BRAND.paper}
          stroke={BRAND.ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </g>
      <path d="M16 28 L22 34 L34 20" stroke={BRAND.blue} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Envelope — gentle idle tilt ─────────────────────────────────────────── */
export function AiEnvelope(props: IconProps) {
  return (
    <svg viewBox="0 0 64 48" {...withAi(props)}>
      <g className="ai-envelope">
        <rect x="2" y="2" width="60" height="44" rx="6" fill={BRAND.body} stroke={BRAND.ink} strokeWidth="3" />
        <path d="M4 6 L32 26 L60 6" stroke={BRAND.ink} strokeWidth="3" fill="none" strokeLinejoin="round" />
        {/* Wax seal — Tunisian red */}
        <circle cx="48" cy="36" r="4" fill={BRAND.red} stroke={BRAND.ink} strokeWidth="1.5" />
      </g>
    </svg>
  );
}

/* ─── Clock — second hand ticks every 2 seconds ───────────────────────────── */
export function AiClock(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" {...withAi(props)}>
      <circle cx="24" cy="24" r="20" fill={BRAND.paper} stroke={BRAND.ink} strokeWidth="2.5" />
      {/* Hour marks */}
      {[0, 90, 180, 270].map((deg) => (
        <line
          key={deg}
          x1="24" y1="6" x2="24" y2="9"
          stroke={BRAND.ink} strokeWidth="2" strokeLinecap="round"
          transform={`rotate(${deg} 24 24)`}
        />
      ))}
      {/* Static hour hand */}
      <path d="M24 24 L24 14" stroke={BRAND.ink} strokeWidth="3" strokeLinecap="round" />
      {/* Ticking second hand */}
      <g className="ai-clock-hand">
        <path d="M24 24 L24 10" stroke={BRAND.red} strokeWidth="2" strokeLinecap="round" />
      </g>
      <circle cx="24" cy="24" r="2" fill={BRAND.ink} />
    </svg>
  );
}

/* ─── Lightning bolt — idle flash, used for "Same-Day" surfaces ──────────── */
export function AiBolt(props: IconProps) {
  return (
    <svg viewBox="0 0 48 48" {...withAi(props)}>
      <g className="ai-bolt">
        <path
          d="M26 4 L8 28 L20 28 L18 44 L40 18 L26 18 Z"
          fill={BRAND.cream}
          stroke={BRAND.ink}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

/* ─── Map pin — bobbing on idle, used for delivery zones / location ───────── */
export function AiPin(props: IconProps) {
  return (
    <svg viewBox="0 0 48 56" {...withAi(props)}>
      <g className="ai-pin">
        <path
          d="M24 4 C32 4 38 10 38 18 C38 28 24 48 24 48 C24 48 10 28 10 18 C10 10 16 4 24 4 Z"
          fill={BRAND.blue}
          stroke={BRAND.ink}
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
        <circle cx="24" cy="18" r="5" fill={BRAND.cream} stroke={BRAND.ink} strokeWidth="2" />
      </g>
    </svg>
  );
}

/* ─── Heart — heartbeat, used for "made with love / family-owned" ─────────── */
export function AiHeart(props: IconProps) {
  return (
    <svg viewBox="0 0 48 44" {...withAi(props)}>
      <g className="ai-heart">
        <path
          d="M24 8 C24 2 14 -1 14 7 C14 16 24 24 24 24 C24 24 34 16 34 7 C34 -1 24 2 24 8Z"
          fill={BRAND.red}
          stroke={BRAND.ink}
          strokeWidth="2.5"
          transform="translate(0, 10) scale(1.35)"
        />
      </g>
    </svg>
  );
}

/* ─── Box — package ───────────────────────────────────────────────────────── */
export function AiBox(props: IconProps) {
  return (
    <svg viewBox="0 0 80 80" {...withAi(props)}>
      <path d="M40 8 L72 22 L72 58 L40 72 L8 58 L8 22 Z" fill={BRAND.body} stroke={BRAND.ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M8 22 L40 36 L72 22" stroke={BRAND.ink} strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 36 L40 72" stroke={BRAND.ink} strokeWidth="3" />
      {/* Tape strip — Tunisian red accent */}
      <path d="M24 15 L56 29" stroke={BRAND.red} strokeWidth="4" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Sparkle — for "premium / new" markers ───────────────────────────────── */
export function AiSparkle(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" {...withAi(props)}>
      <g className="ai-bolt">
        <path
          d="M12 2 L13.5 9 L20 12 L13.5 15 L12 22 L10.5 15 L4 12 L10.5 9 Z"
          fill={BRAND.amber}
          stroke={BRAND.ink}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}
