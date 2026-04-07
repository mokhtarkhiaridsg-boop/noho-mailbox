"use client";

import Link from "next/link";
import { MailboxIcon, EnvelopeIcon } from "@/components/BrandIcons";
import { useActionState } from "react";
import { submitContact, type ContactState } from "@/app/actions/contact";

export default function ContactPage() {
  const [state, formAction, pending] = useActionState<ContactState, FormData>(submitContact, {});

  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: "linear-gradient(135deg, #2D1D0F 0%, #1a120a 50%, #2D1D0F 100%)" }}>
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute top-10 left-16 animate-float"><EnvelopeIcon className="w-14 h-14 opacity-40" /></div>
          <div className="absolute bottom-10 right-16 animate-float delay-300"><MailboxIcon className="w-16 h-16 opacity-30" /></div>
        </div>
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-black uppercase text-[#F7E6C2] mb-6 animate-scale-in">
            Contact Us
          </h1>
          <p className="text-[#F7E6C2]/60 max-w-md mx-auto text-lg animate-fade-up delay-200">
            Ready to get a mailbox, book a notary, or start your business? We&apos;d love to hear from you.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-4 bg-[#F7E6C2]">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* Form */}
          {state.success ? (
            <div
              className="bg-white rounded-2xl p-8 animate-scale-in flex flex-col items-center justify-center text-center"
              style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
            >
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </div>
              <h3 className="text-xl font-black text-[#2D1D0F] mb-2">Message Sent!</h3>
              <p className="text-[#2D1D0F]/60 text-sm">We&apos;ll get back to you within 24 hours.</p>
            </div>
          ) : (
            <form
              action={formAction}
              className="space-y-5 bg-white rounded-2xl p-8 animate-slide-left"
              style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
            >
              <h2 className="font-black uppercase text-[#2D1D0F] text-lg mb-2">Send a Message</h2>
              {state.error && (
                <p className="text-red-600 text-sm bg-red-50 p-3 rounded-xl">{state.error}</p>
              )}
              <div>
                <label className="block text-sm font-bold text-[#2D1D0F] mb-1" htmlFor="name">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  placeholder="Your full name"
                  className="w-full border border-[#F7E6C2] bg-[#FFFDF8] rounded-xl px-4 py-3 text-sm text-[#2D1D0F] focus:outline-none focus:ring-2 focus:ring-[#3374B5] transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#2D1D0F] mb-1" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="w-full border border-[#F7E6C2] bg-[#FFFDF8] rounded-xl px-4 py-3 text-sm text-[#2D1D0F] focus:outline-none focus:ring-2 focus:ring-[#3374B5] transition-shadow"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-[#2D1D0F] mb-1" htmlFor="service">
                  I&apos;m interested in
                </label>
                <select
                  id="service"
                  name="service"
                  className="w-full border border-[#F7E6C2] bg-[#FFFDF8] rounded-xl px-4 py-3 text-sm text-[#2D1D0F] focus:outline-none focus:ring-2 focus:ring-[#3374B5] transition-shadow"
                >
                  <option value="">Select a service</option>
                  <option value="mailbox">Getting a Mailbox</option>
                  <option value="notary">Notary Services</option>
                  <option value="business">Business Solutions ($2,000 Package)</option>
                  <option value="other">Other / General Question</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-[#2D1D0F] mb-1" htmlFor="message">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  rows={5}
                  required
                  placeholder="Tell us more about what you need..."
                  className="w-full border border-[#F7E6C2] bg-[#FFFDF8] rounded-xl px-4 py-3 text-sm text-[#2D1D0F] focus:outline-none focus:ring-2 focus:ring-[#3374B5] resize-none transition-shadow"
                />
              </div>
              <button
                type="submit"
                disabled={pending}
                className="w-full bg-[#3374B5] text-white font-bold py-3 rounded-full hover:bg-[#2960A0] transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-50"
              >
                {pending ? "Sending..." : "Send Message"}
              </button>
            </form>
          )}

          {/* Info */}
          <div className="space-y-6 animate-slide-right">
            <div
              className="bg-white rounded-2xl p-6 hover-tilt"
              style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                  <circle cx="16" cy="12" r="5" fill="#3374B5" stroke="#2D1D0F" strokeWidth="2" />
                  <path d="M8 28 C8 18 24 18 24 28" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2" />
                </svg>
                <h3 className="font-black uppercase text-[#2D1D0F] text-sm">Location</h3>
              </div>
              <p className="text-sm text-[#2D1D0F]/70">
                North Hollywood, CA<br />
                (Full address provided upon sign-up)
              </p>
            </div>
            <div
              className="bg-white rounded-2xl p-6 hover-tilt"
              style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                  <circle cx="16" cy="16" r="13" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2" />
                  <path d="M16 8 L16 16 L22 20" stroke="#3374B5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="font-black uppercase text-[#2D1D0F] text-sm">Hours</h3>
              </div>
              <p className="text-sm text-[#2D1D0F]/70">
                Monday – Friday: 9am – 6pm<br />
                Saturday: 10am – 4pm<br />
                Sunday: Closed
              </p>
            </div>
            <div
              className="bg-white rounded-2xl p-6 hover-tilt"
              style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
            >
              <div className="flex items-center gap-3 mb-3">
                <svg viewBox="0 0 32 32" className="w-6 h-6" fill="none">
                  <rect x="2" y="6" width="28" height="20" rx="4" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2" />
                  <path d="M4 8 L16 16 L28 8" stroke="#3374B5" strokeWidth="2" />
                </svg>
                <h3 className="font-black uppercase text-[#2D1D0F] text-sm">Quick Links</h3>
              </div>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/pricing" className="text-[#3374B5] hover:underline flex items-center gap-1">View Mailbox Plans <span>→</span></Link>
                </li>
                <li>
                  <Link href="/business-solutions" className="text-[#3374B5] hover:underline flex items-center gap-1">Business Solutions Package <span>→</span></Link>
                </li>
                <li>
                  <Link href="/notary" className="text-[#3374B5] hover:underline flex items-center gap-1">Notary Services <span>→</span></Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
