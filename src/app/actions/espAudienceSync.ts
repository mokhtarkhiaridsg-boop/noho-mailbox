"use server";

/**
 * iter-172 — ESP audience sync server actions (Tier 11 #81).
 *
 * Admin configures one or more EspAudienceSync rows (Mailchimp /
 * ConvertKit / Buttondown / CSV download). Per-member opt-in to
 * `notifPrefs.marketing.email` filters the candidate set when
 * `marketingOptInOnly = true` (default).
 *
 * Sync flow:
 *  1. Resolve eligible members via prisma.user
 *  2. Walk per-row in JS to apply notifPrefs predicate
 *  3. Hand off to the provider module (or stream a CSV)
 *  4. Persist EspSyncRun + audit + update lastSync* counters
 *
 * Rate-limit: max one run per audience per 60 seconds.
 */

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { parsePrefs } from "@/lib/notifPrefs";
import { getProvider } from "@/lib/esp/registry";
import type { EspContact, EspProvider } from "@/lib/esp/types";

const MIN_SECONDS_BETWEEN_RUNS = 60;

export type EspAudienceRow = {
  id: string;
  provider: EspProvider;
  label: string;
  audienceId: string | null;
  apiServer: string | null;
  hasApiKey: boolean;            // never expose the actual key in listings
  isActive: boolean;
  marketingOptInOnly: boolean;
  doubleOptIn: boolean;
  lastSyncAtIso: string | null;
  lastSyncCount: number | null;
  lastSyncFailed: number | null;
  lastSyncError: string | null;
  createdAtIso: string;
};

function toRow(r: { id: string; provider: string; label: string; audienceId: string | null; apiServer: string | null; apiKey: string | null; isActive: boolean; marketingOptInOnly: boolean; doubleOptIn: boolean; lastSyncAt: Date | null; lastSyncCount: number | null; lastSyncFailed: number | null; lastSyncError: string | null; createdAt: Date }): EspAudienceRow {
  return {
    id: r.id,
    provider: r.provider as EspProvider,
    label: r.label,
    audienceId: r.audienceId,
    apiServer: r.apiServer,
    hasApiKey: !!r.apiKey,
    isActive: r.isActive,
    marketingOptInOnly: r.marketingOptInOnly,
    doubleOptIn: r.doubleOptIn,
    lastSyncAtIso: r.lastSyncAt?.toISOString() ?? null,
    lastSyncCount: r.lastSyncCount,
    lastSyncFailed: r.lastSyncFailed,
    lastSyncError: r.lastSyncError,
    createdAtIso: r.createdAt.toISOString(),
  };
}

// ─── CRUD ────────────────────────────────────────────────────────────
export async function listEspAudienceSyncs(): Promise<EspAudienceRow[]> {
  await verifyAdmin();
  const rows = await prisma.espAudienceSync.findMany({
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
    take: 30,
  });
  return rows.map(toRow);
}

export type UpsertEspInput = {
  id?: string;
  provider: EspProvider;
  label: string;
  audienceId?: string;
  apiKey?: string;
  apiServer?: string;
  marketingOptInOnly?: boolean;
  doubleOptIn?: boolean;
  isActive?: boolean;
};

export async function upsertEspAudienceSync(input: UpsertEspInput): Promise<{ id?: string; error?: string }> {
  const actor = await verifyAdmin();
  const label = input.label.trim().slice(0, 80);
  if (label.length < 2) return { error: "Label required (≥2 chars)." };
  if (!["mailchimp", "convertkit", "buttondown", "csv"].includes(input.provider)) {
    return { error: "Unknown provider." };
  }
  // CSV doesn't need API keys / audience IDs.
  if (input.provider !== "csv") {
    if (!(input.apiKey ?? "").trim()) return { error: "API key required for this provider." };
    if (input.provider !== "buttondown" && !(input.audienceId ?? "").trim()) {
      return { error: "Audience / form ID required for this provider." };
    }
  }
  const data = {
    provider: input.provider,
    label,
    audienceId: input.audienceId?.trim() || null,
    apiKey: input.apiKey?.trim() || null,
    apiServer: input.apiServer?.trim() || null,
    isActive: input.isActive ?? true,
    marketingOptInOnly: input.marketingOptInOnly ?? true,
    doubleOptIn: input.doubleOptIn ?? false,
  };
  let id = input.id;
  if (id) {
    // On update, don't clobber the existing apiKey when the input is
    // empty — admin might be editing the label without re-entering it.
    const existing = await prisma.espAudienceSync.findUnique({ where: { id } });
    if (!existing) return { error: "Audience not found." };
    const finalApiKey = data.apiKey ?? existing.apiKey;
    await prisma.espAudienceSync.update({
      where: { id },
      data: { ...data, apiKey: finalApiKey },
    });
  } else {
    const created = await prisma.espAudienceSync.create({ data });
    id = created.id;
  }
  await prisma.auditLog.create({
    data: {
      actorId: actor.id, actorRole: actor.role,
      action: input.id ? "esp.audience_updated" : "esp.audience_created",
      entityType: "EspAudienceSync",
      entityId: id,
      metadata: JSON.stringify({ provider: input.provider, label, audienceId: data.audienceId, marketingOptInOnly: data.marketingOptInOnly }),
    },
  });
  revalidatePath("/admin");
  return { id };
}

