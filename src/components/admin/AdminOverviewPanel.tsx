"use client";

import { StatusBadge } from "./StatusBadge";
import type { Stats, MailItem, NotaryItem } from "./types";

type Props = {
  stats: Stats;
  recentMail: MailItem[];
  notaryQueue: NotaryItem[];
  setTab: (tab: string) => void;
};

export function AdminOverviewPanel({ stats, recentMail, notaryQueue, setTab }: Props) {
  const totalPlan = stats.planDistribution.basic + stats.planDistribution.business + stats.planDistribution.premium;
  const basicPct = totalPlan > 0 ? Math.round((stats.planDistribution.basic / totalPlan) * 100) : 0;
  const businessPct = totalPlan > 0 ? Math.round((stats.planDistribution.business / totalPlan) * 100) : 0;
  const premiumPct = totalPlan > 0 ? Math.round((stats.planDistribution.premium / totalPlan) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Active Customers", value: String(stats.activeCustomers), change: "+8 this month", accent: false },
          { label: "Mail Today", value: String(stats.mailToday), change: "12 packages", accent: true },
          { label: "Awaiting Pickup", value: String(stats.awaitingPickup), change: "8 packages", accent: false },
          { label: "Revenue (Mar)", value: "$12,840", change: "+14% vs Feb", accent: false },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-2xl p-5"
            style={{
              background: s.accent ? "linear-gradient(135deg, #3374B5, #1a3f7a)" : "white",
              boxShadow: s.accent ? "0 4px 20px rgba(51,116,181,0.3)" : "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)",
            }}
          >
            <p className="text-3xl font-black" style={{ color: s.accent ? "white" : "#1A1714" }}>{s.value}</p>
            <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: s.accent ? "rgba(255,255,255,0.5)" : "rgba(26,23,20,0.35)" }}>
              {s.label}
            </p>
            <p className="text-[10px] mt-2 font-semibold" style={{ color: s.accent ? "rgba(255,255,255,0.4)" : "#3374B5" }}>
              {s.change}
            </p>
          </div>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { icon: "📬", label: "Log Incoming Mail", action: () => setTab("mail") },
          { icon: "📦", label: "Log Package", action: () => setTab("mail") },
          { icon: "👤", label: "New Customer", action: () => setTab("customers") },
          { icon: "📸", label: "Scan Mail", action: () => setTab("mail") },
          { icon: "🚚", label: "New Delivery", action: () => setTab("deliveries") },
          { icon: "🛒", label: "Shop Order", action: () => setTab("shop") },
        ].map((a) => (
          <button
            key={a.label}
            onClick={a.action}
            className="flex items-center gap-3 p-4 rounded-2xl bg-white text-left transition-all duration-200 hover:-translate-y-1"
            style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)", border: "1px solid rgba(232,229,224,0.6)" }}
          >
            <span className="text-xl">{a.icon}</span>
            <span className="text-xs font-bold text-text-light">{a.label}</span>
          </button>
        ))}
      </div>

      {/* Recent mail + Notary side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Recent mail */}
        <div className="lg:col-span-3 rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
          <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
            <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Recent Mail</h3>
            <button onClick={() => setTab("mail")} className="text-xs font-bold text-accent hover:underline">View All</button>
          </div>
          {recentMail.slice(0, 5).map((m, i) => (
            <div
              key={m.id}
              className="flex items-center justify-between px-5 py-3.5 hover:bg-bg-light/15 transition-colors"
              style={{ borderBottom: i < 4 ? "1px solid rgba(232,229,224,0.35)" : "none" }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                  style={{ background: m.type === "Package" ? "linear-gradient(135deg, #3374B5, #1e4d8c)" : "linear-gradient(135deg, #EBF2FA, #D4E4F4)" }}
                >
                  {m.type === "Package" ? "📦" : "✉️"}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-text-light truncate">{m.from} → #{m.suiteNumber} ({m.customerName.split(" ")[0]})</p>
                  <p className="text-[10px] text-text-light/35">{m.date}</p>
                </div>
              </div>
              <StatusBadge status={m.status} />
            </div>
          ))}
        </div>

        {/* Notary today */}
        <div className="lg:col-span-2 rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Notary Queue</h3>
            <button onClick={() => setTab("notary")} className="text-xs font-bold text-accent hover:underline">View All</button>
          </div>
          <div className="space-y-3">
            {notaryQueue.map((n) => (
              <div key={n.id} className="p-3.5 rounded-xl" style={{ background: "rgba(232,229,224,0.3)", border: "1px solid rgba(232,229,224,0.5)" }}>
                <div className="flex items-center justify-between mb-1.5">
                  <p className="text-xs font-bold text-text-light">{n.customerName}</p>
                  <StatusBadge status={n.status} />
                </div>
                <p className="text-[10px] text-text-light/40">{n.date} at {n.time} — {n.type}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Plan distribution */}
      <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
        <h3 className="font-black text-sm uppercase tracking-wide text-text-light mb-4">Plan Distribution</h3>
        <div className="flex gap-3">
          {[
            { name: "Basic", count: stats.planDistribution.basic, pct: basicPct, color: "#EBF2FA" },
            { name: "Business", count: stats.planDistribution.business, pct: businessPct, color: "#3374B5" },
            { name: "Premium", count: stats.planDistribution.premium, pct: premiumPct, color: "#1A1714" },
          ].map((p) => (
            <div key={p.name} className="flex-1">
              <div className="flex items-end gap-2 mb-2">
                <span className="text-2xl font-black text-text-light">{p.count}</span>
                <span className="text-xs font-bold text-text-light/35 mb-1">{p.pct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-bg-light/50 overflow-hidden">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.pct}%`, background: p.color }} />
              </div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-text-light/40 mt-1.5">{p.name}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
