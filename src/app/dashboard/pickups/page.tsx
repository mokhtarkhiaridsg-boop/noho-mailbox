/**
 * iter-67: Member pickup history.
 *
 * The dashboard's "Recently Picked Up" section (iter-51) shows only the 5
 * most recent. This is the full archive — paginated, oldest dates with
 * photo + tracking + carrier. Members get here via the "View all" footer
 * link on the dashboard section.
 *
 * SSR + ?page=N pagination keeps it cheap to render.
 */

import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

export const dynamic = "force-dynamic";

const PER_PAGE = 20;

export default async function PickupHistoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const session = await verifySession();
  const { page: pageRaw } = await searchParams;
  const page = Math.max(1, parseInt(pageRaw ?? "1", 10) || 1);
  const skip = (page - 1) * PER_PAGE;

  const [user, rows, total] = await Promise.all([
    // verifySession returns a slim shape; fetch suiteNumber separately
    // for the header.
    prisma.user.findUnique({
      where: { id: session.id },
      select: { suiteNumber: true },
    }),
    prisma.mailItem.findMany({
      where: { userId: session.id, type: "Package", status: "Picked Up" },
      orderBy: { createdAt: "desc" },
      skip,
      take: PER_PAGE,
      select: {
        id: true,
        from: true,
        date: true,
        trackingNumber: true,
        carrier: true,
        recipientName: true,
        exteriorImageUrl: true,
        createdAt: true,
      },
    }),
    prisma.mailItem.count({
      where: { userId: session.id, type: "Package", status: "Picked Up" },
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / PER_PAGE));

  return (
    <div
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "32px 16px",
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        color: "#2D100F",
      }}
    >
      <Link
        href="/dashboard?tab=packages"
        style={{
          display: "inline-block",
          padding: "6px 12px",
          borderRadius: 8,
          border: "1px solid #e8e5e0",
          color: "#2D100F",
          textDecoration: "none",
          fontWeight: 700,
          fontSize: 12,
          background: "white",
          marginBottom: 16,
        }}
      >
        ← Dashboard
      </Link>

      <div style={{ marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 10, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(45,16,15,0.40)" }}>
          Pickup history · suite #{user?.suiteNumber ?? "—"}
        </p>
        <h1 style={{ margin: "4px 0 0", fontSize: 28, fontWeight: 900, letterSpacing: "-0.01em" }}>
          Picked Up · {total} package{total === 1 ? "" : "s"}
        </h1>
        <p style={{ margin: "4px 0 0", fontSize: 13, color: "rgba(45,16,15,0.55)" }}>
          Every package handed to you in person at NOHO Mailbox.
        </p>
      </div>

      {total === 0 ? (
        <div style={{ padding: "48px 24px", textAlign: "center", border: "1px dashed #e8e5e0", borderRadius: 16, color: "rgba(45,16,15,0.55)" }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700 }}>No pickups yet</p>
          <p style={{ margin: "6px 0 0", fontSize: 12 }}>
            When you pick up a package in person, it'll show here.
          </p>
        </div>
      ) : (
        <div style={{ background: "white", border: "1px solid #e8e5e0", borderRadius: 16, overflow: "hidden", boxShadow: "var(--shadow-cream-sm, 0 1px 2px rgba(45,16,15,0.04))" }}>
          {rows.map((r, idx) => (
            <div
              key={r.id}
              style={{
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
                borderBottom: idx === rows.length - 1 ? "none" : "1px solid #e8e5e0",
              }}
            >
              {r.exteriorImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={r.exteriorImageUrl}
                  alt=""
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    objectFit: "cover",
                    border: "1px solid #e8e5e0",
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 10,
                    background: "rgba(22,163,74,0.10)",
                    color: "#15803d",
                    fontSize: 9,
                    fontWeight: 900,
                    letterSpacing: "0.04em",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {(r.carrier ?? r.from ?? "PKG").slice(0, 4).toUpperCase()}
                </div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ margin: 0, fontSize: 14, fontWeight: 800, color: "#2D100F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.from}
                </p>
                <p style={{ margin: "2px 0 0", fontSize: 11, color: "rgba(45,16,15,0.55)", display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span>{r.date}</span>
                  {r.carrier && <span>· {r.carrier}</span>}
                  {r.trackingNumber && (
                    <span style={{ fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", color: "#23596A" }}>
                      · {r.trackingNumber}
                    </span>
                  )}
                </p>
              </div>
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 900,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                  padding: "3px 8px",
                  borderRadius: 6,
                  background: "rgba(22,163,74,0.14)",
                  color: "#15803d",
                  flexShrink: 0,
                }}
              >
                Picked up ✓
              </span>
            </div>
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ marginTop: 16, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
          {page > 1 ? (
            <Link
              href={`/dashboard/pickups?page=${page - 1}`}
              style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #e8e5e0", color: "#2D100F", textDecoration: "none", fontWeight: 700, fontSize: 12, background: "white" }}
            >
              ← Newer
            </Link>
          ) : (
            <span />
          )}
          <span style={{ fontSize: 12, color: "rgba(45,16,15,0.55)" }}>
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link
              href={`/dashboard/pickups?page=${page + 1}`}
              style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #e8e5e0", color: "#2D100F", textDecoration: "none", fontWeight: 700, fontSize: 12, background: "white" }}
            >
              Older →
            </Link>
          ) : (
            <span />
          )}
        </div>
      )}
    </div>
  );
}
