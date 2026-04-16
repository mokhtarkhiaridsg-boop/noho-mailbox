import type { Metadata } from "next";
import Link from "next/link";
import { EnvelopeIcon, MailboxIcon, DeliveryTruckIcon, ShieldIcon, HeartBubbleIcon } from "@/components/BrandIcons";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Guides, tips, and news about mailbox rentals, USPS Form 1583, mail privacy, and running a business from a virtual address.",
  openGraph: {
    title: "Blog — NOHO Mailbox",
    description: "Helpful articles on mailbox rentals, mail privacy, and business address tips from NOHO Mailbox.",
    url: "https://nohomailbox.org/blog",
  },
  alternates: { canonical: "https://nohomailbox.org/blog" },
};

const articles = [
  {
    title: "How to Fill Out USPS Form 1583",
    excerpt: "A step-by-step guide to completing the form that authorizes your mailbox provider to receive mail on your behalf.",
    category: "Getting Started",
    icon: <EnvelopeIcon className="w-12 h-12" />,
    readTime: "4 min read",
  },
  {
    title: "PO Box vs. Real Street Address",
    excerpt: "Which is right for you? We break down the differences in privacy, functionality, and how businesses perceive each option.",
    category: "Guides",
    icon: <MailboxIcon className="w-12 h-12" />,
    readTime: "5 min read",
  },
  {
    title: "Starting an LLC in California: Your Complete Checklist",
    excerpt: "From choosing a name to filing your Articles of Organization — everything you need to launch your California LLC.",
    category: "Business",
    icon: <ShieldIcon className="w-12 h-12" />,
    readTime: "7 min read",
  },
  {
    title: "5 Reasons to Use a Professional Mailing Address",
    excerpt: "Protect your privacy, boost credibility, and simplify your mail management with a dedicated business address.",
    category: "Tips",
    icon: <HeartBubbleIcon className="w-12 h-12" />,
    readTime: "3 min read",
  },
  {
    title: "Same-Day Local Delivery: How It Works",
    excerpt: "From request to doorstep — here's how our same-day courier service gets your mail and packages to you fast.",
    category: "Services",
    icon: <DeliveryTruckIcon className="w-12 h-12" />,
    readTime: "4 min read",
  },
];

export default function BlogPage() {
  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Resources & Guides
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            Tips, guides, and everything you need to get the most out of your mailbox and business.
          </p>
        </div>
      </section>

      {/* Articles */}
      <section className="py-20 px-4 bg-bg-light">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article, i) => (
            <Link
              key={article.title}
              href="/contact"
              className={`group bg-surface-light rounded-2xl overflow-hidden hover-lift animate-fade-up shadow-[var(--shadow-md)] ${i % 2 === 0 ? "delay-100" : "delay-300"}`}
            >
              {/* Icon header */}
              <div className="bg-gradient-to-br from-bg-light to-bg-light px-6 py-8 flex items-center justify-center">
                {article.icon}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-accent">{article.category}</span>
                  <span className="text-[10px] text-text-light-muted/60">•</span>
                  <span className="text-[10px] text-text-light-muted/60">{article.readTime}</span>
                </div>
                <h3 className="font-extrabold tracking-tight text-text-light mb-2 group-hover:text-accent transition-colors">{article.title}</h3>
                <p className="text-sm text-text-light-muted leading-relaxed mb-4">{article.excerpt}</p>
                <span className="text-sm font-bold text-accent inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read More <span>→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
        <p className="text-center text-sm text-text-light-muted/60 mt-10 animate-fade-up">
          More articles coming soon. Have a question? <Link href="/contact" className="text-accent hover:underline">Contact us</Link>.
        </p>
      </section>
    </div>
  );
}
