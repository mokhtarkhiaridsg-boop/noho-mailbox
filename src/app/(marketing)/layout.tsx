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
      <PromoBanner config={promoBanner} />
      <Navbar sessionUser={sessionUser} />
      <main className="flex-1">{children}</main>
      <Footer />
      <ExitIntentPopup />
      <MobileStickyCTA />
    </>
  );
}
