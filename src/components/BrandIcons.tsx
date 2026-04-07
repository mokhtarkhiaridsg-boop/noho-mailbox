export function MailboxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Post */}
      <rect x="52" y="90" width="16" height="40" rx="2" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="3" />
      {/* Base */}
      <rect x="40" y="126" width="40" height="6" rx="3" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2.5" />
      {/* Body */}
      <rect x="16" y="30" width="84" height="52" rx="10" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="3.5" />
      {/* Top dome */}
      <path d="M16 48 Q16 18 58 18 Q100 18 100 48" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="3.5" />
      {/* Flag pole */}
      <rect x="98" y="30" width="5" height="28" rx="2" fill="#3374B5" stroke="#2D1D0F" strokeWidth="2" />
      {/* Flag */}
      <rect x="96" y="26" width="14" height="9" rx="2.5" fill="#3374B5" stroke="#2D1D0F" strokeWidth="2" />
      {/* Heart on body */}
      <path d="M48 52 C48 45 38 42 38 49 C38 57 48 63 48 63 C48 63 58 57 58 49 C58 42 48 45 48 52Z" fill="#3374B5" />
      {/* Envelope sticking out */}
      <g transform="translate(60, 6) rotate(8)">
        <rect x="0" y="0" width="22" height="16" rx="2" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2" />
        <path d="M1 1 L11 8 L21 1" stroke="#2D1D0F" strokeWidth="1.8" fill="none" />
      </g>
    </svg>
  );
}

export function HeartBubbleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      {/* Speech bubble */}
      <path
        d="M8 12 C8 6 14 2 22 2 L42 2 C50 2 56 6 56 12 L56 32 C56 38 50 42 42 42 L24 42 L16 50 L16 42 L14 42 C10 42 8 38 8 34 Z"
        fill="#F7E6C2"
        stroke="#2D1D0F"
        strokeWidth="3"
      />
      {/* Heart inside */}
      <path
        d="M32 20 C32 15 24 13 24 19 C24 25 32 31 32 31 C32 31 40 25 40 19 C40 13 32 15 32 20Z"
        fill="#3374B5"
      />
    </svg>
  );
}

export function EnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 48" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="2" y="2" width="60" height="44" rx="6" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="3" />
      <path d="M4 6 L32 26 L60 6" stroke="#2D1D0F" strokeWidth="3" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

export function HeartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 44" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M24 8 C24 2 14 -1 14 7 C14 16 24 24 24 24 C24 24 34 16 34 7 C34 -1 24 2 24 8Z"
        fill="#3374B5"
        stroke="#2D1D0F"
        strokeWidth="2.5"
        transform="translate(0, 10) scale(1.35)"
      />
    </svg>
  );
}

export function DeliveryTruckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <rect x="4" y="16" width="68" height="40" rx="6" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="3" />
      <path d="M72 30 L72 56 L108 56 L108 40 L92 30 Z" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="3" strokeLinejoin="round" />
      <rect x="78" y="36" width="14" height="10" rx="2" fill="#3374B5" opacity="0.3" stroke="#2D1D0F" strokeWidth="1.5" />
      <line x1="4" y1="56" x2="108" y2="56" stroke="#2D1D0F" strokeWidth="3" />
      <circle cx="30" cy="60" r="10" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="3" />
      <circle cx="30" cy="60" r="4" fill="#3374B5" />
      <circle cx="90" cy="60" r="10" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="3" />
      <circle cx="90" cy="60" r="4" fill="#3374B5" />
      <path d="M20 28 C20 22 30 20 30 26 C30 32 20 34 20 34 C20 34 30 32 30 26" fill="#3374B5" transform="translate(8, -2) scale(0.7)" />
    </svg>
  );
}

export function ShoppingBagIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M8 24 L4 72 C4 75 6 78 10 78 L54 78 C58 78 60 75 60 72 L56 24 Z" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="3" strokeLinejoin="round" />
      <path d="M20 24 C20 12 24 4 32 4 C40 4 44 12 44 24" stroke="#2D1D0F" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M32 42 C32 37 24 35 24 40 C24 46 32 50 32 50 C32 50 40 46 40 40 C40 35 32 37 32 42Z" fill="#3374B5" />
    </svg>
  );
}

export function BoxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M40 8 L72 22 L72 58 L40 72 L8 58 L8 22 Z" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="3" strokeLinejoin="round" />
      <path d="M8 22 L40 36 L72 22" stroke="#2D1D0F" strokeWidth="3" strokeLinejoin="round" />
      <path d="M40 36 L40 72" stroke="#2D1D0F" strokeWidth="3" />
      <path d="M24 15 L56 29" stroke="#3374B5" strokeWidth="4" strokeLinecap="round" />
      <path d="M40 36 L40 50" stroke="#3374B5" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
    </svg>
  );
}

export function QuestionIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M8 12 C8 6 14 2 22 2 L42 2 C50 2 56 6 56 12 L56 32 C56 38 50 42 42 42 L24 42 L16 50 L16 42 L14 42 C10 42 8 38 8 34 Z"
        fill="#F7E6C2"
        stroke="#2D1D0F"
        strokeWidth="3"
      />
      <text x="32" y="32" textAnchor="middle" fill="#3374B5" fontSize="24" fontWeight="bold" style={{ fontFamily: "var(--font-nunito), sans-serif" }}>?</text>
    </svg>
  );
}

export function StarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M12 2 L14.9 8.6 L22 9.3 L16.8 14 L18.2 21 L12 17.5 L5.8 21 L7.2 14 L2 9.3 L9.1 8.6 Z"
        fill="#3374B5"
        stroke="#2D1D0F"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function ShieldIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 56" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path
        d="M24 4 L4 14 L4 28 C4 40 12 50 24 54 C36 50 44 40 44 28 L44 14 Z"
        fill="#F7E6C2"
        stroke="#2D1D0F"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M16 28 L22 34 L34 20" stroke="#3374B5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
