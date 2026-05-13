import type { Metadata } from "next";

// Per-route metadata override — the parent (auth) layout sets `title: "Sign in"`
// as a fallback for all auth pages, but /signup, /forgot-password, and
// /reset-password each need their own title so the browser tab + share card
// match what the user is actually doing. The page itself is "use client" and
// can't export metadata, so we wrap it in this server-component layout.
export const metadata: Metadata = {
  // `absolute` bypasses the root "%s | NOHO Mailbox" template — without it,
  // Next.js wouldn't apply the suffix at all (parent (auth) layout's string
  // title breaks the chain), so we bake the brand directly into the title.
  title: { absolute: "Request a mailbox · NOHO Mailbox" },
  description:
    "Create your NOHO Mailbox account and pick a plan — real Lankershim Blvd address, mail scanning, and same-day delivery in North Hollywood.",
  robots: { index: false, follow: true },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
