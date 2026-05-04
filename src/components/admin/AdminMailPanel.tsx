"use client";

/**
 * Admin Mail & Packages — formal hairline rewrite.
 *
 * Was a four-column rainbow kanban with orange/blue/purple/green column
 * tints plus gradient action buttons — read as "circus" against the rest
 * of the admin shell. This rewrite uses the same neutral T-token system
 * as AdminCashRegister, AdminOverviewPanel, and AdminCustomersPanel:
 * white surfaces, hairline borders, monospace numerals, color used only
 * as a 6×6px status dot per column.
 *
 * Iter 6: added a hero metric row above the header strip — five animated
 * counters (Total / Action / Scanned / Awaiting / Today) that double as
 * one-tap segment filters. Click a tile to switch to list view filtered
 * to that bucket; click again to clear.
 */

import { useEffect, useState } from "react";
import { StatusBadge } from "./StatusBadge";
import type { MailItem, Customer } from "./types";

type LogMailForm = {
  suite: string;
  from: string;
  type: string;
  recipientName: string;
  recipientPhone: string;
  exteriorImageUrl: string;
  weightOz: string;
  dimensions: string;
};

type Props = {
  recentMail: MailItem[];
  customers: Customer[];
  mailFilter: string;
  setMailFilter: (f: string) => void;
  setShowLogMailModal: (show: boolean) => void;
  setLogMailForm: React.Dispatch<React.SetStateAction<LogMailForm>>;
  isPending: boolean;
  handleMailAction: (itemId: string, newStatus: string) => void;
  handleScanUpload: (mailItemId: string, file: File) => Promise<void>;
};

// Shared formal-token palette (mirrors AdminCashRegister / AdminOverviewPanel).
const T = {
  bg: "#FAF7F2",
  surface: "#FFFFFF",
  surfaceAlt: "#F4EEE3",
  border: "#E5DACA",
  ink: "#1A1614",
  inkSoft: "#5C4540",
  inkFaint: "#998877",
  accent: "#2D100F",
  blue: "#337485",
  success: "#16A34A",
  danger: "#B91C1C",
  warning: "#B07030",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace";
const TAB_NUM: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: "'tnum' 1",
  fontFamily: MONO,
};

// rAF count-up tween (mirrors helpers in Overview / Mailbox / Customers).
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

// Lifecycle bucketing — collapses every ~10 statuses into 4 board columns.
type Bucket = "action" | "scanned" | "awaiting" | "completed";

function bucketize(status: string): Bucket {
  if (status.endsWith("Requested") || status === "Received" || status === "Held") return "action";
  if (status === "Scanned") return "scanned";
  if (status === "Awaiting Pickup") return "awaiting";
  // Picked Up / Forwarded / Discarded / Returned / Shredded / Deposited / Completed
  return "completed";
}

const BUCKET_META: Record<Bucket, { title: string; sub: string; dot: string }> = {
  action: {
    title: "Action needed",
    sub: "Requests + just-received",
    dot: T.danger,
  },
  scanned: {
    title: "Scanned",
    sub: "Image uploaded · awaiting next step",
    dot: T.blue,
  },
  awaiting: {
    title: "Awaiting pickup",
    sub: "Sitting at the desk for the customer",
    dot: T.warning,
  },
  completed: {
    title: "Completed",
    sub: "Picked up · forwarded · discarded",
    dot: T.success,
  },
};

// Tiny monochrome glyph next to each item — letter for envelope, package
// outline for packages. No gradients.
function MailIconBadge({ type }: { type: string }) {
  const isPackage = type === "Package";
  return (
    <div
      className="w-7 h-7 rounded-md flex items-center justify-center shrink-0"
      style={{
        background: T.surfaceAlt,
        border: `1px solid ${T.border}`,
        color: T.ink,
      }}
      aria-hidden="true"
    >
      {isPackage ? (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <path d="M12 3 L21 7 L21 17 L12 21 L3 17 L3 7 Z" />
          <path d="M3 7 L12 11 L21 7" />
          <path d="M12 11 L12 21" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
          <rect x="3" y="6" width="18" height="13" rx="2" />
          <path d="M3 8 L12 14 L21 8" />
        </svg>
      )}
    </div>
  );
}

