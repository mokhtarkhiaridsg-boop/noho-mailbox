"use client";

import type { TransitionStartFunction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { motion, AnimatePresence } from "motion/react";
import { type Invoice } from "./types";
import { IconReceipt } from "@/components/MemberIcons";
import { payInvoice } from "@/app/actions/invoices";
import { EmptyState } from "./ui";

type Props = {
  invoices: Invoice[];
  isPending: boolean;
  startTransition: TransitionStartFunction;
  setToast: (s: string) => void;
  router: AppRouterInstance;
};

function statusStyles(status: string): { bg: string; color: string } {
  if (status === "Paid")
    return { bg: "rgba(34,197,94,0.10)", color: "var(--color-success)" };
  if (status === "Overdue")
    return { bg: "rgba(239,68,68,0.10)", color: "var(--color-danger)" };
  // Sent / pending
  return { bg: "rgba(51,116,133,0.10)", color: "#337485" };
}

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
          <IconReceipt className="w-3.5 h-3.5" style={{ color: "#337485" }} strokeWidth={1.7} />
        </span>
        <p
          className="text-[10px] font-semibold uppercase tracking-[0.22em]"
          style={{ color: "rgba(45,29,15,0.55)" }}
        >
          Invoices
        </p>
        {invoices.length > 0 && (
          <span
            className="ml-auto text-[10.5px] font-semibold px-2 py-0.5 rounded-full tabular-nums"
            style={{ background: "rgba(45,29,15,0.05)", color: "rgba(45,29,15,0.65)" }}
          >
            {invoices.length}
          </span>
        )}
      </div>

      {invoices.length === 0 ? (
        <EmptyState
          tone="calm"
          title="No invoices yet"
          body="When you have an invoice — service, renewal, or one-time charge — it will appear here."
        />
      ) : (
        <ul>
          <AnimatePresence initial={false}>
            {invoices.map((inv, i) => {
              const styles = statusStyles(inv.status);
              return (
                <motion.li
                  key={inv.id}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.26, delay: 0.04 * i, ease: [0.22, 1, 0.36, 1] }}
                  className="px-5 py-4 flex items-center justify-between gap-3 transition-colors hover:bg-[rgba(45,29,15,0.02)]"
                  style={{
                    borderBottom:
                      i < invoices.length - 1 ? "1px solid rgba(45,29,15,0.05)" : "none",
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[13.5px] tracking-tight truncate"
                      style={{ color: "#2D1D0F", fontWeight: 700 }}
                    >
                      {inv.number} <span style={{ color: "rgba(45,29,15,0.45)", fontWeight: 500 }}>· {inv.kind}</span>
                    </p>
                    {inv.description && (
                      <p
                        className="text-[12px] mt-0.5 truncate"
                        style={{ color: "rgba(45,29,15,0.55)" }}
                      >
                        {inv.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <span
                      className="text-[14px] tabular-nums tracking-tight"
                      style={{ color: "#2D1D0F", fontWeight: 700 }}
                    >
                      ${(inv.totalCents / 100).toFixed(2)}
                    </span>
                    <span
                      className="text-[10.5px] font-semibold tracking-wide px-2.5 py-1 rounded-full"
                      style={{ background: styles.bg, color: styles.color }}
                    >
                      {inv.status}
                    </span>
                    {inv.status === "Sent" && (
                      <motion.button
                        disabled={isPending}
                        whileHover={{ y: -1 }}
                        whileTap={{ scale: 0.97 }}
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
                        className="text-[11.5px] font-semibold px-3 h-7 rounded-full text-white disabled:opacity-50 transition-colors"
                        style={{ background: "#337485" }}
                      >
                        Pay
                      </motion.button>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </AnimatePresence>
        </ul>
      )}
    </div>
  );
}
