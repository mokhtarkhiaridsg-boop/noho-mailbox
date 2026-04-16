"use client";

import { useState } from "react";
import { QuestionIcon } from "@/components/BrandIcons";

const faqs = [
  { category: "Getting Started", question: "What do I need to sign up for a mailbox?", answer: "You'll need two valid government-issued photo IDs (e.g., driver's license + passport) and a completed USPS Form 1583. We'll help you fill out the form in-store and notarize it on the spot." },
  { category: "Getting Started", question: "What is USPS Form 1583?", answer: "It's a form required by the USPS that authorizes us to receive mail on your behalf. You must complete it in person with a valid ID, and it must be notarized. We handle the notarization for free when you sign up." },
  { category: "Getting Started", question: "Do I get a real street address?", answer: "Yes! You receive a real street address with a unique suite number — not a P.O. Box. You can use it for personal mail, business registration, banking, and more." },
  { category: "Mail & Packages", question: "How does mail scanning work?", answer: "When mail arrives, we scan the exterior and upload it to your secure online dashboard. You can then choose to open & scan the contents, forward it, or have it shredded." },
  { category: "Mail & Packages", question: "Do you accept packages from all carriers?", answer: "Yes — we accept packages from USPS, UPS, FedEx, DHL, Amazon, and any other delivery service. You'll receive an instant notification when a package arrives." },
  { category: "Mail & Packages", question: "How long will you hold my mail and packages?", answer: "We hold mail and packages for up to 30 days. If you need extended holding, just let us know and we can arrange it." },
  { category: "Mail & Packages", question: "Can I request mail to be shredded?", answer: "Absolutely. From your dashboard, click 'Discard' on any mail item and we'll securely shred and dispose of it." },
  { category: "Delivery Service", question: "How does same-day delivery work?", answer: "Request a delivery through our website or dashboard. We dispatch a local courier who picks up your mail or packages from our store and delivers them to your address — same day." },
  { category: "Delivery Service", question: "What are the delivery zones and pricing?", answer: "North Hollywood zone deliveries are a flat $5. For addresses outside NoHo, pricing starts at $9.75 for under 5 miles, plus $0.75 per additional mile (up to 15 miles max)." },
  { category: "Delivery Service", question: "Do I need to be a mailbox member to use delivery?", answer: "No! Our same-day delivery service is open to anyone. You can request a delivery directly from our website." },
  { category: "Pricing & Plans", question: "What plans do you offer?", answer: "We offer three plans — Basic Box, Business Box, and Premium Box — each available in 3-month, 6-month, or 14-month terms. Business Box is our most popular, and Premium includes mail forwarding, priority processing, and notary discounts." },
  { category: "Pricing & Plans", question: "Are there any hidden fees or setup costs?", answer: "No hidden fees. The price you see is the price you pay. There's no setup fee — just bring your IDs and you're good to go." },
  { category: "Pricing & Plans", question: "Can I upgrade or change my plan?", answer: "Yes, you can upgrade at any time. The price difference is prorated for the remaining term. Contact us in-store or through the dashboard." },
  { category: "Notary", question: "Do I need an appointment for notary services?", answer: "Walk-ins are welcome based on availability, but we recommend booking online to guarantee your appointment time." },
  { category: "Notary", question: "What documents can you notarize?", answer: "We notarize legal documents, real estate transactions, business agreements, affidavits, power of attorney, contracts, loan documents, and identity verifications." },
  { category: "Notary", question: "Do Premium members get a notary discount?", answer: "Yes — Premium Box subscribers receive a discounted notary rate. Ask about your member pricing when booking." },
  { category: "Business Solutions", question: "What's included in the $2,000 Business Solutions package?", answer: "LLC/DBA/S-Corp formation, EIN, all required filings, a full brand book, branding assets, a live website with hosting, SEO setup, social media profiles, Google Business profile, and 12 months of mail service." },
  { category: "Business Solutions", question: "How long does the business formation process take?", answer: "Most packages are completed within 2-4 weeks. We handle everything from filing to branding to website launch, so you can focus on your business." },
];

const categories = [...new Set(faqs.map((f) => f.category))];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.answer,
    },
  })),
};

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = activeCategory === "all" ? faqs : faqs.filter((f) => f.category === activeCategory);

  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 animate-float">
            <QuestionIcon className="w-20 h-20 mx-auto" />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            FAQ
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            Everything you need to know about NOHO Mailbox — from sign-up to delivery.
          </p>
        </div>
      </section>

      {/* Category filter + Accordion */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mb-10 justify-center animate-fade-up">
            <button
              onClick={() => { setActiveCategory("all"); setOpenIndex(null); }}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeCategory === "all" ? "bg-bg-dark text-text-dark" : "bg-surface-light text-text-light-muted hover:bg-surface-light/80"}`}
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setOpenIndex(null); }}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${activeCategory === cat ? "bg-bg-dark text-text-dark" : "bg-surface-light text-text-light-muted hover:bg-surface-light/80"}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Accordion */}
          <div className="space-y-3">
            {filtered.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <div
                  key={faq.question}
                  className="bg-surface-light rounded-xl overflow-hidden animate-fade-up shadow-[var(--shadow-sm)]"
                  style={{ animationDelay: `${(i % 5) * 0.05}s` }}
                >
                  <button
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
                  >
                    <div>
                      {activeCategory === "all" && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-accent block mb-1">{faq.category}</span>
                      )}
                      <span className="font-bold text-text-light text-sm">{faq.question}</span>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      className={`w-5 h-5 shrink-0 text-accent transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div className={`transition-all duration-300 ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}>
                    <p className="px-6 pb-5 text-sm text-text-light-muted leading-relaxed">{faq.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-bg-light">
        <div
          className="max-w-3xl mx-auto rounded-3xl p-12 text-center animate-fade-up bg-bg-dark shadow-xl"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-text-dark mb-3">Still Have Questions?</h2>
          <p className="text-text-dark-muted mb-8">We&apos;re here to help. Reach out anytime.</p>
          <a
            href="/contact"
            className="bg-accent text-white font-bold px-8 py-4 rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-lg inline-block"
          >
            Contact Us
          </a>
        </div>
      </section>
    </div>
  );
}
