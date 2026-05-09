/**
 * iter-155 — Per-station printer preferences (Tier 9 #65).
 *
 * Each admin browser/tablet picks its own preferred printers (label,
 * receipt) — stored in localStorage so the OS print dialog defaults
 * to the right device without the admin re-picking every time.
 *
 * The browser exposes the print dialog with the system default; we
 * can't programmatically select a printer (security boundary), but we
 * can show the admin which one they SHOULD pick + remember the name
 * across sessions so the muscle memory matches.
 */

export type PrintStationPrefs = {
  stationName: string;          // friendly station label (e.g. "Counter A")
  receiptPrinter: string;       // OS printer name admin selects in the dialog
  labelPrinter: string;         // OS printer name for 4×6 labels
};

const KEY = "noho-print-station-v1";

export function getPrintStationPrefs(): PrintStationPrefs {
  if (typeof window === "undefined") return { stationName: "", receiptPrinter: "", labelPrinter: "" };
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return { stationName: "", receiptPrinter: "", labelPrinter: "" };
    const j = JSON.parse(raw) as Partial<PrintStationPrefs>;
    return {
      stationName: typeof j.stationName === "string" ? j.stationName : "",
      receiptPrinter: typeof j.receiptPrinter === "string" ? j.receiptPrinter : "",
      labelPrinter: typeof j.labelPrinter === "string" ? j.labelPrinter : "",
    };
  } catch {
    return { stationName: "", receiptPrinter: "", labelPrinter: "" };
  }
}

export function setPrintStationPrefs(prefs: PrintStationPrefs) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(prefs));
  } catch { /* quota — ignore */ }
}
