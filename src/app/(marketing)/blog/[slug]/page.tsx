import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPostSlugs, getPostBySlug } from "@/lib/blog-posts";

export const dynamic = "force-static";

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

type Params = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Article Not Found" };

  return {
    title: post.title,
    description: post.metaDescription,
    openGraph: {
      title: `${post.title} — NOHO Mailbox`,
      description: post.metaDescription,
      url: `https://nohomailbox.org/blog/${post.slug}`,
      type: "article",
      publishedTime: post.publishedAt,
    },
    alternates: {
      canonical: `https://nohomailbox.org/blog/${post.slug}`,
    },
  };
}

export default async function BlogPostPage({ params }: Params) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const formattedDate = new Date(post.publishedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Article + BreadcrumbList JSON-LD for richer Google results.
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: {
      "@type": "Organization",
      name: "NOHO Mailbox",
      url: "https://nohomailbox.org",
    },
    publisher: {
      "@type": "Organization",
      name: "NOHO Mailbox",
      url: "https://nohomailbox.org",
      logo: {
        "@type": "ImageObject",
        url: "https://nohomailbox.org/brand/logo-trans.png",
      },
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://nohomailbox.org/blog/${post.slug}`,
    },
    articleSection: post.category,
    keywords: post.category,
  };

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: "https://nohomailbox.org",
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: "https://nohomailbox.org/blog",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `https://nohomailbox.org/blog/${post.slug}`,
      },
    ],
  };

  return (
    <div className="perspective-container">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      {/* Hero */}
      <section className="relative py-20 px-5 overflow-hidden bg-bg-dark">
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
        <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />
        <div className="max-w-3xl mx-auto relative z-10">
          <Link
            href="/blog"
            className="text-text-dark-muted hover:text-text-dark text-sm inline-flex items-center gap-1 mb-6 animate-fade-up"
          >
            ← All articles
          </Link>
          <div className="flex items-center gap-3 mb-4 animate-fade-up">
            <span
              className="text-[10px] font-bold uppercase tracking-widest"
              style={{ color: "#F5A623" }}
            >
              {post.category}
            </span>
            <span className="text-[10px] text-text-dark-muted/60">•</span>
            <span className="text-[10px] text-text-dark-muted/60">
              {post.readTime}
            </span>
            <span className="text-[10px] text-text-dark-muted/60">•</span>
            <span className="text-[10px] text-text-dark-muted/60">
              {formattedDate}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-text-dark mb-4 animate-scale-in">
            {post.title}
          </h1>
          <p
            className="text-text-dark-muted text-lg leading-relaxed animate-fade-up delay-200"
            dangerouslySetInnerHTML={{ __html: post.dek }}
          />
        </div>
      </section>

      {/* Article body */}
      <article className="py-16 px-4 bg-bg-light">
        <div className="max-w-3xl mx-auto">
          {post.sections.map((s, i) => (
            <section key={i} className="mb-10 animate-fade-up">
              {s.heading && (
                <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-light mb-4">
                  {s.heading}
                </h2>
              )}
              {s.paragraphs?.map((p, j) => (
                <p
                  key={j}
                  className="text-text-light-muted text-base leading-relaxed mb-4"
                  dangerouslySetInnerHTML={{ __html: p }}
                />
              ))}
              {s.bullets && (
                <ul className="space-y-2 mb-4">
                  {s.bullets.map((b, j) => (
                    <li
                      key={j}
                      className="text-text-light-muted text-base leading-relaxed flex items-start gap-3"
                    >
                      <span
                        className="mt-2 w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: "#337485" }}
                      />
                      <span dangerouslySetInnerHTML={{ __html: b }} />
                    </li>
                  ))}
                </ul>
              )}
              {s.callout && (
                <div
                  className="rounded-2xl p-5 my-6 text-sm leading-relaxed"
                  style={{
                    background: "#FFF9F3",
                    border: "1px solid #E8D8C4",
                    color: "#6B3F1A",
                  }}
                  dangerouslySetInnerHTML={{ __html: s.callout }}
                />
              )}
            </section>
          ))}

          {/* CTA */}
          <div
            className="mt-12 rounded-3xl p-10 text-center animate-fade-up"
            style={{
              background:
                "linear-gradient(145deg, #B07030 0%, #8A5520 100%)",
              boxShadow: "0 12px 40px rgba(176,112,48,0.3)",
              color: "#fff",
            }}
          >
            <h3
              className="text-2xl md:text-3xl font-extrabold tracking-tight mb-3"
              style={{ color: "#FFE4A0" }}
            >
              {post.cta.headline}
            </h3>
            <p
              className="text-sm leading-relaxed max-w-md mx-auto mb-6"
              style={{ color: "rgba(255,255,255,0.85)" }}
            >
              {post.cta.body}
            </p>
            <Link
              href={post.cta.href}
              className="inline-block font-bold px-8 py-4 rounded-xl transition-all hover:-translate-y-1"
              style={{
                background: "#FFE4A0",
                color: "#5A3A12",
                boxShadow: "var(--shadow-md)",
              }}
            >
              {post.cta.label} →
            </Link>
          </div>

          {/* Footer note */}
          <div className="mt-12 pt-8 border-t text-center" style={{ borderColor: "#E8D8C4" }}>
            <p className="text-sm text-text-light-muted mb-2">
              Questions? Walk in or call (818) 506-7744.
            </p>
            <p className="text-xs text-text-light-muted/70">
              5062 Lankershim Blvd, North Hollywood, CA 91601
            </p>
          </div>
        </div>
      </article>
    </div>
  );
}
