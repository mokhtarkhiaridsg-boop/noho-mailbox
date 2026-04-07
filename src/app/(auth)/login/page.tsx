"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useActionState } from "react";
import { login, type AuthState } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(login, {});

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{
        background:
          "radial-gradient(ellipse at 20% 80%, rgba(51,116,181,0.18) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(247,230,194,0.08) 0%, transparent 45%), linear-gradient(155deg, #1a1108 0%, #2D1D0F 50%, #0d1e35 100%)",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/">
            <Logo className="mx-auto h-14 w-auto mb-4" />
          </Link>
          <p className="text-[#F7E6C2]/50 text-sm">Sign in to your mailbox</p>
        </div>

        {/* Card */}
        <div
          className="rounded-3xl p-8"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(247,230,194,0.1)",
            boxShadow: "0 4px 32px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.05) inset",
            backdropFilter: "blur(20px)",
          }}
        >
          <form action={formAction}>
            <div className="space-y-4">
              {state.error && (
                <div className="text-red-400 text-xs font-bold text-center p-3 rounded-xl" style={{ background: "rgba(200,50,50,0.15)" }}>
                  {state.error}
                </div>
              )}
              <div>
                <label className="block text-xs font-bold text-[#F7E6C2]/60 mb-1.5">Email</label>
                <input
                  type="email"
                  name="email"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm text-[#F7E6C2] placeholder-[#F7E6C2]/25 focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                  style={{ background: "rgba(247,230,194,0.06)", border: "1px solid rgba(247,230,194,0.1)" }}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#F7E6C2]/60 mb-1.5">Password</label>
                <input
                  type="password"
                  name="password"
                  required
                  className="w-full rounded-xl px-4 py-3 text-sm text-[#F7E6C2] placeholder-[#F7E6C2]/25 focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                  style={{ background: "rgba(247,230,194,0.06)", border: "1px solid rgba(247,230,194,0.1)" }}
                  placeholder="Your password"
                />
              </div>

              <div className="flex items-center justify-between text-xs">
                <label className="flex items-center gap-2 text-[#F7E6C2]/50">
                  <input type="checkbox" className="accent-[#3374B5] rounded" />
                  Remember me
                </label>
                <button type="button" className="text-[#3374B5] font-bold hover:underline">
                  Forgot password?
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={pending}
              className="block w-full text-center mt-6 font-black py-3.5 rounded-2xl text-sm text-white transition-all duration-200 hover:opacity-90 disabled:opacity-60"
              style={{
                background: "linear-gradient(135deg, #3374B5, #2055A0)",
                boxShadow: "0 4px 16px rgba(51,116,181,0.4)",
              }}
            >
              {pending ? "Signing In..." : "Sign In"}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center mt-6 text-sm text-[#F7E6C2]/35">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="text-[#3374B5] font-bold hover:underline">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
