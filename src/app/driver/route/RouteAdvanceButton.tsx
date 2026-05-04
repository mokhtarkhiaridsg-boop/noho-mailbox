"use client";

// iter-97 — Tap-to-advance button for the driver route. Pending →
// Picked Up → In Transit. Once In Transit, the parent renders a
// "Deliver →" link to /driver/deliver/[id] instead.

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { advanceDeliveryStatus } from "@/app/actions/driver";

export default function RouteAdvanceButton({ id, currentStatus }: { id: string; currentStatus: string }) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const nextLabel =
    currentStatus === "Pending" ? "Picked up at NOHO ✓"
    : currentStatus === "Picked Up" ? "Start drive →"
    : "Advance";

  function go() {
    startTransition(async () => {
      const res = await advanceDeliveryStatus(id);
      if ((res as { error?: string }).error) {
        alert((res as { error?: string }).error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <button
      type="button"
      onClick={go}
      disabled={pending}
      style={{
        flex: 2,
        minWidth: 140,
        padding: "10px 14px",
        borderRadius: 10,
        background: pending ? "#F5A623" : "linear-gradient(135deg, #337485, #23596A)",
        color: "white",
        border: "none",
        fontWeight: 900,
        fontSize: 13,
        cursor: pending ? "wait" : "pointer",
      }}
    >
      {pending ? "…" : nextLabel}
    </button>
  );
}
