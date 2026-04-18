"use client";

import { useState, useActionState } from "react";
import Link from "next/link";
import { DeliveryTruckIcon, EnvelopeIcon, MailboxIcon } from "@/components/BrandIcons";
import { requestDelivery, type DeliveryState } from "@/app/actions/delivery";

const nohoZips = ["91601", "91602", "91603", "91604", "91605", "91606", "91607", "91608"];

function calculatePrice(zip: string, distance: number): { zone: string; price: string; note: string } | null {
  if (!zip) return null;
  if (nohoZips.includes(zip)) {
    return { zone: "NoHo Zone", price: "$5.00", note: "Flat rate — North Hollywood local delivery" };
  }
  if (distance <= 0) return null;
  if (distance > 15) {
    return { zone: "Out of Range", price: "—", note: "Maximum delivery radius is 15 miles. Please contact us for special arrangements." };
  }
  const base = 9.75;
  const extra = distance > 5 ? (distance - 5) * 0.75 : 0;
  const total = base + extra;
  return { zone: "Extended Zone", price: `$${total.toFixed(2)}`, note: `Base $9.75${extra > 0 ? ` + $${extra.toFixed(2)} distance` : ""} — extended zone delivery` };
}

export default function DeliveryPage() {
  const [zip, setZip] = useState("");
  const [distance, setDistance] = useState(0);
  const [result, setResult] = useState<{ zone: string; price: string; note: string } | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [state, formAction, pending] = useActionState<DeliveryState, FormData>(requestDelivery, {});

  const isNoHo = nohoZips.includes(zip);

  const handleEstimate = () => {
    const r = calculatePrice(zip, distance);
    setResult(r);
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

      {/* Zone Pricing */}
      <section className="py-20 px-4" style={{ background: "#1E1914" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-center mb-12 animate-fade-up" style={{ color: "#F8F2EA" }}>
            Delivery Zones &amp; Pricing
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* NoHo Zone — blue highlight */}
            <div
              className="rounded-2xl p-8 text-white hover-lift animate-fade-up delay-100"
              style={{
                background: "linear-gradient(145deg, #1B3A5C 0%, #0E2340 100%)",
                boxShadow: "0 12px 40px rgba(51,116,181,0.35)",
              }}
            >
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "rgba(147,196,255,0.75)" }}>Local</span>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 mb-4">NoHo Zone</h3>
              <p className="text-6xl font-extrabold tracking-tight mb-4">$5<span className="text-2xl font-bold" style={{ color: "rgba(147,196,255,0.7)" }}>.00</span></p>
              <p className="text-sm mb-6" style={{ color: "rgba(147,196,255,0.75)" }}>Flat rate — any address within the zone</p>
              <ul className="space-y-2 text-sm" style={{ color: "rgba(255,255,255,0.8)" }}>
                <li className="flex items-center gap-2"><span style={{ color: "#93C4FF" }}>✓</span> North Hollywood</li>
                <li className="flex items-center gap-2"><span style={{ color: "#93C4FF" }}>✓</span> Studio City</li>
                <li className="flex items-center gap-2"><span style={{ color: "#93C4FF" }}>✓</span> Valley Village</li>
                <li className="flex items-center gap-2"><span style={{ color: "#93C4FF" }}>✓</span> Toluca Lake</li>
              </ul>
              <p className="text-[10px] mt-4 uppercase tracking-wider" style={{ color: "rgba(147,196,255,0.4)" }}>Same-day local delivery</p>
            </div>

            {/* Extended Zone — warm cream card */}
            <div
              className="rounded-2xl p-8 hover-lift animate-fade-up delay-300"
              style={{ background: "#FFF9F3", border: "1px solid #E8D8C4", boxShadow: "var(--shadow-md)" }}
            >
              <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#B07030" }}>Extended</span>
              <h3 className="text-2xl font-extrabold tracking-tight text-text-light mt-1 mb-4">Beyond NoHo</h3>
              <div className="space-y-3 mb-6">
                {[
                  { range: "Under 5 miles", price: "$9.75" },
                  { range: "5 – 10 miles", price: "$9.75 + $0.75/mi" },
                  { range: "10 – 15 miles", price: "$9.75 + $0.75/mi" },
                ].map((tier) => (
                  <div key={tier.range} className="flex justify-between items-center text-sm border-b pb-3" style={{ borderColor: "#E8D8C4" }}>
                    <span className="text-text-light-muted">{tier.range}</span>
                    <span className="font-bold text-text-light">{tier.price}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs" style={{ color: "rgba(122,96,80,0.6)" }}>Maximum delivery radius: 15 miles</p>
              <p className="text-[10px] mt-2 uppercase tracking-wider" style={{ color: "rgba(122,96,80,0.4)" }}>Courier delivery for extended distances</p>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Calculator */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-10 animate-fade-up">Estimate Your Delivery</h2>
          <div
            className="rounded-2xl p-8 animate-fade-up delay-200"
            style={{ background: "#FFF9F3", border: "1px solid #E8D8C4", boxShadow: "var(--shadow-md)" }}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-text-light mb-1">Delivery Zip Code</label>
                <input
                  type="text"
                  maxLength={5}
                  value={zip}
                  onChange={(e) => { setZip(e.target.value.replace(/\D/g, "")); setResult(null); }}
                  placeholder="e.g. 91601"
                  className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-shadow"
                  style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
                />
              </div>

              {zip.length === 5 && !isNoHo && (
                <div className="animate-fade-up">
                  <label className="block text-sm font-bold text-text-light mb-1">Estimated Distance from Store</label>
                  <select
                    value={distance}
                    onChange={(e) => { setDistance(Number(e.target.value)); setResult(null); }}
                    className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-shadow"
                    style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
                  >
                    <option value={0}>Select distance</option>
                    <option value={3}>Under 5 miles</option>
                    <option value={7}>5 – 8 miles</option>
                    <option value={10}>8 – 12 miles</option>
                    <option value={14}>12 – 15 miles</option>
                    <option value={20}>Over 15 miles</option>
                  </select>
                </div>
              )}

              <button
                onClick={handleEstimate}
                disabled={!zip || (zip.length === 5 && !isNoHo && distance === 0)}
                className="w-full text-white font-bold py-3 rounded-xl transition-all hover:-translate-y-1 disabled:opacity-40 disabled:hover:translate-y-0"
                style={{ background: "#3374B5" }}
              >
                Estimate Delivery Cost
              </button>
            </div>

            {result && (
              <div
                className={`mt-6 rounded-xl p-6 animate-fade-up`}
                style={
                  result.zone === "NoHo Zone"
                    ? { background: "linear-gradient(135deg,#1B3A5C,#0E2340)", color: "#fff" }
                    : result.zone === "Out of Range"
                    ? { background: "#FFF0F0", border: "1px solid #FECACA", color: "#B91C1C" }
                    : { background: "#F7E6C2", border: "1px solid #D8C8B4", color: "#6B3F1A" }
                }
              >
                <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-70">{result.zone}</p>
                <p className="text-4xl font-extrabold tracking-tight mb-2">{result.price}</p>
                <p className="text-sm opacity-80">{result.note}</p>
              </div>
            )}
          </div>
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
                  <div>
                    <label className="block text-sm font-bold text-text-light mb-1">Pickup Address</label>
                    <input name="pickupAddr" type="text" defaultValue="NOHO Mailbox Store (Default)" className="w-full rounded-xl px-4 py-3 text-sm text-text-light-muted focus:outline-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-light mb-1">Delivery Address</label>
                    <input required name="destination" type="text" placeholder="123 Main St, Los Angeles, CA" className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-text-light mb-1">Zip Code</label>
                      <input required name="zip" type="text" maxLength={5} placeholder="91601" className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
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
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-light mb-1">Special Instructions <span className="font-normal" style={{ color: "rgba(122,96,80,0.4)" }}>(optional)</span></label>
                    <textarea name="instructions" rows={3} placeholder="Any details about the delivery..." className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none resize-none" style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }} />
                  </div>
                  <input type="hidden" name="distance" value={distance || ""} />
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
