"use client";

// iter-98 — Admin referral attribution.
//
// Three sections: rolled-up totals, top-10 referrer leaderboard, recent
// 12 conversions. Helps admin see who's driving signups + where credit
// liability is sitting.

import { useEffect, useState } from "react";
import { getReferralLeaderboard } from "@/app/actions/referral";

type Aggregate = Awaited<ReturnType<typeof getReferralLeaderboard>>;

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";

function StatTile({ label, value, sub, ink }: { label: string; value: string; sub?: string; ink?: string }) {
  return (
    <div className="rounded-md p-3" style={{ border: "1px solid #ECEEF1", background: "white" }}>
      <p className="text-[9.5px] font-black uppercase tracking-[0.16em]" style={{ color: "rgba(0,0,0,0.55)" }}>{label}</p>
      <p className="text-2xl font-black mt-1 tabular-nums leading-none" style={{ color: ink ?? NOHO_INK }}>{value}</p>
      {sub && <p className="text-[10.5px] mt-1" style={{ color: "rgba(0,0,0,0.55)" }}>{sub}</p>}
    </div>
  );
}

export default function AdminReferralsPanel() {
  const [agg, setAgg] = useState<Aggregate | null>(null);
  useEffect(() => { void getReferralLeaderboard().then(setAgg).catch(() => setAgg(null)); }, []);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          Money & Comms · Referrals
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Referral leaderboard</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.55)" }}>
          $10 credit to both parties on each successful signup. Track top referrers, recent conversions, and total credit liability.
        </p>
      </div>

      {!agg ? (
        <p className="text-sm" style={{ color: "rgba(0,0,0,0.55)" }}>Loading…</p>
      ) : (
        <>
          {/* Roll-up tiles */}
          <div className="grid grid-cols-3 gap-2.5">
            <StatTile label="Credited signups" value={String(agg.totalCredited)} sub="paid out both ways" ink="#15803d" />
            <StatTile label="Pending" value={String(agg.totalPending)} sub="awaiting payment" ink="#92400e" />
            <StatTile label="Total credited" value={`$${(agg.totalCreditedCents / 100).toFixed(0)}`} sub="credit liability ever issued" ink={NOHO_BLUE_DEEP} />
          </div>

          {/* Top referrers */}
          <div className="rounded-md bg-white" style={{ border: "1px solid #ECEEF1" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "#e8e5e0" }}>
              <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(0,0,0,0.40)" }}>
                Top referrers
              </p>
            </div>
            {agg.topReferrers.length === 0 ? (
              <p className="px-4 py-6 text-[12px] text-center" style={{ color: "rgba(0,0,0,0.45)" }}>
                Nobody's hit a referral yet.
              </p>
            ) : (
              <ol className="divide-y" style={{ borderColor: "#e8e5e0" }}>
                {agg.topReferrers.map((r, i) => (
                  <li key={r.userId} className="px-4 py-2.5 flex items-center gap-3">
                    <span
                      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-[11px] font-black shrink-0"
                      style={{
                        background: i === 0 ? "rgba(245,166,35,0.20)" : i < 3 ? "rgba(51,116,133,0.10)" : "rgba(0,0,0,0.06)",
                        color: i === 0 ? "#92400e" : i < 3 ? NOHO_BLUE_DEEP : "rgba(0,0,0,0.55)",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-black truncate" style={{ color: NOHO_INK }}>
                        {r.name ?? "—"}
                        {r.suiteNumber && (
                          <span className="ml-1.5 text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                            #{r.suiteNumber}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="text-[12px] font-black shrink-0" style={{ color: "#15803d" }}>
                      {r.conversions} signup{r.conversions === 1 ? "" : "s"}
                    </span>
                    <span className="text-[12px] font-black tabular-nums shrink-0" style={{ color: NOHO_BLUE_DEEP, minWidth: 56, textAlign: "right" }}>
                      ${(r.earnedCents / 100).toFixed(0)}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Recent conversions */}
          <div className="rounded-md bg-white" style={{ border: "1px solid #ECEEF1" }}>
            <div className="px-4 py-3 border-b" style={{ borderColor: "#e8e5e0" }}>
              <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(0,0,0,0.40)" }}>
                Recent conversions
              </p>
            </div>
            {agg.recentConversions.length === 0 ? (
              <p className="px-4 py-6 text-[12px] text-center" style={{ color: "rgba(0,0,0,0.45)" }}>
                No conversions yet.
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: "#e8e5e0" }}>
                {agg.recentConversions.map((c) => (
                  <li key={c.id} className="px-4 py-2.5 flex items-center justify-between gap-3 flex-wrap">
                    <p className="text-[12.5px] font-bold" style={{ color: NOHO_INK }}>
                      <strong>{c.referrerName ?? "—"}</strong>
                      <span style={{ margin: "0 6px", color: "rgba(0,0,0,0.40)" }}>→</span>
                      {c.refereeName ?? "—"}
                    </p>
                    <span className="text-[10.5px]" style={{ color: "rgba(0,0,0,0.55)" }}>
                      {c.creditedAtIso && new Date(c.creditedAtIso).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
