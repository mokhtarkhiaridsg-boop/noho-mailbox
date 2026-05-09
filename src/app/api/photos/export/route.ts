/**
 * iter-162 — Customer photos export (Tier 10 #72).
 *
 * GET /api/photos/export
 *
 * Builds a ZIP of every photo on the signed-in member's account:
 *   - MailItem.exteriorImageUrl       (admin intake photos)
 *   - MailItem.scanImageUrl           (mail scans)
 *   - MailItem.extraPhotosJson[]      (iter-135 multi-photo gallery)
 *   - DeliveryOrder.podPhotoUrl       (iter-95 proof-of-delivery, when wired)
 *   - MailItem.pickupSignatureSvg     (iter-137 pickup signature, as .svg)
 *
 * Returns a streamed Content-Type: application/zip download. Audit-
 * logged as `member.photos_exported` with file count + bytes.
 */

import { NextResponse } from "next/server";
import JSZip from "jszip";
import { verifySession } from "@/lib/dal";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type ExtraPhoto = { id: string; url: string; label?: string };

function safeFilename(s: string, fallback: string): string {
  const cleaned = s.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  return cleaned || fallback;
}

function urlExt(url: string): string {
  const m = /\.(jpe?g|png|gif|webp|svg|heic)(?:\?|$)/i.exec(url);
  return m ? m[1]!.toLowerCase().replace("jpeg", "jpg") : "jpg";
}

async function fetchBytes(url: string): Promise<{ bytes: ArrayBuffer; mediaType: string } | null> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return null;
    const bytes = await res.arrayBuffer();
    if (bytes.byteLength === 0) return null;
    if (bytes.byteLength > 25 * 1024 * 1024) return null; // 25MB safety cap per file
    const mediaType = res.headers.get("content-type") ?? "application/octet-stream";
    return { bytes, mediaType };
  } catch {
    return null;
  }
}

export async function GET() {
  const session = await verifySession();
  const userId = session.id!;

  const items = await prisma.mailItem.findMany({
    where: { userId },
    select: {
      id: true,
      from: true,
      type: true,
      date: true,
      createdAt: true,
      exteriorImageUrl: true,
      scanImageUrl: true,
      extraPhotosJson: true,
      pickupSignatureSvg: true,
      pickupSignerName: true,
    },
    orderBy: { createdAt: "desc" },
    take: 1000,
  });

  const zip = new JSZip();
  let added = 0;
  let skipped = 0;
  let totalBytes = 0;

  // README so the customer knows what's inside.
  const readme = [
    "NOHO Mailbox · photo export",
    "",
    `Member ID: ${userId}`,
    `Generated: ${new Date().toISOString()}`,
    `Items scanned: ${items.length}`,
    "",
    "Folder layout:",
    "  /packages/<date>-<id>-front.jpg          intake photo",
    "  /packages/<date>-<id>-scan.jpg           scanned mail",
    "  /packages/<date>-<id>-extra-<label>.jpg  multi-photo gallery extras",
    "  /signatures/<date>-<id>.svg              pickup signature (if you signed)",
    "",
    "Questions? hello@nohomailbox.org · (818) 506-7744",
    "",
  ].join("\n");
  zip.file("README.txt", readme);

  for (const m of items) {
    const dateLabel = m.createdAt.toISOString().slice(0, 10);
    const baseName = safeFilename(`${dateLabel}-${m.id.slice(-6).toUpperCase()}`, m.id);
    const slug = safeFilename(m.from.slice(0, 40), "from");

    if (m.exteriorImageUrl) {
      const blob = await fetchBytes(m.exteriorImageUrl);
      if (blob) {
        zip.file(`packages/${baseName}-${slug}-front.${urlExt(m.exteriorImageUrl)}`, blob.bytes);
        added++;
        totalBytes += blob.bytes.byteLength;
      } else { skipped++; }
    }
    if (m.scanImageUrl) {
      const blob = await fetchBytes(m.scanImageUrl);
      if (blob) {
        zip.file(`packages/${baseName}-${slug}-scan.${urlExt(m.scanImageUrl)}`, blob.bytes);
        added++;
        totalBytes += blob.bytes.byteLength;
      } else { skipped++; }
    }
    if (m.extraPhotosJson) {
      try {
        const arr = JSON.parse(m.extraPhotosJson) as unknown;
        if (Array.isArray(arr)) {
          for (const p of arr as ExtraPhoto[]) {
            if (!p?.url || typeof p.url !== "string") continue;
            const blob = await fetchBytes(p.url);
            if (blob) {
              const labelSlug = safeFilename(p.label ?? "extra", "extra").slice(0, 30);
              zip.file(`packages/${baseName}-${slug}-extra-${labelSlug}.${urlExt(p.url)}`, blob.bytes);
              added++;
              totalBytes += blob.bytes.byteLength;
            } else { skipped++; }
          }
        }
      } catch { /* malformed JSON — skip */ }
    }
    if (m.pickupSignatureSvg) {
      // Already a self-contained SVG document (iter-137). Embed as text.
      zip.file(
        `signatures/${baseName}-${slug}.svg`,
        m.pickupSignatureSvg,
      );
      added++;
      totalBytes += m.pickupSignatureSvg.length;
    }
  }

  // Audit log — fire-and-forget, but await so we know the row exists.
  await prisma.auditLog.create({
    data: {
      actorId: userId,
      actorRole: "MEMBER",
      action: "member.photos_exported",
      entityType: "User",
      entityId: userId,
      metadata: JSON.stringify({ added, skipped, totalBytes, itemsScanned: items.length }),
    },
  });

  if (added === 0) {
    return NextResponse.json({ error: "No photos found on your account yet." }, { status: 404 });
  }

  const blob = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  const filename = `noho-photos-${new Date().toISOString().slice(0, 10)}.zip`;

  return new NextResponse(new Uint8Array(blob), {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(blob.byteLength),
      "Cache-Control": "no-store",
      "X-Photos-Added": String(added),
      "X-Photos-Skipped": String(skipped),
    },
  });
}
