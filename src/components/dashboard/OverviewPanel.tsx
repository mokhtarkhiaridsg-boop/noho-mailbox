"use client";

import Link from "next/link";
import { BRAND, type DashboardUser, type MailItem, type Thread, type WalletTxn } from "./types";
import { DashCard, MetricCard, DashButton, StatusPill, SectionHeader, EmptyState } from "./ui";
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
} from "@/components/MemberIcons";
import { AiEnvelope, AiSparkle } from "@/components/AnimatedIcons";

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

  return (
    <div className="space-y-5 sm:space-y-6">
      {/* Metric cards — Wallet, Plan, Pending, Unread */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <MetricCard
          tone="accent"
          Icon={IconWallet}
          label="Wallet"
          value={formatDollars(user.walletBalanceCents)}
          caption={
            <button
              onClick={() => setActiveTab("wallet")}
              className="inline-flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.10em] mt-0.5 underline-offset-2 hover:underline"
              style={{ color: BRAND.cream }}
            >
              Top up
              <IconChevron className="w-3 h-3" />
            </button>
          }
        />
        <MetricCard
          tone={planTone}
          Icon={IconClock}
          label="Plan"
          value={planValue}
          caption={planCaption}
          onClick={() => setActiveTab("settings")}
        />
        <MetricCard
          Icon={IconBell}
          label="Pending"
          value={pendingActions}
          caption={pendingActions === 0 ? "All caught up" : pendingActions === 1 ? "action in progress" : "actions in progress"}
          onClick={() => setActiveTab("mail")}
        />
        <MetricCard
          Icon={IconMessage}
          label="Messages"
          value={unreadChats}
          caption={unreadChats === 0 ? "No new messages" : unreadChats === 1 ? "unread thread" : "unread threads"}
          onClick={() => setActiveTab("messages")}
        />
      </div>

      {/* Quick actions — 3 CTAs aligned to brand */}
      <DashCard variant="cream" padding="lg">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p
              className="text-[11px] font-black uppercase tracking-[0.18em]"
              style={{ color: BRAND.blue }}
            >
              Quick actions
            </p>
            <h3
              className="text-lg sm:text-xl font-black mt-1"
              style={{ color: BRAND.ink, fontFamily: "var(--font-baloo), sans-serif" }}
            >
              What would you like to do?
            </h3>
          </div>
          <AiSparkle className="w-7 h-7 hidden sm:block" style={{ color: BRAND.blue }} />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <DashButton
            variant="primary"
            size="lg"
            block
            onClick={() => setActiveTab("wallet")}
          >
            <IconWallet className="w-4 h-4" />
            Top up wallet
          </DashButton>
          <DashButton
            variant="secondary"
            size="lg"
            block
            onClick={() => setActiveTab("forwarding")}
          >
            <IconForward className="w-4 h-4" />
            Forward mail
          </DashButton>
          <DashButton
            variant="secondary"
            size="lg"
            block
            onClick={() => setActiveTab("deliveries")}
          >
            <IconTruck className="w-4 h-4" />
            Schedule delivery
          </DashButton>
          <DashButton
            variant="secondary"
            size="lg"
            block
            onClick={() => setActiveTab("shipping")}
          >
            <IconForward className="w-4 h-4" />
            My shipments
          </DashButton>
        </div>
      </DashCard>

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
