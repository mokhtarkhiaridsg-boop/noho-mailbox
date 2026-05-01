"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminCreatePartner,
  adminUpdatePartner,
  adminDeletePartner,
  adminLogCommission,
  adminUpdateCommissionStatus,
  adminDeleteCommission,
} from "@/app/actions/admin-partners";

export type PartnerCommissionRow = {
  id: string;
  prospectName: string;
  prospectEmail: string | null;
  prospectPhone: string | null;
  product: string;
  invoiceCents: number;
  commissionCents: number;
  status: string;
  notes: string | null;
  createdAt: string;
  closedAt: string | null;
  paidAt: string | null;
};

export type PartnerRow = {
  id: string;
  businessName: string;
  contactName: string;
  email: string;
  phone: string | null;
  category: string;
  code: string;
  commissionRate: number;
  status: string;
  notes: string | null;
  createdAt: string;
  commissions: PartnerCommissionRow[];
};

type Props = {
  partners: PartnerRow[];
};

const CATEGORIES = [
  "CPA / Bookkeeper",
  "Immigration Attorney",
  "Business / Corporate Attorney",
  "Web Designer / Developer",
  "Brand Designer / Agency",
  "Insurance Agent",
  "Real Estate Agent / Broker",
  "Coach / Consultant",
  "Other",
];

const STATUS_COLORS: Record<string, string> = {
  pending: "bg-[#fbbf24]/15 text-[#92400e]",
  active: "bg-[#16a34a]/15 text-[#15803d]",
  paused: "bg-[#162d3a]/10 text-[#162d3a]/60",
  terminated: "bg-red-100 text-red-700",
};

