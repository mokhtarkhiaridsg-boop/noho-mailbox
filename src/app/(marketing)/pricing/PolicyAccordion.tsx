"use client";

/**
 * Branded accordion for the policies section. Smooth expand using
 * grid-template-rows trick (works without measuring height).
 */
import { useState } from "react";
import type { PolicyItem } from "@/lib/pricing-config";

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`w-4 h-4 transition-transform duration-300 ${open ? "rotate-180" : ""}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

export function PolicyAccordion({ items }: { items: PolicyItem[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set([0]));

  function toggle(idx: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  return (
    <ul
      className="rounded-3xl overflow-hidden"
      style={{
        background: "white",
        border: "1px solid rgba(45,16,15,0.08)",
        boxShadow: "0 1px 0 rgba(51,116,133,0.04), 0 12px 32px rgba(45,16,15,0.06)",
      }}
    >
      {items.map((item, i) => {
        const isOpen = open.has(i);
        return (
          <li
            key={i}
            style={{
              borderTop: i === 0 ? "none" : "1px solid rgba(45,16,15,0.06)",
            }}
          >
            <button
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              className="w-full flex items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-[#F7E6C2]/30"
              style={{ color: "#2D100F" }}
            >
              <span
                className="text-[15px] font-bold"
                style={{ fontFamily: "var(--font-baloo), sans-serif" }}
              >
                {item.title}
              </span>
              <span style={{ color: "#337485" }}>
                <ChevronIcon open={isOpen} />
              </span>
            </button>
            <div
              className="grid transition-[grid-template-rows] duration-300 ease-out"
              style={{ gridTemplateRows: isOpen ? "1fr" : "0fr" }}
            >
              <div className="overflow-hidden">
                <p
                  className="px-5 pb-5 text-[14px] leading-relaxed"
                  style={{ color: "rgba(45,16,15,0.7)" }}
                >
                  {item.body}
                </p>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
