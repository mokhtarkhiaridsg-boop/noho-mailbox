// iter-161 — Admin layout. Mounts the PWA install-prompt component
// so admins can install the panel as a standalone app on their
// counter tablets (after the same 3-distinct-day threshold).

import PwaInstallPrompt from "@/components/PwaInstallPrompt";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PwaInstallPrompt />
    </>
  );
}
