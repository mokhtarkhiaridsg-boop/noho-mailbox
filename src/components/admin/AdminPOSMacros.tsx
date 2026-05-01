"use client";

/**
 * MacroToolbar — POS quick-keys component (iter-14).
 *
 * 8 customizable hotkeys above the LCD. Cashier presses one → adds that
 * item to the cart. Edit mode reveals a tiny "swap" badge on each filled
 * slot and a "+" on each empty slot. Click the badge → popover with search
 * to pick a different catalog entry. Slots persist to localStorage.
 *
 * Lives in its own file because the AdminPOSPanel monolith was tipping
 * Turbopack's build into a multi-minute compile pass.
 */

import { useMemo } from "react";
import type { POSCatalogEntry } from "@/lib/pos";

const CREAM = "#F7E6C2";
const BROWN = "#2D100F";

type Props = {
  slots: string[];
  catalog: POSCatalogEntry[];
  editing: boolean;
  setEditing: (v: boolean) => void;
  swapIndex: number | null;
  setSwapIndex: (v: number | null) => void;
  search: string;
  setSearch: (v: string) => void;
  onAdd: (sku: string) => void;
  onSwap: (idx: number, sku: string) => void;
  onClear: (idx: number) => void;
  onResetDefaults: () => void;
};

export function MacroToolbar({
  slots,
  catalog,
  editing,
  setEditing,
  swapIndex,
  setSwapIndex,
  search,
  setSearch,
  onAdd,
  onSwap,
  onClear,
  onResetDefaults,
}: Props) {
  // 8 slots — fill missing with empty strings
  const padded = [...slots];
  while (padded.length < 8) padded.push("");

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = catalog.filter((c) => c.category !== "Custom");
    if (!q) return list.slice(0, 16);
    const tokens = q.split(/\s+/);
    return list.filter((c) => {
      const hay = `${c.name} ${c.category} ${c.hint ?? ""} ${c.sku}`.toLowerCase();
      return tokens.every((t) => hay.includes(t));
    }).slice(0, 16);
  }, [catalog, search]);

  return (
    <div className="relative">
      <div className="flex items-center justify-between mb-1">
        <div className="text-[9px] font-black tracking-[0.32em] uppercase rail-engrave">
          ◆ Quick Keys
        </div>
        <div className="flex items-center gap-2">
          {editing && (
            <button
              onClick={onResetDefaults}
              className="text-[9px] font-bold tracking-wider px-2 py-1 rounded"
              style={{ background: "rgba(255,255,255,0.06)", color: "var(--rail-text)", border: "1px solid var(--cab-trim)" }}
            >
              RESET
            </button>
          )}
          <button
            onClick={() => { setEditing(!editing); setSwapIndex(null); setSearch(""); }}
            className={`macro-edit-pill ${editing ? "active" : ""}`}
            title={editing ? "Done editing" : "Customize quick keys"}
          >
            {editing ? "DONE" : "EDIT"}
          </button>
        </div>
      </div>

      <div className="macro-row">
        {padded.map((sku, i) => {
          const entry = sku ? catalog.find((c) => c.sku === sku) : null;

          if (!entry) {
            return (
              <button
                key={`empty-${i}`}
                className="macro-key empty"
                onClick={() => { setEditing(true); setSwapIndex(i); }}
                title="Click to assign a quick key"
              >
                <span className="text-[20px] font-black opacity-50 leading-none">+</span>
                <span className="macro-label opacity-70">EMPTY</span>
                <span className="text-[9px] font-bold opacity-50">SLOT {i + 1}</span>
              </button>
            );
          }

          const cat = entry.category as "Service" | "Supplies" | "Fees" | "Mailbox" | string;
          const glyphPath = MACRO_GLYPHS[pickGlyphKey(entry.sku, entry.category)];
          return (
            <div key={`${sku}-${i}`} className="relative">
              <button
                className={`macro-key cat-${cat}`}
                style={{ animationDelay: `${i * 30}ms` }}
                onClick={() => editing ? setSwapIndex(swapIndex === i ? null : i) : onAdd(entry.sku)}
                title={editing ? "Click to swap" : `${entry.name} · ${(entry.priceCents / 100).toFixed(2)}`}
              >
                <span className="macro-icon" aria-hidden>
                  <svg
                    viewBox="0 0 24 24"
                    width="100%"
                    height="100%"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.75"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    dangerouslySetInnerHTML={{ __html: glyphPath }}
                  />
                </span>
                <span className="macro-label" style={{ fontSize: shortenLabel(entry.name).length > 12 ? 8 : 9 }}>
                  {shortenLabel(entry.name)}
                </span>
                <span className="macro-price">${(entry.priceCents / 100).toFixed(2)}</span>
                {editing && <span className="macro-edit-badge">⇄</span>}
                {editing && (
                  <span
                    className="macro-edit-badge del"
                    onClick={(e) => { e.stopPropagation(); onClear(i); }}
                    title="Remove from quick keys"
                  >
                    ×
                  </span>
                )}
              </button>
              {editing && swapIndex === i && (
                <div className="macro-swap" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[9px] font-black tracking-[0.18em] uppercase opacity-65" style={{ color: BROWN }}>
                      Slot {i + 1}
                    </span>
                    <input
                      autoFocus
                      type="search"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search catalog…"
                      className="flex-1 px-2 py-1 rounded border border-[#8c6e27] bg-white text-[12px] font-medium focus:outline-none"
                      style={{ color: BROWN }}
                    />
                    <button
                      onClick={() => { setSwapIndex(null); setSearch(""); }}
                      className="text-[9px] font-black tracking-wider px-2 py-1 rounded"
                      style={{ background: BROWN, color: CREAM }}
                    >
                      ESC
                    </button>
                  </div>
                  <div className="max-h-60 overflow-y-auto rounded border border-[#d8c89a] bg-white">
                    {filteredCatalog.length === 0 ? (
                      <div className="px-3 py-4 text-[12px] text-text-light/60 text-center font-bold">
                        No matches.
                      </div>
                    ) : filteredCatalog.map((c) => (
                      <button
                        key={c.sku}
                        onClick={() => onSwap(i, c.sku)}
                        className="block w-full text-left px-3 py-1.5 text-[12px] hover:bg-[#f3e7c4] border-b border-[#e8d8a8] last:border-b-0"
                        style={{ color: BROWN }}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="font-bold truncate">{c.name}</div>
                            <div className="text-[9px] opacity-60 uppercase tracking-wider">{c.category}{c.hint ? ` · ${c.hint}` : ""}</div>
                          </div>
                          <div className="font-black tabular-nums shrink-0">${(c.priceCents / 100).toFixed(2)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Trim down long catalog names to fit in macro-key labels
function shortenLabel(s: string): string {
  const head = s.split(" · ")[0];
  return head.replace(
    /\s*\((small|medium|large|sm|md|lg)\)\s*$/i,
    (_m, sz: string) => " " + sz[0].toUpperCase(),
  ).trim();
}

// Pick a glyph key for a SKU/category — returns the lookup key, glyph paths
// live in a flat data table below.
function pickGlyphKey(sku: string, category: string): keyof typeof MACRO_GLYPHS {
  if (sku.startsWith("svc:notary"))    return "seal";
  if (sku.startsWith("svc:scan"))      return "scan";
  if (sku.startsWith("svc:fwd"))       return "forward";
  if (sku.startsWith("svc:shred"))     return "shred";
  if (sku.startsWith("svc:fax"))       return "fax";
  if (sku.startsWith("svc:print"))     return "print";
  if (sku.startsWith("svc:copy"))      return "copy";
  if (sku.startsWith("svc:photo"))     return "camera";
  if (sku.startsWith("svc:delivery"))  return "truck";
  if (sku.startsWith("sup:bub"))       return "bubble";
  if (sku.startsWith("sup:box"))       return "box";
  if (sku.startsWith("sup:tape"))      return "tape";
  if (sku.startsWith("sup:lab"))       return "label";
  if (sku.startsWith("sup:env"))       return "envelope";
  if (sku.startsWith("sup:stamp"))     return "stamp";
  if (sku.startsWith("fee:lostkey"))   return "key";
  if (sku.startsWith("fee:key"))       return "key";
  if (sku.startsWith("fee:deposit"))   return "coin";
  if (sku.startsWith("fee:setup"))     return "plug";
  if (sku.startsWith("fee:business"))  return "briefcase";
  if (sku.startsWith("plan:"))         return "mailbox";
  if (category === "Service")          return "scan";
  if (category === "Supplies")         return "box";
  if (category === "Fees")             return "coin";
  if (category === "Mailbox")          return "mailbox";
  return "tag";
}

// SVG glyph inner-HTML by key. Each value is the inner content of a 24×24
// 1.75-stroke currentColor svg. Defined as a flat record (rather than 22
// separate JSX components) so Turbopack doesn't choke parsing them.
const MACRO_GLYPHS = {
  seal:      `<circle cx="12" cy="9" r="5" /><path d="m9 13-1.5 6 4.5-2 4.5 2L15 13" />`,
  scan:      `<rect x="4" y="6" width="16" height="12" rx="1" /><path d="M4 12h16" />`,
  forward:   `<path d="M3 12h13 M11 7l5 5-5 5" /><rect x="17" y="5" width="4" height="14" rx="0.5" />`,
  shred:     `<rect x="4" y="3" width="14" height="8" rx="1" /><path d="M3 11h18 M7 14v6 M11 14v6 M15 14v6 M19 14v6" />`,
  fax:       `<path d="M7 6V3h10v3" /><rect x="3" y="6" width="18" height="11" rx="1.5" /><rect x="7" y="13" width="10" height="6" rx="0.5" />`,
  print:     `<path d="M6 9V3h12v6 M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" /><rect x="6" y="14" width="12" height="7" rx="1" />`,
  copy:      `<rect x="8" y="8" width="13" height="13" rx="1.5" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" />`,
  camera:    `<path d="M3 8a2 2 0 0 1 2-2h2.5l1.5-2h6l1.5 2H19a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><circle cx="12" cy="13" r="4" />`,
  truck:     `<path d="M3 7h11v10H3z M14 11h4l3 3v3h-7" /><circle cx="7" cy="18" r="1.6" /><circle cx="17" cy="18" r="1.6" />`,
  bubble:    `<rect x="3" y="6" width="18" height="13" rx="1" /><circle cx="8" cy="12" r="1.4" /><circle cx="13" cy="12" r="1.4" />`,
  box:       `<path d="m3 7 9 5 9-5 M3 7v10l9 5 9-5V7 M3 7l9-4 9 4 M12 12v10" />`,
  tape:      `<circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3" /><path d="M16 16l4 4" />`,
  label:     `<path d="M20 12 12 4H4v8l8 8z" /><circle cx="8.5" cy="8.5" r="1.2" />`,
  envelope:  `<rect x="3" y="6" width="18" height="14" rx="1.5" /><path d="m3 8 9 6 9-6" />`,
  stamp:     `<rect x="5" y="3" width="14" height="14" rx="1" stroke-dasharray="2 2" /><path d="M3 21h18 M9 17v-3 M15 17v-3" />`,
  key:       `<circle cx="8" cy="14" r="4" /><path d="m11 11 9-9 M16 6l3 3 M14 8l3 3" />`,
  coin:      `<circle cx="12" cy="12" r="9" /><path d="M9 9.5h5l-1 1.5H10v3h4" />`,
  plug:      `<path d="M9 3v6 M15 3v6 M6 9h12v3a6 6 0 0 1-12 0z M12 18v3" />`,
  briefcase: `<rect x="3" y="7" width="18" height="13" rx="1.5" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2 M3 13h18" />`,
  mailbox:   `<path d="M3 11a5 5 0 0 1 5-5h8a5 5 0 0 1 5 5v9H3z M16 6v5 M11 14h4 M7 16v4" />`,
  tag:       `<path d="M20 12 12 4H4v8l8 8z" />`,
} as const;
