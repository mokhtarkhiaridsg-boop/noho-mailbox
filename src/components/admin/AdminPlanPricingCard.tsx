"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getPlanPrices,
  updatePlanPrices,
  type PlanPrices,
} from "@/app/actions/compliance";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";
const NOHO_GREEN = "#16A34A";
const NOHO_RED = "#E70013";
const NOHO_CREAM = "#F7E6C2";

type FieldDef = {
  key: keyof PlanPrices;
  label: string;
  sub: string;
  accent: string;
  emoji: string;
  description: string;
};

const FIELDS: FieldDef[] = [
  {
    key: "basicCents",
    label: "Basic",
    sub: "/ 3 months",
    accent: NOHO_BLUE,
    emoji: "📬",
    description: "Single-suite mailbox with email scans",
  },
  {
    key: "businessCents",
    label: "Business",
    sub: "/ 3 months",
    accent: NOHO_AMBER,
    emoji: "💼",
    description: "Higher capacity + faster scans",
  },
  {
    key: "premiumCents",
    label: "Premium",
    sub: "/ 3 months",
    accent: "#7C3AED",
    emoji: "✨",
    description: "Same-day scans + storage",
  },
  {
    key: "keyFeeCents",
    label: "Key fee",
    sub: "one-time",
    accent: NOHO_INK,
    emoji: "🗝️",
    description: "Returns refundable on cancel",
  },
];

