"use client";

// iter-112 — Member-side wallet auto top-up card.

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import { getMyWalletAutoTopUp, setMyWalletAutoTopUp, type WalletAutoTopUpStatus } from "@/app/actions/walletAutoTopUp";

const THRESHOLD_PRESETS = [10, 25, 50] as const; // dollars
const AMOUNT_PRESETS = [25, 50, 100, 200] as const;

export default function WalletAutoTopUpCard() {
  const [status, setStatus] = useState<WalletAutoTopUpStatus | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [thresholdDollars, setThresholdDollars] = useState<number>(25);
  const [amountDollars, setAmountDollars] = useState<number>(50);

  function refresh() {
    void getMyWalletAutoTopUp().then((s) => {
      setStatus(s);
      if (s.thresholdCents) setThresholdDollars(Math.round(s.thresholdCents / 100));
      if (s.amountCents) setAmountDollars(Math.round(s.amountCents / 100));
    }).catch(() => setStatus(null));
  }
  useEffect(() => { refresh(); }, []);

  function enable() {
    setMsg(null);
    startTransition(async () => {
      const res = await setMyWalletAutoTopUp({
        enabled: true,
        thresholdCents: Math.round(thresholdDollars * 100),
        amountCents: Math.round(amountDollars * 100),
      });
      if (res.error) { setMsg(res.error); return; }
      setMsg("✓ Auto top-up active");
      refresh();
    });
  }

  function disable() {
    setMsg(null);
    startTransition(async () => {
      const res = await setMyWalletAutoTopUp({ enabled: false });
      if (res.error) { setMsg(res.error); return; }
      setMsg("Auto top-up paused");
      refresh();
    });
  }

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
        <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: status?.enabled ? "#16A34A" : BRAND.blue, boxShadow: `0 0 6px ${status?.enabled ? "#16A34A" : BRAND.blue}` }} />
        <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
          Wallet auto top-up
        </h3>
      </div>
      <p className="text-[11.5px] mb-4" style={{ color: BRAND.inkSoft }}>
        Pair with auto-renew so it never bounces: when your wallet drops below the threshold, we'll create a top-up request automatically — admin texts you a Square link, you pay, wallet refills, life goes on.
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

      {!status ? (
        <p className="text-[11.5px] italic" style={{ color: BRAND.inkFaint }}>Loading…</p>
      ) : status.enabled ? (
        <div className="rounded-xl border p-3" style={{ borderColor: BRAND.border, background: "rgba(22,163,74,0.04)" }}>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Stat label="Wallet" value={`$${(status.walletBalanceCents / 100).toFixed(2)}`} />
            <Stat label="Threshold" value={`$${((status.thresholdCents ?? 0) / 100).toFixed(0)}`} />
            <Stat label="Top-up" value={`$${((status.amountCents ?? 0) / 100).toFixed(0)}`} />
          </div>
          {status.lastFiredAtIso && (
            <p className="text-[10.5px] mb-2" style={{ color: BRAND.inkSoft }}>
              Last fired: {new Date(status.lastFiredAtIso).toLocaleDateString()}
            </p>
          )}
          <button type="button" onClick={disable} disabled={pending}
            className="w-full py-2.5 rounded-lg font-black text-[12px] disabled:opacity-50 border"
            style={{ borderColor: "#dc2626", color: "#991b1b", background: "white" }}>
            {pending ? "Saving…" : "Pause auto top-up"}
          </button>
        </div>
      ) : (
        <div className="rounded-xl border p-3 space-y-3" style={{ borderColor: BRAND.border, background: BRAND.blueSoft }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: BRAND.inkSoft }}>
              Trigger when wallet falls below
            </p>
            <div className="flex flex-wrap gap-1.5">
              {THRESHOLD_PRESETS.map((d) => (
                <button key={d} type="button" onClick={() => setThresholdDollars(d)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-black"
                  style={{
                    background: thresholdDollars === d ? BRAND.blue : "white",
                    color: thresholdDollars === d ? "white" : BRAND.ink,
                    border: `1px solid ${thresholdDollars === d ? BRAND.blue : BRAND.border}`,
                  }}>
                  ${d}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-1" style={{ color: BRAND.inkSoft }}>
              Top-up amount
            </p>
            <div className="flex flex-wrap gap-1.5">
              {AMOUNT_PRESETS.map((d) => (
                <button key={d} type="button" onClick={() => setAmountDollars(d)}
                  className="px-3 py-1.5 rounded-full text-[11px] font-black"
                  style={{
                    background: amountDollars === d ? BRAND.blue : "white",
                    color: amountDollars === d ? "white" : BRAND.ink,
                    border: `1px solid ${amountDollars === d ? BRAND.blue : BRAND.border}`,
                  }}>
                  ${d}
                </button>
              ))}
            </div>
          </div>
          <p className="text-[11px]" style={{ color: BRAND.inkSoft }}>
            Current wallet: <strong>${(status.walletBalanceCents / 100).toFixed(2)}</strong>
            {status.walletBalanceCents < thresholdDollars * 100 && (
              <span style={{ color: "#92400e" }}> · already below threshold — first request fires next morning</span>
            )}
          </p>
          <button type="button" onClick={enable} disabled={pending}
            className="w-full py-2.5 rounded-lg text-white font-black text-[12px] disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})` }}>
            {pending ? "Saving…" : `Turn on · top-up $${amountDollars} when below $${thresholdDollars}`}
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: BRAND.inkSoft }}>{label}</p>
      <p className="text-[13px] font-black tabular-nums" style={{ color: BRAND.ink }}>{value}</p>
    </div>
  );
}
