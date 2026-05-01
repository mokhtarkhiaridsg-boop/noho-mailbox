import { ImageResponse } from "next/og";

export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "NOHO Mailbox Partner Program — Earn $300 per referral";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(145deg, #110E0B 0%, #2D100F 100%)",
          padding: "70px",
          position: "relative",
          color: "#F8F2EA",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -150,
            right: -100,
            width: 500,
            height: 500,
            borderRadius: "50%",
            background: "rgba(51,116,133,0.30)",
            filter: "blur(100px)",
          }}
        />

        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 50 }}>
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
              fontWeight: 900,
              color: "#FFE4A0",
            }}
          >
            N
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: "#F8F2EA" }}>
              NOHO Mailbox
            </div>
            <div
              style={{
                fontSize: 16,
                color: "rgba(248,242,234,0.55)",
                fontWeight: 500,
              }}
            >
              Partner Program
            </div>
          </div>
        </div>

        <div style={{ display: "flex", marginBottom: 30 }}>
          <div
            style={{
              display: "flex",
              padding: "8px 18px",
              borderRadius: 999,
              background: "rgba(245,166,35,0.18)",
              color: "#F5A623",
              fontSize: 16,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: "2px",
            }}
          >
            For CPAs · Attorneys · Web Designers
          </div>
        </div>

        <div
          style={{
            fontSize: 96,
            fontWeight: 900,
            color: "#F8F2EA",
            letterSpacing: "-3px",
            lineHeight: 1.0,
            marginBottom: 24,
            display: "flex",
            flexDirection: "column",
          }}
        >
          <span>Earn <span style={{ color: "#F5A623" }}>$300</span></span>
          <span>per referral.</span>
        </div>

        <div
          style={{
            fontSize: 24,
            color: "rgba(248,242,234,0.7)",
            fontWeight: 500,
            lineHeight: 1.35,
            maxWidth: "85%",
            display: "flex",
          }}
        >
          15% commission on every closed Business Solutions Bundle. $180/mo for
          12 months on retainers. Free to join.
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
            nohomailbox.org/partners
          </div>
          <div
            style={{
              fontSize: 18,
              fontWeight: 700,
              color: "rgba(248,242,234,0.7)",
            }}
          >
            5062 Lankershim Blvd · North Hollywood
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
