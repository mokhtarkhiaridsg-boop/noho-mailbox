import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Business Solutions",
  description:
    "Full-service business launch packages — LLC formation, brand identity, website development, social media setup, and ongoing brand management starting at $2,000.",
  openGraph: {
    title: "Business Solutions — NOHO Mailbox",
    description: "Launch your business with one invoice — formation, branding, website, social media, and brand management.",
    url: "https://nohomailbox.org/business-solutions",
  },
  alternates: { canonical: "https://nohomailbox.org/business-solutions" },
};

export default function BusinessSolutionsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
