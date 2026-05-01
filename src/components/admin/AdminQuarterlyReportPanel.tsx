"use client";

/**
 * Quarterly Statements — bulk report.
 * Admin picks year + quarter, sees every active customer with their statement
 * status, can lazy-generate missing ones, view all in a single click, open
 * each on its own tab, or sweep the whole quarter.
 */
import { useEffect, useState, useTransition, useMemo } from "react";
import {
  ensureCurrentQuarterForAllCustomers,
  getStatementsForQuarter,
  regenerateQuarterlyStatement,
  scrubV1QuarterlyStatementSnapshots,
} from "@/app/actions/compliance";

type Row = Awaited<ReturnType<typeof getStatementsForQuarter>>[number];

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";
const NOHO_RED = "#E70013";
const NOHO_CREAM = "#F7E6C2";
const NOHO_GREEN = "#16A34A";

const CURRENT_YEAR = new Date().getFullYear();
const CURRENT_Q = Math.floor(new Date().getMonth() / 3) + 1;

const QUARTER_META: Record<number, { range: string; emoji: string }> = {
  1: { range: "Jan – Mar", emoji: "❄️" },
  2: { range: "Apr – Jun", emoji: "🌱" },
  3: { range: "Jul – Sep", emoji: "☀️" },
  4: { range: "Oct – Dec", emoji: "🍂" },
};

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

