/**
 * IndexNow daily cron — pushes the entire sitemap to Bing + Yandex +
 * Naver + Seznam + Yep so newly-deployed pages get crawled within
 * seconds instead of waiting on the next organic cycle (which can take
 * weeks for a young site with no backlinks).
 *
 * Why daily and not per-deploy:
 *  - IndexNow tolerates dupes; pinging an unchanged URL is a no-op on
 *    their side
 *  - We have no per-deploy webhook yet
 *  - 1×/day is enough — even a cold start makes us indexable within ~48h
 *    on Bing's reading cadence
 *
 * Auth: Bearer ${CRON_SECRET}.
 * Schedule: see vercel.json (daily at 7am UTC).
 */

import { NextResponse } from "next/server";
import { pingSitemap } from "@/lib/indexnow";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "";
  const expected = `Bearer ${process.env.CRON_SECRET ?? ""}`;
  if (!process.env.CRON_SECRET || authHeader !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const summary = await pingSitemap();
  return NextResponse.json({
    ok: summary.failed === 0,
    submitted: summary.succeeded,
    total: summary.total,
    batches: summary.batches.length,
    errors: summary.batches.filter((b) => !b.ok).map((b) => b.error).filter(Boolean),
  });
}
