"use client";

import { useState } from "react";
import Link from "next/link";
import { annualSavings, type VirtualMailboxPlan } from "@/lib/virtual-mailbox-config";

const CREAM = "#F7E6C2";
const BORDER = "#E8DDD0";
const INK = "#2D100F";
const INK_SOFT = "#5C4540";
const INK_FAINT = "#A89484";
const BLUE = "#337485";

type Props = {
  plans: VirtualMailboxPlan[];
};

type Cycle = "monthly" | "annual";

function formatPrice(n: number): string {
  // Strip trailing .00 for round numbers; keep cents otherwise.
  if (n === Math.floor(n)) return `$${n}`;
  return `$${n.toFixed(2)}`;
}

export default function VirtualMailboxPlansInteractive({ plans }: Props) {
  const [cycle, setCycle] = useState<Cycle>("monthly");
  const hasAnyAnnual = plans.some((p) => p.annual > 0);

  return (
    <div>
      {/* Cycle toggle */}
      {hasAnyAnnual && (
        <div className="flex items-center justify-center mb-8">
          <div
            className="inline-flex items-center rounded-full p-1"
            style={{ background: CREAM, border: `1px solid ${BORDER}` }}
          >
            {(["monthly", "annual"] as const).map((c) => {
              const active = cycle === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCycle(c)}
                  className="text-[12px] font-black uppercase tracking-[0.06em] px-4 h-9 rounded-full transition-all"
                  style={{
                    background: active
                      ? `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`
                      : "transparent",
                    color: active ? CREAM : INK,
                    boxShadow: active ? "0 4px 14px rgba(45,16,15,0.25)" : "none",
                  }}
                >
                  {c === "monthly" ? "Monthly" : "Annual"}
                  {c === "annual" && (
                    <span className="ml-2 text-[10px] font-bold opacity-80">
                      save up to ${Math.max(...plans.map(annualSavings))}/yr
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Plan grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-5">
        {plans.map((p) => {
          const showAnnual = cycle === "annual" && p.annual > 0;
          const price = showAnnual ? p.annual / 12 : p.monthly;
          const savings = annualSavings(p);
          const popular = !!p.popular;

          return (
            <div
              key={p.id}
              className={`relative rounded-3xl p-6 sm:p-7 transition-transform ${
                popular ? "lg:-translate-y-2" : ""
              }`}
              style={
                popular
                  ? {
                      background: `linear-gradient(180deg, ${INK} 0%, #1F0807 100%)`,
                      color: CREAM,
                      boxShadow: "0 24px 60px rgba(45,16,15,0.30)",
                    }
                  : {
                      background: "white",
                      color: INK,
                      border: `1px solid ${BORDER}`,
                      boxShadow: "var(--shadow-cream-sm)",
                    }
              }
            >
              {p.badge && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 text-[10px] font-black uppercase tracking-[0.16em] px-3 py-1 rounded-full"
                  style={{
                    background: popular ? CREAM : `${BLUE}`,
                    color: popular ? INK : "white",
                    boxShadow: "0 4px 14px rgba(45,16,15,0.18)",
                  }}
                >
                  {p.badge}
                </span>
              )}

              <h3
                className="text-[24px] sm:text-[28px] font-black"
                style={{
                  color: popular ? CREAM : INK,
                  fontFamily: "var(--font-baloo), sans-serif",
                }}
              >
                {p.name}
              </h3>

              <div className="mt-4 flex items-baseline gap-1.5">
                <span
                  className="text-[44px] sm:text-[52px] font-black leading-none"
                  style={{
                    color: popular ? CREAM : INK,
                    fontFamily: "var(--font-baloo), sans-serif",
                  }}
                >
                  {formatPrice(price)}
                </span>
                <span
                  className="text-[13px] font-bold"
                  style={{ color: popular ? "rgba(247,230,194,0.65)" : INK_SOFT }}
                >
                  {" "}/ month
                </span>
              </div>
              {showAnnual && savings > 0 && (
                <p
                  className="mt-1 text-[11px] font-black"
                  style={{ color: popular ? "rgba(247,230,194,0.85)" : "var(--color-success)" }}
                >
                  Billed ${p.annual}/yr · save ${savings}
                </p>
              )}
              {!showAnnual && p.annual > 0 && (
                <p
                  className="mt-1 text-[11px]"
                  style={{ color: popular ? "rgba(247,230,194,0.65)" : INK_FAINT }}
                >
                  Or ${p.annual}/year — save ${savings}
                </p>
              )}

              {/* Stats row */}
              <div
                className="mt-5 grid grid-cols-3 gap-2 rounded-2xl p-3"
                style={{
                  background: popular ? "rgba(247,230,194,0.10)" : CREAM,
                }}
              >
                <Stat
                  label="Recipients"
                  value={String(p.recipients)}
                  popular={popular}
                />
                <Stat
                  label="Items / mo"
                  value={p.itemsPerMonth === 0 ? "Unlimited" : String(p.itemsPerMonth)}
                  popular={popular}
                />
                <Stat
                  label="Free scans"
                  value={String(p.freeScans)}
                  popular={popular}
                />
              </div>

              {/* Features */}
              <ul className="mt-5 space-y-2">
                {p.features.map((f, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-[13px] leading-snug"
                    style={{ color: popular ? "rgba(247,230,194,0.92)" : INK_SOFT }}
                  >
                    <svg
                      viewBox="0 0 16 16"
                      className="w-3.5 h-3.5 mt-0.5 shrink-0"
                      fill="none"
                      stroke={popular ? CREAM : BLUE}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 8 L7 12 L13 4" />
                    </svg>
                    <span>{f}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={`/signup?plan=${encodeURIComponent(p.id)}`}
                className="mt-6 inline-flex items-center justify-center w-full h-12 rounded-2xl text-[13px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
                style={
                  popular
                    ? {
                        background: CREAM,
                        color: INK,
                        boxShadow: "0 6px 20px rgba(247,230,194,0.30)",
                      }
                    : {
                        background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
                        color: CREAM,
                        boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
                      }
                }
              >
                {p.cta} →
              </Link>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  popular,
}: {
  label: string;
  value: string;
  popular: boolean;
}) {
  return (
    <div className="text-center">
      <p
        className="text-[14px] font-black"
        style={{
          color: popular ? CREAM : INK,
          fontFamily: "var(--font-baloo), sans-serif",
        }}
      >
        {value}
      </p>
      <p
        className="text-[9px] font-bold uppercase tracking-[0.10em] mt-0.5"
        style={{ color: popular ? "rgba(247,230,194,0.65)" : INK_FAINT }}
      >
        {label}
      </p>
    </div>
  );
}
