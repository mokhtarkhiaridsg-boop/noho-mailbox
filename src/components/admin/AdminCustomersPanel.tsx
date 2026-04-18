"use client";

import { StatusBadge } from "./StatusBadge";
import type { Customer } from "./types";

type Props = {
  customers: Customer[];
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  setShowAddCustomerModal: (show: boolean) => void;
  openCustomer: (c: Customer) => void;
};

export function AdminCustomersPanel({
  customers,
  searchQuery,
  setSearchQuery,
  setShowAddCustomerModal,
  openCustomer,
}: Props) {
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.suiteNumber.includes(searchQuery)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Customers</h2>
        <div className="flex gap-3">
          <input
            type="text"
            placeholder="Search name, email, suite..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2.5 rounded-xl text-sm border focus:outline-none focus:ring-2 focus:ring-[#3374B5] bg-white"
            style={{ borderColor: "rgba(232,229,224,0.7)" }}
          />
          <button
            onClick={() => setShowAddCustomerModal(true)}
            className="px-4 py-2.5 rounded-xl text-sm font-black text-white"
            style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
          >
            + Add Customer
          </button>
        </div>
      </div>

      <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(232,229,224,0.4)", borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
                <th className="text-left px-5 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Customer</th>
                <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Suite</th>
                <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Plan</th>
                <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Status</th>
                <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Mail</th>
                <th className="text-left px-4 py-3 font-black text-[10px] uppercase tracking-widest text-text-light/50">Joined</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map((c, i) => (
                <tr key={c.id} className="hover:bg-bg-light/10 transition-colors" style={{ borderBottom: i < filteredCustomers.length - 1 ? "1px solid rgba(232,229,224,0.3)" : "none" }}>
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-text-light">{c.name}</p>
                    <p className="text-[10px] text-text-light/35">{c.email}</p>
                  </td>
                  <td className="px-4 py-3.5 font-bold text-text-light">#{c.suiteNumber}</td>
                  <td className="px-4 py-3.5">
                    <span
                      className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
                      style={{
                        background: c.plan === "Premium" ? "rgba(26,23,20,0.08)" : c.plan === "Business" ? "rgba(51,116,181,0.1)" : "rgba(232,229,224,0.5)",
                        color: c.plan === "Premium" ? "#1A1714" : c.plan === "Business" ? "#3374B5" : "#1A1714",
                      }}
                    >
                      {c.plan}
                    </span>
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <StatusBadge status={c.status} />
                      {(c.securityDepositCents ?? 0) === 0 && (
                        <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">DEPOSIT REQ</span>
                      )}
                      {c.planDueDate && new Date(c.planDueDate) < new Date() && (
                        <span className="text-[9px] font-bold text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">OVERDUE</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-text-light/50">{c.mailCount} mail · {c.packageCount} pkg</td>
                  <td className="px-4 py-3.5 text-xs text-text-light/40">{new Date(c.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openCustomer(c)} className="text-xs font-bold text-accent hover:underline">View</button>
                      <span className="text-text-light/20">|</span>
                      <button
                        onClick={() => openCustomer(c)}
                        className="text-xs font-bold text-white bg-[#3374B5] hover:bg-[#2960a0] px-2.5 py-1 rounded-lg transition-colors"
                      >
                        Edit
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
