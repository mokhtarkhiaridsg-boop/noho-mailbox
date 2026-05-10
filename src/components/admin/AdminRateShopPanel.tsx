"use client";

/**
 * iter-184 — Carrier rate-shop admin panel (Tier 12 #93).
 *
 * Type destination zip + weight → side-by-side carrier rates with
 * the cheapest + fastest highlighted. Hit "Save quote" to persist a
 * snapshot. Click any rate to mark it as the carrier we shipped with
 * (audits the choice for later carrier-mix reporting).
 */

import { useEffect, useState, useTransition } from "react";
import {
  quoteShippingRates,
  selectRateQuote,
  listRecentRateQuotes,
  type RateQuoteResponse,
  type RecentQuoteRow,
} from "@/app/actions/rateShop";
import type { Quote, CarrierKey } from "@/lib/rate-shop";

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

const CARRIER_META: Record<CarrierKey, { color: string; emoji: string }> = {
  USPS:  { color: "#004B87", emoji: "📬" },
  UPS:   { color: "#7B5C2D", emoji: "🟫" },
  FedEx: { color: "#4D148C", emoji: "🟣" },
  DHL:   { color: "#FFCC00", emoji: "✈️" },
};

export default function AdminRateShopPanel() {
  const [destZip, setDestZip] = useState("");
  const [weightLb, setWeightLb] = useState("1.0");
  const [declaredValueDollars, setDeclaredValueDollars] = useState("");
  const [dimensions, setDimensions] = useState("");
  const [persist, setPersist] = useState(true);
  const [response, setResponse] = useState<RateQuoteResponse | null>(null);
  const [recent, setRecent] = useState<RecentQuoteRow[] | null>(null);
  const [busy, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  function refreshRecent() {
    void listRecentRateQuotes({ limit: 12 }).then(setRecent).catch(() => setRecent([]));
  }
  useEffect(refreshRecent, []);

  function onQuote() {
    setError(null); setInfo(null);
    const weightOz = Math.round(parseFloat(weightLb) * 16);
    if (!Number.isFinite(weightOz) || weightOz <= 0) { setError("Weight must be > 0 lb."); return; }
    const declaredValueCents = declaredValueDollars.trim()
      ? Math.round(parseFloat(declaredValueDollars) * 100)
      : undefined;
    startTransition(async () => {
      const res = await quoteShippingRates({
        destZip, weightOz,
        declaredValueCents,
        dimensions: dimensions.trim() || undefined,
        persist,
      });
      if (!res.ok) { setError(res.error); setResponse(null); return; }
      setResponse(res.data);
      if (persist) refreshRecent();
    });
  }

  function onSelectCarrier(rate: Quote) {
    if (!response?.quoteId) {
      setError("Save the quote first (toggle 'Persist' on) before selecting a carrier.");
      return;
    }
    setError(null); setInfo(null);
    startTransition(async () => {
      const res = await selectRateQuote({
        quoteId: response.quoteId!, carrier: rate.carrier, service: rate.service,
      });
      if (res.error) setError(res.error);
      else { setInfo(`✓ Selected ${rate.carrier} ${rate.service} ($${(rate.totalCents / 100).toFixed(2)})`); refreshRecent(); }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-baseline gap-3 flex-wrap">
        <h2
          className="text-2xl font-bold"
          style={{
            color: "#1A1D23",
            letterSpacing: "-0.01em",
            fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
          }}
        >
          Rate Shop
        </h2>
        <span
          className="text-[15px] hidden sm:inline"
          style={{
            color: "#1976FF",
            fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
            transform: "translateY(-1px)",
            display: "inline-block",
          }}
        >
          cheapest fastest, side by side
        </span>
        <span className="text-[12px] ml-1 hidden md:inline" style={{ color: "#7A8290" }}>
          · USPS · UPS · FedEx · DHL
        </span>
      </div>

      <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Dest ZIP *</label>
            <input value={destZip} onChange={(e) => setDestZip(e.target.value)} maxLength={10} placeholder="10001" inputMode="numeric" className="mt-1 w-full px-3 py-2 rounded-lg text-[14px] font-mono" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Weight (lb) *</label>
            <input value={weightLb} onChange={(e) => setWeightLb(e.target.value)} placeholder="1.0" inputMode="decimal" className="mt-1 w-full px-3 py-2 rounded-lg text-[14px] tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Declared value ($)</label>
            <input value={declaredValueDollars} onChange={(e) => setDeclaredValueDollars(e.target.value)} placeholder="0.00" inputMode="decimal" className="mt-1 w-full px-3 py-2 rounded-lg text-[14px] tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
          <div>
            <label className="text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: T.inkFaint }}>Dimensions</label>
            <input value={dimensions} onChange={(e) => setDimensions(e.target.value)} placeholder="12x9x4" maxLength={40} className="mt-1 w-full px-3 py-2 rounded-lg text-[14px] tabular-nums" style={{ background: "white", border: `1px solid ${T.border}`, color: T.ink }} />
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between flex-wrap gap-2">
          <label className="text-[11px] font-bold flex items-center gap-1.5 cursor-pointer" style={{ color: T.inkSoft }}>
            <input type="checkbox" checked={persist} onChange={(e) => setPersist(e.target.checked)} className="w-3.5 h-3.5 accent-[#1976FF]" />
            Save quote (required to lock in selected carrier)
          </label>
          <button type="button" onClick={onQuote} disabled={busy || !destZip} className="text-[12px] font-black px-4 py-2 rounded-lg text-white disabled:opacity-50" style={{ background: T.blue }}>
            {busy ? "Quoting…" : "↻ Get rates"}
          </button>
        </div>
      </div>

      {error && <p className="text-[11.5px] font-semibold" style={{ color: T.danger }}>{error}</p>}
      {info && <p className="text-[11.5px] font-semibold" style={{ color: T.success }}>{info}</p>}

      {response && (
        <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <p className="text-[11px]" style={{ color: T.inkSoft }}>
              Quoted <strong style={{ color: T.ink }}>{response.weightOz} oz</strong> to <strong style={{ color: T.ink }}>ZIP {response.destZip}</strong> {response.zone ? `(zone ${response.zone})` : ""}
              {response.quoteId ? <span style={{ color: T.success }}> · saved</span> : <span style={{ color: T.warning }}> · not saved</span>}
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
            {response.rates.map((r) => (
              <RateCard key={`${r.carrier}-${r.service}`} rate={r} onSelect={() => onSelectCarrier(r)} disabled={busy} />
            ))}
          </div>
        </div>
      )}

      {recent != null && recent.length > 0 && (
        <div className="rounded-2xl p-4" style={{ background: T.surface, border: `1px solid ${T.border}` }}>
          <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: T.inkFaint }}>Recent quotes</p>
          <ul className="space-y-1">
            {recent.map((r) => (
              <li key={r.id} className="text-[11px] flex items-center gap-2 py-1" style={{ borderBottom: `1px solid ${T.border}` }}>
                <span className="font-mono font-black" style={{ color: T.blueDeep, minWidth: 60 }}>ZIP {r.destZip}</span>
                <span className="tabular-nums" style={{ color: T.inkSoft, minWidth: 50 }}>{(r.weightOz / 16).toFixed(1)} lb</span>
                {r.cheapestCarrier && (
                  <span style={{ color: T.success }}>cheap: {r.cheapestCarrier} ${(r.cheapestCents! / 100).toFixed(2)}</span>
                )}
                {r.selectedCarrier && (
                  <span className="font-bold" style={{ color: T.blueDeep }}>· chose {r.selectedCarrier} {r.selectedService} ${(r.selectedTotalCents! / 100).toFixed(2)}</span>
                )}
                <span className="ml-auto" style={{ color: T.inkFaint }}>{fmtRel(r.createdAtIso)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function RateCard({ rate, onSelect, disabled }: { rate: Quote; onSelect: () => void; disabled: boolean }) {
  const meta = CARRIER_META[rate.carrier];
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      className="rounded-xl p-3 text-left relative transition-shadow hover:shadow-md disabled:opacity-50"
      style={{
        background: "white",
        border: rate.isCheapest ? `2px solid ${T.success}` : rate.isFastest ? `2px solid ${T.blue}` : `1px solid ${T.border}`,
      }}
    >
      <div className="flex items-center justify-between gap-2 mb-1">
        <div className="flex items-center gap-1.5">
          <span aria-hidden style={{ fontSize: 18 }}>{meta.emoji}</span>
          <span className="text-[11.5px] font-black" style={{ color: meta.color }}>{rate.carrier}</span>
        </div>
        <div className="flex flex-col gap-1 items-end">
          {rate.isCheapest && <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.10)", color: "#15803d" }}>💰 CHEAPEST</span>}
          {rate.isFastest && <span className="text-[9px] font-black px-1.5 py-0.5 rounded" style={{ background: "rgba(25,118,255,0.10)", color: "#0F5BD9" }}>⚡ FASTEST</span>}
        </div>
      </div>
      <p className="text-[12.5px] font-bold" style={{ color: T.ink }}>{rate.service}</p>
      <p className="text-[10.5px]" style={{ color: T.inkSoft }}>
        {rate.etaDays.min === rate.etaDays.max ? `${rate.etaDays.max} day${rate.etaDays.max === 1 ? "" : "s"}` : `${rate.etaDays.min}-${rate.etaDays.max} days`}
      </p>
      <p className="text-[20px] font-black tabular-nums mt-1.5" style={{ color: T.ink }}>
        ${(rate.totalCents / 100).toFixed(2)}
      </p>
      {rate.insuranceCents > 0 && (
        <p className="text-[10px]" style={{ color: T.inkFaint }}>
          (incl. ${(rate.insuranceCents / 100).toFixed(2)} insurance)
        </p>
      )}
    </button>
  );
}

function fmtRel(iso: string): string {
  const sec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}
