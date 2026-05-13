import type { Metadata } from "next";
import MailboxROICalculatorClient from "./MailboxROICalculatorClient";

export const metadata: Metadata = {
  title: "Mailbox ROI Calculator — How Much Is Package Theft Costing You?",
  description:
    "Free calculator: how much porch piracy + missed packages cost you each year, vs a NOHO Mailbox plan. LA averages a 13% package theft rate.",
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
      <section
        className="relative px-5 sm:px-6 pt-12 pb-10 sm:pt-20 sm:pb-14 overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse at top, #F7E6C2 0%, #F0DBA9 45%, #E8DDD0 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#2D100F 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
          aria-hidden="true"
        />
        <div className="max-w-3xl mx-auto text-center relative z-10">
          <span
            className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider rounded-full mb-5"
            style={{
              background: "rgba(51,116,133,0.10)",
              color: "#337485",
              border: "1px solid rgba(51,116,133,0.28)",
            }}
          >
            FREE TOOL · NO LOGIN
          </span>
          <h1
            className="font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: "#2D100F",
              fontSize: "clamp(2rem, 6vw, 3.5rem)",
              lineHeight: 1.05,
            }}
          >
            How much is package theft costing you?
          </h1>
          <p
            className="mt-3 sm:mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-base"
            style={{ color: "#5C4540" }}
          >
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
