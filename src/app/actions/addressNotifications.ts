"use server";

/**
 * iter-233 — Address-of-record auto-update server actions
 * (Tier 17 #142).
 *
 * Member curates a list of orgs (banks, schools, employers,
 * subscriptions, government, insurance) and triggers a "notice run"
 * that emails each contact with a templated address-change letter.
 * Postal-only contacts get a row queued for the admin's address-notice
 * queue (admin marks "mailed" when the letter goes in the post).
 *
 * Reuses iter-228 atomic update + audit pattern, iter-225-style fire-
 * and-forget post-tx email, iter-230-style admin sweep + summary view.
 */

import { prisma } from "@/lib/prisma";
import { verifySession, verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import { sendEmail } from "@/lib/email";

const CATEGORIES = ["bank", "school", "employer", "government", "subscription", "insurance", "other"] as const;
export type ContactCategory = (typeof CATEGORIES)[number];

export type AddressNotificationContactRow = {
  id: string;
  label: string;
  category: ContactCategory | null;
  contactEmail: string | null;
  contactPostal: string | null;
  accountNumber: string | null;
  notes: string | null;
  active: boolean;
  channel: "email" | "postal" | "none";
  createdAtIso: string;
};

export type AddressChangeNoticeItemRow = {
  id: string;
  contactLabel: string;
  contactCategory: string | null;
  channel: "email" | "postal";
  recipient: string;
  accountNumber: string | null;
  status: "queued" | "sent" | "failed" | "mailed" | "skipped";
  error: string | null;
  emailLogId: string | null;
  sentAtIso: string | null;
};

export type AddressChangeNoticeRunRow = {
  id: string;
  userId: string;
  userName: string | null;
  userSuite: string | null;
  oldAddressBody: string | null;
  newAddressBody: string;
  effectiveDate: string | null;
  noticeMessage: string | null;
  status: "Pending" | "Running" | "Completed" | "Cancelled";
  contactsTotal: number;
  emailsSent: number;
  postalGenerated: number;
  createdAtIso: string;
  completedAtIso: string | null;
  items: AddressChangeNoticeItemRow[];
};

function asCategory(c: string | null | undefined): ContactCategory | null {
  if (!c) return null;
  return (CATEGORIES as readonly string[]).includes(c) ? (c as ContactCategory) : "other";
}

function contactToView(r: { id: string; label: string; category: string | null; contactEmail: string | null; contactPostal: string | null; accountNumber: string | null; notes: string | null; active: boolean; createdAt: Date }): AddressNotificationContactRow {
  const channel: "email" | "postal" | "none" = r.contactEmail ? "email" : r.contactPostal ? "postal" : "none";
  return {
    id: r.id, label: r.label,
    category: asCategory(r.category),
    contactEmail: r.contactEmail, contactPostal: r.contactPostal,
    accountNumber: r.accountNumber, notes: r.notes,
    active: r.active, channel,
    createdAtIso: r.createdAt.toISOString(),
  };
}

function itemToView(i: { id: string; contactLabel: string; contactCategory: string | null; channel: string; recipient: string; accountNumber: string | null; status: string; error: string | null; emailLogId: string | null; sentAt: Date | null }): AddressChangeNoticeItemRow {
  const channel: "email" | "postal" = i.channel === "postal" ? "postal" : "email";
  const status: AddressChangeNoticeItemRow["status"] =
    i.status === "sent" ? "sent" :
    i.status === "failed" ? "failed" :
    i.status === "mailed" ? "mailed" :
    i.status === "skipped" ? "skipped" : "queued";
  return {
    id: i.id, contactLabel: i.contactLabel, contactCategory: i.contactCategory,
    channel, recipient: i.recipient, accountNumber: i.accountNumber,
    status, error: i.error, emailLogId: i.emailLogId,
    sentAtIso: i.sentAt?.toISOString() ?? null,
  };
}

function runToView(r: { id: string; userId: string; user?: { name: string | null; suiteNumber: string | null } | null; oldAddressBody: string | null; newAddressBody: string; effectiveDate: string | null; noticeMessage: string | null; status: string; contactsTotal: number; emailsSent: number; postalGenerated: number; createdAt: Date; completedAt: Date | null; items: Array<{ id: string; contactLabel: string; contactCategory: string | null; channel: string; recipient: string; accountNumber: string | null; status: string; error: string | null; emailLogId: string | null; sentAt: Date | null }> }): AddressChangeNoticeRunRow {
  const status: AddressChangeNoticeRunRow["status"] =
    r.status === "Running" ? "Running" :
    r.status === "Completed" ? "Completed" :
    r.status === "Cancelled" ? "Cancelled" : "Pending";
  return {
    id: r.id, userId: r.userId,
    userName: r.user?.name ?? null, userSuite: r.user?.suiteNumber ?? null,
    oldAddressBody: r.oldAddressBody, newAddressBody: r.newAddressBody,
    effectiveDate: r.effectiveDate, noticeMessage: r.noticeMessage,
    status, contactsTotal: r.contactsTotal,
    emailsSent: r.emailsSent, postalGenerated: r.postalGenerated,
    createdAtIso: r.createdAt.toISOString(),
    completedAtIso: r.completedAt?.toISOString() ?? null,
    items: r.items.map(itemToView),
  };
}

// ─── Member: contact CRUD ──────────────────────────────────────────────

export async function listMyAddressNotificationContacts(): Promise<AddressNotificationContactRow[]> {
  const me = await verifySession();
  const rows = await prisma.addressNotificationContact.findMany({
    where: { userId: me.id },
    orderBy: [{ active: "desc" }, { createdAt: "desc" }],
    take: 100,
  });
  return rows.map(contactToView);
}

export async function upsertMyAddressNotificationContact(input: {
  id?: string;
  label: string;
  category?: ContactCategory;
  contactEmail?: string;
  contactPostal?: string;
  accountNumber?: string;
  notes?: string;
  active?: boolean;
}): Promise<{ row?: AddressNotificationContactRow; error?: string }> {
  const me = await verifySession();
  const label = input.label?.trim().slice(0, 120);
  if (!label || label.length < 2) return { error: "Label required (≥2 chars)." };
  const email = input.contactEmail?.trim().toLowerCase();
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Email looks invalid." };
  const postal = input.contactPostal?.trim().slice(0, 500);
  if (!email && !postal) return { error: "Provide either an email or postal address." };
  const data = {
    userId: me.id,
    label,
    category: input.category && (CATEGORIES as readonly string[]).includes(input.category) ? input.category : null,
    contactEmail: email || null,
    contactPostal: postal || null,
    accountNumber: input.accountNumber?.trim().slice(0, 80) || null,
    notes: input.notes?.trim().slice(0, 500) || null,
    active: input.active ?? true,
  };
  let row;
  if (input.id) {
    const existing = await prisma.addressNotificationContact.findUnique({ where: { id: input.id } });
    if (!existing || existing.userId !== me.id) return { error: "Contact not found." };
    row = await prisma.addressNotificationContact.update({ where: { id: input.id }, data });
  } else {
    row = await prisma.addressNotificationContact.create({ data });
  }
  await prisma.auditLog.create({
    data: {
      actorId: me.id, actorRole: "MEMBER",
      action: input.id ? "address_contact.updated" : "address_contact.created",
      entityType: "AddressNotificationContact", entityId: row.id,
      metadata: JSON.stringify({ label, category: input.category ?? null, channel: email ? "email" : "postal" }),
    },
  }).catch(() => null);
  revalidatePath("/dashboard");
  return { row: contactToView(row) };
}

export async function deleteMyAddressNotificationContact(input: { id: string }): Promise<{ success?: boolean; error?: string }> {
  const me = await verifySession();
  const row = await prisma.addressNotificationContact.findUnique({ where: { id: input.id } });
  if (!row || row.userId !== me.id) return { error: "Contact not found." };
  await prisma.$transaction([
    prisma.addressNotificationContact.delete({ where: { id: row.id } }),
    prisma.auditLog.create({
      data: {
        actorId: me.id, actorRole: "MEMBER",
        action: "address_contact.deleted",
        entityType: "AddressNotificationContact", entityId: row.id,
        metadata: JSON.stringify({ label: row.label }),
      },
    }),
  ]);
  revalidatePath("/dashboard");
  return { success: true };
}

// ─── Member: trigger notice run ────────────────────────────────────────

export async function triggerAddressChangeNotice(input: {
  newAddressBody: string;
  oldAddressBody?: string;
  effectiveDate?: string;
  noticeMessage?: string;
  contactIds?: string[];          // null/undefined = all active
  fromAddressId?: string;
}): Promise<{ run?: AddressChangeNoticeRunRow; error?: string }> {
  const me = await verifySession();
  const fullMe = await prisma.user.findUnique({ where: { id: me.id }, select: { id: true, name: true, email: true, suiteNumber: true } });
  if (!fullMe) return { error: "Account not found." };
  const newAddr = input.newAddressBody?.trim().slice(0, 1000);
  if (!newAddr || newAddr.length < 6) return { error: "New address required (≥6 chars)." };

  const where = { userId: me.id, active: true, ...(input.contactIds ? { id: { in: input.contactIds } } : {}) };
  const contacts = await prisma.addressNotificationContact.findMany({ where });
  if (contacts.length === 0) return { error: "No active contacts in your list." };

  const now = new Date();
  const run = await prisma.addressChangeNoticeRun.create({
    data: {
      userId: me.id,
      triggeredFromAddrId: input.fromAddressId ?? null,
      oldAddressBody: input.oldAddressBody?.trim().slice(0, 1000) || null,
      newAddressBody: newAddr,
      effectiveDate: input.effectiveDate || null,
      noticeMessage: input.noticeMessage?.trim().slice(0, 500) || null,
      contactsTotal: contacts.length,
      status: "Running",
      items: {
        create: contacts.map((c) => ({
          contactId: c.id,
          contactLabel: c.label,
          contactCategory: c.category,
          channel: c.contactEmail ? "email" : "postal",
          recipient: (c.contactEmail || c.contactPostal) ?? "",
          accountNumber: c.accountNumber,
          status: "queued",
        })),
      },
    },
    include: { items: true },
  });

  await prisma.auditLog.create({
    data: {
      actorId: me.id, actorRole: "MEMBER",
      action: "address_notice.triggered",
      entityType: "AddressChangeNoticeRun", entityId: run.id,
      metadata: JSON.stringify({ contactsTotal: contacts.length, effectiveDate: input.effectiveDate ?? null }),
    },
  }).catch(() => null);

  // Process emails inline (small contact list — typical 5-15 orgs).
  // Postal items stay queued for admin to mark mailed.
  let emailsSent = 0;
  let postalGenerated = 0;
  for (const it of run.items) {
    if (it.channel === "email") {
      try {
        const html = buildNoticeEmail({
          memberName: fullMe.name ?? "(NOHO Mailbox member)",
          memberEmail: fullMe.email ?? null,
          oldAddress: input.oldAddressBody ?? null,
          newAddress: newAddr,
          effectiveDate: input.effectiveDate ?? null,
          accountNumber: it.accountNumber ?? null,
          orgLabel: it.contactLabel,
          noticeMessage: input.noticeMessage ?? null,
        });
        const result = await sendEmail({
          to: it.recipient, userId: me.id,
          subject: `Address change notice — ${fullMe.name ?? "NOHO Mailbox member"}`,
          kind: "address_change_notice",
          html,
        });
        await prisma.addressChangeNoticeItem.update({
          where: { id: it.id },
          data: { status: "sent", emailLogId: result.logId, sentAt: new Date() },
        });
        emailsSent += 1;
      } catch (e) {
        await prisma.addressChangeNoticeItem.update({
          where: { id: it.id },
          data: { status: "failed", error: e instanceof Error ? e.message.slice(0, 200) : "send failed" },
        });
      }
    } else {
      // Postal: stays queued — admin will print + mark mailed.
      postalGenerated += 1;
    }
  }

  const completed = await prisma.addressChangeNoticeRun.update({
    where: { id: run.id },
    data: {
      status: "Completed",
      emailsSent, postalGenerated,
      completedAt: new Date(),
    },
    include: { items: true, user: { select: { name: true, suiteNumber: true } } },
  });

  revalidatePath("/dashboard"); revalidatePath("/admin");
  return { run: runToView(completed) };
}

export async function getMyAddressChangeNoticeRuns(input: { limit?: number } = {}): Promise<AddressChangeNoticeRunRow[]> {
  const me = await verifySession();
  const limit = Math.min(50, Math.max(1, input.limit ?? 10));
  const rows = await prisma.addressChangeNoticeRun.findMany({
    where: { userId: me.id },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: { items: { orderBy: { createdAt: "asc" } }, user: { select: { name: true, suiteNumber: true } } },
  });
  return rows.map(runToView);
}

// ─── Admin: postal queue management ────────────────────────────────────

export async function listAddressNoticesAdmin(input: { status?: "Pending" | "Running" | "Completed" | "Cancelled"; channel?: "email" | "postal"; limit?: number } = {}): Promise<AddressChangeNoticeRunRow[]> {
  await verifyAdmin();
  const limit = Math.min(200, Math.max(1, input.limit ?? 30));
  const where = input.status ? { status: input.status } : {};
  const rows = await prisma.addressChangeNoticeRun.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      items: input.channel ? { where: { channel: input.channel }, orderBy: { createdAt: "asc" } } : { orderBy: { createdAt: "asc" } },
      user: { select: { name: true, suiteNumber: true } },
    },
  });
  return rows.map(runToView);
}

