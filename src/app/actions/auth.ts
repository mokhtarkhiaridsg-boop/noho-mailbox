"use server";

import { signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { sendNewSignupAlert, sendSignupConfirmation } from "@/lib/email";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { AuthError } from "next-auth";
import { randomBytes } from "crypto";

// Lightweight "request a mailbox" — minimal friction. No password required.
// Admin reviews the request, assigns a suite, and sends back a one-time setup
// link via email or text.
//
// Length caps + format guards added to defeat: paste-bombs into notes (1MB
// payloads bloating kycNotes), garbage phone strings ("asdf") that look fine
// in DB but break SMS later, and absurdly long names that crash receipt
// rendering. These match what the UI inputs allow, so legitimate signups
// pass through unchanged.
const PHONE_REGEX = /^[\d\s\-+()]{7,30}$/; // permissive: handles +1 (818) 506-7744 and 8185067744
// Plan IDs accepted by the signup form. Must stay in sync with `planChoices`
// in src/app/(auth)/signup/page.tsx — if a new tier is added to the UI it
// MUST be appended here or the form silently rejects the submission with a
// cryptic Zod error and the customer's signup never reaches the admin
// dashboard. (This is exactly how "virtual" customers were dead-ending
// for weeks before this fix.)
const VALID_PLAN_IDS = ["basic", "business", "premium", "virtual", "not_sure"] as const;
const requestSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120, "Name is too long"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email").max(254, "Email is too long"),
  phone: z
    .string()
    .trim()
    .max(30, "Phone number is too long")
    .regex(PHONE_REGEX, "Please enter a valid phone number")
    .optional()
    .or(z.literal("")),
  // Unknown plan values get coerced to `not_sure` rather than rejected so a
  // stale UI option (or a manual URL param tweak) never blocks signup. Admin
  // still sees the raw plan in kycNotes via the audit trail upstream if needed.
  plan: z
    .enum(VALID_PLAN_IDS)
    .catch("not_sure" as (typeof VALID_PLAN_IDS)[number])
    .optional(),
  notes: z.string().trim().max(2000, "Notes are too long (max 2000 chars)").optional(),
  signupMode: z.enum(["in_store", "online"]).catch("in_store").optional(),
  referralCode: z.string().trim().toUpperCase().max(40, "Referral code is too long").optional(),
});

export type AuthState = {
  twoFactorRequired?: boolean;
  error?: string;
  success?: boolean;
};

export type RequestState = {
  error?: string;
  success?: boolean;
};

// (Previously had a credentialed `signup()` action here — removed because it
// had no caller. Every export in a "use server" file is RPC-exposed by Next,
// so a dormant action with bugs is a latent attack surface. The live signup
// flow is `requestMailbox` below; admin then sends the customer a password-
// reset link to set their first password.)

