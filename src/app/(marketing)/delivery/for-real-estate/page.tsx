import type { Metadata } from "next";
import Link from "next/link";

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Real Estate Courier — Same-Day Delivery for Realtors and Escrow",
  description:
    "Same-day courier service for real estate agents, escrow officers, and transaction coordinators. $5 flat in NoHo, $9.75–$24 across LA. Lockbox keys, earnest checks, signed addenda, disclosure packets.",
  serviceType: "Real Estate Document Courier",
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
    audienceType: "Real Estate Agents",
  },
};

export const metadata: Metadata = {
  title: "Same-Day Courier for Real Estate Agents — North Hollywood",
  description:
    "$5 flat key drops, earnest checks, signed contracts, and lockbox runs in NoHo. $9.75–$24 across the Valley. Real human, walk-in storefront. (818) 506-7744.",
  openGraph: {
    title: "Same-Day Courier for Real Estate — NOHO Mailbox",
    description:
      "Key drops, earnest checks, signed addenda, lockbox swaps. $5 flat in NoHo, $9.75–$24 across the Valley.",
    url: "https://nohomailbox.org/delivery/for-real-estate",
  },
  alternates: {
    canonical: "https://nohomailbox.org/delivery/for-real-estate",
  },
};

const useCases = [
  {
    title: "Lockbox key drops",
    body:
      "From your office or seller&apos;s home to the listing, same hour. We hand off in person, no more &quot;I&apos;ll meet you in 40 minutes.&quot;",
  },
  {
    title: "Earnest money checks",
    body:
      "From buyer to escrow before the deadline. $5 inside NoHo, photo proof of delivery, chain of custody.",
  },
  {
    title: "Signed addenda & counter offers",
    body:
      "Last-minute signed paper between agents — back to escrow, back to the listing agent, back to the lender. Same day.",
  },
  {
    title: "Disclosure packets",
    body:
      "Full disclosure binders to buyer&apos;s agent or attorney without sending an assistant on a 90-minute round trip.",
  },
  {
    title: "Open house supplies",
    body:
      "Signs, flyers, refreshments staged at the property morning-of. We deliver to the curb so you don&apos;t arrive sweating.",
  },
  {
    title: "Title & escrow runs",
    body:
      "We work with Sail North Hollywood Escrow, Secured Trust, and others — drop-off and pickup so your transaction coordinator stops driving.",
  },
];

const offices = [
  "Compass NoHo",
  "Equity Union Real Estate",
  "Coldwell Banker NoHo",
  "Century 21 Hollywood Hills",
  "RE/MAX 91601",
  "Mills Realty",
  "The Brad Korb Real Estate Group (Burbank)",
];

export default function DeliveryForRealEstatePage() {
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
            FOR REALTORS · ESCROW · TITLE
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Keys, checks, signed paper —{" "}
            <span style={{ color: "#F5A623" }}>$5 inside NoHo.</span>
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            Real estate agents, escrow officers, transaction coordinators —
            stop sending an assistant on a 90-minute round trip. Five-dollar
            same-day inside NoHo, $9.75–$24 across the Valley, real human, photo
            proof of delivery.
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
        Lockbox keys · Earnest checks · Signed addenda · Disclosure packets — first run free
      </div>

      {/* Use cases */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-3 animate-fade-up">
            What we run for real estate
          </h2>
          <p className="text-text-light-muted text-center max-w-2xl mx-auto mb-12 animate-fade-up delay-200">
            Every transaction has 4–10 same-day delivery moments. We&apos;re the
            cheapest, fastest one inside the NoHo–Studio City–Burbank corridor.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {useCases.map((u, i) => (
              <div
                key={u.title}
                className="rounded-2xl p-6 hover-lift animate-fade-up"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-md)",
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

      {/* Offices we serve */}
      <section className="py-20 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light mb-3 animate-fade-up">
            We work with offices across the Valley
          </h2>
          <p className="text-text-light-muted max-w-2xl mx-auto mb-10 animate-fade-up delay-200">
            From Compass and Equity Union agents to boutique brokerages — book a
            run online, walk into our shop, or text. No vendor onboarding required.
          </p>
          <div className="flex flex-wrap justify-center gap-3 animate-fade-up delay-300">
            {offices.map((o) => (
              <span
                key={o}
                className="text-sm px-4 py-2 rounded-full font-semibold"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  color: "#7A6050",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {o}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4" style={{ color: "#F8F2EA" }}>
            First run is on us.
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            Book online or call. Reply &quot;REAL ESTATE&quot; if you&apos;re responding to
            our outreach so we know.
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
