"use client";

import { useState } from "react";
import { StatusBadge } from "./StatusBadge";
import type { Customer } from "./types";

type Props = {
  customers: Customer[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setShowAddCustomerModal: (show: boolean) => void;
  openCustomer: (c: Customer) => void;
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";

// Plan-tier visual identity. Premium = ink-on-cream luxury feel; Business =
// brand teal; Basic = soft cream. Each gets its own gradient for the avatar
// monogram so admin recognizes tiers at a glance.
const PLAN_THEME: Record<
  string,
  { dot: string; pill: { bg: string; text: string }; avatarGrad: string }
> = {
  Premium: {
    dot: NOHO_INK,
    pill: { bg: "rgba(45,16,15,0.08)", text: NOHO_INK },
    avatarGrad: `linear-gradient(135deg, ${NOHO_INK} 0%, #1F0807 100%)`,
  },
  Business: {
    dot: NOHO_BLUE,
    pill: { bg: "rgba(51,116,133,0.12)", text: NOHO_BLUE_DEEP },
    avatarGrad: `linear-gradient(135deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)`,
  },
  Basic: {
    dot: "#A89484",
    pill: { bg: "rgba(232,229,224,0.7)", text: "#5C4540" },
    avatarGrad: "linear-gradient(135deg, #B07030 0%, #8B5A24 100%)",
  },
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function dueChip(planDueDate: string | null | undefined) {
  if (!planDueDate) return null;
  const [y, m, d] = planDueDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const due = new Date(Date.UTC(y, m - 1, d));
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = Math.ceil((+due - +today) / 86400000);
  if (days < 0) return { label: "OVERDUE", bg: "rgba(231,0,19,0.12)", color: "#b91c1c" };
  if (days <= 14)
    return {
      label: `DUE ${days}d`,
      bg: "rgba(245,158,11,0.18)",
      color: "#92400e",
    };
  return null;
}

export function AdminCustomersPanel({
  customers,
  searchQuery,
  setSearchQuery,
  setShowAddCustomerModal,
  openCustomer,
}: Props) {
  const [view, setView] = useState<"cards" | "table">("cards");

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.suiteNumber.includes(searchQuery),
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Customers</h2>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.5)" }}>
            {filteredCustomers.length} of {customers.length}
            {searchQuery && ` matching "${searchQuery}"`}
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* View toggle */}
          <div
            className="inline-flex rounded-xl p-0.5"
            style={{ background: "rgba(232,229,224,0.5)", border: "1px solid rgba(232,229,224,0.7)" }}
          >
            {(["cards", "table"] as const).map((v) => {
              const active = view === v;
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-[0.16em] transition-all"
                  style={{
                    background: active ? "white" : "transparent",
                    color: active ? NOHO_INK : "rgba(45,16,15,0.55)",
                    boxShadow: active ? "0 1px 2px rgba(45,16,15,0.08)" : undefined,
                  }}
                  aria-pressed={active}
                  aria-label={`View as ${v}`}
                >
                  {v === "cards" ? (
                    <span className="inline-flex items-center gap-1">
                      <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <rect x="1" y="1" width="4.5" height="4.5" rx="0.6" />
                        <rect x="6.5" y="1" width="4.5" height="4.5" rx="0.6" />
                        <rect x="1" y="6.5" width="4.5" height="4.5" rx="0.6" />
                        <rect x="6.5" y="6.5" width="4.5" height="4.5" rx="0.6" />
                      </svg>
                      Cards
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1">
                      <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5">
                        <line x1="1" y1="3" x2="11" y2="3" />
                        <line x1="1" y1="6" x2="11" y2="6" />
                        <line x1="1" y1="9" x2="11" y2="9" />
                      </svg>
                      Table
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          <input
            type="text"
            placeholder="Search name, email, suite..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#337485] bg-white"
            style={{ borderColor: "rgba(232,229,224,0.7)" }}
          />
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-black text-white"
            style={{
              background: "linear-gradient(135deg, #337485, #23596A)",
              boxShadow: "0 2px 10px rgba(51,116,133,0.3)",
            }}
          >
            + Add Customer
          </button>
        </div>
      </div>

      {filteredCustomers.length === 0 && (
        <div
          className="rounded-2xl p-10 text-center"
          style={{
            background: "white",
            border: "1px solid rgba(232,229,224,0.7)",
            boxShadow: "0 1px 3px rgba(26,23,20,0.04)",
          }}
        >
          <p className="text-sm font-bold" style={{ color: "rgba(45,16,15,0.6)" }}>
            No customers found{searchQuery ? ` for "${searchQuery}"` : ""}.
          </p>
        </div>
      )}

      {/* ─── CARD VIEW ─────────────────────────────────────────────── */}
      {view === "cards" && filteredCustomers.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filteredCustomers.map((c) => {
            const theme = PLAN_THEME[c.plan ?? "Basic"] ?? PLAN_THEME.Basic;
            const due = dueChip(c.planDueDate);
            const noDeposit = (c.securityDepositCents ?? 0) === 0;
            const kycPending = c.kycStatus && c.kycStatus !== "Approved";
            return (
              <button
                key={c.id}
                onClick={() => openCustomer(c)}
                className="group relative text-left rounded-2xl p-4 transition-all duration-200 hover:-translate-y-0.5 overflow-hidden"
                style={{
                  background: "white",
                  border: "1px solid rgba(232,229,224,0.7)",
                  boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)",
                }}
                aria-label={`Open ${c.name}'s record`}
              >
                {/* Gradient ring on hover — subtle teal frame */}
                <div
                  aria-hidden="true"
                  className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none"
                  style={{
                    boxShadow: `0 0 0 1px ${NOHO_BLUE}55, 0 12px 32px rgba(51,116,133,0.18)`,
                  }}
                />

                <div className="relative flex items-start gap-3">
                  {/* Avatar monogram with plan-tier gradient */}
                  <div
                    className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center font-black text-sm tracking-tight"
                    style={{
                      background: theme.avatarGrad,
                      color: NOHO_CREAM,
                      boxShadow: `0 4px 14px ${theme.dot}45, inset 0 1px 0 rgba(255,255,255,0.18)`,
                      fontFamily: "var(--font-baloo), sans-serif",
                    }}
                  >
                    {initials(c.name)}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Top row: name + suite badge */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-black text-sm truncate" style={{ color: NOHO_INK }}>
                          {c.name}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: "rgba(45,16,15,0.45)" }}>
                          {c.email}
                        </p>
                      </div>
                      <span
                        className="shrink-0 text-[10px] font-black px-2 py-0.5 rounded-md"
                        style={{
                          background: "rgba(45,16,15,0.06)",
                          color: NOHO_INK,
                          fontFamily: "var(--font-baloo), sans-serif",
                          letterSpacing: "0.04em",
                        }}
                      >
                        #{c.suiteNumber || "—"}
                      </span>
                    </div>

                    {/* Business sub-line */}
                    {c.businessName && (
                      <p
                        className="text-[11px] font-bold mt-1 flex items-center gap-1"
                        style={{ color: NOHO_BLUE_DEEP }}
                      >
                        <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
                          <rect x="2" y="3" width="12" height="11" />
                          <rect x="4" y="5" width="2" height="2" />
                          <rect x="7" y="5" width="2" height="2" />
                          <rect x="10" y="5" width="2" height="2" />
                          <rect x="7" y="9" width="2" height="5" />
                        </svg>
                        <span className="truncate">{c.businessName}</span>
                      </p>
                    )}

                    {/* Pill row: plan + status + warnings */}
                    <div className="flex flex-wrap gap-1.5 mt-2.5 items-center">
                      <span
                        className="text-[10px] font-black uppercase tracking-[0.12em] px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                        style={{ background: theme.pill.bg, color: theme.pill.text }}
                      >
                        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full" style={{ background: theme.dot }} />
                        {c.plan ?? "Basic"}
                      </span>
                      <StatusBadge status={c.status} />
                      {due && (
                        <span
                          className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={{ background: due.bg, color: due.color }}
                        >
                          {due.label}
                        </span>
                      )}
                      {noDeposit && (
                        <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-50 text-red-700">
                          DEPOSIT REQ
                        </span>
                      )}
                      {kycPending && (
                        <span
                          className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                          style={{
                            background:
                              c.kycStatus === "Rejected"
                                ? "rgba(231,0,19,0.12)"
                                : "rgba(245,158,11,0.18)",
                            color: c.kycStatus === "Rejected" ? "#b91c1c" : "#92400e",
                          }}
                        >
                          KYC: {c.kycStatus}
                        </span>
                      )}
                      {c.boxType === "Business" && (
                        <span
                          className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                          style={{
                            background: "rgba(51,116,133,0.10)",
                            color: NOHO_BLUE,
                          }}
                        >
                          BIZ
                        </span>
                      )}
                    </div>

                    {/* Bottom stats row: mail/pkg with icons + joined date */}
                    <div
                      className="flex items-center justify-between gap-2 mt-3 pt-2.5"
                      style={{ borderTop: "1px dashed rgba(232,229,224,0.8)" }}
                    >
                      <div className="flex items-center gap-3 text-[11px]" style={{ color: "rgba(45,16,15,0.6)" }}>
                        <span className="inline-flex items-center gap-1 font-bold">
                          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.7">
                            <rect x="2" y="4" width="12" height="9" rx="1" />
                            <path d="M2 5 L8 9 L14 5" />
                          </svg>
                          {c.mailCount}
                        </span>
                        <span className="inline-flex items-center gap-1 font-bold">
                          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round">
                            <path d="M8 2 L14 5 L14 11 L8 14 L2 11 L2 5 Z" />
                            <path d="M2 5 L8 8 L14 5 M8 8 L8 14" />
                          </svg>
                          {c.packageCount}
                        </span>
                      </div>
                      <span className="text-[10px]" style={{ color: "rgba(45,16,15,0.35)" }}>
                        {new Date(c.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── TABLE VIEW (compact fallback) ─────────────────────────── */}
      {view === "table" && filteredCustomers.length > 0 && (
        <div
          className="rounded-2xl overflow-hidden bg-white"
          style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}
        >
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr
                  style={{
                    background: "rgba(232,229,224,0.4)",
                    borderBottom: "1px solid rgba(232,229,224,0.5)",
                  }}
                >
                  <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Customer</th>
                  <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Suite</th>
                  <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Plan</th>
                  <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Status</th>
                  <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Mail</th>
                  <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Joined</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((c, i) => {
                  const theme = PLAN_THEME[c.plan ?? "Basic"] ?? PLAN_THEME.Basic;
                  const due = dueChip(c.planDueDate);
                  return (
                    <tr
                      key={c.id}
                      className="hover:bg-bg-light/10 transition-colors"
                      style={{
                        borderBottom: i < filteredCustomers.length - 1 ? "1px solid rgba(232,229,224,0.3)" : "none",
                      }}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div
                            className="w-7 h-7 shrink-0 rounded-lg flex items-center justify-center font-black text-[10px]"
                            style={{
                              background: theme.avatarGrad,
                              color: NOHO_CREAM,
                              fontFamily: "var(--font-baloo), sans-serif",
                            }}
                          >
                            {initials(c.name)}
                          </div>
                          <div>
                            <p className="font-bold text-text-light flex items-center gap-2">
                              {c.name}
                              {c.boxType === "Business" && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#337485]/10 text-[#337485]">
                                  Biz
                                </span>
                              )}
                            </p>
                            <p className="text-[10px] text-text-light/35">{c.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-bold text-text-light">#{c.suiteNumber}</td>
                      <td className="px-4 py-3.5">
                        <span
                          className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded inline-flex items-center gap-1"
                          style={{ background: theme.pill.bg, color: theme.pill.text }}
                        >
                          <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full" style={{ background: theme.dot }} />
                          {c.plan}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <StatusBadge status={c.status} />
                          {(c.securityDepositCents ?? 0) === 0 && (
                            <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">DEPOSIT REQ</span>
                          )}
                          {due && (
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: due.bg, color: due.color }}
                            >
                              {due.label}
                            </span>
                          )}
                          {c.kycStatus && c.kycStatus !== "Approved" && (
                            <span
                              className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                              style={{
                                background:
                                  c.kycStatus === "Rejected" ? "rgba(231,0,19,0.12)" : "rgba(245,158,11,0.18)",
                                color: c.kycStatus === "Rejected" ? "#b91c1c" : "#92400e",
                              }}
                            >
                              KYC: {c.kycStatus}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-text-light/50">
                        {c.mailCount} mail · {c.packageCount} pkg
                      </td>
                      <td className="px-4 py-3.5 text-xs text-text-light/40">{new Date(c.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center">
                          <button
                            onClick={() => openCustomer(c)}
                            className="text-xs font-bold text-white bg-[#337485] hover:bg-[#23596A] px-2.5 py-1 rounded-lg transition-colors"
                            aria-label={`Open ${c.name}'s record`}
                          >
                            Open
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
