/**
 * NOHO Mailbox — Launchpad icons (static, retina-sharp, unique-per-tile).
 *
 * 24 distinct branded glyphs, one per Launchpad tile. Each is hand-tuned
 * for the NOHO palette (cream / blue / brown / red / amber) and rendered
 * at 64×64 with sub-pixel strokes that snap on Retina. No animations →
 * 24 tiles cost zero JS-driven repaint cycles, which fixes the FPS drop
 * users were seeing on the previous animated-icon set.
 *
 * Color reference:
 *   ink   #2D100F  outline strokes
 *   cream #F7E6C2  primary fill
 *   blue  #337485  brand accent (script wordmark / heart / blue dots)
 *   red   #E70013  flag / wax seal / urgency dot
 *   amber #F5A623  warning / sparkle
 *   green #16A34A  success / chart bar
 */

import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { className?: string };

const C = {
  ink: "#2D100F",
  cream: "#F7E6C2",
  paper: "#FFF9F3",
  blue: "#337485",
  red: "#E70013",
  amber: "#F5A623",
  green: "#16A34A",
  body: "#EBF2FA",
  shadow: "rgba(45,16,15,0.10)",
} as const;

// Shared stroke defaults — strokes snap to pixel grid for crisp Retina
// look. `fill: "none"` is the default; shapes that need a fill pass it
// AFTER {...D} so the explicit prop overrides.
const D = {
  fill: "none" as const,
  stroke: C.ink,
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  shapeRendering: "geometricPrecision" as const,
} as const;

/**
 * Shared <Heart> helper. Used by LpCustomers + LpMailbox so the same
 * curve is reused at different scales — keeps the silhouette identical
 * and avoids drift between near-duplicate inline paths.
 *
 *   cx, cy → top-center cusp of the heart (the dip between the two lobes)
 *   scale  → 1 = ~6×6 unit heart; pass 1.17 to match the old LpMailbox heart
 */
function Heart({ cx, cy, scale = 1, fill = C.red }: { cx: number; cy: number; scale?: number; fill?: string }) {
  return (
    <path
      d={`M ${cx} ${cy} c ${-1 * scale} ${-1.5 * scale} ${-3 * scale} ${-1.2 * scale} ${-3 * scale} ${0.6 * scale} c 0 ${1.6 * scale} ${3 * scale} ${3 * scale} ${3 * scale} ${3 * scale} c 0 0 ${3 * scale} ${-1.4 * scale} ${3 * scale} ${-3 * scale} c 0 ${-1.8 * scale} ${-2 * scale} ${-2.1 * scale} ${-3 * scale} ${-0.6 * scale} z`}
      fill={fill}
      stroke="none"
    />
  );
}

/* ─── Row 1 · Today ───────────────────────────────────────────────────── */

export function LpRegister({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="10" y="22" width="44" height="32" rx="4" {...D} fill={C.paper} />
      <rect x="14" y="14" width="36" height="10" rx="2" {...D} fill={C.cream} />
      <rect x="16" y="28" width="14" height="8" rx="2" fill={C.blue} stroke="none" />
      {/* "$" glyph: bold S-curve + vertical bar (hand-pathed for cross-OS consistency) */}
      <path d="M25 30.2 c -1.5 0 -2.4 0.7 -2.4 1.7 c 0 0.9 0.7 1.4 2 1.7 c 1.3 0.3 2 0.8 2 1.7 c 0 1 -0.9 1.7 -2.4 1.7 c -1.1 0 -2 -0.3 -2.6 -0.9" stroke={C.paper} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M23 29.2 V35.2" stroke={C.paper} strokeWidth="1" strokeLinecap="round" />
      <circle cx="38" cy="32" r="1.6" fill={C.ink} />
      <circle cx="44" cy="32" r="1.6" fill={C.ink} />
      <circle cx="50" cy="32" r="1.6" fill={C.ink} />
      <path d="M16 42 H48 M16 47 H48" {...D} />
    </svg>
  );
}

