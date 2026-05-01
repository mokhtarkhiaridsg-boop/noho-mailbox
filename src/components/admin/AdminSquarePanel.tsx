"use client";

import { useTransition } from "react";
import {
  syncSquareCustomers,
  syncSquarePayments,
  syncSquareCatalog,
  syncAll,
  type SyncResult,
} from "@/app/actions/square";
import type { SquareStatus } from "./types";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_AMBER = "#F5A623";

type Props = {
  squareStatus: SquareStatus;
  syncResults: SyncResult[] | null;
  setSyncResults: (results: SyncResult[] | null) => void;
};

function relTime(d: string | Date): string {
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return date.toLocaleDateString();
}

export function AdminSquarePanel({ squareStatus, syncResults, setSyncResults }: Props) {
  const [isPending, startTransition] = useTransition();
  const isConnected = squareStatus.configured;

  // Last successful sync — for the connection status card
  const lastSuccess = squareStatus.recentLogs.find((l) => l.status === "completed");
  const failedRecent = squareStatus.recentLogs.filter((l) => l.status === "failed").length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-black text-lg uppercase tracking-wide" style={{ color: NOHO_INK }}>
          Square Integration
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.5)" }}>
          Sync customers, payments, and catalog items between NOHO and Square
        </p>
      </div>

      {/* ─── Connection status hero ─────────────────────────────────── */}
      <div
        className="rounded-2xl p-5 sm:p-6 relative overflow-hidden"
        style={{
          background: isConnected
            ? `linear-gradient(135deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)`
            : "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
          boxShadow: isConnected
            ? `0 12px 32px ${NOHO_BLUE}33, inset 0 1px 0 rgba(255,255,255,0.18)`
            : "0 12px 32px rgba(220,38,38,0.32), inset 0 1px 0 rgba(255,255,255,0.18)",
          color: "#F7E6C2",
        }}
      >
        {/* Decorative dot pattern */}
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(rgba(247,230,194,0.6) 1px, transparent 1.5px)",
            backgroundSize: "16px 16px",
          }}
        />

        <div className="relative flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <span
              aria-hidden="true"
              className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
              style={{
                background: "rgba(255,255,255,0.16)",
                border: "1px solid rgba(255,255,255,0.22)",
              }}
            >
              {isConnected ? (
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12 L10 17 L19 7" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8 L12 13 M12 16 L12.01 16" />
                </svg>
              )}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span
                    className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75"
                    style={{ background: isConnected ? "#16a34a" : "#fff" }}
                  />
                  <span
                    className="relative inline-flex rounded-full h-2 w-2"
                    style={{ background: isConnected ? "#16a34a" : "#fff" }}
                  />
                </span>
                <p
                  className="text-[10px] font-black uppercase tracking-[0.22em]"
                  style={{ color: "rgba(247,230,194,0.85)" }}
                >
                  {isConnected ? "Connected · Live" : "Not connected"}
                </p>
              </div>
              <p
                className="text-2xl sm:text-3xl font-black tracking-tight mt-1"
                style={{ fontFamily: "var(--font-baloo), sans-serif" }}
              >
                {isConnected ? "Square is online" : "Setup required"}
              </p>
              <p className="text-[12px] mt-1" style={{ color: "rgba(247,230,194,0.7)" }}>
                {isConnected
                  ? lastSuccess
                    ? `Last successful sync ${relTime(lastSuccess.startedAt)} · ${lastSuccess.itemsSynced} items`
                    : "Ready to sync"
                  : "Add your Square access token to begin syncing"}
              </p>
            </div>
          </div>

          {failedRecent > 0 && isConnected && (
            <div
              className="rounded-xl px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] inline-flex items-center gap-2"
              style={{ background: "rgba(255,255,255,0.16)", border: "1px solid rgba(255,255,255,0.24)" }}
            >
              <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ background: NOHO_AMBER, boxShadow: `0 0 8px ${NOHO_AMBER}` }} />
              {failedRecent} recent failure{failedRecent !== 1 ? "s" : ""}
            </div>
          )}
        </div>
      </div>

      {/* Setup instructions when not connected */}
      {!isConnected && (
        <div
          className="rounded-2xl p-5 bg-white"
          style={{
            boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)",
            border: "1px dashed rgba(220,38,38,0.3)",
          }}
        >
          <h3 className="font-black text-sm uppercase tracking-wide mb-3" style={{ color: NOHO_INK }}>
            Setup
          </h3>
          <ol className="text-sm space-y-1.5 list-decimal list-inside" style={{ color: "rgba(45,16,15,0.65)" }}>
            <li>Go to <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(45,16,15,0.05)", color: NOHO_BLUE }}>developer.squareup.com/apps</span></li>
            <li>Create or select your application</li>
            <li>Copy your Access Token from the Credentials tab</li>
            <li>Add it as <span className="font-mono text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(45,16,15,0.05)", color: NOHO_BLUE }}>SQUARE_ACCESS_TOKEN</span> in your Vercel environment variables</li>
          </ol>
        </div>
      )}

      {/* ─── KPI tiles ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiTile
          label="Linked customers"
          value={String(squareStatus.linkedCustomers)}
          sub="Square ↔ NOHO"
        />
        <KpiTile
          label="Payments synced"
          value={String(squareStatus.totalPayments)}
          sub="All time"
        />
        <KpiTile
          label="Catalog items"
          value={String(squareStatus.catalogItems)}
          sub="In sync"
        />
        <KpiTile
          label="Lifetime revenue"
          value={`$${(squareStatus.totalRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          sub="From Square"
          accent
        />
      </div>

      {/* ─── Sync action grid — 3 specific + 1 sync-all ─────────────── */}
      <div
        className="rounded-2xl bg-white p-5"
        style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: NOHO_INK }}>
            Sync data
          </h3>
          <p className="text-[10px]" style={{ color: "rgba(45,16,15,0.4)" }}>
            Pulls fresh data from Square
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SyncCard
            label="Customers"
            sub="Profiles + Square IDs"
            disabled={isPending || !isConnected}
            accent="#7C3AED"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="12" cy="9" r="3.5" />
                <path d="M5 20 C5 15.5 8.5 13 12 13 C15.5 13 19 15.5 19 20" />
              </svg>
            }
            onClick={() =>
              startTransition(async () => {
                const r = await syncSquareCustomers();
                setSyncResults([r]);
              })
            }
          />
          <SyncCard
            label="Payments"
            sub="Sales · refunds · ledger"
            disabled={isPending || !isConnected}
            accent="#16A34A"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                <rect x="3" y="6" width="18" height="12" rx="2" />
                <path d="M3 10 L21 10" />
                <path d="M7 14 L11 14" strokeLinecap="round" />
              </svg>
            }
            onClick={() =>
              startTransition(async () => {
                const r = await syncSquarePayments();
                setSyncResults([r]);
              })
            }
          />
          <SyncCard
            label="Catalog"
            sub="Items · prices"
            disabled={isPending || !isConnected}
            accent="#B07030"
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round">
                <path d="M5 7 L19 7 L18 21 L6 21 Z" />
                <path d="M9 7 V5 a3 3 0 0 1 6 0 V7" />
              </svg>
            }
            onClick={() =>
              startTransition(async () => {
                const r = await syncSquareCatalog();
                setSyncResults([r]);
              })
            }
          />
          <SyncCard
            label="Sync all"
            sub="Run everything"
            primary
            disabled={isPending || !isConnected}
            accent={NOHO_BLUE}
            icon={
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12 a9 9 0 1 1 -9 -9" />
                <path d="M21 4 L21 12 L13 12" />
              </svg>
            }
            onClick={() =>
              startTransition(async () => {
                const r = await syncAll();
                setSyncResults(r);
              })
            }
          />
        </div>

        {syncResults && syncResults.length > 0 && (
          <div className="mt-4 space-y-2">
            {syncResults.map((r, i) => (
              <div
                key={i}
                className="flex items-center justify-between py-2.5 px-3 rounded-xl text-sm"
                style={{
                  background: r.success ? "rgba(22,163,74,0.08)" : "rgba(220,38,38,0.08)",
                  border: `1px solid ${r.success ? "rgba(22,163,74,0.22)" : "rgba(220,38,38,0.22)"}`,
                }}
              >
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="w-2 h-2 rounded-full"
                    style={{
                      background: r.success ? "#16A34A" : "#dc2626",
                      boxShadow: `0 0 8px ${r.success ? "#16A34A" : "#dc2626"}`,
                    }}
                  />
                  <span className="font-bold capitalize" style={{ color: NOHO_INK }}>
                    {r.syncType}
                  </span>
                </div>
                <span
                  className="text-[12px] font-bold"
                  style={{ color: r.success ? "#15803d" : "#b91c1c" }}
                >
                  {r.success ? `${r.itemsSynced} items synced` : `Failed: ${r.error}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ─── Sync history timeline ─────────────────────────────────── */}
      <div
        className="rounded-2xl bg-white overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}
      >
        <div className="px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
          <h3 className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: NOHO_INK }}>
            Sync history
          </h3>
          <span className="text-[10px]" style={{ color: "rgba(45,16,15,0.4)" }}>
            {squareStatus.recentLogs.length} recent
          </span>
        </div>

        {squareStatus.recentLogs.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "rgba(45,16,15,0.4)" }}>
            No syncs performed yet — run "Sync All" above to populate.
          </div>
        ) : (
          <ul className="relative pl-8 pr-5 py-5 space-y-3">
            {/* Timeline rail */}
            <span
              aria-hidden="true"
              className="absolute left-4 top-5 bottom-5 w-px"
              style={{
                background: "linear-gradient(180deg, rgba(45,16,15,0.18) 0%, rgba(45,16,15,0.05) 100%)",
              }}
            />
            {squareStatus.recentLogs.map((log) => {
              const isOk = log.status === "completed";
              const isFail = log.status === "failed";
              const isPend = !isOk && !isFail;
              const color = isOk ? "#16A34A" : isFail ? "#dc2626" : NOHO_AMBER;
              return (
                <li
                  key={log.id}
                  className="relative rounded-xl bg-white p-3 transition-all hover:shadow-md"
                  style={{
                    border: "1px solid rgba(232,229,224,0.7)",
                    boxShadow: "0 1px 2px rgba(45,16,15,0.04)",
                  }}
                >
                  <span
                    aria-hidden="true"
                    className="absolute -left-[20px] top-3 w-3 h-3 rounded-full ring-2 ring-white"
                    style={{
                      background: color,
                      boxShadow: isOk || isFail ? `0 0 0 3px ${color}22, 0 0 8px ${color}55` : undefined,
                    }}
                  />
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        aria-hidden="true"
                        className="w-2 h-2 rounded-full"
                        style={{ background: color }}
                      />
                      <span className="text-[13px] font-black capitalize truncate" style={{ color: NOHO_INK }}>
                        {log.syncType}
                      </span>
                      <span
                        className="text-[9px] font-black uppercase tracking-[0.14em] px-1.5 py-0.5 rounded-md"
                        style={{
                          background: isOk
                            ? "rgba(22,163,74,0.10)"
                            : isFail
                            ? "rgba(220,38,38,0.10)"
                            : "rgba(245,166,35,0.10)",
                          color: isOk ? "#15803d" : isFail ? "#b91c1c" : "#92400e",
                        }}
                      >
                        {isOk ? "Completed" : isFail ? "Failed" : (isPend ? "Running" : log.status)}
                      </span>
                    </div>
                    <span className="text-[11px] tabular-nums" style={{ color: "rgba(45,16,15,0.5)" }}>
                      {relTime(log.startedAt)}
                    </span>
                  </div>
                  <p className="text-[11px] mt-1" style={{ color: "rgba(45,16,15,0.55)" }}>
                    {log.itemsSynced} items
                    {log.completedAt && ` · finished in ${
                      Math.max(
                        0,
                        Math.round((new Date(log.completedAt).getTime() - new Date(log.startedAt).getTime()) / 1000)
                      )
                    }s`}
                  </p>
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
  sub,
  accent,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className="rounded-2xl p-4 transition-all hover:-translate-y-0.5"
      style={{
        background: accent ? `linear-gradient(135deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE_DEEP} 100%)` : "white",
        boxShadow: accent
          ? `0 8px 24px ${NOHO_BLUE}33, inset 0 1px 0 rgba(255,255,255,0.18)`
          : "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)",
        border: accent ? "1px solid rgba(247,230,194,0.18)" : "1px solid rgba(232,221,208,0.5)",
      }}
    >
      <p
        className="text-[10px] font-black uppercase tracking-[0.16em]"
        style={{ color: accent ? "rgba(255,255,255,0.55)" : "rgba(45,16,15,0.45)" }}
      >
        {label}
      </p>
      <p
        className="text-2xl sm:text-3xl font-black tracking-tight mt-1"
        style={{
          color: accent ? "white" : NOHO_INK,
          fontFamily: "var(--font-baloo), sans-serif",
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="text-[10px] font-bold mt-1"
          style={{ color: accent ? "rgba(255,255,255,0.6)" : NOHO_BLUE }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

function SyncCard({
  label,
  sub,
  icon,
  onClick,
  disabled,
  primary,
  accent,
}: {
  label: string;
  sub: string;
  icon: React.ReactNode;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl p-4 text-left transition-all hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        background: primary
          ? `linear-gradient(135deg, ${accent} 0%, ${NOHO_BLUE_DEEP} 100%)`
          : "white",
        border: primary ? "1px solid rgba(247,230,194,0.18)" : `1px solid ${accent}33`,
        boxShadow: primary
          ? `0 8px 24px ${accent}33, inset 0 1px 0 rgba(255,255,255,0.18)`
          : `0 2px 8px ${accent}22, 0 1px 0 rgba(255,255,255,0.6) inset`,
      }}
    >
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: primary ? "rgba(255,255,255,0.18)" : `${accent}10`,
            color: primary ? "white" : accent,
            border: primary ? "1px solid rgba(255,255,255,0.22)" : `1px solid ${accent}22`,
          }}
        >
          <span className="w-5 h-5 inline-flex items-center justify-center">{icon}</span>
        </span>
        <div className="min-w-0">
          <p
            className="text-[12px] font-black uppercase tracking-[0.14em]"
            style={{ color: primary ? "white" : NOHO_INK }}
          >
            {label}
          </p>
          <p
            className="text-[10px] mt-0.5"
            style={{ color: primary ? "rgba(247,230,194,0.7)" : "rgba(45,16,15,0.5)" }}
          >
            {sub}
          </p>
        </div>
      </div>
    </button>
  );
}
