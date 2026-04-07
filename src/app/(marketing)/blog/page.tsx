import Link from "next/link";
import { EnvelopeIcon, MailboxIcon, DeliveryTruckIcon, ShieldIcon, HeartBubbleIcon } from "@/components/BrandIcons";

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
      <section className="relative py-24 px-4 overflow-hidden" style={{ background: "linear-gradient(135deg, #2D1D0F 0%, #1a120a 50%, #2D1D0F 100%)" }}>
        <div className="absolute inset-0 overflow-hidden opacity-10">
          <div className="absolute top-10 right-16 animate-float"><EnvelopeIcon className="w-14 h-14 opacity-40" /></div>
          <div className="absolute bottom-10 left-12 animate-float delay-300"><MailboxIcon className="w-16 h-16 opacity-30" /></div>
        </div>
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-black uppercase text-[#F7E6C2] mb-6 animate-scale-in">
            Resources & Guides
          </h1>
          <p className="text-[#F7E6C2]/60 max-w-xl mx-auto text-lg animate-fade-up delay-200">
            Tips, guides, and everything you need to get the most out of your mailbox and business.
          </p>
        </div>
      </section>

      {/* Articles */}
      <section className="py-20 px-4 bg-[#F7E6C2]">
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {articles.map((article, i) => (
            <Link
              key={article.title}
              href="/contact"
              className={`group bg-white rounded-2xl overflow-hidden hover-tilt animate-fade-up ${i % 2 === 0 ? "delay-100" : "delay-300"}`}
              style={{ boxShadow: "0 8px 32px rgba(45,29,15,0.08)" }}
            >
              {/* Icon header */}
              <div className="bg-gradient-to-br from-[#FFFDF8] to-[#F7E6C2] px-6 py-8 flex items-center justify-center">
                {article.icon}
              </div>
              <div className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#3374B5]">{article.category}</span>
                  <span className="text-[10px] text-[#2D1D0F]/30">•</span>
                  <span className="text-[10px] text-[#2D1D0F]/40">{article.readTime}</span>
                </div>
                <h3 className="font-black text-[#2D1D0F] mb-2 group-hover:text-[#3374B5] transition-colors">{article.title}</h3>
                <p className="text-sm text-[#2D1D0F]/60 leading-relaxed mb-4">{article.excerpt}</p>
                <span className="text-sm font-bold text-[#3374B5] inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  Read More <span>→</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
        <p className="text-center text-sm text-[#2D1D0F]/40 mt-10 animate-fade-up">
          More articles coming soon. Have a question? <Link href="/contact" className="text-[#3374B5] hover:underline">Contact us</Link>.
        </p>
      </section>
    </div>
  );
}
