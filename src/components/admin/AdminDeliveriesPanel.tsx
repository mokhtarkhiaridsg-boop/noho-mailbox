"use client";

import { StatusBadge } from "./StatusBadge";
import type { DeliveryOrder } from "./types";

type Props = {
  deliveryOrders: DeliveryOrder[];
  isPending: boolean;
  handleDeliveryStatus: (orderId: string, status: string, courier?: string) => void;
};

export function AdminDeliveriesPanel({ deliveryOrders, isPending, handleDeliveryStatus }: Props) {
  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "TOTAL DELIVERIES", value: String(deliveryOrders.length), sub: `${deliveryOrders.filter(d => d.status === "Pending").length} pending` },
          { label: "IN TRANSIT", value: String(deliveryOrders.filter(d => d.status === "In Transit").length), sub: "Active" },
          { label: "COMPLETED", value: String(deliveryOrders.filter(d => d.status === "Delivered").length), sub: "Delivered" },
          { label: "DELIVERY REVENUE", value: `$${deliveryOrders.reduce((sum, d) => sum + d.price, 0).toFixed(2)}`, sub: "All time" },
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
          <h3 className="font-black text-sm uppercase text-text-light">Delivery Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#FAFAF7] text-left">
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Customer</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Destination</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Zone</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Price</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Courier</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Status</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Date</th>
                <th className="px-5 py-3 text-[10px] font-bold uppercase tracking-wider text-text-light/40">Update</th>
              </tr>
            </thead>
            <tbody>
              {deliveryOrders.map((d) => (
                <tr key={d.id} className="border-t border-border-light/50 hover:bg-[#FAFAF7] transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-bold text-text-light">{d.customerName}</span>
                    <span className="text-text-light/40 ml-1">#{d.suiteNumber}</span>
                  </td>
                  <td className="px-5 py-3 text-text-light/70 text-xs">{d.destination}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-bold ${d.zone === "NoHo" ? "text-accent" : "text-text-light/60"}`}>{d.zone}</span>
                  </td>
                  <td className="px-5 py-3 font-bold text-text-light">${d.price.toFixed(2)}</td>
                  <td className="px-5 py-3 text-xs text-text-light/60">{d.courier}</td>
                  <td className="px-5 py-3"><StatusBadge status={d.status} /></td>
                  <td className="px-5 py-3 text-xs text-text-light/40">{d.date}</td>
                  <td className="px-5 py-3">
                    <select
                      value={d.status}
                      onChange={(e) => handleDeliveryStatus(d.id, e.target.value)}
                      disabled={isPending}
                      className="text-[10px] font-bold rounded-lg px-2 py-1 border border-[#e8e5e0] bg-white focus:outline-none focus:ring-1 focus:ring-[#3374B5]"
                    >
                      <option value="Pending">Pending</option>
                      <option value="Picked Up">Picked Up</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Delivered">Delivered</option>
                    </select>
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
