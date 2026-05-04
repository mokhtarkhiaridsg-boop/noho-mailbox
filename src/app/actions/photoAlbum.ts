"use server";

// iter-115 — Customer photo album.
//
// Pulls every photo we have for the member across MailItem rows
// (exteriorImageUrl for packages, scanImageUrl for scanned mail) into
// one paginated album. Filterable by type. No new schema — just a
// targeted read of the existing MailItem table with non-null photo
// constraints.

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";

export type AlbumPhoto = {
  mailItemId: string;
  url: string;
  imageKind: "exterior" | "scan";
  type: string;          // "Package" | "Letter" | etc.
  status: string;        // current MailItem.status
  from: string;
  trackingNumber: string | null;
  carrier: string | null;
  date: string;          // human display date
  createdAtIso: string;
};

export type AlbumFilter = "all" | "packages" | "mail";

const PAGE_SIZE = 30;

export async function getMyPhotoAlbum(input: {
  filter?: AlbumFilter;
  offset?: number;
} = {}): Promise<{ photos: AlbumPhoto[]; total: number; offset: number; nextOffset: number | null }> {
  const session = await verifySession();
  if (!session.id) return { photos: [], total: 0, offset: 0, nextOffset: null };

  const offset = Math.max(0, input.offset ?? 0);
  const filter = input.filter ?? "all";

  const baseWhere = { userId: session.id };
  // We want rows that have AT LEAST one photo. Two columns can carry one
  // each so we OR them.
  const photoWhere = {
    AND: [
      baseWhere,
      { OR: [{ exteriorImageUrl: { not: null } }, { scanImageUrl: { not: null } }] },
      filter === "packages" ? { type: "Package" } : filter === "mail" ? { type: { not: "Package" } } : {},
    ],
  };

  // Total distinct rows (a row contributing 2 photos still counts as 1
  // for paging — we'll over-fetch a bit and let the flat list paginate
  // naturally).
  const [total, rows] = await Promise.all([
    prisma.mailItem.count({ where: photoWhere }),
    prisma.mailItem.findMany({
      where: photoWhere,
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: PAGE_SIZE,
      select: {
        id: true, type: true, status: true, from: true,
        trackingNumber: true, carrier: true, date: true, createdAt: true,
        exteriorImageUrl: true, scanImageUrl: true,
      },
    }),
  ]);

  const photos: AlbumPhoto[] = [];
  for (const r of rows) {
    if (r.exteriorImageUrl) {
      photos.push({
        mailItemId: r.id,
        url: r.exteriorImageUrl,
        imageKind: "exterior",
        type: r.type, status: r.status, from: r.from,
        trackingNumber: r.trackingNumber, carrier: r.carrier,
        date: r.date, createdAtIso: r.createdAt.toISOString(),
      });
    }
    if (r.scanImageUrl) {
      photos.push({
        mailItemId: r.id,
        url: r.scanImageUrl,
        imageKind: "scan",
        type: r.type, status: r.status, from: r.from,
        trackingNumber: r.trackingNumber, carrier: r.carrier,
        date: r.date, createdAtIso: r.createdAt.toISOString(),
      });
    }
  }

  return {
    photos,
    total,
    offset,
    nextOffset: rows.length === PAGE_SIZE ? offset + PAGE_SIZE : null,
  };
}
