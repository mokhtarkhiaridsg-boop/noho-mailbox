"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  adminUpdateTenantStatus,
  adminUpdateTenantTier,
  adminUpdateTenantNotes,
  adminLogTenantBilling,
  adminDeleteTenant,
} from "@/app/actions/admin-tenants";

export type TenantRow = {
  id: string;
  name: string;
  slug: string;
  ownerName: string;
  ownerEmail: string;
  ownerPhone: string | null;
  legalCity: string | null;
  legalState: string | null;
  status: string;
  trialEndsAt: string | null;
  tier: string;
  pricePerMonthCents: number;
  customerCount: number;
  locationCount: number;
  notes: string | null;
  createdAt: string;
};

type Props = {
  tenants: TenantRow[];
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";
const NOHO_RED = "#E70013";
const NOHO_CREAM = "#F7E6C2";
const NOHO_GREEN = "#16A34A";

const STATUS_META: Record<
  string,
  { label: string; color: string; tint: string; sub: string; emoji: string }
> = {
  trial: {
    label: "Trial",
    color: NOHO_AMBER,
    tint: "rgba(245,166,35,0.10)",
    sub: "Evaluating",
    emoji: "⏳",
  },
  active: {
    label: "Active",
    color: NOHO_GREEN,
    tint: "rgba(22,163,74,0.10)",
    sub: "Paying customer",
    emoji: "✅",
  },
  paused: {
    label: "Paused",
    color: "#7A6050",
    tint: "rgba(122,96,80,0.10)",
    sub: "On hold",
    emoji: "⏸",
  },
  terminated: {
    label: "Terminated",
    color: NOHO_RED,
    tint: "rgba(231,0,19,0.10)",
    sub: "Churned",
    emoji: "❌",
  },
};

const TIER_PRICE: Record<string, number> = {
  Solo: 29900,
  "Multi-Location": 79900,
  Enterprise: 149900,
};

const TIER_META: Record<string, { color: string; emoji: string }> = {
  Solo: { color: NOHO_BLUE, emoji: "🏪" },
  "Multi-Location": { color: "#7C3AED", emoji: "🏢" },
  Enterprise: { color: NOHO_INK, emoji: "🏛️" },
};

function dollars(c: number) {
  return `$${(c / 100).toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function dollarsExact(c: number) {
  return `$${(c / 100).toFixed(2)}`;
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

function daysFromNow(iso: string | null): { text: string; days: number; expired: boolean } {
  if (!iso) return { text: "—", days: 0, expired: false };
  const d = new Date(iso);
  const now = new Date();
  const days = Math.ceil((d.getTime() - now.getTime()) / 86400000);
  if (days < 0) return { text: `Expired ${-days}d ago`, days, expired: true };
  if (days === 0) return { text: "Expires today", days: 0, expired: false };
  return { text: `${days}d left`, days, expired: false };
}

export function AdminTenantsPanel({ tenants }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<string>("all");
  const [feedback, setFeedback] = useState<{ id: string; msg: string; ok: boolean } | null>(
    null,
  );
  const [openId, setOpenId] = useState<string | null>(null);

  function notify(id: string, msg: string, ok = true) {
    setFeedback({ id, msg, ok });
    setTimeout(() => setFeedback(null), 3500);
  }

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: tenants.length };
    tenants.forEach((t) => {
      c[t.status] = (c[t.status] ?? 0) + 1;
    });
    return c;
  }, [tenants]);

  const filtered = useMemo(() => {
    if (filter === "all") return tenants;
    return tenants.filter((t) => t.status === filter);
  }, [tenants, filter]);

  const stats = useMemo(() => {
    const active = tenants.filter((t) => t.status === "active");
    const mrr = active.reduce((s, t) => s + t.pricePerMonthCents, 0);
    const arr = mrr * 12;
    const trial = tenants.filter((t) => t.status === "trial").length;
    const churned = tenants.filter((t) => t.status === "terminated").length;
    const expiring = tenants.filter(
      (t) => t.status === "trial" && t.trialEndsAt && daysFromNow(t.trialEndsAt).days <= 7,
    ).length;
    const totalCustomers = tenants.reduce((s, t) => s + t.customerCount, 0);
    return { activeCount: active.length, mrr, arr, trial, churned, expiring, totalCustomers };
  }, [tenants]);

  function handleStatus(t: TenantRow, status: "trial" | "active" | "paused" | "terminated") {
    startTransition(async () => {
      await adminUpdateTenantStatus(t.id, status);
      notify(t.id, `Status → ${status}`);
      router.refresh();
    });
  }

  function handleTier(t: TenantRow, tier: "Solo" | "Multi-Location" | "Enterprise") {
    const price = TIER_PRICE[tier];
    startTransition(async () => {
      await adminUpdateTenantTier(t.id, tier, price);
      notify(t.id, `Tier → ${tier}`);
      router.refresh();
    });
  }

  function handleSaveNotes(t: TenantRow, notes: string) {
    startTransition(async () => {
      await adminUpdateTenantNotes(t.id, notes);
      notify(t.id, "Notes saved");
      router.refresh();
    });
  }

  function handleLogPayment(t: TenantRow) {
    const amountStr = window.prompt(
      `Log a payment for ${t.name} (in dollars):`,
      `${(t.pricePerMonthCents / 100).toFixed(2)}`,
    );
    if (!amountStr) return;
    const amount = parseFloat(amountStr);
    if (isNaN(amount) || amount <= 0) {
      notify(t.id, "Invalid amount", false);
      return;
    }
    startTransition(async () => {
      await adminLogTenantBilling({
        tenantId: t.id,
        kind: "charge_succeeded",
        amountCents: Math.round(amount * 100),
        description: `Manual payment logged by admin`,
      });
      notify(t.id, `✓ Logged ${dollarsExact(Math.round(amount * 100))}`);
      router.refresh();
    });
  }

  function handleDelete(t: TenantRow) {
    if (!confirm(`Delete tenant ${t.name}? This removes all billing history.`)) return;
    startTransition(async () => {
      await adminDeleteTenant(t.id);
      notify(t.id, "Deleted");
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      {/* Hero strip — SaaS theme */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, #1a1f3a 0%, #2D100F 50%, ${NOHO_BLUE_DEEP} 100%)`,
          boxShadow: "0 8px 28px rgba(26,31,58,0.30)",
        }}
      >
        {/* Server-room dot grid */}
        <div
          className="absolute inset-0 opacity-[0.08] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 30%, white 1.2px, transparent 1.2px), radial-gradient(circle at 75% 70%, white 1px, transparent 1px)",
            backgroundSize: "32px 32px, 22px 22px",
          }}
        />
        {/* Cloud/server corner mark */}
        <div className="absolute right-6 top-6 opacity-15 pointer-events-none">
          <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke={NOHO_CREAM} strokeWidth="1.2">
            <rect x="2" y="3" width="20" height="6" rx="1.5" />
            <rect x="2" y="13" width="20" height="6" rx="1.5" />
            <circle cx="6" cy="6" r="0.6" fill={NOHO_CREAM} stroke="none" />
            <circle cx="6" cy="16" r="0.6" fill={NOHO_CREAM} stroke="none" />
            <line x1="9" y1="6" x2="18" y2="6" />
            <line x1="9" y1="16" x2="18" y2="16" />
          </svg>
        </div>

        <div className="relative p-6">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: NOHO_GREEN }}
            />
            <span
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: NOHO_CREAM }}
            >
              SaaS · CMRA Operators
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
            Tenant Operations
          </h2>
          <p className="text-[12px] font-medium max-w-md" style={{ color: `${NOHO_CREAM}cc` }}>
            White-label NOHO Mailbox to other CMRA operators. Manage trials, tiers, and billing
            for downstream tenants.
          </p>
        </div>
      </div>

      {/* KPI tiles — SaaS metrics */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <KpiTile label="Total Tenants" value={stats.activeCount + stats.trial + (counts.paused ?? 0) + stats.churned} accent={NOHO_INK} />
        <KpiTile label="Active" value={stats.activeCount} accent={NOHO_GREEN} />
        <KpiTile
          label="In Trial"
          value={stats.trial}
          accent={NOHO_AMBER}
          pulse={stats.expiring > 0}
        />
        <KpiTile label="MRR" value={dollars(stats.mrr)} accent={NOHO_BLUE} />
        <KpiTile label="ARR" value={dollars(stats.arr)} accent={NOHO_BLUE_DEEP} />
        <KpiTile label="Customers Total" value={stats.totalCustomers} accent={NOHO_INK} />
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {[
          { id: "all", label: "All" },
          { id: "trial", label: "Trial" },
          { id: "active", label: "Active" },
          { id: "paused", label: "Paused" },
          { id: "terminated", label: "Terminated" },
        ].map((f) => {
          const meta = STATUS_META[f.id];
          const active = filter === f.id;
          return (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all inline-flex items-center gap-1.5"
              style={{
                background: active ? NOHO_INK : `${NOHO_INK}0d`,
                color: active ? NOHO_CREAM : NOHO_INK,
                boxShadow: active ? "0 2px 8px rgba(45,16,15,0.20)" : "none",
              }}
            >
              {meta && <span className="text-[12px] leading-none">{meta.emoji}</span>}
              {f.label}
              <span
                className="px-1.5 py-0.5 rounded-md text-[9px]"
                style={{
                  background: active ? `${NOHO_CREAM}22` : `${NOHO_INK}11`,
                  color: active ? NOHO_CREAM : NOHO_INK,
                }}
              >
                {counts[f.id] ?? 0}
              </span>
            </button>
          );
        })}
      </div>

      {/* Tenant cards */}
      {filtered.length === 0 ? (
        <div
          className="rounded-2xl p-12 text-center"
          style={{
            background: `linear-gradient(180deg, ${NOHO_CREAM}66 0%, white 100%)`,
            border: `1px dashed ${NOHO_INK}1a`,
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3"
            style={{ background: `${NOHO_BLUE}15` }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={NOHO_BLUE} strokeWidth="2">
              <rect x="2" y="3" width="20" height="6" rx="1.5" />
              <rect x="2" y="13" width="20" height="6" rx="1.5" />
            </svg>
          </div>
          <p className="text-sm font-black" style={{ color: NOHO_INK }}>
            No tenants in this filter
          </p>
          <p className="text-[11px] mt-1" style={{ color: `${NOHO_INK}88` }}>
            Tenants self-apply at <code style={{ color: NOHO_BLUE }}>/for-cmra-operators/apply</code>
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((t) => (
            <TenantCard
              key={t.id}
              t={t}
              isPending={isPending}
              isOpen={openId === t.id}
              feedback={feedback}
              onStatus={(s) => handleStatus(t, s)}
              onTier={(tier) => handleTier(t, tier)}
              onLogPayment={() => handleLogPayment(t)}
              onToggleNotes={() => setOpenId(openId === t.id ? null : t.id)}
              onSaveNotes={(n) => handleSaveNotes(t, n)}
              onDelete={() => handleDelete(t)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TenantCard({
  t,
  isPending,
  isOpen,
  feedback,
  onStatus,
  onTier,
  onLogPayment,
  onToggleNotes,
  onSaveNotes,
  onDelete,
}: {
  t: TenantRow;
  isPending: boolean;
  isOpen: boolean;
  feedback: { id: string; msg: string; ok: boolean } | null;
  onStatus: (s: "trial" | "active" | "paused" | "terminated") => void;
  onTier: (tier: "Solo" | "Multi-Location" | "Enterprise") => void;
  onLogPayment: () => void;
  onToggleNotes: () => void;
  onSaveNotes: (notes: string) => void;
  onDelete: () => void;
}) {
  const meta = STATUS_META[t.status] ?? STATUS_META.trial;
  const tierMeta = TIER_META[t.tier] ?? TIER_META.Solo;
  const { from, to } = huesFor(t.name);
  const trial = t.status === "trial" && t.trialEndsAt ? daysFromNow(t.trialEndsAt) : null;
  const trialUrgent = trial && trial.days <= 7 && !trial.expired;

  return (
    <div
      className="rounded-2xl bg-white relative overflow-hidden transition-all hover:-translate-y-0.5"
      style={{
        border: `1px solid ${meta.color}33`,
        boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 8px 22px rgba(45,16,15,0.06)",
      }}
    >
      {/* Status accent stripe */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{
          background: `linear-gradient(180deg, ${meta.color} 0%, ${meta.color}66 100%)`,
        }}
      />

      <div className="p-4 pl-5">
        <div className="flex items-start gap-3">
          {/* Monogram */}
          <div
            className="w-12 h-12 rounded-xl shrink-0 flex items-center justify-center text-white font-black text-sm"
            style={{
              background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
              boxShadow: `0 4px 12px ${from}55`,
            }}
          >
            {initials(t.name)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-black truncate" style={{ color: NOHO_INK }}>
                  {t.name}
                </p>
                <p
                  className="text-[10px] font-mono truncate"
                  style={{ color: `${NOHO_INK}66` }}
                >
                  /{t.slug}
                </p>
              </div>
              <div className="flex flex-col gap-1 items-end shrink-0">
                <span
                  className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md inline-flex items-center gap-1"
                  style={{ background: meta.tint, color: meta.color }}
                >
                  <span className="text-[12px] leading-none">{meta.emoji}</span>
                  {meta.label}
                </span>
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md inline-flex items-center gap-1"
                  style={{
                    background: `${tierMeta.color}15`,
                    color: tierMeta.color,
                  }}
                >
                  <span className="text-[10px] leading-none">{tierMeta.emoji}</span>
                  {t.tier}
                </span>
              </div>
            </div>

            <p className="text-[11px] mt-1" style={{ color: `${NOHO_INK}88` }}>
              <strong style={{ color: NOHO_INK }}>{t.ownerName}</strong>
              {" · "}
              <a href={`mailto:${t.ownerEmail}`} className="hover:underline">
                {t.ownerEmail}
              </a>
              {t.ownerPhone && (
                <>
                  {" · "}
                  <a href={`tel:${t.ownerPhone}`} className="hover:underline">
                    {t.ownerPhone}
                  </a>
                </>
              )}
            </p>

            <p className="text-[10px] mt-0.5" style={{ color: `${NOHO_INK}66` }}>
              {t.legalCity || "?"}, {t.legalState || "?"} · {t.customerCount} customers ·{" "}
              {t.locationCount} location{t.locationCount === 1 ? "" : "s"}
            </p>
          </div>
        </div>

        {/* Trial countdown banner */}
        {trial && (
          <div
            className="mt-3 rounded-lg p-2 flex items-center gap-2 text-[11px] font-bold"
            style={{
              background: trial.expired ? `${NOHO_RED}10` : trialUrgent ? `${NOHO_AMBER}15` : `${NOHO_BLUE}10`,
              color: trial.expired ? NOHO_RED : trialUrgent ? "#92400e" : NOHO_BLUE_DEEP,
              borderLeft: `3px solid ${trial.expired ? NOHO_RED : trialUrgent ? NOHO_AMBER : NOHO_BLUE}`,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            Trial: {trial.text}
          </div>
        )}

        {/* Price strip */}
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div
            className="rounded-lg p-2.5"
            style={{ background: `${NOHO_GREEN}08`, border: `1px solid ${NOHO_GREEN}22` }}
          >
            <p
              className="text-[9px] font-black uppercase tracking-wider"
              style={{ color: `${NOHO_INK}66` }}
            >
              MRR
            </p>
            <p
              className="font-black tabular-nums leading-none mt-0.5"
              style={{
                fontFamily: "var(--font-baloo, system-ui)",
                fontSize: "1.1rem",
                color: NOHO_GREEN,
              }}
            >
              {dollars(t.pricePerMonthCents)}
              <span className="text-[10px] font-bold" style={{ color: `${NOHO_INK}66` }}>
                /mo
              </span>
            </p>
          </div>
          <div
            className="rounded-lg p-2.5"
            style={{ background: `${NOHO_BLUE}08`, border: `1px solid ${NOHO_BLUE}22` }}
          >
            <p
              className="text-[9px] font-black uppercase tracking-wider"
              style={{ color: `${NOHO_INK}66` }}
            >
              ARR (annualized)
            </p>
            <p
              className="font-black tabular-nums leading-none mt-0.5"
              style={{
                fontFamily: "var(--font-baloo, system-ui)",
                fontSize: "1.1rem",
                color: NOHO_BLUE_DEEP,
              }}
            >
              {dollars(t.pricePerMonthCents * 12)}
            </p>
          </div>
        </div>

        {/* Action grid */}
        <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-1.5">
          <select
            value={t.status}
            onChange={(e) => onStatus(e.target.value as "trial" | "active" | "paused" | "terminated")}
            disabled={isPending}
            className="text-[10px] font-black uppercase tracking-wider px-2 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
            style={{
              borderColor: `${meta.color}33`,
              background: meta.tint,
              color: meta.color,
            }}
          >
            <option value="trial">trial</option>
            <option value="active">active</option>
            <option value="paused">paused</option>
            <option value="terminated">terminated</option>
          </select>
          <select
            value={t.tier}
            onChange={(e) => onTier(e.target.value as "Solo" | "Multi-Location" | "Enterprise")}
            disabled={isPending}
            className="text-[10px] font-black uppercase tracking-wider px-2 py-2 rounded-lg border focus:outline-none focus:ring-2 transition-all"
            style={{
              borderColor: `${tierMeta.color}33`,
              background: `${tierMeta.color}10`,
              color: tierMeta.color,
            }}
          >
            <option value="Solo">Solo $299</option>
            <option value="Multi-Location">Multi $799</option>
            <option value="Enterprise">Ent $1499</option>
          </select>
          <button
            onClick={onLogPayment}
            disabled={isPending}
            className="text-[10px] font-black uppercase tracking-wider px-2 py-2 rounded-lg text-white transition-all hover:shadow-md disabled:opacity-50 inline-flex items-center justify-center gap-1"
            style={{
              background: `linear-gradient(180deg, ${NOHO_GREEN} 0%, #15803d 100%)`,
              boxShadow: `0 2px 6px ${NOHO_GREEN}40`,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Payment
          </button>
          <button
            onClick={onToggleNotes}
            className="text-[10px] font-black uppercase tracking-wider px-2 py-2 rounded-lg transition-all"
            style={{
              background: isOpen ? NOHO_INK : `${NOHO_INK}08`,
              color: isOpen ? NOHO_CREAM : NOHO_INK,
            }}
          >
            {isOpen ? "Close" : "Notes"}
          </button>
        </div>

        <button
          onClick={onDelete}
          disabled={isPending}
          className="mt-1.5 w-full text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded-md transition-colors"
          style={{
            background: "transparent",
            color: `${NOHO_RED}aa`,
          }}
        >
          🗑 Delete tenant
        </button>

        {feedback?.id === t.id && (
          <div
            className="mt-2 rounded-lg p-2 text-[10px] font-bold flex items-center gap-2"
            style={{
              background: feedback.ok ? `${NOHO_GREEN}10` : `${NOHO_RED}10`,
              color: feedback.ok ? NOHO_GREEN : NOHO_RED,
              borderLeft: `3px solid ${feedback.ok ? NOHO_GREEN : NOHO_RED}`,
            }}
          >
            {feedback.msg}
          </div>
        )}

        {isOpen && (
          <div
            className="mt-3 rounded-lg p-3"
            style={{ background: `${NOHO_CREAM}55`, borderLeft: `3px solid ${NOHO_AMBER}` }}
          >
            <NotesEditor tenant={t} onSave={onSaveNotes} />
          </div>
        )}
      </div>
    </div>
  );
}

function NotesEditor({
  tenant,
  onSave,
}: {
  tenant: TenantRow;
  onSave: (notes: string) => void;
}) {
  const [notes, setNotes] = useState(tenant.notes ?? "");
  const [dirty, setDirty] = useState(false);

  return (
    <div>
      <p
        className="text-[10px] font-black uppercase tracking-[0.15em] mb-2"
        style={{ color: NOHO_INK }}
      >
        Tenant Notes
      </p>
      <textarea
        value={notes}
        onChange={(e) => {
          setNotes(e.target.value);
          setDirty(true);
        }}
        rows={5}
        placeholder="Migration plan, customer count, current platform, demo notes…"
        className="w-full text-sm rounded-lg px-3 py-2 resize-y bg-white focus:outline-none focus:ring-2 transition-all"
        style={{
          border: `1px solid ${NOHO_INK}22`,
          color: NOHO_INK,
        }}
      />
      <button
        type="button"
        disabled={!dirty}
        onClick={() => {
          onSave(notes);
          setDirty(false);
        }}
        className="mt-2 px-3.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider text-white transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
        style={{
          background: dirty
            ? `linear-gradient(180deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)`
            : `${NOHO_INK}22`,
          boxShadow: dirty ? `0 2px 6px ${NOHO_BLUE}40` : "none",
        }}
      >
        {dirty ? "Save notes" : "✓ Saved"}
      </button>
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
