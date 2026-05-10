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
import { bucketForSender } from "@/lib/sender-normalize";

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

// iter-178 — Photo album auto-organize by sender.
// Returns sender-bucketed groups with display metadata + sample
// photos. Each group surfaces the most-recent N photos as thumbnails;
// click into a group renders the per-bucket gallery (handled client-side
// by filtering the existing flat list against group.itemIds).
export type AlbumSenderGroup = {
  key: string;            // canonical bucket key
  bucket: string;         // display name
  emoji: string;
  accent: string;
  itemCount: number;      // total MailItems in this bucket
  photoCount: number;     // total photos (a row can contribute up to 2)
  firstSeenIso: string;
  lastSeenIso: string;
  samplePhotos: AlbumPhoto[]; // up to 6 thumbnails for the group card
  itemIds: string[];      // every MailItem.id in this bucket — client uses for filtering
};

export async function getMyPhotoAlbumGroupedBySender(input: {
  filter?: AlbumFilter;
  windowDays?: number;       // limit to last N days (default: all-time)
} = {}): Promise<{ groups: AlbumSenderGroup[]; totalGroups: number; totalPhotos: number }> {
  const session = await verifySession();
  if (!session.id) return { groups: [], totalGroups: 0, totalPhotos: 0 };
  const filter = input.filter ?? "all";
  const baseWhere: Record<string, unknown> = {
    userId: session.id,
    OR: [{ exteriorImageUrl: { not: null } }, { scanImageUrl: { not: null } }],
  };
  if (filter === "packages") baseWhere.type = "Package";
  else if (filter === "mail") baseWhere.type = { not: "Package" };
  if (input.windowDays && Number.isFinite(input.windowDays) && input.windowDays > 0) {
    const since = new Date();
    since.setDate(since.getDate() - Math.round(input.windowDays));
    baseWhere.createdAt = { gte: since };
  }

  const rows = await prisma.mailItem.findMany({
    where: baseWhere,
    orderBy: { createdAt: "desc" },
    select: {
      id: true, type: true, status: true, from: true,
      trackingNumber: true, carrier: true, date: true, createdAt: true,
      exteriorImageUrl: true, scanImageUrl: true,
    },
    take: 1000, // safety cap
  });

  // Bucket pass.
  type BucketWork = {
    info: ReturnType<typeof bucketForSender>;
    items: typeof rows;
    photos: AlbumPhoto[];
    photoCount: number;
  };
  const buckets = new Map<string, BucketWork>();
  for (const r of rows) {
    const info = bucketForSender(r.from);
    const work = buckets.get(info.key) ?? { info, items: [], photos: [], photoCount: 0 };
    work.items.push(r);
    if (r.exteriorImageUrl) {
      work.photoCount += 1;
      if (work.photos.length < 6) {
        work.photos.push({
          mailItemId: r.id, url: r.exteriorImageUrl, imageKind: "exterior",
          type: r.type, status: r.status, from: r.from,
          trackingNumber: r.trackingNumber, carrier: r.carrier,
          date: r.date, createdAtIso: r.createdAt.toISOString(),
        });
      }
    }
    if (r.scanImageUrl) {
      work.photoCount += 1;
      if (work.photos.length < 6) {
        work.photos.push({
          mailItemId: r.id, url: r.scanImageUrl, imageKind: "scan",
          type: r.type, status: r.status, from: r.from,
          trackingNumber: r.trackingNumber, carrier: r.carrier,
          date: r.date, createdAtIso: r.createdAt.toISOString(),
        });
      }
    }
    buckets.set(info.key, work);
  }

  // Build the group list, sorted by item count desc (most-active sender first).
  const groups: AlbumSenderGroup[] = Array.from(buckets.values()).map((w) => {
    const sortedByDate = [...w.items].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
    return {
      key: w.info.key,
      bucket: w.info.bucket,
      emoji: w.info.emoji,
      accent: w.info.accent,
      itemCount: w.items.length,
      photoCount: w.photoCount,
      firstSeenIso: sortedByDate[0]!.createdAt.toISOString(),
      lastSeenIso: sortedByDate[sortedByDate.length - 1]!.createdAt.toISOString(),
      samplePhotos: w.photos,
      itemIds: w.items.map((it) => it.id),
    };
  }).sort((a, b) => b.itemCount - a.itemCount);

  const totalPhotos = groups.reduce((s, g) => s + g.photoCount, 0);
  return { groups, totalGroups: groups.length, totalPhotos };
}
