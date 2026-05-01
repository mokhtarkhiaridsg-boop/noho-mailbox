"use client";

/**
 * NOHO Mailbox — Walk-in Signup Wizard
 *
 * In-store new customer creation. Admin walks the customer through:
 *  1. Plan + term + deposit
 *  2. Identity + box type
 *  3. Suite + welcome email
 *  4. Payment + confirm
 *
 * On success, fires `createWalkInSignup` which atomically creates User +
 * Payment(s) + initial MailboxRenewal + audit log, then sends the welcome
 * email. Returns userId so we can pre-select them in the Mailbox Center.
 */

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWalkInSignup } from "@/app/actions/customerOps";
import { DEFAULT_PRICING, type PricingConfig, type PricingPlan } from "@/lib/pricing-config";
import { IdScanButton } from "./IdScanButton";

const ID_TYPES = [
  "Driver License", "State ID", "Passport", "Military ID",
  "Permanent Resident", "Voter Registration", "Vehicle Registration",
  "Lease", "Utility Bill", "Insurance Policy", "Other",
];

type IdSlot = {
  type: string;
  number: string;
  expDate: string;
  issuer: string;
  imageUrl: string | null;
};

const NOHO_BLUE = "#337485";
const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";
const NOHO_CREAM = "#F7E6C2";
const NOHO_RED = "#E70013";

type Step = 1 | 2 | 3 | 4 | 5;

type Props = {
  pricing?: PricingConfig | null;
  /** Existing customer suite numbers — used to suggest next free + flag conflicts. */
  takenSuites: string[];
  /** Default deposit cents (typically $50). */
  defaultDepositCents?: number;
  /** Default key fee cents (typically $15). */
  defaultKeyFeeCents?: number;
  onClose: () => void;
  onSuccess: (userId: string) => void;
};

