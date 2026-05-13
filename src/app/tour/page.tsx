// iter-181 — Public mailbox-tour booking page (Tier 12 #90).
// No auth required. Submission flows to AuditLog + admin queue.

import TourForm from "./TourForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Book a tour",
  description: "Drop in for a 15-minute walkthrough of NOHO Mailbox's North Hollywood bureau. See the mailboxes, package room, notary station, and ask anything.",
};

export default function TourBookingPage() {
  return (
    <div style={{ minHeight: "100vh", background: "#F8F2EA", fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif', color: "#2D100F", padding: "32px 16px" }}>
      <div style={{ maxWidth: 540, margin: "0 auto" }}>
        <p style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: "#23596A", margin: 0 }}>
          NOHO Mailbox · Bureau tour
        </p>
        <h1 style={{ fontSize: 28, fontWeight: 900, letterSpacing: "-0.5px", margin: "6px 0 4px" }}>
          Drop in for 15 minutes
        </h1>
        <p style={{ fontSize: 14, color: "rgba(45,16,15,0.65)", margin: "0 0 22px", lineHeight: 1.5 }}>
          Skip the long welcome call. We'll show you the mailboxes, the package room, the notary station, and answer anything you've got.{" "}
          <strong style={{ color: "#2D100F" }}>No pressure</strong> — leave with your questions answered.
        </p>
        <TourForm />
      </div>
    </div>
  );
}
