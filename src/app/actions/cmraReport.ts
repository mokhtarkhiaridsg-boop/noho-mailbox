"use server";

// iter-107 — CMRA quarterly compliance roster + change report.
//
// USPS requires every CMRA (Commercial Mail Receiving Agency) to keep a
// current customer roster + report changes (added, deactivated, address
// updated, Form 1583 re-executed) every quarter. iter-83 established the
// per-customer quarterly *statement* generator (snapshot-style); this
// module is the master *roster* — one record per active customer + a
// separate "changes during this quarter" feed.
//
// Export formats: CSV (USPS-friendly) + JSON (admin debugging). Quarter
// boundaries align with calendar quarters: Q1=Jan–Mar, Q2=Apr–Jun,
// Q3=Jul–Sep, Q4=Oct–Dec.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { toCsv } from "@/lib/csv";

const CASH_FREE = "—";

export type CmraRosterRow = {
  userId: string;
  name: string;
  email: string;
  phone: string | null;
  suiteNumber: string | null;
  boxType: "Personal" | "Business" | null;
  businessName: string | null;
  businessOwnerName: string | null;
  plan: string | null;
  mailboxStatus: string;
  kycStatus: string;
  kycForm1583OnFile: boolean;
  idPrimaryType: string | null;
  idPrimaryExpDate: string | null;
  idSecondaryType: string | null;
  idSecondaryExpDate: string | null;
  signedUpAt: string;        // ISO
  lastUpdatedAt: string;     // ISO (User.updatedAt — not perfect but useful)
  daysOnService: number;
};

export type CmraChange = {
  userId: string;
  name: string;
  email: string;
  suiteNumber: string | null;
  changeType: "added" | "deactivated" | "form_1583_uploaded" | "id_renewed" | "id_expired_in_quarter" | "key_replaced";
  changeAtIso: string;
  detail: string;
};

export type CmraSummary = {
  year: number;
  quarter: number;
  periodStartIso: string;
  periodEndIso: string;
  totalActive: number;
  withForm1583: number;
  missingForm1583: number;
  kycApproved: number;
  kycPending: number;
  businessBoxes: number;
  personalBoxes: number;
  changes: { added: number; deactivated: number; form1583Uploaded: number; idRenewed: number; idExpiredInQuarter: number; keyReplaced: number };
};

function quarterRange(year: number, quarter: number): { start: Date; end: Date; periodStartIso: string; periodEndIso: string } {
  const startMonth = (quarter - 1) * 3;
  const start = new Date(Date.UTC(year, startMonth, 1));
  const end = new Date(Date.UTC(year, startMonth + 3, 1)); // exclusive
  return {
    start, end,
    periodStartIso: start.toISOString().slice(0, 10),
    periodEndIso: new Date(end.getTime() - 1).toISOString().slice(0, 10), // last day inclusive
  };
}

function currentQuarter(): { year: number; quarter: number } {
  const now = new Date();
  return { year: now.getFullYear(), quarter: Math.floor(now.getMonth() / 3) + 1 };
}

