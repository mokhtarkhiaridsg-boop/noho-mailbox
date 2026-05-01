import { Resend } from "resend";
import { prisma } from "@/lib/prisma";

// Email provider — gracefully no-ops if RESEND_API_KEY is unset.
// We always record to EmailLog so admins can manually copy/share the message
// (especially the password reset link) when delivery isn't configured.
const RESEND_KEY = process.env.RESEND_API_KEY?.trim();
const resend = RESEND_KEY ? new Resend(RESEND_KEY) : null;

// FROM address: use verified domain if set, otherwise Resend's free shared
// onboarding domain so the system still functions on the free tier.
const FROM_DOMAIN = (process.env.EMAIL_FROM ?? "").trim();
const FROM = FROM_DOMAIN || "NOHO Mailbox <onboarding@resend.dev>";

// One-time startup warning when EMAIL_FROM falls back to the shared Resend
// domain. `onboarding@resend.dev` is heavily rate-limited and Resend blocks
// individual recipient addresses on it — production deploys will silently
// stop delivering to specific users without this signal.
if (typeof window === "undefined" && process.env.NODE_ENV === "production" && !FROM_DOMAIN) {
  // eslint-disable-next-line no-console
  console.warn(
    "[email] EMAIL_FROM env var is unset — falling back to Resend's shared 'onboarding@resend.dev' " +
      "domain. This is rate-limited and may block specific recipients. Set EMAIL_FROM to a verified domain.",
  );
}
const REPLY_TO = "nohomailbox@gmail.com";
const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

// ─── Send + log wrapper ───────────────────────────────────────────────────────
// Every email goes through this — it records to EmailLog so members can see
// their email history and admins can audit delivery failures. NEVER throws —
// callers can rely on completing their own work even if email is misconfigured.
type SendArgs = {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
  kind: string;        // "password_reset" | "mail_arrived" | "receipt" | ...
  userId?: string | null;
};

export async function sendEmail(args: SendArgs): Promise<{ logId: string; status: string }> {
  const log = await prisma.emailLog.create({
    data: {
      userId: args.userId ?? null,
      toEmail: args.to,
      fromEmail: FROM,
      subject: args.subject,
      body: args.html,
      kind: args.kind,
      status: "queued",
      provider: resend ? "resend" : "none",
    },
  });

  // No provider configured → mark as not_sent and store body so admin can copy/share.
  if (!resend) {
    await prisma.emailLog.update({
      where: { id: log.id },
      data: {
        status: "not_sent",
        error: "Email provider not configured (RESEND_API_KEY missing). Body stored for manual delivery.",
      },
    });
    return { logId: log.id, status: "not_sent" };
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      replyTo: args.replyTo ?? REPLY_TO,
      to: args.to,
      subject: args.subject,
      html: args.html,
    });

    const providerId = (result as { data?: { id?: string } })?.data?.id ?? null;
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "sent", providerId, sentAt: new Date() },
    });
    return { logId: log.id, status: "sent" };
  } catch (err) {
    // Common case: domain not verified on Resend, or key revoked.
    // Log + swallow so the calling action (signup, password reset) still succeeds.
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.emailLog.update({
      where: { id: log.id },
      data: { status: "failed", error: msg },
    });
    return { logId: log.id, status: "failed" };
  }
}

// Resolve userId from an email address (best-effort, for logging).
async function uidFromEmail(email: string): Promise<string | null> {
  const u = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  return u?.id ?? null;
}

