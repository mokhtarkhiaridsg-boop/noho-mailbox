"use client";

import { useState } from "react";
import { QuestionIcon } from "@/components/BrandIcons";
import type { FaqEntry } from "./faq-data";

type Props = { faqs: FaqEntry[]; categories: string[] };

export default function FAQClient({ faqs, categories }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const filtered = activeCategory === "all" ? faqs : faqs.filter((f) => f.category === activeCategory);

  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 animate-float">
            <QuestionIcon className="w-20 h-20 mx-auto" />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Frequently Asked Questions
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            Everything you need to know about NOHO Mailbox — from sign-up to delivery.
          </p>
        </div>
      </section>

      {/* Warm cream personality strip */}
      <div
        className="py-4 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Can&apos;t find your answer? Stop by in person or{" "}
        <a href="/contact" className="underline font-bold" style={{ color: "#8A5520" }}>send us a message</a>
        {" "}— we&apos;re happy to help.
      </div>

      {/* Category filter + Accordion */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          {/* Category pills */}
          <div className="flex flex-wrap gap-2 mb-10 justify-center animate-fade-up">
            <button type="button"
              onClick={() => { setActiveCategory("all"); setOpenIndex(null); }}
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
              style={
                activeCategory === "all"
                  ? { background: "#110E0B", color: "#F8F2EA" }
                  : { background: "#FFF9F3", color: "#7A6050", border: "1px solid #E8D8C4" }
              }
            >
              All
            </button>
            {categories.map((cat) => (
              <button type="button"
                key={cat}
                onClick={() => { setActiveCategory(cat); setOpenIndex(null); }}
                className="px-4 py-2 rounded-xl text-sm font-bold transition-all"
                style={
                  activeCategory === cat
                    ? { background: "#110E0B", color: "#F8F2EA" }
                    : { background: "#FFF9F3", color: "#7A6050", border: "1px solid #E8D8C4" }
                }
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
                  className="rounded-xl overflow-hidden animate-fade-up"
                  style={{
                    background: "#FFF9F3",
                    border: isOpen ? "1px solid #D8C8B4" : "1px solid #E8D8C4",
                    boxShadow: isOpen ? "0 4px 16px rgba(176,112,48,0.12)" : "var(--shadow-sm)",
                    animationDelay: `${(i % 5) * 0.05}s`,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${i}`}
                    id={`faq-question-${i}`}
                    className="w-full text-left px-6 py-5 flex items-center justify-between gap-4"
                  >
                    <div>
                      {activeCategory === "all" && (
                        <span className="text-[10px] font-bold uppercase tracking-widest block mb-1" style={{ color: "#337485" }}>
                          {faq.category}
                        </span>
                      )}
                      <span className="font-bold text-text-light text-sm">{faq.question}</span>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      className={`w-5 h-5 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      style={{ color: "#337485" }}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      aria-hidden="true"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <div
                    id={`faq-answer-${i}`}
                    role="region"
                    aria-labelledby={`faq-question-${i}`}
                    hidden={!isOpen}
                    className={`transition-all duration-300 ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"} overflow-hidden`}
                  >
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
          className="max-w-3xl mx-auto rounded-3xl p-12 text-center animate-fade-up shadow-xl"
          style={{ background: "#110E0B" }}
        >
          <h2 className="text-3xl font-extrabold tracking-tight mb-3" style={{ color: "#F8F2EA" }}>Still Have Questions?</h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>We&apos;re here to help. Reach out anytime.</p>
          <a
            href="/contact"
            className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg inline-block text-white"
            style={{ background: "#337485" }}
          >
            Contact Us
          </a>
        </div>
      </section>
    </div>
  );
}
