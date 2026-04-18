"use client";

import { useState } from "react";
import Link from "next/link";

/* ─── Types ─── */
type PackageSize = "envelope" | "small" | "medium" | "large" | "custom";

type Quote = {
  carrier: string;
  service: string;
  price: string;
  eta: string;
  logo: string;
  highlight?: boolean;
};

/* ─── Mock rate engine ─── */
function calculateRates(params: {
  fromZip: string;
  toZip: string;
  weightLbs: number;
  lengthIn: number;
  widthIn: number;
  heightIn: number;
}): Quote[] {
  const { weightLbs, lengthIn, widthIn, heightIn, fromZip, toZip } = params;
  const dimWeight = (lengthIn * widthIn * heightIn) / 139;
  const billable = Math.max(weightLbs, dimWeight);
  const sameZone = fromZip.slice(0, 3) === toZip.slice(0, 3);
  const nohoLocal =
    ["91601", "91602", "91603", "91604", "91605", "91606", "91607", "91608"].includes(fromZip) &&
    ["91601", "91602", "91603", "91604", "91605", "91606", "91607", "91608"].includes(toZip);

  const quotes: Quote[] = [];

  // USPS
  const uspsGround = (3.5 + billable * 0.45 + (sameZone ? 0 : 2.5)).toFixed(2);
  const uspsPriority = (7.9 + billable * 0.65 + (sameZone ? 0 : 3.0)).toFixed(2);
  quotes.push({ carrier: "USPS", service: "Ground Advantage", price: `$${uspsGround}`, eta: sameZone ? "2-3 days" : "5-7 days", logo: "📦" });
  quotes.push({ carrier: "USPS", service: "Priority Mail", price: `$${uspsPriority}`, eta: sameZone ? "1-2 days" : "2-3 days", logo: "📦" });

  // UPS
  const upsGround = (6.5 + billable * 0.55 + (sameZone ? 0 : 3.5)).toFixed(2);
  const ups2day = (14.5 + billable * 1.1 + (sameZone ? 0 : 4.0)).toFixed(2);
  quotes.push({ carrier: "UPS", service: "Ground", price: `$${upsGround}`, eta: sameZone ? "1-3 days" : "3-5 days", logo: "🟫" });
  quotes.push({ carrier: "UPS", service: "2nd Day Air", price: `$${ups2day}`, eta: "2 days", logo: "🟫" });

  // FedEx
  const fedexHome = (7.0 + billable * 0.58 + (sameZone ? 0 : 3.2)).toFixed(2);
  const fedex2day = (15.0 + billable * 1.15 + (sameZone ? 0 : 4.5)).toFixed(2);
  quotes.push({ carrier: "FedEx", service: "Home Delivery", price: `$${fedexHome}`, eta: sameZone ? "1-3 days" : "3-5 days", logo: "📨" });
  quotes.push({ carrier: "FedEx", service: "2Day", price: `$${fedex2day}`, eta: "2 days", logo: "📨" });

  // DHL
  if (!sameZone) {
    const dhlExpress = (22.0 + billable * 1.8).toFixed(2);
    quotes.push({ carrier: "DHL", service: "Express", price: `$${dhlExpress}`, eta: "1-2 days", logo: "🟡" });
  }

  // Same-day local
  if (nohoLocal) {
    quotes.unshift({
      carrier: "NOHO Mailbox",
      service: "Same-Day Local",
      price: "$5.00",
      eta: "Today",
      logo: "⚡",
      highlight: true,
    });
  }

  return quotes.sort((a, b) => {
    if (a.highlight) return -1;
    if (b.highlight) return 1;
    return parseFloat(a.price.replace("$", "")) - parseFloat(b.price.replace("$", ""));
  });
}