// ─── Roster: snapshot of active CMRA customers as of quarter end ─────────
export async function getCmraQuarterlyRoster(input: { year?: number; quarter?: number } = {}): Promise<CmraRosterRow[]> {
  await verifyAdmin();
  const q = input.year && input.quarter ? { year: input.year, quarter: input.quarter } : currentQuarter();
  const { end } = quarterRange(q.year, q.quarter);

  // Active = signed up before quarter end, not in deactivated state, has a
  // suite assigned. Mailbox lifecycle is "Active" or "Pending" (just signed up).
  const users = await prisma.user.findMany({
    where: {
      role: "USER",
      createdAt: { lt: end },
      mailboxStatus: { in: ["Active", "Assigned", "Pending"] },
    },
    orderBy: { suiteNumber: "asc" },
    select: {
      id: true, name: true, email: true, phone: true,
      suiteNumber: true, boxType: true, businessName: true, businessOwnerName: true,
      plan: true, mailboxStatus: true, kycStatus: true, kycForm1583Url: true,
      idPrimaryType: true, idPrimaryExpDate: true,
      idSecondaryType: true, idSecondaryExpDate: true,
      createdAt: true, updatedAt: true,
    },
  });

  return users.map((u) => ({
    userId: u.id,
    name: u.name,
    email: u.email,
    phone: u.phone,
    suiteNumber: u.suiteNumber,
    boxType: (u.boxType === "Personal" || u.boxType === "Business") ? u.boxType : null,
    businessName: u.businessName,
    businessOwnerName: u.businessOwnerName,
    plan: u.plan,
    mailboxStatus: u.mailboxStatus,
    kycStatus: u.kycStatus,
    kycForm1583OnFile: Boolean(u.kycForm1583Url),
    idPrimaryType: u.idPrimaryType,
    idPrimaryExpDate: u.idPrimaryExpDate,
    idSecondaryType: u.idSecondaryType,
    idSecondaryExpDate: u.idSecondaryExpDate,
    signedUpAt: u.createdAt.toISOString(),
    lastUpdatedAt: u.updatedAt.toISOString(),
    daysOnService: Math.floor((end.getTime() - u.createdAt.getTime()) / (24 * 60 * 60 * 1000)),
  }));
}

// ─── Changes: USPS Form 1583-A "modifications during this quarter" ───────
// Pulls from AuditLog where actions match the CMRA-relevant set, plus
// computed signups/deactivations from User.createdAt + cancellation
// requests within the window.
export async function getCmraQuarterlyChanges(input: { year?: number; quarter?: number } = {}): Promise<CmraChange[]> {
  await verifyAdmin();
  const q = input.year && input.quarter ? { year: input.year, quarter: input.quarter } : currentQuarter();
  const { start, end } = quarterRange(q.year, q.quarter);
  const changes: CmraChange[] = [];

  // Signups in this quarter
  const newUsers = await prisma.user.findMany({
    where: { role: "USER", createdAt: { gte: start, lt: end } },
    select: { id: true, name: true, email: true, suiteNumber: true, createdAt: true, plan: true },
  });
  for (const u of newUsers) {
    changes.push({
      userId: u.id,
      name: u.name,
      email: u.email,
      suiteNumber: u.suiteNumber,
      changeType: "added",
      changeAtIso: u.createdAt.toISOString(),
      detail: `Signed up · plan ${u.plan ?? "—"}`,
    });
  }

  // Cancellation requests filed this quarter (= deactivations queued)
  const cancels = await prisma.cancellationRequest.findMany({
    where: { requestedAt: { gte: start, lt: end } },
    include: { user: { select: { id: true, name: true, email: true, suiteNumber: true } } },
  }).catch(() => []);
  for (const c of cancels) {
    changes.push({
      userId: c.user.id,
      name: c.user.name,
      email: c.user.email,
      suiteNumber: c.user.suiteNumber,
      changeType: "deactivated",
      changeAtIso: c.requestedAt.toISOString(),
      detail: `Cancellation requested · ${c.reason.slice(0, 60)}`,
    });
  }

  // Audit-log-driven changes — match against the actions our existing
  // handlers write.
  const auditCandidates = [
    "kyc.form1583_uploaded", "kyc.id_replaced", "kyc.approved",
    "id_expiry.renewed", "key.replaced", "key.assigned",
  ];
  const auditRows = await prisma.auditLog.findMany({
    where: {
      createdAt: { gte: start, lt: end },
      action: { in: auditCandidates },
    },
    orderBy: { createdAt: "asc" },
  });
  const userIds = Array.from(new Set(auditRows.map((r) => r.entityId).filter(Boolean) as string[]));
  const usersForAudits = userIds.length === 0 ? [] : await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, suiteNumber: true },
  });
  const userById = new Map(usersForAudits.map((u) => [u.id, u] as const));

  for (const a of auditRows) {
    const u = a.entityId ? userById.get(a.entityId) : undefined;
    if (!u) continue;
    let type: CmraChange["changeType"] = "form_1583_uploaded";
    let detail = a.action;
    if (a.action === "kyc.form1583_uploaded") { type = "form_1583_uploaded"; detail = "Form 1583 re-uploaded"; }
    else if (a.action === "id_expiry.renewed") { type = "id_renewed"; detail = "ID renewed (admin)"; }
    else if (a.action === "key.replaced") { type = "key_replaced"; detail = "Mailbox key replaced"; }
    else if (a.action === "key.assigned") { type = "key_replaced"; detail = "Mailbox key assigned"; }
    else if (a.action === "kyc.approved") { type = "form_1583_uploaded"; detail = "KYC approved"; }
    else if (a.action === "kyc.id_replaced") { type = "id_renewed"; detail = "ID image replaced"; }
    changes.push({
      userId: u.id,
      name: u.name,
      email: u.email,
      suiteNumber: u.suiteNumber,
      changeType: type,
      changeAtIso: a.createdAt.toISOString(),
      detail,
    });
  }

  // ID expirations that happened during this quarter — not auditable (no
  // event fires when a date "passes"), so derive from User.id*ExpDate.
  const usersWithExp = await prisma.user.findMany({
    where: {
      role: "USER",
      OR: [
        { idPrimaryExpDate: { gte: start.toISOString().slice(0, 10), lt: end.toISOString().slice(0, 10) } },
        { idSecondaryExpDate: { gte: start.toISOString().slice(0, 10), lt: end.toISOString().slice(0, 10) } },
      ],
    },
    select: { id: true, name: true, email: true, suiteNumber: true, idPrimaryExpDate: true, idSecondaryExpDate: true },
  });
  for (const u of usersWithExp) {
    if (u.idPrimaryExpDate && u.idPrimaryExpDate >= start.toISOString().slice(0, 10) && u.idPrimaryExpDate < end.toISOString().slice(0, 10)) {
      changes.push({
        userId: u.id,
        name: u.name,
        email: u.email,
        suiteNumber: u.suiteNumber,
        changeType: "id_expired_in_quarter",
        changeAtIso: new Date(u.idPrimaryExpDate + "T12:00:00Z").toISOString(),
        detail: `Primary ID expired ${u.idPrimaryExpDate}`,
      });
    }
    if (u.idSecondaryExpDate && u.idSecondaryExpDate >= start.toISOString().slice(0, 10) && u.idSecondaryExpDate < end.toISOString().slice(0, 10)) {
      changes.push({
        userId: u.id,
        name: u.name,
        email: u.email,
        suiteNumber: u.suiteNumber,
        changeType: "id_expired_in_quarter",
        changeAtIso: new Date(u.idSecondaryExpDate + "T12:00:00Z").toISOString(),
        detail: `Secondary ID expired ${u.idSecondaryExpDate}`,
      });
    }
  }

  // Sort: most recent first inside the quarter.
  changes.sort((a, b) => (a.changeAtIso < b.changeAtIso ? 1 : -1));
  return changes;
}

