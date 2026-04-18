"use client";

import type { TransitionStartFunction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { BRAND, type Invoice } from "./types";
import { IconReceipt } from "@/components/MemberIcons";
import { payInvoice } from "@/app/actions/invoices";

type Props = {
  invoices: Invoice[];
  isPending: boolean;
  startTransition: TransitionStartFunction;
  setToast: (s: string) => void;
  router: AppRouterInstance;
};

export default function InvoicesPanel({
  invoices,
  isPending,
  startTransition,
  setToast,
  router,
}: Props) {
  function refresh(label: string) {
    setToast(label);
    router.refresh();
  }

  return (
    <div
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
        <IconReceipt className="w-4 h-4" style={{ color: BRAND.blue }} />
        <h2
          className="font-black text-xs uppercase tracking-[0.16em]"
          style={{ color: BRAND.ink }}
        >
          Invoices
        </h2>
      </div>
      {invoices.length === 0 ? (
        <p className="p-12 text-center text-sm" style={{ color: BRAND.inkSoft }}>
          No invoices yet.
        </p>
      ) : (
        <ul>
          {invoices.map((inv, i) => (
            <li
              key={inv.id}
              className="px-6 py-4 flex items-center justify-between"
              style={{
                borderBottom:
                  i < invoices.length - 1 ? `1px solid ${BRAND.border}` : "none",
              }}
            >
              <div>
                <p
                  className="text-sm font-black"
                  style={{ color: BRAND.ink }}
                >
                  {inv.number} · {inv.kind}
                </p>
                <p className="text-[11px]" style={{ color: BRAND.inkFaint }}>
                  {inv.description}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="text-sm font-black"
                  style={{ color: BRAND.ink }}
                >
                  ${(inv.totalCents / 100).toFixed(2)}
                </span>
                <span
                  className="text-[10px] font-black px-2.5 py-1 rounded-full"
                  style={{
                    background:
                      inv.status === "Paid"
                        ? "rgba(34,139,34,0.12)"
                        : BRAND.blueSoft,
                    color:
                      inv.status === "Paid" ? "#1a8a1a" : BRAND.blueDeep,
                  }}
                >
                  {inv.status}
                </span>
                {inv.status === "Sent" && (
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await payInvoice(inv.id);
                        if (res?.error) {
                          refresh(res.error);
                          return;
                        }
                        refresh("Invoice paid");
                      })
                    }
                    className="text-[11px] font-black px-3 py-1.5 rounded-full text-white"
                    style={{
                      background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                    }}
                  >
                    Pay
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
