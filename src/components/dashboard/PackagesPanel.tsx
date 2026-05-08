"use client";

import { useEffect, useState } from "react";
import { BRAND, type MailItem } from "./types";
import { IconPackage, IconForward } from "@/components/MemberIcons";
import { requestPickup, requestForward, requestQuickPeek } from "@/app/actions/mail";
import InsuranceModal from "./InsuranceModal";
import SharePackageButton from "./SharePackageButton";
import StorageFeeDisputeButton from "./StorageFeeDisputeButton";
import { EmptyState } from "./ui";

// iter-135 — multi-photo intake gallery. Combines the package's primary
// `exteriorImageUrl` with any extras admin attached after intake into a
// single ordered list, ready for the strip + swiper lightbox.
type GalleryPhoto = { id: string; url: string; label?: string };
function buildGallery(pkg: MailItem): GalleryPhoto[] {
  const out: GalleryPhoto[] = [];
  if (pkg.exteriorImageUrl) {
    out.push({ id: "primary", url: pkg.exteriorImageUrl, label: "Front" });
  }
  for (const p of pkg.extraPhotos ?? []) {
    out.push({ id: p.id, url: p.url, label: p.label });
  }
  return out;
}

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

// iter-108: AI photo-analysis warning chip. Renders one per detected
// warning. Tones map to severity: hazmat/leaking = danger (red),
// fragile/damaged_box/perishable = warn (amber), rest = info (blue).
const AI_WARNING_META: Record<string, { emoji: string; label: string; tone: "warn" | "danger" | "info" }> = {
  fragile:         { emoji: "🚸", label: "Fragile",        tone: "warn" },
  this_side_up:    { emoji: "↑",  label: "This side up",   tone: "info" },
  hazmat:          { emoji: "☢️", label: "Hazmat",         tone: "danger" },
  leaking:         { emoji: "💧", label: "Leaking",        tone: "danger" },
  damaged_box:     { emoji: "📦", label: "Box damaged",    tone: "warn" },
  perishable:      { emoji: "🥶", label: "Perishable",     tone: "warn" },
  high_value:      { emoji: "💎", label: "High value",     tone: "info" },
  irregular_shape: { emoji: "🔷", label: "Irregular shape", tone: "info" },
};
function AiWarningChip({ warning }: { warning: string }) {
  const meta = AI_WARNING_META[warning];
  if (!meta) return null;
  const c = meta.tone === "danger" ? { bg: "rgba(231,0,19,0.10)",   fg: "#991b1b" }
          : meta.tone === "warn"   ? { bg: "rgba(245,166,35,0.16)", fg: "#92400e" }
          :                          { bg: "rgba(51,116,133,0.10)", fg: BRAND.blueDeep };
  return (
    <span
      className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
      style={{ background: c.bg, color: c.fg }}
      title={`AI detected: ${meta.label}`}
    >
      {meta.emoji} {meta.label}
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
  // iter-135: Lightbox swiper state — { pkgId, index } or null.
  const [lightbox, setLightbox] = useState<{ pkgId: string; index: number } | null>(null);

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
        packages.map((pkg) => {
          // iter-135 — combined gallery: primary photo + admin extras.
          const gallery = buildGallery(pkg);
          const hasExtras = (pkg.extraPhotos?.length ?? 0) > 0;
          return (
          <div
            key={pkg.id}
            className="group p-4 sm:p-6 transition-colors hover:bg-[#337485]/4"
            style={{ borderBottom: `1px solid ${BRAND.border}` }}
          >
            <div className="flex items-center gap-3 sm:gap-4">
              {pkg.exteriorImageUrl ? (
                // Real photo of the package, captured by admin at scan time.
                // Visual confirmation for the customer that yes, this is theirs.
                // iter-135: clicking opens the swiper at index 0; thumb count
                // badge shown when admin attached extras.
                <button
                  type="button"
                  onClick={() => setLightbox({ pkgId: pkg.id, index: 0 })}
                  className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-2xl shrink-0 transition-transform duration-300 group-hover:scale-105 overflow-hidden"
                  style={{
                    border: `1px solid ${BRAND.border}`,
                    boxShadow: "0 6px 18px rgba(51,116,133,0.20)",
                  }}
                  aria-label={`View ${gallery.length} photo${gallery.length === 1 ? "" : "s"} of package from ${pkg.from}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={pkg.exteriorImageUrl}
                    alt={`Package from ${pkg.from}`}
                    className="w-full h-full object-cover"
                  />
                  {hasExtras && (
                    <span
                      className="absolute bottom-0 right-0 text-[8.5px] font-black text-white px-1 leading-tight rounded-tl-md"
                      style={{ background: "rgba(15,23,42,0.85)" }}
                    >
                      +{pkg.extraPhotos!.length}
                    </span>
                  )}
                </button>
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
                  {/* iter-108: AI photo-analysis warnings (Claude Vision). */}
                  {pkg.aiWarnings?.map((w) => <AiWarningChip key={w} warning={w} />)}
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
            {/* iter-135 — Multi-photo gallery strip. Renders below the
                action row when admin attached extras. Each thumb opens
                the swiper at its own index (primary lives at index 0). */}
            {hasExtras && (
              <div className="mt-3 ml-[60px] sm:ml-[72px] flex items-center gap-2 overflow-x-auto pb-1">
                <span className="text-[10px] font-black uppercase tracking-wider shrink-0" style={{ color: BRAND.inkSoft }}>
                  Photos · {gallery.length}
                </span>
                {gallery.slice(1).map((g, i) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setLightbox({ pkgId: pkg.id, index: i + 1 })}
                    className="relative w-12 h-12 rounded-lg overflow-hidden shrink-0 transition-transform hover:scale-105"
                    style={{ border: `1px solid ${BRAND.border}` }}
                    aria-label={g.label ? `View ${g.label} photo` : `View photo ${i + 2} of ${gallery.length}`}
                    title={g.label ?? `Photo ${i + 2}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={g.url} alt={g.label ?? `Photo ${i + 2}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        );
        })
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
                {/* iter-105: storage-fee dispute CTA / status chip. */}
                {pkg.feeChargedCents != null && pkg.feeChargedCents > 0 && (
                  <StorageFeeDisputeButton mailItemId={pkg.id} feeCents={pkg.feeChargedCents} />
                )}
              </p>
              <p className="text-xs mt-0.5" style={{ color: BRAND.inkSoft }}>
                {pkg.date}
                {pkg.trackingNumber && (
                  <span className="ml-2 font-mono" style={{ color: BRAND.blueDeep }}>· {pkg.trackingNumber}</span>
                )}
                {pkg.feeChargedCents != null && pkg.feeChargedCents > 0 && (
                  <span className="ml-2" style={{ color: "#991b1b" }}>· storage fee ${(pkg.feeChargedCents / 100).toFixed(2)}</span>
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

    {/* iter-135 — Photo swiper lightbox. Resolves the package by id
        from `packages`, extracts the gallery, and shows a centered
        full-bleed photo with prev/next nav, ESC + backdrop close, and
        the photo label rendered as an overlay caption. */}
    {lightbox && (() => {
      const pkg = packages.find((p) => p.id === lightbox.pkgId);
      if (!pkg) return null;
      const gal = buildGallery(pkg);
      if (gal.length === 0) return null;
      return (
        <PhotoLightbox
          photos={gal}
          startIndex={Math.max(0, Math.min(gal.length - 1, lightbox.index))}
          fromLabel={pkg.from}
          onClose={() => setLightbox(null)}
        />
      );
    })()}
    </div>
  );
}

// iter-135 — Self-contained photo swiper. ESC closes, ←/→ navigate,
// backdrop click closes, label overlay caption. Locks scroll while open.
function PhotoLightbox({ photos, startIndex, fromLabel, onClose }: {
  photos: GalleryPhoto[];
  startIndex: number;
  fromLabel: string;
  onClose: () => void;
}) {
  const [idx, setIdx] = useState(startIndex);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      else if (e.key === "ArrowRight") setIdx((i) => Math.min(photos.length - 1, i + 1));
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(0, i - 1));
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [photos.length, onClose]);

  const current = photos[idx];
  if (!current) return null;
  const hasPrev = idx > 0;
  const hasNext = idx < photos.length - 1;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
      style={{ background: "rgba(15,23,42,0.92)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Package photo ${idx + 1} of ${photos.length}`}
    >
      <div
        className="relative max-w-5xl w-full"
        onClick={(e) => e.stopPropagation()}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={current.url}
          alt={current.label ?? `Photo ${idx + 1}`}
          className="block w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl"
          style={{ background: "#1A1D23" }}
        />

        {/* Close (top-right) */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-2 right-2 w-9 h-9 rounded-full text-white text-lg font-black flex items-center justify-center transition-all hover:scale-110"
          style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(8px)" }}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Prev */}
        {hasPrev && (
          <button
            type="button"
            onClick={() => setIdx((i) => i - 1)}
            className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full text-white text-xl font-black flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(8px)" }}
            aria-label="Previous photo"
          >
            ‹
          </button>
        )}

        {/* Next */}
        {hasNext && (
          <button
            type="button"
            onClick={() => setIdx((i) => i + 1)}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full text-white text-xl font-black flex items-center justify-center transition-all hover:scale-110"
            style={{ background: "rgba(15,23,42,0.7)", backdropFilter: "blur(8px)" }}
            aria-label="Next photo"
          >
            ›
          </button>
        )}

        {/* Caption + dot indicators */}
        <div className="mt-3 flex items-center justify-between gap-3 px-1 text-white">
          <div className="flex-1 min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.16em] opacity-70">
              From {fromLabel}
            </p>
            <p className="text-sm font-semibold truncate">
              {current.label ?? `Photo ${idx + 1}`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIdx(i)}
                aria-label={`Go to photo ${i + 1}`}
                className={`rounded-full transition-all ${i === idx ? "w-2.5 h-2.5" : "w-2 h-2 opacity-50 hover:opacity-80"}`}
                style={{ background: i === idx ? "white" : "rgba(255,255,255,0.7)" }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
