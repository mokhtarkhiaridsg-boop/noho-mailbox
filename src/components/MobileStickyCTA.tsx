"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "noho-mobile-cta-dismissed";

export default function MobileStickyCTA() {
  const [hidden, setHidden] = useState(true); // start hidden until we check storage

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
    if (!dismissed) setHidden(false);
  }, []);

  if (hidden) return null;

  return (
    <div
      className="fixed bottom-3 left-3 right-3 z-50 md:hidden"
      role="region"
      aria-label="Quick contact"
    >
      <div
        className="rounded-2xl flex items-stretch overflow-hidden"
        style={{
          background: "#FFFFFF",
          border: "1px solid #2D100F",
          boxShadow: "0 12px 32px rgba(45,16,15,0.25)",
        }}
      >
        <a
          href="tel:+18185067744"
          className="flex-1 flex items-center justify-center gap-2 py-3 font-extrabold text-sm transition-colors active:bg-[#23596A]"
          style={{ background: "#337485", color: "#FFFFFF" }}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          Call
        </a>
        <a
          href="sms:+18185067744"
          className="flex-1 flex items-center justify-center gap-2 py-3 font-extrabold text-sm transition-colors active:bg-[#5A3A12]"
          style={{ background: "#B07030", color: "#FFE4A0" }}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          Text
        </a>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(STORAGE_KEY, "1");
            setHidden(true);
          }}
          aria-label="Dismiss quick contact bar"
          className="px-3 transition-colors active:bg-[#F0DBA9]"
          style={{
            background: "#F7E6C2",
            color: "#7A6050",
            fontSize: 18,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