function fmtMoney(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export function AdminWalkInSignupWizard({
  pricing,
  takenSuites,
  defaultDepositCents = 5000,
  defaultKeyFeeCents = 1500,
  onClose,
  onSuccess,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>(1);
  const [error, setError] = useState<string | null>(null);

  const cfg: PricingConfig = pricing ?? DEFAULT_PRICING;

  // Step 1 state
  const [planName, setPlanName] = useState<string>(cfg.plans[0]?.name ?? "Basic");
  const [termMonths, setTermMonths] = useState<3 | 6 | 14>(3);
  const [includeDeposit, setIncludeDeposit] = useState(true);
  const [includeKeyFee, setIncludeKeyFee] = useState(true);
  const [depositCents, setDepositCents] = useState(defaultDepositCents);
  const [keyFeeCents, setKeyFeeCents] = useState(defaultKeyFeeCents);

  // Step 2 state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [boxType, setBoxType] = useState<"Personal" | "Business">("Personal");
  const [businessName, setBusinessName] = useState("");
  const [businessOwnerName, setBusinessOwnerName] = useState("");
  const [businessOwnerRelation, setBusinessOwnerRelation] = useState("Owner");
  const [businessOwnerPhone, setBusinessOwnerPhone] = useState("");

  // Step 3 state
  const [suiteNumber, setSuiteNumber] = useState("");
  const [sendWelcome, setSendWelcome] = useState(true);

  // Step 4 state — IDs
  const [idPrimary, setIdPrimary] = useState<IdSlot>({ type: "", number: "", expDate: "", issuer: "", imageUrl: null });
  const [idSecondary, setIdSecondary] = useState<IdSlot>({ type: "", number: "", expDate: "", issuer: "", imageUrl: null });
  const [uploadingSlot, setUploadingSlot] = useState<"primary" | "secondary" | null>(null);
  const [skipIds, setSkipIds] = useState(false);

  // Step 5 state
  const [paymentMethod, setPaymentMethod] = useState<"Cash" | "Square" | "CardOnFile">("Cash");

  // Derived: plan price for selected plan + term
  const planPriceCents = useMemo(() => {
    const plan = cfg.plans.find((p: PricingPlan) => p.name.toLowerCase() === planName.toLowerCase());
    if (!plan) return 0;
    const dollars = plan.prices?.[`term${termMonths}` as "term3" | "term6" | "term14"];
    return typeof dollars === "number" ? Math.round(dollars * 100) : 0;
  }, [cfg, planName, termMonths]);

  const effectiveDeposit = includeDeposit ? depositCents : 0;
  const effectiveKeyFee = includeKeyFee ? keyFeeCents : 0;
  const totalCents = planPriceCents + effectiveDeposit + effectiveKeyFee;

  // Suggested suite — lowest unused integer suite #
  const suggestedSuite = useMemo(() => {
    const taken = new Set(takenSuites.map((s) => s.trim()));
    for (let n = 100; n < 999; n++) {
      if (!taken.has(String(n))) return String(n);
    }
    return "";
  }, [takenSuites]);

  const suiteConflict = useMemo(() => {
    return suiteNumber.trim() && takenSuites.includes(suiteNumber.trim());
  }, [suiteNumber, takenSuites]);

  // Step gates
  const step1Valid = planPriceCents > 0 && [3, 6, 14].includes(termMonths);
  const step2Valid =
    name.trim().length > 1 &&
    (boxType === "Personal" ||
      (businessName.trim() && businessOwnerName.trim() && businessOwnerRelation.trim()));
  const step3Valid = suiteNumber.trim().length > 0 && !suiteConflict;
  // Step 4 (IDs) is optional — admin can skip and capture later
  const step4Valid = skipIds || (idPrimary.type && idPrimary.number) || idPrimary.imageUrl;
  const canSubmit = step1Valid && step2Valid && step3Valid;

  function next() {
    setError(null);
    if (step === 1 && !step1Valid) return setError("Pick a plan + term with a price.");
    if (step === 2 && !step2Valid) return setError(boxType === "Business" ? "Business name + owner + relation required" : "Customer name required");
    if (step === 3 && !step3Valid) return setError(suiteConflict ? `Suite ${suiteNumber} is already assigned.` : "Suite number required");
    if (step === 4 && !step4Valid) return setError("Capture at least primary ID (type + number, or photo) — or check 'Skip and capture later'.");
    if (step < 5) setStep((s) => (s + 1) as Step);
  }
  function back() {
    setError(null);
    if (step > 1) setStep((s) => (s - 1) as Step);
  }

  async function handleIdUpload(slot: "primary" | "secondary", file: File | null) {
    if (!file) return;
    setUploadingSlot(slot);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: fd });
      const data = await res.json();
      if (!data.url) throw new Error("Upload failed");
      if (slot === "primary") setIdPrimary((s) => ({ ...s, imageUrl: data.url }));
      else setIdSecondary((s) => ({ ...s, imageUrl: data.url }));
    } catch (e) {
      setError(`Upload failed: ${e instanceof Error ? e.message : "unknown error"}`);
    } finally {
      setUploadingSlot(null);
    }
  }

  function handleSubmit() {
    if (!canSubmit) return;
    setError(null);
    startTransition(async () => {
      const res = await createWalkInSignup({
        name,
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        boxType,
        businessName: boxType === "Business" ? businessName : undefined,
        businessOwnerName: businessOwnerName.trim() || undefined,
        businessOwnerRelation: businessOwnerRelation.trim() || undefined,
        businessOwnerPhone: businessOwnerPhone.trim() || undefined,
        plan: planName,
        termMonths,
        planAmountCents: planPriceCents,
        suiteNumber: suiteNumber.trim(),
        depositCents: effectiveDeposit,
        keyFeeCents: effectiveKeyFee,
        paymentMethod,
        // ID verification (skipped if skipIds=true)
        idPrimaryType:      skipIds ? undefined : idPrimary.type || undefined,
        idPrimaryNumber:    skipIds ? undefined : idPrimary.number || undefined,
        idPrimaryExpDate:   skipIds ? undefined : idPrimary.expDate || undefined,
        idPrimaryIssuer:    skipIds ? undefined : idPrimary.issuer || undefined,
        idPrimaryImageUrl:  skipIds ? undefined : idPrimary.imageUrl ?? undefined,
        idSecondaryType:    skipIds ? undefined : idSecondary.type || undefined,
        idSecondaryNumber:  skipIds ? undefined : idSecondary.number || undefined,
        idSecondaryExpDate: skipIds ? undefined : idSecondary.expDate || undefined,
        idSecondaryIssuer:  skipIds ? undefined : idSecondary.issuer || undefined,
        idSecondaryImageUrl: skipIds ? undefined : idSecondary.imageUrl ?? undefined,
        sendWelcome,
      });
      if ("error" in res && res.error) {
        setError(res.error);
        return;
      }
      router.refresh();
      if ("userId" in res && res.userId) onSuccess(res.userId);
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 py-8" style={{ background: "rgba(10,8,7,0.6)" }}>
      <div
        className="bg-white rounded-3xl w-full max-w-2xl max-h-[92vh] overflow-y-auto"
        style={{ boxShadow: "0 24px 60px rgba(10,8,7,0.4)" }}
      >
        {/* Header */}
        <div
          className="sticky top-0 px-6 py-4 flex items-center justify-between rounded-t-3xl"
          style={{ background: NOHO_INK, color: NOHO_CREAM }}
        >
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] opacity-70">Walk-in Signup · Step {step}/5</p>
            <h2 className="text-lg font-extrabold tracking-tight">
              {step === 1 ? "Plan & Term" :
               step === 2 ? "Customer Identity" :
               step === 3 ? "Suite Assignment" :
               step === 4 ? "ID Verification" :
                            "Confirm & Process"}
            </h2>
          </div>
          <button onClick={onClose} className="text-2xl leading-none opacity-70 hover:opacity-100" aria-label="Close">×</button>
        </div>

        {/* Step indicator */}
        <div className="px-6 py-3 flex gap-1.5" style={{ background: "#FFF9F3", borderBottom: "1px solid #E8DDD0" }}>
          {[1, 2, 3, 4, 5].map((n) => {
            const active = n === step;
            const done = n < step;
            return (
              <div
                key={n}
                className="flex-1 h-1.5 rounded-full transition-colors"
                style={{ background: done ? NOHO_BLUE : active ? NOHO_INK : "#E8DDD0" }}
              />
            );
          })}
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-xl px-3 py-2 text-xs font-bold" style={{ background: "rgba(231,0,19,0.06)", color: "#b91c1c", border: "1px solid rgba(231,0,19,0.18)" }}>
              {error}
            </div>
          )}

          {/* Step 1: Plan + Term */}
          {step === 1 && (
            <>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050] mb-2">Plan</p>
                <div className="grid grid-cols-3 gap-2">
                  {cfg.plans.map((p) => {
                    const active = planName === p.name;
                    return (
                      <button
                        key={p.name}
                        onClick={() => setPlanName(p.name)}
                        className="rounded-xl py-3 px-2 text-center transition-all"
                        style={{
                          background: active ? NOHO_BLUE : "#FFF9F3",
                          color: active ? "#fff" : NOHO_INK,
                          border: active ? `1px solid ${NOHO_BLUE}` : "1px solid #E8DDD0",
                          boxShadow: active ? "0 4px 14px rgba(51,116,133,0.32)" : "none",
                        }}
                      >
                        <p className="text-base font-extrabold tracking-tight">{p.name}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050] mb-2">Term</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { v: 3 as const, label: "3 mo", sub: "Quarterly" },
                    { v: 6 as const, label: "6 mo", sub: "Half-year" },
                    { v: 14 as const, label: "14 mo", sub: "Best value" },
                  ]).map((t) => {
                    const active = termMonths === t.v;
                    return (
                      <button
                        key={t.v}
                        onClick={() => setTermMonths(t.v)}
                        className="rounded-xl py-2.5 px-2 text-center transition-all"
                        style={{
                          background: active ? NOHO_BLUE : "#FFF9F3",
                          color: active ? "#fff" : NOHO_INK,
                          border: active ? `1px solid ${NOHO_BLUE}` : "1px solid #E8DDD0",
                        }}
                      >
                        <p className="text-sm font-extrabold tracking-tight">{t.label}</p>
                        <p className="text-[10px] mt-0.5" style={{ color: active ? "rgba(255,255,255,0.7)" : "#7A6050" }}>{t.sub}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050] mb-2">First-time fees</p>
                <div className="space-y-2">
                  <label className="flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer" style={{ background: "#FFF9F3", border: "1px solid #E8DDD0" }}>
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={includeDeposit} onChange={(e) => setIncludeDeposit(e.target.checked)} />
                      <span className="text-sm font-bold" style={{ color: NOHO_INK }}>Security deposit</span>
                    </span>
                    <span className="flex items-center gap-1 text-sm font-black" style={{ color: includeDeposit ? NOHO_BLUE : "#7A6050" }}>
                      $<input type="number" min={0} step={1} value={depositCents / 100} onChange={(e) => setDepositCents(Math.round(parseFloat(e.target.value || "0") * 100))} disabled={!includeDeposit} className="w-16 text-right rounded-lg px-2 py-0.5 text-sm font-black focus:outline-none disabled:opacity-50" style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }} />
                    </span>
                  </label>
                  <label className="flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer" style={{ background: "#FFF9F3", border: "1px solid #E8DDD0" }}>
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={includeKeyFee} onChange={(e) => setIncludeKeyFee(e.target.checked)} />
                      <span className="text-sm font-bold" style={{ color: NOHO_INK }}>Mailbox key fee</span>
                    </span>
                    <span className="flex items-center gap-1 text-sm font-black" style={{ color: includeKeyFee ? NOHO_BLUE : "#7A6050" }}>
                      $<input type="number" min={0} step={1} value={keyFeeCents / 100} onChange={(e) => setKeyFeeCents(Math.round(parseFloat(e.target.value || "0") * 100))} disabled={!includeKeyFee} className="w-16 text-right rounded-lg px-2 py-0.5 text-sm font-black focus:outline-none disabled:opacity-50" style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }} />
                    </span>
                  </label>
                </div>
              </div>

              <div className="rounded-xl p-3" style={{ background: "linear-gradient(135deg, #FFF9F3, #F0DBA9)" }}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050]">Total today</p>
                <p className="text-3xl font-extrabold tracking-tight" style={{ color: NOHO_BLUE }}>{fmtMoney(totalCents)}</p>
                <p className="text-[11px] mt-1" style={{ color: "#7A6050" }}>
                  {fmtMoney(planPriceCents)} plan{includeDeposit ? ` + ${fmtMoney(depositCents)} deposit` : ""}{includeKeyFee ? ` + ${fmtMoney(keyFeeCents)} key fee` : ""}
                </p>
              </div>
            </>
          )}

          {/* Step 2: Identity */}
          {step === 2 && (
            <>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050] mb-2">Box type</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["Personal", "Business"] as const).map((t) => {
                    const active = boxType === t;
                    return (
                      <button
                        key={t}
                        onClick={() => setBoxType(t)}
                        className="rounded-xl py-2.5 text-center transition-all"
                        style={{
                          background: active ? NOHO_BLUE : "#FFF9F3",
                          color: active ? "#fff" : NOHO_INK,
                          border: active ? `1px solid ${NOHO_BLUE}` : "1px solid #E8DDD0",
                        }}
                      >
                        <p className="text-sm font-extrabold">{t}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050] mb-2">Customer</p>
                <input value={name} onChange={(e) => setName(e.target.value)} autoFocus placeholder="Full name *" className="w-full rounded-xl px-3 py-2.5 text-sm focus:outline-none mb-2" style={{ background: "#FFF9F3", border: "1px solid #E8DDD0", color: NOHO_INK }} />
                <div className="grid grid-cols-2 gap-2">
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (for SMS)" type="tel" className="rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={{ background: "#FFF9F3", border: "1px solid #E8DDD0", color: NOHO_INK }} />
                  <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (optional)" type="email" className="rounded-xl px-3 py-2.5 text-sm focus:outline-none" style={{ background: "#FFF9F3", border: "1px solid #E8DDD0", color: NOHO_INK }} />
                </div>
              </div>

              {boxType === "Business" && (
                <div className="rounded-xl p-3 space-y-2" style={{ background: "rgba(51,116,133,0.06)", border: "1px solid rgba(51,116,133,0.18)" }}>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050]">Business — required for CMRA</p>
                  <input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="Business / DBA name *" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }} />
                  <div className="grid grid-cols-2 gap-2">
                    <input value={businessOwnerName} onChange={(e) => setBusinessOwnerName(e.target.value)} placeholder="Owner / officer name *" className="rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }} />
                    <select value={businessOwnerRelation} onChange={(e) => setBusinessOwnerRelation(e.target.value)} className="rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }}>
                      {["Owner", "Officer", "Member", "Director", "Partner", "Other"].map((r) => <option key={r}>{r}</option>)}
                    </select>
                  </div>
                  <input value={businessOwnerPhone} onChange={(e) => setBusinessOwnerPhone(e.target.value)} placeholder="Owner phone (optional)" type="tel" className="w-full rounded-lg px-3 py-2 text-sm focus:outline-none" style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }} />
                </div>
              )}
            </>
          )}

          {/* Step 3: Suite + Welcome */}
          {step === 3 && (
            <>
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050] mb-2">Suite number</p>
                <div className="flex gap-2 items-center">
                  <input
                    value={suiteNumber}
                    onChange={(e) => setSuiteNumber(e.target.value)}
                    autoFocus
                    placeholder={`Suggested: #${suggestedSuite}`}
                    className="flex-1 rounded-xl px-3 py-2.5 text-base font-black focus:outline-none"
                    style={{
                      background: "#FFF9F3",
                      border: `1px solid ${suiteConflict ? "#fca5a5" : "#E8DDD0"}`,
                      color: NOHO_INK,
                    }}
                  />
                  {suggestedSuite && !suiteNumber.trim() && (
                    <button
                      onClick={() => setSuiteNumber(suggestedSuite)}
                      className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded-lg"
                      style={{ background: NOHO_BLUE, color: "#fff" }}
                    >
                      Use #{suggestedSuite}
                    </button>
                  )}
                </div>
                {suiteConflict ? (
                  <p className="text-[11px] mt-1.5 font-bold" style={{ color: "#b91c1c" }}>
                    Suite {suiteNumber} is already assigned to another customer.
                  </p>
                ) : (
                  <p className="text-[11px] mt-1.5" style={{ color: "#7A6050" }}>
                    Suggested is the lowest free number ≥100. Override if you want a specific suite.
                  </p>
                )}
              </div>

              <label className="flex items-center justify-between rounded-xl px-3 py-2.5 cursor-pointer" style={{ background: "#FFF9F3", border: "1px solid #E8DDD0" }}>
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={sendWelcome} onChange={(e) => setSendWelcome(e.target.checked)} />
                  <span>
                    <span className="text-sm font-bold block" style={{ color: NOHO_INK }}>Send welcome email</span>
                    <span className="text-[10px]" style={{ color: "#7A6050" }}>
                      {email.trim() ? `Will email ${email.trim()}` : "Disabled — no email on file"}
                    </span>
                  </span>
                </span>
              </label>
            </>
          )}

          {/* Step 4: ID Verification (CMRA Form 1583) */}
          {step === 4 && (
            <>
              <div className="rounded-xl p-3 mb-2" style={{ background: "rgba(51,116,133,0.06)", border: "1px solid rgba(51,116,133,0.18)" }}>
                <p className="text-[11px] font-bold" style={{ color: NOHO_INK }}>USPS requires 2 IDs for CMRA boxes — at least one government-issued.</p>
                <p className="text-[10px] mt-0.5" style={{ color: "#7A6050" }}>Tap &ldquo;Scan&rdquo; to auto-fill from a US driver&apos;s license barcode (PDF417). Skip below if you&apos;ll capture later.</p>
              </div>

              <label className="flex items-center justify-between rounded-xl px-3 py-2 cursor-pointer" style={{ background: "#FFF9F3", border: "1px solid #E8DDD0" }}>
                <span className="flex items-center gap-2">
                  <input type="checkbox" checked={skipIds} onChange={(e) => setSkipIds(e.target.checked)} />
                  <span className="text-xs font-bold" style={{ color: NOHO_INK }}>Skip and capture later</span>
                </span>
                <span className="text-[10px]" style={{ color: "#7A6050" }}>Customer profile has full ID UI</span>
              </label>

              {!skipIds && (
                <>
                  {([
                    { slot: "primary" as const, title: "Primary ID", state: idPrimary, setState: setIdPrimary, required: true },
                    { slot: "secondary" as const, title: "Secondary ID", state: idSecondary, setState: setIdSecondary, required: false },
                  ]).map((row) => (
                    <div key={row.slot} className="rounded-xl p-3 space-y-2" style={{ background: "#FFF9F3", border: "1px solid #E8DDD0" }}>
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-[11px] font-black" style={{ color: NOHO_INK }}>
                          {row.title} {row.required && <span style={{ color: NOHO_RED }}>*</span>}
                        </p>
                        <div className="flex items-center gap-2">
                          <IdScanButton
                            label="Scan"
                            onScanned={(d) => row.setState((s) => ({
                              ...s,
                              ...(d.number ? { number: d.number } : {}),
                              ...(d.expDate ? { expDate: d.expDate } : {}),
                              ...(d.issuer ? { issuer: d.issuer } : {}),
                              type: s.type || "Driver License",
                            }))}
                          />
                          {row.state.imageUrl ? (
                            <a href={row.state.imageUrl} target="_blank" rel="noreferrer" className="text-[10px] font-bold" style={{ color: NOHO_BLUE }}>View →</a>
                          ) : (
                            <span className="text-[10px]" style={{ color: "#7A6050" }}>{uploadingSlot === row.slot ? "Uploading…" : "No file"}</span>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <select
                          value={row.state.type}
                          onChange={(e) => row.setState((s) => ({ ...s, type: e.target.value }))}
                          className="rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                          style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }}
                        >
                          <option value="">ID type…</option>
                          {ID_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                        </select>
                        <input
                          type="date"
                          value={row.state.expDate}
                          onChange={(e) => row.setState((s) => ({ ...s, expDate: e.target.value }))}
                          title="Expiration"
                          className="rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                          style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }}
                        />
                      </div>
                      <input
                        type="text"
                        value={row.state.number}
                        onChange={(e) => row.setState((s) => ({ ...s, number: e.target.value }))}
                        placeholder="ID number"
                        className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                        style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }}
                      />
                      <input
                        type="text"
                        value={row.state.issuer}
                        onChange={(e) => row.setState((s) => ({ ...s, issuer: e.target.value }))}
                        placeholder="Issuer (state, country, insurer…)"
                        className="w-full rounded-lg px-2 py-1.5 text-xs focus:outline-none"
                        style={{ background: "white", border: "1px solid #E8DDD0", color: NOHO_INK }}
                      />
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        onChange={(e) => handleIdUpload(row.slot, e.target.files?.[0] ?? null)}
                        className="block w-full text-[10px] file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-bold file:bg-[#337485]/10 file:text-[#337485] hover:file:bg-[#337485]/20 cursor-pointer"
                      />
                    </div>
                  ))}
                </>
              )}
            </>
          )}

          {/* Step 5: Confirm */}
          {step === 5 && (
            <>
              <div className="rounded-xl p-4 space-y-3" style={{ background: "#FFF9F3", border: "1px solid #E8DDD0" }}>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050]">Customer</p>
                  <p className="text-sm font-extrabold" style={{ color: NOHO_INK }}>
                    {name} {boxType === "Business" && businessName ? `· ${businessName}` : ""}
                  </p>
                  <p className="text-[11px]" style={{ color: "#7A6050" }}>
                    Suite #{suiteNumber} · {boxType}{phone ? ` · ${phone}` : ""}{email ? ` · ${email}` : ""}
                  </p>
                </div>
                <div className="border-t" style={{ borderColor: "#E8DDD0" }} />
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050]">Plan</p>
                  <p className="text-sm font-extrabold" style={{ color: NOHO_INK }}>{planName} · {termMonths} mo</p>
                  <p className="text-[11px]" style={{ color: "#7A6050" }}>Plan period {fmtMoney(planPriceCents)}{effectiveDeposit > 0 ? ` · Deposit ${fmtMoney(effectiveDeposit)}` : ""}{effectiveKeyFee > 0 ? ` · Key fee ${fmtMoney(effectiveKeyFee)}` : ""}</p>
                </div>
              </div>

              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#7A6050] mb-2">Payment method</p>
                <div className="grid grid-cols-3 gap-2">
                  {(["Cash", "Square", "CardOnFile"] as const).map((m) => {
                    const active = paymentMethod === m;
                    return (
                      <button
                        key={m}
                        onClick={() => setPaymentMethod(m)}
                        className="rounded-xl py-2.5 text-center transition-all"
                        style={{
                          background: active ? NOHO_INK : "#FFF9F3",
                          color: active ? NOHO_CREAM : NOHO_INK,
                          border: active ? `1px solid ${NOHO_INK}` : "1px solid #E8DDD0",
                        }}
                      >
                        <p className="text-xs font-extrabold">{m === "CardOnFile" ? "Card on file" : m}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl p-4" style={{ background: "linear-gradient(135deg, #1A2E3A, #0E1820)" }}>
                <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: "rgba(247,230,194,0.7)" }}>Total to collect</p>
                <p className="text-4xl font-extrabold tracking-tight" style={{ color: NOHO_CREAM }}>{fmtMoney(totalCents)}</p>
                <p className="text-[11px] mt-1" style={{ color: "rgba(247,230,194,0.55)" }}>
                  Records 1 plan period + {effectiveDeposit > 0 ? "deposit" : "no deposit"}{effectiveKeyFee > 0 ? " + key fee" : ""}. Sends welcome email{email.trim() && sendWelcome ? "" : " — skipped (no email or disabled)"}.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-4 flex items-center justify-between gap-3 rounded-b-3xl" style={{ background: "#FFF9F3", borderTop: "1px solid #E8DDD0" }}>
          <button
            onClick={step === 1 ? onClose : back}
            disabled={isPending}
            className="text-xs font-bold px-4 py-2.5 rounded-xl disabled:opacity-50"
            style={{ color: "#7A6050" }}
          >
            {step === 1 ? "Cancel" : "← Back"}
          </button>
          {step < 5 ? (
            <button
              onClick={next}
              disabled={isPending || (step === 4 && uploadingSlot !== null)}
              className="text-xs font-black px-5 py-2.5 rounded-xl text-white disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${NOHO_BLUE}, ${NOHO_BLUE_DEEP})`, boxShadow: "0 4px 14px rgba(51,116,133,0.32)" }}
            >
              Next →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isPending || !canSubmit || uploadingSlot !== null}
              className="flex items-center gap-2 text-xs font-black px-5 py-2.5 rounded-xl text-white disabled:opacity-50 disabled:cursor-wait"
              style={{ background: `linear-gradient(135deg, ${NOHO_INK}, #1a0908)`, boxShadow: "0 4px 14px rgba(45,16,15,0.4)" }}
              title={uploadingSlot ? "Wait for ID photo upload to finish" : ""}
            >
              {(isPending || uploadingSlot) && (
                <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.3" />
                  <path d="M21 12 a9 9 0 0 0 -9 -9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              )}
              {uploadingSlot ? "Uploading ID…" : isPending ? "Processing…" : `Process · ${fmtMoney(totalCents)}`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
