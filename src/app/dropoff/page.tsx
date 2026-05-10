// iter-176 — Public kiosk page for generating dropoff barcodes.
// No auth required — anyone in the lobby (or a member at home) can fill
// the form and get a printable barcode.

import KioskForm from "./KioskForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Drop off a package — NOHO Mailbox",
  description: "Generate a barcode receipt before you drop off a package at NOHO Mailbox so check-in is instant.",
};

export default function DropoffKioskPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F8F2EA", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', color: "#2D100F", padding: "32px 16px" }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: "#23596A", margin: 0 }}>
          NOHO Mailbox · Lobby kiosk
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", margin: "6px 0 4px" }}>
          Drop off a package
        </h1>
        <p style={{ fontSize: 14, color: "rgba(45,16,15,0.65)", margin: "0 0 22px", lineHeight: 1.5 }}>
          Fill out a few details and we'll print a barcode receipt.{" "}
          <strong style={{ color: "#2D100F" }}>Show it at the front desk</strong> — we scan it once and your dropoff is done.
        </p>
        <KioskForm />
      </div>
    </div>
  );
}
