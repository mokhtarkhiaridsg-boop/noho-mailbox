"use server";

// iter-86 — Admin Cmd+K omnibox.
//
// One server action. One query string. Returns up to 5 hits per entity
// type (Customer, MailItem, ExternalDropoff, LabelOrder, ShippoLabel) so
// the palette renders fast. All searches are admin-gated.
//
// Returns a flat ordered list with `kind` discriminator + `href` so the
// palette doesn't need any per-kind branching beyond rendering the row.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";

export type OmniHit =
  | { kind: "customer"; id: string; href: string; primary: string; secondary: string; tertiary?: string | null }
  | { kind: "mail";     id: string; href: string; primary: string; secondary: string; tertiary?: string | null }
  | { kind: "dropoff";  id: string; href: string; primary: string; secondary: string; tertiary?: string | null }
  | { kind: "labelOrder"; id: string; href: string; primary: string; secondary: string; tertiary?: string | null }
  | { kind: "shippo";   id: string; href: string; primary: string; secondary: string; tertiary?: string | null };

export async function omniSearch(query: string): Promise<{ hits: OmniHit[]; took: number }> {
  await verifyAdmin();
  const q = (query ?? "").trim();
  if (q.length < 2) return { hits: [], took: 0 };

  const t0 = Date.now();
  const limit = 5;

  const [customers, mailItems, dropoffs, labelOrders, shippoLabels] = await Promise.all([
    prisma.user.findMany({
      where: {
        role: { not: "ADMIN" },
        OR: [
          { name: { contains: q } },
          { email: { contains: q } },
          { suiteNumber: { contains: q } },
          { phone: { contains: q } },
          { businessName: { contains: q } },
        ],
      },
      select: { id: true, name: true, email: true, suiteNumber: true, plan: true, businessName: true },
      take: limit,
    }),
    prisma.mailItem.findMany({
      where: {
        OR: [
          { trackingNumber: { contains: q } },
          { recipientName: { contains: q } },
          { from: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        trackingNumber: true,
        carrier: true,
        from: true,
        recipientName: true,
        status: true,
        user: { select: { name: true, suiteNumber: true } },
      },
      take: limit,
    }),
    prisma.externalDropoff.findMany({
      where: {
        OR: [
          { trackingNumber: { contains: q } },
          { senderName: { contains: q } },
          { receiverName: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, trackingNumber: true, carrier: true, senderName: true, receiverName: true, status: true },
      take: limit,
    }),
    // LabelOrder doesn't have trackingNumber / recipientName columns —
    // tracking comes from the linked ShippoLabel via shippoLabelId, and
    // the recipient is `toName`. Search by the customer the order is for
    // and the destination name.
    prisma.labelOrder.findMany({
      where: {
        OR: [
          { customerName: { contains: q } },
          { toName: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, toName: true, customerName: true, carrier: true, status: true, shippoLabelId: true },
      take: limit,
    }),
    prisma.shippoLabel.findMany({
      where: {
        OR: [
          { trackingNumber: { contains: q } },
          { toName: { contains: q } },
        ],
      },
      orderBy: { createdAt: "desc" },
      select: { id: true, trackingNumber: true, toName: true, carrier: true, servicelevel: true, status: true },
      take: limit,
    }),
  ]);

  const hits: OmniHit[] = [];
  for (const c of customers) {
    hits.push({
      kind: "customer",
      id: c.id,
      href: `/admin?tab=customers&customerId=${c.id}`,
      primary: c.name || c.email,
      secondary: c.suiteNumber ? `Suite #${c.suiteNumber}${c.plan ? ` · ${c.plan}` : ""}` : c.email,
      tertiary: c.businessName ?? null,
    });
  }
  for (const m of mailItems) {
    hits.push({
      kind: "mail",
      id: m.id,
      href: `/admin/inbound/receipt/${m.id}`,
      primary: `${m.carrier ?? m.from} · ${m.trackingNumber ?? "(no tracking)"}`,
      secondary: `${m.recipientName ?? m.user?.name ?? "—"}${m.user?.suiteNumber ? ` · suite #${m.user.suiteNumber}` : ""}`,
      tertiary: m.status,
    });
  }
  for (const d of dropoffs) {
    hits.push({
      kind: "dropoff",
      id: d.id,
      href: `/admin/inbound/dropoff/${d.id}`,
      primary: `${d.carrier} · ${d.trackingNumber}`,
      secondary: `${d.senderName ?? "(no sender)"}${d.receiverName ? ` → ${d.receiverName}` : ""}`,
      tertiary: d.status,
    });
  }
  for (const l of labelOrders) {
    hits.push({
      kind: "labelOrder",
      id: l.id,
      href: `/r/po/${l.id}`,
      primary: `${l.carrier ?? "Label"} · ${l.shippoLabelId ?? "(pending)"}`,
      secondary: l.toName ?? l.customerName ?? "—",
      tertiary: l.status,
    });
  }
  for (const s of shippoLabels) {
    hits.push({
      kind: "shippo",
      id: s.id,
      href: `/r/${s.id}`,
      primary: `${s.carrier} ${s.servicelevel} · ${s.trackingNumber}`,
      secondary: s.toName,
      tertiary: s.status,
    });
  }

  return { hits, took: Date.now() - t0 };
}
