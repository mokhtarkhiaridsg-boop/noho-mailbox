"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useActionState, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  requestMailbox,
  type RequestState,
  googleSignUp,
  appleSignUp,
  getOAuthConfig,
} from "@/app/actions/auth";

const CREAM = "#F7E6C2";
const CREAM_DEEP = "#F0DBA9";
const BG_LIGHT = "#F8F2EA";
const SURFACE = "#FFF9F3";
const BORDER = "#E8DDD0";
const INK = "#2D100F";
const INK_SOFT = "#5C4540";
const INK_FAINT = "#A89484";
const BLUE = "#337485";

// Prices match the canonical config (`src/lib/pricing-config.ts`).
// Includes virtual mailbox tier as a 5th option (added with the iPostal-style
// virtual offering).
const planChoices = [
  { id: "not_sure", label: "Help me choose", sub: "I'll decide later" },
  { id: "virtual", label: "Virtual", sub: "from $9.99 / mo" },
  { id: "basic", label: "Basic", sub: "from $50 / 3 mo" },
  { id: "business", label: "Business", sub: "from $80 / 3 mo" },
  { id: "premium", label: "Premium", sub: "from $95 / 3 mo" },
];

const inputStyle: React.CSSProperties = {
  background: "white",
  border: `1px solid ${BORDER}`,
  color: INK,
};