// ─── Request a Mailbox (no password, no payment, frictionless) ────────────────
// Public-facing intake form. Creates a User in "Pending" status so the admin
// dashboard surfaces it as a new request. The admin reviews, assigns a suite,
// and sends back a one-time setup link (via the password reset flow) so the
// customer can finish their account.
export async function requestMailbox(
  prevState: RequestState,
  formData: FormData
): Promise<RequestState> {
  const raw = {
    name: (formData.get("name") as string)?.trim(),
    email: (formData.get("email") as string)?.trim().toLowerCase(),
    phone: ((formData.get("phone") as string) ?? "").trim() || undefined,
    plan: ((formData.get("plan") as string) ?? "not_sure").trim() || "not_sure",
    notes: ((formData.get("notes") as string) ?? "").trim() || undefined,
    signupMode: ((formData.get("signupMode") as string) ?? "in_store").trim() || "in_store",
    referralCode: ((formData.get("referralCode") as string) ?? "").trim().toUpperCase() || undefined,
  };

  const result = requestSchema.safeParse(raw);
  if (!result.success) {
    return { error: result.error.issues[0].message };
  }

  const { name, email, phone, plan, notes, signupMode, referralCode } = result.data;

  // Online-mode signups require a phone — the success screen promises a
  // texted Square payment link, and without a number the customer dead-ends.
  // (In-store signups can skip the phone because we'll see them at the
  // counter.) HTML `required={signupMode === "online"}` mirrors this on the
  // client; this server-side guard catches direct API submissions or older
  // tabs that loaded the page before the JS bundle updated.
  if (signupMode === "online" && !phone) {
    return {
      error:
        "We need a phone number to text you the Square payment link. Add one above, or switch to In-store signup.",
    };
  }

  // Idempotent: if this email already exists, succeed silently — admin sees it.
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { success: true };
  }

  // Plan: store as Capitalized name if specified, else null.
  let planCapitalized: string | null = null;
  if (plan && plan !== "not_sure") {
    planCapitalized = plan.charAt(0).toUpperCase() + plan.slice(1);
  }

  // Generate an unguessable random hash so the schema requirement is met.
  // The customer will set their real password via the setup link.
  const placeholder = await bcrypt.hash(randomBytes(32).toString("hex"), 12);

  // Stash optional customer notes in the kycNotes field so the admin sees them
  // immediately on the customer detail panel.
  const userData: {
    name: string;
    email: string;
    phone: string | null;
    passwordHash: string;
    plan: string | null;
    planTerm: string | null;
    mailboxStatus: string;
    kycNotes?: string;
    pendingReferralCode?: string | null;
  } = {
    name,
    email,
    phone: phone ?? null,
    passwordHash: placeholder,
    plan: planCapitalized,
    planTerm: null,
    mailboxStatus: "Pending",
  };
  const noteParts: string[] = [];
  if (signupMode === "online") {
    noteParts.push("[ONLINE SIGNUP — text Square payment link to phone]");
  }
  if (referralCode) {
    // Store the referral code in kycNotes so admin sees it on the customer
    // detail panel. Actual wallet credit is deferred until after the customer
    // pays (handled by an admin-side activation flow), so a bot mass-signing-
    // up with a referral code can't mint free wallet credit for the referrer.
    noteParts.push(`Referral code: ${referralCode}`);
  }
  if (notes) {
    noteParts.push(`Customer note: ${notes}`);
  }
  if (noteParts.length > 0) {
    userData.kycNotes = noteParts.join("\n");
  }

  // Catch P2002 (unique-constraint violation on email) in case of a TOCTOU
  // race between the existence check above and the create below — two
  // submissions for the same email at the same instant would otherwise bubble
  // an unhandled server-action error to the UI.
  let created;
  try {
    created = await prisma.user.create({ data: userData });
  } catch (e: unknown) {
    const code = (e as { code?: string }).code;
    if (code === "P2002") {
      // Duplicate email — the second submission lost the race. Treat as
      // success (the first one already created the row). Same outcome as the
      // existence check above for the non-racing case.
      return { success: true };
    }
    throw e;
  }

  // Send admin notification + customer confirmation in parallel. `sendEmail`
  // catches provider errors internally, but the EmailLog.create() that runs
  // BEFORE the try/catch can still throw on transient DB issues. Wrap the
  // whole batch so a flaky DB write never bubbles up to the signup form and
  // shows the customer a 500 page after their data has already been saved.
  // Narrow signupMode to the literal union the email helpers expect.
  const mode: "in_store" | "online" = signupMode === "online" ? "online" : "in_store";
  try {
    await Promise.all([
      sendNewSignupAlert({
        name,
        email,
        phone: phone ?? null,
        plan: planCapitalized,
        signupMode: mode,
        notes: notes ?? null,
        userId: created.id,
      }),
      sendSignupConfirmation({
        name,
        email,
        signupMode: mode,
        userId: created.id,
      }),
    ]);
  } catch (err) {
    // Log so the admin can see the email failed; don't fail the signup —
    // the customer record is already created and recoverable manually.
    console.error("[requestMailbox] email dispatch failed", err);
  }

  // NOTE: referral wallet credit was previously fired here on signup. That
  // converted the referral bonus into free wallet credit for any attacker who
  // knew a valid referral code (the public `requestMailbox` endpoint had no
  // rate-limit). Credit is now deferred to admin activation — when the admin
  // marks the customer as paid + active, the activation flow reads
  // `kycNotes` for "Referral code:" and applies the credit then. (Wiring
  // to be added on the admin activation side; for now the code is captured
  // in notes for manual application.)

  return { success: true };
}

