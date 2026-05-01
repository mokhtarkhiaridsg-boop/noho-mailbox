import type { Metadata } from "next";
import { getPricingConfig } from "@/app/actions/pricing";
import { PricingPlansInteractive } from "./PricingPlansInteractive";
import { PolicyAccordion } from "./PolicyAccordion";

export const metadata: Metadata = {
  title: "Mailbox Rental Pricing — $50–$95 / 3 mo · NOHO Mailbox",
  description:
    "Transparent mailbox rental pricing in North Hollywood — Basic from $50/3mo, Business from $80/3mo, Premium from $95/3mo. Real Lankershim Blvd address, free Form 1583 notary on Business+, no hidden fees.",
  openGraph: {
    title: "Mailbox Rental Pricing $50–$95 — NOHO Mailbox",
    description:
      "Real LA street address from $50/3 months. Mail scanning, package alerts, same-day delivery, free notary on Business+.",
    url: "https://nohomailbox.org/pricing",
  },
  alternates: { canonical: "https://nohomailbox.org/pricing" },
};

// ─────────────────────── Inline icons (no emojis) ───────────────────────
function CheckIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m4.5 12.75 6 6 9-13.5" />
    </svg>
  );
}
function MinusIcon({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M5 12h14" />
    </svg>
  );
}

