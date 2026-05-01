import type { Metadata } from "next";
import Link from "next/link";

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Same-Day Medical/Dental Office Courier",
  description:
    "Same-day delivery for small medical and dental offices in NoHo / Studio City / Burbank. Lab work without PHI, supplies, dentures, scripts, equipment. $5 flat in NoHo.",
  serviceType: "Medical Office Courier",
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
    audienceType: "Medical and Dental Offices",
  },
};

export const metadata: Metadata = {
  title: "Same-Day Courier for Dental & Medical Offices — North Hollywood",
  description:
    "$5 flat same-day delivery for small dental and medical offices in NoHo. Lab work (non-PHI), supplies, dentures, scripts, equipment between offices. Walk-in storefront.",
  openGraph: {
    title: "Medical / Dental Office Courier — NOHO Mailbox",
    description:
      "$5 flat same-day to small dental + medical offices in NoHo. Cheaper than your assistant's drive time.",
    url: "https://nohomailbox.org/delivery/for-medical-offices",
  },
  alternates: {
    canonical: "https://nohomailbox.org/delivery/for-medical-offices",
  },
};

const useCases = [
  {
    title: "Dental lab work",
    body:
      "Impressions to the lab, dentures and crowns back to your office. Photo proof of delivery, real-human pickup at the counter.",
  },
  {
    title: "Office supplies",
    body:
      "From your supplier or the dental warehouse to your front desk. $5 flat in NoHo — way cheaper than your assistant&apos;s 90-minute round trip.",
  },
  {
    title: "Equipment between offices",
    body:
      "If you have multiple practices in the Valley, we shuttle equipment, paperwork (non-PHI), and supplies same-day at flat zone pricing.",
  },
  {
    title: "Pharmacy scripts (non-controlled)",
    body:
      "Standard scripts from your office to a local pharmacy. We do not deliver controlled substances or anything PHI-protected.",
  },
  {
    title: "Sample materials & marketing",
    body:
      "Boxes of swag, brochures, gift bags from a print shop to your office for events and giveaways.",
  },
];

const honestRedLine = [
  {
    t: "We do NOT handle PHI without a BAA",
    b: "Patient charts, specimens (blood, tissue, urine), lab results with patient names, or anything HIPAA-protected — go to ClockWork Express. They have BAA agreements, refrigerated transport, and OSHA-trained drivers. We&apos;re happy to refer you.",
  },
  {
    t: "We do NOT deliver controlled substances",
    b: "DEA Schedule II–V medications require licensed couriers. Use a pharmacy delivery service or your script sponsor&apos;s preferred channel.",
  },
  {
    t: "We are NOT a 24/7 emergency courier",
    b: "Mon–Sat business hours only. For after-hours specimen runs, ClockWork or California Courier are 24/7.",
  },
];

export default function DeliveryForMedicalOfficesPage() {
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
            FOR DENTAL · MEDICAL · CHIROPRACTIC OFFICES
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            $5 lab and supply runs.{" "}
            <span style={{ color: "#F5A623" }}>Same hour.</span>
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            Small dental, medical, and chiropractic offices in NoHo / Studio City
            / Burbank — stop paying $40/run for ClockWork on the boring stuff.
            Five-dollar flat inside NoHo for everything that&apos;s not PHI.
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
        $5 NoHo · $9.75–$14 across the Valley · No PHI / no controlled substances
      </div>

      {/* What we run */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-3 animate-fade-up">
            What we run for medical &amp; dental offices
          </h2>
          <p className="text-text-light-muted text-center max-w-2xl mx-auto mb-12 animate-fade-up delay-200">
            We&apos;re not the right fit for HIPAA-protected work — but for the
            non-PHI stack, we save you 60–80% vs the big medical couriers.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

      {/* Honest red lines */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-3">
            What we&apos;re honest about
          </h2>
          <p className="text-text-light-muted mb-6">
            Medical courier has hard rules. Here are the lines we don&apos;t
            cross:
          </p>
          <div className="space-y-3">
            {honestRedLine.map((r, i) => (
              <div
                key={r.t}
                className="rounded-xl p-5 flex gap-4"
                style={{
                  background: "rgba(220,38,38,0.04)",
                  border: "1px solid rgba(220,38,38,0.18)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <span
                  className="text-base font-extrabold flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center"
                  style={{
                    background: "rgba(220,38,38,0.15)",
                    color: "#dc2626",
                  }}
                  aria-hidden
                >
                  ✕
                </span>
                <div>
                  <h3 className="font-bold text-text-light text-sm mb-1">
                    {r.t}
                  </h3>
                  <p
                    className="text-xs leading-relaxed text-text-light-muted"
                    dangerouslySetInnerHTML={{ __html: r.b }}
                  />
                </div>
              </div>
            ))}
          </div>
          <p
            className="mt-6 text-sm rounded-xl p-4"
            style={{
              background: "rgba(51,116,133,0.06)",
              border: "1px solid rgba(51,116,133,0.18)",
              color: "#23596A",
            }}
          >
            <strong>Translation:</strong> if you handle a steady stream of
            specimens, charts, or controlled substances, hire a real medical
            courier. If your office has a constant trickle of supplies,
            dentures, scripts, and non-PHI paperwork moving around — we&apos;re
            cheap, fast, and reliable.
          </p>
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
            $5 flat inside NoHo, $9.75–$14 across the Valley. No subscription.
            Real human, walk-in storefront at 5062 Lankershim.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
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
    </div>
  );
}
