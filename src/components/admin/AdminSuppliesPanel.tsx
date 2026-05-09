"use client";

/**
 * iter-150 — Supplies inventory panel (Tier 9 #60).
 *
 * Filter chips by category + status (in stock / low / out), table with
 * stock pills + quick-restock buttons, click row → drawer with movement
 * history + restock/consume/adjust forms. Stock-status colors mirror
 * the iter-143 suite-maintenance + iter-145 equipment panels.
 */

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  listSupplies,
  listSupplyMovements,
  listSupplyPriceTiers,
  upsertSupply,
  deleteSupply,
  recordSupplyMovement,
  upsertSupplyPriceTier,
  deleteSupplyPriceTier,
  getInventoryMarginReport,
  type SupplyRow,
  type SupplyMovementRow,
  type SupplyPriceTierRow,
  type InventoryMarginReport,
} from "@/app/actions/supplies";
// iter-11.5 lesson — constants + types live outside the "use server"
// file because that constraint forbids non-async exports.
import {
  SUPPLY_CATEGORIES,
  SUPPLY_UNITS,
  SUPPLY_MOVEMENT_KINDS,
  DEFAULT_TIER_PRESETS,
  computeMarkupPct,
  computeMarginPct,
  type SupplyCategory,
  type SupplyUnit,
  type SupplyStatus,
  type SupplyMovementKind,
} from "@/lib/supplies-config";

const T = {
  surface: "#FFFFFF",
  surfaceAlt: "#F4F5F7",
  border: "#ECEEF1",
  ink: "#1A1D23",
  inkSoft: "#3B4252",
  inkFaint: "#7A8290",
  blue: "#1976FF",
  blueDeep: "#0F5BD9",
  success: "#22C55E",
  warning: "#F59E0B",
  danger: "#EF4444",
};

