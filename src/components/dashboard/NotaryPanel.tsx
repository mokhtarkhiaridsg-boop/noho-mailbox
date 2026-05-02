"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { type NotaryBooking } from "./types";
import { IconNotary, IconClock, IconChevron } from "@/components/MemberIcons";

type Props = {
  bookings: NotaryBooking[];
};

export default function NotaryPanel({ bookings }: Props) {
  return (
    <div className="space-y-4">
      {/* Hero card — single column, refined. Replaces the chunky
          radial-blob/gradient-icon-tile/font-black hero treatment. */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-5"
        style={{
          background: "linear-gradient(180deg, #FFFCF3 0%, #FBFAF6 100%)",
          border: "1px solid rgba(45,29,15,0.08)",
        }}
      >
        <div className="flex-1 min-w-0">
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-2"
            style={{ color: "#337485" }}
          >
            In-store service
          </p>
          <h2
            className="text-2xl sm:text-3xl tracking-tight leading-tight"
            style={{
              color: "#2D1D0F",
              fontFamily: "var(--font-baloo), system-ui, sans-serif",
              fontWeight: 800,
            }}
          >
            Book a notary
          </h2>
          <p
            className="text-[13px] mt-2 max-w-md leading-relaxed"
            style={{ color: "rgba(45,29,15,0.65)" }}
          >
            Schedule a certified in-store notary appointment.
            Premium members get a discount.
          </p>
          <Link
            href="/contact"
            className="inline-flex items-center gap-1.5 mt-4 px-4 h-10 rounded-full text-[13px] font-semibold transition-colors"
            style={{
              background: "#337485",
              color: "#F7EEC2",
            }}
          >
            Book appointment
            <IconChevron className="w-3.5 h-3.5" strokeWidth={2} />
          </Link>
        </div>
        <span
          className="shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ background: "rgba(51,116,133,0.10)" }}
          aria-hidden
        >
          <IconNotary className="w-7 h-7" style={{ color: "#337485" }} strokeWidth={1.5} />
        </span>
      </motion.div>

      {/* Active bookings list */}
      {bookings.length > 0 && (
        <div
          className="rounded-3xl overflow-hidden"
          style={{
            background: "white",
            border: "1px solid rgba(45,29,15,0.08)",
          }}
        >
          <div
            className="px-5 py-3.5 flex items-center gap-2"
            style={{ borderBottom: "1px solid rgba(45,29,15,0.06)" }}
          >
            <span
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(51,116,133,0.10)" }}
            >
              <IconClock className="w-3.5 h-3.5" style={{ color: "#337485" }} strokeWidth={1.7} />
            </span>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "rgba(45,29,15,0.55)" }}
            >
              Upcoming appointments
            </p>
          </div>
          <ul>
            {bookings.map((b, idx) => (
              <motion.li
                key={b.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.26, delay: 0.05 * idx, ease: [0.22, 1, 0.36, 1] }}
                className="px-5 py-3.5 flex items-center justify-between gap-3"
                style={{
                  borderBottom:
                    idx < bookings.length - 1 ? "1px solid rgba(45,29,15,0.05)" : "none",
                }}
              >
                <div className="min-w-0">
                  <p
                    className="text-[13.5px] tracking-tight truncate"
                    style={{ color: "#2D1D0F", fontWeight: 700 }}
                  >
                    {b.type}
                  </p>
                  <p className="text-[12px] mt-0.5" style={{ color: "rgba(45,29,15,0.55)" }}>
                    {b.date} at {b.time}
                  </p>
                </div>
                <span
                  className="shrink-0 text-[10.5px] font-semibold tracking-wide px-2.5 py-1 rounded-full"
                  style={{
                    background: "rgba(51,116,133,0.10)",
                    color: "#337485",
                  }}
                >
                  {b.status}
                </span>
              </motion.li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
