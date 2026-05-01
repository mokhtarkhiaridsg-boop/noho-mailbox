"use client";

import { useEffect, useMemo, useState } from "react";
import { adminGetEmailLogs, adminGetEmailBody } from "@/app/actions/admin";

type Row = {
  id: string;
  userId: string | null;
  toEmail: string;
  subject: string;
  kind: string;
  status: string;
  provider: string | null;
  error: string | null;
  createdAt: string | Date;
  sentAt: string | Date | null;
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";

// Per-status styling (ring color + label + fill).
function statusVisuals(status: string) {
  if (status === "sent")
    return { color: "#16A34A", label: "Sent", bg: "rgba(22,163,74,0.12)", glow: true };
  if (status === "failed")
    return { color: "#dc2626", label: "Failed", bg: "rgba(220,38,38,0.12)", glow: true };
  if (status === "bounced")
    return { color: NOHO_AMBER, label: "Bounced", bg: "rgba(245,166,35,0.12)", glow: true };
  if (status === "not_sent")
    return { color: NOHO_AMBER, label: "Not Sent", bg: "rgba(245,166,35,0.12)", glow: false };
  return { color: NOHO_BLUE, label: "Queued", bg: "rgba(51,116,133,0.12)", glow: false };
}

// Per-kind icon + label + accent. Single-source visual identity for every
// email type that flows through the system.
function kindVisuals(kind: string): {
  label: string;
  accent: string;
  icon: React.ReactNode;
} {
  const k = (kind || "").toLowerCase();
  if (k.includes("password") || k.includes("reset"))
    return {
      label: "Password reset",
      accent: "#7C3AED",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="5" y="11" width="14" height="9" rx="1.5" />
          <path d="M8 11 L8 8 a4 4 0 0 1 8 0 L16 11" />
        </svg>
      ),
    };
  if (k.includes("mail_arrived") || k.includes("mail-arrived"))
    return {
      label: "Mail arrived",
      accent: NOHO_BLUE,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 8 L12 14 L21 8" />
        </svg>
      ),
    };
  if (k.includes("receipt") || k.includes("renewal"))
    return {
      label: "Receipt",
      accent: "#16A34A",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <path d="M5 3 L5 21 L8 19 L11 21 L14 19 L17 21 L19 19 L19 3 Z" />
          <path d="M8 8 L16 8 M8 12 L16 12 M8 16 L13 16" strokeLinecap="round" />
        </svg>
      ),
    };
  if (k.includes("welcome") || k.includes("signup") || k.includes("confirmation"))
    return {
      label: "Welcome",
      accent: NOHO_AMBER,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 L14.5 9 L21 9.5 L16 14 L17.5 21 L12 17.5 L6.5 21 L8 14 L3 9.5 L9.5 9 Z" />
        </svg>
      ),
    };
  if (k.includes("kyc") || k.includes("compliance"))
    return {
      label: "KYC / compliance",
      accent: NOHO_INK,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 3 L20 6 L20 13 C20 17 16 20 12 21 C8 20 4 17 4 13 L4 6 Z" />
          <path d="M9 12 L11 14 L15 10" />
        </svg>
      ),
    };
  if (k.includes("contact") || k.includes("alert") || k.includes("notification"))
    return {
      label: "Notification",
      accent: NOHO_BLUE_DEEP,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8 A6 6 0 0 0 6 8 c0 7-3 9-3 9 h18 s-3-2-3-9" />
          <path d="M13.7 21 a2 2 0 0 1 -3.4 0" />
        </svg>
      ),
    };
  if (k.includes("payment") || k.includes("invoice") || k.includes("square"))
    return {
      label: "Payment",
      accent: "#16A34A",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
          <rect x="3" y="6" width="18" height="12" rx="2" />
          <path d="M3 10 L21 10" />
          <path d="M7 14 L11 14" strokeLinecap="round" />
        </svg>
      ),
    };
  return {
    label: kind || "other",
    accent: "#5C4540",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
        <path d="M5 4 L19 4 L19 20 L5 20 Z" />
        <path d="M8 8 L16 8 M8 12 L16 12 M8 16 L13 16" strokeLinecap="round" />
      </svg>
    ),
  };
}

function extractFirstUrl(html: string | null): string | null {
  if (!html) return null;
  const m = html.match(/https?:\/\/[^"'\s<>]+/);
  return m ? m[0] : null;
}

function fmtTime(d: string | Date | null): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function dayKey(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric", year: "numeric" });
}

function relativeDay(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });
}

