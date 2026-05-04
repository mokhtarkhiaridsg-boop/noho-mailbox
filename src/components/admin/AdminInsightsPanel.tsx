"use client";

// iter-92 — Customer feedback insights for the bureau.
//
// Renders aggregate stats from PickupSurvey: response count + rate,
// rolling avg rating, 7d/30d trends, promoter/detractor mix, and a
// recent-comments feed.

import { useEffect, useState } from "react";
import { getPickupSurveyAggregate } from "@/app/actions/pickupSurvey";

type Aggregate = Awaited<ReturnType<typeof getPickupSurveyAggregate>>;

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";

function StarsRow({ rating }: { rating: number }) {
  const r = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span aria-label={`${r} of 5 stars`} style={{ color: "#f59e0b", letterSpacing: 1 }}>
      {"★".repeat(r)}<span style={{ color: "rgba(45,16,15,0.20)" }}>{"★".repeat(5 - r)}</span>
    </span>
  );
}

function StatTile({ label, value, sub, ink }: { label: string; value: string; sub?: string; ink?: string }) {
  return (
    <div className="rounded-md p-3" style={{ border: "1px solid #ECEEF1", background: "white" }}>
      <p className="text-[9.5px] font-black uppercase tracking-[0.16em]" style={{ color: "rgba(45,16,15,0.55)" }}>{label}</p>
      <p className="text-2xl font-black mt-1 tabular-nums leading-none" style={{ color: ink ?? NOHO_INK }}>{value}</p>
      {sub && <p className="text-[10.5px] mt-1" style={{ color: "rgba(45,16,15,0.55)" }}>{sub}</p>}
    </div>
  );
}

export default function AdminInsightsPanel() {
  const [agg, setAgg] = useState<Aggregate | null>(null);

  useEffect(() => {
    void getPickupSurveyAggregate().then(setAgg).catch(() => setAgg(null));
  }, []);

  return (
    <div className="flex flex-col h-full gap-3">
      {/* ─── Branded title row — Baloo + Pacifico script accent ─── */}
      <div className="shrink-0 flex items-baseline gap-3 flex-wrap">
        <h2
          className="text-2xl font-bold"
          style={{
            color: NOHO_INK,
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
          }}
        >
          Customer Insights
        </h2>
        <span
          className="text-[15px] hidden sm:inline"
          style={{
            color: NOHO_BLUE,
            fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
            transform: "translateY(-1px)",
            display: "inline-block",
          }}
        >
          neighborhood pulse
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "rgba(45,16,15,0.55)" }}>
          · pickup surveys mint automatically on Picked Up
        </span>
      </div>

      {!agg ? (
        <p className="text-sm" style={{ color: "rgba(45,16,15,0.55)" }}>Loading…</p>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <StatTile
              label="Response rate"
              value={`${(agg.responseRate * 100).toFixed(0)}%`}
              sub={`${agg.responded} of ${agg.total}`}
              ink={NOHO_BLUE_DEEP}
            />
            <StatTile
              label="Average rating"
              value={agg.avgRating == null ? "—" : agg.avgRating.toFixed(2)}
              sub={agg.avgRating != null ? "out of 5.0" : "no responses yet"}
              ink="#f59e0b"
            />
            <StatTile
              label="Promoters · 5★"
              value={`${agg.promoterPct.toFixed(0)}%`}
              ink="#15803d"
            />
            <StatTile
              label="Detractors · ≤2★"
              value={`${agg.detractorPct.toFixed(0)}%`}
              ink="#991b1b"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <StatTile
              label="Last 7 days"
              value={agg.recent7dAvg == null ? "—" : agg.recent7dAvg.toFixed(2)}
              sub="avg rating"
              ink={NOHO_BLUE_DEEP}
            />
            <StatTile
              label="Last 30 days"
              value={agg.recent30dAvg == null ? "—" : agg.recent30dAvg.toFixed(2)}
              sub="avg rating"
              ink={NOHO_BLUE_DEEP}
            />
          </div>

          {/* Recent comments */}
          <div className="rounded-md bg-white" style={{ border: "1px solid #ECEEF1" }}>
            <div className="px-4 py-3 border-b flex items-center gap-2" style={{ borderColor: "#e8e5e0" }}>
              <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#f59e0b", boxShadow: "0 0 6px #f59e0b" }} />
              <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.40)" }}>
                Recent comments · {agg.recentComments.length}
              </p>
            </div>
            {agg.recentComments.length === 0 ? (
              <p className="px-4 py-6 text-[12px] text-center" style={{ color: "rgba(45,16,15,0.45)" }}>
                No written comments yet — they'll appear here as customers submit them.
              </p>
            ) : (
              <ul className="divide-y" style={{ borderColor: "#e8e5e0" }}>
                {agg.recentComments.map((c) => (
                  <li key={c.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-[12.5px] font-black flex items-center gap-2" style={{ color: NOHO_INK }}>
                        <StarsRow rating={c.rating} />
                        {c.customerName && <span style={{ color: NOHO_INK }}>· {c.customerName}</span>}
                        {c.suiteNumber && (
                          <span className="text-[10px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                            Suite #{c.suiteNumber}
                          </span>
                        )}
                      </p>
                      <span className="text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>
                        {new Date(c.submittedAt).toLocaleString()}
                      </span>
                    </div>
                    <p className="mt-1.5 text-[12.5px] italic" style={{ color: "rgba(45,16,15,0.75)" }}>
                      "{c.comment}"
                    </p>
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
