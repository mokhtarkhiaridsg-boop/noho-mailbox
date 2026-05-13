import type { Metadata } from "next";

// Per-route metadata override (see /(auth)/signup/layout.tsx for context).
export const metadata: Metadata = {
  title: { absolute: "Reset your password · NOHO Mailbox" },
  description:
    "Forgot your NOHO Mailbox password? Send yourself a reset link — we'll email you a secure link to set a new one.",
  robots: { index: false, follow: true },
};

export default function ForgotPasswordLayout({ children }: { children: React.ReactNode }) {
  return children;
}
