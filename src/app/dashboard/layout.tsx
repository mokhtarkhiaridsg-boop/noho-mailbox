// iter-161 — Member dashboard layout. Mounts the PWA install-prompt
// component at the layout level so every dashboard page surfaces it
// (the component itself decides whether to actually render).

import type { Metadata } from "next";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

// Auth-required member dashboard. Should NOT be indexed (member PII +
// auth surface — leaking these URLs in SERPs is a phishing vector).
// `follow: false` — no need for crawlers to traverse member-private
// dashboard internals.
export const metadata: Metadata = {
  title: "Dashboard",
  description: "Manage your NOHO Mailbox — view scanned mail, track packages, request forwarding, book delivery, and more.",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      {children}
      <PwaInstallPrompt />
    </>
  );
}