const COMMISSION_STATUS_COLORS: Record<string, string> = {
  lead: "bg-[#fbbf24]/15 text-[#92400e]",
  quoted: "bg-[#337485]/15 text-[#337485]",
  closed: "bg-[#16a34a]/15 text-[#15803d]",
  cancelled: "bg-[#162d3a]/10 text-[#162d3a]/60",
  paid: "bg-[#7c3aed]/15 text-[#5b21b6]",
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";
const NOHO_RED = "#E70013";
const NOHO_CREAM = "#F7E6C2";
const NOHO_GREEN = "#16A34A";

function dollars(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function dollarsRound(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function huesFor(seed: string): { from: string; to: string } {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const PAIRS: Array<[string, string]> = [
    [NOHO_BLUE, NOHO_BLUE_DEEP],
    [NOHO_INK, "#1F0807"],
    ["#7C3AED", "#5B21B6"],
    ["#B07030", "#8B5A24"],
    [NOHO_GREEN, "#166534"],
    [NOHO_RED, "#991b1b"],
  ];
  const [from, to] = PAIRS[h % PAIRS.length];
  return { from, to };
}

const CATEGORY_EMOJI: Record<string, string> = {
  "CPA / Bookkeeper": "📊",
  "Immigration Attorney": "⚖️",
  "Business / Corporate Attorney": "💼",
  "Web Designer / Developer": "💻",
  "Brand Designer / Agency": "🎨",
  "Insurance Agent": "🛡️",
  "Real Estate Agent / Broker": "🏠",
  "Coach / Consultant": "💡",
  Other: "✨",
};

export function AdminPartnersPanel({ partners }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showAdd, setShowAdd] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showLogFor, setShowLogFor] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string } | null>(null);

  function notify(id: string, msg: string) {
    setFeedback({ id, msg });
    setTimeout(() => setFeedback(null), 4000);
  }

  async function handleAdd(formData: FormData) {
    const data = {
      businessName: formData.get("businessName") as string,
      contactName: formData.get("contactName") as string,
      email: formData.get("email") as string,
      phone: (formData.get("phone") as string) || undefined,
      category: formData.get("category") as string,
      commissionRate: parseFloat((formData.get("commissionRate") as string) || "0.15"),
      notes: (formData.get("notes") as string) || undefined,
    };
    startTransition(async () => {
      const res = await adminCreatePartner(data);
      if ("error" in res && res.error) {
        notify("__add", res.error);
        return;
      }
      setShowAdd(false);
      notify("__add", `Partner created with code ${res.code}`);
      router.refresh();
    });
  }

  async function handleStatusChange(p: PartnerRow, status: string) {
    startTransition(async () => {
      await adminUpdatePartner(p.id, { status });
      notify(p.id, `Status updated to ${status}`);
      router.refresh();
    });
  }

  async function handleDelete(p: PartnerRow) {
    if (!confirm(`Delete partner ${p.businessName}? This deletes all their commission history.`))
      return;
    startTransition(async () => {
      await adminDeletePartner(p.id);
      notify(p.id, "Deleted");
      router.refresh();
    });
  }

  async function handleLogCommission(partnerId: string, formData: FormData) {
    const data = {
      partnerId,
      prospectName: formData.get("prospectName") as string,
      prospectEmail: (formData.get("prospectEmail") as string) || undefined,
      prospectPhone: (formData.get("prospectPhone") as string) || undefined,
      product: formData.get("product") as string,
      invoiceCents: Math.round(parseFloat(formData.get("invoiceDollars") as string) * 100),
      status: (formData.get("status") as string) || "lead",
      notes: (formData.get("notes") as string) || undefined,
    };
    startTransition(async () => {
      const res = await adminLogCommission(data);
      if ("error" in res && res.error) {
        notify(partnerId, res.error);
        return;
      }
      setShowLogFor(null);
      notify(partnerId, `Commission logged: ${dollars(res.commissionCents ?? 0)}`);
      router.refresh();
    });
  }

  async function handleCommissionStatus(
    p: PartnerRow,
    cId: string,
    status: "lead" | "quoted" | "closed" | "cancelled" | "paid"
  ) {
    startTransition(async () => {
      await adminUpdateCommissionStatus(cId, status);
      notify(p.id, `Commission marked ${status}`);
      router.refresh();
    });
  }

  async function handleCommissionDelete(p: PartnerRow, cId: string) {
    if (!confirm("Delete this commission record?")) return;
    startTransition(async () => {
      await adminDeleteCommission(cId);
      notify(p.id, "Commission deleted");
      router.refresh();
    });
  }

  // ─── Aggregate stats ──
  const stats = partners.reduce(
    (acc, p) => {
      acc.total += 1;
      if (p.status === "active") acc.active += 1;
      for (const c of p.commissions) {
        acc.commissionCount += 1;
        if (c.status === "closed" || c.status === "paid") {
          acc.closedRevenue += c.invoiceCents;
          acc.commissionsOwed += c.status === "closed" ? c.commissionCents : 0;
          acc.commissionsPaid += c.status === "paid" ? c.commissionCents : 0;
        }
      }
      return acc;
    },
    {
      total: 0,
      active: 0,
      commissionCount: 0,
      closedRevenue: 0,
      commissionsOwed: 0,
      commissionsPaid: 0,
    }
  );

  return (
    <div className="space-y-5">
      {/* Hero strip */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, #7C3AED 0%, ${NOHO_BLUE_DEEP} 50%, ${NOHO_INK} 100%)`,
          boxShadow: "0 8px 28px rgba(124,58,237,0.25)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 30%, white 1.2px, transparent 1.2px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
            backgroundSize: "36px 36px, 24px 24px",
          }}
        />
        {/* Handshake/network corner mark */}
        <div className="absolute right-6 top-6 opacity-15 pointer-events-none">
          <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke={NOHO_CREAM} strokeWidth="1.2">
            <circle cx="6" cy="7" r="2.5" />
            <circle cx="18" cy="7" r="2.5" />
            <circle cx="12" cy="17" r="2.5" />
            <line x1="7.7" y1="9" x2="11" y2="15" />
            <line x1="16.3" y1="9" x2="13" y2="15" />
            <line x1="8" y1="7" x2="16" y2="7" strokeDasharray="2 2" />
          </svg>
        </div>

        <div className="relative p-6">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: NOHO_AMBER }}
            />
            <span
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: NOHO_CREAM }}
            >
              Partner Program · Referrals
            </span>
          </div>
          <h2
            className="font-black tracking-tight mb-1"
            style={{
              fontFamily: "var(--font-baloo, system-ui)",
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              color: "white",
              textShadow: "0 2px 8px rgba(0,0,0,0.30)",
            }}
          >
            Partner Network
          </h2>
          <p className="text-[12px] font-medium max-w-md" style={{ color: `${NOHO_CREAM}cc` }}>
            CPAs, attorneys, agents, and consultants who refer business to NOHO. Track
            commissions, log referrals, manage payouts.
          </p>

          <div className="mt-4">
            <button
              onClick={() => setShowAdd(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-black transition-all hover:scale-105"
              style={{
                background: NOHO_CREAM,
                color: NOHO_INK,
                boxShadow: `0 4px 14px ${NOHO_CREAM}66`,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Add Partner
            </button>
          </div>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile label="Active" value={`${stats.active}/${stats.total}`} accent={NOHO_GREEN} />
        <KpiTile label="Referrals" value={stats.commissionCount} accent={NOHO_BLUE} />
        <KpiTile label="Closed Revenue" value={dollarsRound(stats.closedRevenue)} accent="#7C3AED" />
        <KpiTile
          label="Owed"
          value={dollarsRound(stats.commissionsOwed)}
          accent={NOHO_AMBER}
          pulse={stats.commissionsOwed > 0}
        />
        <KpiTile label="Paid" value={dollarsRound(stats.commissionsPaid)} accent={NOHO_INK} />
      </div>

      {/* Add form */}
      {showAdd && (
        <form
          action={handleAdd}
          className="rounded-2xl bg-white border border-[#162d3a]/10 p-5 space-y-3"
        >
          <h3 className="font-black text-sm text-[#162d3a]">Add Partner</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <input
              name="businessName"
              required
              placeholder="Business name (e.g. Roland Fink, CPA)"
              className="px-3 py-2 rounded-lg border border-[#162d3a]/15 text-sm"
            />
            <input
              name="contactName"
              required
              placeholder="Contact name"
              className="px-3 py-2 rounded-lg border border-[#162d3a]/15 text-sm"
            />
            <input
              name="email"
              type="email"
              required
              placeholder="Email"
              className="px-3 py-2 rounded-lg border border-[#162d3a]/15 text-sm"
            />
            <input
              name="phone"
              type="tel"
              placeholder="Phone (optional)"
              className="px-3 py-2 rounded-lg border border-[#162d3a]/15 text-sm"
            />
            <select
              name="category"
              required
              defaultValue=""
              className="px-3 py-2 rounded-lg border border-[#162d3a]/15 text-sm"
            >
              <option value="" disabled>Pick category</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <input
              name="commissionRate"
              type="number"
              step="0.01"
              min="0"
              max="1"
              defaultValue="0.15"
              placeholder="Commission rate (e.g. 0.15 for 15%)"
              className="px-3 py-2 rounded-lg border border-[#162d3a]/15 text-sm"
            />
          </div>
          <textarea
            name="notes"
            rows={2}
            placeholder="Notes (optional)"
            className="w-full px-3 py-2 rounded-lg border border-[#162d3a]/15 text-sm resize-none"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 rounded-xl text-xs font-black bg-[#16a34a] text-white hover:bg-[#15803d] disabled:opacity-50"
            >
              ✓ Create
            </button>
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 rounded-xl text-xs font-bold text-[#162d3a]/70 hover:bg-[#162d3a]/5"
            >
              Cancel
            </button>
          </div>
          {feedback?.id === "__add" && (
            <div className="text-xs font-bold text-[#337485] bg-[#337485]/8 px-3 py-2 rounded-lg">
              {feedback.msg}
            </div>
          )}
        </form>
      )}

      {/* Partner list */}
      <div className="rounded-2xl bg-white border border-[#162d3a]/10 overflow-hidden">
        {partners.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-sm font-bold text-[#162d3a]/70">
              No partners yet
            </p>
            <p className="text-xs text-[#162d3a]/50 mt-1">
              Approve incoming partner applications from the Messages panel, or
              add one manually with &quot;+ Add Partner&quot; above.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#162d3a]/8">
            {partners.map((p) => {
              const open = expandedId === p.id;
              const earnedClosed = p.commissions
                .filter((c) => c.status === "closed")
                .reduce((s, c) => s + c.commissionCents, 0);
              const earnedPaid = p.commissions
                .filter((c) => c.status === "paid")
                .reduce((s, c) => s + c.commissionCents, 0);
              const { from, to } = huesFor(p.businessName);
              const catEmoji = CATEGORY_EMOJI[p.category] ?? "✨";
              return (
                <li key={p.id} className="p-5 transition-colors hover:bg-[#F7E6C2]/20">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div
                        className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center text-white font-black text-sm"
                        style={{
                          background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
                          boxShadow: `0 4px 12px ${from}55`,
                        }}
                      >
                        {initials(p.businessName)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-black truncate" style={{ color: NOHO_INK }}>
                            {p.businessName}
                          </p>
                          <span
                            className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md font-mono"
                            style={{
                              background: `${NOHO_BLUE}15`,
                              color: NOHO_BLUE_DEEP,
                            }}
                          >
                            {p.code}
                          </span>
                          <span
                            className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${STATUS_COLORS[p.status] ?? "bg-[#162d3a]/10 text-[#162d3a]/60"}`}
                          >
                            {p.status}
                          </span>
                          <span
                            className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                            style={{
                              background: `${NOHO_INK}08`,
                              color: NOHO_INK,
                            }}
                          >
                            <span className="text-[12px] leading-none">{catEmoji}</span>
                            {p.category}
                          </span>
                        </div>
                        <p className="text-xs mt-1" style={{ color: `${NOHO_INK}88` }}>
                          <strong style={{ color: NOHO_INK }}>{p.contactName}</strong>
                          {" · "}
                          <a href={`mailto:${p.email}`} className="hover:underline">{p.email}</a>
                          {p.phone && (
                            <>
                              {" · "}
                              <a href={`tel:${p.phone}`} className="hover:underline">{p.phone}</a>
                            </>
                          )}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                          <span
                            className="text-[10px] font-bold px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                            style={{
                              background: `${NOHO_AMBER}15`,
                              color: "#92400e",
                            }}
                          >
                            {(p.commissionRate * 100).toFixed(0)}% rate
                          </span>
                          <span className="text-[10px] font-bold" style={{ color: `${NOHO_INK}66` }}>
                            {p.commissions.length} referrals · {dollars(earnedClosed)} owed · {dollars(earnedPaid)} paid
                          </span>
                        </div>
                        {p.notes && (
                          <p
                            className="text-xs mt-2 whitespace-pre-wrap rounded-lg p-2"
                            style={{
                              color: `${NOHO_INK}aa`,
                              background: `${NOHO_CREAM}55`,
                              borderLeft: `2px solid ${NOHO_AMBER}`,
                            }}
                          >
                            {p.notes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col gap-2 md:w-56 shrink-0">
                      <button
                        onClick={() => setExpandedId(open ? null : p.id)}
                        className="px-3 py-2 rounded-xl text-xs font-black bg-[#162d3a]/5 text-[#162d3a] hover:bg-[#162d3a]/10"
                      >
                        {open ? "Hide" : "View"} commissions ({p.commissions.length})
                      </button>
                      <button
                        onClick={() => setShowLogFor(showLogFor === p.id ? null : p.id)}
                        className="px-3 py-2 rounded-xl text-xs font-black bg-[#16a34a] text-white hover:bg-[#15803d]"
                      >
                        + Log referral
                      </button>
                      <select
                        value={p.status}
                        onChange={(e) => handleStatusChange(p, e.target.value)}
                        disabled={isPending}
                        className="px-2 py-1.5 rounded-lg border border-[#162d3a]/15 text-xs"
                      >
                        <option value="pending">pending</option>
                        <option value="active">active</option>
                        <option value="paused">paused</option>
                        <option value="terminated">terminated</option>
                      </select>
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={isPending}
                        className="px-3 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {feedback?.id === p.id && (
                    <div className="mt-3 text-xs font-bold text-[#337485] bg-[#337485]/8 px-3 py-2 rounded-lg">
                      {feedback.msg}
                    </div>
                  )}

                  {showLogFor === p.id && (
                    <form
                      action={(fd) => handleLogCommission(p.id, fd)}
                      className="mt-4 p-4 rounded-xl bg-[#16a34a]/5 border border-[#16a34a]/20 space-y-3"
                    >
                      <p className="text-xs font-black text-[#162d3a]">Log a referral from {p.businessName}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <input name="prospectName" required placeholder="Prospect name" className="px-3 py-2 rounded-lg border border-[#162d3a]/15 text-sm" />
                        <input name="prospectEmail" type="email" placeholder="Prospect email (optional)" className="px-3 py-2 rounded-lg border border-[#162d3a]/15 text-sm" />
                        <input name="prospectPhone" type="tel" placeholder="Prospect phone (optional)" className="px-3 py-2 rounded-lg border border-[#162d3a]/15 text-sm" />
                        <select name="product" required defaultValue="" className="px-3 py-2 rounded-lg border border-[#162d3a]/15 text-sm">
                          <option value="" disabled>Product</option>
                          <option value="Bundle">Business Launch Bundle ($2,000)</option>
                          <option value="Retainer">Brand Retainer ($1,200/mo)</option>
                          <option value="Mailbox">Mailbox plan</option>
                          <option value="Delivery">Same-day delivery</option>
                          <option value="Other">Other</option>
                        </select>
                        <input name="invoiceDollars" required type="number" step="0.01" min="0" placeholder="Invoice $ (e.g. 2000)" className="px-3 py-2 rounded-lg border border-[#162d3a]/15 text-sm" />
                        <select name="status" defaultValue="lead" className="px-3 py-2 rounded-lg border border-[#162d3a]/15 text-sm">
                          <option value="lead">Lead (just referred)</option>
                          <option value="quoted">Quoted</option>
                          <option value="closed">Closed (commission earned)</option>
                          <option value="paid">Paid (commission paid)</option>
                          <option value="cancelled">Cancelled</option>
                        </select>
                      </div>
                      <textarea name="notes" rows={2} placeholder="Notes" className="w-full px-3 py-2 rounded-lg border border-[#162d3a]/15 text-sm resize-none" />
                      <div className="flex gap-2">
                        <button type="submit" disabled={isPending} className="px-4 py-2 rounded-xl text-xs font-black bg-[#16a34a] text-white hover:bg-[#15803d] disabled:opacity-50">
                          ✓ Log referral
                        </button>
                        <button type="button" onClick={() => setShowLogFor(null)} className="px-4 py-2 rounded-xl text-xs font-bold text-[#162d3a]/70 hover:bg-[#162d3a]/5">
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}

                  {open && p.commissions.length > 0 && (
                    <div className="mt-4 rounded-xl bg-[#162d3a]/3 p-3 space-y-2">
                      {p.commissions.map((c) => (
                        <div key={c.id} className="flex items-start justify-between gap-3 p-3 bg-white rounded-lg border border-[#162d3a]/8">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-[#162d3a]">{c.prospectName}</span>
                              <span className="text-[10px] font-bold text-[#162d3a]/55">{c.product}</span>
                              <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${COMMISSION_STATUS_COLORS[c.status] ?? "bg-[#162d3a]/10 text-[#162d3a]/60"}`}>
                                {c.status}
                              </span>
                            </div>
                            <p className="text-[11px] text-[#162d3a]/65 mt-0.5">
                              Invoice {dollars(c.invoiceCents)} → Commission <strong>{dollars(c.commissionCents)}</strong>
                              {c.prospectEmail && ` · ${c.prospectEmail}`}
                            </p>
                            {c.notes && <p className="text-[11px] text-[#162d3a]/70 mt-1 whitespace-pre-wrap">{c.notes}</p>}
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <select
                              value={c.status}
                              onChange={(e) => handleCommissionStatus(p, c.id, e.target.value as "lead" | "quoted" | "closed" | "cancelled" | "paid")}
                              disabled={isPending}
                              className="px-2 py-1 rounded-md border border-[#162d3a]/15 text-[11px]"
                            >
                              <option value="lead">lead</option>
                              <option value="quoted">quoted</option>
                              <option value="closed">closed</option>
                              <option value="paid">paid</option>
                              <option value="cancelled">cancelled</option>
                            </select>
                            <button
                              onClick={() => handleCommissionDelete(p, c.id)}
                              disabled={isPending}
                              className="px-2 py-1 rounded-md text-[11px] font-bold text-red-600 hover:bg-red-50"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

function KpiTile({
  label,
  value,
  accent,
  pulse,
}: {
  label: string;
  value: number | string;
  accent: string;
  pulse?: boolean;
}) {
  return (
    <div
      className="relative overflow-hidden rounded-xl p-3 bg-white"
      style={{
        border: `1px solid ${accent}22`,
        boxShadow:
          "0 1px 2px rgba(45,16,15,0.04), 0 4px 12px rgba(45,16,15,0.04)",
      }}
    >
      <div
        className="absolute left-0 right-0 top-0 h-0.5"
        style={{
          background: `linear-gradient(90deg, ${accent} 0%, ${accent}55 100%)`,
        }}
      />
      <div className="flex items-center justify-between mb-1">
        <span
          className="text-[9px] font-black uppercase tracking-[0.15em]"
          style={{ color: `${NOHO_INK}88` }}
        >
          {label}
        </span>
        {pulse && (
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ background: accent, boxShadow: `0 0 6px ${accent}` }}
          />
        )}
      </div>
      <div
        className="font-black tabular-nums leading-none"
        style={{
          fontFamily: "var(--font-baloo, system-ui)",
          fontSize: "1.3rem",
          color: accent,
        }}
      >
        {value}
      </div>
    </div>
  );
}
