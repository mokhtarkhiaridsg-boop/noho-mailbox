"use client";

import { useState } from "react";
import type { TransitionStartFunction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { motion, AnimatePresence } from "motion/react";
import { type ForwardingAddress } from "./types";
import { IconForward, IconHome, IconTrash, IconPlus } from "@/components/MemberIcons";
import { addForwardingAddress, deleteForwardingAddress } from "@/app/actions/user";
import { EmptyState } from "./ui";

// Forwarding cost estimator — no API needed, uses weight-based USPS estimates
const USPS_ESTIMATES: { label: string; weight: string; price: string }[] = [
  { label: "Single letter",   weight: "< 1 oz",   price: "$0.68 – $1.50" },
  { label: "Thick envelope",  weight: "1–3 oz",   price: "$1.50 – $3.50" },
  { label: "Small package",   weight: "< 1 lb",   price: "$4.50 – $8.00" },
  { label: "Medium package",  weight: "1–5 lbs",  price: "$8.00 – $18.00" },
  { label: "Large package",   weight: "5–10 lbs", price: "$18.00 – $40.00" },
];

function CostEstimator() {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="mt-5 rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(45,29,15,0.08)" }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-[13px] transition-colors"
        style={{
          background: "rgba(51,116,133,0.04)",
          color: "#337485",
          fontWeight: 600,
        }}
      >
        <span className="inline-flex items-center gap-2">
          <svg viewBox="0 0 16 16" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
            <path d="M8 1 L14 4 L14 12 L8 15 L2 12 L2 4 Z" />
            <path d="M2 4 L8 7 L14 4" />
          </svg>
          Forwarding cost estimator
        </span>
        <motion.svg
          viewBox="0 0 16 16"
          className="w-3.5 h-3.5"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ rotate: expanded ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 26 }}
        >
          <path d="M3 6 L8 11 L13 6" />
        </motion.svg>
      </button>
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="content"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            style={{ overflow: "hidden" }}
          >
            <div className="p-4 space-y-3 bg-white">
              <p className="text-[12px] leading-relaxed" style={{ color: "rgba(45,29,15,0.55)" }}>
                Estimates based on USPS First-Class and Priority Mail rates (postage + $5 handling).
                Actual cost depends on destination zip and package dimensions.
              </p>
              <div className="space-y-1.5">
                {USPS_ESTIMATES.map((e, idx) => (
                  <motion.div
                    key={e.label}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.22, delay: 0.04 * idx }}
                    className="flex items-center justify-between py-2.5 px-3 rounded-xl"
                    style={{ background: "rgba(45,29,15,0.03)" }}
                  >
                    <div>
                      <p className="text-[12.5px]" style={{ color: "#2D1D0F", fontWeight: 600 }}>
                        {e.label}
                      </p>
                      <p className="text-[10.5px] mt-0.5" style={{ color: "rgba(45,29,15,0.55)" }}>
                        {e.weight}
                      </p>
                    </div>
                    <span className="text-[12.5px] tabular-nums" style={{ color: "#337485", fontWeight: 700 }}>
                      {e.price}
                    </span>
                  </motion.div>
                ))}
              </div>
              <p className="text-[10.5px]" style={{ color: "rgba(45,29,15,0.45)" }}>
                Add $5 handling fee. Express forwarding (1–2 day) available at 2× rate.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

type Props = {
  addresses: ForwardingAddress[];
  isPending: boolean;
  startTransition: TransitionStartFunction;
  setToast: (s: string) => void;
  router: AppRouterInstance;
  showAddAddress: boolean;
  setShowAddAddress: (v: boolean) => void;
  runAction: (label: string, fn: () => Promise<unknown>) => void;
};

