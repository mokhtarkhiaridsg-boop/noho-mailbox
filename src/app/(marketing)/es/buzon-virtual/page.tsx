import type { Metadata } from "next";
import Link from "next/link";

// Spanish-language virtual mailbox landing for LA Hispanic + Latin American
// expats. Shorter than the English /virtual-mailbox hub — hero + 4 benefits
// + 3-tier pricing teaser + CTA. Casual Mexican Spanish, "tú" not "usted".

export const metadata: Metadata = {
  title:
    "Buzón Virtual en EE.UU. — Dirección Real desde $9.99/mes",
  description:
    "Dirección real en California con escaneo de correo en línea y reenvío semanal a cualquier lugar. Desde $9.99/mes. Para nómadas digitales, expatriados y dueños de LLC en el extranjero.",
  openGraph: {
    title:
      "Buzón Virtual en EE.UU. — Dirección Real, Reenviada a Donde Sea",
    description:
      "Dirección real en LA, panel de escaneo en línea, reenvío a cualquier estado. Desde $9.99/mes.",
    url: "https://nohomailbox.org/es/buzon-virtual",
    locale: "es_US",
  },
  alternates: {
    canonical: "https://nohomailbox.org/es/buzon-virtual",
    languages: {
      "en-US": "https://nohomailbox.org/virtual-mailbox",
      "es-US": "https://nohomailbox.org/es/buzon-virtual",
    },
  },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  "@id": "https://nohomailbox.org/es/buzon-virtual#service",
  serviceType: "Buzón Virtual",
  name: "Buzón Virtual — Dirección Real en EE.UU.",
  inLanguage: "es-US",
  description:
    "Dirección real en California con panel de escaneo de correo y reenvío a cualquier estado de EE.UU. Para nómadas digitales, trabajadores remotos, expatriados y dueños de LLC desde el extranjero.",
  url: "https://nohomailbox.org/es/buzon-virtual",
  provider: {
    "@type": "LocalBusiness",
    "@id": "https://nohomailbox.org#localbusiness",
    name: "NOHO Mailbox",
    telephone: "+1-818-506-7744",
    address: {
      "@type": "PostalAddress",
      streetAddress: "5062 Lankershim Blvd",
      addressLocality: "North Hollywood",
      addressRegion: "CA",
      postalCode: "91601",
      addressCountry: "US",
    },
  },
  areaServed: { "@type": "Country", name: "United States" },
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "USD",
    lowPrice: "9.99",
    highPrice: "29.99",
    offerCount: 3,
    availability: "https://schema.org/InStock",
  },
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
    {
      "@type": "ListItem",
      position: 2,
      name: "Buzón Virtual",
      item: "https://nohomailbox.org/es/buzon-virtual",
    },
  ],
};

const CREAM = "#F7E6C2";
const CREAM_DEEP = "#F0DBA9";
const BG_LIGHT = "#F8F2EA";
const BORDER = "#E8DDD0";
const INK = "#2D100F";
const INK_SOFT = "#5C4540";
const INK_FAINT = "#A89484";
const BLUE = "#337485";

