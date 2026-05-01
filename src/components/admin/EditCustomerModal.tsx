"use client";

import { useRouter } from "next/navigation";
import { useTransition, useEffect, useState } from "react";
import {
  updateCustomerDetails,
  suspendCustomer,
  reactivateCustomer,
  adminAdjustWallet,
} from "@/app/actions/admin";
import {
  ensureQuarterlyStatements,
  regenerateQuarterlyStatement,
  getQuarterlyStatementsForUser,
} from "@/app/actions/compliance";
import type { Customer, EditForm, QuarterlyStatementRow } from "./types";
import { IdScanButton } from "./IdScanButton";

// Helper: upload a file via the existing /api/upload endpoint.
async function uploadFile(file: File): Promise<string | null> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  if (!res.ok) return null;
  const data = (await res.json()) as { url?: string };
  return data.url ?? null;
}

type Props = {
  viewCustomer: Customer;
  editForm: EditForm;
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>;
  editError: string | null;
  setEditError: (e: string | null) => void;
  editSuccess: boolean;
  setEditSuccess: (s: boolean) => void;
  addMonths: (dateStr: string, months: number) => string;
  onClose: () => void;
};

export function EditCustomerModal({
  viewCustomer,
  editForm,
  setEditForm,
  editError,
  setEditError,
  editSuccess,
  setEditSuccess,
  addMonths,
  onClose,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [creditAmount, setCreditAmount] = useState("");
  const [creditDesc, setCreditDesc] = useState("");
  const [creditMsg, setCreditMsg] = useState<string | null>(null);

  // Quarterly statements (auto-generated)
  const [statements, setStatements] = useState<QuarterlyStatementRow[]>([]);
  const [stmtBusy, setStmtBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    setStmtBusy(true);
    // First make sure every quarter since signup has an auto-snapshot, then load.
    ensureQuarterlyStatements(viewCustomer.id)
      .then(() => getQuarterlyStatementsForUser(viewCustomer.id))
      .then((rows) => {
        if (alive) setStatements(rows);
      })
      .finally(() => {
        if (alive) setStmtBusy(false);
      });
    return () => {
      alive = false;
    };
  }, [viewCustomer.id]);

  // ID upload helpers — file picker → blob → set URL on editForm
  async function handleIdUpload(slot: 1 | 2 | "form1583", file: File | null) {
    if (!file) return;
    setEditError(null);
    const url = await uploadFile(file);
    if (!url) {
      setEditError("Upload failed. Try again or use a smaller file.");
      return;
    }
    setEditForm((p) => ({
      ...p,
      ...(slot === 1 ? { kycIdImageUrl: url } : {}),
      ...(slot === 2 ? { kycIdImage2Url: url } : {}),
      ...(slot === "form1583" ? { kycForm1583Url: url } : {}),
    }));
  }

  async function handleRegenerate(year: number, quarter: number) {
    setStmtBusy(true);
    try {
      await regenerateQuarterlyStatement(viewCustomer.id, year, quarter);
      const fresh = await getQuarterlyStatementsForUser(viewCustomer.id);
      setStatements(fresh);
    } finally {
      setStmtBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[92vh] overflow-y-auto" style={{ boxShadow: "0 8px 40px rgba(26,23,20,0.22)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b border-[#e8e5e0] flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-black text-base text-text-light">Edit Customer</h3>
              {viewCustomer.boxType === "Business" && (
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#337485]/10 text-[#337485]">
                  Business
                </span>
              )}
            </div>
            {viewCustomer.businessName && (
              <p className="text-[12px] font-bold text-[#23596A] mt-0.5">
                🏢 {viewCustomer.businessName}
              </p>
            )}
            <p className="text-[11px] text-text-light/40 mt-0.5">#{viewCustomer.suiteNumber || "—"} · joined {viewCustomer.createdAt} · {viewCustomer.mailCount} mail · {viewCustomer.packageCount} pkgs</p>
          </div>
          <button onClick={onClose} className="text-text-light/30 hover:text-text-light text-xl leading-none">✕</button>
        </div>

        <div className="px-6 py-5 space-y-5">

          {/* Error / success */}
          {editError && <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 font-semibold">{editError}</div>}
          {editSuccess && <div className="rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700 font-semibold">✓ Saved successfully</div>}

          {/* Personal Info */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Personal Info</p>
            {[
              { label: "Full Name", key: "name", type: "text", placeholder: "Jane Smith" },
              { label: "Email", key: "email", type: "email", placeholder: "jane@example.com" },
              { label: "Phone", key: "phone", type: "tel", placeholder: "(818) 506-7744" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">{label}</label>
                <input
                  type={type}
                  value={editForm[key as keyof typeof editForm] as string}
                  onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
            ))}
          </div>

          {/* Mailbox */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Mailbox</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Box Number</label>
                <input
                  type="text"
                  value={editForm.suiteNumber}
                  onChange={(e) => setEditForm((p) => ({ ...p, suiteNumber: e.target.value }))}
                  placeholder="e.g. 24"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Mailbox Status</label>
                <select
                  value={editForm.mailboxStatus}
                  onChange={(e) => setEditForm((p) => ({ ...p, mailboxStatus: e.target.value }))}
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Plan Tier</label>
                <select
                  value={editForm.plan}
                  onChange={(e) => setEditForm((p) => ({ ...p, plan: e.target.value }))}
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                >
                  <option value="">— None —</option>
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
                  value={editForm.planTerm}
                  onChange={(e) => setEditForm((p) => ({ ...p, planTerm: e.target.value }))}
                  placeholder="Any month count"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
                <div className="flex gap-1 flex-wrap mt-1.5">
                  {[1, 3, 6, 12, 14, 24].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setEditForm((p) => ({ ...p, planTerm: String(m) }))}
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-md transition-colors ${
                        editForm.planTerm === String(m)
                          ? "bg-[#337485] text-white"
                          : "bg-[#337485]/10 text-[#337485] hover:bg-[#337485]/20"
                      }`}
                    >
                      {m}mo
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEditForm((p) => ({ ...p, planTerm: "" }))}
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
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Renewal / Due Date</p>
              {editForm.planDueDate && new Date(editForm.planDueDate) < new Date() && (
                <span className="text-[10px] font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">OVERDUE</span>
              )}
            </div>
            <input
              type="date"
              value={editForm.planDueDate}
              onChange={(e) => setEditForm((p) => ({ ...p, planDueDate: e.target.value }))}
              className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
            />
            <div className="flex gap-1.5 flex-wrap">
              {[{ label: "+1 mo", m: 1 }, { label: "+3 mo", m: 3 }, { label: "+6 mo", m: 6 }, { label: "+1 yr", m: 12 }].map(({ label, m }) => (
                <button key={label} type="button"
                  onClick={() => setEditForm((p) => ({ ...p, planDueDate: addMonths(p.planDueDate, m) }))}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#337485]/10 text-[#337485] hover:bg-[#337485]/20"
                >{label}</button>
              ))}
              <button type="button"
                onClick={() => setEditForm((p) => ({ ...p, planDueDate: "" }))}
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
                  value={(editForm.depositCents / 100).toFixed(0)}
                  onChange={(e) => setEditForm((p) => ({ ...p, depositCents: Math.round(parseFloat(e.target.value || "0") * 100) }))}
                  className="w-full rounded-xl border border-[#e8e5e0] pl-7 pr-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
              <button type="button"
                onClick={() => setEditForm((p) => ({ ...p, depositCents: 5000 }))}
                className="px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-xs font-bold hover:bg-green-100"
              >Mark Paid ($50)</button>
              <button type="button"
                onClick={() => setEditForm((p) => ({ ...p, depositCents: 0 }))}
                className="px-3 py-2 rounded-xl bg-red-50 border border-red-200 text-red-600 text-xs font-bold hover:bg-red-100"
              >Required</button>
            </div>
          </div>

          {/* Box Type */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Box Type</p>
            <div className="grid grid-cols-2 gap-2">
              {(["Personal", "Business"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setEditForm((p) => ({ ...p, boxType: t }))}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black border-2 transition-colors ${
                    (editForm.boxType ?? "Personal") === t
                      ? "bg-[#337485] text-white border-[#337485]"
                      : "border-[#e8e5e0] text-text-light hover:border-[#337485]"
                  }`}
                >
                  {t === "Personal" ? "🏠 Personal" : "🏢 Business"}
                </button>
              ))}
            </div>
          </div>

          {/* Business Owner — required when Business */}
          {(editForm.boxType ?? "Personal") === "Business" && (
            <div
              className="space-y-3 rounded-xl p-4"
              style={{
                background: "rgba(51,116,133,0.05)",
                border: "1px solid rgba(51,116,133,0.18)",
              }}
            >
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-[#337485]">
                Business — Owner On File
              </p>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">
                  Legal Business Name
                </label>
                <input
                  type="text"
                  value={editForm.businessName ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, businessName: e.target.value }))}
                  placeholder="Acme LLC"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">
                    Owner Name
                  </label>
                  <input
                    type="text"
                    value={editForm.businessOwnerName ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, businessOwnerName: e.target.value }))}
                    placeholder="Jane Smith"
                    className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">
                    Role
                  </label>
                  <select
                    value={editForm.businessOwnerRelation ?? ""}
                    onChange={(e) => setEditForm((p) => ({ ...p, businessOwnerRelation: e.target.value }))}
                    className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                  >
                    <option value="">— Select —</option>
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
                  value={editForm.businessOwnerPhone ?? ""}
                  onChange={(e) => setEditForm((p) => ({ ...p, businessOwnerPhone: e.target.value }))}
                  placeholder="(818) 506-7744"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
            </div>
          )}

          {/* KYC + IDs */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">KYC / Identity</p>
            <div className="flex gap-2 flex-wrap">
              {["Pending", "Submitted", "Approved", "Rejected"].map((s) => (
                <button key={s} type="button"
                  onClick={() => setEditForm((p) => ({ ...p, kycStatus: s }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${editForm.kycStatus === s ? "bg-[#337485] text-white border-[#337485]" : "border-[#e8e5e0] text-text-light hover:border-[#337485]"}`}
                >{s}</button>
              ))}
            </div>

            {/* Form 1583 + 2 IDs uploaders */}
            {([
              {
                slot: "form1583" as const,
                title: "USPS Form 1583",
                url: editForm.kycForm1583Url,
                hideDetails: true,
              },
              {
                slot: 1 as const,
                title: "Primary ID",
                url: editForm.kycIdImageUrl,
                typeKey: "idPrimaryType" as const,
                expKey: "idPrimaryExpDate" as const,
                numKey: "idPrimaryNumber" as const,
                issuerKey: "idPrimaryIssuer" as const,
                hideDetails: false,
              },
              {
                slot: 2 as const,
                title: "Second ID",
                url: editForm.kycIdImage2Url,
                typeKey: "idSecondaryType" as const,
                expKey: "idSecondaryExpDate" as const,
                numKey: "idSecondaryNumber" as const,
                issuerKey: "idSecondaryIssuer" as const,
                hideDetails: false,
              },
            ] as const).map((row) => (
              <div
                key={String(row.slot)}
                className="rounded-xl border border-[#e8e5e0] p-3 space-y-2"
              >
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <p className="text-[12px] font-black text-text-light">{row.title}</p>
                  <div className="flex items-center gap-2">
                    {!row.hideDetails && (
                      <IdScanButton
                        label="📷 Scan"
                        onScanned={(d) => {
                          setEditForm((p) => {
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
                      <a
                        href={row.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] font-bold text-[#337485] hover:underline"
                      >
                        View file →
                      </a>
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
                        value={(editForm[row.typeKey] as string) ?? ""}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, [row.typeKey]: e.target.value }))
                        }
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
                        value={(editForm[row.expKey] as string) ?? ""}
                        onChange={(e) =>
                          setEditForm((p) => ({ ...p, [row.expKey]: e.target.value }))
                        }
                        title="Expiration date"
                        className="rounded-lg border border-[#e8e5e0] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#337485]/30"
                      />
                    </div>
                    <input
                      type="text"
                      value={(editForm[row.numKey] as string) ?? ""}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, [row.numKey]: e.target.value }))
                      }
                      placeholder="ID / Policy / Document # (any format)"
                      className="w-full rounded-lg border border-[#e8e5e0] px-2 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-[#337485]/30"
                    />
                    <input
                      type="text"
                      value={(editForm[row.issuerKey] as string) ?? ""}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, [row.issuerKey]: e.target.value }))
                      }
                      placeholder="Issuer (state, country, insurer, landlord…)"
                      className="w-full rounded-lg border border-[#e8e5e0] px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[#337485]/30"
                    />
                  </>
                )}
                {!row.hideDetails && "expKey" in row && (editForm[row.expKey] as string) && (() => {
                  const exp = new Date(editForm[row.expKey] as string);
                  const days = Math.round((exp.getTime() - Date.now()) / 86400000);
                  if (days < 0) return <p className="text-[10px] font-bold text-red-600">⚠ Expired {Math.abs(days)} day(s) ago</p>;
                  if (days < 60) return <p className="text-[10px] font-bold text-amber-600">⚠ Expires in {days} day(s)</p>;
                  return null;
                })()}
              </div>
            ))}
          </div>

          {/* Quarterly Statements (CMRA compliance) — AUTO-GENERATED */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">
                Quarterly Statements
              </p>
              <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                AUTO · every 90 days
              </span>
            </div>

            <div className="rounded-xl border border-[#e8e5e0] p-3 space-y-3">
              <p className="text-[11px] text-text-light/55">
                Generated automatically from this customer&apos;s file. Click any
                quarter to open the printable record.
              </p>

              {stmtBusy && statements.length === 0 ? (
                <p className="text-[11px] text-text-light/45">Generating…</p>
              ) : statements.length === 0 ? (
                <p className="text-[11px] text-text-light/55">
                  No statements yet — they&apos;ll appear after the first save.
                </p>
              ) : (
                <ul className="divide-y divide-[#e8e5e0]">
                  {statements.map((s) => (
                    <li key={s.id} className="py-2 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[12px] font-black text-text-light">
                          Q{s.quarter} {s.year}
                        </p>
                        <p className="text-[10px] text-text-light/55">
                          {s.periodStart} → {s.periodEnd}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <a
                          href={`/admin/statements/${s.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] font-bold text-[#337485] hover:underline"
                        >
                          View / Print
                        </a>
                        <button
                          disabled={stmtBusy}
                          onClick={() => handleRegenerate(s.year, s.quarter)}
                          className="text-[11px] font-bold text-text-light/55 hover:text-[#337485] disabled:opacity-40"
                          title="Re-snapshot this quarter using the current customer data"
                        >
                          Refresh
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {/* Card on File */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Card on File</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Cardholder Name</label>
                <input type="text" value={editForm.cardholderName}
                  onChange={(e) => setEditForm((p) => ({ ...p, cardholderName: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Card Brand</label>
                <select value={editForm.cardBrand}
                  onChange={(e) => setEditForm((p) => ({ ...p, cardBrand: e.target.value }))}
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
                <input type="text" value={editForm.cardLast4} maxLength={4}
                  onChange={(e) => setEditForm((p) => ({ ...p, cardLast4: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  placeholder="4242"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Expiry (MM/YY)</label>
                <input type="text" value={editForm.cardExpiry} maxLength={5}
                  onChange={(e) => {
                    let v = e.target.value.replace(/\D/g, "");
                    if (v.length > 2) v = v.slice(0, 2) + "/" + v.slice(2, 4);
                    setEditForm((p) => ({ ...p, cardExpiry: v }));
                  }}
                  placeholder="09/27"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Discount % (applied to this customer)</label>
              <div className="flex items-center gap-3">
                <input type="number" min={0} max={100} value={editForm.cardDiscountPct}
                  onChange={(e) => setEditForm((p) => ({ ...p, cardDiscountPct: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                  className="w-24 rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#337485]/30 focus:border-[#337485]"
                />
                <span className="text-sm font-bold text-text-light/50">%</span>
                <div className="flex gap-1.5">
                  {[0, 10, 15, 20, 25].map((pct) => (
                    <button key={pct} type="button"
                      onClick={() => setEditForm((p) => ({ ...p, cardDiscountPct: pct }))}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${editForm.cardDiscountPct === pct ? "bg-[#337485] text-white" : "bg-[#337485]/10 text-[#337485] hover:bg-[#337485]/20"}`}
                    >{pct}%</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Save All */}
          <button
            disabled={isPending}
            onClick={() => {
              setEditError(null);
              setEditSuccess(false);
              startTransition(async () => {
                const result = await updateCustomerDetails(viewCustomer.id, {
                  name: editForm.name,
                  email: editForm.email,
                  phone: editForm.phone,
                  suiteNumber: editForm.suiteNumber,
                  plan: editForm.plan,
                  planTerm: editForm.planTerm || null,
                  mailboxStatus: editForm.mailboxStatus,
                  planDueDate: editForm.planDueDate || null,
                  securityDepositCents: editForm.depositCents,
                  kycStatus: editForm.kycStatus,
                  cardLast4: editForm.cardLast4 || null,
                  cardBrand: editForm.cardBrand || null,
                  cardExpiry: editForm.cardExpiry || null,
                  cardholderName: editForm.cardholderName || null,
                  cardDiscountPct: editForm.cardDiscountPct,
                  kycForm1583Url: editForm.kycForm1583Url ?? null,
                  kycIdImageUrl: editForm.kycIdImageUrl ?? null,
                  kycIdImage2Url: editForm.kycIdImage2Url ?? null,
                  idPrimaryType: editForm.idPrimaryType ?? null,
                  idSecondaryType: editForm.idSecondaryType ?? null,
                  idPrimaryExpDate: editForm.idPrimaryExpDate ?? null,
                  idSecondaryExpDate: editForm.idSecondaryExpDate ?? null,
                  idPrimaryNumber: editForm.idPrimaryNumber ?? null,
                  idSecondaryNumber: editForm.idSecondaryNumber ?? null,
                  idPrimaryIssuer: editForm.idPrimaryIssuer ?? null,
                  idSecondaryIssuer: editForm.idSecondaryIssuer ?? null,
                  boxType: editForm.boxType ?? null,
                  businessName: editForm.businessName ?? null,
                  businessOwnerName: editForm.businessOwnerName ?? null,
                  businessOwnerRelation: editForm.businessOwnerRelation ?? null,
                  businessOwnerPhone: editForm.businessOwnerPhone ?? null,
                });
                if (result.error) {
                  setEditError(result.error);
                } else {
                  setEditSuccess(true);
                  router.refresh();
                }
              });
            }}
            className="w-full py-3 rounded-xl bg-[#337485] text-white font-black text-sm hover:bg-[#23596A] disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving…" : "Save All Changes"}
          </button>

          {/* Wallet Credit / Refund */}
          <div className="rounded-xl border border-[#e8e5e0] p-4 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-wider text-[#337485]">Wallet Credit / Refund</p>
            <p className="text-[11px] text-text-light/55">
              Positive = credit (refund), negative = debit. Max $1000 per adjustment.
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                step="0.01"
                placeholder="Amount (e.g. 10.00 or -5.00)"
                value={creditAmount}
                onChange={(e) => setCreditAmount(e.target.value)}
                className="flex-1 rounded-lg border border-[#e8e5e0] px-3 py-2 text-sm"
              />
              <input
                type="text"
                placeholder="Reason"
                value={creditDesc}
                onChange={(e) => setCreditDesc(e.target.value)}
                className="flex-[2] rounded-lg border border-[#e8e5e0] px-3 py-2 text-sm"
              />
            </div>
            {creditMsg && (
              <p className={`text-xs font-semibold ${creditMsg.startsWith("✓") ? "text-green-700" : "text-red-700"}`}>
                {creditMsg}
              </p>
            )}
            <button
              disabled={isPending || !creditAmount}
              onClick={() => {
                const dollars = parseFloat(creditAmount);
                if (!Number.isFinite(dollars) || dollars === 0) {
                  setCreditMsg("Enter a non-zero dollar amount");
                  return;
                }
                const cents = Math.round(dollars * 100);
                startTransition(async () => {
                  const res = await adminAdjustWallet(viewCustomer.id, cents, creditDesc);
                  if (res?.error) {
                    setCreditMsg(res.error);
                  } else {
                    setCreditMsg(`✓ Wallet adjusted. New balance: $${((res?.newBalance ?? 0) / 100).toFixed(2)}`);
                    setCreditAmount("");
                    setCreditDesc("");
                    router.refresh();
                  }
                });
              }}
              className="w-full py-2 rounded-lg bg-[#337485]/10 text-[#23596A] border border-[#337485]/30 text-xs font-black hover:bg-[#337485]/15 disabled:opacity-50"
            >
              {isPending ? "Adjusting…" : "Apply Wallet Adjustment"}
            </button>
          </div>

          {/* Danger Zone */}
          <div className="rounded-xl border border-red-200/60 p-4 space-y-2">
            <p className="text-[10px] font-black uppercase tracking-wider text-red-400">Danger Zone</p>
            <div className="flex gap-2">
              <button disabled={isPending}
                onClick={() => {
                  if (!confirm(`Suspend ${viewCustomer.name}? They lose mailbox access immediately.`)) return;
                  startTransition(async () => { await suspendCustomer(viewCustomer.id); onClose(); router.refresh(); });
                }}
                className="flex-1 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-bold hover:bg-red-100 disabled:opacity-50"
              >⛔ Suspend Account</button>
              <button disabled={isPending}
                onClick={() => startTransition(async () => { await reactivateCustomer(viewCustomer.id); onClose(); router.refresh(); })}
                className="flex-1 px-3 py-2 rounded-lg bg-green-50 border border-green-200 text-green-700 text-xs font-bold hover:bg-green-100 disabled:opacity-50"
              >✓ Reactivate</button>
            </div>
          </div>

        </div>

        <div className="px-6 pb-6">
          <button onClick={onClose} className="w-full px-4 py-2.5 rounded-xl text-sm font-bold text-text-light border border-[#e8e5e0] hover:bg-[#f5f3f0]">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