export function AdminEmailLogsPanel() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "failed" | "sent" | "not_sent">("all");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    adminGetEmailLogs({ limit: 200 })
      .then((data) => {
        if (!cancelled) setRows(data as Row[]);
      })
      .catch((e) => !cancelled && setErr(e instanceof Error ? e.message : "Failed to load"));
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = rows?.filter((r) => (filter === "all" ? true : r.status === filter));

  // Group by day for timeline rendering. Days sorted newest-first.
  const grouped = useMemo(() => {
    if (!filtered) return [];
    const map = new Map<string, Row[]>();
    for (const r of filtered) {
      const k = dayKey(r.sentAt ?? r.createdAt);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(r);
    }
    return Array.from(map.entries()).sort(([, a], [, b]) => {
      const ta = new Date(a[0].sentAt ?? a[0].createdAt).getTime();
      const tb = new Date(b[0].sentAt ?? b[0].createdAt).getTime();
      return tb - ta;
    });
  }, [filtered]);

  async function copyLink(logId: string) {
    const log = await adminGetEmailBody(logId);
    if (!log) return;
    const url = extractFirstUrl(log.body) ?? "";
    if (!url) {
      alert("No URL found in this email.");
      return;
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(logId);
      setTimeout(() => setCopied(null), 2000);
    } catch {
      window.prompt("Copy this link:", url);
    }
  }

  // KPIs
  const totalCount = rows?.length ?? 0;
  const sentCount = rows?.filter((r) => r.status === "sent").length ?? 0;
  const failedCount = rows?.filter((r) => r.status === "failed").length ?? 0;
  const notSentCount = rows?.filter((r) => r.status === "not_sent").length ?? 0;
  const todayCount = rows?.filter((r) => {
    const d = new Date(r.sentAt ?? r.createdAt);
    return d.toDateString() === new Date().toDateString();
  }).length ?? 0;
  const failedOrNotSent = failedCount + notSentCount;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-black text-lg uppercase tracking-wide" style={{ color: NOHO_INK }}>
            Email Delivery Log
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.5)" }}>
            {totalCount} recent · {todayCount} today · {failedOrNotSent > 0 ? (
              <span className="font-bold text-amber-700">{failedOrNotSent} need attention</span>
            ) : (
              "all delivered"
            )}
          </p>
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {(["all", "sent", "failed", "not_sent"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="text-[10px] font-black uppercase tracking-[0.16em] px-3 py-1.5 rounded-lg transition-all"
              style={{
                background: filter === f ? NOHO_BLUE : "white",
                color: filter === f ? "white" : "rgba(45,16,15,0.6)",
                border: filter === f ? `1px solid ${NOHO_BLUE_DEEP}` : "1px solid rgba(232,229,224,0.7)",
                boxShadow: filter === f ? `0 4px 12px ${NOHO_BLUE}33` : undefined,
              }}
              aria-pressed={filter === f}
            >
              {f === "not_sent" ? "Not Sent" : f}
            </button>
          ))}
        </div>
      </div>

      {/* KPI tiles */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile label="Total" value={String(totalCount)} sub="Last 200" />
        <KpiTile label="Sent" value={String(sentCount)} sub={`${todayCount} today`} accent />
        <KpiTile label="Failed" value={String(failedCount)} sub={failedCount > 0 ? "Action needed" : "All clear"} danger={failedCount > 0} />
        <KpiTile label="Not sent" value={String(notSentCount)} sub="Provider unconfigured" />
      </div>

      {err ? (
        <div
          className="rounded-2xl p-6 text-center"
          style={{
            background: "rgba(220,38,38,0.06)",
            border: "1px solid rgba(220,38,38,0.18)",
            color: "#dc2626",
          }}
        >
          {err}
        </div>
      ) : rows === null ? (
        <div
          className="rounded-2xl bg-white px-5 py-12 text-center text-sm"
          style={{
            color: "rgba(45,16,15,0.4)",
            boxShadow: "0 1px 3px rgba(26,23,20,0.04)",
          }}
        >
          Loading email log…
        </div>
      ) : filtered && filtered.length === 0 ? (
        <div
          className="rounded-2xl bg-white px-5 py-12 text-center text-sm"
          style={{
            color: "rgba(45,16,15,0.4)",
            boxShadow: "0 1px 3px rgba(26,23,20,0.04)",
          }}
        >
          No emails match this filter.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map(([dayLabel, items]) => {
            const firstDate = new Date(items[0].sentAt ?? items[0].createdAt);
            return (
              <section key={dayLabel}>
                {/* Day header — sticky-ish, bold */}
                <div className="flex items-baseline gap-2 mb-3 px-1">
                  <h3
                    className="text-[11px] font-black uppercase tracking-[0.18em]"
                    style={{ color: NOHO_INK }}
                  >
                    {relativeDay(firstDate)}
                  </h3>
                  <span className="text-[10px]" style={{ color: "rgba(45,16,15,0.4)" }}>
                    · {items.length} email{items.length === 1 ? "" : "s"} · {dayLabel}
                  </span>
                </div>

                {/* Timeline rail */}
                <div className="relative pl-6">
                  <div
                    aria-hidden="true"
                    className="absolute left-2 top-2 bottom-2 w-px"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(45,16,15,0.18) 0%, rgba(45,16,15,0.05) 100%)",
                    }}
                  />
                  <ul className="space-y-2">
                    {items.map((r) => {
                      const sv = statusVisuals(r.status);
                      const kv = kindVisuals(r.kind);
                      return (
                        <li
                          key={r.id}
                          className="relative rounded-xl bg-white p-3 transition-all hover:shadow-md"
                          style={{
                            border: "1px solid rgba(232,229,224,0.7)",
                            boxShadow: "0 1px 2px rgba(45,16,15,0.04)",
                          }}
                        >
                          {/* Status node on the rail */}
                          <span
                            aria-hidden="true"
                            className="absolute -left-[18px] top-4 w-3 h-3 rounded-full ring-2 ring-white"
                            style={{
                              background: sv.color,
                              boxShadow: sv.glow ? `0 0 0 3px ${sv.color}22, 0 0 8px ${sv.color}55` : undefined,
                            }}
                          />

                          <div className="flex items-start gap-3">
                            {/* Kind icon tile */}
                            <span
                              aria-hidden="true"
                              className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                              style={{
                                background: `${kv.accent}10`,
                                color: kv.accent,
                                border: `1px solid ${kv.accent}22`,
                              }}
                            >
                              <span className="w-4 h-4 inline-flex items-center justify-center">
                                {kv.icon}
                              </span>
                            </span>

                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between gap-2 flex-wrap">
                                <div className="min-w-0 flex-1">
                                  <p
                                    className="text-[13px] font-black truncate"
                                    style={{ color: NOHO_INK }}
                                  >
                                    {r.subject}
                                  </p>
                                  <p
                                    className="text-[11px] truncate"
                                    style={{ color: "rgba(45,16,15,0.5)" }}
                                  >
                                    To {r.toEmail}
                                  </p>
                                </div>
                                <span
                                  className="shrink-0 text-[10px] font-bold"
                                  style={{ color: "rgba(45,16,15,0.4)", fontVariantNumeric: "tabular-nums" }}
                                >
                                  {fmtTime(r.sentAt ?? r.createdAt)}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                                <span
                                  className="text-[9px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-md inline-flex items-center gap-1"
                                  style={{
                                    background: sv.bg,
                                    color: sv.color,
                                  }}
                                >
                                  <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full" style={{ background: sv.color }} />
                                  {sv.label}
                                </span>
                                <span
                                  className="text-[9px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-md"
                                  style={{ background: `${kv.accent}10`, color: kv.accent }}
                                >
                                  {kv.label}
                                </span>
                                {r.provider && (
                                  <span
                                    className="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                                    style={{
                                      background: "rgba(232,229,224,0.6)",
                                      color: "rgba(45,16,15,0.55)",
                                    }}
                                  >
                                    via {r.provider}
                                  </span>
                                )}
                                {r.error && (
                                  <span
                                    className="text-[9px] font-bold px-1.5 py-0.5 rounded-md max-w-[260px] truncate"
                                    style={{
                                      background: "rgba(220,38,38,0.10)",
                                      color: "#a51b1b",
                                    }}
                                    title={r.error}
                                  >
                                    {r.error}
                                  </span>
                                )}
                                <button
                                  onClick={() => copyLink(r.id)}
                                  className="ml-auto text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md transition"
                                  style={{
                                    background: copied === r.id ? "rgba(22,163,74,0.10)" : "rgba(51,116,133,0.10)",
                                    color: copied === r.id ? "#16A34A" : NOHO_BLUE_DEEP,
                                  }}
                                  title="Copy reset/activation link from email body"
                                >
                                  {copied === r.id ? "✓ Copied" : "Copy Link"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function KpiTile({
  label,
  value,
  sub,
  accent,
  danger,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
  danger?: boolean;
}) {
  const isAccent = accent && !danger;
  const isDanger = danger;
  return (
    <div
      className="rounded-2xl p-4 transition-all hover:-translate-y-0.5"
      style={{
        background: isAccent
          ? `linear-gradient(135deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)`
          : isDanger
          ? "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)"
          : "white",
        boxShadow: isAccent
          ? `0 8px 24px ${NOHO_BLUE}33, inset 0 1px 0 rgba(255,255,255,0.18)`
          : isDanger
          ? "0 8px 24px rgba(220,38,38,0.32), inset 0 1px 0 rgba(255,255,255,0.18)"
          : "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)",
        border: isAccent || isDanger ? "1px solid rgba(247,230,194,0.18)" : "1px solid rgba(232,221,208,0.5)",
      }}
    >
      <p
        className="text-[10px] font-black uppercase tracking-[0.16em]"
        style={{ color: isAccent || isDanger ? "rgba(255,255,255,0.55)" : "rgba(45,16,15,0.45)" }}
      >
        {label}
      </p>
      <p
        className="text-2xl sm:text-3xl font-black tracking-tight mt-1"
        style={{
          color: isAccent || isDanger ? "white" : NOHO_INK,
          fontFamily: "var(--font-baloo), sans-serif",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="text-[10px] font-bold mt-1"
          style={{ color: isAccent || isDanger ? "rgba(255,255,255,0.6)" : NOHO_BLUE }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}
