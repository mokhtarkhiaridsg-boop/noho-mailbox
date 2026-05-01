import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getOrCreateMyReferralCode, getMyReferralStats } from "@/app/actions/referral";
import ReferShareBlock from "./ReferShareBlock";

export const metadata: Metadata = {
  title: "Refer a Friend — $10 for You, $10 for Them",
  description:
    "Share your NOHO Mailbox referral code. You get $10 in wallet credits, your friend gets $10 to start. No cap.",
  openGraph: {
    title: "Refer a Friend — NOHO Mailbox",
    description:
      "$10 for you, $10 for them. Share your code with anyone who needs a real LA address, mail forwarding, or a private mailbox.",
    url: "https://nohomailbox.org/refer",
  },
  alternates: { canonical: "https://nohomailbox.org/refer" },
};

const why = [
  {
    title: "$10 for you, $10 for them",
    body: "Both wallets get $10 the moment your friend signs up using your code. No cap — refer 5 friends, earn $50.",
  },
  {
    title: "No expiration",
    body: "Wallet credits never expire. Use them on mail scans, forwarding postage, same-day delivery, or your next renewal.",
  },
  {
    title: "Stack with our partner program",
    body: "If you&apos;re a CPA, attorney, or web designer, our Partner Program pays $300 per Business Solutions Bundle close. Apply at /partners.",
  },
];

const tips = [
  {
    title: "Etsy / Amazon / Shopify sellers",
    body:
      "Anyone running a side-hustle shop needs a real address for trademarks, banking, and platform verification. Tell them.",
  },
  {
    title: "Friends starting an LLC",
    body:
      "California LLCs require a real street address. We do the address + the formation + the brand if they want the bundle.",
  },
  {
    title: "Anyone with package theft",
    body:
      "Porch piracy is a real Valley problem. Our box solves it for $50/3 months. Easy referral.",
  },
  {
    title: "Realtors and freelancers",
    body:
      "Independent professionals all eventually need a real business address. Be the friend who told them first.",
  },
];

export default async function ReferPage() {
  const session = await auth();
  if (!session?.user) {
    // Send them to login with a return-to.
    redirect("/login?next=/refer");
  }

  // Generate or fetch the user's code, plus stats. Both are server-only.
  const [{ code }, stats] = await Promise.all([
    getOrCreateMyReferralCode(),
    getMyReferralStats(),
  ]);

  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-20 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <span
            className="inline-block px-3 py-1 text-[11px] font-bold tracking-wider rounded-full mb-5 animate-fade-up"
            style={{
              background: "rgba(245,166,35,0.15)",
              color: "#F5A623",
              border: "1px solid rgba(245,166,35,0.3)",
            }}
          >
            MEMBER REFERRAL PROGRAM
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Send a friend.{" "}
            <span style={{ color: "#F5A623" }}>Earn $10.</span>
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            Share your code with anyone who needs a real LA address. They get
            $10 in wallet credits to start, you get $10. No cap, no expiration.
          </p>
        </div>
      </section>

      {/* Personality strip */}
      <div
        className="py-3 px-4 text-center text-sm font-semibold"
        style={{ background: "#F7E6C2", color: "#6B3F1A" }}
      >
        Your code is one of one. Share by text, email, or in person.
      </div>

      {/* Code & stats */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          <ReferShareBlock code={code} />

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 mt-8">
            <div
              className="rounded-2xl p-5 text-center animate-fade-up"
              style={{
                background: "#FFF9F3",
                border: "1px solid #E8D8C4",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div className="text-3xl font-extrabold tracking-tight" style={{ color: "#337485" }}>
                {stats.creditedCount}
              </div>
              <div className="text-xs font-bold text-text-light-muted mt-1 uppercase tracking-wider">
                Friends joined
              </div>
            </div>
            <div
              className="rounded-2xl p-5 text-center animate-fade-up delay-100"
              style={{
                background: "#FFF9F3",
                border: "1px solid #E8D8C4",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div className="text-3xl font-extrabold tracking-tight" style={{ color: "#337485" }}>
                ${(stats.totalEarnedCents / 100).toFixed(0)}
              </div>
              <div className="text-xs font-bold text-text-light-muted mt-1 uppercase tracking-wider">
                Earned
              </div>
            </div>
            <div
              className="rounded-2xl p-5 text-center animate-fade-up delay-200"
              style={{
                background: "#FFF9F3",
                border: "1px solid #E8D8C4",
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div className="text-3xl font-extrabold tracking-tight" style={{ color: "#F5A623" }}>
                ∞
              </div>
              <div className="text-xs font-bold text-text-light-muted mt-1 uppercase tracking-wider">
                No cap
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-12 animate-fade-up">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {why.map((w, i) => (
              <div
                key={w.title}
                className="rounded-2xl p-6 hover-lift animate-fade-up"
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-md)",
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <h3 className="font-extrabold tracking-tight text-text-light mb-2 text-lg">
                  {w.title}
                </h3>
                <p
                  className="text-sm leading-relaxed text-text-light-muted"
                  dangerouslySetInnerHTML={{ __html: w.body }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Who to refer */}
      <section className="py-16 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold tracking-tight text-text-light text-center mb-3 animate-fade-up">
            Who&apos;s easy to refer
          </h2>
          <p className="text-text-light-muted text-center max-w-2xl mx-auto mb-12 animate-fade-up delay-200">
            People who hit any of these moments are typically one short
            conversation away from joining.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {tips.map((t, i) => (
              <div
                key={t.title}
                className="rounded-2xl p-6 hover-lift animate-fade-up"
                style={{
                  background: "#FFF9F3",
                  border: "1px solid #E8D8C4",
                  boxShadow: "var(--shadow-md)",
                  animationDelay: `${i * 100}ms`,
                }}
              >
                <h3 className="font-extrabold tracking-tight text-text-light mb-2">
                  {t.title}
                </h3>
                <p
                  className="text-sm leading-relaxed text-text-light-muted"
                  dangerouslySetInnerHTML={{ __html: t.body }}
                />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-4" style={{ background: "#110E0B" }}>
        <div className="max-w-3xl mx-auto text-center animate-fade-up">
          <p
            className="text-sm font-bold mb-3"
            style={{ color: "rgba(248,242,234,0.6)" }}
          >
            Are you a CPA, attorney, web designer, or other pro?
          </p>
          <h2 className="text-3xl font-extrabold tracking-tight mb-4" style={{ color: "#F8F2EA" }}>
            Earn $300 per close in our Partner Program
          </h2>
          <p className="mb-8" style={{ color: "rgba(248,242,234,0.65)" }}>
            Refer clients to our Business Solutions Bundle and earn a 15%
            commission — $300 on a $2k bundle, $180/mo on a $1.2k retainer.
          </p>
          <Link
            href="/partners"
            className="inline-block text-white font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
            style={{ background: "#337485", boxShadow: "var(--shadow-md)" }}
          >
            See the Partner Program →
          </Link>
        </div>
      </section>
    </div>
  );
}