function dollars(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function AdminPlanPricingCard() {
  const [prices, setPrices] = useState<PlanPrices | null>(null);
  const [originalPrices, setOriginalPrices] = useState<PlanPrices | null>(null);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    getPlanPrices().then((p) => {
      setPrices(p);
      setOriginalPrices(p);
    });
  }, []);

  function setDollars(key: keyof PlanPrices, val: string) {
    if (!prices) return;
    const cents = Math.round(parseFloat(val || "0") * 100);
    if (!Number.isFinite(cents)) return;
    setPrices({ ...prices, [key]: cents });
  }

  function save() {
    if (!prices) return;
    setMsg(null);
    startTransition(async () => {
      const res = await updatePlanPrices(prices);
      if ("error" in res && res.error) {
        setMsg({ ok: false, text: res.error });
      } else {
        setMsg({ ok: true, text: "Prices updated" });
        setOriginalPrices(prices);
        setTimeout(() => setMsg(null), 4000);
      }
    });
  }

  function reset() {
    if (originalPrices) setPrices(originalPrices);
  }

  const isDirty =
    prices && originalPrices && FIELDS.some((f) => prices[f.key] !== originalPrices[f.key]);

  return (
    <div
      className="rounded-2xl bg-white relative overflow-hidden"
      style={{
        border: `1px solid ${NOHO_INK}11`,
        boxShadow: "0 1px 3px rgba(45,16,15,0.05), 0 8px 22px rgba(45,16,15,0.06)",
      }}
    >
      {/* Branded header strip */}
      <div
        className="relative px-5 py-4 overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${NOHO_BLUE_DEEP} 0%, ${NOHO_BLUE} 50%, #1F4554 100%)`,
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 30%, white 1px, transparent 1px)",
            backgroundSize: "20px 20px",
          }}
        />
        <div className="relative flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse"
                style={{ background: NOHO_AMBER }}
              />
              <span
                className="text-[9px] font-black uppercase tracking-[0.2em]"
                style={{ color: NOHO_CREAM }}
              >
                /pricing · live config
              </span>
            </div>
            <h3
              className="font-black text-lg leading-tight"
              style={{
                color: "white",
                fontFamily: "var(--font-baloo, system-ui)",
              }}
            >
              Plan Pricing
            </h3>
            <p className="text-[11px] mt-0.5" style={{ color: `${NOHO_CREAM}aa` }}>
              What customers see on the pricing page · whole-dollar amounts
            </p>
          </div>
          {msg && (
            <span
              className="text-[10px] font-black px-2.5 py-1.5 rounded-lg uppercase tracking-wider"
              style={{
                background: msg.ok ? `${NOHO_GREEN}22` : `${NOHO_RED}22`,
                color: msg.ok ? "#bbf7d0" : "#fecaca",
                border: `1px solid ${msg.ok ? NOHO_GREEN : NOHO_RED}66`,
              }}
            >
              {msg.ok ? "✓" : "⚠"} {msg.text}
            </span>
          )}
        </div>
      </div>

      <div className="p-5">
        {!prices ? (
          <div className="flex items-center gap-2 text-sm" style={{ color: `${NOHO_INK}66` }}>
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ background: NOHO_BLUE }}
            />
            Loading prices…
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {FIELDS.map((f) => {
                const cents = prices[f.key];
                const origCents = originalPrices?.[f.key] ?? cents;
                const changed = cents !== origCents;
                return (
                  <div
                    key={f.key}
                    className="rounded-xl p-3 transition-all relative overflow-hidden"
                    style={{
                      background: `${f.accent}06`,
                      border: `1px solid ${f.accent}${changed ? "55" : "22"}`,
                      boxShadow: changed ? `0 4px 14px ${f.accent}33` : "none",
                    }}
                  >
                    {changed && (
                      <span
                        className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
                        style={{ background: f.accent }}
                      />
                    )}
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="text-[14px] leading-none">{f.emoji}</span>
                      <label
                        className="text-[10px] font-black uppercase tracking-[0.15em]"
                        style={{ color: f.accent }}
                      >
                        {f.label}
                      </label>
                    </div>
                    <div className="relative">
                      <span
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-base font-black"
                        style={{ color: f.accent }}
                      >
                        $
                      </span>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={(cents / 100).toFixed(0)}
                        onChange={(e) => setDollars(f.key, e.target.value)}
                        className="w-full rounded-lg border pl-7 pr-2 py-2 text-base font-black tabular-nums focus:outline-none focus:ring-2 transition-all"
                        style={{
                          borderColor: `${f.accent}33`,
                          background: "white",
                          color: NOHO_INK,
                        }}
                      />
                    </div>
                    <p className="text-[10px] mt-1.5 font-bold" style={{ color: `${NOHO_INK}88` }}>
                      {f.sub}
                    </p>
                    <p className="text-[10px] mt-0.5 leading-tight" style={{ color: `${NOHO_INK}66` }}>
                      {f.description}
                    </p>
                    {changed && (
                      <p
                        className="text-[9px] font-black uppercase tracking-wider mt-1.5"
                        style={{ color: f.accent }}
                      >
                        Was {dollars(origCents)} · now {dollars(cents)}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center gap-2 flex-wrap">
              <button
                disabled={isPending || !isDirty}
                onClick={save}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black text-white transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                style={{
                  background: isDirty
                    ? `linear-gradient(135deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)`
                    : `${NOHO_INK}22`,
                  boxShadow: isDirty ? `0 4px 14px ${NOHO_BLUE}40` : "none",
                  color: isDirty ? "white" : `${NOHO_INK}66`,
                }}
              >
                {isPending ? (
                  <>
                    <div
                      className="w-3 h-3 rounded-full animate-pulse"
                      style={{ background: "white" }}
                    />
                    Saving…
                  </>
                ) : (
                  <>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
                      <polyline points="17 21 17 13 7 13 7 21" />
                      <polyline points="7 3 7 8 15 8" />
                    </svg>
                    Save pricing
                  </>
                )}
              </button>
              {isDirty && (
                <button
                  onClick={reset}
                  disabled={isPending}
                  className="text-[11px] font-black uppercase tracking-wider px-3 py-2 rounded-lg transition-all"
                  style={{
                    background: `${NOHO_INK}08`,
                    color: NOHO_INK,
                  }}
                >
                  Reset
                </button>
              )}
              <span
                className="text-[10px] ml-auto inline-flex items-center gap-1.5 font-bold"
                style={{ color: `${NOHO_INK}55` }}
              >
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v5 M12 16h.01" />
                </svg>
                Pricing page reflects changes on next load
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
