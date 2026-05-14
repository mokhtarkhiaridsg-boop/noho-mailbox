import type { Metadata } from "next";
import Link from "next/link";

// Spanish-language landing page for LA's Hispanic market (50% of LA county).
// Real Mexican Spanish, casual "tú", not machine-translated. Mirrors the
// English homepage hero + service tiles + pricing teaser + CTA but kept
// shorter — this is a focused landing, not the full homepage rewrite.

export const metadata: Metadata = {
  title: {
    absolute:
      "NOHO Mailbox — Apartado Postal Privado en North Hollywood, CA",
  },
  description:
    "Dirección real en LA, escaneo de correo, envío el mismo día, notario público y formación de LLC. Planes desde $50. North Hollywood, CA.",
  openGraph: {
    title:
      "NOHO Mailbox — Apartado Postal Privado en North Hollywood, CA",
    description:
      "Dirección real, escaneo de correo, envío el mismo día, notario y formación de LLC. Tu negocio bajo un solo techo.",
    url: "https://nohomailbox.org/es",
    locale: "es_US",
  },
  alternates: {
    canonical: "https://nohomailbox.org/es",
    languages: {
      "en-US": "https://nohomailbox.org",
      "es-US": "https://nohomailbox.org/es",
    },
  },
};

const localBusinessJsonLd = {
  "@context": "https://schema.org",
  "@type": ["LocalBusiness", "PostalAndShippingService"],
  "@id": "https://nohomailbox.org#localbusiness",
  name: "NOHO Mailbox",
  alternateName: "NOHO Mailbox — Apartado Postal North Hollywood",
  inLanguage: "es-US",
  image: "https://nohomailbox.org/icon.svg",
  logo: "https://nohomailbox.org/icon.svg",
  url: "https://nohomailbox.org/es",
  telephone: "+1-818-506-7744",
  email: "hello@nohomailbox.org",
  priceRange: "$",
  paymentAccepted: "Efectivo, Tarjeta, Apple Pay, Google Pay, Square",
  currenciesAccepted: "USD",
  address: {
    "@type": "PostalAddress",
    streetAddress: "5062 Lankershim Blvd",
    addressLocality: "North Hollywood",
    addressRegion: "CA",
    postalCode: "91601",
    addressCountry: "US",
  },
  geo: { "@type": "GeoCoordinates", latitude: 34.1664, longitude: -118.3776 },
  areaServed: [
    { "@type": "City", name: "North Hollywood" },
    { "@type": "City", name: "Los Angeles" },
  ],
  description:
    "Apartado postal privado, escaneo de correo, manejo de paquetes, envío el mismo día, notario público y formación de LLC en North Hollywood, CA. Dirección real en Los Ángeles.",
  makesOffer: [
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Apartado postal privado",
      },
      priceCurrency: "USD",
      price: "50",
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Buzón virtual con escaneo de correo",
      },
      priceCurrency: "USD",
      price: "9.99",
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Formación de LLC + marca + sitio web",
      },
      priceCurrency: "USD",
      price: "2000",
    },
    {
      "@type": "Offer",
      itemOffered: {
        "@type": "Service",
        name: "Envío el mismo día por mensajero local",
      },
      priceCurrency: "USD",
      price: "5",
    },
  ],
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Inicio",
      item: "https://nohomailbox.org/es",
    },
  ],
};

// Color tokens — match the rest of the public site.
const CREAM = "#F7E6C2";
const INK = "#2D100F";
const BLUE = "#337485";

