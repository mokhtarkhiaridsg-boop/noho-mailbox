import type { Metadata } from "next";
import Link from "next/link";
import QuoteForm from "./QuoteForm";

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Legal Courier — Same-Day Delivery for Law Firms",
  description:
    "Same-day legal courier service for law firms in North Hollywood, Studio City, Burbank, and the San Fernando Valley. $5 flat in NoHo, $9.75–$24 across LA. Court runs, original signatures, exhibit copies, signed pleadings, lockbox keys.",
  serviceType: "Legal Courier",
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
    url: "https://nohomailbox.org",
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
    description: "$5 flat same-day inside North Hollywood",
  },
  audience: {
    "@type": "BusinessAudience",
    audienceType: "Law Firms",
  },
};

export const metadata: Metadata = {
  title: "Same-Day Courier for Law Firms — North Hollywood",
  description:
    "$5 flat same-day delivery inside NoHo for solo and small law firms. Court drops, original signatures, exhibit copies, signed pleadings. Real human, walk-in storefront. (818) 506-7744.",
  openGraph: {
    title: "Same-Day Courier for Law Firms — NOHO Mailbox",
    description:
      "$5 flat same-day inside NoHo. Court runs, originals, exhibits, signed pleadings. Real human, walk-in storefront in North Hollywood.",
    url: "https://nohomailbox.org/delivery/for-law-firms",
  },
  alternates: {
    canonical: "https://nohomailbox.org/delivery/for-law-firms",
  },
};

const useCases = [
  {
    title: "Court runs",
    body:
      "Stanley Mosk, San Fernando Courthouse, Burbank, Glendale. Same-day filings without burning a paralegal&apos;s afternoon.",
  },
  {
    title: "Original signatures",
    body:
      "Wet-ink originals between counsel, between client and firm, or to escrow. We don&apos;t lose paper — chain of custody, photo proof of delivery.",
  },
  {
    title: "Exhibit copies",
    body:
      "Last-minute binders to opposing counsel, mediation deliveries, deposition prep across the Valley.",
  },
  {
    title: "Signed pleadings & retainers",
    body:
      "Out to clients, back to the firm, signed and stamped. Same day. $5 flat in NoHo, $9.75–$24 across LA.",
  },
];

const compare = [
  { label: "Inside NoHo", us: "$5 flat", them: "$25+ minimum" },
  { label: "Studio City / Burbank / Sherman Oaks", us: "$9.75 – $14", them: "$35+" },
  { label: "Membership required?", us: "No", them: "Often" },
  { label: "Walk-in counter?", us: "Yes — 5062 Lankershim", them: "No" },
  { label: "Real human on the phone?", us: "Yes, Mon–Sat", them: "Phone tree" },
  { label: "First run free?", us: "Yes", them: "No" },
];

export default function DeliveryForLawFirmsPage() {
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
            FOR ATTORNEYS · NORTH HOLLYWOOD
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            $5 court runs.{" "}
            <span style={{ color: "#F5A623" }}>Same hour.</span>
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            Solo and small law firms in NoHo, Studio City, and Burbank — stop
            burning your paralegal&apos;s afternoon on a $40 courier. Five-dollar flat
            same-day inside NoHo. No membership. First run free.
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

      {/* Cream personality strip */}
      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Court drops · Originals · Exhibits · Signed pleadings — first run on us
      </div>

      {/* Stats bar — by the numbers */}
      <section className="py-12 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { stat: "$5", label: "Flat in NoHo" },
            { stat: "30–60 min", label: "ETA in NoHo" },
            { stat: "Same hour", label: "Across the Valley" },
            { stat: "First run free", label: "No commitment" },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-xl p-5 text-center"
              style={{
                background: "#FFF9F3",
                border: "1px solid #E8D8C4",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <p
                className="text-3xl font-extrabold tracking-tight mb-1"
                style={{ color: "#337485" }}
              >
                {s.stat}
              </p>
              <p className="text-xs font-bold uppercase tracking-wider text-text-light-muted">
                {s.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Inline quote form (above the fold for desktop after hero) */}
      <section className="px-4 pb-12 bg-bg-light">
        <div className="max-w-2xl mx-auto">
          <QuoteForm />
        </div>
      </section>

      {/* Use cases */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-3 animate-fade-up">
            What we run for law firms
          </h2>
          <p className="text-text-light-muted text-center max-w-2xl mx-auto mb-12 animate-fade-up delay-200">
            We&apos;re a real walk-in storefront, not a dispatcher you can&apos;t reach.
            Drop off in person at 5062 Lankershim, or text us and we&apos;ll come to you.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {useCases.map((u, i) => (
              <div
                key={u.title}
                className="rounded-2xl p-7 hover-lift animate-fade-up"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-md)",
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <h3 className="font-extrabold tracking-tight text-text-light mb-2 text-lg">
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

      {/* Compare */}
      <section className="py-20 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            Us vs the regional couriers
          </h2>
          <div
            className="rounded-2xl overflow-hidden animate-fade-up delay-200"
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8D8C4",
              boxShadow: "var(--shadow-md)",
            }}
          >
            <div
              className="grid grid-cols-3 px-6 py-4 text-xs font-bold uppercase tracking-wider"
              style={{ background: "#F8F2EA", color: "#7A6050" }}
            >
              <span></span>
              <span style={{ color: "#337485" }}>NOHO Mailbox</span>
              <span>Big-name courier</span>
            </div>
            {compare.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-3 px-6 py-4 border-t text-sm"
                style={{ borderColor: "#E8D8C4" }}
              >
                <span className="font-bold text-text-light">{row.label}</span>
                <span className="font-bold" style={{ color: "#337485" }}>
                  {row.us}
                </span>
                <span className="text-text-light-muted">{row.them}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4" style={{ color: "#F8F2EA" }}>
            Try the first run on us.
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            Book online, walk in, or call. Reply &quot;LAW&quot; if you&apos;re responding to
            our outreach and we&apos;ll log it.
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
