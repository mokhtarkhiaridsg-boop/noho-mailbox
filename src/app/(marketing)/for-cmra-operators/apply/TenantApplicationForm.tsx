"use client";

import { useActionState } from "react";
import {
  submitTenantApplication,
  type TenantApplicationState,
} from "@/app/actions/tenant-application";

export default function TenantApplicationForm() {
  const [state, formAction, pending] = useActionState<
    TenantApplicationState,
    FormData
  >(submitTenantApplication, {});

  if (state.success) {
    return (
      <div
        className="rounded-2xl p-8 text-center"
        style={{
          background: "rgba(22,163,74,0.06)",
          border: "1px solid rgba(22,163,74,0.2)",
        }}
      >
        <div
          className="w-14 h-14 mx-auto rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(22,163,74,0.18)" }}
        >
          <svg
            className="w-7 h-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#15803d"
            strokeWidth="3"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3
          className="font-extrabold tracking-tight text-lg mb-2"
          style={{ color: "#15803d" }}
        >
          Application received
        </h3>
        <p
          className="text-sm leading-relaxed max-w-md mx-auto"
          style={{ color: "#166534" }}
        >
          We&apos;ll email you within 1 business day with a calendar link for a
          30-minute demo. Your trial tenant will be provisioned within 48 hours
          of that call.
        </p>
        <p className="text-xs mt-4" style={{ color: "#15803d" }}>
          Questions? Call (818) 506-7744.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl p-7 md:p-8 space-y-4"
      style={{
        background: "#FFF9F3",
        border: "1px solid #E8D8C4",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div>
        <h2 className="font-extrabold tracking-tight text-text-light text-lg mb-1">
          CMRA platform application
        </h2>
        <p className="text-xs text-text-light-muted">
          30-day trial · Sandbox tenant provisioned within 48 hours
        </p>
      </div>

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
        <div>
          <label
            className="block text-xs font-bold text-text-light mb-1"
            htmlFor="businessName"
          >
            Your CMRA / business name
          </label>
          <input
            id="businessName"
            name="businessName"
            type="text"
            required
            placeholder="e.g. Acme Mailbox & Print"
            className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
            style={{
              border: "1px solid #D8C8B4",
              background: "#FFFFFF",
              color: "#2D100F",
            }}
          />
        </div>
        <div>
          <label
            className="block text-xs font-bold text-text-light mb-1"
            htmlFor="ownerName"
          >
            Your name
          </label>
          <input
            id="ownerName"
            name="ownerName"
            type="text"
            required
            placeholder="Owner / GM"
            className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
            style={{
              border: "1px solid #D8C8B4",
              background: "#FFFFFF",
              color: "#2D100F",
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            className="block text-xs font-bold text-text-light mb-1"
            htmlFor="ownerEmail"
          >
            Email
          </label>
          <input
            id="ownerEmail"
            name="ownerEmail"
            type="email"
            required
            placeholder="you@yourcmra.com"
            className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
            style={{
              border: "1px solid #D8C8B4",
              background: "#FFFFFF",
              color: "#2D100F",
            }}
          />
        </div>
        <div>
          <label
            className="block text-xs font-bold text-text-light mb-1"
            htmlFor="ownerPhone"
          >
            Phone (optional)
          </label>
          <input
            id="ownerPhone"
            name="ownerPhone"
            type="tel"
            placeholder="(555) 123-4567"
            className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
            style={{
              border: "1px solid #D8C8B4",
              background: "#FFFFFF",
              color: "#2D100F",
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            className="block text-xs font-bold text-text-light mb-1"
            htmlFor="legalCity"
          >
            City
          </label>
          <input
            id="legalCity"
            name="legalCity"
            type="text"
            placeholder="Austin"
            className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
            style={{
              border: "1px solid #D8C8B4",
              background: "#FFFFFF",
              color: "#2D100F",
            }}
          />
        </div>
        <div>
          <label
            className="block text-xs font-bold text-text-light mb-1"
            htmlFor="legalState"
          >
            State
          </label>
          <input
            id="legalState"
            name="legalState"
            type="text"
            placeholder="TX"
            maxLength={2}
            className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none uppercase"
            style={{
              border: "1px solid #D8C8B4",
              background: "#FFFFFF",
              color: "#2D100F",
            }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label
            className="block text-xs font-bold text-text-light mb-1"
            htmlFor="customerCount"
          >
            How many customers?
          </label>
          <select
            id="customerCount"
            name="customerCount"
            defaultValue=""
            className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
            style={{
              border: "1px solid #D8C8B4",
              background: "#FFFFFF",
              color: "#2D100F",
            }}
          >
            <option value="">Choose one</option>
            <option value="0-50">0–50 (just starting)</option>
            <option value="50-250">50–250</option>
            <option value="250-1000">250–1,000</option>
            <option value="1000-5000">1,000–5,000</option>
            <option value="5000+">5,000+</option>
          </select>
        </div>
        <div>
          <label
            className="block text-xs font-bold text-text-light mb-1"
            htmlFor="tier"
          >
            Best-fit tier
          </label>
          <select
            id="tier"
            name="tier"
            defaultValue="Solo"
            className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
            style={{
              border: "1px solid #D8C8B4",
              background: "#FFFFFF",
              color: "#2D100F",
            }}
          >
            <option value="Solo">Solo — $299/mo</option>
            <option value="Multi-Location">Multi-Location — $799/mo</option>
            <option value="Enterprise">Enterprise — $1,499+/mo</option>
          </select>
        </div>
      </div>

      <div>
        <label
          className="block text-xs font-bold text-text-light mb-1"
          htmlFor="currentPlatform"
        >
          What are you using today?
        </label>
        <select
          id="currentPlatform"
          name="currentPlatform"
          defaultValue=""
          className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
          style={{
            border: "1px solid #D8C8B4",
            background: "#FFFFFF",
            color: "#2D100F",
          }}
        >
          <option value="">Choose one</option>
          <option value="iPostal1">iPostal1</option>
          <option value="Anytime Mailbox">Anytime Mailbox</option>
          <option value="MyMailManager">MyMailManager</option>
          <option value="UPS Store software">UPS Store / corporate</option>
          <option value="PostalAnnex software">PostalAnnex / corporate</option>
          <option value="Spreadsheets / paper">Spreadsheets / paper</option>
          <option value="Custom-built">Custom-built</option>
          <option value="Nothing yet">Nothing yet (new operator)</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label
          className="block text-xs font-bold text-text-light mb-1"
          htmlFor="notes"
        >
          Anything we should know? (optional)
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          placeholder="What pain are you solving? Any specific feature you need?"
          className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none resize-none"
          style={{
            border: "1px solid #D8C8B4",
            background: "#FFFFFF",
            color: "#2D100F",
          }}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full text-white font-bold py-3 rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-50"
        style={{ background: "#337485" }}
      >
        {pending ? "Submitting…" : "Apply for the platform"}
      </button>

      <p className="text-[10px] text-text-light-muted text-center">
        We provision your sandbox within 48 hours. No commitment until day 30.
      </p>
    </form>
  );
}
