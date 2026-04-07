import Link from "next/link";

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
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: "linear-gradient(135deg, #2D1D0F 0%, #1a120a 50%, #2D1D0F 100%)" }}>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 animate-float">
            <svg viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-20 h-20 mx-auto">
              <circle cx="40" cy="40" r="36" fill="#F7E6C2" stroke="#2D1D0F" strokeWidth="3" />
              <path d="M28 56 L40 16 L52 56" stroke="#3374B5" strokeWidth="4" fill="none" strokeLinejoin="round" />
              <circle cx="40" cy="22" r="5" fill="#3374B5" />
              <path d="M33 48 L47 48" stroke="#3374B5" strokeWidth="3" strokeLinecap="round" />
            </svg>
          </div>
          <h1 className="text-5xl md:text-6xl font-black uppercase text-[#F7E6C2] mb-6 animate-scale-in">
            Notary Services
          </h1>
          <p className="text-[#F7E6C2]/60 max-w-xl mx-auto text-lg animate-fade-up delay-200">
            Book a certified in-store notary appointment online. Walk-ins welcome based
            on availability — online booking recommended.
          </p>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 px-4 bg-[#F7E6C2]">
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Services list */}
          <div
            className="bg-white rounded-2xl p-8 hover-tilt animate-fade-up"
            style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
          >
            <h2 className="text-xl font-black uppercase text-[#2D1D0F] mb-6">
              We Notarize
            </h2>
            <ul className="space-y-3">
              {services.map((s, i) => (
                <li key={s} className={`flex items-center gap-3 text-sm text-[#2D1D0F]/80 animate-fade-up delay-${(i % 4 + 1) * 100}`}>
                  <span className="text-[#3374B5] font-bold text-lg">✓</span>
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
                  <ul className="text-sm text-[#2D1D0F]/70 space-y-2">
                    <li className="flex items-start gap-2"><span className="text-[#3374B5] mt-0.5">•</span> Valid government-issued photo ID</li>
                    <li className="flex items-start gap-2"><span className="text-[#3374B5] mt-0.5">•</span> All documents to be notarized (unsigned)</li>
                    <li className="flex items-start gap-2"><span className="text-[#3374B5] mt-0.5">•</span> Any required witnesses (if applicable)</li>
                  </ul>
                ),
                delay: "delay-200",
              },
              {
                title: "Walk-Ins Welcome",
                content: (
                  <p className="text-sm text-[#2D1D0F]/70">
                    Walk-ins are welcome based on availability. We recommend booking online to
                    guarantee your appointment time.
                  </p>
                ),
                delay: "delay-400",
              },
              {
                title: "Premium Members",
                content: (
                  <p className="text-sm text-[#2D1D0F]/70">
                    Premium Box subscribers receive a discounted notary rate. Ask about your
                    member pricing when booking.
                  </p>
                ),
                delay: "delay-600",
              },
            ].map((card) => (
              <div
                key={card.title}
                className={`bg-white rounded-2xl p-6 hover-tilt animate-fade-up ${card.delay}`}
                style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
              >
                <h3 className="font-black uppercase text-[#2D1D0F] mb-3 text-sm tracking-wide">{card.title}</h3>
                {card.content}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-[#FFFDF8]">
        <div
          className="max-w-3xl mx-auto rounded-3xl p-12 text-center animate-fade-up"
          style={{
            background: "linear-gradient(135deg, #3374B5 0%, #2960A0 100%)",
            boxShadow: "0 20px 60px rgba(51,116,181,0.25)",
          }}
        >
          <h2 className="text-3xl font-black uppercase text-white mb-3">Book Your Notary Appointment</h2>
          <p className="text-white/70 mb-8">
            Confirmation sent via email with document prep instructions.
          </p>
          <Link
            href="/contact"
            className="bg-white text-[#3374B5] font-bold px-8 py-4 rounded-full hover:bg-[#F7E6C2] transition-all hover:-translate-y-1 hover:shadow-lg inline-block"
          >
            Book Now
          </Link>
        </div>
      </section>
    </div>
  );
}
