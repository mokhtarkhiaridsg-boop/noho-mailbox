"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { DeliveryTruckIcon, EnvelopeIcon, MailboxIcon } from "@/components/BrandIcons";
import { requestDelivery, type DeliveryState } from "@/app/actions/delivery";
import { DELIVERY_ZONES, calculateDeliveryPrice } from "@/lib/delivery-zones";
import DeliveryZoneMap from "@/components/DeliveryZoneMap";

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
        NoHo flat rate $5 &mdash; Extended zone from $9.75 &mdash; No membership required
      </div>

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
                <p className="text-5xl font-extrabold tracking-tight mb-3" style={{ color: "#3374B5" }}>{s.step}</p>
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
                  boxShadow: zone.id === 1 ? "0 12px 40px rgba(51,116,181,0.35)" : "none",
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
                style={{ background: "#3374B5" }}
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
                      : { background: "#2D1D0F", color: "#F7E6C2" }
                  }
                >
                  Schedule This Delivery →
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

      {/* Request Delivery Form */}
      <section className="py-20 px-4 bg-bg-light">
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
                    style={{ background: "#3374B5" }}
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
                        { value: "store", label: "🏪 NOHO Mailbox", sub: "5062 Lankershim Blvd" },
                        { value: "location", label: "📍 My Location", sub: "Custom pickup address" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setPickupType(opt.value)}
                          className="rounded-xl px-4 py-3 text-left transition-all"
                          style={pickupType === opt.value
                            ? { background: "#3374B5", color: "#fff", border: "2px solid #3374B5" }
                            : { background: "#F8F2EA", color: "#2D1D0F", border: "2px solid #D8C8B4" }}
                        >
                          <p className="font-bold text-sm">{opt.label}</p>
                          <p className="text-[11px] mt-0.5 opacity-70">{opt.sub}</p>
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
                    style={{ background: "#3374B5" }}
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
              { icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><rect x="6" y="14" width="36" height="28" rx="4" fill="#EBF2FA" stroke="#110E0B" strokeWidth="2.5" /><rect x="14" y="4" width="20" height="14" rx="3" fill="#3374B5" stroke="#110E0B" strokeWidth="2" /></svg>, label: "Packages" },
              { icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><rect x="8" y="4" width="32" height="40" rx="4" fill="#EBF2FA" stroke="#110E0B" strokeWidth="2.5" /><path d="M16 14 L32 14 M16 22 L32 22 M16 30 L26 30" stroke="#3374B5" strokeWidth="2" strokeLinecap="round" /></svg>, label: "Legal Documents" },
              { icon: <MailboxIcon className="w-10 h-10" />, label: "Business Mail" },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-6 text-center hover-lift animate-fade-up"
                style={{ background: "#FFF9F3", border: "1px solid #E8D8C4", boxShadow: "var(--shadow-sm)" }}
              >
                <div className="flex justify-center mb-3">{item.icon}</div>
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
          <div className="absolute top-[-30%] right-[-10%] w-[300px] h-[300px] rounded-full opacity-15 blur-[100px] pointer-events-none" style={{ background: "#3374B5" }} />
          <div className="relative z-10">
            <h2 className="text-3xl font-extrabold tracking-tight mb-3" style={{ color: "#F8F2EA" }}>Need a Mailbox Too?</h2>
            <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>Members get delivery requests right from their dashboard.</p>
            <Link
              href="/signup"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg inline-block"
              style={{ background: "#3374B5" }}
            >
              Get a Mailbox
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
