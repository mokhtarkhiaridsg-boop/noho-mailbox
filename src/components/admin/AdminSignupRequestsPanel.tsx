"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  assignMailbox,
  updateMailboxStatus,
  adminGeneratePasswordResetLink,
} from "@/app/actions/admin";
import type { Customer } from "./types";

type Props = {
  customers: Customer[];
};

// iPad-OS tokens — token names preserved so the existing 695-line render
// tree still resolves; only the hex values change. Cream→soft-gray,
// brown→near-black ink, blue→iOS-blue.
const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";
const NOHO_AMBER = "#F59E0B";
const NOHO_RED = "#FF3B30";
const NOHO_CREAM = "#F4F5F7";
const NOHO_GREEN = "#22C55E";

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Avatar — neutral cream surface. Was a 6-tone rainbow palette which read
// as "circus" against the formal admin chrome. Customer identity comes
// from initials, not a randomly-assigned hue.
function huesFor(_seed: string): { from: string; to: string } {
  void _seed;
  return { from: "#F4EEE3", to: "#F4EEE3" };
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return iso;
  const m = Math.floor(ms / (1000 * 60));
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d === 1) return "1 day ago";
  if (d < 7) return `${d}d ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

function ageDays(iso: string): number {
  const ms = Date.now() - new Date(iso).getTime();
  return Math.max(0, Math.floor(ms / (1000 * 60 * 60 * 24)));
}

export function AdminSignupRequestsPanel({ customers }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [suiteInputs, setSuiteInputs] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<{ id: string; msg: string; ok: boolean } | null>(
    null,
  );
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "online" | "inperson">("all");

  // Pending signup requests = mailboxStatus "Pending" with no suite assigned yet.
  const requests = useMemo(
    () => customers.filter((c) => c.mailboxStatus === "Pending" && !c.suiteNumber),
    [customers],
  );

  const stats = useMemo(() => {
    const total = requests.length;
    const online = requests.filter((c) => c.kycNotes?.includes("ONLINE SIGNUP")).length;
    const inperson = total - online;
    const withPhone = requests.filter((c) => !!c.phone).length;
    const oldest = requests.reduce(
      (max, r) => Math.max(max, ageDays(r.createdAt)),
      0,
    );
    return { total, online, inperson, withPhone, oldest };
  }, [requests]);

  const planDistribution = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of requests) {
      const k = r.plan || "—";
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [requests]);

  const filtered = useMemo(() => {
    if (filter === "online")
      return requests.filter((r) => r.kycNotes?.includes("ONLINE SIGNUP"));
    if (filter === "inperson")
      return requests.filter((r) => !r.kycNotes?.includes("ONLINE SIGNUP"));
    return requests;
  }, [requests, filter]);

  function setSuite(id: string, val: string) {
    setSuiteInputs((p) => ({ ...p, [id]: val }));
  }

  function notify(id: string, msg: string, ok = true) {
    setFeedback({ id, msg, ok });
    setTimeout(() => setFeedback(null), 4000);
  }

  function handleAssign(c: Customer) {
    const suite = (suiteInputs[c.id] ?? "").trim();
    if (!suite) {
      notify(c.id, "Enter a suite number first", false);
      return;
    }
    startTransition(async () => {
      const res = await assignMailbox(c.id, suite);
      if (res.error) {
        notify(c.id, `Error: ${res.error}`, false);
      } else {
        notify(c.id, `✓ Assigned suite #${suite} — customer is now Active`);
        router.refresh();
      }
    });
  }

  function handleReject(c: Customer) {
    if (!confirm(`Reject request from ${c.name}? They'll be suspended.`)) return;
    startTransition(async () => {
      await updateMailboxStatus(c.id, "Suspended");
      notify(c.id, "Request rejected");
      router.refresh();
    });
  }

  function handleTextSquareLink(c: Customer) {
    if (!c.phone) {
      notify(c.id, "No phone number on file — can't text them", false);
      return;
    }
    const url = window.prompt(
      `Paste the Square payment link for ${c.name}:\n\nCreate one in Square Dashboard → Invoices or Checkout Links.`,
      "https://checkout.square.site/...",
    );
    if (!url || !url.startsWith("http")) return;
    const firstName = c.name.split(" ")[0] ?? c.name;
    const body =
      `Hi ${firstName}, this is NOHO Mailbox. Here's your secure Square payment link to set up your mailbox: ${url}\n\n` +
      `After payment, please email your completed USPS Form 1583 (https://about.usps.com/forms/ps1583.pdf) + photos of 2 IDs to nohomailbox@gmail.com so we can activate your suite. Questions? (818) 506-7744.`;
    const phoneDigits = c.phone.replace(/\D/g, "");
    const smsUrl = `sms:+1${phoneDigits}?&body=${encodeURIComponent(body)}`;
    window.open(smsUrl, "_self");
    notify(c.id, "Opening Messages — review and send");
  }

  function handleCopySetupLink(c: Customer) {
    startTransition(async () => {
      const res = await adminGeneratePasswordResetLink(c.id);
      if ("error" in res) {
        notify(c.id, `Error: ${res.error}`, false);
        return;
      }
      try {
        await navigator.clipboard.writeText(res.url);
        setCopiedId(c.id);
        notify(c.id, "Setup link copied — paste in SMS or email");
        setTimeout(() => setCopiedId(null), 3000);
      } catch {
        window.prompt("Copy this setup link (expires in 1 hour):", res.url);
      }
    });
  }

  return (
    <div className="space-y-5">
      {/* iPad-OS title row — Baloo + Pacifico script accent. Replaced
          the dark "command tower" gradient hero so this page matches
          the rest of the admin shell. */}
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2
          className="text-2xl font-bold"
          style={{
            color: NOHO_INK,
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
          }}
        >
          Signups
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
          today's inbox
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · {stats.total} pending {stats.total === 1 ? "request" : "requests"} · review notes · assign a suite · send checkout
        </span>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile label="Total Pending" value={stats.total} accent={NOHO_INK} pulse={stats.total > 0} />
        <KpiTile label="Online" value={stats.online} accent={NOHO_GREEN} />
        <KpiTile label="In-person" value={stats.inperson} accent={NOHO_BLUE} />
        <KpiTile label="With Phone" value={stats.withPhone} accent={NOHO_AMBER} />
        <KpiTile
          label="Oldest"
          value={stats.oldest === 0 ? "today" : `${stats.oldest}d`}
          accent={stats.oldest > 7 ? NOHO_RED : NOHO_INK}
        />
      </div>

      {/* Plan distribution bar */}
      {planDistribution.length > 0 && (
        <div
          className="rounded-md p-4 bg-white"
          style={{
            border: `1px solid ${NOHO_INK}11`,
            
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] font-black uppercase tracking-[0.15em]"
              style={{ color: NOHO_INK }}
            >
              Plan Demand
            </span>
            <span className="text-[10px] font-bold" style={{ color: `${NOHO_INK}88` }}>
              {stats.total} requests
            </span>
          </div>
          <div className="flex h-2 rounded-full overflow-hidden" style={{ background: `${NOHO_INK}08` }}>
            {planDistribution.map(([plan, n], i) => {
              const pct = (n / stats.total) * 100;
              const colors = [NOHO_BLUE, NOHO_AMBER, NOHO_GREEN, NOHO_RED, "#7C3AED", "#B07030"];
              return (
                <div
                  key={plan}
                  className="h-full transition-all hover:opacity-80"
                  style={{
                    width: `${pct}%`,
                    background: colors[i % colors.length],
                  }}
                  title={`${plan}: ${n}`}
                />
              );
            })}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {planDistribution.map(([plan, n], i) => {
              const colors = [NOHO_BLUE, NOHO_AMBER, NOHO_GREEN, NOHO_RED, "#7C3AED", "#B07030"];
              return (
                <div key={plan} className="flex items-center gap-1.5 text-[10px]">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ background: colors[i % colors.length] }}
                  />
                  <span className="font-bold" style={{ color: NOHO_INK }}>
                    {plan}
                  </span>
                  <span style={{ color: `${NOHO_INK}66` }}>{n}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {(
          [
            ["all", "All", stats.total],
            ["online", "💳 Online", stats.online],
            ["inperson", "🏪 In-person", stats.inperson],
          ] as const
        ).map(([key, label, n]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: filter === key ? NOHO_INK : `${NOHO_INK}0d`,
              color: filter === key ? NOHO_CREAM : NOHO_INK,
              boxShadow: filter === key ? "0 2px 8px rgba(0,0,0,0.20)" : "none",
            }}
          >
            {label}
            <span
              className="ml-1.5 px-1.5 py-0.5 rounded-md text-[9px]"
              style={{
                background: filter === key ? `${NOHO_CREAM}22` : `${NOHO_INK}11`,
                color: filter === key ? NOHO_CREAM : NOHO_INK,
              }}
            >
              {n}
            </span>
          </button>
        ))}
      </div>

      {/* Cards */}
      {filtered.length === 0 ? (
        <div
          className="rounded-md p-10 text-center"
          style={{
            background: `linear-gradient(180deg, ${NOHO_CREAM}66 0%, white 100%)`,
            border: `1px dashed ${NOHO_INK}1a`,
          }}
        >
          <div
            className="w-14 h-14 rounded-md mx-auto flex items-center justify-center mb-3"
            style={{ background: `${NOHO_BLUE}15` }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={NOHO_BLUE} strokeWidth="2">
              <rect x="3" y="4" width="18" height="16" rx="1.5" />
              <path d="M3 9h18" />
            </svg>
          </div>
          <p className="text-sm font-black" style={{ color: NOHO_INK }}>
            {filter === "all"
              ? "No pending signup requests"
              : `No ${filter === "online" ? "online" : "in-person"} signups`}
          </p>
          <p className="text-[11px] mt-1" style={{ color: `${NOHO_INK}88` }}>
            New customers from /signup will land here for review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((c) => (
            <SignupCard
              key={c.id}
              c={c}
              isPending={isPending}
              suiteInput={suiteInputs[c.id] ?? ""}
              setSuite={(v) => setSuite(c.id, v)}
              feedback={feedback}
              copied={copiedId === c.id}
              onAssign={() => handleAssign(c)}
              onReject={() => handleReject(c)}
              onTextLink={() => handleTextSquareLink(c)}
              onCopyLink={() => handleCopySetupLink(c)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function SignupCard({
  c,
  isPending,
  suiteInput,
  setSuite,
  feedback,
  copied,
  onAssign,
  onReject,
  onTextLink,
  onCopyLink,
}: {
  c: Customer;
  isPending: boolean;
  suiteInput: string;
  setSuite: (v: string) => void;
  feedback: { id: string; msg: string; ok: boolean } | null;
  copied: boolean;
  onAssign: () => void;
  onReject: () => void;
  onTextLink: () => void;
  onCopyLink: () => void;
}) {
  const { from, to } = huesFor(c.name);
  const isOnline = !!c.kycNotes?.includes("ONLINE SIGNUP");
  const days = ageDays(c.createdAt);
  const urgent = days >= 7;
  const accent = urgent ? NOHO_RED : isOnline ? NOHO_GREEN : NOHO_BLUE;

  return (
    <div
      className="rounded-md bg-white relative overflow-hidden transition-colors"
      style={{
        border: `1px solid ${accent}33`,
        
      }}
    >
      {/* Status accent stripe — solid color, no gradient. */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{ background: accent }}
      />

      <div className="p-4 pl-5">
        <div className="flex items-start gap-3">
          {/* Monogram — neutral cream surface. */}
          <div
            className="w-10 h-10 rounded-md shrink-0 flex items-center justify-center font-bold text-[12px]"
            style={{
              background: "#F4EEE3",
              color: NOHO_INK,
              border: "1px solid #E5DACA",
            }}
          >
            {initials(c.name)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-sm font-black truncate" style={{ color: NOHO_INK }}>
                {c.name}
              </p>
              {urgent && (
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                  style={{ background: `${NOHO_RED}15`, color: NOHO_RED }}
                >
                  ⚠ {days}d wait
                </span>
              )}
            </div>
            <p className="text-[11px] truncate" style={{ color: `${NOHO_INK}88` }}>
              <a href={`mailto:${c.email}`} className="hover:underline">
                {c.email}
              </a>
              {c.phone && (
                <>
                  {" · "}
                  <a href={`tel:${c.phone}`} className="hover:underline">
                    {c.phone}
                  </a>
                </>
              )}
            </p>

            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
              {isOnline ? (
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md inline-flex items-center gap-1"
                  style={{ background: `${NOHO_GREEN}15`, color: NOHO_GREEN }}
                >
                  💳 Online signup
                </span>
              ) : (
                <span
                  className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md inline-flex items-center gap-1"
                  style={{ background: `${NOHO_BLUE}15`, color: NOHO_BLUE_DEEP }}
                >
                  🏪 In-person
                </span>
              )}
              {c.plan && (
                <span
                  className="text-[9px] font-bold px-1.5 py-0.5 rounded-md"
                  style={{ background: `${NOHO_INK}0d`, color: NOHO_INK }}
                >
                  Wants: {c.plan}
                </span>
              )}
              <span
                className="text-[9px] ml-auto"
                style={{ color: `${NOHO_INK}66` }}
              >
                {relTime(c.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Customer note */}
        {c.kycNotes && (
          <div
            className="mt-3 rounded-lg p-2.5 text-[11px] leading-relaxed whitespace-pre-wrap"
            style={{
              background: `${NOHO_CREAM}66`,
              borderLeft: `3px solid ${NOHO_AMBER}`,
              color: `${NOHO_INK}cc`,
            }}
          >
            <p
              className="text-[9px] font-black uppercase tracking-wider mb-1"
              style={{ color: `${NOHO_INK}66` }}
            >
              Customer note
            </p>
            {c.kycNotes}
          </div>
        )}

        {/* Suite assign row */}
        <div className="mt-3 flex gap-1.5 items-center">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Suite #"
              value={suiteInput}
              onChange={(e) => setSuite(e.target.value)}
              className="w-full rounded-lg px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 transition-all pl-8"
              style={{
                border: `1px solid ${NOHO_INK}22`,
                background: `${NOHO_CREAM}33`,
                color: NOHO_INK,
              }}
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke={`${NOHO_INK}88`}
              strokeWidth="2.5"
              className="absolute left-2.5 top-1/2 -translate-y-1/2"
            >
              <rect x="3" y="6" width="18" height="14" rx="1.5" />
              <path d="M3 10h18" />
            </svg>
          </div>
          <button
            onClick={onAssign}
            disabled={isPending}
            className="text-[10px] font-bold uppercase tracking-[0.10em] px-3 h-8 rounded-md text-white transition-colors disabled:opacity-50 inline-flex items-center gap-1"
            style={{
              background: NOHO_INK,
              border: `1px solid ${NOHO_INK}`,
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Assign
          </button>
        </div>

        {/* Action buttons */}
        <div className={`mt-2 grid gap-1.5 ${isOnline ? "grid-cols-3" : "grid-cols-2"}`}>
          {isOnline && (
            <button
              onClick={onTextLink}
              disabled={isPending}
              title={c.phone ? `Text link to ${c.phone}` : "No phone on file"}
              className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.10em] px-2 h-8 rounded-md transition-colors disabled:opacity-50"
              style={{
                background: "white",
                color: NOHO_GREEN,
                border: `1px solid ${NOHO_GREEN}40`,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              Text link
            </button>
          )}
          <button
            onClick={onCopyLink}
            disabled={isPending}
            className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-2 rounded-lg transition-all disabled:opacity-50"
            style={{
              background: copied ? `${NOHO_GREEN}15` : `${NOHO_INK}08`,
              color: copied ? NOHO_GREEN : NOHO_INK,
              border: `1px solid ${copied ? NOHO_GREEN : NOHO_INK}22`,
            }}
          >
            {copied ? "✓ Copied" : "Setup link"}
          </button>
          <button
            onClick={onReject}
            disabled={isPending}
            className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-2 rounded-lg transition-all disabled:opacity-50"
            style={{
              background: `${NOHO_RED}11`,
              color: NOHO_RED,
            }}
          >
            ✕ Reject
          </button>
        </div>

        {/* Feedback */}
        {feedback?.id === c.id && (
          <div
            className="mt-2.5 rounded-lg p-2 text-[11px] font-bold flex items-center gap-2"
            style={{
              background: feedback.ok ? `${NOHO_GREEN}10` : `${NOHO_RED}10`,
              color: feedback.ok ? NOHO_GREEN : NOHO_RED,
              borderLeft: `3px solid ${feedback.ok ? NOHO_GREEN : NOHO_RED}`,
            }}
          >
            {feedback.msg}
          </div>
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
          "0 1px 2px rgba(0,0,0,0.04), 0 4px 12px rgba(0,0,0,0.04)",
      }}
    >
      <div
        className="absolute left-0 right-0 top-0 h-0.5"
        style={{ background: accent }}
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
          fontSize: "1.4rem",
          color: accent,
        }}
      >
        {value}
      </div>
    </div>
  );
}
