"use client";

// iter-86 — Admin Cmd+K omnibox.
//
// Global command palette opened by Cmd/Ctrl+K (or "/"). Searches across
// customers, mail items, external dropoffs, label orders, and Shippo
// labels. Also exposes static "navigate" + "quick action" entries:
// Open Shipping Center, Open Inbound Scan, Open Mailer, etc.
//
// Keyboard nav: ↑↓ to move selection, Enter to commit, Esc to close.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { omniSearch, type OmniHit } from "@/app/actions/adminOmni";

const NOHO_BLUE = "#1976FF";
const NOHO_BLUE_DEEP = "#0F5BD9";
const NOHO_INK = "#1A1D23";

type StaticAction = {
  kind: "nav";
  id: string;
  primary: string;
  secondary: string;
  perform: (router: ReturnType<typeof useRouter>) => void;
};

const NAV_ACTIONS: StaticAction[] = [
  { kind: "nav", id: "nav.shipping",  primary: "Open Shipping Center",  secondary: "Quick Ship · Pickup · Dropoff · Run Sheet", perform: (r) => r.push("/admin?tab=shippingcenter") },
  { kind: "nav", id: "nav.inbound",   primary: "Open Inbound Scan",     secondary: "Scan / Pickup / Dropoff modes",            perform: (r) => r.push("/admin?tab=shippingcenter#scan") },
  { kind: "nav", id: "nav.mailer",    primary: "Open Bulk Mailer",      secondary: "Email a campaign to members",              perform: (r) => r.push("/admin?tab=mailer") },
  { kind: "nav", id: "nav.lookup",    primary: "Universal package lookup", secondary: "Search by tracking #",                  perform: (r) => r.push("/admin/lookup") },
  { kind: "nav", id: "nav.customers", primary: "Customers list",        secondary: "All members",                              perform: (r) => r.push("/admin?tab=customers") },
  { kind: "nav", id: "nav.mail",      primary: "Mail & Packages",       secondary: "Master mail list",                         perform: (r) => r.push("/admin?tab=mail") },
  { kind: "nav", id: "nav.requests",  primary: "Mail requests",         secondary: "Pending scan / forward / discard",         perform: (r) => r.push("/admin?tab=requests") },
  { kind: "nav", id: "nav.billing",   primary: "Billing",               secondary: "Invoices · payments",                       perform: (r) => r.push("/admin?tab=billing") },
  { kind: "nav", id: "nav.emails",    primary: "Email logs",            secondary: "Delivery audit trail",                     perform: (r) => r.push("/admin?tab=emails") },
];

function kindLabel(kind: OmniHit["kind"] | "nav"): string {
  switch (kind) {
    case "customer":   return "Customer";
    case "mail":       return "Mail item";
    case "dropoff":    return "Dropoff";
    case "labelOrder": return "Label order";
    case "shippo":     return "Shippo label";
    case "nav":        return "Navigate";
  }
}

function kindColor(kind: OmniHit["kind"] | "nav"): { bg: string; fg: string } {
  switch (kind) {
    case "customer":   return { bg: "rgba(51,116,133,0.12)", fg: NOHO_BLUE_DEEP };
    case "mail":       return { bg: "rgba(245,166,35,0.14)", fg: "#92400e" };
    case "dropoff":    return { bg: "rgba(13,148,136,0.12)", fg: "#0f766e" };
    case "labelOrder": return { bg: "rgba(124,58,237,0.10)", fg: "#5b21b6" };
    case "shippo":     return { bg: "rgba(22,163,74,0.12)",  fg: "#15803d" };
    case "nav":        return { bg: "rgba(0,0,0,0.06)",   fg: NOHO_INK };
  }
}

