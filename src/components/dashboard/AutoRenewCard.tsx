"use client";

// iter-111 — Member-side auto-renew opt-in card.
//
// Shows current state, plan + next charge date + estimated amount, wallet
// balance check, and a toggle. Lives next to ReferAndEarnCard / SharedMailboxCard
// in SettingsPanel.

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import { setMyAutoRenew, getMyAutoRenewStatus } from "@/app/actions/recurringBilling";

type Status = Awaited<ReturnType<typeof getMyAutoRenewStatus>>;

export default function AutoRenewCard() {
  const [status, setStatus] = useState<Status | null>(null);
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function refresh() {
    void getMyAutoRenewStatus().then(setStatus).catch(() => setStatus(null));
  }
  useEffect(() => { refresh(); }, []);

  function toggle() {
    if (!status) return;
    const next = !status.enabled;
    if (next && !status.canCoverFromWallet) {
      const ok = confirm(`Your wallet balance ($${(status.walletBalanceCents / 100).toFixed(2)}) is below the auto-renew amount ($${(status.estimatedChargeCents / 100).toFixed(2)}). Enable anyway? You'll need to top up before the next charge.`);
      if (!ok) return;
    }
    setMsg(null);
    startTransition(async () => {
      const res = await setMyAutoRenew(next);
      if (res.error) { setMsg(res.error); return; }
      setMsg(next ? "✓ Auto-renew on — we'll handle it" : "Auto-renew paused");
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
          Auto-renew plan
        </h3>
      </div>
      <p className="text-[11.5px] mb-4" style={{ color: BRAND.inkSoft }}>
        Skip the renewal hassle: we charge your NOHO wallet automatically when your plan is due. We email you 7 days before each charge, and you can pause any time.
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
      ) : !status.plan ? (
        <p className="text-[11.5px] italic" style={{ color: BRAND.inkFaint }}>
          No plan on file yet. Pick a plan and we'll wire up auto-renew here.
        </p>
      ) : (
        <div className="rounded-xl border p-3" style={{ borderColor: BRAND.border, background: status.enabled ? "rgba(22,163,74,0.04)" : BRAND.blueSoft }}>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Stat label="Plan" value={status.plan} />
            <Stat label="Term" value={`${status.termMonths}mo`} />
            <Stat label="Next due" value={status.nextChargeDate ?? "—"} />
            <Stat label="Estimated" value={`$${(status.estimatedChargeCents / 100).toFixed(2)}`} />
          </div>
          <div className="flex items-center justify-between gap-3 mb-2">
            <p className="text-[11px]" style={{ color: status.canCoverFromWallet ? "#15803d" : "#92400e" }}>
              {status.canCoverFromWallet ? "✓" : "⚠️"} Wallet: <strong>${(status.walletBalanceCents / 100).toFixed(2)}</strong> {status.canCoverFromWallet ? "covers next charge" : "below estimated charge"}
            </p>
          </div>
          <button type="button" onClick={toggle} disabled={pending}
            className="w-full py-2.5 rounded-lg font-black text-[12px] disabled:opacity-50"
            style={{
              background: status.enabled ? "white" : `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
              color: status.enabled ? "#991b1b" : "white",
              border: status.enabled ? `1px solid #dc2626` : "none",
            }}>
            {pending ? "Saving…" : status.enabled ? "Pause auto-renew" : "Turn on auto-renew"}
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
