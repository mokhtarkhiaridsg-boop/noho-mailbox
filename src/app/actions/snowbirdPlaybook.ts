"use server";

/**
 * iter-213 — Snowbird forwarding playbook (Tier 15 #122).
 *
 * One-tap orchestration that bundles four existing features into a
 * single "I'm leaving for the season" setup flow:
 *   1. iter-192 ForwardingAddress — pick or auto-detect default
 *   2. iter-194 User.locale — set translation language for any
 *      scanned letters that arrive while away
 *   3. iter-170 ScheduledForwarding (recurring) — auto-ship every
 *      eligible mail item on a chosen cadence
 *   4. iter-206 PlanPause — pause full subscription for a $5/mo
 *      holding fee, mail still received
 *
 * Why bundle: setting these one at a time across 4 different cards
 * is the #1 friction point reported by snowbird members. The playbook
 * collapses it into a 3-question wizard (when, where, how often).
 *
 * Atomicity: the 4 sub-actions run in sequence (some are external
 * cron-driven and can't share a transaction). We collect per-step
 * status so the UI can show a green-check timeline. Audit logs the
 * full kickoff with all parameters.
 */

import { prisma } from "@/lib/prisma";
import { verifySession } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { setRecurringForwarding } from "@/app/actions/scheduledForwardingBatch";
import { requestPlanPause } from "@/app/actions/planPause";
import type { ForwardingFrequency } from "@/lib/scheduledForwarding";
import { isLanguageCode } from "@/lib/aiTranslation";

export type PlaybookStatus = {
  hasDefaultAddress: boolean;
  defaultAddressLabel: string | null;
  defaultAddressId: string | null;
  addressCount: number;
  locale: string | null;
  recurringFrequency: string | null;
  recurringEnabled: boolean;
  activePause: { startDate: string; endDate: string } | null;
  scheduledPause: { startDate: string; endDate: string } | null;
};

