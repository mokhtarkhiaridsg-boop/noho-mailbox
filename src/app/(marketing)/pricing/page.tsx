import Link from "next/link";
import { MailboxIcon, HeartIcon } from "@/components/BrandIcons";

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
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: "linear-gradient(135deg, #2D1D0F 0%, #1a120a 50%, #2D1D0F 100%)" }}>
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute top-8 right-16 animate-float"><MailboxIcon className="w-16 h-16 opacity-40" /></div>
          <div className="absolute bottom-12 left-12 animate-float delay-400"><HeartIcon className="w-12 h-12 opacity-30" /></div>
        </div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-black uppercase text-[#F7E6C2] mb-6 animate-scale-in">
            Mailbox Plans
          </h1>
          <p className="text-[#F7E6C2]/60 max-w-xl mx-auto text-lg animate-fade-up delay-200">
            All plans include a real street address — not a P.O. Box. No surprises, no hidden fees.
          </p>
        </div>
      </section>

      {/* Plans */}
      <section className="py-20 px-4 bg-[#F7E6C2]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div
              key={plan.name}
              className={`rounded-2xl p-8 flex flex-col hover-tilt animate-fade-up ${
                plan.highlight
                  ? "bg-[#3374B5] text-white delay-200"
                  : "bg-white text-[#2D1D0F] " + (i === 0 ? "delay-100" : "delay-300")
              }`}
              style={{
                boxShadow: plan.highlight
                  ? "0 20px 60px rgba(51,116,181,0.3), 0 8px 24px rgba(51,116,181,0.2)"
                  : "0 8px 32px rgba(45,29,15,0.08), 0 2px 8px rgba(45,29,15,0.04)",
                transform: plan.highlight ? "scale(1.05)" : undefined,
              }}
            >
              {plan.highlight && (
                <span className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">
                  Most Popular
                </span>
              )}
              <h2 className="font-black text-xl uppercase mb-6">{plan.name}</h2>

              <div className="space-y-3 mb-8">
                {Object.entries(plan.prices).map(([term, price]) => (
                  <div
                    key={term}
                    className={`flex justify-between text-sm border-b pb-3 ${
                      plan.highlight ? "border-white/20" : "border-[#F7E6C2]"
                    }`}
                  >
                    <span className={plan.highlight ? "text-white/70" : "text-[#2D1D0F]/60"}>
                      {term}
                    </span>
                    <span className="font-bold text-base">{price}</span>
                  </div>
                ))}
              </div>

              <ul className="space-y-2 text-sm flex-1 mb-8">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className={plan.highlight ? "text-white" : "text-[#3374B5]"}>✓</span>
                    <span className={plan.highlight ? "text-white/90" : "text-[#2D1D0F]/70"}>{f}</span>
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`block text-center font-bold py-3 rounded-full transition-all hover:-translate-y-1 hover:shadow-lg ${
                  plan.highlight
                    ? "bg-white text-[#3374B5] hover:bg-[#F7E6C2]"
                    : "bg-[#3374B5] text-white hover:bg-[#2960A0]"
                }`}
              >
                Get Started
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Comparison table */}
      <section className="py-20 px-4 bg-[#FFFDF8]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black uppercase text-[#2D1D0F] text-center mb-10 animate-fade-up">
            Full Comparison
          </h2>
          <div className="overflow-x-auto rounded-2xl animate-fade-up delay-200" style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#2D1D0F] text-[#F7E6C2]">
                  <th className="text-left p-4 font-black uppercase">Feature</th>
                  <th className="p-4 font-black uppercase">Basic</th>
                  <th className="p-4 font-black uppercase text-[#3374B5] bg-[#F7E6C2]">Business</th>
                  <th className="p-4 font-black uppercase">Premium</th>
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
                  <tr key={String(feature)} className={i % 2 === 0 ? "bg-white" : "bg-[#FAFAF7]"}>
                    <td className="p-4 text-[#2D1D0F]/80 font-medium">{String(feature)}</td>
                    {[basic, biz, premium].map((v, j) => (
                      <td key={j} className={`p-4 text-center ${j === 1 ? "bg-[#3374B5]/5" : ""}`}>
                        {v ? (
                          <span className="text-[#3374B5] font-bold text-lg">✓</span>
                        ) : (
                          <span className="text-[#2D1D0F]/20">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="text-center text-sm text-[#2D1D0F]/40 mt-8">
            Need something custom?{" "}
            <Link href="/contact" className="text-[#3374B5] hover:underline">
              Contact us
            </Link>
            .
          </p>
        </div>
      </section>
    </div>
  );
}
