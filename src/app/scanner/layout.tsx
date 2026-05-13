// iter-109 — Bureau scanner PWA layout.
//
// Standalone shell separate from /admin so it can be installed as an
// iPad or Android-tablet PWA at the counter. Registers the SW and links
// the manifest. No NavBar / no admin chrome — the page is full-bleed.

import type { Metadata, Viewport } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "NOHO Scanner",
  description: "Tablet-at-counter package scanner with offline queue.",
  manifest: "/scanner-manifest.webmanifest",
  // Admin-only counter tool — never index. follow:false so crawlers
  // don't probe the route structure either.
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#23596A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function ScannerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", background: "#F8F2EA" }}>
      <Script id="register-scanner-sw" strategy="afterInteractive">
        {`if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
          navigator.serviceWorker.register("/scanner-sw.js", { scope: "/scanner" }).catch(() => undefined);
        }`}
      </Script>
      {children}
    </div>
  );
}
