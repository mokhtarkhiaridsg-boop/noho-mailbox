import Link from "next/link";
import { HeartBubbleIcon, MailboxIcon } from "@/components/BrandIcons";

const included = [
  { icon: <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none"><rect x="4" y="4" width="32" height="32" rx="6" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2"/><path d="M12 20 L18 26 L28 14" stroke="#3374B5" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/></svg>, label: "Formation of your LLC, DBA, S-Corp, or desired equivalent" },
  { icon: <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none"><rect x="4" y="4" width="32" height="32" rx="6" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2"/><text x="20" y="26" textAnchor="middle" fill="#3374B5" fontSize="16" fontWeight="bold">#</text></svg>, label: "Employer Identification Number (EIN) or local tax ID" },
  { icon: <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none"><rect x="4" y="8" width="32" height="26" rx="4" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2"/><path d="M4 16 L36 16" stroke="#2D1D0F" strokeWidth="2"/><rect x="8" y="4" width="8" height="8" rx="2" fill="#3374B5" stroke="#2D1D0F" strokeWidth="1.5"/><rect x="24" y="4" width="8" height="8" rx="2" fill="#3374B5" stroke="#2D1D0F" strokeWidth="1.5"/></svg>, label: "Filing of all required incorporation, registration, and compliance documents" },
  { icon: <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none"><circle cx="20" cy="20" r="16" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2"/><circle cx="20" cy="20" r="8" fill="#3374B5"/><circle cx="20" cy="20" r="3" fill="#F7E6C2"/></svg>, label: "Brand book including logo, color palette, and typography" },
  { icon: <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none"><rect x="4" y="4" width="32" height="32" rx="4" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2"/><circle cx="16" cy="16" r="5" fill="#3374B5"/><path d="M4 30 Q14 20 24 26 Q30 28 36 24" fill="#3374B5" opacity="0.4"/></svg>, label: "Branding assets for website, social media, and print" },
  { icon: <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none"><rect x="2" y="8" width="36" height="24" rx="4" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2"/><path d="M10 20 L18 20 M10 24 L26 24" stroke="#3374B5" strokeWidth="2" strokeLinecap="round"/><circle cx="30" cy="18" r="3" fill="#3374B5"/></svg>, label: "Live, mobile-optimized website with domain & hosting" },
  { icon: <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none"><circle cx="20" cy="20" r="16" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2"/><circle cx="20" cy="20" r="6" fill="#3374B5"/><path d="M20 10 L20 6 M30 20 L34 20 M20 30 L20 34 M10 20 L6 20" stroke="#3374B5" strokeWidth="2" strokeLinecap="round"/></svg>, label: "Basic SEO setup for local and organic visibility" },
  { icon: <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none"><rect x="6" y="6" width="28" height="28" rx="8" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2"/><circle cx="20" cy="18" r="5" fill="#3374B5"/><path d="M12 30 Q12 24 20 24 Q28 24 28 30" fill="#3374B5"/></svg>, label: "Social media profiles set up and ready for posting" },
  { icon: <svg viewBox="0 0 40 40" className="w-8 h-8" fill="none"><path d="M20 4 L20 36" stroke="#2D1D0F" strokeWidth="2"/><circle cx="20" cy="30" r="6" fill="#3374B5" stroke="#2D1D0F" strokeWidth="2"/><path d="M14 14 L20 8 L26 14" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="2" strokeLinejoin="round"/></svg>, label: "Verified Google Business profile" },
  { icon: <MailboxIcon className="w-8 h-8" />, label: "12 months of mail receipt, organization, and forwarding" },
];

export default function BusinessSolutionsPage() {
  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: "linear-gradient(135deg, #2D1D0F 0%, #1a120a 50%, #2D1D0F 100%)" }}>
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute top-12 right-16 animate-float"><HeartBubbleIcon className="w-16 h-16 opacity-40" /></div>
          <div className="absolute bottom-8 left-12 animate-float delay-400"><MailboxIcon className="w-20 h-20 opacity-30" /></div>
        </div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-black uppercase text-[#F7E6C2] mb-6 animate-scale-in">
            Business Solutions
          </h1>
          <p className="text-[#F7E6C2]/60 max-w-xl mx-auto text-lg mb-10 animate-fade-up delay-200">
            Everything you need to start and launch your business — under one roof.
            Formation, branding, website, and 12 months of mail service.
          </p>
          <div
            className="inline-block rounded-3xl px-12 py-8 animate-scale-in delay-400"
            style={{
              background: "linear-gradient(135deg, #3374B5 0%, #2960A0 100%)",
              boxShadow: "0 20px 60px rgba(51,116,181,0.35)",
            }}
          >
            <p className="text-sm uppercase tracking-widest font-bold text-white/70 mb-1">
              All-Inclusive Package
            </p>
            <p className="text-6xl font-black text-white">$2,000</p>
            <p className="text-white/70 text-sm mt-2">One flat fee. No surprises.</p>
          </div>
        </div>
      </section>

      {/* What's included */}
      <section className="py-20 px-4 bg-[#F7E6C2]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black uppercase text-[#2D1D0F] mb-10 text-center animate-fade-up">
            What&apos;s Included
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {included.map((item, i) => (
              <div
                key={item.label}
                className={`flex items-start gap-4 bg-white rounded-xl p-5 hover-tilt animate-fade-up delay-${((i % 4) + 1) * 100}`}
                style={{ boxShadow: "0 4px 16px rgba(45,29,15,0.06)" }}
              >
                <span className="shrink-0 mt-0.5">{item.icon}</span>
                <span className="text-[#2D1D0F]/80 text-sm leading-snug">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 px-4 bg-[#FFFDF8]">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-black uppercase text-[#2D1D0F] mb-12 text-center animate-fade-up">
            How It Works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { step: "01", label: "Book a Free Consultation", desc: "Tell us about your business idea and goals.", delay: "delay-100" },
              { step: "02", label: "We Handle Everything", desc: "Formation, branding, website, and setup — done for you.", delay: "delay-300" },
              { step: "03", label: "Launch Ready", desc: "Receive your brand assets, live site, and activated mail account.", delay: "delay-500" },
            ].map((s) => (
              <div
                key={s.step}
                className={`text-center p-8 bg-white rounded-2xl hover-tilt animate-fade-up ${s.delay}`}
                style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
              >
                <p className="text-5xl font-black text-[#3374B5] mb-3">{s.step}</p>
                <p className="font-black text-[#2D1D0F] uppercase text-sm mb-3">{s.label}</p>
                <p className="text-[#2D1D0F]/60 text-sm">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-[#F7E6C2]">
        <div
          className="max-w-3xl mx-auto rounded-3xl p-12 text-center animate-fade-up"
          style={{
            background: "linear-gradient(135deg, #2D1D0F 0%, #1a120a 100%)",
            boxShadow: "0 20px 60px rgba(45,29,15,0.3)",
          }}
        >
          <h2 className="text-3xl font-black uppercase text-[#F7E6C2] mb-3">Ready to Launch?</h2>
          <p className="text-[#F7E6C2]/60 mb-8">
            Book a free consultation and we&apos;ll walk you through everything.
          </p>
          <Link
            href="/contact"
            className="bg-[#3374B5] text-white font-bold px-8 py-4 rounded-full hover:bg-[#2960A0] transition-all hover:-translate-y-1 hover:shadow-lg inline-block"
          >
            Book a Free Consultation
          </Link>
        </div>
      </section>
    </div>
  );
}
