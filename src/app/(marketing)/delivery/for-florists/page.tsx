import type { Metadata } from "next";
import Link from "next/link";

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Florist Overflow Delivery — Same-Day Courier for Flower Shops",
  description:
    "Same-day overflow delivery for florists during Mother's Day, Valentine's, Christmas, and last-minute sympathy arrangements. $5 per stop in NoHo, $9.75–$14 across the Valley.",
  serviceType: "Floral Delivery",
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
    audienceType: "Florists",
  },
};

export const metadata: Metadata = {
  title: "Same-Day Florist Overflow Delivery — North Hollywood",
  description:
    "Mother&apos;s Day, Valentine&apos;s, holidays — when your truck can&apos;t keep up, we&apos;ll take 5–20 deliveries off your hands at $5 each in NoHo. No commitment. (818) 506-7744.",
  openGraph: {
    title: "Florist Overflow Delivery — NOHO Mailbox",
    description:
      "When your shop is slammed on Mother&apos;s Day or Valentine&apos;s, we run your overflow at $5/stop in NoHo.",
    url: "https://nohomailbox.org/delivery/for-florists",
  },
  alternates: {
    canonical: "https://nohomailbox.org/delivery/for-florists",
  },
};

const peakDays = [
  {
    title: "Valentine&apos;s Day",
    body:
      "Feb 14 — most local florists run 3–5× normal volume. We can stage at your shop the night before and run as fast as your team can box.",
  },
  {
    title: "Mother&apos;s Day",
    body:
      "The single biggest delivery day in your year. We reserve capacity 10 days out for NoHo florists — first come, first served.",
  },
  {
    title: "Christmas / holidays",
    body:
      "Dec 22–24 corporate gifting and last-minute residential deliveries. We help when your route gets too long.",
  },
  {
    title: "Funerals & last-minute",
    body:
      "Sympathy arrangements, grand openings, hospital deliveries — same-hour delivery in NoHo when you can&apos;t leave the shop.",
  },
];

const how = [
  {
    n: "1",
    title: "Tell us your guess",
    body:
      "Two weeks before Mother&apos;s Day or Valentine&apos;s, text us roughly how many overflow runs you might need.",
  },
  {
    n: "2",
    title: "We hold capacity",
    body:
      "We block driver hours specifically for your shop. No commitment — pay only what we deliver.",
  },
  {
    n: "3",
    title: "Day-of",
    body:
      "Hand the orders to our driver as you finish them. We run, you keep arranging.",
  },
  {
    n: "4",
    title: "Settle up",
    body:
      "$5/stop in NoHo, $9.75–$14 across the Valley. Square invoice end of day, paid however you&apos;re used to.",
  },
];

export default function DeliveryForFloristsPage() {
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
            FOR FLORISTS · OVERFLOW CAPACITY
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            When your{" "}
            <span style={{ color: "#F5A623" }}>truck can&apos;t keep up</span>
            , we will.
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            Mother&apos;s Day, Valentine&apos;s, Christmas, last-minute sympathy
            arrangements — five-dollar overflow runs inside NoHo, no commitment,
            book the day-of. Two doors down on Lankershim.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-8 animate-fade-up delay-400">
            <Link
              href="/delivery#book"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Reserve overflow capacity
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
        $5 in NoHo · $9.75–$14 across the Valley · Pay only what we deliver
      </div>

      {/* Peak days */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-3 animate-fade-up">
            When florists need us most
          </h2>
          <p className="text-text-light-muted text-center max-w-2xl mx-auto mb-12 animate-fade-up delay-200">
            We&apos;re overflow capacity, not competition. The days you&apos;re running
            5× volume are the days we exist for.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {peakDays.map((p, i) => (
              <div
                key={p.title}
                className="rounded-2xl p-7 hover-lift animate-fade-up"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-md)",
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <h3
                  className="font-extrabold tracking-tight text-text-light mb-2 text-lg"
                  dangerouslySetInnerHTML={{ __html: p.title }}
                />
                <p
                  className="text-sm leading-relaxed text-text-light-muted"
                  dangerouslySetInnerHTML={{ __html: p.body }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section className="py-20 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            How florist overflow works
          </h2>
          <ol className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {how.map((s, i) => (
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

      {/* CTA */}
      <section className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4" style={{ color: "#F8F2EA" }}>
            Lock in your peak-day overflow.
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            Two minutes to reserve, no commitment, pay only what we deliver. Reply
            &quot;FLOWERS&quot; if you saw our outreach so we know who you are.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/delivery#book"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Reserve capacity
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
