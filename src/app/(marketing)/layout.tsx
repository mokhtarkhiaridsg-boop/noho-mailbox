import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import PromoBanner from "@/components/PromoBanner";
import ExitIntentPopup from "@/components/ExitIntentPopup";
import MobileStickyCTA from "@/components/MobileStickyCTA";
import { auth } from "@/lib/auth";
import { getPromoBanner } from "@/app/actions/promo-banner";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, promoBanner] = await Promise.all([
    auth(),
    getPromoBanner(),
  ]);
  const sessionUser = session?.user
    ? {
        name: session.user.name ?? "Member",
        email: session.user.email ?? "",
        role: (session.user as { role?: string }).role ?? "USER",
      }
    : null;

  return (
    <>
      {/* Skip-to-main link — visually hidden until focused, then jumps over the
          promo banner + Navbar so keyboard users don't have to tab through them
          on every page. Required for WCAG 2.1 SC 2.4.1 (Bypass Blocks). */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[1000] focus:px-4 focus:py-2 focus:rounded-xl focus:bg-bg-dark focus:text-text-dark focus:font-bold focus:shadow-lg focus:outline focus:outline-2 focus:outline-accent"
      >
        Skip to main content
      </a>
      <PromoBanner config={promoBanner} />
      <Navbar sessionUser={sessionUser} />
      <main id="main-content" className="flex-1">{children}</main>
      <Footer />
      <ExitIntentPopup />
      <MobileStickyCTA />
    </>
  );
}
