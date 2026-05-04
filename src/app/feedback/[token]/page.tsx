// iter-92 — Public pickup feedback page.
//
// Token-gated, no login. Customer lands here from the pickup-confirm
// email's "★★★★★ Rate your pickup" button. SSR fetches the survey row
// + a small client island handles the star picker + submit.

import Link from "next/link";
import { notFound } from "next/navigation";
import { getSurveyByToken } from "@/app/actions/pickupSurvey";
import FeedbackForm from "./FeedbackForm";

export const dynamic = "force-dynamic";

export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const res = await getSurveyByToken(token);
  if ((res as { error?: string }).error || !(res as { row: unknown }).row) return notFound();
  const row = (res as { row: NonNullable<Awaited<ReturnType<typeof getSurveyByToken>>["row"]> }).row;
  const item = (res as { item: Awaited<ReturnType<typeof getSurveyByToken>>["item"] }).item;

  const alreadySubmitted = !!row.submittedAt;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#F8F2EA",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        color: "#2D100F",
        padding: "32px 16px",
      }}
    >
      <div
        style={{
          maxWidth: 480,
          margin: "0 auto",
          background: "white",
          border: "1px solid rgba(45,16,15,0.10)",
          borderRadius: 20,
          padding: 28,
          boxShadow: "0 6px 18px rgba(45,16,15,0.08)",
        }}
      >
        <Link
          href="/"
          style={{ display: "inline-block", padding: "4px 10px", borderRadius: 6, border: "1px solid rgba(45,16,15,0.10)", color: "#2D100F", textDecoration: "none", fontWeight: 700, fontSize: 11, marginBottom: 16 }}
        >
          ← NOHO Mailbox
        </Link>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.20em", textTransform: "uppercase", color: "#23596A" }}>
          Pickup feedback
        </p>
        <h1 style={{ margin: "6px 0 0", fontSize: 24, fontWeight: 900, letterSpacing: "-0.01em" }}>
          How was your pickup?
        </h1>
        {item && (
          <p style={{ margin: "10px 0 0", fontSize: 13, color: "rgba(45,16,15,0.65)" }}>
            {item.from}
            {item.carrier && item.trackingNumber && (
              <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", marginLeft: 6, color: "#23596A" }}>
                · {item.carrier} {item.trackingNumber}
              </span>
            )}
          </p>
        )}

        {alreadySubmitted ? (
          <div style={{ marginTop: 24, padding: 20, borderRadius: 12, background: "rgba(22,163,74,0.06)", border: "1px solid rgba(22,163,74,0.30)" }}>
            <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#15803d" }}>
              Thanks · feedback received {row.rating ? `· ${"★".repeat(row.rating)}${"☆".repeat(5 - row.rating)}` : ""}
            </p>
            {row.comment && (
              <p style={{ margin: "8px 0 0", fontSize: 12, color: "rgba(45,16,15,0.65)", fontStyle: "italic" }}>
                "{row.comment}"
              </p>
            )}
            <p style={{ margin: "12px 0 0", fontSize: 12, color: "rgba(45,16,15,0.55)" }}>
              We log every response — your bureau team reads them. Thank you for taking the moment.
            </p>
          </div>
        ) : (
          <FeedbackForm token={token} />
        )}

        <p style={{ marginTop: 20, fontSize: 11, color: "rgba(45,16,15,0.45)" }}>
          5062 Lankershim Blvd · NoHo, CA 91601 · (818) 506-7744
        </p>
      </div>
    </div>
  );
}
