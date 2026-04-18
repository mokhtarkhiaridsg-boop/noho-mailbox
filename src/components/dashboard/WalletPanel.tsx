"use client";

import { useState } from "react";
import type { TransitionStartFunction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
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

  function refresh(label: string) {
    setToast(label);
    router.refresh();
  }

  const depositPct = Math.round(
    (user.securityDepositCents / Math.max(1, user.securityDepositTotalCents)) * 100
  );

  return (
    <div className="space-y-6">
      {/* Security Deposit */}
      <section
        className="rounded-3xl p-6 relative overflow-hidden"
        style={{
          background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
          color: "white",
          boxShadow: "0 20px 50px rgba(51,116,181,0.32)",
        }}
      >
        <IconShield className="absolute -top-6 -right-6 w-36 h-36 opacity-15" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
          Security Deposit
        </p>
        <p className="text-4xl font-black mt-2">
          ${(user.securityDepositCents / 100).toFixed(2)}
        </p>
        <p className="text-xs mt-1 text-white/80">
          of ${(user.securityDepositTotalCents / 100).toFixed(2)} on file
        </p>
        <div className="mt-4 h-2 w-full max-w-xs rounded-full bg-white/20 overflow-hidden">
          <div
            className="h-full bg-white"
            style={{ width: `${depositPct}%` }}
          />
        </div>
        <button
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              await requestDepositRefund();
              refresh("Refund request submitted");
            })
          }
          className="mt-5 inline-flex items-center gap-2 text-[11px] font-black px-4 py-2 rounded-full bg-white/15 hover:bg-white/25 disabled:opacity-50"
        >
          Request Refund
        </button>
      </section>

      {/* Wallet balance */}
      <section
        className="rounded-3xl p-6"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <IconWallet className="w-4 h-4" style={{ color: BRAND.blue }} />
            <h3
              className="font-black text-xs uppercase tracking-[0.16em]"
              style={{ color: BRAND.ink }}
            >
              Wallet Balance
            </h3>
          </div>
          <span className="text-2xl font-black" style={{ color: BRAND.ink }}>
            ${(user.walletBalanceCents / 100).toFixed(2)}
          </span>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          {[2500, 5000, 10000, 25000].map((amt) => (
            <button
              key={amt}
              disabled={isPending || cards.length === 0}
              onClick={() =>
                startTransition(async () => {
                  const res = await topUpWallet(amt);
                  if (res?.error) {
                    refresh(res.error);
                    return;
                  }
                  refresh(`Added $${amt / 100} to wallet`);
                })
              }
              className="px-4 py-2.5 rounded-xl text-xs font-black disabled:opacity-50 transition-all hover:-translate-y-0.5"
              style={{
                background: BRAND.blueSoft,
                color: BRAND.blueDeep,
                border: `1px solid ${BRAND.border}`,
              }}
            >
              +${amt / 100}
            </button>
          ))}
        </div>
        {cards.length === 0 && (
          <p className="mt-3 text-[11px]" style={{ color: BRAND.inkFaint }}>
            Add a card below to enable wallet top-ups.
          </p>
        )}

        {walletTxns.length > 0 && (
          <div className="mt-6">
            <p
              className="text-[10px] font-black uppercase tracking-[0.16em] mb-2"
              style={{ color: BRAND.inkFaint }}
            >
              Recent transactions
            </p>
            <ul className="divide-y" style={{ borderColor: BRAND.border }}>
              {walletTxns.map((t) => (
                <li
                  key={t.id}
                  className="py-2.5 flex items-center justify-between text-xs"
                >
                  <span style={{ color: BRAND.inkSoft }}>{t.description}</span>
                  <span
                    className="font-black"
                    style={{
                      color:
                        t.amountCents >= 0 ? "#1a8a1a" : "#c03030",
                    }}
                  >
                    {t.amountCents >= 0 ? "+" : "−"}$
                    {(Math.abs(t.amountCents) / 100).toFixed(2)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Saved cards */}
      <section
        className="rounded-3xl p-6"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "0 1px 0 rgba(51,116,181,0.04), 0 12px 32px rgba(14,34,64,0.06)",
        }}
      >
        <div className="flex items-center gap-2.5 mb-4">
          <IconCard className="w-4 h-4" style={{ color: BRAND.blue }} />
          <h3
            className="font-black text-xs uppercase tracking-[0.16em]"
            style={{ color: BRAND.ink }}
          >
            Saved Cards
          </h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {cards.map((c) => (
            <div
              key={c.id}
              className="rounded-2xl p-4 flex items-center justify-between"
              style={{
                background: BRAND.blueSoft,
                border: `1px solid ${BRAND.border}`,
              }}
            >
              <div>
                <p className="text-xs font-black" style={{ color: BRAND.ink }}>
                  {c.brand} •••• {c.last4}
                </p>
                <p className="text-[11px]" style={{ color: BRAND.inkFaint }}>
                  Exp {String(c.expMonth).padStart(2, "0")}/{c.expYear}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {c.isDefault ? (
                  <span
                    className="text-[10px] font-black px-2 py-1 rounded-full text-white"
                    style={{ background: BRAND.blue }}
                  >
                    DEFAULT
                  </span>
                ) : (
                  <button
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await setDefaultCard(c.id);
                        refresh("Default card set");
                      })
                    }
                    className="text-[10px] font-black px-2 py-1 rounded-full"
                    style={{ color: BRAND.blueDeep, background: "white" }}
                  >
                    SET DEFAULT
                  </button>
                )}
                <button
                  disabled={isPending}
                  onClick={() =>
                    startTransition(async () => {
                      await removeCard(c.id);
                      refresh("Card removed");
                    })
                  }
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ color: "#c03030" }}
                  aria-label="Remove card"
                >
                  <IconTrash className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
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
              background: "rgba(51,116,181,0.04)",
            }}
          >
            <IconPlus className="w-4 h-4" />
            Add a Card
          </button>
        )}

        <p className="mt-3 text-[10px]" style={{ color: BRAND.inkFaint }}>
          Cards are securely stored via Square Cards on File. We never see the full
          number.
        </p>
      </section>
    </div>
  );
}
