// iter-118 — Notice template library.
//
// Pre-written notices the admin can pick from, drop into a thread, or
// blast to an audience. Variables in `{{firstName}}` / `{{suiteNumber}}`
// / `{{planDueDate}}` shape (existing renderTemplate in mailer.ts).
//
// Categories let the picker group them sensibly. Adding a new template:
// just append to NOTICE_TEMPLATES with a unique slug.

export type NoticeTemplate = {
  slug: string;
  label: string;
  category: "Announcements" | "Billing" | "Compliance" | "Operations" | "Onboarding" | "Closures";
  subject: string;
  bodyHtml: string;
  description: string;       // one-liner shown in the picker
};

export const NOTICE_TEMPLATES: NoticeTemplate[] = [
  // ─── Announcements ────────────────────────────────────────────────────
  {
    slug: "general-update",
    label: "General update",
    category: "Announcements",
    description: "Catch-all heads-up to all customers.",
    subject: "Quick update from NOHO Mailbox",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>A quick update for you about your NOHO Mailbox account:</p>
<p>[describe the change here]</p>
<p>Reply to this email or call (818) 506-7744 if you have questions.</p>
<p>— Team NOHO</p>`,
  },
  {
    slug: "feature-launch",
    label: "New feature launch",
    category: "Announcements",
    description: "Tell members about a brand-new dashboard feature.",
    subject: "New on NOHO Mailbox: [feature]",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>We just launched <strong>[feature]</strong> on your dashboard.</p>
<p><strong>What it does:</strong> [one-liner]</p>
<p><a href="https://nohomailbox.org/dashboard" style="color:#23596A;font-weight:700;">Try it now →</a></p>
<p>— Team NOHO</p>`,
  },
  {
    slug: "service-update",
    label: "Service-area update",
    category: "Announcements",
    description: "Operational change — expanded delivery, new carrier, etc.",
    subject: "Service update for NOHO Mailbox members",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>Heads up — we're updating our service in a way that affects you:</p>
<p><strong>What's changing:</strong> [describe]</p>
<p><strong>Effective:</strong> [date]</p>
<p>No action needed on your end. Reply if you have questions.</p>
<p>— Team NOHO</p>`,
  },

  // ─── Billing ──────────────────────────────────────────────────────────
  {
    slug: "renewal-nudge",
    label: "Plan renewal reminder",
    category: "Billing",
    description: "Send to a member whose plan is due soon.",
    subject: "Time to renew your NOHO Mailbox plan",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>Your mailbox plan expires on <strong>{{planDueDate}}</strong>. Renew now to keep suite #{{suiteNumber}} active without a gap.</p>
<p><a href="https://nohomailbox.org/dashboard?tab=settings" style="color:#23596A;font-weight:700;">Renew in your dashboard →</a></p>
<p>— Team NOHO</p>`,
  },
  {
    slug: "fee-change",
    label: "Pricing change",
    category: "Billing",
    description: "Upcoming price adjustment for a service.",
    subject: "Heads up — pricing update at NOHO Mailbox",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>Effective <strong>[date]</strong>, our pricing for [service] is changing:</p>
<ul><li>[old price] → [new price]</li></ul>
<p>Your current plan stays at the existing rate until your next renewal on {{planDueDate}}.</p>
<p>— Team NOHO</p>`,
  },
  {
    slug: "payment-received",
    label: "Payment received receipt",
    category: "Billing",
    description: "Confirms a manual payment was received + applied.",
    subject: "Payment received — NOHO Mailbox",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>Thanks — we received your payment of <strong>$[amount]</strong> on [date]. It's been applied to your NOHO wallet (suite #{{suiteNumber}}).</p>
<p><a href="https://nohomailbox.org/dashboard?tab=wallet" style="color:#23596A;font-weight:700;">View wallet →</a></p>
<p>— Team NOHO</p>`,
  },
  {
    slug: "overdue-invoice",
    label: "Overdue invoice",
    category: "Billing",
    description: "Reminder that an invoice is past due.",
    subject: "Friendly reminder: invoice past due — NOHO Mailbox",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>Just a heads up — invoice #[invoice-number] for <strong>$[amount]</strong> is now past due.</p>
<p>You can settle it from the dashboard, or reply to this email if anything's wrong.</p>
<p><a href="https://nohomailbox.org/dashboard?tab=invoices" style="color:#23596A;font-weight:700;">Pay invoice →</a></p>
<p>— Team NOHO</p>`,
  },

  // ─── Compliance ───────────────────────────────────────────────────────
  {
    slug: "kyc-needed",
    label: "KYC documents needed",
    category: "Compliance",
    description: "Member hasn't uploaded ID + Form 1583.",
    subject: "Action required: ID + Form 1583 needed — NOHO Mailbox",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>To finish activating mailbox suite #{{suiteNumber}} we need two things from you:</p>
<ul>
  <li>A government-issued photo ID</li>
  <li>A signed USPS Form 1583</li>
</ul>
<p>Both are uploadable from your dashboard in under 2 minutes.</p>
<p><a href="https://nohomailbox.org/dashboard?tab=settings" style="color:#23596A;font-weight:700;">Upload now →</a></p>
<p>— Team NOHO</p>`,
  },
  {
    slug: "id-expiring",
    label: "ID expiring soon",
    category: "Compliance",
    description: "ID on file expires within 30 days.",
    subject: "Your ID expires soon — NOHO Mailbox",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>The ID we have on file for suite #{{suiteNumber}} is expiring on <strong>[exp-date]</strong>. USPS requires us to keep an unexpired ID for every CMRA customer.</p>
<p>Please bring or upload a renewed ID before then so there's no service interruption.</p>
<p><a href="https://nohomailbox.org/dashboard?tab=settings" style="color:#23596A;font-weight:700;">Upload renewed ID →</a></p>
<p>— Team NOHO</p>`,
  },
  {
    slug: "address-verification",
    label: "Address verification",
    category: "Compliance",
    description: "Quarterly address-on-file verification.",
    subject: "Please verify your address on file — NOHO Mailbox",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>Quick verification: is the residential address we have on file for suite #{{suiteNumber}} still current?</p>
<p>If yes, no action needed — this email satisfies your quarterly verification.</p>
<p>If it changed, please update it from your dashboard.</p>
<p>— Team NOHO</p>`,
  },

  // ─── Operations ───────────────────────────────────────────────────────
  {
    slug: "package-overdue",
    label: "Package overdue at the counter",
    category: "Operations",
    description: "Member has a package that's been waiting > 7 days.",
    subject: "You've got a package waiting at NOHO",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>A package for suite #{{suiteNumber}} has been waiting at our counter for more than a week. Storage fees start on day 4 (currently $[fee] so far).</p>
<p>Stop by during open hours, schedule a pickup, or send a guest with a QR pass.</p>
<p><a href="https://nohomailbox.org/dashboard?tab=packages" style="color:#23596A;font-weight:700;">View packages →</a></p>
<p>— Team NOHO</p>`,
  },
  {
    slug: "key-issued",
    label: "Mailbox key issued",
    category: "Operations",
    description: "New key tag handed out to a member.",
    subject: "Your mailbox key is ready — NOHO Mailbox",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>Your mailbox key for suite #{{suiteNumber}} is ready for pickup at the counter. Bring photo ID.</p>
<p>Lost-key replacement runs $[fee] — please don't lose it 😅</p>
<p>— Team NOHO</p>`,
  },
  {
    slug: "outage",
    label: "Service outage notice",
    category: "Operations",
    description: "Notify of a temporary service disruption.",
    subject: "Brief service interruption — NOHO Mailbox",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>Heads up — [service] is briefly down. We're working on it now.</p>
<p><strong>What's affected:</strong> [describe]<br>
<strong>What still works:</strong> [describe]<br>
<strong>Expected resolution:</strong> [time]</p>
<p>We'll send a follow-up the moment it's resolved. Sorry for the bump.</p>
<p>— Team NOHO</p>`,
  },

  // ─── Onboarding ───────────────────────────────────────────────────────
  {
    slug: "welcome",
    label: "Welcome to NOHO",
    category: "Onboarding",
    description: "Sent right after a new customer signs up.",
    subject: "Welcome to NOHO Mailbox 👋",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>Welcome aboard. Your suite is <strong>#{{suiteNumber}}</strong> and you can start using your real street address right away.</p>
<p><strong>Next steps:</strong></p>
<ul>
  <li>Upload your ID + sign Form 1583 from the dashboard (5 min)</li>
  <li>Set notification preferences so we ping you the way you prefer</li>
  <li>Forward your address to the senders that matter</li>
</ul>
<p><a href="https://nohomailbox.org/dashboard" style="color:#23596A;font-weight:700;">Open dashboard →</a></p>
<p>Reply to this email any time. We answer within a business day.</p>
<p>— Team NOHO</p>`,
  },
  {
    slug: "first-package",
    label: "First package arrived",
    category: "Onboarding",
    description: "Celebratory note when a member's first package lands.",
    subject: "🎉 Your first package just arrived",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>Your first package at NOHO just hit the counter for suite #{{suiteNumber}}. Welcome to the bureau!</p>
<p>Quick tips: storage is free for 3 days, then $[fee]/day. Schedule a pickup window from your dashboard if you want to skip the line.</p>
<p>— Team NOHO</p>`,
  },

  // ─── Closures ─────────────────────────────────────────────────────────
  {
    slug: "holiday-hours",
    label: "Holiday hours notice",
    category: "Closures",
    description: "Heads up about a holiday closure.",
    subject: "Holiday hours — NOHO Mailbox",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>Our holiday hours so you can plan pickups around them:</p>
<ul>
  <li><strong>Closed:</strong> [date]</li>
  <li><strong>Reduced hours:</strong> [date] — open [hours]</li>
  <li><strong>Back to regular:</strong> [date]</li>
</ul>
<p>If you've got a package waiting (suite #{{suiteNumber}}), plan a visit before close.</p>
<p>— Team NOHO</p>`,
  },
  {
    slug: "weather-closure",
    label: "Weather closure",
    category: "Closures",
    description: "Unplanned closure due to weather/emergency.",
    subject: "We're closed today — weather",
    bodyHtml: `<p>Hi {{firstName}},</p>
<p>Heads up: we're closed today, [date], due to [reason]. Packages that arrive will be brought into your shelf when we re-open tomorrow.</p>
<p>Stay safe!</p>
<p>— Team NOHO</p>`,
  },
];

export function getTemplateBySlug(slug: string): NoticeTemplate | undefined {
  return NOTICE_TEMPLATES.find((t) => t.slug === slug);
}

export function templateCategories(): NoticeTemplate["category"][] {
  return ["Announcements", "Billing", "Compliance", "Operations", "Onboarding", "Closures"];
}
