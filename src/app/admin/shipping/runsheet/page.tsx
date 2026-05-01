/**
 * Today's Run Sheet — single printable page listing every shipment going
 * out today. Karim hands this on a clipboard to the courier (or to himself
 * for the morning sweep). One row per label, plus tracking + carrier +
 * destination + customer name + price.
 *
 * Sources:
 *   - `ShippoLabel` rows created today (admin Quick Ship purchases + the
 *     Shippo labels printed against pre-paid LabelOrders)
 *   - That's it: pre-paid LabelOrders that haven't been Printed yet aren't
 *     in scope — they go on the run sheet only after the label is bought.
 *
 * Print: letter portrait, branded NOHO header, signature line at the
 * bottom for the courier handoff.
 */

import { verifyAdmin } from "@/lib/dal";
import { prisma } from "@/lib/prisma";
import Image from "next/image";
import Link from "next/link";
import { PrintButton } from "@/app/admin/statements/[id]/PrintButton";
import { priceWithMargin } from "@/lib/label-orders";
import QRCode from "qrcode";

export const dynamic = "force-dynamic";

function startOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
function endOfDay(d = new Date()) {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export default async function RunSheetPage({ searchParams }: { searchParams?: Promise<{ d?: string; ids?: string }> }) {
  await verifyAdmin();
  const sp = (await searchParams) ?? {};
  const day = sp.d ? new Date(sp.d) : new Date();
  const isValidDay = !Number.isNaN(day.getTime());
  const target = isValidDay ? day : new Date();
  const from = startOfDay(target);
  const to = endOfDay(target);

  // If `?ids=a,b,c` is supplied (from the bulk-select bar), filter to those
  // exact label IDs and ignore the date filter so admin can pull yesterday's
  // 5 specific shipments without picking the date.
  const explicitIds = (sp.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const isSelectionMode = explicitIds.length > 0;

  const labels = await prisma.shippoLabel.findMany({
    where: isSelectionMode
      ? { id: { in: explicitIds }, status: { not: "refunded" } }
      : { createdAt: { gte: from, lte: to }, status: { not: "refunded" } },
    orderBy: { createdAt: "asc" },
    include: {
      user: { select: { name: true, suiteNumber: true } },
    },
  });

  const totalCostCents = labels.reduce((s, l) => s + Math.round(l.amountPaid * 100), 0);
  const totalRevenueCents = labels.reduce((s, l) => s + priceWithMargin(Math.round(l.amountPaid * 100)).customerPriceCents, 0);
  const marginCents = totalRevenueCents - totalCostCents;
  const totalWeightOz = labels.reduce((s, l) => s + (l.weightOz ?? 0), 0);
  const totalWeightLbs = totalWeightOz / 16;

  // Generate per-row QR codes pointing to the public `/r/[id]` tracking
  // page. Customer or courier scans from the printed sheet → opens NOHO
  // tracking on a phone. Generated in parallel; tiny (52px) so they fit
  // alongside the table's other cells without crowding.
  const publicOrigin =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/+$/, "") ||
    process.env.NEXT_PUBLIC_BASE_URL?.replace(/\/+$/, "") ||
    "https://nohomailbox.org";
  const qrDataUrls = await Promise.all(
    labels.map((l) =>
      QRCode.toDataURL(`${publicOrigin}/r/${l.id}`, {
        width: 80,
        margin: 0,
        errorCorrectionLevel: "M",
        color: { dark: "#2D100F", light: "#ffffff" },
      }).catch(() => null),
    ),
  );
  const qrById = new Map(labels.map((l, i) => [l.id, qrDataUrls[i]]));

  // Group by carrier for a clean handoff (courier picks up by carrier).
  const byCarrier = new Map<string, typeof labels>();
  for (const l of labels) {
    const k = (l.carrier || "Other").toUpperCase();
    if (!byCarrier.has(k)) byCarrier.set(k, [] as typeof labels);
    byCarrier.get(k)!.push(l);
  }
  const carrierGroups = Array.from(byCarrier.entries()).sort(([a], [b]) => a.localeCompare(b));

  const dateLabel = isSelectionMode
    ? `Selection · ${labels.length} label${labels.length === 1 ? "" : "s"}`
    : target.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const dateIso = target.toISOString().slice(0, 10);

  return (
    <div
      style={{
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Inter, sans-serif',
        background: "#efefe9",
        minHeight: "100vh",
        padding: "24px 12px 80px",
        color: "#2D100F",
      }}
    >
      <style>{`
        /* Letter portrait. Single column. Margins generous so a clipboard
           and a pen work cleanly across the rows. */
        @page { size: letter portrait; margin: 0.5in; }
        @media print {
          html, body { background: white !important; margin: 0 !important; padding: 0 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .runsheet-card { box-shadow: none !important; border: none !important; }
        }
      `}</style>

      {/* Toolbar (hidden on print) */}
      <div className="no-print" style={{ maxWidth: "8.5in", margin: "0 auto 12px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Link href="/admin?tab=shipping" style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #2D100F22", color: "#2D100F", textDecoration: "none", fontWeight: 700, fontSize: 13, background: "#fff" }}>
            ← Shipping Center
          </Link>
          <Link href={`/admin/shipping/runsheet?d=${dateIso}`} style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #2D100F22", color: "#2D100F", textDecoration: "none", fontWeight: 700, fontSize: 13, background: "#fff" }}>
            Refresh
          </Link>
          <form method="get" action="/admin/shipping/runsheet" style={{ display: "inline-flex", gap: 6 }}>
            <input
              type="date"
              name="d"
              defaultValue={dateIso}
              style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #2D100F22", fontWeight: 700, fontSize: 13, color: "#2D100F", background: "#fff" }}
            />
            <button
              type="submit"
              style={{ padding: "8px 14px", borderRadius: 10, border: "1px solid #2D100F22", color: "#2D100F", fontWeight: 700, fontSize: 13, background: "#fff", cursor: "pointer" }}
            >
              Go
            </button>
          </form>
        </div>
        <PrintButton />
      </div>

      <div
        className="runsheet-card"
        style={{
          maxWidth: "8.5in",
          margin: "0 auto",
          background: "white",
          padding: "32px 36px 48px",
          boxShadow: "0 12px 48px rgba(45,16,15,0.10)",
          borderRadius: 12,
          border: "1px solid #2D100F1A",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 18, paddingBottom: 18, borderBottom: "2px solid #2D100F" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Image
              src="/brand/logo-trans.png"
              alt="NOHO Mailbox"
              width={60}
              height={36}
              style={{ height: 44, width: "auto", objectFit: "contain" }}
            />
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.2em", textTransform: "uppercase", color: "#337485", margin: 0 }}>
                {isSelectionMode ? "Selected Shipments" : "Daily Carrier Handoff"}
              </p>
              <h1 style={{ fontSize: 26, fontWeight: 900, margin: "2px 0 0", letterSpacing: "-0.01em", color: "#2D100F", lineHeight: 1.1 }}>
                Run Sheet
              </h1>
              <p style={{ fontSize: 11, color: "#2D100F99", margin: "2px 0 0" }}>
                {dateLabel}
              </p>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", color: "#2D100F88", margin: 0 }}>NOHO Mailbox</p>
            <p style={{ fontSize: 11, fontWeight: 700, margin: "2px 0 0", color: "#2D100F" }}>5062 Lankershim Blvd</p>
            <p style={{ fontSize: 10.5, color: "#2D100F88", margin: 0 }}>North Hollywood, CA 91601</p>
            <p style={{ fontSize: 10.5, color: "#2D100F88", margin: 0 }}>(818) 506-7744</p>
          </div>
        </div>

        {/* KPI band */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 10, margin: "16px 0 20px" }}>
          <KpiTile label="Labels" value={String(labels.length)} />
          <KpiTile label="Total weight" value={totalWeightOz > 0 ? `${totalWeightLbs.toFixed(1)} lb` : "—"} sub={totalWeightOz > 0 ? `${Math.round(totalWeightOz)} oz` : undefined} />
          <KpiTile label="Wholesale" value={`$${(totalCostCents / 100).toFixed(2)}`} />
          <KpiTile label="Revenue" value={`$${(totalRevenueCents / 100).toFixed(2)}`} accent />
          <KpiTile label="Margin" value={`+$${(marginCents / 100).toFixed(2)}`} margin />
        </div>

        {labels.length === 0 ? (
          <div style={{ padding: "60px 0", textAlign: "center", color: "#2D100F66" }}>
            <p style={{ fontSize: 14, fontWeight: 700, margin: 0 }}>No labels purchased on {dateLabel}.</p>
            <p style={{ fontSize: 11, margin: "6px 0 0" }}>Pick a different day above, or buy a label in Quick Ship.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {carrierGroups.map(([carrier, group]) => {
              const groupCost = group.reduce((s, l) => s + Math.round(l.amountPaid * 100), 0);
              const groupWeightOz = group.reduce((s, l) => s + (l.weightOz ?? 0), 0);
              const groupWeightLbs = groupWeightOz / 16;
              return (
                <section key={carrier}>
                  {/* Carrier band */}
                  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 8, background: "#FAF6F0", border: "1px solid #2D100F22" }}>
                    <CarrierBadge carrier={carrier} />
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontSize: 13, fontWeight: 900, letterSpacing: "0.02em", color: "#2D100F" }}>{carrier}</p>
                      <p style={{ margin: 0, fontSize: 9.5, color: "#2D100F77" }}>
                        {group.length} package{group.length === 1 ? "" : "s"} · ${(groupCost / 100).toFixed(2)} wholesale
                        {groupWeightOz > 0 && ` · ${groupWeightLbs.toFixed(1)} lb total`}
                      </p>
                    </div>
                    {/* Pickup-time slot — courier writes ETA/actual on the printed sheet */}
                    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: "0.16em", textTransform: "uppercase", color: "#337485", padding: "4px 10px", borderRadius: 4, background: "#33748514", display: "inline-flex", alignItems: "center", gap: 6 }}>
                      Pickup
                      <span style={{ display: "inline-block", borderBottom: "1px solid #337485", minWidth: 50, height: 12 }} />
                    </span>
                  </div>

                  {/* Table */}
                  <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 6, fontSize: 10.5 }}>
                    <thead>
                      <tr style={{ borderBottom: "1px solid #2D100F22" }}>
                        <Th>#</Th>
                        <Th>Recipient</Th>
                        <Th>Destination</Th>
                        <Th>Service</Th>
                        <Th>Tracking</Th>
                        <Th right>Cost</Th>
                        <Th width={56}>Scan</Th>
                        <Th width={28} />
                      </tr>
                    </thead>
                    <tbody>
                      {group.map((l, i) => {
                        const wholesale = Math.round(l.amountPaid * 100);
                        const customer = priceWithMargin(wholesale).customerPriceCents;
                        return (
                          <tr key={l.id} style={{ borderBottom: "1px dashed #2D100F1A" }}>
                            <Td mono color="#2D100F66" width={20}>{i + 1}</Td>
                            <Td>
                              <strong style={{ color: "#2D100F" }}>{l.toName}</strong>
                              {l.user?.name && (
                                <span style={{ color: "#2D100F77", marginLeft: 6, fontSize: 9.5 }}>(from {l.user.name}{l.user.suiteNumber ? ` · #${l.user.suiteNumber}` : ""})</span>
                              )}
                            </Td>
                            <Td color="#2D100F">{l.toCity}, {l.toState} {l.toZip}</Td>
                            <Td color="#2D100F88">{l.servicelevel}</Td>
                            <Td mono color="#337485" wrap>{l.trackingNumber}</Td>
                            <Td right color="#2D100F">
                              <div style={{ fontWeight: 800 }}>${(customer / 100).toFixed(2)}</div>
                              <div style={{ fontSize: 8.5, color: "#2D100F66", fontWeight: 600 }}>cost ${l.amountPaid.toFixed(2)}</div>
                            </Td>
                            <Td width={56}>
                              {(() => {
                                const qr = qrById.get(l.id);
                                if (!qr) return null;
                                return (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={qr} alt={`Scan to track ${l.trackingNumber}`} style={{ width: 48, height: 48, display: "block" }} />
                                );
                              })()}
                            </Td>
                            <Td>
                              <span style={{ display: "inline-block", width: 14, height: 14, borderRadius: 3, border: "1.5px solid #2D100F88" }} />
                            </Td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </section>
              );
            })}
          </div>
        )}

        {/* Sign-off */}
        <div style={{ marginTop: 28, paddingTop: 14, borderTop: "1px solid #2D100F22", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <SignBlock label="Courier signature" />
          <SignBlock label="NOHO staff signature" />
        </div>
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: "1px dashed #2D100F22", display: "flex", justifyContent: "space-between", color: "#2D100F66", fontSize: 9 }}>
          <span>Generated {new Date().toLocaleString()}</span>
          <span>NOHO Mailbox · CMRA · 5062 Lankershim Blvd · NoHo, CA</span>
        </div>
      </div>
    </div>
  );
}