export function AdminCommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<OmniHit[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Reset on open
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHits([]);
    setSelectedIdx(0);
    // Focus input on next tick so the modal animation doesn't fight focus.
    const h = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(h);
  }, [open]);

  // Debounced server search
  useEffect(() => {
    if (!open) return;
    const trimmed = query.trim();
    if (trimmed.length < 2) { setHits([]); return; }
    const handle = setTimeout(() => {
      setLoading(true);
      void omniSearch(trimmed)
        .then((res) => setHits(res.hits))
        .catch(() => setHits([]))
        .finally(() => setLoading(false));
    }, 180);
    return () => clearTimeout(handle);
  }, [query, open]);

  // Composed list: nav matches at the top, then server hits.
  const navMatches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return NAV_ACTIONS.slice(0, 4); // show a starter set when empty
    return NAV_ACTIONS.filter((n) =>
      n.primary.toLowerCase().includes(q) || n.secondary.toLowerCase().includes(q)
    );
  }, [query]);

  type Row = (OmniHit | StaticAction);
  const rows = useMemo<Row[]>(() => [...navMatches, ...hits], [navMatches, hits]);

  // Reset selection when the row count changes.
  useEffect(() => { setSelectedIdx(0); }, [rows.length]);

  // Scroll selected row into view (the list can overflow).
  useEffect(() => {
    const li = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    li?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  const commit = useCallback((row: Row) => {
    if (row.kind === "nav") {
      row.perform(router);
    } else {
      router.push(row.href);
    }
    onClose();
  }, [router, onClose]);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIdx((i) => Math.min(i + 1, rows.length - 1)); return; }
    if (e.key === "ArrowUp")   { e.preventDefault(); setSelectedIdx((i) => Math.max(i - 1, 0)); return; }
    if (e.key === "Enter") {
      const row = rows[selectedIdx];
      if (row) { e.preventDefault(); commit(row); }
      return;
    }
    if (e.key === "Escape") { e.preventDefault(); onClose(); return; }
  }

  if (!open) return null;
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Admin command palette"
      className="fixed inset-0 z-[80] flex items-start justify-center pt-[12vh] px-4"
      style={{ background: "rgba(0,0,0,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-md overflow-hidden"
        style={{ background: "white", border: "1px solid #ECEEF1", boxShadow: "0 16px 48px rgba(26,23,20,0.20)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: "#e8e5e0" }}>
          <span style={{ color: "rgba(0,0,0,0.40)", fontSize: 16 }}>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Search customers, packages, dropoffs, labels…"
            className="flex-1 outline-none text-base font-medium bg-transparent"
            style={{ color: NOHO_INK }}
          />
          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(0,0,0,0.06)", color: "rgba(0,0,0,0.55)" }}>
            ESC
          </span>
        </div>

        <ul
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto"
          style={{ background: "#fafaf7" }}
        >
          {rows.length === 0 ? (
            <li className="px-4 py-12 text-center text-[12px] font-bold" style={{ color: "rgba(0,0,0,0.45)" }}>
              {loading ? "Searching…" : query.trim().length < 2 ? "Type at least 2 characters" : "No matches"}
            </li>
          ) : rows.map((row, idx) => {
            const c = kindColor(row.kind);
            const selected = idx === selectedIdx;
            return (
              <li
                key={`${row.kind}-${row.id}`}
                onMouseEnter={() => setSelectedIdx(idx)}
                onClick={() => commit(row)}
                className="px-4 py-2.5 flex items-center gap-3 cursor-pointer transition-colors"
                style={{
                  background: selected ? "rgba(51,116,133,0.08)" : "transparent",
                  borderLeft: `3px solid ${selected ? NOHO_BLUE : "transparent"}`,
                }}
              >
                <span
                  className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: c.bg, color: c.fg, minWidth: 64, textAlign: "center" }}
                >
                  {kindLabel(row.kind)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-black truncate" style={{ color: NOHO_INK }}>
                    {row.primary}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: "rgba(0,0,0,0.55)" }}>
                    {row.secondary}
                    {row.kind !== "nav" && row.tertiary && (
                      <span style={{ marginLeft: 6, color: "rgba(0,0,0,0.40)" }}>· {row.tertiary}</span>
                    )}
                  </p>
                </div>
                {selected && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: NOHO_BLUE, color: "white" }}>
                    ⏎
                  </span>
                )}
              </li>
            );
          })}
        </ul>

        <div className="flex items-center justify-between px-4 py-2 text-[10.5px] border-t" style={{ borderColor: "#e8e5e0", background: "white", color: "rgba(0,0,0,0.55)" }}>
          <span>↑↓ navigate · ⏎ open · ESC close</span>
          <span>{rows.length} {rows.length === 1 ? "result" : "results"}{loading ? " · …" : ""}</span>
        </div>
      </div>
    </div>
  );
}
