/**
 * NOHO Mailbox — admin sidebar icon set.
 * Heroicons-style line glyphs at 1.75 stroke, currentColor.
 * Each icon supports a subtle hover-only animation triggered by the parent
 * `.group:hover` class — no JS needed.
 */
type Props = { className?: string };

function Svg({
  className = "w-4 h-4",
  children,
}: Props & { children: React.ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const IconOverview = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="9" rx="1.5" className="transition-transform duration-300 group-hover:translate-y-[-1px]" />
    <rect x="14" y="3" width="7" height="5" rx="1.5" className="transition-transform duration-300 group-hover:translate-y-[1px]" />
    <rect x="14" y="12" width="7" height="9" rx="1.5" className="transition-transform duration-300 group-hover:translate-y-[-1px]" />
    <rect x="3" y="16" width="7" height="5" rx="1.5" className="transition-transform duration-300 group-hover:translate-y-[1px]" />
  </Svg>
);

export const IconSignup = (p: Props) => (
  <Svg {...p}>
    <path d="M12 4v12" className="transition-transform duration-300 group-hover:translate-y-[1px]" />
    <path d="m6 10 6 6 6-6" className="transition-transform duration-300 group-hover:translate-y-[1px]" />
    <path d="M4 20h16" />
  </Svg>
);

export const IconCredit = (p: Props) => (
  <Svg {...p}>
    <rect
      x="3"
      y="6"
      width="18"
      height="12"
      rx="2"
      className="transition-all duration-300 group-hover:[stroke-dasharray:0_60_0] group-hover:[stroke-dashoffset:0]"
    />
    <path d="M3 10h18" />
    <path d="M7 15h3" />
  </Svg>
);

export const IconCustomers = (p: Props) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.5" className="transition-transform duration-300 origin-center group-hover:scale-110" />
    <path d="M3 20c0-3 3-5 6-5s6 2 6 5" />
    <circle cx="17" cy="6" r="2.5" className="transition-transform duration-300 origin-center group-hover:scale-110" />
    <path d="M15 13c2-1 6-1 6 3" />
  </Svg>
);

export const IconCompliance = (p: Props) => (
  <Svg {...p}>
    <path
      d="M12 3 4 6v6c0 4 3 7 8 8 5-1 8-4 8-8V6z"
      className="transition-transform duration-300 origin-center group-hover:scale-105"
    />
    <path d="m9 12 2 2 4-4" />
  </Svg>
);

export const IconMail = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="14" rx="2" />
    <path
      d="m3 8 9 6 9-6"
      className="transition-transform duration-300 group-hover:translate-y-[-1px]"
    />
  </Svg>
);

export const IconClipboard = (p: Props) => (
  <Svg {...p}>
    <rect x="6" y="4" width="12" height="17" rx="2" />
    <path d="M9 4h6" />
    <path d="M9 10h6 M9 14h6 M9 18h3" className="transition-opacity duration-300 group-hover:opacity-100 opacity-70" />
  </Svg>
);

export const IconKey = (p: Props) => (
  <Svg {...p}>
    <circle cx="8" cy="14" r="4" className="transition-transform duration-300 origin-[8px_14px] group-hover:rotate-[-12deg]" />
    <path d="M11 12 21 3" className="transition-transform duration-300 origin-[11px_12px] group-hover:rotate-[-12deg]" />
    <path d="m17 7 3 3" className="transition-transform duration-300 origin-[11px_12px] group-hover:rotate-[-12deg]" />
  </Svg>
);

export const IconBox = (p: Props) => (
  <Svg {...p}>
    <path
      d="M21 7.5 12 3 3 7.5"
      className="transition-transform duration-300 group-hover:translate-y-[-1px]"
    />
    <path d="M21 7.5v9L12 21M3 7.5v9L12 21M12 12v9M21 7.5 12 12 3 7.5" />
  </Svg>
);

export const IconHold = (p: Props) => (
  <Svg {...p}>
    <rect x="4" y="4" width="6" height="16" rx="1.5" />
    <rect x="14" y="4" width="6" height="16" rx="1.5" />
  </Svg>
);

export const IconQR = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1" className="transition-opacity duration-300 group-hover:opacity-100 opacity-90" />
    <rect x="14" y="3" width="7" height="7" rx="1" className="transition-opacity duration-300 group-hover:opacity-100 opacity-90" />
    <rect x="3" y="14" width="7" height="7" rx="1" className="transition-opacity duration-300 group-hover:opacity-100 opacity-90" />
    <path d="M14 14h3v3M20 14v7M14 17h3M14 20h3M17 17h4" />
  </Svg>
);

export const IconTruck = (p: Props) => (
  <Svg {...p}>
    <path d="M3 7h11v9H3z" />
    <path
      d="M14 11h4l3 3v2h-7"
      className="transition-transform duration-300 group-hover:translate-x-[1px]"
    />
    <circle cx="7" cy="17" r="2" />
    <circle cx="18" cy="17" r="2" />
  </Svg>
);

export const IconNotary = (p: Props) => (
  <Svg {...p}>
    <path d="M12 3v3" />
    <path d="m18 9-6-3-6 3" />
    <rect x="6" y="9" width="12" height="3" rx="1" />
    <path d="M8 12v6h8v-6" />
    <path d="M5 21h14" />
    <path d="M9 15h6" className="transition-opacity duration-300 group-hover:opacity-100 opacity-70" />
  </Svg>
);

