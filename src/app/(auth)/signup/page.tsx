"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useState, useEffect, useActionState } from "react";
import { signup, googleSignIn, appleSignIn, getOAuthConfig, type AuthState } from "@/app/actions/auth";

const plans = [
  { id: "free", name: "Free Member", term: "No Box Required", price: "Free" },
  { id: "basic-3", name: "Basic Box", term: "3 Months", price: "$50" },
  { id: "basic-6", name: "Basic Box", term: "6 Months", price: "$95" },
  { id: "basic-14", name: "Basic Box", term: "14 Months", price: "$160" },
  { id: "business-3", name: "Business Box", term: "3 Months", price: "$80" },
  { id: "business-6", name: "Business Box", term: "6 Months", price: "$150" },
  { id: "business-14", name: "Business Box", term: "14 Months", price: "$230" },
  { id: "premium-3", name: "Premium Box", term: "3 Months", price: "$95" },
  { id: "premium-6", name: "Premium Box", term: "6 Months", price: "$180" },
  { id: "premium-14", name: "Premium Box", term: "14 Months", price: "$295" },
];

export default function SignUpPage() {
  const [step, setStep] = useState(1);
  const [selectedPlan, setSelectedPlan] = useState("free");
  const [formValues, setFormValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });

  const [state, formAction, pending] = useActionState<AuthState, FormData>(signup, {});
  const [oauth, setOauth] = useState({ google: false, apple: false });
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [tosAccepted, setTosAccepted] = useState(false);

  useEffect(() => {
    getOAuthConfig().then((cfg) => setOauth({ google: cfg.isGoogleEnabled, apple: cfg.isAppleEnabled }));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-bg-dark relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-10 animate-scale-in">
          <Link href="/">
            <Logo className="mx-auto h-14 w-auto mb-4 drop-shadow-2xl" />
          </Link>
          <p className="text-text-dark-muted text-sm">Create your account</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8 animate-fade-up">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                  step >= s
                    ? "bg-accent text-white shadow-[0_2px_10px_rgba(51,116,181,0.4)]"
                    : "bg-white/[0.06] text-text-dark-muted/40"
                }`}
              >
                {step > s ? (
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                ) : s}
              </div>
              {s < 3 && (
                <div
                  className={`w-12 h-0.5 rounded-full transition-all duration-300 ${
                    step > s ? "bg-accent" : "bg-white/[0.06]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="animate-fade-up delay-100 rounded-2xl p-8 bg-white/[0.04] border border-white/[0.08] shadow-[0_4px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          {state.error && (
            <div className="text-danger text-xs font-semibold text-center p-3 rounded-xl bg-danger/10 border border-danger/20 mb-4">
              {state.error}
            </div>
          )}

          {step === 1 && (
            <>
              {/* OAuth quick signup — hidden when providers aren't configured */}
              {(oauth.google || oauth.apple) && (
                <div className="space-y-3 mb-6">
                  {oauthError && (
                    <div className="text-danger text-xs font-semibold text-center p-3 rounded-xl bg-danger/10 border border-danger/20">
                      {oauthError}
                    </div>
                  )}
                  {oauth.google && (
                    <form action={async () => {
                      const result = await googleSignIn();
                      if (result?.error) setOauthError(result.error);
                    }}>
                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-3 bg-white text-text-light font-semibold py-3 rounded-xl text-sm transition-all duration-200 hover:bg-gray-50 shadow-[0_2px_12px_rgba(0,0,0,0.15)]"
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                        </svg>
                        Sign up with Google
                      </button>
                    </form>
                  )}
                  {oauth.apple && (
                    <form action={async () => {
                      const result = await appleSignIn();
                      if (result?.error) setOauthError(result.error);
                    }}>
                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-3 bg-black text-white font-semibold py-3 rounded-xl text-sm transition-all duration-200 hover:bg-gray-900 shadow-[0_2px_12px_rgba(0,0,0,0.4)]"
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
                          <path d="M17.05 12.04c-.03-3.18 2.59-4.7 2.71-4.78-1.48-2.16-3.78-2.46-4.6-2.49-1.96-.2-3.82 1.15-4.81 1.15-.99 0-2.52-1.12-4.14-1.09-2.13.03-4.1 1.24-5.19 3.14-2.21 3.83-.56 9.5 1.59 12.61 1.05 1.52 2.3 3.23 3.93 3.17 1.58-.06 2.18-1.02 4.09-1.02 1.91 0 2.45 1.02 4.13.99 1.71-.03 2.79-1.55 3.83-3.08 1.21-1.77 1.71-3.49 1.74-3.58-.04-.02-3.34-1.28-3.38-5.07zM14.04 3.04c.87-1.05 1.45-2.51 1.29-3.96-1.25.05-2.76.83-3.66 1.88-.81.93-1.51 2.42-1.32 3.84 1.39.11 2.81-.71 3.69-1.76z"/>
                        </svg>
                        Sign up with Apple
                      </button>
                    </form>
                  )}
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px bg-white/[0.08]" />
                    <span className="text-[10px] font-semibold text-text-dark-muted/60 uppercase tracking-widest">or pick a plan</span>
                    <div className="flex-1 h-px bg-white/[0.08]" />
                  </div>
                </div>
              )}

              <h2 className="text-lg font-bold text-text-dark mb-5">Choose Your Plan</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1 scrollbar-thin">
                {plans.map((p) => (
                  <label
                    key={p.id}
                    className={`flex items-center justify-between py-3 px-4 rounded-xl cursor-pointer transition-all duration-200 ${
                      selectedPlan === p.id
                        ? "bg-accent/15 border border-accent/40"
                        : "bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.05]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="plan"
                        value={p.id}
                        checked={selectedPlan === p.id}
                        onChange={() => setSelectedPlan(p.id)}
                        className="accent-accent"
                      />
                      <div>
                        <span className="text-sm font-semibold text-text-dark">{p.name}</span>
                        <span className="text-xs text-text-dark-muted/60 ml-2">{p.term}</span>
                      </div>
                    </div>
                    <span className="font-bold text-text-dark">{p.price}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full mt-6 font-semibold py-3.5 rounded-xl text-sm text-white bg-accent hover:bg-accent-hover transition-all duration-200 shadow-[0_4px_16px_rgba(51,116,181,0.4)]"
              >
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-lg font-bold text-text-dark mb-5">Your Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-text-dark-muted mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={formValues.firstName}
                      onChange={(e) => setFormValues({ ...formValues, firstName: e.target.value })}
                      className="w-full rounded-xl px-4 py-3 text-sm text-text-dark placeholder-text-dark-muted/40 bg-white/[0.06] border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/30 transition-all"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-dark-muted mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={formValues.lastName}
                      onChange={(e) => setFormValues({ ...formValues, lastName: e.target.value })}
                      className="w-full rounded-xl px-4 py-3 text-sm text-text-dark placeholder-text-dark-muted/40 bg-white/[0.06] border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/30 transition-all"
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dark-muted mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formValues.email}
                    onChange={(e) => setFormValues({ ...formValues, email: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 text-sm text-text-dark placeholder-text-dark-muted/40 bg-white/[0.06] border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/30 transition-all"
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dark-muted mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={formValues.phone}
                    onChange={(e) => setFormValues({ ...formValues, phone: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 text-sm text-text-dark placeholder-text-dark-muted/40 bg-white/[0.06] border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/30 transition-all"
                    placeholder="(818) 555-0100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-dark-muted mb-1.5">Password</label>
                  <input
                    type="password"
                    value={formValues.password}
                    onChange={(e) => setFormValues({ ...formValues, password: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 text-sm text-text-dark placeholder-text-dark-muted/40 bg-white/[0.06] border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/30 transition-all"
                    placeholder="Min 8 characters"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 font-semibold py-3.5 rounded-xl text-sm text-text-dark border border-white/[0.1] hover:bg-white/[0.05] transition-all"
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-[2] font-semibold py-3.5 rounded-xl text-sm text-white bg-accent hover:bg-accent-hover transition-all duration-200 shadow-[0_4px_16px_rgba(51,116,181,0.4)]"
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-lg font-bold text-text-dark mb-3">
                {selectedPlan === "free" ? "You're All Set" : "What to Bring"}
              </h2>
              <p className="text-sm text-text-dark-muted mb-6 leading-relaxed">
                {selectedPlan === "free"
                  ? "Your free member account is ready. You can shop, book delivery, notary, and business services anytime."
                  : "Visit us in-store to complete your signup. Here's what you need:"}
              </p>

              {selectedPlan !== "free" && (
                <div className="space-y-3 mb-8">
                  {[
                    { title: "Two valid government-issued photo IDs", desc: "Driver's license, passport, state ID, etc." },
                    { title: "Sign USPS Form 1583", desc: "We provide the form — just bring your IDs and sign." },
                    { title: "Payment for your selected plan", desc: "We accept all major cards and cash." },
                  ].map((item, i) => (
                    <div
                      key={item.title}
                      className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.04] border border-white/[0.06]"
                    >
                      <span className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white bg-accent shadow-[0_2px_8px_rgba(51,116,181,0.35)]">
                        {i + 1}
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-text-dark">{item.title}</p>
                        <p className="text-xs text-text-dark-muted mt-0.5">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="rounded-xl p-5 text-center mb-6 bg-accent/10 border border-accent/20">
                <p className="text-sm font-semibold text-text-dark mb-1">
                  {selectedPlan === "free" ? "Free Membership Activated" : "Your Account is Ready!"}
                </p>
                <p className="text-xs text-text-dark-muted">
                  {selectedPlan === "free"
                    ? "Sign in to your dashboard to start using NOHO Mailbox services today."
                    : "Complete your visit in-store to activate your mailbox and receive your keys."}
                </p>
              </div>

              <form action={formAction}>
                <input type="hidden" name="plan" value={selectedPlan} />
                <input type="hidden" name="firstName" value={formValues.firstName} />
                <input type="hidden" name="lastName" value={formValues.lastName} />
                <input type="hidden" name="email" value={formValues.email} />
                <input type="hidden" name="phone" value={formValues.phone} />
                <input type="hidden" name="password" value={formValues.password} />
                <input type="hidden" name="tosAccepted" value={tosAccepted ? "true" : ""} />

                <label className="flex items-start gap-3 mb-4 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={tosAccepted}
                    onChange={(e) => setTosAccepted(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded accent-accent shrink-0"
                  />
                  <span className="text-xs text-text-dark-muted leading-relaxed">
                    I agree to the{" "}
                    <Link href="/terms" target="_blank" className="text-accent hover:underline font-semibold">
                      Terms of Service
                    </Link>{" "}
                    and{" "}
                    <Link href="/privacy" target="_blank" className="text-accent hover:underline font-semibold">
                      Privacy Policy
                    </Link>
                  </span>
                </label>

                <button
                  type="submit"
                  disabled={pending || !tosAccepted}
                  className="block w-full text-center font-semibold py-3.5 rounded-xl text-sm text-white bg-accent hover:bg-accent-hover transition-all duration-200 shadow-[0_4px_16px_rgba(51,116,181,0.4)] disabled:opacity-60"
                >
                  {pending ? "Creating Account..." : "Go to My Dashboard"}
                </button>
              </form>
              <button
                onClick={() => setStep(2)}
                className="w-full mt-3 font-medium py-2 text-xs text-text-dark-muted/50 hover:text-text-dark-muted transition-colors"
              >
                &larr; Go back
              </button>
            </>
          )}
        </div>

        {/* Footer links */}
        <p className="animate-fade-up delay-300 text-center mt-6 text-sm text-text-dark-muted/50">
          Already have an account?{" "}
          <Link href="/login" className="text-accent font-semibold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
