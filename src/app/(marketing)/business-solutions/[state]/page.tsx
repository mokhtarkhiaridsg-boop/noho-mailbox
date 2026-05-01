import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  STATE_LLC_PAGES,
  getStateLLC,
  getAllStateSlugs,
} from "@/lib/state-llc-pages";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllStateSlugs().map((state) => ({ state }));
}

type Params = { params: Promise<{ state: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { state } = await params;
  const meta = getStateLLC(state);
  if (!meta) return { title: "State not found" };

  return {
    title: `${meta.name} LLC Formation — Real Cost, Real Address, $2,000 All-In`,
    description: `Form your ${meta.name} LLC the right way. Filing fee $${meta.filingFee}, ${meta.franchiseTax ? `$${meta.franchiseTax.amount} ${meta.franchiseTax.cadence} franchise tax,` : "no franchise tax,"} real address required. Our $2,000 bundle includes everything.`,
    openGraph: {
      title: `${meta.name} LLC Formation — NOHO Mailbox`,
      description: `Real cost + step-by-step + $2,000 all-in bundle for forming your ${meta.name} LLC.`,
      url: `https://nohomailbox.org/business-solutions/${meta.slug}`,
    },
    alternates: {
      canonical: `https://nohomailbox.org/business-solutions/${meta.slug}`,
    },
  };
}

export default async function StateLLCPage({ params }: Params) {
  const { state } = await params;
  const meta = getStateLLC(state);
  if (!meta) notFound();

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${meta.name} LLC Formation Service`,
    description: `End-to-end ${meta.name} LLC formation with EIN, brand book, website, and 12 months of mail at our LA address — $2,000 flat.`,
    serviceType: "Business Formation",
    provider: {
      "@type": "Organization",
      name: "NOHO Mailbox",
      url: "https://nohomailbox.org",
    },
    areaServed: {
      "@type": "State",
      name: meta.name,
    },
    offers: {
      "@type": "Offer",
      price: "2000",
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    },
  };

  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      <section className="relative py-24 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <Link
            href="/business-solutions"
            className="text-text-dark-muted hover:text-text-dark text-sm inline-flex items-center gap-1 mb-6"
          >
            ← All states
          </Link>
          <span
            className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider rounded-full mb-5 animate-fade-up"
            style={{
              background: "rgba(245,166,35,0.15)",
              color: "#F5A623",
              border: "1px solid rgba(245,166,35,0.3)",
            }}
          >
            {meta.abbr} · LLC FORMATION · 2026
          </span>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Form your {meta.name} LLC —{" "}
            <span style={{ color: "#F5A623" }}>$2,000 all-in</span>
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            California LLC + EIN + brand book + 5-page website + 12 months of
            real US business address — done by an operating CMRA, not a
            LegalZoom hand-off. Below: the real {meta.name} cost breakdown so
            you know what you&apos;re paying for.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 animate-fade-up delay-400">
            <Link
              href="/business-solutions"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Get the bundle
            </Link>
            <a
              href="tel:+18185067744"
              className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F8F2EA",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              (818) 506-7744
            </a>
          </div>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Filing fee ${meta.filingFee} ·{" "}
        {meta.franchiseTax
          ? `Franchise tax $${meta.franchiseTax.amount} ${meta.franchiseTax.cadence}`
          : "No franchise tax"}{" "}
        ·{" "}
        {meta.annualReport
          ? `Annual report $${meta.annualReport.fee} ${meta.annualReport.cadence}`
          : "No annual report"}
      </div>

      {/* Real cost breakdown */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light mb-3">
            Real {meta.name} year-1 cost
          </h2>
          <p className="text-text-light-muted mb-8">
            Honest breakdown of what {meta.name} actually charges to form an
            LLC.
          </p>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8D8C4",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <Row label={`State filing (${meta.filingForm})`} v={`$${meta.filingFee}`} />
            {meta.franchiseTax && (
              <Row
                label={`Franchise tax (${meta.franchiseTax.cadence})`}
                v={`$${meta.franchiseTax.amount}`}
                note={meta.franchiseTax.note}
              />
            )}
            {meta.annualReport && (
              <Row
                label={`Annual report (${meta.annualReport.cadence})`}
                v={`$${meta.annualReport.fee}`}
              />
            )}
            <Row label="EIN with the IRS" v="$0" note="Free at irs.gov — anyone charging for this is overcharging." />
            <Row label="Registered agent (if needed)" v="$50–$300/yr" note={meta.registeredAgent} />
            <Row
              label="Estimated year-1 total"
              v={`$${meta.estTotalYear1.low}–$${meta.estTotalYear1.high}`}
              bold
            />
          </div>
          <p className="text-xs text-text-light-muted mt-3">
            Numbers verified against {meta.name} Secretary of State filings as of 2026.
            <a
              href={meta.paStateUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline ml-1"
              style={{ color: "#337485" }}
            >
              Verify here ↗
            </a>
          </p>
        </div>
      </section>

      {/* Highlights */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(22,163,74,0.06)",
              border: "1px solid rgba(22,163,74,0.2)",
            }}
          >
            <h3
              className="font-extrabold tracking-tight text-base mb-3"
              style={{ color: "#15803d" }}
            >
              {meta.name} highlights
            </h3>
            <ul className="space-y-2">
              {meta.highlights.map((h) => (
                <li key={h} className="text-sm flex items-start gap-2" style={{ color: "#166534" }}>
                  <span className="mt-1 font-bold">✓</span>
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          </div>
          <div
            className="rounded-2xl p-6"
            style={{
              background: "rgba(220,38,38,0.05)",
              border: "1px solid rgba(220,38,38,0.18)",
            }}
          >
            <h3
              className="font-extrabold tracking-tight text-base mb-3"
              style={{ color: "#dc2626" }}
            >
              Watch-outs
            </h3>
            <ul className="space-y-2">
              {meta.watchOuts.map((w) => (
                <li key={w} className="text-sm flex items-start gap-2" style={{ color: "#7f1d1d" }}>
                  <span className="mt-1 font-bold">!</span>
                  <span>{w}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Real address note */}
      <section className="py-16 px-4 bg-bg-light">
        <div
          className="max-w-3xl mx-auto rounded-2xl p-7"
          style={{
            background: "#FFF9F3",
            border: "1px solid #E8D8C4",
            boxShadow: "var(--shadow-md)",
          }}
        >
          <h3 className="font-extrabold tracking-tight text-text-light text-lg mb-2">
            About the {meta.name} address requirement
          </h3>
          <p className="text-sm text-text-light-muted leading-relaxed">
            {meta.realAddressNote}
          </p>
          <p className="text-sm text-text-light-muted leading-relaxed mt-3">
            Our $2,000 bundle includes 12 months of mail at our real LA address
            (5062 Lankershim Blvd) — accepted by the IRS for EIN, by banks, and
            by every state that allows out-of-state mailing addresses on their
            filings. For your state-specific registered agent we partner with
            licensed agents in all 50 states.
          </p>
        </div>
      </section>

      {/* Other states */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light text-center mb-8">
            Other states we form LLCs in
          </h2>
          <div className="flex flex-wrap justify-center gap-2">
            {STATE_LLC_PAGES.filter((s) => s.slug !== meta.slug).map((s) => (
              <Link
                key={s.slug}
                href={`/business-solutions/${s.slug}`}
                className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all hover:-translate-y-0.5"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  color: "#7A6050",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {s.name} · {s.abbr}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4" style={{ color: "#F8F2EA" }}>
            Ready to form your {meta.name} LLC?
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            $2,000 flat. We handle filing, EIN, brand, website, and 12 months of mail.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/business-solutions"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              See the bundle
            </Link>
            <a
              href="tel:+18185067744"
              className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "#F8F2EA",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              (818) 506-7744
            </a>
          </div>
        </div>
      </section>
    </div>
  );
}

function Row({
  label,
  v,
  note,
  bold,
}: {
  label: string;
  v: string;
  note?: string;
  bold?: boolean;
}) {
  return (
    <div
      className="px-6 py-4"
      style={{
        borderTop: "1px solid #E8D8C4",
        background: bold ? "rgba(51,116,133,0.06)" : "transparent",
      }}
    >
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <p
          className={`text-sm ${bold ? "font-extrabold text-text-light" : "font-bold"}`}
          style={{ color: bold ? "#2D100F" : "#7A6050" }}
        >
          {label}
        </p>
        <p
          className={`text-base ${bold ? "font-extrabold" : "font-bold"}`}
          style={{ color: bold ? "#337485" : "#2D100F" }}
        >
          {v}
        </p>
      </div>
      {note && (
        <p className="text-xs text-text-light-muted mt-1 leading-relaxed">
          {note}
        </p>
      )}
    </div>
  );
}
