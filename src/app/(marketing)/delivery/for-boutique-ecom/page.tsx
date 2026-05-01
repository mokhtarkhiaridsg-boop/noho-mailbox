import type { Metadata } from "next";
import Link from "next/link";

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Local Same-Day Delivery for Boutique E-commerce",
  description:
    "Same-day delivery for boutique Etsy / Shopify / Amazon Handmade sellers in NoHo. Turn local orders into 5-star same-day experiences. $5 flat in NoHo.",
  serviceType: "E-commerce Last-Mile Same-Day",
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
    { "@type": "City", name: "Valley Village" },
  ],
  offers: {
    "@type": "Offer",
    price: "5.00",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  audience: {
    "@type": "BusinessAudience",
    audienceType: "Boutique E-commerce Sellers",
  },
};

export const metadata: Metadata = {
  title: "Same-Day Delivery for Etsy / Shopify Sellers — North Hollywood",
  description:
    "Local Etsy, Shopify, Amazon Handmade sellers: turn same-zip orders into same-day deliveries for $5 flat. Beat Amazon Prime on speed inside NoHo / Burbank / Studio City.",
  openGraph: {
    title: "Local Same-Day for Boutique E-com — NOHO Mailbox",
    description:
      "$5 flat same-day in NoHo. Beat Prime on speed for same-zip Etsy / Shopify orders.",
    url: "https://nohomailbox.org/delivery/for-boutique-ecom",
  },
  alternates: {
    canonical: "https://nohomailbox.org/delivery/for-boutique-ecom",
  },
};

const benefits = [
  {
    title: "Beat Prime on speed locally",
    body:
      "Amazon delivers same-day in LA, but only on their own inventory. Your handmade ceramic, framed art, candle set, custom apparel — Prime can&apos;t do those at all. We can.",
  },
  {
    title: "5-star review magnet",
    body:
      "Buyers leaving reviews mention shipping speed more than anything else. Same-day = effusive reviews = better Etsy / Shopify ranking = more sales.",
  },
  {
    title: "Repeat-customer driver",
    body:
      "Once a local buyer realizes you ship same-day, they stop comparison-shopping on the next order. The moat compounds.",
  },
  {
    title: "Higher AOV unlock",
    body:
      "Higher-end items ($100+ jewelry, art, custom orders) are easier to sell when buyers know it arrives today — they don&apos;t shop around for an hour.",
  },
];

const flow = [
  {
    n: "1",
    title: "Same-zip order comes in",
    body:
      "Set your shop notification rules so you flag any order shipping to 91601, 91602, 91604, 91605, 91606, 91607, 91505, 91506, 91423.",
  },
  {
    n: "2",
    title: "Text us the address",
    body:
      "(818) 506-7744. Photo of the package + recipient address. We quote you in 5 minutes — usually $5 inside NoHo, $9.75–$14 across the Valley.",
  },
  {
    n: "3",
    title: "We pick up + deliver",
    body:
      "Drop off at 5062 Lankershim or we come to you. Photo proof of delivery sent to you and your customer (if they want).",
  },
  {
    n: "4",
    title: "Charge customer at checkout",
    body:
      "Add &quot;Local same-day delivery&quot; as a $15 Shopify shipping option. Pocket the $10 margin per order.",
  },
];

export default function DeliveryForBoutiqueEcomPage() {
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
            FOR ETSY · SHOPIFY · AMAZON HANDMADE SELLERS
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Beat Prime on speed —{" "}
            <span style={{ color: "#F5A623" }}>locally.</span>
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            Local Etsy, Shopify, and Amazon Handmade sellers — turn same-zip
            orders into same-day deliveries for $5 flat. Five-star reviews,
            higher AOVs, repeat customers — without paying Amazon&apos;s rake.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 animate-fade-up delay-400">
            <Link
              href="/delivery#book"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Book a delivery
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
        $5 NoHo · Same-zip Shopify orders → same-day at checkout
      </div>

      {/* Why */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            Why same-day local matters for boutique sellers
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {benefits.map((b, i) => (
              <div
                key={b.title}
                className="rounded-2xl p-6 hover-lift animate-fade-up"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-md)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <h3 className="font-extrabold tracking-tight text-text-light mb-2 text-lg">
                  {b.title}
                </h3>
                <p
                  className="text-sm leading-relaxed text-text-light-muted"
                  dangerouslySetInnerHTML={{ __html: b.body }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Flow */}
      <section className="py-20 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            How it works
          </h2>
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {flow.map((s, i) => (
              <li
                key={s.n}
                className="relative rounded-2xl p-6 animate-fade-up"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <div
                  className="absolute -top-4 -left-2 w-10 h-10 rounded-full flex items-center justify-center font-extrabold text-white"
                  style={{ background: "#337485" }}
                >
                  {s.n}
                </div>
                <h3 className="font-extrabold tracking-tight text-text-light mb-2 text-base mt-3">
                  {s.title}
                </h3>
                <p
                  className="text-sm text-text-light-muted leading-relaxed"
                  dangerouslySetInnerHTML={{ __html: s.body }}
                />
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Cross-sell to mailbox */}
      <section className="py-16 px-4 bg-bg-light">
        <div
          className="max-w-3xl mx-auto rounded-3xl p-8 md:p-10 text-center animate-fade-up"
          style={{
            background:
              "linear-gradient(145deg, #B07030 0%, #8A5520 100%)",
            boxShadow: "0 12px 40px rgba(176,112,48,0.3)",
          }}
        >
          <p
            className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "#FFE4A0" }}
          >
            Bonus pairing for Etsy / Shopify sellers
          </p>
          <h2
            className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3"
            style={{ color: "#FFE4A0" }}
          >
            A real LA address (so Etsy stops flagging your P.O. Box)
          </h2>
          <p className="text-sm leading-relaxed mb-6" style={{ color: "rgba(255,255,255,0.85)" }}>
            Etsy verifies addresses — P.O. Boxes get flagged. Our $50 / 3-month
            real Lankershim address works on Etsy, Amazon Seller Central,
            Shopify, and your bank — and we can deliver locally for you.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/pricing"
              className="font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: "#FFE4A0", color: "#5A3A12" }}
            >
              See mailbox plans
            </Link>
            <Link
              href="/blog/should-i-form-an-llc-for-etsy-shop"
              className="font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5"
              style={{
                background: "rgba(255,255,255,0.1)",
                border: "1px solid rgba(255,255,255,0.25)",
                color: "#FFFFFF",
              }}
            >
              Should I form an LLC?
            </Link>
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
            First run is on us.
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            Test the workflow on one same-zip order. We&apos;ll come pick up,
            deliver, and send photo proof to your buyer. See the review.
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