export async function getMyPlaybookStatus(): Promise<PlaybookStatus> {
  const session = await verifySession();
  const userId = session.id!;

  const [user, addresses, scheduled, pauses] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { locale: true } }),
    prisma.forwardingAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { lastUsedAt: "desc" }],
      take: 30,
    }),
    prisma.scheduledForwarding.findFirst({
      where: { userId, active: true },
      select: { frequency: true, enabled: true },
    }).catch(() => null),
    prisma.planPause.findMany({
      where: { userId, status: { in: ["Active", "Scheduled"] } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  const def = addresses.find((a) => a.isDefault) ?? addresses[0] ?? null;
  const active = pauses.find((p) => p.status === "Active");
  const sched = pauses.find((p) => p.status === "Scheduled");

  return {
    hasDefaultAddress: !!def,
    defaultAddressLabel: def?.label ?? null,
    defaultAddressId: def?.id ?? null,
    addressCount: addresses.length,
    locale: user?.locale ?? null,
    recurringFrequency: scheduled?.frequency ?? null,
    recurringEnabled: !!scheduled?.enabled,
    activePause: active ? { startDate: active.startDate, endDate: active.endDate } : null,
    scheduledPause: sched ? { startDate: sched.startDate, endDate: sched.endDate } : null,
  };
}

export type PlaybookStepResult = {
  step: "address" | "locale" | "recurring" | "pause";
  ok: boolean;
  detail?: string;
};

export type PlaybookRunResult = {
  steps: PlaybookStepResult[];
  errors: string[];
  pauseScheduled: boolean;
};

export type RunPlaybookInput = {
  startDate: string;             // YYYY-MM-DD — pause starts
  endDate: string;               // YYYY-MM-DD — pause auto-resumes
  forwardingAddressId: string;   // existing iter-192 ForwardingAddress.id
  recurringFrequency: ForwardingFrequency;
  locale?: string;               // iter-183 dashboard / iter-194 default translate language
  notes?: string;                // optional member note included in batch + pause request
};

export async function runSnowbirdPlaybook(input: RunPlaybookInput): Promise<PlaybookRunResult> {
  const session = await verifySession();
  const userId = session.id!;
  const result: PlaybookRunResult = { steps: [], errors: [], pauseScheduled: false };

  // 1. Address: confirm the picked one belongs to the user, promote
  //    to default so iter-170 batches use it without ambiguity.
  try {
    const addr = await prisma.forwardingAddress.findUnique({ where: { id: input.forwardingAddressId } });
    if (!addr || addr.userId !== userId) {
      result.steps.push({ step: "address", ok: false, detail: "address not found or not yours" });
      result.errors.push("Forwarding address invalid");
    } else if (addr.isDefault) {
      result.steps.push({ step: "address", ok: true, detail: `using default: ${addr.label}` });
    } else {
      await prisma.$transaction([
        prisma.forwardingAddress.updateMany({
          where: { userId, NOT: { id: addr.id } },
          data: { isDefault: false },
        }),
        prisma.forwardingAddress.update({ where: { id: addr.id }, data: { isDefault: true } }),
        prisma.auditLog.create({
          data: {
            actorId: userId, actorRole: session.role ?? "MEMBER",
            action: "snowbird_playbook.address_promoted",
            entityType: "ForwardingAddress", entityId: addr.id,
            metadata: JSON.stringify({ label: addr.label }),
          },
        }),
      ]);
      result.steps.push({ step: "address", ok: true, detail: `promoted ${addr.label} to default` });
    }
  } catch (e) {
    result.steps.push({ step: "address", ok: false, detail: e instanceof Error ? e.message : String(e) });
    result.errors.push("Couldn't set default address");
  }

  // 2. Locale: set User.locale so iter-194 auto-translate uses it as
  //    the default target language for any scanned letters that arrive
  //    while away.
  if (input.locale && isLanguageCode(input.locale)) {
    try {
      await prisma.user.update({ where: { id: userId }, data: { locale: input.locale } });
      await prisma.auditLog.create({
        data: {
          actorId: userId, actorRole: session.role ?? "MEMBER",
          action: "snowbird_playbook.locale_set",
          entityType: "User", entityId: userId,
          metadata: JSON.stringify({ locale: input.locale }),
        },
      }).catch(() => null);
      result.steps.push({ step: "locale", ok: true, detail: `default translate language: ${input.locale}` });
    } catch (e) {
      result.steps.push({ step: "locale", ok: false, detail: e instanceof Error ? e.message : String(e) });
      result.errors.push("Couldn't set translate language");
    }
  } else {
    result.steps.push({ step: "locale", ok: true, detail: "skipped (no locale picked)" });
  }

  // 3. Recurring forwarding: wire iter-170 to ship eligible mail at the
  //    chosen cadence, using the just-promoted default address.
  try {
    const res = await setRecurringForwarding({
      frequency: input.recurringFrequency,
      addressId: input.forwardingAddressId,
      notes: input.notes ?? "Snowbird playbook auto-set",
    });
    if (res.error) {
      result.steps.push({ step: "recurring", ok: false, detail: res.error });
      result.errors.push("Couldn't set recurring forwarding");
    } else {
      result.steps.push({ step: "recurring", ok: true, detail: `every ${input.recurringFrequency}` });
    }
  } catch (e) {
    result.steps.push({ step: "recurring", ok: false, detail: e instanceof Error ? e.message : String(e) });
    result.errors.push("Couldn't set recurring forwarding");
  }

  // 4. Plan pause: schedule the iter-206 pause for the same window.
  try {
    const res = await requestPlanPause({
      startDate: input.startDate,
      endDate: input.endDate,
      reason: input.notes ?? "Snowbird playbook auto-scheduled",
    });
    if (res.error) {
      result.steps.push({ step: "pause", ok: false, detail: res.error });
      result.errors.push(res.error);
    } else {
      result.steps.push({ step: "pause", ok: true, detail: `${input.startDate} → ${input.endDate}` });
      result.pauseScheduled = true;
    }
  } catch (e) {
    result.steps.push({ step: "pause", ok: false, detail: e instanceof Error ? e.message : String(e) });
    result.errors.push("Couldn't schedule plan pause");
  }

  await prisma.auditLog.create({
    data: {
      actorId: userId, actorRole: session.role ?? "MEMBER",
      action: "snowbird_playbook.kicked_off",
      entityType: "User", entityId: userId,
      metadata: JSON.stringify({
        startDate: input.startDate, endDate: input.endDate,
        forwardingAddressId: input.forwardingAddressId,
        recurringFrequency: input.recurringFrequency,
        locale: input.locale ?? null,
        steps: result.steps.map((s) => ({ step: s.step, ok: s.ok })),
        errorCount: result.errors.length,
      }),
    },
  }).catch(() => null);

  revalidatePath("/dashboard");
  return result;
}
