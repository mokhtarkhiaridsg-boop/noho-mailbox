import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Walk-In Notary Public — North Hollywood",
  description:
    "Walk-in notary in North Hollywood for legal docs, real estate, affidavits, POA, contracts, and loans. No appointment. Free Form 1583 for Business + Premium members.",
  openGraph: {
    title: "Notary Services — NOHO Mailbox",
    description: "Walk-in notary services for legal documents, real estate, contracts, and more in North Hollywood, CA.",
    url: "https://nohomailbox.org/notary",
  },
  alternates: { canonical: "https://nohomailbox.org/notary" },
};

const services = [
  "Legal documents",
  "Real estate transactions",
  "Business agreements",
  "Affidavits and sworn statements",
  "Power of attorney",
  "Contracts and deeds",
  "Loan documents",
  "Identity verification",
];

export default function NotaryPage() {
  return (
    <div className="perspective-container" style={{ background: "#FFFDF8" }}>
      {/* Hero — cream + brown iPad-OS style */}
      <section
        className="relative px-5 sm:px-6 pt-12 pb-10 sm:pt-20 sm:pb-14 overflow-hidden"
        style={{
          background: "radial-gradient(ellipse at top, #F7E6C2 0%, #F0DBA9 45%, #E8DDD0 100%)",
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{ backgroundImage: "radial-gradient(#2D100F 1px, transparent 1px)", backgroundSize: "22px 22px" }}
          aria-hidden="true"
        />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex mb-5 items-center justify-center rounded-2xl" style={{ width: 72, height: 72, background: "#FFFFFF", border: "1px solid #E8DDD0", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.08)" }}>
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
              <circle cx="40" cy="40" r="32" fill="#F7E6C2" stroke="#2D100F" strokeWidth="3" />
              <path d="M28 56 L40 16 L52 56" stroke="#337485" strokeWidth="4" fill="none" strokeLinejoin="round" />
              <circle cx="40" cy="22" r="5" fill="#337485" />
              <path d="M33 48 L47 48" stroke="#337485" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <h1
            className="font-extrabold tracking-tight"
            style={{
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              color: "#2D100F",
              fontSize: "clamp(2rem, 6vw, 3.5rem)",
              lineHeight: 1.05,
            }}
          >
            Notary{" "}
            <span
              style={{
                fontFamily: "var(--font-pacifico), 'Pacifico', cursive",
                color: "#337485",
                fontWeight: 400,
              }}
            >
              services
            </span>
          </h1>
          <p
            className="mt-3 sm:mt-4 max-w-xl mx-auto text-[14.5px] sm:text-base"
            style={{ color: "#5C4540" }}
          >
            Certified in-store notary. Walk-ins welcome based on availability — book online to guarantee your slot.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="px-5 sm:px-6 py-12 sm:py-16 md:py-20" style={{ background: "#FFFDF8" }}>
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          {/* Services list */}
          <div
            className="rounded-2xl p-6 sm:p-7"
            style={{ background: "#FFFFFF", border: "1px solid #E8DDD0", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)" }}
          >
            <h2
              className="font-extrabold mb-4"
              style={{
                color: "#2D100F",
                fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif",
                fontSize: "clamp(1.1rem, 3vw, 1.25rem)",
              }}
            >
              We notarize
            </h2>
            <ul className="space-y-2.5">
              {services.map((s) => (
                <li key={s} className="flex items-start gap-2.5 text-[14px]" style={{ color: "#2D100F" }}>
                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5 mt-1 shrink-0" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 8 L7 12 L13 4" />
                  </svg>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Info cards */}
          <div className="flex flex-col gap-4 sm:gap-5">
            {[
              {
                title: "What to bring",
                content: (
                  <ul className="text-[14px] space-y-1.5" style={{ color: "#5C4540" }}>
                    <li className="flex items-start gap-2"><span style={{ color: "#337485" }}>•</span> Valid government-issued photo ID</li>
                    <li className="flex items-start gap-2"><span style={{ color: "#337485" }}>•</span> All documents (unsigned)</li>
                    <li className="flex items-start gap-2"><span style={{ color: "#337485" }}>•</span> Witnesses if required</li>
                  </ul>
                ),
              },
              {
                title: "Walk-ins welcome",
                content: (
                  <p className="text-[14px]" style={{ color: "#5C4540" }}>
                    Walk-ins are welcome based on availability. Book online to guarantee your appointment time.
                  </p>
                ),
              },
              {
                title: "Premium members",
                content: (
                  <p className="text-[14px]" style={{ color: "#5C4540" }}>
                    Premium Box subscribers receive a discounted notary rate. Ask about member pricing when booking.
                  </p>
                ),
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-2xl p-5 sm:p-6"
                style={{ background: "#FFFFFF", border: "1px solid #E8DDD0", boxShadow: "0 1px 3px rgba(0,0,0,0.04), 0 8px 22px rgba(45,16,15,0.06)" }}
              >
                <h3
                  className="font-extrabold mb-2 text-[15px]"
                  style={{ color: "#2D100F", fontFamily: "var(--font-baloo), 'Baloo 2', sans-serif" }}
                >
                  {card.title}
                </h3>
                {card.content}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA — dark brown */}
      <section
        className="px-5 sm:px-6 py-12 sm:py-16"
        style={{ background: "linear-gradient(160deg, #2D100F 0%, #1F0807 100%)" }}
      >
        <div className="max-w-3xl mx-auto text-center">
          <h2
            className="font-extrabold tracking-tight"
            style={{
              color: "#F7E6C2",
              fontFamily: "var(--font-baloo), 'Baloo 2', system-ui, sans-serif",
              fontSize: "clamp(1.5rem, 5vw, 2.25rem)",
              lineHeight: 1.05,
            }}
          >
            Book your notary appointment
          </h2>
          <p className="mt-2 sm:mt-3 text-[14px] sm:text-base" style={{ color: "#F0DBA9" }}>
            Confirmation email with document-prep instructions. No surprises at the counter.
          </p>
          <Link
            href="/contact"
            className="mt-6 inline-flex items-center gap-2 font-bold px-6 py-3.5 rounded-xl transition-colors"
            style={{ background: "#F7E6C2", color: "#2D100F", minHeight: 48 }}
          >
            Book now
            <svg viewBox="0 0 20 20" className="w-4 h-4" fill="none"><path d="M4 10 H16 M12 6 L16 10 L12 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </Link>
        </div>
      </section>
    </div>
  );
}
