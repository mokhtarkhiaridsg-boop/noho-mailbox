import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DELIVERY_ZONES } from "@/lib/delivery-zones";
import { ZIP_PAGES, getZipPage, getAllZipSlugs } from "@/lib/delivery-zip-pages";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllZipSlugs().map((zip) => ({ zip }));
}

type Params = { params: Promise<{ zip: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { zip } = await params;
  const meta = getZipPage(zip);
  if (!meta) return { title: "Delivery zone not found" };
  const zone = DELIVERY_ZONES.find((z) => z.id === meta.zoneId);
  const priceLabel = zone && zone.basePrice > 0 ? `$${zone.basePrice.toFixed(2)}` : "custom quote";

  return {
    title: `Same-Day Delivery ${meta.neighborhood} (${zip}) — ${priceLabel} flat`,
    description: `Same-day delivery to ${meta.neighborhood} ${zip} from NOHO Mailbox. ${priceLabel} flat in ${zone?.name ?? "your zone"}, ETA ${zone?.etaWindow ?? "same day"}. Real human, walk-in storefront in NoHo. (818) 506-7744.`,
    openGraph: {
      title: `Same-Day Courier to ${meta.neighborhood} ${zip}`,
      description: `${priceLabel} flat same-day delivery to ${meta.neighborhood}. ETA ${zone?.etaWindow ?? "same day"}.`,
      url: `https://nohomailbox.org/delivery/${zip}`,
    },
    alternates: {
      canonical: `https://nohomailbox.org/delivery/${zip}`,
    },
    keywords: meta.searchTerms.join(", "),
  };
}

export default async function DeliveryZipPage({ params }: Params) {
  const { zip } = await params;
  const meta = getZipPage(zip);
  if (!meta) notFound();

  const zone = DELIVERY_ZONES.find((z) => z.id === meta.zoneId);
  if (!zone) notFound();

  const priceLabel = zone.basePrice > 0 ? `$${zone.basePrice.toFixed(2)}` : "custom quote";
  const rushPrice = zone.basePrice > 0
    ? `$${(zone.basePrice * zone.rushMultiplier).toFixed(2)}`
    : null;
  const whiteGlovePrice = zone.basePrice > 0
    ? `$${(zone.basePrice * zone.whiteGloveMultiplier).toFixed(2)}`
    : null;

  // Service + LocalBusiness JSON-LD scoped to this zip area.
  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `Same-Day Delivery to ${meta.neighborhood} ${zip}`,
    description: `${priceLabel} flat same-day delivery service from NOHO Mailbox to ${meta.neighborhood}, CA ${zip}.`,
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
    areaServed: {
      "@type": "PostalCodeArea",
      name: meta.neighborhood,
      postalCode: zip,
      addressRegion: "CA",
      addressCountry: "US",
    },
    offers: zone.basePrice > 0 ? {
      "@type": "Offer",
      price: zone.basePrice.toFixed(2),
      priceCurrency: "USD",
      availability: "https://schema.org/InStock",
    } : undefined,
  };

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
            ZIP {zip} · {zone.name.toUpperCase()} ZONE
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Same-Day Delivery to{" "}
            <span style={{ color: "#F5A623" }}>{meta.neighborhood}</span>
          </h1>
          <p className="text-text-dark-muted max-w-2xl mx-auto text-lg animate-fade-up delay-200">
            {meta.hook}
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

      {/* Cream price band */}
      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        <strong>{priceLabel}</strong> flat to {zip} · ETA {zone.etaWindow} · No membership · First run on us
      </div>

      {/* Pricing tiers */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            Pricing for {meta.neighborhood}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              className="rounded-2xl p-7 text-center hover-lift animate-fade-up"
              style={{
                background: "#FFF9F3",
                border: "1px solid #E8D8C4",
                boxShadow: "var(--shadow-md)",
              }}
            >
              <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#7A6050" }}>
                Standard
              </div>
              <div className="text-4xl font-extrabold tracking-tight mb-2" style={{ color: "#337485" }}>
                {priceLabel}
              </div>
              <div className="text-sm text-text-light-muted">
                ETA {zone.etaWindow}
              </div>
            </div>

            {rushPrice && (
              <div
                className="rounded-2xl p-7 text-center hover-lift animate-fade-up delay-100"
                style={{
                  background:
                    "linear-gradient(145deg, #B07030 0%, #8A5520 100%)",
                  boxShadow: "0 12px 40px rgba(176,112,48,0.3)",
                  color: "#fff",
                }}
              >
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#FFE4A0" }}>
                  Rush · 1.5×
                </div>
                <div className="text-4xl font-extrabold tracking-tight mb-2" style={{ color: "#FFE4A0" }}>
                  {rushPrice}
                </div>
                <div className="text-sm" style={{ color: "rgba(255,255,255,0.85)" }}>
                  Priority ahead of standard runs
                </div>
              </div>
            )}

            {whiteGlovePrice && (
              <div
                className="rounded-2xl p-7 text-center hover-lift animate-fade-up delay-200"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-md)",
                }}
              >
                <div className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#7A6050" }}>
                  White Glove
                </div>
                <div className="text-4xl font-extrabold tracking-tight mb-2" style={{ color: "#337485" }}>
                  {whiteGlovePrice}
                </div>
                <div className="text-sm text-text-light-muted">
                  Hand-delivery + photo proof + sign-back
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            What we run for {meta.neighborhood} businesses
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {meta.useCases.map((u, i) => (
              <div
                key={u}
                className="flex items-start gap-3 rounded-xl p-5 animate-fade-up"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-sm)",
                  animationDelay: `${i * 80}ms`,
                }}
              >
                <span
                  className="mt-1 w-2 h-2 rounded-full flex-shrink-0"
                  style={{ background: "#337485" }}
                />
                <span
                  className="text-sm leading-relaxed text-text-light-muted"
                  dangerouslySetInnerHTML={{ __html: u }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Other zips nav */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light text-center mb-8 animate-fade-up">
            Other neighborhoods we serve
          </h2>
          <div className="flex flex-wrap justify-center gap-2 animate-fade-up delay-200">
            {ZIP_PAGES.filter((z) => z.zip !== zip).map((z) => (
              <Link
                key={z.zip}
                href={`/delivery/${z.zip}`}
                className="text-xs px-3 py-1.5 rounded-full font-semibold transition-all hover:-translate-y-0.5"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  color: "#7A6050",
                  boxShadow: "var(--shadow-sm)",
                }}
              >
                {z.neighborhood} · {z.zip}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4" style={{ color: "#F8F2EA" }}>
            First run to {zip} is on us.
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            Book online, walk into 5062 Lankershim Blvd, or call. No membership.
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
