"use client";

import { useState, useEffect } from "react";
import { BRAND } from "./types";
import { getAnnualSummary } from "@/app/actions/annualSummary";

type Summary = Awaited<ReturnType<typeof getAnnualSummary>>;

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="rounded-2xl p-4 text-center" style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}` }}>
      <p className="text-2xl font-black" style={{ color: BRAND.ink }}>{value}</p>
      <p className="text-[11px] font-black uppercase tracking-wider mt-0.5" style={{ color: BRAND.blueDeep }}>{label}</p>
      {sub && <p className="text-[10px] mt-0.5" style={{ color: BRAND.inkFaint }}>{sub}</p>}
    </div>
  );
}

export default function AnnualSummaryPanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    getAnnualSummary(year).then((s) => { setSummary(s); setLoading(false); });
  }, [year]);

  const years = Array.from({ length: 3 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div
      className="rounded-3xl p-6"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-2.5">
          <span className="text-lg">📊</span>
          <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
            Annual Mail Summary
          </h3>
        </div>
        <div className="flex gap-1.5">
          {years.map((y) => (
            <button
              key={y}
              onClick={() => setYear(y)}
              className="text-xs font-black px-3 py-1.5 rounded-xl"
              style={{
                background: year === y ? BRAND.blue : BRAND.blueSoft,
                color: year === y ? "white" : BRAND.blueDeep,
              }}
            >
              {y}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: BRAND.blueSoft, borderTopColor: BRAND.blue }} />
        </div>
      )}

      {summary && !loading && (
        <div className="space-y-5">
          {/* Mail stats */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-3" style={{ color: BRAND.inkFaint }}>Mail Activity</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <StatCard label="Total Items" value={summary.mail.totalMail} />
              <StatCard label="Letters" value={summary.mail.letters} />
              <StatCard label="Packages" value={summary.mail.packages} />
              <StatCard label="Scanned" value={summary.mail.scanned} />
              <StatCard label="Forwarded" value={summary.mail.forwarded} />
              <StatCard label="Picked Up" value={summary.mail.pickedUp} />
              <StatCard label="Priority" value={summary.mail.priority} />
              <StatCard label="Junk Blocked" value={summary.mail.junk} />
            </div>
          </div>

          {/* Wallet */}
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider mb-3" style={{ color: BRAND.inkFaint }}>Wallet Activity</p>
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="Total Spent"
                value={`$${(summary.wallet.totalSpentCents / 100).toFixed(2)}`}
                sub="charges"
              />
              <StatCard
                label="Total Added"
                value={`$${(summary.wallet.totalDepositedCents / 100).toFixed(2)}`}
                sub="deposits"
              />
            </div>
          </div>

          {/* Deliveries */}
          {summary.deliveries.total > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider mb-3" style={{ color: BRAND.inkFaint }}>Deliveries</p>
              <div className="grid grid-cols-2 gap-2">
                <StatCard label="Deliveries" value={summary.deliveries.total} />
                <StatCard label="Delivery Spend" value={`$${summary.deliveries.totalSpend.toFixed(2)}`} />
              </div>
            </div>
          )}

          {/* Top senders */}
          {summary.topSenders.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider mb-3" style={{ color: BRAND.inkFaint }}>Top Senders</p>
              <div className="space-y-2">
                {summary.topSenders.map((s, i) => (
                  <div key={s.sender} className="flex items-center gap-3">
                    <span className="text-xs font-black w-5 text-center" style={{ color: BRAND.inkFaint }}>#{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div
                        className="h-2 rounded-full"
                        style={{
                          width: `${(s.count / summary.topSenders[0].count) * 100}%`,
                          background: `linear-gradient(90deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                        }}
                      />
                    </div>
                    <span className="text-xs font-bold truncate max-w-[120px]" style={{ color: BRAND.ink }}>{s.sender}</span>
                    <span className="text-xs font-black w-6 text-right shrink-0" style={{ color: BRAND.blueDeep }}>{s.count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {summary.mail.totalMail === 0 && (
            <div className="text-center py-8">
              <p className="text-4xl mb-3">📭</p>
              <p className="font-bold text-sm" style={{ color: BRAND.inkSoft }}>No mail recorded for {year}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
