"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCustomer, updateCustomerDetails } from "@/app/actions/admin";
import { ensureQuarterlyStatements } from "@/app/actions/compliance";
import { IdScanButton } from "./IdScanButton";

type Props = {
  onClose: () => void;
};

// Upload via the existing admin-gated /api/upload endpoint.
async function uploadFile(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string };
  return data.url ?? null;
}

export function AddCustomerModal({ onClose }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state — mirrors EditCustomerModal
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    suiteNumber: "",
    mailboxStatus: "Pending",
    plan: "Basic",
    planTerm: "",
    planDueDate: "",
    depositCents: 0,
    kycStatus: "Pending",
    cardholderName: "",
    cardBrand: "",
    cardLast4: "",
    cardExpiry: "",
    cardDiscountPct: 0,
    boxType: "Personal" as "Personal" | "Business",
    businessName: "",
    businessOwnerName: "",
    businessOwnerRelation: "Owner",
    businessOwnerPhone: "",
    // CMRA / IDs (uploaded files + types + expirations)
    kycForm1583Url: null as string | null,
    kycIdImageUrl: null as string | null,
    kycIdImage2Url: null as string | null,
    idPrimaryType: "",
    idSecondaryType: "",
    idPrimaryExpDate: "",
    idSecondaryExpDate: "",
    idPrimaryNumber: "",
    idSecondaryNumber: "",
    idPrimaryIssuer: "",
    idSecondaryIssuer: "",
  });

  async function handleIdUpload(slot: 1 | 2 | "form1583", file: File | null) {
    if (!file) return;
    setError(null);
    const url = await uploadFile(file);
    if (!url) {
      setError("Upload failed. Try a smaller file (≤10MB).");
      return;
    }
    setForm((p) => ({
      ...p,
      ...(slot === 1 ? { kycIdImageUrl: url } : {}),
      ...(slot === 2 ? { kycIdImage2Url: url } : {}),
      ...(slot === "form1583" ? { kycForm1583Url: url } : {}),
    }));
  }

  function addMonths(dateStr: string, months: number): string {
    const base = dateStr ? new Date(dateStr) : new Date();
    base.setMonth(base.getMonth() + months);
    return base.toISOString().split("T")[0];
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      // Step 1: create the user record (basic fields + box type + business owner)
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v === null) return; // skip nulls (file URLs handled below)
        fd.append(k === "suiteNumber" ? "suite" : k, String(v));
      });
      const result = await createCustomer(fd);
      if (result?.error) {
        setError(result.error);
        return;
      }

      // Step 2: if any ID files / types / exp dates were captured, persist them
      // by looking up the new user and patching with updateCustomerDetails.
      const hasIdData =
        form.kycForm1583Url ||
        form.kycIdImageUrl ||
        form.kycIdImage2Url ||
        form.idPrimaryType ||
        form.idSecondaryType ||
        form.idPrimaryExpDate ||
        form.idSecondaryExpDate;

      if (hasIdData) {
        // Look up user by suite # to get id, then patch.
        const findRes = await fetch(
          `/api/admin/find-user?suite=${encodeURIComponent(form.suiteNumber)}`,
        ).catch(() => null);
        if (findRes?.ok) {
          const data = (await findRes.json()) as { id?: string };
          if (data.id) {
            await updateCustomerDetails(data.id, {
              kycForm1583Url: form.kycForm1583Url,
              kycIdImageUrl: form.kycIdImageUrl,
              kycIdImage2Url: form.kycIdImage2Url,
              idPrimaryType: form.idPrimaryType || null,
              idSecondaryType: form.idSecondaryType || null,
              idPrimaryExpDate: form.idPrimaryExpDate || null,
              idSecondaryExpDate: form.idSecondaryExpDate || null,
              idPrimaryNumber: form.idPrimaryNumber || null,
              idSecondaryNumber: form.idSecondaryNumber || null,
              idPrimaryIssuer: form.idPrimaryIssuer || null,
              idSecondaryIssuer: form.idSecondaryIssuer || null,
            });
            // Step 3: kick off quarterly statement generation
            await ensureQuarterlyStatements(data.id).catch(() => {});
          }
        }
      }

      setSuccess(true);
      router.refresh();
      setTimeout(onClose, 1200);
    });
  }

  if (success) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
        <div className="bg-white rounded-2xl p-10 text-center w-full max-w-sm mx-4" style={{ boxShadow: "0 8px 40px rgba(26,23,20,0.2)" }}>
          <p className="text-4xl mb-3">✓</p>
          <p className="font-black text-lg text-text-light">Customer Created!</p>
          <p className="text-sm text-text-light/50 mt-1">Closing…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div
        className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[92vh] overflow-y-auto"
        style={{ boxShadow: "0 8px 40px rgba(26,23,20,0.22)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b border-[#e8e5e0] flex items-center justify-between">
          <div>
            <h3 className="font-black text-base text-text-light">Add Customer</h3>
            <p className="text-[11px] text-text-light/40 mt-0.5">All fields except password are editable later</p>
          </div>
          <button onClick={onClose} className="text-text-light/30 hover:text-text-light text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {error && (
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-semibold">{error}</div>
          )}

          {/* Box Type — Personal or Business */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Box Type *</p>
            <div className="grid grid-cols-2 gap-2">
              {(["Personal", "Business"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, boxType: t }))}
                  className={`px-4 py-3 rounded-xl text-sm font-black border-2 transition-colors ${
                    form.boxType === t
                      ? "bg-[#337485] text-white border-[#337485]"
                      : "border-[#e8e5e0] text-text-light hover:border-[#337485]"
                  }`}
                >
                  {t === "Personal" ? "🏠 Personal" : "🏢 Business"}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-text-light/55 leading-relaxed">
              {form.boxType === "Business"
                ? "Required by USPS: a business cannot exist as an individual. Owner / officer must be on file below."
                : "Personal mailbox in this customer's own name."}
            </p>
          </div>

          {/* Personal Info */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">
              {form.boxType === "Business" ? "Primary Contact (Individual)" : "Personal Info"}
            </p>
            {[
              { label: "Full Name *", key: "name", type: "text", placeholder: "Jane Smith" },
              { label: "Email (optional)", key: "email", type: "email", placeholder: "jane@example.com" },
              { label: "Phone", key: "phone", type: "tel", placeholder: "(818) 506-7744" },
              { label: "Password (leave blank to auto-generate)", key: "password", type: "text", placeholder: "Auto-generated if empty" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
            ))}
          </div>

          {/* Business owner section — only when Business */}
          {form.boxType === "Business" && (
            <div
              className="space-y-3 rounded-xl p-4"
              style={{
                background: "rgba(51,116,133,0.05)",
                border: "1px solid rgba(51,116,133,0.18)",
              }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#337485]">
                Business Details (CMRA-required)
              </p>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">
                  Legal Business Name *
                </label>
                <input
                  type="text"
                  value={form.businessName}
                  onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))}
                  placeholder="Acme LLC"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">
                    Owner / Officer Name *
                  </label>
                  <input
                    type="text"
                    value={form.businessOwnerName}
                    onChange={(e) => setForm((p) => ({ ...p, businessOwnerName: e.target.value }))}
                    placeholder="Jane Smith"
                    className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">
                    Role *
                  </label>
                  <select
                    value={form.businessOwnerRelation}
                    onChange={(e) => setForm((p) => ({ ...p, businessOwnerRelation: e.target.value }))}
                    className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Officer">Officer</option>
                    <option value="Member">Member (LLC)</option>
                    <option value="Director">Director</option>
                    <option value="Partner">Partner</option>
                    <option value="Authorized Agent">Authorized Agent</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">
                  Owner Phone
                </label>
                <input
                  type="tel"
                  value={form.businessOwnerPhone}
                  onChange={(e) => setForm((p) => ({ ...p, businessOwnerPhone: e.target.value }))}
                  placeholder="(818) 506-7744"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
              <p className="text-[11px] text-text-light/55 leading-relaxed">
                If the business folds, this person is personally on file with USPS as the responsible party.
              </p>
            </div>
          )}

          {/* Mailbox */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Mailbox</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Box Number *</label>
                <input
                  type="text"
                  value={form.suiteNumber}
                  onChange={(e) => setForm((p) => ({ ...p, suiteNumber: e.target.value }))}
                  placeholder="e.g. 24"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Mailbox Status</label>
                <select
                  value={form.mailboxStatus}
                  onChange={(e) => setForm((p) => ({ ...p, mailboxStatus: e.target.value }))}
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                >
                  <option value="Pending">Pending</option>
                  <option value="Assigned">Assigned</option>
                  <option value="Active">Active</option>
                  <option value="Suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Plan */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Plan</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Plan Tier *</label>
                <select
                  value={form.plan}
                  onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                >
                  <option value="Basic">Basic</option>
                  <option value="Business">Business</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Term (months)</label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  step={1}
                  value={form.planTerm}
                  onChange={(e) => setForm((p) => ({ ...p, planTerm: e.target.value }))}
                  placeholder="Any month count"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
                <div className="flex gap-1 flex-wrap mt-1.5">
                  {[1, 3, 6, 12, 14, 24].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, planTerm: String(m) }))}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                        form.planTerm === String(m)
                          ? "bg-[#337485] text-white"
                          : "bg-[#337485]/10 text-[#337485] hover:bg-[#337485]/20"
                      }`}
                    >
                      {m}mo
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setForm((p) => ({ ...p, planTerm: "" }))}
                    className="text-[10px] font-bold px-2 py-0.5 rounded-md border border-[#e8e5e0] text-text-light/40 hover:text-red-500 hover:border-red-300"
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Renewal Date */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Renewal / Due Date</p>
            <input
              type="date"
              value={form.planDueDate}
              onChange={(e) => setForm((p) => ({ ...p, planDueDate: e.target.value }))}
              className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
            />
            <div className="flex gap-1.5 flex-wrap">
              {[{ label: "+1 mo", m: 1 }, { label: "+3 mo", m: 3 }, { label: "+6 mo", m: 6 }, { label: "+1 yr", m: 12 }].map(({ label, m }) => (
                <button key={label} type="button"
                  onClick={() => setForm((p) => ({ ...p, planDueDate: addMonths(p.planDueDate, m) }))}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#337485]/10 text-[#337485] hover:bg-[#337485]/20"
                >{label}</button>
              ))}
              <button type="button"
                onClick={() => setForm((p) => ({ ...p, planDueDate: "" }))}
                className="text-[10px] font-bold px-2.5 py-1 rounded-lg border border-[#e8e5e0] text-text-light/40 hover:text-red-500 hover:border-red-300"
              >Clear</button>
            </div>
          </div>

          {/* Security Deposit */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Security Deposit</p>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold text-text-light/40">$</span>
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={(form.depositCents / 100).toFixed(0)}
                  onChange={(e) => setForm((p) => ({ ...p, depositCents: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                  className="w-full rounded-xl border border-[#e8e5e0] pl-7 pr-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
              <button type="button"
                onClick={() => setForm((p) => ({ ...p, depositCents: 5000 }))}
                className="px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold hover:bg-green-100"
              >Mark Paid ($50)</button>
              <button type="button"
                onClick={() => setForm((p) => ({ ...p, depositCents: 0 }))}
                className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold hover:bg-red-100"
              >Required</button>
            </div>
          </div>

          {/* KYC */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">KYC / Identity</p>
            <div className="flex gap-2 flex-wrap">
              {["Pending", "Submitted", "Approved", "Rejected"].map((s) => (
                <button key={s} type="button"
                  onClick={() => setForm((p) => ({ ...p, kycStatus: s }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${form.kycStatus === s ? "bg-[#337485] text-white border-[#337485]" : "border-[#e8e5e0] text-text-light hover:border-[#337485]"}`}
                >{s}</button>
              ))}
            </div>

            {([
              { slot: "form1583" as const, title: "USPS Form 1583", url: form.kycForm1583Url, hideDetails: true },
              { slot: 1 as const, title: "Primary ID", url: form.kycIdImageUrl, typeKey: "idPrimaryType" as const, expKey: "idPrimaryExpDate" as const, numKey: "idPrimaryNumber" as const, issuerKey: "idPrimaryIssuer" as const, hideDetails: false },
              { slot: 2 as const, title: "Second ID", url: form.kycIdImage2Url, typeKey: "idSecondaryType" as const, expKey: "idSecondaryExpDate" as const, numKey: "idSecondaryNumber" as const, issuerKey: "idSecondaryIssuer" as const, hideDetails: false },
            ] as const).map((row) => (
              <div key={String(row.slot)} className="rounded-xl border border-[#e8e5e0] p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[12px] font-black text-text-light">{row.title}</p>
                  <div className="flex items-center gap-2">
                    {!row.hideDetails && (
                      <IdScanButton
                        label="📷 Scan"
                        onScanned={(d) => {
                          setForm((p) => {
                            if (row.hideDetails) return p;
                            return {
                              ...p,
                              ...(d.number ? { [row.numKey]: d.number } : {}),
                              ...(d.expDate ? { [row.expKey]: d.expDate } : {}),
                              ...(d.issuer ? { [row.issuerKey]: d.issuer } : {}),
                            };
                          });
                        }}
                      />
                    )}
                    {row.url ? (
                      <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#337485] hover:underline">View file →</a>
                    ) : (
                      <span className="text-[11px] font-bold text-text-light/40">No file</span>
                    )}
                  </div>
                </div>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => handleIdUpload(row.slot, e.target.files?.[0] ?? null)}
                  className="block w-full text-[11px] text-text-light file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-[11px] file:font-bold file:bg-[#337485]/10 file:text-[#337485] hover:file:bg-[#337485]/20 cursor-pointer"
                />
                {!row.hideDetails && "typeKey" in row && (
                  <>
                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <select
                        value={(form[row.typeKey] as string) ?? ""}
                        onChange={(e) => setForm((p) => ({ ...p, [row.typeKey]: e.target.value }))}
                        className="rounded-lg border border-[#e8e5e0] px-2 py-1.5 text-xs font-semibold bg-white focus:outline-none focus:ring-2 focus:ring-[#337485]/30"
                      >
                        <option value="">ID Type…</option>
                        <option value="Driver License">Driver License</option>
                        <option value="State ID">State ID</option>
                        <option value="Passport">Passport</option>
                        <option value="Military ID">Military ID</option>
                        <option value="Permanent Resident">Permanent Resident</option>
                        <option value="Voter Registration">Voter Registration</option>
                        <option value="Vehicle Registration">Vehicle Registration</option>
                        <option value="Lease">Lease / Mortgage</option>
                        <option value="Utility Bill">Utility Bill</option>
                        <option value="Insurance Policy">Insurance Policy</option>
                        <option value="Other">Other</option>
                      </select>
                      <input
                        type="date"
                        value={(form[row.expKey] as string) ?? ""}
                        onChange={(e) => setForm((p) => ({ ...p, [row.expKey]: e.target.value }))}
                        title="Expiration date"
                        className="rounded-lg border border-[#e8e5e0] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#337485]/30"
                      />
                    </div>
                    <input
                      type="text"
                      value={(form[row.numKey] as string) ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, [row.numKey]: e.target.value }))}
                      placeholder="ID / Policy / Document # (any format)"
                      className="w-full rounded-lg border border-[#e8e5e0] px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#337485]/30"
                    />
                    <input
                      type="text"
                      value={(form[row.issuerKey] as string) ?? ""}
                      onChange={(e) => setForm((p) => ({ ...p, [row.issuerKey]: e.target.value }))}
                      placeholder="Issuer (state, country, insurer, landlord…)"
                      className="w-full rounded-lg border border-[#e8e5e0] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#337485]/30"
                    />
                  </>
                )}
              </div>
            ))}
          </div>

          {/* Card on File */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Card on File (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Cardholder Name</label>
                <input type="text" value={form.cardholderName}
                  onChange={(e) => setForm((p) => ({ ...p, cardholderName: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Card Brand</label>
                <select value={form.cardBrand}
                  onChange={(e) => setForm((p) => ({ ...p, cardBrand: e.target.value }))}
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                >
                  <option value="">— None —</option>
                  <option value="Visa">Visa</option>
                  <option value="Mastercard">Mastercard</option>
                  <option value="Amex">Amex</option>
                  <option value="Discover">Discover</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Last 4 Digits</label>
                <input type="text" value={form.cardLast4} maxLength={4}
                  onChange={(e) => setForm((p) => ({ ...p, cardLast4: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  placeholder="4242"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Expiry (MM/YY)</label>
                <input type="text" value={form.cardExpiry} maxLength={5}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, "");
                    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2, 4);
                    setForm((p) => ({ ...p, cardExpiry: v }));
                  }}
                  placeholder="09/27"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Discount % (this customer)</label>
              <div className="flex items-center gap-3">
                <input type="number" min={0} max={100} value={form.cardDiscountPct}
                  onChange={(e) => setForm((p) => ({ ...p, cardDiscountPct: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                  className="w-24 rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
                <span className="text-sm font-bold text-text-light/50">%</span>
                <div className="flex gap-1.5">
                  {[0, 10, 15, 20, 25].map((pct) => (
                    <button key={pct} type="button"
                      onClick={() => setForm((p) => ({ ...p, cardDiscountPct: pct }))}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${form.cardDiscountPct === pct ? "bg-[#337485] text-white" : "bg-[#337485]/10 text-[#337485] hover:bg-[#337485]/20"}`}
                    >{pct}%</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            disabled={
              isPending ||
              !form.name ||
              !form.suiteNumber ||
              (form.boxType === "Business" &&
                (!form.businessName || !form.businessOwnerName || !form.businessOwnerRelation))
            }
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl text-white font-black text-sm disabled:opacity-40 transition-colors"
            style={{ background: "linear-gradient(135deg, #337485, #23596A)", boxShadow: "0 2px 10px rgba(51,116,133,0.3)" }}
          >
            {isPending ? "Creating…" : "Create Customer"}
          </button>

        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-text-light border border-[#e8e5e0] hover:bg-[#f5f3f0]">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