export function LpSignup({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M14 12 H42 L50 20 V52 a2 2 0 0 1 -2 2 H14 a2 2 0 0 1 -2 -2 V14 a2 2 0 0 1 2 -2 z" {...D} fill={C.paper} />
      <path d="M42 12 V20 H50" {...D} />
      <path d="M20 30 H40 M20 36 H40 M20 42 H32" {...D} />
      <circle cx="48" cy="48" r="9" {...D} fill={C.amber} />
      <path d="M48 44 V52 M44 48 H52" stroke={C.paper} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LpCredits({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M10 20 a4 4 0 0 1 4 -4 H46 a4 4 0 0 1 4 4 V44 a4 4 0 0 1 -4 4 H14 a4 4 0 0 1 -4 -4 z" {...D} fill={C.paper} />
      <rect x="10" y="24" width="40" height="6" fill={C.ink} />
      <circle cx="44" cy="40" r="3" fill={C.green} />
      <path d="M14 36 H22" {...D} />
      <circle cx="54" cy="20" r="6" fill={C.green} stroke="none" />
      {/* "$" glyph: bold S-curve + vertical bar (hand-pathed for cross-OS consistency) */}
      <path d="M56.5 17.6 c -2.2 0 -3.5 1 -3.5 2.4 c 0 1.3 1 2 2.9 2.4 c 1.9 0.4 2.9 1.1 2.9 2.4 c 0 1.4 -1.3 2.4 -3.5 2.4 c -1.6 0 -2.9 -0.4 -3.8 -1.3" stroke={C.paper} strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M54 16 V24" stroke={C.paper} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function LpCustomers({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <circle cx="20" cy="22" r="7" {...D} fill={C.cream} />
      <circle cx="44" cy="22" r="7" {...D} fill={C.cream} />
      <circle cx="32" cy="18" r="6" {...D} fill={C.blue} />
      <path d="M8 50 a12 12 0 0 1 24 0" {...D} fill={C.cream} />
      <path d="M32 50 a12 12 0 0 1 24 0" {...D} fill={C.cream} />
      <path d="M20 48 a12 12 0 0 1 24 0" {...D} fill={C.paper} />
      <Heart cx={28} cy={36} scale={1} fill={C.red} />
    </svg>
  );
}

export function LpMailbox({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      {/* mailbox body */}
      <path d="M12 26 a10 10 0 0 1 10 -10 H50 v22 H12 z" {...D} fill={C.cream} />
      <rect x="12" y="38" width="38" height="12" rx="2" {...D} fill={C.cream} />
      {/* slot */}
      <rect x="18" y="22" width="8" height="2.5" rx="1" fill={C.ink} />
      {/* flag pole + flag */}
      <path d="M50 18 V40" {...D} />
      <path d="M50 18 H42 V26 H50 z" {...D} fill={C.red} />
      {/* post */}
      <path d="M28 50 V58 M22 58 H38" {...D} />
      {/* heart on body — shared <Heart>, scale 1.17 ≈ original 3.5 lobes */}
      <Heart cx={36} cy={32} scale={1.17} fill={C.blue} />
    </svg>
  );
}

export function LpCompliance({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M32 6 L52 14 V32 c 0 12 -8 20 -20 24 c -12 -4 -20 -12 -20 -24 V14 z" {...D} fill={C.paper} />
      <path d="M22 32 L29 39 L43 25" stroke={C.blue} strokeWidth="3.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Row 2 · Postal ──────────────────────────────────────────────────── */

export function LpMail({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="6" y="14" width="52" height="36" rx="3" {...D} fill={C.cream} />
      <path d="M6 18 L32 36 L58 18" {...D} />
      <circle cx="48" cy="42" r="4" {...D} fill={C.red} />
      <path d="M48 40 V44 M46 42 H50" stroke={C.paper} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function LpRequests({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="10" y="10" width="34" height="44" rx="3" {...D} fill={C.paper} />
      <rect x="18" y="6" width="18" height="6" rx="2" {...D} fill={C.cream} />
      <path d="M16 24 H38 M16 30 H38 M16 36 H30" {...D} />
      <circle cx="50" cy="44" r="9" {...D} fill={C.amber} />
      <path d="M46 44 H54 M50 40 V48" stroke={C.paper} strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

export function LpMailHold({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M12 30 a10 10 0 0 1 10 -10 H42 a10 10 0 0 1 10 10 V46 a2 2 0 0 1 -2 2 H14 a2 2 0 0 1 -2 -2 z" {...D} fill={C.cream} />
      <rect x="24" y="32" width="4" height="12" rx="1" fill={C.red} stroke="none" />
      <rect x="36" y="32" width="4" height="12" rx="1" fill={C.red} stroke="none" />
      <path d="M24 54 V58 M40 54 V58" {...D} />
    </svg>
  );
}

export function LpKeys({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <circle cx="22" cy="22" r="10" {...D} fill={C.amber} />
      <circle cx="22" cy="22" r="3" fill={C.paper} stroke="none" />
      <path d="M30 22 L52 22 L52 30 L48 30 M44 22 V28" {...D} />
      <circle cx="42" cy="48" r="8" {...D} fill={C.blue} />
      <circle cx="42" cy="48" r="2.5" fill={C.paper} stroke="none" />
    </svg>
  );
}

export function LpDeliveries({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="4" y="20" width="34" height="22" rx="2" {...D} fill={C.paper} />
      <path d="M38 28 H50 L58 36 V42 H38 z" {...D} fill={C.paper} />
      <circle cx="16" cy="46" r="5" {...D} fill={C.blue} />
      <circle cx="46" cy="46" r="5" {...D} fill={C.blue} />
      <circle cx="16" cy="46" r="2" fill={C.paper} stroke="none" />
      <circle cx="46" cy="46" r="2" fill={C.paper} stroke="none" />
      <rect x="42" y="32" width="6" height="5" fill={C.ink} stroke="none" opacity="0.3" />
    </svg>
  );
}

export function LpQR({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="8"  y="8"  width="18" height="18" rx="2" {...D} fill={C.paper} />
      <rect x="38" y="8"  width="18" height="18" rx="2" {...D} fill={C.paper} />
      <rect x="8"  y="38" width="18" height="18" rx="2" {...D} fill={C.paper} />
      <rect x="13" y="13" width="8"  height="8"  fill={C.ink} />
      <rect x="43" y="13" width="8"  height="8"  fill={C.ink} />
      <rect x="13" y="43" width="8"  height="8"  fill={C.ink} />
      <rect x="38" y="38" width="6"  height="6"  fill={C.blue} />
      <rect x="50" y="38" width="6"  height="6"  fill={C.ink} />
      <rect x="38" y="50" width="6"  height="6"  fill={C.ink} />
      <rect x="50" y="50" width="6"  height="6"  fill={C.blue} />
    </svg>
  );
}

/* ─── Row 3 · Money & services ────────────────────────────────────────── */

export function LpNotary({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="10" y="34" width="44" height="6" rx="2" fill={C.ink} />
      <path d="M22 34 V20 a4 4 0 0 1 1.5 -3 L28 14 V8 a4 4 0 0 1 8 0 V14 L40.5 17 A4 4 0 0 1 42 20 V34" {...D} fill={C.cream} />
      <circle cx="32" cy="50" r="6" {...D} fill={C.red} />
      <path d="M32 47 L33 50 L36 50 L33.5 51.8 L34.5 55 L32 53 L29.5 55 L30.5 51.8 L28 50 L31 50 z" fill={C.paper} stroke="none" />
    </svg>
  );
}

export function LpShipping({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M32 8 L54 18 V44 L32 56 L10 44 V18 z" {...D} fill={C.cream} />
      <path d="M10 18 L32 28 L54 18" {...D} />
      <path d="M32 28 V56" {...D} />
      <path d="M21 13 L43 23" stroke={C.red} strokeWidth="3" strokeLinecap="round" />
      <rect x="36" y="34" width="14" height="9" rx="1" {...D} fill={C.paper} />
      <path d="M39 38 H47 M39 41 H45" stroke={C.ink} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function LpShop({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M14 22 H50 L46 56 H18 z" {...D} fill={C.cream} />
      <path d="M22 22 V14 a10 10 0 0 1 20 0 V22" {...D} />
      <circle cx="26" cy="34" r="2" fill={C.red} stroke="none" />
      <circle cx="38" cy="34" r="2" fill={C.red} stroke="none" />
    </svg>
  );
}

export function LpBilling({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M14 8 H50 V58 L44 54 L38 58 L32 54 L26 58 L20 54 L14 58 z" {...D} fill={C.paper} />
      <path d="M22 22 H42 M22 30 H38 M22 38 H42" {...D} />
      <circle cx="44" cy="38" r="6" fill={C.blue} stroke="none" />
      {/* "$" glyph: bold S-curve + vertical bar (hand-pathed for cross-OS consistency) */}
      <path d="M46 35.4 c -2 0 -3.1 0.9 -3.1 2.1 c 0 1.1 0.9 1.7 2.6 2.1 c 1.7 0.4 2.6 1 2.6 2.1 c 0 1.2 -1.1 2.1 -3.1 2.1 c -1.4 0 -2.6 -0.4 -3.4 -1.1" stroke={C.paper} strokeWidth="1" fill="none" strokeLinecap="round" />
      <path d="M44 34 V42" stroke={C.paper} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

export function LpRevenue({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M8 56 H56" {...D} />
      <rect x="14" y="42" width="8" height="14" rx="1" {...D} fill={C.cream} />
      <rect x="28" y="32" width="8" height="24" rx="1" {...D} fill={C.cream} />
      <rect x="42" y="20" width="8" height="36" rx="1" {...D} fill={C.green} />
      <path d="M10 36 L24 26 L36 30 L52 12" stroke={C.red} strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <path d="M48 12 L52 12 L52 16" stroke={C.red} strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function LpCancellations({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <circle cx="32" cy="32" r="22" {...D} fill={C.paper} />
      <path d="M22 22 L42 42 M42 22 L22 42" stroke={C.red} strokeWidth="3.5" strokeLinecap="round" />
    </svg>
  );
}

/* ─── Row 4 · System & comms ──────────────────────────────────────────── */

export function LpSquare({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="8" y="8" width="48" height="48" rx="6" fill={C.ink} stroke={C.ink} strokeWidth="2" />
      <rect x="20" y="20" width="24" height="24" rx="2" fill={C.paper} />
      <rect x="26" y="26" width="12" height="12" rx="1" fill={C.ink} />
    </svg>
  );
}

export function LpQuarterly({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="8" y="14" width="48" height="42" rx="3" {...D} fill={C.paper} />
      <rect x="8" y="14" width="48" height="10" {...D} fill={C.amber} />
      <path d="M18 8 V20 M46 8 V20" {...D} />
      <rect x="14" y="32" width="8" height="6" rx="1" fill={C.ink} opacity="0.15" stroke="none" />
      <rect x="26" y="32" width="8" height="6" rx="1" fill={C.amber} stroke="none" />
      <rect x="38" y="32" width="8" height="6" rx="1" fill={C.ink} opacity="0.15" stroke="none" />
      <rect x="14" y="42" width="8" height="6" rx="1" fill={C.ink} opacity="0.15" stroke="none" />
      <rect x="26" y="42" width="8" height="6" rx="1" fill={C.ink} opacity="0.15" stroke="none" />
    </svg>
  );
}

export function LpMessages({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M8 16 a4 4 0 0 1 4 -4 H48 a4 4 0 0 1 4 4 V40 a4 4 0 0 1 -4 4 H22 L12 52 V44 a4 4 0 0 1 -4 -4 z" {...D} fill={C.cream} />
      <circle cx="20" cy="28" r="2" fill={C.ink} />
      <circle cx="30" cy="28" r="2" fill={C.ink} />
      <circle cx="40" cy="28" r="2" fill={C.ink} />
      <circle cx="50" cy="48" r="6" fill={C.red} stroke="none" />
      {/* "!" glyph: vertical bar + dot (hand-pathed for cross-OS consistency) */}
      <rect x="49" y="44" width="2" height="5" rx="1" fill={C.paper} stroke="none" />
      <circle cx="50" cy="51" r="1" fill={C.paper} stroke="none" />
    </svg>
  );
}

export function LpEmails({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="14" y="6"  width="40" height="14" rx="2" {...D} fill={C.cream} />
      <rect x="10" y="22" width="44" height="14" rx="2" {...D} fill={C.paper} />
      <rect x="6"  y="38" width="48" height="20" rx="2" {...D} fill={C.cream} />
      <path d="M6 38 L30 50 L54 38" stroke={C.ink} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M14 12 L34 12 M14 28 L46 28" stroke={C.ink} strokeWidth="1" strokeLinecap="round" />
    </svg>
  );
}

export function LpInsights({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="6" y="6" width="52" height="52" rx="4" {...D} fill={C.paper} />
      <path d="M12 46 L24 32 L34 40 L52 18" stroke={C.blue} strokeWidth="3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="32" r="2.5" fill={C.blue} />
      <circle cx="34" cy="40" r="2.5" fill={C.blue} />
      <circle cx="52" cy="18" r="2.5" fill={C.red} />
    </svg>
  );
}

export function LpBookkeeping({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="10" y="8" width="44" height="48" rx="3" {...D} fill={C.paper} />
      <rect x="10" y="8" width="44" height="6" {...D} fill={C.blue} />
      <path d="M18 22 H38 M18 30 H46 M18 38 H32 M18 46 H42" stroke={C.ink} strokeWidth="1.6" />
      <rect x="16" y="20" width="2" height="32" fill={C.red} />
    </svg>
  );
}

export function LpTenants({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      <rect x="6"  y="22" width="22" height="34" rx="2" {...D} fill={C.paper} />
      <rect x="32" y="10" width="26" height="46" rx="2" {...D} fill={C.cream} />
      <rect x="36" y="16" width="6" height="6" fill={C.ink} opacity="0.7" stroke="none" />
      <rect x="48" y="16" width="6" height="6" fill={C.ink} opacity="0.7" stroke="none" />
      <rect x="36" y="28" width="6" height="6" fill={C.ink} opacity="0.7" stroke="none" />
      <rect x="48" y="28" width="6" height="6" fill={C.ink} opacity="0.7" stroke="none" />
      <rect x="36" y="40" width="6" height="6" fill={C.ink} opacity="0.7" stroke="none" />
      <rect x="48" y="40" width="6" height="6" fill={C.ink} opacity="0.7" stroke="none" />
      <rect x="12" y="30" width="4" height="4" fill={C.ink} opacity="0.5" stroke="none" />
      <rect x="20" y="30" width="4" height="4" fill={C.ink} opacity="0.5" stroke="none" />
      <rect x="12" y="40" width="4" height="4" fill={C.ink} opacity="0.5" stroke="none" />
      <rect x="20" y="40" width="4" height="4" fill={C.ink} opacity="0.5" stroke="none" />
    </svg>
  );
}

export function LpSettings({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg" {...rest}>
      {/* gear teeth */}
      <path d="M32 6 L34 12 L40 10 L42 16 L48 16 L48 22 L54 24 L52 30 L58 32 L52 34 L54 40 L48 42 L48 48 L42 48 L40 54 L34 52 L32 58 L30 52 L24 54 L22 48 L16 48 L16 42 L10 40 L12 34 L6 32 L12 30 L10 24 L16 22 L16 16 L22 16 L24 10 L30 12 z" {...D} fill={C.cream} />
      <circle cx="32" cy="32" r="9" {...D} fill={C.blue} />
      <circle cx="32" cy="32" r="3" fill={C.paper} stroke="none" />
    </svg>
  );
}
