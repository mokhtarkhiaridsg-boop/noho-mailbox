"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { updateMailStatus, setScanImage } from "@/app/actions/mail";
import { StatusBadge } from "./StatusBadge";
import type { MailItem, Customer } from "./types";

type LogMailForm = {
  suite: string;
  from: string;
  type: string;
  recipientName: string;
  recipientPhone: string;
  exteriorImageUrl: string;
};

type Props = {
  recentMail: MailItem[];
  customers: Customer[];
  mailFilter: string;
  setMailFilter: (f: string) => void;
  setShowLogMailModal: (show: boolean) => void;
  setLogMailForm: React.Dispatch<React.SetStateAction<LogMailForm>>;
  isPending: boolean;
  handleMailAction: (itemId: string, newStatus: string) => void;
  handleScanUpload: (mailItemId: string, file: File) => Promise<void>;
};

export function AdminMailPanel({
  recentMail,
  customers,
  mailFilter,
  setMailFilter,
  setShowLogMailModal,
  setLogMailForm,
  isPending,
  handleMailAction,
  handleScanUpload,
}: Props) {
  const filteredMail = mailFilter === "All"
    ? recentMail
    : recentMail.filter((m) => m.status === mailFilter);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="font-black text-lg uppercase tracking-wide text-text-light">Mail & Packages</h2>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setLogMailForm({ suite: "", from: "", type: "Letter", recipientName: "", recipientPhone: "", exteriorImageUrl: "" });
              setShowLogMailModal(true);
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-black text-white"
            style={{ background: "linear-gradient(135deg, #3374B5, #2055A0)", boxShadow: "0 2px 10px rgba(51,116,181,0.3)" }}
          >
            + Log Mail
          </button>
          <button
            onClick={() => {
              setLogMailForm({ suite: "", from: "", type: "Package", recipientName: "", recipientPhone: "", exteriorImageUrl: "" });
              setShowLogMailModal(true);
            }}
            className="px-4 py-2.5 rounded-xl text-sm font-bold text-text-light bg-white"
            style={{ border: "1px solid rgba(232,229,224,0.7)" }}
          >
            + Log Package
          </button>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {["All", "Scan Requested", "Forward Requested", "Discard Requested", "Pickup Requested", "Awaiting Pickup", "Scanned", "Forwarded", "Held"].map((f) => (
          <button
            key={f}
            onClick={() => setMailFilter(f)}
            className="px-3.5 py-2 rounded-full text-xs font-bold transition-all"
            style={{
              background: mailFilter === f ? "#1A1714" : "white",
              color: mailFilter === f ? "#FAFAF8" : "rgba(26,23,20,0.6)",
              boxShadow: "0 1px 3px rgba(26,23,20,0.04)",
            }}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden bg-white" style={{ boxShadow: "0 1px 3px rgba(26,23,20,0.04), 0 4px 12px rgba(26,23,20,0.05)" }}>
        {filteredMail.map((m, i) => (
          <div
            key={m.id}
            className="flex items-center justify-between px-5 py-4 hover:bg-bg-light/15 transition-colors"
            style={{ borderBottom: i < filteredMail.length - 1 ? "1px solid rgba(232,229,224,0.35)" : "none" }}
          >
            <div className="flex items-center gap-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: m.type === "Package" ? "linear-gradient(135deg, #3374B5, #1e4d8c)" : "linear-gradient(135deg, #EBF2FA, #D4E4F4)" }}
              >
                {m.type === "Package" ? "📦" : "✉️"}
              </div>
              <div>
                <p className="text-sm font-bold text-text-light">{m.from}</p>
                <p className="text-xs text-text-light/40">To: {m.customerName} (Suite #{m.suiteNumber}) · {m.date}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <StatusBadge status={m.status} />
              <div className="flex gap-1">
                {m.status.includes("Requested") && (
                  <button
                    onClick={() => {
                      const target =
                        m.status === "Scan Requested"
                          ? "Scanned"
                          : m.status === "Forward Requested"
                          ? "Forwarded"
                          : m.status === "Discard Requested"
                          ? "Picked Up"
                          : "Awaiting Pickup";
                      handleMailAction(m.id, target);
                    }}
                    disabled={isPending}
                    className="px-3 h-8 rounded-lg text-[10px] font-black text-white hover:opacity-90 transition-opacity disabled:opacity-40"
                    style={{ background: "linear-gradient(135deg, #3374B5, #1e4d8c)" }}
                    title="Fulfill request"
                  >
                    FULFILL
                  </button>
                )}
                <label
                  title="Upload scan image"
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs hover:bg-blue-50 transition-colors cursor-pointer"
                >
                  <svg className="w-3.5 h-3.5 text-[#3374B5]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleScanUpload(m.id, f); }} />
                </label>
                <button
                  onClick={() => handleMailAction(m.id, "Scanned")}
                  disabled={isPending}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs hover:bg-bg-light/40 transition-colors disabled:opacity-40"
                  title="Mark Scanned"
                >SCN</button>
                <button
                  onClick={() => handleMailAction(m.id, "Forwarded")}
                  disabled={isPending}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs hover:bg-bg-light/40 transition-colors disabled:opacity-40"
                  title="Mark Forwarded"
                >FWD</button>
                <button
                  onClick={() => handleMailAction(m.id, "Picked Up")}
                  disabled={isPending}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-xs hover:bg-bg-light/40 transition-colors disabled:opacity-40"
                  title="Mark Picked Up"
                >✓</button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
