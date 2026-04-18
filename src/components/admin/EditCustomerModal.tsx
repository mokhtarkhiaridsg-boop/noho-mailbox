"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import {
  updateCustomerDetails,
  suspendCustomer,
  reactivateCustomer,
} from "@/app/actions/admin";
import type { Customer, EditForm } from "./types";

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

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.55)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg mx-4 max-h-[92vh] overflow-y-auto" style={{ boxShadow: "0 8px 40px rgba(26,23,20,0.22)" }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white z-10 px-6 pt-5 pb-4 border-b border-[#e8e5e0] flex items-center justify-between">
          <div>
            <h3 className="font-black text-base text-text-light">Edit Customer</h3>
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
              { label: "Phone", key: "phone", type: "tel", placeholder: "(818) 765-1539" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">{label}</label>
                <input
                  type={type}
                  value={editForm[key as keyof typeof editForm] as string}
                  onChange={(e) => setEditForm((p) => ({ ...p, [key]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
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
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Mailbox Status</label>
                <select
                  value={editForm.mailboxStatus}
                  onChange={(e) => setEditForm((p) => ({ ...p, mailboxStatus: e.target.value }))}
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
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
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                >
                  <option value="">— None —</option>
                  <option value="Basic">Basic</option>
                  <option value="Business">Business</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Term (months)</label>
                <select
                  value={editForm.planTerm}
                  onChange={(e) => setEditForm((p) => ({ ...p, planTerm: e.target.value }))}
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                >
                  <option value="">No term</option>
                  <option value="3">3 months</option>
                  <option value="6">6 months</option>
                  <option value="14">14 months</option>
                </select>
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
              className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
            />
            <div className="flex gap-1.5 flex-wrap">
              {[{ label: "+1 mo", m: 1 }, { label: "+3 mo", m: 3 }, { label: "+6 mo", m: 6 }, { label: "+1 yr", m: 12 }].map(({ label, m }) => (
                <button key={label} type="button"
                  onClick={() => setEditForm((p) => ({ ...p, planDueDate: addMonths(p.planDueDate, m) }))}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#3374B5]/10 text-[#3374B5] hover:bg-[#3374B5]/20"
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
                  className="w-full rounded-xl border border-[#e8e5e0] pl-7 pr-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
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

          {/* KYC */}
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">KYC / Identity</p>
            <div className="flex gap-2 flex-wrap">
              {["Pending", "Submitted", "Approved", "Rejected"].map((s) => (
                <button key={s} type="button"
                  onClick={() => setEditForm((p) => ({ ...p, kycStatus: s }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${editForm.kycStatus === s ? "bg-[#3374B5] text-white border-[#3374B5]" : "border-[#e8e5e0] text-text-light hover:border-[#3374B5]"}`}
                >{s}</button>
              ))}
            </div>
            {(viewCustomer.kycForm1583Url || viewCustomer.kycIdImageUrl || viewCustomer.kycIdImage2Url) && (
              <div className="flex gap-2 flex-wrap pt-1">
                {viewCustomer.kycForm1583Url && <a href={viewCustomer.kycForm1583Url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#3374B5] hover:underline bg-blue-50 px-3 py-1 rounded-lg">📄 Form 1583</a>}
                {viewCustomer.kycIdImageUrl && <a href={viewCustomer.kycIdImageUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#3374B5] hover:underline bg-blue-50 px-3 py-1 rounded-lg">🪪 Primary ID</a>}
                {viewCustomer.kycIdImage2Url && <a href={viewCustomer.kycIdImage2Url} target="_blank" rel="noopener noreferrer" className="text-[11px] font-bold text-[#3374B5] hover:underline bg-blue-50 px-3 py-1 rounded-lg">🪪 Second ID</a>}
              </div>
            )}
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
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Card Brand</label>
                <select value={editForm.cardBrand}
                  onChange={(e) => setEditForm((p) => ({ ...p, cardBrand: e.target.value }))}
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
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
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
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
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Discount % (applied to this customer)</label>
              <div className="flex items-center gap-3">
                <input type="number" min={0} max={100} value={editForm.cardDiscountPct}
                  onChange={(e) => setEditForm((p) => ({ ...p, cardDiscountPct: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                  className="w-24 rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                />
                <span className="text-sm font-bold text-text-light/50">%</span>
                <div className="flex gap-1.5">
                  {[0, 10, 15, 20, 25].map((pct) => (
                    <button key={pct} type="button"
                      onClick={() => setEditForm((p) => ({ ...p, cardDiscountPct: pct }))}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${editForm.cardDiscountPct === pct ? "bg-[#3374B5] text-white" : "bg-[#3374B5]/10 text-[#3374B5] hover:bg-[#3374B5]/20"}`}
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
                });
                if (result.error) {
                  setEditError(result.error);
                } else {
                  setEditSuccess(true);
                  router.refresh();
                }
              });
            }}
            className="w-full py-3 rounded-xl bg-[#3374B5] text-white font-black text-sm hover:bg-[#2960a0] disabled:opacity-50 transition-colors"
          >
            {isPending ? "Saving…" : "Save All Changes"}
          </button>

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
