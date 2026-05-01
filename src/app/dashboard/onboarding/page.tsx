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
  // Customers who picked "not_sure" need to pick a plan before uploading
  // Form 1583 (the form is signed against a specific suite/box, which depends
  // on the plan tier). Bounce them to pending — that page now renders a
  // "Pick a plan" step for plan-less users instead of redirecting away from
  // the onboarding flow entirely.
  if (!user.plan || user.plan === "Free") redirect("/dashboard/pending");
  if (user.mailboxStatus === "Active") redirect("/dashboard");

  const alreadySubmitted =
    user.kycStatus === "Submitted" || user.kycStatus === "Approved";

  const inputBase: React.CSSProperties = {
    background: "white",
    border: "1px solid #E8DDD0",
    color: "#2D100F",
  };

  return (
    <main
      className="min-h-screen"
      style={{
        background:
          "radial-gradient(ellipse at top left, #F0DBA9 0%, #F8F2EA 55%, #FFF9F3 100%)",
        color: "#2D100F",
      }}
    >
      <div className="mx-auto max-w-2xl px-6 py-16">
        <Link
          href="/dashboard/pending"
          className="text-sm font-bold hover:underline"
          style={{ color: "#337485" }}
        >
          ← Back to status
        </Link>

        <div
          className="mt-6 rounded-3xl p-10"
          style={{
            background: "white",
            border: "1px solid #E8DDD0",
            boxShadow: "var(--shadow-cream-md)",
          }}
        >
          <h1
            className="text-3xl font-black"
            style={{ color: "#2D100F", fontFamily: "var(--font-baloo), sans-serif" }}
          >
            Identity verification
          </h1>
          <p className="mt-3 text-[15px] leading-relaxed" style={{ color: "#5C4540" }}>
            Federal regulations require we verify your identity before assigning
            a mailbox. Upload your signed USPS Form 1583 and a photo of your
            government-issued ID.
          </p>

          {alreadySubmitted ? (
            <div
              className="mt-8 rounded-2xl p-5"
              style={{
                background: "var(--color-success-soft)",
                border: "1px solid rgba(34,197,94,0.30)",
                color: "#166534",
              }}
            >
              <p className="font-black">
                {user.kycStatus === "Approved" ? "Verified ✓" : "Documents received"}
              </p>
              <p className="mt-1 text-[13px]">
                {user.kycStatus === "Approved"
                  ? "Your identity has been verified."
                  : "Our compliance team is reviewing your documents. You'll get an in-app notification when review completes."}
              </p>
            </div>
          ) : (
            <form action={submitKyc} encType="multipart/form-data" className="mt-8 space-y-6">
              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: "#5C4540" }}>
                  USPS Form 1583 (PDF or image)
                </label>
                <input
                  type="file"
                  name="form1583"
                  accept="application/pdf,image/*"
                  required
                  className="mt-2 block w-full rounded-xl px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-white file:bg-[#2D100F]"
                  style={inputBase}
                />
                <p className="mt-1.5 text-[11px]" style={{ color: "#A89484" }}>
                  Don&apos;t have one yet?{" "}
                  <a
                    href="https://about.usps.com/forms/ps1583.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline font-bold"
                    style={{ color: "#337485" }}
                  >
                    Download Form 1583
                  </a>
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: "#5C4540" }}>
                  Primary ID (photo)
                </label>
                <input
                  type="file"
                  name="idImage"
                  accept="image/*"
                  required
                  className="mt-2 block w-full rounded-xl px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-white file:bg-[#2D100F]"
                  style={inputBase}
                />
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-[11px] shrink-0" style={{ color: "#A89484" }}>Exp. date:</label>
                  <input type="date" name="idPrimaryExpDate" className="rounded-lg px-2 py-1 text-xs" style={inputBase} />
                </div>
                <p className="mt-1 text-[11px]" style={{ color: "#A89484" }}>
                  Driver&apos;s license, passport, or state ID. Max 8 MB.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-black uppercase tracking-[0.16em]" style={{ color: "#5C4540" }}>
                  Second ID (photo)
                </label>
                <input
                  type="file"
                  name="idImage2"
                  accept="image/*"
                  required
                  className="mt-2 block w-full rounded-xl px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:px-3 file:py-1.5 file:text-xs file:font-black file:text-white file:bg-[#2D100F]"
                  style={inputBase}
                />
                <div className="mt-2 flex items-center gap-2">
                  <label className="text-[11px] shrink-0" style={{ color: "#A89484" }}>Exp. date:</label>
                  <input type="date" name="idSecondaryExpDate" className="rounded-lg px-2 py-1 text-xs" style={inputBase} />
                </div>
                <p className="mt-1 text-[11px]" style={{ color: "#A89484" }}>
                  Must be different from primary. Examples: passport, utility bill, social security card. Max 8 MB.
                </p>
              </div>

              <div
                className="rounded-xl p-4"
                style={{
                  background: "var(--color-warning-soft)",
                  border: "1px solid rgba(245,158,11,0.30)",
                }}
              >
                <p className="text-xs font-black" style={{ color: "#7C2D12" }}>
                  CMRA Requirement
                </p>
                <p className="text-[11px] mt-1" style={{ color: "#7C2D12" }}>
                  Federal law (USPS DMM 508.1.8) requires two valid forms of identification to rent a commercial mailbox.
                </p>
              </div>

              <button
                type="submit"
                className="w-full rounded-2xl px-6 py-3 text-sm font-black uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, #2D100F 0%, #1F0807 100%)",
                  color: "#F7E6C2",
                  boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
                }}
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
