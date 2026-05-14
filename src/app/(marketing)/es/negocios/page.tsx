import type { Metadata } from "next";
import Link from "next/link";

// Spanish-language business bundle landing page. Stripped to hero +
// 5-bullet what's-included + price card + CTA. Targets LA Hispanic
// entrepreneurs starting a business who want everything done in
// Spanish from one shop.

export const metadata: Metadata = {
  title: "Forma tu LLC + Marca + Sitio Web — $2,000 Todo Incluido",
  description:
    "Formación de LLC en California + EIN + libro de marca + sitio web de 5 páginas + 12 meses de correo en nuestra dirección de LA — $2,000 todo incluido. Lánzate con todo bajo un solo techo.",
  openGraph: {
    title:
      "Lanza tu Negocio — $2,000 Todo Incluido · NOHO Mailbox",
    description:
      "LLC + EIN + marca + sitio web + 12 meses de correo en LA. Todo incluido por $2,000. Pasa a la tienda para una consulta gratis.",
    url: "https://nohomailbox.org/es/negocios",
    locale: "es_US",
  },
  alternates: {
    canonical: "https://nohomailbox.org/es/negocios",
    languages: {
      "en-US": "https://nohomailbox.org/business-solutions",
      "es-US": "https://nohomailbox.org/es/negocios",
    },
  },
};

