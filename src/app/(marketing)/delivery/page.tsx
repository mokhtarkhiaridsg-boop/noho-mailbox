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
                className={`text-center bg-surface-light border border-border-light rounded-2xl p-7 hover-lift animate-fade-up ${s.delay}`}
              >
                <p className="text-5xl font-extrabold tracking-tight text-accent mb-3">{s.step}</p>
                <p className="font-extrabold tracking-tight text-text-light text-sm mb-3">{s.title}</p>
                <p className="text-text-light-muted text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Zone Pricing */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">Delivery Zones & Pricing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* NoHo Zone */}
            <div
              className="rounded-2xl p-8 text-white bg-accent shadow-[0_12px_40px_rgba(51,116,181,0.3)] hover-lift animate-fade-up delay-100"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-white/60">Local</span>
              <h3 className="text-2xl font-extrabold tracking-tight mt-1 mb-4">NoHo Zone</h3>
              <p className="text-6xl font-extrabold tracking-tight mb-4">$5<span className="text-2xl font-bold text-white/70">.00</span></p>
              <p className="text-white/70 text-sm mb-6">Flat rate — any address within the zone</p>
              <ul className="space-y-2 text-sm text-white/80">
                <li className="flex items-center gap-2"><span className="text-white">✓</span> North Hollywood</li>
                <li className="flex items-center gap-2"><span className="text-white">✓</span> Studio City</li>
                <li className="flex items-center gap-2"><span className="text-white">✓</span> Valley Village</li>
                <li className="flex items-center gap-2"><span className="text-white">✓</span> Toluca Lake</li>
              </ul>
              <p className="text-[10px] text-white/40 mt-4 uppercase tracking-wider">Same-day local delivery</p>
            </div>

            {/* Extended Zone */}
            <div
              className="bg-surface-light border border-border-light rounded-2xl p-8 shadow-[var(--shadow-md)] hover-lift animate-fade-up delay-300"
            >
              <span className="text-xs font-bold uppercase tracking-widest text-accent">Extended</span>
              <h3 className="text-2xl font-extrabold tracking-tight text-text-light mt-1 mb-4">Beyond NoHo</h3>
              <div className="space-y-3 mb-6">
                {[
                  { range: "Under 5 miles", price: "$9.75" },
                  { range: "5 – 10 miles", price: "$9.75 + $0.75/mi" },
                  { range: "10 – 15 miles", price: "$9.75 + $0.75/mi" },
                ].map((tier) => (
                  <div key={tier.range} className="flex justify-between items-center text-sm border-b border-border-light pb-3">
                    <span className="text-text-light-muted">{tier.range}</span>
                    <span className="font-bold text-text-light">{tier.price}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-light-muted/60">Maximum delivery radius: 15 miles</p>
              <p className="text-[10px] text-text-light-muted/40 mt-2 uppercase tracking-wider">Courier delivery for extended distances</p>
            </div>
          </div>
        </div>
      </section>

      {/* Delivery Calculator */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-2xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-10 animate-fade-up">Estimate Your Delivery</h2>
          <div
            className="bg-surface-light border border-border-light rounded-2xl p-8 shadow-[var(--shadow-md)] animate-fade-up delay-200"
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
                  className="w-full border border-border-light bg-bg-light rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
                />
              </div>

              {zip.length === 5 && !isNoHo && (
                <div className="animate-fade-up">
                  <label className="block text-sm font-bold text-text-light mb-1">Estimated Distance from Store</label>
                  <select
                    value={distance}
                    onChange={(e) => { setDistance(Number(e.target.value)); setResult(null); }}
                    className="w-full border border-border-light bg-bg-light rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none focus:ring-2 focus:ring-accent transition-shadow"
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
                className="w-full bg-accent text-white font-bold py-3 rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 disabled:opacity-40 disabled:hover:translate-y-0"
              >
                Estimate Delivery Cost
              </button>
            </div>

            {result && (
              <div className={`mt-6 rounded-xl p-6 animate-fade-up ${result.zone === "NoHo Zone" ? "bg-accent text-white" : result.zone === "Out of Range" ? "bg-danger-soft text-danger" : "bg-bg-light border border-border-light"}`}>
                <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-70">{result.zone}</p>
                <p className="text-4xl font-extrabold tracking-tight mb-2">{result.price}</p>
                <p className={`text-sm ${result.zone === "NoHo Zone" ? "text-white/70" : result.zone === "Out of Range" ? "text-danger" : "text-text-light-muted"}`}>{result.note}</p>
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
              className="bg-surface-light border border-border-light rounded-2xl p-10 text-center shadow-[var(--shadow-md)] animate-scale-in"
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
                    className="bg-accent text-white font-bold px-8 py-4 rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-lg"
                  >
                    Start Delivery Request
                  </button>
                </div>
              ) : (
                <form
                  action={formAction}
                  className="bg-surface-light border border-border-light rounded-2xl p-8 space-y-4 shadow-[var(--shadow-md)] animate-scale-in"
                >
                  {state.error && (
                    <p className="text-danger text-sm bg-danger-soft p-3 rounded-xl">{state.error}</p>
                  )}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-text-light mb-1">Full Name</label>
                      <input required name="customerName" type="text" placeholder="John Doe" className="w-full border border-border-light bg-bg-light rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-text-light mb-1">Phone</label>
                      <input required name="phone" type="tel" placeholder="(818) 555-0100" className="w-full border border-border-light bg-bg-light rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-light mb-1">Email</label>
                    <input required name="email" type="email" placeholder="you@example.com" className="w-full border border-border-light bg-bg-light rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-light mb-1">Pickup Address</label>
                    <input name="pickupAddr" type="text" defaultValue="NOHO Mailbox Store (Default)" className="w-full border border-border-light bg-bg-light rounded-xl px-4 py-3 text-sm text-text-light-muted focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-light mb-1">Delivery Address</label>
                    <input required name="destination" type="text" placeholder="123 Main St, Los Angeles, CA" className="w-full border border-border-light bg-bg-light rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none focus:ring-2 focus:ring-accent" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-bold text-text-light mb-1">Zip Code</label>
                      <input required name="zip" type="text" maxLength={5} placeholder="91601" className="w-full border border-border-light bg-bg-light rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none focus:ring-2 focus:ring-accent" />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-text-light mb-1">Item Type</label>
                      <select required name="itemType" className="w-full border border-border-light bg-bg-light rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none focus:ring-2 focus:ring-accent">
                        <option value="">Select type</option>
                        <option value="Letter">Letter / Envelope</option>
                        <option value="Package">Package</option>
                        <option value="Documents">Legal Documents</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-text-light mb-1">Special Instructions <span className="text-text-light-muted/40 font-normal">(optional)</span></label>
                    <textarea name="instructions" rows={3} placeholder="Any details about the delivery..." className="w-full border border-border-light bg-bg-light rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none focus:ring-2 focus:ring-accent resize-none" />
                  </div>
                  <input type="hidden" name="distance" value={distance || ""} />
                  <button
                    type="submit"
                    disabled={pending}
                    className="w-full bg-accent text-white font-bold py-3 rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-50"
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
              { icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><rect x="6" y="14" width="36" height="28" rx="4" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2.5" /><rect x="14" y="4" width="20" height="14" rx="3" fill="#3374B5" stroke="#1A1714" strokeWidth="2" /></svg>, label: "Packages" },
              { icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><rect x="8" y="4" width="32" height="40" rx="4" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2.5" /><path d="M16 14 L32 14 M16 22 L32 22 M16 30 L26 30" stroke="#3374B5" strokeWidth="2" strokeLinecap="round" /></svg>, label: "Legal Documents" },
              { icon: <MailboxIcon className="w-10 h-10" />, label: "Business Mail" },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-surface-light border border-border-light rounded-xl p-6 text-center shadow-sm hover-lift animate-fade-up"
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
          className="relative max-w-3xl mx-auto rounded-3xl p-12 text-center overflow-hidden bg-bg-dark shadow-xl animate-fade-up"
        >
          <div className="absolute top-[-30%] right-[-10%] w-[300px] h-[300px] rounded-full opacity-15 blur-[100px] pointer-events-none bg-accent" />
          <div className="relative z-10">
            <h2 className="text-3xl font-extrabold tracking-tight text-text-dark mb-3">Need a Mailbox Too?</h2>
            <p className="text-text-dark-muted mb-8">Members get delivery requests right from their dashboard.</p>
            <Link
              href="/signup"
              className="bg-accent text-white font-bold px-8 py-4 rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-lg inline-block"
            >
              Get a Mailbox
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
