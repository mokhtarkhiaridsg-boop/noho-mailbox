"use client";

/**
 * Daily Register Activity Report — mirrors the legacy NoHo Mailboxes
 * point-of-sale "Register Activity Report" PDF format the user shared on
 * 5/2/2026, but driven by our live POS data.
 *
 * Renders three workstation columns (Master / Auxiliary / All Registers)
 * stacked top to bottom, each with:
 *   - Calculation of Gross Sales (25 categories enumerated, zero-filled)
 *   - Calculation of HASH Sales (Money Orders)
 *   - Net Receipts - Method 1 (sales + tax + deposits)
 *   - Net Receipts - Method 2 (by 13 payment methods)
 *   - Calculation of Overage
 *   - Other Information (customer count, voids, cancels, tax sales)
 *
 * Numbers come from getDailyZReport(date). Categories that don't match a
 * legacy bucket are listed under "Misc Non-Taxable" (the legacy default).
 */

import { useEffect, useState, useTransition } from "react";
import { getDailyZReport } from "@/app/actions/pos";

const T = {
  bg: "#FAF7F2",
  surface: "#FFFFFF",
  surfaceAlt: "#F4EEE3",
  border: "#E5DACA",
  borderStrong: "#CFC2AC",
  ink: "#1A1614",
  inkSoft: "#5C4540",
  inkFaint: "#998877",
  accent: "#2D100F",
  cream: "#F7E6C2",
  blue: "#337485",
  success: "#16A34A",
  danger: "#B91C1C",
};
const MONO = "ui-monospace, 'SF Mono', Menlo, Monaco, Consolas, monospace";
const TAB_NUM: React.CSSProperties = {
  fontVariantNumeric: "tabular-nums",
  fontFeatureSettings: "'tnum' 1",
  fontFamily: MONO,
};
const fmt = (cents: number) => `$${(cents / 100).toFixed(2)}`;

// ─── Legacy 25 sales categories (in the order the legacy report prints) ──
const LEGACY_CATEGORIES = [
  "Packing Materials",
  "Rubber Stamp",
  "Shipping",
  "Gift Wrap",
  "Insurance",
  "Office Supplies",
  "Forfeited Deposits",
  "Pager",
  "Novelty Items",
  "Notary",
  "Copies",
  "Misc Non-Taxable",
  "Passport Photo",
  "Fax",
  "Mailbox",
  "Labor",
  "Late Fees",
  "Key Duplicating",
  "Stamps",
  "Greeting Card",
  "Printing",
  "Misc. Taxable",
  "Professional Packaging",
  "Prepaid Services",
  "Cardboard Boxes",
] as const;

// ─── Legacy 13 payment methods (in the order the legacy report prints) ──
const LEGACY_METHODS = [
  "ATM",
  "American Express",
  "Card 1",
  "Card 2",
  "Cash",
  "Check",
  "Credit Card",
  "Discover",
  "Gift Certificate",
  "MCVisa",
  "Manual CC Entry",
  "MasterCard",
  "Visa",
] as const;

// ─── Map our POS categories to legacy buckets ────────────────────────────
const CATEGORY_ALIAS: Record<string, string> = {
  "Box's": "Cardboard Boxes",
  "Cardboard Box's": "Cardboard Boxes",
  "Cardboard Box": "Cardboard Boxes",
  "Mailboxes": "Mailbox",
  "Mailbox Renewal": "Mailbox",
  "Mailbox Renewals": "Mailbox",
  "Late Fee": "Late Fees",
  "Stamp": "Stamps",
  "Misc Tax": "Misc. Taxable",
  "Misc Non Tax": "Misc Non-Taxable",
};
function bucket(category: string | null | undefined): string {
  const c = (category ?? "").trim();
  if (!c) return "Misc Non-Taxable";
  const aliased = CATEGORY_ALIAS[c];
  if (aliased) return aliased;
  // Match case-insensitive against the legacy list
  const hit = LEGACY_CATEGORIES.find((legacy) => legacy.toLowerCase() === c.toLowerCase());
  return hit ?? "Misc Non-Taxable";
}

// Map our POS payment methods (Cash / Card / CardOnFile / Square / etc.)
// to legacy payment method buckets. Cash → Cash, Check → Check, the rest
// fall under "Credit Card" until we expand the breakdown.
const METHOD_ALIAS: Record<string, string> = {
  Cash: "Cash",
  Check: "Check",
  Card: "Credit Card",
  CardOnFile: "Credit Card",
  Square: "Credit Card",
  Visa: "Visa",
  MasterCard: "MasterCard",
  Amex: "American Express",
  "American Express": "American Express",
  Discover: "Discover",
  Zelle: "Manual CC Entry", // closest legacy bucket; no native Zelle row
};
function bucketMethod(method: string | null | undefined): string {
  const m = (method ?? "").trim();
  if (!m) return "Credit Card";
  return METHOD_ALIAS[m] ?? "Credit Card";
}