export async function markPostalLetterMailed(input: { itemId: string; trackingNote?: string }): Promise<{ success?: boolean; error?: string }> {
  const actor = await verifyAdmin();
  const it = await prisma.addressChangeNoticeItem.findUnique({ where: { id: input.itemId }, include: { run: true } });
  if (!it) return { error: "Item not found." };
  if (it.channel !== "postal") return { error: "Only postal items can be marked mailed." };
  if (it.status === "mailed") return { success: true };
  await prisma.$transaction([
    prisma.addressChangeNoticeItem.update({
      where: { id: it.id },
      data: { status: "mailed", sentAt: new Date(), error: null },
    }),
    prisma.auditLog.create({
      data: {
        actorId: actor.id, actorRole: "ADMIN",
        action: "address_notice.postal_mailed",
        entityType: "AddressChangeNoticeItem", entityId: it.id,
        metadata: JSON.stringify({ runId: it.runId, contactLabel: it.contactLabel, note: input.trackingNote ?? null }),
      },
    }),
  ]);
  revalidatePath("/admin");
  return { success: true };
}

export async function getAddressNoticesSummary(): Promise<{ pendingPostalCount: number; last30Runs: number; last30EmailsSent: number; last30PostalGenerated: number }> {
  await verifyAdmin();
  const since = new Date(Date.now() - 30 * 24 * 3600_000);
  const [pendingPostal, recent] = await Promise.all([
    prisma.addressChangeNoticeItem.count({ where: { channel: "postal", status: "queued" } }),
    prisma.addressChangeNoticeRun.findMany({ where: { createdAt: { gte: since } }, select: { emailsSent: true, postalGenerated: true } }),
  ]);
  return {
    pendingPostalCount: pendingPostal,
    last30Runs: recent.length,
    last30EmailsSent: recent.reduce((acc, r) => acc + r.emailsSent, 0),
    last30PostalGenerated: recent.reduce((acc, r) => acc + r.postalGenerated, 0),
  };
}

