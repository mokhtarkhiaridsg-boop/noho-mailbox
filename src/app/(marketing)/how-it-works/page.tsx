import type { Metadata } from "next";
import Link from "next/link";
import { AiBolt, AiClock } from "@/components/AnimatedIcons";

export const metadata: Metadata = {
  title: "How It Works — From Signup to Suite in 15 Minutes",
  description:
    "Step-by-step guide to renting a private mailbox at NOHO Mailbox: pick a plan, sign up online, verify your ID with USPS Form 1583, and get your real street address suite — all in about 15 minutes.",
  openGraph: {
    title: "How NOHO Mailbox Works — Real Address in 15 Minutes",
    description: "Pick a plan, sign up online, verify ID, get your suite #. Everything you need to know.",
    url: "https://nohomailbox.org/how-it-works",
  },
  alternates: { canonical: "https://nohomailbox.org/how-it-works" },
};

const steps = [
  {
    n: "01",
    title: "Pick Your Plan",
    duration: "1 minute",
    desc:
      "Choose Basic, Business, or Premium. All plans include a real street address (5062 Lankershim Blvd, Suite #—), unlimited mail intake, package alerts, and dashboard access. No long-term contracts.",
    bullets: [
      "Basic — $50 / 3 months — for personal mail and online shopping",
      "Business — $80 / 3 months — adds mail forwarding + priority handling",
      "Premium — $95 / 3 months — adds notary discount + concierge support",
      "All plans: 6-month and 14-month terms available at lower per-month rates",
      "One-time $15 mailbox key fee at signup",
    ],
  },
  {
    n: "02",
    title: "Create Your Account",
    duration: "3 minutes",
    desc:
      "Fill out a short online form: name, email, phone, mailing preferences. We don't run a credit check, ask for SSN, or require a deposit beyond the key fee. Pick the plan term and pay securely (Visa, MC, Amex, Apple Pay, Google Pay).",
    bullets: [
      "No credit check — we only need ID verification",
      "Pay securely with Square — instant receipt by email",
      "Add a second authorized recipient (spouse, business partner) at signup",
      "Choose SMS alerts, email-only, or both for new mail notifications",
    ],
  },
  {
    n: "03",
    title: "Verify Your Identity (USPS Form 1583)",
    duration: "5 minutes",
    desc:
      "Federal law (DMM 508.1.8) requires every mailbox renter to complete USPS Form 1583 with two forms of ID before mail can be delivered. We've digitized the entire process — no paper, no notary trip required.",
    bullets: [
      "Upload one primary ID (Driver's License, Passport, State ID)",
      "Upload one secondary ID (utility bill, lease, voter card, vehicle registration)",
      "We sign Form 1583 as the CMRA agent — you e-sign as the addressee",
      "Verification typically completes within 1 business hour during store hours",
      "Your information is encrypted and stored securely — required by USPS for 4 years after you cancel",
    ],
  },
  {
    n: "04",
    title: "Get Your Suite Number + Key",
    duration: "Instant after approval",
    desc:
      "The moment your ID is approved, your mailbox suite is live. Pick up your physical key in-store anytime during business hours — most customers grab it the same day they sign up.",
    bullets: [
      "You get a real address: 5062 Lankershim Blvd, Suite #__, North Hollywood, CA 91601",
      "Use it on driver's license, business registration, Amazon, banks — anywhere a P.O. Box is rejected",
      "Mailbox key issued in-store on first visit (one-time $15 fee already paid at signup)",
      "Lost key replacement: $25",
    ],
  },
  {
    n: "05",
    title: "Manage Mail From the Dashboard",
    duration: "Anytime",
    desc:
      "Every piece of mail and every package gets logged the moment it arrives. You'll get an instant SMS or email. From your dashboard you can request scans, forwarding, same-day local delivery, or just walk in to pick it up.",
    bullets: [
      "Scan request — $2 per page, delivered to your dashboard within 2 hours",
      "Forwarding — postage + $5 handling, scheduled or on-demand",
      "Same-day local delivery — $5 flat in NoHo, $10–$24 elsewhere in LA",
      "Vacation Mode — auto-hold mail, daily digest, batch resume",
      "Add a second user — give a family member or business partner read access",
      "Junk mail block — opt out of senders you don't want to see again",
    ],
  },
];

