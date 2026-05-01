"use client";

import { useRouter } from "next/navigation";
import { useTransition, useMemo, useState } from "react";
import { reviewKyc, assignMailbox } from "@/app/actions/admin";
import type { ComplianceRow } from "./types";

type Props = {
  complianceQueue: ComplianceRow[];
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";
const NOHO_RED = "#E70013";
const NOHO_CREAM = "#F7E6C2";

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
    ["#16A34A", "#166534"],
    [NOHO_RED, "#991b1b"],
  ];
  const [from, to] = PAIRS[h % PAIRS.length];
  return { from, to };
}

function relTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const d = Math.floor(ms / (1000 * 60 * 60 * 24));
  if (d <= 0) return "today";
  if (d === 1) return "1 day ago";
  if (d < 7) return `${d} days ago`;
  if (d < 30) return `${Math.floor(d / 7)}w ago`;
  return `${Math.floor(d / 30)}mo ago`;
}

const STATUS_META: Record<
  string,
  { label: string; color: string; tint: string; sub: string }
> = {
  Pending: {
    label: "Pending Review",
    color: NOHO_AMBER,
    tint: "rgba(245,166,35,0.10)",
    sub: "Awaiting CMRA review",
  },
  "Under Review": {
    label: "Under Review",
    color: NOHO_BLUE,
    tint: "rgba(51,116,133,0.10)",
    sub: "Officer reviewing",
  },
  Approved: {
    label: "Approved",
    color: "#16A34A",
    tint: "rgba(22,163,74,0.10)",
    sub: "1583 verified",
  },
  Rejected: {
    label: "Rejected",
    color: NOHO_RED,
    tint: "rgba(231,0,19,0.10)",
    sub: "Resubmission required",
  },
};

function getStatusMeta(status: string) {
  return STATUS_META[status] ?? STATUS_META.Pending;
}

