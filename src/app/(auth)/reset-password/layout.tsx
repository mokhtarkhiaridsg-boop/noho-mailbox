import type { Metadata } from "next";

// Per-route metadata override (see /(auth)/signup/layout.tsx for context).
export const metadata: Metadata = {
  title: { absolute: "Set a new password · NOHO Mailbox" },
  description: "Choose a new password for your NOHO Mailbox account.",
  robots: { index: false, follow: true },
};

export default function ResetPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