// ─── Shared layout ────────────────────────────────────────────────────────────
function layout(title: string, body: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f4f8fd;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8fd;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(14,34,64,0.10);">
        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#337485 0%,#23596A 100%);padding:32px 40px;">
            <span style="font-size:20px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">NOHO Mailbox</span>
            <p style="margin:4px 0 0;font-size:12px;color:rgba(255,255,255,0.7);font-weight:600;">5062 Lankershim Blvd · North Hollywood, CA 91601</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            ${body}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#f7faff;padding:20px 40px;border-top:1px solid #e8f0fa;">
            <p style="margin:0;font-size:11px;color:#8a9bb0;line-height:1.6;">
              NOHO Mailbox · 5062 Lankershim Blvd · North Hollywood, CA 91601<br/>
              Mon–Fri 9:30am–5:30pm (break 1:30–2pm) · Sat 10am–1:30pm<br/>
              <a href="tel:+18185067744" style="color:#337485;text-decoration:none;">(818) 506-7744</a> ·
              <a href="mailto:nohomailbox@gmail.com" style="color:#337485;text-decoration:none;">nohomailbox@gmail.com</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function btn(url: string, text: string) {
  return `<a href="${url}" style="display:inline-block;margin-top:24px;background:#337485;color:#ffffff;font-weight:800;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:100px;letter-spacing:0.2px;">${text}</a>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#0e2240;letter-spacing:-0.5px;">${text}</h1>`;
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">${text}</p>`;
}

// ─── New mailbox-request: alert to admin + confirmation to customer ──────────
//
// Both fire from `requestMailbox` in `auth.ts`. Was missing entirely — a real
// customer would submit the form, see "we'll text or call shortly" success
// screen, and then nothing because the admin never knew a row was added.
export async function sendNewSignupAlert(data: {
  name: string;
  email: string;
  phone?: string | null;
  plan?: string | null;
  signupMode: "in_store" | "online";
  notes?: string | null;
  userId: string;
}) {
  const planLabel = data.plan ? `${data.plan} Box` : "Not yet selected";
  const modeLabel = data.signupMode === "online"
    ? '<strong style="color:#7c2d12;">ONLINE</strong> — text Square payment link to phone'
    : "In-store visit";
  const html = layout("New mailbox signup", `
    ${h1("📬 New mailbox signup")}
    ${p(`<strong>${data.name}</strong> just submitted the signup form.`)}
    <div style="background:#f7faff;border-left:3px solid #337485;border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:13px;"><strong>Email:</strong> <a href="mailto:${data.email}" style="color:#337485;text-decoration:none;">${data.email}</a></p>
      ${data.phone ? `<p style="margin:0 0 6px;font-size:13px;"><strong>Phone:</strong> <a href="tel:${data.phone}" style="color:#337485;text-decoration:none;">${data.phone}</a></p>` : ""}
      <p style="margin:0 0 6px;font-size:13px;"><strong>Plan:</strong> ${planLabel}</p>
      <p style="margin:0 0 6px;font-size:13px;"><strong>Mode:</strong> ${modeLabel}</p>
      ${data.notes ? `<p style="margin:0;font-size:13px;"><strong>Notes:</strong> ${data.notes}</p>` : ""}
    </div>
    ${btn(`${BASE_URL}/admin?tab=signups`, "Open Admin Panel")}
    ${p(`<span style="font-size:13px;color:#94a3b8;">Customer User ID: ${data.userId}</span>`)}
  `);

  return sendEmail({
    to: REPLY_TO,
    replyTo: data.email,
    subject: `New signup · ${data.name}${data.signupMode === "online" ? " (ONLINE — needs Square link)" : ""}`,
    html,
    kind: "signup_alert",
  });
}

export async function sendSignupConfirmation(data: {
  name: string;
  email: string;
  signupMode: "in_store" | "online";
  userId: string;
}) {
  const nextStep = data.signupMode === "online"
    ? "We'll text you a secure Square payment link shortly. Once paid, we'll set up your suite + key, and email you a setup link to finish your account."
    : "Stop by 5062 Lankershim Blvd anytime during business hours and we'll get you set up in about 15 minutes. Bring two valid government photo IDs (driver's license + passport, or DL + utility bill, etc.).";
  const html = layout("We got your signup", `
    ${h1(`Welcome, ${data.name.split(" ")[0]}!`)}
    ${p("Thanks for signing up for a NOHO Mailbox. We received your request and someone from our team will follow up within one business day.")}
    ${p(nextStep)}
    <div style="background:#f7faff;border-radius:12px;padding:20px 24px;margin-top:8px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0e2240;">📍 5062 Lankershim Blvd, North Hollywood, CA 91601</p>
      <p style="margin:0 0 6px;font-size:13px;color:#4a5568;">📞 <a href="tel:+18185067744" style="color:#337485;text-decoration:none;">(818) 506-7744</a></p>
      <p style="margin:0;font-size:13px;color:#4a5568;">🕐 Mon–Fri 9:30am–5:30pm (lunch 1:30–2pm) · Sat 10am–1:30pm</p>
    </div>
    ${btn(`${BASE_URL}/how-it-works`, "How It Works")}
    ${p(`<span style="font-size:13px;color:#94a3b8;">If you didn't sign up, you can safely ignore this email.</span>`)}
  `);

  return sendEmail({
    to: data.email,
    subject: "We got your NOHO Mailbox signup",
    html,
    kind: "signup_confirmation",
    userId: data.userId,
  });
}

// ─── Password Reset ───────────────────────────────────────────────────────────
export async function sendPasswordResetEmail(email: string, name: string, token: string) {
  const url = `${BASE_URL}/reset-password?token=${token}`;
  const html = layout("Reset your password — NOHO Mailbox", `
    ${h1("Reset your password")}
    ${p(`Hi ${name.split(" ")[0]}, we received a request to reset your NOHO Mailbox password.`)}
    ${p("Click the button below to choose a new password. This link expires in <strong>1 hour</strong>.")}
    ${btn(url, "Reset Password")}
    ${p(`<span style="font-size:13px;color:#94a3b8;">If you didn't request this, you can safely ignore this email — your password won't change.</span>`)}
  `);

  return sendEmail({
    to: email,
    subject: "Reset your NOHO Mailbox password",
    html,
    kind: "password_reset",
    userId: await uidFromEmail(email),
  });
}

// ─── Contact Form Notification ────────────────────────────────────────────────
export async function sendContactNotification(data: {
  name: string;
  email: string;
  service?: string;
  message: string;
}) {
  const html = layout("New contact form submission", `
    ${h1("New message received")}
    ${p(`<strong>From:</strong> ${data.name} &lt;${data.email}&gt;<br/>
         <strong>Service:</strong> ${data.service || "General inquiry"}`)}
    <div style="background:#f7faff;border-left:3px solid #337485;border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">${data.message.replace(/\n/g, "<br/>")}</p>
    </div>
    ${btn(`mailto:${data.email}`, `Reply to ${data.name.split(" ")[0]}`)}
  `);

  return sendEmail({
    to: REPLY_TO,
    replyTo: data.email,
    subject: `Contact: ${data.name} — ${data.service || "General"}`,
    html,
    kind: "contact_notification",
  });
}

// ─── Contact Form Confirmation (to sender) ────────────────────────────────────
export async function sendContactConfirmation(data: { name: string; email: string }) {
  const html = layout("We got your message!", `
    ${h1(`Thanks, ${data.name.split(" ")[0]}!`)}
    ${p("We received your message and will get back to you within 1 business day.")}
    ${p("In the meantime, feel free to call us or stop by the store.")}
    <div style="background:#f7faff;border-radius:12px;padding:20px 24px;margin-top:8px;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0e2240;">📍 5062 Lankershim Blvd, North Hollywood, CA 91601</p>
      <p style="margin:0 0 6px;font-size:13px;color:#4a5568;">📞 <a href="tel:+18185067744" style="color:#337485;text-decoration:none;">(818) 506-7744</a></p>
      <p style="margin:0;font-size:13px;color:#4a5568;">🕐 Mon–Fri 9:30am–5:30pm · Sat 10am–1:30pm</p>
    </div>
    ${btn(`${BASE_URL}/dashboard`, "Visit Your Dashboard")}
  `);

  return sendEmail({
    to: data.email,
    subject: "We received your message — NOHO Mailbox",
    html,
    kind: "contact_confirmation",
    userId: await uidFromEmail(data.email),
  });
}

// ─── KYC Status Notification ──────────────────────────────────────────────────
export async function sendKycStatusEmail(
  email: string,
  name: string,
  status: "Approved" | "Rejected",
  notes?: string
) {
  const approved = status === "Approved";
  const html = layout(
    approved ? "Your identity is verified! — NOHO Mailbox" : "Action required — NOHO Mailbox",
    approved
      ? `
        ${h1("You're verified! 🎉")}
        ${p(`Hi ${name.split(" ")[0]}, great news — your identity has been verified and your mailbox is now active.`)}
        ${p("You can now receive mail, request scans, forwarding, and use all mailbox services.")}
        ${btn(`${BASE_URL}/dashboard`, "Go to My Dashboard")}
      `
      : `
        ${h1("We need more information")}
        ${p(`Hi ${name.split(" ")[0]}, we were unable to verify your identity with the documents provided.`)}
        ${notes ? `<div style="background:#fff8f0;border-left:3px solid #f59e0b;border-radius:4px;padding:16px 20px;margin:16px 0;font-size:14px;color:#92400e;">${notes}</div>` : ""}
        ${p("Please re-upload your documents or visit us in-store with valid government-issued ID.")}
        ${btn(`${BASE_URL}/dashboard/onboarding`, "Re-upload Documents")}
        ${p(`<span style="font-size:13px;color:#94a3b8;">Questions? Call us at <a href="tel:+18185067744" style="color:#337485;">(818) 506-7744</a> or stop by the store.</span>`)}
      `
  );

  return sendEmail({
    to: email,
    subject: approved
      ? "Your NOHO Mailbox identity is verified ✓"
      : "Action required: document re-submission needed",
    html,
    kind: approved ? "kyc_approved" : "kyc_rejected",
    userId: await uidFromEmail(email),
  });
}

// ─── Plan Expiring Soon ───────────────────────────────────────────────────────
export async function sendPlanRenewalReminder(
  email: string,
  name: string,
  planDueDate: string,
  daysLeft: number
) {
  const html = layout("Your plan is renewing soon — NOHO Mailbox", `
    ${h1("Time to renew your mailbox")}
    ${p(`Hi ${name.split(" ")[0]}, your <strong>NOHO Mailbox plan renews on ${planDueDate}</strong> — that's ${daysLeft} day${daysLeft === 1 ? "" : "s"} away.`)}
    ${p("Visit us in-store or call to renew and keep your mailbox active without interruption.")}
    <div style="background:#f7faff;border-radius:12px;padding:20px 24px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:13px;font-weight:700;color:#0e2240;">📍 5062 Lankershim Blvd, North Hollywood, CA 91601</p>
      <p style="margin:0;font-size:13px;color:#4a5568;">📞 <a href="tel:+18185067744" style="color:#337485;text-decoration:none;">(818) 506-7744</a></p>
    </div>
    ${btn(`${BASE_URL}/dashboard`, "View My Dashboard")}
  `);

  return sendEmail({
    to: email,
    subject: `Your NOHO Mailbox plan renews in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
    html,
    kind: "plan_renewal_reminder",
    userId: await uidFromEmail(email),
  });
}