export const IconShop = (p: Props) => (
  <Svg {...p}>
    <path d="M5 8h14l-1 12H6L5 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" className="transition-transform duration-300 group-hover:translate-y-[-1px]" />
  </Svg>
);

export const IconReceipt = (p: Props) => (
  <Svg {...p}>
    <path d="M5 3h14v18l-3-2-3 2-2-2-3 2-3-2z" />
    <path d="M9 8h6 M9 12h6 M9 16h3" />
  </Svg>
);

export const IconCancel = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" className="transition-transform duration-300 origin-center group-hover:scale-110" />
    <path d="m9 9 6 6 M15 9l-6 6" />
  </Svg>
);

export const IconChat = (p: Props) => (
  <Svg {...p}>
    <path d="M4 5h16v12H8l-4 4z" />
    <path d="M8 9h8 M8 12h5" />
  </Svg>
);

export const IconEmail = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="6" width="18" height="14" rx="2" />
    <path d="m3 8 9 6 9-6" />
    <path d="M3 13l5-3M21 13l-5-3" className="opacity-50 transition-opacity duration-300 group-hover:opacity-100" />
  </Svg>
);

export const IconRevenue = (p: Props) => (
  <Svg {...p}>
    <path d="M4 18 9 12 13 16 20 7" className="transition-transform duration-300 group-hover:translate-y-[-1px]" />
    <path d="M16 7h4v4" />
  </Svg>
);

export const IconBuilding = (p: Props) => (
  <Svg {...p}>
    <rect x="5" y="4" width="14" height="17" rx="1.5" />
    <path d="M9 8h2 M13 8h2 M9 12h2 M13 12h2 M9 16h2 M13 16h2" />
  </Svg>
);

export const IconShipping = (p: Props) => (
  <Svg {...p}>
    <path d="m3 9 9-5 9 5v8l-9 5-9-5z" />
    <path d="m3 9 9 5 9-5 M12 14v8" />
  </Svg>
);

export const IconSquare = (p: Props) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" className="transition-transform duration-300 origin-center group-hover:rotate-3" />
    <path d="M9 9h6v6H9z" />
  </Svg>
);

export const IconSettings = (p: Props) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path
      d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"
      className="transition-transform duration-500 origin-center group-hover:rotate-45"
    />
  </Svg>
);

export const IconLogout = (p: Props) => (
  <Svg {...p}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </Svg>
);

export const IconExternal = (p: Props) => (
  <Svg {...p}>
    <path d="M14 4h6v6 M21 3l-9 9 M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
  </Svg>
);

// Calendar / quarterly report
export const IconCalendar = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2" />
    <path d="M3 9h18 M8 3v4 M16 3v4" />
    <rect
      x="7"
      y="13"
      width="3"
      height="3"
      rx="0.5"
      className="transition-opacity duration-300 group-hover:opacity-100 opacity-70"
    />
    <rect
      x="14"
      y="13"
      width="3"
      height="3"
      rx="0.5"
      className="transition-opacity duration-300 group-hover:opacity-100 opacity-40"
    />
  </Svg>
);

// UPS Access Point — package shield
export const IconUps = (p: Props) => (
  <Svg {...p}>
    <path
      d="M12 3 4 6v6c0 5 3.5 8.5 8 9 4.5-.5 8-4 8-9V6l-8-3z"
      className="transition-transform duration-300 origin-center group-hover:scale-105"
    />
    <path d="M9 12h6 M9 9h6 M9 15h4" />
  </Svg>
);

// Stamps.com — postage stamp
export const IconStamp = (p: Props) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" strokeDasharray="2 2" />
    <circle cx="12" cy="12" r="3" className="transition-transform duration-300 origin-center group-hover:scale-110" />
  </Svg>
);

// DHL Express — fast forward chevrons
export const IconDhl = (p: Props) => (
  <Svg {...p}>
    <path
      d="M3 12h11 M11 7l5 5-5 5 M16 7l5 5-5 5"
      className="transition-transform duration-300 group-hover:translate-x-[1px]"
    />
  </Svg>
);

// Cash register / POS — drawer + LCD strip + bell on top
export const IconRegister = (p: Props) => (
  <Svg {...p}>
    <rect x="3" y="9" width="18" height="11" rx="1.5" />
    <path d="M3 13h18" className="transition-transform duration-300 group-hover:translate-y-[-1px]" />
    <rect x="6" y="6" width="12" height="3" rx="0.5" className="transition-transform duration-300 origin-bottom group-hover:scale-y-110" />
    <circle cx="12" cy="4.5" r="0.9" className="transition-transform duration-300 origin-center group-hover:rotate-[-15deg]" />
    <path d="M7 16h2 M11 16h2 M15 16h2" />
  </Svg>
);

// Generic chart-bar / reports glyph
export const IconReport = (p: Props) => (
  <Svg {...p}>
    <path d="M3 21h18" />
    <rect x="6" y="13" width="3" height="6" rx="0.5" className="transition-transform duration-300 origin-bottom group-hover:scale-y-110" />
    <rect x="11" y="9" width="3" height="10" rx="0.5" className="transition-transform duration-300 origin-bottom group-hover:scale-y-110" />
    <rect x="16" y="5" width="3" height="14" rx="0.5" className="transition-transform duration-300 origin-bottom group-hover:scale-y-110" />
  </Svg>
);