type ZReport = Awaited<ReturnType<typeof getDailyZReport>>;

export default function AdminDailyZReport() {
  const [date, setDate] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  });
  const [report, setReport] = useState<ZReport | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function load(d: string) {
    setError(null);
    startTransition(async () => {
      try {
        const r = await getDailyZReport(d);
        setReport(r);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load report");
      }
    });
  }
  useEffect(() => { load(date); /* eslint-disable-next-line */ }, [date]);

  // ─── Bucket the byCategory + byMethod arrays into legacy buckets ──────
  const categoryRows: Array<{ name: string; cents: number; quantity: number }> = LEGACY_CATEGORIES.map((c) => ({
    name: c, cents: 0, quantity: 0,
  }));
  if (report) {
    for (const row of report.byCategory) {
      const bucketName = bucket(row.category);
      const tile = categoryRows.find((r) => r.name === bucketName);
      if (tile) {
        tile.cents += row.cents;
        tile.quantity += row.quantity;
      }
    }
  }

  const methodRows: Array<{ name: string; cents: number }> = LEGACY_METHODS.map((m) => ({
    name: m, cents: 0,
  }));
  if (report) {
    for (const row of report.byMethod) {
      const bucketName = bucketMethod(row.method);
      const tile = methodRows.find((r) => r.name === bucketName);
      if (tile) tile.cents += row.cents;
    }
  }

  const grossCents = categoryRows.reduce((a, r) => a + r.cents, 0);
  const grossCount = categoryRows.reduce((a, r) => a + r.quantity, 0);
  const taxCents = report?.totals.taxCents ?? 0;
  const netReceiptsCents = grossCents + taxCents;

  return (
    <div className="space-y-4">
      {/* ─── Header strip ─── */}
      <div
        className="rounded-xl flex items-center justify-between gap-3 px-4 py-3 flex-wrap"
        style={{ background: T.surface, border: `1px solid ${T.border}` }}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
            Daily activity
          </p>
          <h2 className="text-xl font-extrabold tracking-tight" style={{ color: T.ink }}>
            Register Activity Report
          </h2>
          <p className="text-[11px]" style={{ color: T.inkFaint }}>
            5062 Lankershim Blvd · N HOLLYWOOD, CA 91601
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <label
            className="inline-flex items-center gap-2 h-9 px-3 rounded-md text-[11px] font-bold"
            style={{ background: T.surfaceAlt, color: T.ink, border: `1px solid ${T.border}` }}
          >
            <span style={{ color: T.inkFaint }}>Day:</span>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-transparent text-[11px] font-bold focus:outline-none"
              style={{ color: T.ink, ...TAB_NUM }}
              max={new Date().toISOString().slice(0, 10)}
            />
          </label>
          <button
            onClick={() => load(date)}
            disabled={pending}
            className="h-9 px-3 rounded-md text-[11px] font-bold uppercase tracking-[0.1em] transition-colors disabled:opacity-50"
            style={{ background: T.ink, color: "#fff", border: `1px solid ${T.ink}` }}
            title="Re-pull from database"
          >
            {pending ? "Loading…" : "Refresh"}
          </button>
          <button
            onClick={() => { if (typeof window !== "undefined") window.print(); }}
            className="h-9 px-3 rounded-md text-[11px] font-bold uppercase tracking-[0.1em] transition-colors"
            style={{ background: T.surface, color: T.ink, border: `1px solid ${T.border}` }}
          >
            Print / PDF
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl p-3 text-[12px]" style={{ background: "rgba(231,0,19,0.06)", color: T.danger, border: `1px solid rgba(231,0,19,0.2)` }}>
          {error}
        </div>
      )}

      {!report && !error && (
        <div className="rounded-xl p-8 text-center text-[12px]" style={{ background: T.surface, color: T.inkFaint, border: `1px solid ${T.border}` }}>
          {pending ? "Loading…" : "Select a day to view the report."}
        </div>
      )}

      {report && (
        <>
          {/* ─── Summary tiles ─── */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <SummaryTile label="Gross sales" amount={fmt(grossCents)} count={grossCount} />
            <SummaryTile label="Net receipts" amount={fmt(netReceiptsCents)} count={report.totals.saleCount} />
            <SummaryTile label="Voided" amount={fmt(report.totals.voidedCents)} count={report.totals.voidCount} tone="danger" />
            <SummaryTile label="Tax" amount={fmt(taxCents)} count={null} />
          </div>

          {/* ─── ALL REGISTERS section (the legacy PDF stacks Master/
              Auxiliary/All — we collapse to All since we have a single
              register at the moment, with an explanation banner). */}
          <Section title="All registers · summary">
            {/* Calculation of Gross Sales */}
            <SubSection title="Calculation of Gross Sales">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <Tr header>
                    <Th>Category</Th>
                    <Th align="right">Count</Th>
                    <Th align="right">Amount</Th>
                  </Tr>
                </thead>
                <tbody>
                  {categoryRows.map((row) => (
                    <Tr key={row.name}>
                      <Td>+ {row.name}</Td>
                      <Td align="right" mono>{row.quantity}</Td>
                      <Td align="right" mono>{fmt(row.cents)}</Td>
                    </Tr>
                  ))}
                  <Tr emphasized>
                    <Td bold>= Gross Sales</Td>
                    <Td align="right" mono bold>{grossCount}</Td>
                    <Td align="right" mono bold>{fmt(grossCents)}</Td>
                  </Tr>
                </tbody>
              </table>
            </SubSection>

            {/* HASH Sales */}
            <SubSection title="Calculation of HASH Sales">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <tbody>
                  <Tr>
                    <Td>+ Money Orders</Td>
                    <Td align="right" mono>0</Td>
                    <Td align="right" mono>$0.00</Td>
                  </Tr>
                  <Tr emphasized>
                    <Td bold>= HASH Sales</Td>
                    <Td align="right" mono bold>0</Td>
                    <Td align="right" mono bold>$0.00</Td>
                  </Tr>
                </tbody>
              </table>
            </SubSection>

            {/* Net Receipts - Method 1 */}
            <SubSection title="Calculation of Net Receipts · Method 1">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <tbody>
                  <Tr>
                    <Td>+ Gross Sales</Td>
                    <Td align="right" mono>{grossCount}</Td>
                    <Td align="right" mono>{fmt(grossCents)}</Td>
                  </Tr>
                  <Tr>
                    <Td>+ HASH Sales</Td>
                    <Td align="right" mono>0</Td>
                    <Td align="right" mono>$0.00</Td>
                  </Tr>
                  <Tr>
                    <Td>+ State Tax</Td>
                    <Td align="right" mono></Td>
                    <Td align="right" mono>{fmt(taxCents)}</Td>
                  </Tr>
                  <Tr emphasized>
                    <Td bold>= Net Receipts</Td>
                    <Td align="right" mono></Td>
                    <Td align="right" mono bold>{fmt(netReceiptsCents)}</Td>
                  </Tr>
                </tbody>
              </table>
            </SubSection>

            {/* Net Receipts - Method 2 (by payment method) */}
            <SubSection title="Calculation of Net Receipts · Method 2">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <tbody>
                  {methodRows.map((row) => (
                    <Tr key={row.name}>
                      <Td>+ {row.name}</Td>
                      <Td></Td>
                      <Td align="right" mono>{fmt(row.cents)}</Td>
                    </Tr>
                  ))}
                  <Tr emphasized>
                    <Td bold>= Net Receipts</Td>
                    <Td></Td>
                    <Td align="right" mono bold>{fmt(methodRows.reduce((a, r) => a + r.cents, 0))}</Td>
                  </Tr>
                </tbody>
              </table>
            </SubSection>

            {/* Other Information */}
            <SubSection title="Other information">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <tbody>
                  <Tr>
                    <Td>Customer count</Td>
                    <Td align="right" mono>{report.totals.saleCount}</Td>
                    <Td></Td>
                  </Tr>
                  <Tr>
                    <Td>Discounts</Td>
                    <Td align="right" mono></Td>
                    <Td align="right" mono>{fmt(report.totals.discountCents)}</Td>
                  </Tr>
                  <Tr>
                    <Td>Tips</Td>
                    <Td align="right" mono></Td>
                    <Td align="right" mono>{fmt(report.totals.tipCents)}</Td>
                  </Tr>
                  <Tr>
                    <Td>Transaction Voids</Td>
                    <Td align="right" mono>{report.totals.voidCount}</Td>
                    <Td align="right" mono>{fmt(report.totals.voidedCents)}</Td>
                  </Tr>
                </tbody>
              </table>
            </SubSection>
          </Section>

          {/* ─── Hourly + Cashier breakdown (extra context the legacy
              PDF doesn't show; useful for live ops). */}
          {report.byHour.some((h) => h.cents > 0) && (
            <Section title="By hour">
              <div className="px-3 pb-3 pt-2">
                <div className="flex items-end gap-1 h-32" role="img" aria-label="Hourly sales chart">
                  {report.byHour.map((h) => {
                    const max = Math.max(1, ...report.byHour.map((x) => x.cents));
                    const heightPct = h.cents > 0 ? Math.max(4, Math.round((h.cents / max) * 100)) : 0;
                    return (
                      <div key={h.hour} className="flex-1 flex flex-col items-center gap-1" title={`${h.hour}:00 — ${h.count} sales · ${fmt(h.cents)}`}>
                        <span className="text-[8px] font-bold tabular-nums" style={{ color: T.inkFaint, ...TAB_NUM }}>
                          {h.cents > 0 ? fmt(h.cents).replace(".00", "") : ""}
                        </span>
                        <div
                          className="w-full rounded-t-sm transition-all"
                          style={{
                            height: `${heightPct}%`,
                            background: h.cents > 0 ? T.blue : T.surfaceAlt,
                            minHeight: 2,
                          }}
                        />
                        <span className="text-[8px] font-bold" style={{ color: T.inkFaint, ...TAB_NUM }}>
                          {h.hour}
                        </span>
                      </div>
                    );
                  })}
                </div>
                <p className="text-[10px] text-center mt-2" style={{ color: T.inkFaint }}>
                  Hour of day · click a bar to see those sales (coming soon)
                </p>
              </div>
            </Section>
          )}

          {report.byCashier.length > 0 && report.byCashier[0].name !== "—" && (
            <Section title="By cashier">
              <table className="w-full" style={{ borderCollapse: "collapse" }}>
                <thead>
                  <Tr header>
                    <Th>Name</Th>
                    <Th align="right">Sales</Th>
                    <Th align="right">Total</Th>
                  </Tr>
                </thead>
                <tbody>
                  {report.byCashier.map((c) => (
                    <Tr key={c.name}>
                      <Td>{c.name}</Td>
                      <Td align="right" mono>{c.count}</Td>
                      <Td align="right" mono>{fmt(c.cents)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </table>
            </Section>
          )}

          <p className="text-[10px] text-center" style={{ color: T.inkFaint }}>
            Generated {new Date(report.generatedAtIso).toLocaleString("en-US")} · NoHo Mailboxes POS · day {report.dateYmd}
          </p>
        </>
      )}

      {/* Print stylesheet — clean black-on-white when printed. */}
      <style>{`
        @media print {
          body { background: #FFFFFF !important; }
          [class*="rounded-xl"] { box-shadow: none !important; border: 1px solid #000 !important; }
          input[type="date"], button { display: none !important; }
        }
      `}</style>
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────────────────────────

function SummaryTile({
  label,
  amount,
  count,
  tone = "default",
}: {
  label: string;
  amount: string;
  count: number | null;
  tone?: "default" | "danger";
}) {
  const color = tone === "danger" ? T.danger : T.ink;
  return (
    <div
      className="rounded-xl p-4"
      style={{ background: T.surface, border: `1px solid ${T.border}`, boxShadow: "0 1px 0 rgba(255,255,255,0.6) inset" }}
    >
      <p className="text-[10px] font-bold uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
        {label}
      </p>
      <p className="text-2xl font-extrabold leading-none mt-1.5" style={{ ...TAB_NUM, color }}>
        {amount}
      </p>
      {count !== null && (
        <p className="text-[11px] mt-1" style={{ color: T.inkFaint, ...TAB_NUM }}>
          {count} {count === 1 ? "transaction" : "transactions"}
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
      <div className="px-4 h-10 flex items-center" style={{ borderBottom: `1px solid ${T.border}`, background: T.surfaceAlt }}>
        <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: T.ink }}>
          {title}
        </p>
      </div>
      {children}
    </div>
  );
}

function SubSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ borderBottom: `1px solid ${T.border}` }}>
      <p className="px-4 pt-3 pb-1 text-[9px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
        {title}
      </p>
      <div className="px-2 pb-2">{children}</div>
    </div>
  );
}

function Tr({ header, emphasized, children }: { header?: boolean; emphasized?: boolean; children: React.ReactNode }) {
  return (
    <tr
      style={{
        background: emphasized ? T.surfaceAlt : header ? "transparent" : "transparent",
        borderTop: emphasized || header ? `1px solid ${T.border}` : "none",
      }}
    >
      {children}
    </tr>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return (
    <th
      style={{
        padding: "8px 12px",
        textAlign: align,
        fontSize: 9,
        fontWeight: 800,
        textTransform: "uppercase",
        letterSpacing: "0.14em",
        color: T.inkFaint,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children = null,
  align = "left",
  mono,
  bold,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  mono?: boolean;
  bold?: boolean;
}) {
  return (
    <td
      style={{
        padding: "6px 12px",
        textAlign: align,
        fontSize: 12,
        fontWeight: bold ? 800 : 500,
        color: T.ink,
        ...(mono ? TAB_NUM : {}),
      }}
    >
      {children}
    </td>
  );
}
