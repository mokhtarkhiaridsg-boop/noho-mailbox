"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { BRAND, statusColor, type MailItem } from "./types";
import {
  IconMail,
  IconPackage,
  IconEye,
  IconScan,
  IconForward,
  IconTrash,
} from "@/components/MemberIcons";
import {
  requestForward,
  requestScan,
  requestQuickPeek,
  requestDiscard,
  requestReturnToSender,
  updateMailLabel,
} from "@/app/actions/mail";
import { togglePriorityFlag, addJunkSender } from "@/app/actions/mailPreferences";
import { getTrackingUrl } from "@/lib/trackingUtils";

// ─── LabelEditor (unchanged) ─────────────────────────────────────────────
function LabelEditor({
  itemId,
  initial,
  onSaved,
}: {
  itemId: string;
  initial: string | null | undefined;
  onSaved?: () => void;
}) {
  const [label, setLabel] = useState(initial ?? "");
  const [editing, setEditing] = useState(false);
  const [saving, startTransition] = useTransition();

  function save() {
    startTransition(async () => {
      await updateMailLabel(itemId, label.trim() || null);
      setEditing(false);
      onSaved?.();
    });
  }

  if (editing) {
    return (
      <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
        <input
          autoFocus
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") save();
            if (e.key === "Escape") setEditing(false);
          }}
          placeholder="Add label…"
          className="text-[11px] rounded-lg px-2 py-0.5 w-24"
          style={{ background: "white", border: `1px solid ${BRAND.border}` }}
        />
        <button onClick={save} disabled={saving} className="text-[10px] font-black" style={{ color: BRAND.blue }}>
          {saving ? "…" : "✓"}
        </button>
        <button onClick={() => setEditing(false)} className="text-[10px]" style={{ color: BRAND.inkFaint }}>
          ✗
        </button>
      </span>
    );
  }

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        setEditing(true);
      }}
      className="text-[11px] hover:underline"
      style={{ color: label ? BRAND.blueDeep : BRAND.inkFaint }}
    >
      {label ? `· ${label}` : "+ label"}
    </button>
  );
}

// ─── Filter chip definitions ─────────────────────────────────────────────
type FilterKey =
  | "all"
  | "letter"
  | "package"
  | "received"
  | "scanned"
  | "awaiting"
  | "requested"
  | "forwarded"
  | "held"
  | "priority";

const FILTER_DEFS: { key: FilterKey; label: string; match: (m: MailItem) => boolean }[] = [
  { key: "all", label: "All", match: () => true },
  { key: "letter", label: "Letters", match: (m) => m.type === "Letter" },
  { key: "package", label: "Packages", match: (m) => m.type === "Package" },
  { key: "received", label: "Just received", match: (m) => m.status === "Received" },
  { key: "scanned", label: "Scanned", match: (m) => m.scanned || m.status === "Scanned" },
  { key: "awaiting", label: "Awaiting pickup", match: (m) => m.status === "Awaiting Pickup" || m.status === "Ready for Pickup" },
  { key: "requested", label: "In progress", match: (m) => m.status.includes("Requested") },
  { key: "forwarded", label: "Forwarded", match: (m) => m.status === "Forwarded" || m.status === "Picked Up" },
  { key: "held", label: "Held", match: (m) => m.status === "Held" },
  { key: "priority", label: "Priority", match: (m) => !!m.priority },
];

type Props = {
  mailItems: MailItem[];
  isPending: boolean;
  runAction: (label: string, fn: () => Promise<unknown>) => void;
  setScanPreview: (url: string | null) => void;
};

