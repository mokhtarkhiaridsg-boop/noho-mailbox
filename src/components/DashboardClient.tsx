"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useState } from "react";
import { logout } from "@/app/actions/auth";
import { updateMailStatus, requestForward } from "@/app/actions/mail";

type MailItem = {
  id: string;
  from: string;
  date: string;
  type: string;
  status: string;
  scanned: boolean;
};

type ForwardingAddress = {
  id: string;
  label: string;
  address: string;
};

type NotaryBooking = {
  id: string;
  date: string;
  time: string;
  type: string;
  status: string;
};

type DashboardProps = {
  user: {
    name: string;
    email: string;
    phone: string | null;
    plan: string | null;
    planTerm: string | null;
    suiteNumber: string | null;
  };
  mailItems: MailItem[];
  addresses: ForwardingAddress[];
  bookings: NotaryBooking[];
  stats: {
    totalMail: number;
    unread: number;
    packages: number;
    forwarded: number;
  };
};

const sideNav = [
  { icon: "📬", label: "Mail", id: "mail" },
  { icon: "📦", label: "Packages", id: "packages" },
  { icon: "✈️", label: "Forwarding", id: "forwarding" },
  { icon: "✍️", label: "Notary", id: "notary" },
  { icon: "⚙️", label: "Settings", id: "settings" },
];

