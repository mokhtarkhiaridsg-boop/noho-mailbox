"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useActionState, useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { requestMailbox, type RequestState } from "@/app/actions/auth";

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
                We&apos;ll text or call shortly. You can finish everything online or in store — your choice.
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
                    We&apos;ll text you a <strong style={{ color: INK }}>secure Square payment link</strong>
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
                  <label className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_SOFT }}>
                    Your name
                  </label>
                  <input
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
                  <label className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_SOFT }}>
                    Email
                  </label>
                  <input
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
                  <label className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_SOFT }}>
                    Phone <span className="font-normal" style={{ color: INK_FAINT }}>(we&apos;ll text you)</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
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
                  <label className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_SOFT }}>
                    Anything we should know? <span className="font-normal" style={{ color: INK_FAINT }}>(optional)</span>
                  </label>
                  <textarea
                    name="notes"
                    rows={2}
                    placeholder="Business mail volume, forwarding needs, etc."
                    className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none transition-all resize-none"
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5" style={{ color: INK_SOFT }}>
                    Referral code <span className="font-normal" style={{ color: INK_FAINT }}>(optional · $10 for both of you)</span>
                  </label>
                  <input
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
