"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useState } from "react";

type Customer = {
  id: string;
  name: string;
  email: string;
  plan: string;
  suiteNumber: string;
  status: string;
  createdAt: string;
  mailCount: number;
  packageCount: number;
};

type MailItem = {
  id: string;
  customerName: string;
  suiteNumber: string;
  from: string;
  type: string;
  date: string;
  status: string;
};

type NotaryItem = {
  id: string;
  customerName: string;
  date: string;
  time: string;
  type: string;
  status: string;
};

type DeliveryOrder = {
  id: string;
  customerName: string;
  suiteNumber: string;
  destination: string;
  zone: string;
  price: number;
  itemType: string;
  courier: string;
  status: string;
  date: string;
};

type ShopOrder = {
  id: string;
  customerName: string;
  items: string;
  total: number;
  status: string;
  date: string;
};

type Stats = {
  activeCustomers: number;
  mailToday: number;
  awaitingPickup: number;
  planDistribution: {
    basic: number;
    business: number;
    premium: number;
  };
};

type Props = {
  customers: Customer[];
  recentMail: MailItem[];
  notaryQueue: NotaryItem[];
  deliveryOrders: DeliveryOrder[];
  shopOrders: ShopOrder[];
  stats: Stats;
};

const sideNav = [
  { icon: "📊", label: "Overview", id: "overview" },
  { icon: "👥", label: "Customers", id: "customers" },
  { icon: "📬", label: "Mail & Packages", id: "mail" },
  { icon: "🚚", label: "Deliveries", id: "deliveries" },
  { icon: "🛒", label: "Shop Orders", id: "shop" },
  { icon: "✍️", label: "Notary", id: "notary" },
  { icon: "💰", label: "Revenue", id: "revenue" },
  { icon: "🏢", label: "Business Solutions", id: "business" },
  { icon: "⚙️", label: "Settings", id: "settings" },
];

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { bg: string; color: string }> = {
    Active: { bg: "rgba(34,139,34,0.12)", color: "#1a8a1a" },
    Expired: { bg: "rgba(200,50,50,0.1)", color: "#c03030" },
    Scanned: { bg: "rgba(247,230,194,0.6)", color: "#2D1D0F" },
    "Awaiting Pickup": { bg: "rgba(51,116,181,0.15)", color: "#3374B5" },
    Forwarded: { bg: "rgba(45,29,15,0.06)", color: "rgba(45,29,15,0.5)" },
    "Picked Up": { bg: "rgba(34,139,34,0.1)", color: "#1a8a1a" },
    Held: { bg: "rgba(200,150,0,0.12)", color: "#a07800" },
    Confirmed: { bg: "rgba(34,139,34,0.1)", color: "#1a8a1a" },
    Pending: { bg: "rgba(200,150,0,0.12)", color: "#a07800" },
    "In Transit": { bg: "rgba(51,116,181,0.15)", color: "#3374B5" },
    Delivered: { bg: "rgba(34,139,34,0.1)", color: "#1a8a1a" },
    Ready: { bg: "rgba(200,150,0,0.12)", color: "#a07800" },
    Completed: { bg: "rgba(34,139,34,0.1)", color: "#1a8a1a" },
  };
  const c = colors[status] || { bg: "rgba(45,29,15,0.06)", color: "rgba(45,29,15,0.5)" };
  return (
    <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full" style={{ background: c.bg, color: c.color }}>
      {status}
    </span>
  );
}