// ─── Mail Arrived Notification ───────────────────────────────────────────────
export async function sendMailArrivedEmail(data: {
  email: string;
  name: string;
  suiteNumber: string;
  from: string;
  type: "Letter" | "Package" | string;
  recipientName?: string | null;
  photoUrl?: string | null;
}) {
  const typeLabel = data.type === "Package" ? "Package" : "Letter";
  const html = layout(`You have a new ${typeLabel.toLowerCase()}! — NOHO Mailbox`, `
    ${h1(`You've got ${typeLabel === "Package" ? "a package" : "mail"}! 📬`)}
    ${p(`Hi ${data.name.split(" ")[0]}, ${typeLabel === "Package" ? "a package has" : "a piece of mail has"} arrived at your NOHO Mailbox.`)}
    <div style="background:#f7faff;border-left:3px solid #337485;border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Suite:</strong> #${data.suiteNumber}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Type:</strong> ${typeLabel}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>From:</strong> ${data.from}</p>
      ${data.recipientName ? `<p style="margin:0;font-size:13px;color:#334155;"><strong>Addressed to:</strong> ${data.recipientName}</p>` : ""}
    </div>
    ${data.photoUrl ? `<div style="margin:16px 0;text-align:center;"><img src="${data.photoUrl}" alt="Mail photo" style="max-width:100%;border-radius:8px;border:1px solid #e2e8f0;" /></div>` : ""}
    ${p("Log in to your dashboard to request a scan, forwarding, or schedule a pickup.")}
    ${btn(`${BASE_URL}/dashboard`, "View in Dashboard")}
    ${p(`<span style="font-size:12px;color:#94a3b8;">Questions? Call us at <a href="tel:+18185067744" style="color:#337485;">(818) 506-7744</a> or stop by Mon–Fri 9:30am–5:30pm · Sat 10am–1:30pm.</span>`)}
  `);

  return sendEmail({
    to: data.email,
    subject: `New ${typeLabel} arrived at your NOHO Mailbox — Suite #${data.suiteNumber}`,
    html,
    kind: typeLabel === "Package" ? "package_arrived" : "mail_arrived",
    userId: await uidFromEmail(data.email),
  });
}

