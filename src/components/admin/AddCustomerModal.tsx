"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createCustomer } from "@/app/actions/admin";

type Props = {
  onClose: () => void;
};

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
  });

  function addMonths(dateStr: string, months: number): string {
    const base = dateStr ? new Date(dateStr) : new Date();
    base.setMonth(base.getMonth() + months);
    return base.toISOString().split("T")[0];
  }

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => fd.append(k === "suiteNumber" ? "suite" : k, String(v)));
      const result = await createCustomer(fd);
      if (result?.error) {
        setError(result.error);
      } else {
        setSuccess(true);
        router.refresh();
        setTimeout(onClose, 1200);
      }
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

          {/* Personal Info */}
          <div className="space-y-3">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Personal Info</p>
            {[
              { label: "Full Name *", key: "name", type: "text", placeholder: "Jane Smith" },
              { label: "Email *", key: "email", type: "email", placeholder: "jane@example.com" },
              { label: "Phone", key: "phone", type: "tel", placeholder: "(818) 765-1539" },
              { label: "Password (leave blank to auto-generate)", key: "password", type: "text", placeholder: "Auto-generated if empty" },
            ].map(({ label, key, type, placeholder }) => (
              <div key={key}>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">{label}</label>
                <input
                  type={type}
                  value={form[key as keyof typeof form] as string}
                  onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))}
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Box Number *</label>
                <input
                  type="text"
                  value={form.suiteNumber}
                  onChange={(e) => setForm((p) => ({ ...p, suiteNumber: e.target.value }))}
                  placeholder="e.g. 24"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Mailbox Status</label>
                <select
                  value={form.mailboxStatus}
                  onChange={(e) => setForm((p) => ({ ...p, mailboxStatus: e.target.value }))}
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
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Plan Tier *</label>
                <select
                  value={form.plan}
                  onChange={(e) => setForm((p) => ({ ...p, plan: e.target.value }))}
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold bg-white focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                >
                  <option value="Basic">Basic</option>
                  <option value="Business">Business</option>
                  <option value="Premium">Premium</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Term (months)</label>
                <select
                  value={form.planTerm}
                  onChange={(e) => setForm((p) => ({ ...p, planTerm: e.target.value }))}
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
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">Renewal / Due Date</p>
            <input
              type="date"
              value={form.planDueDate}
              onChange={(e) => setForm((p) => ({ ...p, planDueDate: e.target.value }))}
              className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
            />
            <div className="flex gap-1.5 flex-wrap">
              {[{ label: "+1 mo", m: 1 }, { label: "+3 mo", m: 3 }, { label: "+6 mo", m: 6 }, { label: "+1 yr", m: 12 }].map(({ label, m }) => (
                <button key={label} type="button"
                  onClick={() => setForm((p) => ({ ...p, planDueDate: addMonths(p.planDueDate, m) }))}
                  className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-[#3374B5]/10 text-[#3374B5] hover:bg-[#3374B5]/20"
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
                  className="w-full rounded-xl border border-[#e8e5e0] pl-7 pr-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
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
          <div className="space-y-2">
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-text-light/40">KYC / Identity</p>
            <div className="flex gap-2 flex-wrap">
              {["Pending", "Submitted", "Approved", "Rejected"].map((s) => (
                <button key={s} type="button"
                  onClick={() => setForm((p) => ({ ...p, kycStatus: s }))}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors ${form.kycStatus === s ? "bg-[#3374B5] text-white border-[#3374B5]" : "border-[#e8e5e0] text-text-light hover:border-[#3374B5]"}`}
                >{s}</button>
              ))}
            </div>
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
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Card Brand</label>
                <select value={form.cardBrand}
                  onChange={(e) => setForm((p) => ({ ...p, cardBrand: e.target.value }))}
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
                <input type="text" value={form.cardLast4} maxLength={4}
                  onChange={(e) => setForm((p) => ({ ...p, cardLast4: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
                  placeholder="4242"
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
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
                  className="w-full rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold font-mono focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-text-light/40 mb-1">Discount % (this customer)</label>
              <div className="flex items-center gap-3">
                <input type="number" min={0} max={100} value={form.cardDiscountPct}
                  onChange={(e) => setForm((p) => ({ ...p, cardDiscountPct: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                  className="w-24 rounded-xl border border-[#e8e5e0] px-3 py-2 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#3374B5]/30 focus:border-[#3374B5]"
                />
                <span className="text-sm font-bold text-text-light/50">%</span>
                <div className="flex gap-1.5">
                  {[0, 10, 15, 20, 25].map((pct) => (
                    <button key={pct} type="button"
                      onClick={() => setForm((p) => ({ ...p, cardDiscountPct: pct }))}
                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-colors ${form.cardDiscountPct === pct ? "bg-[#3374B5] text-white" : "bg-[#3374B5]/10 text-[#3374B5] hover:bg-[#3374B5]/20"}`}
                    >{pct}%</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <button
            disabled={isPending || !form.name || !form.email || !form.suiteNumber}
            onClick={handleSubmit}
            className="w-full py-3 rounded-xl text-white font-black text-sm disabled:opacity-40 transition-colors"
            style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
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
