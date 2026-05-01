"use client";

/**
 * Plans grid with an interactive term-toggle (3 / 6 / 14 mo) that animates
 * the visible price between values. Card hover lifts; popular plan is
 * elevated with a brand-blue ring + amber "Most Popular" pill.
 */
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { PlanTermKey, PricingPlan } from "@/lib/pricing-config";

const TERMS: { key: PlanTermKey; label: string; months: number }[] = [
  { key: "term3", label: "3 months", months: 3 },
  { key: "term6", label: "6 months", months: 6 },
  { key: "term14", label: "14 months", months: 14 },
];

function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}

function ArrowIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h14m-6-6 6 6-6 6" />
    </svg>
  );
}

export function PricingPlansInteractive({ plans }: { plans: PricingPlan[] }) {
  const [term, setTerm] = useState<PlanTermKey>("term3");
  const months = TERMS.find((t) => t.key === term)?.months ?? 3;

  return (
    <div>
      {/* Term toggle */}
      <div className="flex justify-center mb-10">
        <div
          role="tablist"
          aria-label="Plan term"
          className="inline-flex p-1 rounded-full"
          style={{ background: "white", border: "1px solid rgba(45,16,15,0.1)" }}
        >
          {TERMS.map((t) => {
            const active = t.key === term;
            return (
              <button
                key={t.key}
                role="tab"
                aria-selected={active}
                onClick={() => setTerm(t.key)}
                className="px-4 py-2 rounded-full text-[12px] font-black transition-all duration-200"
                style={{
                  background: active ? "#2D100F" : "transparent",
                  color: active ? "#F7E6C2" : "#2D100F",
                  fontFamily: "var(--font-baloo), sans-serif",
                  letterSpacing: "0.02em",
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
        {plans.map((plan) => {
          const value = plan.prices[term];
          const popular = !!plan.popular;
          return (
            <div
              key={plan.id}
              className="relative rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl"
              style={{
                background: popular ? "#2D100F" : "white",
                color: popular ? "#F7E6C2" : "#2D100F",
                border: popular
                  ? "1px solid #2D100F"
                  : "1px solid rgba(45,16,15,0.1)",
                boxShadow: popular
                  ? "0 24px 60px rgba(45,16,15,0.32)"
                  : "0 1px 0 rgba(51,116,133,0.04), 0 12px 32px rgba(45,16,15,0.06)",
                transform: popular ? "translateY(-8px)" : "none",
              }}
            >
              {plan.badge && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full"
                  style={{
                    background: popular ? "#F5A623" : "rgba(51,116,133,0.12)",
                    color: popular ? "#2D100F" : "#337485",
                    fontFamily: "var(--font-baloo), sans-serif",
                  }}
                >
                  {plan.badge}
                </span>
              )}

              <h3
                className="font-extrabold mb-1"
                style={{
                  fontFamily: "var(--font-baloo), sans-serif",
                  fontSize: "1.6rem",
                  letterSpacing: "-0.02em",
                  color: popular ? "#F7E6C2" : "#2D100F",
                }}
              >
                {plan.name}
              </h3>

              {/* Animated price */}
              <AnimatedPrice
                value={value}
                durationMs={420}
                className="font-extrabold leading-none"
                style={{
                  fontSize: "3rem",
                  fontFamily: "var(--font-baloo), sans-serif",
                  letterSpacing: "-0.02em",
                  color: popular ? "#F7E6C2" : "#2D100F",
                }}
                suffix={
                  <span
                    className="text-[14px] font-bold ml-1"
                    style={{ color: popular ? "rgba(247,230,194,0.6)" : "rgba(45,16,15,0.5)" }}
                  >
                    / {months} mo
                  </span>
                }
              />
              <p className="text-[11px] font-bold mt-1" style={{ color: popular ? "rgba(247,230,194,0.55)" : "rgba(45,16,15,0.5)" }}>
                + ${plan.keyFee} one-time key fee
              </p>

              <ul className="mt-5 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[14px]">
                    <span
                      className="inline-flex items-center justify-center w-4 h-4 rounded-full shrink-0 mt-0.5"
                      style={{
                        background: popular ? "rgba(255,255,255,0.16)" : "rgba(51,116,133,0.12)",
                        color: popular ? "#F7E6C2" : "#337485",
                      }}
                    >
                      <CheckIcon className="w-2.5 h-2.5" />
                    </span>
                    <span
                      style={{
                        color: popular ? "rgba(247,230,194,0.85)" : "rgba(45,16,15,0.78)",
                      }}
                    >
                      {f}
                    </span>
                  </li>
                ))}
              </ul>

              <Link
                href={`/signup?plan=${plan.id}`}
                data-ripple="true"
                className="mt-6 inline-flex items-center justify-center gap-2 w-full py-3.5 rounded-2xl text-sm font-black transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                style={{
                  background: popular ? "#F5A623" : "#337485",
                  color: popular ? "#2D100F" : "white",
                  boxShadow: popular
                    ? "0 8px 24px rgba(245,166,35,0.36)"
                    : "0 6px 20px rgba(51,116,133,0.28)",
                }}
              >
                {plan.cta}
                <ArrowIcon className="w-4 h-4" />
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Animated price ───
// Counts between previous and new value when `value` changes. Easing:
// ease-out-cubic. Format: $X with a suffix slot for "/ N mo".
function AnimatedPrice({
  value,
  durationMs = 380,
  className,
  style,
  suffix,
}: {
  value: number;
  durationMs?: number;
  className?: string;
  style?: React.CSSProperties;
  suffix?: React.ReactNode;
}) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const startRef = useRef(0);
  const rafRef = useRef(0);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (reduce.matches) {
      setDisplay(value);
      fromRef.current = value;
      return;
    }

    cancelAnimationFrame(rafRef.current);
    fromRef.current = display;
    startRef.current = performance.now();
    const from = fromRef.current;
    const to = value;
    const tick = (now: number) => {
      const t = Math.min(1, (now - startRef.current) / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplay(Math.round(from + (to - from) * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, durationMs]);

  return (
    <span className={className} style={style}>
      <span
        style={{
          fontSize: "0.55em",
          fontWeight: 700,
          verticalAlign: "0.6em",
          marginRight: "0.04em",
          color: "currentcolor",
          opacity: 0.65,
        }}
      >
        $
      </span>
      {display}
      {suffix}
    </span>
  );
}
