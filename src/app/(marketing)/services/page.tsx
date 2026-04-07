import Link from "next/link";
import { MailboxIcon, EnvelopeIcon, HeartBubbleIcon } from "@/components/BrandIcons";

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
        <rect x="8" y="8" width="48" height="48" rx="8" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="3" />
        <path d="M22 22 L42 42 M42 22 L22 42" stroke="#3374B5" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
    title: "Mail Discard & Shredding",
    desc: "Don't want it? Request secure shredding and disposal of any mail item directly from your dashboard. No clutter, no hassle — certified destruction on demand.",
  },
  {
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
        <rect x="6" y="20" width="52" height="36" rx="6" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="3" />
        <path d="M6 32 L32 32 L58 32" stroke="#2D1D0F" strokeWidth="2" />
        <rect x="20" y="8" width="24" height="16" rx="3" fill="#3374B5" stroke="#2D1D0F" strokeWidth="2.5" />
      </svg>
    ),
    title: "Package Pickup & Notifications",
    desc: "Get an instant SMS and email alert the moment a package arrives. Pick it up at your convenience during business hours — held securely until you're ready.",
  },
  {
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-12">
        <path d="M14 52 L32 8 L50 52" stroke="#2D1D0F" strokeWidth="3" fill="none" strokeLinejoin="round" />
        <circle cx="32" cy="16" r="6" fill="#3374B5" stroke="#2D1D0F" strokeWidth="2.5" />
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
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: "linear-gradient(135deg, #2D1D0F 0%, #1a120a 50%, #2D1D0F 100%)" }}>
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute top-10 left-10 animate-float"><EnvelopeIcon className="w-16 h-16 opacity-40" /></div>
          <div className="absolute bottom-10 right-20 animate-float delay-300"><MailboxIcon className="w-20 h-20 opacity-30" /></div>
        </div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-black uppercase text-[#F7E6C2] mb-6 animate-scale-in">
            Our Services
          </h1>
          <p className="text-[#F7E6C2]/60 max-w-xl mx-auto text-lg animate-fade-up delay-200">
            Everything you need to manage your mail, protect your packages, and grow your business
            — all from one neighborhood location.
          </p>
        </div>
      </section>

      {/* Services grid */}
      <section className="py-20 px-4 bg-[#F7E6C2]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {services.map((s, i) => (
            <div
              key={s.title}
              className={`bg-white rounded-2xl p-8 hover-tilt animate-fade-up ${i % 2 === 0 ? "delay-100" : "delay-300"}`}
              style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08), 0 2px 8px rgba(45,29,15,0.04)" }}
            >
              <div className="mb-5 text-4xl">{s.icon}</div>
              <h2 className="font-black text-xl uppercase text-[#2D1D0F] mb-3">{s.title}</h2>
              <p className="text-[#2D1D0F]/70 text-sm leading-relaxed">{s.desc}</p>
              {s.cta && (
                <Link
                  href={s.cta.href}
                  className="mt-5 inline-flex items-center gap-2 text-[#3374B5] font-bold text-sm hover:gap-3 transition-all"
                >
                  {s.cta.label} <span>→</span>
                </Link>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-[#FFFDF8]">
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <h2 className="text-3xl font-black uppercase text-[#2D1D0F] mb-4">Ready to Get Started?</h2>
          <p className="text-[#2D1D0F]/60 mb-8">Pick a plan and get your real street address today.</p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="bg-[#3374B5] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2960A0] transition-all hover:shadow-lg hover:-translate-y-1"
            >
              Get a Mailbox
            </Link>
            <Link
              href="/pricing"
              className="bg-[#2D1D0F] text-[#F7E6C2] font-bold px-8 py-4 rounded-full hover:bg-[#4A3728] transition-all hover:shadow-lg hover:-translate-y-1"
            >
              View Plans
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
