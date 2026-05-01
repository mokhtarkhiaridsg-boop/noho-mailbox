"use client";

import { useState } from "react";
import Link from "next/link";

type QuestionOption = {
  label: string;
  points: number;
};

type Question = {
  id: string;
  prompt: string;
  options: QuestionOption[];
};

const QUESTIONS: Question[] = [
  {
    id: "revenue",
    prompt: "What's your current annual revenue?",
    options: [
      { label: "Under $10,000 (just starting)", points: 0 },
      { label: "$10,000 – $30,000", points: 1 },
      { label: "$30,000 – $80,000", points: 3 },
      { label: "$80,000 – $200,000", points: 4 },
      { label: "$200,000+", points: 5 },
    ],
  },
  {
    id: "physical-product",
    prompt: "Do you sell anything physical that could harm a customer?",
    options: [
      { label: "No — services or digital products only", points: 0 },
      { label: "Maybe — accessories, prints, art (low risk)", points: 2 },
      {
        label: "Yes — food, candles, cosmetics, soap, supplements, kids&apos; products",
        points: 5,
      },
      {
        label: "Yes — anything with electrical, heat, sharp edges",
        points: 5,
      },
    ],
  },
  {
    id: "personal-assets",
    prompt: "How much in personal assets do you have at risk?",
    options: [
      { label: "Less than $5,000", points: 0 },
      { label: "$5,000 – $25,000 (savings, modest car)", points: 1 },
      { label: "$25,000 – $100,000 (significant savings)", points: 3 },
      { label: "$100,000+ (home equity, investments)", points: 4 },
    ],
  },
  {
    id: "service-business",
    prompt: "Are you in a service business where a client could sue over results?",
    options: [
      { label: "No — I sell products, not services", points: 0 },
      { label: "Yes — coaching, consulting, freelancing", points: 3 },
      {
        label: "Yes — health/wellness, financial advice, real estate",
        points: 4,
      },
      {
        label: "Yes — legal, medical, professional services with licensing",
        points: 5,
      },
    ],
  },
  {
    id: "real-estate",
    prompt: "Do you own (or plan to own) rental property?",
    options: [
      { label: "No", points: 0 },
      { label: "Planning to buy 1 property in next 12 months", points: 3 },
      { label: "Own 1 rental property", points: 4 },
      { label: "Own 2+ rental properties", points: 5 },
    ],
  },
  {
    id: "co-owner",
    prompt: "Do you have a business partner or co-owner?",
    options: [
      { label: "No, solo business", points: 0 },
      { label: "Yes, one co-founder", points: 4 },
      { label: "Yes, multiple co-founders or investors", points: 5 },
    ],
  },
  {
    id: "wholesale",
    prompt: "Do you sell wholesale to retailers / B2B with formal contracts?",
    options: [
      { label: "No, only B2C", points: 0 },
      { label: "Occasional B2B but no contracts", points: 1 },
      { label: "Regular B2B with PO / contracts", points: 3 },
      { label: "Major customers with master agreements", points: 5 },
    ],
  },
  {
    id: "employees",
    prompt: "Do you have (or plan to hire) employees / contractors?",
    options: [
      { label: "No — solo, no plans", points: 0 },
      { label: "Maybe 1099 contractors only", points: 1 },
      { label: "Yes — 1-3 part-time", points: 3 },
      { label: "Yes — full-time W-2 employees", points: 5 },
    ],
  },
  {
    id: "duration",
    prompt: "Is this a long-term business or short-term experiment?",
    options: [
      { label: "Just testing — might not continue", points: 0 },
      { label: "Side hustle, see what happens", points: 1 },
      { label: "Committed to growing it for 3+ years", points: 2 },
      { label: "This is my career", points: 3 },
    ],
  },
];

type Recommendation = {
  tier: "skip" | "wait" | "form-now";
  headline: string;
  body: string;
  cta: { label: string; href: string }[];
};

