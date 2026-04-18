"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { getShippoRates, buyShippoLabel, trackShippoLabel } from "@/app/actions/shippo";
import type { ShippoRateResult } from "@/lib/shippo";

type LabelRow = {
  id: string;
  carrier: string;
  servicelevel: string;
  trackingNumber: string;
  trackingUrl: string;
  labelUrl: string;
  amountPaid: number;
  status: string;
  toName: string;
  toCity: string;
  toState: string;
  toZip: string;
  createdAt: string;
  userName?: string | null;
  suiteNumber?: string | null;
};

type Props = {
  isConfigured: boolean;
  recentLabels: LabelRow[];
};

const CARRIERS = ["USPS", "UPS", "FedEx", "DHL"];
const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

export function AdminShippoPanel({ isConfigured, recentLabels }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"rates" | "labels" | "track">("rates");

  // Rate form
  const [rateForm, setRateForm] = useState({
    toName: "", toStreet: "", toCity: "", toState: "CA", toZip: "",
    lengthIn: "12", widthIn: "9", heightIn: "3", weightOz: "16",
  });
  const [rates, setRates] = useState<ShippoRateResult[] | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);
  const [buyingRate, setBuyingRate] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState<string | null>(null);

  // Track form
  const [trackCarrier, setTrackCarrier] = useState("USPS");
  const [trackNum, setTrackNum] = useState("");
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  function fetchRates() {
    setRateError(null);
    setRates(null);
    setBuySuccess(null);
    startTransition(async () => {
      const result = await getShippoRates({
        toName: rateForm.toName || "Recipient",
        toStreet: rateForm.toStreet,
        toCity: rateForm.toCity,
        toState: rateForm.toState,
        toZip: rateForm.toZip,
        lengthIn: parseFloat(rateForm.lengthIn) || 12,
        widthIn: parseFloat(rateForm.widthIn) || 9,
        heightIn: parseFloat(rateForm.heightIn) || 3,
        weightOz: parseFloat(rateForm.weightOz) || 16,
      });
      if (result.error) setRateError(result.error);
      else if (result.rates) setRates(result.rates);
    });
  }

  function buyLabel(rate: ShippoRateResult) {
    setBuyingRate(rate.rateObjectId);
    setBuySuccess(null);
    startTransition(async () => {
      const result = await buyShippoLabel({
        rateObjectId: rate.rateObjectId,
        toName: rateForm.toName || "Recipient",
        toStreet: rateForm.toStreet,
        toCity: rateForm.toCity,
        toState: rateForm.toState,
        toZip: rateForm.toZip,
        lengthIn: parseFloat(rateForm.lengthIn),
        widthIn: parseFloat(rateForm.widthIn),
        heightIn: parseFloat(rateForm.heightIn),
        weightOz: parseFloat(rateForm.weightOz),
      });
      setBuyingRate(null);
      if (result.error) setRateError(result.error);
      else {
        setBuySuccess(result.label?.labelUrl ?? null);
        router.refresh();
      }
    });
  }

  function doTrack() {
    setTrackError(null);
    setTrackResult(null);
    startTransition(async () => {
      const result = await trackShippoLabel(trackCarrier, trackNum.trim());
      if (result.error) setTrackError(result.error);
      else setTrackResult(result.status);
    });
  }

  const inputCls = "w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5] bg-white";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-black text-text-light">Shipping Labels</h2>
          <p className="text-xs text-text-light/40 mt-0.5">Powered by Shippo · USPS, UPS, FedEx, DHL</p>
        </div>
        {!isConfigured && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-xs font-bold text-amber-700">
            ⚠ Add SHIPPO_API_KEY to enable live rates
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[#f4f6f8] rounded-xl p-1 w-fit">
        {(["rates", "labels", "track"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setView(t)}
            className={`px-4 py-2 rounded-lg text-xs font-bold capitalize transition-colors ${
              view === t ? "bg-white text-[#3374B5] shadow-sm" : "text-text-light/50 hover:text-text-light"
            }`}
          >
            {t === "rates" ? "🚀 Quick Ship" : t === "labels" ? "📦 Labels" : "🔍 Track"}
          </button>
        ))}
      </div>

      {/* Quick Ship */}
      {view === "rates" && (
        <div className="space-y-5">
          {/* To Address */}
          <div className="bg-white rounded-2xl border border-[#e8e5e0] p-5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Ship To</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Recipient Name</label>
                <input className={inputCls} value={rateForm.toName} onChange={(e) => setRateForm((p) => ({ ...p, toName: e.target.value }))} placeholder="John Smith" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Street Address</label>
                <input className={inputCls} value={rateForm.toStreet} onChange={(e) => setRateForm((p) => ({ ...p, toStreet: e.target.value }))} placeholder="123 Main St" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">City</label>
                <input className={inputCls} value={rateForm.toCity} onChange={(e) => setRateForm((p) => ({ ...p, toCity: e.target.value }))} placeholder="Los Angeles" />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">State</label>
                  <select className={inputCls} value={rateForm.toState} onChange={(e) => setRateForm((p) => ({ ...p, toState: e.target.value }))}>
                    {STATES.map((s) => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Zip</label>
                  <input className={inputCls} value={rateForm.toZip} maxLength={5} onChange={(e) => setRateForm((p) => ({ ...p, toZip: e.target.value.replace(/\D/g, "") }))} placeholder="90001" />
                </div>
              </div>
            </div>
          </div>

          {/* Package Dimensions */}
          <div className="bg-white rounded-2xl border border-[#e8e5e0] p-5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Package Dimensions</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Length (in)", key: "lengthIn" },
                { label: "Width (in)", key: "widthIn" },
                { label: "Height (in)", key: "heightIn" },
                { label: "Weight (oz)", key: "weightOz" },
              ].map(({ label, key }) => (
                <div key={key}>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">{label}</label>
                  <input
                    type="number"
                    min={0.1}
                    step={0.1}
                    className={inputCls}
                    value={rateForm[key as keyof typeof rateForm]}
                    onChange={(e) => setRateForm((p) => ({ ...p, [key]: e.target.value }))}
                  />
                </div>
              ))}
            </div>
            {/* Quick size presets */}
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Envelope", l: 9, w: 6, h: 0.5, oz: 2 },
                { label: "Small Box", l: 12, w: 9, h: 4, oz: 32 },
                { label: "Medium Box", l: 15, w: 12, h: 8, oz: 80 },
                { label: "Large Box", l: 20, w: 15, h: 12, oz: 160 },
              ].map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => setRateForm((f) => ({ ...f, lengthIn: String(p.l), widthIn: String(p.w), heightIn: String(p.h), weightOz: String(p.oz) }))}
                  className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#3374B5]/10 text-[#3374B5] hover:bg-[#3374B5]/20"
                >{p.label}</button>
              ))}
            </div>
          </div>

          {rateError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-semibold">{rateError}</div>
          )}

          <button
            disabled={isPending || !rateForm.toStreet || !rateForm.toCity || !rateForm.toZip}
            onClick={fetchRates}
            className="w-full py-3 rounded-xl text-white font-black disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)" }}
          >
            {isPending ? "Getting rates…" : "Get Live Rates"}
          </button>

          {/* Rates list */}
          {rates !== null && (
            <div className="space-y-3">
              {rates.length === 0 ? (
                <p className="text-center text-sm text-text-light/50 py-4">No rates available for this destination</p>
              ) : (
                rates.map((rate) => (
                  <div
                    key={rate.rateObjectId}
                    className="bg-white rounded-2xl border border-[#e8e5e0] p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-black text-sm text-text-light">{rate.provider}</span>
                        <span className="text-[10px] font-bold text-text-light/40 bg-[#f4f6f8] px-2 py-0.5 rounded-full">{rate.servicelevel}</span>
                      </div>
                      <p className="text-xs text-text-light/50">
                        {rate.estimatedDays != null ? `Est. ${rate.estimatedDays} day${rate.estimatedDays !== 1 ? "s" : ""}` : rate.durationTerms ?? ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-extrabold text-text-light">${parseFloat(rate.amount).toFixed(2)}</p>
                      <button
                        onClick={() => buyLabel(rate)}
                        disabled={isPending || buyingRate === rate.rateObjectId}
                        className="mt-1 px-4 py-1.5 rounded-lg text-xs font-black text-white disabled:opacity-40"
                        style={{ background: "#3374B5" }}
                      >
                        {buyingRate === rate.rateObjectId ? "Buying…" : "Buy Label"}
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {buySuccess && (
            <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-4 text-sm font-semibold text-green-700 flex items-center gap-3">
              <span>✓ Label purchased!</span>
              <a href={buySuccess} target="_blank" rel="noopener noreferrer"
                className="ml-auto px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-black hover:bg-green-700"
              >Download PDF</a>
            </div>
          )}
        </div>
      )}

      {/* Labels List */}
      {view === "labels" && (
        <div className="space-y-3">
          {recentLabels.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#e8e5e0] p-10 text-center">
              <p className="text-text-light/40 text-sm">No labels yet — use Quick Ship to buy your first label</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-[#e8e5e0] overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#e8e5e0] text-[10px] font-black uppercase tracking-wider text-text-light/40">
                    <th className="text-left px-4 py-3">To</th>
                    <th className="text-left px-4 py-3">Carrier</th>
                    <th className="text-left px-4 py-3">Tracking #</th>
                    <th className="text-right px-4 py-3">Paid</th>
                    <th className="text-right px-4 py-3">Label</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLabels.map((l) => (
                    <tr key={l.id} className="border-b border-[#e8e5e0]/60 hover:bg-[#f9f9f8] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-bold text-text-light">{l.toName}</p>
                        <p className="text-[11px] text-text-light/40">{l.toCity}, {l.toState} {l.toZip}</p>
                        {l.suiteNumber && <p className="text-[10px] text-[#3374B5]">Suite #{l.suiteNumber}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-bold text-text-light">{l.carrier}</span>
                        <p className="text-[11px] text-text-light/40">{l.servicelevel}</p>
                      </td>
                      <td className="px-4 py-3">
                        <a href={l.trackingUrl} target="_blank" rel="noopener noreferrer"
                          className="font-mono text-xs text-[#3374B5] hover:underline"
                        >{l.trackingNumber}</a>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-text-light">${l.amountPaid.toFixed(2)}</td>
                      <td className="px-4 py-3 text-right">
                        <a
                          href={l.labelUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-[#3374B5]/10 text-[#3374B5] text-xs font-bold hover:bg-[#3374B5]/20"
                        >Print</a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Track */}
      {view === "track" && (
        <div className="space-y-4">
          <div className="bg-white rounded-2xl border border-[#e8e5e0] p-5 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Track Shipment</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Carrier</label>
                <select className={inputCls} value={trackCarrier} onChange={(e) => setTrackCarrier(e.target.value)}>
                  {CARRIERS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Tracking Number</label>
                <input className={inputCls} value={trackNum} onChange={(e) => setTrackNum(e.target.value)} placeholder="9400111899223397981201" />
              </div>
            </div>
            <button
              disabled={isPending || !trackNum.trim()}
              onClick={doTrack}
              className="w-full py-2.5 rounded-xl text-white font-black text-sm disabled:opacity-40"
              style={{ background: "#3374B5" }}
            >
              {isPending ? "Fetching…" : "Track Package"}
            </button>
          </div>

          {trackError && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-semibold">{trackError}</div>
          )}

          {trackResult && (
            <div className="bg-white rounded-2xl border border-[#e8e5e0] p-5 space-y-4">
              <div className="flex items-center gap-3">
                <span
                  className="px-3 py-1.5 rounded-full text-xs font-black"
                  style={{
                    background: trackResult.status === "DELIVERED" ? "#dcfce7" : trackResult.status === "TRANSIT" ? "#dbeafe" : "#fef9c3",
                    color: trackResult.status === "DELIVERED" ? "#166534" : trackResult.status === "TRANSIT" ? "#1e40af" : "#854d0e",
                  }}
                >{trackResult.status}</span>
                {trackResult.location && <p className="text-sm font-bold text-text-light">{trackResult.location}</p>}
                {trackResult.eta && <p className="text-xs text-text-light/50 ml-auto">ETA: {new Date(trackResult.eta).toLocaleDateString()}</p>}
              </div>

              {trackResult.trackingHistory?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[10px] font-black uppercase tracking-wider text-text-light/40">History</p>
                  {trackResult.trackingHistory.slice(0, 8).map((h: any, i: number) => (
                    <div key={i} className="flex gap-3 items-start text-xs">
                      <span className="text-text-light/30 font-mono w-32 shrink-0">{h.date ? new Date(h.date).toLocaleString() : "—"}</span>
                      <span className="font-semibold text-text-light">{h.status}</span>
                      {h.location && <span className="text-text-light/50 ml-auto">{h.location}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
