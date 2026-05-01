import type { Metadata } from "next";
import Link from "next/link";
import { POSTS } from "@/lib/blog-posts";

export const metadata: Metadata = {
  title: "Blog & Guides — California LLC, Mailboxes, Same-Day Delivery",
  description:
    "Long-form guides on California LLC formation, USPS Form 1583, virtual mailbox vs P.O. Box, same-day delivery, S-corp tax election, and running a business from a real LA address.",
  openGraph: {
    title: "Blog — NOHO Mailbox",
    description:
      "Guides on same-day delivery, LLC formation, mailbox addresses, and small business setup from a real North Hollywood storefront.",
    url: "https://nohomailbox.org/blog",
  },
  alternates: { canonical: "https://nohomailbox.org/blog" },
};

const categoryAccent: Record<string, string> = {
  "Same-Day Delivery": "#337485",
  "Business Solutions": "#B07030",
  "Mailbox Plans": "#337485",
  "LLC Formation": "#B07030",
  "LLC Strategy": "#B07030",
  "Tax Strategy": "#15803d",
  "E-commerce": "#337485",
  Payments: "#337485",
  Operations: "#7A6050",
  "How-To": "#7A6050",
  "Creator Economy": "#92400e",
  Guides: "#337485",
  Tips: "#337485",
};

const categoryOrder: string[] = [
  "LLC Formation",
  "LLC Strategy",
  "Tax Strategy",
  "Mailbox Plans",
  "E-commerce",
  "Payments",
  "Operations",
  "How-To",
  "Same-Day Delivery",
  "Business Solutions",
  "Creator Economy",
  "Guides",
  "Tips",
];

export default function BlogPage() {
  // Group posts by category, then sort categories per `categoryOrder`.
  const byCategory: Record<string, typeof POSTS> = {};
  for (const post of POSTS) {
    if (!byCategory[post.category]) byCategory[post.category] = [];
    byCategory[post.category].push(post);
  }
  // Sort posts inside each category — newest first by publishedAt.
  for (const cat of Object.keys(byCategory)) {
    byCategory[cat].sort(
      (a, b) =>
        new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
    );
  }
  // Order categories: known order first, then any remaining alphabetically.
  const knownCategories = categoryOrder.filter((c) => byCategory[c]);
  const unknownCategories = Object.keys(byCategory)
    .filter((c) => !categoryOrder.includes(c))
    .sort();
  const orderedCategories = [...knownCategories, ...unknownCategories];

  return (
    <div className="perspective-container">
      {/* Hero */}
      <section className="relative py-24 px-4 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-5xl mx-auto text-center relative z-10">
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-text-dark mb-6 animate-scale-in">
            Resources &amp; Guides
          </h1>
          <p className="text-text-dark-muted max-w-xl mx-auto text-lg animate-fade-up delay-200">
            Practical guides on same-day delivery, LLC formation, mailbox
            addresses, and getting a real business set up in Los Angeles.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-2 animate-fade-up delay-400">
            {orderedCategories.map((cat) => (
              <a
                key={cat}
                href={`#${cat.toLowerCase().replace(/\s+/g, "-")}`}
                className="text-[11px] font-bold uppercase tracking-wider px-3 py-1 rounded-full transition-all hover:-translate-y-0.5"
                style={{
                  background: "rgba(255,255,255,0.06)",
                  color: "#F8F2EA",
                  border: "1px solid rgba(255,255,255,0.12)",
                }}
              >
                {cat} ({byCategory[cat].length})
              </a>
            ))}
          </div>
        </div>
      </section>

      {/* Articles by category */}
      {orderedCategories.map((cat) => {
        const posts = byCategory[cat];
        const accent = categoryAccent[cat] ?? "#337485";
        return (
          <section
            key={cat}
            id={cat.toLowerCase().replace(/\s+/g, "-")}
            className="py-12 px-4 bg-bg-light"
            style={{
              borderTop: "1px solid #E8D8C4",
            }}
          >
            <div className="max-w-5xl mx-auto">
              <div className="flex items-baseline gap-3 mb-6">
                <h2
                  className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light"
                  style={{ color: accent }}
                >
                  {cat}
                </h2>
                <span className="text-sm text-text-light-muted">
                  {posts.length} {posts.length === 1 ? "article" : "articles"}
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {posts.map((post) => (
                  <Link
                    key={post.slug}
                    href={`/blog/${post.slug}`}
                    className="group bg-surface-light rounded-2xl overflow-hidden shadow-[var(--shadow-sm)] hover-lift transition-all"
                  >
                    <div
                      className="px-5 py-6 flex items-center justify-center text-center"
                      style={{
                        background: `linear-gradient(135deg, ${accent}15 0%, transparent 100%)`,
                      }}
                    >
                      <h3 className="font-extrabold tracking-tight text-text-light text-base leading-snug">
                        {post.title}
                      </h3>
                    </div>
                    <div className="p-5">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[9px] text-text-light-muted/70 font-semibold uppercase tracking-widest">
                          {post.readTime}
                        </span>
                      </div>
                      <p
                        className="text-xs text-text-light-muted leading-relaxed mb-3 line-clamp-3"
                        dangerouslySetInnerHTML={{ __html: post.dek }}
                      />
                      <span
                        className="inline-flex items-center gap-1 text-sm font-bold transition-all group-hover:gap-2"
                        style={{ color: accent }}
                      >
                        Read article →
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        );
      })}

      <section className="py-16 px-4" style={{ background: "#FFF9F3" }}>
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-sm text-text-light-muted mb-4">
            Have a question we should answer in a future post?{" "}
            <Link
              href="/contact"
              className="font-bold underline"
              style={{ color: "#337485" }}
            >
              Tell us →
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
