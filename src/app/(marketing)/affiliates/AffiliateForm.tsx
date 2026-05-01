"use client";

import { useActionState } from "react";
import {
  submitAffiliateApplication,
  type AffiliateApplicationState,
} from "@/app/actions/affiliate-application";

export default function AffiliateForm() {
  const [state, formAction, pending] = useActionState<
    AffiliateApplicationState,
    FormData
  >(submitAffiliateApplication, {});

  if (state.success) {
    return (
      <div
        className="rounded-2xl p-7 text-center"
        style={{
          background: "rgba(22,163,74,0.08)",
          border: "1px solid rgba(22,163,74,0.2)",
        }}
      >
        <h3 className="font-extrabold tracking-tight text-base mb-2" style={{ color: "#15803d" }}>
          Application received
        </h3>
        <p className="text-sm leading-relaxed" style={{ color: "#166534" }}>
          We&apos;ll review your channel and email back within 2 business days
          with your tracking link, payout details, and access to our content
          assets.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl p-7 space-y-3"
      style={{
        background: "#FFF9F3",
        border: "1px solid #E8D8C4",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <h2 className="font-extrabold tracking-tight text-text-light text-lg mb-1">
        Apply for the Affiliate Program
      </h2>
      <p className="text-xs text-text-light-muted mb-3">
        25–30% commission · 60-day attribution · Monthly payouts
      </p>

      {state.error && (
        <p
          className="text-xs p-3 rounded-lg"
          style={{
            background: "rgba(220,38,38,0.06)",
            border: "1px solid rgba(220,38,38,0.2)",
            color: "#7f1d1d",
          }}
        >
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          name="name"
          type="text"
          required
          placeholder="Your name"
          className="text-sm rounded-xl px-3 py-2.5 focus:outline-none"
          style={{ border: "1px solid #D8C8B4", background: "#FFFFFF", color: "#2D100F" }}
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="text-sm rounded-xl px-3 py-2.5 focus:outline-none"
          style={{ border: "1px solid #D8C8B4", background: "#FFFFFF", color: "#2D100F" }}
        />
      </div>

      <input
        name="channel"
        type="text"
        required
        placeholder="Your channel / site / handle (e.g. youtube.com/@you, yoursite.com)"
        className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
        style={{ border: "1px solid #D8C8B4", background: "#FFFFFF", color: "#2D100F" }}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <select
          name="audienceSize"
          defaultValue=""
          className="text-sm rounded-xl px-3 py-2.5 focus:outline-none"
          style={{ border: "1px solid #D8C8B4", background: "#FFFFFF", color: "#2D100F" }}
        >
          <option value="">Audience size</option>
          <option value="<1k">Under 1k followers/visitors</option>
          <option value="1k-10k">1k–10k</option>
          <option value="10k-50k">10k–50k</option>
          <option value="50k-250k">50k–250k</option>
          <option value="250k+">250k+</option>
        </select>
        <select
          name="niche"
          defaultValue=""
          className="text-sm rounded-xl px-3 py-2.5 focus:outline-none"
          style={{ border: "1px solid #D8C8B4", background: "#FFFFFF", color: "#2D100F" }}
        >
          <option value="">Niche</option>
          <option value="Side-hustle / passive income">Side-hustle / passive income</option>
          <option value="Etsy / Amazon / e-commerce">Etsy / Amazon / e-commerce</option>
          <option value="Real estate">Real estate</option>
          <option value="Solopreneur / freelance">Solopreneur / freelance</option>
          <option value="Small business / SaaS">Small business / SaaS</option>
          <option value="Legal / accounting / advisory">Legal / accounting / advisory</option>
          <option value="LA / California local">LA / California local</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <textarea
        name="notes"
        rows={3}
        placeholder="Tell us about your audience and how you'd promote NOHO Mailbox"
        className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none resize-none"
        style={{ border: "1px solid #D8C8B4", background: "#FFFFFF", color: "#2D100F" }}
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full text-white font-bold py-3 rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-50"
        style={{ background: "#337485" }}
      >
        {pending ? "Submitting…" : "Apply to the affiliate program"}
      </button>

      <p className="text-[10px] text-text-light-muted text-center">
        Free to join · We&apos;ll review and email back within 2 business days.
      </p>
    </form>
  );
}
