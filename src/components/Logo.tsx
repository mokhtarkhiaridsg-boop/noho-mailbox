export default function Logo({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 370 172"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      role="img"
      aria-label="NOHO Mailbox"
    >
      {/* NOHO bubble letters — uses loaded Nunito Black, paint-order: stroke fill for the outline effect */}
      <text
        x="4"
        y="106"
        fill="#EBF2FA"
        stroke="#1A1714"
        strokeWidth="10"
        strokeLinejoin="round"
        style={{
          fontFamily: "var(--font-nunito), Nunito, 'Arial Rounded MT Bold', Arial, sans-serif",
          fontSize: "110px",
          fontWeight: 900,
          paintOrder: "stroke fill",
          letterSpacing: "-3px",
        } as React.CSSProperties}
      >
        NOHO
      </text>

      {/* Mailbox script */}
      <text
        x="10"
        y="159"
        fill="#3374B5"
        style={{
          fontFamily: "var(--font-dancing), 'Dancing Script', cursive",
          fontSize: "60px",
          fontWeight: 700,
        } as React.CSSProperties}
      >
        Mailbox
      </text>

      {/* Swoosh underline */}
      <path
        d="M10 167 Q135 181 270 165"
        stroke="#3374B5"
        strokeWidth="4.5"
        strokeLinecap="round"
      />

      {/* Mailbox icon */}
      <g transform="translate(276, 107) scale(0.43)">
        <rect x="50" y="88" width="14" height="42" rx="2" fill="#EBF2FA" stroke="#1A1714" strokeWidth="3" />
        <rect x="38" y="127" width="38" height="5" rx="2.5" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2.5" />
        <rect x="14" y="26" width="82" height="52" rx="9" fill="#EBF2FA" stroke="#1A1714" strokeWidth="3.5" />
        <path d="M14 46 Q14 16 55 16 Q96 16 96 46" fill="#EBF2FA" stroke="#1A1714" strokeWidth="3.5" />
        <rect x="95" y="28" width="5" height="27" rx="2" fill="#3374B5" stroke="#1A1714" strokeWidth="2" />
        <rect x="93" y="24" width="14" height="9" rx="2" fill="#3374B5" stroke="#1A1714" strokeWidth="2" />
        <path d="M44 50 C44 43 34 40 34 47 C34 55 44 61 44 61 C44 61 54 55 54 47 C54 40 44 43 44 50Z" fill="#3374B5" />
      </g>
    </svg>
  );
}