/* ─── Preset sizes ─── */
const presets: Record<string, { l: number; w: number; h: number; label: string; icon: string }> = {
  envelope: { l: 12, w: 9, h: 0.5, label: "Envelope", icon: "✉️" },
  small: { l: 10, w: 8, h: 4, label: "Small Box", icon: "📦" },
  medium: { l: 14, w: 12, h: 8, label: "Medium Box", icon: "📦" },
  large: { l: 20, w: 16, h: 12, label: "Large Box", icon: "📦" },
  custom: { l: 0, w: 0, h: 0, label: "Custom", icon: "📐" },
};

export function ShippingQuoteClient() {
  const [fromZip, setFromZip] = useState("91601");
  const [toZip, setToZip] = useState("");
  const [weightLbs, setWeightLbs] = useState("");
  const [sizePreset, setSizePreset] = useState<PackageSize>("small");
  const [customL, setCustomL] = useState("");
  const [customW, setCustomW] = useState("");
  const [customH, setCustomH] = useState("");
  const [quotes, setQuotes] = useState<Quote[] | null>(null);
  const [error, setError] = useState("");

  const dims = sizePreset === "custom"
    ? { l: parseFloat(customL) || 0, w: parseFloat(customW) || 0, h: parseFloat(customH) || 0 }
    : presets[sizePreset];

  function handleQuote() {
    setError("");
    setQuotes(null);

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

    const results = calculateRates({
      fromZip,
      toZip,
      weightLbs: w,
      lengthIn: dims.l,
      widthIn: dims.w,
      heightIn: dims.h,
    });
    setQuotes(results);
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
            Compare rates from USPS, UPS, FedEx, and DHL. Same-day local delivery available for North Hollywood.
          </p>
        </div>
      </section>

      {/* Warm cream personality strip */}
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
            className="rounded-2xl p-8"
            style={{ background: "#FFF9F3", border: "1px solid #E8D8C4", boxShadow: "var(--shadow-md)" }}
          >
            <h2 className="text-xl font-bold text-text-light mb-6">Package Details</h2>

            {/* Zip codes */}
            <div className="grid grid-cols-2 gap-4 mb-5">
              <div>
                <label className="block text-xs font-medium text-text-light-muted mb-1.5">From Zip Code</label>
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
                <label className="block text-xs font-medium text-text-light-muted mb-1.5">To Zip Code</label>
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
              <label className="block text-xs font-medium text-text-light-muted mb-1.5">Weight (lbs)</label>
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
              <label className="block text-xs font-medium text-text-light-muted mb-2">Package Size</label>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(presets) as PackageSize[]).map((key) => {
                  const p = presets[key];
                  const active = sizePreset === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSizePreset(key)}
                      className="rounded-xl py-3 px-2 text-center transition-all duration-200"
                      style={
                        active
                          ? { background: "#3374B5", color: "#fff", boxShadow: "0 4px 12px rgba(51,116,181,0.3)" }
                          : { background: "#F8F2EA", border: "1px solid #D8C8B4", color: "#2D1D0F" }
                      }
                    >
                      <span className="text-lg block mb-0.5">{p.icon}</span>
                      <span className="text-[10px] font-semibold block">{p.label}</span>
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
                <div>
                  <label className="block text-xs font-medium text-text-light-muted mb-1.5">Length (in)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={customL}
                    onChange={(e) => setCustomL(e.target.value)}
                    placeholder="L"
                    className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-all"
                    style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-light-muted mb-1.5">Width (in)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={customW}
                    onChange={(e) => setCustomW(e.target.value)}
                    placeholder="W"
                    className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-all"
                    style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-light-muted mb-1.5">Height (in)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={customH}
                    onChange={(e) => setCustomH(e.target.value)}
                    placeholder="H"
                    className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-all"
                    style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="text-danger text-xs font-semibold p-3 rounded-xl bg-danger/10 border border-danger/20 mb-4">
                {error}
              </div>
            )}

            <button
              onClick={handleQuote}
              className="w-full font-semibold py-3.5 rounded-xl text-sm text-white transition-all duration-200"
              style={{ background: "#3374B5", boxShadow: "0 4px 16px rgba(51,116,181,0.4)" }}
            >
              Compare Rates
            </button>
          </div>

          {/* Results */}
          {quotes && (
            <div className="mt-8 space-y-3 animate-fade-up">
              <h3 className="text-lg font-bold text-text-light mb-4">
                {quotes.length} {quotes.length === 1 ? "rate" : "rates"} found
              </h3>

              {quotes.map((q) => (
                <div
                  key={`${q.carrier}-${q.service}`}
                  className="flex items-center justify-between p-5 rounded-2xl transition-all hover-lift"
                  style={
                    q.highlight
                      ? { background: "linear-gradient(135deg,#B07030,#8A5520)", color: "#fff", boxShadow: "0 8px 24px rgba(176,112,48,0.3)" }
                      : { background: "#FFF9F3", border: "1px solid #E8D8C4", boxShadow: "var(--shadow-sm)" }
                  }
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{q.logo}</span>
                    <div>
                      <p className="font-semibold text-sm" style={{ color: q.highlight ? "#fff" : "#2D1D0F" }}>
                        {q.carrier}
                        {q.highlight && (
                          <span className="ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.2)" }}>
                            Best Value
                          </span>
                        )}
                      </p>
                      <p className="text-xs" style={{ color: q.highlight ? "rgba(255,240,200,0.8)" : "#7A6050" }}>
                        {q.service}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xl font-extrabold" style={{ color: q.highlight ? "#fff" : "#2D1D0F" }}>
                      {q.price}
                    </p>
                    <p className="text-xs" style={{ color: q.highlight ? "rgba(255,240,200,0.7)" : "#7A6050" }}>
                      {q.eta}
                    </p>
                  </div>
                </div>
              ))}

              <p className="text-xs text-center mt-6" style={{ color: "rgba(122,96,80,0.6)" }}>
                * All rates are estimates. Final pricing may vary based on actual package dimensions and weight. Contact us for exact quotes.
                Visit us in-store or <Link href="/contact" className="font-semibold hover:underline" style={{ color: "#3374B5" }}>contact us</Link> to ship.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Info section — dark brown personality */}
      <section className="py-20 px-5" style={{ background: "#1E1914" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-extrabold text-center mb-12 tracking-tight" style={{ color: "#F8F2EA" }}>
            Why Ship with NOHO Mailbox?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                icon: "💰",
                title: "Best Rates Guaranteed",
                desc: "We compare all major carriers to find you the lowest price for your package size and destination.",
              },
              {
                icon: "⚡",
                title: "Same-Day Local Delivery",
                desc: "Shipping within North Hollywood? Skip the carriers — we deliver same-day for a flat $5.",
                accent: true,
              },
              {
                icon: "🏪",
                title: "Drop Off Anytime",
                desc: "Bring your package to our store. We handle packing, labeling, and carrier pickup — hassle-free.",
              },
            ].map((item) => (
              <div
                key={item.title}
                className="rounded-2xl p-7 hover-lift transition-all"
                style={
                  item.accent
                    ? { background: "linear-gradient(135deg,#B07030,#8A5520)", boxShadow: "0 8px 24px rgba(176,112,48,0.3)" }
                    : { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }
                }
              >
                <span className="text-3xl mb-4 block">{item.icon}</span>
                <h3 className="font-bold text-lg mb-2" style={{ color: item.accent ? "#FFE4A0" : "#F8F2EA" }}>{item.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: item.accent ? "rgba(255,255,255,0.85)" : "rgba(248,242,234,0.6)" }}>{item.desc}</p>
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
            Members can ship directly from their dashboard with saved addresses and tracking.
          </p>
          <Link
            href="/signup"
            className="inline-block font-semibold px-8 py-4 rounded-xl text-white transition-all duration-300"
            style={{ background: "#3374B5", boxShadow: "0 4px 20px rgba(51,116,181,0.4)" }}
          >
            Get a Mailbox
          </Link>
        </div>
      </section>
    </>
  );
}
