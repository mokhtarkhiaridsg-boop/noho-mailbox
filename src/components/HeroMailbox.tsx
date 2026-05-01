/**
 * Hero decoration: a small mailbox with a red flag that flicks up briefly
 * every ~7 seconds (driven by a CSS keyframe). Hover pauses the loop and
 * holds the flag at full-up. Reduced-motion mutes the flicking.
 *
 * Server component — pure SVG, no JS.
 */
export function HeroMailbox({ className }: { className?: string }) {
  return (
    <div
      className={`hero-mailbox group relative cursor-default ${className ?? ""}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 80 96"
        className="w-[80px] h-[96px]"
        fill="none"
      >
        {/* Post */}
        <rect x="36" y="60" width="8" height="32" rx="1.5" fill="#2D100F" />
        {/* Ground bar */}
        <rect x="26" y="88" width="28" height="5" rx="2" fill="#2D100F" />
        {/* Body — D-shaped */}
        <path
          d="M8 38 Q8 18 32 18 L60 18 Q60 18 60 38 L60 62 L8 62 Z"
          fill="#F7E6C2"
          stroke="#2D100F"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Door line */}
        <line
          x1="8"
          y1="38"
          x2="8"
          y2="62"
          stroke="#2D100F"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        {/* Inner cap arc */}
        <path
          d="M14 34 Q14 24 32 24"
          stroke="#2D100F"
          strokeWidth="1.8"
          fill="none"
          strokeLinecap="round"
          opacity="0.55"
        />
        {/* Heart on door */}
        <path
          d="M30 40
             C 30 35, 22 35, 22 41
             C 22 47, 30 52, 30 52
             C 30 52, 38 47, 38 41
             C 38 35, 30 35, 30 40 Z"
          fill="#337485"
          stroke="#2D100F"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        {/* Flag pole */}
        <rect x="60" y="18" width="3" height="22" rx="1" fill="#2D100F" />
        {/* Flag — rotates up periodically (CSS keyframe attached) */}
        <g className="hero-mailbox-flag" style={{ transformOrigin: "60px 40px" }}>
          <path
            d="M63 18 L72 18 L72 26 L63 26 Z"
            fill="#E2483D"
            stroke="#2D100F"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </g>
      </svg>
    </div>
  );
}
