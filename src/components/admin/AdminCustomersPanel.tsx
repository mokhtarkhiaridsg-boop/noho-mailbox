"use client";

/**
 * Admin Customers — Iter 4 rebuild.
 *
 * Adds a hero stats bar (animated counters), smart filter chips with live
 * counts, branded card visual upgrade (avatar circles, gradient by status,
 * hover lift), and a sticky-header table with subtle row gradients.
 *
 * Same data, same callbacks. Pure shell-level redesign.
 */

import { useEffect, useMemo, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import type { Customer } from "./types";
import { AiHeart } from "@/components/AnimatedIcons";

type Props = {
  customers: Customer[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setShowAddCustomerModal: (show: boolean) => void;
  openCustomer: (c: Customer) => void;
};

// iPad-OS tokens — keep names stable (file uses 50+ refs to T.*) but
// re-point hex values from cream/brown to white/gray + iOS-blue.
const T = {
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  cream: "#EBF2FF",
  blue: "#1976FF",
  blueDeep: "#0F5BD9",
  red: "#FF3B30",
  amber: "#F59E0B",
  success: "#22C55E",
  danger: "#EF4444",
  warning: "#F59E0B",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace";
const TAB_NUM: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: "'tnum' 1",
  fontFamily: MONO,
};

// rAF count-up tween — same helper as Overview/Mailbox Center.
function useAnimatedCount(target: number, duration = 800): number {
  const [value, setValue] = useState(0);
  useEffect(() => {
    if (typeof window === "undefined") {
      setValue(target);
      return;
    }
    const reduced =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setValue(target);
      return;
    }
    const start = performance.now();
    const from = value;
    const delta = target - from;
    if (delta === 0) return;
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = Math.round(from + delta * eased);
      setValue(next);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration]);
  return value;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Avatar — flat neutral surface with hairline border. Was a 6-tone rainbow
// gradient palette which read as "circus" against the formal hairline
// chrome. The customer's identity comes from their initials, not from a
// random color the system assigned them on first render.
function avatarHue(_name: string): string {
  void _name;
  return T.surfaceAlt;
}

type DueState = { label: string; tone: "danger" | "warning" } | null;
function computeDue(planDueDate: string | null | undefined): DueState {
  if (!planDueDate) return null;
  const [y, m, d] = planDueDate.split("-").map(Number);
  if (!y || !m || !d) return null;
  const due = new Date(Date.UTC(y, m - 1, d));
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const days = Math.ceil((+due - +today) / 86400000);
  if (days < 0) return { label: "Overdue", tone: "danger" };
  if (days <= 14) return { label: `Due ${days}d`, tone: "warning" };
  return null;
}

type SortKey = "name" | "suite" | "plan" | "due";
type SortDir = "asc" | "desc";
type Segment = "all" | "active" | "atrisk" | "kyc" | "business" | "personal";

export function AdminCustomersPanel({
  customers,
  searchQuery,
  setSearchQuery,
  setShowAddCustomerModal,
  openCustomer,
}: Props) {
  const [view, setView] = useState<"cards" | "table">("cards");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [segment, setSegment] = useState<Segment>("all");

  // ─── Segment predicates ──────────────────────────────────────────
  const isAtRisk = (c: Customer) => {
    if (c.status === "Suspended") return true;
    const due = computeDue(c.planDueDate);
    return due !== null;
  };
  const isKycPending = (c: Customer) => Boolean(c.kycStatus && c.kycStatus !== "Approved");
  const isBusiness = (c: Customer) => c.boxType === "Business" || Boolean(c.businessName);
  const isPersonal = (c: Customer) => !isBusiness(c);

  // ─── Hero counters ──────────────────────────────────────────────
  const counts = useMemo(() => {
    let active = 0,
      atrisk = 0,
      kyc = 0,
      business = 0;
    for (const c of customers) {
      if (c.status === "Active") active++;
      if (isAtRisk(c)) atrisk++;
      if (isKycPending(c)) kyc++;
      if (isBusiness(c)) business++;
    }
    return { total: customers.length, active, atrisk, kyc, business };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers]);

  // ─── Filter + sort ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const list = customers.filter((c) => {
      // Segment first
      if (segment === "active" && c.status !== "Active") return false;
      if (segment === "atrisk" && !isAtRisk(c)) return false;
      if (segment === "kyc" && !isKycPending(c)) return false;
      if (segment === "business" && !isBusiness(c)) return false;
      if (segment === "personal" && !isPersonal(c)) return false;
      // Search
      if (!q) return true;
      const phoneDigits = (c.phone ?? "").replace(/\D/g, "");
      const qDigits = q.replace(/\D/g, "");
      return (
        c.name.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q) ||
        (c.suiteNumber ?? "").includes(q) ||
        (c.businessName ?? "").toLowerCase().includes(q) ||
        (qDigits.length >= 3 && phoneDigits.includes(qDigits))
      );
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      switch (sortKey) {
        case "name":
          return a.name.localeCompare(b.name) * dir;
        case "suite": {
          const an = parseInt(a.suiteNumber ?? "0", 10) || 0;
          const bn = parseInt(b.suiteNumber ?? "0", 10) || 0;
          return (an - bn) * dir;
        }
        case "plan":
          return ((a.plan ?? "").localeCompare(b.plan ?? "")) * dir;
        case "due":
          return ((a.planDueDate ?? "").localeCompare(b.planDueDate ?? "")) * dir;
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customers, searchQuery, sortKey, sortDir, segment]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(k);
      setSortDir("asc");
    }
  }

  // ─── Filter chip definitions (with live counts) ────────────────
  const segments: Array<{ id: Segment; label: string; count: number; tone: string }> = [
    { id: "all",      label: "All",         count: counts.total,    tone: T.ink },
    { id: "active",   label: "Active",      count: counts.active,   tone: T.success },
    { id: "atrisk",   label: "At-risk",     count: counts.atrisk,   tone: T.red },
    { id: "kyc",      label: "KYC pending", count: counts.kyc,      tone: T.amber },
    { id: "business", label: "Business",    count: counts.business, tone: T.blue },
  ];

  return (
    <div className="flex flex-col h-full gap-3">
      {/* ─── Branded title row — Baloo for the heading + Pacifico script
          accent. Same calm Apple layout, NOHO presence. */}
      <div className="shrink-0 flex items-baseline gap-3 flex-wrap">
        <h2
          className="text-2xl font-bold"
          style={{
            color: T.ink,
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
          }}
        >
          Customers
        </h2>
        <span
          className="text-[15px] hidden sm:inline"
          style={{
            color: T.blue,
            fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
            transform: "translateY(-1px)",
            display: "inline-block",
          }}
        >
          your neighborhood
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: T.inkFaint }}>
          · {counts.total} members · {counts.active} active
        </span>
      </div>

      {/* ─── Hero metric strip ─── 5-up animated counters that double as
          shortcuts to common segments. */}
      <div className="shrink-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        <HeroTile label="Total" value={counts.total} tone="ink" onClick={() => setSegment("all")} active={segment === "all"} />
        <HeroTile label="Active" value={counts.active} tone="success" onClick={() => setSegment("active")} active={segment === "active"} />
        <HeroTile label="At-risk" value={counts.atrisk} tone="red" onClick={() => setSegment("atrisk")} active={segment === "atrisk"} pulse={counts.atrisk > 0} />
        <HeroTile label="KYC pending" value={counts.kyc} tone="amber" onClick={() => setSegment("kyc")} active={segment === "kyc"} pulse={counts.kyc > 0} />
        <HeroTile label="Business" value={counts.business} tone="blue" onClick={() => setSegment("business")} active={segment === "business"} />
      </div>

      {/* ─── Toolbar — search · filter chips · view toggle · add ─── */}
      <div
        className="shrink-0 rounded-xl"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
      >
        {/* Top row: search + chips + add */}
        <div
          className="flex items-center gap-3 px-4 h-12"
          style={{ borderBottom: `1px solid ${T.border}` }}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0" fill="none" stroke={T.inkFaint} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="7" cy="7" r="5" />
              <path d="M11 11 L14 14" />
            </svg>
            <input
              type="text"
              placeholder="Search name, email, suite, phone…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-sm focus:outline-none"
              style={{ color: T.ink }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="text-[11px] font-bold transition-colors"
                style={{ color: T.inkFaint }}
                onMouseEnter={(e) => { e.currentTarget.style.color = T.ink; }}
                onMouseLeave={(e) => { e.currentTarget.style.color = T.inkFaint; }}
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
            <span className="text-[11px] shrink-0 font-bold" style={{ color: T.inkFaint, ...TAB_NUM }}>
              {filtered.length}/{customers.length}
            </span>
          </div>

          <div
            className="hidden sm:inline-flex p-0.5 rounded-md shrink-0"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}
          >
            {(["cards", "table"] as const).map((v) => {
              const active = view === v;
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-2.5 h-7 rounded text-[10px] font-bold uppercase tracking-[0.10em] transition-colors"
                  style={{
                    background: active ? T.surface : "transparent",
                    color: active ? T.ink : T.inkSoft,
                    boxShadow: active ? "0 1px 0 rgba(45,16,15,0.06)" : "none",
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>

          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="shrink-0 inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-bold uppercase tracking-[0.06em] transition-colors"
            style={{
              background: T.ink,
              color: "#FFFFFF",
              border: `1px solid ${T.ink}`,
            }}
          >
            <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <path d="M8 3 V13 M3 8 H13" />
            </svg>
            Add customer
          </button>
        </div>

        {/* Bottom row: segment chips */}
        <div className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto">
          {segments.map((seg) => {
            const active = segment === seg.id;
            return (
              <button
                key={seg.id}
                onClick={() => setSegment(seg.id)}
                className="shrink-0 inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md text-[11px] font-bold uppercase tracking-[0.08em] transition-colors"
                style={{
                  background: active ? seg.tone : T.surface,
                  color: active ? "#fff" : T.inkSoft,
                  border: `1px solid ${active ? seg.tone : T.border}`,
                }}
              >
                {seg.label}
                <span
                  className="text-[10px] font-black px-1.5 h-4 rounded inline-flex items-center"
                  style={{
                    background: active ? "rgba(255,255,255,0.20)" : T.surfaceAlt,
                    color: active ? "#fff" : T.inkFaint,
                    ...TAB_NUM,
                  }}
                >
                  {seg.count}
                </span>
              </button>
            );
          })}
          <span className="flex-1" />
          {segment !== "all" && (
            <button
              onClick={() => setSegment("all")}
              className="shrink-0 text-[10px] font-bold uppercase tracking-[0.08em]"
              style={{ color: T.blue }}
            >
              Clear filter
            </button>
          )}
        </div>
      </div>

      {/* ─── Scrollable list area ─── flex-1 fills remaining viewport
          height; only this region scrolls so the page chrome stays put. */}
      <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 pb-2">
      {/* ─── Empty state ───────────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div
          className="rounded-xl p-10 text-center"
          style={{ background: T.surface, border: `1px solid ${T.border}` }}
        >
          {/* Branded empty state — animated NOHO heart instead of generic
              avatar silhouette. Respects prefers-reduced-motion via
              the .ai-icon class in globals.css. */}
          <AiHeart className="w-16 h-14 mx-auto mb-3" />
          <p className="text-sm font-bold" style={{ color: T.ink }}>
            No customers found
          </p>
          <p className="text-[12px] mt-1" style={{ color: T.inkFaint }}>
            {searchQuery
              ? `Nothing matches "${searchQuery}"${segment !== "all" ? ` in ${segment}` : ""}.`
              : segment !== "all"
              ? `No customers in segment "${segment}".`
              : "Add your first customer with the button above."}
          </p>
        </div>
      )}

      {/* ─── Cards view ───────────────────────────────────────────── */}
      {view === "cards" && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((c) => {
            const due = computeDue(c.planDueDate);
            const noDeposit = (c.securityDepositCents ?? 0) === 0;
            const kycPending = isKycPending(c);
            const business = isBusiness(c);
            const status = c.status === "Suspended" ? "danger" : c.status === "Active" ? "ok" : "neutral";
            // Subtle status accent line on the left edge of the card.
            const accentColor =
              status === "danger" ? T.red : status === "ok" ? T.success : T.border;
            return (
              <button
                key={c.id}
                onClick={() => openCustomer(c)}
                className="relative text-left rounded-xl p-4 transition-all hover:-translate-y-0.5 overflow-hidden"
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = T.ink;
                  e.currentTarget.style.boxShadow = "0 8px 24px rgba(45,16,15,0.08), 0 1px 0 rgba(255,255,255,0.6) inset";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = T.border;
                  e.currentTarget.style.boxShadow = "0 1px 0 rgba(255,255,255,0.6) inset";
                }}
                aria-label={`Open ${c.name}`}
              >
                {/* Status accent bar — left edge */}
                <span
                  aria-hidden
                  className="absolute left-0 top-3 bottom-3 w-1 rounded-r-full"
                  style={{ background: accentColor, opacity: status === "neutral" ? 0.4 : 1 }}
                />
                <div className="flex items-start gap-3 pl-2">
                  {/* Avatar circle with gradient */}
                  <div
                    className="w-11 h-11 shrink-0 rounded-full flex items-center justify-center text-[13px] font-bold relative"
                    style={{
                      background: avatarHue(c.name),
                      color: "#FFFFFF",
                      boxShadow: "0 1px 0 rgba(255,255,255,0.18) inset, 0 2px 4px rgba(45,16,15,0.16)",
                    }}
                  >
                    {initials(c.name)}
                    {business && (
                      <span
                        aria-hidden
                        className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: T.cream, color: T.ink, border: `1.5px solid ${T.surface}` }}
                        title="Business box"
                      >
                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                          <path d="M2 4 H10 V10 H2 Z M4 4 V2 H8 V4" />
                        </svg>
                      </span>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[13px] font-bold truncate" style={{ color: T.ink }}>
                          {c.name}
                        </p>
                        <p className="text-[11px] truncate" style={{ color: T.inkFaint }}>
                          {c.businessName ? `${c.businessName} · ` : ""}{c.email}
                        </p>
                      </div>
                      <span
                        className="shrink-0 text-[10px] font-bold px-1.5 h-5 rounded inline-flex items-center"
                        style={{
                          background: T.surfaceAlt,
                          color: T.ink,
                          ...TAB_NUM,
                          letterSpacing: "0.04em",
                        }}
                        title="Suite number"
                      >
                        #{c.suiteNumber || "—"}
                      </span>
                    </div>

                    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                      {c.plan && (
                        <Pill tone="default">
                          {c.plan}
                          {c.planTerm ? ` · ${c.planTerm}mo` : ""}
                        </Pill>
                      )}
                      {due && <Pill tone={due.tone}>{due.label}</Pill>}
                      {noDeposit && <Pill tone="warning">No deposit</Pill>}
                      {kycPending && <Pill tone="warning">KYC {c.kycStatus}</Pill>}
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 text-[11px]">
                      <span style={{ color: T.inkFaint }}>
                        <span style={{ color: T.ink, fontWeight: 700, ...TAB_NUM }}>{c.mailCount ?? 0}</span> mail
                        <span className="mx-1.5" style={{ color: T.inkFaint }}>·</span>
                        <span style={{ color: T.ink, fontWeight: 700, ...TAB_NUM }}>{c.packageCount ?? 0}</span> pkg
                      </span>
                      <StatusBadge status={c.status || "—"} />
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* ─── Table view ───────────────────────────────────────────── */}
      {view === "table" && filtered.length > 0 && (
        <div
          className="rounded-xl overflow-hidden"
          style={{ background: T.surface, border: `1px solid ${T.border}` }}
        >
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead className="sticky top-11 z-10" style={{ background: T.surfaceAlt }}>
              <tr>
                <Th sortKey="name"  current={sortKey} dir={sortDir} onClick={toggleSort}>Name</Th>
                <Th sortKey="suite" current={sortKey} dir={sortDir} onClick={toggleSort} align="center">Suite</Th>
                <Th sortKey="plan"  current={sortKey} dir={sortDir} onClick={toggleSort}>Plan</Th>
                <Th sortKey="due"   current={sortKey} dir={sortDir} onClick={toggleSort}>Renewal</Th>
                <Th align="center">Mail</Th>
                <Th align="right">Status</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, idx) => {
                const due = computeDue(c.planDueDate);
                const accentColor =
                  c.status === "Suspended" ? T.red : c.status === "Active" ? T.success : T.border;
                return (
                  <tr
                    key={c.id}
                    onClick={() => openCustomer(c)}
                    className="cursor-pointer transition-colors"
                    style={{
                      borderTop: `1px solid ${T.border}`,
                      background: idx % 2 === 0 ? T.surface : "rgba(244,238,227,0.35)",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(51,116,133,0.06)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = idx % 2 === 0 ? T.surface : "rgba(244,238,227,0.35)"; }}
                  >
                    <td style={cell()}>
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          aria-hidden
                          className="w-1 h-8 rounded-full shrink-0"
                          style={{ background: accentColor, opacity: c.status === "Active" || c.status === "Suspended" ? 1 : 0.3 }}
                        />
                        <span
                          className="w-8 h-8 rounded-full text-[10px] font-bold flex items-center justify-center shrink-0"
                          style={{
                            background: avatarHue(c.name),
                            color: "#FFFFFF",
                            boxShadow: "0 1px 0 rgba(255,255,255,0.16) inset",
                          }}
                        >
                          {initials(c.name)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-bold truncate" style={{ color: T.ink }}>
                            {c.name}
                          </p>
                          <p className="text-[11px] truncate" style={{ color: T.inkFaint }}>
                            {c.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td style={{ ...cell(), textAlign: "center", ...TAB_NUM }}>
                      #{c.suiteNumber || "—"}
                    </td>
                    <td style={cell()}>
                      <span className="text-[12px] font-bold" style={{ color: T.ink }}>
                        {c.plan ?? "—"}
                      </span>
                      {c.planTerm && (
                        <span className="ml-1.5 text-[11px]" style={{ color: T.inkFaint }}>
                          {c.planTerm}mo
                        </span>
                      )}
                    </td>
                    <td style={cell()}>
                      {due ? (
                        <Pill tone={due.tone}>{due.label}</Pill>
                      ) : c.planDueDate ? (
                        <span className="text-[12px]" style={{ ...TAB_NUM, color: T.inkSoft }}>
                          {c.planDueDate}
                        </span>
                      ) : (
                        <span className="text-[12px]" style={{ color: T.inkFaint }}>—</span>
                      )}
                    </td>
                    <td style={{ ...cell(), textAlign: "center", ...TAB_NUM }}>
                      <span style={{ color: T.ink, fontWeight: 700 }}>{c.mailCount ?? 0}</span>
                      <span className="mx-1" style={{ color: T.inkFaint }}>/</span>
                      <span style={{ color: T.inkSoft }}>{c.packageCount ?? 0}</span>
                    </td>
                    <td style={{ ...cell(), textAlign: "right" }}>
                      <StatusBadge status={c.status || "—"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function HeroTile({
  label,
  value,
  tone,
  onClick,
  active,
  pulse,
}: {
  label: string;
  value: number;
  tone: "ink" | "success" | "red" | "amber" | "blue";
  onClick: () => void;
  active?: boolean;
  pulse?: boolean;
}) {
  const animated = useAnimatedCount(value);
  // Tone now ONLY drives the left bar accent + the pulse dot. The tile
  // body itself stays neutral surface + ink — keeps the metric strip
  // calm and lets the data (the number) be the focal point.
  const barColor = (() => {
    switch (tone) {
      case "success": return T.success;
      case "red":     return T.red;
      case "amber":   return T.amber;
      case "blue":    return T.blue;
      default:        return T.ink;
    }
  })();
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative overflow-hidden rounded-md text-left px-3 py-2.5 transition-colors"
      style={{
        background: T.surface,
        border: `1px solid ${active ? barColor : T.border}`,
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = T.surfaceAlt;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.surface;
      }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{ background: barColor }}
      />
      {pulse && value > 0 && (
        <span
          aria-hidden
          className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
          style={{
            background: barColor,
            animation: "tile-pulse 1.8s ease-in-out infinite",
          }}
        />
      )}
      <p
        className="pl-2 text-[10px] font-bold uppercase tracking-[0.14em]"
        style={{ color: T.inkFaint }}
      >
        {label}
      </p>
      <p
        className="pl-2 text-[24px] font-bold leading-none mt-1"
        style={{ ...TAB_NUM, color: T.ink }}
      >
        {animated.toLocaleString()}
      </p>
      <style>{`
        @keyframes tile-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.35); }
        }
      `}</style>
    </button>
  );
}

function Pill({
  tone = "default",
  children,
}: {
  tone?: "default" | "danger" | "warning" | "success";
  children: React.ReactNode;
}) {
  const styles = (() => {
    switch (tone) {
      case "danger":  return { bg: "rgba(231,0,19,0.10)",  color: T.danger };
      case "warning": return { bg: "rgba(245,166,35,0.14)", color: T.warning };
      case "success": return { bg: "rgba(22,163,74,0.10)",  color: T.success };
      default:        return { bg: T.surfaceAlt,            color: T.ink };
    }
  })();
  return (
    <span
      className="inline-flex items-center px-1.5 h-5 rounded text-[10px] font-bold uppercase tracking-[0.10em]"
      style={{ background: styles.bg, color: styles.color }}
    >
      {children}
    </span>
  );
}

function Th({
  children,
  sortKey: thKey,
  current,
  dir,
  onClick,
  align = "left",
}: {
  children: React.ReactNode;
  sortKey?: SortKey;
  current?: SortKey;
  dir?: SortDir;
  onClick?: (k: SortKey) => void;
  align?: "left" | "center" | "right";
}) {
  const sortable = !!thKey && !!onClick;
  const active = sortable && thKey === current;
  return (
    <th
      style={{
        textAlign: align,
        padding: "10px 16px",
        fontSize: 10,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        color: active ? T.ink : T.inkSoft,
        cursor: sortable ? "pointer" : "default",
        userSelect: "none",
        borderBottom: `1px solid ${T.border}`,
      }}
      onClick={sortable ? () => onClick!(thKey!) : undefined}
    >
      <span className="inline-flex items-center gap-1">
        {children}
        {active && (
          <span style={{ fontSize: 8, color: T.blue }}>{dir === "asc" ? "▲" : "▼"}</span>
        )}
      </span>
    </th>
  );
}

function cell(): React.CSSProperties {
  return {
    padding: "12px 16px",
    fontSize: 13,
    color: T.ink,
    verticalAlign: "middle",
  };
}
