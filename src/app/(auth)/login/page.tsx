"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useActionState, useEffect, useState } from "react";
import { login, googleSignIn, appleSignIn, getOAuthConfig, type AuthState } from "@/app/actions/auth";

const CREAM = "#F7E6C2";
const CREAM_DEEP = "#F0DBA9";
const BG_LIGHT = "#F8F2EA";
const SURFACE = "#FFF9F3";
const BORDER = "#E8DDD0";
const INK = "#2D100F";
const INK_SOFT = "#5C4540";
const INK_FAINT = "#A89484";
const BLUE = "#337485";
const BLUE_DEEP = "#23596A";

const inputClass =
  "w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 transition-all";
const inputStyle: React.CSSProperties = {
  background: "white",
  border: `1px solid ${BORDER}`,
  color: INK,
};

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(login, {});
  const [oauth, setOauth] = useState({ google: false, apple: false });
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    getOAuthConfig().then((cfg) => setOauth({ google: cfg.isGoogleEnabled, apple: cfg.isAppleEnabled }));
  }, []);

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16 relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse at top left, ${CREAM_DEEP} 0%, ${BG_LIGHT} 55%, ${SURFACE} 100%)`,
        color: INK,
      }}
    >
      {/* Background orbs — warm cream blobs */}
      <div
        className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-40 blur-[120px] pointer-events-none"
        style={{ background: CREAM }}
      />
      <div
        className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-30 blur-[100px] pointer-events-none"
        style={{ background: "rgba(51,116,133,0.30)" }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10 animate-scale-in">
          <Link href="/" aria-label="NOHO Mailbox home">
            <Logo className="mx-auto h-10 w-auto mb-4" />
          </Link>
          <p
            className="text-base"
            style={{ color: BLUE, fontFamily: "var(--font-pacifico), cursive" }}
          >
            Welcome back
          </p>
          <h1
            className="mt-1 text-2xl font-black"
            style={{ color: INK, fontFamily: "var(--font-baloo), sans-serif" }}
          >
            Sign in to your mailbox
          </h1>
        </div>

        {/* Card */}
        <div
          className="animate-fade-up delay-100 rounded-3xl p-7 sm:p-8"
          style={{
            background: "white",
            border: `1px solid ${BORDER}`,
            boxShadow: "var(--shadow-cream-md)",
          }}
        >
          {/* OAuth buttons */}
          {(oauth.google || oauth.apple) && (
            <div className="space-y-3 mb-6">
              {oauthError && (
                <div
                  className="text-xs font-bold text-center p-3 rounded-xl"
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
                    const result = await googleSignIn();
                    if (result?.error) setOauthError(result.error);
                  }}
                >
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-3 font-bold py-3 rounded-xl text-sm transition-all duration-200 hover:-translate-y-0.5"
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
                    Continue with Google
                  </button>
                </form>
              )}
              {oauth.apple && (
                <form
                  action={async () => {
                    const result = await appleSignIn();
                    if (result?.error) setOauthError(result.error);
                  }}
                >
                  <button
                    type="submit"
                    className="w-full flex items-center justify-center gap-3 font-bold py-3 rounded-xl text-sm transition-all duration-200 hover:-translate-y-0.5"
                    style={{
                      background: INK,
                      color: CREAM,
                      boxShadow: "0 4px 14px rgba(45,16,15,0.28)",
                    }}
                  >
                    <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor" aria-hidden>
                      <path d="M17.05 12.04c-.03-3.18 2.59-4.7 2.71-4.78-1.48-2.16-3.78-2.46-4.6-2.49-1.96-.2-3.82 1.15-4.81 1.15-.99 0-2.52-1.12-4.14-1.09-2.13.03-4.1 1.24-5.19 3.14-2.21 3.83-.56 9.5 1.59 12.61 1.05 1.52 2.3 3.23 3.93 3.17 1.58-.06 2.18-1.02 4.09-1.02 1.91 0 2.45 1.02 4.13.99 1.71-.03 2.79-1.55 3.83-3.08 1.21-1.77 1.71-3.49 1.74-3.58-.04-.02-3.34-1.28-3.38-5.07zM14.04 3.04c.87-1.05 1.45-2.51 1.29-3.96-1.25.05-2.76.83-3.66 1.88-.81.93-1.51 2.42-1.32 3.84 1.39.11 2.81-.71 3.69-1.76z" />
                    </svg>
                    Continue with Apple
                  </button>
                </form>
              )}
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px" style={{ background: BORDER }} />
                <span
                  className="text-[10px] font-black uppercase tracking-[0.18em]"
                  style={{ color: INK_FAINT }}
                >
                  or email
                </span>
                <div className="flex-1 h-px" style={{ background: BORDER }} />
              </div>
            </div>
          )}

          <form action={formAction}>
            <div className="space-y-4">
              {state.error && (
                <div
                  className="text-xs font-bold text-center p-3 rounded-xl"
                  style={{
                    background: "var(--color-danger-soft)",
                    color: "#7F1D1D",
                    border: "1px solid rgba(239,68,68,0.30)",
                  }}
                >
                  {state.error}
                </div>
              )}
              <div>
                <label
                  className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5"
                  style={{ color: INK_SOFT }}
                >
                  Email
                </label>
                <input
                  type="email"
                  name="email"
                  required
                  className={inputClass}
                  style={inputStyle}
                  placeholder="you@example.com"
                  autoComplete="email"
                />
              </div>
              <div>
                <label
                  className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5"
                  style={{ color: INK_SOFT }}
                >
                  Password
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  className={inputClass}
                  style={inputStyle}
                  placeholder="Your password"
                  autoComplete="current-password"
                />
              </div>

              {state.twoFactorRequired && (
                <div>
                  <label
                    className="block text-[11px] font-black uppercase tracking-[0.16em] mb-1.5"
                    style={{ color: INK_SOFT }}
                  >
                    2FA Code
                  </label>
                  <input
                    type="text"
                    name="totpToken"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    className={`${inputClass} tracking-[0.5em] text-center`}
                    style={inputStyle}
                    placeholder="000000"
                  />
                  <p className="mt-1.5 text-[11px]" style={{ color: INK_FAINT }}>
                    Enter the 6-digit code from your authenticator app.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end text-xs">
                <Link
                  href="/forgot-password"
                  className="font-bold hover:underline"
                  style={{ color: BLUE }}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="flex items-center justify-center gap-2 w-full mt-6 font-black py-3.5 rounded-2xl text-[13px] uppercase tracking-[0.06em] transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-wait disabled:hover:translate-y-0"
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
              {pending ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p
          className="animate-fade-up delay-300 text-center mt-6 text-sm"
          style={{ color: INK_SOFT }}
        >
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-black hover:underline" style={{ color: BLUE }}>
            Request a Mailbox
          </Link>
        </p>
      </div>
    </div>
  );
}
