import { ImageResponse } from "next/og";
import { getPostBySlug } from "@/lib/blog-posts";

export const runtime = "nodejs";

// Standard OG dimensions
export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";
export const alt = "NOHO Mailbox blog post";

type Params = { params: Promise<{ slug: string }> };

export default async function OGImage({ params }: Params) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  const title = post?.title ?? "NOHO Mailbox";
  // Strip HTML entities for OG text rendering.
  const cleanTitle = title
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&");
  const category = post?.category ?? "NOHO Mailbox";
  const dek = post?.dek
    ?.replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, "")
    .slice(0, 180);

  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(145deg, #F7E6C2 0%, #FFF9F3 100%)",
          padding: "70px",
          position: "relative",
        }}
      >
        {/* Decorative orb */}
        <div
          style={{
            position: "absolute",
            top: -150,
            right: -150,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(51,116,133,0.15)",
            filter: "blur(80px)",
          }}
        />

        {/* Brand row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          {/* Mailbox glyph */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#337485",
              fontSize: 36,
              fontWeight: 800,
              color: "#FFE4A0",
            }}
          >
            N
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                fontSize: 28,
                fontWeight: 800,
                color: "#2D100F",
                letterSpacing: "-0.5px",
              }}
            >
              NOHO Mailbox
            </div>
            <div
              style={{
                fontSize: 16,
                color: "rgba(45,16,15,0.55)",
                fontWeight: 500,
              }}
            >
              5062 Lankershim Blvd, North Hollywood
            </div>
          </div>
        </div>

        {/* Category pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "24px",
          }}
        >
          <div
            style={{
              padding: "6px 14px",
              borderRadius: 999,
              background: "rgba(245,166,35,0.18)",
              color: "#92400e",
              fontSize: 14,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "1.5px",
            }}
          >
            {category}
          </div>
        </div>

        {/* Title */}
        <div
          style={{
            fontSize: cleanTitle.length > 70 ? 52 : 64,
            fontWeight: 900,
            color: "#2D100F",
            lineHeight: 1.05,
            letterSpacing: "-1.5px",
            marginBottom: "24px",
            display: "flex",
          }}
        >
          {cleanTitle}
        </div>

        {/* Dek */}
        {dek && (
          <div
            style={{
              fontSize: 22,
              color: "rgba(45,16,15,0.65)",
              lineHeight: 1.35,
              fontWeight: 400,
              maxWidth: "85%",
              display: "flex",
            }}
          >
            {dek}
          </div>
        )}

        {/* Footer URL */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            right: 70,
            fontSize: 20,
            fontWeight: 700,
            color: "#337485",
          }}
        >
          nohomailbox.org/blog
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
