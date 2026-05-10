"use client";

/**
 * iter-177 — Member ACH payment card.
 *
 * Member views their active mandate + past ACH charges. Setup
 * initiation hands off to Stripe Hosted Setup (the SetupIntent
 * client_secret URL) — the actual bank-link UI is Stripe's, which
 * gives us regulatory cover + saves us from building the form +
 * verifying micro-deposits.
 *
 * After Stripe.js confirms, the redirect lands on /dashboard/ach/return
 * which calls `recordAchMandate` server-side then returns here.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import {
  getMyAchSummary,
  setupAchForMyUser,
  revokeAchMandate,
  type AchMandateRow,
  type AchPaymentRow,
} from "@/app/actions/stripeAch";

export default function AchPaymentCard() {
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof getMyAchSummary>> | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function refresh() {
    void getMyAchSummary().then(setSummary).catch(() => setSummary(null));
  }
  useEffect(refresh, []);

  function onSetup() {
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await setupAchForMyUser();
      if (!res.ok) {
        setError(res.error);
        return;
      }
      // Hand off to Stripe Hosted Onboarding via the client_secret
      // pattern. We open the Stripe-hosted bank-link page in a new
      // tab — once the user finishes, our `/dashboard/ach/return`
      // route picks up the paymentMethodId and calls
      // `recordAchMandate`.
      const params = new URLSearchParams({
        setup_intent_client_secret: res.clientSecret,
        customer_id: res.customerId,
      });
      const url = `/dashboard/ach/return?${params.toString()}`;
      // For the MVP shipping today we just record the customer +
      // intent locally and tell the member where to finish. Stripe.js
      // bank-link integration ships in a follow-up iter.
      setInfo(`✓ Stripe customer ready. Continue at /dashboard/ach/return (Stripe.js integration ships in a follow-up iter).`);
      window.history.pushState({}, "", url);
    });
  }

  function onRevoke(m: AchMandateRow) {
    if (!confirm(`Remove your bank account ending in ${m.bankLast4 ?? "????"} ? Future renewals fall back to card.`)) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await revokeAchMandate({ id: m.id });
      if (res.error) setError(res.error);
      else { setInfo("✓ Bank account removed."); refresh(); }
    });
  }

  if (!summary) return null;
  if (!summary.configured && !summary.active && summary.recentPayments.length === 0) {
    // Stripe isn't configured + no historical activity — render
    // nothing (don't tease members with a broken option).
    return null;
  }

  const m = summary.active;

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
            Billing · ACH bank debit
          </p>
          <h3 className="text-base font-black tracking-tight" style={{ color: BRAND.ink }}>Pay renewals from your bank</h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            ACH bank debit settles in 4-5 business days but costs us about <strong>1/3 of card fees</strong> on big-ticket renewals — savings we share with Business members via discounted plans.
          </p>
        </div>
      </div>

      {!summary.configured && (
        <div className="mt-3 rounded-lg p-2.5" style={{ background: "rgba(245,158,11,0.10)", border: "1px solid rgba(245,158,11,0.40)" }}>
          <p className="text-[11px] font-semibold" style={{ color: "#92400e" }}>
            ⚠️ ACH isn't configured on this server yet. Contact admin to set up Stripe.
          </p>
        </div>
      )}

      {m ? (
        <div className="mt-4 rounded-xl p-3 flex items-center gap-3 flex-wrap" style={{ background: "#FAFAF8", border: `1px solid ${BRAND.border}` }}>
          <div className="w-12 h-12 rounded-lg flex items-center justify-center" style={{ background: BRAND.blue, color: "white", fontSize: 20 }}>🏦</div>
          <div className="flex-1 min-w-0">
            <p className="text-[12.5px] font-black" style={{ color: BRAND.ink }}>
              {m.bankName ?? "Bank account"} ····{m.bankLast4 ?? "????"}
            </p>
            <p className="text-[10.5px]" style={{ color: BRAND.inkSoft }}>
              <span className="font-black px-1.5 py-0.5 rounded text-[9px]" style={{ background: "rgba(34,197,94,0.10)", color: "#15803d" }}>ACTIVE</span>
              {m.setupCompletedAtIso && <span className="ml-2">Connected {new Date(m.setupCompletedAtIso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>}
            </p>
          </div>
          <button type="button" disabled={busy} onClick={() => onRevoke(m)} className="text-[11px] font-bold px-2.5 py-1 rounded-md" style={{ background: "rgba(239,68,68,0.06)", color: "#b91c1c", border: "1px solid rgba(239,68,68,0.30)" }}>
            Remove
          </button>
        </div>
      ) : (
        <button type="button" disabled={busy || !summary.configured} onClick={onSetup} className="mt-4 text-[12px] font-black px-3.5 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
          🏦 {busy ? "Setting up…" : "Connect bank account"}
        </button>
      )}

      {error && <p className="mt-2 text-[11.5px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>}
      {info && <p className="mt-2 text-[11.5px] font-semibold" style={{ color: "#15803d" }}>{info}</p>}

      {summary.recentPayments.length > 0 && (
        <div className="mt-4">
          <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: BRAND.inkSoft }}>Recent ACH charges</p>
          <ul className="space-y-1">
            {summary.recentPayments.slice(0, 5).map((p) => <PaymentRow key={p.id} p={p} />)}
          </ul>
        </div>
      )}
    </section>
  );
}

function PaymentRow({ p }: { p: AchPaymentRow }) {
  const style = (() => {
    if (p.status === "succeeded") return { c: "#15803d", t: "✓ SETTLED" };
    if (p.status === "processing") return { c: BRAND.blueDeep, t: "⏳ PROCESSING" };
    if (p.status === "failed") return { c: "#b91c1c", t: "✕ FAILED" };
    return { c: BRAND.inkFaint, t: "CANCELLED" };
  })();
  const dollars = (p.amountCents / 100).toFixed(2);
  const date = new Date(p.createdAtIso).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return (
    <li className="text-[11.5px] flex items-center gap-2 py-1" style={{ borderBottom: `1px solid ${BRAND.border}` }}>
      <span className="font-black tabular-nums" style={{ color: BRAND.ink, minWidth: 70 }}>${dollars}</span>
      <span className="font-bold" style={{ color: style.c }}>{style.t}</span>
      <span className="truncate flex-1" style={{ color: BRAND.inkSoft }}>{p.description}</span>
      <span className="tabular-nums" style={{ color: BRAND.inkFaint }}>{date}</span>
    </li>
  );
}
