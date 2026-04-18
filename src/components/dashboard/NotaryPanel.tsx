"use client";

import Link from "next/link";
import { BRAND, type NotaryBooking } from "./types";
import { IconNotary, IconClock, IconChevron } from "@/components/MemberIcons";

type Props = {
  bookings: NotaryBooking[];
};

export default function NotaryPanel({ bookings }: Props) {
  return (
    <div
      className="rounded-3xl p-8 text-center relative overflow-hidden"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
      }}
    >
      <div
        className="absolute -top-12 -right-12 w-48 h-48 rounded-full opacity-10"
        style={{ background: `radial-gradient(circle, ${BRAND.blue}, transparent 70%)` }}
      />
      <div
        className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
        style={{
          background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
          boxShadow: "0 8px 24px rgba(51,116,181,0.32)",
        }}
      >
        <IconNotary className="w-7 h-7 text-white" />
      </div>
      <h3 className="font-black text-lg" style={{ color: BRAND.ink }}>
        Book a Notary
      </h3>
      <p
        className="text-sm mt-2 mb-6 max-w-xs mx-auto"
        style={{ color: BRAND.inkSoft }}
      >
        Schedule a certified in-store notary appointment. Premium members get a discount.
      </p>
      {bookings.length > 0 && (
        <div className="mb-6 space-y-2">
          {bookings.map((b) => (
            <div
              key={b.id}
              className="text-left p-4 rounded-2xl flex items-center justify-between"
              style={{
                background: BRAND.blueSoft,
                border: `1px solid ${BRAND.border}`,
              }}
            >
              <div className="flex items-center gap-3">
                <IconClock className="w-4 h-4" style={{ color: BRAND.blue }} />
                <div>
                  <p className="text-sm font-black" style={{ color: BRAND.ink }}>
                    {b.type}
                  </p>
                  <p className="text-xs" style={{ color: BRAND.inkSoft }}>
                    {b.date} at {b.time}
                  </p>
                </div>
              </div>
              <span
                className="text-[10px] font-black px-2.5 py-1 rounded-full"
                style={{ background: "white", color: BRAND.blueDeep }}
              >
                {b.status}
              </span>
            </div>
          ))}
        </div>
      )}
      <Link
        href="/contact"
        className="inline-flex items-center gap-2 font-black px-6 py-3 rounded-2xl text-sm text-white transition-transform hover:-translate-y-0.5"
        style={{
          background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
          boxShadow: "0 6px 20px rgba(51,116,181,0.32)",
        }}
      >
        Book Appointment
        <IconChevron className="w-4 h-4" />
      </Link>
    </div>
  );
}