export default function BuzonVirtualPage() {
  return (
    <main className="min-h-screen" style={{ background: BG_LIGHT, color: INK }}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(serviceJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero */}
      <section
        className="px-6 pt-16 pb-12 sm:pt-20 sm:pb-16"
        style={{
          background: `radial-gradient(ellipse at top, ${CREAM_DEEP} 0%, ${BG_LIGHT} 60%, #FFF9F3 100%)`,
        }}
      >
        <div className="max-w-5xl mx-auto text-center">
          {/* Breadcrumb */}
          <nav aria-label="Migas de pan" className="text-[11px] mb-5">
            <Link href="/es" style={{ color: INK_FAINT }} className="hover:underline">
              Inicio
            </Link>
            <span style={{ color: INK_FAINT }}> · </span>
            <span style={{ color: INK }} className="font-semibold">
              Buzón Virtual
            </span>
          </nav>

          <p
            className="text-[11px] font-black uppercase tracking-[0.18em]"
            style={{ color: BLUE }}
          >
            Buzón Virtual
          </p>
          <h1
            className="mt-3 font-black leading-[1.05] tracking-[-0.01em]"
            style={{
              color: INK,
              fontFamily: "var(--font-baloo), sans-serif",
              fontSize: "clamp(2.25rem, 6vw, 4rem)",
            }}
          >
            Buzón Virtual{" "}
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
            className="mt-5 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: INK_SOFT }}
          >
            Dirección real en Los Ángeles, panel de escaneo de correo en línea
            y reenvío semanal a donde tú estés. Desde $9.99/mes — sin contratos
            ni sorpresas.
          </p>

          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/signup?plan=virtual"
              className="rounded-2xl px-6 h-12 inline-flex items-center text-[13px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
                color: CREAM,
                boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
              }}
            >
              Empezar ahora
            </Link>
            <Link
              href="/es/contacto"
              className="rounded-2xl px-6 h-12 inline-flex items-center text-[13px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
              style={{
                background: "white",
                color: INK,
                border: `1.5px solid ${INK}`,
              }}
            >
              Tengo preguntas
            </Link>
          </div>

          {/* Address chip */}
          <div
            className="mt-9 mx-auto inline-flex items-center gap-3 rounded-2xl px-5 py-3"
            style={{ background: "white", border: `1px solid ${BORDER}` }}
          >
            <span
              className="w-9 h-9 rounded-xl inline-flex items-center justify-center"
              style={{ background: CREAM, color: INK }}
            >
              <svg
                viewBox="0 0 24 24"
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M12 22 C12 22 4 14 4 9 a8 8 0 0 1 16 0 c0 5 -8 13 -8 13 z" />
                <circle cx="12" cy="9" r="2.5" />
              </svg>
            </span>
            <div className="text-left">
              <p
                className="text-[10px] font-black uppercase tracking-[0.18em]"
                style={{ color: BLUE }}
              >
                Tu dirección
              </p>
              <p className="text-[14px] font-bold" style={{ color: INK }}>
                5062 Lankershim Blvd · North Hollywood, CA 91601
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="px-6 py-14 sm:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className="font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), sans-serif",
                color: INK,
                fontSize: "clamp(1.75rem, 4.5vw, 2.5rem)",
              }}
            >
              ¿Por qué un buzón virtual?
            </h2>
            <p
              className="mt-2 text-[15px] max-w-xl mx-auto"
              style={{ color: INK_SOFT }}
            >
              Sin caja postal genérica. Una dirección real que aceptan bancos,
              el DMV, Amazon y todos los carriers.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {[
              {
                title: "Dirección real, no P.O. Box",
                body: "Aceptamos paquetes de UPS, FedEx, DHL, Amazon y USPS. Las cajas postales rechazan los carriers privados.",
              },
              {
                title: "Escaneo en línea desde cualquier lugar",
                body: "Entra al panel desde tu celular, mira cada pieza de correo escaneada en horas. Tú decides: escanear, reenviar, triturar.",
              },
              {
                title: "Reenvío semanal a tu casa",
                body: "Los lunes reenviamos por lote a tu dirección — donde sea. Tarifa plana de $5 más el costo del envío real.",
              },
              {
                title: "Privacidad para tu dirección personal",
                body: "No pongas tu casa en Amazon, en Stripe o en los registros públicos. Usa nuestra dirección en LA.",
              },
            ].map((b, i) => (
              <div
                key={i}
                className="rounded-3xl p-5 sm:p-6"
                style={{
                  background: "white",
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
                }}
              >
                <span
                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl mb-3"
                  style={{ background: CREAM, color: INK }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12 L10 17 L19 7" />
                  </svg>
                </span>
                <h3 className="text-[14px] font-black mb-1.5" style={{ color: INK }}>
                  {b.title}
                </h3>
                <p
                  className="text-[13px] leading-relaxed"
                  style={{ color: INK_SOFT }}
                >
                  {b.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section
        className="px-6 py-12 sm:py-16"
        style={{ background: "#FFFDF8" }}
      >
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-10">
            <p
              className="text-[11px] font-black uppercase tracking-[0.18em]"
              style={{ color: BLUE }}
            >
              Planes
            </p>
            <h2
              className="mt-2 font-extrabold"
              style={{
                color: INK,
                fontFamily: "var(--font-baloo), sans-serif",
                fontSize: "clamp(1.75rem, 4.5vw, 2.5rem)",
              }}
            >
              Elige tu plan
            </h2>
            <p className="mt-3 text-sm" style={{ color: INK_SOFT }}>
              Cancela o cambia cuando quieras. Los meses no usados se acreditan
              a tu cuenta.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              {
                name: "Solo",
                price: "$9.99",
                note: "Hasta 25 piezas de correo al mes",
                popular: false,
              },
              {
                name: "Pro",
                price: "$19.99",
                note: "Hasta 100 piezas · escaneos prioritarios",
                popular: true,
              },
              {
                name: "Negocio",
                price: "$29.99",
                note: "Ilimitado · escaneos el mismo día · multi-usuario",
                popular: false,
              },
            ].map((tier) => (
              <div
                key={tier.name}
                className="rounded-3xl p-6 text-left"
                style={{
                  background: tier.popular ? INK : "white",
                  color: tier.popular ? CREAM : INK,
                  border: tier.popular ? "none" : `1px solid ${BORDER}`,
                  boxShadow: tier.popular
                    ? "0 14px 36px rgba(45,16,15,0.25)"
                    : "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)",
                }}
              >
                {tier.popular && (
                  <span
                    className="inline-block text-[10px] font-bold uppercase tracking-[0.18em] mb-2"
                    style={{ color: CREAM_DEEP }}
                  >
                    Más popular
                  </span>
                )}
                <p
                  className="text-[13px] font-bold uppercase tracking-[0.14em]"
                  style={{ color: tier.popular ? CREAM_DEEP : INK_FAINT }}
                >
                  {tier.name}
                </p>
                <p
                  className="font-extrabold tracking-tight mt-1 tabular-nums"
                  style={{
                    fontFamily: "var(--font-baloo), sans-serif",
                    fontSize: "clamp(2rem, 6vw, 2.75rem)",
                    lineHeight: 1,
                  }}
                >
                  {tier.price}
                  <span
                    className="text-base font-bold"
                    style={{ color: tier.popular ? CREAM_DEEP : INK_FAINT }}
                  >
                    /mes
                  </span>
                </p>
                <p
                  className="text-[13px] mt-3"
                  style={{ color: tier.popular ? CREAM_DEEP : INK_SOFT }}
                >
                  {tier.note}
                </p>
              </div>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link
              href="/signup?plan=virtual"
              className="inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
              style={{ background: INK, color: CREAM, minHeight: 48 }}
            >
              Empezar mi buzón virtual
              <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none">
                <path
                  d="M4 10 H16 M12 6 L16 10 L12 14"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
            <p className="mt-3 text-[11px]" style={{ color: INK_FAINT }}>
              Sin tarjeta de crédito para ver los planes. Cancela cuando quieras.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-16 sm:py-20 text-center">
        <div className="max-w-2xl mx-auto">
          <h2
            className="text-3xl sm:text-4xl font-black"
            style={{ color: INK, fontFamily: "var(--font-baloo), sans-serif" }}
          >
            ¿Tienes preguntas?
          </h2>
          <p className="mt-3 text-base" style={{ color: INK_SOFT }}>
            Escríbenos en español. Te respondemos en menos de 24 horas — o
            pásate a la tienda Lun–Sáb.
          </p>
          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <Link
              href="/es/contacto"
              className="inline-flex items-center rounded-2xl px-7 h-13 text-[14px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
              style={{
                padding: "0 28px",
                height: 52,
                background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
                color: CREAM,
                boxShadow: "0 8px 24px rgba(45,16,15,0.32)",
              }}
            >
              Contáctanos →
            </Link>
            <Link
              href="/es/negocios"
              className="inline-flex items-center rounded-2xl px-7 text-[14px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
              style={{
                padding: "0 28px",
                height: 52,
                background: "white",
                color: INK,
                border: `1.5px solid ${INK}`,
              }}
            >
              Forma tu LLC
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
