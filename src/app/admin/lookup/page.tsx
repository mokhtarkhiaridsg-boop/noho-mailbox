/**
 * iter-73: Universal package lookup. Admin types a tracking # (or a
 * fragment) and we return matching MailItems + ExternalDropoffs across
 * all history, plus the full audit trail for the matching MailItems.
 *
 * Used for "where's my package?" calls when the package is too old to be
 * in the InboundScanPanel's 48h windows.
 *
 * Pure SSR — `?q=` query string drives the search. No client component
 * needed because there's no interactive state beyond the form.
 */

import { lookupAnyPackage } from "@/app/actions/mail";
import Link from "next/link";

export const dynamic = "force-dynamic";

const NOHO_BLUE_DEEP = "#23596A";
const NOHO_INK = "#2D100F";

export default async function PackageLookupPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (rawQ ?? "").trim();
  const result = q.length >= 4 ? await lookupAnyPackage(q) : { mailItems: [], dropoffs: [], audit: [] };

  return (
    <div
      style={{
        maxWidth: 880,
        margin: "0 auto",
        padding: "24px 16px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        color: NOHO_INK,
      }}
    >
      <Link
        href="/admin?tab=shipping"
        style={{ display: "inline-block", padding: "6px 12px", borderRadius: 8, border: "1px solid #e8e5e0", color: NOHO_INK, textDecoration: "none", fontWeight: 700, fontSize: 12, background: "white", marginBottom: 16 }}
      >
        ← Shipping Center
      </Link>

      <h1 style={{ margin: 0, fontSize: 22, fontWeight: 900 }}>Package lookup</h1>
      <p style={{ margin: "4px 0 16px", fontSize: 12, color: "rgba(45,16,15,0.55)" }}>
        Type any tracking number (or last 4+ chars). Searches across customer mail intake AND external dropoffs across all history.
      </p>

      <form method="get" action="/admin/lookup" style={{ display: "flex", gap: 8, alignItems: "stretch", marginBottom: 24 }}>
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="e.g. 9400 1112 ... or 1Z123 ..."
          autoFocus
          style={{
            flex: 1,
            minWidth: 0,
            padding: "10px 14px",
            borderRadius: 12,
            border: "1px solid #e8e5e0",
            fontSize: 14,
            fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
            background: "white",
            color: NOHO_INK,
          }}
        />
        <button
          type="submit"
          style={{
            padding: "10px 18px",
            borderRadius: 12,
            border: "none",
            background: "linear-gradient(135deg, #337485, #23596A)",
            color: "white",
            fontWeight: 900,
            fontSize: 13,
            cursor: "pointer",
          }}
        >
          Search
        </button>
      </form>

      {q.length >= 4 && result.mailItems.length === 0 && result.dropoffs.length === 0 && (
        <div style={{ padding: "32px 24px", textAlign: "center", border: "1px dashed #e8e5e0", borderRadius: 16, color: "rgba(45,16,15,0.55)" }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>No packages match &quot;{q}&quot;</p>
          <p style={{ margin: "6px 0 0", fontSize: 12 }}>Try a longer fragment or check the carrier.</p>
        </div>
      )}

      {result.mailItems.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(45,16,15,0.40)" }}>
            Customer mail · {result.mailItems.length} match{result.mailItems.length === 1 ? "" : "es"}
          </p>
          <div style={{ marginTop: 8, background: "white", border: "1px solid #e8e5e0", borderRadius: 16, overflow: "hidden" }}>
            {result.mailItems.map((m, idx) => (
              <div
                key={m.id}
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  borderBottom: idx === result.mailItems.length - 1 ? "none" : "1px solid #e8e5e0",
                }}
              >
                {m.exteriorImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.exteriorImageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: "1px solid #e8e5e0", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: NOHO_BLUE_DEEP, color: "#F7E6C2", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {(m.carrier ?? m.from ?? "PKG").slice(0, 4).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {m.recipientName ?? m.user?.name ?? "—"}
                    {m.user?.suiteNumber && (
                      <span style={{ marginLeft: 8, fontSize: 10, fontWeight: 800, padding: "2px 6px", borderRadius: 4, background: "rgba(51,116,133,0.10)", color: NOHO_BLUE_DEEP }}>
                        Suite #{m.user.suiteNumber}
                      </span>
                    )}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(45,16,15,0.55)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                    {m.carrier ?? m.from} · {m.trackingNumber}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "rgba(45,16,15,0.45)" }}>
                    Logged {new Date(m.createdAt).toLocaleString()}
                  </p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 900, padding: "3px 8px", borderRadius: 6, background: "rgba(45,16,15,0.06)", color: NOHO_INK, flexShrink: 0 }}>
                  {m.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.dropoffs.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(45,16,15,0.40)" }}>
            External dropoffs · {result.dropoffs.length} match{result.dropoffs.length === 1 ? "" : "es"}
          </p>
          <div style={{ marginTop: 8, background: "white", border: "1px solid #e8e5e0", borderRadius: 16, overflow: "hidden" }}>
            {result.dropoffs.map((d, idx) => (
              <div
                key={d.id}
                style={{
                  padding: "14px 18px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  borderBottom: idx === result.dropoffs.length - 1 ? "none" : "1px solid #e8e5e0",
                }}
              >
                {d.exteriorImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={d.exteriorImageUrl} alt="" style={{ width: 44, height: 44, borderRadius: 10, objectFit: "cover", border: "1px solid #e8e5e0", flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 44, height: 44, borderRadius: 10, background: "rgba(13,148,136,0.10)", color: "#0f766e", fontSize: 9, fontWeight: 900, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    {(d.carrier ?? "PKG").slice(0, 4).toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 800, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {d.senderName ?? "(no sender)"}
                    {d.receiverName && (
                      <span style={{ marginLeft: 6, fontSize: 11, fontWeight: 700, color: "rgba(45,16,15,0.55)" }}>
                        → {d.receiverName}
                      </span>
                    )}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(45,16,15,0.55)", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                    {d.carrier} · {d.trackingNumber}
                    {d.destination && <span style={{ fontFamily: "inherit" }}> · {d.destination}</span>}
                  </p>
                  <p style={{ margin: "2px 0 0", fontSize: 10.5, color: "rgba(45,16,15,0.45)" }}>
                    Dropped off {new Date(d.createdAt).toLocaleString()}
                    {d.carrierPickedUpAt && ` · carrier picked up ${new Date(d.carrierPickedUpAt).toLocaleString()}`}
                  </p>
                </div>
                <span
                  style={{
                    fontSize: 10,
                    fontWeight: 900,
                    padding: "3px 8px",
                    borderRadius: 6,
                    background: d.status === "Awaiting Carrier" ? "rgba(245,166,35,0.14)" : "rgba(22,163,74,0.14)",
                    color: d.status === "Awaiting Carrier" ? "#92400e" : "#15803d",
                    flexShrink: 0,
                  }}
                >
                  {d.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {result.audit.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(45,16,15,0.40)" }}>
            Audit trail · {result.audit.length} event{result.audit.length === 1 ? "" : "s"}
          </p>
          <div style={{ marginTop: 8, background: "white", border: "1px solid #e8e5e0", borderRadius: 16, overflow: "hidden" }}>
            {result.audit.map((a, idx) => {
              let meta = "";
              try {
                const parsed = a.metadata ? JSON.parse(a.metadata) : null;
                if (parsed) meta = JSON.stringify(parsed);
              } catch { /* ignore */ }
              return (
                <div
                  key={a.id}
                  style={{
                    padding: "10px 18px",
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    borderBottom: idx === result.audit.length - 1 ? "none" : "1px solid #e8e5e0",
                    fontSize: 11.5,
                  }}
                >
                  <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "rgba(45,16,15,0.55)", minWidth: 150 }}>
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                  <span style={{ fontWeight: 800, color: NOHO_INK, minWidth: 180 }}>
                    {a.action}
                  </span>
                  <span style={{ flex: 1, color: "rgba(45,16,15,0.55)", fontSize: 10.5, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {meta}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
