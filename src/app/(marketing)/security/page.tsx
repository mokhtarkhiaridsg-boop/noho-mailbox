import Link from "next/link";
import { ShieldIcon, MailboxIcon } from "@/components/BrandIcons";

const features = [
  {
    icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><rect x="6" y="6" width="36" height="36" rx="8" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2.5" /><path d="M16 24 L22 30 L34 16" stroke="#3374B5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    title: "Secure Mail Handling",
    desc: "All mail is handled by trained staff in a monitored facility. Your items are logged, stored, and tracked from arrival to pickup.",
  },
  {
    icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><rect x="4" y="14" width="40" height="28" rx="6" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2.5" /><circle cx="24" cy="28" r="6" fill="#3374B5" /><path d="M24 26 L24 30 M24 26 L26 28" stroke="#F7E6C2" strokeWidth="1.5" strokeLinecap="round" /></svg>,
    title: "Private Suite Numbers",
    desc: "Your mail goes to a unique suite number — your home address stays private. Use it for banking, business registration, and more.",
  },
  {
    icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><circle cx="24" cy="18" r="10" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2.5" /><path d="M10 42 C10 32 38 32 38 42" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2.5" /><path d="M20 18 L22 20 L28 14" stroke="#3374B5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
    title: "ID Verification Required",
    desc: "Every account requires two valid government-issued photo IDs and a notarized USPS Form 1583 — no exceptions.",
  },
  {
    icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><rect x="8" y="4" width="32" height="40" rx="4" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2.5" /><path d="M16 16 L32 32 M32 16 L16 32" stroke="#3374B5" strokeWidth="3" strokeLinecap="round" /></svg>,
    title: "Secure Shredding",
    desc: "When you discard mail, it's securely shredded and disposed of — not just thrown away. Certified destruction on demand.",
  },
  {
    icon: <svg viewBox="0 0 48 48" className="w-10 h-10" fill="none"><circle cx="24" cy="24" r="20" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2.5" /><path d="M24 14 L24 24 L30 28" stroke="#3374B5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /><circle cx="24" cy="24" r="2" fill="#3374B5" /></svg>,
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
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: "linear-gradient(135deg, #2D1D0F 0%, #1a120a 50%, #2D1D0F 100%)" }}>
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute top-10 right-16 animate-float"><ShieldIcon className="w-16 h-16 opacity-40" /></div>
          <div className="absolute bottom-10 left-12 animate-float delay-400"><MailboxIcon className="w-16 h-16 opacity-30" /></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 animate-float">
            <ShieldIcon className="w-20 h-20 mx-auto" />
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase text-[#F7E6C2] mb-6 animate-scale-in">
            Your Security Matters
          </h1>
          <p className="text-[#F7E6C2]/60 max-w-xl mx-auto text-lg animate-fade-up delay-200">
            We take the security and privacy of your mail seriously. Here&apos;s how we protect you.
          </p>
        </div>
      </section>

      {/* Security Features */}
      <section className="py-20 px-4 bg-[#F7E6C2]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`bg-white rounded-2xl p-6 hover-tilt animate-fade-up delay-${((i % 3) + 1) * 100}`}
              style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
            >
              <div className="mb-4">{f.icon}</div>
              <h3 className="font-black uppercase text-[#2D1D0F] text-sm mb-2">{f.title}</h3>
              <p className="text-sm text-[#2D1D0F]/60 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Privacy Practices */}
      <section className="py-20 px-4 bg-[#FFFDF8]">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-black uppercase text-[#2D1D0F] text-center mb-10 animate-fade-up">Our Privacy Commitments</h2>
          <div
            className="bg-white rounded-2xl p-8 animate-fade-up delay-200"
            style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
          >
            <ul className="space-y-4">
              {practices.map((p) => (
                <li key={p} className="flex items-start gap-3">
                  <span className="text-[#3374B5] font-bold text-lg mt-0.5 shrink-0">✓</span>
                  <span className="text-sm text-[#2D1D0F]/70 leading-relaxed">{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-[#F7E6C2]">
        <div
          className="max-w-3xl mx-auto rounded-3xl p-12 text-center animate-fade-up"
          style={{ background: "linear-gradient(135deg, #2D1D0F 0%, #1a120a 100%)", boxShadow: "0 20px 60px rgba(45,29,15,0.3)" }}
        >
          <h2 className="text-3xl font-black uppercase text-[#F7E6C2] mb-3">Get Your Secure Address</h2>
          <p className="text-[#F7E6C2]/60 mb-8">Real address, private suite number, and peace of mind.</p>
          <Link
            href="/signup"
            className="bg-[#3374B5] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2960A0] transition-all hover:-translate-y-1 hover:shadow-lg inline-block"
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
