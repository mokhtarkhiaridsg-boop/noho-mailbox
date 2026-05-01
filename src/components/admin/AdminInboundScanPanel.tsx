"use client";

/**
 * Inbound package scan workflow.
 *
 * Admin clicks Scan → camera opens → barcode scanned → tracking + carrier
 * captured (carrier auto-detected from format) → admin assigns to a customer
 * (suite # or autocomplete by name) → submits → opens the printable thermal
 * receipt at /admin/inbound/receipt/[id] in a new tab.
 *
 * Manual entry fallback for browsers without BarcodeDetector or when scan
 * times out — admin can paste/type the tracking number too.
 */

import { createContext, useContext, useEffect, useRef, useState, useTransition } from "react";
import {
  logScannedInbound,
  findCustomersForScan,
  findCustomersWithActivePackages,
  findMailItemForPickup,
  getAwaitingShelf,
  getRecentScans,
  getTodaysActivityForExport,
  getTodaysIntakeStats,
  nudgeStaleCustomer,
  reassignMailItem,
  updateMailStatus,
} from "@/app/actions/mail";
import { toCsv, downloadCsv, dateStampedName } from "@/lib/csv";
import {
  logExternalDropoff,
  getRecentDropoffs,
  markDropoffPickedUpByCarrier,
  bulkMarkDropoffsPickedUpByCarrier,
} from "@/app/actions/dropoffs";
import { findCustomerByPickupToken } from "@/app/actions/qrPickup";
import { parseWeightInput } from "@/lib/units";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";

// iter-78: Lightbox overlay for package photos. Admin clicks any photo
// thumbnail (pickup match card, recent scans row, dropoff row, customer
// pickup card) and the photo enlarges to full-viewport. Esc or click
// outside dismisses. Single shared photo state lives in the parent
// panel so we never have two lightboxes open at once.

// iter-78: Tiny context so deeply nested rows (RecentScanRow,
// RecentDropoffRow, CustomerPickupCard) can open the lightbox without
// prop-drilling. Default no-op so usage outside the provider is safe.
const LightboxContext = createContext<(src: string) => void>(() => undefined);
function useOpenLightbox() { return useContext(LightboxContext); }

function PhotoLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-6"
      style={{ background: "rgba(45,16,15,0.85)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Package photo"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt="Package exterior — full size"
        className="rounded-lg shadow-2xl"
        style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }}
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-5 right-5 px-3 py-2 rounded-lg text-sm font-bold"
        style={{ background: "rgba(255,255,255,0.92)", color: "#2D100F" }}
      >
        Close · Esc
      </button>
    </div>
  );
}

// iter-71: Audible feedback helper. Lazily creates a single AudioContext
// (browsers require a user gesture before playback works; the bureau's
// scan/click counts as the gesture). Three short tones for the three
// states admin cares about while looking down at a package:
//   "found"     — high G major arpeggio, says "match"
//   "confirm"   — two-note resolution, says "done"
//   "miss"      — low descending tone, says "no match"
// Best-effort: any AudioContext error swallowed so a failing audio API
// never blocks the workflow.
type BeepKind = "found" | "confirm" | "miss";
let _beepCtx: AudioContext | null = null;
function playBeep(kind: BeepKind) {
  if (typeof window === "undefined") return;
  try {
    const Ctx = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    if (!_beepCtx) _beepCtx = new Ctx();
    const ctx = _beepCtx;
    if (ctx.state === "suspended") void ctx.resume();
    const sequence: Array<{ freq: number; durMs: number; delayMs: number }> =
      kind === "found"  ? [{ freq: 880, durMs: 90, delayMs: 0 }, { freq: 1175, durMs: 90, delayMs: 95 }]
      : kind === "confirm" ? [{ freq: 880, durMs: 70, delayMs: 0 }, { freq: 1320, durMs: 130, delayMs: 75 }]
      : /* miss */         [{ freq: 330, durMs: 200, delayMs: 0 }];
    for (const s of sequence) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = s.freq;
      // Soft envelope so it sounds clean, not clicky.
      const t0 = ctx.currentTime + s.delayMs / 1000;
      gain.gain.setValueAtTime(0, t0);
      gain.gain.linearRampToValueAtTime(0.18, t0 + 0.01);
      gain.gain.linearRampToValueAtTime(0, t0 + s.durMs / 1000);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + s.durMs / 1000 + 0.05);
    }
  } catch {
    // best-effort
  }
}

// Oversize predicate — packages where any single dim > 18" OR longest+girth
// > 36" trigger the $6.50 oversized intake fee per Terms (iter-13). Pulled
// out as a heuristic so the scan UI can warn admin before they save.
function looksOversize(dimensions: string): boolean {
  if (!dimensions) return false;
  // Walk every number in the string ("12x9x4 in" → [12, 9, 4]).
  const numbers = Array.from(dimensions.matchAll(/(\d+(?:\.\d+)?)/g)).map((m) => parseFloat(m[1]));
  if (numbers.length === 0) return false;
  const max = Math.max(...numbers);
  const sum = numbers.reduce((a, b) => a + b, 0);
  return max >= 18 || sum >= 36;
}

// Same regex heuristics the admin Track tab uses (iter-7).
function detectCarrier(t: string): string | null {
  const s = t.replace(/\s+/g, "").toUpperCase();
  if (s.startsWith("1Z") && s.length >= 16) return "UPS";
  if (/^9[2-5]\d{20,}/.test(s)) return "USPS";
  if (/^(EC|EI|HC|RA|RB|RE|RF|RR)/.test(s) && s.length >= 13) return "USPS";
  if (/^9612\d/.test(s) && s.length >= 14) return "FedEx";
  if (/^\d{12}$/.test(s) || /^\d{15}$/.test(s)) return "FedEx";
  if (/^\d{10}$/.test(s)) return "DHL";
  if (/^JJ?D/.test(s) && s.length >= 10) return "DHL";
  return null;
}

type CustomerMatch = {
  id: string;
  name: string | null;
  email: string;
  suiteNumber: string | null;
  plan: string | null;
};

type RecentScan = {
  id: string;
  trackingNumber: string;
  carrier: string;
  recipientName: string;
  suiteNumber: string;
  weightOz: number | null;
  dimensions: string | null;
  exteriorImageUrl: string | null;
  status: string;
  createdAtIso: string;
};

// iter-58: Shape returned by getRecentDropoffs for the panel feed.
type RecentDropoff = {
  id: string;
  trackingNumber: string;
  carrier: string;
  senderName: string | null;
  receiverName: string | null;
  destination: string | null;
  exteriorImageUrl: string | null;
  status: string;
  createdAtIso: string;
  carrierPickedUpAtIso: string | null;
};

type PickupMatch = {
  id: string;
  trackingNumber: string;
  carrier: string;
  recipientName: string;
  suiteNumber: string;
  email: string;
  exteriorImageUrl: string | null;
  status: string;
  createdAtIso: string;
};

// iter-76: Customer + their active packages, returned by
// findCustomersWithActivePackages. Used when admin types a name instead of
// a tracking number in pickup mode.
type CustomerWithPackages = {
  id: string;
  name: string | null;
  email: string;
  suiteNumber: string | null;
  activePackages: Array<{
    id: string;
    trackingNumber: string | null;
    carrier: string | null;
    from: string;
    recipientName: string | null;
    status: string;
    exteriorImageUrl: string | null;
    createdAtIso: string;
  }>;
};