export default async function PricingPage() {
  const config = await getPricingConfig();

  // Product/Offer JSON-LD for each plan — drives Google rich results with prices.
  const productJsonLd = config.plans.map((plan) => ({
    "@context": "https://schema.org",
    "@type": "Product",
    name: `NOHO Mailbox — ${plan.name}`,
    description: plan.features.join(", "),
    brand: {
      "@type": "Brand",
      name: "NOHO Mailbox",
    },
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "USD",
      lowPrice: plan.prices.term3.toFixed(2),
      highPrice: plan.prices.term14.toFixed(2),
      offerCount: 3,
      availability: "https://schema.org/InStock",
      seller: {
        "@type": "LocalBusiness",
        name: "NOHO Mailbox",
        address: {
          "@type": "PostalAddress",
          streetAddress: "5062 Lankershim Blvd",
          addressLocality: "North Hollywood",
          addressRegion: "CA",
          postalCode: "91601",
          addressCountry: "US",
        },
        telephone: "+1-818-506-7744",
      },
    },
  }));

  return (
    <div>
      {productJsonLd.map((j, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(j) }}
        />
      ))}
      {/* ─── Hero ─── */}
      <section
        className="relative px-5 pt-20 pb-12 text-center"
        style={{ background: "#F7E6C2" }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(45,16,15,0.07) 1px, transparent 1px)",
            backgroundSize: "26px 26px",
          }}
        />
        <div className="relative max-w-3xl mx-auto">
          <p
            className="text-[11px] font-black uppercase tracking-[0.22em] mb-3"
            style={{ color: "#337485" }}
          >
            Pricing
          </p>
          <h1
            className="font-extrabold tracking-tight mb-4"
            style={{
              fontFamily: "var(--font-baloo), sans-serif",
              fontSize: "clamp(2.4rem, 5.5vw, 4rem)",
              color: "#2D100F",
              letterSpacing: "-0.02em",
              lineHeight: 1.05,
            }}
          >
            {config.headline}
          </h1>
          <p className="text-[16px] leading-relaxed max-w-xl mx-auto" style={{ color: "rgba(45,16,15,0.65)" }}>
            {config.subhead}
          </p>
        </div>
      </section>

      {/* ─── Plans (interactive: term toggle + animated swap) ─── */}
      <section
        className="py-16 px-5"
        style={{ background: "#FAFAF8", borderTop: "1px solid rgba(45,16,15,0.08)" }}
      >
        <div className="max-w-6xl mx-auto">
          <PricingPlansInteractive plans={config.plans} />
        </div>
      </section>

      {/* ─── Comparison table ─── */}
      {config.comparison.length > 0 && (
        <section className="py-16 px-5" style={{ background: "#F0EDE8" }}>
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-10">
              <p
                className="text-[11px] font-black uppercase tracking-[0.22em] mb-2"
                style={{ color: "#337485" }}
              >
                Side by side
              </p>
              <h2
                className="font-extrabold tracking-tight"
                style={{
                  fontFamily: "var(--font-baloo), sans-serif",
                  fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                  color: "#2D100F",
                  letterSpacing: "-0.02em",
                }}
              >
                Compare every feature
              </h2>
            </div>

            <div
              className="rounded-3xl overflow-hidden"
              style={{
                background: "white",
                border: "1px solid rgba(45,16,15,0.08)",
                boxShadow:
                  "0 1px 0 rgba(51,116,133,0.04), 0 12px 32px rgba(45,16,15,0.06)",
              }}
            >
              {/* Header row */}
              <div
                className="grid grid-cols-[1.6fr_repeat(3,_1fr)] gap-2 px-5 py-3"
                style={{ background: "#2D100F", color: "#F7E6C2" }}
              >
                <span className="text-[11px] font-black uppercase tracking-[0.18em] opacity-70">
                  Feature
                </span>
                {config.plans.slice(0, 3).map((p) => (
                  <span
                    key={p.id}
                    className="text-center text-[12px] font-black"
                    style={{ fontFamily: "var(--font-baloo), sans-serif" }}
                  >
                    {p.name}
                  </span>
                ))}
              </div>

              <ul>
                {config.comparison.map((row, i) => (
                  <li
                    key={i}
                    className="grid grid-cols-[1.6fr_repeat(3,_1fr)] gap-2 items-center px-5 py-3 transition-colors"
                    style={{
                      background: i % 2 === 0 ? "white" : "#FAFAF8",
                      borderTop: i === 0 ? "none" : "1px solid rgba(45,16,15,0.05)",
                    }}
                  >
                    <div>
                      <p className="text-[14px] font-bold" style={{ color: "#2D100F" }}>
                        {row.feature}
                      </p>
                      {row.sub && (
                        <p className="text-[11px]" style={{ color: "rgba(45,16,15,0.5)" }}>
                          {row.sub}
                        </p>
                      )}
                    </div>
                    {(["basic", "business", "premium"] as const).map((k) => (
                      <ComparisonCell key={k} value={row[k]} />
                    ))}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      )}

      {/* ─── Fees ─── */}
      {config.fees.length > 0 && (
        <section className="py-16 px-5" style={{ background: "#FAFAF8" }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <p
                className="text-[11px] font-black uppercase tracking-[0.22em] mb-2"
                style={{ color: "#337485" }}
              >
                À-la-carte
              </p>
              <h2
                className="font-extrabold tracking-tight"
                style={{
                  fontFamily: "var(--font-baloo), sans-serif",
                  fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                  color: "#2D100F",
                  letterSpacing: "-0.02em",
                }}
              >
                Fee schedule
              </h2>
              <p className="mt-2 text-[14px]" style={{ color: "rgba(45,16,15,0.6)" }}>
                Pay only for what you use. No surprises, no markups.
              </p>
            </div>

            <ul
              className="rounded-3xl overflow-hidden"
              style={{
                background: "white",
                border: "1px solid rgba(45,16,15,0.08)",
                boxShadow:
                  "0 1px 0 rgba(51,116,133,0.04), 0 12px 32px rgba(45,16,15,0.06)",
              }}
            >
              {config.fees.map((f, i) => (
                <li
                  key={i}
                  className="px-5 py-4 flex items-start justify-between gap-4 transition-colors hover:bg-[#F7E6C2]/30"
                  style={{
                    borderTop: i === 0 ? "none" : "1px solid rgba(45,16,15,0.05)",
                  }}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[14px] font-bold" style={{ color: "#2D100F" }}>
                      {f.label}
                    </p>
                    {f.sub && (
                      <p className="text-[12px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                        {f.sub}
                      </p>
                    )}
                  </div>
                  <span
                    className="text-[15px] font-black shrink-0"
                    style={{
                      color: "#337485",
                      fontFamily: "var(--font-baloo), sans-serif",
                    }}
                  >
                    {f.amount}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* ─── Policies (interactive accordion) ─── */}
      {config.policies.length > 0 && (
        <section className="py-16 px-5" style={{ background: "#F0EDE8" }}>
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-10">
              <p
                className="text-[11px] font-black uppercase tracking-[0.22em] mb-2"
                style={{ color: "#337485" }}
              >
                The fine print
              </p>
              <h2
                className="font-extrabold tracking-tight"
                style={{
                  fontFamily: "var(--font-baloo), sans-serif",
                  fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
                  color: "#2D100F",
                  letterSpacing: "-0.02em",
                }}
              >
                Policies
              </h2>
            </div>
            <PolicyAccordion items={config.policies} />
          </div>
        </section>
      )}
    </div>
  );
}

function ComparisonCell({ value }: { value: boolean | string }) {
  if (value === true) {
    return (
      <span className="flex justify-center">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full"
          style={{ background: "#16a34a", color: "white" }}
        >
          <CheckIcon className="w-4 h-4" />
        </span>
      </span>
    );
  }
  if (value === false) {
    return (
      <span className="flex justify-center">
        <span
          className="inline-flex items-center justify-center w-7 h-7 rounded-full"
          style={{ background: "rgba(45,16,15,0.07)", color: "rgba(45,16,15,0.45)" }}
        >
          <MinusIcon className="w-3.5 h-3.5" />
        </span>
      </span>
    );
  }
  return (
    <span
      className="block text-center text-[13px] font-bold"
      style={{ color: "#2D100F" }}
    >
      {value}
    </span>
  );
}