const serviceJsonLd = {
  "@context": "https://schema.org",
  "@type": "Service",
  name: "Paquete de Lanzamiento de Negocio — LLC + Marca + Sitio Web + Correo",
  inLanguage: "es-US",
  description:
    "Formación completa de LLC en California (registro estatal + EIN), libro de marca (logo + colores + tipografía + 50 tarjetas de presentación), sitio web de 5 páginas en tu dominio y 12 meses de correo en nuestra dirección de LA.",
  provider: {
    "@type": "LocalBusiness",
    "@id": "https://nohomailbox.org#localbusiness",
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
    url: "https://nohomailbox.org/es",
  },
  areaServed: { "@type": "City", name: "Los Angeles" },
  offers: {
    "@type": "Offer",
    price: "2000",
    priceCurrency: "USD",
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
      name: "Negocios",
      item: "https://nohomailbox.org/es/negocios",
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

const included = [
  {
    title: "Formación de LLC en California",
    body: "Registro estatal (incluye los $70 del estado) + EIN con el IRS. Tu LLC, registrada a tu nombre.",
  },
  {
    title: "Libro de marca completo",
    body: "Logo, paleta de colores, tipografía, guía de uso y 50 tarjetas de presentación impresas. Archivos en SVG y PDF — tuyos para siempre.",
  },
  {
    title: "Sitio web de 5 páginas",
    body: "En tu propio dominio, listo para vender. Hosting gratis por el primer año. Diseño responsivo, optimizado para celular.",
  },
  {
    title: "12 meses de correo en LA",
    body: "Dirección real en Lankershim Blvd para tus filings, banco y carriers. Notarización del Formulario 1583 gratis en la tienda.",
  },
  {
    title: "Atención en español, todo bajo un solo techo",
    body: "Hablamos contigo, no con un robot. Sin pasar a LegalZoom — tú vienes a la tienda, nosotros lo hacemos contigo.",
  },
];

export default function NegociosPage() {
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
          <nav aria-label="Migas de pan" className="text-[11px] mb-5">
            <Link
              href="/es"
              style={{ color: INK_FAINT }}
              className="hover:underline"
            >
              Inicio
            </Link>
            <span style={{ color: INK_FAINT }}> · </span>
            <span style={{ color: INK }} className="font-semibold">
              Negocios
            </span>
          </nav>

          <p
            className="text-[11px] font-black uppercase tracking-[0.18em]"
            style={{ color: BLUE }}
          >
            Paquete de Lanzamiento
          </p>
          <h1
            className="mt-3 font-black leading-[1.05] tracking-[-0.01em]"
            style={{
              color: INK,
              fontFamily: "var(--font-baloo), sans-serif",
              fontSize: "clamp(2.25rem, 6vw, 4rem)",
            }}
          >
            Lanza tu negocio{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), cursive",
                color: BLUE,
                fontWeight: 400,
              }}
            >
              en grande
            </span>
          </h1>
          <p
            className="mt-5 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed"
            style={{ color: INK_SOFT }}
          >
            LLC + marca + sitio web + dirección en LA — todo por $2,000. Sin
            cuotas escondidas. Ven a la tienda para una consulta gratis de
            20 minutos.
          </p>

          <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
            <Link
              href="/es/contacto"
              className="rounded-2xl px-6 h-12 inline-flex items-center text-[13px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
                color: CREAM,
                boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
              }}
            >
              Agendar consulta
            </Link>
            <a
              href="tel:+18185067744"
              className="rounded-2xl px-6 h-12 inline-flex items-center text-[13px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
              style={{
                background: "white",
                color: INK,
                border: `1.5px solid ${INK}`,
              }}
            >
              (818) 506-7744
            </a>
          </div>
        </div>
      </section>

      {/* What's Included */}
      <section className="px-6 py-14 sm:py-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2
              className="font-extrabold tracking-tight"
              style={{
                fontFamily: "var(--font-baloo), sans-serif",
                color: INK,
                fontSize: "clamp(1.75rem, 4.5vw, 2.5rem)",
              }}
            >
              Lo que incluye
            </h2>
            <p
              className="mt-2 text-[15px] max-w-xl mx-auto"
              style={{ color: INK_SOFT }}
            >
              Cinco cosas que normalmente tendrías que conseguir por separado
              — aquí van todas juntas.
            </p>
          </div>

          <ol className="space-y-4">
            {included.map((item, i) => (
              <li
                key={item.title}
                className="flex gap-4 sm:gap-5 items-start rounded-2xl p-5 sm:p-6"
                style={{
                  background: "white",
                  border: `1px solid ${BORDER}`,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
                }}
              >
                <span
                  className="font-extrabold leading-none tabular-nums shrink-0"
                  style={{
                    fontFamily: "var(--font-baloo), sans-serif",
                    color: CREAM_DEEP,
                    fontSize: "clamp(2rem, 5vw, 2.75rem)",
                  }}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <div className="min-w-0">
                  <h3
                    className="font-extrabold text-[15px] sm:text-base mb-1"
                    style={{
                      color: INK,
                      fontFamily: "var(--font-baloo), sans-serif",
                    }}
                  >
                    {item.title}
                  </h3>
                  <p
                    className="text-[14px] leading-relaxed"
                    style={{ color: INK_SOFT }}
                  >
                    {item.body}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Price Card */}
      <section
        className="px-6 py-14 sm:py-20"
        style={{ background: "#FFFDF8" }}
      >
        <div className="max-w-2xl mx-auto">
          <div
            className="rounded-3xl p-8 sm:p-12 text-center"
            style={{
              background: `linear-gradient(160deg, ${INK} 0%, #1F0807 100%)`,
              color: CREAM,
              boxShadow: "0 24px 60px rgba(45,16,15,0.30)",
            }}
          >
            <p
              className="text-[11px] font-black uppercase tracking-[0.2em]"
              style={{ color: CREAM_DEEP }}
            >
              Precio fijo · Todo incluido
            </p>
            <p
              className="mt-3 font-extrabold tabular-nums"
              style={{
                fontFamily: "var(--font-baloo), sans-serif",
                fontSize: "clamp(4rem, 12vw, 7rem)",
                lineHeight: 1,
                color: CREAM,
              }}
            >
              $2,000
            </p>
            <p
              className="mt-3 text-[14px] sm:text-base max-w-md mx-auto"
              style={{ color: CREAM_DEEP }}
            >
              Sin cuotas mensuales escondidas. Sin paquetes de upgrades
              forzados. Todo lo de arriba, un solo pago.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Link
                href="/es/contacto"
                className="rounded-2xl px-7 inline-flex items-center text-[14px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
                style={{
                  height: 52,
                  background: CREAM,
                  color: INK,
                  boxShadow: "0 8px 24px rgba(247,230,194,0.20)",
                }}
              >
                Empezar ahora →
              </Link>
              <a
                href="tel:+18185067744"
                className="rounded-2xl px-7 inline-flex items-center text-[14px] font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
                style={{
                  height: 52,
                  background: "transparent",
                  color: CREAM,
                  border: `1.5px solid ${CREAM_DEEP}`,
                }}
              >
                Llámanos
              </a>
            </div>
            <p
              className="mt-5 text-[12px]"
              style={{ color: "rgba(247,230,194,0.55)" }}
            >
              California cobra $800/año de franchise tax — eso es del estado,
              no de nosotros.
            </p>
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="px-6 py-12 sm:py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h2
            className="font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-baloo), sans-serif",
              color: INK,
              fontSize: "clamp(1.5rem, 4vw, 2rem)",
            }}
          >
            También te puede interesar
          </h2>
          <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Link
              href="/es/buzon-virtual"
              className="rounded-2xl p-6 text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: "white",
                border: `1px solid ${BORDER}`,
                color: INK,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <p
                className="text-[11px] font-black uppercase tracking-[0.18em] mb-2"
                style={{ color: BLUE }}
              >
                Buzón Virtual
              </p>
              <p
                className="font-extrabold text-[17px] mb-1"
                style={{
                  fontFamily: "var(--font-baloo), sans-serif",
                }}
              >
                Dirección real, desde $9.99/mes
              </p>
              <p className="text-[13px]" style={{ color: INK_SOFT }}>
                Si solo necesitas la dirección + escaneo en línea, no el
                paquete completo de negocio.
              </p>
            </Link>
            <Link
              href="/es/contacto"
              className="rounded-2xl p-6 text-left transition-transform hover:-translate-y-0.5"
              style={{
                background: "white",
                border: `1px solid ${BORDER}`,
                color: INK,
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <p
                className="text-[11px] font-black uppercase tracking-[0.18em] mb-2"
                style={{ color: BLUE }}
              >
                Contacto
              </p>
              <p
                className="font-extrabold text-[17px] mb-1"
                style={{
                  fontFamily: "var(--font-baloo), sans-serif",
                }}
              >
                Habla con nosotros en español
              </p>
              <p className="text-[13px]" style={{ color: INK_SOFT }}>
                Respondemos en menos de 24 horas. O pásate a la tienda Lun–Sáb.
              </p>
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