export function AdminInboundScanPanel() {
  // iter-49: Mode toggle. Intake = log a new package. Pickup = mark an
  // existing package as handed-to-customer-in-person. Both share the same
  // BarcodeDetector camera + Recent Scans list, but the form below the
  // tracking input swaps to a much simpler match-and-confirm UI in pickup.
  // iter-57: Dropoff = external (non-customer) carrier-pickup access point.
  const [mode, setMode] = useState<"intake" | "pickup" | "dropoff">("intake");
  const [tracking, setTracking] = useState("");
  const [carrierOverride, setCarrierOverride] = useState<string>("");
  const [scanOpen, setScanOpen] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [customerQuery, setCustomerQuery] = useState("");
  const [customerMatches, setCustomerMatches] = useState<CustomerMatch[]>([]);
  const [pickedCustomer, setPickedCustomer] = useState<CustomerMatch | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [weightInput, setWeightInput] = useState("");      // free-form: "2 lb 6 oz" / "36 oz" / "36"
  const [dimensions, setDimensions] = useState("");
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoOpen, setPhotoOpen] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  // Pickup-mode lookup state. Populated when admin scans/types a tracking
  // # and hits Enter in pickup mode; we look up the matching active
  // MailItem and show it for in-person confirmation.
  const [pickupMatch, setPickupMatch] = useState<PickupMatch | null>(null);
  const [pickupDuplicates, setPickupDuplicates] = useState(0);
  const [pickupLooking, setPickupLooking] = useState(false);
  const [pickupMsg, setPickupMsg] = useState<string | null>(null);
  // iter-76: Customer-search fallback. When admin types a name (no
  // digits) the lookup falls back to findCustomersWithActivePackages
  // and we render the customer + their active packages with one-tap
  // pickup buttons.
  const [pickupCustomers, setPickupCustomers] = useState<CustomerWithPackages[]>([]);
  // iter-57: Dropoff-mode form state. Tracking + carrier reuse the same
  // top-level inputs the other modes use. Sender / receiver / destination
  // are all optional — typical fast drop is just tracking + carrier.
  const [dropSender, setDropSender] = useState("");
  const [dropSenderPhone, setDropSenderPhone] = useState("");
  const [dropReceiver, setDropReceiver] = useState("");
  const [dropDestination, setDropDestination] = useState("");
  const [dropNotes, setDropNotes] = useState("");
  const [dropMsg, setDropMsg] = useState<string | null>(null);
  const [dropLastId, setDropLastId] = useState<string | null>(null);
  // Sticky-customer mode: when on, the auto-clear-after-success preserves
  // the picked customer + recipient override so admin can scan multiple
  // boxes for the same suite without re-picking. Real workflow for big
  // eBay / Amazon orders.
  const [keepCustomer, setKeepCustomer] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<string | null>(null);
  const [lastReceiptId, setLastReceiptId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const trackingInputRef = useRef<HTMLInputElement | null>(null);
  // iter-71: Audible-feedback toggle. Some bureaus operate in a quiet
  // shared space; default ON since most warehouses appreciate the chirp.
  // Persisted per-browser via localStorage so it survives reloads.
  const [soundOn, setSoundOn] = useState(true);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const v = window.localStorage.getItem("noho-scan-sound");
    if (v === "off") setSoundOn(false);
  }, []);
  function setSoundOnPersist(on: boolean) {
    setSoundOn(on);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("noho-scan-sound", on ? "on" : "off");
    }
  }
  function maybeBeep(kind: BeepKind) {
    if (soundOn) playBeep(kind);
  }

  // Live recent-scans audit trail.
  const [recentScans, setRecentScans] = useState<RecentScan[]>([]);
  // iter-56: Shelf state — what's currently awaiting pickup, oldest first.
  // Refreshed alongside recent scans + stats so the whole panel updates
  // in one cycle. Total = full count; rows = the page (10 oldest).
  const [shelf, setShelf] = useState<{ total: number; rows: RecentScan[] }>({ total: 0, rows: [] });
  // iter-58: Recent dropoffs feed. Awaiting-Carrier first (oldest) then
  // terminal ones below.
  const [recentDropoffs, setRecentDropoffs] = useState<RecentDropoff[]>([]);
  function refreshRecentScans() {
    void getRecentScans(12).then(setRecentScans).catch(() => setRecentScans([]));
    // iter-50: Refresh the stats card alongside the scan list — one cycle
    // for the whole panel keeps the UI internally consistent.
    void getTodaysIntakeStats().then(setStats).catch(() => undefined);
    void getAwaitingShelf(10).then(setShelf).catch(() => setShelf({ total: 0, rows: [] }));
    void getRecentDropoffs(12).then((r) => setRecentDropoffs(r as RecentDropoff[])).catch(() => setRecentDropoffs([]));
  }

  // iter-78: Single shared lightbox state — open photo URL or null.
  // Children call openLightbox(url) on photo thumbnail click.
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  function openLightbox(src: string) { setLightboxSrc(src); }

  // iter-50: Daily intake stats for the header card. Refreshed on mount,
  // after every successful scan/pickup, and via the manual Refresh button.
  // iter-60: + dropoffsToday (external dropoff throughput).
  // iter-64: + yesterday counterparts for the three flow metrics so the
  // tile can show ▲+3 / ▼-2 trend deltas at a glance.
  const [stats, setStats] = useState<{
    scannedToday: number;
    awaitingPickup: number;
    pickedUpToday: number;
    heldRightNow: number;
    dropoffsToday: number;
    scannedYesterday: number;
    pickedUpYesterday: number;
    dropoffsYesterday: number;
  } | null>(null);

  // Auto-focus the tracking input on mount so a USB barcode scanner can
  // type into it immediately. Many warehouse USB scanners act as keyboards.
  useEffect(() => {
    trackingInputRef.current?.focus();
    refreshRecentScans();
  }, []);

  // iter-68: 60s auto-refresh poll. Pauses when tab is hidden (Page
  // Visibility API) so a backgrounded tab doesn't burn API calls. Also
  // re-fires immediately on visibilitychange → "visible" so admin
  // returning to the tab gets fresh data without waiting for the next
  // tick. Cleanup on unmount + page hide.
  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null;
    function start() {
      stop();
      // refreshRecentScans is also called inline so the first refresh
      // after returning to a hidden tab doesn't have to wait 60s.
      refreshRecentScans();
      timer = setInterval(() => {
        if (document.visibilityState === "visible") refreshRecentScans();
      }, 60_000);
    }
    function stop() {
      if (timer != null) {
        clearInterval(timer);
        timer = null;
      }
    }
    function onVisibility() {
      if (document.visibilityState === "visible") start();
      else stop();
    }
    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const detected = detectCarrier(tracking);
  const carrier = carrierOverride || detected || "Unknown";

  // Customer search — debounced on type.
  useEffect(() => {
    const q = customerQuery.trim();
    if (!q) {
      setCustomerMatches([]);
      return;
    }
    const handle = setTimeout(() => {
      void findCustomersForScan(q).then((res) => setCustomerMatches(res as CustomerMatch[]));
    }, 200);
    return () => clearTimeout(handle);
  }, [customerQuery]);

  function pick(c: CustomerMatch) {
    setPickedCustomer(c);
    setCustomerQuery(`Suite #${c.suiteNumber ?? "—"} · ${c.name ?? c.email}`);
    setCustomerMatches([]);
  }

  function clearAll() {
    setTracking("");
    setCarrierOverride("");
    setPickedCustomer(null);
    setCustomerQuery("");
    setCustomerMatches([]);
    setRecipientName("");
    setWeightInput("");
    setDimensions("");
    setPhotoUrl(null);
    setSubmitMsg(null);
    setLastReceiptId(null);
    // Re-focus tracking input so scanner can fire again.
    trackingInputRef.current?.focus();
  }

  // iter-57: Submit an external dropoff. Only requires tracking + carrier;
  // sender/receiver/destination are all optional. On success: prints the
  // dropoff receipt in a new tab + clears the form for the next dropoff.
  function submitDropoff() {
    setDropMsg(null);
    if (!tracking.trim() || tracking.trim().length < 6) {
      setDropMsg("Tracking number is required (≥6 chars).");
      return;
    }
    startTransition(async () => {
      const res = await logExternalDropoff({
        trackingNumber: tracking.trim(),
        carrier,
        senderName: dropSender.trim() || undefined,
        senderPhone: dropSenderPhone.trim() || undefined,
        receiverName: dropReceiver.trim() || undefined,
        destination: dropDestination.trim() || undefined,
        exteriorImageUrl: photoUrl ?? undefined,
        notes: dropNotes.trim() || undefined,
      });
      if ("error" in res && res.error) {
        setDropMsg(`Error: ${res.error}`);
        maybeBeep("miss");
        return;
      }
      const id = (res as { dropoffId?: string }).dropoffId;
      if (id) setDropLastId(id);
      maybeBeep("confirm");
      // Open dropoff receipt in a new tab — the dropper-offer takes home a
      // printed proof. Receipt route lives at /admin/inbound/dropoff/[id]
      // (added in iter-58 — for now, popup may 404 until then; the success
      // banner still appears).
      let opened: Window | null = null;
      if (typeof window !== "undefined" && id) {
        opened = window.open(`/admin/inbound/dropoff/${id}`, "_blank", "noopener,noreferrer");
      }
      setDropMsg(opened
        ? `✓ Dropoff logged · receipt opened in new tab`
        : `✓ Dropoff logged · click Open receipt below`);
      setTimeout(() => {
        setTracking("");
        setCarrierOverride("");
        setDropSender("");
        setDropSenderPhone("");
        setDropReceiver("");
        setDropDestination("");
        setDropNotes("");
        setPhotoUrl(null);
        trackingInputRef.current?.focus();
      }, 2000);
    });
  }

  // iter-49: Pickup-mode helpers. lookupForPickup is invoked when admin
  // hits Enter on the tracking input (or scans into it) while in pickup
  // mode. confirmPickup flips the matched MailItem to Picked Up.
  // iter-76: Auto-detect: if the query has any letters, it's a customer
  // name search; otherwise it's a tracking-number lookup. Suite numbers
  // (pure digits, short) still go through tracking — `findMailItemForPickup`
  // already does a `contains` so a 3-digit suite # would match too many.
  // For "I forgot my tracking" walk-ins, admin types the name.
  // iter-82: + QR Express Pickup. If the scanned content starts with
  // `NOHO-PICKUP:` (the prefix encoded in the member's QR code), strip
  // the prefix and look up the customer by their pickup token. Returns
  // the customer + active packages in the same shape as the customer-
  // name search so we can reuse CustomerPickupCard.
  function lookupForPickup() {
    setPickupMsg(null);
    setPickupMatch(null);
    setPickupDuplicates(0);
    setPickupCustomers([]);
    const q = tracking.trim();
    if (q.length < 2) {
      setPickupMsg("Type at least 2 characters (name), 4 (tracking), or scan a customer's QR.");
      return;
    }

    // QR Express Pickup path — `NOHO-PICKUP:{token}`.
    const qrMatch = q.match(/^NOHO-PICKUP:([A-Z0-9]+)$/i);
    if (qrMatch) {
      const token = qrMatch[1];
      setPickupLooking(true);
      void findCustomerByPickupToken(token)
        .then((res) => {
          const c = res as CustomerWithPackages | null;
          if (!c) {
            setPickupMsg(`No customer found for that QR. Ask them to refresh their QR Pickup card.`);
            maybeBeep("miss");
            return;
          }
          if (c.activePackages.length === 0) {
            setPickupMsg(`✓ ${c.name ?? "Customer"} (suite #${c.suiteNumber ?? "—"}) — no active packages on the shelf.`);
            maybeBeep("found");
            return;
          }
          setPickupCustomers([c]);
          setPickupMsg(`✓ QR scan — ${c.name ?? "customer"} has ${c.activePackages.length} active package${c.activePackages.length === 1 ? "" : "s"}`);
          maybeBeep("found");
        })
        .catch(() => { setPickupMsg("QR lookup failed — try again."); maybeBeep("miss"); })
        .finally(() => setPickupLooking(false));
      return;
    }

    const looksLikeName = /[a-zA-Z]/.test(q);
    setPickupLooking(true);
    if (looksLikeName) {
      // Customer-name fallback path.
      void findCustomersWithActivePackages(q)
        .then((res) => {
          const list = res as CustomerWithPackages[];
          if (list.length === 0) {
            setPickupMsg(`No customers found matching "${q}".`);
            maybeBeep("miss");
            return;
          }
          // Filter to customers who actually have active packages.
          const withPkgs = list.filter((c) => c.activePackages.length > 0);
          if (withPkgs.length === 0) {
            setPickupMsg(`Found ${list.length} customer${list.length === 1 ? "" : "s"} matching "${q}", but none have active packages on the shelf.`);
            maybeBeep("miss");
            return;
          }
          setPickupCustomers(withPkgs);
          maybeBeep("found");
        })
        .catch(() => { setPickupMsg("Customer search failed — try again."); maybeBeep("miss"); })
        .finally(() => setPickupLooking(false));
      return;
    }
    if (q.length < 4) {
      setPickupMsg("Type at least 4 characters of the tracking number.");
      setPickupLooking(false);
      return;
    }
    void findMailItemForPickup(q)
      .then((res) => {
        const match = (res as { match: PickupMatch | null }).match;
        const dup = (res as { duplicates?: number }).duplicates ?? 0;
        if (!match) {
          setPickupMsg(`No active package found for "${q}". Check intake or try a longer fragment.`);
          maybeBeep("miss");
          return;
        }
        setPickupMatch(match);
        setPickupDuplicates(dup);
        maybeBeep("found");
      })
      .catch(() => { setPickupMsg("Lookup failed — try again."); maybeBeep("miss"); })
      .finally(() => setPickupLooking(false));
  }

  // iter-76: One-tap "Picked up" from a customer-search result row.
  // Same chain as confirmPickup but operates on a specific package id.
  function confirmCustomerPackage(mailItemId: string, recipientName: string, suiteNumber: string | null) {
    setPickupMsg(null);
    startTransition(async () => {
      const res = await updateMailStatus(mailItemId, "Picked Up");
      if ((res as { error?: string }).error) {
        setPickupMsg(`Error: ${(res as { error?: string }).error}`);
        maybeBeep("miss");
        return;
      }
      setPickupMsg(`✓ Handed off to ${recipientName || "—"} · suite #${suiteNumber || "—"}`);
      maybeBeep("confirm");
      setPickupCustomers([]);
      setTracking("");
      refreshRecentScans();
      trackingInputRef.current?.focus();
    });
  }

  function confirmPickup() {
    if (!pickupMatch) return;
    setPickupMsg(null);
    startTransition(async () => {
      const res = await updateMailStatus(pickupMatch.id, "Picked Up");
      if ((res as { error?: string }).error) {
        setPickupMsg(`Error: ${(res as { error?: string }).error}`);
        maybeBeep("miss");
        return;
      }
      const recipient = pickupMatch.recipientName || "—";
      const suite = pickupMatch.suiteNumber || "—";
      setPickupMsg(`✓ Handed off to ${recipient} · suite #${suite}`);
      maybeBeep("confirm");
      setPickupMatch(null);
      setPickupDuplicates(0);
      setTracking("");
      refreshRecentScans();
      // Re-focus input so the next pickup at the counter starts immediately.
      trackingInputRef.current?.focus();
    });
  }

  function submit() {
    setSubmitMsg(null);
    if (!tracking.trim() || tracking.trim().length < 6) {
      setSubmitMsg("Tracking number is required (≥6 chars).");
      return;
    }
    if (!pickedCustomer) {
      setSubmitMsg("Pick a customer first.");
      return;
    }
    const parsedWeight = weightInput.trim() ? parseWeightInput(weightInput, "lb") : null;
    startTransition(async () => {
      const res = await logScannedInbound({
        trackingNumber: tracking.trim(),
        carrier,
        userId: pickedCustomer.id,
        recipientName: recipientName.trim() || undefined,
        weightOz: parsedWeight ?? undefined,
        dimensions: dimensions.trim() || undefined,
        exteriorImageUrl: photoUrl ?? undefined,
      });
      if ("error" in res && res.error) {
        setSubmitMsg(`Error: ${res.error}`);
        return;
      }
      const id = (res as any).mailItemId as string;
      setLastReceiptId(id);
      refreshRecentScans();
      maybeBeep("confirm");
      // Open the printable thermal receipt in a new tab so the printer dialog
      // doesn't displace the scanner workspace. If popup is blocked, the
      // success message includes a backup "Open receipt" link.
      let opened: Window | null = null;
      if (typeof window !== "undefined") {
        opened = window.open(`/admin/inbound/receipt/${id}`, "_blank", "noopener,noreferrer");
      }
      if (opened) {
        setSubmitMsg(`✓ Logged to suite #${pickedCustomer.suiteNumber ?? "—"} · receipt opened in new tab`);
      } else {
        setSubmitMsg(`✓ Logged to suite #${pickedCustomer.suiteNumber ?? "—"} — popup blocked, click Open receipt below`);
      }
      // Auto-clear inputs after 2s so the next scan is ready (the success
      // banner with the receipt link sticks until the next scan starts).
      // When `keepCustomer` is on, preserve the picked customer + recipient
      // override so the next scan in a batch goes to the same suite.
      setTimeout(() => {
        setTracking("");
        setCarrierOverride("");
        setWeightInput("");
        setDimensions("");
        setPhotoUrl(null);
        if (!keepCustomer) {
          setPickedCustomer(null);
          setCustomerQuery("");
          setCustomerMatches([]);
          setRecipientName("");
        }
        trackingInputRef.current?.focus();
      }, 2000);
    });
  }

  // Photo capture: takes a snapshot Blob from the modal, posts to /api/upload,
  // gets back a Vercel-Blob URL, stores it on the form. Best-effort — errors
  // surface inline; the scan still works without a photo.
  async function handlePhotoCapture(blob: Blob) {
    setPhotoUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", new File([blob], `package-${Date.now()}.jpg`, { type: "image/jpeg" }));
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      if (!res.ok) throw new Error("upload failed");
      const data = await res.json() as { url?: string; error?: string };
      if (!data.url) throw new Error(data.error ?? "upload failed");
      setPhotoUrl(data.url);
      setPhotoOpen(false);
    } catch (e) {
      console.error("[scan] photo upload failed:", e);
      setSubmitMsg("Photo upload failed — scan will save without it.");
    } finally {
      setPhotoUploading(false);
    }
  }

  return (
    <LightboxContext.Provider value={openLightbox}>
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
            Inbound · {mode === "pickup" ? "Pickup workflow" : mode === "dropoff" ? "Carrier dropoff" : "Scan workflow"}
          </p>
          <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>
            {mode === "pickup" ? "Pickup & Hand-off"
              : mode === "dropoff" ? "Carrier Dropoff"
              : "Scan & Print"}
          </h2>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
            {mode === "pickup"
              ? "Scan the carrier's barcode → confirm match → mark as handed-to-customer in person."
              : mode === "dropoff"
              ? "External access point: scan a pre-paid label → log it for the carrier sweep → print a receipt for the dropper-offer."
              : "Scan the carrier's barcode → assign to a customer → print a thermal pickup stub."}
          </p>
        </div>
        {/* iter-66: Daily export button — pulls today's scans, pickups
            and dropoffs into a single CSV for the bureau's end-of-day
            report. Sits alongside the mode toggle so the export is one
            click from anywhere in the panel. */}
        <button
          type="button"
          onClick={() => {
            void getTodaysActivityForExport()
              .then((rows) => {
                if (rows.length === 0) {
                  alert("No activity logged today yet.");
                  return;
                }
                const csv = toCsv(
                  rows.map((r) => ({
                    Time: r.timeIso,
                    Type: r.kind,
                    Tracking: r.tracking,
                    Carrier: r.carrier,
                    Party: r.party,
                    Suite: r.suite,
                    Status: r.status,
                  })),
                  { headers: ["Time", "Type", "Tracking", "Carrier", "Party", "Suite", "Status"] },
                );
                downloadCsv(dateStampedName("noho-daily-activity"), csv);
              })
              .catch((e) => {
                console.error("[export] failed:", e);
                alert("Export failed — try again or check the console.");
              });
          }}
          className="px-3 py-1.5 rounded-xl text-[11px] font-bold border self-center"
          style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
          title="Download today's scans + pickups + dropoffs as a single CSV"
        >
          Export today
        </button>
        {/* iter-73: Lookup any package by tracking # — opens a separate
            page that searches across ALL history (no 48h window) so admin
            can answer "where's my package?" calls. */}
        <a
          href="/admin/lookup"
          className="px-3 py-1.5 rounded-xl text-[11px] font-bold border self-center"
          style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white", textDecoration: "none" }}
          title="Search any tracking number across all history"
        >
          Lookup
        </a>
        {/* iter-71: Audible-feedback toggle. Some bureaus prefer silence;
            most warehouses appreciate the chirp. Persisted per browser. */}
        <button
          type="button"
          onClick={() => setSoundOnPersist(!soundOn)}
          className="px-2.5 py-1.5 rounded-xl text-[11px] font-bold border self-center"
          style={{
            borderColor: soundOn ? NOHO_BLUE : "#e8e5e0",
            color: soundOn ? NOHO_BLUE_DEEP : "rgba(45,16,15,0.55)",
            background: "white",
          }}
          title={soundOn ? "Mute scan/pickup sounds" : "Turn on scan/pickup sounds"}
          aria-pressed={soundOn}
        >
          {soundOn ? "Sound on" : "Sound off"}
        </button>
        {/* Segmented mode toggle. Same scanner, two workflows. */}
        <div
          role="tablist"
          aria-label="Scan mode"
          className="inline-flex p-1 rounded-xl border bg-white"
          style={{ borderColor: "#e8e5e0" }}
        >
          {(["intake", "pickup", "dropoff"] as const).map((m) => {
            const active = mode === m;
            const label = m === "intake" ? "Intake" : m === "pickup" ? "Pickup" : "Dropoff";
            return (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setMode(m);
                  // Clear any pickup state when switching modes so we
                  // don't show stale match cards.
                  setPickupMatch(null);
                  setPickupDuplicates(0);
                  setPickupMsg(null);
                  setDropMsg(null);
                  trackingInputRef.current?.focus();
                }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-black uppercase tracking-wider transition-colors"
                style={{
                  background: active ? NOHO_BLUE : "transparent",
                  color: active ? "white" : NOHO_INK,
                  letterSpacing: "0.08em",
                }}
                title={
                  m === "intake" ? "Log a new package for one of our customers"
                  : m === "pickup" ? "Mark an existing package as picked up by the customer in person"
                  : "External (non-customer) carrier-pickup access point — they brought a pre-paid label"
                }
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* iter-50: Today-at-a-glance stats card. Standup-style throughput
          numbers so the bureau can answer "how busy were we today?" without
          opening a report. */}
      {stats && <DailyIntakeStatsCard stats={stats} />}

      {/* Tracking input + scan button */}
      <div
        className="rounded-2xl bg-white border p-4"
        style={{ borderColor: "#e8e5e0", boxShadow: "0 1px 2px rgba(45,16,15,0.04)" }}
      >
        <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.40)" }}>
          Tracking number
        </p>
        <div className="mt-2 flex items-stretch gap-2">
          <input
            ref={trackingInputRef}
            type="text"
            value={tracking}
            onChange={(e) => {
              setTracking(e.target.value);
              setSubmitMsg(null);
              // iter-50: When admin starts editing in pickup mode, clear the
              // stale match card so they don't accidentally confirm a pickup
              // for the previous tracking number.
              if (mode === "pickup") {
                setPickupMatch(null);
                setPickupDuplicates(0);
                setPickupMsg(null);
                setPickupCustomers([]);
              }
            }}
            onKeyDown={(e) => {
              // iter-69: Esc clears the input + any displayed match. Useful
              // for resetting between batch counter pickups without
              // hunting for the Clear button.
              if (e.key === "Escape") {
                e.preventDefault();
                setTracking("");
                setSubmitMsg(null);
                if (mode === "pickup") {
                  setPickupMatch(null);
                  setPickupDuplicates(0);
                  setPickupMsg(null);
                }
                if (mode === "dropoff") {
                  setDropMsg(null);
                }
                trackingInputRef.current?.focus();
                return;
              }
              // Submit on Enter — USB barcode scanners typically suffix with
              // a CR, so this gives admin a one-scan-and-go workflow once the
              // customer is already locked in.
              if (e.key !== "Enter") return;
              // iter-69: In pickup mode, if we already have a match
              // displayed, treat Enter as "confirm pickup" (the second
              // Enter from the USB scanner happens to land here when the
              // admin walks the next package up). Without this they'd have
              // to mouse over to the green button between every pickup.
              if (mode === "pickup" && pickupMatch) {
                e.preventDefault();
                confirmPickup();
                return;
              }
              if (mode === "pickup" && tracking.trim().length >= 2) {
                // iter-76: 2-char min covers the customer-name path; the
                // tracking branch inside lookupForPickup still requires 4.
                e.preventDefault();
                lookupForPickup();
              } else if (mode === "intake" && pickedCustomer && tracking.trim().length >= 6) {
                e.preventDefault();
                submit();
              } else if (mode === "dropoff" && tracking.trim().length >= 6) {
                e.preventDefault();
                submitDropoff();
              }
            }}
            placeholder="Scan tracking #, customer's QR, or type a name — Enter submit · Esc clear"
            className="flex-1 min-w-0 rounded-xl border px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#337485]/30"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
            autoFocus
          />
          <button
            type="button"
            onClick={() => setScanOpen(true)}
            className="px-4 py-2.5 rounded-xl text-xs font-black text-white"
            style={{ background: NOHO_BLUE, boxShadow: `0 4px 14px ${NOHO_BLUE}40` }}
          >
            Scan camera
          </button>
        </div>

        {tracking && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(45,16,15,0.55)" }}>
              Carrier
            </span>
            <select
              value={carrierOverride || detected || ""}
              onChange={(e) => setCarrierOverride(e.target.value)}
              className="rounded-lg border px-2 py-1 text-xs font-bold"
              style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
            >
              <option value="">{detected ? `${detected} (auto)` : "Pick carrier"}</option>
              <option value="USPS">USPS</option>
              <option value="UPS">UPS</option>
              <option value="FedEx">FedEx</option>
              <option value="DHL">DHL</option>
              <option value="Amazon">Amazon</option>
              <option value="Other">Other</option>
            </select>
            {detected && !carrierOverride && (
              <span className="text-[10px] font-bold" style={{ color: NOHO_BLUE }}>
                · auto-detected from tracking format
              </span>
            )}
          </div>
        )}
      </div>

      {/* iter-49: Pickup-mode match card. Replaces customer picker + intake
          details when admin is doing counter handoffs instead of receiving
          new packages. */}
      {mode === "pickup" && (
        <PickupMatchPanel
          match={pickupMatch}
          duplicates={pickupDuplicates}
          looking={pickupLooking}
          message={pickupMsg}
          tracking={tracking}
          customers={pickupCustomers}
          onConfirmCustomerPackage={confirmCustomerPackage}
          onLookup={lookupForPickup}
          onConfirm={confirmPickup}
          onClear={() => {
            setPickupMatch(null);
            setPickupDuplicates(0);
            setPickupMsg(null);
            setPickupCustomers([]);
            setTracking("");
            trackingInputRef.current?.focus();
          }}
          onScanAgain={() => {
            // iter-55: One-tap rescan from the match card. Clears the
            // current state and reopens the camera so the next package's
            // barcode goes straight in. Saves a click + a focus shuffle
            // when the bureau is processing a small queue at the counter.
            setPickupMatch(null);
            setPickupDuplicates(0);
            setPickupMsg(null);
            setTracking("");
            setScanOpen(true);
          }}
          onReassigned={() => {
            // iter-72: After a reassign-from-pickup, re-run the lookup so
            // the match card shows the new owner. The tracking field is
            // still populated so we can call lookupForPickup directly.
            refreshRecentScans();
            lookupForPickup();
          }}
          pending={isPending}
        />
      )}

      {/* iter-57: External Dropoff form. Lighter than intake — no customer
          picker, all sender/receiver fields optional. Sender/receiver
          captured for pre-paid label dropoffs from non-customers. */}
      {mode === "dropoff" && (
        <DropoffForm
          tracking={tracking}
          carrier={carrier}
          photoUrl={photoUrl}
          onPhotoCapture={() => setPhotoOpen(true)}
          onPhotoRemove={() => setPhotoUrl(null)}
          sender={dropSender} setSender={setDropSender}
          senderPhone={dropSenderPhone} setSenderPhone={setDropSenderPhone}
          receiver={dropReceiver} setReceiver={setDropReceiver}
          destination={dropDestination} setDestination={setDropDestination}
          notes={dropNotes} setNotes={setDropNotes}
          message={dropMsg}
          lastReceiptId={dropLastId}
          submitting={isPending}
          onSubmit={submitDropoff}
          onClear={() => {
            setTracking("");
            setCarrierOverride("");
            setDropSender(""); setDropSenderPhone("");
            setDropReceiver(""); setDropDestination("");
            setDropNotes("");
            setPhotoUrl(null);
            setDropMsg(null); setDropLastId(null);
            trackingInputRef.current?.focus();
          }}
        />
      )}

      {mode === "intake" && (<>
      {/* Customer picker */}
      <div
        className="rounded-2xl bg-white border p-4 relative"
        style={{ borderColor: "#e8e5e0", boxShadow: "0 1px 2px rgba(45,16,15,0.04)" }}
      >
        <div className="flex items-center justify-between gap-2 flex-wrap mb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.40)" }}>
            Customer (suite # / name / email)
          </p>
          <label
            className="inline-flex items-center gap-1.5 cursor-pointer text-[10.5px] font-bold"
            title="Keep this customer picked across the next scan — for batch-receiving multiple packages for the same suite"
            style={{ color: keepCustomer ? NOHO_BLUE_DEEP : "rgba(45,16,15,0.55)" }}
          >
            <input
              type="checkbox"
              checked={keepCustomer}
              onChange={(e) => setKeepCustomer(e.target.checked)}
              className="w-3.5 h-3.5 accent-[#337485]"
            />
            Stay on this customer
            {keepCustomer && (
              <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                Batch
              </span>
            )}
          </label>
        </div>
        <input
          type="text"
          value={customerQuery}
          onChange={(e) => { setCustomerQuery(e.target.value); setPickedCustomer(null); }}
          placeholder="e.g. 042 or Sarah Johnson"
          className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]/30"
          style={{ borderColor: pickedCustomer ? "#16a34a" : "#e8e5e0", color: NOHO_INK, background: "white" }}
        />
        {customerMatches.length > 0 && !pickedCustomer && (
          <div
            className="absolute left-4 right-4 mt-1 rounded-xl bg-white border z-20 max-h-64 overflow-auto"
            style={{ borderColor: "#e8e5e0", boxShadow: "0 12px 32px rgba(45,16,15,0.16)" }}
          >
            {customerMatches.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => pick(c)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[#337485]/10 flex items-center justify-between"
              >
                <span>
                  <strong style={{ color: NOHO_INK }}>{c.name ?? "(no name)"}</strong>
                  <span style={{ color: "rgba(45,16,15,0.55)", marginLeft: 6 }}>{c.email}</span>
                </span>
                <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                  Suite #{c.suiteNumber ?? "—"}
                </span>
              </button>
            ))}
          </div>
        )}

        {pickedCustomer && (
          <div className="mt-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.40)" }}>
              Addressed to (optional override)
            </p>
            <input
              type="text"
              value={recipientName}
              onChange={(e) => setRecipientName(e.target.value)}
              placeholder={`Defaults to ${pickedCustomer.name ?? "customer name"}`}
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]/30"
              style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
            />
          </div>
        )}
      </div>

      {/* Optional intake details — captured for oversize packages so the
          customer's mail-arrived email + dashboard show real data. */}
      {pickedCustomer && (
        <div
          className="rounded-2xl bg-white border p-4"
          style={{ borderColor: "#e8e5e0", boxShadow: "0 1px 2px rgba(45,16,15,0.04)" }}
        >
          {/* Photo row */}
          <div className="flex items-start gap-3 mb-3 pb-3 border-b" style={{ borderColor: "#e8e5e0" }}>
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="Package exterior" className="w-20 h-20 rounded-lg object-cover border" style={{ borderColor: "#e8e5e0" }} />
            ) : (
              <div className="w-20 h-20 rounded-lg flex items-center justify-center shrink-0" style={{ background: "rgba(51,116,133,0.06)", border: "1px dashed rgba(51,116,133,0.30)", color: NOHO_BLUE }}>
                <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 7 H7 L9 5 H15 L17 7 H19 A2 2 0 0 1 21 9 V18 A2 2 0 0 1 19 20 H5 A2 2 0 0 1 3 18 V9 A2 2 0 0 1 5 7 Z" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.40)" }}>
                Exterior photo (optional)
              </p>
              <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                {photoUrl ? "Photo attached. Customer sees this in their dashboard + email." : "Snap an exterior photo so the customer can confirm it's their package."}
              </p>
              <div className="mt-2 flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setPhotoOpen(true)}
                  disabled={photoUploading}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white disabled:opacity-50"
                  style={{ background: NOHO_BLUE }}
                >
                  {photoUploading ? "Uploading…" : photoUrl ? "Re-take" : "Capture photo"}
                </button>
                {photoUrl && (
                  <button
                    type="button"
                    onClick={() => setPhotoUrl(null)}
                    className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border"
                    style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
                  >
                    Remove
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.40)" }}>
              Weight (optional)
            </p>
            <input
              type="text"
              value={weightInput}
              onChange={(e) => setWeightInput(e.target.value)}
              placeholder="2 lb 6 oz · 36 oz · 2.5 lb"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]/30"
              style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
            />
            {weightInput && (() => {
              const oz = parseWeightInput(weightInput, "lb");
              if (!oz) return <p className="mt-1 text-[10px] text-amber-700">Couldn&apos;t parse — saved as text.</p>;
              return (
                <p className="mt-1 text-[10px] text-emerald-700 font-bold">
                  = {oz} oz ({(oz / 16).toFixed(2)} lb)
                </p>
              );
            })()}
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.40)" }}>
              Dimensions (optional)
            </p>
            <input
              type="text"
              value={dimensions}
              onChange={(e) => setDimensions(e.target.value)}
              placeholder="12x9x4 in"
              className="mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]/30"
              style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
            />
            {dimensions && looksOversize(dimensions) ? (
              <p
                className="mt-1 text-[10px] font-bold inline-flex items-center gap-1 px-2 py-0.5 rounded"
                style={{
                  background: "rgba(245,166,35,0.14)",
                  color: "#92400e",
                  border: "1px solid rgba(245,166,35,0.40)",
                }}
                title="Per Terms, packages with a side ≥ 18″ or sum of dims ≥ 36″ get a $6.50 oversize fee + storage tier ($6.50/day from day 4). Charge customer at pickup."
              >
                <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#F5A623" }} />
                Oversize · charge $6.50 fee at pickup
              </p>
            ) : (
              <p className="mt-1 text-[10px]" style={{ color: "rgba(45,16,15,0.45)" }}>
                Used for oversize fees (per Terms)
              </p>
            )}
          </div>
          </div>
        </div>
      )}

      {submitMsg && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-between gap-3 flex-wrap"
          style={{
            background: submitMsg.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: submitMsg.startsWith("✓") ? "#15803d" : "#991b1b",
            border: `1px solid ${submitMsg.startsWith("✓") ? "rgba(22,163,74,0.30)" : "rgba(231,0,19,0.30)"}`,
          }}
        >
          <span>{submitMsg}</span>
          {lastReceiptId && submitMsg.startsWith("✓") && (
            <a
              href={`/admin/inbound/receipt/${lastReceiptId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-black text-white shrink-0"
              style={{ background: "#15803d" }}
            >
              Open receipt →
            </a>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={submit}
          disabled={isPending || !tracking || !pickedCustomer}
          className="flex-1 py-3 rounded-xl text-white font-black disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}
        >
          {isPending ? "Logging…" : "Log + Print receipt →"}
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="px-4 py-3 rounded-xl text-sm font-bold border"
          style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
        >
          Clear
        </button>
      </div>
      </>)}

      {scanOpen && (
        <ScanModal
          onClose={() => setScanOpen(false)}
          onCapture={(value) => {
            setTracking(value);
            setScanOpen(false);
            setScanError(null);
            // iter-82: If the scanned content is a NOHO Pickup QR, force
            // pickup mode regardless of where admin was. This makes QR
            // scanning a universal counter handoff trigger — admin doesn't
            // have to remember to switch modes first.
            const isNohoQR = /^NOHO-PICKUP:/i.test(value.trim());
            if (isNohoQR) {
              setMode("pickup");
              setTimeout(() => lookupForPickup(), 0);
              return;
            }
            // iter-49: In pickup mode the camera-scanned tracking should
            // immediately trigger a lookup so the admin can confirm by tap.
            if (mode === "pickup" && value.trim().length >= 4) {
              setTimeout(() => lookupForPickup(), 0);
            }
          }}
          onError={(msg) => setScanError(msg)}
        />
      )}
      {scanError && !scanOpen && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-xs font-bold text-amber-800">
          {scanError}
        </div>
      )}

      {photoOpen && (
        <PhotoCaptureModal
          uploading={photoUploading}
          onClose={() => setPhotoOpen(false)}
          onCapture={handlePhotoCapture}
        />
      )}

      {/* iter-56: Shelf — oldest-first list of everything currently awaiting
          pickup. The bureau's primary day-to-day reference — "what should
          we hand to walk-in customers today?". Reuses RecentScanRow so all
          lifecycle action buttons (Picked up / Hold / Reassign / Re-print)
          work the same way. */}
      <AwaitingShelfList shelf={shelf} onChanged={refreshRecentScans} />

      {/* Recent scans audit trail — last 48h, 12 newest. Each row carries a
          re-print-receipt button so admin can recover from a printer eat. */}
      <RecentScansList rows={recentScans} onRefresh={refreshRecentScans} />

      {/* iter-58: External-dropoff feed. Hidden when empty so the panel
          isn't cluttered for bureaus that don't take external dropoffs. */}
      {recentDropoffs.length > 0 && (
        <RecentDropoffsList rows={recentDropoffs} onChanged={refreshRecentScans} />
      )}
    </div>
    {lightboxSrc && <PhotoLightbox src={lightboxSrc} onClose={() => setLightboxSrc(null)} />}
    </LightboxContext.Provider>
  );
}

/* ─── Dropoff form (iter-57) ────────────────────────────────────────────── */
// Lighter weight than intake. Only required field is the tracking number
// (captured at the top-level input, same as the other modes). Carrier
// auto-detected. Sender / receiver / destination / notes / photo all
// optional. Submit creates an ExternalDropoff row + opens the receipt.

function DropoffForm({
  tracking, carrier, photoUrl, onPhotoCapture, onPhotoRemove,
  sender, setSender, senderPhone, setSenderPhone,
  receiver, setReceiver, destination, setDestination,
  notes, setNotes,
  message, lastReceiptId, submitting, onSubmit, onClear,
}: {
  tracking: string;
  carrier: string;
  photoUrl: string | null;
  onPhotoCapture: () => void;
  onPhotoRemove: () => void;
  sender: string; setSender: (v: string) => void;
  senderPhone: string; setSenderPhone: (v: string) => void;
  receiver: string; setReceiver: (v: string) => void;
  destination: string; setDestination: (v: string) => void;
  notes: string; setNotes: (v: string) => void;
  message: string | null;
  lastReceiptId: string | null;
  submitting: boolean;
  onSubmit: () => void;
  onClear: () => void;
}) {
  const labelStyle = "text-[10px] font-black uppercase tracking-[0.16em]";
  const inputCls = "mt-1 w-full rounded-xl border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]/30";
  const inputStyle = { borderColor: "#e8e5e0", color: NOHO_INK, background: "white" } as const;
  return (
    <div
      className="rounded-2xl bg-white border p-4 space-y-3"
      style={{ borderColor: "#e8e5e0", boxShadow: "0 1px 2px rgba(45,16,15,0.04)" }}
    >
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div>
          <p className={labelStyle} style={{ color: "rgba(45,16,15,0.40)" }}>
            Optional details
          </p>
          <p className="text-[11px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
            All fields below are optional. Tracking + carrier above is enough for a fast drop.
          </p>
        </div>
      </div>

      {/* Photo row */}
      <div className="flex items-start gap-3 pb-3 border-b" style={{ borderColor: "#e8e5e0" }}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt="Dropoff photo"
            className="shrink-0 w-16 h-16 rounded-xl object-cover border"
            style={{ borderColor: "#e8e5e0" }}
          />
        ) : (
          <div
            className="shrink-0 w-16 h-16 rounded-xl border-2 border-dashed flex items-center justify-center"
            style={{ borderColor: "rgba(51,116,133,0.30)", color: "rgba(51,116,133,0.50)" }}
          >
            <span className="text-[9px] font-black uppercase tracking-wider">No photo</span>
          </div>
        )}
        <div className="flex-1 min-w-0 flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={onPhotoCapture}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold border"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
          >
            {photoUrl ? "Retake" : "Take photo"}
          </button>
          {photoUrl && (
            <button
              type="button"
              onClick={onPhotoRemove}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold"
              style={{ color: "#991b1b" }}
            >
              Remove
            </button>
          )}
          <span className="text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>
            Useful for high-value dropoffs as proof of intake.
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <p className={labelStyle} style={{ color: "rgba(45,16,15,0.40)" }}>
            Sender name (optional)
          </p>
          <input
            type="text" value={sender} onChange={(e) => setSender(e.target.value)}
            placeholder="e.g. Mariem Saidi"
            className={inputCls} style={inputStyle}
          />
        </div>
        <div>
          <p className={labelStyle} style={{ color: "rgba(45,16,15,0.40)" }}>
            Sender phone (optional)
          </p>
          <input
            type="tel" value={senderPhone} onChange={(e) => setSenderPhone(e.target.value)}
            placeholder="e.g. +216 22 123 456"
            className={inputCls} style={inputStyle}
          />
        </div>
        <div>
          <p className={labelStyle} style={{ color: "rgba(45,16,15,0.40)" }}>
            Receiver name (optional)
          </p>
          <input
            type="text" value={receiver} onChange={(e) => setReceiver(e.target.value)}
            placeholder="e.g. Karim Ben Ali"
            className={inputCls} style={inputStyle}
          />
        </div>
        <div>
          <p className={labelStyle} style={{ color: "rgba(45,16,15,0.40)" }}>
            Destination (optional)
          </p>
          <input
            type="text" value={destination} onChange={(e) => setDestination(e.target.value)}
            placeholder="e.g. Sfax, Tunisia"
            className={inputCls} style={inputStyle}
          />
        </div>
      </div>

      <div>
        <p className={labelStyle} style={{ color: "rgba(45,16,15,0.40)" }}>
          Notes (optional)
        </p>
        <textarea
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Fragile · 2 boxes taped together · paid in cash"
          rows={2}
          className={inputCls} style={inputStyle}
        />
      </div>

      {message && (
        <div
          className="rounded-xl px-4 py-3 text-sm font-bold flex items-center justify-between gap-3 flex-wrap"
          style={{
            background: message.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: message.startsWith("✓") ? "#15803d" : "#991b1b",
            border: `1px solid ${message.startsWith("✓") ? "rgba(22,163,74,0.30)" : "rgba(231,0,19,0.30)"}`,
          }}
        >
          <span>{message}</span>
          {lastReceiptId && message.startsWith("✓") && (
            <a
              href={`/admin/inbound/dropoff/${lastReceiptId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 rounded-lg text-xs font-black text-white shrink-0"
              style={{ background: "#15803d" }}
            >
              Open receipt →
            </a>
          )}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !tracking}
          className="flex-1 py-3 rounded-xl text-white font-black disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}
        >
          {submitting ? "Logging…" : "Log dropoff + Print receipt →"}
        </button>
        <button
          type="button"
          onClick={onClear}
          className="px-4 py-3 rounded-xl text-sm font-bold border"
          style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
        >
          Clear
        </button>
      </div>
      <p className="text-[10.5px] mt-1" style={{ color: "rgba(45,16,15,0.45)" }}>
        Carrier <strong style={{ color: NOHO_INK }}>{carrier}</strong> auto-detected from tracking format. Override above if wrong.
      </p>
    </div>
  );
}

