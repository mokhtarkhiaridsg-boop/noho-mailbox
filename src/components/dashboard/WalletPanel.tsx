"use client";

import { useEffect, useState } from "react";
import type { TransitionStartFunction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { motion, AnimatePresence, useMotionValue, useTransform, animate } from "motion/react";
import { BRAND, type DashboardUser, type Card, type WalletTxn } from "./types";
import {
  IconShield,
  IconWallet,
  IconCard,
  IconTrash,
  IconPlus,
} from "@/components/MemberIcons";
import {
  addCard,
  removeCard,
  setDefaultCard,
  topUpWallet,
  requestDepositRefund,
} from "@/app/actions/wallet";
import PaymentForm from "@/components/PaymentForm";

// Animated dollar counter — counts from 0 to value over 700ms with the
// brand smoothing curve. Used for Wallet Balance + Security Deposit so
// big-number stats feel earned, not flashed in.
function AnimatedDollars({ cents }: { cents: number }) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => `$${(v / 100).toFixed(v % 100 === 0 ? 0 : 2)}`);
  useEffect(() => {
    const controls = animate(mv, cents, { duration: 0.7, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [mv, cents]);
  return <motion.span>{display}</motion.span>;
}

// Credit card brand styling — color gradient + brand name for the
// rendered card tile. Falls back to brand-blue for unknown brands.
function brandCardStyle(brand: string): { from: string; to: string; logo: string } {
  const b = brand.toLowerCase();
  if (b.includes("visa")) return { from: "#1a1f71", to: "#0e1454", logo: "VISA" };
  if (b.includes("master")) return { from: "#eb001b", to: "#7a000e", logo: "MC" };
  if (b.includes("amex") || b.includes("american")) return { from: "#006fcf", to: "#003d7a", logo: "AMEX" };
  if (b.includes("discover")) return { from: "#ff6000", to: "#9e3a00", logo: "DISC" };
  return { from: "#337485", to: "#1f4f5b", logo: brand.slice(0, 4).toUpperCase() };
}

type Props = {
  user: DashboardUser;
  cards: Card[];
  walletTxns: WalletTxn[];
  isPending: boolean;
  startTransition: TransitionStartFunction;
  setToast: (s: string) => void;
  router: AppRouterInstance;
};

export default function WalletPanel({
  user,
  cards,
  walletTxns,
  isPending,
  startTransition,
  setToast,
  router,
}: Props) {
  const [showAddCard, setShowAddCard] = useState(false);
  // iter-12.2 — Web Payments modal lets customers without a saved card
  // pay on the spot via Apple Pay / Google Pay / card-on-screen. Holds
  // the selected top-up amount; null means modal closed.
  const [payAmount, setPayAmount] = useState<number | null>(null);

  function refresh(label: string) {
    setToast(label);
    router.refresh();
  }

  const depositPct = Math.round(
    (user.securityDepositCents / Math.max(1, user.securityDepositTotalCents)) * 100
  );

  return (
    <div className="space-y-5">
      {/* ─── Wallet Balance Hero ──────────────────────────────────────────
          Animated big number, framer-motion top-up pills with slide-in
          stagger, recent transactions as a clean activity feed. */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl p-6 sm:p-7"
        style={{
          background: "linear-gradient(180deg, #FFFCF3 0%, #FBFAF6 100%)",
          border: "1px solid rgba(45,29,15,0.08)",
        }}
      >
        <div className="flex items-start justify-between gap-4 mb-1">
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em]"
              style={{ color: "#337485" }}
            >
              Wallet Balance
            </p>
            <div
              className="text-4xl sm:text-5xl tabular-nums tracking-tight mt-2"
              style={{
                color: "#2D1D0F",
                fontFamily: "var(--font-baloo), system-ui, sans-serif",
                fontWeight: 800,
              }}
            >
              <AnimatedDollars cents={user.walletBalanceCents} />
            </div>
          </div>
          <span
            className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "rgba(51,116,133,0.10)" }}
          >
            <IconWallet className="w-5 h-5" style={{ color: "#337485" }} strokeWidth={1.7} />
          </span>
        </div>

        <div className="mt-5">
          <div className="flex items-baseline justify-between mb-2">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: "rgba(45,29,15,0.55)" }}
            >
              Quick top-up
            </p>
            <span className="text-[10px] font-medium" style={{ color: "rgba(45,29,15,0.45)" }}>
              {cards.length > 0 ? "Charges default card" : "Pay with Apple Pay, Google Pay, or card"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[2500, 5000, 10000, 25000].map((amt, idx) => (
              <motion.button
                key={amt}
                disabled={isPending}
                onClick={() => {
                  // iter-12.2 — When the member has a default Square card on
                  // file, charge it instantly via the saved-card flow. When
                  // they don't, open the Web Payments modal so they can pay
                  // with Apple Pay / Google Pay / a new card without ever
                  // leaving the dashboard.
                  if (cards.length === 0) {
                    setPayAmount(amt);
                    return;
                  }
                  startTransition(async () => {
                    const res = await topUpWallet(amt);
                    if (res?.error) {
                      refresh(res.error);
                      return;
                    }
                    refresh(`Added $${amt / 100} to wallet`);
                  });
                }}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, delay: 0.08 + idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.97 }}
                className="px-4 h-10 rounded-full text-[13px] font-semibold disabled:opacity-50 transition-colors"
                style={{
                  background: "white",
                  color: "#337485",
                  border: "1px solid rgba(51,116,133,0.20)",
                }}
              >
                + ${amt / 100}
              </motion.button>
            ))}
          </div>
          {cards.length === 0 && (
            <p className="mt-3 text-[11.5px]" style={{ color: "rgba(45,29,15,0.55)" }}>
              No saved card? Click any amount above to pay with Apple Pay, Google Pay, or a card.
            </p>
          )}
        </div>

        {walletTxns.length > 0 && (
          <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(45,29,15,0.08)" }}>
            <div className="flex items-center justify-between mb-3 gap-2">
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                style={{ color: "rgba(45,29,15,0.55)" }}
              >
                Recent activity
              </p>
              {/* iter-133 — Download printable wallet ledger statement.
                  Opens in a new tab so the member doesn't lose their
                  scroll position on the dashboard. The statement page
                  itself audit-logs the view via getWalletLedger(). */}
              <a
                href="/dashboard/wallet/ledger"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10.5px] font-semibold transition-colors"
                style={{
                  background: "rgba(51,116,133,0.08)",
                  color: "#23596A",
                  border: "1px solid rgba(51,116,133,0.20)",
                }}
                aria-label="Download printable wallet statement"
              >
                <svg viewBox="0 0 24 24" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
                Download statement
              </a>
            </div>
            <ul className="space-y-1">
              {walletTxns.map((t, idx) => {
                const isCredit = t.amountCents >= 0;
                return (
                  <motion.li
                    key={t.id}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.24, delay: 0.05 * idx, ease: [0.22, 1, 0.36, 1] }}
                    className="flex items-center gap-3 py-2"
                  >
                    <span
                      className="shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold"
                      style={{
                        background: isCredit ? "rgba(34,197,94,0.10)" : "rgba(45,29,15,0.05)",
                        color: isCredit ? "var(--color-success)" : "rgba(45,29,15,0.55)",
                      }}
                      aria-hidden
                    >
                      {isCredit ? "+" : "−"}
                    </span>
                    <span className="flex-1 text-[12.5px] truncate" style={{ color: "#2D1D0F" }}>
                      {t.description}
                    </span>
                    <span
                      className="shrink-0 text-[12.5px] tabular-nums"
                      style={{
                        color: isCredit ? "var(--color-success)" : "#2D1D0F",
                        fontWeight: 700,
                      }}
                    >
                      {isCredit ? "+" : "−"}${(Math.abs(t.amountCents) / 100).toFixed(2)}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          </div>
        )}
      </motion.section>

      {/* ─── Security Deposit ─────────────────────────────────────────────
          Refined statement card. Shield icon as subtle marker, animated
          dollar counter, slim progress bar with brand-blue fill. Replaces
          the chunky brown gradient + huge shield wash + 50px drop shadow. */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.05, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl p-5 sm:p-6"
        style={{
          background: "white",
          border: "1px solid rgba(45,29,15,0.08)",
        }}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(51,116,133,0.10)" }}
              >
                <IconShield className="w-3.5 h-3.5" style={{ color: "#337485" }} strokeWidth={1.7} />
              </span>
              <p
                className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                style={{ color: "rgba(45,29,15,0.55)" }}
              >
                Security Deposit
              </p>
            </div>
            <div
              className="text-2xl sm:text-3xl tabular-nums tracking-tight"
              style={{
                color: "#2D1D0F",
                fontFamily: "var(--font-baloo), system-ui, sans-serif",
                fontWeight: 800,
              }}
            >
              <AnimatedDollars cents={user.securityDepositCents} />
            </div>
            <p className="text-[11.5px] mt-0.5" style={{ color: "rgba(45,29,15,0.55)" }}>
              of ${(user.securityDepositTotalCents / 100).toFixed(2)} on file
            </p>
          </div>
          <motion.button
            disabled={isPending}
            whileHover={{ y: -1 }}
            whileTap={{ scale: 0.97 }}
            onClick={() =>
              startTransition(async () => {
                const res = await requestDepositRefund();
                if (res && "error" in res && res.error) {
                  refresh(`Couldn't request refund: ${res.error}`);
                  return;
                }
                refresh("Refund request submitted");
              })
            }
            className="shrink-0 inline-flex items-center px-3 h-8 rounded-full text-[11.5px] font-semibold disabled:opacity-50"
            style={{
              background: "white",
              color: "#337485",
              border: "1px solid rgba(51,116,133,0.20)",
            }}
          >
            Request refund
          </motion.button>
        </div>
        <div className="mt-4 h-1.5 w-full rounded-full overflow-hidden" style={{ background: "rgba(45,29,15,0.06)" }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: "#337485" }}
            initial={{ width: "0%" }}
            animate={{ width: `${depositPct}%` }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
      </motion.section>

      {/* ─── Saved Cards ──────────────────────────────────────────────────
          Each card renders as a proper credit-card-shaped tile with the
          brand's actual color palette (Visa navy, MC red, Amex blue, Disc
          orange) — instantly recognizable. Default badge is a subtle
          cream pin. Hover lifts slightly + reveals action buttons. */}
      <motion.section
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
        className="rounded-3xl p-5 sm:p-6"
        style={{
          background: "white",
          border: "1px solid rgba(45,29,15,0.08)",
        }}
      >
        <div className="flex items-center gap-2 mb-4">
          <span
            className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "rgba(51,116,133,0.10)" }}
          >
            <IconCard className="w-3.5 h-3.5" style={{ color: "#337485" }} strokeWidth={1.7} />
          </span>
          <p
            className="text-[10px] font-semibold uppercase tracking-[0.22em]"
            style={{ color: "rgba(45,29,15,0.55)" }}
          >
            Saved Cards
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((c, idx) => {
            const stl = brandCardStyle(c.brand);
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.32, delay: 0.05 * idx, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -2 }}
                className="group relative rounded-2xl p-4 overflow-hidden"
                style={{
                  background: `linear-gradient(135deg, ${stl.from} 0%, ${stl.to} 100%)`,
                  color: "rgba(255,255,255,0.95)",
                  aspectRatio: "1.586 / 1",
                  minHeight: 130,
                }}
              >
                {/* Subtle holographic shine overlay */}
                <div
                  aria-hidden
                  className="absolute inset-0 opacity-30 pointer-events-none"
                  style={{
                    background:
                      "radial-gradient(ellipse 60% 40% at 30% 20%, rgba(255,255,255,0.4), transparent 60%)",
                  }}
                />
                {/* Chip */}
                <div className="relative flex items-start justify-between mb-auto">
                  <span
                    className="block w-9 h-7 rounded"
                    style={{
                      background: "linear-gradient(180deg, #d4b54f 0%, #a98931 50%, #d4b54f 100%)",
                      boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3), inset 0 -1px 0 rgba(0,0,0,0.2)",
                    }}
                    aria-hidden
                  />
                  {c.isDefault && (
                    <span
                      className="text-[9px] font-bold uppercase tracking-[0.18em] px-2 py-1 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.18)",
                        color: "rgba(255,255,255,0.9)",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      Default
                    </span>
                  )}
                </div>
                {/* Number */}
                <div
                  className="relative tabular-nums tracking-[0.18em] mt-6"
                  style={{
                    fontFamily: "ui-monospace, 'SF Mono', Menlo, monospace",
                    fontSize: 16,
                    fontWeight: 600,
                    textShadow: "0 1px 2px rgba(0,0,0,0.25)",
                  }}
                >
                  •••• •••• •••• {c.last4}
                </div>
                <div className="relative flex items-end justify-between mt-3">
                  <div>
                    <p className="text-[8.5px] uppercase tracking-[0.18em] opacity-60">Expires</p>
                    <p className="text-[12px] font-semibold tabular-nums tracking-wide">
                      {String(c.expMonth).padStart(2, "0")}/{c.expYear.toString().slice(-2)}
                    </p>
                  </div>
                  <span
                    className="text-[15px] font-black tracking-tight"
                    style={{ fontFamily: "Georgia, serif", fontStyle: "italic", letterSpacing: "0.02em" }}
                  >
                    {stl.logo}
                  </span>
                </div>
                {/* Action buttons (hover-revealed) */}
                <div
                  className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  {!c.isDefault && (
                    <button
                      disabled={isPending}
                      onClick={() =>
                        startTransition(async () => {
                          const res = await setDefaultCard(c.id);
                          if (res && "error" in res && res.error) {
                            refresh(`Couldn't set default: ${res.error}`);
                            return;
                          }
                          refresh("Default card set");
                        })
                      }
                      className="text-[9.5px] font-bold uppercase tracking-[0.14em] px-2 py-1 rounded-full"
                      style={{
                        background: "rgba(255,255,255,0.18)",
                        color: "white",
                        backdropFilter: "blur(4px)",
                      }}
                    >
                      Set default
                    </button>
                  )}
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        const res = await removeCard(c.id);
                        if (res && "error" in res && res.error) {
                          refresh(`Couldn't remove card: ${res.error}`);
                          return;
                        }
                        refresh("Card removed");
                      })
                    }
                    className="w-6 h-6 rounded-full flex items-center justify-center"
                    style={{
                      background: "rgba(255,255,255,0.18)",
                      color: "white",
                      backdropFilter: "blur(4px)",
                    }}
                    aria-label="Remove card"
                  >
                    <IconTrash className="w-3 h-3" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>

        {showAddCard ? (
          <form
            className="mt-4 grid grid-cols-2 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              startTransition(async () => {
                await addCard({
                  brand: (fd.get("brand") as string) || "VISA",
                  last4: (fd.get("last4") as string) || "0000",
                  expMonth: Number(fd.get("expMonth") || 12),
                  expYear: Number(fd.get("expYear") || 2030),
                });
                setShowAddCard(false);
                refresh("Card added");
              });
            }}
          >
            <input
              name="brand"
              placeholder="Brand (VISA, MC...)"
              className="rounded-xl px-3 py-2 text-sm col-span-2"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
              required
            />
            <input
              name="last4"
              placeholder="Last 4"
              maxLength={4}
              className="rounded-xl px-3 py-2 text-sm"
              style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                name="expMonth"
                placeholder="MM"
                type="number"
                min="1"
                max="12"
                className="rounded-xl px-3 py-2 text-sm"
                style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
                required
              />
              <input
                name="expYear"
                placeholder="YYYY"
                type="number"
                min="2025"
                className="rounded-xl px-3 py-2 text-sm"
                style={{ background: BRAND.blueSoft, border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
                required
              />
            </div>
            <div className="col-span-2 flex gap-2">
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 py-2.5 rounded-xl text-xs font-black text-white disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                }}
              >
                Add Card
              </button>
              <button
                type="button"
                onClick={() => setShowAddCard(false)}
                className="flex-1 py-2.5 rounded-xl text-xs font-bold"
                style={{ border: `1px solid ${BRAND.border}`, color: BRAND.ink }}
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowAddCard(true)}
            className="mt-4 w-full py-3 rounded-2xl text-xs font-black flex items-center justify-center gap-2"
            style={{
              color: BRAND.blueDeep,
              border: `1px dashed ${BRAND.blue}`,
              background: BRAND.bgDeep,
            }}
          >
            <IconPlus className="w-4 h-4" />
            Add a Card
          </button>
        )}

        <p className="mt-3 text-[10px]" style={{ color: "rgba(45,29,15,0.45)" }}>
          Cards are securely stored via Square Cards on File. We never see the full
          number.
        </p>
      </motion.section>

      {/* ─── Web Payments Modal ───────────────────────────────────────────
          iter-12.2 — Tokenize a brand-new card / Apple Pay / Google Pay
          via Square's Web Payments SDK and credit the wallet. Mounted
          conditionally so the SDK script only loads when the customer
          actually needs to pay. Closes on success after a brief receipt
          flash, or on backdrop click / Cancel button. */}
      <AnimatePresence>
        {payAmount !== null && (
          <motion.div
            key="pay-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
            style={{ background: "rgba(45,29,15,0.55)", backdropFilter: "blur(6px)" }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setPayAmount(null);
            }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              className="w-full sm:max-w-md rounded-3xl p-6 sm:p-7"
              style={{
                background: "white",
                boxShadow:
                  "0 10px 40px rgba(45,29,15,0.25), 0 1px 0 rgba(255,255,255,0.6) inset",
              }}
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.22em]"
                    style={{ color: "#337485" }}
                  >
                    Top up wallet
                  </p>
                  <p
                    className="text-2xl tabular-nums mt-1"
                    style={{
                      color: "#2D1D0F",
                      fontFamily: "var(--font-baloo), system-ui, sans-serif",
                      fontWeight: 800,
                    }}
                  >
                    ${(payAmount / 100).toFixed(2)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setPayAmount(null)}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-[18px] font-bold leading-none transition-colors hover:bg-black/5"
                  style={{ color: "rgba(45,29,15,0.55)" }}
                  aria-label="Close payment dialog"
                >
                  ×
                </button>
              </div>

              <PaymentForm
                amount={payAmount}
                description={`NOHO Mailbox wallet top-up · $${(payAmount / 100).toFixed(2)}`}
                purpose="wallet_topup"
                onSuccess={() => {
                  // iter-12.2 — Close the modal, refresh the dashboard
                  // (which re-fetches walletBalanceCents + transactions),
                  // and surface a toast. The modal itself shows a success
                  // state for ~1.5s before unmount so the customer sees
                  // the receipt confirmation.
                  setTimeout(() => {
                    setPayAmount(null);
                    refresh(`Added $${(payAmount / 100).toFixed(2)} to wallet`);
                  }, 1500);
                }}
                onError={(msg) => {
                  // Don't auto-close — let the form's inline error stay
                  // visible so the customer can retry without re-opening.
                  console.warn("[wallet payment] error", msg);
                }}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
