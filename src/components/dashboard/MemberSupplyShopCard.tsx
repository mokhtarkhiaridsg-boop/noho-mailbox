"use client";

/**
 * iter-208 — Member-facing supply marketplace card (Tier 15 #117).
 *
 * Renders ZERO when the bureau has no priced active supplies (so
 * dashboard stays clean for new bureaus). Otherwise shows a card
 * with category-grouped supply list + per-row buy controls + live
 * "x in stock" indicator. Charges the wallet on confirm.
 */

import { useEffect, useState, useTransition } from "react";
import { BRAND } from "./types";
import { listMemberSupplyShop, buyMemberSupply, type MemberSupplyRow } from "@/app/actions/memberSupplyShop";

const CATEGORY_LABELS: Record<string, string> = {
  boxes: "📦 Boxes",
  tape: "🩹 Tape",
  labels: "🏷️ Labels",
  poly_mailers: "📨 Poly mailers",
  envelopes: "✉️ Envelopes",
  printer_ribbon: "🖨️ Printer ribbons",
  other: "🧰 Other",
};

function fmt$(cents: number | null | undefined): string {
  if (cents == null) return "—";
  return `$${(cents / 100).toFixed(2)}`;
}

export default function MemberSupplyShopCard() {
  const [rows, setRows] = useState<MemberSupplyRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qty, setQty] = useState<Record<string, number>>({});

  function refresh() {
    void listMemberSupplyShop().then(setRows).catch(() => setRows([]));
  }
  useEffect(refresh, []);

  function setRowQty(id: string, n: number) {
    setQty((q) => ({ ...q, [id]: Math.max(1, Math.min(50, n)) }));
  }

  function onBuy(r: MemberSupplyRow) {
    const n = qty[r.id] ?? 1;
    if (!confirm(`Buy ${n} × ${r.name} for ${fmt$((r.priceCents ?? 0) * n)} from your wallet?`)) return;
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await buyMemberSupply({ supplyId: r.id, quantity: n });
      if (res.error) { setError(res.error); return; }
      setInfo(`✓ Got ${res.qtyBought}× ${res.supplyName} for ${fmt$(res.totalChargedCents)} · wallet now ${fmt$(res.newWalletBalanceCents)}`);
      refresh();
    });
  }

  if (!rows || rows.length === 0) return null;

  // Group by category
  const groups = new Map<string, MemberSupplyRow[]>();
  for (const r of rows) {
    const arr = groups.get(r.category) ?? [];
    arr.push(r);
    groups.set(r.category, arr);
  }

  return (
    <section className="rounded-2xl bg-white border p-5" style={{ borderColor: BRAND.border }}>
      <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${BRAND.blue}B0` }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: BRAND.blue, boxShadow: `0 0 6px ${BRAND.blue}` }} />
            Marketplace · Member supplies
          </p>
          <h3 className="text-base font-black tracking-tight" style={{ color: BRAND.ink }}>
            Bureau supply shop · member pricing
          </h3>
          <p className="text-[11px] mt-0.5" style={{ color: BRAND.inkSoft }}>
            Boxes, tape, labels, mailers — pick up at the bureau next time you&apos;re in. Charged from your wallet at member-tier pricing.
          </p>
        </div>
      </div>

      {info && <p className="text-[11.5px] font-semibold" style={{ color: "#15803d" }}>{info}</p>}
      {error && <p className="text-[11.5px] font-semibold" style={{ color: "#b91c1c" }}>{error}</p>}

      <div className="space-y-3 mt-3">
        {Array.from(groups.entries()).map(([cat, items]) => (
          <div key={cat}>
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: BRAND.inkFaint }}>
              {CATEGORY_LABELS[cat] ?? `${cat}`}
            </p>
            <ul className="space-y-1.5">
              {items.map((r) => {
                const n = qty[r.id] ?? 1;
                const total = (r.priceCents ?? 0) * n;
                const sold = !r.inStock;
                return (
                  <li key={r.id} className="rounded-xl p-3 flex items-start justify-between gap-2 flex-wrap"
                    style={{ background: "white", border: `1px solid ${BRAND.border}`, opacity: sold ? 0.55 : 1 }}>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12.5px] font-black" style={{ color: BRAND.ink }}>{r.name}</p>
                      <p className="text-[11px]" style={{ color: BRAND.inkSoft }}>
                        {fmt$(r.priceCents)}/{r.unit} {r.tierLabel && <span style={{ color: BRAND.inkFaint }}>· {r.tierLabel} pricing</span>}
                      </p>
                      <p className="text-[10.5px] mt-0.5" style={{ color: r.onHand <= 5 ? "#92400e" : BRAND.inkFaint }}>
                        {r.onHand > 0 ? `${r.onHand} ${r.unit}${r.onHand === 1 ? "" : "s"} in stock` : "Out of stock"}
                        {r.notes && <span className="italic"> · {r.notes}</span>}
                      </p>
                    </div>
                    {!sold && (
                      <div className="flex items-center gap-2 shrink-0">
                        <input type="number" min={1} max={50} value={n} onChange={(e) => setRowQty(r.id, parseInt(e.target.value, 10) || 1)}
                          className="w-12 rounded-md px-2 py-1 text-[12px] font-bold tabular-nums text-center" style={{ background: BRAND.bg, border: `1px solid ${BRAND.border}` }} />
                        <button type="button" onClick={() => onBuy(r)} disabled={busy}
                          className="text-[10.5px] font-black px-2.5 py-1 rounded-md text-white disabled:opacity-50" style={{ background: BRAND.blue }}>
                          Buy · {fmt$(total)}
                        </button>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-[10px] mt-3 text-center" style={{ color: BRAND.inkFaint }}>
        Pickup at the bureau · payments go through your wallet · no shipping
      </p>
    </section>
  );
}
