"use client";

/**
 * iter-175 — Loyalty tier card (Tier 11 #84).
 *
 * Renders the member's current tier (badge + tagline + benefits +
 * renewal-discount %). When a next-tier exists, shows a checklist of
 * what's still missing so the member knows exactly what to do.
 *
 * Lives on the dashboard overview, between the CotM badge and the
 * RenewalDiscount card so promoted members see their upgrade
 * acknowledged the next time they sign in.
 */

import { useEffect, useState } from "react";
import { BRAND } from "./types";
import { getMyLoyaltyTier, type LoyaltyTierComputation } from "@/app/actions/loyaltyTiers";
import { TIER_META, TIER_RENEWAL_DISCOUNT } from "@/lib/loyalty-config";

export default function LoyaltyTierCard() {
  const [comp, setComp] = useState<LoyaltyTierComputation | null | undefined>(undefined);
  useEffect(() => {
    void getMyLoyaltyTier().then(setComp).catch(() => setComp(null));
  }, []);
  if (comp === undefined) return null;
  if (!comp) return null;

  const meta = TIER_META[comp.tier];
  const discount = TIER_RENEWAL_DISCOUNT[comp.tier];
  const nextMeta = comp.nextTier ? TIER_META[comp.nextTier] : null;
  const remaining = comp.remainingForNext;

  return (
    <section
      className="relative overflow-hidden rounded-3xl p-5 sm:p-6"
      style={{
        background: `linear-gradient(135deg, ${meta.bg}, white)`,
        border: `1px solid ${meta.accent}40`,
        boxShadow: `0 4px 18px ${meta.accent}30`,
      }}
    >
      <div
        aria-hidden
        className="absolute -top-12 -right-12 pointer-events-none opacity-30"
        style={{ width: 220, height: 220, background: `radial-gradient(circle, ${meta.accent} 0%, transparent 70%)` }}
      />
      <div className="relative flex items-start gap-4 flex-wrap">
        <div
          className="shrink-0 inline-flex items-center justify-center rounded-full"
          style={{
            width: 64, height: 64,
            background: `linear-gradient(135deg, ${meta.accent}, ${meta.fg})`,
            boxShadow: `0 6px 18px ${meta.accent}50`,
          }}
        >
          <span style={{ fontSize: 32 }} aria-hidden>{meta.emoji}</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: meta.fg }}>
            Loyalty tier
          </p>
          <h2 className="text-xl sm:text-2xl font-black mt-0.5" style={{ color: meta.fg, letterSpacing: "-0.01em" }}>
            {meta.label} member
          </h2>
          <p className="text-[12.5px] italic mt-0.5" style={{ color: meta.fg, opacity: 0.85 }}>
            {meta.tagline}
          </p>
          {discount > 0 && (
            <p className="text-[12px] mt-2 inline-flex items-center gap-1.5 font-bold px-2 py-1 rounded-full" style={{ background: "white", color: meta.fg, border: `1px solid ${meta.accent}50` }}>
              ✨ {discount}% off renewals + add-ons (auto-applied)
            </p>
          )}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 relative">
        {/* Current benefits */}
        <div className="rounded-xl p-3" style={{ background: "white", border: `1px solid ${BRAND.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkSoft }}>
            What you get today
          </p>
          <ul className="mt-1.5 space-y-1">
            {meta.benefits.map((b, i) => (
              <li key={i} className="text-[11.5px] flex items-start gap-1.5" style={{ color: BRAND.ink }}>
                <span style={{ color: meta.accent, fontWeight: 900 }}>✓</span>
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Path to next tier */}
        {nextMeta ? (
          <div className="rounded-xl p-3" style={{ background: "white", border: `1px solid ${BRAND.border}` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: BRAND.inkSoft }}>
              Path to {nextMeta.emoji} {nextMeta.label}
            </p>
            {remaining.length === 0 ? (
              <p className="text-[11.5px] mt-1.5 italic" style={{ color: "#15803d" }}>
                ✓ All requirements met — promotion next sweep!
              </p>
            ) : (
              <ul className="mt-1.5 space-y-1">
                {remaining.map((a) => (
                  <li key={a.key} className="text-[11px] flex items-start gap-1.5" style={{ color: BRAND.inkSoft }}>
                    <span style={{ color: BRAND.inkFaint, fontWeight: 900 }}>○</span>
                    <span>
                      {a.label}
                      {a.detail && <span className="ml-1" style={{ color: BRAND.inkFaint }}>({a.detail})</span>}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : (
          <div className="rounded-xl p-3" style={{ background: "white", border: `1px solid ${BRAND.border}` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: meta.fg }}>
              You're at the top
            </p>
            <p className="text-[11.5px] mt-1.5 italic" style={{ color: BRAND.inkSoft }}>
              {meta.label} is the highest loyalty tier we offer. Thank you for being part of the bureau family. 💎
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