export default function SpanishHomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(localBusinessJsonLd),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* ─── HERO ─── */}
      <section
        className="relative overflow-hidden flex flex-col items-center justify-center text-center px-5 sm:px-6 pt-10 pb-12 sm:pt-20 sm:pb-16 min-h-[78vh]"
        style={{ background: CREAM }}
      >
        <div
          aria-hidden="true"
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle, rgba(45,16,15,0.1) 1.5px, transparent 1.5px)",
            backgroundSize: "26px 26px",
          }}
        />

        <div className="relative z-10 max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 mb-5 sm:mb-6 max-w-full">
            <span
              className="text-[10px] font-black uppercase tracking-[0.18em] sm:tracking-[0.24em] px-3 sm:px-4 py-2 rounded-full inline-flex items-center gap-1.5 leading-tight"
              style={{ background: INK, color: CREAM }}
            >
              5062 Lankershim · North Hollywood, CA
            </span>
          </div>

          <h1
            className="font-extrabold leading-[1.05] tracking-tight mb-4 sm:mb-5"
            style={{
              fontSize: "clamp(2.25rem, 6.5vw, 5rem)",
              color: INK,
              fontFamily: "var(--font-baloo), sans-serif",
            }}
          >
            Tu Dirección.
            <br />
            <span
              style={{
                fontFamily: "var(--font-pacifico), cursive",
                color: BLUE,
                fontWeight: 400,
              }}
            >
              para ti
            </span>
          </h1>

          <p
            className="leading-relaxed mb-6 sm:mb-8 max-w-md mx-auto"
            style={{ fontSize: "16px", color: "rgba(45,16,15,0.62)" }}
          >
            Apartado postal privado con escaneo de correo, envío el mismo día,
            notario público y formación de LLC — todo desde una sola tienda
            en tu vecindario.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-6">
            <Link
              href="/signup"
              data-ripple="true"
              className="font-black px-8 py-4 rounded-2xl text-[15px] transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: INK,
                color: CREAM,
                boxShadow: "0 6px 28px rgba(45,16,15,0.28)",
              }}
            >
              Solicita tu apartado →
            </Link>
            <a
              href="tel:+18185067744"
              className="font-bold px-8 py-4 rounded-2xl text-[15px] transition-all duration-200 hover:bg-black/5 inline-flex items-center justify-center gap-2"
              style={{
                border: "2px solid rgba(45,16,15,0.18)",
                color: INK,
              }}
            >
              (818) 506-7744
            </a>
          </div>

          <p
            className="text-[12px] mb-5"
            style={{ color: "rgba(45,16,15,0.5)" }}
          >
            Formulario de 30 segundos · Sin tarjeta de crédito · Suite lista
            en 15 minutos
          </p>
        </div>
      </section>

      {/* ─── 3 SERVICE TILES ─── */}
      <section
        className="py-14 sm:py-20 px-5 sm:px-6"
        style={{ background: "#FFFDF8" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10 sm:mb-14">
            <p
              className="font-black mb-2"
              style={{
                fontFamily: "var(--font-pacifico), cursive",
                fontSize: "1.2rem",
                color: BLUE,
              }}
            >
              Nuestros servicios
            </p>
            <h2
              className="font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), sans-serif",
                fontSize: "clamp(2rem, 4.5vw, 3.5rem)",
                color: INK,
              }}
            >
              Todo bajo un solo techo
            </h2>
            <p
              className="mt-3 text-[15px] max-w-xl mx-auto"
              style={{ color: "rgba(45,16,15,0.62)" }}
            >
              Apartado postal, buzón virtual, formación de negocio y mensajería
              — sin tener que correr a varios lugares.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                title: "Apartado postal privado",
                body: "Dirección real en Lankershim Blvd — no es un P.O. Box. Úsala para tu licencia, tu LLC, Amazon y cuentas de banco.",
                href: "/pricing",
                cta: "Ver planes",
                price: "Desde $50",
              },
              {
                title: "Buzón virtual",
                body: "Escaneo de correo en línea, panel digital, reenvío semanal a cualquier estado. Ideal si vives fuera de LA o viajas.",
                href: "/es/buzon-virtual",
                cta: "Buzón virtual",
                price: "Desde $9.99/mes",
              },
              {
                title: "Forma tu LLC",
                body: "LLC + EIN + libro de marca + sitio web + 12 meses de correo. Todo incluido por un precio fijo.",
                href: "/es/negocios",
                cta: "Lanza tu negocio",
                price: "$2,000 todo incluido",
              },
            ].map((tile) => (
              <Link
                key={tile.title}
                href={tile.href}
                className="group block rounded-3xl p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
                style={{
                  background: "white",
                  boxShadow: "0 8px 28px rgba(45,16,15,0.08)",
                  border: "1px solid #E8DDD0",
                }}
              >
                <p
                  className="text-[11px] font-black uppercase tracking-[0.18em] mb-3"
                  style={{ color: BLUE }}
                >
                  {tile.price}
                </p>
                <h3
                  className="font-extrabold text-[20px] mb-2"
                  style={{
                    color: INK,
                    fontFamily: "var(--font-baloo), sans-serif",
                  }}
                >
                  {tile.title}
                </h3>
                <p
                  className="text-[14px] leading-relaxed mb-4"
                  style={{ color: "rgba(45,16,15,0.65)" }}
                >
                  {tile.body}
                </p>
                <span
                  className="inline-flex items-center gap-1 text-[13px] font-black"
                  style={{ color: INK }}
                >
                  {tile.cta} →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRICING TEASER ─── */}
      <section
        className="py-14 sm:py-20 px-5 sm:px-6"
        style={{ background: CREAM }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p
              className="font-black mb-2"
              style={{
                fontFamily: "var(--font-pacifico), cursive",
                fontSize: "1.2rem",
                color: BLUE,
              }}
            >
              Planes simples
            </p>
            <h2
              className="font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), sans-serif",
                fontSize: "clamp(2rem, 4.5vw, 3rem)",
                color: INK,
              }}
            >
              Cada plan, dirección real
            </h2>
            <p
              className="mt-3 text-[15px]"
              style={{ color: "rgba(45,16,15,0.5)" }}
            >
              No es un P.O. Box — es un número de suite que puedes usar donde
              quieras.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                name: "Básico",
                price: "$50",
                term: "/ 3 meses",
                tagline: "Solos y trabajadores remotos",
                features: [
                  "Dirección real en Lankershim",
                  "Panel de escaneo de correo",
                  "Alertas SMS y email",
                  "Recoge en tienda",
                ],
                popular: false,
              },
              {
                name: "Negocio",
                price: "$80",
                term: "/ 3 meses",
                tagline: "LLCs y pequeños negocios",
                features: [
                  "Todo lo del plan Básico",
                  "Reenvío de correo mundial",
                  "Manejo prioritario",
                  "Número de suite dedicado",
                ],
                popular: true,
              },
              {
                name: "Premium",
                price: "$95",
                term: "/ 3 meses",
                tagline: "Vendedores de alto volumen",
                features: [
                  "Todo lo del plan Negocio",
                  "Créditos de envío el mismo día",
                  "Descuento de notario (15%)",
                  "Línea de soporte concierge",
                ],
                popular: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className="rounded-3xl p-6 text-center"
                style={{
                  background: plan.popular ? INK : "white",
                  color: plan.popular ? CREAM : INK,
                  border: plan.popular
                    ? "none"
                    : "1px solid rgba(45,16,15,0.08)",
                  boxShadow: plan.popular
                    ? "0 14px 36px rgba(45,16,15,0.25)"
                    : "0 8px 24px rgba(45,16,15,0.10)",
                }}
              >
                {plan.popular && (
                  <span
                    className="inline-block text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full mb-3"
                    style={{ background: BLUE, color: "white" }}
                  >
                    ★ Más popular
                  </span>
                )}
                <p
                  className="text-[10px] font-black uppercase tracking-[0.2em] mb-1"
                  style={{
                    color: plan.popular
                      ? "rgba(247,230,194,0.55)"
                      : "rgba(45,16,15,0.45)",
                  }}
                >
                  {plan.tagline}
                </p>
                <h3
                  className="font-black text-2xl mb-1"
                  style={{
                    color: plan.popular ? CREAM : INK,
                    fontFamily: "var(--font-baloo), sans-serif",
                  }}
                >
                  {plan.name}
                </h3>
                <div className="flex items-end justify-center gap-1 mb-5">
                  <span
                    className="font-extrabold"
                    style={{
                      fontSize: "2.75rem",
                      color: plan.popular ? CREAM : INK,
                      fontFamily: "var(--font-baloo), sans-serif",
                    }}
                  >
                    {plan.price}
                  </span>
                  <span
                    className="text-sm mb-1.5"
                    style={{
                      color: plan.popular
                        ? "rgba(247,230,194,0.55)"
                        : "rgba(45,16,15,0.45)",
                    }}
                  >
                    {plan.term}
                  </span>
                </div>
                <ul className="space-y-2 text-sm mb-6 text-left">
                  {plan.features.map((f) => (
                    <li
                      key={f}
                      className="flex items-start gap-2"
                      style={{
                        color: plan.popular
                          ? "rgba(247,230,194,0.78)"
                          : "rgba(45,16,15,0.78)",
                      }}
                    >
                      <span
                        className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: plan.popular ? CREAM : BLUE }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className="block text-center font-black py-3 rounded-2xl text-sm transition-all duration-200 hover:scale-[1.02]"
                  style={{
                    background: plan.popular ? BLUE : INK,
                    color: plan.popular ? "white" : CREAM,
                  }}
                >
                  Elige {plan.name}
                </Link>
              </div>
            ))}
          </div>

          <p
            className="text-center mt-8 text-sm"
            style={{ color: "rgba(45,16,15,0.5)" }}
          >
            Más planes de 6 y 14 meses disponibles —{" "}
            <Link
              href="/pricing"
              className="font-black hover:underline"
              style={{ color: BLUE }}
            >
              Ver todos los precios →
            </Link>
          </p>
        </div>
      </section>

      {/* ─── FINAL CTA ─── */}
      <section
        className="py-14 sm:py-20 px-5 sm:px-6"
        style={{ background: "#FFFDF8" }}
      >
        <div
          className="max-w-3xl mx-auto rounded-3xl p-8 sm:p-12 text-center"
          style={{
            background: "white",
            boxShadow: "0 24px 60px rgba(45,16,15,0.15)",
            border: "1.5px solid rgba(45,16,15,0.08)",
          }}
        >
          <h2
            className="font-extrabold tracking-tight mb-4"
            style={{
              fontFamily: "var(--font-baloo), sans-serif",
              fontSize: "clamp(1.85rem, 4vw, 2.75rem)",
              color: INK,
            }}
          >
            ¿Listo para tu suite?
          </h2>
          <p
            className="text-[15px] leading-relaxed mb-7 max-w-md mx-auto"
            style={{ color: "rgba(45,16,15,0.65)" }}
          >
            Llena el formulario en 30 segundos. Te enviamos un texto en menos
            de 1 día hábil para agendar tu visita — o terminas en línea con
            un enlace de Square.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/signup"
              data-ripple="true"
              className="inline-flex items-center justify-center font-black px-8 py-4 rounded-2xl text-[15px] transition-all duration-200 hover:scale-[1.02]"
              style={{
                background: INK,
                color: CREAM,
                boxShadow: "0 6px 28px rgba(45,16,15,0.28)",
              }}
            >
              Solicita tu apartado →
            </Link>
            <Link
              href="/es/contacto"
              className="inline-flex items-center justify-center font-bold px-8 py-4 rounded-2xl text-[15px] transition-colors duration-200 hover:bg-black/5"
              style={{
                border: "2px solid rgba(45,16,15,0.18)",
                color: INK,
              }}
            >
              Contáctanos
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