export default function MailPanel({ mailItems, isPending, runAction, setScanPreview }: Props) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState<"forward" | "discard" | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // ─── Filtered list ────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const def = FILTER_DEFS.find((f) => f.key === filter) ?? FILTER_DEFS[0];
    const q = query.trim().toLowerCase();
    return mailItems.filter((m) => {
      if (!def.match(m)) return false;
      if (!q) return true;
      const hay = `${m.from} ${m.label ?? ""} ${m.recipientName ?? ""} ${m.type} ${m.status} ${m.trackingNumber ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [mailItems, filter, query]);

  // Re-sync selection when underlying items change (e.g. after an action).
  useEffect(() => {
    setSelected((prev) => {
      const stillValid = new Set<string>();
      prev.forEach((id) => {
        if (mailItems.some((m) => m.id === id)) stillValid.add(id);
      });
      return stillValid;
    });
  }, [mailItems]);

  // ─── Counts per filter (for chip badges) ──────────────────────────────
  const counts = useMemo(() => {
    const out: Record<FilterKey, number> = {
      all: 0, letter: 0, package: 0, received: 0, scanned: 0,
      awaiting: 0, requested: 0, forwarded: 0, held: 0, priority: 0,
    };
    for (const m of mailItems) {
      for (const def of FILTER_DEFS) {
        if (def.match(m)) out[def.key]++;
      }
    }
    return out;
  }, [mailItems]);

  // ─── Keyboard shortcuts ───────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA";
      if (!inField && e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape" && document.activeElement === searchRef.current) {
        setQuery("");
        searchRef.current?.blur();
      } else if (e.key === "Escape" && (selected.size > 0 || expandedId)) {
        e.preventDefault();
        setSelected(new Set());
        setExpandedId(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [selected.size, expandedId]);

  // ─── Selection helpers ────────────────────────────────────────────────
  const toggleSelect = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const selectAllVisible = () =>
    setSelected((prev) => {
      const allVisibleIds = filtered.map((m) => m.id);
      const allSelected = allVisibleIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        allVisibleIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      allVisibleIds.forEach((id) => next.add(id));
      return next;
    });

  // ─── Bulk actions ─────────────────────────────────────────────────────
  function bulkForward() {
    if (selected.size === 0) return;
    runAction(`Forwarding ${selected.size} item${selected.size === 1 ? "" : "s"}…`, async () => {
      await Promise.all(Array.from(selected).map((id) => requestForward(id)));
    });
    setSelected(new Set());
    setConfirmBulk(null);
  }
  function bulkDiscard() {
    if (selected.size === 0) return;
    runAction(`Discarding ${selected.size} item${selected.size === 1 ? "" : "s"}…`, async () => {
      await Promise.all(Array.from(selected).map((id) => requestDiscard(id)));
    });
    setSelected(new Set());
    setConfirmBulk(null);
  }
  function bulkPriority() {
    if (selected.size === 0) return;
    runAction(`Marking ${selected.size} priority`, async () => {
      const items = mailItems.filter((m) => selected.has(m.id) && !m.priority);
      await Promise.all(items.map((m) => togglePriorityFlag(m.id)));
    });
    setSelected(new Set());
  }
  function bulkScan() {
    if (selected.size === 0) return;
    runAction(`Requesting ${selected.size} scan${selected.size === 1 ? "" : "s"}`, async () => {
      await Promise.all(Array.from(selected).map((id) => requestScan(id)));
    });
    setSelected(new Set());
  }

  const allVisibleSelected =
    filtered.length > 0 && filtered.every((m) => selected.has(m.id));
  const selCount = selected.size;

  // ─── Render ───────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      {/* Toolbar */}
      <div
        className="px-4 sm:px-6 py-3 sm:py-4 sticky top-16 z-10"
        style={{
          background: "rgba(255,255,255,0.92)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderBottom: `1px solid ${BRAND.border}`,
        }}
      >
        {selCount > 0 ? (
          // Selection toolbar
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <button
              onClick={() => setSelected(new Set())}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[14px]"
              style={{ background: BRAND.bgDeep, color: BRAND.ink }}
              aria-label="Clear selection"
              title="Esc to clear"
            >
              ✕
            </button>
            <span className="text-sm font-black" style={{ color: BRAND.ink }}>
              {selCount} selected
            </span>
            {filtered.length > selCount && (
              <button
                onClick={selectAllVisible}
                className="text-[11px] font-bold underline"
                style={{ color: BRAND.blueDeep }}
              >
                Select all {filtered.length} visible
              </button>
            )}
            <div className="ml-auto flex items-center gap-1.5 flex-wrap">
              <BulkButton
                label="Scan"
                tone="blue"
                onClick={bulkScan}
                disabled={isPending}
              />
              <BulkButton
                label="Priority"
                tone="warning"
                onClick={bulkPriority}
                disabled={isPending}
              />
              <BulkButton
                label="Forward"
                tone="brown"
                onClick={() => setConfirmBulk("forward")}
                disabled={isPending}
              />
              <BulkButton
                label="Discard"
                tone="danger"
                onClick={() => setConfirmBulk("discard")}
                disabled={isPending}
              />
            </div>
          </div>
        ) : (
          // Search + filter toolbar
          <>
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-2.5 shrink-0">
                <IconMail className="w-4 h-4" style={{ color: BRAND.blue }} />
                <h2
                  className="hidden sm:block font-black text-xs uppercase tracking-[0.16em]"
                  style={{ color: BRAND.ink }}
                >
                  Inbox
                </h2>
              </div>
              <div
                className="flex-1 flex items-center gap-2 px-3 h-9 rounded-full"
                style={{
                  background: BRAND.bgDeep,
                  border: `1px solid ${BRAND.border}`,
                }}
              >
                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="none" stroke={BRAND.inkFaint} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="7" cy="7" r="5" />
                  <path d="M11 11 L14 14" />
                </svg>
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by sender, label, tracking…"
                  className="flex-1 bg-transparent text-sm focus:outline-none"
                  style={{ color: BRAND.ink }}
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="text-[11px] font-black"
                    style={{ color: BRAND.inkFaint }}
                    aria-label="Clear search"
                  >
                    ✕
                  </button>
                )}
                <kbd
                  className="hidden sm:inline-flex items-center px-1.5 h-5 rounded text-[10px] font-mono shrink-0"
                  style={{
                    background: "white",
                    border: `1px solid ${BRAND.border}`,
                    color: BRAND.inkFaint,
                  }}
                >
                  /
                </kbd>
              </div>
              <span
                className="hidden sm:inline-flex text-[10px] font-black px-2.5 py-1 rounded-full shrink-0"
                style={{ background: BRAND.blueSoft, color: BRAND.blueDeep }}
              >
                {filtered.length}/{mailItems.length}
              </span>
            </div>
            {/* Filter chips */}
            <div className="mt-3 flex items-center gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
              {FILTER_DEFS.map((f) => {
                const c = counts[f.key];
                if (f.key !== "all" && c === 0) return null; // hide empty chips
                const active = filter === f.key;
                return (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 h-7 rounded-full text-[11px] font-black uppercase tracking-[0.06em] transition-all"
                    style={
                      active
                        ? {
                            background: `linear-gradient(135deg, ${BRAND.brown} 0%, ${BRAND.brownDeep} 100%)`,
                            color: BRAND.cream,
                            boxShadow: "0 4px 14px rgba(45,16,15,0.20)",
                          }
                        : {
                            background: "white",
                            color: BRAND.ink,
                            border: `1px solid ${BRAND.border}`,
                          }
                    }
                  >
                    {f.label}
                    <span
                      className="text-[10px] px-1 rounded"
                      style={{
                        background: active ? "rgba(247,230,194,0.22)" : BRAND.bgDeep,
                        color: active ? BRAND.cream : BRAND.inkSoft,
                      }}
                    >
                      {c}
                    </span>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Confirm bulk modal */}
      {confirmBulk && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center p-4"
          style={{ background: "rgba(45,16,15,0.55)", backdropFilter: "blur(6px)" }}
          onClick={() => setConfirmBulk(null)}
        >
          <div
            className="rounded-3xl p-6 max-w-sm w-full"
            style={{
              background: "white",
              border: `1px solid ${BRAND.border}`,
              boxShadow: "var(--shadow-cream-md)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              className="text-lg font-black mb-2"
              style={{ color: BRAND.ink, fontFamily: "var(--font-baloo), sans-serif" }}
            >
              {confirmBulk === "forward"
                ? `Forward ${selCount} item${selCount === 1 ? "" : "s"}?`
                : `Discard ${selCount} item${selCount === 1 ? "" : "s"}?`}
            </h3>
            <p className="text-sm mb-5" style={{ color: BRAND.inkSoft }}>
              {confirmBulk === "forward"
                ? "Each item will be forwarded to your default address. Postage applies."
                : "Discarded items are securely shredded and cannot be recovered."}
            </p>
            <div className="flex items-center gap-2 justify-end">
              <button
                onClick={() => setConfirmBulk(null)}
                className="px-4 h-10 rounded-2xl text-[12px] font-black uppercase tracking-[0.06em]"
                style={{ background: "white", color: BRAND.ink, border: `1px solid ${BRAND.border}` }}
              >
                Cancel
              </button>
              <button
                onClick={confirmBulk === "forward" ? bulkForward : bulkDiscard}
                className="px-4 h-10 rounded-2xl text-[12px] font-black uppercase tracking-[0.06em]"
                style={
                  confirmBulk === "discard"
                    ? {
                        background: "var(--color-danger)",
                        color: "white",
                        boxShadow: "0 6px 20px rgba(239,68,68,0.30)",
                      }
                    : {
                        background: `linear-gradient(135deg, ${BRAND.brown} 0%, ${BRAND.brownDeep} 100%)`,
                        color: BRAND.cream,
                        boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
                      }
                }
              >
                {confirmBulk === "forward" ? "Forward all" : "Discard all"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* List */}
      <div>
        {filtered.length === 0 ? (
          <EmptyMail
            hasItems={mailItems.length > 0}
            onClearFilters={() => {
              setQuery("");
              setFilter("all");
            }}
          />
        ) : (
          <ul>
            {/* Select-all bar (hidden when nothing selected) */}
            {selCount === 0 && filtered.length > 1 && (
              <li
                className="px-4 sm:px-6 py-2 flex items-center gap-3 text-[11px]"
                style={{ background: BRAND.bgDeep, borderBottom: `1px solid ${BRAND.border}`, color: BRAND.inkSoft }}
              >
                <button
                  onClick={selectAllVisible}
                  className="font-bold underline"
                  style={{ color: BRAND.blueDeep }}
                >
                  Select all {filtered.length} visible
                </button>
                <span className="opacity-50 hidden sm:inline">
                  Tip: press <kbd style={{ background: "white", border: `1px solid ${BRAND.border}`, padding: "0 4px", borderRadius: 3 }}>/</kbd> to search · click a row to expand
                </span>
              </li>
            )}

            {filtered.map((item, i) => {
              const c = statusColor(item.status);
              const ItemIcon = item.type === "Package" ? IconPackage : IconMail;
              const isSelected = selected.has(item.id);
              const isExpanded = expandedId === item.id;
              return (
                <li
                  key={item.id}
                  className="group relative transition-colors"
                  style={{
                    background: isSelected
                      ? BRAND.blueSoft
                      : isExpanded
                      ? BRAND.bgDeep
                      : "transparent",
                    borderBottom: i < filtered.length - 1 ? `1px solid ${BRAND.border}` : "none",
                  }}
                >
                  <div
                    className="px-4 sm:px-6 py-3 sm:py-4 flex items-center gap-3 sm:gap-4 cursor-pointer"
                    onClick={() => setExpandedId(isExpanded ? null : item.id)}
                  >
                    {/* Selection checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelect(item.id);
                      }}
                      className="w-6 h-6 rounded-md flex items-center justify-center transition-all shrink-0"
                      style={{
                        background: isSelected ? BRAND.brown : "white",
                        border: `1.5px solid ${isSelected ? BRAND.brown : BRAND.border}`,
                        color: BRAND.cream,
                      }}
                      aria-label={isSelected ? "Deselect" : "Select"}
                      aria-pressed={isSelected}
                    >
                      {isSelected && (
                        <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M3 8 L7 12 L13 4" />
                        </svg>
                      )}
                    </button>

                    {/* Thumbnail / icon */}
                    {item.exteriorImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={item.exteriorImageUrl}
                        alt="Mail photo"
                        onClick={(e) => {
                          e.stopPropagation();
                          setScanPreview(item.exteriorImageUrl!);
                        }}
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl object-cover shrink-0 transition-transform duration-300 group-hover:scale-105"
                        style={{ border: `1px solid ${BRAND.border}` }}
                      />
                    ) : (
                      <div
                        className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3"
                        style={{
                          background:
                            item.type === "Package"
                              ? `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`
                              : `linear-gradient(135deg, ${BRAND.blueSoft}, rgba(51,116,133,0.18))`,
                          boxShadow:
                            item.type === "Package"
                              ? "0 4px 14px rgba(51,116,133,0.32)"
                              : "none",
                        }}
                      >
                        <ItemIcon
                          className="w-5 h-5"
                          style={{ color: item.type === "Package" ? "white" : BRAND.blueDeep }}
                        />
                      </div>
                    )}

                    {/* Main column */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {item.priority && (
                          <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 shrink-0" fill="#F5A623" stroke="#B07030" strokeWidth="1" strokeLinejoin="round" aria-label="Priority">
                            <path d="M8 1 L10 5.5 L15 6 L11.5 9.5 L12.5 15 L8 12 L3.5 15 L4.5 9.5 L1 6 L6 5.5 Z" />
                          </svg>
                        )}
                        <p
                          className="text-sm font-black truncate"
                          style={{ color: item.junkBlocked ? BRAND.inkFaint : BRAND.ink }}
                        >
                          {highlightMatch(item.from, query)}
                          {item.junkBlocked && <span className="ml-1 text-[10px] font-normal" style={{ color: "var(--color-danger)" }}>(junk)</span>}
                        </p>
                        <span
                          className="sm:hidden w-2 h-2 rounded-full shrink-0"
                          style={{ background: c.dot }}
                          title={item.status}
                        />
                      </div>
                      <p className="text-[11px] mt-0.5 flex items-center gap-1 flex-wrap" style={{ color: BRAND.inkFaint }}>
                        {item.date} · {item.type}
                        {item.recipientName && (
                          <span className="font-semibold" style={{ color: BRAND.blueDeep }}>
                            · To: {item.recipientName}
                          </span>
                        )}
                        <LabelEditor itemId={item.id} initial={item.label} />
                      </p>
                      {item.trackingNumber && item.carrier && (
                        <a
                          href={getTrackingUrl(item.carrier, item.trackingNumber)}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="text-[10px] font-black flex items-center gap-1 mt-0.5 hover:underline"
                          style={{ color: BRAND.blueDeep }}
                        >
                          <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                            <path d="M6 1 L11 3 L11 9 L6 11 L1 9 L1 3 Z" />
                            <path d="M1 3 L6 5 L11 3" />
                          </svg>
                          {item.carrier} · {item.trackingNumber.slice(-8)}
                        </a>
                      )}
                    </div>

                    {/* Status pill */}
                    <span
                      className="hidden sm:inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full shrink-0"
                      style={{ background: c.bg, color: c.fg }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.dot }} />
                      {item.status}
                    </span>

                    {/* Expand chevron */}
                    <svg
                      viewBox="0 0 16 16"
                      className="w-4 h-4 shrink-0 transition-transform duration-200"
                      style={{
                        color: BRAND.inkFaint,
                        transform: isExpanded ? "rotate(180deg)" : "none",
                      }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6 L8 11 L13 6" />
                    </svg>
                  </div>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div
                      className="px-4 sm:px-6 pb-4 pt-1 grid gap-4 grid-cols-1 sm:grid-cols-[1fr_auto] animate-fade-up"
                      style={{ borderTop: `1px dashed ${BRAND.border}` }}
                    >
                      {/* Scan preview area */}
                      <div className="min-w-0">
                        {item.scanned && item.scanImageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.scanImageUrl}
                            alt="Mail scan"
                            onClick={(e) => {
                              e.stopPropagation();
                              setScanPreview(item.scanImageUrl);
                            }}
                            className="w-full max-w-md rounded-2xl cursor-pointer transition-transform hover:scale-[1.01]"
                            style={{ border: `1px solid ${BRAND.border}` }}
                          />
                        ) : (
                          <div
                            className="rounded-2xl p-4 text-[12px]"
                            style={{
                              background: "white",
                              border: `1px dashed ${BRAND.border}`,
                              color: BRAND.inkSoft,
                            }}
                          >
                            No scan yet. Tap <strong style={{ color: BRAND.blueDeep }}>Scan</strong> for $2/page or
                            <strong style={{ color: BRAND.brown }}> Quick Peek</strong> for $0.50 (exterior preview only).
                          </div>
                        )}
                      </div>

                      {/* Action grid */}
                      <div className="grid grid-cols-4 sm:grid-cols-2 gap-1.5 sm:w-[180px]">
                        {item.scanned && item.scanImageUrl && (
                          <ActionButton
                            tone="blue"
                            label="View scan"
                            icon={<IconEye className="w-4 h-4" />}
                            onClick={() => setScanPreview(item.scanImageUrl)}
                          />
                        )}
                        <ActionButton
                          tone="blue"
                          label="Scan"
                          icon={<IconScan className="w-4 h-4" />}
                          disabled={isPending}
                          onClick={() => runAction("Scan requested", () => requestScan(item.id))}
                        />
                        {!item.scanned && item.type === "Letter" && (
                          <ActionButton
                            tone="brown"
                            label="Quick peek"
                            icon={
                              <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M1.5 8 C1.5 8 4 3.5 8 3.5 C12 3.5 14.5 8 14.5 8 C14.5 8 12 12.5 8 12.5 C4 12.5 1.5 8 1.5 8 Z" />
                                <circle cx="8" cy="8" r="2.5" />
                              </svg>
                            }
                            disabled={isPending}
                            onClick={() => {
                              if (!window.confirm("Quick Peek: $0.50 will be charged from your wallet for an exterior preview scan. Continue?")) return;
                              runAction("Quick Peek requested ($0.50)", () => requestQuickPeek(item.id));
                            }}
                          />
                        )}
                        <ActionButton
                          tone="blue"
                          label="Forward"
                          icon={<IconForward className="w-4 h-4" />}
                          disabled={isPending}
                          onClick={() => runAction("Forward requested", () => requestForward(item.id))}
                        />
                        <ActionButton
                          tone={item.priority ? "warning" : "blue"}
                          label={item.priority ? "Unmark" : "Priority"}
                          icon={
                            <svg viewBox="0 0 16 16" className="w-4 h-4" fill={item.priority ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
                              <path d="M8 1 L10 5.5 L15 6 L11.5 9.5 L12.5 15 L8 12 L3.5 15 L4.5 9.5 L1 6 L6 5.5 Z" />
                            </svg>
                          }
                          disabled={isPending}
                          onClick={() => runAction(item.priority ? "Priority removed" : "Marked priority", () => togglePriorityFlag(item.id))}
                        />
                        <ActionButton
                          tone="muted"
                          label={item.junkBlocked ? "Blocked" : "Block"}
                          icon={
                            <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round">
                              <circle cx="8" cy="8" r="6" />
                              <path d="M3.5 3.5 L12.5 12.5" />
                            </svg>
                          }
                          disabled={isPending}
                          onClick={() => {
                            if (!window.confirm(`Block all mail from "${item.from}"?`)) return;
                            runAction("Sender blocked", () => addJunkSender(item.from));
                          }}
                        />
                        <ActionButton
                          tone="muted"
                          label="Return"
                          icon={<span className="text-sm leading-none">↩</span>}
                          disabled={isPending}
                          onClick={() => runAction("Return to sender requested", () => requestReturnToSender(item.id))}
                        />
                        <ActionButton
                          tone="danger"
                          label="Discard"
                          icon={<IconTrash className="w-4 h-4" />}
                          disabled={isPending}
                          onClick={() => runAction("Discard requested", () => requestDiscard(item.id))}
                        />
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function ActionButton({
  tone,
  label,
  icon,
  onClick,
  disabled,
}: {
  tone: "blue" | "brown" | "warning" | "danger" | "muted";
  label: string;
  icon: React.ReactNode;
  onClick: (e: React.MouseEvent) => void;
  disabled?: boolean;
}) {
  const styles = (() => {
    switch (tone) {
      case "blue":
        return { background: BRAND.blueSoft, color: BRAND.blueDeep };
      case "brown":
        return { background: BRAND.brownSoft, color: BRAND.brown };
      case "warning":
        return { background: "var(--color-warning-soft)", color: "#7C2D12" };
      case "danger":
        return { background: "var(--color-danger-soft)", color: "var(--color-danger)" };
      case "muted":
        return { background: BRAND.brownSoft, color: BRAND.inkSoft };
    }
  })();
  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-1.5 h-10 sm:h-9 px-2 rounded-xl text-[10px] font-black uppercase tracking-[0.06em] transition-all hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
      style={styles}
      title={label}
    >
      <span className="shrink-0">{icon}</span>
      <span className="hidden sm:inline truncate">{label}</span>
    </button>
  );
}

function BulkButton({
  label,
  tone,
  onClick,
  disabled,
}: {
  label: string;
  tone: "blue" | "brown" | "warning" | "danger";
  onClick: () => void;
  disabled?: boolean;
}) {
  const styles = (() => {
    switch (tone) {
      case "blue":
        return { background: BRAND.blueSoft, color: BRAND.blueDeep, border: `1px solid ${BRAND.border}` };
      case "brown":
        return {
          background: `linear-gradient(135deg, ${BRAND.brown} 0%, ${BRAND.brownDeep} 100%)`,
          color: BRAND.cream,
          boxShadow: "0 4px 14px rgba(45,16,15,0.20)",
          border: "none",
        };
      case "warning":
        return { background: "var(--color-warning-soft)", color: "#7C2D12", border: "1px solid rgba(245,158,11,0.30)" };
      case "danger":
        return {
          background: "var(--color-danger)",
          color: "white",
          boxShadow: "0 4px 14px rgba(239,68,68,0.30)",
          border: "none",
        };
    }
  })();
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full text-[11px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
      style={styles}
    >
      {label}
    </button>
  );
}

function EmptyMail({ hasItems, onClearFilters }: { hasItems: boolean; onClearFilters: () => void }) {
  if (hasItems) {
    return (
      <div className="p-10 sm:p-12 text-center">
        <span
          className="ai-icon inline-flex items-center justify-center w-12 h-12 rounded-2xl mb-3"
          style={{ background: BRAND.bgDeep, color: BRAND.blue }}
        >
          <svg viewBox="0 0 16 16" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="7" cy="7" r="5" />
            <path d="M11 11 L14 14" />
          </svg>
        </span>
        <p className="text-sm font-black" style={{ color: BRAND.ink }}>
          No matches
        </p>
        <p className="text-[12px] mt-1 max-w-xs mx-auto" style={{ color: BRAND.inkSoft }}>
          Try a different filter or search term.
        </p>
        <button
          onClick={onClearFilters}
          className="mt-4 inline-flex items-center px-3 h-8 rounded-full text-[11px] font-black uppercase tracking-[0.06em]"
          style={{
            background: BRAND.brown,
            color: BRAND.cream,
            boxShadow: "0 4px 14px rgba(45,16,15,0.20)",
          }}
        >
          Reset filters
        </button>
      </div>
    );
  }
  return (
    <div className="p-10 sm:p-12 text-center">
      <IconMail className="w-12 h-12 mx-auto mb-3" style={{ color: BRAND.inkFaint }} strokeWidth={1.2} />
      <p className="text-sm font-bold" style={{ color: BRAND.inkSoft }}>
        No mail yet
      </p>
      <p className="text-xs mt-1 max-w-xs mx-auto" style={{ color: BRAND.inkFaint }}>
        When mail addressed to your suite arrives, we log it here within minutes — you&apos;ll get a text and an email.
      </p>
      <div className="mt-5 flex flex-wrap gap-2 justify-center text-[11px] font-bold">
        <a href="/dashboard?tab=settings" className="px-3 py-1.5 rounded-lg transition-colors" style={{ background: BRAND.blueSoft, color: BRAND.blueDeep }}>
          Set up vacation hold
        </a>
        <a href="/dashboard?tab=forwarding" className="px-3 py-1.5 rounded-lg transition-colors" style={{ background: BRAND.blueSoft, color: BRAND.blueDeep }}>
          Add forwarding address
        </a>
      </div>
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

/** Wrap matched substring in a <mark> with brand-blue tint. */
function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx === -1) return text;
  const before = text.slice(0, idx);
  const hit = text.slice(idx, idx + q.length);
  const after = text.slice(idx + q.length);
  return (
    <>
      {before}
      <mark
        style={{
          background: "rgba(245,166,35,0.30)",
          color: "inherit",
          padding: "0 1px",
          borderRadius: 2,
        }}
      >
        {hit}
      </mark>
      {after}
    </>
  );
}