export function AdminQuarterlyReportPanel() {
  const [year, setYear] = useState<number>(CURRENT_YEAR);
  const [quarter, setQuarter] = useState<number>(CURRENT_Q);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "missing" | "ok">("all");

  async function load() {
    setLoading(true);
    setMsg(null);
    try {
      const data = await getStatementsForQuarter(year, quarter, { auto: true });
      setRows(data);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, quarter]);

  const stats = useMemo(() => {
    const all = rows ?? [];
    const total = all.length;
    const ok = all.filter((r) => !!r.statementId).length;
    const missing = total - ok;
    const business = all.filter((r) => r.boxType === "Business").length;
    const personal = total - business;
    const completeness = total > 0 ? Math.round((ok / total) * 100) : 0;
    return { total, ok, missing, business, personal, completeness };
  }, [rows]);

  const filtered = useMemo(
    () =>
      (rows ?? []).filter((r) => {
        if (filter === "missing") return !r.statementId;
        if (filter === "ok") return !!r.statementId;
        return true;
      }),
    [rows, filter],
  );

  function handleGenerateAll() {
    startTransition(async () => {
      const res = (await ensureCurrentQuarterForAllCustomers()) as {
        success?: boolean;
        created?: number;
        total?: number;
        error?: string;
      };
      if (res.error) setMsg({ ok: false, text: res.error });
      else
        setMsg({
          ok: true,
          text: `Generated ${res.created ?? 0} new of ${res.total ?? 0} customers`,
        });
      await load();
    });
  }

  function handleRefresh(r: Row) {
    startTransition(async () => {
      await regenerateQuarterlyStatement(r.userId, year, quarter);
      await load();
    });
  }

  function handleScrubV1() {
    if (
      !confirm(
        "Scrub v1 PII from all quarterly snapshots?\n\n" +
          "This rewrites old snapshots that stored full DL/passport numbers. " +
          "After this run, snapshots keep only last-four + a SHA-256 hash. " +
          "Idempotent — safe to re-run.",
      )
    )
      return;
    startTransition(async () => {
      const res = await scrubV1QuarterlyStatementSnapshots();
      if ("error" in res && res.error) {
        setMsg({ ok: false, text: `Scrub failed: ${res.error}` });
        return;
      }
      setMsg({
        ok: true,
        text: `Scrub complete · ${res.scrubbed} rewritten · ${res.alreadyV2} already v2 · ${res.unparseable} unparseable · ${res.errors} errors`,
      });
      await load();
    });
  }

  function openAllInTabs() {
    const ids = filtered.map((r) => r.statementId).filter(Boolean) as string[];
    if (ids.length === 0) return;
    if (ids.length > 25 && !confirm(`Open ${ids.length} statements in new tabs?`)) return;
    ids.forEach((id) => {
      window.open(`/admin/statements/${id}`, "_blank", "noopener,noreferrer");
    });
  }

  const qmeta = QUARTER_META[quarter];

  return (
    <div className="space-y-5">
      {/* Hero strip */}
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: `linear-gradient(135deg, ${NOHO_BLUE_DEEP} 0%, ${NOHO_BLUE} 50%, #1F4554 100%)`,
          boxShadow: "0 8px 28px rgba(35,89,106,0.30)",
        }}
      >
        {/* Pattern */}
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 25% 30%, white 1.2px, transparent 1.2px), radial-gradient(circle at 75% 75%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px, 28px 28px",
          }}
        />
        {/* Filing-cabinet corner */}
        <div className="absolute right-6 top-6 opacity-15 pointer-events-none">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke={NOHO_CREAM} strokeWidth="1.2">
            <rect x="3" y="3" width="18" height="6" rx="1" />
            <rect x="3" y="9" width="18" height="6" rx="1" />
            <rect x="3" y="15" width="18" height="6" rx="1" />
            <line x1="9" y1="6" x2="15" y2="6" />
            <line x1="9" y1="12" x2="15" y2="12" />
            <line x1="9" y1="18" x2="15" y2="18" />
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
              CMRA Compliance · State Filings
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
            Quarterly Statements
          </h2>
          <p className="text-[12px] font-medium max-w-md" style={{ color: `${NOHO_CREAM}cc` }}>
            Auto-generated for every active customer · Q1 = Jan–Mar, Q2 = Apr–Jun, Q3 = Jul–Sep,
            Q4 = Oct–Dec
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={handleGenerateAll}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all hover:scale-105 disabled:opacity-50"
              style={{
                background: NOHO_CREAM,
                color: NOHO_INK,
                boxShadow: `0 4px 14px ${NOHO_CREAM}66`,
              }}
              title="Sweep — generate any missing snapshots for the current quarter"
            >
              {isPending ? (
                <>
                  <div
                    className="w-2.5 h-2.5 rounded-full animate-pulse"
                    style={{ background: NOHO_BLUE }}
                  />
                  Sweeping…
                </>
              ) : (
                <>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path d="M21 12a9 9 0 1 1-9-9c2.5 0 4.8 1 6.5 2.7" />
                    <polyline points="21 5 21 12 14 12" />
                  </svg>
                  Generate Current Q
                </>
              )}
            </button>
            <button
              onClick={openAllInTabs}
              disabled={!filtered.some((r) => r.statementId)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50"
              style={{
                background: `${NOHO_CREAM}1a`,
                color: NOHO_CREAM,
                border: `1px solid ${NOHO_CREAM}33`,
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M14 4h6v6 M21 3l-9 9 M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6" />
              </svg>
              Open all in tabs
            </button>
            <button
              onClick={handleScrubV1}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all disabled:opacity-50 ml-auto"
              style={{
                background: `${NOHO_RED}1a`,
                color: "#fecaca",
                border: `1px solid ${NOHO_RED}66`,
              }}
              title="One-time PII migration — rewrite v1 snapshots to mask full DL/passport numbers"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M3 6h18 M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6 M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <line x1="10" y1="11" x2="10" y2="17" />
                <line x1="14" y1="11" x2="14" y2="17" />
              </svg>
              Scrub v1 PII
            </button>
          </div>
        </div>
      </div>

      {msg && (
        <div
          className="rounded-xl px-4 py-2.5 text-xs font-bold flex items-center gap-2"
          style={{
            background: msg.ok ? `${NOHO_GREEN}10` : `${NOHO_RED}10`,
            color: msg.ok ? NOHO_GREEN : NOHO_RED,
            borderLeft: `3px solid ${msg.ok ? NOHO_GREEN : NOHO_RED}`,
          }}
        >
          {msg.ok ? "✓" : "⚠"} {msg.text}
        </div>
      )}

      {/* Period picker + KPIs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Period picker — 1 col */}
        <div
          className="rounded-2xl bg-white p-4"
          style={{
            border: `1px solid ${NOHO_INK}11`,
            boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 4px 12px rgba(45,16,15,0.04)",
          }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span
              className="text-[10px] font-black uppercase tracking-[0.15em]"
              style={{ color: NOHO_INK }}
            >
              Reporting Period
            </span>
            <span
              className="ml-auto text-[10px] font-bold inline-flex items-center gap-1"
              style={{ color: `${NOHO_INK}66` }}
            >
              <span className="text-[14px] leading-none">{qmeta.emoji}</span>
              {qmeta.range}
            </span>
          </div>

          <div className="space-y-2">
            <div>
              <label
                className="block text-[9px] font-black uppercase tracking-[0.15em] mb-1"
                style={{ color: `${NOHO_INK}66` }}
              >
                Year
              </label>
              <select
                value={year}
                onChange={(e) => setYear(parseInt(e.target.value))}
                className="w-full rounded-lg px-3 py-2 text-sm font-black focus:outline-none focus:ring-2 transition-all"
                style={{
                  border: `1px solid ${NOHO_INK}22`,
                  background: `${NOHO_CREAM}33`,
                  color: NOHO_INK,
                }}
              >
                {[CURRENT_YEAR - 2, CURRENT_YEAR - 1, CURRENT_YEAR, CURRENT_YEAR + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                className="block text-[9px] font-black uppercase tracking-[0.15em] mb-1"
                style={{ color: `${NOHO_INK}66` }}
              >
                Quarter
              </label>
              <div className="grid grid-cols-4 gap-1">
                {[1, 2, 3, 4].map((q) => (
                  <button
                    key={q}
                    onClick={() => setQuarter(q)}
                    className="px-2 py-2 rounded-lg text-[10px] font-black transition-all"
                    style={{
                      background:
                        quarter === q
                          ? `linear-gradient(180deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)`
                          : `${NOHO_INK}08`,
                      color: quarter === q ? "white" : NOHO_INK,
                      boxShadow: quarter === q ? `0 2px 6px ${NOHO_BLUE}40` : "none",
                    }}
                  >
                    Q{q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* KPIs — 2 cols */}
        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile label="Customers" value={stats.total} accent={NOHO_INK} />
          <KpiTile label="On File" value={stats.ok} accent={NOHO_GREEN} />
          <KpiTile
            label="Missing"
            value={stats.missing}
            accent={NOHO_RED}
            pulse={stats.missing > 0}
          />
          <KpiTile label="Compliance" value={`${stats.completeness}%`} accent={NOHO_BLUE} />
        </div>
      </div>

      {/* Compliance bar */}
      {stats.total > 0 && (
        <div
          className="rounded-2xl p-4 bg-white"
          style={{
            border: `1px solid ${NOHO_INK}11`,
            boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 4px 12px rgba(45,16,15,0.04)",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <span
              className="text-[10px] font-black uppercase tracking-[0.15em]"
              style={{ color: NOHO_INK }}
            >
              Q{quarter} {year} Completeness
            </span>
            <span
              className="text-[10px] font-black"
              style={{
                color:
                  stats.completeness === 100
                    ? NOHO_GREEN
                    : stats.completeness > 75
                      ? NOHO_AMBER
                      : NOHO_RED,
              }}
            >
              {stats.ok} / {stats.total}
            </span>
          </div>
          <div
            className="relative h-2 rounded-full overflow-hidden"
            style={{ background: `${NOHO_INK}08` }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all"
              style={{
                width: `${stats.completeness}%`,
                background:
                  stats.completeness === 100
                    ? `linear-gradient(90deg, ${NOHO_GREEN} 0%, #22C55E 100%)`
                    : stats.completeness > 75
                      ? `linear-gradient(90deg, ${NOHO_AMBER} 0%, ${NOHO_GREEN} 100%)`
                      : `linear-gradient(90deg, ${NOHO_RED} 0%, ${NOHO_AMBER} 100%)`,
              }}
            />
          </div>
        </div>
      )}

      {/* Filter pills */}
      <div className="flex flex-wrap gap-1.5 items-center">
        {(
          [
            ["all", "All", stats.total],
            ["ok", "On file", stats.ok],
            ["missing", "Missing", stats.missing],
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

      {/* List */}
      {loading ? (
        <div
          className="rounded-2xl p-10 text-center text-sm bg-white"
          style={{ border: `1px solid ${NOHO_INK}11`, color: `${NOHO_INK}66` }}
        >
          <div className="inline-flex items-center gap-2 font-bold">
            <div
              className="w-3 h-3 rounded-full animate-pulse"
              style={{ background: NOHO_BLUE }}
            />
            Loading Q{quarter} {year}…
          </div>
        </div>
      ) : filtered.length === 0 ? (
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
              <rect x="3" y="3" width="18" height="6" rx="1" />
              <rect x="3" y="9" width="18" height="6" rx="1" />
              <rect x="3" y="15" width="18" height="6" rx="1" />
            </svg>
          </div>
          <p className="text-sm font-black" style={{ color: NOHO_INK }}>
            {(rows?.length ?? 0) === 0 ? "No active customers" : "Nothing matches this filter"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {filtered.map((r) => (
            <StatementRow
              key={r.userId}
              r={r}
              isPending={isPending}
              onRefresh={() => handleRefresh(r)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function StatementRow({
  r,
  isPending,
  onRefresh,
}: {
  r: Row;
  isPending: boolean;
  onRefresh: () => void;
}) {
  const { from, to } = huesFor(r.userName);
  const onFile = !!r.statementId;
  const accent = onFile ? NOHO_GREEN : NOHO_RED;

  return (
    <div
      className="rounded-xl bg-white relative overflow-hidden transition-all hover:-translate-y-0.5"
      style={{
        border: `1px solid ${accent}22`,
        boxShadow: "0 1px 2px rgba(45,16,15,0.04), 0 4px 12px rgba(45,16,15,0.04)",
      }}
    >
      <div
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{
          background: `linear-gradient(180deg, ${accent} 0%, ${accent}66 100%)`,
        }}
      />

      <div className="p-3 pl-4 flex items-center gap-3">
        {/* Monogram */}
        <div
          className="w-10 h-10 rounded-lg shrink-0 flex items-center justify-center text-white font-black text-xs"
          style={{
            background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
            boxShadow: `0 3px 8px ${from}55`,
          }}
        >
          {initials(r.userName)}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="text-[13px] font-black truncate" style={{ color: NOHO_INK }}>
              {r.userName}
            </p>
            {r.suiteNumber && (
              <span
                className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md inline-flex items-center gap-1"
                style={{ background: `${NOHO_BLUE}15`, color: NOHO_BLUE_DEEP }}
              >
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="3" y="6" width="18" height="14" rx="1.5" />
                  <path d="M3 10h18" />
                </svg>
                #{r.suiteNumber}
              </span>
            )}
            {r.boxType === "Business" && (
              <span
                className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md"
                style={{ background: `${NOHO_AMBER}20`, color: "#92400E" }}
              >
                Biz
              </span>
            )}
            <span
              className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-md ml-auto"
              style={{
                background: onFile ? `${NOHO_GREEN}15` : `${NOHO_RED}15`,
                color: onFile ? NOHO_GREEN : NOHO_RED,
              }}
            >
              {onFile ? "✓ On file" : "⚠ Missing"}
            </span>
          </div>
          {r.businessName && (
            <p className="text-[10px] font-bold truncate mt-0.5" style={{ color: NOHO_BLUE_DEEP }}>
              {r.businessName}
            </p>
          )}
          <p className="text-[10px] truncate" style={{ color: `${NOHO_INK}77` }}>
            {r.userEmail} · {r.plan ?? "—"}
          </p>
          {r.periodStart && r.periodEnd && r.generatedAt && (
            <p className="text-[9px] mt-0.5" style={{ color: `${NOHO_INK}55` }}>
              Snapshot: {new Date(r.generatedAt).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-1 shrink-0">
          {onFile ? (
            <>
              <a
                href={`/admin/statements/${r.statementId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg text-white text-center transition-all hover:shadow-md"
                style={{
                  background: `linear-gradient(180deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)`,
                  boxShadow: `0 2px 6px ${NOHO_BLUE}40`,
                }}
              >
                View / Print
              </a>
              <button
                onClick={onRefresh}
                disabled={isPending}
                className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: `${NOHO_INK}08`,
                  color: NOHO_INK,
                }}
                title="Re-snapshot using current customer data"
              >
                ↻ Refresh
              </button>
            </>
          ) : (
            <button
              onClick={onRefresh}
              disabled={isPending}
              className="text-[10px] font-black uppercase tracking-wider px-3 py-2 rounded-lg text-white transition-all hover:shadow-md disabled:opacity-50"
              style={{
                background: `linear-gradient(180deg, ${NOHO_RED} 0%, #991b1b 100%)`,
                boxShadow: `0 2px 6px ${NOHO_RED}40`,
              }}
            >
              + Generate
            </button>
          )}
        </div>
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
          fontSize: "1.4rem",
          color: accent,
        }}
      >
        {value}
      </div>
    </div>
  );
}
