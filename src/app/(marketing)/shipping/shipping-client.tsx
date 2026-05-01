"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { getPublicShippoRates, createLabelOrder } from "@/app/actions/labelOrders";
import type { PublicRate } from "@/lib/label-orders";

/* ─── Inline SVG icons ─────────────────────────────────────────────────────── */

function EnvelopeBox({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="8" width="26" height="18" rx="2" fill="#EBF2FA" stroke="#2D100F" strokeWidth="2" />
      <path d="M3 10 L16 19 L29 10" stroke="#2D100F" strokeWidth="1.8" fill="none" strokeLinejoin="round" />
    </svg>
  );
}

function SmallBox({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="20" height="16" rx="1.5" fill="#EBF2FA" stroke="#2D100F" strokeWidth="2" />
      <path d="M10 10 L10 8 L22 8 L22 10" stroke="#2D100F" strokeWidth="1.8" />
      <path d="M16 14 L16 22 M12 18 L20 18" stroke="#337485" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function MediumBox({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 4 L28 10 L28 22 L16 28 L4 22 L4 10 Z" fill="#EBF2FA" stroke="#2D100F" strokeWidth="2" strokeLinejoin="round" />
      <path d="M4 10 L16 16 L28 10" stroke="#2D100F" strokeWidth="1.5" />
      <path d="M16 16 L16 28" stroke="#2D100F" strokeWidth="1.5" />
      <path d="M10 7 L22 13" stroke="#337485" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function LargeBox({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 2 L30 8 L30 24 L16 30 L2 24 L2 8 Z" fill="#EBF2FA" stroke="#2D100F" strokeWidth="2" strokeLinejoin="round" />
      <path d="M2 8 L16 14 L30 8" stroke="#2D100F" strokeWidth="1.5" />
      <path d="M16 14 L16 30" stroke="#2D100F" strokeWidth="1.5" />
      <path d="M8 5 L24 11" stroke="#337485" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function RulerIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="3" y="13" width="26" height="6" fill="#F7E6C2" stroke="#2D100F" strokeWidth="2" rx="1" transform="rotate(-15 16 16)" />
      <path d="M7 14 L7 11 M11 13 L11 10 M15 12 L15 10 M19 11 L19 9 M23 10 L23 8" stroke="#2D100F" strokeWidth="1.5" strokeLinecap="round" transform="rotate(-15 16 16)" />
    </svg>
  );
}

function CarrierGlyph({ carrier, className }: { carrier: string; className?: string }) {
  const c = carrier.toLowerCase();
  if (c.includes("usps")) {
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="18" fill="#FFF9F3" stroke="#2D100F" strokeWidth="2" />
        <path d="M10 16 L20 23 L30 16 L30 28 L10 28 Z" fill="#337485" stroke="#2D100F" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M10 16 L20 12 L30 16" stroke="#2D100F" strokeWidth="1.8" fill="none" strokeLinejoin="round" />
      </svg>
    );
  }
  if (c.includes("ups")) {
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M8 10 L20 4 L32 10 L32 26 C32 32 26 36 20 36 C14 36 8 32 8 26 Z"
              fill="#6B3F1A" stroke="#2D100F" strokeWidth="2" strokeLinejoin="round" />
        <text x="20" y="25" textAnchor="middle" fill="#F7E6C2" fontSize="11" fontWeight="900" fontFamily="system-ui">UPS</text>
      </svg>
    );
  }
  if (c.includes("fedex")) {
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="4" y="10" width="32" height="20" rx="2" fill="#4D148C" stroke="#2D100F" strokeWidth="2" />
        <text x="14" y="24" textAnchor="middle" fill="#FFFFFF" fontSize="9" fontWeight="900" fontFamily="system-ui">Fed</text>
        <text x="27" y="24" textAnchor="middle" fill="#FF6600" fontSize="9" fontWeight="900" fontFamily="system-ui">Ex</text>
      </svg>
    );
  }
  if (c.includes("dhl")) {
    return (
      <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="2" y="13" width="36" height="14" rx="1" fill="#FFCC00" stroke="#2D100F" strokeWidth="2" />
        <text x="20" y="24" textAnchor="middle" fill="#D40511" fontSize="10" fontWeight="900" fontFamily="system-ui">DHL</text>
      </svg>
    );
  }
  // Generic / fallback
  return (
    <svg viewBox="0 0 40 40" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="12" width="28" height="20" rx="2" fill="#EBF2FA" stroke="#2D100F" strokeWidth="2" />
      <path d="M14 12 L14 8 L26 8 L26 12" stroke="#2D100F" strokeWidth="2" />
    </svg>
  );
}

function CoinStackIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="24" cy="14" rx="14" ry="4" fill="#F7E6C2" stroke="#2D100F" strokeWidth="2" />
      <path d="M10 14 L10 22 C10 24 16 26 24 26 C32 26 38 24 38 22 L38 14" fill="#F7E6C2" stroke="#2D100F" strokeWidth="2" />
      <path d="M10 22 L10 30 C10 32 16 34 24 34 C32 34 38 32 38 30 L38 22" fill="#337485" stroke="#2D100F" strokeWidth="2" />
      <path d="M10 30 L10 38 C10 40 16 42 24 42 C32 42 38 40 38 38 L38 30" fill="#23596A" stroke="#2D100F" strokeWidth="2" />
    </svg>
  );
}

function BoltIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M26 4 L8 28 L20 28 L18 44 L40 18 L26 18 Z"
            fill="#F7E6C2" stroke="#2D100F" strokeWidth="2.5" strokeLinejoin="round" />
    </svg>
  );
}

function StoreIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 18 L8 8 L40 8 L42 18" stroke="#2D100F" strokeWidth="2.5" fill="#F7E6C2" strokeLinejoin="round" />
      <rect x="6" y="18" width="36" height="24" fill="#FFF9F3" stroke="#2D100F" strokeWidth="2.5" />
      <rect x="20" y="26" width="8" height="16" fill="#337485" stroke="#2D100F" strokeWidth="2" />
      <rect x="10" y="22" width="6" height="6" fill="#EBF2FA" stroke="#2D100F" strokeWidth="1.5" />
      <rect x="32" y="22" width="6" height="6" fill="#EBF2FA" stroke="#2D100F" strokeWidth="1.5" />
    </svg>
  );
}

function CreditCardIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="4" y="10" width="40" height="28" rx="3" fill="#FFF9F3" stroke="#2D100F" strokeWidth="2.5" />
      <rect x="4" y="16" width="40" height="6" fill="#337485" />
      <rect x="10" y="28" width="10" height="4" rx="1" fill="#337485" />
      <rect x="24" y="28" width="14" height="2" rx="1" fill="#337485" opacity="0.5" />
    </svg>
  );
}

/* ─── Types ─── */
type PackageSize = "envelope" | "small" | "medium" | "large" | "custom";

const presets: Record<PackageSize, { l: number; w: number; h: number; label: string; Icon: React.ComponentType<{ className?: string }> }> = {
  envelope: { l: 12, w: 9, h: 0.5, label: "Envelope", Icon: EnvelopeBox },
  small: { l: 10, w: 8, h: 4, label: "Small Box", Icon: SmallBox },
  medium: { l: 14, w: 12, h: 8, label: "Medium Box", Icon: MediumBox },
  large: { l: 20, w: 16, h: 12, label: "Large Box", Icon: LargeBox },
  custom: { l: 0, w: 0, h: 0, label: "Custom", Icon: RulerIcon },
};

function fmtMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function fmtEta(days: number | null, terms: string | null) {
  if (terms) return terms;
  if (days != null) return days <= 1 ? "Next-day" : `${days} business days`;
  return "—";
}