// ─── Shipping label tracking — auto-fired on label purchase ─────────────────
// Sent to the customer (or recipient) after admin Quick Ship / Print Label
// completes. Includes the branded NOHO public tracking URL plus the carrier's
// raw tracking number for fallback. Best-effort: errors are logged via
// EmailLog by sendEmail() but never throw — label purchase is the system of
// record, the email is a courtesy.
export async function sendLabelTrackingEmail(data: {
  email: string;
  recipientName: string;
  carrier: string;
  servicelevel: string;
  trackingNumber: string;
  labelId: string;       // ShippoLabel.id — used for /r/[id]
  labelUrl?: string;     // PDF URL on Shippo (optional; for admin/self-print)
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}) {
  const trackingUrl = `${BASE_URL}/r/${data.labelId}`;
  const dest = [data.city, data.state, data.zip].filter(Boolean).join(", ");
  const html = layout(`Your shipment is on its way — NOHO Mailbox`, `
    ${h1(`Your ${data.carrier} label is ready 📦`)}
    ${p(`Hi ${data.recipientName.split(" ")[0]}, NOHO Mailbox just printed a ${data.carrier} ${data.servicelevel} label${dest ? ` to ${dest}` : ""}. You can track it on a branded NOHO page below — no login required.`)}
    <div style="background:#f7faff;border-left:3px solid #337485;border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Carrier:</strong> ${data.carrier}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Service:</strong> ${data.servicelevel}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Tracking #:</strong> <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${data.trackingNumber}</span></p>
    </div>
    ${btn(trackingUrl, "Track on NOHO →")}
    ${p(`<span style="font-size:12px;color:#94a3b8;">Or use the carrier's tracking number directly with ${data.carrier}. Questions? Call us at <a href="tel:+18185067744" style="color:#337485;">(818) 506-7744</a>.</span>`)}
  `);
  return sendEmail({
    to: data.email,
    subject: `Your ${data.carrier} shipment is on its way — NOHO Mailbox`,
    html,
    kind: "label_tracking",
    userId: await uidFromEmail(data.email),
  });
}

// ─── Mail picked-up confirmation — fired when admin marks Picked Up ────────
// Sent right after admin confirms the in-person handoff in pickup-mode
// scanner. It's a courtesy receipt — confirms the customer has the package
// and gives them something to forward to anyone else who was expecting it.
// Best-effort: errors logged via EmailLog by sendEmail() but never throw.
export async function sendMailPickedUpEmail(data: {
  email: string;
  name: string;
  suiteNumber: string;
  carrier?: string | null;
  trackingNumber?: string | null;
  pickedUpAt: Date;
}) {
  const firstName = data.name.split(" ")[0] || "there";
  const dateLabel = data.pickedUpAt.toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const html = layout(`Picked up — NOHO Mailbox`, `
    ${h1(`Picked up ✓`)}
    ${p(`Hi ${firstName}, this is just a quick confirmation that your package was picked up from your NOHO Mailbox in person.`)}
    <div style="background:#f0fdf4;border-left:3px solid #16a34a;border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Suite:</strong> #${data.suiteNumber}</p>
      <p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Picked up:</strong> ${dateLabel}</p>
      ${data.carrier ? `<p style="margin:0 0 6px;font-size:13px;color:#334155;"><strong>Carrier:</strong> ${data.carrier}</p>` : ""}
      ${data.trackingNumber ? `<p style="margin:0;font-size:13px;color:#334155;"><strong>Tracking #:</strong> <span style="font-family:ui-monospace,SFMono-Regular,Menlo,monospace;">${data.trackingNumber}</span></p>` : ""}
    </div>
    ${p("If this wasn't you, reply to this email or call us right away.")}
    ${btn(`${BASE_URL}/dashboard`, "View in Dashboard")}
    ${p(`<span style="font-size:12px;color:#94a3b8;">Questions? Call us at <a href="tel:+18185067744" style="color:#337485;">(818) 506-7744</a> or stop by Mon–Fri 9:30am–5:30pm · Sat 10am–1:30pm.</span>`)}
  `);
  return sendEmail({
    to: data.email,
    subject: `Picked up · Suite #${data.suiteNumber} — NOHO Mailbox`,
    html,
    kind: "mail_picked_up",
    userId: await uidFromEmail(data.email),
  });
}

