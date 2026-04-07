import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "NOHO Mailbox — Your Mail, Your Way",
  description:
    "A real street address, digital mail scanning, forwarding, package alerts, notary services, and full business formation — all in one neighborhood mailbox shop.",
  icons: { icon: "/icon.svg" },
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
