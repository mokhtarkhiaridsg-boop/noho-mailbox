import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "NOHO Mailbox — North Hollywood mailbox + same-day delivery";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #F7E6C2 0%, #FFF9F3 60%, #F7E6C2 100%)",
          padding: "70px",
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -200,
            right: -100,
            width: 600,
            height: 600,
            borderRadius: "50%",
            background: "rgba(51,116,133,0.20)",
            filter: "blur(80px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -150,
            left: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(176,112,48,0.20)",
            filter: "blur(80px)",
          }}
        />

        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 70 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 76,
              height: 76,
              borderRadius: 18,
              background: "#337485",
              fontSize: 44,
              fontWeight: 900,
              color: "#FFE4A0",
            }}
          >
            N
          </div>
          <div
            style={{
              fontSize: 36,
              fontWeight: 900,
              color: "#2D100F",
              letterSpacing: "-1px",
            }}
          >
            NOHO Mailbox
          </div>
        </div>

        {/* Headline */}
        <div
          style={{
            fontSize: 92,
            fontWeight: 900,
            color: "#2D100F",
            letterSpacing: "-3px",
            lineHeight: 1.0,
            marginBottom: 30,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Real LA address.</span>
          <span style={{ color: "#337485" }}>Same-day, $5 flat.</span>
        </div>

        <div
          style={{
            fontSize: 26,
            color: "rgba(45,16,15,0.7)",
            fontWeight: 500,
            lineHeight: 1.3,
            maxWidth: "85%",
            display: "flex",
          }}
        >
          Private mailbox · Same-day delivery · Notary · LLC + brand bundles —
          5062 Lankershim Blvd, North Hollywood
        </div>

        {/* Footer */}
        <div
          style={{
            position: "absolute",
            bottom: 50,
            left: 70,
            right: 70,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: 700, color: "#337485" }}>
            nohomailbox.org
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "rgba(45,16,15,0.6)",
              padding: "8px 16px",
              borderRadius: 999,
              background: "rgba(245,166,35,0.18)",
            }}
          >
            (818) 506-7744
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
