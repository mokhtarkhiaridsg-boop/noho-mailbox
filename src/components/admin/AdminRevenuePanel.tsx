"use client";

import { StatusBadge } from "./StatusBadge";
import type { SquareStatus, PaymentRow, Customer } from "./types";

type Props = {
  squareStatus: SquareStatus;
  recentPayments: PaymentRow[];
  customers: Customer[];
};

export function AdminRevenuePanel({ squareStatus, recentPayments, customers }: Props) {
  return (
    <div className="space-y-6">
      <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Revenue</h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Total Revenue (Square)", value: `$${(squareStatus.totalRevenue / 100).toLocaleString("en-US", { minimumFractionDigits: 2 })}`, sub: `${squareStatus.totalPayments} payments synced` },
          { label: "Linked Customers", value: String(squareStatus.linkedCustomers), sub: `of ${customers.length} total` },
          { label: "Avg Per Payment", value: squareStatus.totalPayments > 0 ? `$${(squareStatus.totalRevenue / squareStatus.totalPayments / 100).toFixed(2)}` : "$0.00", sub: "Per transaction" },
        ].map((r) => (
          <div key={r.label} className="rounded-2xl p-6 bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
            <p className="text-xs font-bold uppercase tracking-wider text-text-light/35 mb-2">{r.label}</p>
            <p className="text-3xl font-black text-text-light">{r.value}</p>
            <p className="text-xs text-accent font-semibold mt-1">{r.sub}</p>
          </div>
        ))}
      </div>

      {/* Recent payments from Square */}
      <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid rgba(232,229,224,0.5)" }}>
          <h3 className="font-black text-sm uppercase tracking-wide text-text-light">Recent Payments</h3>
        </div>
        {recentPayments.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <p className="text-sm text-text-light/40">{squareStatus.configured ? "No payments synced yet. Go to the Square tab to sync." : "Connect Square to see payment data."}</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: "rgba(232,229,224,0.3)" }}>
            {recentPayments.map((p) => (
              <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-text-light">{p.userName ?? "Guest"}</p>
                  <p className="text-[10px] text-text-light/40">{p.sourceType ?? "N/A"} &middot; {new Date(p.squareCreatedAt).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-text-light">${(p.amount / 100).toFixed(2)}</p>
                  <StatusBadge status={p.status === "COMPLETED" ? "Completed" : p.status === "PENDING" ? "Pending" : p.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