const faq = [
  {
    q: "Is this a P.O. Box or a real address?",
    a: "A real street address. Your mail comes to 5062 Lankershim Blvd, Suite #—, North Hollywood, CA 91601 — accepted by the DMV, banks, USPS, IRS, secretaries of state, Amazon, and any service that rejects P.O. Boxes.",
  },
  {
    q: "What is USPS Form 1583 and why do I need it?",
    a: "It's the federal form that authorizes us (a Commercial Mail Receiving Agency) to receive mail on your behalf. Required for every mailbox by federal law (DMM 508.1.8). We've digitized it — you complete it online in about 5 minutes with your two IDs. No notary visit.",
  },
  {
    q: "Which two IDs are accepted?",
    a: "Primary (one of): U.S. Driver's License, U.S. Passport, State ID, Permanent Resident Card, Military ID. Secondary (one of): Utility bill (within 60 days), Lease/mortgage statement, Vehicle registration, Voter registration card, Insurance policy. The address on at least one ID should match the address on Form 1583.",
  },
  {
    q: "How long does signup take?",
    a: "About 15 minutes total: 1 min to pick plan, 3 min to fill signup form + pay, 5 min to upload IDs, 1 min for our verification (during store hours), then your mailbox is live. Pick up your key in-store anytime that day or later.",
  },
  {
    q: "What if I don't get my password reset email?",
    a: "Call or text us at (818) 506-7744 and we'll send you a reset link directly within minutes. Mon–Fri 9:30am–5:30pm (lunch 1:30–2pm), Sat 10am–1:30pm.",
  },
  {
    q: "Can I add a second user to my mailbox?",
    a: "Yes. At signup or anytime from your dashboard, add a second authorized recipient. They can pick up mail in person (with their own ID) and you can also grant them dashboard access (read-only) so they see mail as it arrives.",
  },
  {
    q: "Can I put my mail on hold while I travel?",
    a: "Yes — Vacation Mode in your dashboard. Set start and end dates; we hold all mail during that window and send a daily digest of what's arrived. Resume anytime.",
  },
  {
    q: "Do you ship internationally?",
    a: "Yes. We forward mail and ship packages domestically and internationally via USPS, UPS, FedEx, and DHL. International rates calculated at the time of forwarding.",
  },
  {
    q: "How do I cancel?",
    a: "Email or call us — no cancellation fee, no questions asked. We give a 30-day grace period to forward any final mail to your new address. Note: USPS requires us to retain your records for 4 years after cancellation (legal requirement, not optional).",
  },
];

