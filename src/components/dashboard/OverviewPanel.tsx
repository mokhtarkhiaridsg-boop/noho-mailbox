"use client";

import Link from "next/link";
import { motion, useMotionValue, useTransform, animate } from "motion/react";
import { useEffect } from "react";
import { BRAND, type DashboardUser, type MailItem, type Thread, type WalletTxn } from "./types";
import { DashCard, DashButton, StatusPill, SectionHeader, EmptyState } from "./ui";
import {
  IconWallet,
  IconClock,
  IconBell,
  IconMessage,
  IconForward,
  IconTruck,
  IconChevron,
  IconMail,
  IconPackage,
  IconScan,
} from "@/components/MemberIcons";
import { AiEnvelope } from "@/components/AnimatedIcons";

// Animated number counter — counts up from 0 to value over 600ms with a
// spring-damped tween. Used in the metric cards so big numbers feel earned
// rather than just flashing in. Pure motion, no extra renders.
function AnimatedNumber({
  value,
  format,
  duration = 0.7,
}: {
  value: number;
  format?: (n: number) => string;
  duration?: number;
}) {
  const mv = useMotionValue(0);
  const display = useTransform(mv, (v) => (format ? format(v) : Math.round(v).toString()));
  useEffect(() => {
    const controls = animate(mv, value, { duration, ease: [0.22, 1, 0.36, 1] });
    return controls.stop;
  }, [mv, value, duration]);
  return <motion.span>{display}</motion.span>;
}