/* ─── Daily intake stats card (iter-50) ────────────────────────────────── */
// Standup-style throughput card. Four numbers across, color-coded:
//   - Scanned today: blue (intake)
//   - Awaiting pickup: amber (work in progress)
//   - Picked up today: green (completed)
//   - Held: red (vacation / on hold)
// All counts come from getTodaysIntakeStats() and refresh on every scan
// or pickup confirmation.

function DailyIntakeStatsCard({
  stats,
}: {
  stats: {
    scannedToday: number; awaitingPickup: number; pickedUpToday: number; heldRightNow: number; dropoffsToday: number;
    scannedYesterday: number; pickedUpYesterday: number; dropoffsYesterday: number;
  };
}) {
  // iter-64: Each flow tile carries a delta vs yesterday at the same point
  // of day. State tiles (Awaiting pickup / Held) skip the delta because
  // they aren't comparable across days.
  const items: Array<{
    label: string; value: number; tint: string; ring: string; ink: string;
    deltaVs?: number;
  }> = [
    { label: "Scanned today",   value: stats.scannedToday,    tint: "rgba(51,116,133,0.08)",  ring: "rgba(51,116,133,0.20)", ink: NOHO_BLUE_DEEP, deltaVs: stats.scannedYesterday },
    { label: "Awaiting pickup", value: stats.awaitingPickup,  tint: "rgba(245,166,35,0.10)",  ring: "rgba(245,166,35,0.28)", ink: "#92400e" },
    { label: "Picked up today", value: stats.pickedUpToday,   tint: "rgba(22,163,74,0.10)",   ring: "rgba(22,163,74,0.28)",  ink: "#15803d", deltaVs: stats.pickedUpYesterday },
    { label: "Held",            value: stats.heldRightNow,    tint: "rgba(231,0,19,0.06)",    ring: "rgba(231,0,19,0.22)",   ink: "#991b1b" },
    { label: "Dropoffs today",  value: stats.dropoffsToday,   tint: "rgba(13,148,136,0.10)",  ring: "rgba(13,148,136,0.28)", ink: "#0f766e", deltaVs: stats.dropoffsYesterday },
  ];
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
      {items.map((it) => {
        const hasDelta = it.deltaVs !== undefined;
        const delta = hasDelta ? it.value - (it.deltaVs ?? 0) : 0;
        // Treat 0 delta as flat (gray); positive = up arrow; negative = down.
        const trend = !hasDelta ? null : delta === 0 ? "flat" : delta > 0 ? "up" : "down";
        const trendBg = trend === "up" ? "rgba(22,163,74,0.14)" : trend === "down" ? "rgba(231,0,19,0.10)" : "rgba(45,16,15,0.06)";
        const trendFg = trend === "up" ? "#15803d" : trend === "down" ? "#991b1b" : "rgba(45,16,15,0.55)";
        const trendArrow = trend === "up" ? "▲" : trend === "down" ? "▼" : "·";
        return (
          <div
            key={it.label}
            className="rounded-2xl border p-3"
            style={{ background: it.tint, borderColor: it.ring }}
          >
            <p className="text-[9.5px] font-black uppercase tracking-[0.16em]" style={{ color: it.ink, opacity: 0.78 }}>
              {it.label}
            </p>
            <div className="mt-1 flex items-baseline gap-1.5 flex-wrap">
              <p className="text-2xl font-black tabular-nums leading-none" style={{ color: it.ink }}>
                {it.value}
              </p>
              {trend && (
                <span
                  className="text-[9.5px] font-black tabular-nums px-1.5 py-0.5 rounded"
                  style={{ background: trendBg, color: trendFg }}
                  title={`Yesterday at this time: ${it.deltaVs}`}
                >
                  {trendArrow}{trend === "flat" ? "0" : (delta > 0 ? `+${delta}` : delta)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Customer pickup card (iter-76) ────────────────────────────────────── */
// Renders one matched customer + their active packages with a one-tap
// "Picked up ✓" button per package. Used when the walk-in customer
// doesn't have their tracking number — admin types their name and we
// list every package waiting for them.

function CustomerPickupCard({
  customer, pending, onPick,
}: {
  customer: CustomerWithPackages;
  pending: boolean;
  onPick: (mailItemId: string, recipientName: string, suiteNumber: string | null) => void;
}) {
  const recipientName = customer.name ?? "(no name)";
  const openLightbox = useOpenLightbox();
  return (
    <div
      className="rounded-2xl border p-4"
      style={{
        borderColor: "#16A34A",
        background: "linear-gradient(180deg, rgba(22,163,74,0.05), white)",
      }}
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#15803d" }}>
            Customer match
          </p>
          <p className="text-lg font-black mt-0.5" style={{ color: NOHO_INK }}>
            {recipientName}
          </p>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {customer.suiteNumber && (
              <span className="text-[11px] font-black px-2 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                Suite #{customer.suiteNumber}
              </span>
            )}
            <span className="text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>
              {customer.email}
            </span>
          </div>
        </div>
        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded" style={{ background: "rgba(22,163,74,0.14)", color: "#15803d" }}>
          {customer.activePackages.length} active
        </span>
      </div>
      <ul className="mt-3 space-y-2">
        {customer.activePackages.map((p) => {
          const carrierLabel = (p.carrier ?? p.from ?? "PKG").trim();
          return (
            <li
              key={p.id}
              className="rounded-xl border p-2.5 flex items-center gap-2.5"
              style={{ borderColor: "#e8e5e0", background: "white" }}
            >
              {p.exteriorImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={p.exteriorImageUrl}
                  alt="Click to enlarge"
                  title="Click to enlarge"
                  onClick={() => openLightbox(p.exteriorImageUrl!)}
                  className="shrink-0 w-9 h-9 rounded-lg object-cover border cursor-zoom-in"
                  style={{ borderColor: "#e8e5e0" }}
                />
              ) : (
                <span
                  className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black"
                  style={{ background: NOHO_BLUE_DEEP, color: NOHO_CREAM, letterSpacing: "0.04em" }}
                >
                  {carrierLabel.slice(0, 4).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-black truncate" style={{ color: NOHO_INK }}>
                  {carrierLabel} · {p.trackingNumber || "—"}
                </p>
                <p className="text-[10.5px] mt-0.5" style={{ color: "rgba(45,16,15,0.55)" }}>
                  <ScanStatusPill status={p.status} />
                  <span className="ml-1.5">Logged {new Date(p.createdAtIso).toLocaleString()}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => onPick(p.id, recipientName, customer.suiteNumber)}
                disabled={pending}
                title="Hand this package to the customer in person and mark it picked up"
                className="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-black border disabled:opacity-50"
                style={{
                  borderColor: "#16A34A",
                  color: "white",
                  background: pending ? "#15803d" : "#16A34A",
                }}
              >
                Picked up ✓
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/* ─── Pickup-mode match panel (iter-49) ─────────────────────────────────── */
// Replaces the customer picker + intake details when the panel is in
// pickup mode. Three states:
//   1. No tracking yet → instructional placeholder.
//   2. Looking up → spinner.
//   3. Match found → big match card with "Confirm picked up" button.
//   4. No match → red error inline.

function PickupMatchPanel({
  match, duplicates, looking, message, tracking, customers, onConfirmCustomerPackage,
  onLookup, onConfirm, onClear, onScanAgain, onReassigned, pending,
}: {
  match: PickupMatch | null;
  duplicates: number;
  looking: boolean;
  message: string | null;
  tracking: string;
  // iter-76: Customer-search fallback results.
  customers: CustomerWithPackages[];
  onConfirmCustomerPackage: (mailItemId: string, recipientName: string, suiteNumber: string | null) => void;
  onLookup: () => void;
  onConfirm: () => void;
  onClear: () => void;
  onScanAgain: () => void;
  onReassigned: () => void;
  pending: boolean;
}) {
  // iter-72: Local-only modal toggle. When admin spots a wrong-suite
  // assignment mid-handoff, they open the same ReassignCustomerModal the
  // RecentScans rows use → fix it → on success the parent re-runs the
  // pickup lookup so the match card refreshes with the new owner.
  const [reassignOpen, setReassignOpen] = useState(false);
  const openLightbox = useOpenLightbox();
  // No tracking entered yet — show a soft prompt so the panel doesn't look
  // empty when admin first switches to pickup mode.
  if (!tracking && !match && !message) {
    return (
      <div
        className="rounded-2xl border-2 border-dashed p-6 text-center"
        style={{ borderColor: "rgba(51,116,133,0.30)", background: "rgba(51,116,133,0.04)" }}
      >
        <p className="text-[12px] font-black uppercase tracking-[0.2em]" style={{ color: NOHO_BLUE_DEEP }}>
          Pickup mode
        </p>
        <p className="text-[12px] mt-1.5" style={{ color: "rgba(45,16,15,0.65)" }}>
          Scan the tracking number — or the customer's <strong>QR Pickup code</strong> from their phone — or type their name. One tap confirms the in-person handoff.
        </p>
      </div>
    );
  }

  // Lookup in flight — keep it small so the layout doesn't jump.
  if (looking) {
    return (
      <div
        className="rounded-2xl bg-white border p-4 text-center text-[12px] font-bold"
        style={{ borderColor: "#e8e5e0", color: "rgba(45,16,15,0.65)" }}
      >
        Looking up "{tracking}"…
      </div>
    );
  }

  // iter-76: Customer-search results — admin typed a name, we found
  // matching customers + their active packages. Each package row has a
  // one-tap pickup confirm.
  if (customers.length > 0) {
    return (
      <div className="space-y-2">
        {message && (
          <p
            className="text-[11.5px] font-bold rounded-lg px-3 py-2"
            style={{
              background: message.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
              color: message.startsWith("✓") ? "#15803d" : "#991b1b",
            }}
          >
            {message}
          </p>
        )}
        {customers.map((c) => (
          <CustomerPickupCard
            key={c.id}
            customer={c}
            pending={pending}
            onPick={onConfirmCustomerPackage}
          />
        ))}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-1.5 rounded-lg text-[11px] font-bold border"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  // No match — show a "find by lookup" prompt + the message.
  if (!match) {
    return (
      <div
        className="rounded-2xl border p-4"
        style={{ borderColor: "rgba(231,0,19,0.40)", background: "rgba(231,0,19,0.04)" }}
      >
        <p className="text-[12px] font-black" style={{ color: "#991b1b" }}>
          {message ?? "No active package found. Try a longer fragment."}
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={onLookup}
            className="px-3 py-2 rounded-lg text-[11px] font-black text-white"
            style={{ background: NOHO_BLUE }}
          >
            Look up again
          </button>
          <button
            type="button"
            onClick={onClear}
            className="px-3 py-2 rounded-lg text-[11px] font-bold border"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  // Match found — big confirm card with photo, recipient, suite, tracking,
  // status pill, and a green primary button.
  return (
    <div
      className="rounded-2xl border-2 p-4"
      style={{
        borderColor: "#16A34A",
        background: "linear-gradient(180deg, rgba(22,163,74,0.06), white)",
        boxShadow: "0 8px 28px rgba(22,163,74,0.14)",
      }}
    >
      <div className="flex items-start gap-3">
        {match.exteriorImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={match.exteriorImageUrl}
            alt="Click to enlarge"
            title="Click to enlarge"
            onClick={() => openLightbox(match.exteriorImageUrl!)}
            className="shrink-0 w-20 h-20 rounded-xl object-cover border cursor-zoom-in"
            style={{ borderColor: "#16A34A" }}
          />
        ) : (
          <span
            className="shrink-0 w-20 h-20 rounded-xl flex items-center justify-center text-[10px] font-black"
            style={{ background: NOHO_BLUE_DEEP, color: NOHO_CREAM }}
          >
            no photo
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: "#15803d" }}>
            Match found · in-person handoff
          </p>
          <p className="text-2xl font-black mt-0.5 leading-tight truncate" style={{ color: NOHO_INK }}>
            {match.recipientName || "—"}
          </p>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {match.suiteNumber && (
              <span className="text-[11px] font-black px-2 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                Suite #{match.suiteNumber}
              </span>
            )}
            <ScanStatusPill status={match.status} />
            {duplicates > 0 && (
              <span
                className="text-[10px] font-black px-1.5 py-0.5 rounded"
                style={{ background: "rgba(245,166,35,0.14)", color: "#92400e" }}
                title={`${duplicates} other active package(s) match this tracking fragment. Verify against the label.`}
              >
                +{duplicates} other match{duplicates === 1 ? "" : "es"}
              </span>
            )}
          </div>
          <p className="text-[11px] mt-1 font-mono truncate" style={{ color: NOHO_BLUE_DEEP }}>
            {match.carrier} · {match.trackingNumber}
          </p>
          {match.email && (
            <p className="text-[10.5px] mt-0.5 truncate" style={{ color: "rgba(45,16,15,0.55)" }}>
              {match.email}
            </p>
          )}
        </div>
      </div>
      <div className="mt-4 flex items-center gap-2">
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className="flex-1 py-3 rounded-xl text-white font-black disabled:opacity-40"
          style={{ background: "linear-gradient(135deg, #16A34A, #15803d)" }}
        >
          {pending ? "Confirming…" : "Confirm picked up ✓"}
        </button>
        {/* iter-55: One-tap rescan from the match card. Saves admin from
            having to navigate back to the tracking input + re-open the
            camera modal between consecutive counter pickups. */}
        <button
          type="button"
          onClick={onScanAgain}
          disabled={pending}
          title="Clear and reopen the camera for the next pickup"
          className="px-4 py-3 rounded-xl text-xs font-black text-white disabled:opacity-40"
          style={{ background: NOHO_BLUE, boxShadow: `0 4px 14px ${NOHO_BLUE}40` }}
        >
          Scan next →
        </button>
        <button
          type="button"
          onClick={onClear}
          className="px-4 py-3 rounded-xl text-sm font-bold border"
          style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
        >
          Clear
        </button>
      </div>
      {/* iter-69: Keyboard shortcut hint. Tracking input is always focused
          so admin can press these without taking their hand off the
          scanner. */}
      <div className="mt-2 flex items-center justify-between gap-2 flex-wrap">
        <p className="text-[10px] font-bold" style={{ color: "rgba(45,16,15,0.45)" }}>
          Tip · press <kbd style={{ padding: "1px 4px", borderRadius: 3, border: "1px solid #e8e5e0", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>Enter</kbd> to confirm or <kbd style={{ padding: "1px 4px", borderRadius: 3, border: "1px solid #e8e5e0", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>Esc</kbd> to clear.
        </p>
        {/* iter-72: Quick reassign — admin spots wrong-suite mid-handoff
            and can re-route in two clicks. Modal closes on success and
            the parent re-fires the lookup so the match card refreshes. */}
        <button
          type="button"
          onClick={() => setReassignOpen(true)}
          className="text-[10.5px] font-bold underline-offset-2 hover:underline"
          style={{ color: "rgba(45,16,15,0.55)" }}
          title="Wrong customer? Reassign this package to a different suite."
        >
          Wrong customer? Reassign →
        </button>
      </div>
      {reassignOpen && match && (
        <ReassignCustomerModal
          row={{
            id: match.id,
            recipientName: match.recipientName,
            suiteNumber: match.suiteNumber,
            carrier: match.carrier,
            trackingNumber: match.trackingNumber,
          }}
          onClose={() => setReassignOpen(false)}
          onDone={() => {
            setReassignOpen(false);
            // Tell parent to refresh — the assigned user just changed,
            // so the match card needs to reflect the new owner.
            onReassigned();
          }}
        />
      )}
      {message && (
        <p
          className="mt-3 text-[11.5px] font-bold rounded-lg px-3 py-2"
          style={{
            background: message.startsWith("✓") ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: message.startsWith("✓") ? "#15803d" : "#991b1b",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}

/* ─── Recent dropoffs list (iter-58) ────────────────────────────────────── */
// External dropoff feed — last 48h. Awaiting Carrier first (oldest), then
// terminal entries below. Each row offers "Carrier picked up ✓" if active
// + a Re-print receipt link.

function RecentDropoffsList({
  rows, onChanged,
}: {
  rows: RecentDropoff[];
  onChanged: () => void;
}) {
  const [pendingCarrier, setPendingCarrier] = useState<string | null>(null);
  const [sweepError, setSweepError] = useState<string | null>(null);
  const [sweepMsg, setSweepMsg] = useState<string | null>(null);
  const awaiting = rows.filter((r) => r.status === "Awaiting Carrier").length;
  // iter-62: Compute the carrier breakdown of awaiting items so we can
  // render one sweep button per carrier that actually has pending work.
  // Empty when nothing is awaiting → no buttons render.
  const awaitingByCarrier = rows.reduce<Record<string, number>>((acc, r) => {
    if (r.status !== "Awaiting Carrier") return acc;
    const key = (r.carrier || "Unknown").trim();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  const carriers = Object.keys(awaitingByCarrier).sort();

  function sweep(carrier: string) {
    setSweepError(null);
    setSweepMsg(null);
    setPendingCarrier(carrier);
    void bulkMarkDropoffsPickedUpByCarrier(carrier)
      .then((res) => {
        if ((res as { error?: string }).error) {
          setSweepError((res as { error?: string }).error || "Sweep failed");
          return;
        }
        const count = (res as { count?: number }).count ?? 0;
        setSweepMsg(`✓ Marked ${count} ${carrier} package${count === 1 ? "" : "s"} picked up`);
        onChanged();
      })
      .catch(() => setSweepError("Sweep failed"))
      .finally(() => setPendingCarrier(null));
  }

  return (
    <div className="rounded-2xl bg-white border" style={{ borderColor: "#e8e5e0", boxShadow: "0 1px 2px rgba(45,16,15,0.04)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b flex-wrap gap-2" style={{ borderColor: "#e8e5e0" }}>
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#15803d", boxShadow: "0 0 6px #15803d" }} />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.40)" }}>
              External dropoffs · last 48h
            </p>
            <p className="text-[12px] font-black mt-0.5" style={{ color: NOHO_INK }}>
              {rows.length} dropoff{rows.length === 1 ? "" : "s"}{awaiting > 0 ? ` · ${awaiting} awaiting carrier` : ""}
            </p>
          </div>
        </div>
        {/* iter-62: Per-carrier sweep buttons. One click per carrier when
            their truck arrives → all awaiting flips to picked up. */}
        {carriers.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {carriers.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => sweep(c)}
                disabled={pendingCarrier !== null}
                title={`Mark all ${awaitingByCarrier[c]} awaiting ${c} dropoff${awaitingByCarrier[c] === 1 ? "" : "s"} as picked up by carrier`}
                className="px-2.5 py-1.5 rounded-lg text-[11px] font-black border disabled:opacity-50"
                style={{
                  background: pendingCarrier === c ? "#15803d" : "#16A34A",
                  borderColor: "#16A34A",
                  color: "white",
                }}
              >
                {pendingCarrier === c ? "…" : `Sweep ${c} · ${awaitingByCarrier[c]}`}
              </button>
            ))}
          </div>
        )}
      </div>
      {(sweepMsg || sweepError) && (
        <div
          className="px-4 py-2 text-[11.5px] font-bold border-b"
          style={{
            background: sweepMsg ? "rgba(22,163,74,0.10)" : "rgba(231,0,19,0.10)",
            color: sweepMsg ? "#15803d" : "#991b1b",
            borderColor: "#e8e5e0",
          }}
        >
          {sweepMsg ?? sweepError}
        </div>
      )}
      <ul className="divide-y" style={{ borderColor: "#e8e5e0" }}>
        {rows.map((r) => (
          <RecentDropoffRow key={r.id} row={r} onChanged={onChanged} />
        ))}
      </ul>
    </div>
  );
}

function RecentDropoffRow({ row: r, onChanged }: { row: RecentDropoff; onChanged: () => void }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const openLightbox = useOpenLightbox();
  const ago = (() => {
    const ms = Date.now() - Date.parse(r.createdAtIso);
    const min = Math.round(ms / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
  })();
  const cs = (() => {
    const c = (r.carrier || "").toLowerCase();
    if (c.includes("usps")) return { bg: "linear-gradient(135deg, #2D5BA8, #1c3f7a)", fg: "#fff", label: "USPS" };
    if (c.includes("ups")) return { bg: "linear-gradient(135deg, #6B3F1A, #3F2410)", fg: "#FFC107", label: "UPS" };
    if (c.includes("fedex")) return { bg: "linear-gradient(135deg, #4D148C, #2E0A57)", fg: "#FF6600", label: "FedEx" };
    if (c.includes("dhl")) return { bg: "#FFCC00", fg: "#D40511", label: "DHL" };
    if (c.includes("amazon")) return { bg: "#FF9900", fg: "#1a1a1a", label: "AMZN" };
    return { bg: NOHO_BLUE_DEEP, fg: NOHO_CREAM, label: r.carrier.slice(0, 4).toUpperCase() };
  })();
  function markCarrierPickup() {
    setError(null);
    startTransition(async () => {
      const res = await markDropoffPickedUpByCarrier(r.id);
      if ((res as { error?: string }).error) {
        setError((res as { error?: string }).error || "Failed");
        return;
      }
      onChanged();
    });
  }
  const isActive = r.status === "Awaiting Carrier";
  // iter-63: Stale predicate for dropoffs. Carriers should sweep daily —
  // anything still awaiting carrier > 24h means we missed yesterday's
  // sweep and the package is sitting longer than expected. Two tiers:
  //   24h → amber "Stale"  (missed today's sweep, watch tomorrow)
  //   48h → red "Overdue"  (missed two sweeps; call the carrier)
  const ageHours = isActive
    ? Math.floor((Date.now() - Date.parse(r.createdAtIso)) / (60 * 60 * 1000))
    : 0;
  const dropoffStaleness: null | "stale" | "overdue" = isActive
    ? (ageHours >= 48 ? "overdue" : ageHours >= 24 ? "stale" : null)
    : null;

  return (
    <li className="px-4 py-3 flex items-center gap-3">
      {r.exteriorImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={r.exteriorImageUrl}
          alt="Click to enlarge"
          title="Click to enlarge"
          onClick={() => openLightbox(r.exteriorImageUrl!)}
          className="shrink-0 w-9 h-9 rounded-lg object-cover border cursor-zoom-in"
          style={{ borderColor: "#e8e5e0" }}
        />
      ) : (
        <span
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black"
          style={{ background: cs.bg, color: cs.fg, letterSpacing: "0.04em" }}
        >
          {cs.label}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black truncate flex items-center gap-1.5 flex-wrap" style={{ color: NOHO_INK }}>
          <span className="truncate">{r.senderName ?? "(no sender)"}</span>
          {r.receiverName && (
            <span className="text-[10px] font-bold" style={{ color: "rgba(45,16,15,0.55)" }}>
              → {r.receiverName}
            </span>
          )}
          <span
            className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
            style={{
              background: isActive ? "rgba(245,166,35,0.14)" : "rgba(22,163,74,0.14)",
              color: isActive ? "#92400e" : "#15803d",
            }}
          >
            {isActive ? "Awaiting carrier" : "Picked up by carrier"}
          </span>
          {dropoffStaleness && (
            <span
              className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
              style={{
                background: dropoffStaleness === "overdue" ? "rgba(231,0,19,0.10)" : "rgba(245,166,35,0.18)",
                color: dropoffStaleness === "overdue" ? "#991b1b" : "#92400e",
              }}
              title={
                dropoffStaleness === "overdue"
                  ? `Overdue — has been awaiting carrier for ${ageHours}h. Call the carrier; they should have swept twice by now.`
                  : `Stale — has been awaiting carrier for ${ageHours}h. Today's sweep already happened or is overdue.`
              }
            >
              {dropoffStaleness === "overdue" ? "Overdue" : "Stale"} · {ageHours}h
            </span>
          )}
        </p>
        <p className="text-[10.5px] mt-0.5 font-mono truncate" style={{ color: NOHO_BLUE_DEEP }}>
          {r.trackingNumber}
          <span style={{ color: "rgba(45,16,15,0.40)", marginLeft: 6 }}>· {ago}</span>
          {r.destination && (
            <span style={{ color: "rgba(45,16,15,0.55)", marginLeft: 6 }}>· {r.destination}</span>
          )}
        </p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          {isActive && (
            <button
              type="button"
              onClick={markCarrierPickup}
              disabled={pending}
              title="Mark this dropoff as collected by the carrier sweep"
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-black border disabled:opacity-50"
              style={{
                borderColor: "#16A34A",
                color: "white",
                background: pending ? "#15803d" : "#16A34A",
              }}
            >
              {pending ? "…" : "Carrier picked up ✓"}
            </button>
          )}
          <a
            href={`/admin/inbound/dropoff/${r.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
          >
            Re-print →
          </a>
        </div>
        {error && (
          <span className="text-[10px] font-bold text-red-700 max-w-[220px] text-right truncate" title={error}>
            {error}
          </span>
        )}
      </div>
    </li>
  );
}

/* ─── Awaiting-pickup shelf list (iter-56) ──────────────────────────────── */
// Oldest-first browse of everything currently sitting on the shelf. Empty
// state hidden so a clean shelf doesn't look like a broken panel; non-empty
// state shows a green pulse dot if all items are <4d (no storage tier yet)
// or amber/red if anything is overdue.

function AwaitingShelfList({
  shelf, onChanged,
}: {
  shelf: { total: number; rows: RecentScan[] };
  onChanged: () => void;
}) {
  // iter-77: Empty shelf is a celebratory state, not a missing card.
  // For a busy bureau, "shelf cleared" is worth seeing — confirms
  // everything's been handed off.
  if (shelf.total === 0) {
    return (
      <div
        className="rounded-2xl border-2 border-dashed p-4 flex items-center gap-3"
        style={{ borderColor: "rgba(22,163,74,0.30)", background: "rgba(22,163,74,0.04)" }}
      >
        <span className="inline-block w-8 h-8 rounded-full flex items-center justify-center text-base font-black text-white shrink-0" style={{ background: "#16A34A" }}>✓</span>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "#15803d" }}>
            Shelf is clear
          </p>
          <p className="text-[12px] font-bold mt-0.5" style={{ color: NOHO_INK }}>
            No packages waiting for pickup right now.
          </p>
        </div>
      </div>
    );
  }
  // Compute the worst staleness on the shelf so the header dot can flag
  // "we have overdue packages" without admin scanning every row.
  const oldestAgeDays = shelf.rows.length === 0
    ? 0
    : Math.max(
        ...shelf.rows.map((r) => Math.floor((Date.now() - Date.parse(r.createdAtIso)) / (24 * 60 * 60 * 1000))),
      );
  const dotColor = oldestAgeDays >= 7 ? "#dc2626" : oldestAgeDays >= 4 ? "#F5A623" : "#16A34A";
  return (
    <div className="rounded-2xl bg-white border" style={{ borderColor: "#e8e5e0", boxShadow: "0 1px 2px rgba(45,16,15,0.04)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#e8e5e0" }}>
        <div className="flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}` }} />
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.40)" }}>
              On the shelf · oldest first
            </p>
            <p className="text-[12px] font-black mt-0.5" style={{ color: NOHO_INK }}>
              Showing {shelf.rows.length} of {shelf.total} package{shelf.total === 1 ? "" : "s"}
            </p>
          </div>
        </div>
        {oldestAgeDays >= 4 && (
          <span
            className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded"
            style={{
              background: oldestAgeDays >= 7 ? "rgba(231,0,19,0.10)" : "rgba(245,166,35,0.14)",
              color: oldestAgeDays >= 7 ? "#991b1b" : "#92400e",
            }}
            title={`Oldest item has been on the shelf ${oldestAgeDays} days. Storage tier ($6.50/day from day 4) per Terms.`}
          >
            Oldest · {oldestAgeDays}d
          </span>
        )}
      </div>
      <ul className="divide-y" style={{ borderColor: "#e8e5e0" }}>
        {shelf.rows.map((r) => (
          <RecentScanRow key={r.id} row={r} onChanged={onChanged} />
        ))}
      </ul>
      {shelf.total > shelf.rows.length && (
        <div className="px-4 py-2 border-t text-center" style={{ borderColor: "#e8e5e0" }}>
          <a
            href="/admin?tab=mail"
            className="text-[11px] font-bold"
            style={{ color: NOHO_BLUE_DEEP }}
          >
            View all {shelf.total} on the shelf →
          </a>
        </div>
      )}
    </div>
  );
}

/* ─── Recent scans list ──────────────────────────────────────────────────── */

function RecentScansList({ rows, onRefresh }: { rows: RecentScan[]; onRefresh: () => void }) {
  if (rows.length === 0) return null;
  return (
    <div className="rounded-2xl bg-white border" style={{ borderColor: "#e8e5e0", boxShadow: "0 1px 2px rgba(45,16,15,0.04)" }}>
      <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "#e8e5e0" }}>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.40)" }}>
            Recent scans · last 48h
          </p>
          <p className="text-[12px] font-black mt-0.5" style={{ color: NOHO_INK }}>
            {rows.length} package{rows.length === 1 ? "" : "s"} logged
          </p>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="text-[11px] font-bold px-2.5 py-1 rounded-lg border"
          style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
        >
          Refresh
        </button>
      </div>
      <ul className="divide-y" style={{ borderColor: "#e8e5e0" }}>
        {rows.map((r) => (
          <RecentScanRow key={r.id} row={r} onChanged={onRefresh} />
        ))}
      </ul>
    </div>
  );
}

// Status values where a one-click "Picked Up" action makes sense. Anything
// terminal (Picked Up / Forwarded / Returned / Discarded) gets no action.
// The server still enforces the full state machine; this is just the UI gate
// for what to render.
const ACTIVE_PICKUP_STATES = new Set(["Received", "Scanned", "Awaiting Pickup"]);

function RecentScanRow({ row: r, onChanged }: { row: RecentScan; onChanged: () => void }) {
  const [pending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [reassignOpen, setReassignOpen] = useState(false);
  const openLightbox = useOpenLightbox();

  // Per the Khiari memory: customers must visit the bureau in person — no
  // e-signatures, no remote pickup. So this button is the "I just handed
  // the package over the counter" confirmation, with the admin's session
  // serving as the witness/signature record (audit log captures actor).
  function markPickedUp() {
    setActionError(null);
    startTransition(async () => {
      const res = await updateMailStatus(r.id, "Picked Up");
      if ((res as { error?: string }).error) {
        setActionError((res as { error?: string }).error || "Failed");
        return;
      }
      onChanged();
    });
  }
  function markHeld() {
    setActionError(null);
    startTransition(async () => {
      const res = await updateMailStatus(r.id, "Held");
      if ((res as { error?: string }).error) {
        setActionError((res as { error?: string }).error || "Failed");
        return;
      }
      onChanged();
    });
  }
  // iter-53: Held → Awaiting Pickup. The state machine allows it, but
  // there was no UI affordance — admin would have to find the item in the
  // master list to bring it back. This button closes that loop so a Held
  // package can come back to the active shelf in one tap.
  function markBackToShelf() {
    setActionError(null);
    startTransition(async () => {
      const res = await updateMailStatus(r.id, "Awaiting Pickup");
      if ((res as { error?: string }).error) {
        setActionError((res as { error?: string }).error || "Failed");
        return;
      }
      onChanged();
    });
  }
  // iter-74: Re-fire the mail-arrived email + in-app notification for
  // stale shelf items. Throttled server-side to once per 24h.
  const [nudgeMsg, setNudgeMsg] = useState<string | null>(null);
  function nudge() {
    setActionError(null);
    setNudgeMsg(null);
    startTransition(async () => {
      const res = await nudgeStaleCustomer(r.id);
      const e = (res as { error?: string }).error;
      if (e) {
        setActionError(e);
        return;
      }
      const partial = (res as { partial?: boolean; message?: string }).partial;
      if (partial) {
        setNudgeMsg((res as { message?: string }).message ?? "Sent (partial).");
      } else {
        setNudgeMsg("✓ Customer notified");
      }
    });
  }

  const canPickup = ACTIVE_PICKUP_STATES.has(r.status);
  const canHold = r.status === "Received" || r.status === "Scanned" || r.status === "Awaiting Pickup";
  const canBringBack = r.status === "Held";
  // iter-54: Allowed reassign states mirror the server-side allowlist.
  // Terminal states (Picked Up / Forwarded / Returned / Discarded) hide
  // the reassign affordance — the wrong customer already has it.
  const canReassign = ["Received", "Scanned", "Awaiting Pickup", "Held"].includes(r.status);

  // iter-53: Stale chip — a package sitting in Awaiting Pickup for >7 days
  // is sitting on the shelf longer than it should. The bureau should reach
  // out to the customer; storage tier kicks in at day 4 per Terms.
  const ageMs = Date.now() - Date.parse(r.createdAtIso);
  const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
  const isStale = (r.status === "Awaiting Pickup" || r.status === "Received" || r.status === "Scanned") && ageDays >= 7;

  const ago = (() => {
    const ms = Date.now() - Date.parse(r.createdAtIso);
    const min = Math.round(ms / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
  })();
  const cs = (() => {
    const c = (r.carrier || "").toLowerCase();
    if (c.includes("usps")) return { bg: "linear-gradient(135deg, #2D5BA8, #1c3f7a)", fg: "#fff", label: "USPS" };
    if (c.includes("ups")) return { bg: "linear-gradient(135deg, #6B3F1A, #3F2410)", fg: "#FFC107", label: "UPS" };
    if (c.includes("fedex")) return { bg: "linear-gradient(135deg, #4D148C, #2E0A57)", fg: "#FF6600", label: "FedEx" };
    if (c.includes("dhl")) return { bg: "#FFCC00", fg: "#D40511", label: "DHL" };
    if (c.includes("amazon")) return { bg: "#FF9900", fg: "#1a1a1a", label: "AMZN" };
    return { bg: NOHO_BLUE_DEEP, fg: NOHO_CREAM, label: r.carrier.slice(0, 4).toUpperCase() };
  })();
  return (
    <li className="px-4 py-3 flex items-center gap-3">
      {r.exteriorImageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={r.exteriorImageUrl}
          alt="Click to enlarge"
          title="Click to enlarge"
          onClick={() => openLightbox(r.exteriorImageUrl!)}
          className="shrink-0 w-9 h-9 rounded-lg object-cover border cursor-zoom-in"
          style={{ borderColor: "#e8e5e0" }}
        />
      ) : (
        <span
          className="shrink-0 w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black"
          style={{ background: cs.bg, color: cs.fg, letterSpacing: "0.04em" }}
        >
          {cs.label}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-black truncate flex items-center gap-1.5 flex-wrap" style={{ color: NOHO_INK }}>
          <span className="truncate">{r.recipientName || "—"}</span>
          {r.suiteNumber && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
              Suite #{r.suiteNumber}
            </span>
          )}
          {/* Lifecycle status pill — at-a-glance "where is this package now?" */}
          <ScanStatusPill status={r.status} />
          {isStale && (
            <span
              className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
              style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}
              title={`On the shelf for ${ageDays} days. Storage tier kicks in at day 4 per Terms — consider reaching out to the customer.`}
            >
              Stale · {ageDays}d
            </span>
          )}
        </p>
        <p className="text-[10.5px] mt-0.5 font-mono truncate" style={{ color: NOHO_BLUE_DEEP }}>
          {r.trackingNumber || "—"}
          <span style={{ color: "rgba(45,16,15,0.40)", marginLeft: 6 }}>· {ago}</span>
          {r.weightOz != null && (
            <span style={{ color: "rgba(45,16,15,0.55)", marginLeft: 6 }}>· {(r.weightOz / 16).toFixed(2)} lb</span>
          )}
          {r.dimensions && (
            <span style={{ color: "rgba(45,16,15,0.55)", marginLeft: 6 }}>· {r.dimensions}</span>
          )}
        </p>
      </div>
      <div className="shrink-0 flex flex-col items-end gap-1">
        <div className="flex items-center gap-1.5">
          {canPickup && (
            <button
              type="button"
              onClick={markPickedUp}
              disabled={pending}
              title="Mark this package as handed to the customer in person"
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-black border disabled:opacity-50 transition-colors"
              style={{
                borderColor: "#16A34A",
                color: "white",
                background: pending ? "#15803d" : "#16A34A",
              }}
            >
              {pending ? "…" : "Picked up ✓"}
            </button>
          )}
          {canHold && (
            <button
              type="button"
              onClick={markHeld}
              disabled={pending}
              title="Move this package to the Held shelf (not ready for pickup)"
              className="px-2 py-1.5 rounded-lg text-[11px] font-bold border disabled:opacity-50"
              style={{
                borderColor: "#F5A623",
                color: "#92400e",
                background: "white",
              }}
            >
              Hold
            </button>
          )}
          {canBringBack && (
            <button
              type="button"
              onClick={markBackToShelf}
              disabled={pending}
              title="Move this package off the Held shelf and back to Awaiting Pickup"
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border disabled:opacity-50"
              style={{
                borderColor: NOHO_BLUE,
                color: NOHO_BLUE_DEEP,
                background: "white",
              }}
            >
              Bring to shelf →
            </button>
          )}
          {canReassign && (
            <button
              type="button"
              onClick={() => setReassignOpen(true)}
              disabled={pending}
              title="Wrong suite? Reassign this package to a different customer."
              className="px-2 py-1.5 rounded-lg text-[11px] font-bold border disabled:opacity-50"
              style={{
                borderColor: "#e8e5e0",
                color: "rgba(45,16,15,0.65)",
                background: "white",
              }}
            >
              Reassign
            </button>
          )}
          {/* iter-74: Nudge customer — only shown when the package is stale
              (>7d on the shelf). Re-fires the mail-arrived email + creates
              a fresh dashboard notification. Throttled server-side. */}
          {isStale && (
            <button
              type="button"
              onClick={nudge}
              disabled={pending}
              title="Re-send the mail-arrived email and create a fresh dashboard notification for the customer"
              className="px-2 py-1.5 rounded-lg text-[11px] font-black border disabled:opacity-50"
              style={{
                borderColor: "#F5A623",
                color: "white",
                background: pending ? "#92400e" : "#F5A623",
              }}
            >
              Nudge
            </button>
          )}
          <a
            href={`/admin/inbound/receipt/${r.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
          >
            Re-print →
          </a>
        </div>
        {actionError && (
          <span className="text-[10px] font-bold text-red-700 max-w-[220px] text-right truncate" title={actionError}>
            {actionError}
          </span>
        )}
        {nudgeMsg && (
          <span className="text-[10px] font-bold max-w-[220px] text-right truncate" style={{ color: nudgeMsg.startsWith("✓") ? "#15803d" : "#92400e" }} title={nudgeMsg}>
            {nudgeMsg}
          </span>
        )}
      </div>
      {reassignOpen && (
        <ReassignCustomerModal
          row={r}
          onClose={() => setReassignOpen(false)}
          onDone={() => {
            setReassignOpen(false);
            onChanged();
          }}
        />
      )}
    </li>
  );
}

/* ─── Reassign customer modal (iter-54) ─────────────────────────────────── */
// Lets admin fix wrong-suite scans without leaving the panel. Reuses the
// same findCustomersForScan debounce-search the intake form uses.

// iter-72: ReassignCustomerModal accepts a structural minimum so PickupMatch
// (which doesn't have weight/dims) can use it too. The modal only reads
// id, recipientName, suiteNumber, carrier, trackingNumber.
type ReassignableRow = {
  id: string;
  recipientName: string;
  suiteNumber: string;
  carrier: string;
  trackingNumber: string;
};

function ReassignCustomerModal({
  row, onClose, onDone,
}: {
  row: ReassignableRow;
  onClose: () => void;
  onDone: () => void;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<CustomerMatch[]>([]);
  const [picked, setPicked] = useState<CustomerMatch | null>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setMatches([]); return; }
    const handle = setTimeout(() => {
      void findCustomersForScan(q).then((res) => setMatches(res as CustomerMatch[]));
    }, 200);
    return () => clearTimeout(handle);
  }, [query]);

  function submit() {
    if (!picked) return;
    setError(null);
    startTransition(async () => {
      const res = await reassignMailItem({ mailItemId: row.id, newUserId: picked.id });
      if ((res as { error?: string }).error) {
        setError((res as { error?: string }).error || "Reassign failed");
        return;
      }
      onDone();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(45,16,15,0.55)", backdropFilter: "blur(4px)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="rounded-2xl bg-white border w-full max-w-md p-5 shadow-2xl"
        style={{ borderColor: "#e8e5e0" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: NOHO_BLUE_DEEP }}>
              Reassign package
            </p>
            <p className="text-base font-black mt-0.5 truncate" style={{ color: NOHO_INK }}>
              {row.recipientName || "—"} · suite #{row.suiteNumber || "—"}
            </p>
            <p className="text-[11px] mt-0.5 font-mono truncate" style={{ color: NOHO_BLUE_DEEP }}>
              {row.carrier} · {row.trackingNumber}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold rounded-lg px-2 py-1 border"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="mt-4 relative">
          <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(45,16,15,0.40)" }}>
            New customer (suite # / name / email)
          </p>
          <input
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPicked(null); setError(null); }}
            placeholder="e.g. 042 or Sarah Johnson"
            className="mt-2 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]/30"
            style={{ borderColor: picked ? "#16a34a" : "#e8e5e0", color: NOHO_INK, background: "white" }}
            autoFocus
          />
          {matches.length > 0 && !picked && (
            <div
              className="absolute left-0 right-0 mt-1 rounded-xl bg-white border z-10 max-h-64 overflow-auto"
              style={{ borderColor: "#e8e5e0", boxShadow: "0 12px 32px rgba(45,16,15,0.16)" }}
            >
              {matches.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    setPicked(c);
                    setQuery(`Suite #${c.suiteNumber ?? "—"} · ${c.name ?? c.email}`);
                    setMatches([]);
                  }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[#337485]/10 flex items-center justify-between"
                >
                  <span>
                    <strong style={{ color: NOHO_INK }}>{c.name ?? "(no name)"}</strong>
                    <span style={{ color: "rgba(45,16,15,0.55)", marginLeft: 6 }}>{c.email}</span>
                  </span>
                  <span className="text-[10px] font-black px-2 py-0.5 rounded" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                    Suite #{c.suiteNumber ?? "—"}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {error && (
          <p className="mt-3 text-[11.5px] font-bold rounded-lg px-3 py-2" style={{ background: "rgba(231,0,19,0.10)", color: "#991b1b" }}>
            {error}
          </p>
        )}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={submit}
            disabled={pending || !picked}
            className="flex-1 py-2.5 rounded-xl text-white font-black disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})` }}
          >
            {pending ? "Reassigning…" : "Reassign →"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-bold border"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Scanner modal ────────────────────────────────────────────────────── */
// Same BarcodeDetector pattern as IdScanButton (iter for ID scans), but
// configured for shipping-label barcodes (CODE_128 / CODE_39 / QR / DATA_MATRIX).

function ScanModal({
  onClose, onCapture, onError,
}: {
  onClose: () => void;
  onCapture: (value: string) => void;
  onError: (msg: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let stopped = false;
    let stream: MediaStream | null = null;
    let raf = 0;

    async function start() {
      type BD = { new (opts: { formats: string[] }): { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>> } };
      const Detector = (globalThis as unknown as { BarcodeDetector?: BD }).BarcodeDetector;
      if (!Detector) {
        onError("This browser doesn't support barcode scanning. Use Chrome / Safari 17+ or paste the number manually.");
        onClose();
        return;
      }
      let detector: { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
      try {
        detector = new Detector({ formats: ["code_128", "code_39", "qr_code", "data_matrix", "ean_13", "upc_a", "upc_e", "itf"] });
      } catch {
        onError("Barcode scanning failed to initialize.");
        onClose();
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        onError("Couldn't access the camera. Allow the permission and try again.");
        onClose();
        return;
      }
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => {});

      const tick = async () => {
        if (stopped || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const raw = codes[0].rawValue ?? "";
            if (raw && raw.length >= 6) {
              onCapture(raw.trim());
              return;
            }
          }
        } catch { /* keep scanning */ }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }
    void start();
    return () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, [onCapture, onError, onClose]);

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(20,15,10,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl w-full max-w-md bg-white p-3"
        style={{
          border: "1px solid rgba(45,16,15,0.18)",
          boxShadow: "0 24px 60px rgba(45,16,15,0.30)",
        }}
      >
        <div className="flex items-center justify-between gap-2 px-1 pb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: NOHO_BLUE }}>
            Aim camera at barcode
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-bold px-2 py-1 rounded-lg border"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK }}
          >
            Cancel
          </button>
        </div>
        <video ref={videoRef} className="w-full rounded-xl bg-black" muted playsInline style={{ aspectRatio: "16/10" }} />
        <p className="mt-2 px-1 text-[10.5px]" style={{ color: "rgba(45,16,15,0.55)" }}>
          Hold the barcode 4–8 inches from the camera. Auto-captures on read.
        </p>
      </div>
    </div>
  );
}

function ScanStatusPill({ status }: { status: string }) {
  // Map MailItem status into a brand-tinted micro-pill for the recent-scans
  // list. Same color language as the live-tracking pill (Labels list iter-3).
  const map: Record<string, { bg: string; fg: string; label: string }> = {
    "Received":         { bg: "rgba(51,116,133,0.12)",  fg: "#23596A", label: "Received" },
    "Scanned":          { bg: "rgba(124,58,237,0.12)",  fg: "#5B21B6", label: "Scanned" },
    "Awaiting Pickup":  { bg: "rgba(245,166,35,0.14)",  fg: "#92400e", label: "Awaiting" },
    "Held":             { bg: "rgba(245,166,35,0.14)",  fg: "#92400e", label: "Held" },
    "Picked Up":        { bg: "rgba(22,163,74,0.14)",   fg: "#15803d", label: "Picked up" },
    "Forwarded":        { bg: "rgba(22,163,74,0.10)",   fg: "#15803d", label: "Forwarded" },
    "Returned":         { bg: "rgba(231,0,19,0.10)",    fg: "#991b1b", label: "Returned" },
    "Discarded":        { bg: "rgba(231,0,19,0.10)",    fg: "#991b1b", label: "Discarded" },
  };
  const c = map[status] ?? { bg: "rgba(45,16,15,0.06)", fg: "rgba(45,16,15,0.55)", label: status };
  return (
    <span
      className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0"
      style={{ background: c.bg, color: c.fg }}
      title={status}
    >
      {c.label}
    </span>
  );
}

/* ─── Photo capture modal ────────────────────────────────────────────────── */
// Webcam → still capture → JPEG Blob → /api/upload → /assets URL.
// Uses the same getUserMedia pattern as ScanModal so admin grants camera
// permission once for both flows.

function PhotoCaptureModal({
  uploading, onClose, onCapture,
}: {
  uploading: boolean;
  onClose: () => void;
  onCapture: (b: Blob) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let stopped = false;
    async function start() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (stopped) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
      } catch {
        setError("Couldn't access the camera. Allow the permission and try again.");
      }
    }
    void start();
    return () => {
      stopped = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, []);

  function snap() {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c) return;
    c.width = v.videoWidth || 1280;
    c.height = v.videoHeight || 720;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(v, 0, 0, c.width, c.height);
    c.toBlob(
      (blob) => {
        if (!blob) return;
        onCapture(blob);
      },
      "image/jpeg",
      0.85,
    );
  }

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center px-4"
      style={{ background: "rgba(20,15,10,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="rounded-2xl w-full max-w-md bg-white p-3"
        style={{ border: "1px solid rgba(45,16,15,0.18)", boxShadow: "0 24px 60px rgba(45,16,15,0.30)" }}
      >
        <div className="flex items-center justify-between gap-2 px-1 pb-2">
          <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: NOHO_BLUE }}>
            Aim camera at package
          </p>
          <button
            type="button"
            onClick={onClose}
            className="text-[11px] font-bold px-2 py-1 rounded-lg border"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK }}
          >
            Cancel
          </button>
        </div>
        {error ? (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-xs font-bold text-amber-800">
            {error}
          </div>
        ) : (
          <>
            <video ref={videoRef} className="w-full rounded-xl bg-black" muted playsInline style={{ aspectRatio: "16/10" }} />
            <canvas ref={canvasRef} hidden />
            <button
              type="button"
              onClick={snap}
              disabled={uploading}
              className="mt-2 w-full py-2.5 rounded-xl text-white font-black text-sm disabled:opacity-50"
              style={{ background: NOHO_BLUE }}
            >
              {uploading ? "Uploading…" : "Capture & upload →"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
