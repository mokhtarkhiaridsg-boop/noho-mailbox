"use client";

/**
 * iter-158 — Member plan-upgrade nudge card.
 *
 * Renders ONLY when the signed-in member is on Basic AND has enough
 * recent volume to make an upgrade meaningfully useful. Volume signal
 * computed by `getPlanNudgeContext()`. Click "Upgrade to {plan}" calls
 * existing iter-116 `requestPlanUpgrade`. A "Not now" dismiss stores
 * a 7-day grace cookie in localStorage so we never spam.
 */

import { useEffect, useState, useTransition } from "react";
import { getPlanNudgeContext, type PlanNudgeContext } from "@/app/actions/planNudge";
import { requestPlanUpgrade } from "@/app/actions/planUpgrade";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";

const DISMISS_KEY = "noho-plan-nudge-dismiss-v1";
const DISMISS_DAYS = 7;

function isCurrentlyDismissed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const ts = window.localStorage.getItem(DISMISS_KEY);
    if (!ts) return false;
    const ageMs = Date.now() - parseInt(ts, 10);
    return ageMs >= 0 && ageMs < DISMISS_DAYS * 24 * 60 * 60 * 1000;
  } catch { return false; }
}
function markDismissed() {
  if (typeof window === "undefined") return;
  try { window.localStorage.setItem(DISMISS_KEY, String(Date.now())); } catch { /* quota */ }
}

export default function PlanUpgradeNudgeCard() {
  const [ctx, setCtx] = useState<PlanNudgeContext | null>(null);
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setDismissed(isCurrentlyDismissed());
    void getPlanNudgeContext().then(setCtx).catch(() => setCtx(null));
  }, []);

  function onUpgrade(plan: "Business" | "Premium") {
    setMsg(null);
    startTransition(async () => {
      const res = await requestPlanUpgrade({ newPlan: plan });
      if (res.error) { setMsg(`✗ ${res.error}`); return; }
      setMsg(`✓ Upgraded to ${res.newPlan} · charged $${((res.chargedCents ?? 0) / 100).toFixed(2)}`);
      // Hide the nudge after a successful upgrade.
      markDismissed();
      setDismissed(true);
    });
  }

  function onDismiss() {
    markDismissed();
    setDismissed(true);
  }

  if (dismissed === null) return null; // hydration guard
  if (dismissed) return null;
  if (!ctx || !ctx.shouldNudge || !ctx.recommendedPlan) return null;

  const features = ctx.recommendedPlan === "Premium"
    ? [
        "Unlimited mail items + packages",
        "Priority bureau handling (front of line)",
        "$25/mo same-day delivery credit included",
        "VIP guest pickup limit",
      ]
    : [
        "Unlimited packages (no overage charges)",
        "Same-day mail scanning when requested",
        "Free quarterly forwards",
        "Higher monthly mail volume",
      ];

  const priceLabel = ctx.recommendedPlan === "Premium" ? "$145/mo" : "$90/mo";

  return (
    <section
      className="relative overflow-hidden rounded-3xl"
      style={{
        background: `linear-gradient(135deg, ${NOHO_CREAM}, #FFF5DC)`,
        border: "1px solid rgba(45,16,15,0.10)",
        boxShadow: "0 6px 18px rgba(45,16,15,0.06)",
      }}
    >
      <div
        aria-hidden
        className="absolute -top-12 -right-12 pointer-events-none"
        style={{ width: 240, height: 240, background: `radial-gradient(circle, ${NOHO_BLUE}28 0%, transparent 70%)` }}
      />

      <div className="relative p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: NOHO_BLUE_DEEP }}>
              You've outgrown Basic
            </p>
            <h2 className="text-xl sm:text-2xl font-black mt-0.5" style={{ color: NOHO_INK, letterSpacing: "-0.01em" }}>
              Time for {ctx.recommendedPlan}? <span style={{ color: NOHO_BLUE_DEEP }}>{priceLabel}</span>
            </h2>
            <p className="text-[12.5px] mt-1" style={{ color: NOHO_INK }}>
              {ctx.reason}
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="shrink-0 text-[10.5px] font-bold px-2 py-1 rounded-md"
            style={{ background: "rgba(45,16,15,0.05)", color: NOHO_INK + "85", border: "1px solid rgba(45,16,15,0.10)" }}
          >
            Not now
          </button>
        </div>

        <ul className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {features.map((f) => (
            <li key={f} className="flex items-start gap-2 text-[12.5px]" style={{ color: NOHO_INK }}>
              <span style={{ color: "#15803d", fontWeight: 900 }} aria-hidden>✓</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-4 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            disabled={pending}
            onClick={() => onUpgrade(ctx.recommendedPlan!)}
            className="px-4 py-2 rounded-xl text-[13px] font-black text-white disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`, boxShadow: "0 6px 16px rgba(51,116,133,0.32)" }}
          >
            {pending ? "Upgrading…" : `Upgrade to ${ctx.recommendedPlan}`}
          </button>
          <a
            href="/plans"
            className="text-[12px] font-bold px-3 py-2 rounded-lg"
            style={{ background: "white", color: NOHO_BLUE_DEEP, border: "1px solid rgba(51,116,133,0.30)", textDecoration: "none" }}
          >
            Compare plans →
          </a>
          {msg && (
            <span className="text-[11.5px] font-semibold" style={{ color: msg.startsWith("✓") ? "#15803d" : "#991b1b" }}>
              {msg}
            </span>
          )}
        </div>
      </div>
    </section>
  );
}