// ─── Branded Mailbox SVG (matching the brand icon) ───────────────────────
// Compact illustration anchored on the left side of the hero. Shows live
// state: flag rises when there's mail, mail count badged on the side,
// suite number printed on the front. Hover lifts the door slightly.
function BrandMailbox({
  mailCount,
  suiteNumber,
}: {
  mailCount: number;
  suiteNumber: string | null;
}) {
  const hasMail = mailCount > 0;
  return (
    <motion.svg
      viewBox="0 0 220 200"
      width="100%"
      height="100%"
      role="img"
      aria-label={`Your mailbox · ${mailCount} item${mailCount === 1 ? "" : "s"}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -2 }}
    >
      {/* Post (brown) */}
      <rect x="103" y="148" width="14" height="48" rx="2" fill="#2D1D0F" />
      <rect x="105" y="150" width="10" height="44" fill="#5a4318" />
      {/* Ground line */}
      <line x1="60" y1="196" x2="160" y2="196" stroke="#2D1D0F" strokeWidth="2" strokeLinecap="round" opacity="0.18" />
      {/* Mailbox body — rounded-top rectangle, cream fill, brown stroke */}
      <path
        d="M 32 60 Q 32 30 60 30 L 160 30 Q 188 30 188 60 L 188 148 L 32 148 Z"
        fill="#F7EEC2"
        stroke="#2D1D0F"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {/* Front-face inset shadow line (gives the body subtle dimension) */}
      <path
        d="M 38 64 Q 38 36 62 36 L 158 36 Q 182 36 182 64 L 182 142 L 38 142 Z"
        fill="none"
        stroke="rgba(45,29,15,0.10)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
      {/* Door — partial-open angle if mail present */}
      <motion.g
        style={{ transformOrigin: "32px 100px" }}
        animate={{ rotate: hasMail ? -8 : 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
      >
        <path
          d="M 32 60 Q 32 30 60 30 L 110 30 L 110 148 L 32 148 Z"
          fill="#F7EEC2"
          stroke="#2D1D0F"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {/* Door handle */}
        <circle cx="100" cy="100" r="3" fill="#2D1D0F" />
        <circle cx="100" cy="100" r="1.4" fill="#F7EEC2" />
      </motion.g>
      {/* Suite number on the front */}
      {suiteNumber && (
        <text
          x="148"
          y="108"
          textAnchor="middle"
          fontFamily="Georgia, serif"
          fontWeight="900"
          fontSize="22"
          fill="#2D1D0F"
        >
          {suiteNumber}
        </text>
      )}
      {/* Flag — rises when mail present */}
      <motion.g
        style={{ transformOrigin: "188px 80px" }}
        animate={{ rotate: hasMail ? -90 : 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 18, delay: hasMail ? 0.2 : 0 }}
      >
        <rect x="186" y="80" width="4" height="46" fill="#2D1D0F" />
        <path
          d="M 190 80 L 215 80 L 215 100 L 200 100 L 195 110 L 190 100 Z"
          fill="#337485"
          stroke="#2D1D0F"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {/* Heart on flag */}
        <path
          d="M 198 86 a 2 2 0 0 1 4 0 a 2 2 0 0 1 4 0 q 0 3 -4 6 q -4 -3 -4 -6 Z"
          fill="#F7EEC2"
        />
      </motion.g>
      {/* Mail count badge — only when mail present */}
      {hasMail && (
        <motion.g
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 280, damping: 18, delay: 0.4 }}
        >
          <circle cx="172" cy="46" r="18" fill="#337485" stroke="#F7EEC2" strokeWidth="3" />
          <text
            x="172"
            y="53"
            textAnchor="middle"
            fontFamily="system-ui, sans-serif"
            fontWeight="900"
            fontSize="17"
            fill="#F7EEC2"
          >
            {mailCount > 99 ? "99+" : mailCount}
          </text>
        </motion.g>
      )}
    </motion.svg>
  );
}

type Props = {
  user: DashboardUser;
  mailItems: MailItem[];
  threads: Thread[];
  stats: { totalMail: number; unread: number; packages: number; forwarded: number };
  walletTxns: WalletTxn[];
  setActiveTab: (id: string) => void;
  shippingLabels?: Array<{
    id: string;
    carrier: string;
    servicelevel: string;
    trackingNumber: string;
    toName: string;
    toCity: string;
    toState: string;
    status: string;
    createdAt: string;
  }>;
};

function formatDollars(cents: number) {
  const v = cents / 100;
  return `$${v.toFixed(v % 1 === 0 ? 0 : 2)}`;
}

function planDaysRemaining(planDueDate: string | null): number | null {
  if (!planDueDate) return null;
  const due = new Date(planDueDate);
  if (isNaN(due.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  return Math.round((due.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
}

const UPSELL = [
  { title: "LLC Formation", desc: "From $99 + state fee", slug: "llc" },
  { title: "Same-Day Delivery", desc: "From $5 in NoHo", slug: "delivery" },
  { title: "Online Notary", desc: "RON appointments", slug: "notary" },
  { title: "Phone & Fax", desc: "Local & toll-free", slug: "phone" },
];

export default function OverviewPanel({
  user,
  mailItems,
  threads,
  stats: _stats,
  walletTxns: _walletTxns,
  setActiveTab,
  shippingLabels = [],
}: Props) {
  // Most-recent shipment for the at-a-glance tile. Only shown when there's at
  // least one — keeps the Overview tight for first-day members.
  const latestShipment = shippingLabels[0] ?? null;
  const pendingActions = mailItems.filter((m) =>
    m.status.toLowerCase().includes("requested")
  ).length;
  const unreadChats = threads.filter((t) => t.unread).length;
  const daysLeft = planDaysRemaining(user.planDueDate);
  const latestMail = mailItems.slice(0, 3);

  const planTone: "default" | "warning" | "danger" =
    daysLeft === null ? "default" : daysLeft < 0 ? "danger" : daysLeft <= 7 ? "danger" : daysLeft <= 14 ? "warning" : "default";
  // When daysLeft is null (no due date set yet, or an admin/no-plan user),
  // showing a literal `—` as the stat value reads as "missing data" rather
  // than a real status. Fall back to the plan name itself so the card always
  // says something meaningful — was flagged in the iter-15 Chrome audit.
  const planValue =
    daysLeft === null
      ? user.plan ?? "Free"
      : daysLeft < 0
      ? "Expired"
      : daysLeft === 0
      ? "Today"
      : `${daysLeft}d`;
  const planCaption =
    daysLeft === null
      ? user.plan ? "Active member" : "No active plan"
      : daysLeft < 0
      ? "Renew to restore service"
      : `until renewal · ${user.plan ?? "Plan"}`;

  // ─── Smart Actions — contextual, anticipatory ─────────────────────────
  // Replaces the old static "What would you like to do?" prompt. The first
  // action is the most-likely one given the user's current state; the rest
  // are evergreen. Rule of thumb: actions should anticipate the next click
  // the user would have made anyway.
  const totalMailCount = mailItems.length;
  const unreadMailCount = mailItems.filter((m) => !m.scanned && m.type !== "Package").length;
  const undeliveredPackages = mailItems.filter((m) => m.type === "Package" && m.status === "Awaiting Pickup").length;
  const lowWallet = user.walletBalanceCents < 500;
  const renewingSoon = daysLeft !== null && daysLeft <= 14;

  const smartActions = [
    // Smart slot 1: most urgent / contextual action
    ...(unreadMailCount > 0
      ? [{
          icon: IconScan,
          title: "Scan new mail",
          subtitle: `${unreadMailCount} item${unreadMailCount === 1 ? "" : "s"} waiting`,
          onClick: () => setActiveTab("mail"),
          tone: "accent" as const,
        }]
      : undeliveredPackages > 0
      ? [{
          icon: IconPackage,
          title: "Schedule pickup",
          subtitle: `${undeliveredPackages} package${undeliveredPackages === 1 ? "" : "s"} ready`,
          onClick: () => setActiveTab("packages"),
          tone: "accent" as const,
        }]
      : renewingSoon
      ? [{
          icon: IconClock,
          title: "Renew membership",
          subtitle: `${daysLeft}d until renewal`,
          onClick: () => setActiveTab("settings"),
          tone: "accent" as const,
        }]
      : lowWallet
      ? [{
          icon: IconWallet,
          title: "Top up wallet",
          subtitle: `${formatDollars(user.walletBalanceCents)} available`,
          onClick: () => setActiveTab("wallet"),
          tone: "accent" as const,
        }]
      : [{
          icon: IconForward,
          title: "Forward mail",
          subtitle: "Send to any address",
          onClick: () => setActiveTab("forwarding"),
          tone: "accent" as const,
        }]),
    // Slot 2-4: evergreen
    { icon: IconForward, title: "Forward mail",     subtitle: "To any address",  onClick: () => setActiveTab("forwarding"), tone: "default" as const },
    { icon: IconTruck,   title: "Same-day delivery", subtitle: "From $5 in NoHo",  onClick: () => setActiveTab("deliveries"), tone: "default" as const },
    { icon: IconWallet,  title: "Top up wallet",     subtitle: formatDollars(user.walletBalanceCents) + " balance", onClick: () => setActiveTab("wallet"),    tone: "default" as const },
  ]
    // Dedupe by title (in case the contextual action duplicates an evergreen)
    .filter((a, i, arr) => arr.findIndex((b) => b.title === a.title) === i)
    .slice(0, 4);

  return (
    <div className="space-y-5 sm:space-y-7">
      {/* ─── Hero Panel ──────────────────────────────────────────────────
          Single unified above-the-fold band combining: branded mailbox
          illustration (left) with live state, smart contextual actions
          (right) that anticipate the next click. Replaces the inconsistent
          stat-card row + "What would you like to do?" prompt with one
          coherent surface. */}
      <motion.section
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="relative overflow-hidden rounded-3xl"
        style={{
          background: "linear-gradient(180deg, #FFFCF3 0%, #FBFAF6 100%)",
          border: "1px solid rgba(45,29,15,0.08)",
        }}
      >
        <div className="grid grid-cols-1 md:grid-cols-[260px_1fr] gap-6 sm:gap-8 p-5 sm:p-7">
          {/* Branded mailbox illustration */}
          <div className="flex items-center justify-center md:justify-start">
            <div className="w-full max-w-[240px]">
              <BrandMailbox mailCount={totalMailCount} suiteNumber={user.suiteNumber} />
            </div>
          </div>
          {/* Smart actions — 4 contextual cards */}
          <div className="flex flex-col">
            <p
              className="text-[10px] font-semibold uppercase tracking-[0.22em] mb-1"
              style={{ color: "#337485" }}
            >
              Smart Actions
            </p>
            <h2
              className="text-xl sm:text-2xl tracking-tight mb-5"
              style={{
                color: "#2D1D0F",
                fontFamily: "var(--font-baloo), system-ui, sans-serif",
                fontWeight: 800,
              }}
            >
              {unreadMailCount > 0
                ? `You have ${unreadMailCount} new ${unreadMailCount === 1 ? "letter" : "letters"}`
                : undeliveredPackages > 0
                ? `${undeliveredPackages} ${undeliveredPackages === 1 ? "package is" : "packages are"} ready`
                : renewingSoon
                ? "Your plan needs attention"
                : "Everything's in order."}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-2.5">
              {smartActions.map((action, idx) => {
                const Icon = action.icon;
                const isAccent = action.tone === "accent";
                return (
                  <motion.button
                    key={action.title}
                    onClick={action.onClick}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.32, delay: 0.08 + idx * 0.04, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    className="group relative flex items-center gap-3 px-3.5 py-3 rounded-xl text-left transition-colors"
                    style={{
                      background: isAccent ? "#337485" : "white",
                      color: isAccent ? "#F7EEC2" : "#2D1D0F",
                      border: isAccent ? "none" : "1px solid rgba(45,29,15,0.10)",
                    }}
                  >
                    <span
                      className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{
                        background: isAccent ? "rgba(247,238,194,0.18)" : "rgba(51,116,133,0.08)",
                      }}
                    >
                      <Icon
                        className="w-[18px] h-[18px]"
                        style={{ color: isAccent ? "#F7EEC2" : "#337485" }}
                        strokeWidth={1.8}
                      />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="block text-[13px] font-semibold leading-tight truncate">
                        {action.title}
                      </span>
                      <span
                        className="block text-[11px] mt-0.5 leading-tight truncate"
                        style={{ color: isAccent ? "rgba(247,238,194,0.7)" : "rgba(45,29,15,0.55)" }}
                      >
                        {action.subtitle}
                      </span>
                    </span>
                    <IconChevron
                      className="w-3 h-3 shrink-0 transition-transform group-hover:translate-x-0.5"
                      style={{ color: isAccent ? "rgba(247,238,194,0.7)" : "rgba(45,29,15,0.4)" }}
                    />
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </motion.section>

      {/* ─── Unified Stat Strip ──────────────────────────────────────────
          4 metric cards, all with consistent visual weight (no more 1-black
          / 3-white split). Numbers count up via framer motion useTransform
          on tab focus. Each card is clickable and routes to its tab. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        {[
          {
            id: "wallet",
            Icon: IconWallet,
            label: "Wallet",
            renderValue: (
              <AnimatedNumber
                value={user.walletBalanceCents}
                format={(n) => formatDollars(Math.round(n))}
              />
            ),
            sub: "Available",
          },
          {
            id: "settings",
            Icon: IconClock,
            label: "Plan",
            renderValue: <span>{planValue}</span>,
            sub: planCaption,
            tone: planTone,
          },
          {
            id: "mail",
            Icon: IconBell,
            label: "Pending",
            renderValue: <AnimatedNumber value={pendingActions} />,
            sub: pendingActions === 0 ? "All caught up" : pendingActions === 1 ? "action in progress" : "actions in progress",
          },
          {
            id: "messages",
            Icon: IconMessage,
            label: "Messages",
            renderValue: <AnimatedNumber value={unreadChats} />,
            sub: unreadChats === 0 ? "No new messages" : unreadChats === 1 ? "unread thread" : "unread threads",
          },
        ].map((card, idx) => {
          const tone = (card as { tone?: string }).tone;
          const isWarn = tone === "warning" || tone === "danger";
          return (
            <motion.button
              key={card.id}
              onClick={() => setActiveTab(card.id)}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.32, delay: 0.05 * idx, ease: [0.22, 1, 0.36, 1] }}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.99 }}
              className="text-left rounded-2xl p-4 sm:p-5"
              style={{
                background: "white",
                border: isWarn
                  ? `1px solid ${tone === "danger" ? "rgba(239,68,68,0.30)" : "rgba(245,158,11,0.30)"}`
                  : "1px solid rgba(45,29,15,0.08)",
              }}
            >
              <div className="flex items-center gap-2 mb-2.5">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(51,116,133,0.08)" }}
                >
                  <card.Icon className="w-[14px] h-[14px]" style={{ color: "#337485" }} strokeWidth={1.8} />
                </span>
                <span
                  className="text-[10px] font-semibold uppercase tracking-[0.18em]"
                  style={{ color: "rgba(45,29,15,0.55)" }}
                >
                  {card.label}
                </span>
              </div>
              <div
                className="text-2xl sm:text-3xl tabular-nums tracking-tight"
                style={{
                  color: isWarn
                    ? tone === "danger"
                      ? "var(--color-danger)"
                      : "var(--color-warning)"
                    : "#2D1D0F",
                  fontFamily: "var(--font-baloo), system-ui, sans-serif",
                  fontWeight: 800,
                }}
              >
                {card.renderValue}
              </div>
              <div
                className="text-[11px] mt-1 leading-tight"
                style={{ color: "rgba(45,29,15,0.55)" }}
              >
                {card.sub}
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Most-recent shipment — single-line at-a-glance card. Only renders
          when there's at least one shipment so first-day members see a clean
          dashboard. */}
      {latestShipment && (
        <DashCard padding="md">
          <button
            type="button"
            onClick={() => setActiveTab("shipping")}
            className="w-full flex items-center justify-between gap-3 text-left"
          >
            <div className="flex items-center gap-3 min-w-0">
              <span
                className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black"
                style={{
                  background: latestShipment.carrier.toLowerCase().includes("usps")
                    ? "linear-gradient(135deg, #2D5BA8, #1c3f7a)"
                    : latestShipment.carrier.toLowerCase().includes("ups")
                      ? "linear-gradient(135deg, #6B3F1A, #3F2410)"
                      : latestShipment.carrier.toLowerCase().includes("fedex")
                        ? "linear-gradient(135deg, #4D148C, #2E0A57)"
                        : latestShipment.carrier.toLowerCase().includes("dhl")
                          ? "#FFCC00"
                          : "linear-gradient(135deg, #337485, #23596A)",
                  color: latestShipment.carrier.toLowerCase().includes("ups")
                    ? "#FFC107"
                    : latestShipment.carrier.toLowerCase().includes("fedex")
                      ? "#FF6600"
                      : latestShipment.carrier.toLowerCase().includes("dhl")
                        ? "#D40511"
                        : latestShipment.carrier.toLowerCase().includes("usps")
                          ? "#fff"
                          : BRAND.cream,
                }}
                aria-hidden="true"
              >
                {latestShipment.carrier.toLowerCase().includes("usps") ? "USPS"
                  : latestShipment.carrier.toLowerCase().includes("ups") ? "UPS"
                  : latestShipment.carrier.toLowerCase().includes("fedex") ? "FedEx"
                  : latestShipment.carrier.toLowerCase().includes("dhl") ? "DHL"
                  : latestShipment.carrier.slice(0, 3).toUpperCase()}
              </span>
              <div className="min-w-0">
                <p className="text-[10.5px] font-black uppercase tracking-wider" style={{ color: BRAND.blueDeep }}>
                  Latest shipment
                </p>
                <p className="text-sm font-black truncate" style={{ color: BRAND.ink }}>
                  {latestShipment.toName} <span style={{ color: BRAND.inkSoft, fontWeight: 600 }}>· {latestShipment.toCity}, {latestShipment.toState}</span>
                </p>
                <p className="text-[10.5px] font-mono" style={{ color: BRAND.blueDeep }}>
                  {latestShipment.trackingNumber} <span style={{ color: BRAND.inkFaint }}>· {latestShipment.createdAt}</span>
                </p>
              </div>
            </div>
            <span className="shrink-0 text-[11px] font-black flex items-center gap-1" style={{ color: BRAND.blue }}>
              View all
              <IconChevron className="w-3 h-3" />
            </span>
          </button>
        </DashCard>
      )}

      {/* Latest mail — quick peek with link to full list */}
      <DashCard padding="none">
        <SectionHeader
          Icon={IconMail}
          title="Latest mail"
          caption={mailItems.length === 0 ? "Nothing yet — we'll alert you when mail arrives." : `${mailItems.length} item${mailItems.length === 1 ? "" : "s"} in your box`}
          action={
            mailItems.length > 0 ? (
              <DashButton variant="ghost" size="sm" onClick={() => setActiveTab("mail")}>
                View all
                <IconChevron className="w-3 h-3" />
              </DashButton>
            ) : undefined
          }
        />
        {latestMail.length === 0 ? (
          <EmptyState
            Icon={AiEnvelope}
            title="Your box is empty"
            body="When new mail arrives we'll scan the exterior and notify you instantly."
          />
        ) : (
          <ul className="divide-y" style={{ borderColor: BRAND.border }}>
            {latestMail.map((m) => (
              <li
                key={m.id}
                className="flex items-center gap-3 px-4 sm:px-6 py-3 hover:bg-[var(--color-cream)]/40 transition-colors cursor-pointer"
                onClick={() => setActiveTab("mail")}
              >
                {m.exteriorImageUrl ? (
                  // Real photo thumbnail when admin captured one — same UX as
                  // the full Mail / Packages panels for visual recognition.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.exteriorImageUrl}
                    alt=""
                    className="w-10 h-10 rounded-2xl object-cover shrink-0"
                    style={{ border: `1px solid ${BRAND.border}` }}
                  />
                ) : (
                  <span
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: BRAND.bgDeep, color: BRAND.blue }}
                  >
                    {m.type === "Package" ? (
                      <IconPackage className="w-5 h-5" />
                    ) : (
                      <IconMail className="w-5 h-5" />
                    )}
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-bold truncate"
                    style={{ color: BRAND.ink }}
                  >
                    {m.from || "Unknown sender"}
                  </p>
                  <p className="text-[11px] truncate" style={{ color: BRAND.inkSoft }}>
                    {m.type} · {m.date}
                  </p>
                </div>
                <StatusPill status={m.status} />
              </li>
            ))}
          </ul>
        )}
      </DashCard>

      {/* Cross-sell upsells — moved from the global shell */}
      <div>
        <p
          className="text-[11px] font-black uppercase tracking-[0.18em] mb-3 px-1"
          style={{ color: BRAND.blue }}
        >
          Add on
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
          {UPSELL.map((c) => (
            <Link
              key={c.slug}
              href={`/business-solutions#${c.slug}`}
              className="group rounded-2xl p-3 sm:p-4 transition-transform hover:-translate-y-1"
              style={{
                background: BRAND.card,
                border: `1px solid ${BRAND.border}`,
                boxShadow: "var(--shadow-cream-sm)",
              }}
            >
              <div className="flex items-center justify-between">
                <p
                  className="text-[12px] font-black"
                  style={{ color: BRAND.ink }}
                >
                  {c.title}
                </p>
                <IconChevron
                  className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
                  style={{ color: BRAND.blue }}
                />
              </div>
              <p className="text-[11px] mt-1" style={{ color: BRAND.inkSoft }}>
                {c.desc}
              </p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
