// iter-161 — Admin layout. Mounts the PWA install-prompt component
// so admins can install the panel as a standalone app on their
// counter tablets (after the same 3-distinct-day threshold).

import type { Metadata } from "next";
import PwaInstallPrompt from "@/components/PwaInstallPrompt";

// Admin-only console — must NOT be indexed. Already gated by admin
// auth, but defense-in-depth: noindex prevents the URL from leaking
// via Google cache + follow:false stops crawlers from probing every
// admin tab (which would 401 but still reveals route structure).
export const metadata: Metadata = {
  title: "Admin",
  description: "NOHO Mailbox admin console.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PwaInstallPrompt />
    </>
  );
}
