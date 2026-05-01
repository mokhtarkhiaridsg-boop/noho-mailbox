"use client";

import { useState } from "react";

type Props = { code: string };

export default function ReferShareBlock({ code }: Props) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  const link = typeof window !== "undefined"
    ? `${window.location.origin}/signup?ref=${encodeURIComponent(code)}`
    : `https://nohomailbox.org/signup?ref=${encodeURIComponent(code)}`;

  const smsBody = encodeURIComponent(
    `Hey — I use NOHO Mailbox in North Hollywood. They give me a real LA street address, mail scanning, and same-day delivery. Use my code ${code} when you sign up and we both get $10 in credits: https://nohomailbox.org/signup?ref=${code}`
  );

  const emailSubject = encodeURIComponent(
    "Real LA address + mail scanning — $10 credit if you sign up"
  );
  const emailBody = encodeURIComponent(
    `Hi,\n\nI've been using NOHO Mailbox in North Hollywood — real street address, mail scanning, package alerts, and same-day delivery. They have a $10-each referral so if you sign up with my code we both get $10 to start:\n\nCode: ${code}\nLink: https://nohomailbox.org/signup?ref=${code}\n\nThey're at 5062 Lankershim Blvd, (818) 506-7744.\n`
  );

  function copy(value: string, kind: "code" | "link") {
    void navigator.clipboard?.writeText(value).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 2200);
    });
  }

  return (
    <div
      className="rounded-3xl p-8 text-center animate-fade-up"
      style={{
        background:
          "linear-gradient(145deg, #FFFFFF 0%, #FFF9F3 100%)",
        border: "1px solid #E8D8C4",
        boxShadow: "var(--shadow-md)",
      }}
    >
      <p
        className="text-xs font-bold uppercase tracking-widest mb-3"
        style={{ color: "#7A6050" }}
      >
        Your referral code
      </p>
      <div
        className="inline-block px-8 py-4 rounded-2xl font-extrabold text-3xl tracking-wider mb-2"
        style={{
          background: "#337485",
          color: "#FFE4A0",
          letterSpacing: "0.15em",
          boxShadow: "0 8px 24px rgba(51,116,133,0.3)",
        }}
      >
        {code}
      </div>
      <p className="text-xs text-text-light-muted mb-6">
        Tap a button to share. We&apos;ll auto-credit both wallets the moment they
        sign up.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <button
          type="button"
          onClick={() => copy(code, "code")}
          className="rounded-xl px-3 py-3 text-xs font-bold transition-all hover:-translate-y-0.5"
          style={{
            background: copied === "code" ? "#337485" : "#FFFFFF",
            color: copied === "code" ? "#FFFFFF" : "#337485",
            border: "1px solid #337485",
          }}
        >
          {copied === "code" ? "Copied!" : "Copy code"}
        </button>
        <button
          type="button"
          onClick={() => copy(link, "link")}
          className="rounded-xl px-3 py-3 text-xs font-bold transition-all hover:-translate-y-0.5"
          style={{
            background: copied === "link" ? "#337485" : "#FFFFFF",
            color: copied === "link" ? "#FFFFFF" : "#337485",
            border: "1px solid #337485",
          }}
        >
          {copied === "link" ? "Copied!" : "Copy link"}
        </button>
        <a
          href={`sms:?&body=${smsBody}`}
          className="rounded-xl px-3 py-3 text-xs font-bold transition-all hover:-translate-y-0.5 text-center"
          style={{
            background: "#FFFFFF",
            color: "#337485",
            border: "1px solid #337485",
          }}
        >
          Send SMS
        </a>
        <a
          href={`mailto:?subject=${emailSubject}&body=${emailBody}`}
          className="rounded-xl px-3 py-3 text-xs font-bold transition-all hover:-translate-y-0.5 text-center"
          style={{
            background: "#FFFFFF",
            color: "#337485",
            border: "1px solid #337485",
          }}
        >
          Send Email
        </a>
      </div>
    </div>
  );
}
