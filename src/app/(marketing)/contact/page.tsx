"use client";

import Link from "next/link";
import { useActionState } from "react";
import { submitContact, type ContactState } from "@/app/actions/contact";

export default function ContactPage() {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(submitContact, {});

  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Contact Us
          </h1>
          <p className="text-text-dark-muted max-w-md mx-auto text-lg animate-fade-up delay-200">
            Ready to get a mailbox, book a notary, or start your business? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Form */}
          {state.success ? (
            <div className="bg-surface-light border border-border-light rounded-2xl p-8 animate-scale-in flex flex-col items-center justify-center text-center shadow-[var(--shadow-md)]">
              <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-success" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-xl font-extrabold tracking-tight text-text-light mb-2">Message Sent!</h3>
              <p className="text-text-light-muted text-sm">We&apos;ll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form
              action={formAction}
              className="space-y-5 bg-surface-light border border-border-light rounded-2xl p-8 animate-slide-left shadow-[var(--shadow-md)]"
            >
              <h2 className="font-extrabold tracking-tight text-text-light text-lg mb-2">Send a Message</h2>
              {state.error && (
                <p className="text-danger text-sm bg-danger/10 border border-danger/20 p-3 rounded-xl">{state.error}</p>
              )}
              <div>
                <label className="block text-sm font-bold text-text-light mb-1" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Your full name"
                  className="w-full border border-border-light bg-bg-light rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-text-light mb-1" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full border border-border-light bg-bg-light rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-text-light mb-1" htmlFor="service">
                  I&apos;m interested in
                </label>
                <select
                  id="service"
                  name="service"
                  className="w-full border border-border-light bg-bg-light rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none focus:ring-2 focus:ring-accent/50 transition-all"
                >
                  <option value="">Select a service</option>
                  <option value="mailbox">Getting a Mailbox</option>
                  <option value="notary">Notary Services</option>
                  <option value="business">Business Solutions (Full Package)</option>
                  <option value="formation">Business Formation & Filing</option>
                  <option value="branding">Brand Identity & Design</option>
                  <option value="brand-mgmt">Brand Management</option>
                  <option value="website">Website Development</option>
                  <option value="social">Social Media & Google Setup</option>
                  <option value="print">Print & Packaging Design</option>
                  <option value="other">Other / General Question</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-text-light mb-1" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  placeholder="Tell us more about what you need..."
                  className="w-full border border-border-light bg-bg-light rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none focus:ring-2 focus:ring-accent/50 resize-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="w-full bg-accent text-white font-bold py-3 rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-50"
              >
                {pending ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}

          {/* Info */}
          <div className="space-y-6 animate-slide-right">
            <div className="bg-surface-light border border-border-light rounded-2xl p-6 hover-lift shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-3 mb-3">
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                  <circle cx="16" cy="12" r="5" fill="#3374B5" stroke="#1A1714" strokeWidth="2" />
                  <path d="M8 28 C8 18 24 18 24 28" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
                </svg>
                <h3 className="font-extrabold tracking-tight text-text-light text-sm">Location</h3>
              </div>
              <p className="text-sm text-text-light-muted">
                5062 Lankershim Blvd<br />
                North Hollywood, CA 91601
              </p>
            </div>
            <div className="bg-surface-light border border-border-light rounded-2xl p-6 hover-lift shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-3 mb-3">
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                  <circle cx="16" cy="16" r="13" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
                  <path d="M16 8 L16 16 L22 20" stroke="#3374B5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="font-extrabold tracking-tight text-text-light text-sm">Hours</h3>
              </div>
              <p className="text-sm text-text-light-muted">
                Mon – Fri: 9:30am – 5:30pm<br />
                <span className="text-xs text-text-light-muted/70">(Break 1:30 – 2pm)</span><br />
                Saturday: 10am – 1:30pm<br />
                Sunday: Closed
              </p>
            </div>
            <div className="bg-surface-light border border-border-light rounded-2xl p-6 hover-lift shadow-[var(--shadow-sm)]">
              <div className="flex items-center gap-3 mb-3">
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                  <rect x="2" y="6" width="28" height="20" rx="4" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2" />
                  <path d="M4 8 L16 16 L28 8" stroke="#3374B5" strokeWidth="2" />
                </svg>
                <h3 className="font-extrabold tracking-tight text-text-light text-sm">Quick Links</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/pricing" className="text-accent hover:underline flex items-center gap-1">View Mailbox Plans <span>→</span></Link>
                </li>
                <li>
                  <Link href="/business-solutions" className="text-accent hover:underline flex items-center gap-1">Business Solutions Package <span>→</span></Link>
                </li>
                <li>
                  <Link href="/notary" className="text-accent hover:underline flex items-center gap-1">Notary Services <span>→</span></Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
