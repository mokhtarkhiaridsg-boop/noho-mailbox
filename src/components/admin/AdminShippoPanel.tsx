"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  getShippoRates,
  buyShippoLabel,
  trackShippoLabel,
  refundShippoLabel,
  forwardShippoLabel,
  getShippoSender,
  updateShippoSender,
  getCarrierAccountsWithSelection,
  setActiveCarrierAccountIds,
  getRecentRecipients,
  validateShippoAddress,
  getParcelPresets,
  setParcelPresets,
  resetParcelPresets,
  getShippoRefundStatus,
  type SenderAddress,
  type RecentRecipient,
  type ParcelPreset,
} from "@/app/actions/shippo";
import type { LabelFormat, CarrierAccountSummary } from "@/lib/shippo";
import { priceWithMargin } from "@/lib/label-orders";
import { toCsv, downloadCsv, dateStampedName } from "@/lib/csv";
import { WeightInput } from "./WeightInput";

// Inline icons used by the rail (hoisted to top so TS can find them in case
// of forward-reference edge cases in some strict configs).
function IconRuler({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="9" width="20" height="6" rx="1" transform="rotate(-12 12 12)" />
      <path d="M5.5 11 L5.5 13 M9 10 L9 13 M12.5 9.5 L12.5 12 M16 9 L16 13 M19.5 8.5 L19.5 11" />
    </svg>
  );
}

type LabelRow = {
  id: string;
  carrier: string;
  servicelevel: string;
  trackingNumber: string;
  trackingUrl: string;
  labelUrl: string;
  amountPaid: number;
  status: string;
  toName: string;
  toCity: string;
  toState: string;
  toZip: string;
  createdAt: string;
  userName?: string | null;
  suiteNumber?: string | null;
};

type Props = {
  isConfigured: boolean;
  recentLabels: LabelRow[];
};

// Decorated rate the server now returns (raw Shippo rate + computed markup).
type DecoratedRate = {
  rateObjectId: string;
  provider: string;
  servicelevel: string;
  amount: string;
  currency: string;
  estimatedDays: number | null;
  durationTerms: string | null;
  carrierAccount: string | null;
  shippoCostCents: number;
  customerPriceCents: number;
  marginCents: number;
  customerPrice: string;
};

const CARRIERS = ["USPS", "UPS", "FedEx", "DHL"];
const STATES = ["AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY"];

// MailOS palette ── reuse brand tokens, no grey OS chrome.
const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";

