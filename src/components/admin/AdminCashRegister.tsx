"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getPOSCatalog,
  getRecentSales,
  getTodaysTill,
  createSale,
  emailPOSReceipt,
  smsPOSReceipt,
  markReceiptPrinted,
  searchPOSCustomers,
} from "@/app/actions/pos";
import {
  type POSCatalogEntry,
  type POSSaleRow,
  type POSPaymentMethod,
} from "@/lib/pos";
import AdminInvoiceBuilder from "./AdminInvoiceBuilder";
import { emptyMeta, type InvoiceMeta } from "@/lib/invoice-builder";

// Local cart line — like POSCartLine but with a guaranteed string sku so we
// can use it as a stable React key + lookup index without null-juggling.
type LocalCartLine = {
  sku: string;
  name: string;
  category: string;
  unitPriceCents: number;
  quantity: number;
};

// ─── Design tokens ──────────────────────────────────────────────────────
// iPad-OS aesthetic: pure white surface, soft gray accents, single blue
// accent. Replaces the previous cream/brown register chrome that didn't
// fit the new minimal admin shell.
const T = {
  bg: "#F4F5F7",
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  borderStrong: "#D8DCE2",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  accent: "#1976FF",
  accentSoft: "#EBF2FF",
  accentDeep: "#0F5BD9",
  blue: "#1976FF",
  success: "#22C55E",
  danger: "#EF4444",
};

const MONO = "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace";
const TAB_NUM: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: "'tnum' 1",
  fontFamily: MONO,
};

const fmt = (cents: number) =>
  `$${(cents / 100).toFixed(2)}`;

