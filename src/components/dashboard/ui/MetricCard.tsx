import type { ComponentType, ReactNode, SVGProps } from "react";
import Link from "next/link";
import { BRAND } from "../types";

type IconType = ComponentType<SVGProps<SVGSVGElement>>;
type Tone = "default" | "accent" | "warning" | "danger";

const TONE: Record<Tone, { bg: string; fg: string; iconColor: string; border: string; shadow: string }> = {
  default: {
    bg: BRAND.card,
    fg: BRAND.ink,
    iconColor: BRAND.blue,
    border: `1px solid ${BRAND.border}`,
    shadow: "var(--shadow-cream-sm)",
  },
  accent: {
    bg: `linear-gradient(135deg, ${BRAND.brown} 0%, ${BRAND.brownDeep} 100%)`,
    fg: BRAND.cream,
    iconColor: BRAND.cream,
    border: "none",
    shadow: "0 12px 40px rgba(45,16,15,0.28)",
  },
  warning: {
    bg: "var(--color-warning-soft)",
    fg: "#7C2D12",
    iconColor: "var(--color-warning)",
    border: "1px solid rgba(245,158,11,0.30)",
    shadow: "var(--shadow-cream-sm)",
  },
  danger: {
    bg: "var(--color-danger-soft)",
    fg: "#7F1D1D",
    iconColor: "var(--color-danger)",
    border: "1px solid rgba(239,68,68,0.30)",
    shadow: "var(--shadow-cream-sm)",
  },
};

type Props = {
  Icon?: IconType;
  label: string;
  value: ReactNode;
  caption?: ReactNode;
  tone?: Tone;
  href?: string;
  onClick?: () => void;
  action?: ReactNode;
  className?: string;
};

export default function MetricCard({
  Icon,
  label,
  value,
  caption,
  tone = "default",
  href,
  onClick,
  action,
  className = "",
}: Props) {
  const t = TONE[tone];
  const interactive = !!(href || onClick);

  const inner = (
    <div
      className={`group relative overflow-hidden rounded-2xl p-4 sm:p-5 transition-transform duration-300 ${
        interactive ? "hover:-translate-y-1 cursor-pointer" : "cursor-default"
      } ${className}`.trim()}
      style={{
        background: t.bg,
        color: t.fg,
        border: t.border,
        boxShadow: t.shadow,
      }}
      onClick={onClick}
    >
      {Icon && (
        <>
          <Icon
            aria-hidden
            className="absolute -top-2 -right-2 w-16 h-16 opacity-[0.10] transition-transform duration-500 group-hover:rotate-12 group-hover:scale-110"
            style={{ color: t.iconColor }}
            strokeWidth={1.2}
          />
          <Icon className="w-5 h-5 mb-3" style={{ color: t.iconColor }} strokeWidth={1.8} />
        </>
      )}
      <p className="text-2xl sm:text-3xl font-black leading-none" style={{ fontFamily: "var(--font-baloo), sans-serif" }}>
        {value}
      </p>
      <p
        className="text-[11px] font-black uppercase tracking-[0.16em] mt-2"
        style={{ color: tone === "accent" ? "rgba(247,230,194,0.75)" : BRAND.inkFaint }}
      >
        {label}
      </p>
      {caption && (
        <p className="text-[11px] mt-1" style={{ color: tone === "accent" ? "rgba(247,230,194,0.85)" : BRAND.inkSoft }}>
          {caption}
        </p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );

  if (href) return <Link href={href} className="block">{inner}</Link>;
  return inner;
}
