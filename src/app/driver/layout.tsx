// iter-97 — Driver app layout. Standalone shell separate from /admin
// and /dashboard so it works as a phone-installed PWA. Includes the
// service-worker registration + manifest link.

import type { Metadata, Viewport } from "next";
import Script from "next/script";

export const metadata: Metadata = {
  title: "NOHO Driver",
  description: "Same-day delivery driver app for NOHO Mailbox.",
  manifest: "/driver-manifest.webmanifest",
};

export const viewport: Viewport = {
  themeColor: "#23596A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1, // prevent pinch-zoom on phone — POD photo flow needs taps
  userScalable: false,
};

export default function DriverLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100dvh", background: "#F8F2EA" }}>
      <Script id="register-driver-sw" strategy="afterInteractive">
        {`if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
          navigator.serviceWorker.register("/driver-sw.js", { scope: "/driver" }).catch(() => undefined);
        }`}
      </Script>
      {children}
    </div>
  );
}
