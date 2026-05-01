import type { Metadata } from "next";
import Link from "next/link";
import { DELIVERY_ZONES } from "@/lib/delivery-zones";
import { ZIP_PAGES } from "@/lib/delivery-zip-pages";

export const metadata: Metadata = {
  title: "Same-Day Delivery Coverage — North Hollywood & Greater LA",
  description:
    "Full list of LA neighborhoods we serve same-day. $5 in NoHo, $9–$28 across the Valley and Greater LA. Check if your address is in zone, see the ETA, and book in 60 seconds.",
  openGraph: {
    title: "Same-Day Delivery Coverage Map — NOHO Mailbox",
    description:
      "Every LA neighborhood we deliver same-day to, with prices and ETAs.",
    url: "https://nohomailbox.org/coverage",
  },
  alternates: { canonical: "https://nohomailbox.org/coverage" },
};

export default function CoveragePage() {
  // Group ZIP pages by zone for easier visual scanning.
  const byZone = ZIP_PAGES.reduce<Record<number, typeof ZIP_PAGES>>(
    (acc, p) => {
      (acc[p.zoneId] ||= []).push(p);
      return acc;
    },
    {}
  );

  // Service area JSON-LD covering all neighborhoods.
  const serviceAreaJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: "NOHO Mailbox Same-Day Delivery — LA Coverage",
    description:
      "Same-day delivery coverage across North Hollywood, the San Fernando Valley, and Greater LA. Flat $5 inside NoHo, $9–$28 across LA.",
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
    areaServed: ZIP_PAGES.map((z) => ({
      "@type": "PostalCodeArea",
      name: z.neighborhood,
      postalCode: z.zip,
      addressRegion: "CA",
      addressCountry: "US",
    })),
  };

  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceAreaJsonLd) }}
      />

      {/* Hero */}
      <section className="relative py-20 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-5">
            Same-day delivery coverage map
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg">
            Every LA neighborhood we serve, grouped by zone with prices and ETAs.
            We&apos;ll grow this list as we add capacity.
          </p>
        </div>
      </section>

      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Don&apos;t see your zip? Call (818) 506-7744 — we usually can.
      </div>

      {/* Zones grid */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto space-y-10">
          {DELIVERY_ZONES.filter((z) => z.basePrice > 0).map((zone) => {
            const zips = byZone[zone.id] ?? [];
            return (
              <div
                key={zone.id}
                className="rounded-2xl p-7 animate-fade-up"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-md)",
                }}
              >
                <div className="flex items-baseline justify-between gap-4 flex-wrap mb-2">
                  <h2 className="text-2xl font-extrabold tracking-tight text-text-light">
                    {zone.name} —{" "}
                    <span style={{ color: "#337485" }}>
                      ${zone.basePrice.toFixed(2)} flat
                    </span>
                  </h2>
                  <span
                    className="text-xs font-bold uppercase tracking-wider"
                    style={{ color: "#7A6050" }}
                  >
                    ETA {zone.etaWindow}
                  </span>
                </div>
                <p className="text-sm text-text-light-muted mb-5">
                  {zone.label} · {zone.description}
                </p>
                {zips.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {zips.map((z) => (
                      <Link
                        key={z.zip}
                        href={`/delivery/${z.zip}`}
                        className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all hover:-translate-y-0.5"
                        style={{
                          background: "#FFFFFF",
                          border: "1px solid #E8D8C4",
                          color: "#337485",
                          boxShadow: "var(--shadow-sm)",
                        }}
                      >
                        {z.neighborhood} · {z.zip}
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {/* Extended call-for-quote */}
          <div
            className="rounded-2xl p-7 text-center"
            style={{
              background: "rgba(245,166,35,0.08)",
              border: "1px solid rgba(245,166,35,0.25)",
            }}
          >
            <p
              className="text-xs font-bold uppercase tracking-widest mb-2"
              style={{ color: "#92400e" }}
            >
              Beyond 30 miles · Call for quote
            </p>
            <p className="text-base font-bold text-text-light mb-2">
              Malibu · Calabasas · Pomona · Long Beach · Pasadena
            </p>
            <p className="text-sm text-text-light-muted mb-4">
              We can usually do it. Call us with the address and we&apos;ll
              quote it directly.
            </p>
            <a
              href="tel:+18185067744"
              className="inline-block text-white font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5"
              style={{ background: "#337485" }}
            >
              (818) 506-7744
            </a>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="text-3xl font-extrabold tracking-tight mb-4"
            style={{ color: "#F8F2EA" }}
          >
            Ready to book?
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            Click your ZIP above for the dedicated landing, or just book
            directly.
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
