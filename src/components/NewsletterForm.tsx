"use client";

import { useActionState } from "react";
import { subscribeNewsletter, type NewsletterState } from "@/app/actions/newsletter";

type Props = {
  source?: string;
  variant?: "footer" | "inline";
};

export default function NewsletterForm({ source = "footer", variant = "footer" }: Props) {
  const [state, formAction, pending] = useActionState<NewsletterState, FormData>(
    subscribeNewsletter,
    {}
  );

  if (variant === "footer") {
    return (
      <div>
        <p className="font-semibold text-[11px] uppercase tracking-wider text-accent mb-3">
          Local-business tips, monthly
        </p>
        <p className="text-xs text-text-dark-muted mb-3 leading-relaxed">
          One short email a month with same-day courier deals, LLC tips, and small-business hacks for the Valley. No spam, no resell.
        </p>
        {state.success ? (
          <p className="text-xs font-bold text-accent">
            ✓ Subscribed — thanks!
          </p>
        ) : (
          <form action={formAction} className="flex flex-col gap-2">
            <input type="hidden" name="source" value={source} />
            <input
              type="email"
              name="email"
              required
              placeholder="you@example.com"
              autoComplete="email"
              className="text-sm bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-2 text-text-dark placeholder-text-dark-muted/40 focus:outline-none focus:border-accent/60"
            />
            <button
              type="submit"
              disabled={pending}
              className="text-xs font-bold text-white bg-accent hover:bg-accent-hover transition-all rounded-lg py-2 disabled:opacity-50"
            >
              {pending ? "Subscribing…" : "Subscribe"}
            </button>
            {state.error && (
              <p className="text-[11px] text-red-300 mt-1">{state.error}</p>
            )}
            <p className="text-[10px] text-text-dark-muted/50 mt-1">
              Reply STOP any time to opt out.
            </p>
          </form>
        )}
      </div>
    );
  }

  // inline variant — for use on /resources, /blog, etc.
  return (
    <div
      className="rounded-2xl p-6 my-8"
      style={{
        background: "#FFF9F3",
        border: "1px solid #E8D8C4",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      <h3 className="font-extrabold tracking-tight text-text-light text-base mb-2">
        One short email a month
      </h3>
      <p className="text-sm text-text-light-muted mb-4">
        LLC tips, courier deals, and small-business hacks for the Valley. No spam, no resell.
      </p>
      {state.success ? (
        <p className="text-sm font-bold" style={{ color: "#337485" }}>
          ✓ Subscribed — thanks!
        </p>
      ) : (
        <form action={formAction} className="flex gap-2 flex-col sm:flex-row">
          <input type="hidden" name="source" value={source} />
          <input
            type="email"
            name="email"
            required
            placeholder="you@example.com"
            autoComplete="email"
            className="flex-1 text-sm rounded-xl px-4 py-3 focus:outline-none"
            style={{
              border: "1px solid #D8C8B4",
              background: "#FFFFFF",
            }}
          />
          <button
            type="submit"
            disabled={pending}
            className="text-sm font-bold text-white px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-50"
            style={{ background: "#337485" }}
          >
            {pending ? "Subscribing…" : "Subscribe"}
          </button>
        </form>
      )}
      {state.error && (
        <p className="text-xs mt-2" style={{ color: "#dc2626" }}>{state.error}</p>
      )}
    </div>
  );
}
