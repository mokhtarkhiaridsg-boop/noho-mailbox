import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Pricing",
  description:
    "Transparent mailbox rental pricing — Basic Box from $50/3mo, Business Box from $80/3mo, Premium Box from $95/3mo. No hidden fees.",
  openGraph: {
    title: "Pricing — NOHO Mailbox",
    description: "Compare mailbox plans starting at $50 for 3 months. Real street address, mail scanning, and package alerts included.",
    url: "https://nohomailbox.org/pricing",
  },
  alternates: { canonical: "https://nohomailbox.org/pricing" },
};

const plans = [
  {
    name: "Basic Box",
    prices: { "3 Months": "$50", "6 Months": "$95", "14 Months": "$160" },
    features: ["Real street address", "Mail scanning", "Package notifications", "In-store pickup"],
    variant: "standard" as const,
  },
  {
    name: "Premium Box",
    prices: { "3 Months": "$95", "6 Months": "$180", "14 Months": "$295" },
    features: ["Real street address", "Mail scanning", "Package notifications", "In-store pickup", "Mail forwarding", "Priority processing", "Notary discount"],
    variant: "premium" as const,
  },
  {
    name: "Business Box",
    prices: { "3 Months": "$80", "6 Months": "$150", "14 Months": "$230" },
    features: ["Real street address", "Mail scanning", "Package notifications", "In-store pickup", "Mail forwarding"],
    highlight: true,
    variant: "business" as const,
  },
];

