import type { Metadata } from "next";
import Link from "next/link";
import { ShieldIcon } from "@/components/BrandIcons";

export const metadata: Metadata = {
  title: "Security & Privacy",
  description:
    "How NOHO Mailbox protects your mail — secure handling, private suite numbers, 24/7 surveillance, encrypted dashboard, and USPS-compliant ID verification.",
  openGraph: {
    title: "Security & Privacy — NOHO Mailbox",
    description: "Learn how we keep your mail safe with surveillance, encrypted access, and USPS-compliant procedures.",
    url: "https://nohomailbox.org/security",
  },
  alternates: { canonical: "https://nohomailbox.org/security" },
};

const features = [
  {
    icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><rect x="6" y="6" width="36" height="36" rx="8" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2.5" /><path d="M16 24 L22 30 L34 16" stroke="#337485" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    title: "Secure Mail Handling",
    desc: "All mail is handled by trained staff in a monitored facility. Your items are logged, stored, and tracked from arrival to pickup.",
  },
  {
    icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><rect x="4" y="14" width="40" height="28" rx="6" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2.5" /><circle cx="24" cy="28" r="6" fill="#337485" /><path d="M24 26 L24 30 M24 26 L26 28" stroke="#EBF2FA" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    title: "Private Suite Numbers",
    desc: "Your mail goes to a unique suite number — your home address stays private. Use it for banking, business registration, and more.",
  },
  {
    icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><circle cx="24" cy="18" r="10" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2.5" /><path d="M10 42 C10 32 38 32 38 42" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2.5" /><path d="M20 18 L22 20 L28 14" stroke="#337485" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    title: "ID Verification Required",
    desc: "Every account requires two valid government-issued photo IDs and a notarized USPS Form 1583 — no exceptions.",
  },
  {
    icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><rect x="8" y="4" width="32" height="40" rx="4" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2.5" /><path d="M16 16 L32 32 M32 16 L16 32" stroke="#337485" strokeWidth="3" strokeLinecap="round" /></svg>,
    title: "Secure Shredding",
    desc: "When you discard mail, it's securely shredded and disposed of — not just thrown away. Certified destruction on demand.",
  },
  {
    icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><circle cx="24" cy="24" r="20" fill="#EBF2FA" stroke="#1A1714" strokeWidth="2.5" /><path d="M24 14 L24 24 L30 28" stroke="#337485" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="24" cy="24" r="2" fill="#337485" /></svg>,
    title: "Staff Background Checks",
    desc: "All team members pass background screenings before handling customer mail. Your trust is our top priority.",
  },
  {
    icon: <ShieldIcon className="w-10 h-10" />,
    title: "USPS Approved",
    desc: "We operate as a USPS-approved Commercial Mail Receiving Agency (CMRA), meeting all federal requirements for mail reception.",
  },
];

const practices = [
  "We never sell or share your personal information with third parties",
  "All digital scans are stored securely and accessible only to you",
  "Account access requires email verification and secure password",
  "Physical mail is stored in a locked, monitored facility",
  "Shredded documents are disposed of through certified waste management",
  "Staff access to customer mail is logged and auditable",
];

export default function SecurityPage() {
  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 animate-float">
            <ShieldIcon className="w-20 h-20 mx-auto" />
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Your Security Matters
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            We take the security and privacy of your mail seriously. Here&apos;s how we protect you.
          </p>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`bg-surface-light rounded-2xl p-6 hover-lift animate-fade-up shadow-[var(--shadow-md)] delay-${((i % 3) + 1) * 100}`}
            >
              <div className="mb-4">{f.icon}</div>
              <h3 className="font-extrabold tracking-tight text-text-light text-sm mb-2">{f.title}</h3>
              <p className="text-sm text-text-light-muted leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy Practices */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-10 animate-fade-up">Our Privacy Commitments</h2>
          <div
            className="bg-surface-light rounded-2xl p-8 animate-fade-up delay-200 shadow-[var(--shadow-md)]"
          >
            <ul className="space-y-4">
              {practices.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="text-accent font-bold text-lg mt-0.5 shrink-0">✓</span>
                  <span className="text-sm text-text-light-muted leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-bg-light">
        <div
          className="max-w-3xl mx-auto rounded-3xl p-12 text-center animate-fade-up bg-bg-dark shadow-xl"
        >
          <h2 className="text-3xl font-extrabold tracking-tight text-text-dark mb-3">Get Your Secure Address</h2>
          <p className="text-text-dark-muted mb-8">Real address, private suite number, and peace of mind.</p>
          <Link
            href="/signup"
            className="bg-accent text-white font-bold px-8 py-4 rounded-xl hover:bg-accent-hover transition-all hover:-translate-y-1 hover:shadow-lg inline-block"
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
