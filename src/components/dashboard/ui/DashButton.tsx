"use client";

import type { ButtonHTMLAttributes, AnchorHTMLAttributes, CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { BRAND } from "../types";

type Variant = "primary" | "secondary" | "accent" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const VARIANT: Record<Variant, CSSProperties> = {
  primary: {
    background: `linear-gradient(135deg, ${BRAND.brown} 0%, ${BRAND.brownDeep} 100%)`,
    color: BRAND.cream,
    border: "none",
    boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
  },
  secondary: {
    background: BRAND.bgDeep,
    color: BRAND.ink,
    border: `1px solid ${BRAND.border}`,
    boxShadow: "var(--shadow-cream-sm)",
  },
  accent: {
    background: `linear-gradient(135deg, ${BRAND.blue} 0%, ${BRAND.blueDeep} 100%)`,
    color: "#FFFFFF",
    border: "none",
    boxShadow: "0 6px 20px rgba(51,116,133,0.32)",
  },
  ghost: {
    background: "transparent",
    color: BRAND.ink,
    border: `1px solid ${BRAND.border}`,
  },
  danger: {
    background: "var(--color-danger)",
    color: "#FFFFFF",
    border: "none",
    boxShadow: "0 6px 20px rgba(239,68,68,0.30)",
  },
};

const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-[11px]",
  md: "h-10 px-4 text-[12px]",
  lg: "h-12 px-5 text-[13px]",
};

type CommonProps = {
  variant?: Variant;
  size?: Size;
  block?: boolean;
  ripple?: boolean;
  children: ReactNode;
};

const baseClasses =
  "dash-btn inline-flex items-center justify-center gap-2 rounded-2xl font-black uppercase tracking-[0.06em] transition-transform duration-200 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 outline-none";

type ButtonProps = CommonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children" | "className" | "style"> & {
    href?: undefined;
    className?: string;
    style?: CSSProperties;
  };

type LinkProps = CommonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "children" | "className" | "style"> & {
    href: string;
    className?: string;
    style?: CSSProperties;
  };

export default function DashButton(props: ButtonProps | LinkProps) {
  const {
    variant = "primary",
    size = "md",
    block = false,
    ripple = true,
    className = "",
    style,
    children,
    ...rest
  } = props;

  const cls = `${baseClasses} ${SIZE[size]} ${block ? "w-full" : ""} ${className}`.trim();
  const merged: CSSProperties = { ...VARIANT[variant], ...style };
  const dataAttrs = ripple ? ({ "data-ripple": true } as Record<string, unknown>) : {};

  if ("href" in props && props.href) {
    const { href, ...linkRest } = rest as AnchorHTMLAttributes<HTMLAnchorElement> & { href: string };
    return (
      <Link href={href} className={cls} style={merged} {...dataAttrs} {...linkRest}>
        {children}
      </Link>
    );
  }

  const buttonRest = rest as ButtonHTMLAttributes<HTMLButtonElement>;
  return (
    <button className={cls} style={merged} {...dataAttrs} {...buttonRest}>
      {children}
    </button>
  );
}
