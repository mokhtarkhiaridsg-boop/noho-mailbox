"use client";

// iter-91 — Insurance / declared-value modal.
//
// Customer enters a declared value → we auto-pick the cheapest tier
// that covers it → show the fee + wallet impact → confirm. Server
// handles wallet debit + audit + receipt email.

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import { declareInsuranceValue, getInsuranceTiers } from "@/app/actions/mail";

type Tier = Awaited<ReturnType<typeof getInsuranceTiers>>[number];

export default function InsuranceModal({
  pkg, onClose, onDone,
}: {
  pkg: { id: string; from: string; trackingNumber?: string | null; carrier?: string | null; declaredValueCents?: number | null; insuranceFeeCents?: number | null };
  onClose: () => void;
  onDone: () => void;
}) {
  const [tiers, setTiers] = useState<Tier[] | null>(null);
  const [valueDollars, setValueDollars] = useState<string>(pkg.declaredValueCents ? (pkg.declaredValueCents / 100).toString() : "100");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void getInsuranceTiers().then(setTiers).catch(() => setTiers([]));
  }, []);

  const valueCents = Math.max(0, Math.floor(parseFloat(valueDollars || "0") * 100));
  const matchedTier = tiers?.find((t) => valueCents <= t.maxValueCents) ?? null;
  const previousFee = pkg.insuranceFeeCents ?? 0;
  const newFee = matchedTier?.feeCents ?? 0;
  const netChargeCents = newFee - previousFee;
  const overMax = tiers && valueCents > tiers[tiers.length - 1].maxValueCents;

  function submit() {
    setError(null);
    if (!matchedTier || overMax) {
      setError("Pick a covered amount.");
      return;
    }
    startTransition(async () => {
      const res = await declareInsuranceValue({
        mailItemId: pkg.id,
        declaredValueCents: valueCents,
      });
      if ((res as { error?: string }).error) {
        setError((res as { error?: string }).error || "Failed");
        return;
      }
      onDone();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(45,16,15,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="rounded-2xl bg-white border w-full max-w-md p-5 shadow-2xl"
        style={{ borderColor: BRAND.border }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: BRAND.blueDeep }}>
              Insure this package
            </p>
            <p className="text-base font-black mt-0.5" style={{ color: BRAND.ink }}>
              {pkg.from}
            </p>
            {pkg.trackingNumber && (
              <p className="text-[11px] mt-0.5 font-mono" style={{ color: BRAND.blueDeep }}>
                {pkg.carrier} · {pkg.trackingNumber}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="text-xs font-bold rounded-lg px-2 py-1 border"
            style={{ borderColor: BRAND.border, color: BRAND.ink, background: "white" }}
            aria-label="Close">×</button>
        </div>

        {/* Value input */}
        <div>
          <label className="block text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: BRAND.inkSoft }}>
            Declared value (USD)
          </label>
          <div className="flex items-center gap-2">
            <span className="text-lg font-black" style={{ color: BRAND.inkSoft }}>$</span>
            <input
              type="number"
              min="0"
              step="1"
              value={valueDollars}
              onChange={(e) => setValueDollars(e.target.value)}
              className="flex-1 rounded-xl border px-3 py-2 text-lg font-black"
              style={{ borderColor: BRAND.border, background: "white", color: BRAND.ink }}
              autoFocus
            />
          </div>
        </div>

        {/* Tier picker — visual stack so customer sees the ladder */}
        {tiers && (
          <div className="mt-4 space-y-1.5">
            <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: BRAND.inkSoft }}>
              Coverage tier
            </p>
            {tiers.map((t) => {
              const active = matchedTier?.id === t.id;
              return (
                <div
                  key={t.id}
                  className="rounded-xl border p-3 flex items-center justify-between gap-2"
                  style={{
                    borderColor: active ? "#16A34A" : BRAND.border,
                    background: active ? "rgba(22,163,74,0.06)" : "white",
                  }}
                >
                  <div className="min-w-0">
                    <p className="text-[12.5px] font-black" style={{ color: BRAND.ink }}>
                      {t.label}
                      {active && <span className="ml-2 text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider" style={{ background: "rgba(22,163,74,0.14)", color: "#15803d" }}>Selected</span>}
                    </p>
                    <p className="text-[10.5px] mt-0.5" style={{ color: BRAND.inkSoft }}>
                      {t.description}
                    </p>
                  </div>
                  <span className="text-[13px] font-black tabular-nums shrink-0" style={{ color: t.feeCents === 0 ? "#15803d" : BRAND.ink }}>
                    {t.feeCents === 0 ? "Free" : `$${(t.feeCents / 100).toFixed(2)}`}
                  </span>
                </div>
              );
            })}
            {overMax && (
              <p className="text-[11px] mt-2" style={{ color: "#991b1b", fontWeight: 700 }}>
                Maximum we cover in-house is ${(tiers[tiers.length - 1].maxValueCents / 100).toFixed(0)}. For higher values, ship under the carrier's own insurance instead.
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="mt-3 text-[12px] font-bold rounded-lg px-3 py-2"
            style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>
            {error}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between gap-2">
          <p className="text-[11.5px]" style={{ color: BRAND.inkSoft }}>
            {netChargeCents > 0 && <>Charge <strong style={{ color: BRAND.ink }}>${(netChargeCents / 100).toFixed(2)}</strong> from wallet</>}
            {netChargeCents < 0 && <>Refund <strong style={{ color: "#15803d" }}>${(Math.abs(netChargeCents) / 100).toFixed(2)}</strong> to wallet</>}
            {netChargeCents === 0 && previousFee === 0 && <>No charge — free coverage tier</>}
            {netChargeCents === 0 && previousFee > 0 && <>No change to wallet</>}
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="px-3 py-2 rounded-lg text-xs font-bold border"
              style={{ borderColor: BRAND.border, color: BRAND.ink, background: "white" }}>
              Cancel
            </button>
            <button type="button" onClick={submit} disabled={pending || !matchedTier || overMax === true}
              className="px-3 py-2 rounded-md text-xs font-bold uppercase tracking-[0.08em] text-white disabled:opacity-40 transition-colors"
              style={{ background: BRAND.ink, border: `1px solid ${BRAND.ink}` }}>
              {pending ? "…" : matchedTier?.feeCents === 0 ? "Confirm coverage" : `Charge & insure →`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
