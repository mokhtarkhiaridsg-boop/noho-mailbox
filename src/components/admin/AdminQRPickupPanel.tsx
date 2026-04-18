"use client";

import { useState, useRef, useTransition } from "react";
import { processPickupByToken } from "@/app/actions/qrPickup";

type PickupResult = {
  success: boolean;
  user?: { id: string; name: string; suiteNumber: string | null };
  pickedUp?: number;
  items?: { id: string; from: string; type: string; status: string }[];
  error?: string;
};

export function AdminQRPickupPanel() {
  const [token, setToken] = useState("");
  const [result, setResult] = useState<PickupResult | null>(null);
  const [pending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  function process() {
    const cleaned = token.trim().toUpperCase();
    if (!cleaned) return;

    setResult(null);
    startTransition(async () => {
      const res = await processPickupByToken(cleaned);
      setResult(res as PickupResult);
      if ((res as any).success) {
        setToken("");
        inputRef.current?.focus();
      }
    });
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-black text-gray-900">Express QR Pickup</h2>
        <p className="text-xs text-gray-500">Scan member QR or enter their pickup code to mark mail collected</p>
      </div>

      {/* Token input — designed for barcode scanner / keyboard entry */}
      <div
        className="rounded-2xl p-6 space-y-4"
        style={{ background: "rgba(51,116,181,0.05)", border: "2px dashed rgba(51,116,181,0.3)" }}
      >
        <p className="text-xs font-black text-center text-blue-800 uppercase tracking-wider">
          Scan QR or Enter Code
        </p>
        <div className="flex gap-2">
          <input
            ref={inputRef}
            value={token}
            onChange={(e) => setToken(e.target.value.toUpperCase())}
            onKeyDown={(e) => { if (e.key === "Enter") process(); }}
            placeholder="XXXXXXXX"
            className="flex-1 font-mono font-black text-2xl tracking-[0.3em] text-center rounded-2xl px-4 py-3"
            style={{ background: "white", border: "2px solid rgba(51,116,181,0.3)", color: "#1e3a5f" }}
            autoFocus
            maxLength={8}
          />
          <button
            disabled={!token.trim() || pending}
            onClick={process}
            className="px-5 py-3 rounded-2xl text-sm font-black text-white disabled:opacity-40"
            style={{ background: "#3374B5" }}
          >
            {pending ? "…" : "Process"}
          </button>
        </div>
        <p className="text-[11px] text-center text-gray-400">
          Barcode scanner will auto-submit · Press Enter to confirm
        </p>
      </div>

      {/* Result */}
      {result && (
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{
            background: result.success ? "rgba(22,163,74,0.06)" : "rgba(220,38,38,0.06)",
            border: `2px solid ${result.success ? "rgba(22,163,74,0.3)" : "rgba(220,38,38,0.3)"}`,
          }}
        >
          {result.error ? (
            <div className="text-center">
              <p className="text-2xl mb-2">❌</p>
              <p className="font-black text-red-700">{result.error}</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{result.pickedUp! > 0 ? "✅" : "ℹ️"}</span>
                <div>
                  <p className="font-black text-gray-900 text-lg">{result.user?.name}</p>
                  {result.user?.suiteNumber && (
                    <p className="text-sm text-gray-500">Suite {result.user.suiteNumber}</p>
                  )}
                </div>
              </div>

              {result.pickedUp! > 0 ? (
                <>
                  <div
                    className="rounded-xl px-4 py-2.5 font-black text-green-800 text-sm"
                    style={{ background: "rgba(22,163,74,0.12)" }}
                  >
                    ✓ {result.pickedUp} item{result.pickedUp !== 1 ? "s" : ""} marked as Picked Up
                  </div>

                  <div className="space-y-1.5">
                    {result.items?.map((item) => (
                      <div key={item.id} className="flex items-center gap-2 text-sm">
                        <span>{item.type === "Package" ? "📦" : "✉️"}</span>
                        <span className="text-gray-700 truncate">{item.from}</span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-sm text-gray-600 text-center">
                  No items awaiting pickup for this customer.
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* How to use */}
      <div className="rounded-2xl p-4 text-xs" style={{ background: "rgba(51,116,181,0.06)", border: "1px solid rgba(51,116,181,0.15)" }}>
        <p className="font-black text-blue-900 mb-1.5">How it works</p>
        <ol className="list-decimal pl-4 space-y-1 text-gray-600">
          <li>Member opens their dashboard → Express Pickup tab → shows QR code</li>
          <li>Admin scans QR or types the 8-character code above</li>
          <li>All pending mail is instantly marked Picked Up</li>
          <li>No paper slips or signature pads needed</li>
        </ol>
      </div>
    </div>
  );
}
