import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { auth } from "@/lib/auth";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const sessionUser = session?.user
    ? {
        name: session.user.name ?? "Member",
        email: session.user.email ?? "",
        role: (session.user as { role?: string }).role ?? "USER",
      }
    : null;

  return (
    <>
      <Navbar sessionUser={sessionUser} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}
