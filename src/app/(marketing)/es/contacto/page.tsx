// Spanish-language contact page. Server wrapper that exports the metadata
// (which client components can't) and feeds live operating hours into the
// client form below. Mirrors the English /contact pattern exactly.

import type { Metadata } from "next";
import ContactoClient from "./ContactoClient";
import { getOperatingHours } from "@/app/actions/operatingHours";

export const metadata: Metadata = {
  title: "Contáctanos — NOHO Mailbox",
  description:
    "Habla con NOHO Mailbox en español. Respondemos en menos de 24 horas — o pásate a la tienda Lun–Sáb en 5062 Lankershim Blvd, North Hollywood. Llama al (818) 506-7744.",
  openGraph: {
    title: "Contáctanos — NOHO Mailbox",
    description:
      "Mándanos un mensaje en español sobre apartado postal, notario o tu LLC. Respondemos en menos de 24 horas.",
    url: "https://nohomailbox.org/es/contacto",
    locale: "es_US",
  },
  alternates: {
    canonical: "https://nohomailbox.org/es/contacto",
    languages: {
      "en-US": "https://nohomailbox.org/contact",
      "es-US": "https://nohomailbox.org/es/contacto",
    },
  },
};

const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contacto NOHO Mailbox",
  inLanguage: "es-US",
  url: "https://nohomailbox.org/es/contacto",
  mainEntity: {
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
    email: "nohomailbox@gmail.com",
    openingHoursSpecification: [
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "09:30",
        closes: "13:30",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "14:00",
        closes: "17:30",
      },
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: "Saturday",
        opens: "10:00",
        closes: "13:30",
      },
    ],
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
      name: "Contacto",
      item: "https://nohomailbox.org/es/contacto",
    },
  ],
};

function to12h(hhmm: string): string {
  const [hh, mm] = hhmm.split(":").map((s) => parseInt(s, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return hhmm;
  const ampm = hh >= 12 ? "pm" : "am";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm === 0
    ? `${h12}${ampm}`
    : `${h12}:${String(mm).padStart(2, "0")}${ampm}`;
}

function formatBreakLabel(
  breakHHMM: [string, string] | undefined,
): string | null {
  if (!breakHHMM) return null;
  return `${to12h(breakHHMM[0])} – ${to12h(breakHHMM[1])}`;
}

export default async function ContactoPage() {
  const hours = await getOperatingHours();
  const weekdayHours = hours.weekly[1]?.hours ?? "9:30am – 5:30pm";
  const saturdayHours = hours.weekly[6]?.hours ?? "10am – 1:30pm";
  const breakLabel = formatBreakLabel(hours.weekly[1]?.breakHHMM);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(contactJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <ContactoClient
        weekdayHours={weekdayHours}
        saturdayHours={saturdayHours}
        breakLabel={breakLabel}
      />
    </>
  );
}
