"use client";

import { useState, useTransition, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  adminMarkCreditLinkSent,
  adminMarkCreditPaid,
  adminCancelCreditRequest,
  findPaymentMatchesForCreditRequests,
  type CreditRequestPaymentMatch,
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
  // iter-11.8 — used by the auto-match badge to look up Square payments
  // that landed AFTER admin texted the link.
  linkSentAtIso?: string | null;
};

type Props = {
  requests: CreditRequestRow[];
};

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";
const NOHO_AMBER = "#F5A623";
const NOHO_RED = "#FF3B30";
const NOHO_CREAM = "#EBF2FF";
const NOHO_GREEN = "#22C55E";

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

// Avatar — neutral cream surface (no rainbow palette) to match the rest
// of the formal admin chrome.
function huesFor(_seed: string): { from: string; to: string } {
  void _seed;
  return { from: "#F4F5F7", to: "#F4F5F7" };
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

  // iter-11.8 — Map of requestId → matched Square payment, populated on
  // mount + after the user runs Sync All. Surfaces a "Square payment
  // received · $X" green badge on each row that has a matching synced
  // payment, with one-click Mark-paid.
  const [matches, setMatches] = useState<Map<string, CreditRequestPaymentMatch>>(new Map());
  useEffect(() => {
    const openIds = requests
      .filter((r) => r.status === "Pending" || r.status === "LinkSent")
      .map((r) => r.id);
    if (openIds.length === 0) {
      setMatches(new Map());
      return;
    }
    let cancelled = false;
    findPaymentMatchesForCreditRequests(openIds).then((rows) => {
      if (cancelled) return;
      const next = new Map<string, CreditRequestPaymentMatch>();
      for (const m of rows) next.set(m.requestId, m);
      setMatches(next);
    }).catch(() => { /* fail-silent */ });
    return () => { cancelled = true; };
  }, [requests]);

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
      {/* Hero strip — Command Tower variant matching the Overview shell.
          Replaces the previous emerald-green→ink three-stop gradient with
          glow shadow which read too loud against the formal hairline UI. */}
      <div
        className="relative overflow-hidden rounded-2xl px-5 sm:px-6 py-5"
        style={{
          background:
            "radial-gradient(ellipse at top right, #1A2E3A 0%, #0E1820 60%, #0A1218 100%)",
          boxShadow:
            "0 18px 50px rgba(10,18,24,0.4), inset 0 1px 0 rgba(255,255,255,0.04)",
        }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none opacity-[0.13]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(247,230,194,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(247,230,194,0.5) 1px, transparent 1px)",
            backgroundSize: "44px 44px",
            maskImage:
              "radial-gradient(ellipse at center, black 30%, transparent 80%)",
            transform:
              "perspective(800px) rotateX(58deg) translateY(20%) scale(1.4)",
            transformOrigin: "center bottom",
          }}
        />
        <div
          aria-hidden="true"
          className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full opacity-15 blur-3xl pointer-events-none"
          style={{ background: NOHO_GREEN }}
        />

        <div className="relative">
          <p
            className="text-[10px] font-black uppercase tracking-[0.28em] mb-1"
            style={{ color: "rgba(247,230,194,0.6)" }}
          >
            <span
              aria-hidden
              className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle"
              style={{
                background: NOHO_AMBER,
                boxShadow: `0 0 8px ${NOHO_AMBER}`,
              }}
            />
            Wallet top-ups · Square
          </p>
          <h2
            className="font-bold tracking-tight"
            style={{
              fontSize: "clamp(1.4rem, 2.8vw, 1.8rem)",
              color: "#FFFFFF",
            }}
          >
            Credit requests
          </h2>
          <p
            className="text-[12px] mt-1 max-w-md"
            style={{ color: "rgba(247,230,194,0.7)" }}
          >
            Members request wallet top-ups from their dashboard. Text the
            Square link, then mark paid once Square confirms — credits land
            instantly.
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
        className="rounded-md p-4 bg-white"
        style={{
          border: `1px solid ${NOHO_INK}11`,
          
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
          className="rounded-md p-10 text-center"
          style={{
            background: `linear-gradient(180deg, ${NOHO_CREAM}66 0%, white 100%)`,
            border: `1px dashed ${NOHO_INK}1a`,
          }}
        >
          <div
            className="w-14 h-14 rounded-md mx-auto flex items-center justify-center mb-3"
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
              match={matches.get(r.id) ?? null}
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
  match,
  onTextLink,
  onMarkPaid,
  onCancel,
}: {
  r: CreditRequestRow;
  isPending: boolean;
  feedback: { id: string; msg: string; ok: boolean } | null;
  match: CreditRequestPaymentMatch | null;
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
      className="rounded-md bg-white relative overflow-hidden transition-colors"
      style={{
        border: `1px solid ${meta.color}55`,
      }}
    >
      {/* Status accent stripe — solid color, no gradient. */}
      <div
        className="absolute left-0 top-0 bottom-0 w-0.5"
        style={{ background: meta.color }}
      />

      <div className="p-4 pl-5">
        <div className="flex items-start gap-3">
          {/* Monogram — neutral cream surface. */}
          <div
            className="w-10 h-10 rounded-md shrink-0 flex items-center justify-center font-bold text-[12px]"
            style={{
              background: "#F4F5F7",
              color: NOHO_INK,
              border: "1px solid #ECEEF1",
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

          {/* Big amount tile — flat hairline now, no green glow gradient. */}
          <div
            className="rounded-md px-3 py-2 text-right shrink-0"
            style={{
              background: NOHO_INK,
              border: `1px solid ${NOHO_INK}`,
            }}
          >
            <p
              className="text-[9px] font-bold uppercase tracking-[0.10em]"
              style={{ color: "rgba(247,230,194,0.6)" }}
            >
              Top-up
            </p>
            <p
              className="font-bold tabular-nums leading-none mt-0.5"
              style={{
                fontSize: "1.1rem",
                color: NOHO_CREAM,
                fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
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

        {/* iter-11.8 — Square payment match badge. When the Square sync
            has pulled in a COMPLETED payment matching this request's
            user + amount within the post-link-sent window, show it
            here so admin can confirm + apply the credit in one click. */}
        {match && r.status !== "Paid" && r.status !== "Cancelled" && (
          <div
            className="mt-2.5 rounded-lg p-3 flex items-start gap-2.5"
            style={{
              background: "rgba(34,197,94,0.08)",
              border: `1px solid ${NOHO_GREEN}55`,
            }}
          >
            <span
              className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center"
              style={{ background: NOHO_GREEN }}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            </span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-black uppercase tracking-[0.10em]" style={{ color: "#15803d" }}>
                Square payment received
              </p>
              <p className="text-[12px] mt-0.5 font-bold" style={{ color: NOHO_INK }}>
                {dollars(match.amountCents)} · paid {relTime(match.paidAtIso)}
              </p>
              <p className="text-[10px] mt-0.5 truncate" style={{ color: `${NOHO_INK}88` }}>
                ID {match.squarePaymentId.slice(0, 14)}…
                {match.receiptUrl && (
                  <>
                    {" · "}
                    <a
                      href={match.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                      style={{ color: NOHO_BLUE }}
                    >
                      view receipt ↗
                    </a>
                  </>
                )}
              </p>
            </div>
            <button
              onClick={onMarkPaid}
              disabled={isPending}
              className="text-[10px] font-black uppercase tracking-[0.10em] px-3 h-8 rounded-md text-white transition-colors disabled:opacity-50 shrink-0"
              style={{ background: NOHO_GREEN, border: `1px solid ${NOHO_GREEN}` }}
              title="Confirm + credit the wallet now"
            >
              Apply credit
            </button>
          </div>
        )}

        {/* Actions */}
        {!cancelled && r.status !== "Paid" && (
          <div className="mt-3 grid grid-cols-3 gap-1.5">
            <button
              onClick={onTextLink}
              disabled={isPending}
              title={r.userPhone ? `Text link to ${r.userPhone}` : "No phone on file"}
              className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.10em] px-2 h-8 rounded-md transition-colors disabled:opacity-50"
              style={{
                background: "#FFFFFF",
                color: NOHO_BLUE,
                border: `1px solid ${NOHO_BLUE}40`,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
              </svg>
              Text link
            </button>
            <button
              onClick={onMarkPaid}
              disabled={isPending}
              className="flex items-center justify-center gap-1 text-[10px] font-bold uppercase tracking-[0.10em] px-2 h-8 rounded-md text-white transition-colors disabled:opacity-50"
              style={{
                background: NOHO_INK,
                border: `1px solid ${NOHO_INK}`,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
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
        className="w-7 h-7 rounded-md flex items-center justify-center text-white font-bold text-[11px] shrink-0"
        style={{
          background: color,
          border: `1px solid ${color}`,
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
