"use client";

import { useState } from "react";
import Link from "next/link";

type Plan = "basic" | "business" | "premium";
type Choice = { label: string; weight: { basic: number; business: number; premium: number } };
type Question = { id: string; prompt: string; options: Choice[] };

const QUESTIONS: Question[] = [
  {
    id: "use-case",
    prompt: "What&apos;s your main use case?",
    options: [
      {
        label: "Side hustle / hobby business",
        weight: { basic: 3, business: 1, premium: 0 },
      },
      {
        label: "Etsy / Amazon / Shopify store",
        weight: { basic: 2, business: 3, premium: 1 },
      },
      {
        label: "LLC + EIN (formal business)",
        weight: { basic: 0, business: 3, premium: 2 },
      },
      {
        label: "High-volume operator (lots of mail)",
        weight: { basic: 0, business: 1, premium: 4 },
      },
      {
        label: "Frequent traveler / digital nomad",
        weight: { basic: 1, business: 2, premium: 3 },
      },
    ],
  },
  {
    id: "scan-volume",
    prompt: "How much mail do you expect per month?",
    options: [
      { label: "1-10 pieces (light)", weight: { basic: 4, business: 1, premium: 0 } },
      {
        label: "10-25 pieces (Basic plan&apos;s free tier)",
        weight: { basic: 3, business: 2, premium: 0 },
      },
      {
        label: "25-50 pieces (would pay extra on Basic)",
        weight: { basic: 1, business: 3, premium: 2 },
      },
      {
        label: "50+ pieces (Premium pays for itself)",
        weight: { basic: 0, business: 0, premium: 5 },
      },
    ],
  },
  {
    id: "notarization",
    prompt: "Do you need notarized Form 1583?",
    options: [
      {
        label: "Yes — I need to set up the CMRA legally (required for most uses)",
        weight: { basic: 0, business: 4, premium: 4 },
      },
      {
        label: "I&apos;ll get it notarized myself elsewhere",
        weight: { basic: 3, business: 1, premium: 1 },
      },
      {
        label: "Not sure / depends",
        weight: { basic: 1, business: 3, premium: 2 },
      },
    ],
  },
  {
    id: "delivery",
    prompt: "Will you use same-day local delivery?",
    options: [
      { label: "No — I&apos;m not in LA", weight: { basic: 3, business: 2, premium: 1 } },
      {
        label: "Maybe — once or twice a month",
        weight: { basic: 2, business: 3, premium: 1 },
      },
      {
        label: "Yes — I&apos;ll use it weekly",
        weight: { basic: 0, business: 1, premium: 4 },
      },
      {
        label: "Yes — I&apos;ll use it 5+ times per week",
        weight: { basic: 0, business: 0, premium: 5 },
      },
    ],
  },
  {
    id: "speed",
    prompt: "How fast do you need scans turned around?",
    options: [
      {
        label: "Standard (within 24 hours) is fine",
        weight: { basic: 4, business: 2, premium: 0 },
      },
      {
        label: "Same-day if before 2pm cutoff",
        weight: { basic: 0, business: 4, premium: 2 },
      },
      {
        label: "Priority — within an hour",
        weight: { basic: 0, business: 1, premium: 5 },
      },
    ],
  },
];

type Result = {
  plan: Plan;
  title: string;
  price: string;
  monthly: string;
  highlights: string[];
  body: string;
};

const RESULTS: Record<Plan, Result> = {
  basic: {
    plan: "basic",
    title: "Basic plan is your fit.",
    price: "$50 / 3 months",
    monthly: "$16.67/mo",
    highlights: [
      "Real LA street address (USPS-CMRA certified)",
      "25 free scans per month, $2/page after",
      "Walk-in pickup Mon-Sat",
      "Mail forwarding at postage + $5",
    ],
    body:
      "You&apos;re using the address for casual / light use. Basic gives you everything most side-hustlers need without paying for features you wouldn&apos;t use.",
  },
  business: {
    plan: "business",
    title: "Business plan is your fit.",
    price: "$80 / 3 months",
    monthly: "$26.67/mo",
    highlights: [
      "Everything in Basic, plus:",
      "Free notarized Form 1583 (saves $25 setup)",
      "Priority scanning (same-day if before 2pm)",
      "Unlimited cards on profile (multiple businesses on one box)",
      "Best fit for LLCs / S-corps / e-commerce brands",
    ],
    body:
      "You&apos;re running a real business and need the LLC-grade features. Business gives you free notary on Form 1583 (saves $25) plus same-day scanning that catches important mail faster.",
  },
  premium: {
    plan: "premium",
    title: "Premium plan is your fit.",
    price: "$295 / 3 months",
    monthly: "$98.33/mo",
    highlights: [
      "Everything in Business, plus:",
      "UNLIMITED mail scans (no per-page fee)",
      "$5 same-day local delivery in NoHo + Burbank + Studio City",
      "One international forward/month at no markup",
      "Priority support (1-hour response time during business hours)",
    ],
    body:
      "You&apos;re a high-volume operator. Premium pays for itself if you scan 50+ pieces per month or use same-day delivery 5+ times. The unlimited scans alone save 50-100/mo for heavy users.",
  },
};