// ─── Component ──────────────────────────────────────────────────────────
export default function AdminCashRegister() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [catalog, setCatalog] = useState<POSCatalogEntry[]>([]);
  const [recent, setRecent] = useState<POSSaleRow[]>([]);
  const [till, setTill] = useState<{ total: number; count: number } | null>(null);
  const [tab, setTab] = useState<string>("All");
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<LocalCartLine[]>([]);
  const [customerId, setCustomerId] = useState<string | null>(null);
  const [customerLabel, setCustomerLabel] = useState<string>("");
  const [discountInput, setDiscountInput] = useState<string>(""); // $ or % e.g. "10" or "10%"
  const [taxRate, setTaxRate] = useState<number>(0.095);
  const [showPay, setShowPay] = useState(false);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showRecent, setShowRecent] = useState(false);
  const [now, setNow] = useState<Date | null>(null);
  const [postSale, setPostSale] = useState<{ saleId: string; total: number } | null>(null);
  const [invoiceBuilderOpen, setInvoiceBuilderOpen] = useState(false);
  const [invoicePrefill, setInvoicePrefill] = useState<InvoiceMeta | null>(null);

  const searchRef = useRef<HTMLInputElement>(null);

  // ─── Boot + live ticks ────────────────────────────────────────────────
  useEffect(() => {
    Promise.all([getPOSCatalog(), getRecentSales(8), getTodaysTill()])
      .then(([c, r, t]) => {
        setCatalog(c);
        setRecent(r);
        setTill({ total: t.totalCents, count: t.count });
      })
      .catch(() => {});
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  // Refresh recent + till after every sale
  function reloadFeed() {
    Promise.all([getRecentSales(8), getTodaysTill()]).then(([r, t]) => {
      setRecent(r);
      setTill({ total: t.totalCents, count: t.count });
    });
  }

  // ─── Categories from catalog ──────────────────────────────────────────
  const categories = useMemo(() => {
    const set = new Set<string>(["All"]);
    catalog.forEach((c) => set.add(c.category));
    return Array.from(set);
  }, [catalog]);

  const visibleCatalog = useMemo(() => {
    const q = query.trim().toLowerCase();
    return catalog.filter((c) => {
      if (tab !== "All" && c.category !== tab) return false;
      if (!q) return true;
      return (
        c.name.toLowerCase().includes(q) ||
        c.sku.toLowerCase().includes(q) ||
        (c.hint ?? "").toLowerCase().includes(q)
      );
    });
  }, [catalog, tab, query]);

  // ─── Cart math ────────────────────────────────────────────────────────
  const cartMath = useMemo(() => {
    const subtotal = cart.reduce((s, l) => s + l.quantity * l.unitPriceCents, 0);
    const discountCents = parseDiscount(discountInput, subtotal);
    const taxBase = Math.max(0, subtotal - discountCents);
    const tax = Math.round(taxBase * taxRate);
    const total = taxBase + tax;
    return { subtotal, discount: discountCents, tax, total };
  }, [cart, discountInput, taxRate]);

  // ─── Cart helpers ─────────────────────────────────────────────────────
  function addItem(c: POSCatalogEntry) {
    setCart((prev) => {
      const i = prev.findIndex((l) => l.sku === c.sku);
      if (i >= 0) {
        const next = [...prev];
        next[i] = { ...next[i], quantity: next[i].quantity + 1 };
        return next;
      }
      return [
        ...prev,
        {
          sku: c.sku,
          name: c.name,
          unitPriceCents: c.priceCents,
          quantity: 1,
          category: c.category,
        },
      ];
    });
  }
  function setQty(sku: string, quantity: number) {
    setCart((prev) =>
      quantity <= 0
        ? prev.filter((l) => l.sku !== sku)
        : prev.map((l) => (l.sku === sku ? { ...l, quantity } : l)),
    );
  }
  function removeLine(sku: string) {
    setCart((prev) => prev.filter((l) => l.sku !== sku));
  }
  function clearCart() {
    setCart([]);
    setDiscountInput("");
    setCustomerId(null);
    setCustomerLabel("");
  }

  // ─── Charge ───────────────────────────────────────────────────────────
  function handleCharge(method: POSPaymentMethod) {
    if (cart.length === 0 || pending) return;
    startTransition(async () => {
      const res = await createSale({
        cart,
        paymentMethod: method,
        customerId: customerId ?? undefined,
        discountCents: cartMath.discount > 0 ? cartMath.discount : undefined,
        taxCents: cartMath.tax > 0 ? cartMath.tax : undefined,
        notes: customerLabel || undefined,
      });
      if ("error" in res) {
        alert(res.error);
        return;
      }
      setPostSale({ saleId: res.saleId, total: cartMath.total });
      setShowPay(false);
      clearCart();
      reloadFeed();
    });
  }

  // ─── Keyboard ─────────────────────────────────────────────────────────
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA";
      if (!inField && e.key === "/") {
        e.preventDefault();
        searchRef.current?.focus();
      }
      if (e.key === "Escape") {
        setShowPay(false);
        setShowCustomerSearch(false);
        setShowRecent(false);
        setPostSale(null);
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // Compute the cart line count (qty-summed) for the bottom dock pill.
  const cartCount = cart.reduce((s, l) => s + l.quantity, 0);
  const [showCart, setShowCart] = useState(false);

  return (
    <div
      className="flex flex-col rounded-3xl overflow-hidden"
      style={{
        height: "100%",
        background: T.surface,
        boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06)",
        color: T.ink,
      }}
    >
      {/* ─── Title bar — iPad-OS style header with current sales total
          inline. No more cream status strip; this is one calm row. */}
      <div
        className="flex items-center justify-between px-6 sm:px-8 h-16"
        style={{
          borderBottom: `1px solid ${T.border}`,
          color: T.inkSoft,
        }}
      >
        <div className="flex items-baseline gap-3 flex-wrap">
          <span
            className="text-2xl font-bold"
            style={{
              color: T.ink,
              letterSpacing: "-0.01em",
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
            }}
          >
            Cash Register
          </span>
          <span
            className="text-[15px] hidden sm:inline"
            style={{
              color: T.accent,
              fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
              transform: "translateY(-1px)",
              display: "inline-block",
            }}
          >
            ring it up
          </span>
          <span className="text-[12px] ml-1" style={{ color: T.inkFaint, ...TAB_NUM }}>
            {now ? now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "—"}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-[0.10em]" style={{ color: T.inkFaint }}>Today</span>
            <span className="text-[15px] font-semibold" style={{ ...TAB_NUM, color: T.ink }}>
              {till ? fmt(till.total) : "—"} <span style={{ color: T.inkFaint, fontWeight: 400 }}>· {till?.count ?? 0}</span>
            </span>
          </div>
          <button
            onClick={() => setShowRecent(true)}
            className="px-3.5 h-9 rounded-full text-[12px] font-medium transition-colors"
            style={{ background: T.surfaceAlt, color: T.ink }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#E8EBEF"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = T.surfaceAlt; }}
          >
            Recent sales
          </button>
        </div>
      </div>

      {/* ─── Main body — industry-standard POS split.
          LEFT (catalog): search + categories + 2-col list.
          RIGHT (cart pane): customer · line items · totals · Charge.
          Cart is ALWAYS visible — cashier never has to open a drawer
          to confirm what's about to be charged. */}
      <div className="flex-1 flex min-h-0">
        {/* Catalog — left ~62%. */}
        <div
          className="flex-1 min-h-0 flex flex-col p-5 sm:p-6"
        >
          {/* Segmented category control — iPad-OS style. Replaces the
              earlier row of all-caps pills which read as "loud" against
              the calm catalog. Single visual anchor, less noise. */}
          <div
            className="flex p-1 rounded-xl mb-3 self-start"
            style={{ background: T.surfaceAlt }}
          >
            {categories.map((c) => {
              const active = tab === c;
              return (
                <button
                  key={c}
                  onClick={() => setTab(c)}
                  className="px-3.5 h-8 rounded-lg text-[12px] transition-all"
                  style={{
                    background: active ? T.surface : "transparent",
                    color: active ? T.ink : T.inkFaint,
                    fontWeight: active ? 600 : 500,
                    boxShadow: active
                      ? "0 1px 2px rgba(0,0,0,0.04), 0 2px 6px rgba(0,0,0,0.04)"
                      : "none",
                  }}
                >
                  {c}
                </button>
              );
            })}
          </div>

          {/* Quiet search row — only the icon visible by default; expands
              on focus. Less chrome, less anxiety for an employee scanning
              the catalog at a glance. */}
          <div className="relative mb-3">
            <svg
              viewBox="0 0 16 16"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4"
              fill="none"
              stroke={T.inkFaint}
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="7" cy="7" r="5" />
              <path d="M11 11 L14 14" />
            </svg>
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="w-full h-9 pl-9 pr-3 rounded-lg text-sm focus:outline-none"
              style={{
                background: T.surfaceAlt,
                border: "1px solid transparent",
                color: T.ink,
              }}
              onFocus={(e) => { e.currentTarget.style.background = T.surface; e.currentTarget.style.border = `1px solid ${T.border}`; }}
              onBlur={(e) => { e.currentTarget.style.background = T.surfaceAlt; e.currentTarget.style.border = "1px solid transparent"; }}
            />
          </div>

          {/* Apple-list catalog — calm rows instead of colored tiles.
              Two-column on desktop so cashier sees ~16 items at a glance
              without the rainbow-tile anxiety. Tap a row to add. */}
          <div className="flex-1 min-h-0 overflow-y-auto -mx-1 px-1 pb-1">
          {visibleCatalog.length === 0 ? (
            <div
              className="rounded-2xl p-10 text-center"
              style={{ background: T.surfaceAlt }}
            >
              <p className="text-sm font-semibold" style={{ color: T.ink }}>No matches</p>
              <p className="text-[12px] mt-1" style={{ color: T.inkFaint }}>
                Try a different search term or category.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
              {visibleCatalog.map((c) => {
                return (
                  <button
                    key={c.sku}
                    onClick={() => addItem(c)}
                    className="group flex items-center gap-3 px-3 h-12 rounded-lg text-left transition-colors"
                    style={{
                      background: T.surface,
                      border: `1px solid ${T.border}`,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceAlt; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = T.surface; }}
                  >
                    {/* Tiny brand-blue category dot — calm visual anchor */}
                    <span
                      aria-hidden
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ background: T.accent }}
                    />
                    <span
                      className="text-[13px] flex-1 truncate"
                      style={{ color: T.ink, fontWeight: 500 }}
                    >
                      {c.name}
                    </span>
                    <span
                      className="text-[13px] tabular-nums shrink-0"
                      style={{ ...TAB_NUM, color: T.ink, fontWeight: 600 }}
                    >
                      {fmt(c.priceCents)}
                    </span>
                  </button>
                );
              })}
              {/* Custom-line tile lives inside the grid so it never gets
                  awkwardly stranded below. */}
              <button
                onClick={() => {
                  const name = window.prompt("Custom item name?");
                  if (!name) return;
                  const priceStr = window.prompt("Price (in dollars, e.g. 12.50)?");
                  if (!priceStr) return;
                  const cents = Math.round(parseFloat(priceStr) * 100);
                  if (!Number.isFinite(cents) || cents < 0) return;
                  setCart((prev) => [
                    ...prev,
                    { sku: "custom:" + Date.now(), name, unitPriceCents: cents, quantity: 1, category: "Custom" },
                  ]);
                }}
                className="flex items-center gap-3 px-3 h-12 rounded-lg text-left transition-colors"
                style={{
                  background: "transparent",
                  color: T.inkFaint,
                  border: `1px dashed ${T.borderStrong}`,
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceAlt; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
              >
                <span className="text-base shrink-0" style={{ color: T.accent }}>+</span>
                <span className="text-[13px] font-medium">Custom item</span>
              </button>
            </div>
          )}
          </div>

          {/* Hidden — replaced by the in-grid Custom tile above. */}
          <button
            onClick={() => {}}
            className="hidden"
            style={{
              background: "transparent",
              color: T.inkSoft,
              border: `1px dashed ${T.borderStrong}`,
            }}
          >
            + Custom line
          </button>
        </div>

        {/* ─── Right cart pane — always visible. Customer chip top,
            line items middle (scrolls inside its own pane), totals
            below, big Charge button at the bottom. */}
        <aside
          className="hidden lg:flex flex-col w-[380px] shrink-0"
          style={{
            background: T.surfaceAlt,
            borderLeft: `1px solid ${T.border}`,
          }}
        >
          {/* Customer chip / attach */}
          <div
            className="shrink-0 px-5 py-4"
            style={{ borderBottom: `1px solid ${T.border}` }}
          >
            {customerId ? (
              <button
                onClick={() => { setCustomerId(null); setCustomerLabel(""); }}
                className="w-full inline-flex items-center justify-between gap-2 h-10 px-3.5 rounded-xl transition-colors"
                style={{ background: T.accentSoft, color: T.accent, fontSize: 13, fontWeight: 600 }}
                title="Click to remove"
              >
                <span className="inline-flex items-center gap-2 min-w-0">
                  <svg viewBox="0 0 16 16" className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="8" cy="6" r="3" />
                    <path d="M2 14 C2 11 5 9 8 9 C11 9 14 11 14 14" />
                  </svg>
                  <span className="truncate">{customerLabel}</span>
                </span>
                <span style={{ fontSize: 11, color: T.accentDeep }}>change</span>
              </button>
            ) : (
              <button
                onClick={() => setShowCustomerSearch(true)}
                className="w-full inline-flex items-center justify-center gap-2 h-10 rounded-xl transition-colors"
                style={{ background: T.surface, color: T.inkSoft, border: `1px dashed ${T.borderStrong}`, fontSize: 13, fontWeight: 500 }}
              >
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="8" cy="6" r="3" />
                  <path d="M2 14 C2 11 5 9 8 9 C11 9 14 11 14 14" />
                </svg>
                Attach customer
              </button>
            )}
          </div>

          {/* Line items list — scrolls inside the pane */}
          <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center px-6 py-8">
                <span
                  className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-3"
                  style={{ background: T.surface, color: T.inkFaint }}
                >
                  <svg viewBox="0 0 24 24" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 8 H19 L17 18 a2 2 0 0 1 -2 2 H9 a2 2 0 0 1 -2 -2 z" />
                    <path d="M9 8 V5 a3 3 0 0 1 6 0 V8" />
                  </svg>
                </span>
                <p className="text-[13px] font-semibold" style={{ color: T.ink }}>
                  Cart is empty
                </p>
                <p className="text-[11px] mt-1 max-w-[220px]" style={{ color: T.inkFaint }}>
                  Tap items in the catalog to add them here.
                </p>
              </div>
            ) : (
              <ul>
                {cart.map((l) => (
                  <li
                    key={l.sku}
                    className="flex items-center gap-2 py-2.5 px-2 rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold truncate" style={{ color: T.ink }}>
                        {l.name}
                      </p>
                      <p className="text-[11px]" style={{ ...TAB_NUM, color: T.inkFaint }}>
                        {fmt(l.unitPriceCents)} ea
                      </p>
                    </div>
                    <div
                      className="inline-flex items-center rounded-full overflow-hidden shrink-0"
                      style={{ background: T.surface, border: `1px solid ${T.border}` }}
                    >
                      <button
                        onClick={() => setQty(l.sku, l.quantity - 1)}
                        className="w-7 h-7 text-[14px]"
                        style={{ color: T.ink, fontWeight: 600 }}
                        aria-label="decrease quantity"
                      >−</button>
                      <span
                        className="w-7 text-center text-[12px]"
                        style={{ ...TAB_NUM, color: T.ink, fontWeight: 600 }}
                      >
                        {l.quantity}
                      </span>
                      <button
                        onClick={() => setQty(l.sku, l.quantity + 1)}
                        className="w-7 h-7 text-[14px]"
                        style={{ color: T.ink, fontWeight: 600 }}
                        aria-label="increase quantity"
                      >+</button>
                    </div>
                    <span
                      className="text-[13px] w-16 text-right shrink-0"
                      style={{ ...TAB_NUM, color: T.ink, fontWeight: 600 }}
                    >
                      {fmt(l.quantity * l.unitPriceCents)}
                    </span>
                    <button
                      onClick={() => removeLine(l.sku)}
                      className="w-6 h-6 rounded-full text-[11px] shrink-0"
                      style={{ color: T.inkFaint }}
                      title="Remove"
                    >✕</button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Totals + discount/tax + Charge */}
          {cart.length > 0 && (
            <div
              className="shrink-0 px-5 py-4 space-y-3"
              style={{ borderTop: `1px solid ${T.border}`, background: T.surface }}
            >
              <div className="flex items-center gap-2">
                <input
                  value={discountInput}
                  onChange={(e) => setDiscountInput(e.target.value)}
                  placeholder="Discount"
                  className="flex-1 h-9 px-3 rounded-lg focus:outline-none text-center"
                  style={{
                    background: T.surfaceAlt,
                    border: "1px solid transparent",
                    color: T.ink,
                    fontSize: 12,
                    ...TAB_NUM,
                  }}
                  onFocus={(e) => { e.currentTarget.style.background = "#FFFFFF"; e.currentTarget.style.border = `1px solid ${T.border}`; }}
                  onBlur={(e) => { e.currentTarget.style.background = T.surfaceAlt; e.currentTarget.style.border = "1px solid transparent"; }}
                />
                <select
                  value={String(taxRate)}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value))}
                  className="flex-1 h-9 px-3 rounded-lg focus:outline-none"
                  style={{
                    background: T.surfaceAlt,
                    border: "1px solid transparent",
                    color: T.ink,
                    fontSize: 12,
                  }}
                >
                  <option value="0">No tax</option>
                  <option value="0.0925">9.25%</option>
                  <option value="0.095">9.50% LA</option>
                  <option value="0.0975">9.75%</option>
                  <option value="0.105">10.50%</option>
                </select>
              </div>

              <div className="space-y-1">
                <Row label="Subtotal" value={fmt(cartMath.subtotal)} mute />
                {cartMath.discount > 0 && (
                  <Row label="Discount" value={`−${fmt(cartMath.discount)}`} mute negative />
                )}
                {cartMath.tax > 0 && <Row label="Tax" value={fmt(cartMath.tax)} mute />}
                <div
                  className="flex items-center justify-between pt-2 mt-1"
                  style={{ borderTop: `1px solid ${T.border}` }}
                >
                  <span className="text-[13px]" style={{ color: T.ink, fontWeight: 600 }}>
                    Total
                  </span>
                  <span
                    className="text-[20px]"
                    style={{
                      ...TAB_NUM,
                      color: T.ink,
                      fontWeight: 700,
                      fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
                    }}
                  >
                    {fmt(cartMath.total)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={clearCart}
                  className="h-10 px-3.5 rounded-xl text-[12px] transition-colors"
                  style={{ background: T.surfaceAlt, color: T.inkSoft, fontWeight: 500 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = "#E8EBEF"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = T.surfaceAlt; }}
                >
                  Clear
                </button>
                <button
                  onClick={() => {
                    if (cart.length === 0) return;
                    const meta: InvoiceMeta = {
                      ...emptyMeta(),
                      taxRate,
                      invoiceDiscountCents: cartMath.discount,
                      lines: cart.map((l) => ({
                        id: "ln_" + l.sku,
                        description: l.name,
                        qty: l.quantity,
                        unitPriceCents: l.unitPriceCents,
                      })),
                    };
                    setInvoicePrefill(meta);
                    setInvoiceBuilderOpen(true);
                  }}
                  className="flex-1 h-10 rounded-xl text-[12px] transition-colors"
                  style={{ background: T.surface, color: T.ink, border: `1px solid ${T.border}`, fontWeight: 500 }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = T.surfaceAlt; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = T.surface; }}
                >
                  Send invoice
                </button>
              </div>

              <button
                onClick={() => setShowPay(true)}
                disabled={pending}
                className="w-full h-12 rounded-xl text-[15px] font-semibold transition-colors"
                style={{
                  background: T.accent,
                  color: "#FFFFFF",
                  border: `1px solid ${T.accent}`,
                  opacity: pending ? 0.7 : 1,
                  ...TAB_NUM,
                }}
                onMouseEnter={(e) => { if (!pending) e.currentTarget.style.background = T.accentDeep; }}
                onMouseLeave={(e) => { if (!pending) e.currentTarget.style.background = T.accent; }}
              >
                {pending ? "Charging…" : `Charge · ${fmt(cartMath.total)}`}
              </button>
            </div>
          )}
        </aside>
      </div>

      {/* Mobile cart bar — shows on screens narrower than lg. The cart
          pane is hidden under lg breakpoint to avoid squishing the
          catalog; this strip surfaces the same Charge action with a
          drawer for review. */}
      {cart.length > 0 && (
        <div
          className="lg:hidden shrink-0 px-4 py-3 flex items-center gap-3"
          style={{ borderTop: `1px solid ${T.border}`, background: T.surfaceAlt }}
        >
          <button
            onClick={() => setShowCart(true)}
            className="flex-1 h-10 px-4 rounded-full inline-flex items-center justify-between gap-3"
            style={{
              background: T.surface,
              border: `1px solid ${T.border}`,
              color: T.ink,
            }}
          >
            <span style={{ fontSize: 12, fontWeight: 500 }}>
              {cartCount} item{cartCount === 1 ? "" : "s"} · review →
            </span>
            <span style={{ ...TAB_NUM, fontSize: 13, fontWeight: 600 }}>
              {fmt(cartMath.subtotal)}
            </span>
          </button>
          <button
            onClick={() => setShowPay(true)}
            disabled={pending}
            className="shrink-0 h-10 px-5 rounded-full"
            style={{
              background: T.accent,
              color: "#FFFFFF",
              fontSize: 13,
              fontWeight: 600,
              ...TAB_NUM,
            }}
          >
            {pending ? "…" : `Charge · ${fmt(cartMath.total)}`}
          </button>
        </div>
      )}

      {/* Mobile cart drawer — only opens via the mobile bar. Desktop
          users see the cart in the always-visible right pane instead. */}
      {showCart && cart.length > 0 && (
        <Modal onClose={() => setShowCart(false)} title="Cart">
          <ul className="max-h-[50vh] overflow-y-auto -mx-1 px-1">
            {cart.map((l) => (
              <li
                key={l.sku}
                className="py-2.5 flex items-center gap-3"
                style={{ borderBottom: `1px solid ${T.border}` }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-semibold truncate" style={{ color: T.ink }}>
                    {l.name}
                  </p>
                  <p className="text-[11px]" style={{ ...TAB_NUM, color: T.inkFaint }}>
                    {fmt(l.unitPriceCents)} ea
                  </p>
                </div>
                <div className="inline-flex items-center rounded-full overflow-hidden" style={{ background: T.surfaceAlt }}>
                  <button onClick={() => setQty(l.sku, l.quantity - 1)} className="w-8 h-8 text-[14px]" style={{ color: T.ink, fontWeight: 600 }}>−</button>
                  <span className="w-8 text-center text-[13px]" style={{ ...TAB_NUM, color: T.ink, fontWeight: 600 }}>{l.quantity}</span>
                  <button onClick={() => setQty(l.sku, l.quantity + 1)} className="w-8 h-8 text-[14px]" style={{ color: T.ink, fontWeight: 600 }}>+</button>
                </div>
                <span className="text-[13px] w-20 text-right" style={{ ...TAB_NUM, color: T.ink, fontWeight: 600 }}>
                  {fmt(l.quantity * l.unitPriceCents)}
                </span>
                <button onClick={() => removeLine(l.sku)} className="w-7 h-7 rounded-full text-[12px]" style={{ color: T.inkFaint }} title="Remove">✕</button>
              </li>
            ))}
          </ul>

          <div className="mt-4 space-y-1.5">
            <Row label="Subtotal" value={fmt(cartMath.subtotal)} />
            {cartMath.discount > 0 && (
              <Row label="Discount" value={`−${fmt(cartMath.discount)}`} mute negative />
            )}
            {cartMath.tax > 0 && <Row label="Tax" value={fmt(cartMath.tax)} mute />}
            <div className="flex items-center justify-between mt-2 pt-2" style={{ borderTop: `1px solid ${T.border}` }}>
              <span className="text-[14px]" style={{ color: T.ink, fontWeight: 600 }}>Total</span>
              <span className="text-[22px]" style={{ ...TAB_NUM, color: T.ink, fontWeight: 700 }}>
                {fmt(cartMath.total)}
              </span>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <button onClick={clearCart} className="h-10 px-4 rounded-full text-[12px]" style={{ background: T.surfaceAlt, color: T.inkSoft, fontWeight: 500 }}>Clear</button>
            <button
              onClick={() => { setShowCart(false); setShowPay(true); }}
              className="flex-1 h-10 rounded-full text-[13px]"
              style={{ background: T.accent, color: "#FFFFFF", fontWeight: 600 }}
            >
              Charge {fmt(cartMath.total)}
            </button>
          </div>
        </Modal>
      )}

      {/* Pay modal */}
      {showPay && (
        <Modal onClose={() => setShowPay(false)} title="Take payment">
          <p className="text-[13px] mb-4" style={{ color: T.inkSoft }}>
            How is the customer paying?
          </p>
          <div className="grid grid-cols-2 gap-2 mb-4">
            {(["Cash", "Square", "Zelle", "Other"] as POSPaymentMethod[]).map((m) => (
              <button
                key={m}
                onClick={() => handleCharge(m)}
                disabled={pending}
                className="h-12 rounded-lg text-[13px] font-black uppercase tracking-[0.10em]"
                style={{
                  background: m === "Square" ? T.ink : T.surface,
                  color: m === "Square" ? "#FFFFFF" : T.ink,
                  border: m === "Square" ? "none" : `1px solid ${T.border}`,
                }}
              >
                {m}
              </button>
            ))}
          </div>
          <p className="text-[12px]" style={{ color: T.inkFaint, ...TAB_NUM, textAlign: "right" }}>
            Total: <strong style={{ color: T.ink }}>{fmt(cartMath.total)}</strong>
          </p>
        </Modal>
      )}

      {/* Customer search modal */}
      {showCustomerSearch && (
        <CustomerSearchModal
          onClose={() => setShowCustomerSearch(false)}
          onPick={(c) => {
            setCustomerId(c.id);
            setCustomerLabel(`${c.name} · ${c.email ?? ""}`.trim());
            setShowCustomerSearch(false);
          }}
        />
      )}

      {/* Recent sales drawer */}
      {showRecent && (
        <Modal onClose={() => setShowRecent(false)} title="Recent sales">
          {recent.length === 0 ? (
            <p className="text-[13px]" style={{ color: T.inkFaint }}>
              No sales today yet.
            </p>
          ) : (
            <ul className="divide-y" style={{ borderColor: T.border }}>
              {recent.map((s) => (
                <li key={s.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-bold truncate" style={{ color: T.ink }}>
                      {s.customerName ?? "Walk-in"} · {s.paymentMethod}
                    </p>
                    <p className="text-[11px]" style={{ color: T.inkFaint }}>
                      {new Date(s.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      {" · "}
                      {s.itemCount} item{s.itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <span className="text-[14px] font-black" style={{ ...TAB_NUM, color: T.ink }}>
                    {fmt(s.totalCents)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}

      {/* Post-sale receipt options */}
      {postSale && (
        <PostSaleModal
          saleId={postSale.saleId}
          total={postSale.total}
          onClose={() => setPostSale(null)}
          router={router}
        />
      )}

      {/* Invoice Builder — pre-filled with cart when admin chooses
          "Send as invoice instead" */}
      {invoiceBuilderOpen && (
        <AdminInvoiceBuilder
          initialMeta={invoicePrefill ?? undefined}
          initialUserId={customerId}
          initialDescription={
            customerLabel ? `Sale to ${customerLabel}` : "Custom invoice"
          }
          onClose={() => {
            setInvoiceBuilderOpen(false);
            setInvoicePrefill(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

// Map a catalog category string to a soft pastel tint pair so each
// item tile reads at a glance like the Overview launchpad. Hash-based
// fallback so unknown categories still get a consistent color.
function categoryTint(category: string): { bg: string; icon: string } {
  const map: Record<string, { bg: string; icon: string }> = {
    Plan:        { bg: "#EBF6FF", icon: "#1976FF" },
    Plans:       { bg: "#EBF6FF", icon: "#1976FF" },
    Service:     { bg: "#EAFBEF", icon: "#22C55E" },
    Services:    { bg: "#EAFBEF", icon: "#22C55E" },
    Supplies:    { bg: "#FFF4EB", icon: "#FF8A1F" },
    Notary:      { bg: "#FFF7F0", icon: "#D97706" },
    Shipping:    { bg: "#EAF7FF", icon: "#0EA5E9" },
    Custom:      { bg: "#F0EBFF", icon: "#7C4DFF" },
  };
  if (map[category]) return map[category];
  // Fallback hash
  let h = 0;
  for (let i = 0; i < category.length; i++) h = (h * 31 + category.charCodeAt(i)) >>> 0;
  const pairs = [
    { bg: "#EBF6FF", icon: "#1976FF" },
    { bg: "#EAFBEF", icon: "#22C55E" },
    { bg: "#FFF4EB", icon: "#FF8A1F" },
    { bg: "#F0EBFF", icon: "#7C4DFF" },
    { bg: "#FFF1F0", icon: "#EF4444" },
    { bg: "#FFFAEB", icon: "#F5A623" },
    { bg: "#EAF7FF", icon: "#0EA5E9" },
  ];
  return pairs[h % pairs.length];
}

function Row({ label, value, mute, negative }: { label: string; value: string; mute?: boolean; negative?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-[12px]" style={{ color: mute ? T.inkFaint : T.inkSoft }}>
        {label}
      </span>
      <span
        className="text-[13px] font-bold"
        style={{
          ...TAB_NUM,
          color: negative ? T.danger : mute ? T.inkSoft : T.ink,
        }}
      >
        {value}
      </span>
    </div>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      style={{ background: "rgba(26,22,20,0.55)", backdropFilter: "blur(6px)" }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-md overflow-hidden"
        style={{
          background: T.surface,
          border: `1px solid ${T.border}`,
          boxShadow: "0 16px 48px rgba(26,22,20,0.24)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-5 h-11"
          style={{ borderBottom: `1px solid ${T.border}` }}
        >
          <h3 className="text-[12px] font-black uppercase tracking-[0.16em]" style={{ color: T.ink }}>
            {title}
          </h3>
          <button onClick={onClose} className="w-6 h-6 text-[14px]" style={{ color: T.inkFaint }}>
            ✕
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function CustomerSearchModal({
  onClose,
  onPick,
}: {
  onClose: () => void;
  onPick: (c: { id: string; name: string; email?: string | null }) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; email: string; suiteNumber: string | null }[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const r = await searchPOSCustomers(q.trim());
        setResults(r.map((x) => ({ id: x.id, name: x.name, email: x.email, suiteNumber: x.suiteNumber })));
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [q]);

  return (
    <Modal title="Attach customer" onClose={onClose}>
      <input
        autoFocus
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search name, email, suite #…"
        className="w-full h-10 px-3 rounded-md text-sm focus:outline-none mb-3"
        style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }}
      />
      {loading && (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>
          Searching…
        </p>
      )}
      {!loading && q.trim().length < 2 && (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>
          Type at least 2 characters.
        </p>
      )}
      {!loading && q.trim().length >= 2 && results.length === 0 && (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>
          No matches.
        </p>
      )}
      {results.length > 0 && (
        <ul className="divide-y max-h-72 overflow-y-auto" style={{ borderColor: T.border }}>
          {results.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => onPick(c)}
                className="w-full text-left py-2.5 flex items-center justify-between gap-3 hover:bg-[#F4EEE3]"
              >
                <div className="min-w-0">
                  <p className="text-[13px] font-bold truncate" style={{ color: T.ink }}>
                    {c.name}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: T.inkFaint }}>
                    {c.email}
                    {c.suiteNumber ? ` · Suite #${c.suiteNumber}` : ""}
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function PostSaleModal({
  saleId,
  total,
  onClose,
  router,
}: {
  saleId: string;
  total: number;
  onClose: () => void;
  router: ReturnType<typeof useRouter>;
}) {
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [emailOverride, setEmailOverride] = useState("");
  const [smsState, setSmsState] = useState<{ phone: string; body: string } | null>(null);

  function emailIt() {
    startTransition(async () => {
      const r = await emailPOSReceipt(saleId, emailOverride.trim() || undefined);
      setMsg("error" in r ? r.error : "✓ Receipt emailed");
    });
  }
  function smsIt() {
    startTransition(async () => {
      const r = await smsPOSReceipt(saleId);
      if ("error" in r) {
        setMsg(r.error);
      } else {
        setSmsState({ phone: r.phone, body: r.body });
      }
    });
  }
  function printIt() {
    startTransition(async () => {
      await markReceiptPrinted(saleId);
      window.open(`/admin/pos/receipt/${saleId}?print=1`, "_blank");
      setMsg("✓ Receipt sent to printer");
    });
  }

  return (
    <Modal title={`Sale complete · ${(total / 100).toFixed(2)}`} onClose={onClose}>
      <p className="text-[13px] mb-4" style={{ color: T.inkSoft }}>
        Send the receipt to the customer:
      </p>

      <div className="grid grid-cols-1 gap-2 mb-4">
        <button
          onClick={printIt}
          disabled={pending}
          className="h-10 rounded-md text-[12px] font-black uppercase tracking-[0.08em]"
          style={{ background: T.surface, color: T.ink, border: `1px solid ${T.border}` }}
        >
          Print receipt
        </button>

        <div className="flex gap-2">
          <input
            value={emailOverride}
            onChange={(e) => setEmailOverride(e.target.value)}
            placeholder="Email (or attached customer)"
            className="flex-1 h-10 px-3 rounded-md text-[12px] focus:outline-none"
            style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }}
          />
          <button
            onClick={emailIt}
            disabled={pending}
            className="px-4 h-10 rounded-md text-[12px] font-black uppercase tracking-[0.08em]"
            style={{ background: T.ink, color: "#FFFFFF" }}
          >
            Email
          </button>
        </div>

        <button
          onClick={smsIt}
          disabled={pending}
          className="h-10 rounded-md text-[12px] font-black uppercase tracking-[0.08em]"
          style={{ background: T.surface, color: T.ink, border: `1px solid ${T.border}` }}
        >
          SMS receipt
        </button>

        <button
          onClick={() => {
            router.push("/admin?tab=billing&fromSale=" + saleId);
          }}
          className="h-10 rounded-md text-[12px] font-black uppercase tracking-[0.08em]"
          style={{ background: T.surface, color: T.ink, border: `1px solid ${T.border}` }}
        >
          Convert to invoice
        </button>

        <button
          onClick={onClose}
          className="h-10 rounded-md text-[12px] font-bold uppercase tracking-[0.08em]"
          style={{ background: "transparent", color: T.inkFaint, border: `1px dashed ${T.border}` }}
        >
          No receipt
        </button>
      </div>

      {smsState && (
        <div
          className="rounded-md p-3 mb-3 text-[12px]"
          style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }}
        >
          <p className="font-bold mb-1">SMS draft for {smsState.phone}</p>
          <p style={{ color: T.inkSoft }}>{smsState.body}</p>
          <p className="mt-2" style={{ color: T.inkFaint }}>
            Copy and paste into your messaging app.
          </p>
        </div>
      )}
      {msg && (
        <p className="text-[12px] font-bold" style={{ color: msg.startsWith("✓") ? T.success : T.danger }}>
          {msg}
        </p>
      )}
    </Modal>
  );
}

// ─── Helpers ────────────────────────────────────────────────────────────

/** Parse "10", "10%", "$5", "5.00", "10.5%". Returns cents to subtract. */
function parseDiscount(input: string, subtotalCents: number): number {
  const s = input.trim();
  if (!s) return 0;
  if (s.endsWith("%")) {
    const pct = parseFloat(s.slice(0, -1));
    if (!Number.isFinite(pct) || pct <= 0) return 0;
    return Math.round((subtotalCents * pct) / 100);
  }
  // strip leading $
  const numStr = s.replace(/^\$/, "");
  const dollars = parseFloat(numStr);
  if (!Number.isFinite(dollars) || dollars <= 0) return 0;
  return Math.round(dollars * 100);
}
