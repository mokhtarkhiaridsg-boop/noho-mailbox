import type { Metadata } from "next";
import Link from "next/link";
import { AiMailbox, AiEnvelope, AiHeart, AiBox } from "@/components/AnimatedIcons";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Mail scanning, forwarding, package handling, same-day delivery, notary, and more — every service NOHO Mailbox offers under one roof.",
  openGraph: {
    title: "Services — NOHO Mailbox",
    description: "Explore all mailbox, delivery, notary, and business services at NOHO Mailbox in North Hollywood.",
    url: "https://nohomailbox.org/services",
  },
  alternates: { canonical: "https://nohomailbox.org/services" },
};

const services = [
  {
    icon: <AiEnvelope className="w-12 h-12" />,
    title: "Mail Scanning & Digital Dashboard",
    desc: "Receive high-resolution scans of every piece of incoming mail in your secure online dashboard. View, download, or take action on each piece from any device — phone, tablet, or desktop.",
  },
  {
    icon: <AiMailbox className="w-12 h-12" />,
    title: "Mail Forwarding",
    desc: "Save one or more forwarding addresses to your account. With a single click, physical mail is re-routed and shipped to any saved address — domestically or internationally.",
  },
  {
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="ai-icon w-12 h-12">
        <rect x="8" y="14" width="48" height="38" rx="6" fill="#EBF2FA" stroke="#2D100F" strokeWidth="3" />
        <path d="M8 28 L56 28" stroke="#2D100F" strokeWidth="2.5" />
        <path d="M16 36 L20 36 M26 36 L30 36 M36 36 L40 36 M46 36 L50 36" stroke="#E70013" strokeWidth="2.5" strokeLinecap="round" className="ai-bolt" />
        <path d="M16 44 L48 44" stroke="#337485" strokeWidth="2" strokeLinecap="round" opacity="0.5" />
      </svg>
    ),
    title: "Mail Discard & Shredding",
    desc: "Don't want it? Request secure shredding and disposal of any mail item directly from your dashboard. No clutter, no hassle — certified destruction on demand.",
  },
  {
    icon: <AiBox className="w-12 h-12" />,
    title: "Package Pickup & Notifications",
    desc: "Get an instant SMS and email alert the moment a package arrives. Pick it up at your convenience during business hours — held securely until you're ready.",
  },
  {
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="ai-icon w-12 h-12">
        <rect x="14" y="6" width="36" height="44" rx="3" fill="#FFF9F3" stroke="#2D100F" strokeWidth="3" />
        <path d="M22 18 L42 18 M22 26 L42 26 M22 34 L36 34" stroke="#337485" strokeWidth="2" strokeLinecap="round" />
        <g className="ai-pin">
          <circle cx="44" cy="44" r="10" fill="#E70013" stroke="#2D100F" strokeWidth="2.5" />
          <path d="M40 44 L43 47 L48 41" stroke="#FFF9F3" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      </svg>
    ),
    title: "Notary Services",
    desc: "Book a certified in-store notary appointment online. Available for individuals and businesses. Confirmation sent via email with all required document prep instructions.",
    cta: { label: "Learn More", href: "/notary" },
  },
  {
    icon: <AiHeart className="w-12 h-12" />,
    title: "Business Solutions",
    desc: "Full-service LLC formation, brand identity, website, SEO, and 12 months of mail service. Everything to launch your business under one roof.",
    cta: { label: "Learn More", href: "/business-solutions" },
    gold: true,
  },
];

export default function ServicesPage() {
  return (
    <div className="perspective-container">
      {/* Hero header */}
      <section className="relative py-24 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Our Services
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            Everything you need to manage your mail, protect your packages, and grow your business
            — all from one neighborhood location.
          </p>
        </div>
      </section>

      {/* Warm cream personality strip */}
      <div
        className="py-4 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Real street address &middot; Secure mail management &middot; Same-day delivery &middot; Full business launch support
      </div>

      {/* Services grid */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((s, i) => (
            <div
              key={s.title}
              className={`rounded-2xl p-7 hover-lift transition-all animate-fade-up ${i % 2 === 0 ? "delay-100" : "delay-300"}`}
              style={
                s.gold
                  ? {
                      background: "linear-gradient(145deg, #B07030 0%, #8A5520 100%)",
                      boxShadow: "0 12px 40px rgba(176,112,48,0.3)",
                      color: "#fff",
                    }
                  : {
                      background: "#FFF9F3",
                      border: "1px solid #E8D8C4",
                      boxShadow: "var(--shadow-md)",
                    }
              }
            >
              <div className="mb-5 text-4xl">{s.icon}</div>
              <h2
                className="font-extrabold tracking-tight text-xl mb-3"
                style={{ color: s.gold ? "#FFE4A0" : "#2D100F" }}
              >
                {s.title}
              </h2>
              <p
                className="text-sm leading-relaxed"
                style={{ color: s.gold ? "rgba(255,255,255,0.85)" : "#7A6050" }}
              >
                {s.desc}
              </p>
              {s.cta && (
                <Link
                  href={s.cta.href}
                  className="mt-5 inline-flex items-center gap-2 font-bold text-sm hover:gap-3 transition-all"
                  style={{ color: s.gold ? "#FFE4A0" : "#337485" }}
                >
                  {s.cta.label} <span>→</span>
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <h2 className="text-3xl font-extrabold tracking-tight mb-4" style={{ color: "#F8F2EA" }}>Ready to Get Started?</h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>Pick a plan and get your real street address today.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
            >
              Get a Mailbox
            </Link>
            <Link
              href="/pricing"
              className="font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{ background: "rgba(255,255,255,0.06)", color: "#F8F2EA", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "var(--shadow-md)" }}
            >
              View Plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
