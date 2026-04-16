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
  if (!user.plan || user.plan === "Free") redirect("/dashboard");
  if (user.mailboxStatus === "Active") redirect("/dashboard");

  type StepState = "done" | "current" | "todo";
  const steps: { title: string; description: string; state: StepState }[] = [
    {
      title: "Plan selected",
      description: `${user.plan} plan`,
      state: "done",
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
    <main className="min-h-screen bg-gradient-to-b from-[#f7faff] to-white text-[#0e2240]">
      <div className="mx-auto max-w-3xl px-6 py-20">
        <div className="rounded-3xl border border-[#0e2240]/10 bg-white p-10 shadow-[0_30px_80px_-40px_rgba(14,34,64,0.25)]">
          <p className="text-xs uppercase tracking-[0.3em] text-[#3374B5]">
            Welcome, {user.name.split(" ")[0]}
          </p>
          <h1 className="mt-3 text-3xl font-semibold">Your mailbox is being prepared</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#0e2240]/70">
            Our team is reviewing your account. You&apos;ll get an email and an in-app
            notification the moment your suite number is assigned and your mailbox is
            live.
          </p>

          <ol className="mt-10 space-y-5">
            {steps.map((step, i) => (
              <li
                key={step.title}
                className="flex items-start gap-4 rounded-2xl border border-[#0e2240]/8 bg-[#f7faff]/60 p-5"
              >
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                    step.state === "done"
                      ? "bg-[#3374B5] text-white"
                      : step.state === "current"
                      ? "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
                      : "bg-white text-[#0e2240]/40 ring-1 ring-[#0e2240]/15"
                  }`}
                >
                  {step.state === "done" ? "✓" : i + 1}
                </div>
                <div className="flex-1">
                  <p className="text-[15px] font-semibold">{step.title}</p>
                  <p className="mt-0.5 text-[13px] text-[#0e2240]/65">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-10 flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard/onboarding"
              className="rounded-full bg-[#3374B5] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#1e4d8c]"
            >
              Upload Form 1583 + ID
            </Link>
            <Link
              href="/dashboard/pending"
              className="rounded-full border border-[#3374B5] px-6 py-3 text-sm font-semibold text-[#3374B5] hover:bg-[#3374B5]/5"
            >
              Refresh Status
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-[#0e2240]/15 px-6 py-3 text-sm font-semibold text-[#0e2240] hover:bg-[#f7faff]"
            >
              Contact Us
            </Link>
          </div>

          {(!user.securityDepositCents || user.securityDepositCents === 0) && (
            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/60 p-5">
              <p className="text-[14px] font-semibold text-amber-800">
                Security deposit required
              </p>
              <p className="mt-1 text-[13px] text-amber-700/80">
                Visit our store at 5062 Lankershim Blvd, North Hollywood to pay the $50
                security deposit. You can also call us at (818) 765-1539 for payment options.
              </p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
