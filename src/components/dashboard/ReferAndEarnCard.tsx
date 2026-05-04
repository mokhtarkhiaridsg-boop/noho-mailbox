"use client";

// iter-98 — Refer & earn card. Shows the customer's code + share button
// + earnings stats + recent conversion list.

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import { getOrCreateMyReferralCode, getMyReferralStats, getMyReferralActivity } from "@/app/actions/referral";

type Stats = Awaited<ReturnType<typeof getMyReferralStats>>;
type Activity = Awaited<ReturnType<typeof getMyReferralActivity>>;

export default function ReferAndEarnCard() {
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void Promise.all([
      getOrCreateMyReferralCode().then((r) => setCode(r.code)),
      getMyReferralStats().then(setStats),
      getMyReferralActivity().then(setActivity),
    ]).catch(() => undefined);
  }, []);

  const referUrl = code && typeof window !== "undefined" ? `${window.location.origin}/refer/${code}` : "";

  function share() {
    if (!referUrl || !code) return;
    const shareData = {
      title: "Join me on NOHO Mailbox",
      text: `Use my code ${code} for $10 off at NOHO Mailbox.`,
      url: referUrl,
    };
    startTransition(async () => {
      if (typeof navigator !== "undefined" && (navigator as Navigator & { share?: (d: ShareData) => Promise<void> }).share) {
        try { await (navigator as Navigator & { share: (d: ShareData) => Promise<void> }).share(shareData); return; } catch { /* user cancelled */ }
      }
      try {
        await navigator.clipboard.writeText(referUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2400);
      } catch {
        // fallthrough — leave URL visible in the card
      }
    });
  }

  function copyCode() {
    if (!code) return;
    void navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
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
      <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <div className="flex items-center gap-2.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 6px #16A34A" }} />
          <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
            Refer & earn · $10 each
          </h3>
        </div>
      </div>
      <p className="text-[11.5px] mb-4" style={{ color: BRAND.inkSoft }}>
        Share your code. Anyone who signs up gets $10 off — and you get $10 added to your wallet for each one.
      </p>

      {/* Code + share */}
      <div className="rounded-xl border p-4" style={{ borderColor: "rgba(22,163,74,0.30)", background: "rgba(22,163,74,0.04)" }}>
        <p className="text-[10px] font-black uppercase tracking-wider" style={{ color: "#15803d" }}>
          Your code
        </p>
        <div className="flex items-center gap-2 mt-1">
          <code
            onClick={copyCode}
            className="flex-1 px-3 py-2 rounded-lg text-base font-black font-mono cursor-pointer"
            style={{ background: "white", color: BRAND.ink, border: `1px solid ${BRAND.border}`, letterSpacing: "0.04em" }}
            title="Click to copy"
          >
            {code ?? "…"}
          </code>
          <button
            type="button"
            onClick={share}
            disabled={pending || !code}
            className="px-3 py-2 rounded-lg text-xs font-black text-white disabled:opacity-50"
            style={{ background: copied ? "#15803d" : "#16A34A" }}
          >
            {copied ? "Copied ✓" : "Share"}
          </button>
        </div>
        {referUrl && (
          <p className="text-[10.5px] mt-2 break-all" style={{ color: BRAND.inkSoft }}>
            {referUrl}
          </p>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mt-3">
        <div className="rounded-xl border p-3 text-center" style={{ borderColor: BRAND.border }}>
          <p className="text-[9.5px] font-black uppercase tracking-wider" style={{ color: BRAND.inkSoft }}>Earned</p>
          <p className="text-xl font-black mt-0.5" style={{ color: "#15803d" }}>${((stats?.totalEarnedCents ?? 0) / 100).toFixed(0)}</p>
        </div>
        <div className="rounded-xl border p-3 text-center" style={{ borderColor: BRAND.border }}>
          <p className="text-[9.5px] font-black uppercase tracking-wider" style={{ color: BRAND.inkSoft }}>Signups</p>
          <p className="text-xl font-black mt-0.5" style={{ color: BRAND.ink }}>{stats?.creditedCount ?? 0}</p>
        </div>
        <div className="rounded-xl border p-3 text-center" style={{ borderColor: BRAND.border }}>
          <p className="text-[9.5px] font-black uppercase tracking-wider" style={{ color: BRAND.inkSoft }}>Pending</p>
          <p className="text-xl font-black mt-0.5" style={{ color: "#92400e" }}>{stats?.pendingCount ?? 0}</p>
        </div>
      </div>

      {/* Recent activity */}
      {activity && activity.length > 0 && (
        <div className="mt-3">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: BRAND.inkSoft }}>
            Recent conversions
          </p>
          <ul className="space-y-1.5">
            {activity.filter((a) => a.refereeFirstName).slice(0, 5).map((a) => (
              <li key={a.id} className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg" style={{ background: a.status === "credited" ? "rgba(22,163,74,0.06)" : "rgba(245,166,35,0.06)" }}>
                <span className="flex items-center gap-2 text-[12px] font-bold" style={{ color: BRAND.ink }}>
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-black"
                    style={{ background: BRAND.blueDeep, color: "white" }}>
                    {a.refereeInitials ?? "?"}
                  </span>
                  {a.refereeFirstName ?? "Member"}
                  <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{
                    background: a.status === "credited" ? "rgba(22,163,74,0.14)" : "rgba(245,166,35,0.14)",
                    color: a.status === "credited" ? "#15803d" : "#92400e",
                  }}>
                    {a.status === "credited" ? "Credited" : "Pending"}
                  </span>
                </span>
                <span className="text-[11px] font-black tabular-nums" style={{ color: a.status === "credited" ? "#15803d" : BRAND.inkSoft }}>
                  +${(a.creditCents / 100).toFixed(0)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
