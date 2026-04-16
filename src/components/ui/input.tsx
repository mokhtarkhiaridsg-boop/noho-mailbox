"use client";

import { forwardRef, type InputHTMLAttributes } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  dark?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, dark = false, className = "", ...props }, ref) => {
    return (
      <div className="space-y-1.5">
        {label && (
          <label className={`block text-xs font-semibold uppercase tracking-wider ${dark ? "text-text-dark-muted" : "text-text-light-muted"}`}>
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`
            w-full rounded-xl px-4 py-3 text-sm
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-accent/50
            placeholder:text-text-light-muted/50
            ${dark
              ? "bg-white/[0.06] border border-white/[0.1] text-text-dark placeholder:text-text-dark-muted/40"
              : "bg-bg-light border border-border-light text-text-light hover:border-accent/30"
            }
            ${error ? "ring-2 ring-danger/50 border-danger/30" : ""}
            ${className}
          `}
          {...props}
        />
        {error && (
          <p className="text-xs text-danger font-medium">{error}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
export { Input };
