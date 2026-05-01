import { POSTS } from "@/lib/blog-posts";

// Static RSS feed for the blog. Aggregators + Google News + Feedly all pull
// from this. Updates whenever blog-posts.ts changes (rebuild required).
export const dynamic = "force-static";

const SITE_URL = "https://nohomailbox.org";
const FEED_TITLE = "NOHO Mailbox — Blog";
const FEED_DESCRIPTION =
  "Practical guides on California LLC formation, USPS Form 1583, virtual mailbox vs P.O. Box, same-day delivery, and running a business from a real LA address.";
const FEED_LANGUAGE = "en-US";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Strip HTML entity placeholders we use in source (&apos; etc).
function stripPlaceholders(s: string): string {
  return s.replace(/&apos;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
}

export async function GET() {
  // Sort newest first by publishedAt.
  const sorted = [...POSTS].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );

  const items = sorted
    .map((p) => {
      const url = `${SITE_URL}/blog/${p.slug}`;
      const title = escapeXml(stripPlaceholders(p.title));
      const desc = escapeXml(stripPlaceholders(p.dek));
      const pubDate = new Date(p.publishedAt).toUTCString();
      const category = escapeXml(p.category);
      return `    <item>
      <title>${title}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pubDate}</pubDate>
      <category>${category}</category>
      <description>${desc}</description>
    </item>`;
    })
    .join("\n");

  const lastBuildDate = new Date().toUTCString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(FEED_TITLE)}</title>
    <link>${SITE_URL}/blog</link>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
    <description>${escapeXml(FEED_DESCRIPTION)}</description>
    <language>${FEED_LANGUAGE}</language>
    <lastBuildDate>${lastBuildDate}</lastBuildDate>
${items}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
