"use client";

// iter-116 — Member-side plan upgrade card.
//
// Shows current plan, calculates prorated upgrade cost per option, lets
// the member upgrade in one click. Hides itself when the customer is
// already on the top tier.

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  getPlanUpgradeOptions,
  requestPlanUpgrade,
  type UpgradeOptionsResult,
  type UpgradeOption,
} from "@/app/actions/planUpgrade";

export default function PlanUpgradeCard() {
  const [data, setData] = useState<UpgradeOptionsResult | null>(null);
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<UpgradeOption | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() {
    void getPlanUpgradeOptions().then(setData).catch(() => setData(null));
  }
  useEffect(() => { refresh(); }, []);

  function go(opt: UpgradeOption) {
    setMsg(null);
    startTransition(async () => {
      const res = await requestPlanUpgrade({ newPlan: opt.plan });
      if (res.error) { setMsg(res.error); setConfirming(null); return; }
      setMsg(`✓ Upgraded to ${res.newPlan} · charged $${((res.chargedCents ?? 0) / 100).toFixed(2)}`);
      setConfirming(null);
      refresh();
    });
  }

  if (!data) return null;
  // Hide card entirely when there's nothing to offer.
  if (!data.currentPlan || data.options.length === 0) return null;

  return (
    <div
      className="rounded-3xl p-6 mt-3"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-2">
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
        <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
          Upgrade plan
        </h3>
      </div>
      <p className="text-[11.5px] mb-4" style={{ color: BRAND.inkSoft }}>
        Currently on <strong>{data.currentPlan}</strong> · {data.monthsRemaining} month{data.monthsRemaining === 1 ? "" : "s"} left until {data.currentDueDate ?? "—"}. We charge the difference for the remaining months — your renewal date stays the same.
      </p>

      {msg && (
        <div className="rounded-xl px-3 py-2 mb-3 text-[11.5px] font-bold"
          style={{
            background: msg.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: msg.startsWith("✓") ? "#15803d" : "#991b1b",
          }}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {data.options.map((opt) => {
          const canCover = data.walletBalanceCents >= opt.prorateCents;
          return (
            <div
              key={opt.plan}
              className="rounded-xl border p-3 flex flex-col"
              style={{ borderColor: BRAND.border, background: BRAND.blueSoft }}
            >
              <div className="flex items-baseline justify-between gap-2 mb-1">
                <p className="text-[14px] font-black" style={{ color: BRAND.ink }}>{opt.plan}</p>
                <p className="text-[11px] font-mono" style={{ color: BRAND.inkSoft }}>
                  ${(opt.monthlyCents / 100).toFixed(0)}/mo
                </p>
              </div>
              <p className="text-[10.5px]" style={{ color: BRAND.inkSoft }}>
                +${(opt.monthlyDeltaCents / 100).toFixed(0)}/mo over your current rate
              </p>
              <p className="text-[12px] mt-2" style={{ color: BRAND.ink }}>
                Prorate today: <strong>${(opt.prorateCents / 100).toFixed(2)}</strong>
              </p>
              <p className="text-[10.5px] mt-0.5" style={{ color: canCover ? "#15803d" : "#92400e" }}>
                {canCover ? "✓ Wallet covers it" : "⚠️ Top up wallet first"}
              </p>
              <button type="button" onClick={() => setConfirming(opt)} disabled={pending || !canCover}
                className="mt-3 w-full py-2 rounded-lg text-white text-[11.5px] font-black disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}>
                Upgrade →
              </button>
            </div>
          );
        })}
      </div>

      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(45,16,15,0.55)" }}>
          <div className="rounded-2xl bg-white max-w-sm w-full p-5" style={{ border: `1px solid ${BRAND.border}` }}>
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: BRAND.inkSoft }}>
              Confirm upgrade
            </p>
            <h3 className="text-lg font-black mt-1" style={{ color: BRAND.ink }}>
              {data.currentPlan} → {confirming.plan}
            </h3>
            <p className="text-[12px] mt-2" style={{ color: BRAND.ink }}>
              We'll deduct <strong>${(confirming.prorateCents / 100).toFixed(2)}</strong> from your wallet and switch your plan immediately. Your next renewal will use the {confirming.plan} rate.
            </p>
            <p className="text-[11px] mt-2" style={{ color: BRAND.inkSoft }}>
              Wallet after charge: ${((data.walletBalanceCents - confirming.prorateCents) / 100).toFixed(2)}
            </p>
            <div className="mt-4 flex items-center gap-2">
              <button type="button" onClick={() => go(confirming)} disabled={pending}
                className="flex-1 py-2.5 rounded-lg text-white font-black disabled:opacity-50"
                style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}>
                {pending ? "Upgrading…" : `Yes — upgrade now`}
              </button>
              <button type="button" onClick={() => setConfirming(null)}
                className="px-3 py-2.5 rounded-lg text-xs font-bold border"
                style={{ borderColor: BRAND.border, color: BRAND.ink, background: "white" }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