// ─── Square Payment Link (online signup) ─────────────────────────────────────
export async function sendSquarePaymentLinkEmail(data: {
  email: string;
  name: string;
  paymentUrl: string;
  plan?: string | null;
}) {
  const html = layout("Your NOHO Mailbox payment link", `
    ${h1("Almost done — pay to activate your mailbox")}
    ${p(`Hi ${data.name.split(" ")[0]}, thanks for signing up online! ${data.plan ? `You selected the <strong>${data.plan}</strong> plan.` : ""}`)}
    ${p("Click the secure Square link below to complete your payment. After payment we'll assign your suite number and email you the keys + setup link.")}
    ${btn(data.paymentUrl, "Pay Securely with Square")}
    <div style="background:#f7faff;border-left:3px solid #337485;border-radius:4px;padding:14px 18px;margin:20px 0;font-size:13px;color:#334155;line-height:1.6;">
      <strong>Don't forget:</strong> email your completed
      <a href="https://about.usps.com/forms/ps1583.pdf" style="color:#337485;">USPS Form 1583</a>
      and photos of <strong>two government-issued IDs</strong> to
      <a href="mailto:nohomailbox@gmail.com" style="color:#337485;">nohomailbox@gmail.com</a>.
      We can't activate your mailbox until we receive these.
    </div>
    ${p(`<span style="font-size:12px;color:#94a3b8;">Questions? Call <a href="tel:+18185067744" style="color:#337485;">(818) 506-7744</a>.</span>`)}
  `);

  return sendEmail({
    to: data.email,
    subject: "Your NOHO Mailbox payment link — finish signup online",
    html,
    kind: "square_payment_link",
    userId: await uidFromEmail(data.email),
  });
}

