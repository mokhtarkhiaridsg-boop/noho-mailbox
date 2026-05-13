import type { Metadata } from "next";

// Cascading metadata for the auth section (/login, /signup, /forgot-
// password, /reset-password). Each page is a "use client" component
// so it can't export its own metadata — this layout fills the gap.
//
// Auth pages should NOT be indexed (no SEO value, leaks the auth
// surface to bot crawlers). `follow: true` so Google still discovers
// links FROM these pages back into the marketing site.
// `title` is a plain string here so the root layout's `%s | NOHO Mailbox`
// template appends the brand suffix for /login (which has no per-route
// layout). The other auth subroutes (/signup, /forgot-password,
// /reset-password) define their own title via subdirectory layouts using
// `{ absolute: ... }` to bypass the template and avoid double-suffix.
export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign into your NOHO Mailbox dashboard or create a new mailbox account.",
  robots: { index: false, follow: true },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
