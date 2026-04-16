import { type ReactNode, type HTMLAttributes } from "react";

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  glass?: boolean;
  hover?: boolean;
  padding?: "none" | "sm" | "md" | "lg";
}

const paddingMap = {
  none: "",
  sm: "p-4",
  md: "p-6",
  lg: "p-8",
};

export function Card({
  children,
  glass = false,
  hover = false,
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-2xl
        ${glass
          ? "glass-card bg-white/5 border border-white/10"
          : "bg-surface-light border border-border-light shadow-[var(--shadow-sm)]"
        }
        ${hover ? "hover-lift" : ""}
        ${paddingMap[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardDark({
  children,
  hover = false,
  padding = "md",
  className = "",
  ...props
}: Omit<CardProps, "glass">) {
  return (
    <div
      className={`
        rounded-2xl glass-card
        bg-white/[0.04] border border-white/[0.08]
        ${hover ? "hover-lift" : ""}
        ${paddingMap[padding]}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