function getRecommendation(score: number): Recommendation {
  if (score <= 5) {
    return {
      tier: "skip",
      headline: "Don&apos;t form an LLC yet.",
      body: "Based on your answers, the costs of an LLC (especially CA&apos;s $800/yr franchise tax) outweigh the protection at your current stage. Stay sole-prop. Re-take this quiz when your revenue or risk profile changes — typically when you cross $30k revenue, take on a co-owner, or start selling physical products.",
      cta: [
        {
          label: "Get a real LA mailing address ($50 / 3 mo)",
          href: "/pricing",
        },
        {
          label: "Read: when do you actually need an LLC?",
          href: "/blog/should-i-form-an-llc-for-etsy-shop",
        },
      ],
    };
  }
  if (score <= 12) {
    return {
      tier: "wait",
      headline: "Form one when revenue clears $30k consistently.",
      body: "You&apos;re close to the threshold where LLC math works. Most of the risk factors are present, but revenue isn&apos;t high enough to fully justify the $800/year California franchise tax (or your state equivalent). Form the LLC when revenue is consistent — not at the first paid invoice. Until then, keep good records and watch the threshold.",
      cta: [
        {
          label: "Get a real LA address now (no LLC needed)",
          href: "/pricing",
        },
        {
          label: "Read California LLC formation guide",
          href: "/blog/llc-formation-california-2026-guide",
        },
        {
          label: "Compare LLC costs across states",
          href: "/tools/llc-cost-calculator",
        },
      ],
    };
  }
  return {
    tier: "form-now",
    headline: "Form an LLC now.",
    body: "Multiple risk factors stack in your situation. The annual franchise tax is well-spent insurance. Two paths: DIY for ~$890 first year (Articles + Statement of Information + $800 franchise tax), or use our $2,000 Business Launch Bundle (LLC + EIN + Operating Agreement + brand kit + 5-page website + 12 months of mail at our LA address). The bundle saves time and is cheaper than piecemeal services for the same components.",
    cta: [
      { label: "$2,000 Business Launch Bundle", href: "/business-solutions" },
      {
        label: "California LLC formation guide",
        href: "/blog/llc-formation-california-2026-guide",
      },
      {
        label: "Compare LLC cost by state",
        href: "/tools/llc-cost-calculator",
      },
    ],
  };
}

export default function LLCQuizClient() {
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [submitted, setSubmitted] = useState(false);

  const totalAnswered = Object.values(answers).filter(
    (v) => v !== undefined,
  ).length;
  const allAnswered = totalAnswered === QUESTIONS.length;
  const score = Object.values(answers).reduce<number>(
    (acc, v) => acc + (v ?? 0),
    0,
  );

  function setAnswer(qid: string, points: number) {
    setAnswers((prev) => ({ ...prev, [qid]: points }));
  }

  if (submitted) {
    const rec = getRecommendation(score);
    const accentColor =
      rec.tier === "form-now"
        ? "#15803d"
        : rec.tier === "wait"
          ? "#B07030"
          : "#7A6050";

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
            YOUR SCORE: {score} / {QUESTIONS.reduce(
              (acc, q) => acc + Math.max(...q.options.map((o) => o.points)),
              0,
            )}
          </p>
          <h2
            className="text-2xl md:text-3xl font-extrabold tracking-tight mb-4"
            style={{ color: "#2D100F" }}
            dangerouslySetInnerHTML={{ __html: rec.headline }}
          />
          <p
            className="text-text-light-muted text-base leading-relaxed mb-6 max-w-xl mx-auto"
            dangerouslySetInnerHTML={{ __html: rec.body }}
          />
          <div className="flex flex-col gap-2">
            {rec.cta.map((c, i) => (
              <Link
                key={c.href}
                href={c.href}
                className="inline-block font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5"
                style={{
                  background: i === 0 ? accentColor : "transparent",
                  color: i === 0 ? "#fff" : accentColor,
                  border: i === 0 ? "none" : `2px solid ${accentColor}`,
                }}
              >
                {c.label} →
              </Link>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setAnswers({});
              setSubmitted(false);
            }}
            className="mt-6 text-xs font-bold underline"
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
      {QUESTIONS.map((q, i) => {
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
              Question {i + 1} of {QUESTIONS.length}
            </p>
            <h3 className="font-extrabold tracking-tight text-text-light text-lg mb-4">
              {q.prompt}
            </h3>
            <div className="space-y-2">
              {q.options.map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => setAnswer(q.id, opt.points)}
                  className="w-full text-left rounded-lg px-4 py-3 text-sm font-semibold transition-all"
                  style={{
                    background: selected === opt.points ? "#337485" : "#FFF9F3",
                    color: selected === opt.points ? "#fff" : "#2D100F",
                    border:
                      selected === opt.points
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
          ? "Show my recommendation →"
          : `Answer all ${QUESTIONS.length} questions to see your result (${totalAnswered}/${QUESTIONS.length})`}
      </button>
    </div>
  );
}
