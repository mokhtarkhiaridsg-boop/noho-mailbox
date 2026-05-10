"use client";

// iter-131 — Label printer, ONE always-editable form.
//
// Lookup is just an autofill enhancement — it NEVER blocks. Type a
// tracking #, the form auto-fills from the DB if there's a match,
// otherwise stays editable. No mode toggle, no error states, no
// "package not found" message. Print works for any tracking #.
//
// Keeps: 4×6 Jadens print CSS · Code 128 barcode · NOHO branding
// · driver-scannable bars · live preview at 85%.

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  findLabelByTracking,
  searchCustomersForLabel,
  type LabelData,
} from "@/app/actions/labelPrinter";
import { generateCode128 } from "@/lib/barcode128";

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";

const CARRIERS = ["UPS", "USPS", "FedEx", "DHL", "Amazon", "OnTrac", "Other"] as const;

// Carrier autodetect from tracking-number patterns.
function detectCarrier(t: string): string | null {
  const s = t.replace(/[\s-]/g, "").toUpperCase();
  if (!s) return null;
  if (/^1Z[0-9A-Z]{16}$/.test(s)) return "UPS";
  if (/^\d{12}$/.test(s) || /^\d{15}$/.test(s) || /^\d{20}$/.test(s)) return "FedEx";
  if (/^(94|93|92|95|82)\d{18,20}$/.test(s) || /^[A-Z]{2}\d{9}US$/.test(s)) return "USPS";
  if (/^\d{10}$/.test(s)) return "DHL";
  if (/^TBA\d{12}/.test(s)) return "Amazon";
  return null;
}

function sanitizeTrackingForBarcode(raw: string): { clean: string; hadIssues: boolean } {
  const stripped = raw.replace(/\s+/g, "").toUpperCase();
  let hadIssues = false;
  let clean = "";
  for (const ch of stripped) {
    const code = ch.charCodeAt(0);
    if (code >= 32 && code <= 127) clean += ch;
    else hadIssues = true;
  }
  return { clean, hadIssues };
}

type FormState = {
  trackingNumber: string;
  carrier: string;
  recipientName: string;
  customerName: string;
  customerEmail: string;
  suiteNumber: string;
  weightOz: string;
  dimensions: string;
};

const BLANK: FormState = {
  trackingNumber: "",
  carrier: "",
  recipientName: "",
  customerName: "",
  customerEmail: "",
  suiteNumber: "",
  weightOz: "",
  dimensions: "",
};

type LookupStatus = "idle" | "loading" | "matched" | "manual";

// iter-136 — minimal online-tracking snapshot kept in panel state so the
// status pill + history strip stay rendered after the lookup finishes.
type OnlineSnapshot = {
  carrier: string;
  status: string | null;
  substatus: string | null;
  location: string | null;
  etaIso: string | null;
  history: Array<{ dateIso: string; status: string; location: string }>;
  source: "shippo" | "carrier-detect" | "none";
  fetchedAtIso: string;
  matchedDbRow: boolean;
};