// ─── Summary tile data ───────────────────────────────────────────────────
export async function getCmraSummary(input: { year?: number; quarter?: number } = {}): Promise<CmraSummary> {
  await verifyAdmin();
  const q = input.year && input.quarter ? { year: input.year, quarter: input.quarter } : currentQuarter();
  const range = quarterRange(q.year, q.quarter);
  const [roster, changes] = await Promise.all([
    getCmraQuarterlyRoster(q),
    getCmraQuarterlyChanges(q),
  ]);

  const counts = {
    added: 0, deactivated: 0, form1583Uploaded: 0, idRenewed: 0, idExpiredInQuarter: 0, keyReplaced: 0,
  };
  for (const c of changes) {
    if (c.changeType === "added") counts.added += 1;
    else if (c.changeType === "deactivated") counts.deactivated += 1;
    else if (c.changeType === "form_1583_uploaded") counts.form1583Uploaded += 1;
    else if (c.changeType === "id_renewed") counts.idRenewed += 1;
    else if (c.changeType === "id_expired_in_quarter") counts.idExpiredInQuarter += 1;
    else if (c.changeType === "key_replaced") counts.keyReplaced += 1;
  }

  return {
    year: q.year,
    quarter: q.quarter,
    periodStartIso: range.periodStartIso,
    periodEndIso: range.periodEndIso,
    totalActive: roster.length,
    withForm1583: roster.filter((r) => r.kycForm1583OnFile).length,
    missingForm1583: roster.filter((r) => !r.kycForm1583OnFile).length,
    kycApproved: roster.filter((r) => r.kycStatus === "Approved").length,
    kycPending: roster.filter((r) => r.kycStatus !== "Approved").length,
    businessBoxes: roster.filter((r) => r.boxType === "Business").length,
    personalBoxes: roster.filter((r) => r.boxType === "Personal").length,
    changes: counts,
  };
}

