"use client";

import { useActionState } from "react";
import {
  submitPartnerApplication,
  type PartnerApplicationState,
} from "@/app/actions/partners";

export default function PartnerForm() {
  const [state, formAction, pending] = useActionState<
    PartnerApplicationState,
    FormData
  >(submitPartnerApplication, {});

  if (state.success) {
    return (
      <div
        className="rounded-2xl p-8 animate-scale-in flex flex-col items-center justify-center text-center"
        style={{
          background: "#FFF9F3",
          border: "1px solid #E8D8C4",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <div
          className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
          style={{ background: "rgba(51,116,133,0.1)" }}
        >
          <svg
            className="w-8 h-8"
            style={{ color: "#337485" }}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
        <h3 className="text-xl font-extrabold tracking-tight text-text-light mb-2">
          Application Received!
        </h3>
        <p className="text-text-light-muted text-sm max-w-sm">
          We&apos;ll review and reach out within 2 business days with your partner
          code and a quick onboarding call. Thanks for the trust.
        </p>
      </div>
    );
  }

  return (
    <form
      action={formAction}
      className="space-y-5 rounded-2xl p-8 animate-slide-left"
      style={{
        background: "#FFF9F3",
        border: "1px solid #E8D8C4",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <div className="mb-2">
        <h2 className="font-extrabold tracking-tight text-text-light text-lg">
          Apply to the Partner Program
        </h2>
        <p className="text-xs text-text-light-muted mt-1">
          Free to join · Pays out every other Friday
        </p>
      </div>

      {state.error && (
        <p className="text-danger text-sm bg-danger/10 border border-danger/20 p-3 rounded-xl">
          {state.error}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            className="block text-sm font-bold text-text-light mb-1"
            htmlFor="name"
          >
            Your name
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            placeholder="Roland Fink"
            className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-all"
            style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
          />
        </div>
        <div>
          <label
            className="block text-sm font-bold text-text-light mb-1"
            htmlFor="businessName"
          >
            Business name
          </label>
          <input
            id="businessName"
            name="businessName"
            type="text"
            required
            placeholder="Roland Fink, CPA"
            className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-all"
            style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label
            className="block text-sm font-bold text-text-light mb-1"
            htmlFor="email"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            placeholder="you@firm.com"
            className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-all"
            style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
          />
        </div>
        <div>
          <label
            className="block text-sm font-bold text-text-light mb-1"
            htmlFor="phone"
          >
            Phone (optional)
          </label>
          <input
            id="phone"
            name="phone"
            type="tel"
            placeholder="(818) 555-0100"
            className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-all"
            style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
          />
        </div>
      </div>

      <div>
        <label
          className="block text-sm font-bold text-text-light mb-1"
          htmlFor="category"
        >
          What kind of business are you?
        </label>
        <select
          id="category"
          name="category"
          required
          defaultValue=""
          className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-all"
          style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
        >
          <option value="" disabled>
            Pick the closest match
          </option>
          <option value="CPA / Bookkeeper">CPA / Bookkeeper</option>
          <option value="Immigration Attorney">Immigration Attorney</option>
          <option value="Business / Corporate Attorney">
            Business / Corporate Attorney
          </option>
          <option value="Web Designer / Developer">Web Designer / Developer</option>
          <option value="Brand Designer / Agency">Brand Designer / Agency</option>
          <option value="Insurance Agent">Insurance Agent</option>
          <option value="Real Estate Agent / Broker">
            Real Estate Agent / Broker
          </option>
          <option value="Coach / Consultant">Coach / Consultant</option>
          <option value="Other">Other</option>
        </select>
      </div>

      <div>
        <label
          className="block text-sm font-bold text-text-light mb-1"
          htmlFor="clientCount"
        >
          Roughly how many clients/month might need our services?
        </label>
        <select
          id="clientCount"
          name="clientCount"
          defaultValue=""
          className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none transition-all"
          style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
        >
          <option value="">Not sure</option>
          <option value="0-1">0–1</option>
          <option value="2-5">2–5</option>
          <option value="6-10">6–10</option>
          <option value="10+">10+</option>
        </select>
      </div>

      <div>
        <label
          className="block text-sm font-bold text-text-light mb-1"
          htmlFor="message"
        >
          Anything else? (optional)
        </label>
        <textarea
          id="message"
          name="message"
          rows={4}
          placeholder="Where you&apos;re located, what your typical client looks like, or anything we should know."
          className="w-full rounded-xl px-4 py-3 text-sm text-text-light focus:outline-none resize-none transition-all"
          style={{ border: "1px solid #D8C8B4", background: "#F8F2EA" }}
        />
      </div>

      <button
        type="submit"
        disabled={pending}
        className="w-full text-white font-bold py-3 rounded-xl transition-all hover:-translate-y-1 hover:shadow-lg disabled:opacity-50"
        style={{ background: "#337485" }}
      >
        {pending ? "Sending…" : "Apply to the Partner Program"}
      </button>

      <p className="text-xs text-text-light-muted text-center">
        We never share your info. You can pause or leave the program any time.
      </p>
    </form>
  );
}
