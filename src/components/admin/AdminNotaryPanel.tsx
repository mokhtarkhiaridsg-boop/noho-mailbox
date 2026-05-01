"use client";

import { StatusBadge } from "./StatusBadge";
import type { NotaryItem } from "./types";

type Props = {
  notaryQueue: NotaryItem[];
  isPending: boolean;
  handleNotaryAction: (bookingId: string, status: string) => void;
  setShowNewApptModal: (show: boolean) => void;
};

export function AdminNotaryPanel({ notaryQueue, isPending, handleNotaryAction, setShowNewApptModal }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Notary Appointments</h2>
        <button
          onClick={() => setShowNewApptModal(true)}
          className="px-4 py-2.5 rounded-xl text-sm font-black text-white"
          style={{ background: "linear-gradient(135deg, #337485, #23596A)", boxShadow: "0 2px 10px rgba(51,116,133,0.3)" }}
        >
          + New Appointment
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {notaryQueue.length === 0 && (
          <div className="md:col-span-2 rounded-2xl bg-white border border-border-light/60 px-6 py-12 text-center">
            <p className="text-sm font-bold text-text-light/60">No notary appointments yet</p>
            <p className="text-xs text-text-light/45 mt-1">Bookings come in through /notary or by phone — they'll show up here as soon as a customer schedules.</p>
          </div>
        )}
        {notaryQueue.map((n) => (
          <div
            key={n.id}
            className="rounded-2xl p-6 bg-white"
            style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)", border: "1px solid rgba(232,229,224,0.5)" }}
          >
            <div className="flex items-center justify-between mb-3">
              <p className="font-black text-text-light">{n.customerName}</p>
              <StatusBadge status={n.status} />
            </div>
            <div className="space-y-1.5 text-sm text-text-light/55">
              <p>📅 {n.date} at {n.time}</p>
              <p>📋 {n.type}</p>
            </div>
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleNotaryAction(n.id, "Completed")}
                disabled={isPending}
                className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl text-white disabled:opacity-40"
                style={{ background: "linear-gradient(135deg, #337485, #23596A)" }}
              >
                Complete
              </button>
              <button
                onClick={() => handleNotaryAction(n.id, "Cancelled")}
                disabled={isPending}
                className="flex-1 text-center text-xs font-bold py-2.5 rounded-xl text-text-light disabled:opacity-40"
                style={{ border: "1px solid rgba(232,229,224,0.7)" }}
              >
                Reschedule
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
