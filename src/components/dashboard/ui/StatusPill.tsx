import { statusColor } from "../types";

type Props = {
  status: string;
  className?: string;
};

export default function StatusPill({ status, className = "" }: Props) {
  const c = statusColor(status);
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-[0.10em] ${className}`.trim()}
      style={{ background: c.bg, color: c.fg }}
    >
      <span
        aria-hidden
        className="w-1.5 h-1.5 rounded-full"
        style={{ background: c.dot }}
      />
      {status}
    </span>
  );
}