export function AdminShippoPanel({ isConfigured, recentLabels }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<"rates" | "labels" | "track" | "carriers" | "presets">("rates");

  // Rate form (persisted to localStorage so switching tabs doesn't wipe it).
  const RATE_DRAFT_KEY = "noho-shippo-rate-draft-v1";
  const [rateForm, setRateForm] = useState({
    toName: "", toStreet: "", toCity: "", toState: "CA", toZip: "",
    lengthIn: "12", widthIn: "9", heightIn: "3", weightOz: "16",
  });
  // Hydrate from localStorage on mount; save on each change.
  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? window.localStorage.getItem(RATE_DRAFT_KEY) : null;
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          setRateForm((prev) => ({ ...prev, ...parsed }));
        }
      }
    } catch { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    try {
      window.localStorage.setItem(RATE_DRAFT_KEY, JSON.stringify(rateForm));
    } catch { /* ignore */ }
  }, [rateForm]);
  const [rates, setRates] = useState<DecoratedRate[] | null>(null);
  const [rateError, setRateError] = useState<string | null>(null);
  const [buyingRate, setBuyingRate] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState<string | null>(null);
  const [addrCheck, setAddrCheck] = useState<{ valid: boolean; messages: string[] } | null>(null);
  const [addrChecking, setAddrChecking] = useState(false);
  // Sticky selected rate — once admin clicks a rate row, it's "selected" and
  // a floating bottom CTA shows up so they can scroll back to fix the form
  // without losing the pick. Cleared when rates re-fetch or admin hits Clear.
  const [selectedRateId, setSelectedRateId] = useState<string | null>(null);

  // Track form
  const [trackCarrier, setTrackCarrier] = useState("USPS");
  const [trackNum, setTrackNum] = useState("");
  const [trackResult, setTrackResult] = useState<any>(null);
  const [trackError, setTrackError] = useState<string | null>(null);

  // Per-purchase label format — default PDF_4x6 for thermal label printers
  const [labelFormat, setLabelFormat] = useState<LabelFormat>("PDF_4x6");
  // Admin note captured on Quick Ship buy — flows to Shippo metadata.
  const [labelNote, setLabelNote] = useState<string>("");

  // Sender / Ship From — loaded from SiteConfig on mount, editable inline
  const [sender, setSender] = useState<SenderAddress | null>(null);
  const [senderEditing, setSenderEditing] = useState(false);
  const [senderMsg, setSenderMsg] = useState<string | null>(null);
  const [senderDraft, setSenderDraft] = useState<SenderAddress | null>(null);

  // Carrier accounts (Karim's UPS/FedEx/DHL/USPS contracts in Shippo)
  const [carrierAccounts, setCarrierAccounts] = useState<CarrierAccountSummary[]>([]);
  const [activeCarrierIds, setActiveCarrierIds] = useState<string[]>([]);
  const [carriersLoading, setCarriersLoading] = useState(false);
  const [carrierMsg, setCarrierMsg] = useState<string | null>(null);

  // Address-book — recent recipients for autocomplete on the rate form.
  const [recipients, setRecipients] = useState<RecentRecipient[]>([]);

  // Parcel presets — admin-defined box stock; quick-fill chips on the rate form.
  const [presets, setPresets] = useState<ParcelPreset[]>([]);
  const [presetMsg, setPresetMsg] = useState<string | null>(null);

  useEffect(() => {
    getShippoSender().then((s) => {
      setSender(s);
      setSenderDraft(s);
    });
    refreshCarrierAccounts();
    getRecentRecipients().then(setRecipients).catch(() => setRecipients([]));
    getParcelPresets().then(setPresets).catch(() => setPresets([]));
  }, []);

  // Listen for jump events fired by the Shipping Center Health card so admin
  // can click "Pin accounts" and land directly on the right inner tab.
  useEffect(() => {
    function onJump(e: Event) {
      const detail = (e as CustomEvent).detail as { tab?: typeof view } | undefined;
      if (!detail?.tab) return;
      if (detail.tab === "rates" || detail.tab === "labels" || detail.tab === "track" || detail.tab === "carriers" || detail.tab === "presets") {
        setView(detail.tab);
      }
    }
    window.addEventListener("noho-shipping-jump", onJump);
    return () => window.removeEventListener("noho-shipping-jump", onJump);
  }, []);

  function refreshCarrierAccounts() {
    setCarriersLoading(true);
    getCarrierAccountsWithSelection()
      .then((res) => {
        setCarrierAccounts(res.available);
        setActiveCarrierIds(res.activeIds);
      })
      .finally(() => setCarriersLoading(false));
  }

  function toggleCarrierAccount(id: string) {
    const next = activeCarrierIds.includes(id)
      ? activeCarrierIds.filter((x) => x !== id)
      : [...activeCarrierIds, id];
    setActiveCarrierIds(next);
  }

  function saveCarrierSelection() {
    setCarrierMsg(null);
    startTransition(async () => {
      const res = await setActiveCarrierAccountIds(activeCarrierIds);
      if ("error" in (res as any)) {
        setCarrierMsg(((res as any).error as string) ?? "Failed to save");
      } else {
        setCarrierMsg(`✓ Saved · ${(res as any).count ?? activeCarrierIds.length} carrier${activeCarrierIds.length === 1 ? "" : "s"} active`);
        setTimeout(() => setCarrierMsg(null), 3000);
      }
    });
  }

  function handleSaveSender() {
    if (!senderDraft) return;
    setSenderMsg(null);
    startTransition(async () => {
      const res = await updateShippoSender(senderDraft);
      if ("error" in res && res.error) {
        setSenderMsg(res.error);
        return;
      }
      setSender(senderDraft);
      setSenderEditing(false);
      setSenderMsg("✓ Sender saved");
      setTimeout(() => setSenderMsg(null), 3000);
    });
  }

  // Per-row action feedback
  const [rowMsg, setRowMsg] = useState<{ id: string; msg: string } | null>(null);
  function flash(id: string, msg: string) {
    setRowMsg({ id, msg });
    setTimeout(() => setRowMsg(null), 4000);
  }

  function handleRefund(l: LabelRow) {
    if (!confirm(`Refund this ${l.carrier} ${l.servicelevel} label ($${l.amountPaid.toFixed(2)})? Refunds typically take 1–4 weeks; some carriers reject refunds after 30 days.`)) return;
    startTransition(async () => {
      const res = await refundShippoLabel(l.id);
      if ("error" in res && res.error) flash(l.id, `Refund: ${res.error}`);
      else flash(l.id, `Refund queued (${res.refundStatus ?? "QUEUED"})`);
      router.refresh();
    });
  }

  async function handleForward(l: LabelRow) {
    const res = await forwardShippoLabel(l.id);
    if ("error" in res && res.error) {
      flash(l.id, res.error);
      return;
    }
    if (res.smsUrl) {
      window.open(res.smsUrl, "_self");
      flash(l.id, "Opening Messages — review and send");
    }
  }

  function fetchRates() {
    setRateError(null);
    setRates(null);
    setBuySuccess(null);
    setAddrCheck(null);
    setSelectedRateId(null);
    // Pre-validate the address — pure read, gives admin a heads-up before
    // we burn rate-fetch quota on a typo'd zip / wrong state. Validation is
    // soft: invalid still proceeds (sometimes Shippo flags rural addresses
    // that work fine), but admin sees a banner with the carrier's hints.
    setAddrChecking(true);
    void validateShippoAddress({
      toName: rateForm.toName,
      toStreet: rateForm.toStreet,
      toCity: rateForm.toCity,
      toState: rateForm.toState,
      toZip: rateForm.toZip,
    })
      .then((res) => {
        setAddrCheck({ valid: res.valid, messages: res.messages });
      })
      .catch(() => setAddrCheck(null))
      .finally(() => setAddrChecking(false));

    startTransition(async () => {
      const result = await getShippoRates({
        toName: rateForm.toName || "Recipient",
        toStreet: rateForm.toStreet,
        toCity: rateForm.toCity,
        toState: rateForm.toState,
        toZip: rateForm.toZip,
        lengthIn: parseFloat(rateForm.lengthIn) || 12,
        widthIn: parseFloat(rateForm.widthIn) || 9,
        heightIn: parseFloat(rateForm.heightIn) || 3,
        weightOz: parseFloat(rateForm.weightOz) || 16,
      });
      if (result.error) setRateError(result.error);
      else if (result.rates) setRates(result.rates as DecoratedRate[]);
    });
  }

  function buyLabel(rate: DecoratedRate) {
    setBuyingRate(rate.rateObjectId);
    setBuySuccess(null);
    startTransition(async () => {
      const result = await buyShippoLabel({
        rateObjectId: rate.rateObjectId,
        toName: rateForm.toName || "Recipient",
        toStreet: rateForm.toStreet,
        toCity: rateForm.toCity,
        toState: rateForm.toState,
        toZip: rateForm.toZip,
        lengthIn: parseFloat(rateForm.lengthIn),
        widthIn: parseFloat(rateForm.widthIn),
        heightIn: parseFloat(rateForm.heightIn),
        weightOz: parseFloat(rateForm.weightOz),
        labelFormat,
        note: labelNote.trim() || undefined,
      });
      setBuyingRate(null);
      if (result.error) setRateError(result.error);
      else {
        setBuySuccess(result.label?.labelUrl ?? null);
        // Clear note after a successful buy so the next label starts clean.
        setLabelNote("");
        router.refresh();
      }
    });
  }

  function doTrack() {
    setTrackError(null);
    setTrackResult(null);
    startTransition(async () => {
      const result = await trackShippoLabel(trackCarrier, trackNum.trim());
      if (result.error) setTrackError(result.error);
      else setTrackResult(result.status);
    });
  }

  const inputCls =
    "w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485] bg-white";

  // ─── MailOS workspace shell ──────────────────────────────────────────────
  // Three-region layout: side-rail (left) · workspace surface (center) ·
  // status panel (right). Tabs become "files" in the rail; each opens a
  // distinct workspace pane on the right. This mirrors the OS app metaphor
  // promised by the iter-35 status strip + window chrome.

  const rail: Array<{ id: typeof view; label: string; sub: string; Icon: (p: { className?: string }) => React.ReactElement; badge?: number }> = [
    { id: "rates",    label: "Quick Ship",  sub: "Get rates · Buy labels",        Icon: IconShip },
    { id: "labels",   label: "Labels",      sub: "Recent purchases · Refund",     Icon: IconBox, badge: recentLabels.length },
    { id: "track",    label: "Track",       sub: "Live carrier status",           Icon: IconRadar },
    { id: "carriers", label: "Carriers",    sub: "UPS · FedEx · DHL accounts",    Icon: IconPlug, badge: activeCarrierIds.length },
    { id: "presets",  label: "Box Presets", sub: "Quick-fill saved parcel sizes", Icon: IconRuler, badge: presets.length },
  ];

  return (
    <div className="space-y-4">
      {/* Header strip */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#337485]/70">
            <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle bg-[#337485]" style={{ boxShadow: "0 0 6px #337485" }} />
            Shippo · Live
          </p>
          <h2 className="text-xl font-black text-[#2D100F] tracking-tight">Quick Ship Workspace</h2>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-white border border-[#e8e5e0] text-[#2D100F]/65">
            {recentLabels.length} labels on file
          </span>
          {!isConfigured ? (
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700">
              ⚠ SHIPPO_API_KEY missing
            </span>
          ) : (
            <span className="text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700">
              ✓ Connected
            </span>
          )}
        </div>
      </div>

      {/* Workspace: rail + canvas */}
      <div className="grid grid-cols-1 md:grid-cols-[220px_minmax(0,1fr)] gap-4">
        {/* Side rail (workspace switcher) */}
        <aside className="rounded-2xl bg-white border border-[#e8e5e0] p-2 self-start sticky md:top-32" style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.6), 0 6px 18px rgba(45,16,15,0.06)" }}>
          <ul className="space-y-1">
            {rail.map((item) => {
              const active = view === item.id;
              return (
                <li key={item.id}>
                  <button
                    onClick={() => setView(item.id)}
                    className="group w-full flex items-start gap-2 px-2.5 py-2 rounded-xl text-left transition-all"
                    style={{
                      background: active
                        ? "linear-gradient(90deg, rgba(51,116,133,0.18), rgba(51,116,133,0.06))"
                        : "transparent",
                      boxShadow: active ? "inset 2px 0 0 #337485" : "none",
                    }}
                  >
                    <span
                      className="w-7 h-7 rounded-lg shrink-0 flex items-center justify-center transition-colors"
                      style={{
                        background: active ? NOHO_BLUE : "rgba(51,116,133,0.08)",
                        color: active ? "#fff" : NOHO_BLUE,
                      }}
                    >
                      <item.Icon className="w-4 h-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-black text-[#2D100F] tracking-tight">{item.label}</p>
                      <p className="text-[10px] text-[#2D100F]/45 leading-snug">{item.sub}</p>
                    </div>
                    {item.badge != null && item.badge > 0 && (
                      <span
                        className="text-[9px] font-black px-1.5 py-0.5 rounded-full mt-0.5"
                        style={{
                          background: active ? "rgba(255,255,255,0.85)" : "rgba(51,116,133,0.12)",
                          color: NOHO_BLUE_DEEP,
                        }}
                      >
                        {item.badge}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 pt-3 border-t border-[#e8e5e0]/70 text-[9.5px] text-[#2D100F]/40 px-2">
            <p className="font-black uppercase tracking-wider">Format</p>
            <p className="mt-0.5">{labelFormat} · 4×6 thermal default</p>
          </div>
        </aside>

        {/* Canvas */}
        <div className="space-y-4">
          {view === "rates" && (
            <QuickShipPane
              sender={sender}
              senderDraft={senderDraft}
              senderEditing={senderEditing}
              setSenderEditing={setSenderEditing}
              setSenderDraft={setSenderDraft}
              senderMsg={senderMsg}
              handleSaveSender={handleSaveSender}
              labelFormat={labelFormat}
              setLabelFormat={setLabelFormat}
              rateForm={rateForm}
              setRateForm={setRateForm}
              rates={rates}
              rateError={rateError}
              fetchRates={fetchRates}
              buyLabel={buyLabel}
              buyingRate={buyingRate}
              buySuccess={buySuccess}
              isPending={isPending}
              inputCls={inputCls}
              activeCarrierCount={activeCarrierIds.length}
              gotoCarriers={() => setView("carriers")}
              recipients={recipients}
              addrCheck={addrCheck}
              addrChecking={addrChecking}
              presets={presets}
              gotoPresets={() => setView("presets")}
              selectedRateId={selectedRateId}
              setSelectedRateId={setSelectedRateId}
              labelNote={labelNote}
              setLabelNote={setLabelNote}
            />
          )}

          {view === "labels" && (
            <LabelsPane
              labels={recentLabels}
              isPending={isPending}
              onForward={handleForward}
              onRefund={handleRefund}
              rowMsg={rowMsg}
            />
          )}

          {view === "track" && (
            <TrackPane
              trackCarrier={trackCarrier}
              setTrackCarrier={setTrackCarrier}
              trackNum={trackNum}
              setTrackNum={setTrackNum}
              trackResult={trackResult}
              trackError={trackError}
              doTrack={doTrack}
              isPending={isPending}
              inputCls={inputCls}
            />
          )}

          {view === "carriers" && (
            <CarriersPane
              accounts={carrierAccounts}
              activeIds={activeCarrierIds}
              loading={carriersLoading}
              isConfigured={isConfigured}
              isPending={isPending}
              carrierMsg={carrierMsg}
              onToggle={toggleCarrierAccount}
              onSave={saveCarrierSelection}
              onRefresh={refreshCarrierAccounts}
              recentLabels={recentLabels}
            />
          )}

          {view === "presets" && (
            <PresetsPane
              presets={presets}
              setPresets={setPresets}
              isPending={isPending}
              presetMsg={presetMsg}
              setPresetMsg={setPresetMsg}
              startTransition={startTransition}
              inputCls={inputCls}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Quick Ship pane ────────────────────────────────────────────────────── */

function QuickShipPane(props: {
  sender: SenderAddress | null;
  senderDraft: SenderAddress | null;
  senderEditing: boolean;
  setSenderEditing: (v: boolean) => void;
  setSenderDraft: (s: SenderAddress | null) => void;
  senderMsg: string | null;
  handleSaveSender: () => void;
  labelFormat: LabelFormat;
  setLabelFormat: (f: LabelFormat) => void;
  rateForm: any;
  setRateForm: any;
  rates: DecoratedRate[] | null;
  rateError: string | null;
  fetchRates: () => void;
  buyLabel: (r: DecoratedRate) => void;
  buyingRate: string | null;
  buySuccess: string | null;
  isPending: boolean;
  inputCls: string;
  activeCarrierCount: number;
  gotoCarriers: () => void;
  recipients: RecentRecipient[];
  addrCheck: { valid: boolean; messages: string[] } | null;
  addrChecking: boolean;
  presets: ParcelPreset[];
  gotoPresets: () => void;
  selectedRateId: string | null;
  setSelectedRateId: (id: string | null) => void;
  labelNote: string;
  setLabelNote: (v: string) => void;
}) {
  const {
    sender, senderDraft, senderEditing, setSenderEditing, setSenderDraft, senderMsg, handleSaveSender,
    labelFormat, setLabelFormat, rateForm, setRateForm, rates, rateError, fetchRates, buyLabel,
    buyingRate, buySuccess, isPending, inputCls, activeCarrierCount, gotoCarriers, recipients,
    addrCheck, addrChecking, presets, gotoPresets, selectedRateId, setSelectedRateId,
    labelNote, setLabelNote,
  } = props;

  return (
    <div className="space-y-4">
      {/* Sender */}
      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2D100F]/40">Ship From — Sender</p>
            <p className="text-[11px] mt-0.5 text-[#2D100F]/55">Used as the return address on every label until you change it.</p>
          </div>
          <div className="flex items-center gap-2">
            {senderMsg && (
              <span className={`text-[11px] font-bold ${senderMsg.startsWith("✓") ? "text-emerald-700" : "text-red-700"}`}>{senderMsg}</span>
            )}
            {!senderEditing ? (
              <button
                type="button"
                onClick={() => { setSenderDraft(sender); setSenderEditing(true); }}
                className="px-3 py-1.5 rounded-lg text-[11px] font-black border-2 hover:bg-[#337485]/10 transition-colors"
                style={{ borderColor: NOHO_BLUE, color: NOHO_BLUE }}
              >
                Edit Sender
              </button>
            ) : (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => { setSenderDraft(sender); setSenderEditing(false); }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveSender}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white disabled:opacity-50"
                  style={{ background: NOHO_BLUE }}
                >
                  {isPending ? "Saving…" : "Save"}
                </button>
              </div>
            )}
          </div>
        </div>

        {!sender ? (
          <p className="text-xs text-[#2D100F]/40 mt-3">Loading…</p>
        ) : !senderEditing ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 text-xs mt-3">
            <div><span className="text-[#2D100F]/45">Name:</span> <strong className="text-[#2D100F]">{sender.name}</strong></div>
            {sender.company && <div><span className="text-[#2D100F]/45">Company:</span> <strong className="text-[#2D100F]">{sender.company}</strong></div>}
            <div className="col-span-2"><span className="text-[#2D100F]/45">Address:</span> <strong className="text-[#2D100F]">{sender.street1}{sender.street2 ? `, ${sender.street2}` : ""} · {sender.city}, {sender.state} {sender.zip}</strong></div>
            {sender.phone && <div><span className="text-[#2D100F]/45">Phone:</span> <strong className="text-[#2D100F]">{sender.phone}</strong></div>}
            {sender.email && <div><span className="text-[#2D100F]/45">Email:</span> <strong className="text-[#2D100F]">{sender.email}</strong></div>}
          </div>
        ) : senderDraft && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            {[
              { label: "Name *", key: "name", placeholder: "NOHO Mailbox" },
              { label: "Company", key: "company", placeholder: "(optional)" },
              { label: "Street *", key: "street1", placeholder: "5062 Lankershim Blvd" },
              { label: "Street 2", key: "street2", placeholder: "Suite / Apt (optional)" },
              { label: "City *", key: "city", placeholder: "North Hollywood" },
              { label: "Phone", key: "phone", placeholder: "(818) 506-7744" },
              { label: "Email", key: "email", placeholder: "nohomailbox@gmail.com" },
            ].map(({ label, key, placeholder }) => (
              <div key={key} className={key === "street1" ? "sm:col-span-2" : ""}>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D100F]/40 mb-1">{label}</label>
                <input
                  className={inputCls}
                  value={(senderDraft[key as keyof SenderAddress] as string) ?? ""}
                  onChange={(e) => setSenderDraft({ ...senderDraft, [key]: e.target.value })}
                  placeholder={placeholder}
                />
              </div>
            ))}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D100F]/40 mb-1">State *</label>
                <select className={inputCls} value={senderDraft.state} onChange={(e) => setSenderDraft({ ...senderDraft, state: e.target.value })}>
                  {STATES.map((s) => <option key={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D100F]/40 mb-1">Zip *</label>
                <input className={inputCls} value={senderDraft.zip} maxLength={5} onChange={(e) => setSenderDraft({ ...senderDraft, zip: e.target.value.replace(/\D/g, "") })} placeholder="91601" />
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* Carrier-account status banner */}
      <div
        className="flex items-center justify-between gap-3 rounded-2xl px-4 py-3 border"
        style={{
          background: activeCarrierCount > 0 ? "linear-gradient(90deg, rgba(22,163,74,0.06), rgba(22,163,74,0.0))" : "linear-gradient(90deg, rgba(245,166,35,0.10), rgba(245,166,35,0.0))",
          borderColor: activeCarrierCount > 0 ? "rgba(22,163,74,0.25)" : "rgba(245,166,35,0.35)",
        }}
      >
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: activeCarrierCount > 0 ? "rgba(22,163,74,0.15)" : "rgba(245,166,35,0.15)", color: activeCarrierCount > 0 ? "#15803d" : "#92400e" }}>
            <IconPlug className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className="text-[12px] font-black text-[#2D100F]">
              {activeCarrierCount > 0
                ? `${activeCarrierCount} carrier account${activeCarrierCount === 1 ? "" : "s"} pinned to your contracts`
                : "No carrier accounts pinned — using Shippo defaults"}
            </p>
            <p className="text-[11px] text-[#2D100F]/55 leading-snug">
              {activeCarrierCount > 0
                ? "Rates & label purchases will use your real UPS/FedEx/DHL accounts."
                : "UPS/FedEx purchases may fail. Pin your carrier accounts under the Carriers tab."}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={gotoCarriers}
          className="px-3 py-1.5 rounded-lg text-[11px] font-black border-2 hover:bg-[#337485]/10 transition-colors shrink-0"
          style={{ borderColor: NOHO_BLUE, color: NOHO_BLUE }}
        >
          Manage →
        </button>
      </div>

      {/* Label format */}
      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2D100F]/40">Label Format</p>
            <p className="text-[11px] mt-0.5 text-[#2D100F]/55">Applied at purchase. <strong className="text-[#337485]">PDF 4×6</strong> = thermal label printers (JADENS, Zebra, Brother, Dymo).</p>
          </div>
          <span className="text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full" style={{ background: "rgba(51,116,133,0.1)", color: NOHO_BLUE }}>
            Selected: {labelFormat}
          </span>
        </div>
        <div className="flex flex-wrap gap-2 mt-3">
          {(
            [
              { v: "PDF_4x6" as const, label: "4×6 PDF", sub: "Thermal · default" },
              { v: "PDF" as const, label: "8.5×11 PDF", sub: "Desktop printer" },
              { v: "PDF_A4" as const, label: "A4 PDF", sub: "Letter (intl)" },
              { v: "PDF_A6" as const, label: "A6 PDF", sub: "Postcard size" },
              { v: "ZPLII" as const, label: "ZPL II", sub: "Zebra raw" },
              { v: "PNG" as const, label: "PNG", sub: "Image" },
            ] as const
          ).map((f) => (
            <button
              key={f.v}
              type="button"
              onClick={() => setLabelFormat(f.v)}
              className={`text-left px-3 py-2 rounded-lg text-xs font-bold border-2 transition-colors ${
                labelFormat === f.v ? "bg-[#337485] text-white border-[#337485]" : "border-[#e8e5e0] text-[#2D100F] hover:border-[#337485]"
              }`}
            >
              <p>{f.label}</p>
              <p className={`text-[10px] font-medium mt-0.5 ${labelFormat === f.v ? "text-white/80" : "text-[#2D100F]/45"}`}>{f.sub}</p>
            </button>
          ))}
        </div>
      </Card>

      {/* Ship To */}
      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2D100F]/40">Ship To</p>
          {recipients.length > 0 && (
            <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full" style={{ background: "rgba(51,116,133,0.10)", color: NOHO_BLUE }}>
              {recipients.length} saved
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <RecipientNameAutocomplete
            value={rateForm.toName}
            recipients={recipients}
            inputCls={inputCls}
            onChangeName={(v: string) => setRateForm((p: any) => ({ ...p, toName: v }))}
            onPickRecipient={(r: RecentRecipient) =>
              setRateForm((p: any) => ({
                ...p,
                toName: r.toName,
                toStreet: r.toStreet,
                toCity: r.toCity,
                toState: r.toState,
                toZip: r.toZip,
              }))
            }
          />

          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D100F]/40 mb-1">Street Address</label>
            <input className={inputCls} value={rateForm.toStreet} onChange={(e: any) => setRateForm((p: any) => ({ ...p, toStreet: e.target.value }))} placeholder="123 Main St" />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D100F]/40 mb-1">City</label>
            <input className={inputCls} value={rateForm.toCity} onChange={(e: any) => setRateForm((p: any) => ({ ...p, toCity: e.target.value }))} placeholder="Los Angeles" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D100F]/40 mb-1">State</label>
              <select className={inputCls} value={rateForm.toState} onChange={(e: any) => setRateForm((p: any) => ({ ...p, toState: e.target.value }))}>
                {STATES.map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D100F]/40 mb-1">Zip</label>
              <input className={inputCls} value={rateForm.toZip} maxLength={5} onChange={(e: any) => setRateForm((p: any) => ({ ...p, toZip: e.target.value.replace(/\D/g, "") }))} placeholder="90001" />
            </div>
          </div>
        </div>
      </Card>

      {/* Parcel */}
      <Card>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2D100F]/40">Package Dimensions</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-3">
          {[
            { label: "Length (in)", key: "lengthIn" },
            { label: "Width (in)", key: "widthIn" },
            { label: "Height (in)", key: "heightIn" },
          ].map(({ label, key }) => (
            <div key={key}>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D100F]/40 mb-1">{label}</label>
              <input
                type="number"
                min={0.1}
                step={0.1}
                className={inputCls}
                value={rateForm[key as keyof typeof rateForm]}
                onChange={(e: any) => setRateForm((p: any) => ({ ...p, [key]: e.target.value }))}
              />
            </div>
          ))}
        </div>
        <div className="mt-3">
          <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D100F]/40 mb-1">Weight</label>
          <WeightInput
            valueOz={parseFloat(rateForm.weightOz) || ""}
            onChangeOz={(oz) => setRateForm((p: any) => ({ ...p, weightOz: String(oz) }))}
            onClear={() => setRateForm((p: any) => ({ ...p, weightOz: "" }))}
            defaultUnit="lb"
          />
          {/* DIM-weight inline calc — UPS/FedEx ground bill by max(actual,
              DIM weight) using divisor 139 (domestic). When the DIM weight
              significantly exceeds actual, surface a warning so admin doesn't
              quote a sticker-shock-y customer the wrong number. */}
          <DimWeightHint
            lengthIn={parseFloat(rateForm.lengthIn) || 0}
            widthIn={parseFloat(rateForm.widthIn) || 0}
            heightIn={parseFloat(rateForm.heightIn) || 0}
            weightOz={parseFloat(rateForm.weightOz) || 0}
          />
        </div>
        <div className="flex items-center justify-between gap-2 flex-wrap mt-3">
          <div className="flex gap-2 flex-wrap flex-1 min-w-0">
            {presets.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setRateForm((f: any) => ({
                  ...f,
                  lengthIn: String(p.lengthIn),
                  widthIn: String(p.widthIn),
                  heightIn: String(p.heightIn),
                  weightOz: String(p.weightOz),
                }))}
                title={`${p.lengthIn}×${p.widthIn}×${p.heightIn} in · ${(p.weightOz / 16).toFixed(2)} lb`}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-[#337485]/10 text-[#337485] hover:bg-[#337485]/20 transition-colors"
              >{p.label}</button>
            ))}
            {presets.length === 0 && (
              <span className="text-[10.5px] text-[#2D100F]/50 italic">No presets yet — set up your real box stock for one-tap fill.</span>
            )}
          </div>
          <button
            type="button"
            onClick={gotoPresets}
            className="text-[10px] font-bold px-2 py-1.5 rounded-lg border border-[#e8e5e0] text-[#2D100F]/65 hover:text-[#337485] hover:border-[#337485] transition-colors shrink-0"
            title="Edit your saved parcel presets"
          >
            Edit presets →
          </button>
        </div>
      </Card>

      {/* Optional note — admin context that travels with the label
          (sent to Shippo as transaction.metadata, max 100 chars). Shows on
          the receipt page header so admin can scan past purchases. */}
      <Card>
        <div className="flex items-center justify-between gap-2 mb-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2D100F]/40">Internal note (optional)</p>
          <span className="text-[9.5px] text-[#2D100F]/45 tabular-nums">{labelNote.length}/100</span>
        </div>
        <input
          type="text"
          value={labelNote}
          onChange={(e) => setLabelNote(e.target.value.slice(0, 100))}
          placeholder="e.g. Birthday gift · Customer paid in cash · Handle with care"
          className={inputCls}
        />
      </Card>

      {rateError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-semibold">{rateError}</div>
      )}

      {/* Address-check banner — appears after the validate call returns. Soft
          warn (not blocking): some rural addresses validate as invalid but
          ship fine. Admin sees Shippo's specific messages and decides. */}
      {(addrChecking || addrCheck) && (
        <div
          className="rounded-xl px-4 py-3 border flex items-start gap-3"
          style={{
            background: addrChecking
              ? "rgba(51,116,133,0.06)"
              : addrCheck?.valid
                ? "rgba(22,163,74,0.06)"
                : "rgba(245,166,35,0.10)",
            borderColor: addrChecking
              ? "rgba(51,116,133,0.25)"
              : addrCheck?.valid
                ? "rgba(22,163,74,0.30)"
                : "rgba(245,166,35,0.40)",
          }}
        >
          <span
            className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-black"
            style={{
              background: addrChecking
                ? "rgba(51,116,133,0.18)"
                : addrCheck?.valid
                  ? "rgba(22,163,74,0.18)"
                  : "rgba(245,166,35,0.20)",
              color: addrChecking ? "#23596A" : addrCheck?.valid ? "#15803d" : "#92400e",
            }}
          >
            {addrChecking ? "…" : addrCheck?.valid ? "✓" : "!"}
          </span>
          <div className="min-w-0 text-[12px] text-[#2D100F]">
            <p className="font-black">
              {addrChecking
                ? "Validating address with Shippo…"
                : addrCheck?.valid
                  ? "Address validated — rates incoming"
                  : "Heads up — Shippo flagged the destination"}
            </p>
            {addrCheck && addrCheck.messages.length > 0 && (
              <ul className="mt-1 space-y-0.5 text-[11px] text-[#2D100F]/65 list-disc pl-4">
                {addrCheck.messages.slice(0, 4).map((m, i) => <li key={i}>{m}</li>)}
              </ul>
            )}
          </div>
        </div>
      )}

      <button
        disabled={isPending || !rateForm.toStreet || !rateForm.toCity || !rateForm.toZip}
        onClick={fetchRates}
        className="w-full py-3 rounded-xl text-white font-black disabled:opacity-40"
        style={{ background: "linear-gradient(135deg, #337485, #23596A)" }}
      >
        {isPending ? "Getting rates…" : "Get Live Rates"}
      </button>

      {/* Rates list — grouped by carrier with CHEAPEST / FASTEST badges and a
          Copy-quote button so admin can text the customer the chosen price. */}
      {rates !== null && (
        <RatesList
          rates={rates}
          buyingRate={buyingRate}
          isPending={isPending}
          onBuy={buyLabel}
          selectedRateId={selectedRateId}
          setSelectedRateId={setSelectedRateId}
        />
      )}

      {/* Sticky selected-rate floating CTA — surfaces the current pick so admin
          doesn't have to scroll back to the chosen row. Only renders when a
          rate is selected and we're not buying it. */}
      {selectedRateId && rates && (() => {
        const r = rates.find((rt) => rt.rateObjectId === selectedRateId);
        if (!r) return null;
        return (
          <SelectedRateBar
            rate={r}
            buying={buyingRate === r.rateObjectId}
            disabled={isPending}
            onBuy={() => buyLabel(r)}
            onClear={() => setSelectedRateId(null)}
          />
        );
      })()}

      {buySuccess && (
        <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-4 text-sm font-semibold text-emerald-700 flex items-center gap-3">
          <span>✓ Label purchased ({labelFormat}).</span>
          <a
            href={buySuccess}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-black hover:bg-emerald-700"
          >Open label →</a>
        </div>
      )}
    </div>
  );
}

