import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact Us",
  description:
    "Get in touch with NOHO Mailbox — visit us at 5250 Lankershim Blvd, North Hollywood, CA 91601. Call, email, or walk in today.",
  openGraph: {
    title: "Contact — NOHO Mailbox",
    description: "Reach NOHO Mailbox by phone, email, or visit our North Hollywood location. We're here to help.",
    url: "https://nohomailbox.org/contact",
  },
  alternates: { canonical: "https://nohomailbox.org/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}
