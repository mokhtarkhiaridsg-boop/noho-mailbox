"use client";

/**
 * NOHO Mailbox — Services Panel
 *
 * Surfaces every à-la-carte service in one place with prices and a single
 * "request" action per row. Charges come out of the wallet (credits); members
 * top up via the "Add Credits" card which fires a CreditRequest the admin
 * fulfills by texting a Square payment link.
 */

import { useState } from "react";
import type { TransitionStartFunction } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { BRAND, type DashboardUser } from "./types";
import { requestCredits } from "@/app/actions/credits";
import {
  setVacationHold,
  cancelVacationHold,
  addJunkSender,
  removeJunkSender,
} from "@/app/actions/mailPreferences";
import { grantSharedAccess } from "@/app/actions/sharedMailbox";

type Junk = { id: string; sender: string };
type Vac = { startDate: string; endDate: string; digest: boolean } | null;

type Props = {
  user: DashboardUser;
  junkSenders: Junk[];
  vacation: Vac;
  isPending: boolean;
  startTransition: TransitionStartFunction;
  setToast: (s: string) => void;
  router: AppRouterInstance;
};

const CREDIT_PRESETS = [2500, 5000, 10000, 25000];

const SERVICES = [
  {
    id: "scan",
    svg: <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="#337485" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 12 L21 12" /></svg>,
    title: "Scan request",
    price: "$2 / page",
    desc: "Delivered to your dashboard within 2 hours during business hours.",
    cta: "Open Mail tab → tap Scan on any item",
    href: "mail",
  },
  {
    id: "forward",
    svg: <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="#337485" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3 L21 7 L21 17 L12 21 L3 17 L3 7 Z" /><path d="M3 7 L12 11 L21 7" /><path d="M12 11 L12 21" /></svg>,
    title: "Forwarding",
    price: "Postage + $5 handling",
    desc: "Schedule weekly/biweekly autopilot or one-off forwards.",
    cta: "Set up forwarding",
    href: "forwarding",
  },
  {
    id: "delivery",
    svg: <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="#337485" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"><rect x="2" y="9" width="13" height="9" rx="1" /><path d="M15 12 L19 12 L21 14 L21 18 L15 18" /><circle cx="6" cy="19" r="1.5" /><circle cx="18" cy="19" r="1.5" /></svg>,
    title: "Same-day local delivery",
    price: "$5 NoHo · $10–$24 elsewhere in LA",
    desc: "Curated courier drops your mail at home or office today.",
    cta: "Order delivery",
    href: "deliveries",
  },
] as const;

