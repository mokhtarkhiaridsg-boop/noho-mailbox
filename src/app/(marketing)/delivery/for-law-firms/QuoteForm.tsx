"use client";

import { useActionState } from "react";
import {
  submitLawFirmQuote,
  type LawFirmQuoteState,
} from "@/app/actions/lawfirm-quote";

export default function QuoteForm() {
  const [state, formAction, pending] = useActionState<LawFirmQuoteState, FormData>(
    submitLawFirmQuote,
    {}
  );

  if (state.success) {
    return (
      <div
        className="rounded-2xl p-7 text-center animate-scale-in"
        style={{
          background: "rgba(22,163,74,0.08)",
          border: "1px solid rgba(22,163,74,0.2)",
        }}
      >
        <div
          className="w-12 h-12 mx-auto rounded-full flex items-center justify-center mb-3"
          style={{ background: "rgba(22,163,74,0.18)" }}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="#15803d"
            strokeWidth="3"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h3 className="font-extrabold tracking-tight text-base mb-2" style={{ color: "#15803d" }}>
          Quote request received
        </h3>
        <p className="text-sm" style={{ color: "#166534" }}>
          We&apos;ll text you within 15 minutes during business hours with the
          quote and ETA.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="rounded-2xl p-6 md:p-7 space-y-3"
      style={{
        background: "#FFF9F3",
        border: "1px solid #E8D8C4",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div>
        <h3 className="font-extrabold tracking-tight text-text-light text-base mb-1">
          Get a quote in 60 seconds
        </h3>
        <p className="text-xs text-text-light-muted">
          We&apos;ll text you back within 15 minutes during business hours.
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
        <input
          type="text"
          name="name"
          required
          placeholder="Your name"
          className="text-sm rounded-xl px-3 py-2.5 focus:outline-none"
          style={{
            border: "1px solid #D8C8B4",
            background: "#FFFFFF",
            color: "#2D100F",
          }}
        />
        <input
          type="text"
          name="firm"
          required
          placeholder="Firm name"
          className="text-sm rounded-xl px-3 py-2.5 focus:outline-none"
          style={{
            border: "1px solid #D8C8B4",
            background: "#FFFFFF",
            color: "#2D100F",
          }}
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="tel"
          name="phone"
          required
          placeholder="Mobile (we'll text)"
          autoComplete="tel"
          className="text-sm rounded-xl px-3 py-2.5 focus:outline-none"
          style={{
            border: "1px solid #D8C8B4",
            background: "#FFFFFF",
            color: "#2D100F",
          }}
        />
        <input
          type="email"
          name="email"
          required
          placeholder="Email"
          autoComplete="email"
          className="text-sm rounded-xl px-3 py-2.5 focus:outline-none"
          style={{
            border: "1px solid #D8C8B4",
            background: "#FFFFFF",
            color: "#2D100F",
          }}
        />
      </div>

      <input
        type="text"
        name="destination"
        required
        placeholder="Destination (court, opposing counsel, etc.)"
        className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
        style={{
          border: "1px solid #D8C8B4",
          background: "#FFFFFF",
          color: "#2D100F",
        }}
      />

      <select
        name="urgency"
        required
        defaultValue=""
        className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none"
        style={{
          border: "1px solid #D8C8B4",
          background: "#FFFFFF",
          color: "#2D100F",
        }}
      >
        <option value="" disabled>How urgent?</option>
        <option value="rush">Rush — within 1 hour</option>
        <option value="same-day">Same day, end of business</option>
        <option value="recurring">Set up recurring runs</option>
        <option value="exploring">Just getting a quote, no deadline</option>
      </select>

      <textarea
        name="notes"
        rows={2}
        placeholder="Anything else? (deadline, fragility, recipient name)"
        className="w-full text-sm rounded-xl px-3 py-2.5 focus:outline-none resize-none"
        style={{
          border: "1px solid #D8C8B4",
          background: "#FFFFFF",
          color: "#2D100F",
        }}
      />

      <button
        type="submit"
        disabled={pending}
        className="w-full text-white font-bold py-3 rounded-xl transition-all hover:-translate-y-0.5 disabled:opacity-50"
        style={{ background: "#337485" }}
      >
        {pending ? "Sending…" : "Get my quote (free)"}
      </button>

      <p className="text-[10px] text-text-light-muted text-center">
        First run is on us · No membership · We text you the price within 15 min
      </p>
    </form>
  );
}
