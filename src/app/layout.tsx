import type { Metadata, Viewport } from "next";
import { Nunito, Dancing_Script } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  weight: ["400", "600", "700", "800", "900"],
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const viewport: Viewport = {
  themeColor: "#2D1D0F",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "NOHO Mailbox — Your Mail, Your Way",
    template: "%s | NOHO Mailbox",
  },
  description:
    "A real street address, digital mail scanning, forwarding, package alerts, notary services, and full business formation — all in one neighborhood mailbox shop in North Hollywood, CA.",
  icons: { icon: "/icon.svg" },
  manifest: "/manifest.json",
  metadataBase: new URL("https://nohomailbox.org"),
  openGraph: {
    siteName: "NOHO Mailbox",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${nunito.variable} ${dancingScript.variable}`}>
      <body className="min-h-screen flex flex-col font-[family-name:var(--font-nunito)]">
        {children}
      </body>
    </html>
  );
}
