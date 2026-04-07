import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://nohomailbox.org";

  const pages = [
    { path: "/", priority: 1.0 },
    { path: "/pricing", priority: 0.9 },
    { path: "/services", priority: 0.8 },
    { path: "/delivery", priority: 0.8 },
    { path: "/notary", priority: 0.8 },
    { path: "/shop", priority: 0.7 },
    { path: "/blog", priority: 0.6 },
    { path: "/faq", priority: 0.7 },
    { path: "/contact", priority: 0.7 },
    { path: "/security", priority: 0.5 },
    { path: "/business-solutions", priority: 0.8 },
    { path: "/compare", priority: 0.7 },
  ];

  return pages.map((page) => ({
    url: `${baseUrl}${page.path}`,
    lastModified: new Date(),
    changeFrequency: page.path === "/" ? "weekly" : "monthly",
    priority: page.priority,
  }));
}