export default function ServicesPanel({
  user,
  junkSenders,
  vacation,
  isPending,
  startTransition,
  setToast,
  router,
}: Props) {
  const [creditAmt, setCreditAmt] = useState<number>(5000);
  const [vacOpen, setVacOpen] = useState(false);
  const [vacStart, setVacStart] = useState("");
  const [vacEnd, setVacEnd] = useState("");
  const [vacDigest, setVacDigest] = useState(true);
  const [secondUserEmail, setSecondUserEmail] = useState("");
  const [newJunk, setNewJunk] = useState("");

  function refresh(label: string) {
    setToast(label);
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Credits — wallet balance + add credits */}
      <section
        className="rounded-3xl p-6"
        style={{
          background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
          color: "white",
          boxShadow: "0 20px 50px rgba(51,116,133,0.32)",
        }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/70">
          Credits
        </p>
        <div className="flex items-end justify-between flex-wrap gap-4 mt-2">
          <div>
            <p className="text-4xl font-black">
              ${(user.walletBalanceCents / 100).toFixed(2)}
            </p>
            <p className="text-xs text-white/80 mt-1">
              Use credits to pay for scans, forwarding, deliveries, and notary.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-white/70 mb-2">
            Add Credits
          </p>
          <div className="flex flex-wrap gap-2">
            {CREDIT_PRESETS.map((amt) => (
              <button
                key={amt}
                onClick={() => setCreditAmt(amt)}
                className={`px-3 py-2 rounded-lg text-xs font-black transition-all ${
                  creditAmt === amt
                    ? "bg-white text-[#23596A]"
                    : "bg-white/15 text-white hover:bg-white/25"
                }`}
              >
                ${amt / 100}
              </button>
            ))}
          </div>
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                const res = await requestCredits(creditAmt);
                if ("error" in res && res.error) {
                  refresh(res.error);
                  return;
                }
                refresh(
                  `Got it — we'll text you a secure Square link for $${creditAmt / 100}.`,
                );
              })
            }
            className="mt-3 inline-flex items-center gap-2 text-xs font-black px-4 py-2.5 rounded-xl bg-white hover:bg-white/90 disabled:opacity-50"
            style={{ color: BRAND.blueDeep }}
          >
            <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="6" width="18" height="12" rx="2" />
              <path d="M3 10 L21 10" />
              <path d="M7 14 L11 14" />
            </svg>
            {`Request $${creditAmt / 100} credits — we'll text you a Square link`}
          </button>
          <p className="text-[10px] text-white/60 mt-2 leading-relaxed">
            We&apos;ll text a <strong>secure Square payment link</strong> to{" "}
            {user.phone ?? "your phone on file"}. Once paid, credits land in
            your wallet automatically.
          </p>
        </div>
      </section>

      {/* À-la-carte services */}
      <section
        className="rounded-3xl p-6"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "var(--shadow-cream-sm)",
        }}
      >
        <h3
          className="font-black text-xs uppercase tracking-[0.16em]"
          style={{ color: BRAND.ink }}
        >
          À-la-carte Services
        </h3>
        <p className="text-[11px] mt-1" style={{ color: BRAND.inkFaint }}>
          Pay-as-you-go from your credits balance. No surprise charges.
        </p>

        <ul className="mt-4 divide-y" style={{ borderColor: BRAND.border }}>
          {SERVICES.map((s) => (
            <li
              key={s.id}
              className="py-4 flex items-start justify-between gap-3 flex-wrap"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <span className="shrink-0 mt-0.5">{s.svg}</span>
                <div className="min-w-0">
                  <p
                    className="text-sm font-black"
                    style={{ color: BRAND.ink }}
                  >
                    {s.title}{" "}
                    <span
                      className="text-[11px] font-bold ml-1"
                      style={{ color: BRAND.blue }}
                    >
                      {s.price}
                    </span>
                  </p>
                  <p
                    className="text-[11px] mt-0.5"
                    style={{ color: BRAND.inkSoft }}
                  >
                    {s.desc}
                  </p>
                </div>
              </div>
              <a
                href={`#${s.href}`}
                onClick={(e) => {
                  e.preventDefault();
                  // Reuse existing tab nav by emitting a custom event the
                  // dashboard listens to. Falls back to in-page anchor.
                  window.dispatchEvent(
                    new CustomEvent("noho:navTab", { detail: s.href }),
                  );
                }}
                className="text-[11px] font-black px-3 py-1.5 rounded-lg shrink-0"
                style={{
                  background: BRAND.blueSoft,
                  color: BRAND.blueDeep,
                  border: `1px solid ${BRAND.border}`,
                }}
              >
                {s.cta} →
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Vacation Mode */}
      <section
        className="rounded-3xl p-6"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "var(--shadow-cream-sm)",
        }}
      >
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3
              className="font-black text-xs uppercase tracking-[0.16em]"
              style={{ color: BRAND.ink }}
            >
              Vacation Mode <span className="text-[11px]" style={{ color: "var(--color-success)" }}>FREE</span>
            </h3>
            <p className="text-[11px] mt-1" style={{ color: BRAND.inkFaint }}>
              Auto-hold mail, daily digest, batch resume.
            </p>
          </div>
          {vacation ? (
            <span
              className="text-[11px] font-black px-3 py-1 rounded-full uppercase tracking-[0.10em]"
              style={{ background: "var(--color-success)", color: "white" }}
            >
              ON · {vacation.startDate} → {vacation.endDate}
            </span>
          ) : null}
        </div>

        {vacation ? (
          <button
            disabled={isPending}
            onClick={() =>
              startTransition(async () => {
                await cancelVacationHold();
                refresh("Vacation Mode turned off");
              })
            }
            className="mt-4 px-4 py-2 rounded-xl text-xs font-black"
            style={{
              background: BRAND.blueSoft,
              color: BRAND.blueDeep,
              border: `1px solid ${BRAND.border}`,
            }}
          >
            Turn off Vacation Mode
          </button>
        ) : !vacOpen ? (
          <button
            onClick={() => setVacOpen(true)}
            className="mt-4 px-4 py-2 rounded-xl text-xs font-black text-white"
            style={{
              background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
            }}
          >
            Set Vacation dates
          </button>
        ) : (
          <form
            className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!vacStart || !vacEnd) {
                refresh("Pick start and end dates");
                return;
              }
              startTransition(async () => {
                await setVacationHold({
                  startDate: vacStart,
                  endDate: vacEnd,
                  digest: vacDigest,
                });
                setVacOpen(false);
                refresh("Vacation Mode set");
              });
            }}
          >
            <input
              type="date"
              value={vacStart}
              onChange={(e) => setVacStart(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm"
              style={{
                background: BRAND.blueSoft,
                border: `1px solid ${BRAND.border}`,
                color: BRAND.ink,
              }}
              required
            />
            <input
              type="date"
              value={vacEnd}
              onChange={(e) => setVacEnd(e.target.value)}
              className="rounded-xl px-3 py-2 text-sm"
              style={{
                background: BRAND.blueSoft,
                border: `1px solid ${BRAND.border}`,
                color: BRAND.ink,
              }}
              required
            />
            <button
              type="submit"
              disabled={isPending}
              className="rounded-xl px-4 py-2 text-xs font-black text-white disabled:opacity-50"
              style={{
                background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
              }}
            >
              Save
            </button>
            <label
              className="col-span-1 sm:col-span-3 flex items-center gap-2 text-[11px]"
              style={{ color: BRAND.inkSoft }}
            >
              <input
                type="checkbox"
                checked={vacDigest}
                onChange={(e) => setVacDigest(e.target.checked)}
              />
              Send me a daily digest of arrivals while I&apos;m away
            </label>
          </form>
        )}
      </section>

      {/* Add a second user */}
      <section
        className="rounded-3xl p-6"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "var(--shadow-cream-sm)",
        }}
      >
        <h3
          className="font-black text-xs uppercase tracking-[0.16em]"
          style={{ color: BRAND.ink }}
        >
          👥 Add a second user{" "}
          <span className="text-[10px] text-[color:var(--color-success)]">FREE</span>
        </h3>
        <p className="text-[11px] mt-1" style={{ color: BRAND.inkFaint }}>
          Give a family member or business partner read access to your mailbox.
          They need a NOHO account first — have them sign up at{" "}
          <code style={{ color: BRAND.blue }}>/signup</code>.
        </p>

        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!secondUserEmail) return;
            startTransition(async () => {
              const res = await grantSharedAccess(secondUserEmail.trim());
              if ("error" in res && res.error) {
                refresh(res.error);
                return;
              }
              setSecondUserEmail("");
              refresh(`Granted access to ${res.sharedWith ?? secondUserEmail}`);
            });
          }}
        >
          <input
            type="email"
            value={secondUserEmail}
            onChange={(e) => setSecondUserEmail(e.target.value)}
            placeholder="their@email.com"
            className="flex-1 min-w-[200px] rounded-xl px-3 py-2 text-sm"
            style={{
              background: BRAND.blueSoft,
              border: `1px solid ${BRAND.border}`,
              color: BRAND.ink,
            }}
            required
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-xs font-black text-white disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
            }}
          >
            Grant access
          </button>
        </form>
      </section>

      {/* Junk mail block */}
      <section
        className="rounded-3xl p-6"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "var(--shadow-cream-sm)",
        }}
      >
        <h3
          className="font-black text-xs uppercase tracking-[0.16em]"
          style={{ color: BRAND.ink }}
        >
          Junk Mail Block{" "}
          <span className="text-[11px]" style={{ color: "var(--color-success)" }}>FREE</span>
        </h3>
        <p className="text-[11px] mt-1" style={{ color: BRAND.inkFaint }}>
          Senders you add here are auto-hidden from your inbox. We still log
          them in case you ever want to look back.
        </p>

        <form
          className="mt-3 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            const v = newJunk.trim();
            if (!v) return;
            startTransition(async () => {
              const res = await addJunkSender(v);
              if ("error" in res && res.error) {
                refresh(res.error);
                return;
              }
              setNewJunk("");
              refresh(`Blocked "${v}"`);
            });
          }}
        >
          <input
            value={newJunk}
            onChange={(e) => setNewJunk(e.target.value)}
            placeholder="Sender name or address (partial match)"
            className="flex-1 min-w-[200px] rounded-xl px-3 py-2 text-sm"
            style={{
              background: BRAND.blueSoft,
              border: `1px solid ${BRAND.border}`,
              color: BRAND.ink,
            }}
          />
          <button
            type="submit"
            disabled={isPending}
            className="rounded-xl px-4 py-2 text-xs font-black text-white disabled:opacity-50"
            style={{
              background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
            }}
          >
            Block
          </button>
        </form>

        {junkSenders.length > 0 && (
          <ul className="mt-4 flex flex-wrap gap-2">
            {junkSenders.map((j) => (
              <li
                key={j.id}
                className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs"
                style={{
                  background: BRAND.blueSoft,
                  border: `1px solid ${BRAND.border}`,
                  color: BRAND.ink,
                }}
              >
                <span className="font-bold">{j.sender}</span>
                <button
                  onClick={() =>
                    startTransition(async () => {
                      await removeJunkSender(j.id);
                      refresh(`Unblocked "${j.sender}"`);
                    })
                  }
                  className="text-[10px] font-black"
                  style={{ color: "var(--color-danger)" }}
                  aria-label="Remove"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