// Tiny hairline action button — used for the secondary scan/forward/pickup
// actions on each card. No gradient, no shadow.
function ActionIcon({
  onClick,
  disabled,
  title,
  children,
  tone = "default",
}: {
  onClick: () => void;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  tone?: "default" | "success";
}) {
  const stroke = tone === "success" ? T.success : T.blue;
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="w-6 h-6 rounded flex items-center justify-center transition-colors disabled:opacity-40"
      style={{
        background: "transparent",
        color: stroke,
        border: `1px solid ${T.border}`,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        e.currentTarget.style.background = T.surfaceAlt;
        e.currentTarget.style.borderColor = stroke;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
        e.currentTarget.style.borderColor = T.border;
      }}
      title={title}
      aria-label={title}
    >
      {children}
    </button>
  );
}

function MailItemCard({
  m,
  isPending,
  onAction,
  onScanUpload,
}: {
  m: MailItem;
  isPending: boolean;
  onAction: (id: string, s: string) => void;
  onScanUpload: (id: string, f: File) => void;
}) {
  return (
    <div
      className="group rounded-md p-2.5 transition-colors"
      style={{
        background: T.surface,
        border: `1px solid ${T.border}`,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = T.surfaceAlt;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = T.surface;
      }}
    >
      <div className="flex items-start gap-2">
        <MailIconBadge type={m.type} />
        <div className="flex-1 min-w-0">
          <p
            className="text-[12px] font-bold truncate"
            style={{ color: T.ink }}
          >
            {m.from}
          </p>
          <p
            className="text-[10px] truncate"
            style={{ color: T.inkFaint, ...TAB_NUM }}
          >
            #{m.suiteNumber} · {m.customerName.split(" ")[0]} · {m.date}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mt-2.5">
        <StatusBadge status={m.status} />
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          {m.status.includes("Requested") && (
            <button
              onClick={() => {
                const target =
                  m.status === "Scan Requested"
                    ? "Scanned"
                    : m.status === "Forward Requested"
                    ? "Forwarded"
                    : m.status === "Discard Requested"
                    ? "Discarded"
                    : "Awaiting Pickup";
                onAction(m.id, target);
              }}
              disabled={isPending}
              className="px-2 h-6 rounded text-[9px] font-black uppercase tracking-[0.10em] disabled:opacity-40"
              style={{
                background: T.accent,
                color: "#FFFFFF",
                border: `1px solid ${T.accent}`,
              }}
              title="Fulfill request"
            >
              Fulfill
            </button>
          )}
          <label
            title="Upload scan image"
            className="w-6 h-6 rounded flex items-center justify-center cursor-pointer transition-colors"
            style={{
              border: `1px solid ${T.border}`,
              color: T.blue,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = T.surfaceAlt;
              e.currentTarget.style.borderColor = T.blue;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = T.border;
            }}
          >
            <svg
              className="w-3 h-3"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.8}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
              />
            </svg>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) onScanUpload(m.id, f);
              }}
            />
          </label>
          <ActionIcon
            onClick={() => onAction(m.id, "Scanned")}
            disabled={isPending}
            title="Mark Scanned"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <path d="M3 12 L21 12" />
            </svg>
          </ActionIcon>
          <ActionIcon
            onClick={() => onAction(m.id, "Picked Up")}
            disabled={isPending}
            title="Mark Picked Up"
            tone="success"
          >
            <svg
              viewBox="0 0 24 24"
              className="w-3 h-3"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 12 L10 17 L19 7" />
            </svg>
          </ActionIcon>
        </div>
      </div>
    </div>
  );
}

