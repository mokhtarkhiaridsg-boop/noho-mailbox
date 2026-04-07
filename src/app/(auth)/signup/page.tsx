"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { useState, useActionState } from "react";
import { signup, type AuthState } from "@/app/actions/auth";

const plans = [
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
  const [selectedPlan, setSelectedPlan] = useState("business-6");
  const [formValues, setFormValues] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    password: "",
  });

  const [state, formAction, pending] = useActionState<AuthState, FormData>(signup, {});

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-16"
      style={{
        background:
          "radial-gradient(ellipse at 20% 80%, rgba(51,116,181,0.18) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(247,230,194,0.08) 0%, transparent 45%), linear-gradient(155deg, #1a1108 0%, #2D1D0F 50%, #0d1e35 100%)",
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <Link href="/">
            <Logo className="mx-auto h-14 w-auto mb-4" />
          </Link>
          <p className="text-[#F7E6C2]/50 text-sm">Create your account</p>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all duration-300"
                style={{
                  background: step >= s ? "linear-gradient(135deg, #3374B5, #2055A0)" : "rgba(247,230,194,0.1)",
                  color: step >= s ? "white" : "rgba(247,230,194,0.3)",
                  boxShadow: step >= s ? "0 2px 10px rgba(51,116,181,0.4)" : "none",
                }}
              >
                {step > s ? "✓" : s}
              </div>
              {s < 3 && (
                <div
                  className="w-12 h-0.5 rounded-full"
                  style={{ background: step > s ? "#3374B5" : "rgba(247,230,194,0.1)" }}
                />
              )}
            </div>
          ))}
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
          {state.error && (
            <div className="text-red-400 text-xs font-bold text-center p-3 rounded-xl mb-4" style={{ background: "rgba(200,50,50,0.15)" }}>
              {state.error}
            </div>
          )}

          {step === 1 && (
            <>
              <h2 className="text-xl font-black uppercase text-[#F7E6C2] mb-6">Choose Your Plan</h2>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {plans.map((p) => (
                  <label
                    key={p.id}
                    className="flex items-center justify-between py-3 px-4 rounded-2xl cursor-pointer transition-all duration-200"
                    style={{
                      background: selectedPlan === p.id ? "rgba(51,116,181,0.25)" : "rgba(247,230,194,0.05)",
                      border: selectedPlan === p.id ? "1px solid rgba(51,116,181,0.5)" : "1px solid rgba(247,230,194,0.08)",
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="plan"
                        value={p.id}
                        checked={selectedPlan === p.id}
                        onChange={() => setSelectedPlan(p.id)}
                        className="accent-[#3374B5]"
                      />
                      <div>
                        <span className="text-sm font-bold text-[#F7E6C2]">{p.name}</span>
                        <span className="text-xs text-[#F7E6C2]/40 ml-2">{p.term}</span>
                      </div>
                    </div>
                    <span className="font-black text-[#F7E6C2]">{p.price}</span>
                  </label>
                ))}
              </div>
              <button
                onClick={() => setStep(2)}
                className="w-full mt-6 font-black py-3.5 rounded-2xl text-sm text-white transition-all duration-200 hover:opacity-90"
                style={{
                  background: "linear-gradient(135deg, #3374B5, #2055A0)",
                  boxShadow: "0 4px 16px rgba(51,116,181,0.4)",
                }}
              >
                Continue
              </button>
            </>
          )}

          {step === 2 && (
            <>
              <h2 className="text-xl font-black uppercase text-[#F7E6C2] mb-6">Your Information</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#F7E6C2]/60 mb-1.5">First Name</label>
                    <input
                      type="text"
                      value={formValues.firstName}
                      onChange={(e) => setFormValues({ ...formValues, firstName: e.target.value })}
                      className="w-full rounded-xl px-4 py-3 text-sm text-[#F7E6C2] placeholder-[#F7E6C2]/25 focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                      style={{ background: "rgba(247,230,194,0.06)", border: "1px solid rgba(247,230,194,0.1)" }}
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#F7E6C2]/60 mb-1.5">Last Name</label>
                    <input
                      type="text"
                      value={formValues.lastName}
                      onChange={(e) => setFormValues({ ...formValues, lastName: e.target.value })}
                      className="w-full rounded-xl px-4 py-3 text-sm text-[#F7E6C2] placeholder-[#F7E6C2]/25 focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                      style={{ background: "rgba(247,230,194,0.06)", border: "1px solid rgba(247,230,194,0.1)" }}
                      placeholder="Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#F7E6C2]/60 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={formValues.email}
                    onChange={(e) => setFormValues({ ...formValues, email: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 text-sm text-[#F7E6C2] placeholder-[#F7E6C2]/25 focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                    style={{ background: "rgba(247,230,194,0.06)", border: "1px solid rgba(247,230,194,0.1)" }}
                    placeholder="you@example.com"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#F7E6C2]/60 mb-1.5">Phone</label>
                  <input
                    type="tel"
                    value={formValues.phone}
                    onChange={(e) => setFormValues({ ...formValues, phone: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 text-sm text-[#F7E6C2] placeholder-[#F7E6C2]/25 focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                    style={{ background: "rgba(247,230,194,0.06)", border: "1px solid rgba(247,230,194,0.1)" }}
                    placeholder="(818) 555-0100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#F7E6C2]/60 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={formValues.password}
                    onChange={(e) => setFormValues({ ...formValues, password: e.target.value })}
                    className="w-full rounded-xl px-4 py-3 text-sm text-[#F7E6C2] placeholder-[#F7E6C2]/25 focus:outline-none focus:ring-2 focus:ring-[#3374B5]"
                    style={{ background: "rgba(247,230,194,0.06)", border: "1px solid rgba(247,230,194,0.1)" }}
                    placeholder="Min 8 characters"
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 font-bold py-3.5 rounded-2xl text-sm text-[#F7E6C2] transition-all hover:bg-white/5"
                  style={{ border: "1px solid rgba(247,230,194,0.15)" }}
                >
                  Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex-[2] font-black py-3.5 rounded-2xl text-sm text-white transition-all duration-200 hover:opacity-90"
                  style={{
                    background: "linear-gradient(135deg, #3374B5, #2055A0)",
                    boxShadow: "0 4px 16px rgba(51,116,181,0.4)",
                  }}
                >
                  Continue
                </button>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <h2 className="text-xl font-black uppercase text-[#F7E6C2] mb-3">What to Bring</h2>
              <p className="text-sm text-[#F7E6C2]/50 mb-6 leading-relaxed">
                Visit us in-store to complete your signup. Here&apos;s what you need:
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { icon: "🪪", title: "Two valid government-issued photo IDs", desc: "Driver's license, passport, state ID, etc." },
                  { icon: "📋", title: "Sign USPS Form 1583", desc: "We provide the form — just bring your IDs and sign." },
                  { icon: "💳", title: "Payment for your selected plan", desc: "We accept all major cards and cash." },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="flex items-start gap-4 p-4 rounded-2xl"
                    style={{ background: "rgba(247,230,194,0.06)", border: "1px solid rgba(247,230,194,0.08)" }}
                  >
                    <span className="text-2xl shrink-0">{item.icon}</span>
                    <div>
                      <p className="text-sm font-bold text-[#F7E6C2]">{item.title}</p>
                      <p className="text-xs text-[#F7E6C2]/40 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div
                className="rounded-2xl p-5 text-center mb-6"
                style={{ background: "rgba(51,116,181,0.15)", border: "1px solid rgba(51,116,181,0.25)" }}
              >
                <p className="text-sm font-bold text-[#F7E6C2] mb-1">Your Account is Ready!</p>
                <p className="text-xs text-[#F7E6C2]/50">
                  Complete your visit in-store to activate your mailbox and receive your keys.
                </p>
              </div>

              <form action={formAction}>
                <input type="hidden" name="plan" value={selectedPlan} />
                <input type="hidden" name="firstName" value={formValues.firstName} />
                <input type="hidden" name="lastName" value={formValues.lastName} />
                <input type="hidden" name="email" value={formValues.email} />
                <input type="hidden" name="phone" value={formValues.phone} />
                <input type="hidden" name="password" value={formValues.password} />
                <button
                  type="submit"
                  disabled={pending}
                  className="block w-full text-center font-black py-3.5 rounded-2xl text-sm text-white transition-all duration-200 hover:opacity-90 disabled:opacity-60"
                  style={{
                    background: "linear-gradient(135deg, #3374B5, #2055A0)",
                    boxShadow: "0 4px 16px rgba(51,116,181,0.4)",
                  }}
                >
                  {pending ? "Creating Account..." : "Go to My Dashboard"}
                </button>
              </form>
              <button
                onClick={() => setStep(2)}
                className="w-full mt-3 font-bold py-2 text-xs text-[#F7E6C2]/40 hover:text-[#F7E6C2]/60 transition-colors"
              >
                ← Go back
              </button>
            </>
          )}
        </div>

        {/* Footer links */}
        <p className="text-center mt-6 text-sm text-[#F7E6C2]/35">
          Already have an account?{" "}
          <Link href="/login" className="text-[#3374B5] font-bold hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
