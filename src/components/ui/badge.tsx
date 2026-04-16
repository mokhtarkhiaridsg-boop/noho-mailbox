import { type ReactNode } from "react";

type BadgeVariant = "success" | "warning" | "danger" | "info" | "default" | "accent" | "gold";

const variantStyles: Record<BadgeVariant, string> = {
  success: "bg-success-soft text-[#166534]",
  warning: "bg-warning-soft text-[#92400E]",
  danger: "bg-danger-soft text-[#991B1B]",
  info: "bg-info-soft text-[#1E40AF]",
  default: "bg-border-light text-text-light-muted",
  accent: "bg-accent-soft text-accent-hover",
  gold: "bg-accent-soft text-accent",
};

export function Badge({
  children,
  variant = "default",
  className = "",
}: {
  children: ReactNode;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <span
      className={`
        inline-flex items-center gap-1
        text-[10px] font-bold uppercase tracking-wider
        px-2.5 py-1 rounded-full
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  );
}
