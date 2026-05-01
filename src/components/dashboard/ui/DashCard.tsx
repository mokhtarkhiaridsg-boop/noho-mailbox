import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { BRAND } from "../types";

type Variant = "default" | "cream" | "brown";
type Padding = "none" | "sm" | "md" | "lg";

const VARIANT: Record<
  Variant,
  { background: string; border: string; color: string; boxShadow: string }
> = {
  default: {
    background: BRAND.card,
    border: `1px solid ${BRAND.border}`,
    color: BRAND.ink,
    boxShadow: "var(--shadow-cream-sm)",
  },
  cream: {
    background: BRAND.bgDeep,
    border: `1px solid ${BRAND.border}`,
    color: BRAND.ink,
    boxShadow: "var(--shadow-cream-sm)",
  },
  brown: {
    background: `linear-gradient(135deg, ${BRAND.brown} 0%, ${BRAND.brownDeep} 100%)`,
    border: "none",
    color: BRAND.cream,
    boxShadow: "0 12px 40px rgba(45,16,15,0.32)",
  },
};

const PADDING: Record<Padding, string> = {
  none: "",
  sm: "p-4",
  md: "p-5",
  lg: "p-6 sm:p-7",
};

const ROUNDED = {
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
} as const;

type Props = HTMLAttributes<HTMLDivElement> & {
  variant?: Variant;
  padding?: Padding;
  rounded?: keyof typeof ROUNDED;
  children: ReactNode;
};

export default function DashCard({
  variant = "default",
  padding = "md",
  rounded = "3xl",
  className = "",
  style,
  children,
  ...rest
}: Props) {
  const v = VARIANT[variant];
  const merged: CSSProperties = { ...v, ...style };
  return (
    <div
      className={`${ROUNDED[rounded]} ${PADDING[padding]} ${className}`.trim()}
      style={merged}
      {...rest}
    >
      {children}
    </div>
  );
}
