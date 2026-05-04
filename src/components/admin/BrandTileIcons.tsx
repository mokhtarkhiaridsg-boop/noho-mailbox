/**
 * NOHO Mailbox — Admin Launchpad branded glyphs.
 *
 * Single-stroke SVG glyphs for Launchpad tiles. Each glyph uses postal /
 * mailbox / heart motifs from the brand spec so the tiles read as NOHO
 * at a glance — not generic Apple line-art.
 *
 * All icons are monochrome (currentColor) so they tint to whatever the
 * tile's iconColor is set to (typically white on a colored chip bg).
 * Sizing is via className (w-* h-*) like every other icon in the app.
 */

import type { SVGProps } from "react";

type Props = SVGProps<SVGSVGElement> & { className?: string };

const SVG_DEFAULTS = {
  fill: "none" as const,
  stroke: "currentColor" as const,
  strokeWidth: 1.8,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

// Mailbox with flag — primary brand motif for the bureau itself.
export function BiMailbox({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...SVG_DEFAULTS} {...rest}>
      {/* mailbox body */}
      <path d="M4 11 a4 4 0 0 1 4 -4 h8 a4 4 0 0 1 4 4 v6 a1 1 0 0 1 -1 1 H5 a1 1 0 0 1 -1 -1 z" />
      {/* slot */}
      <path d="M7 11 H11" />
      {/* flag pole + flag */}
      <path d="M20 11 V5" />
      <path d="M20 5 H17 V8 H20" />
      {/* post */}
      <path d="M12 18 V22 M9 22 H15" />
    </svg>
  );
}

// Envelope with a tiny heart — mail-with-care motif.
export function BiEnvelope({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...SVG_DEFAULTS} {...rest}>
      <rect x="3" y="6" width="18" height="13" rx="2" />
      <path d="M3 9 L12 14 L21 9" />
      {/* heart sticker */}
      <path d="M12 16 c -0.5 -0.7 -1.5 -0.5 -1.5 0.4 c 0 0.9 1.5 1.6 1.5 1.6 c 0 0 1.5 -0.7 1.5 -1.6 c 0 -0.9 -1 -1.1 -1.5 -0.4 z" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Heart + people — community / customers motif.
export function BiCommunity({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...SVG_DEFAULTS} {...rest}>
      <circle cx="9" cy="9" r="2.6" />
      <path d="M3.5 19 a5.5 5.5 0 0 1 11 0" />
      {/* heart on shoulder */}
      <path d="M16.5 7 c -0.6 -0.9 -2 -0.6 -2 0.6 c 0 1.2 2 2 2 2 c 0 0 2 -0.8 2 -2 c 0 -1.2 -1.4 -1.5 -2 -0.6 z" fill="currentColor" stroke="none" />
    </svg>
  );
}

// Truck with route — deliveries motif (matches AiTruck shape, simpler).
export function BiTruck({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...SVG_DEFAULTS} {...rest}>
      <rect x="2" y="7" width="11" height="9" rx="1.5" />
      <path d="M13 10 H17 L21 13 V16 H13 Z" />
      <circle cx="6.5" cy="17" r="1.6" />
      <circle cx="17.5" cy="17" r="1.6" />
    </svg>
  );
}

// Cardboard box with tape — package motif.
export function BiBox({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...SVG_DEFAULTS} {...rest}>
      <path d="M4 7 L12 3 L20 7 V17 L12 21 L4 17 Z" />
      <path d="M4 7 L12 11 L20 7" />
      <path d="M12 11 V21" />
      {/* tape */}
      <path d="M9 5.5 L9 9.5" />
    </svg>
  );
}

// Shield with check — compliance motif.
export function BiShield({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...SVG_DEFAULTS} {...rest}>
      <path d="M12 3 L20 6 V12 c 0 4.5 -3.5 7.5 -8 9 c -4.5 -1.5 -8 -4.5 -8 -9 V6 z" />
      <path d="M9 12 L11 14 L15 10" />
    </svg>
  );
}

// Stamp — notary motif.
export function BiStamp({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...SVG_DEFAULTS} {...rest}>
      <path d="M5 19 H19" />
      <path d="M7 16 H17 V13 a3 3 0 0 0 -1 -2.4 L14 9 V6 a2 2 0 0 0 -4 0 V9 L8 10.6 a3 3 0 0 0 -1 2.4 z" />
    </svg>
  );
}

// Pin — mail hold / vacation motif.
export function BiPin({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...SVG_DEFAULTS} {...rest}>
      <path d="M12 21 V14" />
      <path d="M9 4 H15 V8 L17 11 H7 L9 8 z" />
    </svg>
  );
}

// QR code — pickup motif.
export function BiQR({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...SVG_DEFAULTS} {...rest}>
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <path d="M14 14 H17 V17 H14 z M19 19 H21 V21 H19 z M14 19 H17 V21 H14 z M19 14 H21" />
    </svg>
  );
}

// Cash register — POS motif.
export function BiRegister({ className, ...rest }: Props) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...SVG_DEFAULTS} {...rest}>
      <rect x="3" y="9" width="18" height="11" rx="1.5" />
      <path d="M5 9 V6 a1 1 0 0 1 1 -1 H18 a1 1 0 0 1 1 1 V9" />
      <path d="M7 13 H11 M14 13 H17 M7 16 H11 M14 16 H17" />
    </svg>
  );
}