export default function PlanPickerClient() {
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState(false);

  const totalAnswered = Object.keys(answers).length;
  const allAnswered = totalAnswered === QUESTIONS.length;

  function setAnswer(qid: string, idx: number) {
    setAnswers((prev) => ({ ...prev, [qid]: idx }));
  }

  function compute(): Result {
    const totals = { basic: 0, business: 0, premium: 0 };
    for (const q of QUESTIONS) {
      const idx = answers[q.id];
      if (idx === undefined) continue;
      const choice = q.options[idx];
      totals.basic += choice.weight.basic;
      totals.business += choice.weight.business;
      totals.premium += choice.weight.premium;
    }
    let winner: Plan = "basic";
    if (totals.business > totals[winner]) winner = "business";
    if (totals.premium > totals[winner]) winner = "premium";
    return RESULTS[winner];
  }

  if (submitted) {
    const r = compute();
    const accentColor =
      r.plan === "premium"
        ? "#B07030"
        : r.plan === "business"
          ? "#337485"
          : "#15803d";

    return (
      <div
        className="rounded-2xl p-8"
        style={{
          background: "#FFFFFF",
          border: `2px solid ${accentColor}`,
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div className="text-center">
          <p
            className="text-[10px] font-bold uppercase tracking-widest mb-3"
            style={{ color: accentColor }}
          >
            YOUR RECOMMENDATION
          </p>
          <h2
            className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4"
            style={{ color: "#2D100F" }}
            dangerouslySetInnerHTML={{ __html: r.title }}
          />
          <p
            className="text-3xl font-extrabold tracking-tight mb-1"
            style={{ color: accentColor }}
          >
            {r.price}
          </p>
          <p className="text-text-light-muted text-sm mb-6">
            ({r.monthly})
          </p>
          <p
            className="text-text-light-muted text-base leading-relaxed mb-6 max-w-md mx-auto"
            dangerouslySetInnerHTML={{ __html: r.body }}
          />
          <ul className="text-left max-w-md mx-auto space-y-2 mb-6">
            {r.highlights.map((h, i) => (
              <li
                key={i}
                className="flex gap-2 items-start text-sm text-text-light"
              >
                <span style={{ color: accentColor }}>✓</span>
                <span dangerouslySetInnerHTML={{ __html: h }} />
              </li>
            ))}
          </ul>
          <Link
            href="/pricing"
            className="inline-block font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
            style={{
              background: accentColor,
              color: "#fff",
              boxShadow: "var(--shadow-md)",
            }}
          >
            Sign up for {r.plan.charAt(0).toUpperCase() + r.plan.slice(1)} →
          </Link>
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setSubmitted(false);
            }}
            className="mt-6 block mx-auto text-xs font-bold underline"
            style={{ color: "#7A6050" }}
          >
            Take the quiz again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {QUESTIONS.map((q, qi) => {
        const selected = answers[q.id];
        return (
          <div
            key={q.id}
            className="rounded-2xl p-6"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8D8C4",
              boxShadow: "var(--shadow-sm)",
            }}
          >
            <p
              className="text-[10px] font-bold uppercase tracking-widest mb-2"
              style={{ color: "#7A6050" }}
            >
              Question {qi + 1} of {QUESTIONS.length}
            </p>
            <h3
              className="font-extrabold tracking-tight text-text-light text-lg mb-4"
              dangerouslySetInnerHTML={{ __html: q.prompt }}
            />
            <div className="space-y-2">
              {q.options.map((opt, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setAnswer(q.id, i)}
                  className="w-full text-left rounded-lg px-4 py-3 text-sm font-semibold transition-all"
                  style={{
                    background: selected === i ? "#337485" : "#FFF9F3",
                    color: selected === i ? "#fff" : "#2D100F",
                    border:
                      selected === i
                        ? "1px solid #337485"
                        : "1px solid #E8D8C4",
                  }}
                  dangerouslySetInnerHTML={{ __html: opt.label }}
                />
              ))}
            </div>
          </div>
        );
      })}

      <button
        type="button"
        onClick={() => allAnswered && setSubmitted(true)}
        disabled={!allAnswered}
        className="w-full font-bold px-6 py-4 rounded-xl transition-all"
        style={{
          background: allAnswered ? "#337485" : "#D6CABA",
          color: "#fff",
          cursor: allAnswered ? "pointer" : "not-allowed",
          boxShadow: allAnswered ? "var(--shadow-md)" : "none",
        }}
      >
        {allAnswered
          ? "Show my plan recommendation →"
          : `Answer all ${QUESTIONS.length} questions to see your plan (${totalAnswered}/${QUESTIONS.length})`}
      </button>
    </div>
  );
}
