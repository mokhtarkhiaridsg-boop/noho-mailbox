"use client";

import { useState } from "react";
import type { TransitionStartFunction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { BRAND, type Delivery } from "./types";
import { IconTruck, IconClock } from "@/components/MemberIcons";
import { scheduleDelivery } from "@/app/actions/delivery";

type Props = {
  deliveries: Delivery[];
  isPending: boolean;
  startTransition: TransitionStartFunction;
  setToast: (s: string) => void;
  router: AppRouterInstance;
};

export default function DeliveriesPanel({
  deliveries,
  isPending,
  startTransition,
  setToast,
  router,
}: Props) {
  const [showForm, setShowForm] = useState(false);

  function refresh(label: string) {
    setToast(label);
    router.refresh();
  }

  function timelineStep(d: Delivery) {
    const steps: { label: string; done: boolean }[] = [
      { label: "Pending", done: true },
      { label: "Picked Up", done: !!d.pickedUpAt || ["In Transit", "Delivered"].includes(d.status) },
      { label: "In Transit", done: !!d.inTransitAt || d.status === "Delivered" },
      { label: "Delivered", done: !!d.deliveredAt || d.status === "Delivered" },
    ];
    return steps;
  }

  return (
    <div className="space-y-6">
      <section
        className="rounded-3xl p-6"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <IconTruck className="w-4 h-4" style={{ color: BRAND.blue }} />
            <h2
              className="font-black text-xs uppercase tracking-[0.16em]"
              style={{ color: BRAND.ink }}
            >
              Schedule Same-Day Delivery
            </h2>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="text-[11px] font-black px-3 py-1.5 rounded-full text-white"
            style={{
              background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
            }}
          >
            {showForm ? "Close" : "New Delivery"}
          </button>
        </div>

        {showForm && (
          <form
            className="grid grid-cols-1 sm:grid-cols-2 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                const res = await scheduleDelivery({
                  destination: fd.get("destination") as string,
                  zip: fd.get("zip") as string,
                  itemType: fd.get("itemType") as string,
                  tier: (fd.get("tier") as "Standard" | "Rush" | "WhiteGlove") ?? "Standard",
                  recipientName: fd.get("recipientName") as string,
                  recipientPhone: fd.get("recipientPhone") as string,
                  instructions: (fd.get("instructions") as string) || undefined,
                });
                if (res?.error) {
                  refresh(res.error);
                  return;
                }
                setShowForm(false);
                refresh("Delivery scheduled");
              });
            }}
          >
            <input
              name="destination"
              placeholder="Destination address"
              required
              className="rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <input
              name="zip"
              placeholder="ZIP"
              required
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <select
              name="itemType"
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            >
              <option>Documents</option>
              <option>Letter</option>
              <option>Package</option>
              <option>Other</option>
            </select>
            <input
              name="recipientName"
              placeholder="Recipient name"
              required
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <input
              name="recipientPhone"
              placeholder="Recipient phone"
              required
              className="rounded-xl px-4 py-2.5 text-sm"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <select
              name="tier"
              className="rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            >
              <option value="Standard">Standard — same day</option>
              <option value="Rush">Rush — within 2 hours (+60%)</option>
              <option value="WhiteGlove">White-Glove — door-to-door (+150%)</option>
            </select>
            <textarea
              name="instructions"
              rows={2}
              placeholder="Driver instructions (optional)"
              className="rounded-xl px-4 py-2.5 text-sm sm:col-span-2"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
            />
            <button
              type="submit"
              disabled={isPending}
              className="sm:col-span-2 py-3 rounded-xl text-sm font-black text-white disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
              }}
            >
              Schedule Delivery
            </button>
          </form>
        )}
      </section>

      {/* History */}
      <section
        className="rounded-3xl overflow-hidden"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
        }}
      >
        <div
          className="px-6 py-4 flex items-center gap-2.5"
          style={{ borderBottom: `1px solid ${BRAND.border}` }}
        >
          <IconClock className="w-4 h-4" style={{ color: BRAND.blue }} />
          <h3
            className="font-black text-xs uppercase tracking-[0.16em]"
            style={{ color: BRAND.ink }}
          >
            Delivery History
          </h3>
        </div>
        {deliveries.length === 0 ? (
          <p className="p-12 text-center text-sm" style={{ color: BRAND.inkSoft }}>
            No deliveries yet.
          </p>
        ) : (
          <ul>
            {deliveries.map((d, i) => (
              <li
                key={d.id}
                className="px-6 py-4"
                style={{
                  borderBottom:
                    i < deliveries.length - 1
                      ? `1px solid ${BRAND.border}`
                      : "none",
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-black" style={{ color: BRAND.ink }}>
                      {d.destination}
                    </p>
                    <p className="text-[11px]" style={{ color: BRAND.inkFaint }}>
                      {d.tier} · {d.date} · ${d.price.toFixed(2)}
                    </p>
                  </div>
                  <span
                    className="text-[10px] font-black px-2.5 py-1 rounded-full"
                    style={{
                      background:
                        d.status === "Delivered"
                          ? "rgba(34,139,34,0.12)"
                          : BRAND.blueSoft,
                      color: d.status === "Delivered" ? "#1a8a1a" : BRAND.blueDeep,
                    }}
                  >
                    {d.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  {timelineStep(d).map((s, idx) => (
                    <div
                      key={s.label}
                      className="flex-1 flex items-center"
                    >
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: s.done ? BRAND.blue : "rgba(14,34,64,0.15)",
                        }}
                      />
                      {idx < 3 && (
                        <div
                          className="flex-1 h-0.5"
                          style={{
                            background: s.done
                              ? BRAND.blue
                              : "rgba(14,34,64,0.1)",
                          }}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between mt-1.5">
                  {timelineStep(d).map((s) => (
                    <span
                      key={s.label}
                      className="text-[9px] font-bold uppercase tracking-wider"
                      style={{ color: s.done ? BRAND.blueDeep : BRAND.inkFaint }}
                    >
                      {s.label}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