export function AdminMailPanel({
  recentMail,
  customers: _customers,
  mailFilter,
  setMailFilter,
  setShowLogMailModal,
  setLogMailForm,
  isPending,
  handleMailAction,
  handleScanUpload,
}: Props) {
  void _customers;
  const [view, setView] = useState<"board" | "list">("board");

  const buckets: Record<Bucket, MailItem[]> = {
    action: [],
    scanned: [],
    awaiting: [],
    completed: [],
  };
  for (const m of recentMail) buckets[bucketize(m.status)].push(m);

  const filteredMail =
    mailFilter === "All"
      ? recentMail
      : recentMail.filter((m) => m.status === mailFilter);

  const todayStr = new Date().toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const todayCount = recentMail.filter((m) => m.date === todayStr).length;

  // ─── Hero metric tiles ──────────────────────────────────────────
  // Five tiles double as segment filters. Clicking jumps to list view
  // filtered to that bucket (or "All" for total). Active tile gets a
  // 2px ring + colored side bar.
  const totalCount = recentMail.length;
  const actionCount = buckets.action.length;
  const scannedCount = buckets.scanned.length;
  const awaitingCount = buckets.awaiting.length;
  // "Active" filter the user hits: when in list mode and filter == "All"
  // we treat it as no filter; otherwise we resolve a representative status
  // for board buckets.
  function pickFilter(bucket: Bucket | "all" | "today") {
    setView("list");
    if (bucket === "all" || bucket === "today") {
      setMailFilter("All");
      return;
    }
    if (bucket === "scanned") setMailFilter("Scanned");
    else if (bucket === "awaiting") setMailFilter("Awaiting Pickup");
    else if (bucket === "action") setMailFilter("Scan Requested");
  }

  const heroTiles: Array<{
    id: string;
    label: string;
    value: number;
    onClick: () => void;
    accent?: boolean;
    warning?: boolean;
    success?: boolean;
    active?: boolean;
  }> = [
    { id: "total", label: "Total recent", value: totalCount, onClick: () => pickFilter("all") },
    { id: "action", label: "Action needed", value: actionCount, accent: actionCount > 0, onClick: () => pickFilter("action"), active: view === "list" && mailFilter === "Scan Requested" },
    { id: "scanned", label: "Scanned", value: scannedCount, onClick: () => pickFilter("scanned"), active: view === "list" && mailFilter === "Scanned" },
    { id: "awaiting", label: "Awaiting", value: awaitingCount, warning: awaitingCount > 0, onClick: () => pickFilter("awaiting"), active: view === "list" && mailFilter === "Awaiting Pickup" },
    { id: "today", label: "Today", value: todayCount, success: todayCount > 0, onClick: () => pickFilter("today") },
  ];

  return (
    <div className="space-y-4">
      {/* ─── Hero metric strip ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3">
        {heroTiles.map((tile) => (
          <MailHeroTile key={tile.id} {...tile} />
        ))}
      </div>

      {/* ─── Header strip ───────────────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2
            className="text-[10px] font-bold uppercase tracking-[0.16em]"
            style={{ color: T.ink }}
          >
            Mail & packages
          </h2>
          <p
            className="text-[11px] mt-1"
            style={{ color: T.inkFaint, ...TAB_NUM }}
          >
            {recentMail.length} recent · {todayCount} today ·{" "}
            {buckets.action.length} need action
          </p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
          {/* Board / List segmented control — flat, hairline. */}
          <div
            className="inline-flex rounded-md p-0.5"
            style={{
              background: T.surfaceAlt,
              border: `1px solid ${T.border}`,
            }}
          >
            {(["board", "list"] as const).map((v) => {
              const active = view === v;
              return (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className="px-3 h-7 rounded text-[10px] font-bold uppercase tracking-[0.12em] transition-all"
                  style={{
                    background: active ? T.surface : "transparent",
                    color: active ? T.ink : T.inkFaint,
                    border: active
                      ? `1px solid ${T.border}`
                      : "1px solid transparent",
                  }}
                  aria-pressed={active}
                >
                  {v}
                </button>
              );
            })}
          </div>
          <button
            onClick={() => {
              setLogMailForm({
                suite: "",
                from: "",
                type: "Letter",
                recipientName: "",
                recipientPhone: "",
                exteriorImageUrl: "",
                weightOz: "",
                dimensions: "",
              });
              setShowLogMailModal(true);
            }}
            className="px-3 h-8 rounded-md text-[11px] font-bold transition-colors"
            style={{
              background: T.accent,
              color: "#FFFFFF",
              border: `1px solid ${T.accent}`,
            }}
          >
            + Log mail
          </button>
          <button
            onClick={() => {
              setLogMailForm({
                suite: "",
                from: "",
                type: "Package",
                recipientName: "",
                recipientPhone: "",
                exteriorImageUrl: "",
                weightOz: "",
                dimensions: "",
              });
              setShowLogMailModal(true);
            }}
            className="px-3 h-8 rounded-md text-[11px] font-bold transition-colors"
            style={{
              background: T.surface,
              color: T.ink,
              border: `1px solid ${T.border}`,
            }}
          >
            + Log package
          </button>
        </div>
      </div>

      {/* ─── BOARD VIEW — kanban columns ─────────────────────────────── */}
      {view === "board" && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
          {(Object.keys(BUCKET_META) as Bucket[]).map((b) => {
            const meta = BUCKET_META[b];
            const items = buckets[b];
            return (
              <section
                key={b}
                className="rounded-md flex flex-col"
                style={{
                  background: T.surface,
                  border: `1px solid ${T.border}`,
                  minHeight: 240,
                }}
                aria-labelledby={`mail-col-${b}`}
              >
                <header
                  className="flex items-center justify-between gap-2 px-3 h-10"
                  style={{ borderBottom: `1px solid ${T.border}` }}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      aria-hidden="true"
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        background: items.length > 0 ? meta.dot : T.border,
                      }}
                    />
                    <p
                      id={`mail-col-${b}`}
                      className="text-[10px] font-bold uppercase tracking-[0.12em] truncate"
                      style={{ color: T.ink }}
                    >
                      {meta.title}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-bold"
                    style={{
                      ...TAB_NUM,
                      color: items.length > 0 ? T.ink : T.inkFaint,
                    }}
                  >
                    {items.length}
                  </span>
                </header>

                <div className="flex-1 p-2 space-y-1.5 overflow-hidden">
                  {items.length === 0 ? (
                    <div
                      className="rounded p-3 text-center text-[10px] font-medium"
                      style={{
                        background: T.surfaceAlt,
                        border: `1px dashed ${T.border}`,
                        color: T.inkFaint,
                      }}
                    >
                      Nothing here.
                    </div>
                  ) : (
                    items.map((m) => (
                      <MailItemCard
                        key={m.id}
                        m={m}
                        isPending={isPending}
                        onAction={handleMailAction}
                        onScanUpload={handleScanUpload}
                      />
                    ))
                  )}
                </div>

                <div
                  className="px-3 h-7 flex items-center"
                  style={{
                    borderTop: `1px solid ${T.border}`,
                    background: T.surfaceAlt,
                  }}
                >
                  <p
                    className="text-[9px] truncate"
                    style={{ color: T.inkFaint, letterSpacing: "0.04em" }}
                  >
                    {meta.sub}
                  </p>
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* ─── LIST VIEW — denser, table-style ─────────────────────────── */}
      {view === "list" && (
        <>
          <div className="flex gap-1.5 flex-wrap">
            {[
              "All",
              "Scan Requested",
              "Forward Requested",
              "Discard Requested",
              "Pickup Requested",
              "Awaiting Pickup",
              "Scanned",
              "Forwarded",
              "Held",
            ].map((f) => {
              const active = mailFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setMailFilter(f)}
                  className="px-2.5 h-7 rounded text-[10px] font-bold uppercase tracking-[0.10em] transition-colors"
                  style={{
                    background: active ? T.accent : T.surface,
                    color: active ? "#FFFFFF" : T.inkSoft,
                    border: `1px solid ${active ? T.accent : T.border}`,
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>

          <div
            className="rounded-md overflow-hidden"
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
            }}
          >
            {filteredMail.length === 0 && (
              <div
                className="px-5 py-12 text-center text-[12px]"
                style={{ color: T.inkFaint }}
              >
                No mail items
                {mailFilter !== "All" ? ` with status "${mailFilter}"` : ""}.
              </div>
            )}
            {filteredMail.map((m, i) => (
              <div
                key={m.id}
                className="flex items-center justify-between px-4 py-3 transition-colors"
                style={{
                  borderBottom:
                    i < filteredMail.length - 1
                      ? `1px solid ${T.border}`
                      : "none",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = T.surfaceAlt;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = T.surface;
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <MailIconBadge type={m.type} />
                  <div className="min-w-0">
                    <p
                      className="text-[12px] font-bold truncate"
                      style={{ color: T.ink }}
                    >
                      {m.from}
                    </p>
                    <p
                      className="text-[10px] truncate"
                      style={{ color: T.inkFaint, ...TAB_NUM }}
                    >
                      To: {m.customerName} (#{m.suiteNumber}) · {m.date}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={m.status} />
                  <div className="flex gap-1">
                    {m.status.includes("Requested") && (
                      <button
                        onClick={() => {
                          const target =
                            m.status === "Scan Requested"
                              ? "Scanned"
                              : m.status === "Forward Requested"
                              ? "Forwarded"
                              : m.status === "Discard Requested"
                              ? "Discarded"
                              : "Awaiting Pickup";
                          handleMailAction(m.id, target);
                        }}
                        disabled={isPending}
                        className="px-2.5 h-7 rounded text-[10px] font-bold uppercase tracking-[0.10em] disabled:opacity-40"
                        style={{
                          background: T.accent,
                          color: "#FFFFFF",
                          border: `1px solid ${T.accent}`,
                        }}
                        title="Fulfill request"
                      >
                        Fulfill
                      </button>
                    )}
                    <label
                      title="Upload scan image"
                      className="w-7 h-7 rounded flex items-center justify-center cursor-pointer transition-colors"
                      style={{
                        border: `1px solid ${T.border}`,
                        color: T.blue,
                      }}
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.8}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                        />
                      </svg>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleScanUpload(m.id, f);
                        }}
                      />
                    </label>
                    <button
                      onClick={() => handleMailAction(m.id, "Scanned")}
                      disabled={isPending}
                      className="w-7 h-7 rounded flex items-center justify-center disabled:opacity-40 transition-colors"
                      style={{
                        border: `1px solid ${T.border}`,
                        color: T.blue,
                      }}
                      title="Mark Scanned"
                      aria-label="Mark Scanned"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <rect x="3" y="6" width="18" height="12" rx="2" />
                        <path d="M3 12 L21 12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMailAction(m.id, "Forwarded")}
                      disabled={isPending}
                      className="w-7 h-7 rounded flex items-center justify-center disabled:opacity-40 transition-colors"
                      style={{
                        border: `1px solid ${T.border}`,
                        color: T.blue,
                      }}
                      title="Mark Forwarded"
                      aria-label="Mark Forwarded"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M14 6 L20 12 L14 18" />
                        <path d="M4 12 L20 12" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleMailAction(m.id, "Picked Up")}
                      disabled={isPending}
                      className="w-7 h-7 rounded flex items-center justify-center disabled:opacity-40 transition-colors"
                      style={{
                        border: `1px solid ${T.border}`,
                        color: T.success,
                      }}
                      title="Mark Picked Up"
                      aria-label="Mark Picked Up"
                    >
                      <svg
                        viewBox="0 0 24 24"
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M5 12 L10 17 L19 7" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Hero metric tile ───────────────────────────────────────────────────
// Subtle tinted background per tone, hairline border, count-up tween.
// Active flag adds a 2px ring + colored side bar; accent/warning add a
// pulsing dot when the count is >0. Mirrors the formal-hairline aesthetic.
function MailHeroTile({
  label,
  value,
  onClick,
  accent,
  warning,
  success,
  active,
}: {
  label: string;
  value: number;
  onClick: () => void;
  accent?: boolean;
  warning?: boolean;
  success?: boolean;
  active?: boolean;
}) {
  const animated = useAnimatedCount(value);
  const tone = accent
    ? { bar: T.danger,  bg: "rgba(185,28,28,0.06)",  text: T.danger,  ring: "rgba(185,28,28,0.40)" }
    : warning
    ? { bar: T.warning, bg: "rgba(176,112,48,0.08)", text: T.warning, ring: "rgba(176,112,48,0.40)" }
    : success
    ? { bar: T.success, bg: "rgba(22,163,74,0.06)",  text: T.success, ring: "rgba(22,163,74,0.40)" }
    : { bar: T.ink,     bg: T.surface,                text: T.ink,     ring: "rgba(45,16,15,0.32)" };

  return (
    <button
      type="button"
      onClick={onClick}
      className="relative overflow-hidden rounded-xl text-left px-3 py-2.5 transition-all hover:-translate-y-0.5"
      style={{
        background: tone.bg,
        border: `1px solid ${active ? tone.bar : T.border}`,
        boxShadow: active
          ? `0 0 0 2px ${tone.ring}, 0 6px 16px rgba(45,16,15,0.06), 0 1px 0 rgba(255,255,255,0.6) inset`
          : "0 1px 0 rgba(255,255,255,0.6) inset",
      }}
    >
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-1"
        style={{ background: tone.bar, opacity: 0.7 }}
      />
      {(accent || warning) && value > 0 && (
        <span
          aria-hidden
          className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full"
          style={{
            background: tone.bar,
            boxShadow: `0 0 8px ${tone.bar}`,
            animation: "mail-tile-pulse 1.8s ease-in-out infinite",
          }}
        />
      )}
      <p className="pl-2 text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
        {label}
      </p>
      <p
        className="pl-2 text-[26px] font-extrabold leading-none mt-1"
        style={{ ...TAB_NUM, color: tone.text }}
      >
        {animated.toLocaleString()}
      </p>
      <style>{`
        @keyframes mail-tile-pulse {
          0%, 100% { opacity: 0.55; transform: scale(1); }
          50%      { opacity: 1;    transform: scale(1.35); }
        }
      `}</style>
    </button>
  );
}