// ─── Mailbox Activated ────────────────────────────────────────────────────────
export async function sendMailboxActivatedEmail(
  email: string,
  name: string,
  suiteNumber: string
) {
  const html = layout("Your mailbox is ready! — NOHO Mailbox", `
    ${h1("Your mailbox is live! 📬")}
    ${p(`Hi ${name.split(" ")[0]}, your NOHO Mailbox is all set up and ready to receive mail.`)}
    <div style="background:linear-gradient(135deg,#337485 0%,#23596A 100%);border-radius:16px;padding:24px 28px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.15em;">Your Mailing Address</p>
      <p style="margin:0;font-size:16px;font-weight:900;color:#ffffff;">NOHO Mailbox</p>
      <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:rgba(255,255,255,0.9);">Suite #${suiteNumber}</p>
      <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">5062 Lankershim Blvd<br/>North Hollywood, CA 91601</p>
    </div>
    ${p("You can start using this address immediately for packages, letters, and business correspondence.")}
    ${btn(`${BASE_URL}/dashboard`, "Go to My Dashboard")}
  `);

  return sendEmail({
    to: email,
    subject: "Your NOHO Mailbox is ready! Suite #" + suiteNumber,
    html,
    kind: "mailbox_activated",
    userId: await uidFromEmail(email),
  });
}