function ComplianceCard({
  row,
  onAction,
  isPending,
}: {
  row: ComplianceRow;
  onAction: (action: "approve" | "reject" | "assign") => void;
  isPending: boolean;
}) {
  const { from, to } = huesFor(row.name);
  const meta = getStatusMeta(row.kycStatus);

  // Document completeness: 4 stages
  const stages = [
    { label: "Form 1583", done: !!row.kycForm1583Url, key: "form" },
    { label: "ID Image", done: !!row.kycIdImageUrl, key: "id" },
    { label: "KYC OK", done: row.kycStatus === "Approved", key: "kyc" },
    { label: "Mailbox", done: !!row.suiteNumber, key: "box" },
  ];
  const completedCount = stages.filter((s) => s.done).length;
  const completePct = (completedCount / stages.length) * 100;

  return (
    <div
      className="group rounded-2xl bg-white relative overflow-hidden transition-all hover:-translate-y-0.5"
      style={{
        border: `1px solid ${meta.color}33`,
        boxShadow:
          "0 1px 2px rgba(45,16,15,0.04), 0 8px 22px rgba(45,16,15,0.06)",
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
            {initials(row.name)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p
                  className="text-sm font-black truncate"
                  style={{ color: NOHO_INK }}
                >
                  {row.name}
                </p>
                <p
                  className="text-[11px] truncate"
                  style={{ color: `${NOHO_INK}99` }}
                >
                  {row.email}
                </p>
              </div>
              <span
                className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-md shrink-0"
                style={{ background: meta.tint, color: meta.color }}
              >
                {meta.label}
              </span>
            </div>

            {/* Meta pills row */}
            <div className="mt-2 flex flex-wrap gap-1.5 items-center">
              <span
                className="text-[10px] font-bold px-2 py-0.5 rounded-md"
                style={{
                  background: `${NOHO_INK}0d`,
                  color: NOHO_INK,
                }}
              >
                {row.plan ?? "Free"}
              </span>
              {row.suiteNumber && (
                <span
                  className="text-[10px] font-black px-2 py-0.5 rounded-md inline-flex items-center gap-1"
                  style={{
                    background: `${NOHO_BLUE}15`,
                    color: NOHO_BLUE_DEEP,
                  }}
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    <rect x="3" y="6" width="18" height="14" rx="1.5" />
                    <path d="M3 10h18" />
                  </svg>
                  Suite #{row.suiteNumber}
                </span>
              )}
              <span
                className="text-[10px] font-medium px-2 py-0.5 rounded-md ml-auto"
                style={{ color: `${NOHO_INK}77` }}
              >
                Submitted {relTime(row.createdAt)}
              </span>
            </div>
          </div>
        </div>

        {/* Document completeness ladder */}
        <div className="mt-3 rounded-lg p-2.5" style={{ background: `${NOHO_CREAM}55` }}>
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] font-black uppercase tracking-wider"
              style={{ color: NOHO_INK }}
            >
              CMRA Compliance Track
            </span>
            <span
              className="text-[10px] font-black"
              style={{ color: completedCount === 4 ? "#16A34A" : NOHO_AMBER }}
            >
              {completedCount}/4
            </span>
          </div>

          {/* Progress rail */}
          <div className="relative h-1.5 rounded-full overflow-hidden mb-2" style={{ background: `${NOHO_INK}11` }}>
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all"
              style={{
                width: `${completePct}%`,
                background: completedCount === 4
                  ? `linear-gradient(90deg, #16A34A 0%, #22C55E 100%)`
                  : `linear-gradient(90deg, ${NOHO_AMBER} 0%, ${NOHO_BLUE} 100%)`,
              }}
            />
          </div>

          {/* Stage chips */}
          <div className="grid grid-cols-4 gap-1">
            {stages.map((s) => (
              <div
                key={s.key}
                className="flex items-center gap-1 text-[9px] font-bold"
                style={{
                  color: s.done ? "#16A34A" : `${NOHO_INK}66`,
                }}
              >
                <div
                  className="w-3 h-3 rounded-full flex items-center justify-center shrink-0"
                  style={{
                    background: s.done ? "#16A34A" : `${NOHO_INK}11`,
                  }}
                >
                  {s.done ? (
                    <svg
                      width="8"
                      height="8"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3.5"
                    >
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    <span className="w-1 h-1 rounded-full" style={{ background: `${NOHO_INK}55` }} />
                  )}
                </div>
                <span className="truncate uppercase tracking-wider">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Document attachments */}
        {(row.kycForm1583Url || row.kycIdImageUrl) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {row.kycForm1583Url && (
              <a
                href={row.kycForm1583Url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors"
                style={{
                  background: `${NOHO_INK}08`,
                  color: NOHO_INK,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="9" y1="15" x2="15" y2="15" />
                  <line x1="9" y1="11" x2="15" y2="11" />
                </svg>
                Form 1583
              </a>
            )}
            {row.kycIdImageUrl && (
              <a
                href={row.kycIdImageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors"
                style={{
                  background: `${NOHO_INK}08`,
                  color: NOHO_INK,
                }}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <rect x="3" y="4" width="18" height="16" rx="2" />
                  <circle cx="8.5" cy="10" r="2" />
                  <path d="M21 17l-5-5L5 21" />
                </svg>
                Photo ID
              </a>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <button
            disabled={isPending}
            onClick={() => onAction("approve")}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-lg text-white transition-all hover:shadow-md disabled:opacity-50"
            style={{
              background: `linear-gradient(180deg, #16A34A 0%, #15803d 100%)`,
              boxShadow: "0 2px 6px rgba(22,163,74,0.30)",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Approve
          </button>
          <button
            disabled={isPending}
            onClick={() => onAction("reject")}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-lg text-white transition-all hover:shadow-md disabled:opacity-50"
            style={{
              background: `linear-gradient(180deg, ${NOHO_RED} 0%, #991b1b 100%)`,
              boxShadow: `0 2px 6px ${NOHO_RED}40`,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            Reject
          </button>
          <button
            disabled={isPending}
            onClick={() => onAction("assign")}
            className="flex-1 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-lg text-white transition-all hover:shadow-md disabled:opacity-50"
            style={{
              background: `linear-gradient(180deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)`,
              boxShadow: `0 2px 6px ${NOHO_BLUE}40`,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <rect x="3" y="6" width="18" height="14" rx="1.5" />
              <path d="M3 10h18" />
            </svg>
            Assign
          </button>
        </div>
      </div>
    </div>
  );
}

export function AdminCompliancePanel({ complianceQueue }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const stats = useMemo(() => {
    const total = complianceQueue.length;
    const pending = complianceQueue.filter(
      (r) => r.kycStatus === "Pending" || r.kycStatus === "Under Review"
    ).length;
    const approved = complianceQueue.filter((r) => r.kycStatus === "Approved").length;
    const rejected = complianceQueue.filter((r) => r.kycStatus === "Rejected").length;
    const withMailbox = complianceQueue.filter((r) => !!r.suiteNumber).length;
    const docComplete = complianceQueue.filter(
      (r) => r.kycForm1583Url && r.kycIdImageUrl
    ).length;
    return { total, pending, approved, rejected, withMailbox, docComplete };
  }, [complianceQueue]);

  const filtered = useMemo(() => {
    if (filter === "all") return complianceQueue;
    if (filter === "pending")
      return complianceQueue.filter(
        (r) => r.kycStatus === "Pending" || r.kycStatus === "Under Review"
      );
    if (filter === "approved")
      return complianceQueue.filter((r) => r.kycStatus === "Approved");
    if (filter === "rejected")
      return complianceQueue.filter((r) => r.kycStatus === "Rejected");
    return complianceQueue;
  }, [complianceQueue, filter]);

  function handleAction(rowId: string, action: "approve" | "reject" | "assign", row: ComplianceRow) {
    if (action === "approve") {
      startTransition(async () => {
        await reviewKyc(rowId, "Approved");
        router.refresh();
      });
    } else if (action === "reject") {
      const note = window.prompt("Reason for rejection:") ?? undefined;
      startTransition(async () => {
        await reviewKyc(rowId, "Rejected", note);
        router.refresh();
      });
    } else if (action === "assign") {
      const suite = window.prompt("Assign suite number:", row.suiteNumber ?? "");
      if (!suite) return;
      startTransition(async () => {
        const res = await assignMailbox(rowId, suite);
        if (res?.error) alert(res.error);
        router.refresh();
      });
    }
  }

  return (
    <div className="space-y-5">
      {/* Hero strip — CMRA compliance theme */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${NOHO_BLUE_DEEP} 0%, ${NOHO_BLUE} 50%, #1F4554 100%)`,
          boxShadow: "0 8px 28px rgba(35,89,106,0.30)",
        }}
      >
        {/* Stamp pattern decoration */}
        <div
          className="absolute inset-0 opacity-[0.07] pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 30%, white 1px, transparent 1px), radial-gradient(circle at 80% 70%, white 1px, transparent 1px)`,
            backgroundSize: "32px 32px, 24px 24px",
          }}
        />
        {/* Corner stamp */}
        <div
          className="absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-15 pointer-events-none"
          style={{
            border: `4px dashed ${NOHO_CREAM}`,
          }}
        />
        <div
          className="absolute right-6 top-6 w-20 h-20 rounded-full opacity-15 flex items-center justify-center pointer-events-none"
          style={{
            border: `3px solid ${NOHO_CREAM}`,
          }}
        >
          <span
            className="text-[8px] font-black uppercase tracking-[0.2em] text-center leading-tight"
            style={{ color: NOHO_CREAM }}
          >
            USPS<br />Form 1583<br />CMRA
          </span>
        </div>

        <div className="relative p-6">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{ background: "#10B981" }}
            />
            <span
              className="text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ color: NOHO_CREAM }}
            >
              CMRA Compliance · Live
            </span>
          </div>
          <h2
            className="font-black tracking-tight mb-1"
            style={{
              fontFamily: "var(--font-baloo, system-ui)",
              fontSize: "clamp(1.5rem, 3vw, 2rem)",
              color: "white",
              textShadow: "0 2px 8px rgba(0,0,0,0.20)",
            }}
          >
            KYC &amp; Onboarding Control
          </h2>
          <p className="text-[12px] font-medium max-w-md" style={{ color: `${NOHO_CREAM}cc` }}>
            Review identity verification, approve Form 1583 submissions, and assign suite
            numbers for new mailbox holders.
          </p>
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiTile label="Total Queue" value={stats.total} accent={NOHO_INK} />
        <KpiTile label="Pending" value={stats.pending} accent={NOHO_AMBER} pulse={stats.pending > 0} />
        <KpiTile label="Approved" value={stats.approved} accent="#16A34A" />
        <KpiTile label="Rejected" value={stats.rejected} accent={NOHO_RED} />
        <KpiTile label="With Suite" value={stats.withMailbox} accent={NOHO_BLUE} />
      </div>

      {/* Filter tabs */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {([
          ["all", "All", stats.total],
          ["pending", "Pending", stats.pending],
          ["approved", "Approved", stats.approved],
          ["rejected", "Rejected", stats.rejected],
        ] as const).map(([key, label, n]) => (
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

      {/* Card grid */}
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
              <path d="M9 11l3 3L22 4" />
              <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
            </svg>
          </div>
          <p className="text-sm font-black" style={{ color: NOHO_INK }}>
            {filter === "all"
              ? "No KYC submissions in queue"
              : `No ${filter} submissions`}
          </p>
          <p className="text-[11px] mt-1" style={{ color: `${NOHO_INK}88` }}>
            New customer KYC submissions will appear here for review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map((row) => (
            <ComplianceCard
              key={row.id}
              row={row}
              isPending={isPending}
              onAction={(action) => handleAction(row.id, action, row)}
            />
          ))}
        </div>
      )}
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
      {/* Top accent line */}
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
          fontSize: "1.5rem",
          color: accent,
        }}
      >
        {value}
      </div>
    </div>
  );
}
