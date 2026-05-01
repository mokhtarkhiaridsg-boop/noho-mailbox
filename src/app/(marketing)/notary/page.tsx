import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Notary Services",
  description:
    "Walk-in notary public in North Hollywood — legal documents, real estate, affidavits, power of attorney, and more. No appointment needed.",
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
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 animate-float">
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-20 h-20 mx-auto">
              <circle cx="40" cy="40" r="36" fill="#EBF2FA" stroke="#1A1714" strokeWidth="3" />
              <path d="M28 56 L40 16 L52 56" stroke="#337485" strokeWidth="4" fill="none" strokeLinejoin="round" />
              <circle cx="40" cy="22" r="5" fill="#337485" />
              <path d="M33 48 L47 48" stroke="#337485" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Notary Services
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            Book a certified in-store notary appointment online. Walk-ins welcome based
            on availability — online booking recommended.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Services list */}
          <div
            className="bg-surface-light rounded-2xl p-8 hover-lift animate-fade-up shadow-[var(--shadow-md)]"
          >
            <h2 className="text-xl font-extrabold tracking-tight text-text-light mb-6">
              We Notarize
            </h2>
            <ul className="space-y-3">
              {services.map((s, i) => (
                <li key={s} className={`flex items-center gap-3 text-sm text-text-light/80 animate-fade-up delay-${(i % 4 + 1) * 100}`}>
                  <span className="text-accent font-bold text-lg">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Info cards */}
          <div className="flex flex-col gap-6">
            {[
              {
                title: "What to Bring",
                content: (
                  <ul className="text-sm text-text-light-muted space-y-2">
                    <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span> Valid government-issued photo ID</li>
                    <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span> All documents to be notarized (unsigned)</li>
                    <li className="flex items-start gap-2"><span className="text-accent mt-0.5">•</span> Any required witnesses (if applicable)</li>
                  </ul>
                ),
                delay: "delay-200",
              },
              {
                title: "Walk-Ins Welcome",
                content: (
                  <p className="text-sm text-text-light-muted">
                    Walk-ins are welcome based on availability. We recommend booking online to
                    guarantee your appointment time.
                  </p>
                ),
                delay: "delay-400",
              },
              {
                title: "Premium Members",
                content: (
                  <p className="text-sm text-text-light-muted">
                    Premium Box subscribers receive a discounted notary rate. Ask about your
                    member pricing when booking.
                  </p>
                ),
                delay: "delay-600",
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`bg-surface-light rounded-2xl p-6 hover-lift animate-fade-up shadow-[var(--shadow-md)] ${card.delay}`}
              >
                <h3 className="font-extrabold tracking-tight text-text-light mb-3 text-sm tracking-wide">{card.title}</h3>
                {card.content}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-bg-light">
        <div
          className="max-w-3xl mx-auto rounded-3xl p-12 text-center animate-fade-up bg-gradient-to-br from-accent to-accent-hover shadow-xl"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">Book Your Notary Appointment</h2>
          <p className="text-white/70 mb-8">
            Confirmation sent via email with document prep instructions.
          </p>
          <Link
            href="/contact"
            className="bg-surface-light text-accent font-bold px-8 py-4 rounded-xl hover:bg-bg-light transition-all hover:-translate-y-1 hover:shadow-lg inline-block"
          >
            Book Now
          </Link>
        </div>
      </section>
    </div>
  );
}
