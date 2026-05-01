"use client";

import { useState, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  adminMarkCreditLinkSent,
  adminMarkCreditPaid,
  adminCancelCreditRequest,
} from "@/app/actions/credits";

export type CreditRequestRow = {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userPhone: string | null;
  amountCents: number;
  status: string;
  squareLink: string | null;
  notes: string | null;
  createdAt: string;
};

type Props = {
  requests: CreditRequestRow[];
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";
const NOHO_RED = "#E70013";
const NOHO_CREAM = "#F7E6C2";
const NOHO_GREEN = "#16A34A";

function dollars(cents: number) {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
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

const STATUS_META: Record<
  string,
  { label: string; color: string; tint: string; sub: string }
> = {
  Pending: {
    label: "Awaiting link",
    color: NOHO_AMBER,
    tint: "rgba(245,166,35,0.10)",
    sub: "Send Square link",
  },
  LinkSent: {
    label: "Link sent",
    color: NOHO_BLUE,
    tint: "rgba(51,116,133,0.10)",
    sub: "Awaiting Square payment",
  },
  Paid: {
    label: "Paid",
    color: NOHO_GREEN,
    tint: "rgba(22,163,74,0.10)",
    sub: "Wallet credited",
  },
  Cancelled: {
    label: "Cancelled",
    color: NOHO_RED,
    tint: "rgba(231,0,19,0.10)",
    sub: "Request closed",
  },
};

function getStatusMeta(s: string) {
  return STATUS_META[s] ?? STATUS_META.Pending;
}

export function AdminCreditRequestsPanel({ requests }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<{ id: string; msg: string; ok: boolean } | null>(
    null,
  );
  const [filter, setFilter] = useState<
    "all" | "Pending" | "LinkSent" | "Paid" | "Cancelled"
  >("all");

  function notify(id: string, msg: string, ok = true) {
    setFeedback({ id, msg, ok });
    setTimeout(() => setFeedback(null), 4000);
  }

  function handleTextSquareLink(r: CreditRequestRow) {
    if (!r.userPhone) {
      notify(r.id, "No phone on file — can't text them", false);
      return;
    }
    const url = window.prompt(
      `Paste the Square payment link for ${r.userName} (${dollars(r.amountCents)}):`,
      "https://checkout.square.site/...",
    );
    if (!url || !url.startsWith("http")) return;

    const firstName = r.userName.split(" ")[0] ?? r.userName;
    const body =
      `Hi ${firstName}, this is NOHO Mailbox. Here's your secure Square payment link to add ${dollars(r.amountCents)} of credits to your account: ${url}\n\n` +
      `Once paid, your credits will appear automatically in your dashboard. Questions? (818) 506-7744.`;
    const phoneDigits = r.userPhone.replace(/\D/g, "");
    const smsUrl = `sms:+1${phoneDigits}?&body=${encodeURIComponent(body)}`;

    startTransition(async () => {
      const res = await adminMarkCreditLinkSent(r.id, url);
      if ("error" in res && res.error) {
        notify(r.id, `Error: ${res.error}`, false);
        return;
      }
      window.open(smsUrl, "_self");
      notify(r.id, "Opening Messages — review and send");
      router.refresh();
    });
  }

  function handleMarkPaid(r: CreditRequestRow) {
    if (
      !confirm(
        `Mark ${dollars(r.amountCents)} as paid? This credits ${r.userName}'s wallet.`,
      )
    )
      return;
    startTransition(async () => {
      const res = await adminMarkCreditPaid(r.id);
      if ("error" in res && res.error) {
        notify(r.id, `Error: ${res.error}`, false);
        return;
      }
      notify(r.id, "✓ Wallet credited");
      router.refresh();
    });
  }

  function handleCancel(r: CreditRequestRow) {
    if (!confirm(`Cancel request from ${r.userName}?`)) return;
    startTransition(async () => {
      await adminCancelCreditRequest(r.id);
      notify(r.id, "Cancelled");
      router.refresh();
    });
  }

  const stats = useMemo(() => {
    const total = requests.length;
    const pending = requests.filter((r) => r.status === "Pending").length;
    const linkSent = requests.filter((r) => r.status === "LinkSent").length;
    const paid = requests.filter((r) => r.status === "Paid").length;
    const fundsPending = requests
      .filter((r) => r.status === "Pending" || r.status === "LinkSent")
      .reduce((s, r) => s + r.amountCents, 0);
    const avg = total > 0 ? Math.round(requests.reduce((s, r) => s + r.amountCents, 0) / total) : 0;
    return { total, pending, linkSent, paid, fundsPending, avg };
  }, [requests]);

  const filtered = useMemo(() => {
    if (filter === "all") return requests;
    return requests.filter((r) => r.status === filter);
  }, [requests, filter]);

  return (
    <div className="space-y-5">
      {/* Hero strip — money/wallet theme */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${NOHO_GREEN} 0%, #0f6b3a 50%, ${NOHO_BLUE_DEEP} 100%)`,
          boxShadow: "0 8px 28px rgba(22,163,74,0.30)",
        }}
      >
        {/* Dollar-sign pattern decoration */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none select-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 35%, white 1.5px, transparent 1.5px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px, 28px 28px",
          }}
        />
        {/* Wallet corner mark */}
        <div className="absolute right-6 top-6 opacity-15 pointer-events-none">
          <svg width="68" height="68" viewBox="0 0 24 24" fill="none" stroke={NOHO_CREAM} strokeWidth="1.2">
            <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
            <path d="M16 11h5v4h-5a2 2 0 0 1 0-4z" />
            <circle cx="17.5" cy="13" r="0.6" fill={NOHO_CREAM} stroke="none" />
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
              Wallet Top-ups · Square
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
            Credit Requests Console
          </h2>
          <p className="text-[12px] font-medium max-w-md" style={{ color: `${NOHO_CREAM}cc` }}>
            Members request wallet top-ups from their dashboard. Text the Square link, then
            mark paid once Square confirms — credits land instantly.
          </p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile label="Total Open" value={stats.total} accent={NOHO_INK} />
        <KpiTile
          label="Awaiting Link"
          value={stats.pending}
          accent={NOHO_AMBER}
          pulse={stats.pending > 0}
        />
        <KpiTile
          label="Link Sent"
          value={stats.linkSent}
          accent={NOHO_BLUE}
          pulse={stats.linkSent > 0}
        />
        <KpiTile label="Funds Pending" value={dollars(stats.fundsPending)} accent={NOHO_GREEN} />
        <KpiTile label="Avg Request" value={dollars(stats.avg)} accent={NOHO_INK} />
      </div>

      {/* Workflow legend */}
      <div
        className="rounded-2xl p-4 bg-white"
        style={{
          border: `1px solid ${NOHO_INK}11`,
          boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 4px 12px rgba(45,16,15,0.04)",
        }}
      >
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <span
            className="text-[10px] font-black uppercase tracking-[0.15em]"
            style={{ color: NOHO_INK }}
          >
            Top-up Workflow
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <WorkflowStep n={1} label="Submitted" sub="Member" color={NOHO_AMBER} />
          <WorkflowConnector />
          <WorkflowStep n={2} label="Square link sent" sub="via SMS" color={NOHO_BLUE} />
          <WorkflowConnector />
          <WorkflowStep n={3} label="Payment confirmed" sub="Wallet credited" color={NOHO_GREEN} />
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {(
          [
            ["all", "All", stats.total],
            ["Pending", "Awaiting link", stats.pending],
            ["LinkSent", "Link sent", stats.linkSent],
            ["Paid", "Paid", stats.paid],
            ["Cancelled", "Cancelled", requests.filter((r) => r.status === "Cancelled").length],
          ] as const
        ).map(([key, label, n]) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: filter === key ? NOHO_INK : `${NOHO_INK}0d`,
              color: filter === key ? NOHO_CREAM : NOHO_INK,
              boxShadow: filter === key ? "0 2px 8px rgba(45,16,15,0.20)" : "none",
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
          className="rounded-2xl p-12 text-center"
          style={{
            background: `linear-gradient(180deg, ${NOHO_CREAM}66 0%, white 100%)`,
            border: `1px dashed ${NOHO_INK}1a`,
          }}
        >
          <div
            className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center mb-3"
            style={{ background: `${NOHO_GREEN}15` }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={NOHO_GREEN} strokeWidth="2">
              <path d="M21 12V7a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-2" />
              <path d="M16 11h5v4h-5a2 2 0 0 1 0-4z" />
            </svg>
          </div>
          <p className="text-sm font-black" style={{ color: NOHO_INK }}>
            No {filter === "all" ? "open" : filter.toLowerCase()} credit requests
          </p>
          <p className="text-[11px] mt-1" style={{ color: `${NOHO_INK}88` }}>
            Members request top-ups from their dashboard wallet tab.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((r) => (
            <RequestCard
              key={r.id}
              r={r}
              isPending={isPending}
              feedback={feedback}
              onTextLink={() => handleTextSquareLink(r)}
              onMarkPaid={() => handleMarkPaid(r)}
              onCancel={() => handleCancel(r)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function RequestCard({
  r,
  isPending,
  feedback,
  onTextLink,
  onMarkPaid,
  onCancel,
}: {
  r: CreditRequestRow;
  isPending: boolean;
  feedback: { id: string; msg: string; ok: boolean } | null;
  onTextLink: () => void;
  onMarkPaid: () => void;
  onCancel: () => void;
}) {
  const { from, to } = huesFor(r.userName);
  const meta = getStatusMeta(r.status);

  // 3-stage progress
  const stages = [
    { key: "submit", label: "Submitted", done: true },
    { key: "link", label: "Link Sent", done: r.status === "LinkSent" || r.status === "Paid" },
    { key: "paid", label: "Paid", done: r.status === "Paid" },
  ];
  const cancelled = r.status === "Cancelled";

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
            {initials(r.userName)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-sm font-black truncate" style={{ color: NOHO_INK }}>
                  {r.userName}
                </p>
                <p className="text-[11px] truncate" style={{ color: `${NOHO_INK}88` }}>
                  <a href={`mailto:${r.userEmail}`} className="hover:underline">
                    {r.userEmail}
                  </a>
                  {r.userPhone && (
                    <>
                      {" · "}
                      <a href={`tel:${r.userPhone}`} className="hover:underline">
                        {r.userPhone}
                      </a>
                    </>
                  )}
                </p>
              </div>
              <span
                className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shrink-0"
                style={{ background: meta.tint, color: meta.color }}
              >
                {meta.label}
              </span>
            </div>

            <p className="text-[10px] mt-1" style={{ color: `${NOHO_INK}55` }}>
              Submitted {relTime(r.createdAt)}
            </p>
          </div>

          {/* Big amount tile */}
          <div
            className="rounded-xl px-3 py-2 text-right shrink-0"
            style={{
              background: `linear-gradient(135deg, ${NOHO_GREEN} 0%, #0f6b3a 100%)`,
              boxShadow: `0 4px 12px ${NOHO_GREEN}40`,
            }}
          >
            <p
              className="text-[8px] font-black uppercase tracking-wider"
              style={{ color: `${NOHO_CREAM}cc` }}
            >
              Top-up
            </p>
            <p
              className="font-black tabular-nums leading-none mt-0.5"
              style={{
                fontFamily: "var(--font-baloo, system-ui)",
                fontSize: "1.2rem",
                color: "white",
              }}
            >
              {dollars(r.amountCents)}
            </p>
          </div>
        </div>

        {/* 3-stage timeline */}
        {!cancelled && (
          <div className="mt-3 rounded-lg p-2.5" style={{ background: `${NOHO_CREAM}55` }}>
            <div className="flex items-center justify-between gap-1">
              {stages.map((s, i) => {
                const isLast = i === stages.length - 1;
                return (
                  <div key={s.key} className="flex items-center gap-1 flex-1 min-w-0">
                    <div className="flex flex-col items-center min-w-0 flex-1">
                      <div
                        className="w-6 h-6 rounded-full flex items-center justify-center mb-1 transition-all"
                        style={{
                          background: s.done ? meta.color : `${NOHO_INK}11`,
                          boxShadow: s.done ? `0 2px 6px ${meta.color}55` : "none",
                        }}
                      >
                        {s.done ? (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="white"
                            strokeWidth="3.5"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        ) : (
                          <span
                            className="text-[9px] font-black"
                            style={{ color: `${NOHO_INK}66` }}
                          >
                            {i + 1}
                          </span>
                        )}
                      </div>
                      <span
                        className="text-[9px] font-bold uppercase tracking-wider truncate w-full text-center"
                        style={{ color: s.done ? NOHO_INK : `${NOHO_INK}66` }}
                      >
                        {s.label}
                      </span>
                    </div>
                    {!isLast && (
                      <div
                        className="h-px flex-1 mb-3"
                        style={{
                          background: s.done && stages[i + 1].done ? meta.color : `${NOHO_INK}11`,
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {cancelled && (
          <div
            className="mt-3 rounded-lg p-2.5 text-center text-[10px] font-bold"
            style={{
              background: `${NOHO_RED}10`,
              color: NOHO_RED,
            }}
          >
            ✕ Request cancelled
          </div>
        )}

        {/* Notes */}
        {r.notes && (
          <div
            className="mt-2.5 rounded-lg p-2.5 text-[11px] italic"
            style={{
              background: `${NOHO_INK}06`,
              color: `${NOHO_INK}cc`,
              borderLeft: `2px solid ${NOHO_AMBER}`,
            }}
          >
            “{r.notes}”
          </div>
        )}

        {/* Square link if sent */}
        {r.squareLink && (
          <div
            className="mt-2.5 rounded-lg p-2 text-[10px] flex items-center gap-2"
            style={{ background: `${NOHO_BLUE}08` }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={NOHO_BLUE} strokeWidth="2">
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            <span
              className="font-bold uppercase tracking-wider"
              style={{ color: NOHO_BLUE_DEEP }}
            >
              Link sent
            </span>
            <a
              href={r.squareLink}
              target="_blank"
              rel="noopener noreferrer"
              className="truncate flex-1 hover:underline"
              style={{ color: NOHO_BLUE }}
            >
              {r.squareLink.replace(/^https?:\/\//, "")}
            </a>
          </div>
        )}

        {/* Actions */}
        {!cancelled && r.status !== "Paid" && (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <button
              onClick={onTextLink}
              disabled={isPending}
              title={r.userPhone ? `Text link to ${r.userPhone}` : "No phone on file"}
              className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-2 rounded-lg text-white transition-all hover:shadow-md disabled:opacity-50"
              style={{
                background: `linear-gradient(180deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)`,
                boxShadow: `0 2px 6px ${NOHO_BLUE}40`,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              Text link
            </button>
            <button
              onClick={onMarkPaid}
              disabled={isPending}
              className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-2 rounded-lg text-white transition-all hover:shadow-md disabled:opacity-50"
              style={{
                background: `linear-gradient(180deg, ${NOHO_GREEN} 0%, #15803d 100%)`,
                boxShadow: `0 2px 6px ${NOHO_GREEN}40`,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M5 13l4 4L19 7" />
              </svg>
              Mark paid
            </button>
            <button
              onClick={onCancel}
              disabled={isPending}
              className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider px-2 py-2 rounded-lg transition-all disabled:opacity-50"
              style={{
                background: `${NOHO_RED}11`,
                color: NOHO_RED,
              }}
            >
              ✕ Cancel
            </button>
          </div>
        )}

        {/* Feedback toast */}
        {feedback?.id === r.id && (
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

function WorkflowStep({
  n,
  label,
  sub,
  color,
}: {
  n: number;
  label: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2 flex-1 min-w-[120px]">
      <div
        className="w-7 h-7 rounded-full flex items-center justify-center text-white font-black text-[11px] shrink-0"
        style={{
          background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
          boxShadow: `0 2px 6px ${color}55`,
        }}
      >
        {n}
      </div>
      <div className="min-w-0">
        <p
          className="text-[10px] font-black uppercase tracking-wider truncate"
          style={{ color: NOHO_INK }}
        >
          {label}
        </p>
        <p className="text-[9px] truncate" style={{ color: `${NOHO_INK}77` }}>
          {sub}
        </p>
      </div>
    </div>
  );
}

function WorkflowConnector() {
  return (
    <svg
      width="20"
      height="14"
      viewBox="0 0 20 14"
      fill="none"
      className="hidden sm:block shrink-0"
    >
      <path
        d="M2 7h14M14 3l4 4-4 4"
        stroke={`${NOHO_INK}44`}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
          fontSize: "1.4rem",
          color: accent,
        }}
      >
        {value}
      </div>
    </div>
  );
}