export default function AdminLabelPrinterPanel() {
  const [form, setForm] = useState<FormState>(BLANK);
  const [dirty, setDirty] = useState<Set<keyof FormState>>(new Set());
  const [lookupStatus, setLookupStatus] = useState<LookupStatus>("idle");
  const [lookupPending, startLookup] = useTransition();
  const [custSearchQ, setCustSearchQ] = useState("");
  const [custResults, setCustResults] = useState<Array<{ id: string; name: string; email: string; suiteNumber: string | null }>>([]);
  const [online, setOnline] = useState<OnlineSnapshot | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastReqId = useRef(0);
  const matchedFadeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mark a field dirty + write its new value.
  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setDirty((d) => {
      const next = new Set(d); next.add(key); return next;
    });
  }

  // Apply autofill — only writes keys NOT in dirty set so admin edits stick.
  function applyAutofill(patch: Partial<FormState>, dirtySnapshot: Set<keyof FormState>) {
    setForm((f) => {
      const next: FormState = { ...f };
      for (const [k, v] of Object.entries(patch) as [keyof FormState, string | undefined][]) {
        if (v === undefined || v === "") continue;
        if (dirtySnapshot.has(k)) continue;
        next[k] = v;
      }
      return next;
    });
  }

  // Debounced lookup-as-you-type. Skip if <6 chars; only autofill non-dirty fields.
  useEffect(() => {
    const tracking = form.trackingNumber.trim();
    // Always update carrier autodetect for non-dirty carrier (lightweight, sync).
    if (!dirty.has("carrier")) {
      const guess = detectCarrier(tracking);
      if (guess && form.carrier !== guess) {
        setForm((f) => ({ ...f, carrier: guess }));
      }
    }
    if (tracking.length < 6) {
      setLookupStatus("idle");
      setOnline(null);
      return;
    }
    const reqId = ++lastReqId.current;
    setLookupStatus("loading");
    const timer = setTimeout(() => {
      startLookup(async () => {
        try {
          // iter-136 — primary lookup is now ONLINE via the carrier API
          // (Shippo). The DB is only consulted to overlay our intake
          // metadata when the package is one of ours.
          const res = await findLabelByTracking({ tracking });
          if (reqId !== lastReqId.current) return;
          if (res.found && res.label) {
            applyAutofill({
              trackingNumber: res.label.trackingNumber,
              carrier: res.label.carrier ?? "",
              recipientName: res.label.recipientName ?? res.label.customerName,
              customerName: res.label.customerName,
              customerEmail: res.label.customerEmail,
              suiteNumber: res.label.suiteNumber ?? "",
              weightOz: res.label.weightOz != null ? String(res.label.weightOz) : "",
              dimensions: res.label.dimensions ?? "",
            }, dirty);
            // Capture the online snapshot so the status pill + history
            // chips stay visible. matchedDbRow distinguishes "we have
            // intake metadata" from "we only know what the carrier says".
            if (res.label.online) {
              setOnline({
                carrier: res.label.online.carrier,
                status: res.label.online.status,
                substatus: res.label.online.substatus,
                location: res.label.online.location,
                etaIso: res.label.online.etaIso,
                history: res.label.online.history,
                source: res.label.online.source,
                fetchedAtIso: res.label.online.fetchedAtIso,
                matchedDbRow: res.label.source === "db+online",
              });
            } else {
              setOnline(null);
            }
            setLookupStatus("matched");
            if (matchedFadeTimer.current) clearTimeout(matchedFadeTimer.current);
            matchedFadeTimer.current = setTimeout(() => setLookupStatus("manual"), 2500);
          } else {
            setOnline(null);
            setLookupStatus("manual");
          }
        } catch {
          if (reqId !== lastReqId.current) return;
          setOnline(null);
          setLookupStatus("manual");
        }
      });
    }, 300);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.trackingNumber]);

  // Customer search (debounced).
  useEffect(() => {
    if (custSearchQ.trim().length < 2) { setCustResults([]); return; }
    const t = setTimeout(() => {
      void searchCustomersForLabel({ query: custSearchQ }).then(setCustResults).catch(() => setCustResults([]));
    }, 200);
    return () => clearTimeout(t);
  }, [custSearchQ]);

  function pickCustomer(c: { id: string; name: string; email: string; suiteNumber: string | null }) {
    applyAutofill({
      customerName: c.name,
      customerEmail: c.email,
      suiteNumber: c.suiteNumber ?? "",
    }, dirty);
    // Customer-search override is intentional — these become "dirty" so a
    // later DB lookup won't clobber the admin's chosen customer.
    setDirty((d) => {
      const next = new Set(d);
      next.add("customerName"); next.add("customerEmail"); next.add("suiteNumber");
      return next;
    });
    setCustSearchQ(""); setCustResults([]);
  }

  function reset() {
    if (matchedFadeTimer.current) clearTimeout(matchedFadeTimer.current);
    setForm(BLANK); setDirty(new Set()); setLookupStatus("idle");
    setCustSearchQ(""); setCustResults([]); setOnline(null);
    inputRef.current?.focus();
  }

  function print() { if (typeof window !== "undefined") window.print(); }

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => () => {
    if (matchedFadeTimer.current) clearTimeout(matchedFadeTimer.current);
  }, []);

  // Build the live LabelData for the preview + print payload.
  // iter-141 — Recipient is no longer required to print. Carrier APIs
  // do NOT expose label-side recipient/sender details (privacy), so a
  // tracking-only lookup MUST still be printable. The label preview
  // shows "(verify recipient at counter)" when both fields are blank;
  // admin can type the name from the envelope at any time and reprint.
  const labelData: LabelData | null = useMemo(() => {
    const cleaned = sanitizeTrackingForBarcode(form.trackingNumber);
    if (!cleaned.clean || cleaned.clean.length < 4) return null;
    const recipient = form.recipientName.trim() || form.customerName.trim();
    const weight = form.weightOz.trim() ? parseFloat(form.weightOz) : null;
    return {
      mailItemId: null,
      trackingNumber: cleaned.clean,
      carrier: form.carrier.trim() || null,
      customerName: form.customerName.trim() || recipient || "",
      customerEmail: form.customerEmail.trim(),
      suiteNumber: form.suiteNumber.trim() || null,
      recipientName: form.recipientName.trim() || null,
      intakeDate: new Date().toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }),
      intakeAtIso: new Date().toISOString(),
      weightOz: Number.isFinite(weight) ? weight : null,
      dimensions: form.dimensions.trim() || null,
      exteriorImageUrl: null,
      labelNumber: cleaned.clean.slice(-6).toUpperCase(),
      // iter-136 — source reflects how this label is being assembled.
      // "online" when carrier API returned data, "db+online" when we
      // also have intake metadata, "manual" when admin typed everything.
      source: online
        ? online.matchedDbRow
          ? "db+online"
          : "online"
        : "manual",
      online: online,
    };
  }, [form, online]);

  const trackingHadEncodingIssue = useMemo(() => {
    if (!form.trackingNumber.trim()) return false;
    return sanitizeTrackingForBarcode(form.trackingNumber).hadIssues;
  }, [form.trackingNumber]);

  const canPrint = !!labelData;

  return (
    <div className="space-y-4">
      <style jsx global>{`
        /* iter-165 — Print-only wrapper. Hidden on screen via display:none
           (no off-screen positioning trick — that broke print because an
           absolute-positioned inner uses the nearest positioned ancestor
           as its origin, not the page). In print mode we display:block
           the wrapper and pin the label to the page corner with
           position:fixed (fixed always anchors to the viewport / page
           box, ignoring ancestor offsets). */
        .label-print-only { display: none; }
        @media print {
          @page { size: 4in 6in; margin: 0; }
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          body * { visibility: hidden !important; }
          .label-print-only { display: block !important; }
          .label-print-area, .label-print-area * { visibility: visible !important; }
          .label-print-area {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 4in !important;
            height: 6in !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: none !important;
            /* iter-149 — clip any overshoot at the page boundary so a
               stray 1px never produces a blank second page. */
            overflow: hidden !important;
            box-sizing: border-box !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-after: avoid-page !important;
            break-inside: avoid-page !important;
          }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="no-print">
        <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: `${NOHO_BLUE}B0` }}>
          <span className="inline-block w-1.5 h-1.5 rounded-full mr-2 align-middle" style={{ background: NOHO_BLUE, boxShadow: `0 0 6px ${NOHO_BLUE}` }} />
          Operations · Label printer
        </p>
        <h2 className="text-xl font-black tracking-tight" style={{ color: NOHO_INK }}>Thermal label printer</h2>
        <p className="text-[11px] mt-0.5" style={{ color: "rgba(0,0,0,0.55)" }}>
          Type or scan any tracking #. We hit the carrier&apos;s tracking API live (USPS / UPS / FedEx / DHL) and overlay our intake data when the package is one of ours. Code 128 barcode scannable by every driver. Prints 4×6 on Jadens.
        </p>
      </div>

      <div className="no-print rounded-2xl bg-white border p-4 space-y-3" style={{ borderColor: "#e8e5e0" }}>
        {/* Tracking row with status pill */}
        <div>
          <div className="flex items-center justify-between gap-2">
            <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(0,0,0,0.55)" }}>
              Tracking number
            </label>
            <StatusPill status={lookupStatus} pending={lookupPending} />
          </div>
          <input ref={inputRef} type="text" value={form.trackingNumber}
            onChange={(e) => setField("trackingNumber", e.target.value)}
            placeholder="Scan or paste · works for ANY tracking #"
            autoComplete="off" spellCheck={false}
            className="mt-1 w-full rounded-xl border px-4 py-3 text-lg font-mono"
            style={{
              borderColor: lookupStatus === "matched" ? "#16a34a" : "#e8e5e0",
              background: "white", color: NOHO_INK,
              transition: "border-color 0.3s ease",
            }} />
          {trackingHadEncodingIssue && (
            <p className="mt-1.5 text-[10.5px]" style={{ color: "#92400e" }}>
              ⚠️ Some characters won't encode in Code 128B (drivers' scanners would skip them). The barcode uses only the printable ASCII chars.
            </p>
          )}
          {/* iter-136 — Live carrier-tracking pane. Renders when an
              online lookup returned anything (status, location, ETA,
              recent scan history). Source = "shippo" for live carrier
              data, "carrier-detect" for pattern-only fallback, "none"
              when neither apply. */}
          {online && <OnlineTrackingPane online={online} />}
        </div>

        {/* Carrier chips */}
        <Field label="Carrier">
          <div className="flex flex-wrap gap-1">
            {CARRIERS.map((c) => {
              const active = form.carrier === c;
              return (
                <button key={c} type="button" onClick={() => setField("carrier", c)}
                  className="px-2.5 py-1 rounded-md text-[10.5px] font-bold"
                  style={{
                    background: active ? NOHO_BLUE : "white",
                    color: active ? "white" : NOHO_INK,
                    border: `1px solid ${active ? NOHO_BLUE : "#e8e5e0"}`,
                  }}>
                  {c}
                </button>
              );
            })}
          </div>
        </Field>

        {/* Customer linker */}
        <Field label="Link to existing customer (optional)">
          <input value={custSearchQ} onChange={(e) => setCustSearchQ(e.target.value)}
            placeholder="Search by name, email, or suite"
            className="w-full rounded-md border px-3 py-2 text-sm"
            style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
          {custResults.length > 0 && (
            <ul className="mt-1 rounded-md border divide-y" style={{ borderColor: "#e8e5e0" }}>
              {custResults.map((r) => (
                <li key={r.id}>
                  <button type="button" onClick={() => pickCustomer(r)}
                    className="w-full text-left px-3 py-2 hover:bg-[#fafaf7]">
                    <p className="text-[12.5px] font-black" style={{ color: NOHO_INK }}>
                      {r.name} {r.suiteNumber && <span className="ml-1 text-[10px] font-mono opacity-70">#{r.suiteNumber}</span>}
                    </p>
                    <p className="text-[10.5px]" style={{ color: "rgba(0,0,0,0.55)" }}>{r.email}</p>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Field>

        {/* Recipient block */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Field label="Recipient name (line 1) *">
            <input value={form.recipientName}
              onChange={(e) => setField("recipientName", e.target.value)}
              placeholder="John Doe"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
          </Field>
          <Field label="Customer name (c/o · if different)">
            <input value={form.customerName}
              onChange={(e) => setField("customerName", e.target.value)}
              placeholder="Acme LLC"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
          </Field>
          <Field label="Suite #">
            <input value={form.suiteNumber}
              onChange={(e) => setField("suiteNumber", e.target.value)}
              placeholder="042"
              className="w-full rounded-md border px-3 py-2 text-sm font-mono"
              style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
          </Field>
          <Field label="Customer email">
            <input value={form.customerEmail}
              onChange={(e) => setField("customerEmail", e.target.value)}
              placeholder="customer@example.com"
              className="w-full rounded-md border px-3 py-2 text-sm"
              style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
          </Field>
          <Field label="Weight (oz)">
            <input value={form.weightOz} type="number" min={0} step={0.1}
              onChange={(e) => setField("weightOz", e.target.value)}
              placeholder="32"
              className="w-full rounded-md border px-3 py-2 text-sm font-mono"
              style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
          </Field>
          <Field label="Dimensions (LxWxH)">
            <input value={form.dimensions}
              onChange={(e) => setField("dimensions", e.target.value)}
              placeholder="12x8x4 in"
              className="w-full rounded-md border px-3 py-2 text-sm font-mono"
              style={{ borderColor: "#e8e5e0", background: "white", color: NOHO_INK }} />
          </Field>
        </div>

        {/* Action bar */}
        <div className="flex items-center justify-between gap-2 pt-1 border-t" style={{ borderColor: "#e8e5e0" }}>
          <button type="button" onClick={reset}
            className="px-3 py-2 rounded-md text-[11px] font-bold border"
            style={{ borderColor: "#e8e5e0", color: NOHO_INK, background: "white" }}>
            Reset
          </button>
          <div className="flex items-center gap-2">
            {canPrint && (
              <p className="text-[10.5px] inline-flex items-center gap-1 font-bold"
                style={{ color: "#15803d" }}>
                <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 8, background: "#16a34a", boxShadow: "0 0 6px rgba(22,163,74,0.7)" }} />
                Driver-scannable Code 128 ready
              </p>
            )}
            <button type="button" onClick={print} disabled={!canPrint}
              className="px-5 py-2.5 rounded-xl text-white font-black text-[13px] disabled:opacity-50"
              style={{ background: "linear-gradient(135deg,#16A34A,#15803d)" }}>
              🖨 Print 4×6 label
            </button>
          </div>
        </div>
        {!canPrint && (
          <p className="text-[10.5px]" style={{ color: "rgba(0,0,0,0.55)" }}>
            Type or scan a <strong>tracking number</strong> (≥4 chars) to enable printing. Recipient name is optional — the label prints with “(verify recipient at counter)” if blank.
          </p>
        )}
      </div>

      {/* Live preview */}
      {labelData && (
        <>
          <div className="no-print">
            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "rgba(0,0,0,0.55)" }}>
              Live preview · 4 × 6 inches @ 85%
            </p>
            <div style={{ overflow: "auto" }}>
              <div style={{ transform: "scale(0.85)", transformOrigin: "top left", width: "fit-content" }}>
                <ShippingLabel data={labelData} />
              </div>
            </div>
          </div>

          {/* iter-165 — Hidden via display:none on screen, displayed +
              position:fixed to page corner in print. NO off-screen
              transform / left:-9999 (that broke print because an
              absolute-positioned inner used the wrapper's offset as
              origin, painting outside the page). */}
          <div className="label-print-only">
            <ShippingLabel data={labelData} className="label-print-area" />
          </div>
        </>
      )}
    </div>
  );
}

// ─── Status pill ─────────────────────────────────────────────────────────
function StatusPill({ status, pending }: { status: LookupStatus; pending: boolean }) {
  if (status === "idle") return null;
  if (status === "loading" || pending) {
    return (
      <span className="text-[10.5px] font-bold inline-flex items-center gap-1" style={{ color: NOHO_BLUE_DEEP }}>
        <span style={{ display: "inline-block", width: 6, height: 6, borderRadius: 6, background: NOHO_BLUE, animation: "noho-pulse 1s ease-in-out infinite" }} />
        Searching online…
        <style jsx>{`@keyframes noho-pulse { 0%,100% { opacity: 0.4 } 50% { opacity: 1 } }`}</style>
      </span>
    );
  }
  if (status === "matched") {
    return (
      <span className="text-[10.5px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
        style={{ background: NOHO_BLUE, color: "white" }}>
        ✓ Live carrier data
      </span>
    );
  }
  // manual
  return (
    <span className="text-[10.5px] font-bold inline-flex items-center gap-1" style={{ color: "rgba(0,0,0,0.55)" }}>
      ✏️ Manual entry
    </span>
  );
}

// iter-136 — Live online-tracking pane. Surfaces what the carrier API
// said about the package: top-level status + location + ETA + a tight
// 4-row scan history. When source === "carrier-detect" we only know
// the carrier (no live status — Shippo not configured), so we render a
// quieter "carrier auto-detected" chip instead.
function OnlineTrackingPane({ online }: {
  online: {
    carrier: string;
    status: string | null;
    substatus: string | null;
    location: string | null;
    etaIso: string | null;
    history: Array<{ dateIso: string; status: string; location: string }>;
    source: "shippo" | "carrier-detect" | "none";
    fetchedAtIso: string;
    matchedDbRow: boolean;
  };
}) {
  const STATUS_TONE: Record<string, { bg: string; fg: string; label: string }> = {
    PRE_TRANSIT: { bg: "rgba(0,0,0,0.06)",   fg: "rgba(0,0,0,0.55)", label: "Label created" },
    TRANSIT:     { bg: "rgba(51,116,133,0.10)", fg: "#23596A",             label: "In transit" },
    DELIVERED:   { bg: "rgba(22,163,74,0.12)",  fg: "#15803d",             label: "Delivered" },
    RETURNED:    { bg: "rgba(231,0,19,0.08)",   fg: "#991b1b",             label: "Returned" },
    FAILURE:     { bg: "rgba(231,0,19,0.12)",   fg: "#991b1b",             label: "Exception" },
    UNKNOWN:     { bg: "rgba(0,0,0,0.05)",   fg: "rgba(0,0,0,0.55)", label: "Unknown" },
  };

  if (online.source === "none") return null;
  if (online.source === "carrier-detect") {
    return (
      <div className="mt-2 rounded-lg border px-3 py-2 text-[10.5px] flex items-center gap-2" style={{ borderColor: "#e8e5e0", background: "#fafaf7" }}>
        <span className="font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: NOHO_BLUE, color: "white" }}>
          {online.carrier}
        </span>
        <span style={{ color: "rgba(0,0,0,0.55)" }}>
          Carrier auto-detected · live tracking unavailable for this carrier
        </span>
      </div>
    );
  }

  const tone = STATUS_TONE[online.status ?? "UNKNOWN"] ?? STATUS_TONE.UNKNOWN!;
  const eta = online.etaIso ? new Date(online.etaIso) : null;
  const fetched = new Date(online.fetchedAtIso);

  return (
    <div className="mt-2 rounded-lg border" style={{ borderColor: "#e8e5e0", background: "#fafaf7", overflow: "hidden" }}>
      {/* Top row — carrier + status + ETA + db-overlay flag */}
      <div className="px-3 py-2 flex items-center gap-2 flex-wrap" style={{ borderBottom: online.history.length > 0 ? "1px solid #e8e5e0" : "none" }}>
        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: NOHO_BLUE, color: "white" }}>
          {online.carrier}
        </span>
        <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: tone.bg, color: tone.fg }}>
          {tone.label}
        </span>
        {online.location && (
          <span className="text-[10.5px] font-semibold" style={{ color: "rgba(0,0,0,0.65)" }}>
            · {online.location}
          </span>
        )}
        {eta && (
          <span className="text-[10.5px] font-semibold" style={{ color: NOHO_BLUE_DEEP }}>
            · ETA {eta.toLocaleDateString("en-US", { month: "short", day: "numeric" })}
          </span>
        )}
        {online.matchedDbRow && (
          <span className="ml-auto text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded" style={{ background: "rgba(22,163,74,0.10)", color: "#15803d" }}>
            ✓ matches our intake
          </span>
        )}
      </div>
      {/* Recent scan history — last 4 rows from the carrier */}
      {online.history.length > 0 && (
        <ul className="px-3 py-2 space-y-1">
          {online.history.slice(0, 4).map((h, i) => {
            const d = h.dateIso ? new Date(h.dateIso) : null;
            return (
              <li key={i} className="text-[10.5px] flex items-baseline gap-2" style={{ color: "rgba(0,0,0,0.65)" }}>
                <span className="font-mono shrink-0" style={{ color: "rgba(0,0,0,0.45)" }}>
                  {d ? d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : "—"}
                </span>
                <span className="flex-1 truncate font-semibold" style={{ color: NOHO_INK }}>{h.status}</span>
                {h.location && <span className="shrink-0">{h.location}</span>}
              </li>
            );
          })}
          <li className="text-[9.5px] pt-1" style={{ color: "rgba(0,0,0,0.40)" }}>
            Live from {online.source === "shippo" ? "Shippo" : "carrier"} · fetched {fetched.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
          </li>
        </ul>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-black uppercase tracking-wider" style={{ color: "rgba(0,0,0,0.55)" }}>{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

// ─── iter-146 — USPS-style shipping label, NOHO-branded ─────────────────
//
// Mirrors the Shippo USPS Ground Advantage label (the carrier industry-
// standard layout) so it scans with every driver, every depot, every
// regional hub. Replaces Shippo's branding with ours:
//
//   ┌────────────────────────────────────┐
//   │ [NOHO LOGO]      [Service-class]   │  Header (0.95in)
//   │                  NOHO POSTAGE PAID │
//   ├────────────────────────────────────┤
//   │     CARRIER · SERVICE LEVEL        │  Service banner (0.45in)
//   ├────────────────────────────────────┤
//   │ NOHO MAILBOX (sender)  Ship Date   │  From + meta (0.85in)
//   │ 5062 Lankershim …      Weight      │
//   │ NOHO CA 91601-4225     STE# / RDC  │
//   ├────────────────────────────────────┤
//   │                                    │  TO block (1.85in)
//   │ [DM]    RECIPIENT NAME             │
//   │         RECIPIENT NAME (line 2)    │
//   │         ADDRESS LINE 1             │
//   │         CITY ST ZIP                │
//   │                                    │
//   ├────────────────────────────────────┤
//   │     CARRIER TRACKING #             │  Tracking band (1.40in)
//   │  ▌▌█▌█▌▌█▌█▌▌█▌▌█▌█▌▌█▌█▌▌█▌█      │
//   │     9334 6208 4550 0002 4952 83    │
//   ├────────────────────────────────────┤
//   │ [LOGO] NOHO Mailbox · nohomailbox  │  Marketing footer (0.50in)
//   │  "Real street address · scan/fwd"  │
//   └────────────────────────────────────┘
//
// Side accent strips (NOHO blue 0.04in) sit on the FAR left/right
// edges — center stays pure white per USPS scannability rules.
function ShippingLabel({ data, className }: { data: LabelData; className?: string }) {
  const barcodeSvg = useMemo(() => {
    const raw = generateCode128(data.trackingNumber, {
      height: 96, moduleWidth: 3, showText: false, margin: 18,
      foreground: "#000", background: "transparent",
    });
    return raw
      .replace(/<svg /, '<svg preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;display:block;" ')
      .replace(/\swidth="\d+"\s/, " ")
      .replace(/\sheight="\d+"\s/, " ");
  }, [data.trackingNumber]);

  const weightDisplay = data.weightOz == null ? null : (() => {
    const lb = Math.floor(data.weightOz! / 16);
    const oz = Math.round(data.weightOz! - lb * 16);
    return lb > 0 ? `${lb} lb${oz > 0 ? ` ${oz} oz` : ""}` : `${oz} oz`;
  })();

  // Service-class label (carrier + Ground Advantage / Priority / etc).
  // Defaults to a generic "STANDARD" when admin hasn't typed a carrier.
  const carrier = (data.carrier ?? "STANDARD").toUpperCase();
  const serviceLabel = carrier === "USPS"
    ? "USPS GROUND ADVANTAGE"
    : carrier === "UPS"  ? "UPS GROUND"
    : carrier === "FEDEX" ? "FEDEX HOME DELIVERY"
    : carrier === "DHL"   ? "DHL EXPRESS"
    : `${carrier} STANDARD`;

  return (
    <div className={className} style={{
      width: "4in", height: "6in", background: "white", color: NOHO_INK,
      boxSizing: "border-box",
      fontFamily: "'Helvetica Neue', Inter, Arial, sans-serif",
      display: "flex", flexDirection: "row",
      border: `1.5pt solid ${NOHO_INK}`,
      boxShadow: "0 4px 18px rgba(0,0,0,0.10)",
      position: "relative",
    }}>
      {/* Brand accent strip (left) — narrow vertical band, never touches
          the scanner zones. Cream + blue stripe so the label is
          unmistakably NOHO from across a room. */}
      <div style={{
        width: "0.06in", flexShrink: 0,
        background: `linear-gradient(180deg, ${NOHO_BLUE} 0%, ${NOHO_BLUE} 50%, ${NOHO_CREAM} 50%, ${NOHO_CREAM} 100%)`,
      }} />

      {/* Main label content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* ─── Header ──────────────────────────────────────────────
            USPS prints a giant service-class letter top-left. We use
            the NOHO logo box in the same anchor position — same visual
            weight, ours instead of theirs.
            iter-149 — heights trimmed: 0.95 → 0.80in. */}
        <header style={{
          height: "0.80in",
          display: "grid",
          gridTemplateColumns: "1.00in 1fr",
          flexShrink: 0,
          background: "white",
          borderBottom: `1pt solid ${NOHO_INK}`,
        }}>
          <div style={{
            background: NOHO_INK,
            borderRight: `1pt solid ${NOHO_INK}`,
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "0.05in",
          }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/logo-trans.png" alt="NOHO Mailbox"
              style={{
                height: "0.66in", width: "auto", maxWidth: "100%",
                objectFit: "contain",
                filter: "brightness(0) invert(1)",
              }} />
          </div>
          <div style={{
            padding: "0.06in 0.12in",
            display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.012in",
          }}>
            <p style={{
              margin: 0, fontSize: "0.095in", fontWeight: 900,
              letterSpacing: "0.06em", textTransform: "uppercase", color: NOHO_INK,
              lineHeight: 1.15,
            }}>{serviceLabel}</p>
            <p style={{ margin: 0, fontSize: "0.080in", fontWeight: 800, color: NOHO_INK, lineHeight: 1.2 }}>U.S. POSTAGE PAID</p>
            <p style={{ margin: 0, fontSize: "0.080in", fontWeight: 800, color: NOHO_BLUE_DEEP, lineHeight: 1.2 }}>NOHO Mailbox</p>
            <p style={{ margin: 0, fontSize: "0.072in", fontWeight: 700, color: NOHO_INK, fontFamily: "ui-monospace, monospace", lineHeight: 1.2 }}>
              {carrier === "USPS" ? "USPS Ship" : carrier === "UPS" ? "UPS Ship" : "Carrier Ship"}
            </p>
          </div>
        </header>

        {/* ─── Service banner ──────────────────────────────────────
            iter-149 — height trimmed: 0.45 → 0.36in. */}
        <section style={{
          height: "0.36in",
          background: "white",
          borderBottom: `1.5pt solid ${NOHO_INK}`,
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0,
        }}>
          <span style={{
            fontSize: "0.18in", fontWeight: 900,
            letterSpacing: "0.01em", textTransform: "uppercase",
            color: NOHO_INK,
          }}>{serviceLabel}</span>
        </section>

        {/* ─── From + ship meta ───────────────────────────────────── */}
        <section style={{
          height: "0.78in", background: "white",
          borderBottom: `1pt solid ${NOHO_INK}`,
          display: "grid", gridTemplateColumns: "1.6fr 1fr",
          flexShrink: 0,
        }}>
          <div style={{ padding: "0.08in 0.12in", display: "flex", flexDirection: "column", justifyContent: "center", gap: "0.015in" }}>
            <p style={{ margin: 0, fontSize: "0.105in", fontWeight: 700, color: NOHO_INK, textTransform: "uppercase" }}>NOHO MAILBOX</p>
            {data.suiteNumber && (
              <p style={{ margin: 0, fontSize: "0.10in", fontWeight: 700, color: NOHO_INK, textTransform: "uppercase" }}>STE #{data.suiteNumber}</p>
            )}
            <p style={{ margin: 0, fontSize: "0.10in", fontWeight: 600, color: NOHO_INK, textTransform: "uppercase" }}>5062 LANKERSHIM BLVD</p>
            <p style={{ margin: 0, fontSize: "0.10in", fontWeight: 600, color: NOHO_INK, textTransform: "uppercase" }}>NORTH HOLLYWOOD CA 91601-4225</p>
          </div>
          <div style={{ padding: "0.08in 0.12in", display: "flex", flexDirection: "column", justifyContent: "flex-start", alignItems: "flex-end", gap: "0.015in" }}>
            <p style={{ margin: 0, fontSize: "0.085in", fontWeight: 600, color: NOHO_INK }}>Ship Date: {data.intakeDate}</p>
            {weightDisplay && (
              <p style={{ margin: 0, fontSize: "0.085in", fontWeight: 600, color: NOHO_INK }}>Weight: {weightDisplay}</p>
            )}
            <p style={{ margin: "0.06in 0 0", fontSize: "0.16in", fontWeight: 900, color: NOHO_INK, fontFamily: "ui-monospace, monospace" }}>
              REF {data.labelNumber}
            </p>
          </div>
        </section>

        {/* ─── TO block — DOMINANT (1.75in) ───────────────────────
            iter-149 — height trimmed: 1.85 → 1.75in. */}
        <section style={{
          height: "1.75in", background: "white",
          borderBottom: `1.5pt solid ${NOHO_INK}`,
          padding: "0.18in 0.16in",
          display: "grid", gridTemplateColumns: "0.60in 1fr",
          gap: "0.12in",
          flexShrink: 0,
        }}>
          {/* Compact data-matrix style placeholder. Real DM payload
              would be a separate barcode lib; we render a subtle
              square so the visual weight matches the carrier label.
              Drivers route via the Code 128 below regardless. */}
          <div style={{
            width: "0.60in", height: "0.60in",
            background: `repeating-linear-gradient(90deg, ${NOHO_INK} 0, ${NOHO_INK} 1.5pt, white 1.5pt, white 3pt), repeating-linear-gradient(0deg, ${NOHO_INK} 0, ${NOHO_INK} 1.5pt, white 1.5pt, white 3pt)`,
            backgroundBlendMode: "multiply",
            border: `1pt solid ${NOHO_INK}`,
            alignSelf: "start",
          }} aria-hidden="true" />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.04in", minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: "0.20in", fontWeight: 900, lineHeight: 1.1,
              color: data.recipientName || data.customerName ? NOHO_INK : "#888",
              textTransform: "uppercase", letterSpacing: "-0.005em",
              wordBreak: "break-word",
            }}>
              {(data.recipientName || data.customerName || "(verify recipient at counter)").toUpperCase()}
            </p>
            {data.customerName && data.recipientName && data.customerName !== data.recipientName && (
              <p style={{
                margin: 0, fontSize: "0.16in", fontWeight: 800, lineHeight: 1.1,
                color: NOHO_INK, textTransform: "uppercase",
              }}>
                {data.customerName.toUpperCase()}
              </p>
            )}
            {data.dimensions && (
              <p style={{ margin: "0.04in 0 0", fontSize: "0.10in", fontWeight: 600, color: NOHO_INK }}>{data.dimensions}</p>
            )}
            {data.customerEmail && (
              <p style={{
                margin: "auto 0 0", fontSize: "0.085in", fontWeight: 500,
                fontFamily: "ui-monospace, monospace",
                color: NOHO_BLUE_DEEP,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>{data.customerEmail}</p>
            )}
          </div>
        </section>

        {/* ─── Tracking band ──────────────────────────────────────
            Pure-white background, big Code 128 barcode, human-
            readable tracking number above and below — exactly
            matches the Shippo / USPS scan zone.
            iter-149 — min-height trimmed: 1.40 → 1.25in. The flex:1
            container absorbs whatever vertical room is left after the
            other fixed sections. */}
        <section style={{
          flex: 1, minHeight: "1.25in",
          background: "white",
          borderBottom: `1pt solid ${NOHO_INK}`,
          padding: "0.06in 0.15in 0.04in",
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        }}>
          <p style={{
            margin: 0, fontSize: "0.10in", fontWeight: 800,
            letterSpacing: "0.04in", textTransform: "uppercase", color: NOHO_INK,
          }}>{carrier} TRACKING #</p>
          <div
            style={{ width: "3.5in", maxWidth: "3.5in", margin: "0.06in 0 0.04in", display: "flex", justifyContent: "center", overflow: "hidden" }}
            dangerouslySetInnerHTML={{ __html: barcodeSvg }}
          />
          <p style={{
            margin: 0, fontSize: "0.135in", fontWeight: 800,
            fontFamily: "ui-monospace, 'IBM Plex Mono', monospace",
            letterSpacing: "0.04in", color: NOHO_INK, textAlign: "center",
          }}>{data.trackingNumber.replace(/(.{4})/g, "$1 ").trim()}</p>
        </section>

        {/* ─── Marketing footer ───────────────────────────────────
            Where Shippo had its logo + wordmark, we put OUR brand:
            logo + tagline + URL + phone. This is the marketing
            surface a recipient sees every time they pick up a
            package. Makes the bureau look polished + drives
            referrals from neighbors who recognize the address. */}
        {/* iter-149 — height trimmed: 0.55 → 0.46in. */}
        <footer style={{
          height: "0.46in", background: NOHO_INK, color: NOHO_CREAM,
          padding: "0.05in 0.12in",
          display: "grid", gridTemplateColumns: "auto 1fr auto", gap: "0.08in",
          alignItems: "center", flexShrink: 0,
        }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-trans.png" alt="NOHO"
            style={{ height: "0.30in", width: "auto", filter: "brightness(0) invert(1)" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "0.01in", minWidth: 0 }}>
            <p style={{
              margin: 0, fontSize: "0.10in", fontWeight: 900,
              letterSpacing: "0.02in", textTransform: "uppercase", color: NOHO_CREAM,
            }}>NOHO MAILBOX</p>
            <p style={{
              margin: 0, fontSize: "0.075in", fontWeight: 600,
              color: NOHO_CREAM, opacity: 0.92, lineHeight: 1.3,
            }}>
              Real street address · package handling · mail forwarding
            </p>
            <p style={{
              margin: 0, fontSize: "0.075in", fontWeight: 700,
              color: NOHO_CREAM, fontFamily: "ui-monospace, monospace",
            }}>
              nohomailbox.org · (818) 506-7744
            </p>
          </div>
          <div style={{
            padding: "0.04in 0.08in",
            background: NOHO_CREAM, color: NOHO_INK,
            fontSize: "0.07in", fontWeight: 800, letterSpacing: "0.04in",
            textTransform: "uppercase", textAlign: "center",
            borderRadius: "0.04in", whiteSpace: "nowrap",
          }}>
            Retain<br/>Until<br/>Pickup
          </div>
        </footer>
      </div>

      {/* Brand accent strip (right) — mirrors left edge. */}
      <div style={{
        width: "0.06in", flexShrink: 0,
        background: `linear-gradient(180deg, ${NOHO_CREAM} 0%, ${NOHO_CREAM} 50%, ${NOHO_BLUE} 50%, ${NOHO_BLUE} 100%)`,
      }} />
    </div>
  );
}

// iter-146 — Cell helper retired with the old 7-zone layout. Removed.
