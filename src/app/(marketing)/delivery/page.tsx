"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { DeliveryTruckIcon, EnvelopeIcon, MailboxIcon } from "@/components/BrandIcons";
import { requestDelivery, type DeliveryState } from "@/app/actions/delivery";
import { DELIVERY_ZONES, calculateDeliveryPrice } from "@/lib/delivery-zones";
import DeliveryZoneMap from "@/components/DeliveryZoneMap";

/* ─── Inline SVG icons (Heroicons-style 1.75 stroke, brand palette) ───────── */
function StoreFrontIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M6 18 L8 8 L40 8 L42 18" stroke="#2D100F" strokeWidth="2.5" fill="#F7E6C2" strokeLinejoin="round" />
      <rect x="6" y="18" width="36" height="24" fill="#FFF9F3" stroke="#2D100F" strokeWidth="2.5" />
      <rect x="20" y="26" width="8" height="16" fill="#337485" stroke="#2D100F" strokeWidth="2" />
      <rect x="10" y="22" width="6" height="6" fill="#EBF2FA" stroke="#2D100F" strokeWidth="1.5" />
      <rect x="32" y="22" width="6" height="6" fill="#EBF2FA" stroke="#2D100F" strokeWidth="1.5" />
      <path d="M8 18 L40 18" stroke="#337485" strokeWidth="2" />
    </svg>
  );
}

function PinDropIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4 C32 4 38 10 38 18 C38 28 24 44 24 44 C24 44 10 28 10 18 C10 10 16 4 24 4 Z"
            fill="#337485" stroke="#2D100F" strokeWidth="2.5" strokeLinejoin="round" />
      <circle cx="24" cy="18" r="5" fill="#F7E6C2" stroke="#2D100F" strokeWidth="2" />
    </svg>
  );
}

function HandPackageIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      {/* Box */}
      <path d="M14 16 L32 8 L50 16 L50 36 L32 44 L14 36 Z" fill="#EBF2FA" stroke="#2D100F" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M14 16 L32 24 L50 16" stroke="#2D100F" strokeWidth="2" strokeLinejoin="round" />
      <path d="M32 24 L32 44" stroke="#2D100F" strokeWidth="2" />
      <path d="M22 12 L40 20" stroke="#337485" strokeWidth="3" strokeLinecap="round" />
      {/* Hand reaching up */}
      <path d="M20 56 C20 50 24 46 30 46 L36 46 C42 46 46 50 46 56 L46 60 L20 60 Z"
            fill="#F7E6C2" stroke="#2D100F" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M28 46 L28 38 M32 46 L32 36 M36 46 L36 38" stroke="#2D100F" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function BuildingIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="6" width="32" height="38" fill="#FFF9F3" stroke="#2D100F" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="13" y="11" width="5" height="5" fill="#337485" stroke="#2D100F" strokeWidth="1.2" />
      <rect x="22" y="11" width="5" height="5" fill="#337485" stroke="#2D100F" strokeWidth="1.2" />
      <rect x="31" y="11" width="5" height="5" fill="#337485" stroke="#2D100F" strokeWidth="1.2" />
      <rect x="13" y="20" width="5" height="5" fill="#337485" stroke="#2D100F" strokeWidth="1.2" />
      <rect x="22" y="20" width="5" height="5" fill="#337485" stroke="#2D100F" strokeWidth="1.2" />
      <rect x="31" y="20" width="5" height="5" fill="#337485" stroke="#2D100F" strokeWidth="1.2" />
      <rect x="13" y="29" width="5" height="5" fill="#337485" stroke="#2D100F" strokeWidth="1.2" />
      <rect x="31" y="29" width="5" height="5" fill="#337485" stroke="#2D100F" strokeWidth="1.2" />
      <rect x="20" y="32" width="8" height="12" fill="#F7E6C2" stroke="#2D100F" strokeWidth="2" />
    </svg>
  );
}

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#FFF9F3" stroke="#2D100F" strokeWidth="2.5" />
      <path d="M24 12 L24 24 L32 28" stroke="#337485" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="24" cy="24" r="2" fill="#2D100F" />
    </svg>
  );
}

function RouteIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M10 38 C10 30 18 30 24 24 C30 18 38 18 38 10"
            stroke="#337485" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 4" fill="none" />
      <circle cx="10" cy="38" r="5" fill="#F7E6C2" stroke="#2D100F" strokeWidth="2.5" />
      <circle cx="38" cy="10" r="5" fill="#337485" stroke="#2D100F" strokeWidth="2.5" />
      <circle cx="24" cy="24" r="3" fill="#2D100F" />
    </svg>
  );
}

function ChartUpIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M6 42 L42 42" stroke="#2D100F" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M6 42 L6 6" stroke="#2D100F" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M10 32 L18 24 L26 28 L42 10" stroke="#337485" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      <path d="M30 10 L42 10 L42 22" stroke="#337485" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}

function DollarBadgeIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <circle cx="24" cy="24" r="20" fill="#F7E6C2" stroke="#2D100F" strokeWidth="2.5" />
      <path d="M28 16 C28 13 25 12 22 12 C19 12 17 14 17 17 C17 24 31 22 31 30 C31 33 28 35 24 35 C20 35 17 33 17 30"
            stroke="#2D100F" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M24 8 L24 12 M24 35 L24 40" stroke="#2D100F" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

function ShieldCheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M24 4 L6 12 L6 24 C6 34 14 42 24 44 C34 42 42 34 42 24 L42 12 Z"
            fill="#FFF9F3" stroke="#2D100F" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M16 24 L22 30 L34 18" stroke="#337485" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CalendarIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="10" width="36" height="32" rx="3" fill="#FFF9F3" stroke="#2D100F" strokeWidth="2.5" />
      <path d="M6 18 L42 18" stroke="#2D100F" strokeWidth="2" />
      <rect x="13" y="4" width="3" height="10" rx="1.5" fill="#337485" stroke="#2D100F" strokeWidth="1.5" />
      <rect x="32" y="4" width="3" height="10" rx="1.5" fill="#337485" stroke="#2D100F" strokeWidth="1.5" />
      <circle cx="16" cy="26" r="2.5" fill="#337485" />
      <circle cx="24" cy="26" r="2.5" fill="#337485" opacity="0.6" />
      <circle cx="32" cy="26" r="2.5" fill="#337485" opacity="0.6" />
      <circle cx="16" cy="34" r="2.5" fill="#337485" opacity="0.6" />
      <circle cx="24" cy="34" r="2.5" fill="#337485" />
      <circle cx="32" cy="34" r="2.5" fill="#337485" opacity="0.6" />
    </svg>
  );
}

function HouseIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M6 22 L24 6 L42 22 L42 42 L6 42 Z" fill="#FFF9F3" stroke="#2D100F" strokeWidth="2.5" strokeLinejoin="round" />
      <rect x="20" y="28" width="8" height="14" fill="#337485" stroke="#2D100F" strokeWidth="2" />
    </svg>
  );
}

