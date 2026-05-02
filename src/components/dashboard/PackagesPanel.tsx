"use client";

import { useState } from "react";
import { BRAND, type MailItem } from "./types";
import { IconPackage, IconForward } from "@/components/MemberIcons";
import { requestPickup, requestForward, requestQuickPeek } from "@/app/actions/mail";
import InsuranceModal from "./InsuranceModal";
import SharePackageButton from "./SharePackageButton";
import { EmptyState } from "./ui";

type Props = {
  packages: MailItem[];
  // iter-51: Last 7 days of picked-up packages so the customer has a
  // confirmation in the dashboard matching the email they got.
  recentlyPickedUp?: MailItem[];
  isPending: boolean;
  runAction: (label: string, fn: () => Promise<unknown>) => void;
};

// iter-94: Live carrier-tracking chip. Color + label depend on status.
function TrackingChip({ ts }: { ts: NonNullable<MailItem["trackingStatus"]> }) {
  const k = ts.statusKey ?? "";
  const styles: Record<string, { bg: string; fg: string; label: string }> = {
    delivered:        { bg: "rgba(22,163,74,0.14)",  fg: "#15803d", label: "Delivered" },
    out_for_delivery: { bg: "rgba(245,166,35,0.16)", fg: "#92400e", label: "Out for delivery" },
    in_transit:       { bg: "rgba(51,116,133,0.12)", fg: "#23596A", label: "In transit" },
    pre_transit:      { bg: "rgba(45,16,15,0.06)",   fg: "rgba(45,16,15,0.55)", label: "Label created" },
    exception:        { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b", label: "Exception" },
    unknown:          { bg: "rgba(45,16,15,0.06)",   fg: "rgba(45,16,15,0.55)", label: ts.statusLabel ?? "Tracking" },
  };
  const s = styles[k] ?? { bg: "rgba(45,16,15,0.06)", fg: "rgba(45,16,15,0.55)", label: ts.statusLabel ?? k };
  const tooltip = [s.label, ts.location, ts.etaIso ? `ETA ${new Date(ts.etaIso).toLocaleString()}` : null].filter(Boolean).join(" · ");
  return (
    <span
      className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
      style={{ background: s.bg, color: s.fg }}
      title={tooltip}
    >
      {s.label}
    </span>
  );
}

// iter-80: Storage-tier countdown chip. NOHO offers 3 free days of
// storage, then $6.50/day from day 4 (per Terms). The chip nudges
// customers to come pick up before the fee starts.
function StorageChip({ createdAtIso }: { createdAtIso?: string }) {
  if (!createdAtIso) return null;
  const t = Date.parse(createdAtIso);
  if (!Number.isFinite(t)) return null;
  const days = Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
  if (days < 4) {
    const remaining = 3 - days; // day 0..3 → 3..0 days remaining
    if (remaining <= 0) {
      return (
        <span
          className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
          style={{ background: "rgba(245,166,35,0.14)", color: "#92400e" }}
          title="Storage fee starts tomorrow ($6.50/day per Terms)."
        >
          Last free day
        </span>
      );
    }
    return (
      <span
        className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
        style={{ background: "rgba(22,163,74,0.10)", color: "#15803d" }}
        title={`Storage starts on day 4 ($6.50/day per Terms). You have ${remaining} free day${remaining === 1 ? "" : "s"} left.`}
      >
        Free · {remaining}d left
      </span>
    );
  }
  // Day 4+ — fee active. Day-4 = $6.50, day-5 = $13, etc.
  const billable = days - 3;
  const owedCents = billable * 650;
  return (
    <span
      className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
      style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}
      title={`Storage fee active since day 4. Per Terms, $6.50/day × ${billable} day${billable === 1 ? "" : "s"} = $${(owedCents / 100).toFixed(2)} owed at pickup.`}
    >
      Storage · ${(owedCents / 100).toFixed(2)}
    </span>
  );
}