// UPS/FedEx domestic divisor = 139. DIM weight (lb) = (L × W × H) / 139.
// Surface a soft warning when DIM > actual so the customer expects the
// higher rate. Same logic as the admin Quick Ship hint.
const PUBLIC_DIM_DIVISOR = 139;
function PublicDimHint({ lengthIn, widthIn, heightIn, weightLbs }: { lengthIn: number; widthIn: number; heightIn: number; weightLbs: number }) {
  if (lengthIn <= 0 || widthIn <= 0 || heightIn <= 0 || weightLbs <= 0) return null;
  const actualLb = weightLbs;
  const dimLb = (lengthIn * widthIn * heightIn) / PUBLIC_DIM_DIVISOR;
  const dimDominant = dimLb > actualLb;
  const ratio = dimDominant && actualLb > 0 ? dimLb / actualLb : 1;
  const significant = dimDominant && (dimLb - actualLb) >= 0.5;
  if (!significant) return null;
  return (
    <div
      className="rounded-xl px-3 py-2.5 mb-4 flex items-start gap-2.5 text-[11.5px]"
      style={{
        background: "rgba(245,166,35,0.10)",
        border: "1px solid rgba(245,166,35,0.35)",
        color: "#92400e",
      }}
      role="note"
    >
      <svg viewBox="0 0 24 24" className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 6 H21 M3 18 H21 M7 10 V14 M12 10 V14 M17 10 V14" />
      </svg>
      <div className="min-w-0 flex-1">
        <p className="font-black">DIM weight will likely bill higher</p>
        <p className="leading-snug" style={{ color: "rgba(146,64,14,0.85)" }}>
          UPS / FedEx ground rate is the greater of actual weight and dimensional weight (L × W × H ÷ 139).
          Yours: actual <strong>{actualLb.toFixed(2)} lb</strong> · DIM <strong>{dimLb.toFixed(2)} lb</strong> ({ratio.toFixed(1)}× actual). USPS rates are unaffected.
        </p>
      </div>
    </div>
  );
}

// Persists the most-recent quote inputs so a repeat customer (e.g. an eBay
// seller shipping the same boxes daily) doesn't re-type. Hydrated on mount,
// re-saved on each input change. Versioned key so we can break compat later.
const SHIPPING_DRAFT_KEY = "noho-shipping-quote-draft-v1";

