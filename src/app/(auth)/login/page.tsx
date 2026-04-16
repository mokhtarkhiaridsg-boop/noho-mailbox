"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useActionState, useEffect, useState } from "react";
import { login, googleSignIn, appleSignIn, getOAuthConfig, type AuthState } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(login, {});
  const [oauth, setOauth] = useState({ google: false, apple: false });
  const [oauthError, setOauthError] = useState<string | null>(null);

  useEffect(() => {
    getOAuthConfig().then((cfg) => setOauth({ google: cfg.isGoogleEnabled, apple: cfg.isAppleEnabled }));
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-16 bg-bg-dark relative overflow-hidden">
      {/* Background orbs */}
      <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-15 blur-[120px] pointer-events-none bg-accent" />
      <div className="absolute bottom-[-15%] right-[-5%] w-[350px] h-[350px] rounded-full opacity-10 blur-[100px] pointer-events-none bg-accent" />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="text-center mb-10 animate-scale-in">
          <Link href="/">
            <Logo className="mx-auto h-14 w-auto mb-4 drop-shadow-2xl" />
          </Link>
          <p className="text-text-dark-muted text-sm">Sign in to your mailbox</p>
        </div>

        {/* Card */}
        <div className="animate-fade-up delay-100 rounded-2xl p-8 bg-white/[0.04] border border-white/[0.08] shadow-[0_4px_32px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          {/* OAuth buttons — hidden when providers aren't configured */}
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
                    Continue with Google
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
                    Continue with Apple
                  </button>
                </form>
              )}
              <div className="flex items-center gap-3 my-2">
                <div className="flex-1 h-px bg-white/[0.08]" />
                <span className="text-[10px] font-semibold text-text-dark-muted/60 uppercase tracking-widest">or email</span>
                <div className="flex-1 h-px bg-white/[0.08]" />
              </div>
            </div>
          )}

          <form action={formAction}>
            <div className="space-y-4">
              {state.error && (
                <div className="text-danger text-xs font-semibold text-center p-3 rounded-xl bg-danger/10 border border-danger/20">
                  {state.error}
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-text-dark-muted mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm text-text-dark placeholder-text-dark-muted/40 bg-white/[0.06] border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/30 transition-all"
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-dark-muted mb-1.5">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm text-text-dark placeholder-text-dark-muted/40 bg-white/[0.06] border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/30 transition-all"
                  placeholder="Your password"
                />
              </div>

              {state.twoFactorRequired && (
                <div>
                  <label className="block text-xs font-medium text-text-dark-muted mb-1.5">2FA Code</label>
                  <input
                    type="text"
                    name="totpToken"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    autoComplete="one-time-code"
                    autoFocus
                    required
                    className="w-full rounded-xl px-4 py-3 text-sm tracking-[0.5em] text-center text-text-dark placeholder-text-dark-muted/40 bg-white/[0.06] border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/30 transition-all"
                    placeholder="000000"
                  />
                  <p className="mt-1.5 text-[10px] text-text-dark-muted/60">Enter the 6-digit code from your authenticator app.</p>
                </div>
              )}

              <div className="flex items-center justify-end text-xs">
                <button type="button" className="text-accent font-semibold hover:underline">
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="block w-full text-center mt-6 font-semibold py-3.5 rounded-xl text-sm text-white bg-accent hover:bg-accent-hover transition-all duration-200 shadow-[0_4px_16px_rgba(51,116,181,0.4)] disabled:opacity-60"
            >
              {pending ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="animate-fade-up delay-300 text-center mt-6 text-sm text-text-dark-muted/50">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-accent font-semibold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
