"use client";

/**
 * iter-153 — Member-side renewal discount card.
 *
 * Renders ONLY when the member has an active (non-redeemed, non-
 * expired) RenewalDiscountOffer. Shows the code with a "Copy" button +
 * countdown to expiration. No surface for non-targets — keeps the
 * dashboard quiet for everyone else.
 */

import { useEffect, useState, useTransition } from "react";
import { getMyActiveRenewalOffer, type ActiveRenewalOffer } from "@/app/actions/renewalDiscountOffer";

export default function RenewalDiscountCard() {
  const [offer, setOffer] = useState<ActiveRenewalOffer | null>(null);
  const [copied, setCopied] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    void getMyActiveRenewalOffer().then(setOffer).catch(() => setOffer(null));
  }, []);

  function onCopy() {
    if (!offer) return;
    startTransition(async () => {
      try {
        await navigator.clipboard.writeText(offer.code);
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      } catch {
        // clipboard API not available; user will copy manually
      }
    });
  }

  if (!offer) return null;

  return (
    <section
      className="relative overflow-hidden rounded-3xl p-5 sm:p-6"
      style={{
        background: "linear-gradient(135deg, #337485, #23596A)",
        boxShadow: "0 8px 22px rgba(51,116,133,0.32)",
        color: "white",
      }}
    >
      <div className="flex items-start gap-4 flex-wrap">
        <div
          className="shrink-0 inline-flex items-center justify-center rounded-full"
          style={{ width: 56, height: 56, background: "rgba(255,255,255,0.18)", backdropFilter: "blur(8px)" }}
        >
          <span style={{ fontSize: 28 }} aria-hidden>🎁</span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] opacity-90">
            Limited-time renewal offer
          </p>
          <h2 className="text-xl sm:text-2xl font-black mt-0.5" style={{ letterSpacing: "-0.01em" }}>
            {offer.percentOff}% off your renewal
          </h2>
          <p className="text-[12.5px] mt-1 opacity-90">
            Apply this code at renewal — expires in {offer.daysRemaining} day{offer.daysRemaining === 1 ? "" : "s"}.
          </p>
          <div className="mt-3 inline-flex items-center gap-2 rounded-xl" style={{ background: "rgba(255,255,255,0.15)", padding: "8px 12px" }}>
            <span style={{ fontFamily: "ui-monospace, monospace", fontSize: 18, fontWeight: 900, letterSpacing: "0.05em" }}>
              {offer.code}
            </span>
            <button
              type="button"
              onClick={onCopy}
              className="text-[11px] font-black px-2.5 py-1 rounded-md"
              style={{ background: "white", color: "#23596A" }}
            >
              {copied ? "✓ Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