function SignUpInner() {
  const [state, formAction, pending] = useActionState<RequestState, FormData>(
    requestMailbox,
    {}
  );
  const [plan, setPlan] = useState("not_sure");
  const [signupMode, setSignupMode] = useState<"in_store" | "online">("online");
  const sp = useSearchParams();
  const [referralCode, setReferralCode] = useState("");
  // OAuth provider availability is driven by env-var presence at runtime so
  // we don't render dead buttons when AUTH_GOOGLE_ID / AUTH_APPLE_ID aren't
  // configured. Matches the pattern already used on /login.
  const [oauth, setOauth] = useState({ google: false, apple: false });
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    const ref = sp.get("ref")?.trim().toUpperCase() ?? "";
    if (ref) setReferralCode(ref);
    // Pre-select a plan from ?plan=virtual etc.
    const fromUrl = sp.get("plan");
    if (fromUrl && planChoices.some((p) => p.id === fromUrl)) {
      setPlan(fromUrl);
      // Virtual customers default to online — they can't come into the store.
      if (fromUrl === "virtual" || fromUrl.startsWith("virtual-")) {
        setSignupMode("online");
      }
    }
  }, [sp]);

  useEffect(() => {
    getOAuthConfig()
      .then((cfg) => setOauth({ google: cfg.isGoogleEnabled, apple: cfg.isAppleEnabled }))
      .catch(() => setOauth({ google: false, apple: false }));
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at top left, ${CREAM_DEEP} 0%, ${BG_LIGHT} 55%, ${SURFACE} 100%)`,
        color: INK,
      }}
    >
      <div
        className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-40 blur-[120px] pointer-events-none"
        style={{ background: CREAM }}
      />
      <div
        className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-30 blur-[100px] pointer-events-none"
        style={{ background: "rgba(51,116,133,0.30)" }}
      />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8 animate-scale-in">
          <Link href="/" aria-label="NOHO Mailbox home">
            <Logo className="mx-auto h-10 w-auto mb-4" />
          </Link>
          <p
            className="text-base"
            style={{ color: BLUE, fontFamily: "var(--font-pacifico), cursive" }}
          >
            Get started
          </p>
          <h1
            className="mt-1 text-2xl font-black"
            style={{ color: INK, fontFamily: "var(--font-baloo), sans-serif" }}
          >
            Request your mailbox
          </h1>
        </div>

        <div
          className="animate-fade-up delay-100 rounded-3xl p-7 sm:p-8"
          style={{
            background: "white",
            border: `1px solid ${BORDER}`,
            boxShadow: "var(--shadow-cream-md)",
          }}
        >
          {state.success ? (
            <div className="text-center py-2">
              <div className="flex justify-center mb-4">
                <svg viewBox="0 0 120 140" fill="none" className="w-20 h-20">
                  <rect x="52" y="90" width="16" height="40" rx="2" fill={CREAM} stroke={INK} strokeWidth="3" />
                  <rect x="40" y="126" width="40" height="6" rx="3" fill={CREAM} stroke={INK} strokeWidth="2.5" />
                  <rect x="16" y="30" width="84" height="52" rx="10" fill={CREAM} stroke={INK} strokeWidth="3.5" />
                  <path d="M16 48 Q16 18 58 18 Q100 18 100 48" fill={CREAM} stroke={INK} strokeWidth="3.5" />
                  <rect x="98" y="30" width="5" height="28" rx="2" fill={BLUE} stroke={INK} strokeWidth="2" />
                  <rect x="96" y="26" width="14" height="9" rx="2.5" fill={BLUE} stroke={INK} strokeWidth="2" />
                  <path d="M48 52 C48 45 38 42 38 49 C38 57 48 63 48 63 C48 63 58 57 58 49 C58 42 48 45 48 52Z" fill={BLUE} />
                </svg>
              </div>
              <h2 className="font-black text-xl mb-2" style={{ color: INK }}>
                Got it — we&apos;ll reach out within 1 business day
              </h2>
              <p className="text-sm leading-relaxed mb-5" style={{ color: INK_SOFT }}>
                Check your inbox now for a confirmation from{" "}
                <strong style={{ color: INK }}>nohomailbox@gmail.com</strong>. We&apos;ll follow up by
                email and text with the next steps — usually within one business day.
              </p>

              <div
                className="text-left mb-4 p-4 rounded-2xl"
                style={{ background: BG_LIGHT, border: `1px solid ${BORDER}` }}
              >
                <p className="text-xs font-black mb-2 inline-flex items-center gap-2" style={{ color: INK }}>
                  <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 10 L12 3 L21 10" />
                    <path d="M5 10 L5 21 L19 21 L19 10" />
                  </svg>
                  Sign up from home
                </p>
                <ol className="text-[12px] leading-relaxed space-y-1.5 list-decimal list-inside" style={{ color: INK_SOFT }}>
                  <li>
                    We&apos;ll email (and text, if you gave us a number) a{" "}
                    <strong style={{ color: INK }}>secure Square payment link</strong>
                  </li>
                  <li>
                    Download &amp; complete{" "}
                    <a
                      href="https://about.usps.com/forms/ps1583.pdf"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-black hover:underline"
                      style={{ color: BLUE }}
                    >
                      USPS Form 1583 (PDF)
                    </a>{" "}
                    and have it notarized
                  </li>
                  <li>
                    Email the signed form + photos of <strong>2 IDs</strong> to{" "}
                    <a
                      href="mailto:nohomailbox@gmail.com?subject=Form%201583%20%2B%20IDs"
                      className="font-black hover:underline break-all"
                      style={{ color: BLUE }}
                    >
                      nohomailbox@gmail.com
                    </a>
                  </li>
                  <li>We assign your suite # — you&apos;re live</li>
                </ol>
              </div>

              <div
                className="text-left mb-6 p-4 rounded-2xl"
                style={{
                  background: "rgba(51,116,133,0.08)",
                  border: "1px solid rgba(51,116,133,0.20)",
                }}
              >
                <p className="text-xs font-black mb-2" style={{ color: INK }}>
                  Or stop by
                </p>
                <p className="text-[12px] leading-relaxed" style={{ color: INK_SOFT }}>
                  Walk in or call{" "}
                  <a href="tel:+18185067744" className="font-black hover:underline" style={{ color: BLUE }}>
                    (818) 506-7744
                  </a>{" "}
                  Mon–Fri 9:30am–5:30pm · Sat 10am–1:30pm. Most signups are done in 15 minutes.
                </p>
              </div>
              <Link
                href="/how-it-works"
                className="block w-full text-center font-black py-3 rounded-2xl text-[13px] uppercase tracking-[0.06em] transition-transform hover:-translate-y-0.5"
                style={{
                  background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
                  color: CREAM,
                  boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
                }}
              >
                What to bring &amp; what happens next →
              </Link>
            </div>
          ) : (
            <>
              <h2 className="font-black text-lg mb-1" style={{ color: INK }}>
                Tell us about you
              </h2>
              <p className="text-xs mb-5" style={{ color: INK_SOFT }}>
                Takes 30 seconds. No credit card. We&apos;ll text you to set up your mailbox.
              </p>

              {/* OAuth providers — only render when configured. Lives above
                  the email form so social-signup is the fastest path; users
                  who picked a plan tile lower down can still scroll to it.
                  After OAuth completes, the new-user record is created on
                  the server and routed to /dashboard/pending so the plan +
                  KYC checklist guides them through the rest. */}
              {(oauth.google || oauth.apple) && (
                <div className="space-y-2.5 mb-5">
                  {oauthError && (
                    <div
                      className="text-xs font-bold p-3 rounded-xl"
                      style={{
                        background: "var(--color-danger-soft)",
                        color: "#7F1D1D",
                        border: "1px solid rgba(239,68,68,0.30)",
                      }}
                    >
                      {oauthError}
                    </div>
                  )}
                  {oauth.google && (
                    <form
                      action={async () => {
                        const result = await googleSignUp();
                        if (result?.error) setOauthError(result.error);
                      }}
                    >
                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-3 font-bold py-3 rounded-xl text-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                        style={{
                          background: "white",
                          color: INK,
                          border: `1px solid ${BORDER}`,
                          boxShadow: "var(--shadow-cream-sm)",
                        }}
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden>
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
                        </svg>
                        Sign up with Google
                      </button>
                    </form>
                  )}
                  {oauth.apple && (
                    <form
                      action={async () => {
                        const result = await appleSignUp();
                        if (result?.error) setOauthError(result.error);
                      }}
                    >
                      <button
                        type="submit"
                        className="w-full flex items-center justify-center gap-3 font-bold py-3 rounded-xl text-sm transition-all duration-200 hover:-translate-y-0.5 cursor-pointer"
                        style={{
                          background: INK,
                          color: CREAM,
                          boxShadow: "0 4px 14px rgba(45,16,15,0.28)",
                        }}
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
                          <path d="M17.05 12.04c-.03-3.18 2.59-4.7 2.71-4.78-1.48-2.16-3.78-2.46-4.6-2.49-1.96-.2-3.82 1.15-4.81 1.15-.99 0-2.52-1.12-4.14-1.09-2.13.03-4.1 1.24-5.19 3.14-2.21 3.83-.56 9.5 1.59 12.61 1.05 1.52 2.3 3.23 3.93 3.17 1.58-.06 2.18-1.02 4.09-1.02 1.91 0 2.45 1.02 4.13.99 1.71-.03 2.79-1.55 3.83-3.08 1.21-1.77 1.71-3.49 1.74-3.58-.04-.02-3.34-1.28-3.38-5.07zM14.04 3.04c.87-1.05 1.45-2.51 1.29-3.96-1.25.05-2.76.83-3.66 1.88-.81.93-1.51 2.42-1.32 3.84 1.39.11 2.81-.71 3.69-1.76z" />
                        </svg>
                        Sign up with Apple
                      </button>
                    </form>
                  )}
                  <div className="flex items-center gap-3 my-1">
                    <div className="flex-1 h-px" style={{ background: BORDER }} />
                    <span
                      className="text-[10px] font-black uppercase tracking-[0.18em]"
                      style={{ color: INK_FAINT }}
                    >
                      or with email
                    </span>
                    <div className="flex-1 h-px" style={{ background: BORDER }} />
                  </div>
                </div>
              )}

              {state.error && (
                <div
                  className="mb-4 text-xs font-bold p-3 rounded-xl"
                  style={{
                    background: "var(--color-danger-soft)",
                    color: "#7F1D1D",
                    border: "1px solid rgba(239,68,68,0.30)",
                  }}
                >
                  {state.error}
                </div>
              )}

              <form action={formAction} className="space-y-3.5">
                <div>
                  <label htmlFor="signup-name" className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_SOFT }}>
                    Your name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    name="name"
                    required
                    autoComplete="name"
                    placeholder="First & last name"
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_SOFT }}>
                    Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    name="email"
                    required
                    autoComplete="email"
                    placeholder="you@example.com"
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="signup-phone" className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_SOFT }}>
                    Phone{" "}
                    <span className="font-normal" style={{ color: INK_FAINT }}>
                      {signupMode === "online"
                        ? "(we'll text the Square payment link here)"
                        : "(optional)"}
                    </span>
                  </label>
                  <input
                    id="signup-phone"
                    type="tel"
                    name="phone"
                    // Online signups depend on us being able to SMS the Square
                    // payment link — without a phone we can't complete that
                    // step. In-store signups can come in cold, so phone stays
                    // optional there. Server-side validation in requestMailbox
                    // (auth.ts) also enforces this in case the field is
                    // tampered with client-side.
                    required={signupMode === "online"}
                    autoComplete="tel"
                    placeholder="(818) 555-1234"
                    className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-all"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: INK_SOFT }}>
                    Which plan are you interested in?
                  </label>
                  <input type="hidden" name="plan" value={plan} />
                  <div className="grid grid-cols-2 gap-2">
                    {planChoices.map((p) => {
                      const active = plan === p.id;
                      return (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => {
                            setPlan(p.id);
                            if (p.id === "virtual") setSignupMode("online");
                          }}
                          className="text-left p-3 rounded-xl transition-all"
                          style={
                            active
                              ? {
                                  background: "rgba(51,116,133,0.10)",
                                  border: `1.5px solid ${BLUE}`,
                                }
                              : {
                                  background: "white",
                                  border: `1px solid ${BORDER}`,
                                }
                          }
                        >
                          <p className="text-xs font-black" style={{ color: INK }}>{p.label}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: INK_SOFT }}>{p.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: INK_SOFT }}>
                    How do you want to finish?
                  </label>
                  <input type="hidden" name="signupMode" value={signupMode} />
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { id: "in_store" as const, label: "In store", sub: "15-min visit, pay at counter" },
                      { id: "online" as const, label: "Online", sub: "Texted Square link · email Form 1583" },
                    ]).map((m) => {
                      const active = signupMode === m.id;
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => setSignupMode(m.id)}
                          className="text-left p-3 rounded-xl transition-all"
                          style={
                            active
                              ? {
                                  background: "rgba(51,116,133,0.10)",
                                  border: `1.5px solid ${BLUE}`,
                                }
                              : {
                                  background: "white",
                                  border: `1px solid ${BORDER}`,
                                }
                          }
                        >
                          <p className="text-xs font-black" style={{ color: INK }}>{m.label}</p>
                          <p className="text-[11px] mt-0.5" style={{ color: INK_SOFT }}>{m.sub}</p>
                        </button>
                      );
                    })}
                  </div>
                  {signupMode === "online" && (
                    <p className="text-[11px] mt-2 leading-relaxed" style={{ color: INK_SOFT }}>
                      We&apos;ll text you a <strong style={{ color: INK }}>secure Square payment link</strong> at the phone number above. Then email your{" "}
                      <a
                        href="https://about.usps.com/forms/ps1583.pdf"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-black hover:underline"
                        style={{ color: BLUE }}
                      >
                        Form 1583
                      </a>{" "}
                      + photos of 2 IDs to{" "}
                      <a href="mailto:nohomailbox@gmail.com" className="font-black hover:underline" style={{ color: BLUE }}>
                        nohomailbox@gmail.com
                      </a>{" "}
                      and we&apos;ll activate your suite.
                    </p>
                  )}
                </div>

                <div>
                  <label htmlFor="signup-notes" className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_SOFT }}>
                    Anything we should know? <span className="font-normal" style={{ color: INK_FAINT }}>(optional)</span>
                  </label>
                  <textarea
                    id="signup-notes"
                    name="notes"
                    rows={2}
                    placeholder="Business mail volume, forwarding needs, etc."
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all resize-none"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label htmlFor="signup-referral" className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_SOFT }}>
                    Referral code <span className="font-normal" style={{ color: INK_FAINT }}>(optional · $10 for both of you)</span>
                  </label>
                  <input
                    id="signup-referral"
                    type="text"
                    name="referralCode"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    autoComplete="off"
                    spellCheck={false}
                    placeholder="e.g. SUITE-AB12"
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all uppercase tracking-wider"
                    style={inputStyle}
                  />
                  {referralCode && (
                    <p className="text-[11px] mt-1.5 font-bold" style={{ color: "var(--color-success)" }}>
                      Code applied — both of you will get $10 in credits
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={pending}
                  className="flex items-center justify-center gap-2 w-full font-black py-3.5 rounded-2xl text-[13px] uppercase tracking-[0.06em] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-wait disabled:hover:translate-y-0 mt-2"
                  style={{
                    background: `linear-gradient(135deg, ${INK} 0%, #1F0807 100%)`,
                    color: CREAM,
                    boxShadow: "0 6px 20px rgba(45,16,15,0.28)",
                  }}
                >
                  {pending && (
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
                      <path d="M21 12 a9 9 0 0 0 -9 -9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                    </svg>
                  )}
                  {pending ? "Sending request…" : "Request a Mailbox"}
                </button>

                <p className="text-center text-[11px] pt-1" style={{ color: INK_FAINT }}>
                  No payment now. We&apos;ll text you a secure link or you can pay at the store.
                </p>
              </form>
            </>
          )}
        </div>

        <p className="animate-fade-up delay-300 text-center mt-6 text-sm" style={{ color: INK_SOFT }}>
          Already have an account?{" "}
          <Link href="/login" className="font-black hover:underline" style={{ color: BLUE }}>
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function SignUpPage() {
  return (
    <Suspense fallback={null}>
      <SignUpInner />
    </Suspense>
  );
}
