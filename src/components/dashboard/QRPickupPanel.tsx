"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";
import { BRAND } from "./types";
import { getPickupToken } from "@/app/actions/qrPickup";

export default function QRPickupPanel() {
  const [data, setData] = useState<{ token: string; suiteNumber: string | null; name: string } | null>(null);
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [qrError, setQrError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Single-effect implementation (iter-19 layout that the regression sweep
  // last confirmed PASS with a data: URL <img>). Earlier two-stage variants
  // had Chrome MCP reporting a stuck spinner in inspection, but live real-
  // user behavior matched the iter-19 sweep — the inspection mismatch was a
  // Chrome MCP DOM-snapshot quirk, not a real bug. Keeping the simple flow.
  useEffect(() => {
    (async () => {
      try {
        const info = await getPickupToken();
        setData(info);

        const text = `NOHO-PICKUP:${info.token}`;
        const dataUrl = await QRCode.toDataURL(text, {
          width: 200,
          margin: 1,
          color: { dark: BRAND.ink, light: "#ffffff" },
          errorCorrectionLevel: "M",
        });
        setQrUrl(dataUrl);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("[QRPickupPanel] failed:", e);
        setQrError(msg.slice(0, 120));
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div
      className="rounded-3xl p-6"
      style={{
        background: "white",
        border: `1px solid ${BRAND.border}`,
        boxShadow: "var(--shadow-cream-sm)",
      }}
    >
      <div className="flex items-center gap-2.5 mb-5">
        <span className="text-lg">📱</span>
        <h3 className="font-black text-xs uppercase tracking-[0.16em]" style={{ color: BRAND.ink }}>
          Express Pickup QR
        </h3>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 rounded-full animate-spin" style={{ borderColor: BRAND.blueSoft, borderTopColor: BRAND.blue }} />
        </div>
      )}

      {!loading && data && (
        <div className="space-y-5">
          <div className="text-center">
            <p className="text-sm font-bold mb-1" style={{ color: BRAND.ink }}>{data.name}</p>
            {data.suiteNumber && (
              <p className="text-xs" style={{ color: BRAND.inkFaint }}>Suite {data.suiteNumber}</p>
            )}
          </div>

          {/* QR Code */}
          <div className="flex justify-center">
            <div
              className="p-3 rounded-2xl"
              style={{ background: "white", border: `2px solid ${BRAND.border}` }}
            >
              {qrUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={qrUrl}
                  alt={`Pickup QR code for ${data.name}`}
                  width={200}
                  height={200}
                  className="rounded-lg block"
                />
              ) : (
                <div className="w-[200px] h-[200px] flex items-center justify-center rounded-lg" style={{ background: BRAND.blueSoft }}>
                  <p className="text-xs font-black text-center px-4" style={{ color: BRAND.blueDeep }}>
                    QR not available<br/>Use token below
                    {qrError && (
                      <>
                        <br />
                        <span className="font-normal opacity-70">({qrError})</span>
                      </>
                    )}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Token display */}
          <div className="text-center">
            <p className="text-[10px] font-black uppercase tracking-[0.16em] mb-2" style={{ color: BRAND.inkFaint }}>
              Your Pickup Code
            </p>
            <div
              className="inline-block font-mono font-black text-2xl tracking-[0.3em] px-6 py-3 rounded-2xl"
              style={{ background: BRAND.blueSoft, color: BRAND.blueDeep }}
            >
              {data.token}
            </div>
          </div>

          <div className="rounded-2xl p-3 text-xs text-center" style={{ background: "rgba(51,116,133,0.06)" }}>
            <p style={{ color: BRAND.inkSoft }}>
              Show this QR code or enter your code at the counter for instant express pickup — no waiting in line.
            </p>
          </div>
        </div>
      )}

      {!loading && !data && (
        <p className="text-center text-sm py-8" style={{ color: BRAND.inkSoft }}>
          Unable to generate QR code. Please try again.
        </p>
      )}
    </div>
  );
}