export default function ForwardingPanel({
  addresses,
  isPending,
  startTransition,
  setToast,
  router,
  showAddAddress,
  setShowAddAddress,
  runAction,
}: Props) {
  return (
    <div
      className="rounded-3xl p-5 sm:p-7"
      style={{
        background: "white",
        border: "1px solid rgba(45,29,15,0.08)",
      }}
    >
      <div className="flex items-center gap-2 mb-5">
        <span
          className="w-7 h-7 rounded-lg flex items-center justify-center"
          style={{ background: "rgba(51,116,133,0.10)" }}
        >
          <IconForward className="w-3.5 h-3.5" style={{ color: "#337485" }} strokeWidth={1.7} />
        </span>
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: "rgba(45,29,15,0.55)" }}
        >
          Forwarding addresses
        </p>
      </div>

      <div className="space-y-2 mb-5">
        <AnimatePresence initial={false}>
          {addresses.map((addr, idx) => (
            <motion.div
              key={addr.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, x: 8, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.26, delay: 0.04 * idx, ease: [0.22, 1, 0.36, 1] }}
              className="group flex items-center justify-between p-4 rounded-2xl transition-colors"
              style={{
                background: "white",
                border: "1px solid rgba(45,29,15,0.08)",
              }}
              whileHover={{ y: -1 }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(51,116,133,0.08)" }}
                >
                  <IconHome className="w-[15px] h-[15px]" style={{ color: "#337485" }} strokeWidth={1.7} />
                </div>
                <div className="min-w-0">
                  <p
                    className="text-[13.5px] tracking-tight truncate"
                    style={{ color: "#2D1D0F", fontWeight: 700 }}
                  >
                    {addr.label}
                  </p>
                  <p className="text-[12px] truncate" style={{ color: "rgba(45,29,15,0.55)" }}>
                    {addr.address}
                  </p>
                </div>
              </div>
              <motion.button
                whileTap={{ scale: 0.92 }}
                onClick={() =>
                  runAction("Address removed", async () => {
                    await deleteForwardingAddress(addr.id);
                  })
                }
                disabled={isPending}
                className="ml-3 w-8 h-8 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40 hover:bg-[rgba(231,0,19,0.06)]"
                style={{ color: "rgba(45,29,15,0.45)" }}
                aria-label="Remove address"
              >
                <IconTrash className="w-3.5 h-3.5" strokeWidth={1.7} />
              </motion.button>
            </motion.div>
          ))}
        </AnimatePresence>
        {addresses.length === 0 && !showAddAddress && (
          <EmptyState
            tone="calm"
            title="No saved addresses"
            body="Add an address to forward your mail to anywhere — home, office, or while you travel."
          />
        )}
      </div>

      <AnimatePresence mode="wait">
        {showAddAddress ? (
          <motion.form
            key="form"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            onSubmit={(e) => {
              e.preventDefault();
              const form = new FormData(e.currentTarget);
              startTransition(async () => {
                await addForwardingAddress({}, form);
                setShowAddAddress(false);
                setToast("Address added");
                router.refresh();
              });
            }}
            className="space-y-2.5 p-4 rounded-2xl"
            style={{
              background: "rgba(51,116,133,0.04)",
              border: "1px dashed rgba(51,116,133,0.30)",
            }}
          >
            <input
              name="label"
              required
              placeholder="Label (e.g. Home, Office)"
              className="w-full rounded-lg px-3.5 h-10 text-[13px] focus:outline-none focus:border-[#337485]"
              style={{
                background: "white",
                border: "1px solid rgba(45,29,15,0.10)",
                color: "#2D1D0F",
              }}
            />
            <input
              name="address"
              required
              placeholder="Full address"
              className="w-full rounded-lg px-3.5 h-10 text-[13px] focus:outline-none focus:border-[#337485]"
              style={{
                background: "white",
                border: "1px solid rgba(45,29,15,0.10)",
                color: "#2D1D0F",
              }}
            />
            <div className="flex gap-2 pt-1">
              <motion.button
                type="submit"
                disabled={isPending}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="flex-1 h-10 rounded-full text-[12.5px] font-semibold disabled:opacity-50 transition-colors"
                style={{
                  background: "#337485",
                  color: "#F7EEC2",
                }}
              >
                {isPending ? "Adding…" : "Add address"}
              </motion.button>
              <button
                type="button"
                onClick={() => setShowAddAddress(false)}
                className="flex-1 h-10 rounded-full text-[12.5px] font-semibold transition-colors"
                style={{
                  background: "white",
                  border: "1px solid rgba(45,29,15,0.10)",
                  color: "#2D1D0F",
                }}
              >
                Cancel
              </button>
            </div>
          </motion.form>
        ) : (
          <motion.button
            key="add-btn"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowAddAddress(true)}
            className="w-full h-12 rounded-2xl text-[13px] font-semibold flex items-center justify-center gap-2 transition-colors"
            style={{
              color: "#337485",
              border: "1px dashed rgba(51,116,133,0.30)",
              background: "white",
            }}
          >
            <IconPlus className="w-3.5 h-3.5" strokeWidth={2} />
            Add new address
          </motion.button>
        )}
      </AnimatePresence>

      <CostEstimator />
    </div>
  );
}
