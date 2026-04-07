import Link from "next/link";
import { MailboxIcon, HeartBubbleIcon, DeliveryTruckIcon } from "@/components/BrandIcons";

const features = [
  { name: "Real street address", noho: true, pobox: false, virtual: true, ups: true },
  { name: "Mail scanning & dashboard", noho: true, pobox: false, virtual: true, ups: false },
  { name: "Same-day local delivery", noho: true, pobox: false, virtual: false, ups: false },
  { name: "In-store pickup", noho: true, pobox: true, virtual: false, ups: true },
  { name: "Package alerts (SMS/email)", noho: true, pobox: false, virtual: true, ups: true },
  { name: "All carriers accepted", noho: true, pobox: false, virtual: true, ups: true },
  { name: "Notary services", noho: true, pobox: false, virtual: false, ups: false },
  { name: "Business formation", noho: true, pobox: false, virtual: false, ups: false },
  { name: "Shipping supplies shop", noho: true, pobox: false, virtual: false, ups: true },
  { name: "Local & personal service", noho: true, pobox: false, virtual: false, ups: false },
  { name: "Starts at", noho: "$50/3mo", pobox: "$20/3mo", virtual: "$10/mo", ups: "$15/mo" },
];

export default function ComparePage() {
  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: "linear-gradient(135deg, #2D1D0F 0%, #1a120a 50%, #2D1D0F 100%)" }}>
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute top-8 right-16 animate-float"><MailboxIcon className="w-20 h-20 opacity-40" /></div>
        </div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-black uppercase text-[#F7E6C2] mb-6 animate-scale-in">
            NOHO vs. The Rest
          </h1>
          <p className="text-[#F7E6C2]/60 max-w-xl mx-auto text-lg animate-fade-up delay-200">
            See how NOHO Mailbox stacks up against PO Boxes, virtual mailbox services, and The UPS Store.
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 bg-[#F7E6C2]">
        <div className="max-w-5xl mx-auto">
          <div
            className="overflow-x-auto rounded-2xl animate-fade-up"
            style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
          >
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-4 font-black uppercase text-[#2D1D0F] bg-white">Feature</th>
                  <th className="p-4 font-black uppercase text-white bg-[#3374B5]">
                    <span className="block text-xs tracking-wider opacity-70">★ RECOMMENDED</span>
                    NOHO Mailbox
                  </th>
                  <th className="p-4 font-black uppercase text-[#2D1D0F] bg-white">PO Box</th>
                  <th className="p-4 font-black uppercase text-[#2D1D0F] bg-white">Virtual Mailbox</th>
                  <th className="p-4 font-black uppercase text-[#2D1D0F] bg-white">UPS Store</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => {
                  const isPrice = f.name === "Starts at";
                  return (
                    <tr key={f.name} className={i % 2 === 0 ? "bg-white" : "bg-[#FAFAF7]"}>
                      <td className="p-4 text-[#2D1D0F]/80 font-medium">{f.name}</td>
                      <td className={`p-4 text-center bg-[#3374B5]/5 ${isPrice ? "font-black text-[#3374B5]" : ""}`}>
                        {isPrice ? String(f.noho) : f.noho ? <span className="text-[#3374B5] font-bold text-lg">✓</span> : <span className="text-[#2D1D0F]/20">—</span>}
                      </td>
                      {[f.pobox, f.virtual, f.ups].map((v, j) => (
                        <td key={j} className={`p-4 text-center ${isPrice ? "font-bold text-[#2D1D0F]/60" : ""}`}>
                          {isPrice ? String(v) : v ? <span className="text-[#2D1D0F]/40 text-lg">✓</span> : <span className="text-[#2D1D0F]/20">—</span>}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Why NOHO */}
      <section className="py-20 px-4 bg-[#FFFDF8]">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-black uppercase text-[#2D1D0F] text-center mb-12 animate-fade-up">Why Choose NOHO Mailbox</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <HeartBubbleIcon className="w-14 h-14" />, title: "Local & Personal", desc: "We're your neighbors — not a faceless corporation. Real people, real service, right in North Hollywood.", delay: "delay-100" },
              { icon: <MailboxIcon className="w-14 h-14" />, title: "All-In-One", desc: "Mail, packages, notary, business formation, shipping supplies, and now same-day delivery — all under one roof.", delay: "delay-300" },
              { icon: <DeliveryTruckIcon className="w-14 h-14" />, title: "Same-Day Delivery", desc: "No other local mailbox service offers same-day courier delivery. $5 flat rate in NoHo — get your mail at your door.", delay: "delay-500" },
            ].map((card) => (
              <div
                key={card.title}
                className={`bg-white rounded-2xl p-8 text-center hover-tilt animate-fade-up ${card.delay}`}
                style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
              >
                <div className="flex justify-center mb-4">{card.icon}</div>
                <h3 className="font-black uppercase text-[#2D1D0F] mb-3">{card.title}</h3>
                <p className="text-sm text-[#2D1D0F]/60 leading-relaxed">{card.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4 bg-[#F7E6C2]">
        <div
          className="max-w-3xl mx-auto rounded-3xl p-12 text-center animate-fade-up"
          style={{ background: "linear-gradient(135deg, #3374B5 0%, #2960A0 100%)", boxShadow: "0 20px 60px rgba(51,116,181,0.25)" }}
        >
          <h2 className="text-3xl font-black uppercase text-white mb-3">Ready to Switch?</h2>
          <p className="text-white/70 mb-8">Get your real street address today. No hidden fees, no hassle.</p>
          <Link
            href="/signup"
            className="bg-white text-[#3374B5] font-bold px-8 py-4 rounded-full hover:bg-[#F7E6C2] transition-all hover:-translate-y-1 hover:shadow-lg inline-block"
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