export function ShippingQuoteClient() {
  const [fromZip, setFromZip] = useState("91601");
  const [toZip, setToZip] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [sizePreset, setSizePreset] = useState<PackageSize>("small");
  const [customL, setCustomL] = useState("");
  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");

  // Hydrate from localStorage on mount.
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(SHIPPING_DRAFT_KEY) : null;
      if (!raw) return;
      const d = JSON.parse(raw) as Partial<{
        toZip: string; weightLbs: string; sizePreset: PackageSize; customL: string; customW: string; customH: string;
      }>;
      if (typeof d.toZip === "string") setToZip(d.toZip);
      if (typeof d.weightLbs === "string") setWeightLbs(d.weightLbs);
      if (typeof d.sizePreset === "string") setSizePreset(d.sizePreset);
      if (typeof d.customL === "string") setCustomL(d.customL);
      if (typeof d.customW === "string") setCustomW(d.customW);
      if (typeof d.customH === "string") setCustomH(d.customH);
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  // Save on change.
  useEffect(() => {
    try {
      window.localStorage.setItem(SHIPPING_DRAFT_KEY, JSON.stringify({
        toZip, weightLbs, sizePreset, customL, customW, customH,
      }));
    } catch { /* ignore */ }
  }, [toZip, weightLbs, sizePreset, customL, customW, customH]);
  const [rates, setRates] = useState<PublicRate[] | null>(null);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  // Pre-pay flow state
  const [chosenRate, setChosenRate] = useState<PublicRate | null>(null);
  const [orderForm, setOrderForm] = useState({
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    toName: "",
    toCompany: "",
    toStreet: "",
    toCity: "",
    toState: "CA",
    notes: "",
  });
  const [orderState, setOrderState] = useState<{ status: "idle" | "submitting" | "success" | "error"; message?: string; orderId?: string }>({ status: "idle" });

  const dims = sizePreset === "custom"
    ? { l: parseFloat(customL) || 0, w: parseFloat(customW) || 0, h: parseFloat(customH) || 0 }
    : { l: presets[sizePreset].l, w: presets[sizePreset].w, h: presets[sizePreset].h };

  const cheapestPriceCents = rates ? Math.min(...rates.map((r) => r.customerPriceCents)) : 0;
  const fastestEta = rates ? rates.reduce<number | null>((a, r) => {
    if (r.estimatedDays == null) return a;
    if (a == null) return r.estimatedDays;
    return Math.min(a, r.estimatedDays);
  }, null) : null;

  function handleQuote() {
    setError("");
    setRates(null);
    setChosenRate(null);
    setOrderState({ status: "idle" });

    if (!toZip || toZip.length !== 5) {
      setError("Enter a valid 5-digit destination zip code.");
      return;
    }
    const w = parseFloat(weightLbs);
    if (!w || w <= 0) {
      setError("Enter a valid weight.");
      return;
    }
    if (sizePreset === "custom" && (!dims.l || !dims.w || !dims.h)) {
      setError("Enter all custom dimensions.");
      return;
    }

    const weightOz = w * 16;
    startTransition(async () => {
      const res = await getPublicShippoRates({
        toZip,
        lengthIn: dims.l,
        widthIn: dims.w,
        heightIn: dims.h,
        weightOz,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      setRates(res.rates ?? []);
    });
  }

  function handleSubmitOrder() {
    if (!chosenRate) return;
    if (!orderForm.customerName.trim()) return setOrderState({ status: "error", message: "Your name is required" });
    if (!orderForm.customerEmail.includes("@")) return setOrderState({ status: "error", message: "Valid email required" });
    if (!orderForm.toName.trim() || !orderForm.toStreet.trim() || !orderForm.toCity.trim() || !orderForm.toState.trim()) {
      return setOrderState({ status: "error", message: "Complete recipient address required" });
    }
    setOrderState({ status: "submitting" });
    const w = parseFloat(weightLbs) * 16;
    startTransition(async () => {
      const res = await createLabelOrder({
        rateObjectId: chosenRate.rateObjectId,
        customerName: orderForm.customerName,
        customerEmail: orderForm.customerEmail,
        customerPhone: orderForm.customerPhone || undefined,
        toName: orderForm.toName,
        toCompany: orderForm.toCompany || undefined,
        toStreet: orderForm.toStreet,
        toCity: orderForm.toCity,
        toState: orderForm.toState,
        toZip,
        lengthIn: dims.l,
        widthIn: dims.w,
        heightIn: dims.h,
        weightOz: w,
        notes: orderForm.notes || undefined,
      });
      if ("error" in res && res.error) {
        setOrderState({ status: "error", message: res.error });
        return;
      }
      setOrderState({ status: "success", orderId: res.orderId });
    });
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden py-24 px-5 bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <p className="font-semibold text-xs uppercase tracking-[0.2em] mb-4 animate-fade-up" style={{ color: "#93C4FF" }}>
            Ship with Confidence
          </p>
          <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-extrabold text-text-dark leading-tight tracking-tight mb-5 animate-fade-up delay-100">
            Get an Instant<br />
            <span className="gradient-text">Shipping Quote</span>
          </h1>
          <p className="text-text-dark-muted text-lg max-w-md mx-auto leading-relaxed animate-fade-up delay-200">
            Live rates from USPS, UPS, FedEx, and DHL — plus a one-tap pre-pay flow so you can drop and dash.
          </p>

          {/* Tracking lookup — small inline form that posts to /track. Routes
              the customer to a NOHO-branded receipt if it's one we shipped,
              or to the carrier's tracking page otherwise. */}
          <form
            method="get"
            action="/track"
            className="mt-8 max-w-md mx-auto flex items-center gap-2 rounded-2xl px-2 py-2 animate-fade-up delay-300"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              backdropFilter: "saturate(140%) blur(8px)",
              WebkitBackdropFilter: "saturate(140%) blur(8px)",
            }}
          >
            <span className="pl-3 pr-1 text-[10.5px] font-bold uppercase tracking-wider hidden sm:inline" style={{ color: "#93C4FF" }}>
              Track
            </span>
            <input
              type="text"
              name="n"
              placeholder="Paste a tracking number…"
              autoComplete="off"
              className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-text-dark placeholder:text-text-dark-muted/60 px-2 py-1.5 font-mono"
              aria-label="Tracking number"
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-xl text-xs font-black text-white transition-all hover:scale-105 shrink-0"
              style={{ background: "#337485", boxShadow: "0 4px 14px rgba(51,116,133,0.40)" }}
            >
              Track →
            </button>
          </form>
        </div>
      </section>

      {/* Cream personality strip */}
      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        NoHo same-day delivery just $5 &mdash; bring your package in-store and we handle the rest
      </div>

      {/* Quote Form */}
      <section className="py-16 px-5 bg-bg-light">
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-2xl p-8 animate-fade-up"
            style={{ background: "#FFF9F3", border: "1px solid #E8D8C4", boxShadow: "var(--shadow-md)" }}
          >
            <h2 className="text-xl font-extrabold tracking-tight text-text-light mb-6">Package Details</h2>

            {/* Zip codes */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-bold text-text-light-muted mb-1.5">From Zip Code</label>
                <input
                  type="text"
                  maxLength={5}
                  value={fromZip}
                  onChange={(e) => setFromZip(e.target.value.replace(/\D/g, ""))}
                  placeholder="91601"
                  className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-all"
                  style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-text-light-muted mb-1.5">To Zip Code</label>
                <input
                  type="text"
                  maxLength={5}
                  value={toZip}
                  onChange={(e) => setToZip(e.target.value.replace(/\D/g, ""))}
                  placeholder="90001"
                  className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-all"
                  style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
                />
              </div>
            </div>

            {/* Weight */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-text-light-muted mb-1.5">Weight (lbs)</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={weightLbs}
                onChange={(e) => setWeightLbs(e.target.value)}
                placeholder="e.g. 2.5"
                className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-all"
                style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
              />
            </div>

            {/* Package size presets */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-text-light-muted mb-2">Package Size</label>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(presets) as PackageSize[]).map((key) => {
                  const p = presets[key];
                  const active = sizePreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSizePreset(key)}
                      className="rounded-xl py-3 px-2 text-center transition-all duration-200 group"
                      style={
                        active
                          ? { background: "#337485", color: "#fff", boxShadow: "0 4px 12px rgba(51,116,133,0.3)" }
                          : { background: "#F8F2EA", border: "1px solid #D8C8B4", color: "#2D100F" }
                      }
                    >
                      <p.Icon className={`w-7 h-7 mx-auto mb-1 transition-transform duration-300 ${active ? "scale-105" : "group-hover:scale-110"}`} />
                      <span className="text-[10px] font-bold block">{p.label}</span>
                      {key !== "custom" && (
                        <span className="text-[9px] block mt-0.5" style={{ color: active ? "rgba(255,255,255,0.6)" : "rgba(122,96,80,0.6)" }}>
                          {p.l}&times;{p.w}&times;{p.h}&quot;
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom dimensions */}
            {sizePreset === "custom" && (
              <div className="grid grid-cols-3 gap-3 mb-5 animate-fade-up">
                {([
                  ["L", customL, setCustomL],
                  ["W", customW, setCustomW],
                  ["H", customH, setCustomH],
                ] as const).map(([label, val, setter]) => (
                  <div key={label}>
                    <label className="block text-xs font-bold text-text-light-muted mb-1.5">
                      {label === "L" ? "Length" : label === "W" ? "Width" : "Height"} (in)
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={val}
                      onChange={(e) => setter(e.target.value)}
                      placeholder={label}
                      className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-all"
                      style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
                    />
                  </div>
                ))}
              </div>
            )}

            {/* DIM weight hint — UPS / FedEx ground bill the GREATER of actual
                weight and DIM weight (L×W×H ÷ 139). Surfaces a soft warning
                when DIM significantly exceeds actual so customer expects the
                higher rate before clicking Get rates. */}
            <PublicDimHint
              lengthIn={dims.l}
              widthIn={dims.w}
              heightIn={dims.h}
              weightLbs={parseFloat(weightLbs) || 0}
            />

            {error && (
              <div className="text-danger text-xs font-bold p-3 rounded-xl bg-danger/10 border border-danger/20 mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleQuote}
              disabled={isPending}
              className="w-full font-bold py-3.5 rounded-xl text-sm text-white transition-all duration-200 disabled:opacity-60"
              style={{ background: "#337485", boxShadow: "0 4px 16px rgba(51,116,133,0.4)" }}
            >
              {isPending && !rates ? "Fetching live rates…" : "Compare Live Rates"}
            </button>
            <p className="text-[11px] text-center mt-3" style={{ color: "rgba(122,96,80,0.6)" }}>
              Live carrier rates · No account required to quote
            </p>
          </div>

          {/* Results */}
          {rates && rates.length > 0 && (
            <div className="mt-8 space-y-3 animate-fade-up">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="text-lg font-extrabold tracking-tight text-text-light">
                  {rates.length} live {rates.length === 1 ? "rate" : "rates"}
                </h3>
                <p className="text-[11px] font-bold" style={{ color: "#337485" }}>
                  Tap a rate to pre-pay &amp; reserve a label
                </p>
              </div>

              {rates.map((r) => {
                const isCheapest = r.customerPriceCents === cheapestPriceCents;
                const isFastest = fastestEta != null && r.estimatedDays === fastestEta;
                const isChosen = chosenRate?.rateObjectId === r.rateObjectId;
                return (
                  <button
                    key={r.rateObjectId}
                    onClick={() => {
                      setChosenRate(r);
                      setOrderState({ status: "idle" });
                      setTimeout(() => {
                        document.getElementById("prepay-form")?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }, 100);
                    }}
                    className="w-full text-left flex items-center justify-between gap-4 p-5 rounded-2xl transition-all hover-lift"
                    style={
                      isChosen
                        ? { background: "linear-gradient(135deg, #337485, #23596A)", color: "#fff", boxShadow: "0 12px 40px rgba(51,116,133,0.35)" }
                        : { background: "#FFF9F3", border: "1px solid #E8D8C4", boxShadow: "var(--shadow-sm)" }
                    }
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      <CarrierGlyph carrier={r.carrier} className="w-10 h-10 shrink-0" />
                      <div className="min-w-0">
                        <p className="font-extrabold text-sm flex items-center gap-2 flex-wrap" style={{ color: isChosen ? "#fff" : "#2D100F" }}>
                          {r.carrier}
                          {isCheapest && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: isChosen ? "rgba(255,255,255,0.2)" : "#16a34a", color: isChosen ? "#fff" : "#fff" }}>
                              Best price
                            </span>
                          )}
                          {isFastest && r.estimatedDays != null && (
                            <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: isChosen ? "rgba(255,255,255,0.2)" : "#F5A623", color: "#fff" }}>
                              Fastest
                            </span>
                          )}
                        </p>
                        <p className="text-xs truncate" style={{ color: isChosen ? "rgba(255,255,255,0.85)" : "#7A6050" }}>
                          {r.servicelevel}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xl font-extrabold tracking-tight" style={{ color: isChosen ? "#fff" : "#2D100F" }}>
                        {fmtMoney(r.customerPriceCents)}
                      </p>
                      <p className="text-[11px]" style={{ color: isChosen ? "rgba(255,255,255,0.75)" : "#7A6050" }}>
                        {fmtEta(r.estimatedDays, r.durationTerms)}
                      </p>
                    </div>
                  </button>
                );
              })}

              <p className="text-[11px] text-center mt-4 italic" style={{ color: "rgba(122,96,80,0.6)" }}>
                Prices include carrier cost plus a small NOHO Mailbox handling fee. Final price is locked when you pre-pay.
              </p>
            </div>
          )}

          {rates && rates.length === 0 && (
            <div className="mt-8 rounded-2xl p-6 text-center animate-fade-up" style={{ background: "#FFF0F0", border: "1px solid #FECACA" }}>
              <p className="font-bold text-sm" style={{ color: "#B91C1C" }}>No carriers will deliver this package right now.</p>
              <p className="text-xs mt-1" style={{ color: "#B91C1C" }}>Try different dimensions or call (818) 506-7744.</p>
            </div>
          )}

          {/* Pre-pay form */}
          {chosenRate && orderState.status !== "success" && (
            <div
              id="prepay-form"
              className="mt-8 rounded-2xl p-8 animate-scale-in"
              style={{ background: "#FFF9F3", border: "1px solid #E8D8C4", boxShadow: "var(--shadow-md)" }}
            >
              <div className="flex items-start justify-between gap-4 mb-6 pb-4" style={{ borderBottom: "1px solid #E8D8C4" }}>
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#337485" }}>You picked</p>
                  <p className="text-base font-extrabold text-text-light">{chosenRate.carrier} {chosenRate.servicelevel}</p>
                  <p className="text-xs text-text-light-muted">{fmtEta(chosenRate.estimatedDays, chosenRate.durationTerms)}</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-extrabold tracking-tight" style={{ color: "#337485" }}>{fmtMoney(chosenRate.customerPriceCents)}</p>
                  <button
                    onClick={() => setChosenRate(null)}
                    className="text-[11px] font-bold underline mt-1"
                    style={{ color: "#7A6050" }}
                  >
                    Change rate
                  </button>
                </div>
              </div>

              <h3 className="text-base font-extrabold text-text-light mb-1">Pre-pay &amp; reserve</h3>
              <p className="text-xs text-text-light-muted mb-5">
                Tell us where it&apos;s going and how to reach you. We&apos;ll text you a Square payment link, then print the label as soon as you pay.
              </p>

              <div className="space-y-4">
                <p className="text-[10px] font-bold uppercase tracking-widest mt-2" style={{ color: "#337485" }}>Your contact</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={orderForm.customerName} onChange={(e) => setOrderForm({ ...orderForm, customerName: e.target.value })} placeholder="Your full name" className="rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
                  <input value={orderForm.customerPhone} onChange={(e) => setOrderForm({ ...orderForm, customerPhone: e.target.value })} placeholder="Your phone (for Square link SMS)" className="rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
                </div>
                <input value={orderForm.customerEmail} onChange={(e) => setOrderForm({ ...orderForm, customerEmail: e.target.value })} placeholder="Your email" type="email" className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />

                <p className="text-[10px] font-bold uppercase tracking-widest mt-4" style={{ color: "#337485" }}>Recipient address</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={orderForm.toName} onChange={(e) => setOrderForm({ ...orderForm, toName: e.target.value })} placeholder="Recipient name" className="rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
                  <input value={orderForm.toCompany} onChange={(e) => setOrderForm({ ...orderForm, toCompany: e.target.value })} placeholder="Company (optional)" className="rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
                </div>
                <input value={orderForm.toStreet} onChange={(e) => setOrderForm({ ...orderForm, toStreet: e.target.value })} placeholder="Street address" className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
                <div className="grid grid-cols-3 gap-3">
                  <input value={orderForm.toCity} onChange={(e) => setOrderForm({ ...orderForm, toCity: e.target.value })} placeholder="City" className="col-span-2 rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
                  <input value={orderForm.toState} onChange={(e) => setOrderForm({ ...orderForm, toState: e.target.value.toUpperCase() })} maxLength={2} placeholder="ST" className="rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none uppercase" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
                </div>
                <p className="text-[11px]" style={{ color: "rgba(122,96,80,0.6)" }}>
                  Destination zip: <strong>{toZip}</strong> (from your quote)
                </p>

                <textarea value={orderForm.notes} onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })} placeholder="Notes for us (optional)" rows={2} className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none resize-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />

                {orderState.status === "error" && (
                  <p className="text-danger text-xs font-bold p-3 rounded-xl bg-danger/10 border border-danger/20">
                    {orderState.message}
                  </p>
                )}

                <button
                  onClick={handleSubmitOrder}
                  disabled={isPending || orderState.status === "submitting"}
                  className="w-full font-bold py-3.5 rounded-xl text-sm text-white transition-all duration-200 disabled:opacity-60"
                  style={{ background: "#2D100F" }}
                >
                  {orderState.status === "submitting" || isPending ? "Reserving label…" : `Reserve label for ${fmtMoney(chosenRate.customerPriceCents)}`}
                </button>
                <p className="text-[11px] text-center" style={{ color: "rgba(122,96,80,0.6)" }}>
                  No charge yet. We&apos;ll text you a secure Square link to pay.
                </p>
              </div>
            </div>
          )}

          {orderState.status === "success" && (
            <div
              className="mt-8 rounded-2xl p-10 text-center animate-scale-in"
              style={{ background: "linear-gradient(135deg, #1B3A5C, #0E2340)", color: "#fff" }}
            >
              <BoltIcon className="w-16 h-16 mx-auto mb-4" />
              <h3 className="text-2xl font-extrabold tracking-tight mb-2">Label reserved!</h3>
              <p className="text-sm mb-1" style={{ color: "rgba(255,255,255,0.85)" }}>
                We&apos;ll text {orderForm.customerPhone || "you"} a Square link within the hour.
              </p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.6)" }}>
                Order #{orderState.orderId?.slice(-8)}
              </p>
              <Link
                href="/"
                className="inline-block mt-6 px-6 py-2.5 rounded-xl text-xs font-bold transition-all hover:-translate-y-0.5"
                style={{ background: "rgba(255,255,255,0.15)", color: "#fff" }}
              >
                Back to home
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Why ship with us */}
      <section className="py-20 px-5" style={{ background: "#1E1914" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-12 tracking-tight" style={{ color: "#F8F2EA" }}>
            Why Ship with NOHO Mailbox?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                Icon: CoinStackIcon,
                title: "Best Rates Guaranteed",
                desc: "Live rates compared across USPS, UPS, FedEx, and DHL. Plus a flat 10% handling fee — no markup surprises.",
              },
              {
                Icon: BoltIcon,
                title: "Same-Day Local Delivery",
                desc: "Shipping inside North Hollywood? Skip the carriers entirely — we deliver door-to-door same day for $5.",
                accent: true,
              },
              {
                Icon: StoreIcon,
                title: "Drop Off Anytime",
                desc: "Bring it to the store 7 days a week. We pack, label, and hand off to the carrier — no waiting in line.",
              },
              {
                Icon: CreditCardIcon,
                title: "Pre-pay & Drop",
                desc: "Reserve your label online, pay via secure Square link, then just drop off. We print and ship same-day.",
              },
              {
                Icon: ({ className }: { className?: string }) => (
                  <svg viewBox="0 0 48 48" className={className} fill="none">
                    <circle cx="24" cy="24" r="20" fill="#FFF9F3" stroke="#2D100F" strokeWidth="2.5" />
                    <path d="M24 12 L24 24 L32 28" stroke="#337485" strokeWidth="3" strokeLinecap="round" />
                    <circle cx="24" cy="24" r="2" fill="#2D100F" />
                  </svg>
                ),
                title: "Live Tracking",
                desc: "Every label includes carrier tracking. We text you the tracking link the moment we print.",
              },
              {
                Icon: ({ className }: { className?: string }) => (
                  <svg viewBox="0 0 48 48" className={className} fill="none">
                    <path d="M24 4 L6 12 L6 24 C6 34 14 42 24 44 C34 42 42 34 42 24 L42 12 Z" fill="#FFF9F3" stroke="#2D100F" strokeWidth="2.5" />
                    <path d="M16 24 L22 30 L34 18" stroke="#337485" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                ),
                title: "Real Person on Call",
                desc: "Need to know if a label is right? We pick up the phone — (818) 506-7744 — 7 days a week.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl p-7 hover-lift transition-all group"
                style={
                  item.accent
                    ? { background: "linear-gradient(135deg,#B07030,#8A5520)", boxShadow: "0 8px 24px rgba(176,112,48,0.3)" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }
                }
              >
                <div className="mb-4 transition-transform duration-500 group-hover:scale-110">
                  <item.Icon className="w-12 h-12" />
                </div>
                <h3 className="font-extrabold text-lg mb-2 tracking-tight" style={{ color: item.accent ? "#FFE4A0" : "#F8F2EA" }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: item.accent ? "rgba(255,255,255,0.85)" : "rgba(248,242,234,0.65)" }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-5 bg-bg-light text-center">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-extrabold text-text-light mb-4 tracking-tight">
            Need a Mailbox Too?
          </h2>
          <p className="text-text-light-muted mb-8">
            Members ship faster with saved addresses, tracking history, and one-tap returns.
          </p>
          <Link
            href="/signup"
            className="inline-block font-bold px-8 py-4 rounded-xl text-white transition-all duration-300"
            style={{ background: "#337485", boxShadow: "0 4px 20px rgba(51,116,133,0.4)" }}
          >
            Get a Mailbox
          </Link>
        </div>
      </section>
    </>
  );
}
