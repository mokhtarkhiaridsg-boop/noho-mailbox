"use client";

import { StatusBadge } from "./StatusBadge";
import type { ShopOrder } from "./types";

type Props = {
  shopOrders: ShopOrder[];
};

export function AdminShopPanel({ shopOrders }: Props) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "TOTAL ORDERS", value: String(shopOrders.length), sub: `${shopOrders.filter(o => o.status === "Pending").length} pending` },
          { label: "PENDING PICKUP", value: String(shopOrders.filter(o => o.status === "Ready").length), sub: "Ready" },
          { label: "COMPLETED", value: String(shopOrders.filter(o => o.status === "Completed").length), sub: "Fulfilled" },
          { label: "SHOP REVENUE", value: `$${shopOrders.reduce((sum, o) => sum + o.total, 0).toFixed(2)}`, sub: "All time" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl p-5" style={{ boxShadow: "0 2px 8px rgba(26,23,20,0.06)" }}>
            <p className="text-2xl font-black text-text-light">{s.value}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-text-light/40 mt-1">{s.label}</p>
            <p className="text-xs text-accent mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: "0 2px 8px rgba(26,23,20,0.06)" }}>
        <div className="px-5 py-4 border-b border-border-light">
          <h3 className="font-black text-sm uppercase text-text-light">Shop Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAFAF7] text-left">
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Customer</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Items</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Total</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Status</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Date</th>
              </tr>
            </thead>
            <tbody>
              {shopOrders.map((o) => (
                <tr key={o.id} className="border-t border-border-light/50 hover:bg-[#FAFAF7] transition-colors">
                  <td className="px-5 py-3 font-bold text-text-light">{o.customerName}</td>
                  <td className="px-5 py-3 text-text-light/70 text-xs">{o.items}</td>
                  <td className="px-5 py-3 font-bold text-text-light">${o.total.toFixed(2)}</td>
                  <td className="px-5 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-5 py-3 text-xs text-text-light/40">{o.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
