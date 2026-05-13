import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    authInterrupts: true,
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-XSS-Protection", value: "1; mode=block" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            // Allow camera + microphone on same-origin only — needed by the
            // admin ID-scan + envelope-scan + intake-camera flows
            // (IdScanButton, AdminInboundScanPanel, LogMailModal) which call
            // navigator.mediaDevices.getUserMedia. Previously set to `()`
            // which is the empty allowlist (blocks all origins INCLUDING
            // self) — silently broke admin scanning. `(self)` allows only
            // first-party use; no third-party iframe can capture.
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(self), geolocation=()",
          },
        ],
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/:path*",
        has: [{ type: "host", value: "www.nohomailbox.org" }],
        destination: "https://nohomailbox.org/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
