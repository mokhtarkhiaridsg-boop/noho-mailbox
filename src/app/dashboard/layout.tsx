// iter-161 — Member dashboard layout. Mounts the PWA install-prompt
// component at the layout level so every dashboard page surfaces it
// (the component itself decides whether to actually render).

import PwaInstallPrompt from "@/components/PwaInstallPrompt";

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
