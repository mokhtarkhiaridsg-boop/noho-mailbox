import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { InteractiveCursor } from "@/components/InteractiveCursor";
import { ScrollProgress } from "@/components/ScrollProgress";
import { Ripple } from "@/components/Ripple";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const viewport: Viewport = {
  themeColor: "#0F0D0B",
  width: "device-width",
  initialScale: 1,
};

export const metadata: Metadata = {
  title: {
    default: "NOHO Mailbox — Private Mailbox Rental in North Hollywood, CA",
    template: "%s | NOHO Mailbox",
  },
  description:
    "Private mailbox rental in North Hollywood, CA with a real street address, digital mail scanning, package handling, same-day delivery, walk-in notary, and full business formation. Plans from $50.",
  keywords: [
    "private mailbox North Hollywood",
    "mailbox rental NoHo",
    "virtual mailbox Los Angeles",
    "mail scanning North Hollywood",
    "real street address NoHo",
    "USPS Form 1583 North Hollywood",
    "PO Box alternative North Hollywood",
    "mail forwarding Los Angeles",
    "notary North Hollywood",
    "walk-in notary NoHo",
    "business formation North Hollywood",
    "LLC formation Los Angeles",
    "package receiving service NoHo",
    "same-day delivery San Fernando Valley",
    "shipping supplies North Hollywood",
    "small business address NoHo",
  ],
  authors: [{ name: "NOHO Mailbox" }],
  creator: "NOHO Mailbox",
  publisher: "NOHO Mailbox",
  category: "Mailbox Rental & Business Services",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  manifest: "/manifest.json",
  metadataBase: new URL("https://nohomailbox.org"),
  alternates: {
    canonical: "https://nohomailbox.org",
    types: {
      "application/rss+xml": [
        {
          url: "https://nohomailbox.org/feed.xml",
          title: "NOHO Mailbox — Blog RSS feed",
        },
      ],
    },
  },
  openGraph: {
    siteName: "NOHO Mailbox",
    type: "website",
    locale: "en_US",
    url: "https://nohomailbox.org",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "NOHO Mailbox — Private Mailbox Rental in North Hollywood, CA",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@nohomailbox",
    creator: "@nohomailbox",
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  verification: {
    // Add real verification codes here when available
    // google: "your-google-site-verification",
  },
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="min-h-screen flex flex-col font-[family-name:var(--font-inter)] antialiased">
        <ScrollProgress />
        {children}
        <InteractiveCursor />
        <Ripple />
      </body>
    </html>
  );
}