export default function DashboardClient({ user, mailItems, addresses, bookings, stats }: DashboardProps) {
  const [activeTab, setActiveTab] = useState("mail");

  const initials = user.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase();

  const planLabel = user.plan
    ? `${user.plan} Box${user.planTerm ? ` — ${user.planTerm} Months` : ""}`
    : "No Plan";

  const packages = mailItems.filter(
    (m) => m.type === "Package" && (m.status === "Awaiting Pickup" || m.status === "Received")
  );

  return (
    <div className="min-h-screen bg-[#f8f5ef]">
      {/* Top bar */}
      <header
        className="sticky top-0 z-50 px-4 py-3 flex items-center justify-between"
        style={{
          background: "linear-gradient(155deg, #2D1D0F 0%, #1a1108 60%, #0d1e35 100%)",
          borderBottom: "1px solid rgba(247,230,194,0.08)",
        }}
      >
        <Link href="/">
          <Logo className="h-9 w-auto" />
        </Link>
        <div className="flex items-center gap-4">
          <div className="hidden sm:block text-right">
            <p className="text-xs font-bold text-[#F7E6C2]">{user.name}</p>
            <p className="text-[10px] text-[#F7E6C2]/40">{planLabel} &middot; Suite #{user.suiteNumber}</p>
          </div>
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white"
            style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)" }}
          >
            {initials}
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
        {/* Sidebar */}
        <aside className="hidden md:block w-56 shrink-0">
          <nav className="space-y-1">
            {sideNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-200 text-left"
                style={{
                  background: activeTab === item.id ? "white" : "transparent",
                  color: activeTab === item.id ? "#2D1D0F" : "rgba(45,29,15,0.55)",
                  boxShadow: activeTab === item.id ? "0 1px 4px rgba(45,29,15,0.06), 0 4px 12px rgba(45,29,15,0.05)" : "none",
                }}
              >
                <span className="text-lg">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <div
            className="mt-6 rounded-2xl p-5"
            style={{
              background: "linear-gradient(135deg, #3374B5, #1a3f7a)",
              boxShadow: "0 4px 16px rgba(51,116,181,0.3)",
            }}
          >
            <p className="text-xs font-black text-white/70 uppercase tracking-widest mb-1">Your Address</p>
            <p className="text-sm font-bold text-white leading-snug">
              NOHO Mailbox<br />
              Suite #{user.suiteNumber}<br />
              North Hollywood, CA
            </p>
          </div>
        </aside>

        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Mobile tabs */}
          <div className="md:hidden flex gap-1 overflow-x-auto pb-4 -mx-1 px-1">
            {sideNav.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="shrink-0 flex items-center gap-2 px-4 py-2.5 rounded-full text-xs font-bold transition-all"
                style={{
                  background: activeTab === item.id ? "#3374B5" : "white",
                  color: activeTab === item.id ? "white" : "rgba(45,29,15,0.6)",
                  boxShadow: "0 1px 4px rgba(45,29,15,0.06)",
                }}
              >
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total Mail", value: String(stats.totalMail), accent: false },
              { label: "Unread", value: String(stats.unread), accent: true },
              { label: "Packages", value: String(stats.packages), accent: false },
              { label: "Forwarded", value: String(stats.forwarded), accent: false },
            ].map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl p-4 text-center"
                style={{
                  background: stat.accent ? "linear-gradient(135deg, #3374B5, #1a3f7a)" : "white",
                  color: stat.accent ? "white" : "#2D1D0F",
                  boxShadow: stat.accent
                    ? "0 4px 16px rgba(51,116,181,0.3)"
                    : "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)",
                }}
              >
                <p className="text-2xl font-black">{stat.value}</p>
                <p
                  className="text-[10px] font-bold uppercase tracking-widest mt-1"
                  style={{ color: stat.accent ? "rgba(255,255,255,0.6)" : "rgba(45,29,15,0.4)" }}
                >
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          {/* Mail tab */}
          {activeTab === "mail" && (
            <div
              className="rounded-2xl overflow-hidden"
              style={{
                background: "white",
                boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)",
              }}
            >
              <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(247,230,194,0.6)" }}>
                <h2 className="font-black text-sm uppercase tracking-wide text-[#2D1D0F]">Incoming Mail</h2>
              </div>
              <div>
                {mailItems.length === 0 ? (
                  <div className="p-8 text-center text-sm text-[#2D1D0F]/40">No mail items yet.</div>
                ) : (
                  mailItems.map((item, i) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between px-5 py-4 hover:bg-[#F7E6C2]/20 transition-colors"
                      style={{ borderBottom: i < mailItems.length - 1 ? "1px solid rgba(247,230,194,0.4)" : "none" }}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                          style={{
                            background: item.type === "Package"
                              ? "linear-gradient(135deg, #3374B5, #1e4d8c)"
                              : "linear-gradient(135deg, #F7E6C2, #eacf8a)",
                          }}
                        >
                          {item.type === "Package" ? "📦" : "✉️"}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-[#2D1D0F]">{item.from}</p>
                          <p className="text-xs text-[#2D1D0F]/40">{item.date} &middot; {item.type}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full"
                          style={{
                            background:
                              item.status === "Awaiting Pickup" || item.status === "Ready for Pickup"
                                ? "rgba(51,116,181,0.15)"
                                : item.status === "Forwarded"
                                ? "rgba(45,29,15,0.06)"
                                : "rgba(247,230,194,0.6)",
                            color:
                              item.status === "Awaiting Pickup" || item.status === "Ready for Pickup"
                                ? "#3374B5"
                                : item.status === "Forwarded"
                                ? "rgba(45,29,15,0.45)"
                                : "#2D1D0F",
                          }}
                        >
                          {item.status}
                        </span>
                        <div className="flex gap-1">
                          {item.scanned && (
                            <button className="w-8 h-8 rounded-lg flex items-center justify-center text-xs hover:bg-[#F7E6C2]/40 transition-colors" title="View Scan">
                              👁️
                            </button>
                          )}
                          <button
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-xs hover:bg-[#F7E6C2]/40 transition-colors"
                            title="Forward"
                            onClick={() => requestForward(item.id)}
                          >
                            ✈️
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Packages tab */}
          {activeTab === "packages" && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "white", boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}
            >
              <div className="text-5xl mb-4">📦</div>
              <h3 className="font-black text-lg uppercase text-[#2D1D0F] mb-2">
                {packages.length} Package{packages.length !== 1 ? "s" : ""} Waiting
              </h3>
              {packages.length > 0 ? (
                <>
                  <p className="text-sm text-[#2D1D0F]/50 mb-6">
                    From {packages[0].from} &middot; Arrived {packages[0].date}
                  </p>
                  <button
                    onClick={() => updateMailStatus(packages[0].id, "Picked Up")}
                    className="font-black px-6 py-3 rounded-2xl text-sm text-white"
                    style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 4px 16px rgba(51,116,181,0.3)" }}
                  >
                    Mark as Picked Up
                  </button>
                </>
              ) : (
                <p className="text-sm text-[#2D1D0F]/50">No packages waiting for pickup.</p>
              )}
            </div>
          )}

          {/* Forwarding tab */}
          {activeTab === "forwarding" && (
            <div
              className="rounded-2xl p-6"
              style={{ background: "white", boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}
            >
              <h3 className="font-black text-sm uppercase tracking-wide text-[#2D1D0F] mb-5">Saved Addresses</h3>
              <div className="space-y-3 mb-6">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className="flex items-center justify-between p-4 rounded-2xl"
                    style={{ background: "rgba(247,230,194,0.35)", border: "1px solid rgba(247,230,194,0.6)" }}
                  >
                    <div>
                      <p className="text-sm font-bold text-[#2D1D0F]">{addr.label}</p>
                      <p className="text-xs text-[#2D1D0F]/45">{addr.address}</p>
                    </div>
                    <button className="text-xs font-bold text-[#3374B5] hover:underline">Edit</button>
                  </div>
                ))}
                {addresses.length === 0 && (
                  <p className="text-sm text-[#2D1D0F]/40 text-center py-4">No saved addresses yet.</p>
                )}
              </div>
              <button
                className="w-full font-bold py-3 rounded-2xl text-sm text-[#3374B5] transition-colors hover:bg-[#F7E6C2]/30"
                style={{ border: "1px dashed rgba(51,116,181,0.3)" }}
              >
                + Add New Address
              </button>
            </div>
          )}

          {/* Notary tab */}
          {activeTab === "notary" && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "white", boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}
            >
              <div className="text-5xl mb-4">✍️</div>
              <h3 className="font-black text-lg uppercase text-[#2D1D0F] mb-2">Book a Notary</h3>
              <p className="text-sm text-[#2D1D0F]/50 mb-6 max-w-xs mx-auto">
                Schedule a certified in-store notary appointment. Premium members get a discount.
              </p>
              {bookings.length > 0 && (
                <div className="mb-6 space-y-2">
                  {bookings.map((b) => (
                    <div key={b.id} className="text-left p-4 rounded-2xl" style={{ background: "rgba(247,230,194,0.35)" }}>
                      <p className="text-sm font-bold text-[#2D1D0F]">{b.type}</p>
                      <p className="text-xs text-[#2D1D0F]/50">{b.date} at {b.time} — {b.status}</p>
                    </div>
                  ))}
                </div>
              )}
              <Link
                href="/contact"
                className="inline-block font-black px-6 py-3 rounded-2xl text-sm text-white"
                style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 4px 16px rgba(51,116,181,0.3)" }}
              >
                Book Appointment
              </Link>
            </div>
          )}

          {/* Settings tab */}
          {activeTab === "settings" && (
            <div
              className="rounded-2xl p-6"
              style={{ background: "white", boxShadow: "0 1px 3px rgba(45,29,15,0.04), 0 4px 12px rgba(45,29,15,0.05)" }}
            >
              <h3 className="font-black text-sm uppercase tracking-wide text-[#2D1D0F] mb-5">Account Settings</h3>
              <div className="space-y-4">
                {[
                  { label: "Name", value: user.name },
                  { label: "Email", value: user.email },
                  { label: "Phone", value: user.phone || "Not set" },
                  { label: "Plan", value: planLabel },
                ].map((field) => (
                  <div
                    key={field.label}
                    className="flex items-center justify-between p-4 rounded-2xl"
                    style={{ background: "rgba(247,230,194,0.25)", border: "1px solid rgba(247,230,194,0.5)" }}
                  >
                    <div>
                      <p className="text-xs text-[#2D1D0F]/40 font-bold uppercase tracking-wider">{field.label}</p>
                      <p className="text-sm font-semibold text-[#2D1D0F]">{field.value}</p>
                    </div>
                    <button className="text-xs font-bold text-[#3374B5] hover:underline">Edit</button>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4" style={{ borderTop: "1px solid rgba(247,230,194,0.4)" }}>
                <button onClick={() => logout()} className="text-xs font-bold text-red-500 hover:underline">
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