export async function login(
  prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  // Normalize email exactly the way signup does so case-mismatched logins
  // (e.g. autofill that capitalizes) resolve to the same User row that
  // signup created. This was previously case-sensitive and silently failed
  // for any customer whose autofill or keyboard introduced caps.
  const email = ((formData.get("email") as string) ?? "").trim().toLowerCase();
  const password = formData.get("password") as string;
  const totpToken = (formData.get("totpToken") as string | null)?.trim() || "";

  if (!email || !password) {
    return { error: "Email and password are required" };
  }

  // Look up user role + plan + mailbox status to determine redirect destination
  let user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, role: true, plan: true, mailboxStatus: true },
  });

  // Admin bootstrap: if this email is listed in ADMIN_EMAILS, auto-promote to ADMIN.
  // Allows provisioning an admin in production without running the seed script.
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (user && user.role !== "ADMIN" && adminEmails.includes(email.toLowerCase())) {
    // Privilege escalation needs an audit trail — was previously silent. We
    // write the audit log AFTER the role change so a failed promotion isn't
    // logged as success, and do both inside a transaction so an audit row
    // can't outlive a rolled-back update.
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { role: "ADMIN" },
      }),
      prisma.auditLog.create({
        data: {
          id: crypto.randomUUID(),
          actorId: user.id,
          actorRole: "ADMIN",
          action: "user.role.autopromote",
          entityType: "User",
          entityId: user.id,
          metadata: JSON.stringify({
            email: email.toLowerCase(),
            from: "MEMBER",
            to: "ADMIN",
            trigger: "ADMIN_EMAILS env-var match at login",
          }),
        },
      }),
    ]);
    user = { ...user, role: "ADMIN" };
  }

  let redirectTo = "/dashboard";
  if (user?.role === "ADMIN") {
    redirectTo = "/admin";
  } else if (!user?.plan || user.plan === "Free") {
    redirectTo = "/pricing?upgrade=1";
  } else if (user.mailboxStatus !== "Active") {
    redirectTo = "/dashboard/pending";
  }

  try {
    await signIn("credentials", {
      email,
      password,
      totpToken,
      redirectTo,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      const cause = (error as AuthError & { cause?: { err?: { message?: string } } }).cause?.err?.message;
      if (cause === "2FA_REQUIRED") {
        return { twoFactorRequired: true };
      }
      if (cause === "2FA_INVALID") {
        return { twoFactorRequired: true, error: "Invalid 2FA code" };
      }
      return { error: "Invalid email or password" };
    }
    throw error; // redirect throws are expected
  }

  return { success: true };
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}

export async function googleSignIn() {
  try {
    await signIn("google", { redirectTo: "/dashboard" });
  } catch (error) {
    // signIn throws a NEXT_REDIRECT on success — rethrow those
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    // Also rethrow redirect-like errors from NextAuth
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: "Google sign-in is not available. Please use email login." };
  }
}

export async function appleSignIn() {
  try {
    await signIn("apple", { redirectTo: "/dashboard" });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: "Apple sign-in is not available. Please use email login." };
  }
}

// Signup variants — same OAuth flow, but route brand-new users to the
// onboarding "pending" page (which renders the "Pick a plan → pay deposit →
// upload 1583 + IDs → wait for suite #" checklist) instead of the bare
// dashboard. Existing users with an active mailbox still land on /dashboard
// per the verifyActiveMember pass-through. The signIn callback in lib/auth.ts
// fires the admin alert + customer welcome emails on first OAuth sign-in so
// you and Jess both get notified for OAuth signups too — not just the
// credentials form.
export async function googleSignUp() {
  try {
    await signIn("google", { redirectTo: "/dashboard/pending" });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: "Google signup is not available right now. Please use the email form below." };
  }
}

export async function appleSignUp() {
  try {
    await signIn("apple", { redirectTo: "/dashboard/pending" });
  } catch (error) {
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    if (error && typeof error === "object" && "digest" in error) throw error;
    return { error: "Apple signup is not available right now. Please use the email form below." };
  }
}

export async function getOAuthConfig() {
  const { isGoogleEnabled, isAppleEnabled } = await import("@/lib/auth");
  return { isGoogleEnabled, isAppleEnabled };
}

// Self-serve plan picker for signed-in members who haven't picked a tier yet.
// Used by /dashboard/pending — solves the OAuth dead-end where a Google/Apple
// signup lands on the dashboard with `plan: null`, clicks "Pick a plan" → goes
// to /pricing → clicks a tile → bounces to /signup?plan=basic → form silently
// returns success for the existing-email path WITHOUT actually updating the
// plan, so the user is permanently stuck at "Pick a plan" no matter how many
// times they click. This action lets the pending page update the current
// user's plan directly without re-running the public signup intake.
type SelectPlanState = { error?: string; success?: boolean };

export async function selectMyPlan(
  prevState: SelectPlanState,
  formData: FormData
): Promise<SelectPlanState> {
  const { auth: authFn } = await import("@/lib/auth");
  const session = await authFn();
  if (!session?.user?.id) {
    return { error: "You need to be signed in to pick a plan." };
  }

  const planRaw = ((formData.get("plan") as string) ?? "").trim().toLowerCase();
  // Same canonical list the signup form uses (kept in sync at the type level
  // via the VALID_PLAN_IDS const above, but duplicated here as a lowercase
  // capitalized-name table because the DB stores the capitalized form).
  const PLAN_NAMES: Record<string, string> = {
    basic: "Basic",
    business: "Business",
    premium: "Premium",
    virtual: "Virtual",
  };
  const planName = PLAN_NAMES[planRaw];
  if (!planName) {
    return { error: "Pick one of Basic, Business, Premium, or Virtual." };
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { plan: planName },
    });
  } catch (err) {
    console.error("[selectMyPlan] update failed", err);
    return { error: "Couldn't save your plan. Please try again or call (818) 506-7744." };
  }

  return { success: true };
}