export default function DeliveryPage() {
  const [addressInput, setAddressInput] = useState("");
  const [zip, setZip] = useState("");
  const [quoteResult, setQuoteResult] = useState<ReturnType<typeof calculateDeliveryPrice>>(null);
  const [showForm, setShowForm] = useState(false);
  const [pickupType, setPickupType] = useState<"store" | "location">("store");
  const [pickupAddress, setPickupAddress] = useState("");
  const [state, formAction, pending] = useActionState<DeliveryState, FormData>(requestDelivery, {});

  function extractZip(address: string): string {
    const m = address.match(/\b(\d{5})(?:-\d{4})?\b/);
    return m ? m[1] : "";
  }

  function handleAddressChange(val: string) {
    setAddressInput(val);
    const foundZip = extractZip(val);
    setZip(foundZip);
    setQuoteResult(foundZip.length === 5 ? calculateDeliveryPrice(foundZip) : null);
  }

  const handleEstimate = () => {
    if (zip.length === 5) setQuoteResult(calculateDeliveryPrice(zip));
  };

  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 animate-float">
            <DeliveryTruckIcon className="w-24 h-24 mx-auto" />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Same-Day Delivery
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            Get your mail and packages delivered to your door — same day. Open to everyone, not just members.
          </p>
        </div>
      </section>

      {/* Gold personality banner */}
      <div
        className="py-4 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        NoHo flat rate $5 &mdash; Inner Valley from $9 &mdash; No membership required
      </div>

      {/* 4-tile services menu */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-6xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-2 animate-fade-up" style={{ color: "#337485" }}>
            Four ways we move things for you
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            Pick the one that fits your day
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              {
                icon: <HouseIcon className="w-14 h-14 transition-transform duration-500 group-hover:scale-110 group-hover:-rotate-3" />,
                tag: "Door-to-Door",
                title: "Mail to your home",
                desc: "We bring the contents of your NOHO mailbox right to your door — same day, $5 in NoHo.",
                href: "#request",
                cta: "Request delivery",
              },
              {
                icon: <HandPackageIcon className="w-14 h-14 transition-transform duration-500 group-hover:-translate-y-1" />,
                tag: "Pickup Service",
                title: "We come to you",
                desc: "Have a package to ship? We&apos;ll grab it from your home or office and bring it back to the store.",
                href: "#pickup",
                cta: "See pickup pricing",
              },
              {
                icon: <BuildingIcon className="w-14 h-14 transition-transform duration-500 group-hover:scale-110" />,
                tag: "Business Routes",
                title: "Daily / weekly stops",
                desc: "Scheduled mail runs for law firms, agencies, and small businesses across the Valley.",
                href: "#business",
                cta: "Get a route quote",
              },
              {
                icon: <StoreFrontIcon className="w-14 h-14 transition-transform duration-500 group-hover:scale-110" />,
                tag: "Drop-Off",
                title: "Bring it to the store",
                desc: "Walk in 7 days a week. We pack, label, and hand off to USPS / UPS / FedEx / DHL for you.",
                href: "/shipping",
                cta: "Get a shipping quote",
              },
            ].map((tile, i) => (
              <a
                key={tile.tag}
                href={tile.href}
                className="group rounded-2xl p-6 hover-lift animate-fade-up flex flex-col"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <div className="mb-4">{tile.icon}</div>
                <p className="text-[10px] font-bold uppercase tracking-widest mb-1" style={{ color: "#337485" }}>{tile.tag}</p>
                <h3 className="font-extrabold tracking-tight text-base text-text-light mb-2">{tile.title}</h3>
                <p className="text-sm text-text-light-muted flex-1" dangerouslySetInnerHTML={{ __html: tile.desc }} />
                <p className="mt-4 text-xs font-bold transition-all" style={{ color: "#337485" }}>
                  {tile.cta} <span className="inline-block transition-transform group-hover:translate-x-1">&rarr;</span>
                </p>
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Request Delivery", desc: "Submit a delivery request through our website with your address and item details.", delay: "delay-100" },
              { step: "02", title: "We Dispatch", desc: "A local courier picks up your items from our store within the hour.", delay: "delay-300" },
              { step: "03", title: "Delivered to You", desc: "Receive your mail and packages at your door — same day, guaranteed.", delay: "delay-500" },
            ].map((s) => (
              <div
                key={s.step}
                className={`text-center rounded-2xl p-7 hover-lift animate-fade-up ${s.delay}`}
                style={{ background: "#FFF9F3", border: "1px solid #E8D8C4" }}
              >
                <p className="text-5xl font-extrabold tracking-tight mb-3" style={{ color: "#337485" }}>{s.step}</p>
                <p className="font-extrabold tracking-tight text-text-light text-sm mb-3">{s.title}</p>
                <p className="text-text-light-muted text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 7-Zone Pricing */}
      <section className="py-20 px-4" style={{ background: "#1E1914" }}>
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#AFA08F" }}>Coverage Area</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-center mb-2 animate-fade-up" style={{ color: "#F8F2EA" }}>
            7 Delivery Zones Across LA
          </h2>
          <p className="text-center text-sm mb-12 animate-fade-up" style={{ color: "#AFA08F" }}>
            Enter your zip below for an instant quote — or see all zone prices here.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {DELIVERY_ZONES.map((zone, i) => (
              <div
                key={zone.id}
                className="rounded-2xl p-6 hover-lift animate-fade-up"
                style={{
                  animationDelay: `${i * 60}ms`,
                  background: zone.id === 1
                    ? "linear-gradient(145deg, #1B3A5C 0%, #0E2340 100%)"
                    : zone.id === 7
                    ? "rgba(255,255,255,0.04)"
                    : "#2A2218",
                  border: zone.id === 1 ? "none" : "1px solid rgba(255,255,255,0.06)",
                  boxShadow: zone.id === 1 ? "0 12px 40px rgba(51,116,133,0.35)" : "none",
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: zone.id === 1 ? "rgba(147,196,255,0.7)" : "#AFA08F" }}>
                      Zone {zone.id}
                    </span>
                    <h3 className="text-base font-extrabold mt-0.5" style={{ color: "#F8F2EA" }}>{zone.name}</h3>
                  </div>
                  <span
                    className="text-2xl font-extrabold tracking-tight"
                    style={{ color: zone.id === 1 ? "#93C4FF" : zone.id === 7 ? "#AFA08F" : "#F7E6C2" }}
                  >
                    {zone.id === 7 ? "Call" : `$${zone.basePrice.toFixed(0)}`}
                  </span>
                </div>
                <p className="text-xs mb-1" style={{ color: "#AFA08F" }}>{zone.label}</p>
                <p className="text-[10px]" style={{ color: zone.id === 1 ? "rgba(147,196,255,0.5)" : "rgba(175,160,143,0.5)" }}>
                  {zone.id === 7 ? "Call (818) 765-1539 for a custom quote" : `ETA ${zone.etaWindow}`}
                </p>
              </div>
            ))}
          </div>
          <p className="text-center text-xs mt-8" style={{ color: "rgba(175,160,143,0.5)" }}>
            Rush +50% · White Glove +120% · Standard rates shown above · Prices are estimates, not guaranteed
          </p>
        </div>
      </section>

      {/* Delivery Calculator — zip lookup */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-3 animate-fade-up">Instant Delivery Quote</h2>
          <p className="text-center text-sm text-text-light-muted mb-10">Enter your delivery address for an instant price — no account required.</p>
          <div
            className="rounded-2xl p-8 animate-fade-up delay-200"
            style={{ background: "#FFF9F3", border: "1px solid #E8D8C4", boxShadow: "var(--shadow-md)" }}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-text-light mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={addressInput}
                  onChange={(e) => handleAddressChange(e.target.value)}
                  placeholder="123 Main St, Los Angeles, CA 90028"
                  className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-shadow"
                  style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
                />
                {addressInput && !zip && (
                  <p className="text-xs mt-1.5" style={{ color: "#B07030" }}>Include a 5-digit zip code in the address for an instant quote</p>
                )}
              </div>
              <button
                onClick={handleEstimate}
                disabled={zip.length !== 5}
                className="w-full text-white font-bold py-3 rounded-xl transition-all hover:-translate-y-1 disabled:opacity-40 disabled:hover:translate-y-0"
                style={{ background: "#337485" }}
              >
                Check My Zone
              </button>
            </div>

            {zip.length === 5 && quoteResult === null && (
              <div className="mt-6 rounded-xl p-5 text-center animate-fade-up" style={{ background: "#FFF0F0", border: "1px solid #FECACA" }}>
                <p className="font-bold text-sm" style={{ color: "#B91C1C" }}>Zip {zip} is outside our delivery area</p>
                <p className="text-xs mt-1" style={{ color: "#B91C1C" }}>Call us at (818) 765-1539 for a custom quote on longer distances.</p>
              </div>
            )}

            {quoteResult && (
              <div
                className="mt-6 rounded-xl p-6 animate-fade-up"
                style={
                  quoteResult.zone.id === 1
                    ? { background: "linear-gradient(135deg,#1B3A5C,#0E2340)", color: "#fff" }
                    : { background: "#F7E6C2", border: "1px solid #D8C8B4", color: "#6B3F1A" }
                }
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ opacity: 0.7 }}>
                  Zone {quoteResult.zone.id} — {quoteResult.zone.name}
                </p>
                <p className="text-4xl font-extrabold tracking-tight mb-1">${quoteResult.price.toFixed(2)}</p>
                <p className="text-sm opacity-80">{quoteResult.zone.label}</p>
                <p className="text-xs mt-2 opacity-60">ETA: {quoteResult.zone.etaWindow} · Standard rate</p>
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 px-5 py-2.5 rounded-xl text-sm font-bold transition-all hover:-translate-y-0.5"
                  style={
                    quoteResult.zone.id === 1
                      ? { background: "rgba(255,255,255,0.15)", color: "#fff" }
                      : { background: "#2D100F", color: "#F7E6C2" }
                  }
                >
                  Schedule This Delivery &rarr;
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Delivery Coverage Map */}
      <section className="py-20 px-4" style={{ background: "#0F1923" }}>
        <div className="max-w-2xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-3 animate-fade-up" style={{ color: "rgba(147,196,255,0.5)" }}>Coverage</p>
          <h2 className="text-3xl font-extrabold tracking-tight text-center mb-3 animate-fade-up" style={{ color: "#F8F2EA" }}>
            Delivery Coverage Map
          </h2>
          <p className="text-center text-sm mb-10 animate-fade-up" style={{ color: "rgba(175,160,143,0.65)" }}>
            Hover or click a zone to see pricing and ETA. Zones radiate out from our North Hollywood store.
          </p>
          <DeliveryZoneMap activeZone={quoteResult?.zone.id} />
        </div>
      </section>

      {/* Pickup Service */}
      <section id="pickup" className="py-24 px-4 bg-bg-light scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="animate-fade-up">
              <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3" style={{ color: "#337485" }}>
                Pickup Service
              </p>
              <h2 className="text-4xl font-extrabold tracking-tight text-text-light mb-5">
                We&apos;ll come grab it.
              </h2>
              <p className="text-text-light-muted text-base leading-relaxed mb-6">
                Got a package that needs to ship and no time to drop it off? Schedule a pickup
                and we&apos;ll come to your home or office, take the package back to the store,
                pack it (if needed), and hand it off to USPS, UPS, FedEx, or DHL.
              </p>
              <ul className="space-y-3 mb-8">
                {[
                  { icon: <ClockIcon className="w-6 h-6 shrink-0 mt-0.5" />, text: "Pickup windows from 30 minutes — same-day, 7 days a week." },
                  { icon: <DollarBadgeIcon className="w-6 h-6 shrink-0 mt-0.5" />, text: "Pickup fee starts at $5 in NoHo, scaled by zone — same as delivery." },
                  { icon: <ShieldCheckIcon className="w-6 h-6 shrink-0 mt-0.5" />, text: "We pack and label at the store before handing off — your stuff is safe." },
                  { icon: <PinDropIcon className="w-6 h-6 shrink-0 mt-0.5" />, text: "No pickup limit — boxes, envelopes, return labels, large items." },
                ].map((item, i) => (
                  <li key={i} className="flex gap-3 text-sm text-text-light">
                    <span className="transition-transform hover:scale-110">{item.icon}</span>
                    <span className="pt-0.5">{item.text}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/contact"
                className="inline-block text-white font-bold px-7 py-3.5 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{ background: "#337485" }}
              >
                Schedule a Pickup
              </Link>
            </div>

            {/* Visual: animated pickup illustration */}
            <div className="relative animate-fade-up delay-200">
              <div
                className="rounded-3xl p-10 relative overflow-hidden"
                style={{ background: "linear-gradient(135deg, #FFF9F3 0%, #F7E6C2 100%)", border: "1px solid #E8D8C4", boxShadow: "var(--shadow-md)" }}
              >
                {/* House on left */}
                <div className="flex items-center justify-between gap-4">
                  <div className="text-center">
                    <HouseIcon className="w-20 h-20 mx-auto" />
                    <p className="text-[11px] font-bold mt-2" style={{ color: "#6B3F1A" }}>You</p>
                  </div>

                  {/* Animated truck on the road */}
                  <div className="flex-1 relative h-14">
                    <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2" style={{ background: "#D8C8B4", borderRadius: 2 }} />
                    <div className="absolute inset-x-0 top-1/2 h-0.5 -translate-y-1/2 animate-pulse-soft" style={{ background: "repeating-linear-gradient(90deg, #337485 0 8px, transparent 8px 16px)" }} />
                    <div className="absolute top-1/2 -translate-y-1/2 animate-pickup-truck">
                      <DeliveryTruckIcon className="w-12 h-8" />
                    </div>
                  </div>

                  <div className="text-center">
                    <StoreFrontIcon className="w-20 h-20 mx-auto" />
                    <p className="text-[11px] font-bold mt-2" style={{ color: "#6B3F1A" }}>NOHO Mailbox</p>
                  </div>
                </div>

                <div className="mt-8 text-center">
                  <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "#337485" }}>Average pickup time</p>
                  <p className="text-4xl font-extrabold tracking-tight" style={{ color: "#2D100F" }}>30–60 min</p>
                  <p className="text-xs mt-1" style={{ color: "#6B3F1A" }}>NoHo zone · same-day everywhere</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <style jsx>{`
          @keyframes pickup-truck {
            0% { left: 0%; }
            45% { left: 70%; transform: translateY(-50%) scaleX(1); }
            50% { left: 70%; transform: translateY(-50%) scaleX(-1); }
            95% { left: 0%; transform: translateY(-50%) scaleX(-1); }
            100% { left: 0%; transform: translateY(-50%) scaleX(1); }
          }
          .animate-pickup-truck {
            animation: pickup-truck 5s ease-in-out infinite;
          }
        `}</style>
      </section>

      {/* Business / Bulk Routes */}
      <section id="business" className="py-24 px-4 scroll-mt-16" style={{ background: "#1E1914" }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-3 animate-fade-up" style={{ color: "rgba(247,230,194,0.6)" }}>
              Business & Bulk
            </p>
            <h2 className="text-4xl font-extrabold tracking-tight mb-4 animate-fade-up" style={{ color: "#F8F2EA" }}>
              Daily delivery routes for your team
            </h2>
            <p className="text-base max-w-2xl mx-auto animate-fade-up delay-100" style={{ color: "rgba(175,160,143,0.85)" }}>
              Law firms, talent agencies, production companies, e-commerce brands — if you need
              packages and mail moving regularly across the Valley, we&apos;ll set up a recurring
              route at a flat per-stop rate.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-12">
            {[
              {
                icon: <CalendarIcon className="w-12 h-12 transition-transform duration-500 group-hover:rotate-3" />,
                title: "Scheduled Routes",
                desc: "Daily, weekly, or by-request routes between your office and ours. We&apos;ll work around your busiest hours.",
              },
              {
                icon: <RouteIcon className="w-12 h-12 transition-transform duration-500 group-hover:scale-110" />,
                title: "Multi-Stop Loops",
                desc: "Pickup at multiple addresses on a single run — perfect for firms with several office locations.",
              },
              {
                icon: <ChartUpIcon className="w-12 h-12 transition-transform duration-500 group-hover:-translate-y-1" />,
                title: "Volume Pricing",
                desc: "Flat per-stop pricing that beats hourly couriers. Net-30 invoicing for ongoing accounts.",
              },
            ].map((card, i) => (
              <div
                key={card.title}
                className="group rounded-2xl p-7 hover-lift animate-fade-up"
                style={{
                  background: "rgba(247,230,194,0.04)",
                  border: "1px solid rgba(247,230,194,0.08)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <div className="mb-4">{card.icon}</div>
                <h3 className="font-extrabold tracking-tight text-lg mb-2" style={{ color: "#F8F2EA" }}>
                  {card.title}
                </h3>
                <p className="text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: card.desc }} style={{ color: "rgba(175,160,143,0.85)" }} />
              </div>
            ))}
          </div>

          <div
            className="rounded-3xl p-10 max-w-3xl mx-auto text-center animate-fade-up delay-200"
            style={{ background: "linear-gradient(135deg, #337485 0%, #23596A 100%)", boxShadow: "0 20px 60px rgba(51,116,133,0.3)" }}
          >
            <p className="text-xs font-bold uppercase tracking-[0.2em] mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>Talk to us</p>
            <h3 className="text-2xl font-extrabold tracking-tight mb-2 text-white">Quote a custom route</h3>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.85)" }}>
              Tell us your stops and frequency — we&apos;ll come back with a flat per-stop rate within the day.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                href="/contact?topic=business-routes"
                className="px-7 py-3.5 rounded-xl font-bold transition-all hover:-translate-y-1 hover:shadow-lg"
                style={{ background: "#F7E6C2", color: "#2D100F" }}
              >
                Request a Route Quote
              </Link>
              <a
                href="tel:+18185067744"
                className="px-7 py-3.5 rounded-xl font-bold transition-all hover:-translate-y-1"
                data-cursor-label="Call"
                style={{ background: "rgba(255,255,255,0.12)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}
              >
                (818) 506-7744
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Why $5 beats DoorDash — sales feature */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <p className="text-center text-xs font-bold uppercase tracking-[0.2em] mb-3 animate-fade-up" style={{ color: "#337485" }}>
            What it actually costs
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-3 animate-fade-up">
            $5 beats every gig-app option
          </h2>
          <p className="text-center text-sm text-text-light-muted mb-12 animate-fade-up delay-100 max-w-xl mx-auto">
            Real-world Saturday afternoon, NoHo zone, single small package. Here&apos;s what each option charges:
          </p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[
              { name: "NOHO Mailbox", price: "$5", note: "Same-day · flat", highlight: true, eta: "30–60 min" },
              { name: "DoorDash", price: "$12–18", note: "Surge + fees + tip", eta: "60–90 min" },
              { name: "Uber Connect", price: "$15–22", note: "Per-mile + tip", eta: "45–75 min" },
              { name: "Same-day USPS", price: "n/a", note: "Doesn&apos;t exist", eta: "—" },
            ].map((opt, i) => (
              <div
                key={opt.name}
                className="rounded-2xl p-6 hover-lift animate-fade-up text-center"
                style={
                  opt.highlight
                    ? { background: "linear-gradient(135deg, #337485 0%, #23596A 100%)", color: "#fff", boxShadow: "0 12px 40px rgba(51,116,133,0.35)", animationDelay: `${i * 60}ms` }
                    : { background: "#FFF9F3", border: "1px solid #E8D8C4", animationDelay: `${i * 60}ms` }
                }
              >
                <p className="text-[10px] font-bold uppercase tracking-widest mb-2" style={{ color: opt.highlight ? "rgba(255,255,255,0.7)" : "#7A6050" }}>{opt.name}</p>
                <p className="text-3xl font-extrabold tracking-tight mb-1" style={{ color: opt.highlight ? "#F7E6C2" : "#2D100F" }}>{opt.price}</p>
                <p className="text-xs mb-3" dangerouslySetInnerHTML={{ __html: opt.note }} style={{ color: opt.highlight ? "rgba(255,255,255,0.8)" : "#7A6050" }} />
                <p className="text-[11px] font-bold pt-3 border-t" style={{ borderColor: opt.highlight ? "rgba(255,255,255,0.15)" : "#E8D8C4", color: opt.highlight ? "rgba(255,255,255,0.9)" : "#2D100F" }}>
                  ETA: {opt.eta}
                </p>
              </div>
            ))}
          </div>

          <p className="text-center text-xs mt-8 italic" style={{ color: "rgba(122,96,80,0.6)" }}>
            Real prices captured Saturday 2pm, Lankershim &rarr; Studio City. Your couriers may vary.
          </p>
        </div>
      </section>

      {/* Request Delivery Form */}
      <section id="request" className="py-20 px-4 bg-bg-light scroll-mt-16">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-4 animate-fade-up">Request a Delivery</h2>
          <p className="text-center text-text-light-muted mb-10 animate-fade-up delay-100">Open to everyone — no membership required.</p>

          {state.success ? (
            <div
              className="rounded-2xl p-10 text-center animate-scale-in"
              style={{ background: "#FFF9F3", border: "1px solid #E8D8C4", boxShadow: "var(--shadow-md)" }}
            >
              <div className="inline-block mb-4">
                <DeliveryTruckIcon className="w-20 h-20 mx-auto" />
              </div>
              <h3 className="text-2xl font-extrabold tracking-tight text-text-light mb-2">Request Received!</h3>
              <p className="text-text-light-muted text-sm mb-6">We&apos;ll confirm your delivery and dispatch a courier shortly. Check your email for updates.</p>
            </div>
          ) : (
            <>
              {!showForm ? (
                <div className="text-center animate-fade-up">
                  <button
                    onClick={() => setShowForm(true)}
                    className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg"
                    style={{ background: "#337485" }}
                  >
                    Start Delivery Request
                  </button>
                </div>
              ) : (
                <form
                  action={formAction}
                  className="rounded-2xl p-8 space-y-4 animate-scale-in"
                  style={{ background: "#FFF9F3", border: "1px solid #E8D8C4", boxShadow: "var(--shadow-md)" }}
                >
                  {state.error && (
                    <p className="text-danger text-sm bg-danger-soft p-3 rounded-xl">{state.error}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-text-light mb-1">Full Name</label>
                      <input required name="customerName" type="text" placeholder="John Doe" className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-text-light mb-1">Phone</label>
                      <input required name="phone" type="tel" placeholder="(818) 765-1539" className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-light mb-1">Email</label>
                    <input required name="email" type="email" placeholder="you@example.com" className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
                  </div>
                  {/* Pickup Type */}
                  <div>
                    <label className="block text-sm font-bold text-text-light mb-2">Pickup From</label>
                    <div className="grid grid-cols-2 gap-3">
                      {([
                        { value: "store", icon: <StoreFrontIcon className="w-7 h-7" />, label: "NOHO Mailbox", sub: "5062 Lankershim Blvd" },
                        { value: "location", icon: <PinDropIcon className="w-7 h-7" />, label: "My Location", sub: "Custom pickup address" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPickupType(opt.value)}
                          className="rounded-xl px-4 py-3 text-left transition-all flex items-center gap-3"
                          style={pickupType === opt.value
                            ? { background: "#337485", color: "#fff", border: "2px solid #337485" }
                            : { background: "#F8F2EA", color: "#2D100F", border: "2px solid #D8C8B4" }}
                        >
                          <span className="shrink-0">{opt.icon}</span>
                          <span>
                            <span className="block font-bold text-sm">{opt.label}</span>
                            <span className="block text-[11px] mt-0.5 opacity-70">{opt.sub}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                    {pickupType === "location" && (
                      <div className="mt-3">
                        <input
                          required
                          name="pickupAddr"
                          type="text"
                          value={pickupAddress}
                          onChange={(e) => setPickupAddress(e.target.value)}
                          placeholder="Your pickup address..."
                          className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none"
                          style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
                        />
                      </div>
                    )}
                  </div>
                  {/* Delivery Address */}
                  <div>
                    <label className="block text-sm font-bold text-text-light mb-1">Delivery Address</label>
                    <input
                      required
                      name="destination"
                      type="text"
                      defaultValue={addressInput || ""}
                      onChange={(e) => {
                        const val = e.target.value;
                        const foundZip = extractZip(val);
                        if (foundZip) setZip(foundZip);
                      }}
                      placeholder="123 Main St, Los Angeles, CA 90028"
                      className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none"
                      style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
                    />
                    <p className="text-[11px] mt-1" style={{ color: "rgba(122,96,80,0.5)" }}>Include zip code for automatic pricing (e.g. &ldquo;Los Angeles, CA 90028&rdquo;)</p>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-light mb-1">Item Type</label>
                    <select required name="itemType" className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}>
                      <option value="">Select type</option>
                      <option value="Letter">Letter / Envelope</option>
                      <option value="Package">Package</option>
                      <option value="Documents">Legal Documents</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-light mb-1">Special Instructions <span className="font-normal" style={{ color: "rgba(122,96,80,0.4)" }}>(optional)</span></label>
                    <textarea name="instructions" rows={3} placeholder="Any details about the delivery..." className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none resize-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
                  </div>
                  <input type="hidden" name="zip" value={zip} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="w-full text-white font-bold py-3 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-50"
                    style={{ background: "#337485" }}
                  >
                    {pending ? "Submitting..." : "Request Delivery"}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </section>

      {/* What We Deliver */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">What We Deliver</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { icon: <EnvelopeIcon className="w-10 h-10" />, label: "Letters & Mail" },
              { icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><rect x="6" y="14" width="36" height="28" rx="4" fill="#EBF2FA" stroke="#110E0B" strokeWidth="2.5" /><rect x="14" y="4" width="20" height="14" rx="3" fill="#337485" stroke="#110E0B" strokeWidth="2" /></svg>, label: "Packages" },
              { icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><rect x="8" y="4" width="32" height="40" rx="4" fill="#EBF2FA" stroke="#110E0B" strokeWidth="2.5" /><path d="M16 14 L32 14 M16 22 L32 22 M16 30 L26 30" stroke="#337485" strokeWidth="2" strokeLinecap="round" /></svg>, label: "Legal Documents" },
              { icon: <MailboxIcon className="w-10 h-10" />, label: "Business Mail" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-6 text-center hover-lift animate-fade-up group"
                style={{ background: "#FFF9F3", border: "1px solid #E8D8C4", boxShadow: "var(--shadow-sm)" }}
              >
                <div className="flex justify-center mb-3 transition-transform duration-500 group-hover:scale-110">{item.icon}</div>
                <p className="font-bold text-sm text-text-light">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-bg-light">
        <div
          className="relative max-w-3xl mx-auto rounded-3xl p-12 text-center overflow-hidden shadow-xl animate-fade-up"
          style={{ background: "#110E0B" }}
        >
          <div className="absolute top-[-30%] right-[-10%] w-[300px] h-[300px] rounded-full opacity-15 blur-[100px] pointer-events-none" style={{ background: "#337485" }} />
          <div className="relative z-10">
            <h2 className="text-3xl font-extrabold tracking-tight mb-3" style={{ color: "#F8F2EA" }}>Need a Mailbox Too?</h2>
            <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>Members get delivery requests right from their dashboard.</p>
            <Link
              href="/signup"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg inline-block"
              style={{ background: "#337485" }}
            >
              Get a Mailbox
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
