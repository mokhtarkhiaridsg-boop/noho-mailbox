"use client";

import { useState } from "react";
import Link from "next/link";

type Issue = { kind: "error" | "warn" | "info"; msg: string };

const RESTRICTED = [
  "bank", "trust", "trustee", "insurance", "insurer", "mortgage",
  "broker", "realtor", "real estate", "fund", "credit union",
  "savings", "loan", "guarantee", "guaranty",
];

const GOVERNMENT_IMPLY = [
  "fbi", "cia", "irs", "federal", "treasury", "state department",
  "united states", "us government", "homeland", "department of",
];

const PROFANITY_LITE = [
  // light, common — site user can pre-flag obvious
  "fuck", "shit", "asshole", "damn",
];

function checkName(input: string): Issue[] {
  const issues: Issue[] = [];
  const trimmed = input.trim();
  if (!trimmed) return [];

  const lower = trimmed.toLowerCase();

  // 1. Must end with LLC / L.L.C. / Limited Liability Company
  const endsWithLLC =
    /(\bllc\b|\bl\.l\.c\.?\b|limited liability company)\.?$/i.test(trimmed);
  if (!endsWithLLC) {
    issues.push({
      kind: "error",
      msg: "Name must end with &quot;LLC&quot;, &quot;L.L.C.&quot;, or &quot;Limited Liability Company&quot;.",
    });
  }

  // 2. Length sanity
  if (trimmed.length < 5) {
    issues.push({ kind: "warn", msg: "Very short name — most California LLCs are 8–40 characters." });
  }
  if (trimmed.length > 80) {
    issues.push({ kind: "warn", msg: "Long names can be hard to use on documents and signage." });
  }

  // 3. Restricted words
  for (const w of RESTRICTED) {
    const re = new RegExp(`\\b${w}\\b`, "i");
    if (re.test(lower)) {
      issues.push({
        kind: "error",
        msg: `Restricted word: <strong>${w}</strong> typically requires special licensing or approval. State may reject filing.`,
      });
    }
  }

  // 4. Government implication
  for (const w of GOVERNMENT_IMPLY) {
    if (lower.includes(w)) {
      issues.push({
        kind: "error",
        msg: `Implies government affiliation: <strong>${w}</strong>. State will reject filing.`,
      });
    }
  }

  // 5. Profanity (light)
  for (const w of PROFANITY_LITE) {
    const re = new RegExp(`\\b${w}\\b`, "i");
    if (re.test(lower)) {
      issues.push({ kind: "error", msg: "Likely contains profanity — state will reject." });
    }
  }

  // 6. All-caps or all lower (style)
  const isAllCaps = trimmed === trimmed.toUpperCase() && /[A-Z]/.test(trimmed);
  if (isAllCaps && trimmed.length > 5) {
    issues.push({
      kind: "info",
      msg: "All-caps names are valid but unusual — most LLCs use Title Case.",
    });
  }

  // 7. Special characters
  if (/[^A-Za-z0-9 ,.&'()-]/.test(trimmed)) {
    issues.push({
      kind: "warn",
      msg: "Unusual characters found. California allows letters, numbers, spaces, and common punctuation.",
    });
  }

  // 8. Multiple LLC designators
  const llcCount = (lower.match(/\b(llc|l\.l\.c\.?|limited liability company)\b/g) || []).length;
  if (llcCount > 1) {
    issues.push({ kind: "warn", msg: "Multiple LLC designators found — only one is needed at the end." });
  }

  return issues;
}

export default function LLCNameCheckerClient() {
  const [input, setInput] = useState("");
  const issues = checkName(input);
  const errors = issues.filter((i) => i.kind === "error");
  const warns = issues.filter((i) => i.kind === "warn");
  const infos = issues.filter((i) => i.kind === "info");

  const ready = input.trim().length >= 5 && errors.length === 0;

  return (
    <div
      className="rounded-2xl p-6 md:p-8"
      style={{
        background: "#FFF9F3",
        border: "1px solid #E8D8C4",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <label
        className="block text-sm font-bold text-text-light mb-3"
        htmlFor="name-input"
      >
        Your proposed LLC name
      </label>
      <input
        id="name-input"
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="e.g. Sunset Studios LLC"
        autoFocus
        autoComplete="off"
        spellCheck={false}
        className="w-full text-lg rounded-xl px-5 py-4 focus:outline-none transition-all"
        style={{
          border: "2px solid #D8C8B4",
          background: "#FFFFFF",
          color: "#2D100F",
        }}
      />

      {input.trim() && (
        <div className="mt-6 space-y-3">
          {ready && warns.length === 0 && (
            <div
              className="rounded-xl p-5 flex items-start gap-3 animate-fade-up"
              style={{
                background: "rgba(22,163,74,0.08)",
                border: "1px solid rgba(22,163,74,0.2)",
              }}
            >
              <span
                className="text-xl font-bold"
                style={{ color: "#15803d" }}
                aria-hidden
              >
                ✓
              </span>
              <div>
                <p className="font-bold text-sm" style={{ color: "#15803d" }}>
                  Looks good
                </p>
                <p className="text-xs text-text-light-muted mt-1 leading-relaxed">
                  Your name passes the basic California LLC checks. The Secretary
                  of State will run the final distinguishability check during
                  filing.
                </p>
              </div>
            </div>
          )}

          {errors.map((issue, i) => (
            <div
              key={`e-${i}`}
              className="rounded-xl p-4 flex items-start gap-3"
              style={{
                background: "rgba(220,38,38,0.06)",
                border: "1px solid rgba(220,38,38,0.2)",
              }}
            >
              <span
                className="text-base font-bold flex-shrink-0"
                style={{ color: "#dc2626" }}
              >
                ✕
              </span>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#7f1d1d" }}
                dangerouslySetInnerHTML={{ __html: issue.msg }}
              />
            </div>
          ))}

          {warns.map((issue, i) => (
            <div
              key={`w-${i}`}
              className="rounded-xl p-4 flex items-start gap-3"
              style={{
                background: "rgba(245,166,35,0.08)",
                border: "1px solid rgba(245,166,35,0.25)",
              }}
            >
              <span
                className="text-base font-bold flex-shrink-0"
                style={{ color: "#92400e" }}
              >
                ⚠
              </span>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#92400e" }}
                dangerouslySetInnerHTML={{ __html: issue.msg }}
              />
            </div>
          ))}

          {infos.map((issue, i) => (
            <div
              key={`i-${i}`}
              className="rounded-xl p-4 flex items-start gap-3"
              style={{
                background: "rgba(51,116,133,0.08)",
                border: "1px solid rgba(51,116,133,0.2)",
              }}
            >
              <span
                className="text-base font-bold flex-shrink-0"
                style={{ color: "#337485" }}
              >
                ℹ
              </span>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#23596A" }}
                dangerouslySetInnerHTML={{ __html: issue.msg }}
              />
            </div>
          ))}
        </div>
      )}

      <div className="mt-8 pt-6 border-t" style={{ borderColor: "#E8D8C4" }}>
        <p className="text-xs text-text-light-muted mb-4">
          Want us to file your California LLC for you?
        </p>
        <Link
          href="/business-solutions"
          className="inline-block text-white font-bold px-6 py-3 rounded-xl transition-all hover:-translate-y-0.5"
          style={{ background: "#337485" }}
        >
          File my LLC ($2,000 all-in) →
        </Link>
      </div>
    </div>
  );
}