// ─── Email body ────────────────────────────────────────────────────────

function buildNoticeEmail(args: { memberName: string; memberEmail: string | null; oldAddress: string | null; newAddress: string; effectiveDate: string | null; accountNumber: string | null; orgLabel: string; noticeMessage: string | null }): string {
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 560px; margin: 0 auto; color: #1A1D23;">
    <div style="background: #1976FF; padding: 24px; border-radius: 12px; color: white;">
      <p style="font-size: 11px; font-weight: 800; letter-spacing: 0.2em; text-transform: uppercase; margin: 0; opacity: 0.85;">Address change notice</p>
      <h1 style="font-size: 22px; font-weight: 800; margin: 4px 0 0;">${args.memberName}</h1>
    </div>
    <div style="padding: 24px;">
      <p style="font-size: 14px; line-height: 1.6;">To <strong>${args.orgLabel}</strong>,</p>
      <p style="font-size: 14px; line-height: 1.6;">This is to formally notify you of a change in my address of record.${args.accountNumber ? ` My account reference: <strong>${args.accountNumber}</strong>.` : ""}</p>
      <div style="margin: 16px 0; padding: 14px; background: #F4F5F7; border-radius: 8px;">
        ${args.oldAddress ? `<p style="font-size: 11px; font-weight: 700; margin: 0 0 4px; color: #7A8290;">PREVIOUS ADDRESS</p><p style="font-size: 13px; line-height: 1.5; margin: 0 0 12px; color: #3B4252; white-space: pre-line;">${args.oldAddress}</p>` : ""}
        <p style="font-size: 11px; font-weight: 700; margin: 0 0 4px; color: #15803d;">NEW ADDRESS — EFFECTIVE${args.effectiveDate ? ` ${args.effectiveDate}` : " IMMEDIATELY"}</p>
        <p style="font-size: 13px; line-height: 1.5; margin: 0; color: #1A1D23; font-weight: 600; white-space: pre-line;">${args.newAddress}</p>
      </div>
      ${args.noticeMessage ? `<p style="font-size: 13px; line-height: 1.6; padding: 12px; background: #FFFBEB; border-left: 4px solid #F59E0B; border-radius: 6px; font-style: italic;">${args.noticeMessage}</p>` : ""}
      <p style="font-size: 14px; line-height: 1.6;">Please update your records accordingly. ${args.memberEmail ? `Reply to <a href="mailto:${args.memberEmail}">${args.memberEmail}</a> with confirmation if you'd like.` : "Reply to this email with confirmation if needed."}</p>
      <p style="font-size: 14px; line-height: 1.6; margin-top: 16px;">Thank you,<br/><strong>${args.memberName}</strong></p>
    </div>
    <p style="font-size: 10px; color: #7A8290; text-align: center; margin: 16px 0 0;">Sent via NOHO Mailbox · address-of-record auto-update service</p>
  </div>`;
}
