import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

const FROM = "NOHO Mailbox <noreply@nohomailbox.org>";
const REPLY_TO = "hello@nohomailbox.org";
const BASE_URL = process.env.AUTH_URL ?? "https://nohomailbox.org";

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
          <td style="background:linear-gradient(135deg,#3374B5 0%,#2960A0 100%);padding:32px 40px;">
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
              <a href="tel:+18187651539" style="color:#3374B5;text-decoration:none;">(818) 765-1539</a> ·
              <a href="mailto:hello@nohomailbox.org" style="color:#3374B5;text-decoration:none;">hello@nohomailbox.org</a>
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
  return `<a href="${url}" style="display:inline-block;margin-top:24px;background:#3374B5;color:#ffffff;font-weight:800;font-size:14px;text-decoration:none;padding:14px 32px;border-radius:100px;letter-spacing:0.2px;">${text}</a>`;
}

function h1(text: string) {
  return `<h1 style="margin:0 0 12px;font-size:24px;font-weight:900;color:#0e2240;letter-spacing:-0.5px;">${text}</h1>`;
}

function p(text: string) {
  return `<p style="margin:0 0 16px;font-size:15px;color:#4a5568;line-height:1.6;">${text}</p>`;
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

  return resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: "Reset your NOHO Mailbox password",
    html,
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
    <div style="background:#f7faff;border-left:3px solid #3374B5;border-radius:4px;padding:16px 20px;margin:16px 0;">
      <p style="margin:0;font-size:14px;color:#334155;line-height:1.7;">${data.message.replace(/\n/g, "<br/>")}</p>
    </div>
    ${btn(`mailto:${data.email}`, `Reply to ${data.name.split(" ")[0]}`)}
  `);

  return resend.emails.send({
    from: FROM,
    replyTo: data.email,
    to: REPLY_TO,
    subject: `Contact: ${data.name} — ${data.service || "General"}`,
    html,
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
      <p style="margin:0 0 6px;font-size:13px;color:#4a5568;">📞 <a href="tel:+18187651539" style="color:#3374B5;text-decoration:none;">(818) 765-1539</a></p>
      <p style="margin:0;font-size:13px;color:#4a5568;">🕐 Mon–Fri 9:30am–5:30pm · Sat 10am–1:30pm</p>
    </div>
    ${btn(`${BASE_URL}/dashboard`, "Visit Your Dashboard")}
  `);

  return resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: data.email,
    subject: "We received your message — NOHO Mailbox",
    html,
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
        ${p(`<span style="font-size:13px;color:#94a3b8;">Questions? Call us at <a href="tel:+18187651539" style="color:#3374B5;">(818) 765-1539</a> or stop by the store.</span>`)}
      `
  );

  return resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: approved
      ? "Your NOHO Mailbox identity is verified ✓"
      : "Action required: document re-submission needed",
    html,
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
      <p style="margin:0;font-size:13px;color:#4a5568;">📞 <a href="tel:+18187651539" style="color:#3374B5;text-decoration:none;">(818) 765-1539</a></p>
    </div>
    ${btn(`${BASE_URL}/dashboard`, "View My Dashboard")}
  `);

  return resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: `Your NOHO Mailbox plan renews in ${daysLeft} day${daysLeft === 1 ? "" : "s"}`,
    html,
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
    <div style="background:linear-gradient(135deg,#3374B5 0%,#2960A0 100%);border-radius:16px;padding:24px 28px;margin:20px 0;text-align:center;">
      <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:rgba(255,255,255,0.7);text-transform:uppercase;letter-spacing:0.15em;">Your Mailing Address</p>
      <p style="margin:0;font-size:16px;font-weight:900;color:#ffffff;">NOHO Mailbox</p>
      <p style="margin:4px 0 0;font-size:14px;font-weight:700;color:rgba(255,255,255,0.9);">Suite #${suiteNumber}</p>
      <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,0.75);">5062 Lankershim Blvd<br/>North Hollywood, CA 91601</p>
    </div>
    ${p("You can start using this address immediately for packages, letters, and business correspondence.")}
    ${btn(`${BASE_URL}/dashboard`, "Go to My Dashboard")}
  `);

  return resend.emails.send({
    from: FROM,
    replyTo: REPLY_TO,
    to: email,
    subject: "Your NOHO Mailbox is ready! Suite #" + suiteNumber,
    html,
  });
}
