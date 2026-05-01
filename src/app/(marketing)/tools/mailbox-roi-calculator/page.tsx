import type { Metadata } from "next";
import MailboxROICalculatorClient from "./MailboxROICalculatorClient";

export const metadata: Metadata = {
  title: "Mailbox ROI Calculator — How Much Is Package Theft Costing You?",
  description:
    "Free interactive calculator: estimate how much porch piracy and missed packages cost you each year, and compare to a NOHO Mailbox plan. LA averages 13% package theft rate.",
  openGraph: {
    title: "Free Mailbox ROI Calculator — NOHO Mailbox",
    description:
      "Calculate the real cost of package theft + missed deliveries vs a $50/3-month real mailbox. Free, no email required.",
    url: "https://nohomailbox.org/tools/mailbox-roi-calculator",
  },
  alternates: { canonical: "https://nohomailbox.org/tools/mailbox-roi-calculator" },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Mailbox ROI Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Estimate the annual cost of package theft, missed deliveries, and time wasted picking up at the post office, vs a CMRA private mailbox.",
};

export default function MailboxROICalculatorPage() {
  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareJsonLd) }}
      />

      {/* Hero */}
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
            FREE TOOL · NO LOGIN
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-6">
            How much is package theft costing you?
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg">
            LA averages a <strong>13% porch piracy rate</strong> on residential
            deliveries. We&apos;ll estimate your annual loss and compare to a NOHO
            Mailbox plan.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Math is honest · Sources cited at the bottom
      </div>

      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          <MailboxROICalculatorClient />
        </div>
      </section>

      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-6">
            How we calculate
          </h2>
          <ul className="space-y-3">
            {[
              {
                t: "Package theft rate",
                b: "We use a 13% annual probability per residential package, based on aggregate Safewise / Security.org data for Los Angeles County. Higher in dense apartment areas (15–22%), lower in gated communities (3–6%). The default is conservative.",
              },
              {
                t: "Average package value",
                b: "Default $40, adjustable. This is the median Amazon package value per industry estimates, but real values can be much higher for electronics, beauty products, and clothing.",
              },
              {
                t: "Time cost",
                b: "We use $25/hour as a conservative time-value (well below a typical LA professional&apos;s billing rate). Adjust with your real hourly rate to see your actual exposure.",
              },
              {
                t: "Time saved with a CMRA",
                b: "Average household spends ~30 min/week dealing with mail (sorting, scheduling re-deliveries, picking up at the post office). A real mailbox + scanning eliminates ~80% of that.",
              },
              {
                t: "Mailbox cost",
                b: "$50/3 months on the Basic plan (or $80/3 months on Business with same-day delivery + free notary). All annual numbers use the higher 3-month rate × 4 quarters.",
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
                <p
                  className="text-xs text-text-light-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: r.b }}
                />
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-text-light-muted/70">
            <strong>Disclaimer:</strong> this calculator is an estimate, not a
            guarantee. Actual savings depend on your specific situation. We use
            conservative defaults; your real exposure may be higher.
          </p>
        </div>
      </section>
    </div>
  );
}
