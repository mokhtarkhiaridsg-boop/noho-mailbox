"use client";

import { useState } from "react";
import type { TransitionStartFunction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { BRAND, type ForwardingAddress } from "./types";
import { IconForward, IconHome, IconTrash, IconPlus } from "@/components/MemberIcons";
import { addForwardingAddress, deleteForwardingAddress } from "@/app/actions/user";

// Forwarding cost estimator — no API needed, uses weight-based USPS estimates
const USPS_ESTIMATES: { label: string; weight: string; price: string }[] = [
  { label: "Single letter", weight: "< 1 oz", price: "$0.68–$1.50" },
  { label: "Thick envelope", weight: "1–3 oz", price: "$1.50–$3.50" },
  { label: "Small package", weight: "< 1 lb", price: "$4.50–$8.00" },
  { label: "Medium package", weight: "1–5 lbs", price: "$8.00–$18.00" },
  { label: "Large package", weight: "5–10 lbs", price: "$18.00–$40.00" },
];

function CostEstimator() {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-4 rounded-2xl overflow-hidden" style={{ border: `1px solid ${BRAND.border}` }}>
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-sm font-black"
        style={{ background: BRAND.blueSoft, color: BRAND.blueDeep }}
      >
        <span>📦 Forwarding Cost Estimator</span>
        <span>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="p-4 space-y-3 bg-white">
          <p className="text-xs" style={{ color: BRAND.inkSoft }}>
            Estimates based on USPS First-Class and Priority Mail rates (postage + $5 handling).
            Actual cost depends on destination zip and package dimensions.
          </p>
          <div className="space-y-1.5">
            {USPS_ESTIMATES.map((e) => (
              <div key={e.label} className="flex items-center justify-between py-2 px-3 rounded-xl" style={{ background: BRAND.blueSoft }}>
                <div>
                  <p className="text-xs font-bold" style={{ color: BRAND.ink }}>{e.label}</p>
                  <p className="text-[10px]" style={{ color: BRAND.inkFaint }}>{e.weight}</p>
                </div>
                <span className="text-xs font-black" style={{ color: BRAND.blueDeep }}>{e.price}</span>
              </div>
            ))}
          </div>
          <p className="text-[10px]" style={{ color: BRAND.inkFaint }}>
            * Add $5 handling fee to all estimates. Express forwarding (1-2 day) available at 2× rate.
          </p>
        </div>
      )}
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
      className="rounded-2xl sm:rounded-3xl p-4 sm:p-6"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <IconForward className="w-4 h-4" style={{ color: BRAND.blue }} />
        <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
          Saved Addresses
        </h3>
      </div>
      <div className="space-y-3 mb-6">
        {addresses.map((addr) => (
          <div
            key={addr.id}
            className="group flex items-center justify-between p-4 rounded-2xl transition-all hover:-translate-y-0.5"
            style={{
              background: BRAND.blueSoft,
              border: `1px solid ${BRAND.border}`,
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "white" }}
              >
                <IconHome className="w-4 h-4" style={{ color: BRAND.blue }} />
              </div>
              <div>
                <p className="text-sm font-black" style={{ color: BRAND.ink }}>
                  {addr.label}
                </p>
                <p className="text-xs" style={{ color: BRAND.inkSoft }}>
                  {addr.address}
                </p>
              </div>
            </div>
            <button
              onClick={() =>
                runAction("Address removed", async () => {
                  await deleteForwardingAddress(addr.id);
                })
              }
              disabled={isPending}
              className="w-9 h-9 rounded-xl flex items-center justify-center transition-all hover:bg-red-50 disabled:opacity-40"
              style={{ color: "#c03030" }}
              aria-label="Remove address"
            >
              <IconTrash className="w-4 h-4" />
            </button>
          </div>
        ))}
        {addresses.length === 0 && (
          <p
            className="text-sm text-center py-6"
            style={{ color: BRAND.inkFaint }}
          >
            No saved addresses yet.
          </p>
        )}
      </div>

      {showAddAddress ? (
        <form
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
          className="space-y-3 p-4 rounded-2xl"
          style={{
            background: BRAND.blueSoft,
            border: `1px dashed ${BRAND.blue}`,
          }}
        >
          <input
            name="label"
            required
            placeholder="Label (e.g. Home, Office)"
            className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
            style={{
              background: "white",
              border: `1px solid ${BRAND.border}`,
              color: BRAND.ink,
            }}
          />
          <input
            name="address"
            required
            placeholder="Full address"
            className="w-full rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2"
            style={{
              background: "white",
              border: `1px solid ${BRAND.border}`,
              color: BRAND.ink,
            }}
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40 transition-transform hover:-translate-y-0.5"
              style={{
                background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                boxShadow: "0 4px 14px rgba(51,116,181,0.32)",
              }}
            >
              {isPending ? "Adding..." : "Add Address"}
            </button>
            <button
              type="button"
              onClick={() => setShowAddAddress(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors hover:bg-white"
              style={{
                background: "transparent",
                border: `1px solid ${BRAND.border}`,
                color: BRAND.ink,
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setShowAddAddress(true)}
          className="w-full font-black py-3 rounded-2xl text-sm transition-all hover:-translate-y-0.5 flex items-center justify-center gap-2"
          style={{
            color: BRAND.blueDeep,
            border: `1px dashed ${BRAND.blue}`,
            background: "rgba(51,116,181,0.04)",
          }}
        >
          <IconPlus className="w-4 h-4" />
          Add New Address
        </button>
      )}
      <CostEstimator />
    </div>
  );
}
