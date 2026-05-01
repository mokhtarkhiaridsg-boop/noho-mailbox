"use client";

/**
 * Barcode-scan an ID using the device camera. Designed for admin to scan the
 * back of US driver's licenses / state IDs (PDF417, AAMVA-encoded), but also
 * works with QR codes and Code 128 / 39 barcodes.
 *
 * Uses the browser's native BarcodeDetector when available (Chrome / Edge /
 * mobile Safari 17+). Falls back to telling the admin to type manually if
 * the API isn't supported.
 *
 * On a successful scan we parse AAMVA for US driver's licenses and call
 * onScanned() with as many fields as we can extract; admin can edit before
 * saving.
 */
import { useEffect, useRef, useState } from "react";

export type ScannedIdData = {
  raw: string;
  number?: string;
  expDate?: string; // YYYY-MM-DD
  issuer?: string; // state / country
  fullName?: string;
};

type Props = {
  label?: string;
  onScanned: (data: ScannedIdData) => void;
};

// AAMVA element IDs we care about. Full spec at:
// https://www.aamva.org/getmedia/AAMVA-DL-ID-Card-Design-Standard-2020.pdf
function parseAamva(raw: string): ScannedIdData {
  const out: ScannedIdData = { raw };
  // Records start with "DL" subfile then element codes "DBA", "DAQ", etc.
  // Each field is "XXX<value>\n" or "XXX<value>" terminated by line/record sep.
  const get = (code: string) => {
    const re = new RegExp(`${code}([^\\n\\r]+)`);
    const m = raw.match(re);
    return m ? m[1].trim() : undefined;
  };

  const number = get("DAQ"); // license / ID number
  const expRaw = get("DBA"); // expiration date MMDDYYYY or YYYYMMDD
  const issuerCode = get("DAJ") || get("DCG"); // issuing state/country
  const last = get("DCS");
  const first = get("DAC") || get("DCT");

  if (number) out.number = number;
  if (last && first) out.fullName = `${first} ${last}`.trim();

  if (expRaw) {
    // Most US licenses use MMDDYYYY; some Canadian use YYYYMMDD.
    if (/^\d{8}$/.test(expRaw)) {
      const a = expRaw.slice(0, 4);
      if (parseInt(a, 10) > 1900) {
        // YYYYMMDD
        out.expDate = `${expRaw.slice(0, 4)}-${expRaw.slice(4, 6)}-${expRaw.slice(6, 8)}`;
      } else {
        // MMDDYYYY
        out.expDate = `${expRaw.slice(4, 8)}-${expRaw.slice(0, 2)}-${expRaw.slice(2, 4)}`;
      }
    }
  }
  if (issuerCode) out.issuer = issuerCode;
  return out;
}

export function IdScanButton({ label = "Scan ID", onScanned }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const stopRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!open) return;

    let stopped = false;
    let stream: MediaStream | null = null;
    let raf = 0;

    async function start() {
      // 1) Confirm BarcodeDetector exists. PDF417 is what DLs use.
      type BD = {
        new (opts: { formats: string[] }): { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
      };
      const Detector =
        (globalThis as unknown as { BarcodeDetector?: BD }).BarcodeDetector;

      if (!Detector) {
        setError(
          "This browser doesn't support barcode scanning. Use Chrome on Android / desktop, or Safari 17+ on iOS, or type the number manually.",
        );
        return;
      }

      let detector: { detect: (src: CanvasImageSource) => Promise<Array<{ rawValue: string }>> };
      try {
        detector = new Detector({
          formats: ["pdf417", "qr_code", "code_128", "code_39", "data_matrix", "aztec"],
        });
      } catch {
        setError("Barcode scanning failed to initialize.");
        return;
      }

      // 2) Get camera (rear-facing if possible).
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch {
        setError("Couldn't access the camera. Allow the camera permission and try again.");
        return;
      }

      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play().catch(() => {});

      const tick = async () => {
        if (stopped || !videoRef.current) return;
        try {
          const codes = await detector.detect(videoRef.current);
          if (codes && codes.length > 0) {
            const raw = codes[0].rawValue ?? "";
            // AAMVA payloads start with "@\n\rANSI " or include "ANSI ". If we
            // see ANSI we parse; otherwise pass the raw value as the number.
            if (raw.includes("ANSI ")) {
              onScanned(parseAamva(raw));
            } else {
              onScanned({ raw, number: raw });
            }
            stopRef.current?.();
            setOpen(false);
            return;
          }
        } catch {
          // ignore detection errors
        }
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }

    stopRef.current = () => {
      stopped = true;
      if (raf) cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
    };

    start();
    return () => {
      stopRef.current?.();
    };
  }, [open, onScanned]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold border-2 border-[#337485] text-[#337485] hover:bg-[#337485]/10 transition-colors"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="6" width="18" height="12" rx="1" />
          <path d="M7 9v6M10 9v6M13 9v6M16 9v6M19 9v6" />
        </svg>
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[200] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)" }}
          onClick={() => {
            stopRef.current?.();
            setOpen(false);
          }}
        >
          <div
            className="bg-black rounded-2xl overflow-hidden w-full max-w-md"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-4 py-3 flex items-center justify-between text-white text-sm font-bold">
              <span>📷 Aim at the barcode on the back of the ID</span>
              <button
                onClick={() => {
                  stopRef.current?.();
                  setOpen(false);
                }}
                className="text-white/60 hover:text-white text-xl leading-none"
                aria-label="Close scanner"
              >
                ✕
              </button>
            </div>

            {error ? (
              <div className="px-4 py-6 text-white/85 text-sm leading-relaxed bg-black">
                {error}
              </div>
            ) : (
              <div className="relative">
                <video
                  ref={videoRef}
                  playsInline
                  muted
                  className="w-full h-auto block"
                />
                <canvas ref={canvasRef} className="hidden" />
                {/* Aim guides */}
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className="border-2 border-[#337485] rounded-xl w-[80%] h-24 opacity-80" />
                </div>
              </div>
            )}

            <div className="px-4 py-3 text-[11px] text-white/55">
              Driver licenses / state IDs use PDF417 on the back. The scan will
              auto-fill the ID number, expiration, and issuer when readable.
            </div>
          </div>
        </div>
      )}
    </>
  );
}
