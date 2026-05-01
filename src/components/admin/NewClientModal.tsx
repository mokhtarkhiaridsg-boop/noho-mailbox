"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createBusinessClient } from "@/app/actions/businessClients";

type ClientForm = {
  name: string;
  email: string;
  phone: string;
  package: string;
};

type Props = {
  clientForm: ClientForm;
  setClientForm: React.Dispatch<React.SetStateAction<ClientForm>>;
  onClose: () => void;
};

const PACKAGE_PRICES: Record<string, number> = {
  "Full Package": 200000,       // $2,000
  "Formation Only": 50000,       // $500
  "Branding Only": 75000,        // $750
  "Website Only": 100000,        // $1,000
  "Brand Management": 150000,    // $1,500
  "Custom": 0,
};

export function NewClientModal({ clientForm, setClientForm, onClose }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  function handleSubmit() {
    setErr(null);
    if (!clientForm.name || !clientForm.email) return;
    startTransition(async () => {
      const res = await createBusinessClient({
        name: clientForm.name,
        email: clientForm.email,
        phone: clientForm.phone || undefined,
        package: clientForm.package,
        priceCents: PACKAGE_PRICES[clientForm.package] ?? 0,
      });
      if (res?.error) {
        setErr(res.error);
        return;
      }
      setClientForm({ name: "", email: "", phone: "", package: "Full Package" });
      onClose();
      router.refresh();
    });
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 space-y-4" style={{ boxShadow: "0 8px 40px rgba(26,23,20,0.2)" }}>
        <h3 className="font-black text-lg uppercase tracking-wide text-text-light">New Business Client</h3>
        {err && <div className="rounded-lg bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700 font-semibold">{err}</div>}
        <div className="space-y-3">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Business / Client Name</label>
            <input type="text" value={clientForm.name} onChange={(e) => setClientForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Sunrise Bakery" className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Email</label>
            <input type="email" value={clientForm.email} onChange={(e) => setClientForm((p) => ({ ...p, email: e.target.value }))} placeholder="email@business.com" className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Phone</label>
            <input type="tel" value={clientForm.phone} onChange={(e) => setClientForm((p) => ({ ...p, phone: e.target.value }))} placeholder="(818) 555-0000" className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485]" />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-text-light/50 mb-1 block">Package</label>
            <select value={clientForm.package} onChange={(e) => setClientForm((p) => ({ ...p, package: e.target.value }))} className="w-full rounded-xl border border-border-light px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#337485] bg-white">
              <option value="Full Package">Full Package ($2,000)</option>
              <option value="Formation Only">Business Formation ($500)</option>
              <option value="Branding Only">Brand Identity & Design ($750)</option>
              <option value="Website Only">Website Development ($1,000)</option>
              <option value="Brand Management">Brand Management ($1,500)</option>
              <option value="Custom">Custom Package</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <button
            onClick={handleSubmit}
            disabled={pending || !clientForm.name || !clientForm.email}
            className="flex-1 px-4 py-2.5 rounded-xl text-sm font-black text-white disabled:opacity-40"
            style={{ background: "linear-gradient(135deg, #337485, #23596A)", boxShadow: "0 2px 10px rgba(51,116,133,0.3)" }}
          >
            {pending ? "Adding…" : "Add Client"}
          </button>
          <button onClick={onClose} disabled={pending} className="flex-1 px-4 py-2.5 rounded-xl text-sm font-bold text-text-light disabled:opacity-50" style={{ border: "1px solid rgba(232,229,224,0.7)" }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