/* ─── Rates list ─────────────────────────────────────────────────────────── */
// Groups rates by carrier so admin scans 4 sections (USPS / UPS / FedEx / DHL)
// instead of 12 unsorted rows. Tags the absolute cheapest and the absolute
// fastest across the whole list — the two questions a walk-in customer always
// asks: "what's cheapest?" and "what's fastest?".

type RateGroup = { carrier: string; items: DecoratedRate[] };

function RatesList({
  rates,
  buyingRate,
  isPending,
  onBuy,
  selectedRateId,
  setSelectedRateId,
}: {
  rates: DecoratedRate[];
  buyingRate: string | null;
  isPending: boolean;
  onBuy: (r: DecoratedRate) => void;
  selectedRateId: string | null;
  setSelectedRateId: (id: string | null) => void;
}) {
  if (rates.length === 0) {
    return <p className="text-center text-sm text-[#2D100F]/50 py-4">No rates available for this destination</p>;
  }

  // Cheapest = lowest customer price; Fastest = lowest estimatedDays (null →
  // skip). Tie-breaks: cheapest with fewer days wins, fastest with lower
  // price wins. Stable comparators so the badge picks deterministically.
  const cheapest = [...rates].sort(
    (a, b) => a.customerPriceCents - b.customerPriceCents || (a.estimatedDays ?? 99) - (b.estimatedDays ?? 99),
  )[0];
  const datedRates = rates.filter((r) => typeof r.estimatedDays === "number");
  const fastest = datedRates.length
    ? [...datedRates].sort(
        (a, b) => (a.estimatedDays ?? 99) - (b.estimatedDays ?? 99) || a.customerPriceCents - b.customerPriceCents,
      )[0]
    : null;

  // Group + sort: each carrier group internally cheapest-first; groups
  // ordered by their best (cheapest) rate so cheapest carrier shows first.
  const byCarrier = new Map<string, DecoratedRate[]>();
  for (const r of rates) {
    const k = r.provider || "Other";
    if (!byCarrier.has(k)) byCarrier.set(k, []);
    byCarrier.get(k)!.push(r);
  }
  const groups: RateGroup[] = Array.from(byCarrier.entries())
    .map(([carrier, items]) => ({
      carrier,
      items: [...items].sort((a, b) => a.customerPriceCents - b.customerPriceCents),
    }))
    .sort((a, b) => a.items[0].customerPriceCents - b.items[0].customerPriceCents);

  return (
    <div className="space-y-3">
      {groups.map((g) => (
        <div
          key={g.carrier}
          className="rounded-2xl bg-white border border-[#e8e5e0] overflow-hidden"
          style={{ boxShadow: "0 1px 2px rgba(45,16,15,0.04)" }}
        >
          <div className="flex items-center gap-3 px-4 py-2.5 border-b border-[#e8e5e0]/70" style={{ background: "linear-gradient(180deg, #FAF6F0, #fff)" }}>
            <CarrierGlyph carrier={g.carrier} className="w-7 h-7 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-[#2D100F] tracking-tight">{g.carrier}</p>
              <p className="text-[10px] text-[#2D100F]/45">{g.items.length} service{g.items.length === 1 ? "" : "s"}</p>
            </div>
            <p className="text-[10px] font-black uppercase tracking-wider text-[#2D100F]/40 tabular-nums">
              from <span className="text-[#2D100F]">${(g.items[0].customerPriceCents / 100).toFixed(2)}</span>
            </p>
          </div>
          <ul className="divide-y divide-[#e8e5e0]/60">
            {g.items.map((rate) => (
              <li key={rate.rateObjectId}>
                <RateRow
                  rate={rate}
                  buying={buyingRate === rate.rateObjectId}
                  disabled={isPending}
                  onBuy={() => onBuy(rate)}
                  isCheapest={rate.rateObjectId === cheapest.rateObjectId}
                  isFastest={!!fastest && rate.rateObjectId === fastest.rateObjectId}
                  isSelected={selectedRateId === rate.rateObjectId}
                  onSelect={() => setSelectedRateId(selectedRateId === rate.rateObjectId ? null : rate.rateObjectId)}
                />
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

function RateRow({
  rate, buying, disabled, onBuy, isCheapest, isFastest, isSelected, onSelect,
}: {
  rate: DecoratedRate;
  buying: boolean;
  disabled: boolean;
  onBuy: () => void;
  isCheapest: boolean;
  isFastest: boolean;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [copied, setCopied] = useState(false);
  function copyQuote() {
    const days = rate.estimatedDays != null
      ? `${rate.estimatedDays} day${rate.estimatedDays !== 1 ? "s" : ""}`
      : rate.durationTerms ?? "—";
    const text =
      `NOHO Mailbox shipping quote · ${rate.provider} ${rate.servicelevel} · ` +
      `Delivery: ${days} · ` +
      `Total: $${(rate.customerPriceCents / 100).toFixed(2)} · ` +
      `Reply YES to lock it in.`;
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  // Highlight wins on the corresponding row.
  const winBg = isCheapest && isFastest
    ? "linear-gradient(90deg, rgba(22,163,74,0.07), rgba(51,116,133,0.07))"
    : isCheapest
      ? "linear-gradient(90deg, rgba(22,163,74,0.06), transparent)"
      : isFastest
        ? "linear-gradient(90deg, rgba(51,116,133,0.06), transparent)"
        : undefined;

  return (
    <div
      className="px-4 py-3 transition-colors hover:bg-[#f9f9f8] cursor-pointer"
      style={{
        background: isSelected ? "rgba(51,116,133,0.10)" : winBg,
        boxShadow: isSelected ? "inset 3px 0 0 #337485" : undefined,
      }}
      onClick={(e) => {
        // Only the row body toggles selection; clicks on the action buttons
        // shouldn't flip selection.
        if (!(e.target as HTMLElement).closest("button")) onSelect();
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
            <span className="font-bold text-[13px] text-[#2D100F]">{rate.servicelevel}</span>
            {isSelected && <Badge color="#337485" label="SELECTED" />}
            {isCheapest && <Badge color="#16a34a" label="CHEAPEST" />}
            {isFastest && <Badge color="#337485" label="FASTEST" />}
            {rate.estimatedDays != null && (
              <span className="text-[10px] font-bold text-[#2D100F]/55 bg-[#f4f6f8] px-1.5 py-0.5 rounded-full">
                {rate.estimatedDays}d
              </span>
            )}
          </div>
          <p className="text-[11px] text-[#2D100F]/50">
            {rate.estimatedDays != null
              ? `Est. ${rate.estimatedDays} business day${rate.estimatedDays !== 1 ? "s" : ""}`
              : rate.durationTerms ?? "Transit time varies"}
          </p>
        </div>
        <div className="text-right shrink-0">
          {/* Customer-facing price IS the headline — wholesale + margin
              footnote below. Big visual amplification: the customer-pays
              number is 26px ink-bold, sits in a pale teal pill so it can't
              be confused with the smaller wholesale number. A "+MARGIN" pill
              under it shows the markup value explicitly. */}
          <span
            className="inline-block px-2.5 py-0.5 rounded-md text-[9px] font-black uppercase tracking-[0.16em]"
            style={{ background: "rgba(51,116,133,0.10)", color: "#23596A", border: "1px solid rgba(51,116,133,0.25)" }}
          >
            Customer pays
          </span>
          <p className="text-[26px] font-extrabold text-[#2D100F] tabular-nums mt-0.5" style={{ lineHeight: 1.05, letterSpacing: "-0.01em" }}>
            ${(rate.customerPriceCents / 100).toFixed(2)}
          </p>
          <div className="mt-1 flex items-center gap-1 justify-end">
            <span
              className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
              style={{ background: "rgba(22,163,74,0.12)", color: "#15803d", border: "1px solid rgba(22,163,74,0.30)" }}
              title="Customer price = Shippo wholesale × 1.10 (+ $1 floor). This is your margin on this label."
            >
              +${(rate.marginCents / 100).toFixed(2)} margin
            </span>
          </div>
          <p className="text-[10px] text-[#2D100F]/55 mt-1">
            Wholesale ${parseFloat(rate.amount).toFixed(2)} · you keep <span className="text-emerald-700 font-bold">${(rate.marginCents / 100).toFixed(2)}</span>
          </p>
          <div className="mt-1.5 flex gap-1.5 justify-end">
            <button
              type="button"
              onClick={copyQuote}
              className="px-2.5 py-1 rounded-lg text-[10px] font-bold border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8]"
              title="Copy customer quote to clipboard (SMS-ready)"
            >
              {copied ? "Copied ✓" : "Copy quote"}
            </button>
            <button
              onClick={onBuy}
              disabled={disabled || buying}
              className="px-3 py-1 rounded-lg text-[11px] font-black text-white disabled:opacity-40"
              style={{ background: NOHO_BLUE }}
            >
              {buying ? "Buying…" : "Buy Label"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Sticky selected-rate floating CTA ──────────────────────────────────── */
// Pinned to the bottom of the workspace when admin clicks a rate row, so the
// pick stays visible while they scroll up to fix the form. Two actions:
// Buy (immediate) and Copy quote (SMS-ready string).

function SelectedRateBar({
  rate, buying, disabled, onBuy, onClear,
}: {
  rate: DecoratedRate;
  buying: boolean;
  disabled: boolean;
  onBuy: () => void;
  onClear: () => void;
}) {
  const [copied, setCopied] = useState(false);
  function copyQuote() {
    const days = rate.estimatedDays != null ? `${rate.estimatedDays} day${rate.estimatedDays !== 1 ? "s" : ""}` : rate.durationTerms ?? "—";
    const text = `NOHO Mailbox shipping quote · ${rate.provider} ${rate.servicelevel} · Delivery: ${days} · Total: $${(rate.customerPriceCents / 100).toFixed(2)} · Reply YES to lock it in.`;
    void navigator.clipboard?.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <div
      className="sticky bottom-3 z-30 mt-1 rounded-2xl flex items-center justify-between gap-3 px-4 py-3 border"
      style={{
        background: "linear-gradient(180deg, rgba(247,230,194,0.96) 0%, rgba(244,236,219,0.98) 100%)",
        backdropFilter: "saturate(160%) blur(14px)",
        WebkitBackdropFilter: "saturate(160%) blur(14px)",
        borderColor: "rgba(45,16,15,0.16)",
        boxShadow: "0 12px 28px rgba(45,16,15,0.18), 0 1px 0 rgba(255,255,255,0.6) inset",
      }}
      role="region"
      aria-label="Selected rate"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[9.5px] font-black uppercase tracking-wider text-[#337485]">Selected rate · Customer pays</p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          <p className="text-[20px] font-extrabold text-[#2D100F] tabular-nums" style={{ letterSpacing: "-0.01em" }}>
            ${(rate.customerPriceCents / 100).toFixed(2)}
          </p>
          <span
            className="text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded"
            style={{ background: "rgba(22,163,74,0.14)", color: "#15803d", border: "1px solid rgba(22,163,74,0.30)" }}
            title="You keep this much on top of Shippo wholesale"
          >
            +${(rate.marginCents / 100).toFixed(2)} margin
          </span>
          <span className="text-[#2D100F]/30">·</span>
          <span className="text-[11px] text-[#2D100F]/65">
            {rate.provider} {rate.servicelevel}
          </span>
          {rate.estimatedDays != null && (
            <span className="text-[10px] font-bold text-[#23596A] bg-[#337485]/10 px-1.5 py-0.5 rounded-full">
              {rate.estimatedDays}d
            </span>
          )}
        </div>
        <p className="text-[10px] text-[#2D100F]/55 mt-0.5">
          Wholesale ${parseFloat(rate.amount).toFixed(2)} · NOHO marks up 10% (with $1 floor)
        </p>
      </div>
      <div className="flex items-center gap-1.5 shrink-0">
        <button
          type="button"
          onClick={copyQuote}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-[#e8e5e0] text-[#2D100F] hover:bg-white"
        >
          {copied ? "Copied ✓" : "Copy quote"}
        </button>
        <button
          type="button"
          onClick={onBuy}
          disabled={disabled || buying}
          className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white disabled:opacity-40"
          style={{ background: NOHO_BLUE }}
        >
          {buying ? "Buying…" : "Buy Label"}
        </button>
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear selection"
          className="px-2 py-1.5 rounded-lg text-[12px] text-[#2D100F]/55 hover:text-[#2D100F]"
          title="Clear selection"
        >
          ✕
        </button>
      </div>
    </div>
  );
}

function Badge({ color, label }: { color: string; label: string }) {
  return (
    <span
      className="text-[8.5px] font-black uppercase tracking-[0.12em] px-1.5 py-[3px] rounded"
      style={{ background: `${color}1A`, color, border: `1px solid ${color}40` }}
    >
      {label}
    </span>
  );
}

function CarrierGlyph({ carrier, className }: { carrier: string; className?: string }) {
  const c = (carrier || "").toLowerCase();
  // Brand-glanced glyphs — square/circle backed mark in the carrier's accent
  // color, white-stroked "USPS"/"UPS"/"FX"/"DHL" mark inside.
  if (c.includes("usps")) {
    return (
      <span className={className} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "linear-gradient(135deg, #2D5BA8, #1c3f7a)", color: "#fff", fontSize: 9, fontWeight: 900, letterSpacing: "0.04em" }}>
        USPS
      </span>
    );
  }
  if (c.includes("ups")) {
    return (
      <span className={className} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "linear-gradient(135deg, #6B3F1A, #3F2410)", color: "#FFC107", fontSize: 11, fontWeight: 900, letterSpacing: "0.06em" }}>
        UPS
      </span>
    );
  }
  if (c.includes("fedex") || c === "fx") {
    return (
      <span className={className} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "linear-gradient(135deg, #4D148C, #2E0A57)", color: "#FF6600", fontSize: 11, fontWeight: 900 }}>
        Fx
      </span>
    );
  }
  if (c.includes("dhl")) {
    return (
      <span className={className} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "#FFCC00", color: "#D40511", fontSize: 10, fontWeight: 900, letterSpacing: "0.04em" }}>
        DHL
      </span>
    );
  }
  // Generic fallback — first 2 letters of the carrier name in brand colors.
  return (
    <span className={className} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", borderRadius: 8, background: "rgba(51,116,133,0.12)", color: "#337485", fontSize: 11, fontWeight: 900, letterSpacing: "0.04em" }}>
      {(carrier || "??").slice(0, 2).toUpperCase()}
    </span>
  );
}

/* ─── Labels pane ────────────────────────────────────────────────────────── */

function LabelsPane({
  labels, isPending, onForward, onRefund, rowMsg,
}: {
  labels: LabelRow[]; isPending: boolean;
  onForward: (l: LabelRow) => void; onRefund: (l: LabelRow) => void;
  rowMsg: { id: string; msg: string } | null;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "refunded">("all");
  // Bulk-select for batch ops (track-all-selected, run-sheet for selection).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }
  function clearSelection() { setSelected(new Set()); }

  // Today's revenue / cost / margin strip — wholesale `amountPaid` from the
  // ShippoLabel rows, customer-facing price computed via the same +10% margin
  // helper used at quote-time. Only counts non-refunded labels created today
  // in local time (admin's POS reality, not server UTC).
  const summary = useMemo(() => {
    const today = new Date().toDateString();
    let todayCount = 0;
    let todayCostCents = 0;
    let todayCustomerCents = 0;
    for (const l of labels) {
      if (l.status === "refunded") continue;
      const d = new Date(l.createdAt);
      if (d.toDateString() !== today) continue;
      const cost = Math.round(l.amountPaid * 100);
      const { customerPriceCents } = priceWithMargin(cost);
      todayCount += 1;
      todayCostCents += cost;
      todayCustomerCents += customerPriceCents;
    }
    return {
      count: todayCount,
      costCents: todayCostCents,
      revenueCents: todayCustomerCents,
      marginCents: todayCustomerCents - todayCostCents,
    };
  }, [labels]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return labels.filter((l) => {
      if (statusFilter === "active" && l.status === "refunded") return false;
      if (statusFilter === "refunded" && l.status !== "refunded") return false;
      if (!q) return true;
      const hay =
        `${l.toName} ${l.trackingNumber} ${l.carrier} ${l.servicelevel} ` +
        `${l.toCity} ${l.toState} ${l.toZip} ${l.userName ?? ""} ${l.suiteNumber ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [labels, query, statusFilter]);

  return (
    <div className="space-y-4">
      {/* Today summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <SummaryTile label="Today" value={String(summary.count)} sub="labels" />
        <SummaryTile label="Revenue" value={`$${(summary.revenueCents / 100).toFixed(2)}`} sub="today" accent />
        <SummaryTile label="Wholesale" value={`$${(summary.costCents / 100).toFixed(2)}`} sub="Shippo cost" />
        <SummaryTile label="Margin" value={`+$${(summary.marginCents / 100).toFixed(2)}`} sub="today" margin />
      </div>

      {/* Filter strip */}
      <div className="rounded-2xl bg-white border border-[#e8e5e0] p-3 flex items-center gap-2 flex-wrap" style={{ boxShadow: "0 1px 2px rgba(45,16,15,0.04)" }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search name · tracking · suite · city · carrier   ( / to focus)"
          data-quick-search="labels"
          className="flex-1 min-w-[180px] rounded-xl border border-[#e8e5e0] px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485] bg-white"
        />
        {(["all", "active", "refunded"] as const).map((f) => {
          const active = statusFilter === f;
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-colors"
              style={{
                background: active ? NOHO_BLUE : "transparent",
                color: active ? "#fff" : "#2D100F",
                border: active ? `1px solid ${NOHO_BLUE}` : "1px solid #e8e5e0",
              }}
            >
              {f === "all" ? `All (${labels.length})` : f}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => exportLabelsCsv(filtered)}
          className="px-2.5 py-1 rounded-lg text-[10.5px] font-bold uppercase tracking-wider border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8] flex items-center gap-1.5"
          title="Export current filtered labels to a spreadsheet (CSV)"
        >
          <svg viewBox="0 0 16 16" className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M8 2 V11 M5 8 L8 11 L11 8 M3 13 H13" />
          </svg>
          CSV
        </button>
      </div>

      {/* Bulk action bar — appears when at least one row is selected. */}
      {selected.size > 0 && (
        <BulkActionBar
          selectedCount={selected.size}
          selectedIds={Array.from(selected)}
          allLabels={labels}
          onClear={clearSelection}
        />
      )}

      {filtered.length === 0 ? (
        <Card>
          <p className="text-[#2D100F]/40 text-sm py-6 text-center">
            {labels.length === 0
              ? "No labels yet — use Quick Ship to buy your first label"
              : `No labels match "${query}"`}
          </p>
        </Card>
      ) : (
        <LabelsListBody
          labels={filtered}
          isPending={isPending}
          onForward={onForward}
          onRefund={onRefund}
          rowMsg={rowMsg}
          selected={selected}
          toggleSelected={toggleSelected}
          onSelectAllVisible={(check) => setSelected((prev) => {
            const next = new Set(prev);
            if (check) for (const l of filtered) next.add(l.id);
            else for (const l of filtered) next.delete(l.id);
            return next;
          })}
          allVisibleSelected={filtered.length > 0 && filtered.every((l) => selected.has(l.id))}
        />
      )}
    </div>
  );
}

function SummaryTile({ label, value, sub, accent, margin }: { label: string; value: string; sub: string; accent?: boolean; margin?: boolean }) {
  return (
    <div
      className="rounded-xl px-3 py-2.5 border"
      style={{
        background: accent ? "linear-gradient(135deg, #337485, #23596A)" : margin ? "linear-gradient(135deg, rgba(22,163,74,0.10), rgba(22,163,74,0.0))" : "#fff",
        borderColor: accent ? "transparent" : margin ? "rgba(22,163,74,0.30)" : "#e8e5e0",
        boxShadow: accent ? "0 6px 18px rgba(51,116,133,0.30)" : "0 1px 2px rgba(45,16,15,0.04)",
      }}
    >
      <p className="text-[9px] font-black uppercase tracking-[0.18em]" style={{ color: accent ? "rgba(247,230,194,0.75)" : margin ? "#15803d" : "rgba(45,16,15,0.45)" }}>
        {label}
      </p>
      <p className="text-lg font-extrabold tracking-tight tabular-nums" style={{ color: accent ? "#F7E6C2" : margin ? "#15803d" : "#2D100F" }}>
        {value}
      </p>
      <p className="text-[9.5px]" style={{ color: accent ? "rgba(247,230,194,0.6)" : margin ? "#15803d" : "rgba(45,16,15,0.45)" }}>
        {sub}
      </p>
    </div>
  );
}

// Build the spreadsheet rows for the Labels CSV export. Customer-pays +
// margin are computed via priceWithMargin so the export matches what the
// rest of the UI shows. Fields: timestamp, carrier, service, recipient,
// city, state, zip, tracking, customer-pays $, wholesale $, margin $, status.
function exportLabelsCsv(labels: LabelRow[]) {
  const rows = labels.map((l) => {
    const wholesaleCents = Math.round(l.amountPaid * 100);
    const { customerPriceCents, marginCents } = priceWithMargin(wholesaleCents);
    return {
      Date: l.createdAt,
      Carrier: l.carrier,
      Service: l.servicelevel,
      Recipient: l.toName,
      City: l.toCity,
      State: l.toState,
      Zip: l.toZip,
      "Tracking #": l.trackingNumber,
      "Customer paid ($)": (customerPriceCents / 100).toFixed(2),
      "Wholesale ($)": (wholesaleCents / 100).toFixed(2),
      "Margin ($)": (marginCents / 100).toFixed(2),
      Status: l.status,
      Suite: l.suiteNumber ?? "",
      "From customer": l.userName ?? "",
    };
  });
  const csv = toCsv(rows);
  downloadCsv(dateStampedName("noho-labels"), csv);
}

function LabelsListBody({
  labels, isPending, onForward, onRefund, rowMsg,
  selected, toggleSelected, onSelectAllVisible, allVisibleSelected,
}: {
  labels: LabelRow[]; isPending: boolean;
  onForward: (l: LabelRow) => void; onRefund: (l: LabelRow) => void;
  rowMsg: { id: string; msg: string } | null;
  selected: Set<string>;
  toggleSelected: (id: string) => void;
  onSelectAllVisible: (check: boolean) => void;
  allVisibleSelected: boolean;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#e8e5e0] overflow-hidden">
      {/* Select-all-visible header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-[#e8e5e0]/70 bg-[#FAF6F0]">
        <input
          type="checkbox"
          checked={allVisibleSelected}
          onChange={(e) => onSelectAllVisible(e.target.checked)}
          className="w-4 h-4 accent-[#337485]"
          title={allVisibleSelected ? "Clear visible" : "Select all visible"}
        />
        <span className="text-[10px] font-black uppercase tracking-wider text-[#2D100F]/55">
          {allVisibleSelected ? "All visible selected" : "Select all visible"}
          <span className="text-[#2D100F]/35"> · {labels.length} row{labels.length === 1 ? "" : "s"}</span>
        </span>
      </div>
      <ul className="divide-y divide-[#e8e5e0]/60">
        {labels.map((l) => (
          <LabelRowItem
            key={l.id}
            label={l}
            isPending={isPending}
            onForward={onForward}
            onRefund={onRefund}
            rowMsg={rowMsg?.id === l.id ? rowMsg.msg : null}
            isSelected={selected.has(l.id)}
            onToggleSelect={() => toggleSelected(l.id)}
          />
        ))}
      </ul>
    </div>
  );
}

function LabelRowItem({
  label: l, isPending, onForward, onRefund, rowMsg,
  isSelected, onToggleSelect,
}: {
  label: LabelRow;
  isPending: boolean;
  onForward: (l: LabelRow) => void;
  onRefund: (l: LabelRow) => void;
  rowMsg: string | null;
  isSelected: boolean;
  onToggleSelect: () => void;
}) {
  const isRefunded = l.status === "refunded";
  const downloadName = `noho-label-${l.carrier}-${l.trackingNumber || l.id}.pdf`.replace(/\s+/g, "-");

  // Live tracking status — fetched on demand via the existing
  // `trackShippoLabel` server action. We cache per-row in state so admin can
  // page through the list without re-firing for every refresh.
  const [liveStatus, setLiveStatus] = useState<{ status: string; sub?: string; loc?: string | null } | null>(null);
  const [trackPending, setTrackPending] = useState(false);
  function refreshTracking() {
    if (!l.trackingNumber) return;
    setTrackPending(true);
    void trackShippoLabel(l.carrier, l.trackingNumber)
      .then((res) => {
        if ("error" in res && res.error) {
          setLiveStatus({ status: "ERROR", sub: res.error });
          return;
        }
        const s = (res as any).status;
        setLiveStatus({ status: s?.status ?? "UNKNOWN", sub: s?.substatus ?? undefined, loc: s?.location ?? null });
      })
      .finally(() => setTrackPending(false));
  }

  return (
    <li
      className="p-4 hover:bg-[#f9f9f8] transition-colors"
      style={isSelected ? { background: "rgba(51,116,133,0.05)" } : undefined}
    >
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onToggleSelect}
          className="mt-1 w-4 h-4 accent-[#337485] shrink-0"
          aria-label={`Select label for ${l.toName}`}
        />
      <div className="flex items-start justify-between gap-4 flex-wrap flex-1 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-bold text-[#2D100F]">{l.toName}</p>
            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-[#337485]/10 text-[#337485]">
              {l.carrier}
            </span>
            <span className="text-[10px] font-bold text-[#2D100F]/55">{l.servicelevel}</span>
            {isRefunded && <RefundedBadge labelId={l.id} />}
            {liveStatus && (
              <LiveStatusPill status={liveStatus.status} location={liveStatus.loc ?? null} />
            )}
          </div>
          <p className="text-[11px] text-[#2D100F]/45 mt-0.5">
            {l.toCity}, {l.toState} {l.toZip}
            {l.suiteNumber && <span className="text-[#337485] font-bold"> · Suite #{l.suiteNumber}</span>}
          </p>
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <a href={l.trackingUrl} target="_blank" rel="noopener noreferrer" className="font-mono text-[11px] text-[#337485] hover:underline">
              {l.trackingNumber}
            </a>
            <span className="text-[#2D100F]/30">·</span>
            <span className="text-[11px] text-[#2D100F]/55">${l.amountPaid.toFixed(2)}</span>
            <span className="text-[#2D100F]/30">·</span>
            <span className="text-[10px] text-[#2D100F]/40">{l.createdAt}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1.5 shrink-0">
          <button
            onClick={refreshTracking}
            disabled={trackPending || !l.trackingNumber}
            title="Fetch live tracking status from the carrier"
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8] disabled:opacity-50 transition-colors"
          >
            {trackPending ? "Tracking…" : liveStatus ? "Refresh" : "Track"}
          </button>
          <a href={l.labelUrl} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 rounded-lg text-[11px] font-black bg-[#337485] text-white hover:bg-[#23596A] transition-colors">Print</a>
          <a href={l.labelUrl} download={downloadName} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8] transition-colors">Download</a>
          <button onClick={() => onForward(l)} disabled={isPending} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-[#16a34a] text-white hover:bg-[#15803d] disabled:opacity-50 transition-colors" title="Text label + tracking to the customer">Forward</button>
          <CopyPublicLinkButton labelId={l.id} />
          <a href={`/admin/shippo/receipt/${l.id}`} target="_blank" rel="noopener noreferrer" className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8] transition-colors">Receipt</a>
          {!isRefunded && (
            <button onClick={() => onRefund(l)} disabled={isPending} className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors">Refund</button>
          )}
        </div>
      </div>
      </div>

      {rowMsg && (
        <p className="mt-2 text-[11px] font-bold text-[#337485] bg-[#337485]/8 px-3 py-1.5 rounded-lg">{rowMsg}</p>
      )}
    </li>
  );
}

/* ─── Bulk action bar ────────────────────────────────────────────────────── */
// Floats above the labels list when ≥1 row is selected. Two batch actions:
//   · Track all selected — pings Shippo's tracking endpoint for each row in
//     parallel (limited to ~6 concurrent so we don't burst against the API)
//     and shows a per-label inline status row.
//   · Run sheet for selection — opens /admin/shipping/runsheet?ids=… in a
//     new tab; the run-sheet page filters to those label IDs.

function BulkActionBar({
  selectedCount, selectedIds, allLabels, onClear,
}: {
  selectedCount: number;
  selectedIds: string[];
  allLabels: LabelRow[];
  onClear: () => void;
}) {
  const [tracking, setTracking] = useState<Record<string, { status: string; loc?: string | null } | "pending" | "error">>({});

  async function trackAll() {
    // 6-wide concurrency window so we're nice to Shippo + the browser.
    const CONCURRENT = 6;
    const queue = selectedIds
      .map((id) => allLabels.find((l) => l.id === id))
      .filter((l): l is LabelRow => !!l && !!l.trackingNumber);
    const next: typeof tracking = { ...tracking };
    for (const l of queue) next[l.id] = "pending";
    setTracking(next);

    let i = 0;
    async function worker() {
      while (i < queue.length) {
        const idx = i++;
        const l = queue[idx];
        try {
          const res = await trackShippoLabel(l.carrier, l.trackingNumber);
          if ("error" in res && res.error) {
            setTracking((prev) => ({ ...prev, [l.id]: "error" }));
          } else {
            const s = (res as any).status;
            setTracking((prev) => ({ ...prev, [l.id]: { status: s?.status ?? "UNKNOWN", loc: s?.location ?? null } }));
          }
        } catch {
          setTracking((prev) => ({ ...prev, [l.id]: "error" }));
        }
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENT, queue.length) }, worker));
  }

  function openSelectionRunSheet() {
    const url = `/admin/shipping/runsheet?ids=${encodeURIComponent(selectedIds.join(","))}`;
    if (typeof window !== "undefined") window.open(url, "_blank", "noopener,noreferrer");
  }

  function openAllLabels() {
    if (typeof window === "undefined") return;
    const labels = selectedIds
      .map((id) => allLabels.find((l) => l.id === id))
      .filter((l): l is LabelRow => !!l && !!l.labelUrl);
    if (labels.length === 0) return;
    if (labels.length > 8 && !confirm(`Open ${labels.length} label PDFs in new tabs?`)) return;
    // Open each in its own tab. Browsers throttle popups when too many fire
    // synchronously, so stagger ~120ms between opens so they all land.
    labels.forEach((l, i) => {
      setTimeout(() => {
        window.open(l.labelUrl, "_blank", "noopener,noreferrer");
      }, i * 120);
    });
  }

  // Quick summary of statuses pulled in this batch.
  const summary = Object.values(tracking).reduce((acc, v) => {
    if (v === "pending") acc.pending += 1;
    else if (v === "error") acc.error += 1;
    else if (v) acc[v.status === "DELIVERED" ? "delivered" : v.status === "TRANSIT" ? "transit" : "other"] += 1;
    return acc;
  }, { pending: 0, error: 0, delivered: 0, transit: 0, other: 0 });

  return (
    <div
      className="rounded-2xl px-3 py-2 flex items-center gap-3 flex-wrap border"
      style={{
        background: "linear-gradient(90deg, rgba(51,116,133,0.08), rgba(51,116,133,0.02))",
        borderColor: "rgba(51,116,133,0.30)",
      }}
    >
      <span className="text-[11px] font-black text-[#23596A]">
        {selectedCount} selected
      </span>
      <div className="flex items-center gap-1.5 flex-wrap">
        <button
          type="button"
          onClick={trackAll}
          className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white"
          style={{ background: NOHO_BLUE }}
        >
          Track all
        </button>
        <button
          type="button"
          onClick={openAllLabels}
          className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white"
          style={{ background: NOHO_BLUE_DEEP }}
          title="Open every selected label PDF in its own tab — Cmd-P across all to print in batch"
        >
          Open labels
        </button>
        <button
          type="button"
          onClick={openSelectionRunSheet}
          className="px-3 py-1.5 rounded-lg text-[11px] font-black bg-[#16a34a] text-white hover:bg-[#15803d]"
          title="Open the run sheet filtered to just these labels"
        >
          Run sheet for selection
        </button>
      </div>
      {(summary.pending + summary.delivered + summary.transit + summary.other + summary.error) > 0 && (
        <span className="text-[10.5px] text-[#2D100F]/60 ml-auto">
          {summary.delivered > 0 && <span className="text-emerald-700 font-bold">{summary.delivered} delivered </span>}
          {summary.transit > 0 && <span className="text-[#23596A] font-bold">· {summary.transit} in transit </span>}
          {summary.other > 0 && <span>· {summary.other} other </span>}
          {summary.pending > 0 && <span>· {summary.pending} pending </span>}
          {summary.error > 0 && <span className="text-red-700 font-bold">· {summary.error} err </span>}
        </span>
      )}
      <button
        type="button"
        onClick={onClear}
        className="ml-auto sm:ml-0 px-2 py-1 rounded text-[10.5px] text-[#2D100F]/55 hover:text-[#2D100F]"
      >
        Clear selection
      </button>
    </div>
  );
}

// Refunded label badge — base pill is red "Refunded" with an inline button
// to fetch live Shippo refund status. After fetch, the pill expands to a
// 4-step mini-timeline (Queued → Pending → Success / Error) so admin sees
// whether the money actually came back without leaving the panel.
function RefundedBadge({ labelId }: { labelId: string }) {
  const [info, setInfo] = useState<{ status: string; messages: string[]; refundId: string } | null>(null);
  const [pending, setPending] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  function fetchStatus() {
    setPending(true);
    setErr(null);
    void getShippoRefundStatus(labelId)
      .then((res) => {
        if ("error" in res && res.error) {
          setErr(res.error);
          return;
        }
        setInfo({
          status: (res as any).info.status as string,
          messages: ((res as any).info.messages as string[]) ?? [],
          refundId: (res as any).info.refundId as string,
        });
      })
      .finally(() => setPending(false));
  }
  // Map Shippo's refund status into the timeline color cue.
  const upper = (info?.status ?? "").toUpperCase();
  const stage =
    upper === "SUCCESS" ? 3 :
    upper === "PENDING" ? 2 :
    upper === "QUEUED" ? 1 :
    upper === "ERROR" ? -1 :
    0;
  return (
    <span className="inline-flex items-center gap-1.5">
      <span
        className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border"
        style={{
          background: stage === 3 ? "rgba(22,163,74,0.10)" : stage === -1 ? "rgba(231,0,19,0.10)" : "rgba(231,0,19,0.06)",
          color: stage === 3 ? "#15803d" : stage === -1 ? "#991b1b" : "#991b1b",
          borderColor: stage === 3 ? "rgba(22,163,74,0.35)" : stage === -1 ? "rgba(231,0,19,0.40)" : "rgba(231,0,19,0.30)",
        }}
        title={info ? `Shippo refund ${info.refundId} · ${info.status}${info.messages.length ? " · " + info.messages.join("; ") : ""}` : "Refund initiated; click status to fetch live"}
      >
        {info ? `Refund · ${info.status}` : "Refunded"}
      </span>
      {!info && (
        <button
          type="button"
          onClick={fetchStatus}
          disabled={pending}
          className="text-[9.5px] font-bold text-[#337485] hover:underline disabled:opacity-50"
          title="Fetch live refund status from Shippo"
        >
          {pending ? "…" : "status"}
        </button>
      )}
      {info && (
        // Tiny 3-segment progress so admin can see at a glance.
        <span className="inline-flex items-center gap-0.5" aria-label={`Refund ${info.status}`} title={info.status}>
          {[1, 2, 3].map((n) => (
            <span
              key={n}
              className="inline-block w-2 h-1 rounded-sm"
              style={{
                background: stage === -1
                  ? "#E70013"
                  : stage >= n
                    ? "#16a34a"
                    : "rgba(45,16,15,0.20)",
              }}
            />
          ))}
        </span>
      )}
      {err && (
        <span className="text-[9.5px] text-red-700" title={err}>
          {err.length > 30 ? "err" : err}
        </span>
      )}
    </span>
  );
}

// Quick way to copy the customer-facing public receipt URL (`/r/[id]`) so
// admin can paste it into iMessage/WhatsApp/email without going through the
// full Forward flow. Uses the current window origin so links work both in
// preview deploys and production.
function CopyPublicLinkButton({ labelId }: { labelId: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    const origin = typeof window !== "undefined" ? window.location.origin : "https://nohomailbox.org";
    const url = `${origin}/r/${labelId}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8] transition-colors"
      title="Copy the customer-facing branded NOHO tracking URL to the clipboard"
    >
      {copied ? "Copied ✓" : "Public link"}
    </button>
  );
}

function LiveStatusPill({ status, location }: { status: string; location: string | null }) {
  // Map Shippo's tracking status into a visible color cue. Anything we don't
  // recognize falls through to a neutral teal so unknowns don't look broken.
  const s = (status || "").toUpperCase();
  let bg = "rgba(51,116,133,0.12)", fg = "#23596A", dot = "#337485", label = s || "—";
  if (s === "DELIVERED") { bg = "rgba(22,163,74,0.14)"; fg = "#15803d"; dot = "#16a34a"; label = "Delivered"; }
  else if (s === "TRANSIT") { bg = "rgba(51,116,133,0.18)"; fg = "#23596A"; dot = "#337485"; label = "In transit"; }
  else if (s === "PRE_TRANSIT") { bg = "rgba(245,166,35,0.14)"; fg = "#92400e"; dot = "#F5A623"; label = "Awaiting pickup"; }
  else if (s === "RETURNED") { bg = "rgba(231,0,19,0.14)"; fg = "#991b1b"; dot = "#E70013"; label = "Returned"; }
  else if (s === "FAILURE") { bg = "rgba(231,0,19,0.14)"; fg = "#991b1b"; dot = "#E70013"; label = "Failed"; }
  else if (s === "ERROR") { bg = "rgba(231,0,19,0.14)"; fg = "#991b1b"; dot = "#E70013"; label = "Track error"; }
  return (
    <span
      className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded"
      style={{ background: bg, color: fg }}
      title={location ? `${label} · ${location}` : label}
    >
      <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: dot, boxShadow: `0 0 4px ${dot}` }} />
      {label}
    </span>
  );
}

/* ─── Track pane ─────────────────────────────────────────────────────────── */
// Auto-detects the carrier from tracking-number format so admin can paste
// any number and hit Track without picking from the dropdown. Keeps a 6-item
// recent-search history in localStorage for one-click re-track.

const TRACK_RECENTS_KEY = "noho-shippo-track-recents-v1";

function detectCarrierFromTracking(t: string): string | null {
  const s = t.replace(/\s+/g, "").toUpperCase();
  // UPS: starts with "1Z"
  if (s.startsWith("1Z") && s.length >= 16) return "UPS";
  // USPS: starts with 9-digit prefixes 92/93/94/95 or "EC/EI/HC" registered
  if (/^9[2-5]\d{20,}/.test(s)) return "USPS";
  if (/^(EC|EI|HC|RA|RB|RE|RF|RR)/.test(s) && s.length >= 13) return "USPS";
  // FedEx: 12 or 15 digits, sometimes prefixed "9612" SmartPost
  if (/^9612\d/.test(s) && s.length >= 14) return "FedEx";
  if (/^\d{12}$/.test(s) || /^\d{15}$/.test(s)) return "FedEx";
  // DHL Express: 10 digits OR DHLDoc (starts with JD/JJD)
  if (/^\d{10}$/.test(s)) return "DHL";
  if (/^JJ?D/.test(s) && s.length >= 10) return "DHL";
  return null;
}

function TrackPane(props: any) {
  const { trackCarrier, setTrackCarrier, trackNum, setTrackNum, trackResult, trackError, doTrack, isPending, inputCls } = props;

  // Auto-detect on change. Only override the selection if we're confident.
  function onTrackNumChange(v: string) {
    setTrackNum(v);
    const detected = detectCarrierFromTracking(v);
    if (detected && detected !== trackCarrier) setTrackCarrier(detected);
  }

  // Recent searches — localStorage so it survives page reload but stays
  // per-browser (admin may share the laptop).
  const [recents, setRecents] = useState<Array<{ carrier: string; number: string; ts: number }>>([]);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TRACK_RECENTS_KEY);
      if (raw) setRecents(JSON.parse(raw));
    } catch { /* swallow */ }
  }, []);
  function pushRecent(carrier: string, number: string) {
    setRecents((prev) => {
      const next = [{ carrier, number, ts: Date.now() }, ...prev.filter((r) => r.number !== number)].slice(0, 6);
      try { localStorage.setItem(TRACK_RECENTS_KEY, JSON.stringify(next)); } catch { /* swallow */ }
      return next;
    });
  }
  function track() {
    if (trackNum.trim()) pushRecent(trackCarrier, trackNum.trim());
    doTrack();
  }

  // Visual progress: 4 stages from PRE_TRANSIT → TRANSIT → DELIVERED + a
  // returned/failure off-ramp. Mapped to a position 0..1 for the bar fill.
  const stage = (() => {
    const s = (trackResult?.status ?? "").toUpperCase();
    if (s === "DELIVERED") return { pos: 1, current: 3, label: "Delivered" };
    if (s === "TRANSIT") return { pos: 0.66, current: 2, label: "In transit" };
    if (s === "PRE_TRANSIT") return { pos: 0.33, current: 1, label: "Awaiting pickup" };
    if (s === "RETURNED" || s === "FAILURE") return { pos: 0, current: -1, label: "Issue" };
    return { pos: 0.1, current: 0, label: s || "Unknown" };
  })();

  return (
    <div className="space-y-4">
      <Card>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2D100F]/40">Track Shipment</p>
        <p className="text-[11px] mt-0.5 text-[#2D100F]/55">Paste any carrier's tracking number — we auto-detect USPS / UPS / FedEx / DHL.</p>
        <div className="grid grid-cols-3 gap-3 mt-3">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D100F]/40 mb-1">Carrier</label>
            <select className={inputCls} value={trackCarrier} onChange={(e: any) => setTrackCarrier(e.target.value)}>
              {CARRIERS.map((c) => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="col-span-2">
            <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D100F]/40 mb-1">
              Tracking Number
              {detectCarrierFromTracking(trackNum) && (
                <span className="ml-2 text-[#337485] normal-case tracking-normal font-bold">
                  · auto-detected {detectCarrierFromTracking(trackNum)}
                </span>
              )}
            </label>
            <input className={inputCls} value={trackNum} onChange={(e: any) => onTrackNumChange(e.target.value)} placeholder="9400 1118 9922 3397 9812 01" />
          </div>
        </div>
        <button
          disabled={isPending || !trackNum.trim()}
          onClick={track}
          className="w-full py-2.5 rounded-xl text-white font-black text-sm disabled:opacity-40 mt-3"
          style={{ background: NOHO_BLUE }}
        >
          {isPending ? "Fetching…" : "Track Package"}
        </button>

        {recents.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#e8e5e0]/70">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#2D100F]/40 mb-2">Recent</p>
            <div className="flex flex-wrap gap-2">
              {recents.map((r) => (
                <button
                  key={`${r.number}-${r.ts}`}
                  type="button"
                  onClick={() => { setTrackCarrier(r.carrier); setTrackNum(r.number); }}
                  className="text-[10.5px] px-2.5 py-1 rounded-full border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8] hover:border-[#337485] transition-colors flex items-center gap-1.5"
                  title={`${r.carrier} · ${new Date(r.ts).toLocaleString()}`}
                >
                  <span className="text-[9px] font-black uppercase tracking-wider text-[#337485]">{r.carrier}</span>
                  <span className="font-mono">{r.number.length > 14 ? r.number.slice(0, 12) + "…" : r.number}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </Card>

      {trackError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-semibold">{trackError}</div>
      )}

      {trackResult && (
        <Card>
          {/* Big visual progress bar */}
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <LiveStatusPill status={trackResult.status ?? "UNKNOWN"} location={trackResult.location ?? null} />
                {trackResult.location && <p className="text-sm font-bold text-[#2D100F]">{trackResult.location}</p>}
              </div>
              {trackResult.eta && (
                <p className="text-xs text-[#2D100F]/50">ETA: {new Date(trackResult.eta).toLocaleDateString()}</p>
              )}
            </div>

            {/* Progress rail */}
            <div className="relative h-2 rounded-full bg-[#f4f6f8] overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 transition-all duration-700 rounded-full"
                style={{
                  width: `${Math.max(4, stage.pos * 100)}%`,
                  background: stage.current === -1
                    ? "linear-gradient(90deg, #E70013, #991b1b)"
                    : stage.current === 3
                      ? "linear-gradient(90deg, #16a34a, #15803d)"
                      : "linear-gradient(90deg, #337485, #23596A)",
                }}
              />
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { n: 1, label: "Awaiting pickup", k: "PRE_TRANSIT" },
                { n: 2, label: "In transit", k: "TRANSIT" },
                { n: 3, label: "Delivered", k: "DELIVERED" },
              ].map((s) => {
                const reached = stage.current >= s.n || stage.current === 3;
                const isCurrent = stage.current === s.n;
                const errored = stage.current === -1;
                return (
                  <div key={s.k}>
                    <p
                      className="text-[10px] font-black uppercase tracking-wider"
                      style={{
                        color: errored ? "#991b1b" : reached ? "#15803d" : isCurrent ? "#337485" : "rgba(45,16,15,0.40)",
                      }}
                    >
                      {s.label}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {trackResult.trackingHistory?.length > 0 && (
            <div className="space-y-2 mt-5 pt-4 border-t border-[#e8e5e0]/70">
              <p className="text-[10px] font-black uppercase tracking-wider text-[#2D100F]/40">History</p>
              {trackResult.trackingHistory.slice(0, 8).map((h: any, i: number) => (
                <div key={i} className="flex gap-3 items-start text-xs">
                  <span className="text-[#2D100F]/30 font-mono w-32 shrink-0">{h.date ? new Date(h.date).toLocaleString() : "—"}</span>
                  <span className="font-semibold text-[#2D100F]">{h.status}</span>
                  {h.location && <span className="text-[#2D100F]/50 ml-auto">{h.location}</span>}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/* ─── Carriers pane ──────────────────────────────────────────────────────── */

function CarriersPane({
  accounts, activeIds, loading, isConfigured, isPending, carrierMsg,
  onToggle, onSave, onRefresh, recentLabels,
}: {
  accounts: CarrierAccountSummary[];
  activeIds: string[];
  loading: boolean;
  isConfigured: boolean;
  isPending: boolean;
  carrierMsg: string | null;
  onToggle: (id: string) => void;
  onSave: () => void;
  onRefresh: () => void;
  recentLabels: LabelRow[];
}) {
  if (!isConfigured) {
    return (
      <Card>
        <p className="text-sm text-[#2D100F]/60">Add <code className="px-1.5 py-0.5 rounded bg-[#f4f6f8] text-[#2D100F] text-xs font-mono">SHIPPO_API_KEY</code> to enable carrier-account selection.</p>
      </Card>
    );
  }

  // Group by carrier slug for sane UI when there are multiple accounts per carrier.
  const grouped = accounts.reduce<Record<string, CarrierAccountSummary[]>>((acc, a) => {
    (acc[a.carrierName] = acc[a.carrierName] ?? []).push(a);
    return acc;
  }, {});
  const groupNames = Object.keys(grouped).sort();

  const ownedCount = accounts.filter((a) => !a.isShippoAccount && activeIds.includes(a.objectId)).length;
  const shippoDefaultActive = accounts.some((a) => a.isShippoAccount && activeIds.includes(a.objectId));

  // Per-carrier (by `carrierName`) recent-label counts so each card can show
  // "47 labels recently · 4 today". Local-time comparison so admin's day matches.
  const carrierStats = (() => {
    const today = new Date().toDateString();
    const counts = new Map<string, { recent: number; today: number; lastTs: number | null }>();
    for (const l of recentLabels) {
      if (l.status === "refunded") continue;
      const k = (l.carrier || "").toUpperCase();
      const cur = counts.get(k) ?? { recent: 0, today: 0, lastTs: null };
      cur.recent += 1;
      const ts = Date.parse(l.createdAt as unknown as string);
      if (!Number.isNaN(ts) && (cur.lastTs == null || ts > cur.lastTs)) cur.lastTs = ts;
      const d = new Date(l.createdAt);
      if (!Number.isNaN(d.getTime()) && d.toDateString() === today) cur.today += 1;
      counts.set(k, cur);
    }
    return counts;
  })();

  // Map our display name to a brand glyph color set + canonical key for stats.
  function carrierKey(name: string): string {
    const n = name.toUpperCase();
    if (n.includes("USPS")) return "USPS";
    if (n.includes("UPS")) return "UPS";
    if (n.includes("FEDEX")) return "FEDEX";
    if (n.includes("DHL")) return "DHL";
    return n.split(" ")[0];
  }
  function relTime(ts: number | null): string {
    if (!ts) return "—";
    const diff = Date.now() - ts;
    const min = Math.round(diff / 60000);
    if (min < 1) return "just now";
    if (min < 60) return `${min}m ago`;
    const h = Math.round(min / 60);
    if (h < 24) return `${h}h ago`;
    const d = Math.round(h / 24);
    return `${d}d ago`;
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2D100F]/40">Carrier Accounts</p>
            <p className="text-[11px] mt-0.5 text-[#2D100F]/55">
              Pin your real UPS / FedEx / DHL contracts so labels purchase reliably.
              {accounts.length > 0 && <> Found <strong>{accounts.length}</strong> on your Shippo profile.</>}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {carrierMsg && (
              <span className={`text-[11px] font-bold ${carrierMsg.startsWith("✓") ? "text-emerald-700" : "text-red-700"}`}>{carrierMsg}</span>
            )}
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8] disabled:opacity-50"
            >
              {loading ? "Refreshing…" : "Refresh"}
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white disabled:opacity-50"
              style={{ background: NOHO_BLUE }}
            >
              {isPending ? "Saving…" : "Save selection"}
            </button>
          </div>
        </div>

        {accounts.length === 0 && !loading && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mt-3">
            <p className="text-xs font-bold text-amber-700">No carrier accounts found on your Shippo profile.</p>
            <p className="text-[11px] text-amber-700/80 mt-1">
              Sign in to <a href="https://apps.goshippo.com/settings/carriers" target="_blank" rel="noopener noreferrer" className="underline">apps.goshippo.com/settings/carriers</a> and connect your UPS, FedEx, or DHL accounts. Then click Refresh.
            </p>
          </div>
        )}

        {accounts.length > 0 && (
          <div className="space-y-4 mt-3">
            {groupNames.map((name) => {
              const stats = carrierStats.get(carrierKey(name));
              return (
                <div key={name}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <CarrierGlyph carrier={name} className="w-7 h-7 shrink-0" />
                      <div>
                        <p className="text-[12px] font-black text-[#2D100F]">{name}</p>
                        <p className="text-[9.5px] text-[#2D100F]/45">
                          {grouped[name].length} account{grouped[name].length === 1 ? "" : "s"}
                          {stats && stats.recent > 0 && <> · {stats.recent} recent label{stats.recent === 1 ? "" : "s"}</>}
                          {stats && stats.today > 0 && <> · <span className="text-[#15803d] font-bold">{stats.today} today</span></>}
                        </p>
                      </div>
                    </div>
                    {stats?.lastTs && (
                      <span className="text-[9.5px] text-[#2D100F]/55">last used {relTime(stats.lastTs)}</span>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    {grouped[name].map((a) => {
                      const active = activeIds.includes(a.objectId);
                      return (
                        <label
                          key={a.objectId}
                          className="flex items-start gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all"
                          style={{
                            background: active ? "rgba(51,116,133,0.07)" : "#fff",
                            borderColor: active ? "rgba(51,116,133,0.5)" : "#e8e5e0",
                            boxShadow: active ? "0 0 0 1px rgba(51,116,133,0.20), 0 1px 2px rgba(45,16,15,0.04)" : "0 1px 2px rgba(45,16,15,0.04)",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => onToggle(a.objectId)}
                            className="mt-0.5 w-4 h-4 accent-[#337485]"
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-black text-[#2D100F]">
                                {active ? "Active" : "Inactive"}
                                {!a.active && <span className="text-red-700 ml-1">· disabled on Shippo</span>}
                              </p>
                              {active && (
                                <span className="inline-flex items-center gap-1 text-[9.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(22,163,74,0.14)", color: "#15803d" }}>
                                  <span className="inline-block w-1.5 h-1.5 rounded-full" style={{ background: "#16a34a", boxShadow: "0 0 6px rgba(22,163,74,0.55)" }} />
                                  Pinned
                                </span>
                              )}
                              {a.isShippoAccount && (
                                <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#fef3c7] text-[#92400e]" title="A Shippo demo / default account — fine for testing, not for billing real customers">
                                  Shippo default
                                </span>
                              )}
                            </div>
                            {a.accountId && (
                              <p className="text-[10.5px] text-[#2D100F]/65 font-mono mt-0.5">
                                <span className="text-[#2D100F]/40">acct</span> {a.accountId}
                              </p>
                            )}
                            <p className="text-[9px] text-[#2D100F]/35 font-mono mt-0.5 break-all">
                              <span className="text-[#2D100F]/30">id</span> {a.objectId}
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Status summary */}
      <Card>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2D100F]/40">Active Selection</p>
        <ul className="mt-2 space-y-1 text-xs text-[#2D100F]">
          <li>· {ownedCount} of your real carrier contract{ownedCount === 1 ? "" : "s"} active</li>
          <li>
            · Shippo default account {shippoDefaultActive ? "INCLUDED" : "excluded"}
            {shippoDefaultActive && (
              <span className="text-amber-700 font-bold"> — disable in production unless intentional</span>
            )}
          </li>
          <li>· Empty selection = Shippo's pick (returns its default test accounts; UPS purchases may silently fail).</li>
        </ul>
      </Card>
    </div>
  );
}

/* ─── Parcel presets pane ────────────────────────────────────────────────── */
// Editor for the admin's saved box stock. Each preset can be renamed,
// resized, deleted, plus "Add new" and "Reset to defaults". Saves to
// SiteConfig via setParcelPresets. Quick-fill chips on the Quick Ship rate
// form read this same list.

function PresetsPane({
  presets, setPresets, isPending, presetMsg, setPresetMsg, startTransition, inputCls,
}: {
  presets: ParcelPreset[];
  setPresets: (p: ParcelPreset[]) => void;
  isPending: boolean;
  presetMsg: string | null;
  setPresetMsg: (m: string | null) => void;
  startTransition: (cb: () => void) => void;
  inputCls: string;
}) {
  function update(id: string, patch: Partial<ParcelPreset>) {
    setPresets(presets.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  }
  function remove(id: string) {
    setPresets(presets.filter((p) => p.id !== id));
  }
  function addNew() {
    setPresets([
      ...presets,
      {
        id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tmp-${Date.now()}`,
        label: "New preset",
        lengthIn: 12, widthIn: 9, heightIn: 4, weightOz: 16,
      },
    ]);
  }
  function save() {
    setPresetMsg(null);
    startTransition(async () => {
      const res = await setParcelPresets(presets);
      if ("error" in (res as any)) {
        setPresetMsg(((res as any).error as string) ?? "Failed to save");
      } else {
        setPresetMsg(`✓ Saved · ${(res as any).count ?? presets.length} preset${presets.length === 1 ? "" : "s"}`);
        setTimeout(() => setPresetMsg(null), 3000);
      }
    });
  }
  function resetDefaults() {
    if (!confirm("Replace your presets with the built-in defaults (Envelope / Small / Medium / Large)?")) return;
    startTransition(async () => {
      const res = await resetParcelPresets();
      if ("presets" in res) {
        setPresets(res.presets);
        setPresetMsg("✓ Reset to defaults");
        setTimeout(() => setPresetMsg(null), 3000);
      }
    });
  }

  // Drag-to-reorder — HTML5 drag/drop, no library. Order on screen mirrors
  // the order on the Quick Ship rate form chips.
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  function move(fromId: string, toId: string) {
    if (fromId === toId) return;
    const fromIdx = presets.findIndex((p) => p.id === fromId);
    const toIdx = presets.findIndex((p) => p.id === toId);
    if (fromIdx < 0 || toIdx < 0) return;
    const next = presets.slice();
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    setPresets(next);
  }

  return (
    <div className="space-y-4">
      <Card>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2D100F]/40">Box Presets</p>
            <p className="text-[11px] mt-0.5 text-[#2D100F]/55">
              Your real box stock. One tap on Quick Ship fills LWH + weight. {presets.length} on file.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {presetMsg && (
              <span className={`text-[11px] font-bold ${presetMsg.startsWith("✓") ? "text-emerald-700" : "text-red-700"}`}>{presetMsg}</span>
            )}
            <button
              type="button"
              onClick={resetDefaults}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8] disabled:opacity-50"
              title="Replace with built-in defaults"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={addNew}
              className="px-3 py-1.5 rounded-lg text-[11px] font-bold border border-[#e8e5e0] text-[#2D100F] hover:bg-[#f4f6f8]"
            >
              + Add preset
            </button>
            <button
              type="button"
              onClick={save}
              disabled={isPending}
              className="px-3 py-1.5 rounded-lg text-[11px] font-black text-white disabled:opacity-50"
              style={{ background: NOHO_BLUE }}
            >
              {isPending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>

        <div className="mt-3 space-y-2">
          {presets.length === 0 && (
            <div className="rounded-xl border border-dashed border-[#e8e5e0] px-4 py-6 text-center text-xs text-[#2D100F]/50">
              No presets yet — click <strong className="text-[#337485]">Add preset</strong> to define your first box size.
            </div>
          )}
          {presets.map((p, idx) => {
            const isDragging = draggingId === p.id;
            const isOver = overId === p.id && draggingId !== p.id;
            return (
              <div
                key={p.id}
                draggable
                onDragStart={(e) => {
                  setDraggingId(p.id);
                  e.dataTransfer.effectAllowed = "move";
                  e.dataTransfer.setData("text/plain", p.id);
                }}
                onDragEnd={() => { setDraggingId(null); setOverId(null); }}
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setOverId(p.id); }}
                onDragLeave={() => setOverId((cur) => (cur === p.id ? null : cur))}
                onDrop={(e) => { e.preventDefault(); const src = e.dataTransfer.getData("text/plain") || draggingId; if (src) move(src, p.id); setOverId(null); setDraggingId(null); }}
                className="rounded-xl bg-white border px-3 py-3 grid grid-cols-1 md:grid-cols-[28px_1.5fr_repeat(4,1fr)_auto] gap-2 items-end transition-all"
                style={{
                  borderColor: isOver ? "#337485" : "#e8e5e0",
                  background: isOver ? "rgba(51,116,133,0.06)" : "#fff",
                  opacity: isDragging ? 0.55 : 1,
                  transform: isOver ? "translateY(1px)" : undefined,
                  cursor: isDragging ? "grabbing" : undefined,
                }}
              >
                {/* Drag handle */}
                <div className="flex items-end justify-center pb-2 select-none" style={{ cursor: "grab", color: "rgba(45,16,15,0.40)" }} title="Drag to reorder">
                  <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                    <circle cx="5" cy="3" r="1.2" /><circle cx="5" cy="8" r="1.2" /><circle cx="5" cy="13" r="1.2" />
                    <circle cx="11" cy="3" r="1.2" /><circle cx="11" cy="8" r="1.2" /><circle cx="11" cy="13" r="1.2" />
                  </svg>
                </div>
                <div className="md:col-span-1">
                  <label className="block text-[9px] font-bold uppercase tracking-wider text-[#2D100F]/40 mb-1">Label</label>
                  <input
                    className={inputCls}
                    value={p.label}
                    onChange={(e) => update(p.id, { label: e.target.value })}
                    placeholder="JADENS Box A"
                  />
                </div>
                <NumField label="L (in)" value={p.lengthIn} onChange={(v) => update(p.id, { lengthIn: v })} inputCls={inputCls} />
                <NumField label="W (in)" value={p.widthIn} onChange={(v) => update(p.id, { widthIn: v })} inputCls={inputCls} />
                <NumField label="H (in)" value={p.heightIn} onChange={(v) => update(p.id, { heightIn: v })} inputCls={inputCls} />
                <NumField label="Weight (oz)" value={p.weightOz} onChange={(v) => update(p.id, { weightOz: v })} inputCls={inputCls} />
                <button
                  type="button"
                  onClick={() => remove(p.id)}
                  className="px-2.5 py-1.5 rounded-lg text-[11px] font-bold border border-red-200 text-red-700 hover:bg-red-50 transition-colors"
                  title={`Remove "${p.label}"`}
                  aria-label={`Remove preset ${idx + 1}`}
                >
                  ✕
                </button>
              </div>
            );
          })}
        </div>
      </Card>

      <Card>
        <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#2D100F]/40">Tips</p>
        <ul className="mt-2 space-y-1 text-xs text-[#2D100F]/70 list-disc pl-5">
          <li>Weight is the <strong>empty box</strong> weight — Quick Ship lets admin override per shipment.</li>
          <li>Order matters: presets render top-to-bottom on the rate form. Drag the <span className="inline-block align-middle">⋮⋮</span> handle to reorder.</li>
          <li>To start over with the built-in Envelope / Small / Medium / Large, hit Reset.</li>
        </ul>
      </Card>
    </div>
  );
}

function NumField({ label, value, onChange, inputCls }: { label: string; value: number; onChange: (v: number) => void; inputCls: string }) {
  return (
    <div>
      <label className="block text-[9px] font-bold uppercase tracking-wider text-[#2D100F]/40 mb-1">{label}</label>
      <input
        type="number"
        min={0}
        step={0.1}
        className={inputCls}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
      />
    </div>
  );
}

/* ─── Recipient name autocomplete ────────────────────────────────────────── */
// Combobox-style autocomplete over `recipients` (recent ShippoLabel.toName +
// address). Shows when admin focuses the input or types ≥1 char.
// Picking a row fills name + street + city + state + zip in one shot.

function RecipientNameAutocomplete({
  value, recipients, inputCls, onChangeName, onPickRecipient,
}: {
  value: string;
  recipients: RecentRecipient[];
  inputCls: string;
  onChangeName: (v: string) => void;
  onPickRecipient: (r: RecentRecipient) => void;
}) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);

  const matches = useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = !q
      ? recipients.slice(0, 8)
      : recipients
          .filter((r) =>
            `${r.toName} ${r.toCity} ${r.toState} ${r.toZip} ${r.toStreet}`.toLowerCase().includes(q),
          )
          .slice(0, 8);
    return list;
  }, [recipients, value]);

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open || matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + matches.length) % matches.length);
    } else if (e.key === "Enter") {
      const pick = matches[activeIdx];
      if (pick) {
        e.preventDefault();
        onPickRecipient(pick);
        setOpen(false);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div className="relative">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-[#2D100F]/40 mb-1">
        Recipient Name
      </label>
      <input
        className={inputCls}
        value={value}
        onChange={(e) => { onChangeName(e.target.value); setOpen(true); setActiveIdx(0); }}
        onFocus={() => setOpen(true)}
        onBlur={() => { setTimeout(() => setOpen(false), 150); /* allow click */ }}
        onKeyDown={handleKey}
        placeholder="John Smith — start typing for saved addresses"
        autoComplete="off"
      />
      {open && matches.length > 0 && (
        <div
          className="absolute left-0 right-0 mt-1 rounded-xl bg-white border border-[#e8e5e0] z-20 max-h-72 overflow-auto"
          style={{ boxShadow: "0 12px 32px rgba(45,16,15,0.16)" }}
          role="listbox"
        >
          {matches.map((r, i) => {
            const active = i === activeIdx;
            return (
              <button
                key={`${r.toName}-${r.toZip}-${i}`}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => { onPickRecipient(r); setOpen(false); }}
                onMouseEnter={() => setActiveIdx(i)}
                className="w-full text-left px-3 py-2 text-xs flex items-start gap-2"
                style={{ background: active ? "rgba(51,116,133,0.10)" : "transparent" }}
                role="option"
                aria-selected={active}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-[9px] font-black"
                  style={{ background: active ? NOHO_BLUE : "rgba(45,16,15,0.06)", color: active ? "#fff" : "#2D100F" }}
                >
                  {(r.toName.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase()}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-bold text-[#2D100F] truncate">{r.toName}</span>
                  <span className="block text-[10.5px] text-[#2D100F]/55 truncate">
                    {r.toStreet} · {r.toCity}, {r.toState} {r.toZip}
                  </span>
                </span>
                {r.shipmentCount > 1 && (
                  <span
                    className="text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0"
                    style={{ background: "rgba(245,166,35,0.18)", color: "#92400e" }}
                    title={`Shipped to this recipient ${r.shipmentCount} times`}
                  >
                    ×{r.shipmentCount}
                  </span>
                )}
              </button>
            );
          })}
          <div className="px-3 py-1.5 text-[9.5px] text-[#2D100F]/45 border-t border-[#e8e5e0]">
            ↑↓ pick · Enter fill · Esc close
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── DIM weight hint ────────────────────────────────────────────────────── */
// UPS/FedEx domestic divisor = 139. DIM weight (lb) = (L × W × H) / 139.
// Carrier bills the GREATER of actual lb and DIM lb. So a 20×15×12 box at
// 1 lb actually bills as ~26 lb DIM — which doubles or triples the rate.
// Surface a soft alert when DIM > actual so admin re-checks the parcel.

const DIM_DIVISOR = 139;

function DimWeightHint({ lengthIn, widthIn, heightIn, weightOz }: { lengthIn: number; widthIn: number; heightIn: number; weightOz: number }) {
  if (lengthIn <= 0 || widthIn <= 0 || heightIn <= 0 || weightOz <= 0) return null;
  const actualLb = weightOz / 16;
  const dimLb = (lengthIn * widthIn * heightIn) / DIM_DIVISOR;
  const billable = Math.max(actualLb, dimLb);
  const dimDominant = dimLb > actualLb;
  const ratio = dimDominant && actualLb > 0 ? dimLb / actualLb : 1;
  const significant = dimDominant && (dimLb - actualLb) >= 0.5;

  return (
    <div
      className="mt-2 flex items-center gap-3 rounded-xl px-3 py-2 border text-[11px]"
      style={{
        background: significant ? "rgba(245,166,35,0.08)" : "rgba(51,116,133,0.05)",
        borderColor: significant ? "rgba(245,166,35,0.35)" : "rgba(51,116,133,0.20)",
      }}
      title="UPS/FedEx ground rates use whichever is greater of actual weight and DIM weight (L×W×H ÷ 139)."
    >
      <span
        className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
        style={{
          background: significant ? "rgba(245,166,35,0.20)" : "rgba(51,116,133,0.12)",
          color: significant ? "#92400e" : NOHO_BLUE_DEEP,
        }}
      >
        <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 6 H21 M3 18 H21 M7 10 V14 M12 10 V14 M17 10 V14" />
        </svg>
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-black text-[#2D100F]">
          {significant ? "DIM weight likely bills higher" : "DIM check"}{" "}
          <span className="text-[#2D100F]/55 font-normal">·</span>{" "}
          <span className="text-[#2D100F]" style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
            actual <strong>{actualLb.toFixed(2)} lb</strong> · DIM <strong>{dimLb.toFixed(2)} lb</strong>
          </span>
        </p>
        <p className="text-[#2D100F]/55 leading-snug">
          UPS / FedEx will bill the higher of the two ({billable.toFixed(2)} lb).{" "}
          {significant && (
            <span className="text-[#92400e] font-bold">DIM is {ratio.toFixed(1)}× actual — confirm box size.</span>
          )}
        </p>
      </div>
    </div>
  );
}

/* ─── Tiny shared bits ───────────────────────────────────────────────────── */

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-2xl bg-white border border-[#e8e5e0] p-5"
      style={{ boxShadow: "0 1px 2px rgba(45,16,15,0.04)" }}
    >
      {children}
    </div>
  );
}

function IconShip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 1 L17 5 L11 17 L8 11 L4 8 Z" />
    </svg>
  );
}
function IconBox({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round">
      <path d="M12 2 L21 6 L21 18 L12 22 L3 18 L3 6 Z" />
      <path d="M3 6 L12 10 L21 6" />
      <path d="M12 10 L12 22" />
    </svg>
  );
}
function IconRadar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <circle cx="11" cy="11" r="7.5" />
      <path d="M11 11 L17 5" />
      <path d="M16.5 16.5 L21.5 21.5" />
    </svg>
  );
}
function IconPlug({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 L9 9 M15 4 L15 9" />
      <path d="M5 9 L19 9 L19 13 A7 7 0 0 1 12 20 A7 7 0 0 1 5 13 Z" />
      <path d="M12 20 L12 23" />
    </svg>
  );
}