export default function PricingPage() {
  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Mailbox Plans
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            All plans include a real street address — not a P.O. Box. No surprises, no hidden fees.
          </p>
        </div>
      </section>

      {/* Cream personality banner */}
      <div
        className="py-4 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        No setup fees · No contracts · Cancel anytime &mdash; just bring two IDs and sign up in minutes
      </div>

      {/* Plans */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan) => {
            /* Standard plan: warm cream card */
            if (plan.variant === "standard") {
              return (
                <div
                  key={plan.name}
                  className="rounded-2xl p-8 flex flex-col hover-lift animate-fade-up delay-100 border"
                  style={{
                    background: "#FFF9F3",
                    borderColor: "#E8D8C4",
                    color: "#2D1D0F",
                  }}
                >
                  <span className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "#B07030" }}>
                    Standard
                  </span>
                  <h2 className="font-extrabold tracking-tight text-xl mb-6">{plan.name}</h2>

                  <div className="space-y-3 mb-8">
                    {Object.entries(plan.prices).map(([term, price]) => (
                      <div key={term} className="flex justify-between text-sm border-b pb-3" style={{ borderColor: "#E8D8C4" }}>
                        <span style={{ color: "#7A6050" }}>{term}</span>
                        <span className="font-bold text-base">{price}</span>
                      </div>
                    ))}
                  </div>

                  <ul className="space-y-2 text-sm flex-1 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span style={{ color: "#B07030" }}>✓</span>
                        <span style={{ color: "#7A6050" }}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup"
                    className="block text-center font-bold py-3 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg text-white"
                    style={{ background: "#3374B5" }}
                  >
                    Get Started
                  </Link>
                </div>
              );
            }

            /* Premium plan: deep blue gradient */
            if (plan.variant === "premium") {
              return (
                <div
                  key={plan.name}
                  className="rounded-2xl p-8 flex flex-col hover-lift animate-fade-up delay-300 text-white"
                  style={{
                    background: "linear-gradient(145deg, #1B3A5C 0%, #0E2340 100%)",
                    boxShadow: "0 12px 40px rgba(19,45,80,0.4)",
                  }}
                >
                  <span className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(147,196,255,0.8)" }}>
                    Best for Power Users
                  </span>
                  <h2 className="font-extrabold tracking-tight text-xl mb-6">{plan.name}</h2>

                  <div className="space-y-3 mb-8">
                    {Object.entries(plan.prices).map(([term, price]) => (
                      <div key={term} className="flex justify-between text-sm border-b pb-3" style={{ borderColor: "rgba(255,255,255,0.12)" }}>
                        <span style={{ color: "rgba(255,255,255,0.6)" }}>{term}</span>
                        <span className="font-bold text-base">{price}</span>
                      </div>
                    ))}
                  </div>

                  <ul className="space-y-2 text-sm flex-1 mb-8">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <span style={{ color: "#93C4FF" }}>✓</span>
                        <span style={{ color: "rgba(255,255,255,0.85)" }}>{f}</span>
                      </li>
                    ))}
                  </ul>

                  <Link
                    href="/signup"
                    className="block text-center font-bold py-3 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg"
                    style={{ background: "rgba(255,255,255,0.15)", border: "1px solid rgba(255,255,255,0.3)", color: "#fff" }}
                  >
                    Get Started
                  </Link>
                </div>
              );
            }

            /* Business plan: gold/brown — highlight + scaled */
            return (
              <div
                key={plan.name}
                className="rounded-2xl p-8 flex flex-col hover-lift animate-fade-up delay-200"
                style={{
                  background: "linear-gradient(145deg, #B07030 0%, #8A5520 100%)",
                  color: "#fff",
                  transform: "scale(1.05)",
                  boxShadow: "0 16px 48px rgba(176,112,48,0.4)",
                }}
              >
                <span className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: "rgba(255,240,200,0.8)" }}>
                  Most Popular
                </span>
                <h2 className="font-extrabold tracking-tight text-xl mb-6">{plan.name}</h2>

                <div className="space-y-3 mb-8">
                  {Object.entries(plan.prices).map(([term, price]) => (
                    <div key={term} className="flex justify-between text-sm border-b pb-3" style={{ borderColor: "rgba(255,255,255,0.2)" }}>
                      <span style={{ color: "rgba(255,240,200,0.75)" }}>{term}</span>
                      <span className="font-bold text-base">{price}</span>
                    </div>
                  ))}
                </div>

                <ul className="space-y-2 text-sm flex-1 mb-8">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <span style={{ color: "#FFE4A0" }}>✓</span>
                      <span style={{ color: "rgba(255,255,255,0.9)" }}>{f}</span>
                    </li>
                  ))}
                </ul>

                <Link
                  href="/signup"
                  className="block text-center font-bold py-3 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg"
                  style={{ background: "#fff", color: "#8A5520" }}
                >
                  Get Started
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-10 animate-fade-up">
            Full Comparison
          </h2>
          <div className="overflow-x-auto rounded-2xl shadow-[var(--shadow-md)] animate-fade-up delay-200">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#110E0B", color: "#F8F2EA" }}>
                  <th className="text-left p-4 font-extrabold tracking-tight">Feature</th>
                  <th className="p-4 font-extrabold tracking-tight">Basic</th>
                  <th className="p-4 font-extrabold tracking-tight" style={{ color: "#FFD580", background: "rgba(176,112,48,0.2)" }}>Business</th>
                  <th className="p-4 font-extrabold tracking-tight" style={{ color: "#93C4FF" }}>Premium</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Street address", true, true, true],
                  ["Mail scanning", true, true, true],
                  ["Package notifications", true, true, true],
                  ["In-store pickup", true, true, true],
                  ["Mail forwarding", false, true, true],
                  ["Priority processing", false, false, true],
                  ["Notary discount", false, false, true],
                ].map(([feature, basic, biz, premium], i) => (
                  <tr key={String(feature)} style={{ background: i % 2 === 0 ? "#FFF9F3" : "#F8F2EA" }}>
                    <td className="p-4 font-medium" style={{ color: "#7A6050" }}>{String(feature)}</td>
                    {[basic, biz, premium].map((v, j) => (
                      <td key={j} className={`p-4 text-center`} style={j === 1 ? { background: "rgba(176,112,48,0.06)" } : undefined}>
                        {v ? (
                          <span className="font-bold text-lg" style={{ color: j === 1 ? "#B07030" : j === 2 ? "#3374B5" : "#3374B5" }}>✓</span>
                        ) : (
                          <span style={{ color: "rgba(122,96,80,0.4)" }}>—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-sm mt-8" style={{ color: "rgba(122,96,80,0.6)" }}>
            Need something custom?{" "}
            <Link href="/contact" className="hover:underline" style={{ color: "#3374B5" }}>
              Contact us
            </Link>
            .
          </p>
        </div>
      </section>

      {/* Fees & Policies */}
      <section className="py-20 px-4" style={{ background: "#1E1914" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-center mb-4 animate-fade-up" style={{ color: "#F8F2EA" }}>
            Fees &amp; Policies
          </h2>
          <p className="text-center max-w-xl mx-auto mb-10 animate-fade-up delay-100" style={{ color: "rgba(248,242,234,0.65)" }}>
            Transparent pricing for additional services. No surprises.
          </p>
          <div className="overflow-x-auto rounded-2xl animate-fade-up delay-200" style={{ boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#110E0B" }}>
                  <th className="text-left p-4 font-extrabold tracking-tight" style={{ color: "#F7E6C2" }}>Fee</th>
                  <th className="text-right p-4 font-extrabold tracking-tight" style={{ color: "#F7E6C2" }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["Security Deposit (refundable)", "$50"],
                  ["Key Replacement", "$25"],
                  ["Late Payment (after 10-day grace period)", "$15"],
                  ["Mail Scanning", "$2 per page"],
                  ["Mail Forwarding", "Postage + $5 handling"],
                  ["Notary Services", "$15 per signature"],
                  ["Same-Day Delivery (NoHo zone)", "Starting at $5"],
                ].map(([fee, amount], i) => (
                  <tr key={fee} style={{ background: i % 2 === 0 ? "#2A2218" : "#1E1914" }}>
                    <td className="p-4 font-medium" style={{ color: "rgba(248,242,234,0.75)" }}>{fee}</td>
                    <td className="p-4 text-right font-bold" style={{ color: "#F7E6C2" }}>{amount}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-center text-sm mt-8" style={{ color: "rgba(248,242,234,0.4)" }}>
            All fees are subject to applicable sales tax. See our{" "}
            <Link href="/contact" className="hover:underline" style={{ color: "#93C4FF" }}>
              terms of service
            </Link>{" "}
            for full details.
          </p>
        </div>
      </section>
    </div>
  );
}
