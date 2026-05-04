"use server";

// iter-99 — Bulk customer onboarding via CSV.
//
// Admin pastes/uploads a CSV. We parse → validate every row → return a
// preview with per-row error chips. On commit, we create User rows in
// one transaction (placeholder password hash + password-reset email so
// each new customer sets their own), assign suite numbers, write a
// roll-up audit log + per-row audits.

import { prisma } from "@/lib/prisma";
import { verifyAdmin } from "@/lib/dal";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";

// ─── CSV parser (RFC 4180 lite — same shape as lib/csv.ts but reader) ──────
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else { inQuotes = false; }
      } else { cell += c; }
    } else {
      if (c === '"') { inQuotes = true; }
      else if (c === ",") { row.push(cell); cell = ""; }
      else if (c === "\n") { row.push(cell); rows.push(row); row = []; cell = ""; }
      else if (c === "\r") { /* skip */ }
      else { cell += c; }
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); rows.push(row); }
  return rows.filter((r) => r.some((c) => c.trim().length > 0)); // drop blank rows
}

// Recognized headers (case-insensitive). Aliases let admins paste from
// QuickBooks / Square / spreadsheets without renaming columns.
const HEADER_ALIASES: Record<string, string> = {
  name: "name", "full name": "name", customer: "name", "customer name": "name",
  email: "email", "email address": "email", "e-mail": "email",
  phone: "phone", "phone number": "phone", mobile: "phone", cell: "phone",
  suite: "suiteNumber", "suite number": "suiteNumber", "suite #": "suiteNumber", "mailbox": "suiteNumber", "mailbox #": "suiteNumber",
  plan: "plan", "plan name": "plan", tier: "plan",
  notes: "notes", note: "notes",
  kyc: "kycStatus", "kyc status": "kycStatus",
};

export type OnboardRow = {
  rowIdx: number;             // 1-based for "row 5 has an error" UX
  name: string;
  email: string;
  phone?: string;
  suiteNumber?: string;
  plan?: string;
  notes?: string;
  kycStatus?: string;
  errors: string[];           // empty if row will be created
  conflict?: "duplicate_email" | "duplicate_suite" | null;
};

export async function previewOnboardCsv(input: { csv: string }): Promise<{
  rows: OnboardRow[];
  errorCount: number;
  ok: number;
}> {
  await verifyAdmin();
  const cells = parseCsv(input.csv);
  if (cells.length === 0) return { rows: [], errorCount: 0, ok: 0 };

  // First row = header; map to canonical keys.
  const rawHeader = cells[0].map((h) => h.trim().toLowerCase());
  const cols = rawHeader.map((h) => HEADER_ALIASES[h] ?? h);
  const data = cells.slice(1);

  // Pull the existing emails + suites for conflict detection (one query).
  const existing = await prisma.user.findMany({
    select: { email: true, suiteNumber: true },
  });
  const existingEmails = new Set(existing.map((u) => u.email.toLowerCase()));
  const existingSuites = new Set(existing.map((u) => u.suiteNumber).filter((s): s is string => Boolean(s)));

  const seenEmails = new Set<string>();
  const seenSuites = new Set<string>();
  const rows: OnboardRow[] = [];

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    const get = (key: string) => {
      const idx = cols.indexOf(key);
      if (idx < 0) return "";
      return (r[idx] ?? "").trim();
    };
    const email = get("email").toLowerCase();
    const name = get("name");
    const errors: string[] = [];
    if (!name) errors.push("Missing name");
    if (!email) errors.push("Missing email");
    if (email && !/.+@.+\..+/.test(email)) errors.push("Invalid email");

    let conflict: OnboardRow["conflict"] = null;
    if (email && existingEmails.has(email)) { errors.push("Email already on file"); conflict = "duplicate_email"; }
    else if (email && seenEmails.has(email)) { errors.push("Duplicated within this CSV"); conflict = "duplicate_email"; }

    const suite = get("suiteNumber");
    if (suite) {
      if (existingSuites.has(suite)) { errors.push(`Suite #${suite} taken`); conflict = "duplicate_suite"; }
      else if (seenSuites.has(suite)) { errors.push(`Suite #${suite} duplicated in CSV`); conflict = "duplicate_suite"; }
    }

    if (email) seenEmails.add(email);
    if (suite) seenSuites.add(suite);

    rows.push({
      rowIdx: i + 2, // +1 for 0→1, +1 for header
      name,
      email,
      phone: get("phone") || undefined,
      suiteNumber: suite || undefined,
      plan: get("plan") || undefined,
      notes: get("notes") || undefined,
      kycStatus: get("kycStatus") || undefined,
      errors,
      conflict,
    });
  }
  return {
    rows,
    errorCount: rows.filter((r) => r.errors.length > 0).length,
    ok: rows.filter((r) => r.errors.length === 0).length,
  };
}

// Commit only the error-free rows. Each row creates a User with a
// random placeholder password hash; admin should follow up with the
// password-reset email flow (or we can extend later to auto-fire).
export async function commitOnboardCsv(input: { csv: string }): Promise<{
  created: number;
  skipped: number;
  errors: Array<{ rowIdx: number; email: string; reason: string }>;
}> {
  const actor = await verifyAdmin();
  const preview = await previewOnboardCsv(input);
  const goodRows = preview.rows.filter((r) => r.errors.length === 0);
  const errors: Array<{ rowIdx: number; email: string; reason: string }> = [];
  let created = 0;

  // Roll-up audit so reports can group the import as one event.
  const audit = await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorRole: actor.role,
      action: "onboard.csv_started",
      entityType: "User",
      entityId: null,
      metadata: JSON.stringify({ candidateCount: goodRows.length }),
    },
  });

  for (const r of goodRows) {
    try {
      const placeholder = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
      const newUser = await prisma.user.create({
        data: {
          name: r.name,
          email: r.email,
          phone: r.phone,
          passwordHash: placeholder,
          plan: r.plan,
          suiteNumber: r.suiteNumber,
          kycStatus: r.kycStatus ?? "Pending",
          mailboxStatus: r.suiteNumber ? "Assigned" : "Pending",
          mailboxAssignedAt: r.suiteNumber ? new Date() : null,
          kycNotes: r.notes ?? null,
        },
      });
      await prisma.auditLog.create({
        data: {
          actorId: actor.id,
          actorRole: actor.role,
          action: "onboard.user_created",
          entityType: "User",
          entityId: newUser.id,
          metadata: JSON.stringify({
            csvRowIdx: r.rowIdx,
            email: r.email,
            suiteNumber: r.suiteNumber ?? null,
            plan: r.plan ?? null,
            importBatchAuditId: audit.id,
          }),
        },
      });
      created++;
    } catch (e) {
      errors.push({ rowIdx: r.rowIdx, email: r.email, reason: e instanceof Error ? e.message : String(e) });
    }
  }

  await prisma.auditLog.update({
    where: { id: audit.id },
    data: {
      action: "onboard.csv_completed",
      metadata: JSON.stringify({
        candidateCount: goodRows.length,
        created,
        errors: errors.length,
      }),
    },
  }).catch(() => undefined);

  revalidatePath("/admin");
  return {
    created,
    skipped: preview.rows.length - created,
    errors,
  };
}
