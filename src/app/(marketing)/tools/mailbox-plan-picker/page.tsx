import type { Metadata } from "next";
import PlanPickerClient from "./PlanPickerClient";

export const metadata: Metadata = {
  title: "Find Your Mailbox Plan — Free Picker Quiz | NOHO Mailbox",
  description:
    "5-question quiz finds the right NOHO Mailbox plan: Basic ($50/3mo), Business ($80/3mo), or Premium ($295/3mo). Honest fit, not the most expensive option.",
  openGraph: {
    title: "Find Your NOHO Mailbox Plan",
    description: "5 questions, honest plan recommendation. Free.",
    url: "https://nohomailbox.org/tools/mailbox-plan-picker",
  },
  alternates: { canonical: "https://nohomailbox.org/tools/mailbox-plan-picker" },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Mailbox Plan Picker",
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Interactive 5-question quiz that recommends the right NOHO Mailbox plan based on use case, mail volume, and notarization needs.",
};

export default function MailboxPlanPickerPage() {
  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />

      <section className="relative py-24 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <span
            className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider rounded-full mb-5"
            style={{
              background: "rgba(245,166,35,0.15)",
              color: "#F5A623",
              border: "1px solid rgba(245,166,35,0.3)",
            }}
          >
            FREE PICKER · 60 SECONDS · NO LOGIN
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-6">
            Which mailbox plan fits you?
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg">
            5 quick questions. Honest recommendation — we&apos;ll point you at
            the cheapest plan that actually fits your situation.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        We don&apos;t default to the priciest plan · Most picks: Basic ($50/3mo) or Business ($80/3mo)
      </div>

      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-2xl mx-auto">
          <PlanPickerClient />
        </div>
      </section>

      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-6">
            About the three plans
          </h2>
          <ul className="space-y-3">
            {[
              {
                t: "Basic — $50 / 3 months ($16.67/mo)",
                b: "Real LA street address, USPS-CMRA. 25 free scans/month. Mail forwarding at postage + $5. Walk-in pickup Mon-Sat. Best for: solo Etsy sellers, freelancers, side hustles.",
              },
              {
                t: "Business — $80 / 3 months ($26.67/mo)",
                b: "Everything in Basic, PLUS free notarized Form 1583 (saves $25), priority scanning (same-day for mail received before 2pm), unlimited cards on profile (multiple businesses on one box). Best for: LLCs, S-corps, e-commerce brands.",
              },
              {
                t: "Premium — $295 / 3 months ($98.33/mo)",
                b: "Everything in Business, PLUS unlimited mail scans, $5 same-day local delivery (NoHo + Burbank + Studio City zone), one international forward/month at no markup, priority support. Best for: high-volume operators, busy founders, anyone who values speed.",
              },
            ].map((r) => (
              <li
                key={r.t}
                className="rounded-xl p-4"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                <h3 className="font-bold text-text-light text-sm mb-1">{r.t}</h3>
                <p className="text-xs text-text-light-muted leading-relaxed">{r.b}</p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-text-light-muted/70">
            <strong>Upgrades / downgrades:</strong> change plans any time. We
            prorate the difference. No fee. No questions asked.
          </p>
        </div>
      </section>
    </div>
  );
}
