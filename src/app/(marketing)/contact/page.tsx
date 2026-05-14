// Server-component wrapper around ContactClient — exports proper
// metadata (which "use client" pages can't do) so the contact page
// gets a real title, description, OG tags, and structured-data block.

import type { Metadata } from "next";
import ContactClient from "./ContactClient";
import { getOperatingHours } from "@/app/actions/operatingHours";

export const metadata: Metadata = {
  title: "Contact Us — Mailbox, Notary, Business Help",
  description:
    "Get in touch with NOHO Mailbox. We typically respond within 24 hours, or stop by in person Mon–Sat at 5062 Lankershim Blvd, North Hollywood. Call (818) 506-7744.",
  openGraph: {
    title: "Contact NOHO Mailbox",
    description:
      "Reach out about getting a mailbox, booking notary, or starting your business. Walk in Mon–Sat or send a message — we respond within 24 hours.",
    url: "https://nohomailbox.org/contact",
  },
  alternates: {
    canonical: "https://nohomailbox.org/contact",
    languages: {
      "en-US": "https://nohomailbox.org/contact",
      "es-US": "https://nohomailbox.org/es/contacto",
    },
  },
};

const contactJsonLd = {
  "@context": "https://schema.org",
  "@type": "ContactPage",
  name: "Contact NOHO Mailbox",
  url: "https://nohomailbox.org/contact",
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
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "09:30", closes: "13:30" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], opens: "14:00", closes: "17:30" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: "Saturday", opens: "10:00", closes: "13:30" },
    ],
  },
};

/** Render a `1:30 – 2pm` style break label from a `["13:30", "14:00"]` tuple,
 * or null when there's no break that day. */
function formatBreakLabel(breakHHMM: [string, string] | undefined): string | null {
  if (!breakHHMM) return null;
  return `${to12h(breakHHMM[0])} – ${to12h(breakHHMM[1])}`;
}

function to12h(hhmm: string): string {
  const [hh, mm] = hhmm.split(":").map((s) => parseInt(s, 10));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return hhmm;
  const ampm = hh >= 12 ? "pm" : "am";
  const h12 = hh % 12 === 0 ? 12 : hh % 12;
  return mm === 0 ? `${h12}${ampm}` : `${h12}:${String(mm).padStart(2, "0")}${ampm}`;
}

export default async function ContactPage() {
  // Pull hours from the single source of truth used by the footer + open-now
  // badge so admin-saved edits flow through to the contact page automatically.
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
      <ContactClient
        weekdayHours={weekdayHours}
        saturdayHours={saturdayHours}
        breakLabel={breakLabel}
      />
    </>
  );
}
