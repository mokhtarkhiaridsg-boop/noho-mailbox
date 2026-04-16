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
  },
  {
    name: "Business Box",
    prices: { "3 Months": "$80", "6 Months": "$150", "14 Months": "$230" },
    features: ["Real street address", "Mail scanning", "Package notifications", "In-store pickup", "Mail forwarding"],
    highlight: true,
  },
  {
    name: "Premium Box",
    prices: { "3 Months": "$95", "6 Months": "$180", "14 Months": "$295" },
    features: ["Real street address", "Mail scanning", "Package notifications", "In-store pickup", "Mail forwarding", "Priority processing", "Notary discount"],
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

      {/* Plans */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 flex flex-col hover-lift animate-fade-up ${
                plan.highlight
                  ? "bg-accent text-white delay-200"
                  : "bg-surface-light border border-border-light text-text-light " + (i === 0 ? "delay-100" : "delay-300")
              }`}
              style={{
                transform: plan.highlight ? "scale(1.05)" : undefined,
              }}
            >
              {plan.highlight && (
                <span className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
                  Most Popular
                </span>
              )}
              <h2 className="font-extrabold tracking-tight text-xl mb-6">{plan.name}</h2>

              <div className="space-y-3 mb-8">
                {Object.entries(plan.prices).map(([term, price]) => (
                  <div
                    key={term}
                    className={`flex justify-between text-sm border-b pb-3 ${
                      plan.highlight ? "border-white/20" : "border-border-light"
                    }`}
                  >
                    <span className={plan.highlight ? "text-white/70" : "text-text-light-muted"}>
                      {term}
                    </span>
                    <span className="font-bold text-base">{price}</span>
                  </div>
                ))}
              </div>

              <ul className="space-y-2 text-sm flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className={plan.highlight ? "text-white" : "text-accent"}>✓</span>
                    <span className={plan.highlight ? "text-white/90" : "text-text-light-muted"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`block text-center font-bold py-3 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg ${
                  plan.highlight
                    ? "bg-white text-accent hover:bg-gray-50"
                    : "bg-accent text-white hover:bg-accent-hover"
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
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
                <tr className="bg-bg-dark text-text-dark">
                  <th className="text-left p-4 font-extrabold tracking-tight">Feature</th>
                  <th className="p-4 font-extrabold tracking-tight">Basic</th>
                  <th className="p-4 font-extrabold tracking-tight text-accent bg-accent-soft">Business</th>
                  <th className="p-4 font-extrabold tracking-tight">Premium</th>
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
                  <tr key={String(feature)} className={i % 2 === 0 ? "bg-surface-light" : "bg-bg-light"}>
                    <td className="p-4 text-text-light-muted font-medium">{String(feature)}</td>
                    {[basic, biz, premium].map((v, j) => (
                      <td key={j} className={`p-4 text-center ${j === 1 ? "bg-accent/5" : ""}`}>
                        {v ? (
                          <span className="text-accent font-bold text-lg">✓</span>
                        ) : (
                          <span className="text-text-light-muted/60">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-sm text-text-light-muted/60 mt-8">
            Need something custom?{" "}
            <Link href="/contact" className="text-accent hover:underline">
              Contact us
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
