import type { Metadata } from "next";
import Link from "next/link";
import { HeartBubbleIcon, DeliveryTruckIcon, MailboxIcon } from "@/components/BrandIcons";

export const metadata: Metadata = {
  title: "Compare Mailbox Providers",
  description:
    "See how NOHO Mailbox stacks up against PO Boxes, virtual mailboxes, and UPS Store — same-day delivery, notary, and business formation included.",
  openGraph: {
    title: "Compare — NOHO Mailbox vs PO Box vs Virtual Mailbox vs UPS Store",
    description: "Side-by-side comparison of mailbox providers. NOHO Mailbox offers features others don't.",
    url: "https://nohomailbox.org/compare",
  },
  alternates: { canonical: "https://nohomailbox.org/compare" },
};

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
      <section className="relative py-24 px-4 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            NOHO vs. The Rest
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            See how NOHO Mailbox stacks up against PO Boxes, virtual mailbox services, and The UPS Store.
          </p>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <div
            className="overflow-x-auto rounded-2xl animate-fade-up shadow-[var(--shadow-md)]"
          >
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="text-left p-4 font-extrabold tracking-tight text-text-light bg-surface-light">Feature</th>
                  <th className="p-4 font-extrabold tracking-tight text-white bg-accent">
                    <span className="block text-xs tracking-wider opacity-70">★ RECOMMENDED</span>
                    NOHO Mailbox
                  </th>
                  <th className="p-4 font-extrabold tracking-tight text-text-light bg-surface-light">PO Box</th>
                  <th className="p-4 font-extrabold tracking-tight text-text-light bg-surface-light">Virtual Mailbox</th>
                  <th className="p-4 font-extrabold tracking-tight text-text-light bg-surface-light">UPS Store</th>
                </tr>
              </thead>
              <tbody>
                {features.map((f, i) => {
                  const isPrice = f.name === "Starts at";
                  return (
                    <tr key={f.name} className={i % 2 === 0 ? "bg-surface-light" : "bg-bg-light"}>
                      <td className="p-4 text-text-light/80 font-medium">{f.name}</td>
                      <td className={`p-4 text-center bg-accent/5 ${isPrice ? "font-extrabold tracking-tight text-accent" : ""}`}>
                        {isPrice ? String(f.noho) : f.noho ? <span className="text-accent font-bold text-lg">✓</span> : <span className="text-text-light-muted/60">—</span>}
                      </td>
                      {[f.pobox, f.virtual, f.ups].map((v, j) => (
                        <td key={j} className={`p-4 text-center ${isPrice ? "font-bold text-text-light-muted" : ""}`}>
                          {isPrice ? String(v) : v ? <span className="text-text-light-muted/60 text-lg">✓</span> : <span className="text-text-light-muted/60">—</span>}
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
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">Why Choose NOHO Mailbox</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { icon: <HeartBubbleIcon className="w-14 h-14" />, title: "Local & Personal", desc: "We're your neighbors — not a faceless corporation. Real people, real service, right in North Hollywood.", delay: "delay-100" },
              { icon: <MailboxIcon className="w-14 h-14" />, title: "All-In-One", desc: "Mail, packages, notary, business formation, shipping supplies, and now same-day delivery — all under one roof.", delay: "delay-300" },
              { icon: <DeliveryTruckIcon className="w-14 h-14" />, title: "Same-Day Delivery", desc: "No other local mailbox service offers same-day courier delivery. $5 flat rate in NoHo — get your mail at your door.", delay: "delay-500" },
            ].map((card) => (
              <div
                key={card.title}
                className={`bg-surface-light rounded-2xl p-8 text-center hover-lift animate-fade-up shadow-[var(--shadow-md)] ${card.delay}`}
              >
                <div className="flex justify-center mb-4">{card.icon}</div>
                <h3 className="font-extrabold tracking-tight text-text-light mb-3">{card.title}</h3>
                <p className="text-sm text-text-light-muted leading-relaxed">{card.desc}</p>
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
          <h2 className="text-3xl font-extrabold tracking-tight text-white mb-3">Ready to Switch?</h2>
          <p className="text-white/70 mb-8">Get your real street address today. No hidden fees, no hassle.</p>
          <Link
            href="/signup"
            className="bg-surface-light text-accent font-bold px-8 py-4 rounded-xl hover:bg-bg-light transition-all hover:-translate-y-1 hover:shadow-lg inline-block"
          >
            Get Started
          </Link>
        </div>
      </section>
    </div>
  );
}