export default function PackagesPanel({ packages, recentlyPickedUp = [], isPending, runAction }: Props) {
  // iter-91: Insurance modal opened for one package at a time. Refresh
  // signal increments after a successful declare so the dashboard's
  // server-data revalidates (router.refresh is run by runAction).
  const [insureFor, setInsureFor] = useState<MailItem | null>(null);

  return (
    <div className="space-y-3">
    <div
      className="rounded-3xl overflow-hidden"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      <div
        className="px-6 py-4 flex items-center gap-2.5"
        style={{ borderBottom: `1px solid ${BRAND.border}` }}
      >
        <IconPackage className="w-4 h-4" style={{ color: BRAND.blue }} />
        <h2 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
          Packages Awaiting You
        </h2>
      </div>
      {packages.length === 0 ? (
        <EmptyState
          tone="calm"
          title="No packages waiting"
          body="We accept packages from USPS, UPS, FedEx, DHL and Amazon. Use your suite number on the address line."
          action={
            <div className="flex flex-wrap gap-2 justify-center">
              <a
                href="/dashboard?tab=deliveries"
                className="px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-colors"
                style={{
                  background: "white",
                  color: "#337485",
                  border: "1px solid rgba(51,116,133,0.20)",
                }}
              >
                Schedule a delivery
              </a>
              <a
                href="/dashboard?tab=qrpickup"
                className="px-3 py-1.5 rounded-full text-[11.5px] font-semibold transition-colors"
                style={{
                  background: "white",
                  color: "#337485",
                  border: "1px solid rgba(51,116,133,0.20)",
                }}
              >
                Set up QR pickup
              </a>
            </div>
          }
        />
      ) : (
        packages.map((pkg) => (
          <div
            key={pkg.id}
            className="group p-4 sm:p-6 transition-colors hover:bg-[#337485]/4"
            style={{ borderBottom: `1px solid ${BRAND.border}` }}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              {pkg.exteriorImageUrl ? (
                // Real photo of the package, captured by admin at scan time.
                // Visual confirmation for the customer that yes, this is theirs.
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={pkg.exteriorImageUrl}
                  alt={`Package from ${pkg.from}`}
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover shrink-0 transition-transform duration-300 group-hover:scale-105"
                  style={{
                    border: `1px solid ${BRAND.border}`,
                    boxShadow: "0 6px 18px rgba(51,116,133,0.20)",
                  }}
                />
              ) : (
                <div
                  className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105"
                  style={{
                    background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                    boxShadow: "0 6px 18px rgba(51,116,133,0.32)",
                  }}
                >
                  <IconPackage className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm sm:text-base font-black truncate flex items-center gap-1.5 flex-wrap" style={{ color: BRAND.ink }}>
                  <span className="truncate">{pkg.from}</span>
                  {/* iter-80: Storage-tier countdown chip. Storage fee
                      ($6.50/day per Terms) starts on day 4. Show:
                      - day 0–3: "Free until day N" (green)
                      - day 4+: "Storage active · $X" (red) */}
                  <StorageChip createdAtIso={pkg.createdAt} />
                  {/* iter-91: Insured chip — shown when declaredValueCents > 0. */}
                  {pkg.declaredValueCents != null && pkg.declaredValueCents > 0 && (
                    <span
                      className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                      style={{ background: "rgba(22,163,74,0.14)", color: "#15803d" }}
                      title={`Insured up to $${(pkg.declaredValueCents / 100).toFixed(0)}${pkg.insuranceFeeCents ? ` · paid $${(pkg.insuranceFeeCents / 100).toFixed(2)}` : ""}`}
                    >
                      Insured · ${(pkg.declaredValueCents / 100).toFixed(0)}
                    </span>
                  )}
                  {/* iter-94: Carrier-API status chip. Only shown when
                      we've polled this tracking #. */}
                  {pkg.trackingStatus?.statusKey && (
                    <TrackingChip ts={pkg.trackingStatus} />
                  )}
                </p>
                <p className="text-xs mt-0.5" style={{ color: BRAND.inkSoft }}>
                  Arrived {pkg.date}
                  {pkg.trackingNumber && (
                    <span className="ml-2 font-mono" style={{ color: BRAND.blueDeep }}>· {pkg.trackingNumber}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-3 ml-[60px] sm:ml-[72px]">
              <button
                disabled={isPending}
                onClick={() => runAction("Pickup requested", () => requestPickup(pkg.id))}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black text-white transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{
                  background: `linear-gradient(135deg, ${BRAND.blue}, ${BRAND.blueDeep})`,
                  boxShadow: "0 4px 14px rgba(51,116,133,0.32)",
                }}
              >
                Request Pickup
              </button>
              <button
                disabled={isPending}
                onClick={() => runAction("Forward requested", () => requestForward(pkg.id))}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{
                  background: BRAND.blueSoft,
                  color: BRAND.blueDeep,
                  border: `1px solid ${BRAND.border}`,
                }}
              >
                Forward
              </button>
              {/* iter-93: Share a public tracking page. */}
              <SharePackageButton mailItemId={pkg.id} packageFrom={pkg.from} />
              {/* iter-91: Insure / declare value — opens a modal with
                  tier picker. Updates the chip + wallet on confirm. */}
              <button
                disabled={isPending}
                onClick={() => setInsureFor(pkg)}
                className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all hover:-translate-y-0.5 disabled:opacity-50"
                style={{
                  background: pkg.declaredValueCents ? "rgba(22,163,74,0.10)" : "white",
                  color: pkg.declaredValueCents ? "#15803d" : BRAND.blueDeep,
                  border: `1px solid ${pkg.declaredValueCents ? "rgba(22,163,74,0.40)" : BRAND.border}`,
                }}
                title={pkg.declaredValueCents ? "Update declared value" : "Add insurance"}
              >
                {pkg.declaredValueCents ? `Insured · update` : "Insure"}
              </button>
              {/* iter-81: Quick Peek — only shown when admin didn't capture
                  an exterior photo at intake. $0.50 charged from wallet
                  for an exterior preview scan. Same flow MailPanel uses;
                  surfaces here so the customer doesn't have to switch
                  tabs to find it. */}
              {!pkg.exteriorImageUrl && (
                <button
                  disabled={isPending}
                  onClick={() => {
                    if (!window.confirm("Quick Peek: $0.50 will be charged from your wallet for an exterior preview scan. Continue?")) return;
                    runAction("Quick Peek requested ($0.50)", () => requestQuickPeek(pkg.id));
                  }}
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl text-xs font-black transition-all hover:-translate-y-0.5 disabled:opacity-50"
                  style={{
                    background: "rgba(245,166,35,0.12)",
                    color: "#92400e",
                    border: `1px solid rgba(245,166,35,0.40)`,
                  }}
                  title="Charge $0.50 for an exterior photo of the package"
                >
                  Peek $0.50
                </button>
              )}
            </div>
          </div>
        ))
      )}
    </div>

    {/* iter-51: Recently picked-up section. Confirms the in-person handoff
        the customer just made, mirroring the email they got. Hidden when
        empty so the dashboard isn't cluttered for new members. */}
    {recentlyPickedUp.length > 0 && (
      <div
        className="rounded-3xl overflow-hidden"
        style={{
          background: "white",
          border: `1px solid ${BRAND.border}`,
          boxShadow: "var(--shadow-cream-sm)",
        }}
      >
        <div
          className="px-6 py-4 flex items-center gap-2.5 justify-between"
          style={{ borderBottom: `1px solid ${BRAND.border}` }}
        >
          <div className="flex items-center gap-2.5">
            <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#16A34A", boxShadow: "0 0 6px #16A34A" }} />
            <h2 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
              Recently Picked Up · last 7 days
            </h2>
          </div>
          {/* iter-67: Link to the full paginated history. */}
          <a
            href="/dashboard/pickups"
            className="text-[11px] font-bold"
            style={{ color: BRAND.blueDeep }}
          >
            View all →
          </a>
        </div>
        {recentlyPickedUp.map((pkg) => (
          <div
            key={pkg.id}
            className="p-4 sm:p-5 flex items-center gap-3 sm:gap-4"
            style={{ borderBottom: `1px solid ${BRAND.border}` }}
          >
            {pkg.exteriorImageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={pkg.exteriorImageUrl}
                alt={`Package from ${pkg.from}`}
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover shrink-0"
                style={{ border: `1px solid ${BRAND.border}` }}
              />
            ) : (
              <div
                className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "rgba(22,163,74,0.10)" }}
              >
                <IconPackage className="w-5 h-5" style={{ color: "#16A34A" }} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-black truncate flex items-center gap-1.5" style={{ color: BRAND.ink }}>
                <span className="truncate">{pkg.from}</span>
                <span
                  className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
                  style={{ background: "rgba(22,163,74,0.14)", color: "#15803d" }}
                  title="Handed to you in person"
                >
                  Picked up ✓
                </span>
              </p>
              <p className="text-xs mt-0.5" style={{ color: BRAND.inkSoft }}>
                {pkg.date}
                {pkg.trackingNumber && (
                  <span className="ml-2 font-mono" style={{ color: BRAND.blueDeep }}>· {pkg.trackingNumber}</span>
                )}
              </p>
            </div>
          </div>
        ))}
      </div>
    )}

    {/* iter-91: Insurance modal — single instance per panel, opened
        from the per-row "Insure" button. */}
    {insureFor && (
      <InsuranceModal
        pkg={{
          id: insureFor.id,
          from: insureFor.from,
          carrier: insureFor.carrier ?? null,
          trackingNumber: insureFor.trackingNumber ?? null,
          declaredValueCents: insureFor.declaredValueCents ?? null,
          insuranceFeeCents: insureFor.insuranceFeeCents ?? null,
        }}
        onClose={() => setInsureFor(null)}
        onDone={() => {
          setInsureFor(null);
          // Trigger the dashboard's runAction-style refresh so the chip
          // + wallet update without a full reload.
          runAction("Insurance updated", async () => undefined);
        }}
      />
    )}
    </div>
  );
}