export default function HowItWorksPage() {
  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-20 px-5 overflow-hidden" style={{ background: "#F7E6C2" }}>
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, rgba(45,16,15,0.08) 1.5px, transparent 1.5px)",
          backgroundSize: "26px 26px",
        }} />
        <div aria-hidden="true" className="absolute -top-32 -right-32 w-[500px] h-[500px] rounded-full pointer-events-none" style={{ border: "60px solid #337485", opacity: 0.06 }} />

        <div className="max-w-3xl mx-auto text-center relative z-10">
          <p className="font-black mb-3" style={{ fontFamily: "var(--font-pacifico), cursive", fontSize: "1.1rem", color: "#337485" }}>
            How It Works
          </p>
          <h1
            className="font-extrabold tracking-tight leading-[1.05] mb-5"
            style={{
              fontFamily: "var(--font-baloo), sans-serif",
              fontSize: "clamp(2.4rem, 5.5vw, 4rem)",
              color: "#2D100F",
            }}
          >
            From Signup to Suite #<br />
            <span style={{ color: "#337485" }}>in About 15 Minutes</span>
          </h1>
          <p className="text-[16px] leading-relaxed max-w-xl mx-auto" style={{ color: "rgba(45,16,15,0.6)" }}>
            Five simple steps. Real federal compliance handled digitally. No paper Form 1583, no notary trip, no credit check — just two IDs and you&apos;re done.
          </p>

          <div className="mt-8 inline-flex items-center gap-2 px-4 py-2 rounded-full" style={{ background: "rgba(45,16,15,0.08)" }}>
            <AiBolt className="w-3.5 h-3.5" />
            <span className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#2D100F" }}>
              Most customers finish in under 15 minutes
            </span>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="py-20 px-5" style={{ background: "white" }}>
        <div className="max-w-4xl mx-auto space-y-16">
          {steps.map((s, i) => (
            <div key={s.n} className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-6 md:gap-10 items-start">
              {/* Step number column */}
              <div className="flex md:flex-col items-center md:items-start gap-4 md:gap-2">
                <div
                  className="font-extrabold leading-none"
                  style={{
                    fontFamily: "var(--font-baloo), sans-serif",
                    fontSize: "clamp(3rem, 6vw, 5rem)",
                    color: "#337485",
                    opacity: 0.92,
                  }}
                >
                  {s.n}
                </div>
                <div className="md:mt-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "rgba(45,16,15,0.5)" }}>
                    {s.duration}
                  </p>
                </div>
              </div>

              {/* Content column */}
              <div className="md:pt-2">
                <h2
                  className="font-extrabold tracking-tight mb-3"
                  style={{
                    fontFamily: "var(--font-baloo), sans-serif",
                    fontSize: "clamp(1.5rem, 3vw, 2.25rem)",
                    color: "#2D100F",
                  }}
                >
                  {s.title}
                </h2>
                <p className="text-[16px] leading-relaxed mb-5" style={{ color: "rgba(45,16,15,0.78)" }}>
                  {s.desc}
                </p>
                <ul className="space-y-2.5">
                  {s.bullets.map((b) => (
                    <li key={b} className="flex items-start gap-3 text-[14px] leading-relaxed" style={{ color: "rgba(45,16,15,0.7)" }}>
                      <span
                        aria-hidden="true"
                        className="shrink-0 mt-1 w-4 h-4 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(51,116,133,0.15)" }}
                      >
                        <svg viewBox="0 0 12 12" className="w-2.5 h-2.5" fill="none">
                          <path d="M2 6 L5 9 L10 3" stroke="#337485" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Connector line */}
              {i < steps.length - 1 && (
                <div className="hidden md:block md:col-start-1 md:row-start-2 mx-auto" style={{ width: "2px", height: "32px", background: "rgba(51,116,133,0.2)" }} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Required Documents Callout */}
      <section className="py-16 px-5" style={{ background: "#F7E6C2" }}>
        <div className="max-w-4xl mx-auto">
          <div
            className="rounded-3xl p-8 md:p-12"
            style={{
              background: "white",
              boxShadow: "0 12px 40px rgba(45,16,15,0.10)",
            }}
          >
            <p className="font-black mb-2" style={{ fontFamily: "var(--font-pacifico), cursive", fontSize: "1.1rem", color: "#337485" }}>
              Before You Start
            </p>
            <h2
              className="font-extrabold tracking-tight mb-6"
              style={{
                fontFamily: "var(--font-baloo), sans-serif",
                fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                color: "#2D100F",
              }}
            >
              What You&apos;ll Need
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="p-5 rounded-2xl" style={{ background: "rgba(51,116,133,0.06)" }}>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: "#337485" }}>
                  Primary ID (one of)
                </p>
                <ul className="space-y-1.5 text-[14px]" style={{ color: "rgba(45,16,15,0.78)" }}>
                  <li>• U.S. Driver&apos;s License</li>
                  <li>• U.S. Passport / Passport Card</li>
                  <li>• State-issued ID</li>
                  <li>• Permanent Resident Card</li>
                  <li>• Military ID</li>
                </ul>
              </div>
              <div className="p-5 rounded-2xl" style={{ background: "rgba(51,116,133,0.06)" }}>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] mb-2" style={{ color: "#337485" }}>
                  Secondary ID (one of)
                </p>
                <ul className="space-y-1.5 text-[14px]" style={{ color: "rgba(45,16,15,0.78)" }}>
                  <li>• Utility bill (within 60 days)</li>
                  <li>• Lease / mortgage statement</li>
                  <li>• Vehicle registration</li>
                  <li>• Voter registration card</li>
                  <li>• Auto insurance policy</li>
                </ul>
              </div>
            </div>
            <p className="mt-6 text-[13px] leading-relaxed" style={{ color: "rgba(45,16,15,0.6)" }}>
              <strong>Note:</strong> The address on at least one ID should match what you put on USPS Form 1583. Both IDs must be current — expired documents are rejected by federal regulation.
            </p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 px-5" style={{ background: "white" }}>
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <p className="font-black mb-2" style={{ fontFamily: "var(--font-pacifico), cursive", fontSize: "1.1rem", color: "#337485" }}>
              FAQ
            </p>
            <h2
              className="font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), sans-serif",
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                color: "#2D100F",
              }}
            >
              Common Questions
            </h2>
          </div>
          <div className="space-y-3">
            {faq.map((f, i) => (
              <details
                key={i}
                className="group rounded-2xl"
                style={{
                  background: "#FAFAF8",
                  border: "1px solid rgba(45,16,15,0.08)",
                }}
              >
                <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-4">
                  <span className="text-[15px] font-black" style={{ color: "#2D100F" }}>{f.q}</span>
                  <span
                    aria-hidden="true"
                    className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center transition-transform group-open:rotate-45"
                    style={{ background: "rgba(51,116,133,0.12)", color: "#337485" }}
                  >
                    <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
                      <path d="M6 1.5 V10.5 M1.5 6 H10.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                    </svg>
                  </span>
                </summary>
                <div className="px-5 pb-5 text-[14px] leading-relaxed" style={{ color: "rgba(45,16,15,0.72)" }}>
                  {f.a}
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-5 relative overflow-hidden" style={{ background: "#2D100F" }}>
        <div aria-hidden="true" className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle, rgba(247,230,194,0.06) 1.5px, transparent 1.5px)",
          backgroundSize: "30px 30px",
        }} />
        <div className="max-w-2xl mx-auto text-center relative z-10">
          <h2
            className="font-extrabold tracking-tight mb-4"
            style={{
              fontFamily: "var(--font-baloo), sans-serif",
              fontSize: "clamp(2rem, 5vw, 3.25rem)",
              color: "#F7E6C2",
            }}
          >
            Ready in 15 Minutes
          </h2>
          <p className="text-[15px] leading-relaxed mb-8" style={{ color: "rgba(247,230,194,0.6)" }}>
            Pick a plan, sign up online, upload two IDs, get your suite. We&apos;ll text you when verification is done.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              className="font-black px-8 py-4 rounded-2xl text-[15px] transition-all hover:scale-[1.02]"
              style={{ background: "#337485", color: "white", boxShadow: "0 6px 24px rgba(51,116,133,0.4)" }}
            >
              Start Signup →
            </Link>
            <Link
              href="/pricing"
              className="font-black px-8 py-4 rounded-2xl text-[15px] transition-all hover:bg-white/5"
              style={{ border: "2px solid rgba(247,230,194,0.2)", color: "#F7E6C2" }}
            >
              Compare Plans
            </Link>
          </div>
          <p className="mt-6 text-[12px]" style={{ color: "rgba(247,230,194,0.4)" }}>
            Questions?{" "}
            <a href="tel:+18185067744" className="font-bold hover:underline" style={{ color: "#F7E6C2" }}>
              (818) 506-7744
            </a>{" "}
            · Mon–Fri 9:30am–5:30pm (lunch 1:30–2pm) · Sat 10am–1:30pm
          </p>
        </div>
      </section>
    </div>
  );
}