export default function AdminDashboardClient({ customers, recentMail, notaryQueue, deliveryOrders, shopOrders, stats }: Props) {
  const [tab, setTab] = useState("overview");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.suiteNumber.includes(searchQuery)
  );

  const totalPlan = stats.planDistribution.basic + stats.planDistribution.business + stats.planDistribution.premium;
  const basicPct = totalPlan > 0 ? Math.round((stats.planDistribution.basic / totalPlan) * 100) : 0;
  const businessPct = totalPlan > 0 ? Math.round((stats.planDistribution.business / totalPlan) * 100) : 0;
  const premiumPct = totalPlan > 0 ? Math.round((stats.planDistribution.premium / totalPlan) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#f4f1eb]">
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
        style={{
          background: "linear-gradient(155deg, #2D1D0F 0%, #1a1108 60%, #0d1e35 100%)",
          borderBottom: "1px solid rgba(247,230,194,0.08)",
        }}
      >
        <div className="flex items-center gap-4">
          <Link href="/">
            <Logo className="h-9 w-auto" />
          </Link>
          <div className="hidden sm:flex items-center gap-1.5 ml-3 px-3 py-1 rounded-full" style={{ background: "rgba(51,116,181,0.25)" }}>
            <span className="w-2 h-2 rounded-full bg-[#3374B5]" />
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Admin</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="text-xs font-bold text-[#F7E6C2]/50 hover:text-[#F7E6C2]/80 transition-colors">
            Member View →
          </Link>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-[#2D1D0F]"
            style={{ background: "linear-gradient(135deg, #F7E6C2, #e8c97a)" }}
          >
            NM
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="hidden lg:block w-56 shrink-0">
          <nav className="space-y-1">
            {sideNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 text-left"
                style={{
                  background: tab === item.id ? "white" : "transparent",
                  color: tab === item.id ? "#2D1D0F" : "rgba(45,29,15,0.55)",
                  boxShadow: tab === item.id ? "0 1px 4px rgba(45,29,15,0.06), 0 4px 12px rgba(45,29,15,0.05)" : "none",
                }}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <div className="flex-1 min-w-0">
          {/* Mobile tabs */}
          <div className="lg:hidden flex gap-1 overflow-x-auto pb-4 -mx-1 px-1">
            {sideNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setTab(item.id)}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: tab === item.id ? "#2D1D0F" : "white",
                  color: tab === item.id ? "#F7E6C2" : "rgba(45,29,15,0.6)",
                  boxShadow: "0 1px 4px rgba(45,29,15,0.06)",
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* ─── Overview ─── */}
          {tab === "overview" && (
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
                      boxShadow: s.accent ? "0 4px 20px rgba(51,116,181,0.3)" : "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)",
                    }}
                  >
                    <p className="text-3xl font-black" style={{ color: s.accent ? "white" : "#2D1D0F" }}>{s.value}</p>
                    <p className="text-xs font-bold uppercase tracking-wider mt-1" style={{ color: s.accent ? "rgba(255,255,255,0.5)" : "rgba(45,29,15,0.35)" }}>
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
                    style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)", border: "1px solid rgba(247,230,194,0.6)" }}
                  >
                    <span className="text-xl">{a.icon}</span>
                    <span className="text-xs font-bold text-[#2D1D0F]">{a.label}</span>
                  </button>
                ))}
              </div>

              {/* Recent mail + Notary side by side */}
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                {/* Recent mail */}
                <div className="lg:col-span-3 rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}>
                  <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(247,230,194,0.5)" }}>
                    <h3 className="font-black text-sm uppercase tracking-wide text-[#2D1D0F]">Recent Mail</h3>
                    <button onClick={() => setTab("mail")} className="text-xs font-bold text-[#3374B5] hover:underline">View All</button>
                  </div>
                  {recentMail.slice(0, 5).map((m, i) => (
                    <div
                      key={m.id}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-[#F7E6C2]/15 transition-colors"
                      style={{ borderBottom: i < 4 ? "1px solid rgba(247,230,194,0.35)" : "none" }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-lg flex items-center justify-center text-sm shrink-0"
                          style={{ background: m.type === "Package" ? "linear-gradient(135deg, #3374B5, #1e4d8c)" : "linear-gradient(135deg, #F7E6C2, #eacf8a)" }}
                        >
                          {m.type === "Package" ? "📦" : "✉️"}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-[#2D1D0F] truncate">{m.from} → #{m.suiteNumber} ({m.customerName.split(" ")[0]})</p>
                          <p className="text-[10px] text-[#2D1D0F]/35">{m.date}</p>
                        </div>
                      </div>
                      <StatusBadge status={m.status} />
                    </div>
                  ))}
                </div>

                {/* Notary today */}
                <div className="lg:col-span-2 rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-black text-sm uppercase tracking-wide text-[#2D1D0F]">Notary Queue</h3>
                    <button onClick={() => setTab("notary")} className="text-xs font-bold text-[#3374B5] hover:underline">View All</button>
                  </div>
                  <div className="space-y-3">
                    {notaryQueue.map((n) => (
                      <div key={n.id} className="p-3.5 rounded-xl" style={{ background: "rgba(247,230,194,0.3)", border: "1px solid rgba(247,230,194,0.5)" }}>
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-bold text-[#2D1D0F]">{n.customerName}</p>
                          <StatusBadge status={n.status} />
                        </div>
                        <p className="text-[10px] text-[#2D1D0F]/40">{n.date} at {n.time} — {n.type}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Plan distribution */}
              <div className="rounded-2xl bg-white p-5" style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}>
                <h3 className="font-black text-sm uppercase tracking-wide text-[#2D1D0F] mb-4">Plan Distribution</h3>
                <div className="flex gap-3">
                  {[
                    { name: "Basic", count: stats.planDistribution.basic, pct: basicPct, color: "#F7E6C2" },
                    { name: "Business", count: stats.planDistribution.business, pct: businessPct, color: "#3374B5" },
                    { name: "Premium", count: stats.planDistribution.premium, pct: premiumPct, color: "#2D1D0F" },
                  ].map((p) => (
                    <div key={p.name} className="flex-1">
                      <div className="flex items-end gap-2 mb-2">
                        <span className="text-2xl font-black text-[#2D1D0F]">{p.count}</span>
                        <span className="text-xs font-bold text-[#2D1D0F]/35 mb-1">{p.pct}%</span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-[#F7E6C2]/50 overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${p.pct}%`, background: p.color }} />
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40 mt-1.5">{p.name}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Customers ─── */}
          {tab === "customers" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <h2 className="font-black text-lg uppercase tracking-wide text-[#2D1D0F]">Customers</h2>
                <div className="flex gap-3">
                  <input
                    type="text"
                    placeholder="Search name, email, suite..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#3374B5] bg-white"
                    style={{ borderColor: "rgba(247,230,194,0.7)" }}
                  />
                  <button
                    className="px-4 py-2.5 rounded-xl text-sm font-black text-white"
                    style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
                  >
                    + Add Customer
                  </button>
                </div>
              </div>

              <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "rgba(247,230,194,0.4)", borderBottom: "1px solid rgba(247,230,194,0.5)" }}>
                        <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-widest text-[#2D1D0F]/50">Customer</th>
                        <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-[#2D1D0F]/50">Suite</th>
                        <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-[#2D1D0F]/50">Plan</th>
                        <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-[#2D1D0F]/50">Status</th>
                        <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-[#2D1D0F]/50">Mail</th>
                        <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-[#2D1D0F]/50">Joined</th>
                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredCustomers.map((c, i) => (
                        <tr key={c.id} className="hover:bg-[#F7E6C2]/10 transition-colors" style={{ borderBottom: i < filteredCustomers.length - 1 ? "1px solid rgba(247,230,194,0.3)" : "none" }}>
                          <td className="px-5 py-3.5">
                            <p className="font-bold text-[#2D1D0F]">{c.name}</p>
                            <p className="text-[10px] text-[#2D1D0F]/35">{c.email}</p>
                          </td>
                          <td className="px-4 py-3.5 font-bold text-[#2D1D0F]">#{c.suiteNumber}</td>
                          <td className="px-4 py-3.5">
                            <span
                              className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                              style={{
                                background: c.plan === "Premium" ? "rgba(45,29,15,0.08)" : c.plan === "Business" ? "rgba(51,116,181,0.1)" : "rgba(247,230,194,0.5)",
                                color: c.plan === "Premium" ? "#2D1D0F" : c.plan === "Business" ? "#3374B5" : "#2D1D0F",
                              }}
                            >
                              {c.plan}
                            </span>
                          </td>
                          <td className="px-4 py-3.5"><StatusBadge status={c.status} /></td>
                          <td className="px-4 py-3.5 text-xs text-[#2D1D0F]/50">{c.mailCount} mail · {c.packageCount} pkg</td>
                          <td className="px-4 py-3.5 text-xs text-[#2D1D0F]/40">{new Date(c.createdAt).toLocaleDateString()}</td>
                          <td className="px-4 py-3.5">
                            <button className="text-xs font-bold text-[#3374B5] hover:underline">View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Mail & Packages ─── */}
          {tab === "mail" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <h2 className="font-black text-lg uppercase tracking-wide text-[#2D1D0F]">Mail & Packages</h2>
                <div className="flex gap-2">
                  <button
                    className="px-4 py-2.5 rounded-xl text-sm font-black text-white"
                    style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
                  >
                    + Log Mail
                  </button>
                  <button
                    className="px-4 py-2.5 rounded-xl text-sm font-bold text-[#2D1D0F] bg-white"
                    style={{ border: "1px solid rgba(247,230,194,0.7)" }}
                  >
                    + Log Package
                  </button>
                </div>
              </div>

              {/* Filter chips */}
              <div className="flex gap-2 flex-wrap">
                {["All", "Awaiting Pickup", "Scanned", "Forwarded", "Held"].map((f, i) => (
                  <button
                    key={f}
                    className="px-3.5 py-2 rounded-full text-xs font-bold transition-all"
                    style={{
                      background: i === 0 ? "#2D1D0F" : "white",
                      color: i === 0 ? "#F7E6C2" : "rgba(45,29,15,0.6)",
                      boxShadow: "0 1px 3px rgba(45,29,15,0.04)",
                    }}
                  >
                    {f}
                  </button>
                ))}
              </div>

              <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}>
                {recentMail.map((m, i) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between px-5 py-4 hover:bg-[#F7E6C2]/15 transition-colors"
                    style={{ borderBottom: i < recentMail.length - 1 ? "1px solid rgba(247,230,194,0.35)" : "none" }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                        style={{ background: m.type === "Package" ? "linear-gradient(135deg, #3374B5, #1e4d8c)" : "linear-gradient(135deg, #F7E6C2, #eacf8a)" }}
                      >
                        {m.type === "Package" ? "📦" : "✉️"}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[#2D1D0F]">{m.from}</p>
                        <p className="text-xs text-[#2D1D0F]/40">To: {m.customerName} (Suite #{m.suiteNumber}) · {m.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StatusBadge status={m.status} />
                      <div className="flex gap-1">
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-xs hover:bg-[#F7E6C2]/40 transition-colors" title="Scan">📸</button>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-xs hover:bg-[#F7E6C2]/40 transition-colors" title="Forward">✈️</button>
                        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-xs hover:bg-[#F7E6C2]/40 transition-colors" title="Mark Picked Up">✅</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Deliveries ─── */}
          {tab === "deliveries" && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "TODAY'S DELIVERIES", value: "3", sub: "1 pending" },
                  { label: "IN TRANSIT", value: "1", sub: "DoorDash" },
                  { label: "COMPLETED (WEEK)", value: "8", sub: "+3 vs last week" },
                  { label: "DELIVERY REVENUE (MAR)", value: "$487", sub: "+22% vs Feb" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl p-5" style={{ boxShadow: "0 2px 8px rgba(45,29,15,0.06)" }}>
                    <p className="text-2xl font-black text-[#2D1D0F]">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40 mt-1">{s.label}</p>
                    <p className="text-xs text-[#3374B5] mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(45,29,15,0.06)" }}>
                <div className="px-5 py-4 border-b border-[#F7E6C2]">
                  <h3 className="font-black text-sm uppercase text-[#2D1D0F]">Delivery Orders</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#FAFAF7] text-left">
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40">Customer</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40">Destination</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40">Zone</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40">Price</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40">Courier</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40">Status</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {deliveryOrders.map((d) => (
                        <tr key={d.id} className="border-t border-[#F7E6C2]/50 hover:bg-[#FAFAF7] transition-colors">
                          <td className="px-5 py-3">
                            <span className="font-bold text-[#2D1D0F]">{d.customerName}</span>
                            <span className="text-[#2D1D0F]/40 ml-1">#{d.suiteNumber}</span>
                          </td>
                          <td className="px-5 py-3 text-[#2D1D0F]/70 text-xs">{d.destination}</td>
                          <td className="px-5 py-3">
                            <span className={`text-xs font-bold ${d.zone === "NoHo" ? "text-[#3374B5]" : "text-[#2D1D0F]/60"}`}>{d.zone}</span>
                          </td>
                          <td className="px-5 py-3 font-bold text-[#2D1D0F]">${d.price.toFixed(2)}</td>
                          <td className="px-5 py-3 text-xs text-[#2D1D0F]/60">{d.courier}</td>
                          <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                          <td className="px-5 py-3 text-xs text-[#2D1D0F]/40">{d.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Shop Orders ─── */}
          {tab === "shop" && (
            <div className="space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: "TODAY'S ORDERS", value: "2", sub: "1 pending" },
                  { label: "PENDING PICKUP", value: "1", sub: "David Kim" },
                  { label: "COMPLETED (WEEK)", value: "5", sub: "+1 vs last week" },
                  { label: "SHOP REVENUE (MAR)", value: "$342", sub: "+18% vs Feb" },
                ].map((s) => (
                  <div key={s.label} className="bg-white rounded-xl p-5" style={{ boxShadow: "0 2px 8px rgba(45,29,15,0.06)" }}>
                    <p className="text-2xl font-black text-[#2D1D0F]">{s.value}</p>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40 mt-1">{s.label}</p>
                    <p className="text-xs text-[#3374B5] mt-1">{s.sub}</p>
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(45,29,15,0.06)" }}>
                <div className="px-5 py-4 border-b border-[#F7E6C2]">
                  <h3 className="font-black text-sm uppercase text-[#2D1D0F]">Shop Orders</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-[#FAFAF7] text-left">
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40">Customer</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40">Items</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40">Total</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40">Status</th>
                        <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/40">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shopOrders.map((o) => (
                        <tr key={o.id} className="border-t border-[#F7E6C2]/50 hover:bg-[#FAFAF7] transition-colors">
                          <td className="px-5 py-3 font-bold text-[#2D1D0F]">{o.customerName}</td>
                          <td className="px-5 py-3 text-[#2D1D0F]/70 text-xs">{o.items}</td>
                          <td className="px-5 py-3 font-bold text-[#2D1D0F]">${o.total.toFixed(2)}</td>
                          <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                          <td className="px-5 py-3 text-xs text-[#2D1D0F]/40">{o.date}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Notary ─── */}
          {tab === "notary" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-lg uppercase tracking-wide text-[#2D1D0F]">Notary Appointments</h2>
                <button
                  className="px-4 py-2.5 rounded-xl text-sm font-black text-white"
                  style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
                >
                  + New Appointment
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {notaryQueue.map((n) => (
                  <div
                    key={n.id}
                    className="rounded-2xl p-6 bg-white"
                    style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)", border: "1px solid rgba(247,230,194,0.5)" }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p className="font-black text-[#2D1D0F]">{n.customerName}</p>
                      <StatusBadge status={n.status} />
                    </div>
                    <div className="space-y-1.5 text-sm text-[#2D1D0F]/55">
                      <p>📅 {n.date} at {n.time}</p>
                      <p>📋 {n.type}</p>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl text-white" style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)" }}>
                        Complete
                      </button>
                      <button className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl text-[#2D1D0F]" style={{ border: "1px solid rgba(247,230,194,0.7)" }}>
                        Reschedule
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Revenue ─── */}
          {tab === "revenue" && (
            <div className="space-y-6">
              <h2 className="font-black text-lg uppercase tracking-wide text-[#2D1D0F]">Revenue</h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "This Month", value: "$12,840", sub: "+14% vs last month" },
                  { label: "YTD Total", value: "$34,620", sub: "Jan — Mar 2026" },
                  { label: "Avg Per Customer", value: "$90", sub: "Per month" },
                ].map((r) => (
                  <div key={r.label} className="rounded-2xl p-6 bg-white" style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#2D1D0F]/35 mb-2">{r.label}</p>
                    <p className="text-3xl font-black text-[#2D1D0F]">{r.value}</p>
                    <p className="text-xs text-[#3374B5] font-semibold mt-1">{r.sub}</p>
                  </div>
                ))}
              </div>

              {/* Monthly breakdown */}
              <div className="rounded-2xl p-6 bg-white" style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}>
                <h3 className="font-black text-sm uppercase tracking-wide text-[#2D1D0F] mb-5">Monthly Breakdown</h3>
                <div className="space-y-3">
                  {[
                    { month: "March", subscriptions: "$9,240", notary: "$1,200", packages: "$2,400", total: "$12,840" },
                    { month: "February", subscriptions: "$8,150", notary: "$980", packages: "$2,100", total: "$11,230" },
                    { month: "January", subscriptions: "$7,800", notary: "$850", packages: "$1,900", total: "$10,550" },
                  ].map((m, i) => (
                    <div
                      key={m.month}
                      className="flex items-center justify-between py-3 px-4 rounded-xl"
                      style={{ background: i === 0 ? "rgba(247,230,194,0.4)" : "rgba(247,230,194,0.15)" }}
                    >
                      <span className="text-sm font-bold text-[#2D1D0F]">{m.month}</span>
                      <div className="flex gap-6 text-xs">
                        <span className="text-[#2D1D0F]/40">Subs: {m.subscriptions}</span>
                        <span className="text-[#2D1D0F]/40">Notary: {m.notary}</span>
                        <span className="text-[#2D1D0F]/40">Pkg: {m.packages}</span>
                        <span className="font-black text-[#2D1D0F]">{m.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ─── Business Solutions ─── */}
          {tab === "business" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-lg uppercase tracking-wide text-[#2D1D0F]">Business Solutions</h2>
                <button
                  className="px-4 py-2.5 rounded-xl text-sm font-black text-white"
                  style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)" }}
                >
                  + New Client
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: "Active Projects", value: "3", color: "#3374B5" },
                  { label: "Completed", value: "12", color: "#2D1D0F" },
                  { label: "Total Revenue", value: "$30,000", color: "#3374B5" },
                ].map((s) => (
                  <div key={s.label} className="rounded-2xl p-6 bg-white" style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}>
                    <p className="text-3xl font-black" style={{ color: s.color }}>{s.value}</p>
                    <p className="text-xs font-bold uppercase tracking-wider text-[#2D1D0F]/35 mt-1">{s.label}</p>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}>
                <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(247,230,194,0.5)" }}>
                  <h3 className="font-black text-sm uppercase tracking-wide text-[#2D1D0F]">Active Projects</h3>
                </div>
                {[
                  { name: "Alex Chen — Startup.io", stage: "Website Build", progress: 70 },
                  { name: "David Kim — Kim Law", stage: "LLC Filing", progress: 30 },
                  { name: "Lisa Wang — Wang Design", stage: "Brand Book", progress: 85 },
                ].map((p, i) => (
                  <div key={p.name} className="px-5 py-4" style={{ borderBottom: i < 2 ? "1px solid rgba(247,230,194,0.35)" : "none" }}>
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-bold text-[#2D1D0F]">{p.name}</p>
                      <span className="text-xs font-bold text-[#3374B5]">{p.progress}%</span>
                    </div>
                    <p className="text-xs text-[#2D1D0F]/40 mb-2">{p.stage}</p>
                    <div className="w-full h-1.5 rounded-full bg-[#F7E6C2]/50 overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${p.progress}%`, background: "linear-gradient(90deg, #3374B5, #2055A0)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ─── Settings ─── */}
          {tab === "settings" && (
            <div className="space-y-6">
              <h2 className="font-black text-lg uppercase tracking-wide text-[#2D1D0F]">Settings</h2>

              <div className="rounded-2xl p-6 bg-white space-y-5" style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}>
                <h3 className="font-black text-sm uppercase tracking-wide text-[#2D1D0F]">Store Information</h3>
                {[
                  { label: "Store Name", value: "NOHO Mailbox" },
                  { label: "Address", value: "North Hollywood, CA" },
                  { label: "Phone", value: "(818) 555-0100" },
                  { label: "Email", value: "hello@nohomailbox.com" },
                  { label: "Hours", value: "Mon-Fri 9am-6pm, Sat 10am-4pm" },
                ].map((f) => (
                  <div key={f.label} className="flex items-center justify-between p-4 rounded-xl" style={{ background: "rgba(247,230,194,0.25)", border: "1px solid rgba(247,230,194,0.5)" }}>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-wider text-[#2D1D0F]/35">{f.label}</p>
                      <p className="text-sm font-semibold text-[#2D1D0F]">{f.value}</p>
                    </div>
                    <button className="text-xs font-bold text-[#3374B5] hover:underline">Edit</button>
                  </div>
                ))}
              </div>

              <div className="rounded-2xl p-6 bg-white space-y-4" style={{ boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}>
                <h3 className="font-black text-sm uppercase tracking-wide text-[#2D1D0F]">Notifications</h3>
                {[
                  { label: "Email alerts for new mail", on: true },
                  { label: "SMS alerts for packages", on: true },
                  { label: "Daily summary email", on: false },
                  { label: "Notary appointment reminders", on: true },
                ].map((n) => (
                  <div key={n.label} className="flex items-center justify-between py-2">
                    <span className="text-sm text-[#2D1D0F]/70">{n.label}</span>
                    <div
                      className="w-10 h-6 rounded-full relative cursor-pointer transition-colors"
                      style={{ background: n.on ? "#3374B5" : "rgba(45,29,15,0.12)" }}
                    >
                      <div
                        className="w-4 h-4 rounded-full bg-white absolute top-1 transition-all"
                        style={{ left: n.on ? "22px" : "4px", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
