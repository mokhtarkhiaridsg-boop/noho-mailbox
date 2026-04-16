import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import Link from "next/link";
import { submitKyc } from "@/app/actions/kyc";

export default async function OnboardingPage() {
  const sessionUser = await verifySession();

  const user = await prisma.user.findUnique({
    where: { id: sessionUser.id },
    select: {
      name: true,
      plan: true,
      kycStatus: true,
      kycForm1583Url: true,
      kycIdImageUrl: true,
      mailboxStatus: true,
    },
  });

  if (!user) redirect("/login");
  if (!user.plan || user.plan === "Free") redirect("/pricing?upgrade=1");
  if (user.mailboxStatus === "Active") redirect("/dashboard");

  const alreadySubmitted =
    user.kycStatus === "Submitted" || user.kycStatus === "Approved";

  return (
    <main className="min-h-screen bg-gradient-to-b from-[#f7faff] to-white text-[#0e2240]">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/dashboard/pending"
          className="text-sm text-[#3374B5] hover:underline"
        >
          ← Back to onboarding
        </Link>

        <div className="mt-6 rounded-3xl border border-[#0e2240]/10 bg-white p-10 shadow-[0_30px_80px_-40px_rgba(14,34,64,0.25)]">
          <h1 className="text-3xl font-semibold">Identity verification</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-[#0e2240]/70">
            Federal regulations require we verify your identity before assigning
            a mailbox. Upload your signed USPS Form 1583 and a photo of your
            government-issued ID.
          </p>

          {alreadySubmitted ? (
            <div className="mt-8 rounded-2xl border border-green-200 bg-green-50 p-5 text-sm text-green-800">
              <p className="font-semibold">
                {user.kycStatus === "Approved"
                  ? "Verified ✓"
                  : "Documents received"}
              </p>
              <p className="mt-1 text-green-800/80">
                {user.kycStatus === "Approved"
                  ? "Your identity has been verified."
                  : "Our compliance team is reviewing your documents. You'll get an in-app notification when review completes."}
              </p>
            </div>
          ) : (
            <form
              action={submitKyc}
              encType="multipart/form-data"
              className="mt-8 space-y-6"
            >
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0e2240]/60">
                  USPS Form 1583 (PDF or image)
                </label>
                <input
                  type="file"
                  name="form1583"
                  accept="application/pdf,image/*"
                  required
                  className="mt-2 block w-full rounded-xl border border-[#0e2240]/15 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#3374B5] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
                <p className="mt-1.5 text-[11px] text-[#0e2240]/50">
                  Don&apos;t have one yet?{" "}
                  <a
                    href="https://about.usps.com/forms/ps1583.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#3374B5] hover:underline"
                  >
                    Download Form 1583
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#0e2240]/60">
                  Government ID photo
                </label>
                <input
                  type="file"
                  name="idImage"
                  accept="image/*"
                  required
                  className="mt-2 block w-full rounded-xl border border-[#0e2240]/15 bg-white px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-[#3374B5] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white"
                />
                <p className="mt-1.5 text-[11px] text-[#0e2240]/50">
                  Driver&apos;s license, passport, or state ID. Max 8 MB.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-full bg-[#3374B5] px-6 py-3 text-sm font-semibold text-white shadow hover:bg-[#1e4d8c]"
              >
                Submit for review
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
