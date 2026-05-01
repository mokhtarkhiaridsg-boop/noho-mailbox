import type { Metadata } from "next";
import Link from "next/link";

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Same-Day Courier for Print Shops & Sign Makers",
  description:
    "Last-mile delivery for print shops and sign makers in NoHo / Studio City / Burbank. $5 flat in NoHo for finished prints, banners, signs, business cards, mailers.",
  serviceType: "Print Shop Last-Mile Delivery",
  provider: {
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
  areaServed: [
    { "@type": "City", name: "North Hollywood" },
    { "@type": "City", name: "Studio City" },
    { "@type": "City", name: "Burbank" },
    { "@type": "City", name: "Sherman Oaks" },
    { "@type": "City", name: "Toluca Lake" },
  ],
  offers: {
    "@type": "Offer",
    price: "5.00",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  audience: {
    "@type": "BusinessAudience",
    audienceType: "Print Shops",
  },
};

export const metadata: Metadata = {
  title: "Same-Day Courier for Print Shops — Markup the Run",
  description:
    "Print shops in NoHo: stop turning down delivery requests. We do $5 flat in NoHo. You charge the customer $15, pocket $10, the run gets done. First job free.",
  openGraph: {
    title: "Print Shop Last-Mile — NOHO Mailbox",
    description:
      "$5 flat last-mile in NoHo. Markup the run, keep the margin, no infra to build.",
    url: "https://nohomailbox.org/delivery/for-print-shops",
  },
  alternates: {
    canonical: "https://nohomailbox.org/delivery/for-print-shops",
  },
};

const useCases = [
  {
    title: "Banners & signs",
    body:
      "Big paper rolls, Coroplast signs, vinyl banners — too big or odd for the customer to grab on lunch. We bring it to their office.",
  },
  {
    title: "Business cards & stationery",
    body:
      "Order rushes through a finishing run, customer can&apos;t pick up by close. We do the run after-hours-from-them, same-day for you.",
  },
  {
    title: "Mailers & postcards",
    body:
      "Boxes of folded direct-mail going to a marketing team for stamping or to a 3PL for fulfillment.",
  },
  {
    title: "Trade show + event materials",
    body:
      "Last-minute pull-up banners, packaging samples, name badges arriving the morning of an event. Time-critical, photo proof of delivery.",
  },
  {
    title: "Wedding & event invitations",
    body:
      "Boxed invitations to the bride&apos;s house. We treat it like fragile cargo — no creasing, photo on hand-off.",
  },
];

const margin = [
  { label: "What we charge you", v: "$5 in NoHo · $9.75–$24 across Valley" },
  { label: "What you charge customer", v: "$15–$30 (your call, customer expects it)" },
  { label: "Your margin per run", v: "$10–$20 per delivery" },
  { label: "Your effort", v: "30 seconds to text us the address" },
  { label: "Risk", v: "Zero — we&apos;re bonded, photo proof of delivery" },
];

export default function DeliveryForPrintShopsPage() {
  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-24 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span
            className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider rounded-full mb-5 animate-fade-up"
            style={{
              background: "rgba(245,166,35,0.15)",
              color: "#F5A623",
              border: "1px solid rgba(245,166,35,0.3)",
            }}
          >
            FOR PRINT SHOPS · SIGN MAKERS · COPY CENTERS
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Stop saying{" "}
            <span style={{ color: "#F5A623" }}>&quot;sorry, no delivery&quot;</span>
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            Print shops in NoHo — when the customer says &quot;just deliver it,&quot;
            we do $5 flat inside NoHo. You mark it up to $15, keep $10, and the
            job gets done. First run free so you can try the workflow.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 animate-fade-up delay-400">
            <Link
              href="/delivery#book"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Book a run
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
        $5 NoHo · markup the run · keep the margin · zero infra
      </div>

      {/* Margin breakdown */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            The math is simple
          </h2>
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8D8C4",
              boxShadow: "var(--shadow-md)",
            }}
          >
            {margin.map((row, i) => (
              <div
                key={row.label}
                className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-6 py-4"
                style={{
                  borderTop: i === 0 ? "none" : "1px solid #E8D8C4",
                  background: row.label === "Your margin per run" ? "rgba(22,163,74,0.05)" : "transparent",
                }}
              >
                <div
                  className="text-sm font-bold"
                  style={{ color: "#7A6050" }}
                >
                  {row.label}
                </div>
                <div
                  className="text-sm font-extrabold text-right"
                  style={{
                    color: row.label === "Your margin per run" ? "#15803d" : "#2D100F",
                  }}
                  dangerouslySetInnerHTML={{ __html: row.v }}
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-text-light-muted mt-4 text-center">
            Even at 3 runs/week markup, that&apos;s ~$130–$260/month extra
            margin from work you used to refuse.
          </p>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-3 animate-fade-up">
            What we run for print shops
          </h2>
          <p className="text-text-light-muted text-center max-w-2xl mx-auto mb-12 animate-fade-up delay-200">
            Anything finished and ready to hand off. Photo proof of delivery,
            chain-of-custody on paper between offices.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((u, i) => (
              <div
                key={u.title}
                className="rounded-2xl p-6 hover-lift animate-fade-up"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <h3 className="font-extrabold tracking-tight text-text-light mb-2 text-base">
                  {u.title}
                </h3>
                <p
                  className="text-sm leading-relaxed text-text-light-muted"
                  dangerouslySetInnerHTML={{ __html: u.body }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <h2
            className="text-3xl font-extrabold tracking-tight mb-4"
            style={{ color: "#F8F2EA" }}
          >
            Try the first run on us.
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            Charge your customer whatever you want — we&apos;re $5 flat in NoHo.
            First run is free so you can run the math on your real volume.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/delivery#book"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Book a run
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