// ─── Mailbox Renewal Receipt ──────────────────────────────────────────────────
export async function sendMailboxRenewalReceipt(data: {
  toEmail: string;
  userId: string;
  firstName: string;
  suiteNumber: string;
  plan: string;
  termMonths: number;
  amountCents: number;
  paymentMethod: string;
  paidAt: Date;
  newDueDateStr: string;
  renewalId: string;
}) {
  const dollars = (data.amountCents / 100).toFixed(2);
  const paidStr = data.paidAt.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const dueStr = (() => {
    try {
      const [y, m, d] = data.newDueDateStr.split("-").map(Number);
      return new Date(y, m - 1, d).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    } catch {
      return data.newDueDateStr;
    }
  })();

  const html = layout("Receipt — Mailbox renewal · NOHO Mailbox", `
    ${h1(`Thanks, ${data.firstName} — your mailbox is renewed.`)}
    ${p(`We received your payment for Suite #${data.suiteNumber}. Here are the details for your records.`)}

    <div style="margin:24px 0;padding:20px;background:#FFF9F3;border:1px solid #E8DDD0;border-radius:14px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:900;letter-spacing:0.18em;text-transform:uppercase;color:#7A6050;">Renewal details</p>
      <table cellpadding="0" cellspacing="0" style="width:100%;font-size:14px;color:#2D100F;">
        <tr><td style="padding:6px 0;color:#7A6050;width:46%;">Suite</td><td style="padding:6px 0;font-weight:700;">#${data.suiteNumber}</td></tr>
        <tr><td style="padding:6px 0;color:#7A6050;">Plan</td><td style="padding:6px 0;font-weight:700;">${data.plan}</td></tr>
        <tr><td style="padding:6px 0;color:#7A6050;">Term</td><td style="padding:6px 0;font-weight:700;">${data.termMonths} months</td></tr>
        <tr><td style="padding:6px 0;color:#7A6050;">Amount</td><td style="padding:6px 0;font-weight:900;color:#337485;">$${dollars}</td></tr>
        <tr><td style="padding:6px 0;color:#7A6050;">Payment method</td><td style="padding:6px 0;font-weight:700;">${data.paymentMethod}</td></tr>
        <tr><td style="padding:6px 0;color:#7A6050;">Paid on</td><td style="padding:6px 0;font-weight:700;">${paidStr}</td></tr>
        <tr><td style="padding:6px 0;color:#7A6050;border-top:1px solid #E8DDD0;">New due date</td><td style="padding:6px 0;font-weight:900;border-top:1px solid #E8DDD0;color:#2D100F;">${dueStr}</td></tr>
      </table>
    </div>

    ${p(`Your mailbox is paid through <strong>${dueStr}</strong>. We'll text and email a friendly reminder when you're approaching the next due date.`)}
    ${btn(`${BASE_URL}/dashboard`, "Open My Dashboard")}
    <p style="margin:18px 0 0;font-size:11px;color:#9aa5b8;">Receipt ID: ${data.renewalId}</p>
  `);

  return sendEmail({
    to: data.toEmail,
    subject: `Receipt — NOHO Mailbox renewal · Suite #${data.suiteNumber}`,
    html,
    kind: "receipt",
    userId: data.userId,
  });
}
