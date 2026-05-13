"use client";

import { useState } from "react";
import type { FaqEntry } from "./faq-data";

type Props = { faqs: FaqEntry[]; categories: string[] };

export default function FAQClient({ faqs, categories }: Props) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [query, setQuery] = useState("");

  const filtered = (activeCategory === "all" ? faqs : faqs.filter((f) => f.category === activeCategory))
    .filter((f) =>
      query.trim() === ""
        ? true
        : (f.question + " " + f.answer).toLowerCase().includes(query.trim().toLowerCase())
    );

  return (
    <div className="perspective-container" style={{ background: "#FFFDF8" }}>
      {/* Hero — cream + brown iPad-OS style */}
      <section
        className="relative px-5 sm:px-6 pt-12 pb-10 sm:pt-20 sm:pb-14 overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at top, #F7E6C2 0%, #F0DBA9 45%, #E8DDD0 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(#2D100F 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          aria-hidden="true"
        />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <h1
            className="font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: "#2D100F",
              fontSize: "clamp(2rem, 6vw, 3.5rem)",
              lineHeight: 1.05,
            }}
          >
            Frequently asked{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: "#337485",
                fontWeight: 400,
              }}
            >
              questions
            </span>
          </h1>
          <p
            className="mt-3 sm:mt-4 max-w-md mx-auto text-[14.5px] sm:text-base"
            style={{ color: "#5C4540" }}
          >
            Everything you need to know about NOHO Mailbox — from sign-up to delivery.
          </p>

          {/* Search */}
          <div className="mt-6 sm:mt-8 mx-auto max-w-xl">
            <div
              className="relative flex items-center rounded-full overflow-hidden bg-white"
              style={{ border: "1px solid #E8DDD0", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 14px 36px rgba(45,16,15,0.10)" }}
            >
              <span className="absolute left-4 sm:left-5 pointer-events-none" style={{ color: "#7A6B57" }}>
                <svg viewBox="0 0 20 20" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="9" cy="9" r="6" />
                  <path d="m18 18-4.5-4.5" />
                </svg>
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search the FAQ…"
                className="flex-1 pl-11 sm:pl-12 pr-4 py-3 sm:py-3.5 text-[15px] sm:text-base bg-transparent focus:outline-none"
                style={{ color: "#2D100F", fontFamily: "var(--font-inter), system-ui, sans-serif" }}
                aria-label="Search the FAQ"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Personality strip */}
      <div
        className="py-3 px-5 sm:px-6 text-center text-[12.5px] sm:text-sm font-semibold"
        style={{ background: "#2D100F", color: "#F7E6C2" }}
      >
        Can&apos;t find your answer? Stop by in person or{" "}
        <a href="/contact" className="underline font-bold" style={{ color: "#F0DBA9" }}>send us a message</a>
        {" "}— we&apos;re happy to help.
      </div>

      {/* Category pills + accordion */}
      <section className="px-5 sm:px-6 py-12 sm:py-16 md:py-20" style={{ background: "#FFFDF8" }}>
        <div className="max-w-3xl mx-auto">
          {/* Category pills */}
          <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-6 sm:mb-8 justify-center overflow-x-auto pb-1 -mx-1 px-1">
            <button
              type="button"
              onClick={() => { setActiveCategory("all"); setOpenIndex(null); }}
              className="shrink-0 px-3.5 sm:px-4 py-2 rounded-full text-[11.5px] sm:text-[12px] font-bold uppercase tracking-wider transition-colors"
              style={
                activeCategory === "all"
                  ? { background: "#2D100F", color: "#F7E6C2", border: "1px solid #2D100F" }
                  : { background: "#FFFFFF", color: "#2D100F", border: "1px solid #E8DDD0" }
              }
            >
              All
            </button>
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => { setActiveCategory(cat); setOpenIndex(null); }}
                className="shrink-0 px-3.5 sm:px-4 py-2 rounded-full text-[11.5px] sm:text-[12px] font-bold uppercase tracking-wider transition-colors"
                style={
                  activeCategory === cat
                    ? { background: "#2D100F", color: "#F7E6C2", border: "1px solid #2D100F" }
                    : { background: "#FFFFFF", color: "#2D100F", border: "1px solid #E8DDD0" }
                }
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Empty-state when search filters out everything */}
          {filtered.length === 0 && (
            <div
              className="rounded-2xl p-8 text-center"
              style={{ background: "#FFFFFF", border: "1px solid #E8DDD0", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
            >
              <p className="text-[15px] font-bold mb-1" style={{ color: "#2D100F" }}>No matches</p>
              <p className="text-[13px]" style={{ color: "#5C4540" }}>
                Try a different keyword or{" "}
                <a href="/contact" className="font-bold underline" style={{ color: "#337485" }}>
                  ask us directly
                </a>
                .
              </p>
            </div>
          )}

          {/* Accordion */}
          <div className="space-y-2.5 sm:space-y-3">
            {filtered.map((faq, i) => {
              const isOpen = openIndex === i;
              return (
                <div
                  key={faq.question}
                  className="rounded-2xl overflow-hidden transition-all"
                  style={{
                    background: "#FFFFFF",
                    border: `1px solid ${isOpen ? "#F0DBA9" : "#E8DDD0"}`,
                    boxShadow: isOpen
                      ? "0 1px 3px rgba(0,0,0,0.04), 0 12px 28px rgba(45,16,15,0.10)"
                      : "0 1px 2px rgba(0,0,0,0.03)",
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : i)}
                    aria-expanded={isOpen}
                    aria-controls={`faq-answer-${i}`}
                    id={`faq-question-${i}`}
                    className="w-full text-left px-5 sm:px-6 py-4 sm:py-5 flex items-center justify-between gap-4 transition-colors"
                    style={{ minHeight: 56 }}
                  >
                    <div className="min-w-0">
                      {activeCategory === "all" && (
                        <span className="text-[10.5px] font-bold uppercase tracking-[0.14em] block mb-1" style={{ color: "#337485" }}>
                          {faq.category}
                        </span>
                      )}
                      <span className="font-bold text-[14.5px] sm:text-[15px] leading-snug" style={{ color: "#2D100F" }}>{faq.question}</span>
                    </div>
                    <svg
                      viewBox="0 0 24 24"
                      className={`w-5 h-5 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
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
                    className="overflow-hidden"
                  >
                    <p className="px-5 sm:px-6 pb-5 text-[14px] leading-relaxed" style={{ color: "#5C4540" }}>{faq.answer}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA — dark brown */}
      <section
        className="px-5 sm:px-6 py-12 sm:py-16"
        style={{ background: "linear-gradient(160deg, #2D100F 0%, #1F0807 100%)" }}
      >
        <div className="max-w-3xl mx-auto rounded-3xl text-center p-8 sm:p-10">
          <h2
            className="font-extrabold tracking-tight"
            style={{
              color: "#F7E6C2",
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              fontSize: "clamp(1.5rem, 5vw, 2.25rem)",
              lineHeight: 1.05,
            }}
          >
            Still have questions?{" "}
            <span style={{ fontFamily: "var(--font-pacifico), 'Pacifico', cursive", color: "#F0DBA9", fontWeight: 400 }}>
              we&apos;re here
            </span>
          </h2>
          <p className="mt-2 sm:mt-3 text-[14px] sm:text-base" style={{ color: "#F0DBA9" }}>Reach out anytime — by message, phone, or walk-in.</p>
          <a
            href="/contact"
            className="mt-6 inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
            style={{ background: "#F7E6C2", color: "#2D100F", minHeight: 48 }}
          >
            Contact us
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none"><path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </a>
        </div>
      </section>
    </div>
  );
}
