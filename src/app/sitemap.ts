import type { MetadataRoute } from "next";
import { getAllPostSlugs } from "@/lib/blog-posts";
import { getAllZipSlugs } from "@/lib/delivery-zip-pages";
import { getAllStateSlugs } from "@/lib/state-llc-pages";
import { getAllCompetitorSlugs } from "@/lib/competitor-pages";
import { getAllUseCaseSlugs } from "@/lib/use-case-pages";
import { getAllIntlSaasSlugs } from "@/lib/international-saas-pages";
import { getAllNeighborhoodSlugs } from "@/lib/neighborhood-pages";
import { getAllPersonaSlugs } from "@/lib/persona-pages";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://nohomailbox.org";
  const now = new Date();

  // Static pages with priority hints.
  const staticPages: { path: string; priority: number; freq?: "weekly" | "monthly" }[] = [
    { path: "/", priority: 1.0, freq: "weekly" },
    { path: "/pricing", priority: 0.9 },
    { path: "/business-solutions", priority: 0.9 },
    { path: "/services", priority: 0.8 },
    { path: "/delivery", priority: 0.85 },
    { path: "/delivery/for-law-firms", priority: 0.75 },
    { path: "/delivery/for-florists", priority: 0.75 },
    { path: "/delivery/for-real-estate", priority: 0.75 },
    { path: "/delivery/for-medical-offices", priority: 0.75 },
    { path: "/delivery/for-print-shops", priority: 0.75 },
    { path: "/delivery/for-boutique-ecom", priority: 0.75 },
    { path: "/delivery/recurring-routes", priority: 0.85 },
    { path: "/for-cmra-operators", priority: 0.9 },
    { path: "/for-cmra-operators/apply", priority: 0.7 },
    { path: "/for-cmra-operators/migrate", priority: 0.75 },
    { path: "/affiliates", priority: 0.85 },
    { path: "/start", priority: 0.85 },
    { path: "/franchise", priority: 0.85 },
    { path: "/enterprise", priority: 0.85 },
    { path: "/case-studies", priority: 0.75 },
    { path: "/case-studies/noho-mailbox", priority: 0.7 },
    { path: "/delivery/compare-couriers", priority: 0.7 },
    { path: "/coverage", priority: 0.85 },
    { path: "/notary", priority: 0.8 },
    { path: "/shipping", priority: 0.7 },
    { path: "/shop", priority: 0.6 },
    { path: "/partners", priority: 0.85 },
    { path: "/refer", priority: 0.6 },
    { path: "/resources", priority: 0.85 },
    { path: "/tools", priority: 0.8 },
    { path: "/tools/llc-name-checker", priority: 0.7 },
    { path: "/tools/mailbox-roi-calculator", priority: 0.7 },
    { path: "/tools/llc-cost-calculator", priority: 0.75 },
    { path: "/tools/should-i-form-an-llc", priority: 0.75 },
    { path: "/tools/mailbox-plan-picker", priority: 0.75 },
    { path: "/blog", priority: 0.6 },
    { path: "/faq", priority: 0.7 },
    { path: "/compare", priority: 0.7 },
    { path: "/contact", priority: 0.6 },
    { path: "/security", priority: 0.5 },
    { path: "/about", priority: 0.7 },
    { path: "/glossary", priority: 0.65 },
    { path: "/how-it-works", priority: 0.6 },
    { path: "/privacy", priority: 0.3 },
    { path: "/terms", priority: 0.3 },
    // Spanish-language landing pages. LA is 50% Hispanic — these target
    // the "buzón postal", "buzón virtual", "formar LLC" Spanish queries
    // we were invisible for before. Bidirectional hreflang on each.
    { path: "/es", priority: 0.85 },
    { path: "/es/buzon-virtual", priority: 0.85 },
    { path: "/es/negocios", priority: 0.85 },
    { path: "/es/contacto", priority: 0.85 },
  ];

  // Dynamic blog posts.
  const blogPosts = getAllPostSlugs().map((slug) => ({
    path: `/blog/${slug}`,
    priority: 0.65,
  }));

  // Dynamic ZIP-by-ZIP delivery pages.
  const zipPages = getAllZipSlugs().map((zip) => ({
    path: `/delivery/${zip}`,
    priority: 0.65,
  }));

  // Dynamic state-by-state LLC formation pages.
  const statePages = getAllStateSlugs().map((slug) => ({
    path: `/business-solutions/${slug}`,
    priority: 0.7,
  }));

  // Dynamic state-by-state VIRTUAL MAILBOX pages. iter-226 — targets
  // "virtual mailbox <state>" queries (not just "private mailbox NoHo")
  // so out-of-state digital nomads, remote workers, and foreign LLC
  // owners can find us. Highest non-static priority because mailbox is
  // our core product.
  const virtualMailboxStatePages = getAllStateSlugs().map((slug) => ({
    path: `/virtual-mailbox/${slug}`,
    priority: 0.8,
  }));

  // Persona-keyed virtual mailbox pages (iter-227) — targets buyer-intent
  // queries like "virtual mailbox for amazon seller", "for digital nomad",
  // "for foreign llc". Intent is strongest at the persona layer so we
  // give these equal priority to the state pages.
  const virtualMailboxPersonaPages = getAllPersonaSlugs().map((slug) => ({
    path: `/virtual-mailbox/for/${slug}`,
    priority: 0.8,
  }));

  // Competitor-comparison pages.
  const vsPages = getAllCompetitorSlugs().map((slug) => ({
    path: `/vs/${slug}`,
    priority: 0.75,
  }));

  // Use-case / persona landing pages.
  const useCasePages = getAllUseCaseSlugs().map((slug) => ({
    path: `/for/${slug}`,
    priority: 0.75,
  }));

  // International CMRA SaaS landing pages.
  const intlPages = getAllIntlSaasSlugs().map((slug) => ({
    path: `/international/${slug}`,
    priority: 0.8,
  }));

  // Hyper-local neighborhood landing pages (iter-227) — targets
  // low-competition phrases like "private mailbox burbank" /
  // "mailbox rental studio city". One static page per LA/SFV
  // neighborhood adjacent to our 5062 Lankershim storefront.
  const neighborhoodPages = getAllNeighborhoodSlugs().map((slug) => ({
    path: `/private-mailbox/${slug}`,
    priority: 0.75,
  }));

  type SitemapPage = {
    path: string;
    priority: number;
    freq?: "weekly" | "monthly";
  };

  const all: SitemapPage[] = [
    ...staticPages,
    ...blogPosts,
    ...zipPages,
    ...statePages,
    ...virtualMailboxStatePages,
    ...virtualMailboxPersonaPages,
    ...vsPages,
    ...useCasePages,
    ...intlPages,
    ...neighborhoodPages,
  ];

  return all.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: now,
    changeFrequency: (page.freq ?? "monthly") as "weekly" | "monthly",
    priority: page.priority,
  }));
}