// ─── CSV exports ─────────────────────────────────────────────────────────
export async function exportCmraRosterCsv(input: { year?: number; quarter?: number } = {}): Promise<{ csv: string; rows: number; periodLabel: string }> {
  const actor = await verifyAdmin();
  const q = input.year && input.quarter ? { year: input.year, quarter: input.quarter } : currentQuarter();
  const rows = await getCmraQuarterlyRoster(q);
  const range = quarterRange(q.year, q.quarter);
  const csv = toCsv(rows.map((r) => ({
    "Suite":              r.suiteNumber ?? CASH_FREE,
    "Customer Name":      r.name,
    "Box Type":           r.boxType ?? CASH_FREE,
    "Business Name":      r.businessName ?? CASH_FREE,
    "Business Owner":     r.businessOwnerName ?? CASH_FREE,
    "Email":              r.email,
    "Phone":              r.phone ?? CASH_FREE,
    "Plan":               r.plan ?? CASH_FREE,
    "Mailbox Status":     r.mailboxStatus,
    "KYC Status":         r.kycStatus,
    "Form 1583 on file":  r.kycForm1583OnFile ? "Yes" : "No",
    "Primary ID Type":    r.idPrimaryType ?? CASH_FREE,
    "Primary ID Expires": r.idPrimaryExpDate ?? CASH_FREE,
    "Secondary ID Type":  r.idSecondaryType ?? CASH_FREE,
    "Secondary ID Expires": r.idSecondaryExpDate ?? CASH_FREE,
    "Signed Up":          r.signedUpAt.slice(0, 10),
    "Last Updated":       r.lastUpdatedAt.slice(0, 10),
    "Days on service":    r.daysOnService,
  })));
  await audit(actor.id, actor.role, "cmra.roster_exported", `${q.year}-Q${q.quarter}`, { rows: rows.length });
  return { csv, rows: rows.length, periodLabel: `${range.periodStartIso} → ${range.periodEndIso}` };
}

export async function exportCmraChangesCsv(input: { year?: number; quarter?: number } = {}): Promise<{ csv: string; rows: number; periodLabel: string }> {
  const actor = await verifyAdmin();
  const q = input.year && input.quarter ? { year: input.year, quarter: input.quarter } : currentQuarter();
  const rows = await getCmraQuarterlyChanges(q);
  const range = quarterRange(q.year, q.quarter);
  const csv = toCsv(rows.map((r) => ({
    "Date":          r.changeAtIso.slice(0, 10),
    "Time":          r.changeAtIso.slice(11, 19),
    "Suite":         r.suiteNumber ?? CASH_FREE,
    "Customer":      r.name,
    "Email":         r.email,
    "Change Type":   r.changeType,
    "Detail":        r.detail,
  })));
  await audit(actor.id, actor.role, "cmra.changes_exported", `${q.year}-Q${q.quarter}`, { rows: rows.length });
  return { csv, rows: rows.length, periodLabel: `${range.periodStartIso} → ${range.periodEndIso}` };
}

async function audit(actorId: string | undefined, actorRole: string | undefined, action: string, entityId: string, metadata: Record<string, unknown>) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: actorId ?? "unknown",
        actorRole: actorRole ?? "ADMIN",
        action,
        entityType: "CmraReport",
        entityId,
        metadata: JSON.stringify(metadata),
      },
    });
  } catch (e) {
    console.error("[cmraReport] audit failed:", e);
  }
}
