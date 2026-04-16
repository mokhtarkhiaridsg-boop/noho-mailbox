import type { Metadata } from "next";
import Link from "next/link";
import { MailboxIcon, EnvelopeIcon, HeartBubbleIcon } from "@/components/BrandIcons";

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
    icon: <EnvelopeIcon className="w-12 h-12" />,
    title: "Mail Scanning & Digital Dashboard",
    desc: "Receive high-resolution scans of every piece of incoming mail in your secure online dashboard. View, download, or take action on each piece from any device — phone, tablet, or desktop.",
  },
  {
    icon: <MailboxIcon className="w-12 h-12" />,
    title: "Mail Forwarding",
    desc: "Save one or more forwarding addresses to your account. With a single click, physical mail is re-routed and shipped to any saved address — domestically or internationally.",
  },
  {
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
        <rect x="8" y="8" width="48" height="48" rx="8" fill="#EBF2FA" stroke="#1A1714" strokeWidth="3" />
        <path d="M22 22 L42 42 M42 22 L22 42" stroke="#3374B5" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
    title: "Mail Discard & Shredding",
    desc: "Don't want it? Request secure shredding and disposal of any mail item directly from your dashboard. No clutter, no hassle — certified destruction on demand.",
  },
  {
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
        <rect x="6" y="20" width="52" height="36" rx="6" fill="#EBF2FA" stroke="#1A1714" strokeWidth="3" />
        <path d="M6 32 L32 32 L58 32" stroke="#1A1714" strokeWidth="2" />
        <rect x="20" y="8" width="24" height="16" rx="3" fill="#3374B5" stroke="#1A1714" strokeWidth="2.5" />
      </svg>
    ),
    title: "Package Pickup & Notifications",
    desc: "Get an instant SMS and email alert the moment a package arrives. Pick it up at your convenience during business hours — held securely until you're ready.",
  },
  {
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
        <path d="M14 52 L32 8 L50 52" stroke="#1A1714" strokeWidth="3" fill="none" strokeLinejoin="round" />
        <circle cx="32" cy="16" r="6" fill="#3374B5" stroke="#1A1714" strokeWidth="2.5" />
        <path d="M24 42 L40 42" stroke="#3374B5" strokeWidth="3" strokeLinecap="round" />
      </svg>
    ),
    title: "Notary Services",
    desc: "Book a certified in-store notary appointment online. Available for individuals and businesses. Confirmation sent via email with all required document prep instructions.",
    cta: { label: "Learn More", href: "/notary" },
  },
  {
    icon: <HeartBubbleIcon className="w-12 h-12" />,
    title: "Business Solutions",
    desc: "Full-service LLC formation, brand identity, website, SEO, and 12 months of mail service. Everything to launch your business under one roof.",
    cta: { label: "Learn More", href: "/business-solutions" },
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

      {/* Services grid */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((s, i) => (
            <div
              key={s.title}
              className={`rounded-2xl p-7 bg-surface-light border border-border-light hover-lift transition-all animate-fade-up ${i % 2 === 0 ? "delay-100" : "delay-300"}`}
              style={{ boxShadow: "var(--shadow-md)" }}
            >
              <div className="mb-5 text-4xl">{s.icon}</div>
              <h2 className="font-extrabold tracking-tight text-xl text-text-light mb-3">{s.title}</h2>
              <p className="text-text-light-muted text-sm leading-relaxed">{s.desc}</p>
              {s.cta && (
                <Link
                  href={s.cta.href}
                  className="mt-5 inline-flex items-center gap-2 text-accent font-bold text-sm hover:gap-3 transition-all"
                >
                  {s.cta.label} <span>→</span>
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-bg-dark">
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-dark mb-4">Ready to Get Started?</h2>
          <p className="text-text-dark-muted mb-8">Pick a plan and get your real street address today.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-accent text-white font-bold px-8 py-4 rounded-xl hover:bg-accent-hover transition-all shadow-[var(--shadow-md)] hover:-translate-y-1"
            >
              Get a Mailbox
            </Link>
            <Link
              href="/pricing"
              className="bg-bg-dark text-text-dark font-bold px-8 py-4 rounded-xl border border-border-light hover:bg-surface-light/10 transition-all shadow-[var(--shadow-md)] hover:-translate-y-1"
            >
              View Plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