const STATUS_STYLE: Record<SupplyStatus, { bg: string; fg: string; label: string }> = {
  ok:  { bg: "rgba(34,197,94,0.10)",  fg: "#15803d", label: "In stock" },
  low: { bg: "rgba(245,158,11,0.12)", fg: "#92400e", label: "Low" },
  out: { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b", label: "OUT" },
};

type Filter = "all" | "low" | "out" | "ok" | SupplyCategory;

export default function AdminSuppliesPanel() {
  const [rows, setRows] = useState<SupplyRow[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [editing, setEditing] = useState<SupplyRow | "new" | null>(null);
  const [drawerSupplyId, setDrawerSupplyId] = useState<string | null>(null);
  // iter-164 — Margin report widget. Default to last 30 days; admin can
  // toggle 7/30/90/365 in the bar. Fetches happen server-side and feed
  // the 4-tile widget + per-row margin chips.
  const [marginWindow, setMarginWindow] = useState<number>(30);
  const [marginReport, setMarginReport] = useState<InventoryMarginReport | null>(null);

  function refresh() {
    void listSupplies().then(setRows).catch(() => setRows([]));
    void getInventoryMarginReport({ windowDays: marginWindow }).then(setMarginReport).catch(() => setMarginReport(null));
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(refresh, [marginWindow]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: 0, ok: 0, low: 0, out: 0 };
    for (const r of rows ?? []) {
      c.all = (c.all ?? 0) + 1;
      c[r.status] = (c[r.status] ?? 0) + 1;
      c[r.category] = (c[r.category] ?? 0) + 1;
    }
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    if (!rows) return [];
    if (filter === "all") return rows;
    if (filter === "ok" || filter === "low" || filter === "out") {
      return rows.filter((r) => r.status === filter);
    }
    return rows.filter((r) => r.category === filter);
  }, [rows, filter]);

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${T.blue}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: T.blue, boxShadow: `0 0 6px ${T.blue}` }} />
          Operations · Supplies inventory
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: T.ink }}>
          Supplies &amp; consumables
        </h2>
        <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
          On-hand counts for boxes, tape, labels, mailers, and printer ribbon. Reorder threshold flags low stock.
          {(counts.low ?? 0) + (counts.out ?? 0) > 0 && (
            <span className="ml-1 font-bold" style={{ color: T.warning }}>
              · {counts.low ?? 0} low + {counts.out ?? 0} out — order soon.
            </span>
          )}
        </p>
      </div>

      {/* iter-164 — Margin report widget. Sums sale movements in the
          chosen window so admin sees blended margin + the 5 most-
          profitable items at a glance. */}
      <div className="rounded-2xl p-3" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
            Shop margin · last {marginWindow}d
          </p>
          <div className="flex gap-1">
            {[7, 30, 90, 365].map((d) => (
              <button key={d} type="button" onClick={() => setMarginWindow(d)}
                className="text-[10.5px] font-bold px-2 py-0.5 rounded-md"
                style={{
                  background: marginWindow === d ? T.blue : "white",
                  color: marginWindow === d ? "white" : T.inkSoft,
                  border: `1px solid ${marginWindow === d ? T.blue : T.border}`,
                }}>{d}d</button>
            ))}
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
          <MarginTile label="Units sold" value={marginReport?.totalUnitsSold ?? 0} accent={T.blue} />
          <MarginTile label="Revenue" value={fmtCents(marginReport?.totalRevenueCents ?? 0)} accent={T.success} />
          <MarginTile label="Profit" value={fmtCents(marginReport?.totalProfitCents ?? 0)} accent={T.blueDeep} />
          <MarginTile label="Blended margin" value={marginReport?.blendedMarginPct == null ? "—" : `${marginReport.blendedMarginPct}%`} accent={T.warning} />
        </div>
        {marginReport && marginReport.rows.length > 0 && (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1.5">
            {marginReport.rows.slice(0, 6).map((r) => (
              <button key={r.supplyId} type="button" onClick={() => setDrawerSupplyId(r.supplyId)}
                className="rounded-lg px-2.5 py-1.5 text-left hover:bg-[#F4F5F7]"
                style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
                <p className="text-[11px] font-bold truncate" style={{ color: T.ink }}>{r.name}</p>
                <p className="text-[10px]" style={{ color: T.inkFaint }}>
                  {r.unitsSold}u · {fmtCents(r.profitCents)} profit
                  {r.marginPct != null && <span className="font-bold ml-1" style={{ color: r.marginPct >= 50 ? T.success : r.marginPct >= 20 ? T.warning : T.danger }}>{r.marginPct}%</span>}
                  {r.topTierLabel && <span className="ml-1">· {r.topTierLabel}</span>}
                </p>
              </button>
            ))}
          </div>
        )}
        {marginReport && marginReport.rows.length === 0 && (
          <p className="mt-2 text-[11px]" style={{ color: T.inkFaint }}>
            No sales recorded in the last {marginWindow}d. Record a `Sold` movement on any supply (with a tier picked) and revenue will land here.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex flex-wrap gap-1.5">
          <Chip active={filter === "all"} label="All"      count={counts.all ?? 0}      onClick={() => setFilter("all")} tone={T.ink} />
          <Chip active={filter === "out"} label="Out"      count={counts.out ?? 0}      onClick={() => setFilter("out")} tone={T.danger} />
          <Chip active={filter === "low"} label="Low"      count={counts.low ?? 0}      onClick={() => setFilter("low")} tone={T.warning} />
          <Chip active={filter === "ok"}  label="In stock" count={counts.ok ?? 0}       onClick={() => setFilter("ok")} tone={T.success} />
          <span className="w-px h-5 mx-0.5" style={{ background: T.border }} />
          {SUPPLY_CATEGORIES.map((c) => (
            <Chip key={c.key} active={filter === c.key} label={`${c.emoji} ${c.label}`} count={counts[c.key] ?? 0} onClick={() => setFilter(c.key)} tone={T.blueDeep} />
          ))}
        </div>
        <button type="button" onClick={() => setEditing("new")} className="text-[11.5px] font-black px-3 py-1.5 rounded-lg text-white" style={{ background: T.blue }}>
          + Add supply
        </button>
      </div>

      {rows == null ? (
        <p className="text-[12px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl px-4 py-8 text-center text-[12px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
          {rows.length === 0 ? "No supplies tracked yet — click +Add supply to begin." : "No supplies match this filter."}
        </div>
      ) : (
        <div className="rounded-2xl overflow-hidden" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <table className="w-full" style={{ borderCollapse: "collapse" }}>
            <thead style={{ background: T.surfaceAlt }}>
              <tr>
                <Th>Item</Th>
                <Th align="right">On hand</Th>
                <Th align="right">Reorder at</Th>
                <Th align="right">Price · margin</Th>
                <Th>Status</Th>
                <Th align="right">{""}</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const cat = SUPPLY_CATEGORIES.find((c) => c.key === r.category);
                const st = STATUS_STYLE[r.status];
                return (
                  <tr
                    key={r.id}
                    className="cursor-pointer hover:bg-[#F4F5F7]"
                    style={{ borderTop: `1px solid ${T.border}`, opacity: r.isActive ? 1 : 0.55 }}
                    onClick={() => setDrawerSupplyId(r.id)}
                  >
                    <td className="px-4 py-2.5">
                      <p className="text-[12.5px] font-bold" style={{ color: T.ink }}>
                        <span className="mr-1">{cat?.emoji ?? "🧰"}</span> {r.name}
                      </p>
                      <p className="text-[10.5px]" style={{ color: T.inkFaint }}>
                        {r.vendor ? `${r.vendor}${r.vendorSku ? ` · ${r.vendorSku}` : ""}` : "—"}
                      </p>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <span className="text-[15px] font-black" style={{ color: r.status === "out" ? T.danger : T.ink }}>
                        {r.onHand}
                      </span>
                      <span className="text-[10px] ml-1" style={{ color: T.inkFaint }}>{r.unit}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-[11.5px]" style={{ color: T.inkFaint }}>
                      ≤ {r.reorderAt}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {r.defaultTier ? (
                        <>
                          <p className="text-[12px] font-black tabular-nums" style={{ color: T.ink }}>
                            {fmtCents(r.defaultTier.salePriceCents)}
                          </p>
                          <p className="text-[10px]" style={{ color: T.inkFaint }}>
                            <span style={{ color: T.blueDeep }}>{r.defaultTier.label}</span>
                            {r.defaultTier.marginPct != null && (
                              <span className="ml-1 font-bold" style={{ color: r.defaultTier.marginPct >= 50 ? T.success : r.defaultTier.marginPct >= 20 ? T.warning : T.danger }}>
                                {r.defaultTier.marginPct}%
                              </span>
                            )}
                            {r.tierCount > 1 && <span className="ml-1" style={{ color: T.inkFaint }}>+{r.tierCount - 1}</span>}
                          </p>
                        </>
                      ) : (
                        <span className="text-[10.5px] italic" style={{ color: T.inkFaint }}>no tiers yet</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: st.bg, color: st.fg }}>
                        {st.label}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEditing(r); }}
                        className="text-[10.5px] font-bold px-2 py-1 rounded-md"
                        style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}
                      >
                        Edit
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <SupplyEditor
          row={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
      {drawerSupplyId && (
        <SupplyDrawer
          supplyId={drawerSupplyId}
          row={rows?.find((r) => r.id === drawerSupplyId) ?? null}
          onClose={() => setDrawerSupplyId(null)}
          onChanged={refresh}
        />
      )}
    </div>
  );
}

function Th({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "center" | "right" }) {
  return <th className="px-4 py-2 text-[10px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint, textAlign: align }}>{children}</th>;
}

function MarginTile({ label, value, accent }: { label: string; value: string | number; accent: string }) {
  return (
    <div className="rounded-xl px-3 py-2" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
      <p className="text-[9px] font-black uppercase tracking-[0.14em]" style={{ color: T.inkFaint }}>{label}</p>
      <p className="mt-0.5 text-[18px] font-black tabular-nums" style={{ color: accent }}>{value}</p>
    </div>
  );
}

function fmtCents(c: number): string {
  const sign = c < 0 ? "-" : "";
  const abs = Math.abs(c);
  return `${sign}$${(abs / 100).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function Chip({ active, label, count, onClick, tone }: {
  active: boolean; label: string; count: number; onClick: () => void; tone: string;
}) {
  return (
    <button type="button" onClick={onClick} className="text-[11.5px] font-bold px-2.5 py-1 rounded-full"
      style={{
        background: active ? T.blue : "white",
        color: active ? "white" : tone,
        border: `1px solid ${active ? T.blue : T.border}`,
      }}>
      {label} <span className="opacity-70 tabular-nums">{count}</span>
    </button>
  );
}

function SupplyEditor({ row, onClose, onSaved }: {
  row: SupplyRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState(row?.name ?? "");
  const [category, setCategory] = useState<SupplyCategory>(row?.category ?? "boxes");
  const [unit, setUnit] = useState<SupplyUnit>(row?.unit ?? "each");
  const [onHand, setOnHand] = useState(row?.onHand ?? 0);
  const [reorderAt, setReorderAt] = useState(row?.reorderAt ?? 5);
  const [reorderQty, setReorderQty] = useState(row?.reorderQty ?? 20);
  const [vendor, setVendor] = useState(row?.vendor ?? "");
  const [vendorSku, setVendorSku] = useState(row?.vendorSku ?? "");
  const [costDollars, setCostDollars] = useState(row?.costCents != null ? (row.costCents / 100).toFixed(2) : "");
  const [notes, setNotes] = useState(row?.notes ?? "");
  const [isActive, setIsActive] = useState(row?.isActive ?? true);
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onSave() {
    setErrorMsg(null);
    const cents = costDollars.trim() ? Math.round(parseFloat(costDollars) * 100) : undefined;
    startTransition(async () => {
      const res = await upsertSupply({
        id: row?.id, name, category, unit, onHand, reorderAt, reorderQty,
        vendor: vendor.trim() || undefined,
        vendorSku: vendorSku.trim() || undefined,
        costCents: cents,
        notes: notes.trim() || undefined,
        isActive,
      });
      if (res.error) { setErrorMsg(res.error); return; }
      onSaved();
    });
  }

  function onDelete() {
    if (!row) return;
    if (!confirm(`Delete "${row.name}"? Movement history will also be removed.`)) return;
    startTransition(async () => {
      const res = await deleteSupply(row.id);
      if (res.error) { setErrorMsg(res.error); return; }
      onSaved();
    });
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={onClose}>
      <div className="relative w-full max-w-xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" style={{ background: T.surface, border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>{row ? "Edit supply" : "Add supply"}</p>
            <h3 className="text-lg font-black" style={{ color: T.ink }}>{row?.name ?? "New inventory item"}</h3>
          </div>
          <button type="button" onClick={onClose} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base font-black hover:bg-[#F4F5F7]" style={{ color: T.inkSoft }}>✕</button>
        </div>
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          <Field label="Name *">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Small flat-rate box" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
          <div>
            <Label>Category</Label>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {SUPPLY_CATEGORIES.map((c) => (
                <button key={c.key} type="button" onClick={() => setCategory(c.key)} className="text-[11.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: category === c.key ? T.blue : "white", color: category === c.key ? "white" : T.inkSoft, border: `1px solid ${category === c.key ? T.blue : T.border}` }}>
                  {c.emoji} {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Field label="Unit">
              <select value={unit} onChange={(e) => setUnit(e.target.value as SupplyUnit)} className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}>
                {SUPPLY_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label="On hand">
              <input type="number" min={0} value={onHand} onChange={(e) => setOnHand(Math.max(0, parseInt(e.target.value) || 0))} className="w-full px-3 py-2 rounded-lg text-sm tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
            <Field label="Reorder at">
              <input type="number" min={0} value={reorderAt} onChange={(e) => setReorderAt(Math.max(0, parseInt(e.target.value) || 0))} className="w-full px-3 py-2 rounded-lg text-sm tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
            <Field label="Reorder qty">
              <input type="number" min={0} value={reorderQty} onChange={(e) => setReorderQty(Math.max(0, parseInt(e.target.value) || 0))} className="w-full px-3 py-2 rounded-lg text-sm tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Vendor">
              <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Uline, Amazon" className="w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
            <Field label="Vendor SKU">
              <input value={vendorSku} onChange={(e) => setVendorSku(e.target.value)} placeholder="S-4567" className="w-full px-3 py-2 rounded-lg text-sm font-mono" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
            <Field label="Cost ($/unit)">
              <input value={costDollars} onChange={(e) => setCostDollars(e.target.value)} placeholder="0.00" inputMode="decimal" className="w-full px-3 py-2 rounded-lg text-sm tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
            </Field>
          </div>
          <Field label="Notes">
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} placeholder="Storage location, reorder cadence" className="w-full px-3 py-2 rounded-lg text-[12.5px] resize-none" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </Field>
          <label className="inline-flex items-center gap-2 text-[11.5px] font-bold cursor-pointer" style={{ color: T.inkSoft }}>
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
            Active (show in inventory list)
          </label>
          {errorMsg && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{errorMsg}</p>}
        </div>
        <div className="px-5 py-3 flex items-center justify-between gap-2" style={{ borderTop: `1px solid ${T.border}` }}>
          {row ? (
            <button type="button" onClick={onDelete} disabled={pending} className="text-[10.5px] font-bold px-2 py-1 rounded-md disabled:opacity-50" style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: "1px solid rgba(239,68,68,0.30)" }}>
              Delete supply
            </button>
          ) : <span />}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="text-[11.5px] font-bold px-3 py-2 rounded-lg" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>Cancel</button>
            <button type="button" onClick={onSave} disabled={pending} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
              {pending ? "Saving…" : row ? "Save changes" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function SupplyDrawer({ supplyId, row, onClose, onChanged }: {
  supplyId: string;
  row: SupplyRow | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [movements, setMovements] = useState<SupplyMovementRow[] | null>(null);
  const [tiers, setTiers] = useState<SupplyPriceTierRow[] | null>(null);
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [kind, setKind] = useState<SupplyMovementKind>("restock");
  const [qty, setQty] = useState(0);
  const [setOnHandValue, setSetOnHand] = useState(row?.onHand ?? 0);
  const [notes, setNotes] = useState("");
  // iter-164 — sale-only fields. tierId picks which SupplyPriceTier to
  // record at the price snapshot; admin can override the unit price
  // inline (e.g. counter discount). Default tier preselected.
  const [tierId, setTierId] = useState<string>("");
  const [unitPriceDollars, setUnitPriceDollars] = useState<string>("");

  function refreshLogs() {
    void listSupplyMovements({ supplyId }).then(setMovements).catch(() => setMovements([]));
  }
  function refreshTiers() {
    void listSupplyPriceTiers({ supplyId }).then(setTiers).catch(() => setTiers([]));
  }
  useEffect(() => { refreshLogs(); refreshTiers(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplyId]);

  // Auto-select the default tier as the active sale tier whenever tiers
  // refresh, and keep the unit-price input in sync until admin edits.
  useEffect(() => {
    if (!tiers || tiers.length === 0) return;
    const def = tiers.find((t) => t.isDefault) ?? tiers[0];
    setTierId((cur) => cur || (def?.id ?? ""));
  }, [tiers]);
  useEffect(() => {
    if (!tiers) return;
    const t = tiers.find((x) => x.id === tierId);
    if (t) setUnitPriceDollars((t.salePriceCents / 100).toFixed(2));
  }, [tierId, tiers]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function onSubmit() {
    setErrorMsg(null);
    startTransition(async () => {
      const unitPriceCents = (kind === "sale" && unitPriceDollars.trim())
        ? Math.round(parseFloat(unitPriceDollars) * 100)
        : undefined;
      const res = await recordSupplyMovement({
        supplyId,
        kind,
        qty: kind !== "adjust" ? qty : undefined,
        setOnHand: kind === "adjust" ? setOnHandValue : undefined,
        notes: notes.trim() || undefined,
        ...(kind === "sale" ? { tierId: tierId || undefined, unitPriceCents } : {}),
      });
      if (res.error) { setErrorMsg(res.error); return; }
      setQty(0);
      setNotes("");
      refreshLogs();
      onChanged();
    });
  }

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={onClose}>
      <div className="relative w-full max-w-2xl rounded-2xl shadow-2xl flex flex-col max-h-[90vh]" style={{ background: T.surface, border: `1px solid ${T.border}` }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 px-5 py-4" style={{ borderBottom: `1px solid ${T.border}` }}>
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: T.blue }}>Supply · movement log</p>
            <h3 className="text-lg font-black truncate" style={{ color: T.ink }}>{row?.name ?? "Supply"}</h3>
            {row && (
              <p className="text-[11px] mt-0.5" style={{ color: T.inkFaint }}>
                <strong style={{ color: row.status === "out" ? T.danger : T.ink }}>{row.onHand}</strong> {row.unit} on hand · reorder at {row.reorderAt} · {row.movementCount} movement{row.movementCount === 1 ? "" : "s"}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-base font-black hover:bg-[#F4F5F7]" style={{ color: T.inkSoft }}>✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          <div className="rounded-xl p-4" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
              Record movement
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {SUPPLY_MOVEMENT_KINDS.map((k) => (
                <button key={k.key} type="button" onClick={() => setKind(k.key)} className="text-[11.5px] font-bold px-2.5 py-1 rounded-full" style={{ background: kind === k.key ? T.blue : "white", color: kind === k.key ? "white" : T.inkSoft, border: `1px solid ${kind === k.key ? T.blue : T.border}` }}>
                  {k.emoji} {k.label}
                </button>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-[1fr_120px] gap-2">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={500} placeholder={kind === "restock" ? "Vendor PO #, delivery date" : kind === "loss" ? "What was damaged or lost" : kind === "sale" ? "Receipt #, customer name" : "Optional note"} className="w-full px-3 py-2 rounded-lg text-[12.5px] resize-none" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
              {kind === "adjust" ? (
                <div>
                  <Label>Set on hand</Label>
                  <input type="number" min={0} value={setOnHandValue} onChange={(e) => setSetOnHand(Math.max(0, parseInt(e.target.value) || 0))} className="mt-1 w-full px-3 py-2 rounded-lg text-sm tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
                </div>
              ) : (
                <div>
                  <Label>Quantity</Label>
                  <input type="number" min={0} value={qty} onChange={(e) => setQty(Math.max(0, parseInt(e.target.value) || 0))} className="mt-1 w-full px-3 py-2 rounded-lg text-sm tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
                </div>
              )}
            </div>

            {/* iter-164 — Sale-only fields. Tier picker auto-fills the
                unit price; admin can override (e.g. counter discount).
                Live revenue + margin preview shows what'll be captured
                in the movement row + reflected in the margin report. */}
            {kind === "sale" && (
              <div className="mt-2 rounded-lg p-2.5" style={{ background: "white", border: `1px solid ${T.border}` }}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <Label>Pricing tier</Label>
                    {tiers && tiers.length > 0 ? (
                      <select value={tierId} onChange={(e) => setTierId(e.target.value)} className="mt-1 w-full px-3 py-2 rounded-lg text-sm" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }}>
                        {tiers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label} — {fmtCents(t.salePriceCents)}{t.isDefault ? " ★" : ""}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <p className="mt-1 text-[11px] italic" style={{ color: T.inkFaint }}>
                        No tiers yet. Add one below to enable sales tracking.
                      </p>
                    )}
                  </div>
                  <div>
                    <Label>Unit price ($)</Label>
                    <input value={unitPriceDollars} onChange={(e) => setUnitPriceDollars(e.target.value)} placeholder="0.00" inputMode="decimal" className="mt-1 w-full px-3 py-2 rounded-lg text-sm tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
                  </div>
                </div>
                {qty > 0 && unitPriceDollars.trim() && (() => {
                  const unit = Math.round(parseFloat(unitPriceDollars) * 100);
                  const revenue = unit * qty;
                  const cogs = (row?.costCents ?? 0) * qty;
                  const profit = revenue - cogs;
                  const margin = revenue > 0 ? Math.round((profit / revenue) * 100) : null;
                  return (
                    <p className="mt-2 text-[10.5px] tabular-nums" style={{ color: T.inkFaint }}>
                      Revenue <strong style={{ color: T.ink }}>{fmtCents(revenue)}</strong> · COGS {fmtCents(cogs)} · Profit{" "}
                      <strong style={{ color: profit >= 0 ? T.success : T.danger }}>{fmtCents(profit)}</strong>
                      {margin != null && (
                        <span className="ml-1">· margin <strong style={{ color: margin >= 50 ? T.success : margin >= 20 ? T.warning : T.danger }}>{margin}%</strong></span>
                      )}
                    </p>
                  );
                })()}
              </div>
            )}

            {errorMsg && <p className="mt-1 text-[11px] font-semibold" style={{ color: T.danger }}>{errorMsg}</p>}
            <div className="mt-2 flex justify-end">
              <button type="button" onClick={onSubmit} disabled={pending} className="text-[11.5px] font-black px-3 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
                {pending ? "Saving…" : "Save movement"}
              </button>
            </div>
          </div>

          {/* iter-164 — Per-supply pricing tiers. Inline CRUD against
              SupplyPriceTier. Default tier (★) is what the sale form
              auto-picks, and what shows on the inventory list row. */}
          <SupplyPriceTiersBlock
            supplyId={supplyId}
            tiers={tiers}
            costCents={row?.costCents ?? null}
            onChanged={() => { refreshTiers(); onChanged(); }}
          />

          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>
              History {movements && `(${movements.length})`}
            </p>
            {movements == null ? (
              <p className="text-[11.5px]" style={{ color: T.inkFaint }}>Loading…</p>
            ) : movements.length === 0 ? (
              <div className="rounded-lg px-3 py-4 text-center text-[11.5px]" style={{ background: T.surfaceAlt, color: T.inkFaint, border: `1px dashed ${T.border}` }}>
                No movements yet for this supply.
              </div>
            ) : (
              <ul className="space-y-1.5">
                {movements.map((m) => {
                  const meta = SUPPLY_MOVEMENT_KINDS.find((k) => k.key === m.kind);
                  const at = new Date(m.performedAtIso);
                  const positive = m.delta > 0;
                  return (
                    <li key={m.id} className="rounded-lg p-3" style={{ background: "white", border: `1px solid ${T.border}` }}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[10.5px] font-black" style={{ color: T.ink }}>
                            {meta?.emoji ?? "📝"} {meta?.label ?? m.kind}
                          </span>
                          <span className="text-[13px] font-black tabular-nums" style={{ color: positive ? "#15803d" : m.delta < 0 ? "#991b1b" : T.inkFaint }}>
                            {positive ? "+" : ""}{m.delta}
                          </span>
                          <span className="text-[10.5px]" style={{ color: T.inkFaint }}>
                            · {at.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                          </span>
                          {m.performedByName && <span className="text-[10.5px]" style={{ color: T.inkFaint }}>· by {m.performedByName}</span>}
                        </div>
                      </div>
                      {/* iter-164 — sale rows show captured tier + price */}
                      {m.kind === "sale" && (m.unitPriceCents != null || m.tierLabel) && (
                        <p className="text-[10.5px] mt-1 tabular-nums" style={{ color: T.inkFaint }}>
                          {m.tierLabel && <span className="font-bold mr-1" style={{ color: T.blueDeep }}>{m.tierLabel}</span>}
                          {m.unitPriceCents != null && <>{fmtCents(m.unitPriceCents)} × {Math.abs(m.delta)} = <strong style={{ color: T.ink }}>{fmtCents(m.unitPriceCents * Math.abs(m.delta))}</strong></>}
                          {m.unitCostCents != null && m.unitPriceCents != null && (
                            <span className="ml-1">
                              · profit <strong style={{ color: m.unitPriceCents >= m.unitCostCents ? T.success : T.danger }}>
                                {fmtCents((m.unitPriceCents - m.unitCostCents) * Math.abs(m.delta))}
                              </strong>
                            </span>
                          )}
                        </p>
                      )}
                      {m.notes && <p className="text-[11.5px] mt-1 italic" style={{ color: T.inkSoft }}>{m.notes}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] font-black uppercase tracking-[0.16em] block" style={{ color: T.inkFaint }}>{children}</label>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <Label>{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// iter-164 — Pricing tiers block inside the supply drawer.
// Inline-edits each tier (label, price, default), supports the 3
// suggested presets (Retail / Member / Wholesale), and shows a
// live margin pill against the supply's costCents.
function SupplyPriceTiersBlock({ supplyId, tiers, costCents, onChanged }: {
  supplyId: string;
  tiers: SupplyPriceTierRow[] | null;
  costCents: number | null;
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState<{ id?: string; label: string; price: string; isDefault: boolean } | null>(null);
  const [pending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function startNew(preset?: { label: string; markupPct: number }) {
    setErrorMsg(null);
    let priceCents = 0;
    if (preset && costCents) {
      priceCents = Math.round(costCents * (1 + preset.markupPct / 100));
    }
    setDraft({
      label: preset?.label ?? "",
      price: priceCents > 0 ? (priceCents / 100).toFixed(2) : "",
      isDefault: !tiers || tiers.length === 0,
    });
  }

  function startEdit(t: SupplyPriceTierRow) {
    setErrorMsg(null);
    setDraft({ id: t.id, label: t.label, price: (t.salePriceCents / 100).toFixed(2), isDefault: t.isDefault });
  }

  function onSave() {
    if (!draft) return;
    const cents = Math.round(parseFloat(draft.price || "0") * 100);
    if (!Number.isFinite(cents) || cents < 0) {
      setErrorMsg("Price must be ≥ $0");
      return;
    }
    startTransition(async () => {
      const res = await upsertSupplyPriceTier({
        id: draft.id, supplyId, label: draft.label,
        salePriceCents: cents, isDefault: draft.isDefault,
      });
      if (res.error) { setErrorMsg(res.error); return; }
      setDraft(null);
      onChanged();
    });
  }

  function onDelete(id: string, label: string) {
    if (!confirm(`Delete tier "${label}"? Past sales using it stay logged with the captured price.`)) return;
    startTransition(async () => {
      const res = await deleteSupplyPriceTier({ id });
      if (res.error) { setErrorMsg(res.error); return; }
      onChanged();
    });
  }

  function onMakeDefault(t: SupplyPriceTierRow) {
    startTransition(async () => {
      const res = await upsertSupplyPriceTier({
        id: t.id, supplyId, label: t.label,
        salePriceCents: t.salePriceCents, isDefault: true,
      });
      if (res.error) { setErrorMsg(res.error); return; }
      onChanged();
    });
  }

  return (
    <div className="rounded-xl p-3" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}` }}>
      <div className="flex items-center justify-between flex-wrap gap-2">
        <p className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>
          Pricing tiers · margin vs. {costCents != null ? `cost ${fmtCents(costCents)}` : "no cost set"}
        </p>
        <div className="flex flex-wrap gap-1">
          {DEFAULT_TIER_PRESETS.map((p) => {
            const exists = tiers?.some((t) => t.label.toLowerCase() === p.label.toLowerCase());
            return (
              <button key={p.label} type="button" disabled={exists}
                onClick={() => startNew(p)}
                className="text-[10px] font-bold px-2 py-0.5 rounded-md disabled:opacity-40"
                style={{ background: "white", color: T.inkSoft, border: `1px solid ${T.border}` }}
                title={p.description}
              >
                + {p.label} ({p.markupPct}%)
              </button>
            );
          })}
          <button type="button" onClick={() => startNew()}
            className="text-[10px] font-bold px-2 py-0.5 rounded-md"
            style={{ background: T.blue, color: "white", border: `1px solid ${T.blue}` }}>
            + Custom
          </button>
        </div>
      </div>

      {tiers == null ? (
        <p className="mt-2 text-[11px]" style={{ color: T.inkFaint }}>Loading…</p>
      ) : tiers.length === 0 && !draft ? (
        <p className="mt-2 text-[11px] italic" style={{ color: T.inkFaint }}>
          No tiers yet. Add Retail / Member / Wholesale presets above to start tracking margin.
        </p>
      ) : (
        <ul className="mt-2 space-y-1">
          {tiers.map((t) => (
            <li key={t.id} className="rounded-md px-2.5 py-1.5 flex items-center gap-2 text-[11.5px]" style={{ background: "white", border: `1px solid ${T.border}` }}>
              {t.isDefault && <span className="text-[10px] font-black px-1 py-0.5 rounded" style={{ background: "rgba(25,118,255,0.10)", color: T.blue }}>★ DEFAULT</span>}
              <span className="font-bold" style={{ color: T.ink }}>{t.label}</span>
              <span className="tabular-nums" style={{ color: T.inkSoft }}>{fmtCents(t.salePriceCents)}</span>
              {t.markupPct != null && (
                <span className="text-[10.5px] font-bold tabular-nums" style={{ color: t.markupPct >= 50 ? T.success : t.markupPct >= 20 ? T.warning : T.danger }}>
                  {t.markupPct}% markup
                </span>
              )}
              {t.marginPct != null && (
                <span className="text-[10px] tabular-nums" style={{ color: T.inkFaint }}>
                  ({t.marginPct}% margin)
                </span>
              )}
              <span className="ml-auto flex items-center gap-1">
                {!t.isDefault && (
                  <button type="button" onClick={() => onMakeDefault(t)} disabled={pending}
                    className="text-[9.5px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                    Make default
                  </button>
                )}
                <button type="button" onClick={() => startEdit(t)} disabled={pending}
                  className="text-[9.5px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
                  Edit
                </button>
                <button type="button" onClick={() => onDelete(t.id, t.label)} disabled={pending}
                  className="text-[9.5px] font-bold px-1.5 py-0.5 rounded"
                  style={{ background: "rgba(239,68,68,0.06)", color: T.danger, border: `1px solid rgba(239,68,68,0.30)` }}>
                  ×
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      {draft && (
        <div className="mt-2 rounded-md p-2.5 flex flex-wrap items-end gap-2" style={{ background: "white", border: `1px solid ${T.blue}` }}>
          <div className="flex-1 min-w-[120px]">
            <Label>Label</Label>
            <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Retail" maxLength={60} className="mt-1 w-full px-2 py-1.5 rounded text-[12px]" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <div className="w-28">
            <Label>Price ($)</Label>
            <input value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })} placeholder="0.00" inputMode="decimal" className="mt-1 w-full px-2 py-1.5 rounded text-[12px] tabular-nums" style={{ background: T.surfaceAlt, border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <label className="text-[10.5px] font-bold flex items-center gap-1 cursor-pointer" style={{ color: T.inkSoft }}>
            <input type="checkbox" checked={draft.isDefault} onChange={(e) => setDraft({ ...draft, isDefault: e.target.checked })} className="w-3 h-3 accent-[#1976FF]" />
            Default
          </label>
          {(() => {
            const cents = Math.round(parseFloat(draft.price || "0") * 100);
            const mk = computeMarkupPct(costCents, cents);
            const mg = computeMarginPct(costCents, cents);
            if (cents > 0 && (mk != null || mg != null)) {
              return (
                <p className="text-[10px] tabular-nums" style={{ color: T.inkFaint }}>
                  {mk != null && <>markup <strong style={{ color: T.ink }}>{mk}%</strong></>}
                  {mg != null && <span className="ml-1">· margin <strong style={{ color: T.ink }}>{mg}%</strong></span>}
                </p>
              );
            }
            return null;
          })()}
          <div className="ml-auto flex gap-1">
            <button type="button" onClick={() => setDraft(null)} className="text-[10.5px] font-bold px-2 py-1 rounded" style={{ background: T.surfaceAlt, color: T.inkSoft, border: `1px solid ${T.border}` }}>
              Cancel
            </button>
            <button type="button" onClick={onSave} disabled={pending} className="text-[10.5px] font-black px-2 py-1 rounded text-white disabled:opacity-50" style={{ background: T.blue }}>
              {pending ? "…" : draft.id ? "Save" : "Add tier"}
            </button>
          </div>
        </div>
      )}

      {errorMsg && <p className="mt-1 text-[11px] font-semibold" style={{ color: T.danger }}>{errorMsg}</p>}
    </div>
  );
}