function KpiTile({ label, value, sub, accent, margin }: { label: string; value: string; sub?: string; accent?: boolean; margin?: boolean }) {
  return (
    <div
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        background: accent ? "linear-gradient(135deg, #337485, #23596A)" : margin ? "rgba(22,163,74,0.10)" : "#fff",
        border: `1px solid ${accent ? "transparent" : margin ? "rgba(22,163,74,0.30)" : "#2D100F22"}`,
        color: accent ? "#F7E6C2" : margin ? "#15803d" : "#2D100F",
      }}
    >
      <p style={{ margin: 0, fontSize: 8.5, fontWeight: 800, letterSpacing: "0.18em", textTransform: "uppercase", opacity: 0.75 }}>{label}</p>
      <p style={{ margin: "2px 0 0", fontSize: 17, fontWeight: 800, letterSpacing: "-0.01em" }}>{value}</p>
      {sub && <p style={{ margin: "1px 0 0", fontSize: 9, opacity: 0.6 }}>{sub}</p>}
    </div>
  );
}

function CarrierBadge({ carrier }: { carrier: string }) {
  const c = carrier.toLowerCase();
  let bg = "linear-gradient(135deg, #337485, #23596A)", fg = "#F7E6C2", label = carrier.slice(0, 4);
  if (c.includes("usps")) { bg = "linear-gradient(135deg, #2D5BA8, #1c3f7a)"; fg = "#fff"; label = "USPS"; }
  else if (c.includes("ups")) { bg = "linear-gradient(135deg, #6B3F1A, #3F2410)"; fg = "#FFC107"; label = "UPS"; }
  else if (c.includes("fedex")) { bg = "linear-gradient(135deg, #4D148C, #2E0A57)"; fg = "#FF6600"; label = "FedEx"; }
  else if (c.includes("dhl")) { bg = "#FFCC00"; fg = "#D40511"; label = "DHL"; }
  return (
    <span style={{ width: 36, height: 36, borderRadius: 8, background: bg, color: fg, display: "inline-flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 10, letterSpacing: "0.04em" }}>
      {label}
    </span>
  );
}

function Th({ children, right, width }: { children?: React.ReactNode; right?: boolean; width?: number }) {
  return (
    <th
      style={{
        textAlign: right ? "right" : "left",
        fontSize: 8.5,
        fontWeight: 800,
        letterSpacing: "0.16em",
        textTransform: "uppercase",
        color: "#2D100F66",
        padding: "6px 4px",
        width: width ? `${width}px` : undefined,
      }}
    >
      {children}
    </th>
  );
}

function Td({
  children, right, mono, color, width, wrap,
}: {
  children?: React.ReactNode;
  right?: boolean;
  mono?: boolean;
  color?: string;
  width?: number;
  wrap?: boolean;
}) {
  return (
    <td
      style={{
        textAlign: right ? "right" : "left",
        fontFamily: mono ? "ui-monospace, SFMono-Regular, Menlo, monospace" : undefined,
        fontSize: 10.5,
        color: color ?? "#2D100F",
        padding: "6px 4px",
        verticalAlign: "top",
        width: width ? `${width}px` : undefined,
        wordBreak: wrap ? "break-all" : undefined,
      }}
    >
      {children}
    </td>
  );
}

function SignBlock({ label }: { label: string }) {
  return (
    <div>
      <div style={{ borderBottom: "1px solid #2D100F", height: 32 }} />
      <p style={{ margin: "4px 0 0", fontSize: 9, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", color: "#2D100F88" }}>{label}</p>
      <p style={{ margin: "2px 0 0", fontSize: 9, color: "#2D100F66" }}>Date / Time</p>
    </div>
  );
}
