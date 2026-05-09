"use server";

/**
 * iter-148 — Customer onboarding video walkthrough (Tier 9 #58).
 *
 * Three surfaces:
 *   1. Admin CRUD — manage the playlist (slug, video URL, poster, order)
 *   2. Member reads — playlist + per-user watch state
 *   3. Member writes — record max-percent-watched as the player advances
 *
 * Welcome email touch sequence (cron-driven idempotent dispatch) lives
 * in `runOnboardingTouchSweep()`. Day 0 = signup, Day 2 = videos prompt,
 * Day 5 = check-in. Each (userId, touchKey) is unique so the same sweep
 * never double-fires.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin, verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

// ─── Types ─────────────────────────────────────────────────────────

export type OnboardingVideoRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  videoUrl: string;
  posterUrl: string | null;
  durationSec: number;
  sortIndex: number;
  isActive: boolean;
  totalViewers: number;
  totalCompleted: number;
};

export type MemberPlaylistEntry = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  videoUrl: string;
  posterUrl: string | null;
  durationSec: number;
  percentWatched: number;
  completed: boolean;
  lastViewedAtIso: string | null;
};

// ─── Admin reads / writes ─────────────────────────────────────────

export async function listOnboardingVideos(): Promise<OnboardingVideoRow[]> {
  await verifyAdmin();
  const rows = await prisma.onboardingVideo.findMany({
    orderBy: [{ isActive: "desc" }, { sortIndex: "asc" }, { createdAt: "asc" }],
    include: {
      _count: { select: { views: true } },
    },
  });
  // Compute completed-count via a separate batched query (small N).
  const completedCounts = await prisma.onboardingVideoView.groupBy({
    by: ["videoId"],
    where: { completedAt: { not: null } },
    _count: { _all: true },
  });
  const completedMap = new Map(completedCounts.map((c) => [c.videoId, c._count._all]));
  return rows.map((v) => ({
    id: v.id,
    slug: v.slug,
    title: v.title,
    description: v.description,
    videoUrl: v.videoUrl,
    posterUrl: v.posterUrl,
    durationSec: v.durationSec,
    sortIndex: v.sortIndex,
    isActive: v.isActive,
    totalViewers: v._count.views,
    totalCompleted: completedMap.get(v.id) ?? 0,
  }));
}

export async function upsertOnboardingVideo(input: {
  id?: string;
  slug: string;
  title: string;
  description?: string;
  videoUrl: string;
  posterUrl?: string;
  durationSec?: number;
  sortIndex?: number;
  isActive?: boolean;
}): Promise<{ id?: string; error?: string }> {
  const actor = await verifyAdmin();

  const slug = input.slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^-+|-+$/g, "");
  const title = input.title.trim();
  const videoUrl = input.videoUrl.trim();
  if (!slug) return { error: "Slug required (a-z, 0-9, dashes)" };
  if (!title) return { error: "Title required" };
  if (!videoUrl) return { error: "Video URL required" };
  if (!/^https?:\/\//i.test(videoUrl) && !videoUrl.startsWith("/")) {
    return { error: "Video URL must start with https:// or /" };
  }

  // Slug uniqueness — only when creating OR slug changed.
  if (input.id) {
    const existing = await prisma.onboardingVideo.findUnique({ where: { id: input.id }, select: { slug: true } });
    if (!existing) return { error: "Video not found" };
    if (existing.slug !== slug) {
      const dup = await prisma.onboardingVideo.findUnique({ where: { slug } });
      if (dup) return { error: `Slug "${slug}" already in use` };
    }
  } else {
    const dup = await prisma.onboardingVideo.findUnique({ where: { slug } });
    if (dup) return { error: `Slug "${slug}" already in use` };
  }

  const data = {
    slug,
    title,
    description: input.description?.trim() || null,
    videoUrl,
    posterUrl: input.posterUrl?.trim() || null,
    durationSec: Math.max(0, Math.round(input.durationSec ?? 0)),
    sortIndex: Math.max(0, Math.round(input.sortIndex ?? 0)),
    isActive: input.isActive ?? true,
  };

  let id = input.id;
  if (id) {
    await prisma.onboardingVideo.update({ where: { id }, data });
  } else {
    const created = await prisma.onboardingVideo.create({ data });
    id = created.id;
  }

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: input.id ? "onboarding.video_updated" : "onboarding.video_created",
      entityType: "OnboardingVideo",
      entityId: id,
      metadata: JSON.stringify({ slug, title, isActive: input.isActive ?? true }),
    },
  });
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { id };
}

export async function deleteOnboardingVideo(id: string): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.onboardingVideo.findUnique({ where: { id } });
  if (!row) return { error: "Video not found" };
  await prisma.$transaction([
    prisma.onboardingVideo.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorRole: actor.role,
        action: "onboarding.video_deleted",
        entityType: "OnboardingVideo",
        entityId: id,
        metadata: JSON.stringify({ slug: row.slug, title: row.title }),
      },
    }),
  ]);
  revalidatePath("/admin");
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Member reads ─────────────────────────────────────────────────

export async function getMyOnboardingPlaylist(): Promise<MemberPlaylistEntry[]> {
  const session = await verifySession();
  const userId = session.id!;
  const videos = await prisma.onboardingVideo.findMany({
    where: { isActive: true },
    orderBy: [{ sortIndex: "asc" }, { createdAt: "asc" }],
  });
  if (videos.length === 0) return [];

  const views = await prisma.onboardingVideoView.findMany({
    where: { userId, videoId: { in: videos.map((v) => v.id) } },
    select: { videoId: true, percentWatched: true, completedAt: true, lastViewedAt: true },
  });
  const viewMap = new Map(views.map((v) => [v.videoId, v]));

  return videos.map((v) => {
    const view = viewMap.get(v.id);
    return {
      id: v.id,
      slug: v.slug,
      title: v.title,
      description: v.description,
      videoUrl: v.videoUrl,
      posterUrl: v.posterUrl,
      durationSec: v.durationSec,
      percentWatched: view?.percentWatched ?? 0,
      completed: Boolean(view?.completedAt),
      lastViewedAtIso: view?.lastViewedAt?.toISOString() ?? null,
    };
  });
}

// ─── Member writes ────────────────────────────────────────────────

export async function recordVideoView(input: {
  videoSlug: string;
  percentWatched: number;
}): Promise<{ percentWatched?: number; completed?: boolean; error?: string }> {
  const session = await verifySession();
  const userId = session.id!;
  const slug = input.videoSlug.trim().toLowerCase();
  const newPct = Math.max(0, Math.min(100, Math.round(input.percentWatched)));

  const video = await prisma.onboardingVideo.findUnique({
    where: { slug },
    select: { id: true, isActive: true },
  });
  if (!video) return { error: "Video not found" };
  if (!video.isActive) return { error: "Video is no longer active" };

  const existing = await prisma.onboardingVideoView.findUnique({
    where: { userId_videoId: { userId, videoId: video.id } },
    select: { percentWatched: true, completedAt: true },
  });

  const finalPct = Math.max(existing?.percentWatched ?? 0, newPct);
  const completed = finalPct >= 95;
  const now = new Date();

  await prisma.onboardingVideoView.upsert({
    where: { userId_videoId: { userId, videoId: video.id } },
    create: {
      userId,
      videoId: video.id,
      percentWatched: finalPct,
      lastViewedAt: now,
      completedAt: completed ? now : null,
    },
    update: {
      percentWatched: finalPct,
      lastViewedAt: now,
      // Only set completedAt the FIRST time we cross the threshold.
      completedAt: completed && !existing?.completedAt ? now : existing?.completedAt,
    },
  });

  // Audit-log only the completion event (avoid spamming the log with
  // every 5% progress tick from the player).
  if (completed && !existing?.completedAt) {
    await prisma.auditLog.create({
      data: {
        actorId: userId,
        actorRole: "MEMBER",
        action: "onboarding.video_completed",
        entityType: "OnboardingVideo",
        entityId: video.id,
        metadata: JSON.stringify({ slug, percentWatched: finalPct }),
      },
    });
  }

  return { percentWatched: finalPct, completed };
}

// ─── Welcome email touch sequence ────────────────────────────────

const TOUCHES = [
  { key: "welcome_day0", afterDays: 0,
    subject: "Welcome to NOHO Mailbox — your first week",
    bodyTemplate: (name: string) => `<p>Hi ${name},</p><p>Welcome aboard! We've put together a 3-minute walkthrough so you can hit the ground running:</p><p><a href="${process.env.AUTH_URL ?? "https://nohomailbox.org"}/dashboard?tab=welcome" style="display:inline-block;padding:10px 20px;border-radius:10px;background:#337485;color:#fff;font-weight:800;text-decoration:none;">Watch the walkthrough →</a></p><p>Any questions? Just reply to this email.</p>` },
  { key: "videos_day2",  afterDays: 2,
    subject: "Quick check-in — did you watch the walkthrough?",
    bodyTemplate: (name: string) => `<p>Hi ${name},</p><p>Just a friendly nudge — the welcome videos cover everything you need: how to log mail in your account, request scans, schedule pickups, and forward packages.</p><p><a href="${process.env.AUTH_URL ?? "https://nohomailbox.org"}/dashboard?tab=welcome" style="display:inline-block;padding:10px 20px;border-radius:10px;background:#337485;color:#fff;font-weight:800;text-decoration:none;">Continue watching →</a></p>` },
  { key: "checkin_day5", afterDays: 5,
    subject: "Anything we can help with?",
    bodyTemplate: (name: string) => `<p>Hi ${name},</p><p>You've been with us for almost a week — we just want to make sure everything's working smoothly. Reply to this email if anything's unclear, or stop by the bureau Mon–Fri 9:30am–5:30pm / Sat 10am–1:30pm.</p>` },
];

export type OnboardingSweepResult = {
  scanned: number;
  sent: number;
  byTouch: Record<string, number>;
  errors: number;
};

export async function runOnboardingTouchSweep(): Promise<OnboardingSweepResult> {
  const result: OnboardingSweepResult = { scanned: 0, sent: 0, byTouch: {}, errors: 0 };
  const now = new Date();

  // Members with mailbox assigned in the last 14 days. Anything older
  // than that timed out — we don't ambush long-tenured customers.
  const cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const candidates = await prisma.user.findMany({
    where: {
      role: "USER",
      mailboxAssignedAt: { gte: cutoff, not: null },
    },
    select: { id: true, name: true, email: true, mailboxAssignedAt: true, notifPrefs: true },
    take: 500,
  });
  result.scanned = candidates.length;

  // Pull all already-sent touches in one query so we don't N+1.
  const sentRows = await prisma.onboardingTouch.findMany({
    where: { userId: { in: candidates.map((c) => c.id) } },
    select: { userId: true, touchKey: true },
  });
  const sentSet = new Set(sentRows.map((r) => `${r.userId}::${r.touchKey}`));

  for (const u of candidates) {
    if (!u.email || !u.mailboxAssignedAt) continue;
    const ageMs = now.getTime() - u.mailboxAssignedAt.getTime();
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));

    for (const t of TOUCHES) {
      if (ageDays < t.afterDays) continue;
      if (sentSet.has(`${u.id}::${t.key}`)) continue;
      try {
        const firstName = (u.name ?? "there").split(/\s+/)[0]!;
        await sendEmail({
          to: u.email,
          subject: t.subject,
          html: t.bodyTemplate(firstName),
          kind: `onboarding_${t.key}`,
          userId: u.id,
        });
        await prisma.$transaction([
          prisma.onboardingTouch.create({
            data: { userId: u.id, touchKey: t.key },
          }),
          prisma.auditLog.create({
            data: {
              actorId: "system",
              actorRole: "ADMIN",
              action: "onboarding.touch_sent",
              entityType: "User",
              entityId: u.id,
              metadata: JSON.stringify({ touchKey: t.key, ageDays }),
            },
          }),
        ]);
        result.sent++;
        result.byTouch[t.key] = (result.byTouch[t.key] ?? 0) + 1;
      } catch (e) {
        console.error("[onboardingTouch] failed:", u.id, t.key, e);
        result.errors++;
      }
    }
  }

  return result;
}
