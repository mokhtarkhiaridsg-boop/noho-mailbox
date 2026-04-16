"use client";

import { motion } from "motion/react";
import { forwardRef, type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

interface ButtonProps {
  variant?: Variant;
  size?: Size;
  children: ReactNode;
  shimmer?: boolean;
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit" | "reset";
  onClick?: () => void;
}

const variantStyles: Record<Variant, string> = {
  primary:
    "bg-gradient-to-r from-accent to-accent-hover text-white shadow-[0_4px_16px_rgba(51,116,181,0.35)]",
  secondary:
    "bg-surface-light text-text-light border border-border-light shadow-[var(--shadow-sm)] hover:bg-bg-light",
  ghost:
    "bg-transparent text-text-light-muted hover:bg-border-light/50",
  danger:
    "bg-danger text-white shadow-[0_4px_16px_rgba(239,68,68,0.3)]",
  gold:
    "bg-gradient-to-r from-gold to-[#C49A3F] text-bg-dark shadow-[0_4px_16px_rgba(212,168,83,0.35)]",
};

const sizeStyles: Record<Size, string> = {
  sm: "text-xs px-3.5 py-2 rounded-lg",
  md: "text-sm px-5 py-2.5 rounded-xl",
  lg: "text-sm px-7 py-3.5 rounded-2xl",
};

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "primary", size = "md", shimmer = false, className = "", children, disabled, type = "button", onClick }, ref) => {
    return (
      <motion.button
        ref={ref}
        whileTap={{ scale: 0.97 }}
        whileHover={{ scale: 1.01 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        disabled={disabled}
        type={type}
        onClick={onClick}
        className={`
          relative inline-flex items-center justify-center gap-2
          font-semibold tracking-tight
          transition-colors duration-200
          disabled:opacity-50 disabled:pointer-events-none
          cursor-pointer
          ${variantStyles[variant]}
          ${sizeStyles[size]}
          ${shimmer ? "overflow-hidden" : ""}
          ${className}
        `}
      >
        {shimmer && (
          <span className="absolute inset-0 animate-shimmer bg-gradient-to-r from-transparent via-white/20 to-transparent pointer-events-none" />
        )}
        {children}
      </motion.button>
    );
  }
);

Button.displayName = "Button";
export { Button };