export async function deleteEspAudienceSync(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const row = await prisma.espAudienceSync.findUnique({ where: { id: input.id } });
  if (!row) return { error: "Audience not found." };
  await prisma.$transaction([
    prisma.espAudienceSync.delete({ where: { id: input.id } }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "esp.audience_deleted",
        entityType: "EspAudienceSync",
        entityId: input.id,
        metadata: JSON.stringify({ provider: row.provider, label: row.label }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

// ─── Preview eligible candidates ─────────────────────────────────────
export type EspPreview = {
  total: number;
  eligible: number;
  withEmail: number;
  optedOut: number;
  noEmail: number;
  sample: Array<{ id: string; name: string; email: string }>;
};

async function resolveEligible(marketingOptInOnly: boolean): Promise<{ contacts: EspContact[]; preview: EspPreview }> {
  const users = await prisma.user.findMany({
    where: { role: { not: "ADMIN" } },
    select: { id: true, name: true, email: true, suiteNumber: true, plan: true, notifPrefs: true },
  });
  const contacts: EspContact[] = [];
  const sample: EspPreview["sample"] = [];
  let withEmail = 0, optedOut = 0, noEmail = 0;
  for (const u of users) {
    if (!u.email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(u.email)) { noEmail += 1; continue; }
    withEmail += 1;
    if (marketingOptInOnly) {
      // Custom marketing opt-in lives in notifPrefs.marketing.email.
      // We treat undefined as OFF (strict-opt-in).
      const prefs = parsePrefs(u.notifPrefs);
      const m = (prefs as Record<string, { email?: boolean }>).marketing;
      if (!m?.email) { optedOut += 1; continue; }
    }
    const firstName = (u.name ?? "").split(" ")[0] || null;
    const lastName = (u.name ?? "").split(" ").slice(1).join(" ") || null;
    contacts.push({
      email: u.email,
      name: u.name ?? null,
      firstName, lastName,
      meta: { suite: u.suiteNumber ?? null, plan: u.plan ?? null },
    });
    if (sample.length < 8) sample.push({ id: u.id, name: u.name, email: u.email });
  }
  return {
    contacts,
    preview: {
      total: users.length,
      eligible: contacts.length,
      withEmail,
      optedOut,
      noEmail,
      sample,
    },
  };
}

export async function previewEspAudience(input: { marketingOptInOnly?: boolean }): Promise<EspPreview> {
  await verifyAdmin();
  const { preview } = await resolveEligible(input.marketingOptInOnly ?? true);
  return preview;
}

// ─── Run sync ────────────────────────────────────────────────────────
export type RunSyncResult = {
  ok: boolean;
  total: number;
  added: number;
  skipped: number;
  failed: number;
  error?: string;
  csvDownloadName?: string;       // when provider="csv": filename (the body lives in csvBody)
  csvBody?: string;               // CSV body the panel can offer as a Blob download
};

export async function runEspAudienceSync(input: { id: string; source?: "manual" | "scheduled" | "test" }): Promise<RunSyncResult> {
  const actor = await verifyAdmin();
  const audience = await prisma.espAudienceSync.findUnique({ where: { id: input.id } });
  if (!audience) return { ok: false, total: 0, added: 0, skipped: 0, failed: 0, error: "Audience not found." };
  if (!audience.isActive) return { ok: false, total: 0, added: 0, skipped: 0, failed: 0, error: "Audience is paused." };
  if (audience.lastSyncAt && Date.now() - audience.lastSyncAt.getTime() < MIN_SECONDS_BETWEEN_RUNS * 1000) {
    return { ok: false, total: 0, added: 0, skipped: 0, failed: 0, error: `Wait ${MIN_SECONDS_BETWEEN_RUNS}s between runs.` };
  }

  const start = Date.now();
  const run = await prisma.espSyncRun.create({
    data: {
      audienceId: audience.id,
      source: input.source ?? "manual",
      total: 0, added: 0, skipped: 0, failed: 0,
      startedBy: actor.id ?? null,
    },
  });

  try {
    const { contacts, preview } = await resolveEligible(audience.marketingOptInOnly);
    if (contacts.length === 0) {
      await finalizeRun(run.id, { total: preview.total, added: 0, skipped: 0, failed: 0, error: "No eligible contacts.", durationMs: Date.now() - start });
      await stampAudience(audience.id, { lastSyncAt: new Date(), lastSyncCount: 0, lastSyncFailed: 0, lastSyncError: "No eligible contacts.", lastSyncBy: actor.id ?? null });
      return { ok: false, total: preview.total, added: 0, skipped: 0, failed: 0, error: "No eligible contacts." };
    }

    if (audience.provider === "csv") {
      const body = buildCsv(contacts);
      const filename = `noho-mailing-list-${new Date().toISOString().slice(0, 10)}.csv`;
      await finalizeRun(run.id, { total: contacts.length, added: contacts.length, skipped: 0, failed: 0, durationMs: Date.now() - start });
      await stampAudience(audience.id, { lastSyncAt: new Date(), lastSyncCount: contacts.length, lastSyncFailed: 0, lastSyncError: null, lastSyncBy: actor.id ?? null });
      await prisma.auditLog.create({
        data: {
          actorId: actor.id, actorRole: actor.role,
          action: "esp.audience_synced",
          entityType: "EspAudienceSync",
          entityId: audience.id,
          metadata: JSON.stringify({ provider: "csv", added: contacts.length, runId: run.id }),
        },
      });
      revalidatePath("/admin");
      return { ok: true, total: contacts.length, added: contacts.length, skipped: 0, failed: 0, csvDownloadName: filename, csvBody: body };
    }

    const provider = getProvider(audience.provider as EspProvider);
    if (!provider) {
      await finalizeRun(run.id, { total: contacts.length, added: 0, skipped: 0, failed: contacts.length, error: "Unknown provider", durationMs: Date.now() - start });
      return { ok: false, total: contacts.length, added: 0, skipped: 0, failed: contacts.length, error: "Unknown provider" };
    }

    const result = await provider.pushContacts({
      apiKey: audience.apiKey ?? "",
      audienceId: audience.audienceId,
      apiServer: audience.apiServer,
      doubleOptIn: audience.doubleOptIn,
    }, contacts);

    await finalizeRun(run.id, { total: contacts.length, added: result.added, skipped: result.skipped, failed: result.failed, error: result.error, durationMs: Date.now() - start });
    await stampAudience(audience.id, {
      lastSyncAt: new Date(),
      lastSyncCount: result.added,
      lastSyncFailed: result.failed,
      lastSyncError: result.error ?? null,
      lastSyncBy: actor.id ?? null,
    });
    await prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: actor.role,
        action: "esp.audience_synced",
        entityType: "EspAudienceSync",
        entityId: audience.id,
        metadata: JSON.stringify({ provider: audience.provider, added: result.added, skipped: result.skipped, failed: result.failed, runId: run.id }),
      },
    });
    revalidatePath("/admin");
    return { ok: result.failed === 0, total: contacts.length, added: result.added, skipped: result.skipped, failed: result.failed, error: result.error };
  } catch (e) {
    const err = e instanceof Error ? e.message : String(e);
    await finalizeRun(run.id, { total: 0, added: 0, skipped: 0, failed: 0, error: err, durationMs: Date.now() - start });
    return { ok: false, total: 0, added: 0, skipped: 0, failed: 0, error: err };
  }
}

async function finalizeRun(id: string, data: { total: number; added: number; skipped: number; failed: number; error?: string | null; durationMs: number }): Promise<void> {
  try {
    await prisma.espSyncRun.update({
      where: { id },
      data: {
        total: data.total, added: data.added, skipped: data.skipped, failed: data.failed,
        error: data.error ?? null,
        durationMs: data.durationMs,
        finishedAt: new Date(),
      },
    });
  } catch { /* swallow */ }
}

async function stampAudience(id: string, data: { lastSyncAt: Date; lastSyncCount: number; lastSyncFailed: number; lastSyncError: string | null; lastSyncBy: string | null }): Promise<void> {
  try {
    await prisma.espAudienceSync.update({ where: { id }, data });
  } catch { /* swallow */ }
}

function buildCsv(contacts: EspContact[]): string {
  const header = "email,name,first_name,last_name,suite,plan";
  const rows = contacts.map((c) => {
    const cells = [
      c.email,
      c.name ?? "",
      c.firstName ?? "",
      c.lastName ?? "",
      String(c.meta?.suite ?? ""),
      String(c.meta?.plan ?? ""),
    ].map(csvEscape);
    return cells.join(",");
  });
  return [header, ...rows].join("\n") + "\n";
}
function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// ─── Run history ─────────────────────────────────────────────────────
export type EspRunRow = {
  id: string;
  source: string;
  total: number;
  added: number;
  skipped: number;
  failed: number;
  error: string | null;
  durationMs: number | null;
  startedAtIso: string;
  finishedAtIso: string | null;
};
export async function listEspSyncRuns(input: { audienceId: string; limit?: number }): Promise<EspRunRow[]> {
  await verifyAdmin();
  const rows = await prisma.espSyncRun.findMany({
    where: { audienceId: input.audienceId },
    orderBy: { startedAt: "desc" },
    take: Math.max(5, Math.min(50, input.limit ?? 12)),
  });
  return rows.map((r) => ({
    id: r.id,
    source: r.source,
    total: r.total, added: r.added, skipped: r.skipped, failed: r.failed,
    error: r.error,
    durationMs: r.durationMs,
    startedAtIso: r.startedAt.toISOString(),
    finishedAtIso: r.finishedAt?.toISOString() ?? null,
  }));
}
