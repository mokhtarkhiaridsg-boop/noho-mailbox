import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function PendingPage() {
  const sessionUser = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      plan: true,
      mailboxStatus: true,
      kycStatus: true,
      kycForm1583Url: true,
      kycIdImageUrl: true,
      securityDepositCents: true,
      suiteNumber: true,
    },
  });

  if (!user) redirect("/login");
  if (user.mailboxStatus === "Active") redirect("/dashboard");

  // Customers who picked "not_sure" at signup land here with no plan. Show
  // them the same status page but with a "Pick a plan" step at the top
  // instead of bouncing to /dashboard or /pricing — that previous redirect
  // was confusing UX (they'd lose all context of being mid-onboarding).
  const hasPlan = !!user.plan && user.plan !== "Free";

  type StepState = "done" | "current" | "todo";
  const steps: { title: string; description: string; state: StepState }[] = [
    {
      title: "Plan selected",
      description: hasPlan ? `${user.plan} plan` : "Choose Basic, Business, or Premium",
      state: hasPlan ? "done" : "current",
    },
    {
      title: "Security deposit",
      description:
        user.securityDepositCents && user.securityDepositCents > 0
          ? `$${(user.securityDepositCents / 100).toFixed(2)} reserved`
          : "Visit us in-store to pay the $50 security deposit",
      state: user.securityDepositCents && user.securityDepositCents > 0 ? "done" : "current",
    },
    {
      title: "Form 1583 + ID",
      description:
        user.kycStatus === "Approved"
          ? "Verified"
          : user.kycStatus === "Submitted"
          ? "Awaiting admin review"
          : user.kycForm1583Url && user.kycIdImageUrl
          ? "Uploaded — awaiting review"
          : "Visit us in-store or upload online",
      state:
        user.kycStatus === "Approved"
          ? "done"
          : user.kycStatus === "Submitted"
          ? "current"
          : "todo",
    },
    {
      title: "Mailbox assignment",
      description: user.suiteNumber
        ? `Suite #${user.suiteNumber}`
        : "Awaiting admin assignment",
      state: user.suiteNumber ? "done" : "todo",
    },
  ];

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at top left, #F0DBA9 0%, #F8F2EA 55%, #FFF9F3 100%)",
        color: "#2D100F",
      }}
    >
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div
          className="rounded-3xl p-10"
          style={{
            background: "white",
            border: "1px solid #E8DDD0",
            boxShadow: "var(--shadow-cream-md)",
          }}
        >
          <p
            className="text-[11px] uppercase tracking-[0.18em] font-black"
            style={{ color: "#337485" }}
          >
            Welcome, {user.name.split(" ")[0]}
          </p>
          <h1
            className="mt-3 text-3xl font-black"
            style={{ color: "#2D100F", fontFamily: "var(--font-baloo), sans-serif" }}
          >
            Your mailbox is being prepared
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "#5C4540" }}>
            Our team is reviewing your account. You&apos;ll get an email and an in-app
            notification the moment your suite number is assigned and your mailbox is
            live.
          </p>

          <ol className="mt-10 space-y-4">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="flex items-start gap-4 rounded-2xl p-5"
                style={{
                  background: "#F8F2EA",
                  border: "1px solid #E8DDD0",
                }}
              >
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black"
                  style={
                    step.state === "done"
                      ? { background: "#2D100F", color: "#F7E6C2" }
                      : step.state === "current"
                      ? {
                          background: "var(--color-warning-soft)",
                          color: "#7C2D12",
                          boxShadow: "0 0 0 2px rgba(245,158,11,0.30)",
                        }
                      : {
                          background: "white",
                          color: "#A89484",
                          boxShadow: "0 0 0 1px #E8DDD0",
                        }
                  }
                >
                  {step.state === "done" ? "✓" : i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-black" style={{ color: "#2D100F" }}>
                    {step.title}
                  </p>
                  <p className="mt-0.5 text-[13px]" style={{ color: "#5C4540" }}>
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            {hasPlan ? (
              <Link
                href="/dashboard/onboarding"
                className="rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #2D100F 0%, #1F0807 100%)",
                  color: "#F7E6C2",
                  boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
                }}
              >
                Upload Form 1583 + ID
              </Link>
            ) : (
              <Link
                href="/pricing"
                className="rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #2D100F 0%, #1F0807 100%)",
                  color: "#F7E6C2",
                  boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
                }}
              >
                Pick a plan
              </Link>
            )}
            <Link
              href="/dashboard/pending"
              className="rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-[0.06em]"
              style={{
                background: "#F7E6C2",
                color: "#2D100F",
                border: "1px solid #E8DDD0",
              }}
            >
              Refresh Status
            </Link>
            <Link
              href="/contact"
              className="rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-[0.06em]"
              style={{
                background: "transparent",
                color: "#2D100F",
                border: "1px solid #E8DDD0",
              }}
            >
              Contact Us
            </Link>
          </div>

          {(!user.securityDepositCents || user.securityDepositCents === 0) && (
            <div
              className="mt-6 rounded-2xl p-5"
              style={{
                background: "var(--color-warning-soft)",
                border: "1px solid rgba(245,158,11,0.30)",
              }}
            >
              <p className="text-sm font-black" style={{ color: "#7C2D12" }}>
                Security deposit required
              </p>
              <p className="mt-1 text-[13px]" style={{ color: "#5C4540" }}>
                Visit our store at 5062 Lankershim Blvd, North Hollywood to pay the $50
                security deposit. You can also call us at (818) 506-7744 for payment options.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
