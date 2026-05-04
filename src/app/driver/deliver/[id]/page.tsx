// iter-97 — POD capture page. Driver arrives at destination, takes a
// photo of the package on the doorstep / handed off to the recipient,
// optionally types the recipient's name, and confirms.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getDeliveryForDriver } from "@/app/actions/driver";
import DeliverConfirmForm from "./DeliverConfirmForm";

export const dynamic = "force-dynamic";

const NOHO_INK = "#2D100F";
const NOHO_BLUE_DEEP = "#23596A";

export default async function DeliverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const res = await getDeliveryForDriver(id);
  if (res.error || !res.order) return notFound();
  const o = res.order;

  return (
    <div style={{ padding: "20px 14px 80px", color: NOHO_INK, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif' }}>
      <Link href="/driver/route" style={{ display: "inline-block", padding: "6px 10px", borderRadius: 8, border: "1px solid rgba(45,16,15,0.10)", color: NOHO_INK, textDecoration: "none", fontWeight: 700, fontSize: 12, marginBottom: 14 }}>
        ← Route
      </Link>

      <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: NOHO_BLUE_DEEP }}>
        Confirm delivery
      </p>
      <h1 style={{ margin: "4px 0 0", fontSize: 22, fontWeight: 900, letterSpacing: "-0.01em" }}>
        {o.customerName}
      </h1>
      <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(45,16,15,0.65)" }}>
        {o.destination} · {o.zip}
      </p>
      {o.instructions && (
        <p style={{ margin: "8px 0 0", padding: "8px 12px", background: "rgba(245,166,35,0.06)", border: "1px solid rgba(245,166,35,0.20)", borderRadius: 8, fontSize: 12, fontStyle: "italic", color: "#92400e" }}>
          Note: {o.instructions}
        </p>
      )}

      <div style={{ marginTop: 16 }}>
        <DeliverConfirmForm
          deliveryId={o.id}
          alreadyDelivered={o.status === "Delivered"}
          existingPodPhotoUrl={o.podPhotoUrl}
          existingRecipientName={o.recipientName}
        />
      </div>
    </div>
  );
}
