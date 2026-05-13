import type { Metadata } from "next";
import LLCCostCalculatorClient from "./LLCCostCalculatorClient";

export const metadata: Metadata = {
  title: "LLC Cost Calculator — Compare All 50 States + DC",
  description:
    "Free calculator comparing LLC formation cost across all 50 states + DC. Filing fees, franchise tax, annual reports, registered agent. Year 1 + 5-year projection.",
  openGraph: {
    title: "Free LLC Cost Calculator — All 50 States",
    description:
      "Compare LLC formation costs across states — filing fees, franchise tax, annual reports. Free, no email required.",
    url: "https://nohomailbox.org/tools/llc-cost-calculator",
  },
  alternates: { canonical: "https://nohomailbox.org/tools/llc-cost-calculator" },
};

const softwareJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "LLC Cost Calculator",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Compare LLC formation costs across all 50 states + DC. Includes filing fees, franchise tax, annual reports, and registered agent costs. 5-year projection included.",
};

export default function LLCCostCalculatorPage() {
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
            What does an LLC actually cost?
          </h1>
          <p
            className="mt-3 sm:mt-4 max-w-2xl mx-auto text-[14.5px] sm:text-base"
            style={{ color: "#5C4540" }}
          >
            Compare formation costs across all{" "}
            <strong>50 states + DC</strong>. Filing fees, franchise tax, annual
            reports, registered agent — Year 1 and 5-year projections.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Math is honest · Numbers update as state fees change · Sources cited
      </div>

      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-4xl mx-auto">
          <LLCCostCalculatorClient />
        </div>
      </section>

      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-6">
            What's included in the calculation
          </h2>
          <ul className="space-y-3">
            {[
              {
                t: "Filing fee",
                b: "One-time fee to file the LLC formation document with the Secretary of State. Range: $35 (Montana) to $300 (Tennessee).",
              },
              {
                t: "Franchise / privilege tax",
                b: "Annual flat tax some states charge LLCs regardless of revenue. California: $800/yr (the famous one). Most states: $0. A few states have minimum-tax structures (TN $100, AR $150, AL $100).",
              },
              {
                t: "Annual report fee",
                b: "Annual or biennial filing required to keep the LLC in good standing. Range: $0 (free in MS / TX with conditions) to $300 (NV / MD biennial).",
              },
              {
                t: "Registered agent",
                b: "If you're forming in a state where you don't have a physical address, you need a registered agent service. We use $150/yr as a typical mid-tier price (range $50-$300).",
              },
              {
                t: "What's NOT included",
                b: "Operating Agreement drafting (typically $0 if DIY, $200-$500 if attorney-drafted). EIN (free from IRS, paid services charge $50-$70). Local business licenses (varies by city). Trademark filings (separate process). Banking fees (varies).",
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
                <p className="text-xs text-text-light-muted leading-relaxed">
                  {r.b}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-text-light-muted/70">
            <strong>Disclaimer:</strong> calculator is informational, not tax
            or legal advice. State fees change — last reviewed 2026 Q1. Verify
            current fees with your state&apos;s Secretary of State office.
          </p>
        </div>
      </section>
    </div>
  );
}
