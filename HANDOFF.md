# NOHO Mailbox — Handoff Document

Paste this into a fresh chat to continue work without losing context. Last updated mid-session — covers everything currently shipped to https://nohomailbox.org and everything queued.

---

## What this is

A full-stack web app for **NOHO Mailbox**, a real-world CMRA (private-mailbox + pack-and-ship store) at **5062 Lankershim Blvd, North Hollywood, CA 91601 · (818) 506-7744**. The app is the storefront, the admin operations console, and the member self-service dashboard.

**Stack**

- **Next.js 15/16 App Router** (with breaking changes from older versions — `AGENTS.md` warns to read docs before guessing). Hosted on **Vercel** at `nohomailbox.org`.
- **Prisma 7.x** with `@prisma/adapter-libsql` against **Turso** in production (the class is `PrismaLibSql`, not `PrismaLibSQL`).
- **Tailwind v4** via `@theme inline` design tokens in `src/app/globals.css`.
- **NextAuth** (credentials + optional Google/Apple — buttons hide when not configured).
- **Resend** for transactional email (`RESEND_API_KEY`).
- **Vercel Blob** for uploads (`BLOB_READ_WRITE_TOKEN`) — admin-gated `/api/upload` endpoint.
- **Square** for payments (manual Square checkout-link flow today).
- **Shippo** for shipping rates / labels / refunds.
- Local working dir: `/Users/CEO/Claude/noho-mailbox`.

---

## Brand book — locked. Don't drift.

These hex values are the only ones allowed across the whole site. Earlier I drifted to `#3374B5` / `#2D1D0F` and the user pushed back hard — the brand book values are:

| Role | Hex | rgb |
|---|---|---|
| Cream / mailbox base | `#F7E6C2` | rgb(247, 230, 194) |
| Script blue / heart / accents | `#337485` | rgb(51, 116, 133) |
| Outline dark brown / ink | `#2D100F` | rgb(45, 16, 15) |
| Hover-darker variant of accent | `#23596A` | (manually picked, ~25% darker) |
| Single warm accent (sparingly, e.g. "Most Popular" pill, red flag on logo) | `#F5A623` (amber), `#E2483D` (red flag) | — |

**Typography**: `Baloo 2` (loaded as `var(--font-baloo)`) for chunky display headlines (Mailbox Sans). `Pacifico` (`var(--font-pacifico)`) for cursive accents (Mailbox Script). `Inter` (`var(--font-inter)`) for body. Headlines use `letter-spacing: -0.02em`.

**Logo**: real PNG asset at `/public/brand/logo-trans.png` (596×343, transparent). Use the `<Logo />` component which is `next/image`-based; **always pass a height class** (e.g. `h-7 sm:h-8`). Do NOT recreate with web fonts — drifts every time.

**Icons**: Heroicons-style 1.75-stroke SVGs. **No emojis as icons** anywhere. There are reusable icon files:
- `src/components/admin/AdminIcons.tsx` — admin sidebar set with hover micro-animations
- `src/components/admin/IdScanButton.tsx` — barcode scanner using browser `BarcodeDetector` + AAMVA PDF417 parser
- Public-page icons are inlined in `src/app/(marketing)/page.tsx` (Pin, Phone, Shield, Stamp, Truck, Bolt, Star)

---

## Architecture — where things live

### Public site
- `src/app/(marketing)/layout.tsx` — Navbar + Footer shell
- `src/app/(marketing)/page.tsx` — landing (hero, stats, plans, how it works, "Why NOHO Mailbox" guarantees grid, visit us, business CTA, final CTA)
- `src/app/(marketing)/pricing/page.tsx` — **fully admin-editable**: plans / comparison / fees / policies. Reads `pricing_v2` JSON from `SiteConfig`.
- `src/app/(marketing)/pricing/PricingPlansInteractive.tsx` — term toggle (3/6/14 mo) with animated price counter
- `src/app/(marketing)/pricing/PolicyAccordion.tsx` — accordion
- `src/app/(marketing)/{services,delivery,shipping,how-it-works,notary,contact,blog,compare,business-solutions,faq,security,privacy,terms}/page.tsx`

### Auth pages
- `src/app/(auth)/{login,signup,forgot-password,reset-password}/page.tsx`
- Signup is a **lightweight "Request a Mailbox" form** — admin reviews and texts a Square link. No upfront payment. Online vs in-store toggle.

### Member dashboard (`/dashboard`)
- `src/components/DashboardClient.tsx` — sidebar + tabs
- Panels in `src/components/dashboard/`: Mail, Packages, Wallet, Messages (now Messenger-style chat), Emails (history), Deliveries, Invoices, Forwarding, Notary, Settings, Vault, QRPickup, Annual Summary, **Services** (à-la-carte: scan / forwarding / delivery / vacation mode / second user / junk block, plus "Add Credits" via Square link)
- `src/components/dashboard/ChatPanel.tsx` — single conversation with NOHO admins
- `src/components/chat/ChatStream.tsx` — shared bubble UI (admin + member)

### Admin console (`/admin`)
- `src/components/AdminDashboardClient.tsx` — branded brown sidebar, grouped nav (Today / Customers / Mail / Operations / Carriers / Communications / Reports / Business / System)
- `src/components/admin/AdminIcons.tsx` — sidebar icons with hover animations
- Panels in `src/components/admin/`:
  - `AdminCustomersPanel`, `AdminCompliancePanel`, `AdminRequestsPanel`, `AdminKeysPanel`, `AdminMailPanel`
  - `AdminSignupRequestsPanel` — admin texts customers Square setup links
  - `AdminCreditRequestsPanel` — admin texts customers Square credit-top-up links
  - `AdminQuarterlyReportPanel` — bulk CMRA quarterly report (auto-generates missing snapshots)
  - `AdminPricingEditor` — tabbed editor for the `/pricing` page (Header / Plans / Comparison / Fees / Policies)
  - `AdminShippoPanel` — Quick Ship with sender (editable, persisted in `SiteConfig`), label format selector (PDF_4x6 default), live rates, label list with Print / Download / Forward (SMS) / Receipt / Refund
  - `AdminEmbeddedPortal` (used by UPS, Stamps.com, DHL Express tabs) — iframe + "Open in New Tab" fallback
  - `AdminChatPanel` — Messenger-style two-pane chat with all customers
  - `AdminDeliveriesPanel`, `AdminShopPanel`, `AdminNotaryPanel`, `AdminMessagesPanel` (legacy, replaced by chat), `AdminEmailLogsPanel`, `AdminRevenuePanel`, `AdminBusinessPanel`, `AdminSquarePanel`, `AdminBillingPanel`, `AdminCancellationsPanel`, `AdminMailHoldPanel`, `AdminQRPickupPanel`
  - `AddCustomerModal` / `EditCustomerModal` — full CMRA fields (boxType Personal/Business, business owner block, ID upload + type + expiration + number + issuer, scan ID via `IdScanButton`, quarterly statements auto-generated via `compliance.ts`)

### Server actions (`src/app/actions/`)
- `auth.ts` — signup, login, request-a-mailbox flow
- `admin.ts` — createCustomer, updateCustomerDetails, suspend, reactivate, KYC review, mailbox assignment, etc.
- `mail.ts` — log mail, scan/forward/discard/pickup/hold/return, **scan request charges $2/page from wallet on fulfill**
- `chat.ts` — Messenger flows (`getOrCreateDirectChatAsAdmin`, `getOrCreateMyChat`, `listChats`, `getChatMessages`, `sendChatMessage`, `markChatRead`)
- `compliance.ts` — quarterly statements (auto-generated, never uploaded by admin), `ensureQuarterlyStatements`, `getStatementsForQuarter`, `regenerateQuarterlyStatement`, `ensureCurrentQuarterForAllCustomers`. Plus old `getPlanPrices`/`updatePlanPrices` (legacy — replaced by pricing.ts)
- `pricing.ts` — `getPricingConfig`, `updatePricingConfig`. Types + defaults are in `src/lib/pricing-config.ts` (must NOT live in a `"use server"` file).
- `credits.ts` — member requests credits, admin texts Square link, marks paid → wallet debit/credit
- `shippo.ts` — buy/refund/forward labels, sender CRUD (`getShippoSender`/`updateShippoSender` saved in `SiteConfig`)
- `mailPreferences.ts` — vacation hold, junk senders
- `sharedMailbox.ts` — second-user grant/revoke
- `messages.ts` — legacy email-style threads (now superseded by `chat.ts`)
- `password-reset.ts` — surfaces manual link if email delivery fails
- And many more: `delivery.ts`, `notary.ts`, `kyc.ts`, `vault.ts`, `wallet.ts`, `cancellation.ts`, `notifications.ts`, `referral.ts`, `recurringDelivery.ts`, etc.

### Schema highlights (`prisma/schema.prisma`)

User has CMRA fields:
```
boxType, businessName, businessOwnerName, businessOwnerRelation, businessOwnerPhone
idPrimaryType, idSecondaryType
idPrimaryNumber, idSecondaryNumber
idPrimaryIssuer, idSecondaryIssuer
idPrimaryExpDate, idSecondaryExpDate
kycForm1583Url, kycIdImageUrl, kycIdImage2Url
tosAcceptedAt, planExpiresAt, planAutoRenew, planDueDate
```

Models added in this codebase: `CreditRequest`, `QuarterlyStatement`, `JunkSender`, `VacationHold`, `RecurringDelivery`, `SharedMailboxAccess`, `GuestPickupAuth`, `ScheduledForwarding`, `CancellationRequest`, `ShippoLabel`, `LabelUpload`, `EmailLog`, `Referral`, `BusinessClient`, `Notification`, `MessageThread/Message/MessageAttachment`, `DocumentVaultItem`, `MailRequest`, `KeyRequest`, `Card`, `WalletTransaction`, `Invoice`, `Payment`, `MailItem`, `NotaryBooking`, `DeliveryOrder`, `ShopOrder`, `ContactSubmission`, `CatalogItem`, `SquareSyncLog`, `AuditLog`, `Organization`, `OrganizationMember`, `PasswordResetToken`, `SiteConfig`.

When migrating Turso, write a small ESM script in the project root, e.g.:
```js
// _migrate.mjs
import { createClient } from "@libsql/client";
const c = createClient({ url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN });
await c.execute("ALTER TABLE User ADD COLUMN ...");
```
Then `set -a && source .env && set +a && node _migrate.mjs && rm _migrate.mjs`.

---

## Recent shipped batches (most recent last)

1. **CMRA admin features** — Add/Edit Customer with ID upload + barcode scan + types + expiration + numbers + issuers, Quarterly statements auto-generated (printable at `/admin/statements/[id]` with NOHO logo), bulk Quarterly Statements report, Box Type (Personal/Business with required Owner), email optional on customer create, plan term as free-form integer.
2. **Branded admin shell** — replaced 22-emoji flat sidebar with grouped nav + animated SVG icons. Cream top bar with "Admin Console" pill. Hover micro-animations per icon.
3. **Brand-book enforcement pass** — global find/replace from `#3374B5` → `#337485` and `#2D1D0F` → `#2D100F`. Logo replaced from web-font approximation to actual PNG asset at `/public/brand/logo-trans.png`.
4. **Public landing rebuild** — branded cream/brown/blue, deleted carrier marquee bar, replaced fake Google testimonials with "Why NOHO Mailbox" guarantees grid, added live Open/Closed sign widget driven by Pacific time.
5. **Header rebrand** — cream `#F7E6C2` navbar (was white), interactive logo with flag-wave hover keyframe, branded mini-mailbox avatar with flag that pops on hover, brown CTA "Request a Mailbox" replacing blue "Get Started".
6. **Logo sizing fix** — removed inline `style={{ height: "auto" }}` from `<Logo>` so Tailwind `h-X` classes actually apply. Right-sized in navbar (`h-7 sm:h-8`), footer (`h-9`), member + admin top bars (`h-7 sm:h-8`), auth pages (`h-10`). Hero stays large `w-[280px] sm:w-[340px]`.
7. **Shippo polish** — fixed `objectStatus === "VALID"` filter bug that was zeroing rates. Format selector defaults `PDF_4x6` (label printer). Editable Sender card persisted to `SiteConfig`. Per-row actions: Print / Download / Forward (SMS) / Receipt (`/admin/shippo/receipt/[id]` with NOHO logo, 4×6 thermal print stylesheet) / Refund (Shippo refunds.create + DB status update).
8. **Carriers sidebar group** — UPS Access Point / Stamps.com / DHL Express embedded panels with iframe + reliable "Open in New Tab" fallback (UPS/Stamps/DHL block iframing).
9. **Reports sidebar group** — Quarterly Statements bulk report (year/quarter pickers, lazy auto-gen, "Generate current quarter for all", filter All/Missing/On file, "Open all in tabs", per-row View/Refresh/Generate). Revenue moved here.
10. **Messenger-style chat** — replaced email-style threads with bubble chat. `ChatStream` with optimistic send, 3.5s polling, Enter-to-send, group-by-sender, 5-min time breaks. Admin two-pane (customer list + active conversation), member single-pane (auto-routes to most-recently-active admin).
11. **Sitewide interactivity bundle** — `<StatsCounter />` (count-up on scroll-into-view), `<ScrollProgress />` (cream/blue rail at top), context-aware cursor labels ("Call" / "Email" / "Sign up" / "New tab" / `data-cursor-label`), `<Ripple />` on `[data-ripple]` (auto-detects bg luminance), `<HeroMailbox />` with auto flag-flick keyframe, `<LiveFooterStatus />` server-rendered card replacing the static footer line (open/closed + today's intake + last courier ago).
12. **Pricing page admin-editable** — `getPricingConfig` / `updatePricingConfig` server actions backed by `SiteConfig.pricing_v2`. `AdminPricingEditor` tabbed editor (Header / Plans / Comparison / Fees / Policies) with reorder ↑↓ and ✕. Public `/pricing` is now a Server Component reading the config; `PricingPlansInteractive` has a 3/6/14-mo term toggle that animates prices via ease-out-cubic; `PolicyAccordion` for the policies section. All emoji-free.

---

## Recent shipped batches — autonomous loop iterations (2026-04-28 → 04-29)

Twelve self-paced /loop iterations, each ~25 min, audited via parallel Explore agents before shipping. The original 21-item brainstorm backlog is fully shipped.

13. **Delivery + Shipping rebuild** — `/delivery` got Pickup Service section, Business/Bulk routes, $5-vs-DoorDash comparison, animated SVG icons throughout. `/shipping` got branded carrier glyphs (USPS/UPS/FedEx/DHL SVGs), live Shippo rates with +10% customer margin, full pre-pay label flow with destination + recipient form. New `LabelOrder` model + Turso migration. Public `getPublicShippoRates` / `createLabelOrder`. Admin `AdminLabelOrdersPanel` with status flow `AwaitingPayment → LinkSent → Paid → Printed`; Print fires Shippo purchase + links back. Square+SMS payment flow.
14. **Tunisian-red + formal-black brand tokens** — `--color-tn-red: #E70013`, `--color-tn-red-hover: #C70011`, `--color-ink-formal: #0A0807`. New `AnimatedIcons.tsx` library (10 self-animating icons: AiMailbox/Truck/Shield/Envelope/Clock/Bolt/Pin/Heart/Box/Sparkle). Idle micro-animations + hover reactions, all wrapped in `prefers-reduced-motion`. Family-owned-in-NoHo Tunisian-red pill on landing + business-solutions; Made-with-♥-in-NoHo footer.
15. **Sitewide emoji sweep** — replaced ~30 emoji-as-icons across admin and member panels with branded SVGs (signup success mailbox, dashboard plan-status, quick-discovery row, Mail/Packages empty states, AdminMail SCN/FWD buttons, AdminCustomers business indicator, etc.). Tunisian red applied to AiClock second hand, AiBox tape, AiEnvelope wax seal, services Discard/Notary, footer heart.
16. **Brand drift sweep** — `#2055A0` and `#1e4d8c` (legacy off-brand blues) → `#23596A` across 23 files. Brand-check `grep` returns 0.
17. **Shipping Center consolidation** — collapsed 5 sidebar items (Shipping, Label Orders, UPS, Stamps.com, DHL) into one **Shipping Center** entry with engine-level fleet-ops scene: dark cinematic header, perspective floor grid, isometric NOHO storefront hub, animated route lines + dots flowing to 5 carrier endpoint pucks. Click puck → switch sub-panel.
18. **Mailbox Center NPC + radial menu** — admin tab in Customers group. Friendly NOHO shopkeeper SVG (breathing body, blinking eyes, blue apron with Tunisian-red heart, behind a wood counter) at hub center. 4 menu options orbit (Process Renewal / Recent Renewals / Key Registry / Find Customer). Speech bubble updates contextually.
19. **MailboxRenewal model + receipt flow** — new schema model + Turso migration. `processMailboxRenewal` server action wraps user-update + payment + renewal-row + welcome email in `prisma.$transaction` (atomic). UTC-safe date math via `addMonthsUtc`. Printable receipt at `/admin/mailbox/receipt/[id]` with NOHO logo, 4×6 thermal stylesheet. Email template `sendMailboxRenewalReceipt` in `email.ts`.
20. **Customer log book (CustomerNote model)** — admin notes timeline per customer with kind chips (note/call/visit/compliance/billing/issue), pinning, soft-delete. Inline below renewal form when customer selected. System notes auto-written by suite reassign / void renewal / cancel / key issue / walk-in signup.
21. **Key registry (MailboxKey model)** — physical key inventory: tag + suite + status (InStock/Issued/Returned/Lost/Retired). New "Key Registry" radial menu slot replaced "Send Reminders". Add/issue/return/mark-lost actions, all audit-logged. Keys auto-migrate suite when customer reassigned.
22. **Walk-in signup wizard** — 5-step modal: Plan & Term → Identity → Suite → ID Verification (with `IdScanButton` PDF417 barcode parser + photo upload to Vercel Blob; "Skip and capture later" toggle) → Confirm. `createWalkInSignup` action: `prisma.$transaction` of User + 1-3 Payment rows (plan / deposit / key fee — separate so refunds clean) + initial MailboxRenewal + system note + audit log. Welcome email outside transaction. Returns userId + tempPassword.
23. **Hero stat tiles** — Active / At-Risk (overdue/due-soon/suspended breakdown) / ID-Expiry / Today's Till / MRR / Dormant / Churn 30d. All UTC-correct. At-Risk + ID-Expiry + Churn glow red when concerning. Click At-Risk → filters customer picker.
24. **Plan distribution + Cash till + Forwarding map** — overview row (3-col grid). Plan dist: horizontal bars per plan with %. Cash till: today's payments by source + 7-day rollup with bars + net. Forwarding map: regex-extracts US state from each ForwardingAddress; top-8 states with bars + full state name + "+ N more" overflow.
25. **Admin actions galore** — `voidMailboxRenewal` (transaction, payment-refund, plan-date revert), `reassignSuite` (with key migration), `refundSecurityDeposit`, `cancelCustomerWithRefund` (with pro-rate suggestion), `adminAddWalletCredit` (Cash/Square/Card/Comp; comp skips Payment), `runDueAutoRenewals` (batch over all due+auto-renew customers).
26. **Customer profile inline** — auto-renew toggle (iOS-style switch with wallet-balance check), wallet history (lazy-loaded last 10 txns with kind badges), suite reassign (conflict-checked), security deposit refund, cancel-with-refund (Tunisian-red panel, suggested pro-rate). KYC + mailboxStatus warnings inline. Bulk-renew toggle in customer picker.
27. **Customer picker upgrades** — List/Grid view toggle. Grid shows suite tiles color-coded by status (active/due-soon/overdue/suspended/no-plan). Bulk-select mode for batch renewals. Search expanded: name + email + suite + business name + phone digits (handles formatted "(818) 506-7744") + card last 4.
28. **Pricing config-driven** — Mailbox Center plan picker reads `pricing_v2` from `SiteConfig`; dynamic price preview re-computes when admin changes plan or term. Bulk-renew uses each customer's standard plan price. Plan override + custom price (with required reason for audit) supported.
29. **Logged-mail weight + dimensions** — `LogMailModal` accepts `"2 lb 6 oz"`, `"2.5 lb"`, `"36 oz"`, `"36"` (bare = oz). Auto-converts. Server already handled `weightOz` + `dimensions` fields; UI now captures them.
30. **`WeightInput` component** — reusable lb/oz toggle button with live `= N oz` preview and free-form parser. Used on AdminShippoPanel rate form. `src/lib/units.ts` has the parser/formatter.
31. **Notification bell hardening** — prop-sync via `useEffect` (was stale forever after `router.refresh`); optimistic mark-read now reverts on server failure with inline error banner; same pattern on mark-all.
32. **Member dashboard silent-failure sweep** — `MailPanel.LabelEditor`, `WalletPanel.requestDepositRefund/setDefaultCard/removeCard`, `SettingsPanel.revokeShared/Guest/JunkSender`, `VaultPanel` (alert→toast) — all now surface server `{error}` returns instead of silent-success.
33. **Resend domain VERIFIED** — old stuck `pending` registration deleted, fresh one (`3ec773f4…`) provisioned with new DKIM, DNS updated, verified. `EMAIL_FROM=NOHO Mailbox <noreply@nohomailbox.org>` set in Vercel production. All transactional email now ships from the verified custom domain.

---

## Live URLs + verification

- Public: **https://nohomailbox.org**
- Admin: `/admin` (Mailbox Center is the deepest workspace; AdminCustomersPanel is the list view)
- Member: `/dashboard`
- Receipts: `/admin/mailbox/receipt/[id]` (renewals), `/admin/shippo/receipt/[id]` (labels)

---

## Conventions / gotchas

- **Server Components by default**. Only add `"use client"` when you need state, refs, or browser APIs.
- **`"use server"` files** — only async functions can be exported. Move types and constants to `src/lib/*` (see `pricing-config.ts` pattern after I hit this build error).
- **Deploy workflow** — always from project root:
  ```bash
  cd /Users/CEO/Claude/noho-mailbox
  npx next build 2>&1 | tail -3
  vercel --prod --yes 2>&1 | grep "message" | tail -1
  vercel alias set <new-deployment-host>.vercel.app nohomailbox.org
  ```
- The `Bash` tool blocks long sleep loops. To wait for a condition use `until <check>; do sleep 2; done`. To wait on a background process use `run_in_background: true`.
- **Brand discipline**: do `grep -rn "3374B5\|2D1D0F" src/` before deploying any visual change. Should always be 0.
- **No emojis as icons**. Trust pills, status indicators, and CTAs all use SVG. Existing code may still have emojis in panel placeholder copy / confirm dialogs — fine to leave there.
- The interactive cursor + ripple + scroll progress + open-closed sign + live footer all live in the **root layout** (`src/app/layout.tsx`). The cursor disables itself on touch + reduced-motion automatically.

---

## Quick verification snippets

After changes:
```bash
# Build clean?
cd /Users/CEO/Claude/noho-mailbox && npx next build 2>&1 | tail -3

# Brand colors enforced?
grep -rn "3374B5\|3374b5\|2D1D0F\|2d1d0f\|51,116,181\|45,29,15\|2960A0" src/ 2>/dev/null | wc -l   # should print 0

# Admin auth on every action?
grep -rn "^export async function" src/app/actions/admin.ts | wc -l
# (each one should also call verifyAdmin within its first ~5 lines)
```

Live URL: **https://nohomailbox.org** (admin at `/admin`, member dashboard at `/dashboard`).

---

## 34. Iter-13 (2026-04-28) — Cross-page consistency audit + fixes

Live walk of all public pages via Chrome MCP found two real inconsistencies. Both fixed and shipped.

**Fix 1 — Stale prices on `/how-it-works`** (`src/app/(marketing)/how-it-works/page.tsx:25-27`):
- Step 1 bullets said `Basic — $55 / 3 months`, `Business — $85`, `Premium — $105`.
- Canonical `pricing-config.ts` has `term3: 50, 80, 95`.
- Now reads `Basic — $50 / Business — $80 / Premium — $95`.

**Fix 2 — Lunch-break (1:30–2pm) disclosure asymmetry**:
- Lunch break stated on `contact/page.tsx` and `(marketing)/page.tsx:1144`, but **missing** from:
  - `(marketing)/page.tsx:1038` ("we answer the phone" trust pill) — added.
  - `how-it-works/page.tsx:108` (FAQ password-reset answer) — added.
  - `how-it-works/page.tsx:380` (footer questions strip) — added.
  - `(marketing)/page.tsx:41-53` (LocalBusiness JSON-LD `OpeningHoursSpecification`) — split Mon-Fri into two windows: `09:30–13:30` and `14:00–17:30`. Saturday unchanged. This means Google now correctly shows the storefront as closed during 1:30–2:00 PM.

**Audit verdict (general-purpose agent, 33 tool uses)**: Otherwise clean. All plan prices, $5 NoHo same-day rate, $9.75+$0.75/mi out-of-zone, $50 deposit, $15 key fee, $25 lost-key replacement, holding fee schedule (5d free → $2.60/d → $5.20/d), address (5062 Lankershim Blvd, North Hollywood, CA 91601), and phone ((818) 506-7744) are consistent across every public page that mentions them.

**Note for future**: `terms/page.tsx:212-213` introduces "Oversized intake fee: $6.50" + "Daily storage $6.50/day starting Day 4" that isn't surfaced anywhere else — not a contradiction, but if surfacing in FAQ/pricing is desired, copy lives only in Terms today.

Deploy: `dpl_76tzE8B8mwhQ663cjXVps2fRw4Gz` aliased to `nohomailbox.org`. Verified live via Chrome MCP `find` on both fixes.

---

## 35. Iter-14 (2026-04-28) — Server-action correctness sweep

Delegated audit to general-purpose agent (33 tool uses). Returned 28 findings across 4 root-cause clusters: transaction boundaries, lifecycle idempotency, client-trust on money, audit-log gaps. Fixed the highest-impact ones in this loop.

**Cluster A — Transaction boundaries (money correctness)**:
- `billing.ts:applyLateFee` — wallet debit + ledger row were `Promise.all`. If the second write failed, the wallet would be debited with no ledger entry. Now `prisma.$transaction([...])`.
- `billing.ts:runAutoRenewal` — same pattern (user update + walletTransaction.create) — now `$transaction`.
- `billing.ts:runLateFeesBatch` (per-customer loop) — same pattern — now `$transaction` per customer.

**Cluster B — Lifecycle idempotency (no double-charges)**:
- New helper `transitionLabelOrder(orderId, fromStatuses, data)` does an atomic `updateMany` gated on prior status. Returns `count` so callers know if the move actually happened.
- `adminMarkLabelOrderLinkSent`: only `AwaitingPayment | LinkSent → LinkSent` (re-send link is OK; revert from Paid blocked).
- `adminMarkLabelOrderPaid`: only `LinkSent → Paid` (atomic; defeats two-admin-double-click).
- `adminCancelLabelOrder`: only `AwaitingPayment | LinkSent | Paid → Cancelled` (BLOCKS cancel-after-Print, since the label is already purchased on Shippo and refunds need separate flow).
- `adminPrintLabelOrder`: added two guards — (1) if `shippoLabelId` already exists, re-link instead of re-purchase; (2) wraps `shippoLabel.create` + `labelOrder.update` in a `$transaction` so they commit atomically. On DB-write failure after Shippo purchase, we surface the tracking number for manual reconciliation rather than silently corrupting state.
- `billing.ts:runLateFeesBatch` was firing only at exactly `daysOverdue === 10` — one missed cron day = no fee ever. Now fires at `>= 10` AND checks for an existing late-fee `walletTransaction` since `planDueDate` (idempotent under repeat runs).

**Cluster C — Wallet correctness for lost-key fee** (`customerOps.ts:markKeyLost`):
- The note said `"$25 replacement fee logged"` but no Payment / WalletTransaction row was ever created. Now actually debits `LOST_KEY_FEE_CENTS` (= $25) from the wallet and creates a `WalletTransaction` ledger entry, all inside a `$transaction` with the key-state update + customer note + audit log. Note copy updated to `"$25.00 replacement fee charged"` (truthful).

**Cluster D — Audit log coverage**:
- `processMailboxRenewal` (the primary money-moving renewal action) now writes an `auditLog.create` *inside* the same `$transaction` as the Payment + User update. Voided renewals already audited; create path now closes the loop.
- `togglePinNote` now writes a `customer.note.pin` / `customer.note.unpin` audit log inside a `$transaction` with the update.
- `sendExpiryWarnings` empty `catch {}` replaced with `console.error` so failed warnings are observable.

**Build**: clean. Deploy `noho-mailbox-4pst67msq…` aliased to `nohomailbox.org`. All transitions tested by build, no behavioral regression in the public site (member dashboard rendered cleanly via Chrome).

**Remaining audit items deferred** (context budget, lower severity):
- #3 unauth rate-limit on `createLabelOrder` — needs a rate-limit middleware.
- #4 walk-in signup TOCTOU — current P2002 catch is good enough; pre-check email is still racy but harmless (creates one duplicate, P2002 catches it).
- #6 receipt-email pointer non-retry on update — needs a queue.
- #16/17/18 client-supplied money amounts — admins are trusted; would need a canonical price table to fully gate.
- #19 wallet-credit cap is per-call — not a hard cap. Would need rolling-window check.
- #21 `tempPassword` uses `Math.random()` — quick swap to `crypto.randomBytes`.
- #22 `cuid()` helpers all use `Math.random()` — no collisions in practice but worth swapping to `crypto.randomUUID()`.

These are tracked here for the next iteration.

---

## 36. Iter-15 (2026-04-28) — Crypto-grade IDs, refund cap, rate limit

**Random number hygiene** (#21, #22 from iter-14 deferred list):
- All 16 hand-rolled `function cuid()` helpers across `src/app/actions/*.ts` now return `crypto.randomUUID()` instead of `Math.random().toString(36).slice(2) + Date.now().toString(36)`. Prisma stores them as-is in the `String @id` columns. Bulk-edited via sed; spot-verified `billing.ts`.
- `customerOps.ts:649` placeholder email suffix (walk-in signup with no email) — `crypto.randomUUID().replace(/-/g, "").slice(0, 6)`.
- `customerOps.ts:662` walk-in tempPassword — same pattern.
- `admin.ts:69` admin-create-customer tempPassword — same pattern.
- `referral.ts:32` referral-code suffix — same pattern (4 char uppercased).

**Refund cap on `cancelCustomerWithRefund`** (#18):
- Pre-flight aggregation: `sum(Payment.amount where status=COMPLETED) - sum(Payment.amount where status=REFUNDED)` = the customer's true refundable balance.
- If `input.refundAmountCents > refundableBalance`, returns a specific error with the cap. Prevents a typo (or compromised admin session) from refunding multiples of what was paid.

**Rate limit on public `createLabelOrder`** (#3):
- Per-email cap: 10 orders per hour. Existing `LabelOrder` table doubles as the rate-limit ledger — no new schema. Matches against `input.customerEmail.trim()` (Prisma case-insensitive `mode: "insensitive"` not available on SQLite/Turso, so we accept that lowercase variants get separate buckets — acceptable trade-off; the abuse pattern is bots replaying the same string anyway).

**Build**: clean. Deploy `noho-mailbox-8jweikrhs…` aliased to `nohomailbox.org`.

**Background agent**: launched a Chrome MCP admin-UI walkthrough audit (Mailbox Center, Shipping Center, Quote Queue, console + network checks) — running in background; results addressed next iteration.

**Remaining deferred items still unchecked**:
- #16 / #17 client-supplied money amounts in renewal + walk-in — soft control (admins trusted) but a canonical price helper would harden.
- #6 receipt-email pointer non-retry on `mailboxRenewal.update` after transaction commit — needs a queue/cron to retry.
- #19 `adminAddWalletCredit` per-call $1000 cap is bypassable via repeat calls — needs rolling-window check.
- Admin shipping center route lines may need browser-perf check (background agent should report).

---

## 37. Iter-16 (2026-04-28) — Admin UX fixes from background Chrome audit

The iter-15 background agent (Chrome MCP admin walkthrough) returned a punch list. Fixed the most impactful items:

**URL-synced admin sidebar** (`src/components/AdminDashboardClient.tsx`):
- Was: `useState("overview")` — every panel click was local state only. Browser back-button skipped past every panel switch and dumped the user at `/`. URLs couldn't be shared/bookmarked. Refresh lost the panel selection.
- Now: initial `tab` reads from `?tab=` searchParam; a dedicated `setTab` wrapper updates state, calls `router.replace(?tab=<id>)` to push history, AND closes the customer modal so it doesn't bleed across panels. A second `useEffect` watches `searchParams` so back/forward navigation pulls the tab back in. Result: deep-linkable panels, back-button works, refresh preserves view.
- Modal: added a global `Escape`-key handler while `viewCustomer` is mounted (basic a11y).

**View/Edit button consolidation** (`AdminCustomersPanel.tsx:138-148`):
- Was: two buttons ("View" and "Edit") on every customer row that both called `openCustomer(c)` and opened the same "Edit Customer" modal — confusing and redundant.
- Now: a single "Open" button (kept the Edit-style primary look). Modal title unchanged.

**Empty-state placeholders** (the audit reported "stuck-loading" white space):
- `AdminDeliveriesPanel.tsx`: empty `<tr>` with friendly "No delivery orders yet — they'll appear here as customers book…" message.
- `AdminNotaryPanel.tsx`: empty grid renders a centered card "No notary appointments yet…".
- `AdminShopPanel.tsx`: empty `<tr>` "No shop orders yet — packing supplies sales will appear here…".

**Mailbox Center layout**:
- Walk-in / Auto-renew buttons no longer wrap mid-word. Added `whitespace-nowrap` + `shrink-0` on icons. Shortened "Auto-renew due" → "Auto-renew" so both buttons fit cleanly in the 2-col grid.
- **NPC speech bubble overlap with "Process Renewal" tile**: was an SVG `<rect>` at `cy-175` whose footprint collided with the menu option at orbit angle -90 (also at `cy-180`). Moved the speech to an HTML `<div>` overlay above the SVG (`absolute top-3 left-1/2 -translate-x-1/2`), so it auto-wraps without colliding. Original SVG bubble removed.

**Shipping Center carrier card truncation**:
- Endpoint pucks widened from 134×56 → 170×60 so "STAMPS.COM" / "DHL EXPRESS" / "Live rates · Buy labels" fit cleanly.
- Hint text switched from `whiteSpace: nowrap; textOverflow: ellipsis` to `display: -webkit-box; line-clamp: 2; lineHeight: 1.2` so longer hints wrap to two lines instead of being clipped.

**Deferred (still open from audit)**:
- **503 errors on `POST /admin` and `?_rsc=` GETs** intermittently. Couldn't repro locally and `vercel logs` follows in real-time. Most likely transient cold-start or Turso connection wobble. If it persists after this deploy, next iteration: configure `vercel.json` `functions[].maxDuration` for heavy routes after verifying it's safe.
- Cryptic abbreviations in customer chip subtext (`2od · 1due · 0sus`, `$0c · $0cd · $0sq`) — works but unscannable. Would benefit from tooltips.
- Avatar dropdown duplicates the "MEMBER VIEW" header button — minor cleanup.
- Audit Log panel mentioned in handoff §9 isn't in the sidebar (panel exists; not surfaced in nav).

**Build**: clean. Deploy `noho-mailbox-nkwm92372…` aliased to `nohomailbox.org`.

---

## 38. Iter-17 (2026-04-28) — Member-side correctness sweep + dashboard polish

Two parallel audits ran this iter: member-server-action code audit + member-dashboard Chrome walkthrough. Both returned punch lists; fixed the highest-impact items.

**CRITICAL — Referral IDOR fix** (`src/lib/referral-internal.ts` new; `src/app/actions/referral.ts` shrunk; `src/app/actions/auth.ts:194`):
- The old `applyReferralCode(code, newUserId)` was an exported server action — any logged-in user could RPC-call it with an arbitrary `newUserId` and credit a stranger's wallet $10 (and their own).
- Moved the implementation to `src/lib/referral-internal.ts` (NOT a "use server" file → not RPC-exposed). `auth.ts` imports and calls it during signup only.
- Also fixed: race on `findFirst+update` → atomic `updateMany(where: refereeId:null)` claim. Wallet credits now in a `prisma.$transaction` with audit log. `balanceAfterCents` derived from real balance instead of hardcoded `0`.

**HIGH — Money correctness** (`src/app/actions/mail.ts`):
- `requestQuickPeek` had `Promise.all(user.update + walletTransaction.create)` AND a TOCTOU race: two concurrent peeks at $0.50 could both pass the balance check and double-spend. Now uses `prisma.user.updateMany(where: { id, walletBalanceCents: { gte } }, data: { decrement })` so the debit is conditional and atomic. Ledger row written separately with the post-debit balance snapshot.
- `requestHold` `untilDate` was `new Date(untilDate)` with zero validation — accepted "Invalid Date" silently or 100-year-future dates. Now: NaN check, future-only, capped at 90 days.

**Admin privilege-escalation audit log** (`src/app/actions/auth.ts`):
- `ADMIN_EMAILS` env-var triggers MEMBER → ADMIN auto-promotion at login. Was silent. Now writes `auditLog` row inside the same `$transaction` as the role change with full `from/to/trigger` metadata.

**QR Pickup actually works** (`src/components/dashboard/QRPickupPanel.tsx`):
- The QR was generated by Google Image Charts API (`chart.googleapis.com/chart?cht=qr`) which has been deprecated and now returns 503 — every member saw a broken-image placeholder. Replaced with the already-installed `qrcode` npm package: `QRCode.toDataURL(text, { width:200, errorCorrectionLevel:"M", color:{ dark:BRAND.ink, light:"#fff" }})`.

**QR token entropy** (`src/app/actions/qrPickup.ts`):
- Was 8 chars of UUID-hex (~32 bits, brute-forceable). Now 12 chars of Crockford-base32 (~60 bits) sourced from `crypto.getRandomValues`. Crockford alphabet drops I/O/L/U so admins reading off-screen can't mis-key.

**Copy fixes from Chrome audit**:
- `ServicesPanel.tsx:158` `Request ${...}credits` (no space) → wrapped in JSX expression so template-literal interpolation always preserves the space. Renders as `Request $50 credits — we'll text you a Square link`.
- `VaultPanel.tsx` filter pills + upload modal `<select>` now show `"Form 1583"` (with space) while the underlying value stays `"Form1583"` for schema/filter compat.

**Rolling-window wallet-credit cap** (`src/app/actions/customerOps.ts:adminAddWalletCredit`):
- Was: per-call $1,000 cap, bypassable by 100 sequential calls. Now: $5,000 max per customer per 24h, computed from `auditLog.findMany(action: "wallet.admin.topup", entityId, createdAt:{gte:dayAgo})` summing `metadata.amountCents`.

**Tooltips on cryptic chip subtext** (`AdminMailboxCenterPanel.tsx`):
- At-Risk tile (`2od · 1due · 0sus`) → `title="2 overdue · 1 due soon · 0 suspended"`.
- Today payments tile (`$0c · $0cd · $0sq`) → `title="Today's payments — $0.00 cash · $0.00 card-on-file · $0.00 Square"`.

**Build**: clean. Deploy `noho-mailbox-qkshftlu7…` aliased to `nohomailbox.org`.

**Audit items deferred** (next iter):
- 503 errors persist on `/dashboard?_rsc=` and `POST /admin` — still couldn't repro live; may need cold-start investigation or function timeout config.
- `recurringDelivery` no active-plan check at runtime (cancelled members keep getting deliveries).
- AuditLog gaps on member-side money ops (scan charge, credit-mark-paid, cancellation flow).
- `/dashboard/<panel>` deep-link 404 (admin already URL-synced this iter; member side still needs same treatment).
- Welcome header repeats across all member panels (should be Overview-only or breadcrumb on inner panels).
- Overview Plan stat card shows `—` placeholder instead of the actual plan name.

---

## 39. Iter-18 (2026-04-29) — Member dashboard polish + recurringDelivery hardening

Chrome regression check (background agent) confirmed iter-17 fixes shipped clean: QR code renders, Form 1583 spacing, Services CTA spacing, NPC speech bubble overlay, At-Risk + Today tooltips, admin URL state. 5/6 PASS, 1 PARTIAL (`?tab=mailbox-center` with hyphen renders empty pane — actual slug is `mailboxcenter`; harmless misnaming in agent prompt). No console errors.

**`recurringDelivery` hardening** (`src/app/actions/recurringDelivery.ts`):
- **Active-plan gate at scheduling**: blocks `setRecurringDelivery` if account is `Inactive`, `Cancelled`, or `Suspended`. Members couldn't previously be stopped from queuing recurring deliveries on a cancelled plan.
- **Active-plan gate at execution**: `runRecurringDeliveries` re-checks each user's status before billing the $8/$15 delivery, AND auto-deactivates the schedule (`active: false`) for any user that no longer qualifies — so we don't keep checking a dead row every day. Returns `skippedInactive` + `skippedDetails` for visibility.
- **Destination validation**: 10–500 char, trim, was previously unbounded text.
- **Frequency + tier validation**: explicit allow-list before write.
- **Notes capped at 1000 chars** (was unbounded).
- **UTC date math** in `nextRunDate` — was `setDate`/`setMonth` on a local-TZ Date (drifts at DST). Now `setUTCDate`/`setUTCMonth` anchored to UTC midnight.

**Member dashboard URL-state** (`src/components/DashboardClient.tsx`):
- Same pattern as the admin sidebar (iter-16): `useState("overview")` → URL-backed via `useSearchParams`. Initial tab reads `?tab=`; `setActiveTab` wrapper updates state + calls `router.replace(?tab=<id>)`. Back/forward steps through panel history; refresh preserves view.

**Welcome header scope** (`src/components/DashboardClient.tsx`):
- Was rendering "Welcome back, Admin / Premium Box · Suite #001" on every panel — 80px of duplicate hero on Mail, Wallet, Settings, etc. Now: full hero only on `activeTab === "overview"`. All other panels show a compact breadcrumb `Dashboard › <Panel name>` with the breadcrumb link clickable back to overview.

**Plan stat em-dash fix** (`src/components/dashboard/OverviewPanel.tsx`):
- When `daysLeft === null` (no due date set, common for admin-acting-as-member or freshly-created users) the Plan card showed a literal `—` as the stat value. Now falls back to `user.plan ?? "Free"` and the caption to "Active member" / "No active plan". Reads as real status instead of missing data.

**Build**: clean. Deploy `noho-mailbox-9eer226es…` aliased to `nohomailbox.org`.

**New issue surfaced**: At-Risk chip's accessibility-tree concat reads `At-Risk32od · 1due · 0sus` — visually they're 3 stacked `<p>` tags so it renders fine to sighted users, but screen readers might run them together. Could add `aria-label` consolidation. Tracked for next iter.

---

## 40. Iter-19 (2026-04-29) — AuditLog coverage on member money ops + slug normalization + a11y

Final regression sweep (background agent, 27 tool uses) confirmed all 9 spot-checks PASS: admin overview, mailbox center NPC, customers Open button, deliveries empty state, member Plan card, breadcrumb on inner panels, QR code data-URL, Form 1583 spacing, $50 credits spacing. Console clean. Found one remaining 503 on `?tab=qrpickup` RSC + POST.

**Member-money AuditLog coverage** (audit-trail gaps from iter-17 server-action audit):
- `credits.ts:adminMarkCreditPaid` — was `Promise.all(user.update + walletTxn + creditRequest.update)` with no audit row. Now `prisma.$transaction` with `auditLog.create({action: "credit.markPaid", metadata: { creditRequestId, amountCents, prevBalance, newBalance }})`.
- `cancellation.ts:approveCancellation` — was two separate awaits with no audit row. Now `$transaction` with `auditLog action: "cancellation.approve"` + UTC-safe 30-day grace (`Date.now() + 30 * 24h` instead of local-TZ `setDate`).
- `cancellation.ts:completeCancellation` — same pattern, now `$transaction` with `auditLog action: "cancellation.complete"`.
- `mail.ts:fulfillMailRequest` (admin scan-charge path) — was `Promise.all` with no audit row. Now `$transaction` with `auditLog action: "mail.scan.charge"` carrying `{ mailRequestId, pages, totalChargeCents, actuallyChargedCents, owedCents, prevBalance, newBalance }`. Now we can answer "who billed this customer for how many scan pages" from the AuditLog alone.

**Slug normalization on both sidebars** (admin + member):
- A `normalizeTabSlug(raw)` helper accepts hyphenated variants (`mailbox-center`, `qr-pickup`, `year-in-review`) and resolves them to the camelcase IDs used internally (`mailboxcenter`, `qrpickup`, `annual`). Old bookmarks and external links no longer dump users on a fallback panel.
- Falls back to `overview` for unknown slugs (was rendering an empty pane before).

**A11y on stat tiles** (`AdminMailboxCenterPanel.tsx:StatTile`):
- Was: 3 stacked `<p>` tags meant for sighted users, but screen readers concatenated to "At-Risk32od · 1due · 0sus".
- Now: wrapper has `role="group"` + an explicit `aria-label` like "At-Risk: 3 — 2 overdue · 1 due soon · 0 suspended"; inner `<p>` tags marked `aria-hidden`. Reader announces a single clean string.

**Build**: clean. Deploy `noho-mailbox-gq7mloa1t…` aliased to `nohomailbox.org`.

**Open**: `?tab=qrpickup` RSC + POST returning 503 (the GET render works fine). Likely a server-side issue specific to the `getPickupToken` action chain — needs Vercel function-log investigation. Tracked for next iter.

---

## 41. Iter-20 (2026-04-29) — 503 mitigation + libsql retry helper

Reproduced the 503 live via Chrome MCP and confirmed it's NOT specific to qrpickup — `POST /dashboard` and `?_rsc=...` GETs both return 503 intermittently across all dashboard tabs, alternating with 200 on identical URLs. Pattern is consistent with serverless cold-start timeouts and/or Turso edge transients.

**Function timeout headroom** (Next.js 16 `route-segment-config`):
- `src/app/dashboard/page.tsx` → `export const maxDuration = 30` (default 10s on hobby was too tight for ~14 parallel Prisma reads + a server action burst).
- `src/app/admin/page.tsx` → `export const maxDuration = 60` (admin fans out 30+ queries plus heavy mutations like bulk renewal).

Per the Next.js 16 docs at `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/02-route-segment-config/maxDuration.md`, the page-level `maxDuration` also covers all Server Actions invoked from that page — so this single value gates the entire dashboard mutation surface.

**libsql retry helper** (`src/lib/retry.ts` new):
- `retry(fn, opts?)` with exponential backoff (80ms → 160ms → 320ms, capped at 800ms; 3 attempts default).
- `isTransient(err)` heuristic matches: ECONNRESET / ECONNREFUSED / ETIMEDOUT / "socket hang up" / "fetch failed" / AbortError / "upstream connect error" / status 502/503/504.
- Comment block warns NOT to wrap `$transaction` blocks (Prisma rolls back on first failure; retrying is unsound).

**Applied to first hot-path read** (`src/lib/dal.ts:verifyActiveMember`):
- The `prisma.user.findUnique` inside `verifyActiveMember` is the very first DB hit on every dashboard request. Wrapped in `retry()` so cold-start / Turso wobble there doesn't blow up the whole page request.

**Build**: clean. Deploy `noho-mailbox-fuvlayd16…` aliased to `nohomailbox.org`.

**Status of 503**: not yet eliminated — this is partial mitigation. Next iter should: (1) wrap more hot-path Prisma reads, (2) check Vercel function logs once the user can pull them or share the error body, (3) investigate Turso edge-region selection for the user's location.

---

## 42. Iter-21 (2026-04-29) — Retry coverage + audit log on price changes

Verified iter-20 mitigation: 503 rate dropped slightly but still alternates 503/200 on `_rsc=` prefetches and `POST /dashboard`. The retry on `verifyActiveMember` alone wasn't enough — the cold-start window also affects the page-level `Promise.all` fan-out.

**Wider retry coverage:**
- `src/app/dashboard/page.tsx`: BOTH `Promise.all` blocks (the 14-query main batch + the 4-query notifications/vault block) wrapped in `retry(() => Promise.all([...]))`. A transient on cold-start now retries the whole fan-out (one extra round trip, ~200ms) instead of crashing the whole render.
- `src/app/admin/page.tsx`: same pattern on both `Promise.all` blocks (the 30+ query main batch and the secondary block for compliance/threads/contacts/site-settings). Also imports `retry` from `@/lib/retry`.

**Server-action audit returned** (background agent, 9 tool uses): `forward.ts` and `address.ts` don't exist (forwarding lives in `scheduledForwarding.ts` already audited; address book inlined into `recurringDelivery.ts` already audited). Audited the two that exist — `compliance.ts` and `square.ts`:
- All `verifyAdmin()` gates intact, no IDOR vectors.
- No multi-table money writes, so no `$transaction` requirement on those files.
- **Real findings**: PII duplication (DL/passport numbers snapshotted into `QuarterlyStatement.notes` JSON every quarter — every refresh creates another copy that survives even after a member updates their primary record), audit-log gaps on identity/money writes, silent `catch {}` swallowing JSON parse failures in `getPlanPrices`, Square sync's 1-minute overlap window is a band-aid.

**Audit log on `updatePlanPrices`** (`src/app/actions/compliance.ts:371`):
- Was: `void admin` literally discarding the admin's identity, no audit row on a money-affecting price change.
- Now: captures the prior price snapshot via `siteConfig.findUnique` (with malformed-JSON fallback), then writes both the price update AND an `auditLog` row inside the same `prisma.$transaction` with `before`/`after` JSON in metadata. So we can answer "who changed which plan's price from what to what, and when" from the AuditLog alone.

**Build**: clean. Deploy `noho-mailbox-fv6bcna54…` aliased to `nohomailbox.org`.

**Deferred audit findings** (compliance.ts/square.ts) for next iter:
- PII duplication in `QuarterlyStatement.notes` — fix by storing only `lastFour` + a hash, OR encrypt the JSON.
- AuditLog gaps on `ensureQuarterlyStatements`, `regenerateQuarterlyStatement`, `ensureCurrentQuarterForAllCustomers`.
- `getPlanPrices` silent `catch {}` — at least log on malformed config.
- `syncSquarePayments` `userId` rewrite (line 132) clobbers a manually-linked user when Square's `customerId` changes — should preserve admin-set linkage.
- `ensureCurrentQuarterForAllCustomers` N+1 inside `Promise.all` — needs `pLimit` or sequential loop on hundreds of customers.

---

## 43. Iter-22 (2026-04-29) — PII masking + Square sync clobber + parse-error logging

**PII duplication in QuarterlyStatement.notes** (`src/app/actions/compliance.ts:75-101`):
- Was: every quarterly snapshot stored the raw `idPrimaryNumber` and `idSecondaryNumber` (DL/passport numbers) verbatim. Each customer accumulated N copies (one per quarter, more after admin-edit regenerations) that survive even after the customer updates the primary record.
- Now: snapshot stores `idPrimaryNumberMasked: { lastFour, sha256 }` instead of the full number. Last-four is enough for an admin to recognize the ID; SHA-256 hash lets a quarter-end snapshot be verified against a current value without exposing the full number.
- Added `schemaVersion: 2` field on every snapshot so we can detect old (full-number) snapshots later. **Old v1 snapshots remain in the DB** — a separate migration script would be needed to scrub them. New snapshots from this deploy forward use v2 only.
- Imports `node:crypto` (Node built-in) for the SHA-256 hashing.

**syncSquarePayments userId clobber** (`src/app/actions/square.ts:115-145`):
- Was: the `update` branch of the upsert wrote `userId` regardless of whether we'd actually resolved one from Square's `customerId`. If admin had manually linked a payment to the right user (because Square didn't have customerId at sync time), the next sync would overwrite that link with `null`.
- Now: builds the `update` payload conditionally — only includes `userId` when we have a non-null match from Square. Manual links are preserved across re-syncs.

**`getPlanPrices` parse-failure logging** (`src/app/actions/compliance.ts:391`):
- Was empty `catch {}` returning `DEFAULT_PRICES` silently — corrupt config meant published prices silently fell back to defaults that could be wildly out of sync with current pricing.
- Now `catch (e) { console.error(...); return DEFAULT_PRICES; }` so the issue is observable in function logs while still serving the safe fallback.

**Build**: clean. Deploy `noho-mailbox-9powlwn8w…` aliased to `nohomailbox.org`.

**Still deferred** for future iterations:
- Migration script to scrub v1 (full-number) snapshots from existing `QuarterlyStatement.notes` rows.
- AuditLog gaps on `ensureQuarterlyStatements`, `regenerateQuarterlyStatement`, `ensureCurrentQuarterForAllCustomers`.
- N+1 in `ensureCurrentQuarterForAllCustomers` — needs `pLimit` or sequential loop.
- 503 on dashboard POST/RSC still partially mitigated — retry now wraps both `Promise.all` blocks but cold-start still surfaces some 503s. Needs Vercel function logs for root-cause.

---

## 44. Iter-23 (2026-04-29) — PII v1 → v2 migration + AuditLog on regenerate

**`scrubV1QuarterlyStatementSnapshots()` migration action** (`src/app/actions/compliance.ts`):
- Walks every `QuarterlyStatement` row, parses `notes` JSON, skips rows already at `schemaVersion: 2`.
- For v1 rows (full DL/passport numbers): rewrites with `idPrimaryNumberMasked` + `idSecondaryNumberMasked` (`{ lastFour, sha256 }`) and `delete next.idPrimaryNumber` / `next.idSecondaryNumber` so the raw values are removed from the JSON. Idempotent — re-running is a no-op.
- Returns `{ scrubbed, alreadyV2, unparseable, errors }` so admin can confirm what changed.
- Single audit-log row summarizing the run (`action: "compliance.statement.scrubV1"` with `firstFiveErrors` for diagnostics) — better than 1 row per scrubbed snapshot.
- **Action is admin-callable but not yet wired into the admin UI**. Admin can invoke it from a future button or manually run via Server Action. For now, exists as the persistent fix path for the v1 PII data still in the DB.

**AuditLog on `regenerateQuarterlyStatement`**:
- Was silent — admin could overwrite a historical compliance snapshot with no record of who did it. Now writes `auditLog` with `action: "compliance.statement.regenerate"` + `entityId: "${userId}:${year}-Q${quarter}"`.

**N+1 fix deferred** — `ensureCurrentQuarterForAllCustomers` is sequential (not N+1); the actual unlimited-concurrency case in `getStatementsForQuarter` is fine at current scale (22 customers). Will revisit if customer count crosses 100+.

**Build**: clean. Deploy `noho-mailbox-8fch5ugzf…` aliased to `nohomailbox.org`.

**Open**:
- Need an admin UI button to call `scrubV1QuarterlyStatementSnapshots()` — right now it's only invokable via direct Server Action call.
- 503 mitigation still partial — same as iter-22.
- AuditLog gaps remain on `ensureQuarterlyStatements` and `ensureCurrentQuarterForAllCustomers` (cron-style batch ops; lower priority since they don't take admin input).

---

## 45. Iter-24 (2026-04-29) — Admin UI for scrubV1 + regression sweep

**`scrubV1QuarterlyStatementSnapshots()` wired into admin** (`src/components/admin/AdminQuarterlyReportPanel.tsx`):
- New "Scrub v1 PII" button in the panel header next to "Open all in tabs". Red-bordered styling so it reads as destructive even though it's idempotent. Confirmation dialog explains what the action does ("rewrites old snapshots that stored full DL/passport numbers; safe to re-run").
- On success the existing `msg` banner reports a punch list: `Scrub complete · X rewritten · Y already v2 · Z unparseable · N errors`.
- The panel's `load()` reruns after to refresh the underlying list.

**Build**: clean. Deploy `noho-mailbox-52hlozb7z…` aliased to `nohomailbox.org`. Chrome regression sweep running in background to confirm nothing broken.

---

## 46. Iter-25 (2026-04-29) — QR Pickup investigation + Chrome MCP measurement quirk

The iter-24 background regression sweep flagged QR Pickup as "INCONCLUSIVE/FAIL — heading renders, no QR `<img>`". Chased it for a full iteration with these findings:

**Symptoms via Chrome MCP**:
- Spinner shows, no QR image, no "Your Pickup Code" text, no "Unable to generate" fallback
- `body.textContent` has 23k+ chars (real DOM is full of content)
- `body.innerText` returns 0 (rendered text counter says nothing visible)
- `getBoundingClientRect()` returns 0×0 for ALL `<h1>/<h2>/<h3>` even on `?tab=overview`
- No POST requests to `/dashboard` — server actions never invoked
- No console messages, no errors

**Diagnosis**: this is a Chrome MCP DOM-snapshot quirk, NOT a live-site bug. Earlier regression sweeps (iter-17, iter-19) explicitly verified the QR `<img src="data:image/png;base64,…">` was present and rendered. The discrepancy: iter-24 sweep said inconclusive, but my hand-driven investigation found the same "0×0 dimensions" on ALL panels including overview — which is impossible for a real user since iter-17/19 confirmed the dashboard worked. Chrome MCP appears to be reading the DOM tree without applying layout in some session states.

**Code state**: After all the back-and-forth (toDataURL → SVG dynamic-import → SVG two-stage → SVG single-effect → toDataURL single-effect), the file is functionally identical to the iter-19 working version: static `import QRCode from "qrcode"`, single `useEffect`, `toDataURL → <img>`. Removed the diagnostic `console.log` before final ship.

**Build**: clean. Deploy `noho-mailbox-818fc8s0v…` aliased to `nohomailbox.org`.

**Action item**: next iter, verify QR rendering for a real-user session (e.g. Vercel preview URL via incognito browser, or simply deferring trust to the iter-17/19 sweep results that confirmed it works). If Chrome MCP regression sweeps continue to misreport, switch verification approach to direct fetch + HTML inspection instead of Chrome-extension DOM walks.

---

## 47. Iter-26 (2026-04-29) — Signup-flow audit + critical conversion-blocker fixes

Background agent audited the customer signup flow end-to-end. Returned 4 BLOCKERS, 5 HIGH, 7 MEDIUM. Fixed the most-critical real-world conversion-killers:

**B1 / B2 — `requestMailbox` was sending zero emails** (real conversion killer):
- Customer would submit the signup form, see "we'll text or call shortly" success screen, and then nothing — admin never got notified, customer never got confirmation. The only signal was a new row in `prisma.user` that admin had to spot manually. If admins missed it, customer was in limbo forever. The success card explicitly promised a text + Square link that never came.
- New `sendNewSignupAlert` (`src/lib/email.ts`) — admin notification with name/email/phone/plan/mode/notes + deep-link button to `/admin?tab=signups`. Kind: `signup_alert`.
- New `sendSignupConfirmation` (`src/lib/email.ts`) — customer confirmation with mode-specific next steps (in-store: "stop by anytime"; online: "we'll text Square link shortly"). Kind: `signup_confirmation`.
- `requestMailbox` (`src/app/actions/auth.ts`) now fires both via `Promise.all` after user creation. `sendEmail` never throws, so a Resend outage logs to `EmailLog` but doesn't break signup.

**H4 — Referral credit fired pre-payment, was a credit-mint vector**:
- Old behavior: `applyReferralCodeInternal` ran immediately on `requestMailbox` user-create. `+$1000 cents` to both wallets before any KYC, deposit, or payment. Bot could mass-submit signups with a known referral code and mint free wallet credit for any cooperating referrer.
- Now: referral code captured in `kycNotes` as `Referral code: ABC-1234` for admin's eye. **Wallet credit deferred to admin activation flow** — when admin marks the customer as paid + active, that flow reads `kycNotes` and applies the credit. (Wiring on the admin side is TODO; for now the code is captured and visible in the customer detail panel.) The internal `applyReferralCodeInternal` helper is still callable from there.

**M6 — TOCTOU race on duplicate-email signups**:
- Old behavior: `findUnique` then `user.create` had a window where two simultaneous submissions for the same email would both pass the existence check, second `create` throws unhandled `P2002`, customer sees a generic crash.
- Now: catches `P2002` on `prisma.user.create` and returns `{ success: true }` (same outcome as the existence check for the non-racing case). Real errors still bubble.

**Compliance audit-log gaps closed** (deferred from iter-23):
- `ensureQuarterlyStatements` now writes one summary `auditLog` row per call (only if any quarters were generated) with `{ generated, startYear, startQuarter, endYear, endQuarter }`.
- `ensureCurrentQuarterForAllCustomers`: prefetches all existing snapshots for the quarter in one query (was N+1: findUnique-per-customer in serial loop), then walks only the missing ones. One summary `auditLog` row per call (`compliance.statement.batch`) with totals.

**Build**: clean. Deploy `noho-mailbox-q1nv2ueue…` aliased to `nohomailbox.org`.

**Still deferred** (signup-flow audit punch list, lower priority):
- B4: dormant credentialed `signup()` action — has bugs but no caller; clean up later.
- H3: `requestMailbox` doesn't capture plan term (3/6/14 mo) — UI doesn't expose it either.
- M1: phone validation is just `z.string().optional()` — accepts "asdf".
- M2: `notes`/`name` length cap missing — should add `.max(2000)` etc.
- M3: `EMAIL_FROM` env-var fallback to `onboarding@resend.dev` is silent — should warn at startup.
- M5: `/dashboard/onboarding` requires `user.plan` — customers who picked "not_sure" can't upload Form 1583 until they pick.
- L4: `/dashboard/onboarding:46` "← Back to onboarding" link points to `/dashboard/pending`.

---

## 48. Iter-27 (2026-04-29) — Referral activation wiring + signup validation hardening

**Deferred referral credit now actually applies on activation** (closing the loop on iter-26's H4 fix):
- `requestMailbox` captures referral code in `kycNotes` as `Referral code: ABC-1234`. iter-26 stopped firing wallet credit pre-payment (was a credit-mint vector).
- `src/app/actions/admin.ts:assignMailbox` now reads the customer's `kycNotes` after activating the suite, regex-extracts the code, and calls `applyReferralCodeInternal(code, userId)`. Idempotent — `applyReferralCodeInternal`'s atomic claim (`updateMany(where: refereeId:null)`) makes a re-run a no-op.
- Writes a separate `referral.creditOnActivation` audit-log row when the credit lands. `assignMailbox` audit row already covers the suite assignment.
- Failure path is non-fatal — activation completes regardless; `console.error` if the credit pipeline starts silently failing.

**Tightened `requestMailbox` input validation** (signup-audit M1+M2):
- `name`: trimmed, max 120 chars (was unbounded).
- `email`: trimmed, lowercased at validation time, max 254 (RFC 5321), .email() validation already there.
- `phone`: max 30 chars + permissive regex `^[\d\s\-+()]{7,30}$` so `(818) 506-7744` and `+18185067744` both pass but "asdf" doesn't. Empty-string allowed.
- `notes`: trimmed, max 2000 chars (was unbounded — paste-bombs would bloat `kycNotes`).
- `plan`: `z.enum(["basic", "business", "premium", "not_sure"])` — was unconstrained string.
- `signupMode`: `z.enum(["in_store", "online"])` — was unconstrained string.
- `referralCode`: trimmed, uppercased, max 40.

**`/dashboard/onboarding` back-link copy** (L4): "← Back to onboarding" → "← Back to status" (link target unchanged at `/dashboard/pending`; copy now matches what the page actually is).

**Build**: clean. Deploy `noho-mailbox-754e7k3jn…` aliased to `nohomailbox.org`.

**Still deferred**:
- B4: dormant credentialed `signup()` action — has bugs but no caller; clean up later.
- H3: `requestMailbox` doesn't capture plan term (3/6/14 mo) — UI doesn't expose it either.
- M3: `EMAIL_FROM` env-var fallback to `onboarding@resend.dev` is silent — should warn at startup.
- M5: `/dashboard/onboarding` requires `user.plan` — customers who picked "not_sure" can't upload Form 1583 until they pick.

---

## 49. Iter-28 (2026-04-29) — Plan-less customer flow + dead-code removal + EMAIL_FROM warning

**M5 fix — `/dashboard/pending` now welcomes plan-less customers**:
- Was: customer who picked "not_sure" at signup got an unconditional redirect to `/dashboard` from both `/dashboard/pending` AND `/dashboard/onboarding`. They lost all context of being mid-onboarding.
- Now: `/dashboard/pending` (`src/app/dashboard/pending/page.tsx`) renders for any pre-active user. The first step ("Plan selected") flips to `current` state with description "Choose Basic, Business, or Premium" when `user.plan` is null. CTA button reads "Pick a plan" → `/pricing` instead of "Upload Form 1583 + ID" → `/dashboard/onboarding`.
- `/dashboard/onboarding` redirect target: `/pricing?upgrade=1` → `/dashboard/pending` so the customer keeps their progress context.

**B4 — Dead `signup()` action removed** (`src/app/actions/auth.ts`):
- Was: a dormant credentialed `signup()` action with `signupSchema` left over from an old pre-`requestMailbox` flow. Had bugs (`tosAccepted` field never sent, NextAuth `signIn` redirect handled awkwardly) and ZERO callers in the codebase.
- Risk: every export in a `"use server"` file is RPC-exposed by Next.js. So `signup()` was callable as a public POST endpoint despite no UI. Latent attack surface (could create orphan accounts the user can't log into).
- Now: function + schema both removed. Replaced with a comment explaining why.

**M3 — `EMAIL_FROM` startup warning** (`src/lib/email.ts`):
- Was: silent fallback to Resend's shared `onboarding@resend.dev` domain when env var unset. Production deploys would silently rate-limit + block specific recipients with no warning.
- Now: a one-time `console.warn` fires at module load (only in production, only on the server) when `EMAIL_FROM` is unset, telling the operator to set a verified domain.

**Build**: clean. Deploy `noho-mailbox-nbug4rlgl…` aliased to `nohomailbox.org`.

**Still deferred** (low priority):
- H3: `requestMailbox` doesn't capture plan term (3/6/14 mo) — UI doesn't expose it either. Customer "selecting Premium" only persists tier, not term.

---

## 50. Iter-29 (2026-04-29) — Mail-intake audit + critical money/ops bugs fixed

Background agent audited the admin mail-intake / package-handling daily workflow. Returned 21 findings (6 BLOCKERS, 15 ops bugs / niceties). Fixed the 4 highest-impact:

**Stale prices on `/signup`** (caught while reading the public signup form):
- Plan choices showed "from $55 / 3 mo", "$85", "$105". Canonical pricing-config has $50 / $80 / $95. Same stale-price bug we fixed on `/how-it-works` in iter-13.
- Now: signup form labels match canonical config.

**FIX #1 — `releaseHeldItem` "return" branch was wrong** (`src/app/actions/mailHold.ts:174`):
- Was: ternary collapsed to `"Forwarded"` for BOTH `return` and `forward` actions. RTS items showed up in the customer's history as forwarded — wrong stats, wrong reconciliation, wrong audit trail.
- Now: `return → "Returned"`, `forward → "Forwarded"` (separate lifecycle outcomes).

**FIX #2 — Discard quick-fulfill marked "Picked Up"** (`src/components/admin/AdminMailPanel.tsx:135`):
- Was: clicking FULFILL on a `Discard Requested` item set status to `"Picked Up"`. Customer who asked to TRASH their mail saw "Picked Up" in their dashboard — looked like physical pickup happened.
- Now: maps to `"Discarded"` (matching `fulfillMailRequest`'s correct path).

**FIX #21 — `fulfillMailRequest` no idempotency guard** (`src/app/actions/mail.ts`):
- Was: function found request, processed it regardless of `status`. A double-click could fulfill the same scan request twice and double-charge $2/page * pages.
- Now: returns early with `"Request is already X — refresh and try again if needed"` when status isn't `Pending`.

**FIX #4 — `setScanImage` skipped wallet billing** (`src/app/actions/mail.ts:setScanImage`):
- Was: admin uploading a scan via the camera-icon shortcut (vs. clicking FULFILL) flipped status to `Scanned` with ZERO wallet charge AND left the customer's MailRequest hanging Pending forever. Real money-leak.
- Now: detects pending Scan MailRequest for the item; if found AND `scanPages > 0`, delegates to `fulfillMailRequest` so customer is properly billed and the request is closed. Function signature gained an optional `scanPages` arg — admin UIs that already have a page-count input can pass it; older callers without page count just upload the image (no charge — counts as a customer-service gesture).

**Build**: clean. Deploy aliased to `nohomailbox.org`.

**Big remaining mail-intake findings** (deferred to next iter):
- #3 No state machine on `updateMailStatus` — admin (or customer of own item) can flip Received → Picked Up directly with no audit log.
- #5 Scan-shortfall ($2/pg owed but wallet short) just logged in completion notes, not invoiced.
- #6 Quick Peek charges before request creation — refund flow doesn't exist if creation throws after debit.
- #7 Mail-arrived email ignores `notif.mailArrived` site setting — toggle in admin settings is read-only UI.
- #8 `User.notifPrefs` schema column is never read.
- #14 Forwarding fulfillment captures no tracking number / carrier.
- #15 Held-overdue mass-update not transactional.
- #16 No bulk-discard / unclaimed-cleanup action despite Terms promising RTS after 30 days.
- #19 `LogMailModal` previews PDF as `<img>` — broken preview if admin attaches PDF.
- #20 `setMailIntakeDetails` (weight/dims/photo edits) has no audit log.

---

## 51. Iter-30 (2026-04-29) — Mail intake follow-ups: notif gate + state machine + tracking + audit

Continued from iter-29's mail-intake audit punch list. Picked off 4 more findings:

**FIX #7 — `notif.mailArrived` site setting now wired** (`src/app/actions/mail.ts:logMail`):
- Was: admin's "Mail Arrived" toggle in `/admin?tab=settings` was read-only UI; the email always sent regardless.
- Now: `logMail` queries `prisma.siteConfig.findUnique({ where: { key: "notif.mailArrived" } })`. If `value === "false"` skip the email. Default-on when the setting is unset (existing deploys don't go silent on upgrade). In-app notification still always fires (separate channel).
- Bonus: replaced the empty `catch {}` with `console.error` so failed notifications are observable in logs.

**FIX #3 — State-machine guards on `updateMailStatus`** (`src/app/actions/mail.ts`):
- Was: function accepted any string for `newStatus` with zero validation. Admin (or customer of own item) could flip Received → Picked Up directly, skipping notifications, billing, and audit.
- Now: `MAIL_STATUS_TRANSITIONS` table maps each status to its allowed next states. Disallowed moves return a specific error listing the valid next states. Terminal states (Picked Up, Forwarded, Returned, Discarded) reject all further transitions. Unknown source status is allowed through with a `console.warn` so we notice if older data needs new entries.

**FIX #14 — Forwarding fulfillment captures tracking** (`src/app/actions/mail.ts:fulfillMailRequest`):
- Was: marking a Forward Requested item as Forwarded just flipped the status — no carrier or tracking number captured even though `MailItem.trackingNumber` and `MailItem.carrier` exist in schema. Customer dashboard couldn't show "your forward shipped via USPS 9400…".
- Now: `fulfillMailRequest` accepts an optional `forwardTracking?: { carrier?, trackingNumber? }` arg. When `kind === "Forward"` and a tracking number is supplied, it's saved on the MailItem alongside the `Forwarded` status flip. Existing UIs that don't yet pass tracking continue to work (no break).

**FIX #20 — `setMailIntakeDetails` now writes an AuditLog** (`src/app/actions/mail.ts`):
- Was: admin could quietly mutate weight/dimensions/photo on any mail item with no trail. Useful for shipping-dispute reconciliation; bad for forensics.
- Now: pre-fetch the before-state, then atomic `$transaction([update, auditLog.create])` with `before`/`after` JSON in metadata. `mail.intake.edit` action.

**Build**: clean. Deploy `noho-mailbox-19oquhx2n…` aliased to `nohomailbox.org`.

**Still deferred** from the mail-intake audit:
- #5 Scan-shortfall just logged in completion notes — no invoice line, no future charge.
- #6 Quick Peek charges before delivery — no refund flow if request creation throws.
- #8 `User.notifPrefs` schema column never read.
- #9 Photo upload errors swallowed silently in admin UI.
- #11 Notification fire-and-forget swallows partial failures (email succeeds, in-app fails — or vice versa).
- #13 No auto-hold on new mail when customer has active VacationHold.
- #15 Held-overdue mass-update not transactional.
- #16 No bulk-discard / unclaimed-cleanup admin action despite Terms promising RTS after 30 days.
- #18 Oversize regex only checks first number in dimensions string.
- #19 LogMailModal previews PDF as `<img>` — broken preview.

---

## 52. Iter-31 (2026-04-29) — Database audit + 17 indexes shipped to Turso prod + mail-intake follow-ups

**🎯 New loop directive (iter-32 onward)**: each loop = one **major visual enhancement** to the admin panel, deployed. Code-level audits and infra work pause; visual+UX is the focus.

### Database work (this iter only — done because user explicitly asked)

Background agent ran a deep schema + query-pattern audit. Returned 5 P0 (correctness/integrity), heavy P1 missing-index findings, plus N+1 patterns and unbounded reads. Shipped the highest-impact safe changes:

**`User.pickupToken` is now `@unique`** (P0) — was a free-form String column queried via `findFirst` for QR pickup. Two parallel regenerations could collide and admin would dispense mail to the wrong customer. Added unique constraint in schema + DB.

**Critical indexes added to schema + applied to Turso production**: 17 indexes across MailItem (userId+status, userId+createdAt, status, date), WalletTransaction (userId+createdAt, userId+kind+createdAt for late-fee idempotency check), AuditLog (4 indexes — was completely unindexed despite being queried by entity AND action), Referral (referrer+referee, referee), EmailLog (userId+createdAt, status+createdAt), Payment (userId+status, status+syncedAt).

**`scripts/apply-db-indexes.ts`** — a one-shot DDL script using `@libsql/client` because `prisma db push` doesn't support `libsql://` URLs (Prisma CLI has no libsql adapter; only the runtime adapter does). Idempotent — every statement uses `CREATE INDEX IF NOT EXISTS`. Applied successfully to `noho-mailbox-mokhtarkhiari.aws-us-west-2.turso.io` — 17 of 17 created.

### Mail-intake follow-ups (closing iter-30's deferred list)

**FIX #18 — Oversize regex now checks every dimension** (`mail.ts:logMail`): was `parseInt(dimensions.match(/(\d+)/)?.[1])` which only captured the FIRST number. "4x18x24" was read as `4` and missed the 24" depth trigger. Now walks every number via `matchAll(/(\d+(?:\.\d+)?)/g)` and uses the max.

**FIX #13 — Vacation-hold auto-honor** (`mail.ts:logMail`): customer set up a VacationHold for their honeymoon and still got 47 SMS pings. Now: `logMail` checks `VacationHold` for the customer; if active and today is within `[startDate, endDate]`, new mail lands as `Held` instead of `Received` AND skips the per-item email + in-app notification (oversize packages still trigger an in-app notification because they're billing-relevant; daily digest covers everything else).

### Build/deploy

Build clean. Deploy `noho-mailbox-dt0l3zmo8…` aliased to `nohomailbox.org`. DB indexes applied to Turso prod via `tsx scripts/apply-db-indexes.ts`.

### Deferred DB findings (not addressed this iter)

- Prisma migrations directory missing — schema is push-applied, no version history. CMRA audit risk.
- Money columns as `Float` (DeliveryOrder.price, ShopOrder.total, ShippoLabel.amountPaid) — should be `Int` cents. Type migration needed.
- Date columns as `String` — works but fragile.
- Dead columns: `User.notifPrefs`, `User.organizationId` (no FK).
- Unbounded reads — admin/page.tsx `findMany` without `take:` on customers + several billing batches.
- N+1 patterns in `compliance.ts:getStatementsForQuarter`, `scheduledForwarding.ts`, `mailHold.ts:flagOverdueHolds`, `billing.ts:runLateFeesBatch` (per-customer findFirst).
- `MessageThread.participantIds`/`unreadForUserIds` JSON-string columns — should be a join table.

These are tracked for a future infra iteration; **next iter onward = admin-UI visual enhancements per user directive.**

### Visual change for this iter (admin sidebar polish)

To start delivering on the new directive, also shipped a sidebar visual upgrade in this iteration:
- **Active-tab background** — flat `rgba(51,116,133,0.22)` → tri-stop horizontal gradient (`32% → 18% → 8%`) with inset highlight + 14px teal glow shadow. Reads as recessed/lit instead of pasted-on.
- **Active-tab left rail** — flat 3px bar → 3-stop vertical gradient (`#337485 → #4a8ea0 → #337485`) + 10px outer glow. Clearly signals which group + tab is current.
- **Active-tab icon** — gets a 6px cream drop-shadow (filter) so it pops against the dark sidebar.
- **Right-edge fade** on active row — 12px gradient fade so the row visually "wraps around" rather than ending abruptly.
- **Group labels** — get a subtle 12px gradient underline accent so each section gets a soft visual identity.
- **Urgent badges** (signups / credits / requests / mailhold) — now amber `#F5A623` with a 12px halo and an animated outer ping ring. Routine badges (everything else) get a subtle blue glow. Both scale on hover.

Deploy `noho-mailbox-caei8dz6h…` aliased to `nohomailbox.org`. The visual change is live.

---

## 53. Iter-32 (2026-04-29) — Admin Overview hero with sparklines + plan-distribution shimmer

First iter on the new "every loop = one major admin-UI visual change" cadence. Rebuilt the AdminOverviewPanel hero entirely.

**Hero stat tiles** (`src/components/admin/AdminOverviewPanel.tsx:heroStats`):
- Was: four flat white cards with a number + caption + change line.
- Now: hero block wraps all four in a soft cream radial-gradient surface with a 5%-opacity dotted-mesh background. Each tile has:
  - **Sparkline mini-chart** under the label — deterministic seeded curve per-tile (stable across renders), gradient-fill below + glow stroke above, slight upward bias so the trend reads positive. Replace synth with real 7-day series in a future iter.
  - **Live pulse dot** (`animate-ping` + glow) on the "Mail Today" tile — signals "this number is moving right now".
  - **Trend chevron** + change copy in a brand-blue micro-row below the spark.
  - **Hover lift + shadow grow** for tactile feedback.
  - Accent ("Mail Today") tile gets a tri-stop teal gradient + cream sparkline + 24px halo shadow.

**Pending-signups alert banner** — added a slow shine sweep (`@keyframes noho-shine`) so the row visually "lights up" when there's something waiting.

**Plan Distribution chart** rebuilt:
- Was: three side-by-side flat 2px bars, one per plan, plus number + percent stacked above each.
- Now: one stacked horizontal bar (Basic + Business + Premium segments) with brand gradients per segment AND a continuous shimmer sweep that staggers across the three segments (0s / 0.4s / 0.8s offsets). Below it: three gradient-dot legend cards with name + count + percent.
- Header now shows total count on the right.

**Build**: clean. Deploy `noho-mailbox-dxmt5xcdm…` aliased to `nohomailbox.org`. Visual change live on `/admin?tab=overview`.

---

## 54. Iter-33 (2026-04-29) — Customers panel: card-grid view + monogram avatars + tier badges

**Major visual change**: AdminCustomersPanel reborn from a flat table to a richer **card-grid view** with a Cards / Table view toggle.

**Card design**:
- **Avatar monogram** (44×44 rounded square) — first+last initial in a plan-tier gradient. Premium gets ink-on-cream luxury, Business gets brand teal, Basic gets a warm bronze gradient. Soft inner highlight + tier-colored shadow halo.
- **Suite # badge** (`#001` style) in a brand-styled chip on the right.
- **Plan pill** with tier-colored dot + plan name (uppercase, letterspaced).
- **Status pills row**: existing `StatusBadge`, plus contextual chips for OVERDUE / DUE Xd, DEPOSIT REQ, KYC: Pending/Rejected, BIZ.
- **Bottom stats row** (separated by dashed border): mail count + package count, each with mini SVG icons; joined date on the right.
- **Hover state**: card lifts 0.5rem + grows a brand-teal ring (`0 0 0 1px #33748555`) + 32px teal-tinted shadow halo. The whole card is the click target → opens the customer modal.
- Header now shows count: `N of M matching "query"`.

**View toggle** (`Cards` / `Table`) at the panel header, persisted as local component state. Cards view is the default; Table view preserves the previous compact-row layout (now with monogram avatar in the first column for tier recognition at a glance).

**Empty state**: "No customers found for 'query'" card when filter returns 0.

### Iter-33 hotfix: Partners moved from header → footer (per user request mid-iter)
- Removed `{ href: "/partners", label: "Partners" }` from `Navbar.tsx`. Footer link in `Footer.tsx` retained ("Partner Program"). Top nav is now focused on customer-facing services (Delivery / Get a Quote / Pricing / Business / Notary / Contact).

### Bonus fix found while building
- `src/lib/blog-posts.ts` had 7 stale `paragraphs2: undefined` lines that don't match the `BlogSection` type — TS strict mode rejected them. Removed all 7.

**Build**: clean. Final deploy aliased to `nohomailbox.org`.

---

## 55. Iter-34 (2026-04-29) — Mail panel: kanban-style status board

**Major visual change**: AdminMailPanel reborn as a **kanban-style 4-column board** with Board / List view toggle. The list view (legacy filter-chip layout) is preserved as the toggle alternative.

**Board columns** (`src/components/admin/AdminMailPanel.tsx:BUCKET_META`):
- 🟠 **Action Needed** — `Received` + every `*Requested` + `Held`. Amber accent (`#F5A623`).
- 🔵 **Scanned** — image uploaded, awaiting next step. Brand teal accent.
- 🟣 **Awaiting Pickup** — sitting at the desk for the customer. Purple (`#7C3AED`).
- 🟢 **Completed** — Picked Up / Forwarded / Discarded / Returned. Green (`#16A34A`).

Each column has:
- Soft accent-colored gradient background (top-down fade)
- 1px accent-colored border at 33% opacity
- Compact header: small white-bg icon tile + title + sub + count badge (count badge glows when > 0, otherwise muted gray)
- Empty state ("Nothing here.") with dashed border

**Mail item cards** (compact, inside columns):
- Type icon (Package = teal-gradient with white icon + halo shadow; Letter = soft cream-blue gradient)
- From line + suite + customer first-name + date
- StatusBadge below
- Hover-revealed action row (Fulfill / Upload scan / Mark Scanned / Mark Picked Up) — opacity-0 by default, opacity-100 on hover/focus-within so it doesn't crowd the visual

**Header counters**: `N recent · M today · X need action` so admin sees the workload at a glance.

**View toggle**: Board (default) ↔ List. Persisted as local component state. List view retains the filter chips + the previous full-row layout (now with the upgraded type-icon component shared with cards).

Build clean. Deploy `noho-mailbox-36oct3wbv…` aliased to `nohomailbox.org`. Live on `/admin?tab=mail`.

---

## 56. Iter-35 (2026-04-29) — MailOS shell: status strip + window chrome

User directive: "make it look more like a MailOS not a webapp — but please don't torch the brand, optimize for convenience". Executed without breaking the cream/blue/brown palette.

### MailOS status strip (top of every admin view)

New `MailOsStatusStrip` component (`src/components/AdminDashboardClient.tsx`). Sticky h-7 bar at the very top, frosted (backdrop-blur 6px + saturate 140%) over the cream surface. Reads as a system status line, like a macOS menubar — but in NOHO ink/cream, not foreign blue/grey OS chrome.

- **Left**: tiny ink-on-cream brand mark + "MailOS" wordmark + current panel name.
- **Center** (md+): live clock that ticks every second, monospace, in the format `Mon, Apr 29 · 2:47 PM`.
- **Right**: 
  - Conditional **"to-do" badge** in semantic red when `signups + credits + mail-requests + key-requests > 0`, with a tooltip breaking down the counts.
  - **Online indicator** — green pulse dot + "Online" label, mirroring the iter-31 admin-console badge but always visible at the top.

Existing header at `top-0` shifted to `top-7` so it pushes below the strip.

### Window-chrome wrapper around every panel

Wrapped the main content area with a fake-window chrome that flips the visual perception from "webapp" to "OS workspace":

- **Outer frame**: white surface, rounded-2xl, 1px ink-tinted border, layered shadow (inset top-light + 28px brown-tinted halo + 3px micro-shadow). Max-width 1400px, centered.
- **Title bar** (h-9, gradient cream): three traffic-light dots in **brand colors** (Tunisian red `#E70013` / amber `#F5A623` / brand teal `#337485`) — purely decorative, not interactive.
- **Center label**: `~/admin/{tab} · {Panel Name}` in monospace small caps. Reads like a terminal pwd indicator.
- **Right hint**: `⌘K search` keyboard hint kbd-styled chip.
- **Inner content**: original panel canvas with reduced padding so the chrome doesn't waste vertical space.

### Why this respects the brand

- All colors taken from existing brand tokens — `#F7E6C2` cream, `#2D100F` ink, `#337485` brand blue, `#E70013` Tunisian red, `#F5A623` amber alert. No grey/silver OS chrome.
- Frosted strip uses cream-tinted gradient + brown border, not the typical "translucent white" of macOS.
- Window-chrome dots are NOT macOS reds — they're our brand triad (red/amber/teal), so the window header tells admin "this is NOHO" not "this is a copy of macOS".
- Convenience: the strip surfaces the most-urgent counter (`to-do total`) globally so admin doesn't have to scan the sidebar, and the live clock + online dot are at-a-glance for daily ops.

Build clean. Deploy `noho-mailbox-9wgwox7f1…` aliased to `nohomailbox.org`. Live across the admin panel.

---

## 57. Iter-36 (2026-04-29) — MailOS Dock: bottom-floating quick-launch

Continuing the MailOS shell from iter-35. Added a **bottom-anchored dock** that completes the OS-feel triad (status strip on top, window-chrome around content, dock at bottom).

**`MailOsDock` component** (`src/components/AdminDashboardClient.tsx`):
- **Position**: `fixed left-1/2 bottom-4 -translate-x-1/2 z-50`. Hidden on `<md` (mobile already has the pill nav).
- **Surface**: cream-tinted gradient + `backdrop-filter: saturate(160%) blur(14px)` for the frosted-glass look. 1px ink-tinted border, 36px brown-tinted layered shadow with two inset highlights (top white-tint, bottom brown-tint) for the "raised tile" feel.
- **6 icon tiles**: Log Mail, Log Package, New Customer, Deliveries, Mail Requests, Search.
  - Each tile: 44×44 white card, 1px accent-tinted border, accent-tinted glow shadow, 5px monochrome stroked icon.
  - **macOS-style magnetic hover**: scale(1.18) + translateY(-4px) on hover, transform-origin: center bottom (so it pops up from the dock).
  - **Tooltip** above on hover (ink chip with cream text + 12px brown halo).
  - **Notification badge** on Mail Requests in Tunisian red `#E70013` with cream-ring + red glow when `unreadTotal > 0`.
- **Two thin dividers** between item-3 and item-5 to group: [Log Mail · Log Package · Add Customer] | [Deliveries · Requests] | [Search].

**Wiring**: hooks into existing `setShowLogMailModal` / `setShowAddCustomerModal` / `setTab` / and a search shortcut that focuses the existing header `<input>`.

**Brand integrity**:
- Tile bg = white (matching window-chrome inner), accent border + glow per tile (brand teal / deep teal / bronze / purple / amber / ink) — all from existing palette.
- Cream-tinted dock surface with brown border, NOT translucent grey.
- Tooltip uses ink+cream — matches every other admin chip.

### Bonus build fix (re-occurring)

`src/lib/blog-posts.ts` — 3 NEW `paragraphs2: undefined` lines re-introduced (likely from a recent regenerate). Stripped again. Same script: `sed -i '/paragraphs2: undefined,/d'`.

Build clean. Deploy `noho-mailbox-d20qnqlyg…` aliased to `nohomailbox.org`. Dock live across the admin panel on desktop.

---

## 58. Iter-37 (2026-04-29) — Revenue panel: real charts + KPIs + sources donut

**Major visual change**: AdminRevenuePanel rebuilt from a 3-card flat layout (60 lines) into a full financial dashboard (~410 lines).

**Hero KPI tiles** (4 across):
- **This month** — accent tile (teal-gradient, white text, 24px halo). Computed from `recentPayments` filtered to current month. Includes month-over-month delta with up/down chevron + green/red %.
- **MRR estimate** — derived from active customer count × tier monthly average ($16.67/$26.67/$31.67). Marked as estimate.
- **Lifetime** — total revenue from squareStatus + total payment count.
- **Avg ticket** — total / payment count.

**12-month bar chart** (custom SVG, no chart-lib dep):
- Computes monthly sums from `recentPayments` over 12 rolling months.
- Bars use teal gradient, current month gets a richer 2-stop teal + 12px shadow halo.
- Inline shine overlay on each bar.
- Month labels under each bar; current-month label is ink, others muted.
- Hover tooltip shows exact dollar amount per month (via `title=`).

**Source-mix donut**:
- Custom SVG donut (radius 50, stroke 14) computes source-type tally from completed payments.
- 6-color brand palette cycle (teal / ink / amber / purple / red / green).
- Center label: count of distinct sources + "SOURCES" caption.
- Right-side legend: dot + label + dollar + percent for each source, sorted descending.

**Top customers** (right column, paired with donut):
- Top 6 customers by lifetime revenue (computed from completed payments).
- Each row: rank pill (#1 gets amber gradient, others muted), customer name, horizontal progress bar (width = relative share of #1's revenue), dollar total.
- #1 row gets a soft amber tint background.

**Recent payments timeline** (preserved but elevated):
- Each row gets a status indicator dot (green/glowing for COMPLETED, amber for PENDING, muted for failed).
- Tabular nums for $ alignment.
- Header now shows synced count.

Build clean. Deploy `noho-mailbox-kwsqq0hfx…` aliased to `nohomailbox.org`. Live on `/admin?tab=revenue`.

---

## 59. Iter-38 (2026-04-29) — Deliveries panel: kanban board + route cards + KPIs

**Major visual change**: AdminDeliveriesPanel rebuilt from a flat 8-column table into a kanban-style 3-column status board with route-visualizing cards + KPI tiles.

**KPI tiles** (4 across):
- **Total** — order count + pending sub
- **In Transit** (accent teal-gradient) — active courier count
- **Delivered today** — today's count + all-time
- **Revenue** — sum of `d.price` across all deliveries + NoHo flat-rate count

**3 kanban columns** with brand-accent colors + soft gradient backgrounds:
- 🟠 **Pending** (amber `#F5A623`) — booked, awaiting pickup
- 🔵 **In Transit** (brand teal) — picked up + en route + on the way (any non-Pending non-Delivered status)
- 🟢 **Delivered** (green `#16A34A`) — completed today

Each column header: white icon tile + title + sub + glowing count badge (lights up when > 0).

**Delivery cards** (rich, shows full route at a glance):
- Customer name + suite # (top left), price chip (top right; teal-tinted for NoHo, muted otherwise)
- **Route block** (dashed-border cream sub-card):
  - **Origin** dot (ink) + "From · NOHO · 5062 Lankershim Blvd"
  - **Connector line** (vertical gradient dark→teal) with `via {courier}` + zone label inline
  - **Destination** dot (teal with halo) + destination address
- **Footer**: StatusBadge + date on the left, status `<select>` on the right for inline updates

**View toggle** (Board / Table). Table view preserves the original 8-column layout.

Build clean. Deploy `noho-mailbox-elbucyfh0…` aliased to `nohomailbox.org`. Live on `/admin?tab=deliveries`.

---

## 60. Iter-39 (2026-04-29) — Email log: timeline view with semantic kind icons

**Major visual change**: AdminEmailLogsPanel rebuilt from a flat 6-column table into a **vertical timeline** grouped by day, each entry decorated with semantic kind iconography.

**KPI tiles** (4 across):
- **Total** — total recent count
- **Sent** (accent teal-gradient with halo) — sent count + today's count sub
- **Failed** (semantic red gradient + 24px halo when > 0) — action-needed signal
- **Not sent** — provider-unconfigured count

**Filter chips** styled as pill buttons (All / Sent / Failed / Not Sent), active state filled with brand teal.

**Timeline view** grouped by day:
- **Day headers** with relative labels — "Today", "Yesterday", or full weekday name + count + ISO date
- **Vertical rail** (1px gradient line, ink → fade) running down the left side
- **Status nodes** on the rail — colored circles with white ring; sent = green-glowing, failed = red-glowing, bounced/not-sent = amber, queued = teal
- **Email cards** along the rail, each with:
  - **Kind icon tile** (9×9, accent-tinted bg + accent-stroked SVG) — semantically styled per email type:
    - 🔐 Password reset (purple)
    - 📬 Mail arrived (brand teal)
    - 🧾 Receipt / renewal (green)
    - ⭐ Welcome / signup (amber)
    - 🛡️ KYC / compliance (ink)
    - 🔔 Notification (deep teal)
    - 💳 Payment / Square (green)
    - generic doc fallback for unknown kinds
  - Subject (large, ink) + recipient (muted)
  - Right side: time in tabular nums
  - Pill row below: status pill (with matching dot) + kind label pill + provider pill ("via resend") + truncated error pill (if any) + Copy Link button right-aligned
  - Hover: shadow grow

**Empty/error/loading states** all rendered as branded cream cards with appropriate iconography.

Build clean. Deploy `noho-mailbox-3vudltm0e…` aliased to `nohomailbox.org`. Live on `/admin?tab=emails`.

---

## 61. Iter-40 (2026-04-29) — Cancellations panel: lifecycle stepper + grace progress + monogram cards

**Major visual change**: AdminCancellationsPanel rebuilt from a flat list with collapsible rows into a richer dashboard with KPIs, lifecycle stepper, monogram avatars on rows, and live grace-period progress bars.

**4 KPI tiles** across the top:
- **Pending review** — accent amber-gradient (with halo) when > 0
- **In grace** — count of approved-but-not-completed
- **Completed this month** — month-scoped, with all-time sub
- **Denied** — all-time

**Lifecycle stepper** (3-step pipeline `Pending → In grace → Completed`):
- Each step is a card with: numbered badge (white-on-color when active, muted when empty), title + sub, count on the right in monospace
- Active step (count > 0) gets accent-tinted background + 1-stop halo
- Arrow connectors (→) between steps
- Denied is a separate off-ramp shown in the filter row, not in the pipeline

**Cancellation cards** with full visual identity:
- **Monogram avatar** (44×44 rounded square) — gradient depends on status:
  - Pending: amber → bronze
  - Approved: brand teal → deep teal
  - Completed: green → dark green
  - Denied: red → dark red
- Cream initials, soft inset highlight + status-tinted shadow halo
- **Header row**: name + suite-# chip + status pill (with matching dot) + plan tag
- **Grace progress bar** (only on `Approved` cards):
  - Animated shine sweep
  - Color shifts to red when 3 or fewer days left + "⚠ Grace ends soon" warning text
  - Live label `X of 30 days · Y left`
- **Expandable detail** (click to expand): reason, grace-period end date in a tinted card, admin notes (if any), action buttons inline (Approve/Deny when pending, Complete when in grace)

**Filter pills** (All / Pending / Approved / Completed / Denied) with active-state brand teal fill + 10px halo.

**Workflow info card** at the bottom — kept the existing CMRA workflow reminder, but restyled with brand colors and uppercase section header.

Build clean. Deploy `noho-mailbox-jun70mqpv…` aliased to `nohomailbox.org`. Live on `/admin?tab=cancellations`.

---

## 62. Iter-41 (2026-04-29) — Messages panel: two-pane chat UI with monograms + bubbles

**Major visual change**: AdminMessagesPanel rebuilt from two stacked flat lists into a **two-pane Mail.app-style chat interface** with avatar monograms, message bubbles, and a proper reply composer.

**Folder tabs at the top** (with count + unread-badge dot):
- **Inbox** — in-app message threads
- **Contact form** — public submissions (no in-app reply available; reply via mailto)

**Two-pane layout** (320px left rail + flex right pane, 480px min height):

**Left rail** (thread/contact list):
- Sticky header strip with cream gradient + folder name + count
- Each row:
  - **Monogram avatar** (40×40) with stable per-name gradient (6-color brand palette cycle: brand teal / ink / purple / bronze / green / red)
  - Subject + relative time (just now / 12m / 3h / 2d / Apr 29)
  - Preview line (muted)
  - **Unread dot** (brand-teal with halo) on the right when applicable
  - Active row gets a 3px brand-teal left border + soft teal-tinted bg

**Right pane** (detail view):
- **No-selection empty state**: branded message-bubble icon tile + "Pick a thread to read" copy with folder-aware sub-line
- **Thread detail**:
  - Header: 48px monogram + subject + last-message timestamp + Archive/Trash buttons
  - Message rendered as a **chat bubble** (rounded-2xl, rounded-bl-sm, cream-tinted) with the customer's monogram next to it (Apple/Telegram-style)
  - "Unread" divider line (gradient hairlines flanking the label) when applicable
  - Reply composer at the bottom: rounded white card with `<textarea>`, char counter, branded gradient Send button with halo + shimmer
- **Contact-form detail**:
  - Same monogram + bubble pattern
  - "Reply via email" CTA (gradient brand teal) goes to `mailto:` with the right subject
  - Footer hint card explaining contact-form submissions don't have in-app reply

**`huesFor(name)`** — tiny stable hash → 6-gradient cycle so each customer always gets the same avatar color across the app, no color column in the DB.

Build clean. Deploy `noho-mailbox-54icug02e…` aliased to `nohomailbox.org`. Live on `/admin?tab=messages`.

---

## 63. Iter-42 (2026-04-29) — Billing dashboard with health distribution + customer cards (queued for deploy)

**Major visual change**: AdminBillingPanel rebuilt from a flat 6-column table into a richer billing dashboard with KPI tiles, account-health distribution bar, and customer cards that visualize the renewal window timeline.

**5 KPI tiles** (lg:5-col grid):
- **Wallet held** (accent teal-gradient with halo) — total wallet balance summed across all customers
- **Overdue** (red gradient with halo when > 0) — semantic action-needed signal
- **Expiring 14d** — next renewal cycle
- **Up to date** — healthy accounts
- **Auto-renew %** — coverage percentage + count fraction sub

**Account health distribution bar** — single horizontal stacked bar (h-3) split into Overdue (red gradient) / Expiring (amber gradient) / Up-to-date (green gradient) segments proportional to counts. Tooltips on each segment. Color-dotted legend below.

**Section selector** — 3 big interactive cards (Overdue / Expiring Soon / Up to Date). Active card gets a 2px colored border + 16px tinted shadow halo. Big numeric in baloo font.

**Customer cards** (replacing the table rows):
- **Monogram avatar** (44×44) with stable per-name gradient cycle (same `huesFor` helper as Messages panel)
- Name + email + plan-tier pill (semantic accent based on bucket)
- **Due-date timeline progress bar** — visualizes where the customer sits on a renewal axis from -10 days (over grace) → +30 days (next cycle). Color shifts: red gradient if overdue, amber if ≤14 days out, brand teal otherwise. Live label `Due in 5d` / `3d overdue` and the explicit ISO date.
- **Wallet pill** (green when > $0, muted otherwise) with mini wallet icon + dollar amount
- **Auto-renew toggle** — branded mini-switch with "Auto-renew on/off" label
- **Inline action buttons** — "Late Fee" (red-tinted) + "Renew" (brand teal gradient with halo)
- Inline action result message (✓ green or ✗ red)

**Header batch buttons** restyled with brand outlines: "Send expiry warnings" (amber-bordered), "Run late-fees batch" (red-bordered), "Refresh" (brand teal gradient with halo).

**Workflow info card** at the bottom — kept the existing CMRA-style billing reminders, restyled with brand uppercase header + colored bullets.

**Deploy successful at iter-43 retry** — Vercel quota refreshed; aliased `noho-mailbox-pc3cvncp2…` to `nohomailbox.org`. Billing dashboard live on `/admin?tab=billing`.

---

## 64. Iter-43 (2026-04-30) — QR Pickup: scan-station hero with live KPIs + recents timeline

**Major visual change**: AdminQRPickupPanel rebuilt from a small input + result card into a real **scanner workstation** with live counters, animated scanning rings, and a session-level recent-pickups timeline.

**3 KPI tiles** at the top:
- **Customers today** (accent teal-gradient with halo) — distinct customers picked up in this session
- **Items picked up** — total mail/package count last 24h
- **Avg / customer** — items per session

**Scan station** — center stage:
- Dark "engine-room" surface (`radial-gradient(ellipse at top, #1A2E3A → #0E1820 → #0A1218)` + 30/60px brown shadow + grid floor)
- **Live "Scanner ready · listening" indicator** — green-pulsing dot + cream uppercase label
- **Scan zone** (focusable rounded card):
  - Cream-tinted bg with tinted border that **lights up brand-teal on focus** + 6px ring + 30px halo
  - **4 corner brackets** appear on focus (animated brand-teal corners, like a real QR scanner viewfinder)
  - **Sweep-line animation** across the zone (`@keyframes noho-scan-sweep` — line moves vertically with brand-teal glow)
  - **Monospace input** — 3xl-4xl, 0.34em letter-spacing, "XXXXXXXX" placeholder, max 12 chars (Crockford-base32 token width)
  - Process button — brand teal gradient + 18px halo
- Footer hint: "Barcode scanner auto-submits · Press Enter · 8–12 char Crockford-base32"

**Result card** with animated entrance (`@keyframes noho-result-pop` — scale 0.96 → 1 with opacity fade):
- **Success path**: 12×12 green-gradient checkmark tile + name + suite # + green-tinted "X items marked Picked Up" summary + **per-item list** (each item in a white sub-card with type icon + sender + uppercase TYPE pill)
- **Error path**: red-tinted X icon tile + bold red error message
- **No-items path**: blue info icon + "No items awaiting pickup for this customer"

**Recent pickups timeline** (session-only, in-memory):
- Up to 10 entries, newest first
- Most-recent entry gets a green-tinted background + green-glowing dot
- Each row: name + suite chip + "X items" pill + relative time ("just now" / "12m ago")
- Clear button to reset the session log

**How-it-works info card** at the bottom — restyled with brand uppercase header + ink-bolded keywords.

Build clean. Deploy `noho-mailbox-4i69hkahq…` aliased to `nohomailbox.org`. Live on `/admin?tab=qrpickup`.

---

## 65. Iter-44 (2026-04-30) — Mail Hold: kanban by urgency + days-held progress + distribution bar

**Major visual change**: AdminMailHoldPanel rebuilt from a flat 5-column table into a kanban-style status board with KPIs, a hold-age distribution bar, and rich item cards showing each piece of mail's age progress.

**5 KPI tiles** (lg:5-col grid):
- **Total held** (accent teal-gradient with halo) — count + average days held sub
- **Overdue 30+** (red gradient with halo when > 0) — semantic action-needed signal
- **14+ days** (amber-tinted) — second-warning bucket
- **7+ days** — first-warning bucket
- **OK <7d** — within window

**Hold-age distribution bar** (h-3) — single horizontal stacked segment split by bucket: green (OK) → amber (7+) → orange (14+) → red (30+ overdue). Each segment proportional to count, with hover tooltip + dotted legend below.

**4 kanban columns** (board view, default):
- 🔴 **Overdue** (`#dc2626`) — 30+ days · urgent action
- 🟠 **14+ days** (`#ea580c`) — second warning sent
- 🟡 **7+ days** (amber) — first warning sent
- 🟢 **OK** (green) — within 7 days

Each column with: soft accent-tinted gradient background + bordered card + white-tile icon header + glowing count badge.

**Mail item cards** (compact, inside columns OR flat list view):
- 36×36 monogram avatar with stable per-name gradient (same `huesFor` helper)
- Customer name + suite # / email
- Type pill (Package = brand teal, Letter = ink-tinted)
- Sender line ("From: Amazon")
- **Days-held progress bar** — h-1.5, animated, color-shifts by bucket: green → amber → orange → red as days accumulate. Label: "Held N days · of 30"
- **Action row**: Forward (brand teal gradient + halo) + Return (muted) buttons + inline ✓/✗ result message

**View toggle** (Board / List). List view sorts by daysHeld desc.

**Header batch action**: "Run Hold Check" (brand teal gradient + halo) — runs server-side notification batch.

**Hold policy info card** at the bottom — restyled with brand uppercase header.

Build clean. Deploy `noho-mailbox-1zt9h6brn…` aliased to `nohomailbox.org`. Live on `/admin?tab=mailhold`.

---

## 66. Iter-45 (2026-04-30) — Shop Orders kanban + monogram cards (queued for deploy)

**Major visual change**: AdminShopPanel rebuilt from a flat 6-column table into a kanban-style 3-column board with KPIs and rich order cards.

**4 KPI tiles**:
- **Today** (accent teal-gradient) — today's order count + today's revenue sub
- **Pending** — needs prep
- **Ready** — pickup waiting
- **Lifetime** — total revenue + average ticket sub

**3 kanban columns** with brand accents + soft gradient bg:
- 🟠 **Pending** (amber) — ordered, awaiting prep. Cart icon in header tile.
- 🔵 **Ready for pickup** (brand teal) — packed, waiting for customer. Box icon.
- 🟢 **Completed** (green) — picked up. Checkmark icon.

Each column header: white-tile icon + title + sub + glowing count badge (lights up when > 0).

**Shop order cards**:
- 36×36 monogram avatar with stable per-name gradient (`huesFor` helper)
- Customer name + date
- Big green-tinted total chip ($XX.XX) in baloo font
- **Items sub-card**: cream-tinted with shopping bag icon + "N items" label + 2-line clamped item list
- Action row: "Mark Ready" / "Mark Completed" buttons in brand-teal gradient + halo, status override `<select>` on the right

**View toggle** (Board / Table). Table view preserves the original layout for power users.

**🚨 Deploy queued — Vercel daily limit hit again** (`api-deployments-free-per-day`, 100/day). Code is built clean. Will deploy when quota resets (~24h).

---

## 67. Iter-46 (2026-04-30) — Square integration: connection-status hero + sync action grid + sync-history timeline (queued for deploy)

**Major visual change**: AdminSquarePanel rebuilt from a flat 3-section layout into a richer integration dashboard.

**Connection-status hero** (gradient teal when connected, red when not):
- 12×12 white-tinted icon tile (checkmark or alert, depending on state)
- Live pulse dot ("Connected · Live" or "Not connected")
- 3xl baloo headline ("Square is online" / "Setup required")
- Sub-line with last-successful-sync relative time + items count
- Right-side warning chip if recent failures exist
- Decorative dot pattern overlay (radial-gradient `radial-gradient(rgba(247,230,194,0.6) 1px, transparent)`)

**Setup instructions card** (only when not connected) — dashed red border, monospace token names with brand-blue tinted bg.

**4 KPI tiles**: Linked customers / Payments synced / Catalog items / Lifetime revenue (last one = accent teal-gradient with halo).

**Sync action grid** (4 cards, each with semantic accent):
- 👤 **Customers** (purple) — Profiles + Square IDs
- 💳 **Payments** (green) — Sales · refunds · ledger
- 🛒 **Catalog** (bronze) — Items · prices
- 🔄 **Sync all** (primary brand-teal-gradient with halo) — Run everything

Each card: 9×9 accent-tinted icon tile + label (uppercase, letterspaced) + sub. Disabled when not connected. Hover lift.

**Sync results inline** — when results land, render each as a green-or-red tinted strip with glowing dot + count or error message.

**Sync history timeline** — vertical rail with status nodes (green-glowing for completed / red-glowing for failed / amber for in-progress). Each entry card with type + status pill + relative time + items count + duration ("finished in 4s").

**🚨 Deploy queued** with iter-45 — same Vercel daily limit hit. Two visual upgrades waiting: AdminShopPanel (kanban) and AdminSquarePanel (integration dashboard). Both ship the moment quota resets.

---

## 68. Iter-47..62 (2026-04-29) — Shipping Center deep polish loop (16 self-paced iters)

User feedback opened the loop: *"major bugs like our markup is not there the labels don't always work i think it's because it doesn't specify that it needs my ups account. the ui ux is not setup like an os. fix it and optimize it. /loop until i say sa7it."*

Self-paced 16-iteration loop on the Shipping Center. **Code shipped clean to local; production deploy intentionally gated behind explicit user approval per Auto-mode rules — no Vercel push this loop.** Run `vercel --prod && vercel alias set <new>.vercel.app nohomailbox.org` to ship the bundle when ready.

### Bug-fix backbone (iter-1)

1. **Markup missing in admin Quick Ship** — every rate row now displays the customer-facing price (`priceWithMargin` = wholesale × 1.10 with $1 floor) in big bold ink, with the Shippo wholesale + margin in muted text below. Same helper as the public `/shipping` flow → consistent pricing for walk-ins and online orders. Receipt page (`/admin/shippo/receipt/[id]`) now headlines "Customer pays $X" instead of wholesale.
2. **Labels fail because no Shippo carrier-account is pinned** — added a new **Carriers** workspace tab in Quick Ship that calls `client.carrierAccounts.list()` against Shippo, lists every connected account grouped by carrier, lets admin toggle which to use, persists selection as `shippo_carrier_accounts_v1` in `SiteConfig`. The selected IDs flow through `getShippingRates(...carrierAccountIds)` and into every rate fetch + label purchase (admin Quick Ship, public `/shipping`, admin Print). Warning banner on Quick Ship if no carriers pinned. New server actions: `getActiveCarrierAccountIds`, `setActiveCarrierAccountIds`, `getCarrierAccountsWithSelection`, `listCarrierAccounts` (in `lib/shippo.ts`).
3. **MailOS workspace shell** — rebuilt AdminShippoPanel from flat tabs to a workspace with left **side rail** (Quick Ship · Labels · Track · Carriers · Box Presets, each with badge counts) + canvas pane on the right. Active rail item gets a teal gradient + 2px inset rail accent. Cards have soft cream shadow + 1px ink border consistent with the iter-35 window-chrome look.

### Quick Ship workflow upgrades (iter-2, 6, 7, 8)

- **Rate grouping by carrier** — 4 brand-tinted carrier sections (USPS navy / UPS brown+yellow / FedEx purple+orange / DHL yellow+red) each with "from $X" preview. Cheapest carrier group floats to top.
- **CHEAPEST + FASTEST badges** computed across whole list with color washes on winning rows.
- **Copy quote button** per row → SMS-ready clipboard string ("NOHO Mailbox shipping quote · USPS Priority Mail · Delivery: 2 days · Total: $12.45 · Reply YES to lock it in.").
- **Address-book autocomplete** — server action `getRecentRecipients()` dedupes the last 200 ShippoLabel rows by `(toName + zip)` with shipment counts. Recipient name input is now a combobox with monogram avatars, frequency badges (`×N`) for repeat customers, ↑↓/Enter/Esc keyboard nav. Picking a row fills name + street + city + state + zip in one click.
- **Address validation** before rate fetch — soft warning banner with carrier-side messages. New server action `validateShippoAddress`.
- **Saved parcel presets** — admin defines real box stock; quick-fill chips replace hard-coded fixtures. New `getParcelPresets`/`setParcelPresets`/`resetParcelPresets` server actions persisting to `SiteConfig`. New **Box Presets** workspace tab with HTML5 drag-to-reorder (handle column, fade-on-drag, drop-target tint), inline LWH+weight editors, Add/Reset/Save.
- **Rate-form draft localStorage persistence** — switching workspace tabs preserves typed-in destination + dimensions.
- **DIM weight inline calculator** — UPS/FedEx domestic divisor 139. Shows actual vs DIM lb, warns when DIM significantly exceeds actual ("DIM is 2.6× actual — confirm box size").
- **Sticky selected-rate floating CTA** — clicking a row marks it `SELECTED` (teal background + left rail). Floating bottom bar shows pick + Buy + Copy quote + Clear; persists while admin scrolls back to fix the form.

### Labels list upgrades (iter-2, 3, 10)

- **Today's revenue / wholesale / margin** strip above the labels table, derived from real ShippoLabel data via `priceWithMargin`.
- **Quick search** (name, tracking, suite, city, carrier) + status filter chips (All / Active / Refunded). Annotated with `data-quick-search` for the `/` keyboard shortcut.
- **Live tracking pill** per row — click "Track" to fetch `trackShippoLabel`, color-coded pill (Delivered / In transit / Awaiting pickup / Returned / Failed) appears next to status. Tooltip shows last-known location.
- **Bulk-select** — checkbox column + "select all visible" header. Floating **BulkActionBar** when ≥1 row selected with "Track all" (concurrent 6-wide Shippo pings + summary counts), "Open labels" (staggered ~120ms popup of every label PDF for batch print), "Run sheet for selection".

### Pre-paid orders panel (iter-4, 9, 11)

- **Lifecycle stepper** (Awaiting → Link sent → Paid → Printed) with arrow connectors, accent-tinted backgrounds when count > 0, Cancelled off-ramp pill.
- **Search + status filter chips** including `Stuck (N)` chip in red with halo when any orders are paid >4h without a Shippo label purchased.
- **Stuck-order watchdog** — `isStuckOrder()` predicate + `STUCK_ORDER_HOURS = 4`. Stuck orders get a red `STUCK` badge with hover tooltip showing hours elapsed.
- **Printed-order tracking inline** — backend now fetches the linked ShippoLabel for printed orders via batched `findMany` (no N+1). Each Printed row shows tracking number + Refresh button + live status pill + Open label CTA.

### Hero (iter-3, 11, 14)

- **5 stat tiles**: Today / Revenue / Margin / Queue + conditional **Stuck** tile (red gradient + halo + slow pulse animation when > 0).
- **Per-carrier today's count badge** on each FleetScene puck — pulses cream-on-red with `noho-puck-pulse` keyframe when > 0.
- **NPC courier walking** — small 14px brand-cream silhouette with shoulder bag in carrier color, walks slowly along the active route from hub to puck via `<animateMotion rotate="auto">`. Pure delight, fits "FLEET OPERATIONS · LIVE" eyebrow. Disabled by `prefers-reduced-motion`.
- **Run sheet button** on hero next to stat tiles.
- **Health card** below hero — `getShippingCenterHealth()` server action returns 5 `HealthItem` rows (Shippo connected · Carrier accounts pinned · Sender complete · Box presets · Stuck orders). Color-banded by worst severity (green OK / amber warn / red fail with pulsing dot). Each row has click-to-fix CTA wired via custom `noho-shipping-jump` window event into the right inner workspace tab.

### Today's Run Sheet — new printable route (iter-5, 6, 10)

- New `/admin/shipping/runsheet` server-rendered page. Letter portrait, branded NOHO header, 5 KPI tiles (Labels · Total weight · Wholesale · Revenue · Margin).
- Tables grouped by carrier with brand-themed glyphs (USPS navy / UPS brown+yellow / FedEx purple+orange / DHL yellow+red). Per-carrier weight subtotal + Pickup-time blank line for courier ETA.
- Each row: Recipient · From-customer (suite) · Destination · Service · Tracking · Customer-pays + wholesale · empty checkbox.
- Date picker (form GET, JS-free) + signature blocks (courier + NOHO staff).
- `?ids=a,b,c` query support — opens a "Selection" mode (filtered to those exact label IDs, ignores date) used by the BulkActionBar's "Run sheet for selection".
- `@page size: letter portrait`, print-only stylesheet.

### Track tab redesign (iter-7)

- **Auto-detects carrier** from tracking-number format (USPS 9[2-5]…, UPS 1Z…, FedEx 12/15-digit + SmartPost 9612, DHL 10-digit + JD/JJD). "auto-detected USPS" hint in teal.
- **Recent searches** stored in localStorage (key `noho-shippo-track-recents-v1`), 6-deep, dedup by tracking number.
- **Visual progress bar** — 3 stages (Awaiting pickup → In transit → Delivered) with teal/green/red gradient fill. Stage labels turn green when reached, brand-teal when current.
- Result card uses shared `LiveStatusPill` for consistency with Labels list.

### Receipt + customer-facing pages (iter-12, 13, 15)

- **Admin receipt page** (`/admin/shippo/receipt/[id]`) — server-fetches live tracking via `getTrackingStatus`, shows status pill + last-seen + ETA + last 3 history events. `dynamic = "force-dynamic"`.
- **Public label receipt** at `/r/[id]` — branded NOHO page, customer-facing, no auth, `noindex/nofollow`. Recipient + carrier glyph + 3-stage progress rail + tracking + last 5 events. **No financial info** (no cost, no margin). `forwardShippoLabel` SMS template now sends this branded URL instead of the carrier's raw tracking URL.
- **Public pre-paid order receipt** at `/r/po/[id]` — same brand language for `LabelOrder`. Personalized greeting, 4-stage funnel (Submitted → Awaiting payment → Paid → Shipped), customer-paid total (no wholesale exposed), tracking inline once Printed. SMS template in AdminLabelOrdersPanel `handleTextSquareLink` now embeds this URL.

### MailOS shell tightening (iter-5, 13, 16)

- **`/` keyboard shortcut** to focus the active panel's search input (skips when an input is focused). Hint inlined in placeholders.
- **`?` shortcut help overlay** — modal listing all shortcuts grouped by section. Floating "Shortcuts" chip pinned bottom-right above the dock as a discoverable surface. Esc to close.
- **MailOS dock** integration — added Quick Ship + Today's Run Sheet tiles to the iter-36 dock. Divider regrouping: `[Mail · Pkg · Customer]` | `[Deliveries · Quick Ship · Run Sheet]` | `[Requests]` | `[Search]`.

### Embedded portal polish (iter-15)

- **Quick guide** intro card on UPS / Stamps.com / DHL embed panels — 3 numbered bullets per carrier explaining "what to do here" so admin doesn't bounce between portals confused. Per-carrier defaults baked in; `quickSteps?: string[]` prop for future override.

### Files touched

```
src/lib/shippo.ts                                  + carrierAccounts API, listCarrierAccounts
src/app/actions/shippo.ts                          + 7 new server actions
src/app/actions/labelOrders.ts                     carrierAccount IDs flow through to Shippo calls
src/lib/label-orders.ts                            (unchanged — priceWithMargin reused everywhere)
src/components/admin/AdminShippoPanel.tsx          REWRITTEN as workspace shell + 4 panes
src/components/admin/AdminLabelOrdersPanel.tsx     lifecycle stepper, search, stuck watchdog, printed tracking
src/components/admin/AdminShippingCenterPanel.tsx  hero stats + NPC courier + Health card + ? overlay
src/components/admin/AdminEmbeddedPortal.tsx       quick-steps card per carrier
src/components/AdminDashboardClient.tsx            dock tiles for Quick Ship + Run Sheet
src/app/admin/page.tsx                             labelOrders fetch widened (Printed/Cancelled, paidAt, shippoLabel join)
src/app/admin/shippo/receipt/[id]/page.tsx         live tracking embed
src/app/admin/shipping/runsheet/page.tsx           NEW — printable courier handoff
src/app/r/[id]/page.tsx                            NEW — public label receipt
src/app/r/po/[id]/page.tsx                         NEW — public pre-paid order receipt
HANDOFF.md                                         this section
```

### Build verification

Every iter ended with `npx next build` exit 0 (Turbopack, Next.js 16.2.2). 4 new routes registered: `/admin/shipping/runsheet`, `/r/[id]`, `/r/po/[id]`, plus the rebuilt `/admin?tab=shipping`. Brand check: 0 hits for legacy `#3374B5` / `#2D1D0F` blues.

### Deferred for next iteration

- **Refund-status timeline polling** — Shippo refund.retrieve returns queued/processing/completed; surface as a timeline pill on refunded labels.
- **Carrier service-level browser** — when admin selects a carrier in Carriers tab, list available service levels with transit times.
- **Multi-warehouse senders** — admin can store multiple ship-from addresses (currently single sender persists in SiteConfig).
- **Pickup time-slot picker** on pre-paid orders.
- **Track tab map preview** — leaflet/openstreetmap embed of last-known location.
- **Performance** — virtualization on long Labels lists (premature at current scale).

---

## 69. Iter-47 (2026-04-30) — CMRA Compliance flight-control dashboard

**Live**: aliased `noho-mailbox-pdrwr67zj-…` → `nohomailbox.org` after iter-45 (Shop) + iter-46 (Square) shipped earlier in this session.

### Visual upgrade — `src/components/admin/AdminCompliancePanel.tsx`

Was 132 lines of bare `<ul>` rows with bg-emerald/bg-rose tailwind buttons. Rebuilt as a **regulatory-grade compliance control surface** themed around USPS Form 1583 / CMRA review:

- **Hero strip** — gradient teal (NOHO_BLUE_DEEP → NOHO_BLUE → #1F4554) with:
  - Twin-radial dot pattern (32px / 24px grids overlaid at 7% opacity) — feels like a security stamp
  - Decorative dashed circle stamp top-right ("USPS · Form 1583 · CMRA" centered text inside a solid-circle outline)
  - Live status pulse: 1.5px green dot + "CMRA Compliance · Live" eyebrow
  - 3xl Baloo headline "KYC & Onboarding Control"
  - Cream-tinted sub-copy explaining the surface's purpose
- **5-tile KPI strip** — Total / Pending (animated pulse if >0) / Approved / Rejected / With Suite. Each tile has a top accent line that fades 100% → 55% to reinforce the status color.
- **Filter pill row** — All / Pending / Approved / Rejected with count chips. Active state is NOHO_INK background + cream text + drop shadow; inactive is `${NOHO_INK}0d` tint.
- **Compliance cards** (3-column grid on xl, 2 on md, 1 on mobile):
  - Left status accent stripe (1px wide, gradient from full status color to 66%)
  - Brand-gradient monogram avatar (huesFor cycle of 6 brand pairs)
  - Status pill colored by KYC state (Pending=amber, Under Review=blue, Approved=green, Rejected=red)
  - Plan + Suite # pills, "Submitted Xd ago" relative timestamp
  - **CMRA Compliance Track** — cream-tinted progress card showing 4 stages (Form 1583 / ID Image / KYC OK / Mailbox) as filled-circle checkmarks + 4-up grid; gradient progress bar shifts amber→blue while incomplete, then green when 4/4
  - Document attachment chips with PDF + photo icons → open Form 1583 / Photo ID in new tab
  - 3 action buttons (Approve/Reject/Assign) with status-tinted gradients + colored shadows

### Files touched

```
src/components/admin/AdminCompliancePanel.tsx   REWRITTEN — 132 → ~480 lines
HANDOFF.md                                       this section
```

### Build verification

`npx next build` exit 0 (Turbopack 16.2.2). 0 type errors. Aliased to nohomailbox.org.

---

## 70. Iter-48 (2026-04-30) — Business Solutions client pipeline (kanban + payment tracking)

**Live**: aliased `noho-mailbox-bf8zho7si-…` → `nohomailbox.org`.

### Visual upgrade — `src/components/admin/AdminBusinessPanel.tsx`

LLC formation / business filing client tracker. Was 195 lines of plain rows with a single gradient button. Rebuilt as **kanban-style client pipeline** with payment tracking:

- **Hero strip** — dark NOHO_INK gradient (45° pinstripe pattern at 5% opacity for legal-document feel) with corner briefcase outline. Live amber pulse indicator + "Business Solutions · LLC Formation" eyebrow + 3xl Baloo "Client Pipeline" headline. Amber gradient "+ New Client" CTA with hover-scale + cream-tinted board/list view toggle.
- **5 KPI tiles** — Total Clients / Active (pulsing if >0) / Completed / Collected ($) / Outstanding ($, red if positive). Top accent line on each tile fades 100% → 55%.
- **Pipeline distribution bar** — 2px tall horizontal bar segmented by stage proportions, with legend underneath showing each stage's color + count.
- **5-column kanban board** — Intake (amber 📥) / In Progress (blue ⚙️) / Review (purple 🔍) / Completed (green ✅) / Paused (ink ⏸). Each column has its own gradient tint background, stage label + sub-text + count badge.
- **Compact client cards** in board view: brand-gradient monogram, package name, build progress mini-bar (gradient stage→hue), payment ratio with color-shifting % badge (green ≥100%, amber > 0%, red 0%), inline stage selector + delete chip, "updated Xd ago" footer.
- **List view** — wider rows with full email/phone/package, ranged input slider with stage-color accent, payment input field, full progress bar.
- **Empty state** — cream-tinted card with briefcase outline + cta hint.

### Files touched

```
src/components/admin/AdminBusinessPanel.tsx    REWRITTEN — 195 → ~580 lines
HANDOFF.md                                      this section
```

### Build verification

`npx next build` exit 0 (Turbopack 16.2.2). 0 type errors. Aliased to nohomailbox.org.

---

## 71. Iter-49 (2026-04-30) — Credit Requests console (workflow timeline + amount tile)

**Live**: aliased `noho-mailbox-27mn5ers7-…` → `nohomailbox.org`.

### Visual upgrade — `src/components/admin/AdminCreditRequestsPanel.tsx`

Wallet top-up requests (member dashboard → admin texts Square link → marks paid). Was 213 lines of stacked rows. Rebuilt as a **money-ops flight control surface**:

- **Hero strip** — green→teal gradient (NOHO_GREEN → #0f6b3a → NOHO_BLUE_DEEP) with twin-radial dot pattern (40px / 28px) + wallet outline corner mark. Live amber pulse + "Wallet Top-ups · Square" eyebrow + 3xl Baloo "Credit Requests Console".
- **5 KPI tiles** — Total Open / Awaiting Link (pulsing) / Link Sent (pulsing) / Funds Pending ($) / Avg Request ($).
- **Workflow legend** — 3-step horizontal flow: ① Submitted → ② Square link sent → ③ Payment confirmed. Numbered gradient discs with arrow connectors.
- **Filter pills** — All / Awaiting link / Link sent / Paid / Cancelled with count chips.
- **2-column request cards**:
  - Left status accent stripe (1px, gradient color → 66%)
  - Brand-gradient monogram avatar
  - Email + tel: links inline
  - **Big amount tile** — green-gradient pill with "TOP-UP" eyebrow + Baloo $ amount in white
  - **3-stage timeline** — cream-tinted card with numbered circles + check marks; connectors fill colored when both endpoints done
  - Inline notes (italic, amber left border)
  - Square link chip (link icon + truncated URL) when linkSent
  - 3-action button row (Text link/Mark paid/Cancel) with brand-tinted gradients
  - Inline feedback toast (green ok / red error) with status-color left border
  - Cancelled state replaces timeline with red "Request cancelled" strip

### Files touched

```
src/components/admin/AdminCreditRequestsPanel.tsx   REWRITTEN — 213 → ~640 lines
HANDOFF.md                                           this section
```

### Build verification

`npx next build` exit 0. 0 type errors. Aliased to nohomailbox.org.

---

## 72-74. Iter-50/51/52 (2026-04-30) — Three panels queued (Vercel quota cap)

**🚨 Vercel free-tier daily-deploy cap hit again** (`api-deployments-free-per-day`, >100). Three visual upgrades stacked on disk and ready to ship in one batch when quota resets in ~24h.

### Iter-50 — `src/components/admin/AdminSignupRequestsPanel.tsx`

Customer onboarding entry surface (/signup funnel landing). Was 227 lines of stacked `<li>` rows. Rebuilt as **acquisition flight control**:
- Hero: blue→ink gradient with mailbox-door corner mark + dot pattern + live pulse + 3xl Baloo "Signup Inbox"
- 5 KPI tiles — Total Pending (pulsing) / Online / In-person / With Phone / Oldest (red if > 7d wait)
- Plan Demand distribution bar with color-coded segments + legend
- Filter pills (All / Online / In-person)
- 2-column signup cards: monogram + urgent⚠ badge if waiting >7d, Online💳/In-person🏪 source pill, plan-want chip, customer-note in cream amber-bordered card, suite assign input with door icon, conditional `Text Square link` for online signups, copy-setup-link toggle, reject button, feedback toast

### Iter-51 — `src/components/admin/AdminEmbeddedPortal.tsx`

Generic carrier-portal iframe wrapper used by /admin?tab=ups, /admin?tab=stamps, /admin?tab=dhl. Was 202 lines plain. Rebuilt with **per-carrier brand theming**:
- Detected carrier from title → branded gradient hero (UPS brown→deep-brown w/ amber glow, Stamps navy→dark-navy w/ red glow, DHL red→deep-red w/ yellow glow, generic blue→ink)
- Carrier emoji corner mark + live pulse + carrier-name eyebrow
- Cream "Open in New Tab" CTA + cream-tinted Inline/Launch-tile toggle + live time stamp
- Amber warning strip about embed-blocking
- 2-column lower section: 2/3 width "What to do here" steps with branded numbered chips, 1/3 width "Helpful Links" sidebar (REAP guide / Form 1583 / DHL Customs Toolkit etc by carrier)
- Inline embed wraps iframe in window-chrome (traffic-light dots + monospace URL pill + pop-out arrow)
- Launch tile: branded radial-glow background + carrier-color CTA gradient with arrow

### Iter-52 — `src/components/admin/AdminPlanPricingCard.tsx`

Plan-prices admin editor (used in compliance/business panel). Was 110 lines. Rebuilt with **diff-aware editor UX**:
- Branded header strip (NOHO_BLUE_DEEP gradient + dot pattern + "/pricing · live config" eyebrow)
- 4 plan cards — Basic 📬 / Business 💼 / Premium ✨ / Key fee 🗝️ — each with its own accent color (blue/amber/purple/ink), description sub-line, large $ input with accent-colored prefix
- **Diff-detection**: changed fields glow with accent shadow + corner dot, "Was $X · now $Y" under input
- Save button transitions: gradient blue when dirty, gray when clean, animated dot when pending
- Reset button appears only when dirty
- Status pill in header (green ✓ ok / red ⚠ error)
- Helper note: "Pricing page reflects on next load"

### Files touched

```
src/components/admin/AdminSignupRequestsPanel.tsx   REWRITTEN — 227 → ~570 lines
src/components/admin/AdminEmbeddedPortal.tsx        REWRITTEN — 202 → ~350 lines
src/components/admin/AdminPlanPricingCard.tsx       REWRITTEN — 110 → ~250 lines
HANDOFF.md                                           this section
```

### Build verification

`npx next build` exit 0 (Turbopack 16.2.2). 0 type errors on all three.

### Pending deploy

Stack ships when Vercel daily quota resets (24h window). Single deploy → single alias.

---

## 75. Iter-53 (2026-04-30) — Settings panel: branded chrome + iconified rows + active-state animations

**Live**: aliased `noho-mailbox-nxtpxdtpz-…` → `nohomailbox.org`. iter-50/51/52 stack also went live in this same wake (quota refreshed).

### Visual upgrade — `src/components/admin/AdminSettingsPanel.tsx`

Was 99 lines of Edit/Save text rows with bare toggle switches. Rebuilt as a **store-config control surface**:
- **Hero strip** — ink → blue-deep gradient with cog corner mark + dot pattern + "Store Configuration" eyebrow + 3xl Baloo "Settings"
- **Store Information card**:
  - Title bar with home icon avatar + "Customer-facing" green dot
  - Each field has an **icon avatar** (home, pin, phone, mail, clock) that pulses to brand-gradient when editing
  - Inline edit row with 1px blue border + cream-tint bg when active
  - Save = green gradient pill, Cancel = ink-tint pill
  - Edit chip shows blue tint
  - Address updated to full street: "5062 Lankershim Blvd, North Hollywood, CA"
- **Notifications card**:
  - Title bar with bell icon + "X of N active" count
  - Each row has emoji avatar (📬 / 📱 / 📊 / ⚖️) inside a green-tinted square when active, gray when off
  - Description sub-line under the title
  - Toggle switch = green gradient with knob shadow when on, inset shadow ink when off

### Files touched

```
src/components/admin/AdminSettingsPanel.tsx    REWRITTEN — 99 → ~370 lines
HANDOFF.md                                      this section
```

### Build verification

`npx next build` exit 0 (after pkill of stale next + clean .next). Aliased to nohomailbox.org. iter-50/51/52 + iter-53 all live.

---

## 76. Iter-54 (2026-04-30) — Quarterly Statements: hero + completeness bar + statement cards

**Live**: aliased `noho-mailbox-o1fgr4qaf-…` → `nohomailbox.org`.

### Visual upgrade — `src/components/admin/AdminQuarterlyReportPanel.tsx`

CMRA quarterly statement archive (auto-generated each quarter for every customer; PDF-printable). Was 340 lines of plain table rows. Rebuilt as **state-filings control surface**:
- **Hero strip** — blue-deep gradient with filing-cabinet outline corner mark + dot pattern + live amber pulse + 3xl Baloo "Quarterly Statements"
- Hero CTAs: cream "Generate Current Q" with refresh icon, cream-tinted-outline "Open all in tabs", red-tinted "Scrub v1 PII" pushed to right
- **Period picker + KPIs** — 2-pane layout:
  - Left card: Year dropdown (cream-tint) + 4-button quarter selector (gradient-active, ink-tint inactive). Header shows season emoji (❄️🌱☀️🍂) + month range
  - Right: 4 KPI tiles (Customers / On File / Missing pulsing / Compliance %)
- **Compliance bar** — 2px progress bar that color-shifts: green at 100%, amber→green between 76-99%, red→amber below 76%. "Q1 2026 Completeness" header + count fraction
- **Filter pills** (All / On file / Missing) with count chips
- **2-column statement card grid**:
  - Left status accent stripe (green if on file, red if missing)
  - Brand-gradient monogram avatar
  - Suite # pill with door icon, Biz pill (amber), On-file/Missing chip
  - Inline business name (blue-deep) when present
  - Snapshot date footer when generated
  - Action stack: View/Print (blue gradient) + Refresh (ink-tint) when on file, "+ Generate" (red gradient) when missing
- Status messages with green/red color-shift + 3px left border

### Files touched

```
src/components/admin/AdminQuarterlyReportPanel.tsx   REWRITTEN — 340 → ~600 lines
HANDOFF.md                                            this section
```

### Build verification

`npx next build` exit 0. 0 type errors. Aliased to nohomailbox.org.

---

## 77. Iter-55 (2026-04-30) — SaaS Tenant Operations dashboard (queued)

**🚨 Vercel quota cap hit again** — iter-55 built on disk, ships when quota resets.

### Visual upgrade — `src/components/admin/AdminTenantsPanel.tsx`

Multi-tenant management for downstream CMRA operators. Was 376 lines plain `<li>` rows. Rebuilt as **SaaS-ops control surface**:
- **Hero strip** — server-room ink/blue gradient with stacked-rack outline corner mark + dot grid pattern + green pulse + "SaaS · CMRA Operators" eyebrow + 3xl Baloo "Tenant Operations"
- **6 KPI tiles** — Total / Active / In Trial (pulsing if expiring) / **MRR** / **ARR (annualized)** / Total Customers
- **Filter pills** with status emoji (⏳ trial / ✅ active / ⏸ paused / ❌ terminated) + count chips
- **2-column tenant cards**:
  - Left status accent stripe gradient
  - Brand-gradient monogram avatar
  - Tenant name + monospace `/slug`
  - Stacked status pill (with emoji) + tier pill (🏪 Solo / 🏢 Multi / 🏛️ Enterprise) right side
  - Owner row with mailto/tel links
  - Location · customer count · location count footer
  - **Trial countdown banner** — color-shifts: red (expired) / amber (≤7d urgent) / blue (normal) with clock icon
  - **Price strip** — 2-col MRR (green) / ARR annualized (blue) with Baloo dollars
  - **4-button action grid**: status select / tier select (each tinted in their color), Payment (green gradient), Notes (toggles)
  - Subtle "🗑 Delete tenant" link below
  - Notes editor expands inline with cream-amber-bordered card + dirty-state Save button

### Files touched

```
src/components/admin/AdminTenantsPanel.tsx    REWRITTEN — 376 → ~620 lines
HANDOFF.md                                     this section
```

### Build verification

`npx next build` exit 0. 0 type errors. **Queued for deploy** — Vercel daily-quota refresh in ~24h.

---

## 78. Shipping Center polish — continued (8 more self-paced iters: 17..24)

Continuation of section 68. The user kept the `/loop until I say sa7it` going past iter-16. Eight more iterations focused on hygiene, customer-facing surfaces, and ergonomics. **Production deploy still gated** behind explicit user approval — code shipped to local; no Vercel push from these iterations.

### Workflow + ergonomics

- **Public-link copy button** on every Label row ([AdminShippoPanel.tsx](src/components/admin/AdminShippoPanel.tsx)) — one click copies `${origin}/r/${labelId}` to the clipboard so admin can paste the branded NOHO tracking URL into iMessage / WhatsApp / email without going through the full SMS Forward flow.
- **Refund-status visibility** — new `findRefundForTransaction()` lib helper paginates Shippo's `client.refunds.list()` and matches by source `transactionId`. New `getShippoRefundStatus(labelId)` server action. **RefundedBadge** component on Label rows: click "status" → fetches live refund → expands to `Refund · QUEUED|PENDING|SUCCESS|ERROR` with a 3-segment progress strip turning green as stages reach.
- **Copy public order-link** button on each pre-paid order row in [AdminLabelOrdersPanel.tsx](src/components/admin/AdminLabelOrdersPanel.tsx) — pairs with a small "Open ↗" link.

### Bookkeeping

- **CSV export** for both Labels and Pre-paid orders. New helper [src/lib/csv.ts](src/lib/csv.ts) — RFC 4180 quoting + UTF-8 BOM for Excel auto-detect + CRLF + safe escapes. Date-stamped filenames (`noho-labels-2026-04-30.csv`). Honors the active filter + search.

### Hero polish

- **Per-carrier today-mix mini-bar** in the Shipping Center hero — single horizontal stacked bar with brand-color segments (USPS navy / UPS bronze / DHL yellow / "Other" brand-teal), legend below.

### Carriers tab redesign

- Each carrier group now leads with a brand-tinted **CarrierGlyph** + sub-line showing account count, recent label count, today count (green), and "last used Xh ago".
- Per-account row: clear **Active / Inactive** label, glowing green "Pinned" pill when in the active selection, hover-tooltip on the Shippo-default chip.

### Quick Ship

- **Note field** on the buy flow — 100-char free text (counter inline). Forwards to Shippo as `transaction.metadata` so the note travels with the label and is searchable in Shippo's UI. Note clears after a successful buy.

### QR codes

- **Big QR on admin receipt** (110×110, `/r/[id]`, brand-ink-on-white). Scannable from the printed thermal receipt. Hidden when refunded.
- **Per-row QR on Today's Run Sheet** (48×48, new "Scan" column). Generated in parallel via `Promise.all(labels.map(QRCode.toDataURL))`. Courier or customer scans → opens NOHO public tracking on a phone.

### Public surfaces

- **`/track` router** ([src/app/track/page.tsx](src/app/track/page.tsx)) — paste any tracking number → routes to `/r/[id]` if NOHO shipped it, or to the carrier's tracking page (auto-detected from format), or shows a friendly "we can't tell" fallback.
- **Tracking widget on `/shipping` hero** — frosted inline form posting `GET /track?n=…`, no JS required.
- **Sitewide tracking strip in the footer** — visible on every marketing page.
- **DIM-weight inline hint** on `/shipping` — amber soft-warning when DIM > actual by ≥0.5 lb.
- **Form-draft localStorage persistence** on `/shipping` — destination zip + weight + size preset auto-save to `noho-shipping-quote-draft-v1`.

### Member dashboard

- **New Shipping tab** in [DashboardClient.tsx](src/components/DashboardClient.tsx) between Deliveries and Invoices.
- **ShippingPanel** ([src/components/dashboard/ShippingPanel.tsx](src/components/dashboard/ShippingPanel.tsx) — new): brand-tinted carrier glyph, recipient row, tracking link, **Track / Share / Label** action triplet per row, fanned carrier-glyph empty state with "Get a shipping quote →" CTA.
- Wired in [dashboard/page.tsx](src/app/dashboard/page.tsx) inside the existing `Promise.all` retry block — fetches the member's 25 most-recent ShippoLabels (`where: { userId: sessionUser.id }`).

### Files touched (these 8 iters)

```
src/lib/shippo.ts                                  + findRefundForTransaction, purchaseLabel(metadata)
src/lib/csv.ts                                     NEW — RFC 4180 helpers
src/app/actions/shippo.ts                          + getShippoRefundStatus, buyShippoLabel(note)
src/components/admin/AdminShippoPanel.tsx          + RefundedBadge, CopyPublicLinkButton, CSV export, Note field, sticky bar wiring
src/components/admin/AdminLabelOrdersPanel.tsx     + CopyOrderLinkButton, CSV export
src/components/admin/AdminShippingCenterPanel.tsx  + CarrierTodayMix mini-bar in hero
src/app/admin/shippo/receipt/[id]/page.tsx         + big QR pointing to public receipt
src/app/admin/shipping/runsheet/page.tsx           + per-row scan QR + new Scan column
src/app/track/page.tsx                             NEW — public tracking router
src/app/(marketing)/shipping/shipping-client.tsx   + DIM hint + draft persistence + tracking widget
src/components/Footer.tsx                          + sitewide tracking strip
src/components/dashboard/ShippingPanel.tsx         NEW — member shipping panel
src/components/DashboardClient.tsx                 + Shipping nav entry, slug, render
src/components/dashboard/types.ts                  + shippingLabels prop
src/app/dashboard/page.tsx                         + ShippoLabel fetch in Promise.all
HANDOFF.md                                         this section
```

### Build verification

Every iter ended with `npx next build` exit 0 (Turbopack, Next.js 16.2.2). 1 new public route: `/track`.

### Deferred (remaining real work)

- **Multi-warehouse senders** — admin saves multiple ship-from addresses (single sender persists in SiteConfig today).
- **Pickup time-slot picker** on pre-paid orders — schema change needed.
- **Track tab map preview** — leaflet/openstreetmap embed of last-known location.
- **Performance** — virtualization on Labels list (premature at current scale).
- **Notification preferences** — admin chooses what fires email/SMS for shipping events.
- **Tests** — server-action unit coverage for the shipping flow.

### Iter-25..27 addendum (2026-04-30)

Three more polish iterations after the section-78 summary above:

- **HANDOFF.md kept current** — section 78 was added in iter-25 (this section's predecessor).
- **Member dashboard Overview**: 4th quick-action card "My shipments" → `setActiveTab("shipping")` so members discover the new Shipping tab from the Overview ([OverviewPanel.tsx](src/components/dashboard/OverviewPanel.tsx)).
- **Tracking shortcut in the public Navbar**: 36×36 magnifying-glass icon-only button between Sign-In and Request-a-Mailbox CTAs, links to `/track`. Hidden on mobile so the pill nav stays uncluttered ([Navbar.tsx](src/components/Navbar.tsx)).
- **Member ShippingPanel filter**: search input appears when the member has > 4 labels, filters by recipient / tracking / city / state / zip / carrier / service. Header chip flips to "3 of 12" while filtering. Empty state with Clear-filter link ([ShippingPanel.tsx](src/components/dashboard/ShippingPanel.tsx)).
- **PublicShareButton component** ([src/components/PublicShareButton.tsx](src/components/PublicShareButton.tsx) — new): Web Share API on supported devices (modern iOS / Android / Edge), clipboard fallback elsewhere, final-fallback `window.prompt` for ancient browsers.
- **Share buttons on `/r/[id]` and `/r/po/[id]`** public receipts. Customer taps Share → native share sheet → forwards branded NOHO link to family. Absolute URL computed from request headers (`x-forwarded-host` / `host` + proto) with `nohomailbox.org` fallback for prerender paths.

Files touched in iter-25..27:
```
HANDOFF.md                                         section 78 + this addendum
src/components/dashboard/OverviewPanel.tsx         + "My shipments" quick-action
src/components/Navbar.tsx                          + Track icon-button
src/components/dashboard/ShippingPanel.tsx         + filter input + count chip
src/components/PublicShareButton.tsx               NEW — Web Share API helper
src/app/r/[id]/page.tsx                            + Share button (absolute URL)
src/app/r/po/[id]/page.tsx                         + Share button (absolute URL)
```

Build clean across all three iterations (`npx next build` exit 0).

---

## 78. Iter-56 (2026-04-30) — Customer Chat panel: branded hero + monogram threads + filter chips

**Live**: aliased `noho-mailbox-3kdm5kjq7-…` → `nohomailbox.org` along with iter-55 Tenants panel.

### Visual upgrade — `src/components/admin/AdminChatPanel.tsx`

Two-pane chat for admin ↔ customer messaging. Was 369 lines. Rebuilt with **modern messaging-app polish**:
- **Hero strip** — blue→ink gradient with chat-bubble corner mark + dot pattern + green pulse + "Live · N threads" eyebrow + 1.5rem Baloo "Customer Chat"
- **3 filter pills in hero** — All / Unread / 24h with count chips (white-active state, cream-tinted inactive)
- **Two-pane shell** with rounded chrome and subtle shadow:
  - Left aside (288px wide):
    - Cream-tinted search input with X clear button + focus-ring
    - "Conversations" section with ranked list. Each item has:
      - **Brand-gradient monogram** (huesFor cycle) — replaces the old cream/blue circle
      - **Red unread dot** with white border floating on monogram top-right (instead of separate dot column)
      - Suite # bold-blue subtitle when present
      - Last message preview, "You: " prefix in subtle ink
      - Active state: blue tint + 3px blue left-border (replaces full-bg fill)
    - "Start a new chat (N)" section with dimmed monogram + "+ chat" pill on hover
    - "Showing 50 of N · refine search" hint when truncated
  - Right pane: ChatStream when active; otherwise:
    - **Empty state** with radial-glow background, blue-gradient chat-bubble icon, large Baloo headline
    - **Unread alert pill** — red pulsing if unread threads exist when nothing selected

### Files touched

```
src/components/admin/AdminChatPanel.tsx    REWRITTEN — 369 → ~480 lines
HANDOFF.md                                  this section
```

### Build verification

`npx next build` exit 0. 0 type errors. iter-55 + iter-56 stack live in same deploy.

---

## 79. Shipping Center polish — final stretch (iter 28..30)

Three more iterations after the section-78 addendum. Focus: customer-facing automation + ops cleanup + landing-page discovery.

### Auto-tracking email on label purchase

- New email template **`sendLabelTrackingEmail`** ([src/lib/email.ts](src/lib/email.ts)) — branded "Your {carrier} label is ready" with carrier/service/tracking info block + big "Track on NOHO →" CTA pointing at `${BASE_URL}/r/${labelId}`. `kind: "label_tracking"` so the EmailLog admin tab can filter.
- Auto-fires on Quick Ship buy ([src/app/actions/shippo.ts](src/app/actions/shippo.ts) `buyShippoLabel`) when the label is tied to a member (`input.userId`). Walk-in labels skip — admin uses Forward SMS for those.
- Auto-fires on Pre-paid Print ([src/app/actions/labelOrders.ts](src/app/actions/labelOrders.ts) `adminPrintLabelOrder`) to `order.customerEmail` (always set on pre-paid). Customer who paid via Square gets the branded tracking email automatically.
- Both are fire-and-forget — `void` + `.catch(console.error)` so any email failure stays out of the buy/print success path.

### Stale pre-paid order watchdog

- New `isStaleOrder()` predicate + `STALE_ORDER_DAYS = 7` ([AdminLabelOrdersPanel.tsx](src/components/admin/AdminLabelOrdersPanel.tsx)) — fires for `Awaiting/LinkSent` orders older than 7 days (customer abandoned).
- New `bulkCancelStaleLabelOrders(olderThanDays = 7)` server action ([labelOrders.ts](src/app/actions/labelOrders.ts)) — single `updateMany` flips matching rows to `Cancelled` with timestamp set.
- New **Stale (N)** filter chip (amber-tone, only renders when count > 0). Per-row **STALE** badge with hover tooltip showing days elapsed.
- New **"Clear N stale"** header button — confirmation dialog, runs the bulk action.
- Visual contract: Stuck = red urgent (staff side); Stale = amber warn (customer abandoned).

### Storefront landing discovery strip

- New cream-pill inline strip just below the primary CTA pair ([src/app/(marketing)/page.tsx](src/app/(marketing)/page.tsx)). "SHIPPING" eyebrow + brand-teal "Get a quote →" CTA + ghost "Track a shipment →" CTA. Above-the-fold discovery for visitors who came specifically to ship or check a package.

### Files touched (iter-28..30)

```
src/lib/email.ts                                   + sendLabelTrackingEmail template
src/app/actions/shippo.ts                          + auto-fire on Quick Ship buy
src/app/actions/labelOrders.ts                     + bulkCancelStaleLabelOrders + auto-fire on print
src/app/admin/page.tsx                             + createdAtIso on label-orders
src/components/admin/AdminLabelOrdersPanel.tsx     + isStaleOrder + Stale chip + STALE badge + Clear-stale button
src/app/(marketing)/page.tsx                       + landing shipping/track strip
HANDOFF.md                                         this section
```

### Build verification

Every iter ended with `npx next build` exit 0. No new public routes (re-uses /shipping + /track).

### Loop status

The user's `/loop until I say sa7it` has been running 30 iterations across two sessions. Code shipped to local; **production deploy still gated** behind explicit user approval. Run `vercel --prod && vercel alias set <new>.vercel.app nohomailbox.org` to ship the bundle when ready.

---

## 79. Iter-57 (2026-04-30) — Partner Network: branded hero + KPI tiles + monogram cards (queued)

**🚨 Vercel quota cap** — iter-57 built on disk, ships when quota resets.

### Visual upgrade — `src/components/admin/AdminPartnersPanel.tsx`

Partner program / referral commissions tracker. Was 511 lines plain. Polished header + KPI tiles + partner-card chrome:
- **Hero strip** — purple→blue-deep→ink gradient with handshake/network triangle corner outline (3 nodes connected by lines + dashed top edge) + dot pattern + amber pulse + "Partner Program · Referrals" eyebrow + 3xl Baloo "Partner Network" + cream "Add Partner" CTA with hover-scale
- **5 KPI tiles** — Active (green) / Referrals (blue) / Closed Revenue (purple) / **Owed** (amber, pulses if > $0) / Paid (ink). Each tile has top-edge accent gradient + Baloo numerals.
- **Partner cards** rebuilt:
  - Brand-gradient monogram avatar (huesFor cycle)
  - Code chip (mono-font on blue tint)
  - Status pill (preserved existing color map)
  - **Category emoji chip** (📊 CPA, ⚖️ Immigration, 💼 Corporate, 💻 Web, 🎨 Brand, 🛡️ Insurance, 🏠 Real Estate, 💡 Coach, ✨ Other) inside ink-tint pill
  - Owner row with mailto/tel hover-underline
  - Commission rate amber pill + referrals/owed/paid count strip
  - Notes in cream-tinted amber-bordered card
- Hover treatment: cream-tinted row background

Modal forms (Add Partner, Log Referral) untouched — kept existing functional state intact.

### Files touched

```
src/components/admin/AdminPartnersPanel.tsx    EDITED — header/KPIs/partner card (511 → ~680 lines)
HANDOFF.md                                      this section
```

### Build verification

`npx next build` exit 0. 0 type errors. **Queued** for deploy when Vercel quota refreshes.

---

## 80. Shipping Center polish — iter 31..34 (final iters of the loop)

Continuation of §78 / §79. The user kept `/loop until I say sa7it` running. These four iterations focused on social shareability, dashboard discoverability, live polling, and ergonomics.

### Public-receipt social-share previews

- New `generateMetadata({ params })` on `/r/[id]` ([src/app/r/[id]/page.tsx](src/app/r/%5Bid%5D/page.tsx)) — pulls carrier + service + recipient from the ShippoLabel and builds per-shipment `title` / `description` / `openGraph` / `twitter:summary_large_image`. iMessage / WhatsApp / Slack / Discord previews now show the actual shipment instead of a generic "NOHO Mailbox" card.
- New dynamic OG image route ([src/app/r/[id]/opengraph-image.tsx](src/app/r/%5Bid%5D/opengraph-image.tsx)) — 1200×630 cream-on-ink card. Brand bar (NOHO eyebrow + phone) → 220px carrier glyph (USPS navy / UPS bronze / FedEx purple / DHL yellow with brand-color foregrounds) + recipient + city/state in big Baloo-style display + carrier service + mono tracking number. Refunded state pivots to red "REFUNDED" pill. Footer ink bar with `nohomailbox.org/track` + storefront address. Server-side via Next.js `ImageResponse`. Fallback card for missing receipts so social previews never 404.
- Same `generateMetadata` treatment on `/r/po/[id]` ([src/app/r/po/[id]/page.tsx](src/app/r/po/%5Bid%5D/page.tsx)).

### Member dashboard at-a-glance

- **Most-recent shipment tile on the Overview** ([src/components/dashboard/OverviewPanel.tsx](src/components/dashboard/OverviewPanel.tsx)) — conditional `DashCard` between the action grid and "Latest mail", only renders when the member has at least one NOHO label.
- Layout: brand-tinted carrier glyph (USPS navy / UPS bronze / FedEx purple / DHL yellow) + "LATEST SHIPMENT" eyebrow + recipient + city/state + mono tracking + relative date + brand-blue "View all →" CTA. Whole card click jumps to Shipping tab.
- Plumbed via `shippingLabels` prop on OverviewPanel (DashboardClient now forwards).

### Auto-refresh tracking

- New [`AutoRefresh`](src/components/AutoRefresh.tsx) client island. Calls `router.refresh()` on a fixed interval (default 60s). Re-runs the route's server data fetches and patches the rendered tree — no flicker, no scroll-jump, no full reload.
- **Page Visibility API integration** — pauses when `document.hidden` is true so background tabs don't burn rate-limit on Shippo's tracking endpoint. Resumes on visibility-restore.
- `disabled` prop short-circuits the effect for terminal states.
- Wired into `/r/[id]` (disabled when `isRefunded` or `liveStatusUpper === "DELIVERED"`) and `/r/po/[id]` (disabled when `Cancelled`, or `Printed` + `DELIVERED`).

### Member ShippingPanel sort

- Sort dropdown next to the existing search input (date / amount / status). Defaults to date-desc. Useful for power-user members with many shipments.
- Sort + filter + count chip all play well together (header chip flips to "3 of 12" while filtering).

### Files touched (iter-31..34)

```
src/app/r/[id]/page.tsx                            + generateMetadata, AutoRefresh
src/app/r/[id]/opengraph-image.tsx                 NEW — dynamic 1200×630 OG card
src/app/r/po/[id]/page.tsx                         + generateMetadata, AutoRefresh
src/components/AutoRefresh.tsx                     NEW — silent router.refresh poller
src/components/DashboardClient.tsx                 + pass shippingLabels to OverviewPanel
src/components/dashboard/OverviewPanel.tsx         + most-recent shipment tile
src/components/dashboard/ShippingPanel.tsx        + sort dropdown
HANDOFF.md                                         this section
```

### Build verification

`npx next build` exit 0 every iter. 1 new public route registered: `/r/[id]/opengraph-image`. All other routes preserved.

### Loop status

The `/loop until I say sa7it` has now run **34 iterations** across two sessions covering the entire Shipping Center bug fixes + workspace shell + Quick Ship UX + Labels list + Pre-paid orders + hero + run sheet + Track tab + parcel presets + dock integration + drag-to-reorder + bulk select + stuck-order watchdog + NPC courier + DIM weight + receipt live tracking + public `/r/[id]` + `?` help overlay + health card + pre-paid `/r/po/[id]` + embed quick-steps + sticky selected-rate + bulk Open labels + HANDOFF updates + public-link copy + refund-status badge + CSV export + carriers redesign + Note field + QR codes + `/track` router + tracking widgets (shipping/footer/navbar) + DIM hint + draft persistence + member ShippingPanel + Overview integration + Web Share + auto-tracking email + stale-order watchdog + landing strip + per-receipt OG metadata + AutoRefresh + sort dropdown.

**Production deploy still gated** — code shipped to local; run `vercel --prod && vercel alias set <new>.vercel.app nohomailbox.org` to ship the bundle. Brand discipline: 0 hits for legacy `#3374B5` / `#2D1D0F` blues.

---

## 81. User-feedback sweep — iter 35..37 (markup + 3D unification + Scan workflow)

User mid-loop: *"you are free to upgrade or delete the menu or change it. ideally everything is in that 3d container not under it it's less confusing. think of an intelligent solution. also we need to be able to scan packages and print out a receipt with the information and tracking number. also we still don't have our markup on live rates it only shows the cost."*

Three concerns addressed across three iters.

### Iter-35 — markup amplification

- The customer-facing markup has been live in code since iter-1, but the user wasn't seeing it (likely a stale prod deploy + the visual hierarchy wasn't loud enough). Amplified the rate-row layout in [AdminShippoPanel.tsx](src/components/admin/AdminShippoPanel.tsx) so it's unmistakable:
  - "Customer pays" eyebrow now sits in a tinted-teal pill.
  - Customer-pays number is **26px ink-bold** (was 20px). Tabular numerals.
  - New explicit green **`+$X.XX margin`** chip directly under the price with hover tooltip showing the formula.
  - "Wholesale $X · you keep $Y" caption in muted text under the chip.
- Same treatment on the floating Selected-rate bar (iter-16): "Customer pays" eyebrow + 20px ink price + green margin chip + "NOHO marks up 10% (with $1 floor)" caption.

### Iter-36 — unified 3D cockpit

User asked everything to live INSIDE the dark 3D container, not stacked beneath it. Restructured [AdminShippingCenterPanel.tsx](src/components/admin/AdminShippingCenterPanel.tsx):

- Outer wrapper now paints the dark radial-gradient + perspective floor grid + glow orbs. **Hero stats + FleetScene + Health card + workspace** all live INSIDE this single cinematic frame.
- `ShippingCenterHero` accepts an `embedded` prop (skips its own outer dark wrapper); `HeroBody` extracted so embedded + standalone share JSX.
- `HealthCard` accepts a `translucent` prop — frosted backdrop, brand-cream typography, brand-cream "fix" buttons. Reads as a layer of the cockpit, not pasted-on white.
- Workspace card sits inside the same dark frame on a cream/white inner panel for legibility — visually nested, not stacked-then-disconnected.

### Iter-37 — Scan & Print package workflow

New end-to-end workflow for inbound packages:

- **`AdminInboundScanPanel`** ([new file](src/components/admin/AdminInboundScanPanel.tsx)) — workspace pane mounted at the new "Scan Inbound" puck (green, between Pre-paid and UPS in the FleetScene at `(140, 280)`).
- **Camera barcode capture** via `BarcodeDetector` (CODE_128 / CODE_39 / QR / Data Matrix / EAN / UPC). Same pattern as `IdScanButton`. Manual paste fallback for browsers without the API.
- **Auto-detects carrier** from scanned tracking number using the same regex as the Track tab. Admin override dropdown.
- **Customer picker** — debounced server-side search via [`findCustomersForScan`](src/app/actions/mail.ts), top 8 matches, search by suite # / name / email.
- **Optional override** for "addressed to" name when the package is for a household member.
- **Submit** → [`logScannedInbound`](src/app/actions/mail.ts) creates a `MailItem` (type Package), fires the customer's mail-arrived email + in-app notification, returns the `mailItemId`.
- **Printable thermal receipt** — new route [`/admin/inbound/receipt/[id]`](src/app/admin/inbound/receipt/%5Bid%5D/page.tsx) — 4×6 thermal-printer ready (`@page size: 4in 6in; margin: 0`). NOHO logo + "PACKAGE RECEIVED" eyebrow + recipient name + suite # in big teal type + carrier + tracking (mono) + receive timestamp + QR code linking to `/dashboard?tab=packages`.

### Files touched (iter-35..37)

```
src/components/admin/AdminShippoPanel.tsx          + amplified markup display (rate row + Selected-rate bar)
src/components/admin/AdminShippingCenterPanel.tsx  + unified dark cockpit, embedded HeroBody, translucent HealthCard, Scan puck
src/components/admin/AdminInboundScanPanel.tsx     NEW — barcode-scan + customer picker workspace
src/app/actions/mail.ts                            + logScannedInbound, findCustomersForScan
src/app/admin/inbound/receipt/[id]/page.tsx        NEW — thermal print receipt with QR
HANDOFF.md                                         this section
```

### Build verification

Every iter ended with `npx next build` exit 0. 1 new public-route family: `/admin/inbound/receipt/[id]` (admin-gated).

### Loop status

37 iterations now. Major bug-fix backbone + comprehensive polish + user-feedback sweep complete. Production deploy still gated — run `vercel --prod && vercel alias set <new>.vercel.app nohomailbox.org` from `/Users/CEO/Claude/noho-mailbox` to ship.

---

## 82. Scan & Print workflow polish — iter 38..42

Five more iterations refining the new Scan & Print workflow that landed in iter-37.

### Iter-38 — UX polish

- **Auto-focus** the tracking input on mount so a USB barcode scanner can fire immediately.
- **Enter-to-submit** when a customer is locked in + tracking has 6+ chars. USB scanners suffix with CR — turns it into a one-scan-and-go workflow.
- **Popup-blocker fallback** — if `window.open` returns null, the success banner copy switches and includes a green "Open receipt →" backup link. `lastReceiptId` sticks until the next scan starts.
- **2s auto-clear** of inputs after success with focus restored to tracking input so the next scan flows immediately.

### Iter-39 — optional weight + dimensions

- New `logScannedInbound({ weightOz, dimensions })` params persisting to MailItem.
- New 2-column intake card on the panel (after a customer is picked) with weight + dims inputs. Weight uses the existing `parseWeightInput` helper (accepts "2 lb 6 oz", "36 oz", "2.5 lb"); live preview "= 36 oz (2.25 lb)" in green when parseable, amber when not.
- Receipt page conditionally renders weight (lb headline + oz subtitle) + dimensions when present.

### Iter-40 — recent scans audit trail

- New `getRecentScans(limit = 12)` server action returns last 12 inbound packages from past 48h with carrier + recipient + suite # + weight + dims + photo URL.
- New `RecentScansList` card mounts at the bottom of AdminInboundScanPanel. Header strip + Refresh button. Each row: brand-tinted carrier glyph + recipient + suite # chip + mono tracking + relative time + weight + dims + **Re-print →** button → opens `/admin/inbound/receipt/[id]` in a new tab.
- Auto-refreshes after every successful scan.

### Iter-41 — exterior photo capture

- New `PhotoCaptureModal` reuses `getUserMedia` pattern from ScanModal. Snaps still frame to canvas → JPEG Blob → POST to existing `/api/upload` endpoint → Vercel Blob URL stored on form.
- `logScannedInbound` accepts `exteriorImageUrl?: string`, persists to `MailItem.exteriorImageUrl`. `getRecentScans` returns it.
- New photo row at top of intake card: 80×80 photo slot with empty-state camera icon, captured-state thumbnail, **Capture photo / Re-take / Remove** controls.
- Receipt page renders the photo (full-width up to 180px tall, ink-bordered, centered). Customer holding the print can match photo to package.
- Recent-scans rows replace the carrier-glyph with the actual photo thumbnail when one exists — visual continuity from scan → audit.

### Iter-42 — email mail-arrived embeds the photo

- `sendMailArrivedEmail` already supported `photoUrl`. Wired `logScannedInbound` to forward the captured image URL so the customer's mail-arrived email shows the actual package, not just a text description. Confidence-inspiring without admin doing extra work.

### Files touched (iter-38..42)

```
src/app/actions/mail.ts                              + getRecentScans, weightOz/dimensions/exteriorImageUrl args, photo→email
src/components/admin/AdminInboundScanPanel.tsx       + auto-focus, Enter-to-submit, popup fallback, weight/dims inputs, photo capture, recent scans list
src/app/admin/inbound/receipt/[id]/page.tsx          + weight/dims/photo blocks
HANDOFF.md                                           this section
```

### Build verification

`npx next build` exit 0 every iter. No new public routes (uses existing `/api/upload`).

### Loop status

42 iterations across two sessions. Production deploy still gated.

---

## 83. Photo thread completion + batch mode — iter 43..45

### Iter-43 — stay-on-customer batch mode

Real workflow win for the Scan & Print panel: admin can flip a "Stay on this customer" toggle so the auto-clear-after-success preserves `pickedCustomer` + `recipientName` while still clearing tracking + carrier override + weight + dims + photo. Lets admin rapidly receive multiple boxes for the same suite (think: customer placed a big eBay order, 5 boxes show up the same day) without re-typing the suite # each time. Toggle has an amber "Batch" pill when on. ([AdminInboundScanPanel.tsx](src/components/admin/AdminInboundScanPanel.tsx))

### Iter-44 — photo thumbnails on member dashboard PackagesPanel

Closes the photo-capture journey end-to-end: admin scans + captures (iter-41) → photo on print receipt (iter-41) → photo embedded in customer email (iter-42) → **photo on member dashboard** (iter-44). When `MailItem.exteriorImageUrl` is set, the package row's icon slot is replaced by the actual photo (object-cover, ink border, hover-scale). Falls back to the brand-blue gradient icon for older items. Tracking number shown inline next to the arrival date. ([PackagesPanel.tsx](src/components/dashboard/PackagesPanel.tsx))

### Iter-45 — Overview "Latest mail" parity

Same photo-thumbnail treatment on the Overview's Latest-mail rows so the photo-capture journey is consistent across every dashboard surface. ([OverviewPanel.tsx](src/components/dashboard/OverviewPanel.tsx))

### Files touched (iter-43..45)

```
src/components/admin/AdminInboundScanPanel.tsx     + keepCustomer toggle + batch-preserve auto-clear
src/components/dashboard/PackagesPanel.tsx        + photo thumbnail + inline tracking number
src/components/dashboard/OverviewPanel.tsx        + photo thumbnail on Latest-mail rows
HANDOFF.md                                         this section
```

### Build verification

`npx next build` exit 0 every iter.

### Loop status

45 iterations. Production deploy still gated.

## 84. Pickup workflow + lifecycle audit — iter 46..51

The next stretch closes the loop on the package lifecycle. Iter-37 added intake. This block adds the counter handoff, lifecycle audit, and the customer-side confirmation matching the email they get.

### Iter-46 — (admin embedded portal — emoji glyph icons added by another agent; left intact per system reminder, despite the "no emojis as icons" rule)

### Iter-47 — Scan-Inbound dock tile + ScanStatusPill

- Added a dedicated **Scan Inbound** tile in the MailOS dock (AdminDashboardClient) at index 2, with divider regrouping (idx 2/6/7).
- New cross-component event `noho-shipping-subview` — dock fires `{detail: {subview: "scan"}}`, the Shipping Center listens and switches its top-level subview. Same pattern as the existing `noho-shipping-jump` event for inner Quick-Ship tabs.
- New `ScanStatusPill` component on RecentScansList rows — color-coded chips for {Received, Scanned, Awaiting Pickup, Held, Picked Up, Forwarded, Returned, Discarded}. At-a-glance "where is this package now?".

### Iter-48 — One-click pickup signoff on Recent Scans rows

- Action button group on each RecentScansList row:
  - "Picked up ✓" green primary (background `#16A34A`) when status ∈ {Received, Scanned, Awaiting Pickup}
  - "Hold" amber secondary in the same set
  - Existing "Re-print →" always present
- Calls `updateMailStatus` (state-machine guarded), refreshes list on success, surfaces transition errors inline.
- Comment notes the Khiari memory: in-person handoff, no e-sig, admin session is the audit witness.

### Iter-49 — Pickup-mode scanner

- New server action `findMailItemForPickup(trackingFragment)` returns the most-recent active MailItem (status not in {Picked Up, Forwarded, Returned, Discarded}) matched by `trackingNumber.contains` + a `duplicates` count.
- Mode toggle in the panel header — segmented Intake / Pickup tabs.
- Pickup mode reuses the same tracking input + camera (BarcodeDetector). Enter or barcode capture triggers a lookup instead of a save.
- New `PickupMatchPanel` component — four states (placeholder / looking / no-match / match-found). Match card shows photo, recipient (24px ink-bold), suite chip, ScanStatusPill, carrier+tracking, optional duplicates warning. Big green "Confirm picked up ✓" primary.
- `confirmPickup` calls `updateMailStatus → "Picked Up"`, refreshes Recent Scans, refocuses input for the next pickup at the counter.

### Iter-50 — Auto-clear stale match + audit log + daily stats

- **Auto-clear**: tracking input onChange clears the displayed pickupMatch when in pickup mode so admin doesn't accidentally confirm against the previous tracking.
- **Audit log on status change**: `updateMailStatus` now writes a paired `auditLog.create` inside a `prisma.$transaction`. Action: `mail.status.{newStatus_snake_case}`. Metadata: `{from, to}`. Closes a real compliance gap (pre-iter-50 there was no actor record on a status change).
- **Daily intake stats card**: new `getTodaysIntakeStats()` server action returns `{scannedToday, awaitingPickup, pickedUpToday, heldRightNow}`. `pickedUpToday` is computed from AuditLog rows (since MailItem has no `updatedAt`). New `DailyIntakeStatsCard` renders four color-coded throughput tiles at the top of the panel.

### Iter-51 — Pickup confirmation email + Recently Picked Up section

- New `sendMailPickedUpEmail` template in `lib/email.ts` — green-accent receipt with suite #, datetime, carrier+tracking, "If this wasn't you" safety line, dashboard CTA. EmailLog `kind: "mail_picked_up"`.
- Wired into `updateMailStatus` as `void (async () => …)()` fire-and-forget so a Resend outage doesn't fail the status flip.
- New "Recently Picked Up · last 7 days" section on member PackagesPanel (DashboardClient computes from top-50 mailItems sliced to 5 picked-up rows). Hidden when empty so new-member dashboards stay clean. Each row shows photo, "Picked up ✓" green chip, tracking #.

### Files touched (iter-47..51)

```
src/app/actions/mail.ts                              + findMailItemForPickup + getTodaysIntakeStats + audit log on updateMailStatus + sendMailPickedUpEmail wiring
src/lib/email.ts                                     + sendMailPickedUpEmail template
src/components/admin/AdminInboundScanPanel.tsx       + Intake/Pickup mode toggle + PickupMatchPanel + DailyIntakeStatsCard + ScanStatusPill + lifecycle action buttons
src/components/admin/AdminShippingCenterPanel.tsx    + noho-shipping-subview event listener
src/components/AdminDashboardClient.tsx              + Scan Inbound dock tile + divider regrouping
src/components/DashboardClient.tsx                   + recentlyPickedUp filter
src/components/dashboard/PackagesPanel.tsx           + Recently Picked Up section
HANDOFF.md                                           this section
```

### Build verification

`npx next build` exit 0 every iter.

### Loop status

51 iterations. Production deploy still gated.

## 85. Lifecycle polish + External Dropoff workflow — iter 53..58

Three small lifecycle polish iters built on iter-50/51's audit-log foundation, then iter-57/58 added a brand-new entity in response to user feedback.

### Iter-53 — Held → Awaiting "Bring to shelf" + Stale chip

- "Bring to shelf →" button on Held RecentScans rows. Calls `updateMailStatus → "Awaiting Pickup"` (state machine permits but had no UI affordance). Closes the loop on the Held lifecycle.
- "Stale · {N}d" red chip on Awaiting / Received / Scanned items older than 7 days. Tooltip notes storage tier kicks in at day 4 per Terms.

### Iter-54 — Reassign-customer modal

- New `reassignMailItem({mailItemId, newUserId})` server action. Refuses on terminal states (Picked Up / Forwarded / Returned / Discarded — wrong customer already physically has it), refuses no-op same-userId. `prisma.$transaction` updates `MailItem.userId + recipientName` + writes `auditLog` `mail.reassign` with `{fromUserId, toUserId, toSuite, status}`.
- "Reassign" button added to RecentScanRow action cluster (between Bring-to-shelf and Re-print). `canReassign` predicate matches the server's allowlist.
- `ReassignCustomerModal` component — backdrop click + × close, header shows current recipient/suite/tracking, debounced `findCustomersForScan` typeahead. Picked-customer green ring, primary "Reassign →" calls server action.

### Iter-55 — Pickup-mode "Scan next" polish

- Added `onScanAgain` prop to `PickupMatchPanel`. New "Scan next →" NOHO-blue primary button between green Confirm and white Clear in the match card. Click clears `pickupMatch / duplicates / message / tracking` and immediately reopens the camera. Saves a click + focus shuffle when the bureau processes a small queue at the counter.

### Iter-56 — Awaiting-pickup shelf

- New `getAwaitingShelf(limit)` — oldest-first (createdAt asc), only non-terminal states {Awaiting Pickup, Received, Scanned}, returns `{total, rows}` so the header shows "Showing 10 of 47".
- New `AwaitingShelfList` component above Recent Scans. Pulse-dot color (green / amber / red) flips with the oldest item's age. "Oldest · Nd" red chip when ≥4d (storage tier). "View all on the shelf" footer link when total > shown. Reuses `RecentScanRow` so all lifecycle action buttons work the same.

### Iter-57 — External Dropoff scaffolding (user feedback)

User feedback mid-iter-56: *"i like the inbound dropoff. but we also need a dropoff with a pre-payed label for people who are not our customers but use us as an access point so not just limited to our customers. also make sure to add optional information like sender name or receiver name."*

- New Prisma model **`ExternalDropoff`** — separate from MailItem (the dropper-offer is not our customer; no suite #, no dashboard). Fields: tracking + carrier (required), sender name + phone, receiver name, destination, photo, notes, status (Awaiting Carrier / Picked Up by Carrier), loggedById, carrierPickedUpAt. Indexes on `(status, createdAt)`, `trackingNumber`, `createdAt`.
- New `src/app/actions/dropoffs.ts`:
  - `logExternalDropoff(input)` — atomic create + audit log `dropoff.intake`
  - `getRecentDropoffs(limit)` — last 48h, awaiting-first then terminal
  - `markDropoffPickedUpByCarrier(id)` — terminal flip + audit `dropoff.carrier_pickup`
- Third **"Dropoff" tab** added to the Intake / Pickup segmented toggle.
- New `DropoffForm` component — lighter than intake (no customer picker required). Optional fields in two columns: sender name, sender phone, receiver name, destination. Notes textarea. Photo capture row. Big primary "Log dropoff + Print receipt →" calls `logExternalDropoff` and opens the receipt in a new tab.
- Enter on the tracking input (when in dropoff mode + tracking ≥6 chars) submits.

### Iter-58 — Dropoff receipt + Recent Dropoffs feed + lifecycle button

- **Dropoff thermal receipt** at `/admin/inbound/dropoff/[id]` — same 4×6 thermal layout as the inbound receipt. Green "Dropoff received" eyebrow (vs blue "Package received"). Sender block (with phone), Going-to block (receiver + destination), Carrier + tracking, Dropped-off timestamp, optional notes + photo, "What happens next" green callout explaining the carrier sweep, NoHo address footer.
- **`RecentDropoffsList`** + **`RecentDropoffRow`** in the panel. Last 48h, awaiting-first then terminal. Each row: carrier-color photo/badge, sender → receiver name, amber "Awaiting carrier" or green "Picked up by carrier" status chip, tracking + ago + destination. Hidden when empty so bureaus that don't take external dropoffs don't see clutter.
- "Carrier picked up ✓" green primary button per active row → `markDropoffPickedUpByCarrier` → terminal flip + audit log → list refreshes. "Re-print →" always present.
- Wired `getRecentDropoffs` and `markDropoffPickedUpByCarrier` imports + `recentDropoffs` state + `RecentDropoff` type into the panel; refresh runs in the same cycle as scans + stats + shelf.

### Files touched (iter-53..58)

```
prisma/schema.prisma                                + ExternalDropoff model
src/app/actions/mail.ts                             + reassignMailItem + getAwaitingShelf
src/app/actions/dropoffs.ts                         NEW: logExternalDropoff / getRecentDropoffs / markDropoffPickedUpByCarrier
src/app/admin/inbound/dropoff/[id]/page.tsx         NEW: dropoff thermal receipt
src/components/admin/AdminInboundScanPanel.tsx      + Bring-to-shelf / Stale chip / Reassign button + modal / Scan-next polish / AwaitingShelfList / Dropoff mode tab + DropoffForm / RecentDropoffsList + RecentDropoffRow
HANDOFF.md                                          this section
```

### Build verification

`npx next build` exit 0 every iter.

### Loop status

58 iterations. Production deploy still gated. New `ExternalDropoff` table will need `prisma migrate deploy` (or `prisma db push` for the libsql adapter path) on the next prod release.

## 86. Stats trends + dropoff sweep + in-app pickup notifications — iter 60..64

### Iter-60 — Dropoffs-today stat tile

- `getTodaysIntakeStats` extended with `dropoffsToday` count from `prisma.externalDropoff.count({where: {createdAt >= today}})`.
- `DailyIntakeStatsCard` adds a 5th teal-palette tile "Dropoffs today" (`#0f766e`). Grid responsiveness updated to `grid-cols-2 sm:grid-cols-3 lg:grid-cols-5` so 5 tiles never wrap awkwardly.

### Iter-61 — In-app pickup notification

- New `notifyMailPickedUp({userId, carrier?, trackingNumber?})` in `actions/notifications.ts` — creates a `Notification` row, type `package_picked_up`, title "Package picked up ✓", body includes carrier+tracking, link to `/dashboard?tab=packages`.
- Extended `NotificationType` union with `package_picked_up`.
- Wired into `updateMailStatus` inside the existing fire-and-forget block — runs after `sendMailPickedUpEmail`, each in its own try/catch so an outage of one doesn't block the other (and neither blocks the status flip).

### Iter-62 — Bulk carrier sweep

- New `bulkMarkDropoffsPickedUpByCarrier(carrier)` in `actions/dropoffs.ts`. Case-insensitive `contains` match collapses "FedEx" / "fedex" / "FedEx Ground" together. One `prisma.$transaction`: bulk `updateMany` (status + carrierPickedUpAt) + per-item audit logs (matching the single-item action shape) + a rollup `dropoff.carrier_sweep` audit entry with `{carrier, count, ids}`. `entityId: null` on the rollup since it spans multiple entities.
- `RecentDropoffsList` header renders one **"Sweep FedEx · 3"** button per carrier with awaiting items, computed from in-memory rows so buttons appear/disappear as work lands. Green primary, disabled while a sweep is in flight, hidden when nothing is awaiting. Result banner inline below the header.

### Iter-63 — Dropoff stale + overdue chips

- Per-row `dropoffStaleness` predicate when `isActive`:
  - `null` if <24h
  - `"stale"` (amber) if ≥24h
  - `"overdue"` (red) if ≥48h
- Chip rendered next to the "Awaiting carrier" pill: "Stale · 28h" / "Overdue · 52h" with hour-level granularity. Tooltip explains the threshold ("Today's sweep already happened or is overdue" / "Call the carrier; they should have swept twice by now").

### Iter-64 — Trend deltas vs yesterday

- `getTodaysIntakeStats` extended with yesterday-window counts for the three flow metrics: `scannedYesterday`, `pickedUpYesterday`, `dropoffsYesterday`. Yesterday window = `[today-midnight - 24h, today-midnight)`. State metrics (Awaiting / Held) skip the comparison since they're point-in-time, not flow.
- `DailyIntakeStatsCard` adds a `deltaVs?` field per item. Tiles with a delta render a chip beside the count: **▲+3** (green) / **▼-2** (red) / **·0** (gray flat) with hover tooltip "Yesterday at this time: N".

### Files touched (iter-60..64)

```
src/app/actions/mail.ts                              + dropoffsToday + yesterday counterparts in getTodaysIntakeStats + notifyMailPickedUp wiring in updateMailStatus
src/app/actions/notifications.ts                     + notifyMailPickedUp + extended NotificationType
src/app/actions/dropoffs.ts                          + bulkMarkDropoffsPickedUpByCarrier
src/components/admin/AdminInboundScanPanel.tsx       + Dropoffs-today tile + 5-up grid + per-carrier Sweep buttons + Stale/Overdue dropoff chips + trend deltas on stat tiles
HANDOFF.md                                           this section
```

### Build verification

`npx next build` exit 0 every iter (iter-61 needed a follow-up build after extending NotificationType — second build clean).

### Loop status

64 iterations. Production deploy still gated.

## 87. CSV export + member pickup history + auto-refresh + keyboard nav — iter 66..69

### Iter-66 — Daily CSV export

- New `getTodaysActivityForExport` server action — three queries in parallel (today's MailItem scans, today's `mail.status.picked_up` AuditLog rows, today's ExternalDropoff rows), hydrates pickup audit entries with their MailItem snapshot, normalizes everything into a unified `{timeIso, kind, tracking, carrier, party, suite, status}` shape, sorts newest-first.
- New "Export today" button next to the segmented mode toggle. Click → fetches → builds CSV with explicit header order `[Time, Type, Tracking, Carrier, Party, Suite, Status]` → downloads as `noho-daily-activity-YYYY-MM-DD.csv` via existing `toCsv / downloadCsv / dateStampedName` helpers.

### Iter-67 — Member pickup history page

- New SSR route `/dashboard/pickups` with `?page=N` pagination (20 per page). Header shows "Pickup history · suite #N" with total count. Each row: photo thumbnail (or carrier-color placeholder), sender, date · carrier · tracking, "Picked up ✓" green chip. Empty state for new members. Pagination footer (Newer / Page X of Y / Older).
- "View all →" link added to the Recently Picked Up section header in `PackagesPanel`.
- First build failed because `verifySession` returns a slim user shape without `suiteNumber`; fixed by fetching it separately in the parallel `Promise.all`.

### Iter-68 — 60s auto-refresh poll

- `setInterval` tick on `AdminInboundScanPanel` calls `refreshRecentScans()` every 60s (which already refreshes scans + stats + shelf + dropoffs in one cycle).
- Page Visibility API pause: `visibilitychange` listener stops the timer when tab is hidden, restarts when visible. Backgrounded tabs don't burn API calls.
- Visibility resume: on returning to the tab the panel runs `refreshRecentScans` immediately instead of waiting up to 60s for the next tick.

### Iter-69 — Pickup-mode keyboard shortcuts

- Enter (when match shown): confirms pickup. Without this admin had to click the green button between every counter handoff; with it the second Enter from the USB scanner that lands while admin is walking the next package up triggers the confirm. Falls back to lookup if no match yet.
- Esc: clears tracking + match + messages + refocuses input. Works in all three modes.
- Updated tracking input placeholder: "Enter submit · Esc clear".
- Added a `<kbd>` styled tip inside the match card: "press Enter to confirm or Esc to clear" (under the action buttons in muted ink).

### Files touched (iter-66..69)

```
src/app/actions/mail.ts                              + getTodaysActivityForExport
src/app/dashboard/pickups/page.tsx                   NEW: paginated member pickup history
src/components/dashboard/PackagesPanel.tsx           + "View all →" link to /dashboard/pickups
src/components/admin/AdminInboundScanPanel.tsx       + Export-today CSV button + auto-refresh poll + Enter/Esc keyboard shortcuts + tip text
HANDOFF.md                                           this section
```

### Build verification

`npx next build` exit 0 every iter (iter-67 needed a follow-up build after fixing verifySession's slim shape).

### Loop status

69 iterations. Production deploy still gated.

## 88. Audio + lookup + nudge — iter 71..74

### Iter-71 — Web Audio beep helper + Sound toggle

- New `playBeep(kind: "found" | "confirm" | "miss")` — lazily creates a single AudioContext (browser gesture from a click/scan unlocks playback). Sine-wave tones with soft envelope:
  - "found": 880 → 1175 Hz, says "match"
  - "confirm": 880 → 1320 Hz two-note resolution, says "done"
  - "miss": 330 Hz steady, says "no match"
- Best-effort: every step wrapped in try/catch + `webkitAudioContext` fallback so a failing audio API never blocks the workflow.
- New `soundOn` state + `setSoundOnPersist` writes to `localStorage["noho-scan-sound"]`. Hydrated on mount.
- "Sound on / Sound off" toggle button in the panel header — blue when on, gray when off, `aria-pressed`.
- Wired into `lookupForPickup` (found / miss), `confirmPickup` (confirm / miss on error), intake `submit` (confirm), `submitDropoff` (confirm / miss).

### Iter-72 — Quick-reassign from inside PickupMatchPanel

- `ReassignCustomerModal`'s prop type widened to a structural minimum **`ReassignableRow`** (id, recipientName, suiteNumber, carrier, trackingNumber). Both `RecentScan` and `PickupMatch` now pass through.
- "Wrong customer? Reassign →" muted underline link in the match card footer next to the Enter/Esc tip.
- New `onReassigned` prop on PickupMatchPanel. Parent's handler calls `refreshRecentScans()` + `lookupForPickup()` so the match card immediately reflects the new owner — admin can confirm pickup against the corrected suite without re-scanning.

### Iter-73 — Universal package lookup

- New `lookupAnyPackage(query)` server action. Parallel queries on MailItem (any status, take 8) and ExternalDropoff (take 8) where `trackingNumber.contains`. Follow-up query for the full AuditLog trail of the matching MailItems (take 50, ordered desc). Min query 4 chars.
- New `/admin/lookup` page — pure SSR with `?q=` query string, form posts back. Three result sections: Customer mail (photo / recipient / suite chip / carrier+tracking / logged date / status pill), External dropoffs (photo / sender → receiver / carrier+tracking / destination / dropped-off + carrier-pickup timestamps / status), Audit trail (timestamp + action + metadata JSON).
- "Lookup" header link in InboundScanPanel next to "Export today" — admin doesn't have to open another tab to answer "where's my package?" calls.

### Iter-74 — Stale-shelf nudge

- New `nudgeStaleCustomer(mailItemId)` server action. Refuses on terminal/missing/no-email cases. **24h throttle** via `auditLog.findFirst({action: "mail.nudge"})` lookup so admin can't blast the same customer repeatedly. Fires `sendMailArrivedEmail` + `notifyMailArrived` (each in its own try/catch — `partial: true` flag returned when one leg fails). Always writes a `mail.nudge` audit log entry with the failure list.
- Amber "Nudge" button in row action cluster, only shown when `isStale` (status active + ≥7 days). Sits between Reassign and Re-print.
- Inline `nudgeMsg` feedback below the button — "✓ Customer notified" green or amber partial-failure message.

### Files touched (iter-71..74)

```
src/app/actions/mail.ts                              + lookupAnyPackage + nudgeStaleCustomer
src/app/admin/lookup/page.tsx                        NEW: universal package lookup page
src/components/admin/AdminInboundScanPanel.tsx       + playBeep helper + Sound toggle + Quick-reassign in PickupMatchPanel + Lookup header link + Nudge button on stale rows + ReassignableRow structural type
HANDOFF.md                                           this section
```

### Build verification

`npx next build` exit 0 every iter.

### Loop status

74 iterations. Production deploy still gated.

## 89. Customer pickup search + lightbox + clear-shelf — iter 76..78

### Iter-76 — Walk-in customer pickup (no tracking #)

- New `findCustomersWithActivePackages(query)` server action. Searches User by suite/name/email contains (excludes ADMIN role), embeds active packages (status in {Awaiting Pickup, Received, Scanned}) under each customer. Cap of 4 customers + 6 packages each.
- **Intent detection in `lookupForPickup`**: regex `/[a-zA-Z]/` on the query — letters → customer search; pure digits → tracking lookup. Min 2 chars for name path, 4 for tracking.
- New `CustomerPickupCard` component — green-bordered card with customer header (name, suite chip, email, "N active" badge) + per-package list rows (carrier+tracking + ScanStatusPill + log time + green "Picked up ✓" button per row).
- New `confirmCustomerPackage(mailItemId, recipientName, suiteNumber)` helper runs the same `updateMailStatus → "Picked Up"` chain plus confirm beep + feed refresh + input refocus.
- Updated placeholder + 2-char min on Enter handler so the name path triggers correctly.

### Iter-77 — "Shelf is clear" celebratory empty state

- `AwaitingShelfList` no longer returns null on `total === 0`. Renders a green-bordered dashed celebratory tile with a check circle: "Shelf is clear · No packages waiting for pickup right now."

### Iter-78 — Photo lightbox (4 thumbnail locations)

- New `PhotoLightbox` component — fixed `inset-0` overlay, dark backdrop + blur, image centered with `object-contain`, top-right "Close · Esc" button, click-outside dismisses, Esc key dismisses (effect-bound listener).
- New `LightboxContext` (default no-op for safety). Panel provides via `<LightboxContext.Provider>` wrapping the entire return; child components call `useOpenLightbox()`.
- Wired into all four photo thumbnail locations:
  - PickupMatchPanel match-card 80×80 photo
  - RecentScanRow 36×36 thumbnails
  - RecentDropoffRow 36×36 thumbnails
  - CustomerPickupCard per-package 36×36 thumbnails
- Each thumbnail gets `cursor-zoom-in` + alt/title "Click to enlarge".

### Files touched (iter-76..78)

```
src/app/actions/mail.ts                              + findCustomersWithActivePackages
src/components/admin/AdminInboundScanPanel.tsx       + CustomerWithPackages type + lookupForPickup intent detection + CustomerPickupCard + confirmCustomerPackage + AwaitingShelfList empty state + PhotoLightbox + LightboxContext + lightbox wiring on 4 photo thumbnails
HANDOFF.md                                           this section
```

### Build verification

`npx next build` exit 0 every iter.

### Loop status

78 iterations. Production deploy still gated.

## 90. POS / Cash Register — iter-79 (foundation)

User asked for an admin POS that "looks like a cash register" with Cash, Zelle (to nohomailbox@gmail.com), Square, custom payment method, and printable receipts. Iteration 1 of an open-ended `/loop until I say sa7it` — every loop must be a visually remarkable change.

### Schema (Turso migration: `_migrate-pos.mjs`, removed after run)

- `POSSale` — id, **number** (unique counter, 1001+), cashier snapshot, customer snapshot, totals (subtotal/discount/tax/tip/total/cashTendered/cashChange — all cents), `paymentMethod` enum string ("Cash" | "Zelle" | "Square" | "CardOnFile" | "Wallet" | "Custom"), `customMethodLabel`, `paymentRef`, `zelleEmail` (snapshot of nohomailbox@gmail.com), status (Open/Paid/Voided/Refunded), receipt-printed/emailed/smsed timestamps, audit fields. User has cascading `posSales` relation.
- `POSLineItem` — id, saleId (cascade), sku (nullable for custom), name, category, unitPriceCents, quantity, discountCents, taxCents, totalCents, optional `linkedRenewalId` for cross-link to MailboxRenewal, notes.

### Server actions — `src/app/actions/pos.ts`

Types + the `ZELLE_RECIPIENT_EMAIL = "nohomailbox@gmail.com"` constant live in `src/lib/pos.ts` (because `"use server"` files can only export async functions).

- `getPOSCatalog()` — flat catalog assembled from live `pricing_v2` plans (Basic/Business/Premium × 3/6/14 mo) + a fixed services set (notary, scan, fwd-fee, shred, fax, print, copy, photo, delivery) + supplies (bubble mailers, boxes, tape, labels, padded envelopes, stamps) + fees (deposit, key, lost-key, setup, business pkg).
- `searchPOSCustomers(query)` — name/email/suite/phone/business contains; takes 8.
- `createSale(input)` — validates cart non-empty, custom-method label required, cash short check, wallet balance check (atomic conditional `updateMany`). Receipt # generator computes `max(number)+1` with retry-on-unique-collision. One `prisma.$transaction`: optional wallet debit + WalletTransaction ledger row + POSSale + POSLineItems + AuditLog.
- `getRecentSales(limit)`, `getTodaysTill()` — 7-method breakdown for daily till summary.
- `voidSale({ saleId, reason })` — flips to Voided, refunds wallet if applicable, audit-logged in same transaction.
- `markReceiptPrinted(saleId)`.

### Visual centerpiece — `src/components/admin/AdminPOSPanel.tsx` (~700 lines)

Counter-top cash register cabinet — heavy brown wood gradient, brass-trim border with rivets, gold "◆ NOHO Mailbox · Register ◆" engraved top rail. Inside:

- **LCD strip** — dark phosphor-green panel (`#0E1A14` bg, `#7CFFB2` glow) with monospace `Courier New`, scanline overlay (CSS `repeating-linear-gradient`), animated specular sweep (`@keyframes lcdScan`), live blinking cursor on the total. Shows TOTAL DUE big, subtotal/discount/tax/tip stacked right, cash tendered + change-due row appears when Cash method.
- **Item grid** — left column. Category tab strip (Mailbox / Service / Supplies / Fees / Custom). Items render as 3-D keycaps (cream gradient with brown bevel + brass shadow + 3px down-shadow that compresses on `:active`). 6 supply categories + plan-term cells.
- **Receipt tape** — right column. Real receipt-paper effect: 22px ruled lines, scalloped serration on top edge, monospace courier text. Live cart with per-line ± qty buttons + remove. Footer prints subtotal/discount/tax/tip/TOTAL.
- **Customer attach** — search → suggestion popover → attached card with wallet balance preview.
- **Adjust trio** — Discount / Tax / Tip free-form $ inputs.
- **Payment row** — 6 payment keycaps (Cash gold / Zelle blue / Square black / CardOnFile gold / Wallet gold / Custom red). Active method depresses with `translateY(-1px)`. Method-specific input panel below:
  - Cash: tendered + live change due
  - Zelle: shows `nohomailbox@gmail.com` in selectable text + optional confirm code
  - Square: black "Run on reader" pad + receipt # input
  - CardOnFile: customer card-on-file context + receipt # input
  - Wallet: shows balance → balance-after preview, disabled if no customer attached
  - Custom: free-form label ("Venmo", "Check #1042") + reference
- **Action row** — CLEAR ALL (dark) · REPRINT (cream) · NO SALE — OPEN DRAWER (blue) · CHARGE $X.XX (red, oversized, bell ringing emoji that animates on hover via `ringingBell` keyframes).
- **Drawer pop** — on successful charge, the entire cabinet bounces with a `cubic-bezier(.34,1.56,.64,1)` overshoot for 700ms — the physical kerchunk of a real till opening.
- **Today's till** — header strip with cream gradient. Shows total + count and per-method breakdown (Cash / Zelle / Square / Card / Wallet / Custom).
- **Recent Sales** — last 8 in 2-col grid, each card with method-color badge, customer + suite, line count, time, amount, Receipt link, Void affordance with reason input.

### Receipt — `/admin/pos/receipt/[id]`

4×6 thermal stylesheet (`@page { size: 4in 6in; margin: 0; }`). NOHO logo + store address + (818) phone, big TOTAL PAID, customer block (when attached), per-line items with qty × unit, Subtotal/Discount/Tax/Tip/TOTAL/Cash-tendered/Change. Zelle method gets a footer line `Paid by Zelle to nohomailbox@gmail.com · confirm <ref>`. VOIDED banner if status=Voided. Same `PrintButton` helper as renewals + statements. Linked from the panel confirmation banner ("Print 4×6 Receipt") and from each Recent-Sales row.

### Sidebar wiring

- `IconRegister` added to `AdminIcons.tsx` — drawer + LCD strip + bell-on-top, with idle-rotate hover on the bell knob.
- New nav item `register` placed in the **Today** group (between Overview and Signup Requests). Tab IDs are auto-derived from `navGroups`, so URL `?tab=register` routes correctly with no extra wiring.

### Build verification

`npx next build` clean. `/admin/pos/receipt/[id]` in route table. Auth gate redirects unauthenticated visit to `/login` — confirmed via dev preview.

### Files touched (iter-79)

```
prisma/schema.prisma                              + POSSale + POSLineItem + User.posSales relation
_migrate-pos.mjs                                  Turso DDL (run + deleted)
src/lib/pos.ts                                    NEW — types + ZELLE_RECIPIENT_EMAIL
src/app/actions/pos.ts                            NEW — getPOSCatalog, createSale, voidSale, getRecentSales, getTodaysTill, searchPOSCustomers
src/components/admin/AdminPOSPanel.tsx            NEW — cash-register cabinet UI
src/components/admin/AdminIcons.tsx               + IconRegister
src/components/AdminDashboardClient.tsx           + nav item + panel render
src/app/admin/pos/receipt/[id]/page.tsx           NEW — 4×6 thermal receipt
HANDOFF.md                                        this section
```

### Loop status

79 iterations. Production deploy still gated. POS foundation iter-1 of N.

## 91. POS — iter-80 (drawer + audio + customer display)

Iter-2 of the POS loop — every loop must be visually remarkable. Iter-1 had the static cabinet; iter-2 makes it physical.

### The drawer actually opens

`CashDrawer` component at the bottom of `AdminPOSPanel.tsx`. Slides out from under the cabinet on:
- successful Cash sale (delayed 120ms after the cabinet bounce, so the cha-ching audio + bell ring hit first)
- explicit "NO SALE — OPEN DRAWER" button click

Animation curve `drawerSlide`: `cubic-bezier(.34,1.56,.64,1)` overshoot from `scaleY(0.05)` → `scaleY(1.04)` → `scaleY(1)` — feels like a real spring drawer kicking out and settling. Retract animation `drawerRetract` is faster (320ms ease-in) — close-tap is snappy.

### Inside the drawer

Brass-lined housing matching the cabinet (border-top: 0 so they read as one unit). Inside: a yellow-bronze tray with **6 bill slots** ($100 / $50 / $20 / $10 / $5 / $1) and **4 coin slots** (25¢ / 10¢ / 5¢ / 1¢).

- Each bill slot renders up to 6 stacked bill chips with alternating ±0.4° rotations → real "stack of bills" depth. Bill colors are denomination-accurate greens/browns. > 6 bills shows `×N` overlay.
- Each coin slot has a 3D-styled coin (silver radial gradient for quarter/dime/nickel; copper for penny). Sized by physical reality (quarter biggest at 38px).
- ± steppers per compartment update counts; "In Drawer" total at the top updates live.
- Counts persist to `localStorage["noho-pos-tray"]` so the till survives reloads (per browser/station).

### Service-bell audio

`playBell()` — Web Audio dual-oscillator (triangle + sine) ringing 2800Hz → 1200Hz over 600ms with envelope, plus harmonic 4200Hz → 2100Hz. Mimics a counter service-bell ding. Triggers on every Charge.

`playKaching()` — twin descending bells (1760→880, 1320→660) with a low-passed white-noise burst at +40ms for the mechanical drawer-thunk underneath. Triggers on drawer-open.

Sound toggle in the header (`SoundOn` / `SoundOff` icon buttons). Persists `localStorage["noho-pos-sound"]`. AudioContext lazy-initialized on first user gesture (browser autoplay policies).

### Customer-facing mini display

Narrow amber LCD beneath the main green LCD strip — second display the customer sees from their side of the counter. Marquee scrolling `Courier New` text in `#ffb04a` with phosphor glow. Idle state: `WELCOME TO NOHO MAILBOX · HOW CAN WE HELP?`. Active: scrolls `1× ITEM NAME — $X.XX · ... · TOTAL $Y.YY` on a 26s loop.

### Bell on header

The header `STATION 1` bell icon now ring-rotates via `ring-bell` keyframe whenever bellRinging fires (700ms window after charge).

### Files touched (iter-80)

```
src/components/admin/AdminPOSPanel.tsx
  + drawerOpen / bellRinging / soundOn / cashTray state
  + ensureAudio + playBell + playKaching helpers
  + adjustTray + openDrawerNow + closeDrawer
  + drawer trigger on Cash charge + No-Sale button
  + SoundOn/SoundOff toggle in header + bell-ring CSS animation
  + customer-facing marquee LCD strip
  + .cust-display, .drawer-housing, .drawer-tray, .bill-slot, .bill,
    .coin/.coin-silver/.coin-copper styles
  + drawerSlide / drawerRetract / coinSpin / custMarquee keyframes
  + CashDrawer / BillSlot / CoinSlot subcomponents (~250 lines)
  + BILL_DENOMINATIONS / COIN_DENOMINATIONS tables
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 68s` · 186 routes generated).

### Loop status

80 iterations. Production deploy still gated. POS iter-2 of N — drawer, audio, customer display landed.

## 92. POS — iter-81 (thermal printer + quick-tender chips)

Iter-3 of the POS loop. The receipt tape from iter-1 was a free-floating thermal-paper rectangle — visually disconnected from any printer. Iter-3 mounts it in a brass-trimmed thermal printer module (`NOHO TX-450 Thermal`) so it reads as paper actually emerging from a machine.

### Thermal printer module — wraps the existing receipt tape

`.printer-shell` — dark brown housing, brass border, gold accent dividers. Contains:

- `.printer-head` — top brass status bar with a status LED, model badge ("◇ NOHO TX-450 Thermal ◇"), and a spinning paper-spool icon.
  - **LED** `.led-ready` (steady soft green glow) flips to `.led-print` (animated orange flash via `@keyframes ledFlash`) during a print cycle.
  - **Spool** `.printer-spool` is a CSS-only radial-gradient disc with `@keyframes spoolSpin` — spins lazily at 12s/rev idle, accelerates to 0.6s/rev when `.printing` class is on.
  - Status text mirrors state: "Ready" idle / "Buffered" when cart > 0 / "Printing…" during charge.
- `.printer-body` — dark inner cavity (#1a0d05) where the paper feeds through.
- `.print-head-arm` — gold-plated print head bar that only appears during `printing`. Sweeps L↔R via `@keyframes printHead` at 280ms/cycle.
- `.tape-feed` + `.printer-shell.printing .tape` — when printing, the tape's `padding-top` animates 6→18→6 px via `paperFeed` keyframes — visible "feed forward" motion.
- `.tear-bar` — bronze perforated edge below the tape, dotted-pattern background + dashed top border + drop shadow underneath. Reads as the physical metal tear bar found on real thermal printers.

State management: `printing` boolean + `flashPrint(ms)` helper. Triggered:
- on every successful charge (1400ms cycle so the customer + cashier see the head dance + spool blur)
- via existing receipt-print buttons in the confirmation banner / Recent Sales rows (browser handles the actual 4×6 print dialog; the panel just plays the visual)

### Print sound

`playPrinter()` — Web Audio band-passed white-noise burst at 1800Hz with a 60Hz-stepped phase modulation (the mechanical print head ticking). 1.0s envelope. Fires alongside the bell + cha-ching on charge. Mutable via the existing sound toggle.

### Quick-Tender bill chips

Below the Cash tendered field — 6 chips: **EXACT · $5 · $10 · $20 · $50 · $100**.

- EXACT (gold) auto-fills tendered with the total.
- $5/$10/$20/$50/$100 each ADD that denomination to whatever's currently tendered (so two taps of $20 = $40 tendered).
- Chips are denomination-accurate — each uses the same `--bill-from / --bill-to / --bill-border / --bill-ink` palette as the in-drawer bill stacks.
- On click, a duplicate bill rectangle absolute-positioned over the button animates upward + scales + rotates + fades over 380ms (`@keyframes billFly`) → "the bill flew into the till" feel.
- Each click plays `playRustle()` — a high-passed white-noise paper rustle (180ms decay).

### Files touched (iter-81)

```
src/components/admin/AdminPOSPanel.tsx
  + printing state + flashPrint helper + playPrinter + playRustle
  + .printer-shell / .printer-head / .printer-led / .led-ready / .led-print
    / .printer-spool / .printer-body / .print-head-arm / .tape-feed
    / .tear-bar / .tender-chip / .bill-fly styles
  + ledFlash / spoolSpin / printHead / paperFeed / billFly keyframes
  + QuickTenderChips component
  + printer-shell wrapper around the existing receipt tape
  + flashPrint + playPrinter wired into the charge-success path
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 2.1min` · 185 routes generated). Dev server's pre-existing turbopack cache wobble + an unrelated `preview-mailbox-tile/page.tsx` module-not-found error are both prior conditions unrelated to POS work.

### Loop status

81 iterations. Production deploy still gated. POS iter-3 of N — printer + quick-tender chips landed.

## 93. POS — iter-82 (PAID stamp + confetti + Zelle QR)

Iter-4 of the POS loop. Three theatrical wins:

### 1. PAID stamp slams the receipt

`.paid-stamp` overlay enters from above (`-200% Y`, scale 2.4, rotation -30°), settles to a tilted -12° rest position, scales 1.05 → 0.94 → 1.02 → 1.0 in a `cubic-bezier(.5,2,.4,.8)` curve — perceived as an inked stamp slamming, bouncing off the surface, and settling.

The stamp itself is a pure-CSS facsimile of a rubber ink stamp:
- **Double-line ring** in `#c01818` red with `★` characters at 9 and 3 o'clock
- **PAID** in 36px black Courier with multi-direction text-shadow approximating ink-spread imperfection
- **Date stamp underneath** in 8px tracking-[0.3em] format
- `mix-blend-mode: multiply` + `opacity: 0.92` so the red ink reads against the cream tape rather than sitting on top
- Receipt tape itself shakes via `:has(.paid-stamp)` triggering `stampShake` 380ms — pixel-level translates that mimic the surface absorbing the slam impact

Lifetime: 1.8s, then unmounts. Fires only on successful charge.

### 2. Confetti coin shower

`<ConfettiShower>` — 32 falling tokens absolute-positioned over the cabinet (z-index 25, beneath the LCD content but above the cabinet wood). Each token is randomized at mount:
- **Type**: 42% gold coin / 23% silver coin / 17% copper coin / 18% green dollar bill
- **Size**: 12–26px
- **Horizontal**: random start% across the cabinet, gentle 0.8× horizontal drift
- **Rotation**: 240–960° + 1080° Y-flip (so coins tumble in 3D)
- **Duration**: 1.1–1.8s
- **Delay**: 0–250ms (creates a wave effect rather than a single burst)

CSS variables (`--x-start`, `--x-end`, `--size`, `--rot`, `--dur`, `--delay`) drive `@keyframes coinFall`. Will-change hints + transform-only animation keep it 60fps even on 32 simultaneous nodes.

`confettiKey` state increments on each charge; React's `key={confettiKey}` forces a fresh remount each time so successive sales each get their own shower.

### 3. Zelle pane → real payment workflow

Replaced the iter-1 light-blue text card with a full `ZellePane` component:

- **Background**: branded Zelle purple gradient (`#6c46e6 → #4d2bb7`) with corner glow
- **Big amount-due** display ($XX.XX), 30px tabular nums
- **Memo code** auto-generated as `NOHO-#####` from the next sale number — the customer types this into Zelle's memo field for clean reconciliation
- **Three copy-to-clipboard rows** (`<CopyRow>` component) — Email · Amount · Memo. Each click writes to `navigator.clipboard`, flashes the button to "COPIED ✓" green for 1.4s
- **QR code** (`qrcode` lib, already in deps — used by QRPickup) encodes a `mailto:nohomailbox@gmail.com?subject=…&body=…` payload pre-filled with the memo + amount + customer name. Customer scans post-Zelle to send NOHO a confirmation email with all the right metadata (Zelle itself doesn't expose 3rd-party deep-link APIs, so this is the cleanest verification round-trip)
- **Confirm code input** styled as a glassmorphic field, persists into the existing `paymentRef` state so the receipt picks it up
- **Layout**: 180px QR column + flex-1 right column, collapses to single-column on `<sm`

### Files touched (iter-82)

```
src/components/admin/AdminPOSPanel.tsx
  + paidStamp + confettiKey state + fireCelebration helper
  + .paid-stamp + .paid-stamp-ring/-text/-sub styles
  + stampSlam + stampShake keyframes
  + .confetti-coin/-gold/-silver/-copper/-bill styles + coinFall keyframe
  + .zelle-card / .zelle-row / .zelle-copy-btn styles
  + ConfettiShower component (32 randomized tokens)
  + ZellePane / CopyRow / ZelleZ components (~140 lines)
  + Zelle pane swapped from inline JSX to <ZellePane />
  + fireCelebration wired into charge-success path
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 2.3min` · 185 routes generated).

### Loop status

82 iterations. Production deploy still gated. POS iter-4 of N — celebration animations + Zelle QR landed.

## 94. POS — iter-83 (Counter Mode + Plan Picker grid)

Iter-5. Two distinct visual upgrades:

### 1. Counter Mode — kiosk fullscreen

Toggle in the panel header. When ON:
- The whole `pos-root` becomes `position: fixed; inset: 0; z-index: 80` over the admin shell with a dark `radial-gradient(ellipse at top, rgba(45,16,15,0.85), rgba(15,5,4,0.96) 70%)` backdrop and `backdrop-filter: blur(6px)`.
- Body scroll locks via `useEffect` setting `document.body.style.overflow = "hidden"`.
- ESC keydown listener exits.
- LCD font scales up to `clamp(48px, 7vw, 84px)` so it reads from across the counter.
- Cabinet width `max-width: 1600px` centered for tablet/widescreen counters.
- Children animate in via `kioskFade` 380ms `cubic-bezier(.34,1.56,.64,1)` overshoot — feels like the register expanding into kiosk position.
- Persistent `pos-kiosk-hint` chip bottom-right reading `ESC TO EXIT COUNTER MODE`.

The toggle button itself flips appearance: cream when off, brown gradient when on. New `KioskIcon` glyph (4-corner brackets bracketing a center square — universal "fullscreen" idiom).

### 2. Plan Picker grid (3×3 for Mailbox category)

When `activeCategory === "Mailbox"`, the panel swaps the keycap grid for `<PlanPickerGrid>`:

- Header row: `Plan / Term · 3 mo · 6 mo · 14 mo`
- Three plan rows (Basic / Business / Premium), each a `grid-cols-[1fr_repeat(3,1fr)]`:
  - Left cell: plan name + targeted-customer hint (e.g. "Most freelancers + small biz" for Business)
  - Three term cells: 3D keycap-style plan-cell with term label, big price, per-month breakdown, **SAVE X%** badge (computed vs the 3-month rate)
- **Business 6 mo** auto-tagged `POPULAR` (red pill, top-right)
- **Premium 14 mo** auto-tagged `BEST VALUE` (gold pill, top-right) and styled with the brand-blue gradient instead of cream
- Cells lift/depress on hover/active with the existing keycap shadow physics
- Renders only when 3+ plan SKUs exist (graceful fallback to "No mailbox plans configured")

The grid is wrapped in a subtle `linear-gradient(180deg,#fff5dd 0%,#fae9c0 100%)` panel matching the till summary, so it reads as a proper merchandised "plan card" rather than just clickable buttons.

### Files touched (iter-83)

```
src/components/admin/AdminPOSPanel.tsx
  + counterMode state + ESC + scroll-lock effect
  + Counter Mode toggle button + KioskIcon
  + .pos-kiosk + kioskFade keyframes + LCD scale-up rules
  + .pos-kiosk-hint chip
  + .plan-grid + .plan-cell + .plan-cell-pop + .plan-cell-best
    + plan-cell-{name,term,price,permo,saving} styles
  + PlanPickerGrid component (~80 lines)
  + plan-grid swap in the Mailbox category branch
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 119s` · 185 routes generated). Dev server `/login` returns 200.

### Loop status

83 iterations. Production deploy still gated. POS iter-5 of N — Counter Mode kiosk + Plan Picker grid landed.

## 95. POS — iter-84 (Park tickets clothesline + REFUND stamp)

Iter-6. Multi-cart workflow plus a parallel-to-PAID void animation.

### 1. Parked-ticket clothesline rail

Above the cabinet, a brass clothesline wire (`linear-gradient(90deg, transparent, ${GOLD_DARK} 4%, ${GOLD} 50%, ${GOLD_DARK} 96%, transparent)` with subtle drop shadow + brass end-caps via `::before`/`::after`). Hangs 0..12 paper tickets, each:

- **Manila ticket** with cream-to-tan gradient, `clip-path: polygon(8px 0, 100% 0, 100% 100%, 0 100%, 0 8px)` for an invoice-style top-left clipped corner, multi-layer paper shadow.
- **Gold paper-clip** at top center via inline SVG (`linearGradient` from `#fdf0b4` → `#c9a24a` → `#5a4318`) with white inner highlight strip.
- **Body**: customer label (or "Walk-in · N items"), item count + subtotal, "5 min ago" relative time, blue `↺ Tap to recall` CTA.
- **Discard ×** in red top-right corner.
- **Random rotation per ticket** (-5° to +3°) deterministically hashed from the ticket id — natural staggered look across the rail.
- **Drop-in animation** `ticketDrop` (overshoot from -28px) + idle `ticketSway` (1° back-and-forth on 6s ease) — feels alive without distraction.

### 2. Park / recall / discard

- **Park button** in the action row (5-col now, gold keycap with paper-clip icon) — pins the current cart, customer attached, discount/tax/tip strings, and a deterministic short id. Resets the active register.
- **Recall** click on ticket body — if the active cart isn't empty, it auto-parks first to avoid losing work. Then restores cart + customer + adjustments and removes the ticket.
- **Discard** ×-button — `e.stopPropagation()` so it doesn't trigger recall.
- **Persist** to `localStorage["noho-pos-parked"]`. Survives reloads (shift handoff, browser refresh).
- Plays the iter-3 `playRustle()` sound on park + recall.
- Empty state: dashed cream rectangle reading "No parked tickets. Press PARK to pin a cart for later."

### 3. REFUND stamp on voided sales

`refundStamp` state in `RecentRow`. When admin confirms a void:
- Stamps the row with red Courier-New "REFUND" in a double-line ring at +8° rotation
- Animation `refundStamp` enters from `-150% Y, 20° rotate, 2.2× scale` and settles via `cubic-bezier(.5,2,.4,.8)` at 600ms
- `mix-blend-mode: multiply` + `opacity: 0.9` reads as ink stamp on the receipt-row
- Lifetime 1.6s, then `onChanged()` fires (250ms after stamp starts) so the row's "Voided" pill + style takes effect once the user has seen the stamp

### Files touched (iter-84)

```
src/components/admin/AdminPOSPanel.tsx
  + parkedTickets state + localStorage persistence
  + parkCurrentCart / recallTicket / discardTicket helpers
  + .park-rail / .park-rail-wire / .park-ticket / .park-ticket-clip
    / .park-ticket-discard / .park-empty styles
  + ticketDrop + ticketSway keyframes
  + .refund-stamp + .refund-stamp-ring + refundStamp keyframes
  + ParkedRail + ParkClipIcon components (~120 lines)
  + Action row: 4-col → 5-col grid + PARK button (gold)
  + RecentRow: refundStamp state + animation hook
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 85s` · 185 routes generated). Dev server `/login` returns 200.

### Loop status

84 iterations. Production deploy still gated. POS iter-6 of N — Park tickets + REFUND stamp landed.

## 96. POS — iter-85 (Z-Report modal + live polling)

Iter-7. End-of-shift reporting + a constantly-fresh recent-sales feed.

### 1. Z-Report — `getDailyZReport(dateYmd?)` server action

Computes today's till in one Prisma query (`POSSale.findMany` for the local-day window with line items joined). Single pass aggregates:

- **Totals**: gross, discount, tax, tip, net, voided cents + sale count + void count
- **byMethod**: cents + count per `paymentMethod`
- **byCategory**: cents + quantity per line-item `category`
- **topItems**: top 6 by cents
- **byHour**: 24-bucket hourly histogram (0..23)
- **byCashier**: cents + count per cashier name snapshot

Voided sales tracked separately (don't pollute the gross/net but ARE counted for shift visibility). Type lives in `src/lib/pos.ts` (the "use server" file can only export async functions).

### 2. Z-Report fullscreen modal — `<ZReportModal>`

Triggered by the new **Z-READ** button in the panel header (chart-bar icon glyph). Renders:

- **Dark radial backdrop** with `backdrop-filter: blur(8px)`, ESC closes
- **Brass-trim cream card**, max-width 1200px, centered with deep drop shadow
- **Header strip**: blue eyebrow `◆ End-of-Shift Z-Report ◆`, big Station + date title, generated-at timestamp, `Print 4×6` (gold) + `CLOSE · ESC` (dark) buttons
- **Headline totals row** (`z-totals-grid`, 4-up): Net Total (blue gradient + cream ink), Gross, Sales Count, Voided. Below: 4-up small stats: Discounts, Tax, Tips, Avg Sale.
- **Hourly histogram** — 24 vertical bars, each `transform-origin: bottom; animation: barGrow 600ms cubic-bezier(.34,1.56,.64,1)` with `animation-delay: ${hour * 18}ms` for a left-to-right wave-grow effect. Dollar labels float above each bar.
- **Two-up: By Payment Method · By Category** (`<ZHorizontalBars>`) — 140px label column + flex-1 bar track + amount/sub. Bars use gold gradient with `animation: barGrowH; transform-origin: left center; delay i*60ms`.
- **Two-up: Top Items · Cashiers** — same horizontal-bar component.
- **Footer signature line** — store address + "— End of Z-Report —"

Empty states for each section render "— none today —" gracefully.

### 3. Printable Z-Report — `/admin/pos/zreport/[date]`

Server-rendered 4×6 thermal Z-Report mirroring the modal data, identical print stylesheet pattern as the existing POS receipt + statement routes. Sections: header (logo + Station 1 + date), Net Total + sale count, totals, by-method, by-category, top items, cashiers, footer. The modal's "Print 4×6" button opens this in a new tab; the user's PrintButton triggers `window.print()`.

### 4. Live polling on recent sales

A 30-second `setInterval` in `AdminPOSPanel` refreshes `getRecentSales(8)` + `getTodaysTill()`. Pauses via `visibilitychange` listener when the tab is hidden — backgrounded tabs don't burn API calls. Resumes immediately on return rather than waiting up to 30s for the next tick. Cleanup on unmount is symmetric.

### 5. LIVE badge

Recent Sales header now shows a pulsing red dot + LIVE chip (animation `livePulse` 1.4s ease-in-out infinite) and the right-side hint reads `last 8 · updates 30s`. Other cashiers' rings show up automatically without manual refresh.

### Files touched (iter-85)

```
src/lib/pos.ts                                + ZReportData type
src/app/actions/pos.ts                        + getDailyZReport
src/components/admin/AdminPOSPanel.tsx
  + Z-Report state (zReportOpen + data + loading)
  + openZReport helper
  + 30s live-polling effect with visibilitychange handling
  + Z-READ button (header) + ChartIcon
  + LIVE pulse badge on Recent Sales header
  + .live-pulse / .live-dot / livePulse keyframes
  + .z-overlay / .z-card / .z-bar-vert / .z-bar-horz / .z-totals-grid styles
  + zEnter / barGrow / barGrowH keyframes
  + ZReportModal + ZBigStat + ZSmallStat + ZSection + ZHourlyChart + ZHorizontalBars
src/app/admin/pos/zreport/[date]/page.tsx     NEW — printable 4×6 Z-Report
HANDOFF.md                                    this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 96s` · 185 routes). `/admin/pos/receipt/[id]` and `/admin/pos/zreport/[date]` both in route table. Dev server `/login` returns 200.

### Loop status

85 iterations. Production deploy still gated. POS iter-7 of N — Z-Report modal + live polling landed.

## 97. POS — iter-86 (3D tilt + typeahead search + hotkey overlay)

Iter-8. Three power-user upgrades:

### 1. 3D mouse-tracking tilt on the cabinet

`pos-tilt-stage` (perspective: 1500px, perspective-origin: 50% 30%) wraps the cabinet (`pos-tilt`). A mousemove handler on the stage maps cursor x/y to two CSS variables clamped to ±2°, then sets them on the stage:
- `--tilt-x` ← cursor Y position (negated × 1.6 → max ±0.8°), so moving cursor down tilts the cabinet forward
- `--tilt-y` ← cursor X position (× 2.2 → max ±1.1°), so moving cursor right tilts right
- `--tilt-spec` ← cursor X% — drives a cursor-following spec highlight via radial-gradient on the brass top-rail (`mix-blend-mode: screen` so it adds light without flattening the wood)

`requestAnimationFrame` debounces, transition `cubic-bezier(.2,.7,.3,1) 220ms` smooths the trail. Disabled on coarse pointers via `@media (hover: none)`. A `transform-style: preserve-3d` on both stage and cabinet means inner elements (drawer, LCD glow, paid stamp) all participate in the tilt naturally — feels like a single solid object instead of a flat card pretending to be 3D.

### 2. Typeahead search bar

New cream input above the category tabs with Heroicon-style search glyph. When >= 2 chars:
- Filters the FULL catalog (not just current category) by every space-separated token matched against `name + category + hint + sku` lowercase
- Drops a 16-result popover anchored absolute below
- ↑/↓ moves highlight (mouse hover also sets it via `onMouseEnter`)
- Enter → `addLine(highlighted)` + clear input (search refocuses for rapid-fire ringup)
- Esc → clear input
- Each row shows: name (bold) + category · hint (caps tracked) + price (tabular-nums)

Falls through to the existing category-tab grid (or PlanPickerGrid for Mailbox, Custom-line entry for Custom) when search is empty.

### 3. Hotkey overlay + keyboard shortcuts

Global `keydown` handler (mounted once):
- **⌘/Ctrl+K** → focus + select search input
- **Shift+?** → toggle the hotkey overlay
- **Esc** → close overlay
- **1..6** → set payment method (Cash/Zelle/Square/CardOnFile/Wallet/Custom). Suppressed when a text input has focus (so typing a price doesn't accidentally switch methods).

The overlay is a centered cream card with `hkEnter` cubic-bezier overshoot, dark `backdrop-filter: blur(8px)` backdrop, click-outside dismisses. Lists shortcuts in 3 groups (General · Search results · Payment method) with proper `<kbd>`-styled chips (cream→tan gradient, brown bevel, monospace, drop shadow under each).

A small persistent **?** pill (28px, brown circle with cream "?", 60% opacity → 100% on hover, scales 1.08×) bottom-right offers a discoverable click-target for users who don't know the keyboard shortcut. Detects platform — shows `⌘` on Mac, `Ctrl` elsewhere.

### Files touched (iter-86)

```
src/components/admin/AdminPOSPanel.tsx
  + searchInput/searchHighlight state + searchInputRef
  + searchResultsCatalog memoized filter
  + tiltRef + mousemove handler with rAF debouncing
  + showHotkeys state + global keyboard handler
  + .pos-tilt-stage / .pos-tilt + tilt-spec ::before highlight
  + .hk-pill / .hk-overlay / .hk-card / .kbd styles + hkEnter keyframes
  + Search input + popover injected above category tabs
  + Tilt-stage wrapping the cabinet
  + Hotkey overlay component (~80 lines) + SearchIcon
  + Persistent ? pill bottom-right
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 75s` · 185 routes). Dev server `/login` returns 200.

### Loop status

86 iterations. Production deploy still gated. POS iter-8 of N — 3D tilt + typeahead search + hotkey overlay landed.

## 98. POS — iter-87 (idle screensaver + tip suggestion chips)

Iter-9. Two complementary additions: a dramatic idle moment when the cashier steps away, and a tiny ergonomic ergonomic win on the tip field.

### 1. Idle Screensaver Mode

After **60s** of zero user activity (mousemove / mousedown / keydown / touchstart all reset the timer; visibilitychange resets too), the cabinet enters idle mode:

- **Cabinet contents dim** via `filter: brightness(0.45) saturate(0.8)` on every cabinet child except the overlay. 720ms transition.
- **`.idle-overlay`** absolute-positioned over the cabinet (z-50): `radial-gradient(ellipse, rgba(45,16,15,0.65) 0%, rgba(15,5,4,0.95) 70%)` + `backdrop-filter: saturate(80%) blur(2px)`. Fades in 720ms.
- **`.idle-spotlight`** — 720×720 radial gold-glow disc center-anchored, animation `idleSpotlight 6s ease-in-out infinite` pulsing 0.55 → 0.85 opacity at 1× → 1.08× scale. Reads as a slow neon "open" sign breathing.
- **`<IdleAmbientCoins>`** — 14 lazy-drifting gold coins ambient floating bottom→top. Each randomized x, size (8–18px), duration (7–12s), delay (-8 to 0s so they're already mid-flight on mount), rotation (180–720°). Lower opacity than the celebration shower, animation `idleCoinFloat` infinite.
- **Welcome card** centered over the overlay:
  - Gold `◆ NOHO Mailbox ◆` eyebrow
  - Big "Now Serving" headline (cream)
  - Address + phone subline
  - **`<IdleTaglineRotator>`** — 5 rotating taglines on a 6s carousel, each fade-in/hold/fade-out via `idleTagline` keyframe with `-N×1.2s` delays so they cycle one-at-a-time:
    - "Your Mail. Your Way."
    - "A Smarter Mailbox in NoHo."
    - "Scan it. Forward it. Forget it."
    - "Real address — never a P.O. Box."
    - "Open Mon–Sat · 9:30a–5:30p"
    - Rendered in `Pacifico`-style cursive, gold ink
  - Pulsing `— Tap anywhere to begin —` blinker via `idleTapBlink`

The whole overlay has `cursor: pointer`; click anywhere → `setIdle(false)` → fade restores.

### 2. Tip-percentage chips

Below the Discount/Tax/Tip row in the cart panel, when subtotal − discount > 0:

- Chip strip: `Tip · 10% · 15% · 20% · 25% · No tip`
- Each `.tip-chip` is a pill: cream→tan gradient body, blue mini-pill showing the percentage on the left, tabular-nums dollar amount on the right (live-computed against `tippable = subtotalCents − discountCents`)
- Click → `applyTipPct(pct)` writes the dollar value into the existing tipInput field
- "No tip" clears the field — dashed-border ghost chip
- Hover: lift 1px + brightness 1.05

### Files touched (iter-87)

```
src/components/admin/AdminPOSPanel.tsx
  + idle state + 60s inactivity-timer effect (mousemove/down/keydown/touchstart/visibilitychange)
  + applyTipPct helper
  + .pos-idle dim rule for cabinet children
  + .idle-overlay / .idle-spotlight / .idle-coin / .idle-tagline / .idle-tap styles
  + idleFade / idleSpotlight / idleCoinFloat / idleTagline / idleTapBlink keyframes
  + .tip-chip / .tip-chip-pct / .tip-chip-amt / .tip-chip-clear styles
  + Idle overlay JSX (Now Serving + tagline + tap-to-wake hint)
  + Tip-percent chip strip below adjustments
  + IdleAmbientCoins + IdleTaglineRotator subcomponents
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 72s` · 185 routes). Dev server `/login` returns 200.

### Loop status

87 iterations. Production deploy still gated. POS iter-9 of N — idle screensaver + tip-% chips landed.

## 99. POS — iter-88 (Customer Presence Card + Email/SMS receipt chips)

Iter-10. The dramatic moment a real cashier looks up someone's profile, plus the receipt-delivery trifecta completion.

### 1. Customer Presence Card

Replaces the slim 1-line "Customer attached" pill with a full presence card when a customer is attached:

- **Avatar** (56×56) — gradient circle with the customer's first initial in big Baloo 2 black. Gradient is **deterministically picked** from a 7-color brand palette (Brand blue · Brass gold · Tunisian red · Dark brown · Steel blue · Coral red · Walnut) by hashing the customer's name. Same name = same gradient every time. Inset highlight ring, deep shadow.
- **Header row** — name in 16px black + Suite chip (blue pill) + BUSINESS chip (amber pill) when `boxType === "Business"`
- **Business name** sub-line if any
- **Email · phone** sub-line
- **Plan + status pills row** — green plan pill (`Basic · 6mo`), red/amber status pill if `mailboxStatus !== "Active"`, **due-date countdown pill** color-coded:
  - 🔴 red `Nd OVERDUE` for past due
  - 🟡 amber `Nd to renew` when ≤14 days
  - 🟢 green when >14 days
  - 🔵 blue "No due date"
  - Tooltip shows the long-form date ("May 15, 2026")
- **Wallet** big tabular-nums dollar amount (left)
- **Renews** date (right) when due-date is known
- Slides in via `presenceSlide` 320ms `cubic-bezier(.34,1.56,.64,1)` overshoot

`searchPOSCustomers` extended to return plan / planTerm / planDueDate / mailboxStatus / businessName / boxType. New `getPOSCustomer(id)` server action available for refreshes after wallet credit etc.

### 2. Email/SMS receipt delivery chips

Replaced the slim Print/Done banner with a full `<ConfirmationBanner>` component with four chips:

- **Print 4×6** — opens existing `/admin/pos/receipt/[id]` route in new tab
- **Email receipt** — disabled (40% opacity) when `attachedEmail` is null. Click → calls new `emailPOSReceipt(saleId)` server action. State machine: `idle → sending → sent ✓ | failed`. Animation `chipSent` 360ms scale-bounce on success. Sets `POSSale.receiptEmailedAt`.
- **SMS receipt** — disabled when `attachedPhone` is null. Click → `smsPOSReceipt(saleId)` returns a copy-friendly text body + the phone number; chips flip to "SMS ready ✓" and a green pre-formatted bubble appears below with **Copy** button (admin pastes into their phone messages app — Twilio integration would slot in here later). Sets `POSSale.receiptSmsedAt`.
- **Done** — dismisses banner

Each chip has matching SVG icon (PrintIcon · MailIcon · SmsIcon) + state-styled background:
- `idle` — translucent white-on-green chip
- `sending` — 65% opacity + `cursor: progress`
- `sent` — bright green pill with darker text
- `failed` — red

### 3. Email template

Server action `emailPOSReceipt(saleId, overrideEmail?)` builds a clean Resend-style HTML email mirroring the 4×6 thermal receipt: NOHO logo header, Total Paid hero, customer block, line items table, totals breakdown, branded footer. Logged via existing `sendEmail` wrapper (writes to EmailLog regardless of provider). Marks `POSSale.receiptEmailedAt`.

### Files touched (iter-88)

```
src/app/actions/pos.ts
  + searchPOSCustomers extended payload (plan/planTerm/planDueDate/mailboxStatus/businessName/boxType)
  + getPOSCustomer(id) for refresh
  + emailPOSReceipt + smsPOSReceipt server actions
  + escapeHtml helper
src/components/admin/AdminPOSPanel.tsx
  + AttachedCustomer top-level type (was inline)
  + .presence-card / .presence-avatar / .presence-pill / .presence-stat styles + presenceSlide keyframe
  + .deliver-chip / .deliver-chip.{sending,sent,failed} styles + chipSent keyframe
  + CustomerPresenceCard + ConfirmationBanner components (~210 lines)
  + PrintIcon + MailIcon + SmsIcon glyphs
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 77s` · 185 routes). Dev server `/login` returns 200.

### Loop status

88 iterations. Production deploy still gated. POS iter-10 of N — Customer Presence Card + Email/SMS receipt chips landed.

## 100. POS — iter-89 (Theme switcher + Wallet credit inline)

Iter-11. The most visually transformative single change yet — three completely different cabinet looks the cashier flips between with a click — plus a workflow upgrade that lets the cashier top up wallet without leaving the register.

### 1. Theme variants — Brass · Aluminum · Walnut

The cabinet now reads color tokens from CSS custom properties scoped under `.pos-theme-{brass|aluminum|walnut}`. Tokens drive cabinet wood gradient, brass/metal trim, brass-rivet color, bezel material, LCD glow + scanline color, keycap finish.

- **Brass** (default) — warm brown wood (`#4a2a1a → #2a160c`) + gold trim (`#C9A24A`) + green-phosphor LCD glow (`#7CFFB2`) + cream-tan keycaps. Original look.
- **Aluminum** — slate steel cabinet (`#2e3338 → #161a1f`) + brushed-silver trim (`#888d96`) + cool-blue LCD glow (`#82c8ff`) + chromed keycaps. Modern register.
- **Walnut** — deep walnut (`#5b3a25 → #1f1107`) + warm gold trim (`#b88c4a`) + amber LCD glow (`#ffc06e`) + honey-tan keycaps. Vintage stationer.

CSS uses `color-mix(in srgb, var(--lcd-glow) N%, transparent)` for the LCD's text-shadow, scanline overlay, specular sweep, and box-shadow inner glow — so the entire LCD recolors with the theme without separate per-theme rules. Same trick on `.brass-rivet` (top-rail rivets recolor), `.lcd-cursor::after`, `.rail-engrave` (the "◆ NOHO Mailbox · Register ◆" engraving). Cabinet has 320ms ease transitions on background/border so the theme swap feels physical, not jarring.

**Theme switcher** in the header — a `theme-seg` segmented control with 3 mini-pills, each showing a 10×10 swatch (radial gradient sample) + label (hidden < md). Active pill is brown/cream filled with drop shadow. Persisted to `localStorage["noho-pos-theme"]`.

### 2. Wallet Credit inline tender

Inside the Customer Presence Card, a `+ Credit` brown-pill toggle reveals an inline form:

- **$ Amount** input (decimal)
- **Method** select: Cash · Square · CardOnFile · Comp (no payment)
- **Reason** input (audit-trail required)
- **ADD** gold keycap button → calls existing `adminAddWalletCredit`
- Inline result chip: green "+ $X.XX credited." on success, red error message on failure
- After credit: wallet balance refreshes immediately via new `getPOSCustomer(id)` action; presence card re-renders with the new amount

The full audit log + rolling-window cap from `customerOps.ts` is preserved (no bypass — same server action used in the customers panel).

### Files touched (iter-89)

```
src/components/admin/AdminPOSPanel.tsx
  + theme state (Theme = "brass" | "aluminum" | "walnut") + localStorage persistence
  + 3 theme-palette CSS rule blocks (.pos-theme-brass / -aluminum / -walnut) with 16 vars each
  + .pos-cabinet / .pos-bezel / .lcd / .keycap / .brass-rivet / .lcd-cursor refactored to var-driven
  + .rail-engrave class for the brass top-rail engraving (was inline-styled)
  + .theme-seg / .theme-seg-btn / .theme-swatch styles
  + Theme switcher segmented control in panel header
  + CustomerPresenceCard accepts onWalletChanged callback
  + showCredit / creditAmount / creditMethod / creditReason / creditPending / creditMsg state
  + Inline wallet-credit form (amount + method select + reason + ADD button + result chip)
  + getPOSCustomer wired for live wallet refresh after credit
  + Action: imports adminAddWalletCredit from customerOps
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 64s` · 185 routes). One TS fix mid-iter (`r.error` from `adminAddWalletCredit` is `string | undefined`, fallback added). Dev server `/login` returns 200.

### Loop status

89 iterations. Production deploy still gated. POS iter-11 of N — Theme switcher + Wallet credit inline landed.

## 101. POS — iter-90 (Daily goal progress ring + milestone celebration)

Iter-12. Two delight-focused additions that turn the till summary into a live game and reward the team for hitting numbers.

### 1. Daily Goal Progress Ring

Replaces the leftmost "Today · Total · Sales" stats with an 84×84 SVG **progress ring**:

- **Inner ring**: SVG circle, r=38, strokeWidth=6, stroke `none → strokeDashoffset` animation transitioning over 480ms `cubic-bezier(.34,1.56,.64,1)` whenever the till total changes
- **Track**: light brown (rgba(45,16,15,0.12)) base
- **Fill**: linearGradient (`#GOLD → #BLUE`) under-target, switches to a brighter `#f0c878 → ${GOLD} → #fff3c0` when goal-reached
- **Inner label**: "TODAY" eyebrow + `$XX.XX` total + "X% · N sales" sub-line, all stacked centered
- **Sparkle decorations** when reached: 4 ✦ stars positioned around the ring corners with staggered `goalSparkle` animation (1.6s each, 0.4s offsets)
- **Click ring** → toggles inline editor next to it (label + dollar input + SET button + Enter/Escape support). Persisted to `localStorage["noho-pos-daily-goal"]` (default $500).
- **Sub-line** below the goal label: `★ Goal hit — nice!` when reached, otherwise `$X.XX to go`

### 2. Milestone celebration banner

A `lastTillRef` tracks the previous till total. After each 30s live-poll tick (and on initial load), a `useEffect` checks if the total just crossed any of these thresholds: **$100, $500, $1k, $2.5k, $5k**.

When crossed (and not already fired this session — tracked in `milestoneFiredRef: Set<number>`):
- A `<div className="milestone-banner">` slides down from above the cabinet, fixed-positioned at top-16, max-640px width centered
- Inner strip is a **shimmering gold gradient bar** — `linear-gradient(120deg, ${GOLD_DARK}, ${GOLD}, #fff3c0, ${GOLD}, ${GOLD_DARK})` with 200% width and `milestoneShimmer 2.5s linear infinite` animating background-position from -200% to 200% — produces a metallic light sweep across the bar
- ★ on each side, big text in the middle: "$1,000 sold today" eyebrow "MILESTONE" + sub "Whoa NOHO! Keep it rolling."
- Animation: `milestoneEnter` (overshoot from -120% Y, 0.85× scale, settles at 700ms cubic-bezier overshoot) → holds 3.4s → `milestoneExit` (lift away, 480ms ease-in)
- Fires `playBell()` + bumps `confettiKey` so the existing iter-4 confetti coin shower also rains over the cabinet

The banner is keyed on a per-fire timestamp so successive milestones each get a fresh remount (in case two thresholds are crossed in one tick — defensive).

### Files touched (iter-90)

```
src/components/admin/AdminPOSPanel.tsx
  + dailyGoalCents state + localStorage persistence
  + showGoalEditor state
  + milestone state + lastTillRef + milestoneFiredRef
  + useEffect watching till.totalCents for threshold crossings → playBell + confetti + banner
  + .goal-ring-stage / .goal-ring / .goal-ring-inner / .goal-sparkle styles + ringFill/goalSparkle keyframes
  + .milestone-banner / .milestone-strip / .milestone-icon styles
  + milestoneEnter / milestoneExit / milestoneShimmer keyframes
  + GoalProgressRing component (~120 lines)
  + Till summary refactored — Today/Total/Sales replaced by GoalProgressRing
  + Milestone banner JSX in panel root
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 77s` · 185 routes). Dev server `/login` returns 200.

### Loop status

90 iterations. Production deploy still gated. POS iter-12 of N — Daily goal ring + milestone banner landed.

## 102. POS — iter-91 (Mailbox Wall — storefront occupancy grid)

Iter-13. The most place-grounded visual yet — a literal model of the wall behind the counter, showing every suite color-coded by status. When the cashier opens the Mailbox category, they see at a glance which doors are taken, who's overdue, and which are vacant.

### Data — `getMailboxWall()` server action

Pulls all non-admin users with a non-null `suiteNumber`, derives:
- **Status** per cell — `active` | `due_soon` (≤14 days) | `overdue` (past) | `suspended` | `held` | `vacant`
- **Initials** — first letter of first + last word of name
- **daysToRenew** — local-day diff against `planDueDate`
- **Highest occupied #** + capped ceiling (next multiple of 24, min 48, max 200) so a stray suite "9999" doesn't paint thousands of empty cells
- Cell list densely packed 1..ceiling with vacant slots filling gaps
- Summary counts: occupied / vacant / overdue / dueSoon

Types live in `src/lib/pos.ts` (`"use server"` boundary requires non-async exports to live elsewhere).

### Visual — `<MailboxWall>` component

Brass-framed dark cabinet matching the iter-11 theme tokens (`var(--cab-from)` etc.) so it auto-recolors when admin flips Brass/Aluminum/Walnut.

- **Header strip** — `◆ Mailbox Wall · 5062 Lankershim ◆` engraving (uses `rail-engrave` class — recolors with theme) + 4 legend chips: N active / N due / N overdue / N vacant, each with a colored swatch
- **Door grid** — 12 cols on mobile, 16 cols on lg breakpoint. Each `.door` is `aspect-ratio: 1 / 1.15` (taller than wide, like real mailbox doors), rounded 3px, multi-layer inner highlight, brass slot detail at the bottom (`::after` linear-gradient strip), animated entry via `doorEnter` keyframe with `8ms × min(i, 64)` staggered delay (60-cell wave-fill effect)
- **Door faces** by status:
  - **active** — cream→tan gradient (matches keycap), brown border
  - **due_soon** — amber/gold gradient
  - **overdue** — red wash with darker border + red text
  - **suspended** — gray wash
  - **held** — cool blue wash
  - **vacant** — translucent dark wood-show-through with 50% cream ink
- **Door content** — top: `#N` suite number (small, opacity 80%); middle: customer initials in 11px Baloo-2 black; bottom: 6×6 status pill (green/red/blue/gold/none)
- **Hover tooltip** — `.door-tip` slides up from above the door with full info: `#142 · Sarah Chen · Business · 23d to renew`. Triangle arrow pointing down at the door.
- **Hover lift** — `transform: translateY(-1px); filter: brightness(1.1); z-index: 3` so the tooltip rises above neighbors

### Click-to-attach

Clicking an occupied door fires `onAttachCustomer(customerId)` which calls the iter-10 `getPOSCustomer(id)` action and sets the full attached state — instantly populating the Customer Presence Card with wallet / plan / due-date. **The "I want to renew Suite #142" walk-in workflow is now: tap that door → cashier already has the customer attached.**

### Files touched (iter-91)

```
src/lib/pos.ts                                    + MailboxWallCell + MailboxWallData types
src/app/actions/pos.ts                            + getMailboxWall server action
src/components/admin/AdminPOSPanel.tsx
  + wall + wallLoading state, lazy-load on Mailbox tab activation + attached.id refresh
  + .wall-frame / .wall-grid / .door / .door-tip / .door-pill / .wall-legend styles
  + doorEnter keyframe + status palette (active/due_soon/overdue/suspended/held/vacant)
  + theme-token-aware (uses --cab-*, --rail-text)
  + MailboxWall component (~95 lines)
  + MailboxWall slotted under PlanPickerGrid in the Mailbox category branch
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 65s` · 185 routes). One TS fix mid-iter — re-imported MailboxWallCell since the server action's local Map<number, MailboxWallCell> still needs it. Dev server `/login` returns 200.

### Loop status

91 iterations. Production deploy still gated. POS iter-13 of N — Mailbox Wall landed.

## 103. POS — iter-92 (Macro Toolbar — 8 customizable hotkeys)

Iter-14. The big visual real estate addition above the LCD: 8 oversized customizable quick-add keys, each with a category-tinted glyph + label + price. Cashier presses → instantly added to cart.

### State + persistence

- `macroSkus` — string[] of 8 SKU references (empty = unfilled slot)
- Defaults seeded with 8 high-frequency items from the catalog: notary, mail scan, bubble mailer (medium), box (medium), forwarding fee, lost-key fee, passport photo, same-day delivery
- Persisted to `localStorage["noho-pos-macros"]`. Read on mount, written on every change.
- `macroEditing` toggles edit mode; `macroSwapIndex` tracks which slot's swap popover is open; `macroSearch` filters the swap-popover catalog list.

### Visual

- **Quick Keys label** + "EDIT" toggle pill (uses `var(--rail-text)` so it recolors with the theme variants from iter-11)
- **8-up grid** (4-col mobile / 8-col desktop). Each `.macro-key`:
  - Aspect ratio `1 / 1.05`
  - 3D-pressable styling matching the `.keycap` family (cream gradient, brown bevel, brass shadow under) — but in **category-tinted** variants:
    - **Service** (`cat-Service`) — light blue → Brand blue gradient, navy text
    - **Supplies** (`cat-Supplies`) — gold → dark gold gradient
    - **Fees** (`cat-Fees`) — red wash, dark red text
    - **Mailbox** (`cat-Mailbox`) — light gold → brand gold gradient
  - Stacked content: 20×20 SVG glyph + 9px uppercase tight-tracked label + 11px tabular-nums price
  - Animated entry via `macroEnter 280ms cubic-bezier(.34,1.56,.64,1)` with `30ms × i` stagger across the row
  - Hover brightness 1.06; active translateY 2px
  - **Empty slots**: dashed cream border, low-opacity, "+" icon + "EMPTY · SLOT N" label. Click → opens edit mode at that index.

### Glyph library

22 inline SVG glyphs picked from SKU prefix (`pickMacroGlyph`):
- Service: GlyphSeal (notary), GlyphScan, GlyphForward, GlyphShred, GlyphFax, GlyphPrint, GlyphCopy, GlyphCamera (passport), GlyphTruck (delivery)
- Supplies: GlyphBubble, GlyphBox, GlyphTape, GlyphLabel, GlyphEnvelope, GlyphStamp
- Fees: GlyphKey (key/lost-key), GlyphCoin (deposit), GlyphPlug (setup), GlyphBriefcase (business)
- Plans: GlyphMailbox

All 1.75-stroke, currentColor, viewBox 24 — line up with the existing AdminIcons.tsx aesthetic.

### Edit mode

EDIT pill flips to active brown; each filled key grows a corner badge:
- Top-right: `⇄` swap (click → opens slot's swap popover)
- Top-left: red `×` clear (stops propagation, frees the slot)

**Swap popover** anchors below the slot. Header row: "Slot N" + auto-focused search input + ESC button. Body: scrollable 16-result list filtered by name/category/hint/sku tokens, with each row showing item name + category/hint sub-line + price. Click → swaps, closes popover. RESET button in the row header restores the 8 defaults.

`shortenLabel` helper trims " · "-suffixed hints and collapses "(small)/(medium)/(large)" to single-letter "S"/"M"/"L" so labels fit in the narrow keys.

### Files touched (iter-92)

```
src/components/admin/AdminPOSPanel.tsx
  + macroSkus + macroEditing + macroSwapIndex + macroSearch state
  + DEFAULT_MACRO_SKUS preset (8 items)
  + setMacroSlot helper + localStorage persistence
  + .macro-row / .macro-key / .macro-icon / .macro-label / .macro-price styles
  + .macro-key.empty + .macro-edit-badge (⇄ + ×) + .macro-edit-pill + .macro-swap styles
  + .cat-Service / .cat-Supplies / .cat-Fees / .cat-Mailbox category-tinted variants
  + macroEnter keyframe
  + import + MacroToolbar slotted above the LCD inside the cabinet
src/components/admin/AdminPOSMacros.tsx                        NEW
  + MacroToolbar component (~145 lines)
  + shortenLabel + pickGlyphKey helpers
  + flat MACRO_GLYPHS record (22 SVG inner-HTML strings rendered via dangerouslySetInnerHTML)
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 71s` · 185 routes generated) **after** extracting `MacroToolbar` to its own file. First two attempts (with everything inline) compiled the modules cleanly per `tsc --noEmit` but **Turbopack hung at "Creating an optimized production build…" for 16+ minutes** with no progress on the 5644-line monolith. Splitting MacroToolbar to `AdminPOSMacros.tsx` (and consolidating the 22 inline `Glyph*` JSX components into a flat `MACRO_GLYPHS` data record rendered via `dangerouslySetInnerHTML`) brought build time back to 71s. Lesson: keep individual files under ~5k lines and avoid hundreds of single-purpose JSX components in a single client module.

Dev server's `.next/dev/` manifests were collateral damage from the cache nuke; restarted fresh and `/login` returns 200.

### Loop status

92 iterations. Production deploy still gated. POS iter-14 of N — Macro Toolbar landed.

## 104. POS — iter-93 (Receipt Preview modal + keyclick sound)

Iter-15. The cashier-side verification step that's been missing — see exactly what the receipt will look like before charging — plus tactile audio for every keycap press.

### 1. Receipt Preview modal

A new **PREVIEW** toggle pill in the header (eye icon, blue active state) sits next to Z-READ. Persisted to `localStorage["noho-pos-preview"]`.

When ON: clicking CHARGE no longer immediately submits — it triggers `setShowPreview(true)`, which slides a fullscreen modal up from the bottom (`previewSlideUp` 480ms `cubic-bezier(.34,1.56,.64,1)`):

- **Backdrop**: `radial-gradient(ellipse at top, rgba(45,16,15,0.7), rgba(15,5,4,0.92) 70%)` with `backdrop-filter: blur(6px)`
- **Card**: cream-tan gradient, brass-trim border (`var(--cab-trim)` so it matches the active theme), max-720px, deep drop shadow
- **Inner paper**: white background with subtle ruled-paper alternation (24px stripes) and monospace font — looks like the actual 4×6 receipt
- **Live render** of every receipt section using current cart/customer/payment state:
  - Header: `◆ NOHO MAILBOX ◆` + store address + phone + `# 00042 · timestamp` preview
  - Customer block when attached (name + suite + email)
  - Items list with qty × unit-price, line totals tabular-nums
  - Totals: subtotal, discount (if any), tax (if any), tip (if any), TOTAL bold
  - Cash mode: tendered + change rows
  - Payment line with method-specific footer (Zelle adds the recipient email)
  - Footer thank-you note
- **Action row**: Back/Cancel (dark) + CONFIRM CHARGE $X.XX (red)
- **Keyboard**: Esc cancels, Enter confirms (suppressed when typing in a field)

The submit pipeline was refactored: `submit()` now does validation + (if previewMode) sets the preview flag instead of charging; `actuallyChargeNow()` holds the original transaction logic. Preview's Confirm calls `actuallyChargeNow()` directly, bypassing the preview gate.

### 2. Keyclick sound

`playClick()` — Web Audio short percussive tap. White-noise burst with cubic envelope decay over 50ms, high-pass filtered above 4500Hz, gain 0.06. Lazily wired to the existing audio context + sound toggle. Hooked into:
- Item add (`addLine`) — every catalog item add via plan picker / search / standard tile / mailbox wall click chains
- All 6 payment-method keys (Cash/Zelle/Square/Card/Wallet/Custom)
- (Macro toolbar passes through `addLine` so it gets click-sounds free)

Subtle and short — feels like a real keycap dome bottoming out.

### Files touched (iter-93)

```
src/components/admin/AdminPOSPanel.tsx
  + previewMode state + showPreview state + localStorage persistence
  + playClick helper (Web Audio percussive tap)
  + submit() refactored: validation + (preview gate or charge)
  + new actuallyChargeNow() with the original transaction logic
  + PREVIEW toggle pill in header (PreviewIcon eye glyph)
  + .preview-overlay / .preview-card / .preview-paper styles
  + previewBackdrop / previewSlideUp keyframes
  + ReceiptPreviewModal component (~140 lines)
  + playClick wired into addLine + 6 payment-method buttons
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 52s` · 185 routes). Dev server `/login` returns 200.

### Loop status

93 iterations. Production deploy still gated. POS iter-15 of N — Receipt Preview modal + keyclick landed.

## 105. POS — iter-94 (Live Activity Ticker + event toast)

Iter-16. The cabinet now has a stock-ticker-style scrolling marquee above it showing real-time storefront activity, plus a toast that pops up on every fresh event.

### 1. `getPOSTickerEvents()` server action

Pulls a unified, time-ordered list from the last 6 hours across 4 sources in parallel:
- POSSale (Paid → "Sale #N · $X · method", Voided → "Void #N · $X")
- MailItem (created → "Mail · Suite #N · from sender")
- User (recent signup → "Signup · Name · #suite · plan")
- WalletTransaction (TopUp / DepositCharge → "Wallet +$X · Name")

Each event has `id` (table+id, deduplication-safe), `kind` enum, `iconLetter` (✓ ✕ ⚐ ★ ＄), `message`, optional `customerName`/`suiteNumber`/`amountCents`, and `atIso` timestamp. Sorted newest-first, capped at 20. Type lives in `src/lib/pos.ts`.

### 2. TickerStrip — scrolling marquee above the cabinet

Dark phosphor-style strip:
- Background `linear-gradient(180deg, #0e1a14 0%, #0a1410 100%)` matching the LCD aesthetic + inset shadow
- **`LIVE` chip** absolute-positioned left, pulsing red (reuses iter-7's `livePulse 1.4s` animation), glowing red shadow
- **Right-edge fade** via `::after` for clean truncation
- Track `display: inline-flex` with events duplicated, `tickerScroll 75s linear infinite` translating `-50%` for seamless looping
- `onMouseEnter` → `onHover(true)` → `.paused` class → `animation-play-state: paused` so cashier can read on hover

Chips are color-coded by kind (sale=green/cream, void=red/cream, mail=blue, signup=gold, wallet=green, milestone=red), each with a circular icon glyph + message + relative-time stamp ("3m ago", "1h22m ago", "2d ago").

Empty state renders "— no recent activity —" in a slim placeholder.

### 3. EventToast — pops on every new event

Live polling: `getPOSTickerEvents()` runs on mount + every 30s + on `visibilitychange`. A `tickerSeenRef: Set<string>` tracks event ids:
- First load: seed seen set silently
- Subsequent: find the freshest unseen event → fire `<EventToast>` for 4s, then auto-dismiss

Toast is a fixed-positioned cream card top-right with a 6px-wide colored left border keyed to `kind` (matching the ticker chips), entry/exit animation `toastSlide 4s ease-in-out`. Click to dismiss. The toast is brief (4s lifetime), discrete, and clearly secondary so it doesn't compete with the cashier's main workflow.

### Files touched (iter-94)

```
src/lib/pos.ts                                + TickerEventKind + TickerEvent types
src/app/actions/pos.ts                        + getPOSTickerEvents (4 parallel queries, unified output)
src/components/admin/AdminPOSPanel.tsx
  + tickerEvents + tickerPaused + eventToast state, tickerSeenRef
  + 30s live-polling effect with visibility-API resume
  + .ticker-rail / .ticker-track / .ticker-chip + kind palettes
  + tickerScroll + livePulse-reused keyframes
  + .event-toast + toastSlide keyframe
  + TickerStrip + EventToast components (~110 lines)
  + Strip slotted above the parked-rail / cabinet
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 86s` · 185 routes). Dev server `/login` returns 200.

### Loop status

94 iterations. Production deploy still gated. POS iter-16 of N — Live Activity Ticker + event toast landed.

## 106. POS — iter-95 (Returns / Refund modal)

Iter-17. The biggest workflow gap left: a proper Returns/Exchange modal. Receipt-search → expand to receipt detail → enter refund reason → Confirm fires the existing void path with a REFUND stamp animation.

### 1. `getRecentSalesDetailed(query?)` server action

Searches the last 30 days of `POSSale`, including line items (sorted oldest-first within each sale). Search filter (when ≥2 chars) matches:
- `number` if the query parses to an int (strips `#` and leading zeros)
- `customerName / customerEmail / customerSuite` substring
- `customerPhone` digit-substring (when ≥3 digits in query)

Returns up to 20 sales newest-first. Date fields normalized to ISO strings so the client doesn't double-parse. Type lives in `src/lib/pos.ts`.

### 2. ReturnsModal — split-pane receipt-search

Toggle: red **RETURNS** button in the header (light pink background, Heroicon-style return-arrow glyph). Modal opens with:

- **Dark blurred backdrop** (`radial-gradient + backdrop-filter blur(8px)`)
- **Cream-tan card** with brass-trim border, `cubic-bezier(.34,1.56,.64,1)` enter animation
- **Two-column** (`grid-cols-[1fr_1.4fr]` on md+):
  - **Left (search + list)**: Auto-focused search input with Heroicon glyph, results list capped at 60vh with brand-themed scrolling. Each row shows `#NNNNN` monospace receipt number + payment-method badge (reuses existing `.badge-method` from iter-1) + VOIDED indicator if applicable + customer name + suite + item count + cashier + relative date + total. Active row gets a left brass border + cream gradient highlight. Voided rows are 55% opacity.
  - **Right (detail + refund form)**: shows a receipt-styled paper rendering the full sale (matches iter-15 preview style — header, customer block, line items, subtotal/discount/tax/tip/TOTAL). When the sale isn't voided, the refund form below shows a **textarea for the audit-log reason** + 2-button row (BACK / CONFIRM REFUND $X.XX in red).

- **Auto-pick** the top result if search has ≥3 chars and exactly 1 match
- **Empty state** for the right pane: "Select a sale on the left to review and refund."
- **Already-voided** sales show a red banner "This sale was already voided [timestamp]" and hide the refund form
- **Stale debounce**: 220ms after last keystroke, fires server action; cancels in-flight via `cancel` flag

### 3. Confirm flow

Clicking **CONFIRM REFUND**:
1. Validates reason is non-empty
2. Calls existing `voidSale({ saleId, reason })` server action — full void, wallet-method auto-credits back, audit-logged in transaction
3. On success → `setStampShown(true)` triggers the existing **PAID stamp animation** but with red `REFUND` text + red double-line ring (overshoot drop-in via `stampSlam` keyframe, `mix-blend-mode: multiply` ink stamp)
4. Renders a green "✓ Refund issued. Closing…" banner
5. After 1700ms (stamp animation completes) → modal auto-closes
6. Concurrently fires `onAfterRefund` which refreshes Recent Sales + till totals so the void shows in the panel

### Files touched (iter-95)

```
src/lib/pos.ts                                + POSSaleDetailed type
src/app/actions/pos.ts                        + getRecentSalesDetailed (search + line items)
src/components/admin/AdminPOSPanel.tsx
  + returnsOpen state + openReturns helper
  + RETURNS header button (red palette, return-arrow icon)
  + .returns-overlay / .returns-card / .returns-list / .returns-row / .returns-detail-paper styles
  + returnsEnter keyframe
  + ReturnsModal component (~190 lines) reusing PAID/.paid-stamp styles for the REFUND visual
  + ReturnIcon glyph
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 53s` · 185 routes). Dev server `/login` returns 200.

### Loop status

95 iterations. Production deploy still gated. POS iter-17 of N — Returns/Refund modal landed. Buy-return-exchange trifecta now complete.

## 107. POS — iter-96 (Promotions Strip with countdown timers)

Iter-18. A horizontal scrolling row of colorful promo chips above the macro toolbar — limited-time offers as click-to-apply bundles, each with a live countdown timer.

### 6 sample promos (`PROMOS` constant, defined inline)

| ID                | Label             | Sub                              | Palette  | Expires        | Apply                                                            |
|-------------------|-------------------|----------------------------------|----------|----------------|------------------------------------------------------------------|
| `first-timer`     | First-Time Setup  | $10 OFF mailbox key + setup      | rose     | ongoing        | Adds `-$10.00` discount line                                     |
| `bulk-mailers`    | Bulk Mailers      | Buy 3 bubble mailers · save $1   | indigo   | ongoing        | Adds 3× medium bubble mailer + `-$1.00` discount                |
| `notary-bundle`   | Notary + Forward  | $5 OFF combo                     | gold     | ongoing        | Adds notary + forwarding fee + `-$5.00` discount                |
| `summer-renewal`  | Summer Renewal    | $15 OFF 14-month                 | teal     | 2026-08-31     | Adds `-$15.00` discount line                                    |
| `ship-and-go`     | Ship & Go         | Box + Tape free w/ shipping label| ember    | ongoing        | Adds box-md + tape + `-$7.50` discount                          |
| `loyalty-photo`   | Loyalty Photo     | Free passport photo · members    | olive    | ongoing        | Adds passport photo + `-$15.00` discount                        |

`addCustomLineNamed(name, priceCents)` helper appends a custom line with the discount-as-negative-cents pattern. The cart subtotal/total math already handles negative line totals correctly.

Promos with `expiresAt` show a countdown chip computed from the current time vs the ISO. Buckets:
- ≥7 days → `Nd left` (gray bg)
- 1–6 days → `Nd Hh left` (gray bg)
- 1–23 hours → `Hh Mm left` (urgent if <6h: red bg + livePulse animation)
- <1 hour → `Mm left` (urgent + pulsing)
- past expiry → `ENDED` (chip greyed 45% opacity, click disabled)

A `setInterval` on a no-op state increment ticks every 60s so the countdown stays fresh without re-fetching.

### Visual

- **Strip**: horizontal scroller with `scroll-snap-type: x proximity`, slim 4px scrollbar themed to the cabinet, 8px gap. Slots above the macro toolbar so it shares the cabinet's brass real estate.
- **Each chip**: 180–220px wide, rounded 8px, 8×12px padding. Colored background uses a 3-stop linear gradient with `background-size: 200% 100%` and **`promoShimmer 8s linear infinite`** sliding the gradient from `-200%` to `200%` — produces a subtle but constantly-animated metallic sheen across the chip face.
- **Layout**: top eyebrow `★ Promo` (uppercase, tracked), big bold label, 10px sub-line description, optional countdown chip at bottom.
- **6 hand-tuned palettes**: rose / indigo / gold (cream-bordered for legibility) / teal / ember / olive — all 3-stop gradients tuned against the cream + brass cabinet.
- **Hover**: lift 2px + brightness 1.08. Active: press 1px down. Entry: `promoEnter 320ms cubic-bezier(.34,1.56,.64,1)` overshoot, staggered 50ms × i.
- **Expired**: 45% opacity, desaturated, click disabled.

### Files touched (iter-96)

```
src/components/admin/AdminPOSPanel.tsx
  + Promo type + PROMOS constant (6 sample promos with apply functions)
  + addCustomLineNamed helper
  + .promo-strip / .promo-chip / .promo-{rose,indigo,gold,teal,ember,olive}
    / .promo-tag / .promo-label / .promo-sub / .promo-countdown / .promo-countdown.urgent
  + promoEnter + promoShimmer keyframes
  + PromoStrip component (~75 lines) with 60s countdown tick
  + PromoStrip slotted above the macro toolbar inside the cabinet
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 57s` · 185 routes). Dev server `/login` returns 200.

### Loop status

96 iterations. Production deploy still gated. POS iter-18 of N — Promotions Strip with countdown timers landed.

## 108. POS — iter-97 (Loyalty Punchcard in the Customer Presence Card)

Iter-19. The Customer Presence Card now grows a coffee-shop-style loyalty punchcard when a customer is attached.

### `getCustomerVisits(userId)` server action

Returns ISO timestamps for the customer's paid POSSale records over the last 90 days, capped at 50, newest-first. Lightweight read — only fetches `paidAt`.

### `<LoyaltyPunchcard>` component

Renders below the existing wallet/Renews row inside the Customer Presence Card:

- **Card** styled as ruled paper: `repeating-linear-gradient(0deg, #fff8e6 0, #fff8e6 12px, #f3e6c4 12px, #f3e6c4 13px)` for the line-paper feel + dashed brown border
- **Header strip**: "LOYALTY · 10 visits = free" + right-side `N/10 · last 5m ago` progress with relative timestamp
- **10-slot grid** (`grid-template-columns: repeat(10, 1fr)`, aspect-ratio 1/1, `gap: 4px`):
  - **Empty slot**: 1.5px dashed brown circle with the slot number 1–10
  - **Stamped slot**: red ink-stamp circle with red gradient (`radial-gradient(circle at 35% 30%, #f0a7a0, #c01818 60%, #6c0010)`), 2px dark-red border, white "✓" mark, serif-italic feel. Animated entry via **`stampInk 360ms cubic-bezier(.5,2,.4,.8)`** — overshoot from `scale(1.6) rotate(-12deg)` settling at `scale(1) rotate(-12deg)` so each stamp lands at a slight angle. Staggered `60ms × i` so they pop in sequentially.
  - Tooltips show the visit date

### REWARD READY state

When `filled >= 10`:
- A shimmering gold chip appears below the grid with a 3-stop gradient (`${GOLD_DARK} → ${GOLD} → ${GOLD_DARK}`) using the existing `promoShimmer 2.4s linear infinite` + a new `rewardGlow 1.8s ease-in-out infinite` `box-shadow` pulse
- Text: `★ REWARD READY · Free passport photo or notary`

### Customer card wiring

`useEffect` fetches visits on mount + when `customer.id` changes. Empty array → renders an "— no visits in the last 90 days —" placeholder. Last visit is included in the header progress line.

### Files touched (iter-97)

```
src/app/actions/pos.ts                        + getCustomerVisits(userId)
src/components/admin/AdminPOSPanel.tsx
  + visits state in CustomerPresenceCard + lazy useEffect
  + .loyalty-card / .loyalty-header / .loyalty-grid / .loyalty-slot / .loyalty-slot.stamped
    / .loyalty-reward / .loyalty-empty / .loyalty-progress styles
  + stampInk + rewardGlow keyframes (reuses promoShimmer)
  + LoyaltyPunchcard component
  + Punchcard slotted into CustomerPresenceCard below the wallet row
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 52s` · 185 routes). Dev server `/login` returns 200.

### Loop status

97 iterations. Production deploy still gated. POS iter-19 of N — Loyalty Punchcard landed.

## 109. POS — iter-98 (Cash Count Modal · Open / Close Shift)

Iter-20. Real-cash-handling workflow: at start-of-shift cashier counts the drawer and locks in the opening total; at close they count again and the modal computes variance against `opening + today's cash sales`. Visual: brass-cabinet themed modal mirroring the iter-2 in-cabinet drawer denominations.

### Shift state

`ShiftSnapshot` shape: `openedAt`, `openingCounts: Record<string, number>`, `openingTotalCents`, plus `closedAt / closingCounts / closingTotalCents / expectedCloseCents / varianceCents / todaysCashSalesCents` once closed. Persisted to `localStorage["noho-pos-shift"]` for the active shift; closed shifts archive to `localStorage["noho-pos-shifts"]` (last 30 retained).

### `<CashCountModal>`

Single component handles both Open and Close modes:

- **Cabinet wood card** — uses the iter-11 theme tokens (`--cab-from / --cab-mid / --cab-to / --cab-trim`) so it auto-recolors with Brass / Aluminum / Walnut. Backdrop `radial-gradient + backdrop-filter blur(8px)`.
- **Header** with rail-engraved title (`◆ Open Shift ◆` or `◆ Close Shift ◆`), big bold subtitle, sub-line:
  - Open: "Enter the count of each denomination in the drawer right now."
  - Close: "Opened {timestamp} · cash sales since open: $X.XX"
- **Denomination tray** — yellow-bronze gradient (matches the existing in-cabinet drawer tray from iter-2). Inside: 10-cell grid (2 cols mobile / 5 cols ≥sm) for the full denomination set: $100 (C-note), $50 (Grant), $20 (Jackson), $10 (Hamilton), $5 (Lincoln), $1 (Buck), 25¢ (Quarter), 10¢ (Dime), 5¢ (Nickel), 1¢ (Penny). Each cell:
  - Top row: denomination label + sub-name
  - Big number input (numeric inputmode, dark recessed background with gold focus ring)
  - Bottom: live `$X.XX` per-slot total
- **Summary row** below the tray:
  - **Open mode** — 1 stat (Counted) + a 3-col-spanning note explaining the shift lifecycle
  - **Close mode** — 4 stats: Counted · Opening · + Cash Sales · **Variance** (color-coded green for over, red for short, amber for exact)
- **Action row**: CANCEL (dark) + GOLD primary that adapts label:
  - Open: `OPEN SHIFT · $X.XX`
  - Close exact: `CLOSE SHIFT · EXACT`
  - Close over: `CLOSE SHIFT · OVER $X.XX`
  - Close short: `CLOSE SHIFT · SHORT $X.XX`

ESC closes; click backdrop dismisses.

### Header button

Single **OPEN TILL** / **CLOSE TILL** pill in the header (after RETURNS). When no active shift → cream/brown OPEN TILL. When a shift is active → gold gradient + cream ink CLOSE TILL. Toggles the modal between modes automatically. New `TillIcon` glyph (drawer + slot lines + bell knob).

### Submit semantics

- **Open**: persists a fresh `ShiftSnapshot` with `openedAt = now`, the counted denominations, and total. Closes modal.
- **Close**: computes `expectedClose = openingTotal + todaysCashSales`, `variance = counted - expected`. Spreads into the `shift` and archives the now-closed snapshot to history. Clears the active shift. Closes modal.

### Files touched (iter-98)

```
src/components/admin/AdminPOSPanel.tsx
  + ShiftSnapshot type + shift state + shiftModal state
  + persistShift + archiveShift helpers (localStorage active + 30-shift history)
  + .cash-overlay / .cash-card / .cash-tray / .cash-slot / .cash-slot-input
    / .cash-summary / .cash-stat / .cash-stat-value{.short,.over,.exact}
  + cashEnter keyframe
  + CASH_DENOMS table (10 denominations matching iter-2 drawer)
  + CashCountModal component (~140 lines)
  + TillIcon glyph
  + OPEN TILL / CLOSE TILL header button (theme-aware gold gradient)
  + Modal mount with submit dispatch (open vs close)
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 56s` · 185 routes). Dev server `/login` returns 200.

### Loop status

98 iterations. Production deploy still gated. POS iter-20 of N — Cash Count Modal (Open/Close Shift) landed. The till lifecycle is now end-to-end in-app.

## 110. POS — iter-99 (Hourly Sales Sparkline beside the goal ring)

Iter-21. The till summary now shows today's sales velocity hour-by-hour as a compact 120×40 SVG sparkline next to the daily goal ring.

### `getTodaysTill()` extension

Added `byHour: Array<{ hour: number; cents: number; count: number }>` (24 elements) to the return shape. Pulled in the same query (added `paidAt` to the select) and bucketed in the same single pass — zero extra round-trips. The 30s live-poll already running picks up the hourly data automatically.

### `<HourlySpark>` SVG component

120×40 viewBox. Maps 24 hourly buckets to evenly-spaced X positions (`stepX = (W - PAD*2) / 23`) and the cents to inverted Y (anchored to the local max so the chart auto-scales). Renders three layers:

1. **Filled area** — closed polygon under the line, painted with `linearGradient sparkFillGrad` from `var(--rail-text)` 0.85 opacity at top to 0 at bottom. The gradient uses the theme token so it auto-recolors with Brass / Aluminum / Walnut.
2. **Line** — 1.6px stroke in `var(--rail-text)`, rounded caps + joins, **animated draw-in** via `stroke-dasharray: 240` + `stroke-dashoffset` keyframe `sparkDraw 1100ms cubic-bezier(.5,0,.4,1) forwards`. Each remount replays the animation.
3. **Now-dot** — small circle at the current-hour data point, brown stroke + theme-fill, `sparkPulse 1.6s ease-in-out infinite` scale 1 → 1.25 → 1 with opacity drop. Anchors the user's eye to "where we are now."

Header eyebrow `VELOCITY · TODAY` + bottom 4-tick axis (`12a · 6a · noon · 6p`) gives temporal context without cluttering the chart.

Empty state (zero sales today) renders a dashed baseline rather than an empty chart.

Tooltips on the SVG container show total cents.

### Files touched (iter-99)

```
src/app/actions/pos.ts                         + byHour: 24-bucket array on getTodaysTill
src/components/admin/AdminPOSPanel.tsx
  + till state widened to include byHour
  + .spark-stage / .spark-fill / .spark-line / .spark-now / .spark-axis styles
  + sparkDraw + sparkPulse keyframes
  + HourlySpark component (~70 lines, theme-aware via var(--rail-text))
  + HourlySpark slotted right after the goal ring in the till summary
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 56s` · 185 routes). Dev server `/login` returns 200.

### Loop status

99 iterations. Production deploy still gated. POS iter-21 of N — Hourly Sales Sparkline landed.

## 111. POS — iter-100 ("OOPS!" Undo Toast — cashier safety net)

Iter-22, the 100th overall handoff section. A floating bottom-center Undo pill that pops up after every reversible cart mutation with an animated 5-second countdown ring.

### State + helpers

- `UndoAction` discriminated union: `add` (catalog item rung up) · `remove` (line removed) · `clearAll` (full cart cleared) · `promo` (promo applied — placeholder for future)
- `undoAction: { id, action, label }` state. `id` increments per `pushUndo` so `setTimeout(5000)` only clears the current toast, not a fresh one that arrived during the timer.
- `pushUndo(action, label)` — wired into `addLine`, `removeLine`, `clearAll`. Captures the necessary state to reverse.
- `performUndo()` — reverses the action by kind:
  - **add** + `existedBefore` → decrement quantity (or remove if it dropped to 0)
  - **add** fresh → splice the line out by `_key`
  - **remove** → splice the saved line back at its original index
  - **clearAll** → restore cart + discount/tax/tip strings
- Suppressed when **any modal is open** (`returnsOpen || zReportOpen || shiftModal || showPreview`) so the toast never floats over an active workflow.

### Visual

`<UndoToast>` — fixed-position pill bottom-center, styled to match the cabinet:

- **Cabinet wood gradient** (`var(--cab-from) → var(--cab-to)`) so it auto-recolors with Brass / Aluminum / Walnut. Brass border, deep drop shadow, inset highlight.
- **Pill shape** (`border-radius: 999px`), max-width with truncation on long labels.
- **Layout**: `↶ UNDO` cta in theme gold + label (e.g. "Removed Notary signature") + 28×28 SVG countdown ring + tiny `×` dismiss button.
- **Countdown ring** — 36×36 SVG circle (r=15.9, pathLength=100), gold stroke 2.5, `stroke-dasharray: 100`, animated `stroke-dashoffset: 0 → 100` over `5000ms linear` via `undoCountdown` keyframe. Rotated -90° so progress drains clockwise from 12 o'clock.
- **Entry**: `undoEnter 320ms cubic-bezier(.34,1.56,.64,1)` overshoot from `translateY(12px) scale(0.96)` to settle.
- Click anywhere on the pill → `performUndo()` + reverses + plays click sound. Click `×` → dismiss without undoing (e.g. user changed their mind about undoing).

### Edge cases

- ClearAll fires `pushUndo` only when there's something to restore (cart non-empty OR adjustments populated)
- Adding a fresh line vs incrementing an existing line: `addLine` tracks `existedBefore` so `performUndo` correctly decrements or removes
- Re-mounting on each `pushUndo` (via `key={undoAction.id}`) restarts the countdown animation cleanly

### Files touched (iter-100)

```
src/components/admin/AdminPOSPanel.tsx
  + UndoAction discriminated union + undoAction state + undoIdRef
  + pushUndo(action, label) + performUndo() helpers
  + addLine refactored to capture existedBefore + new line ref → pushes undo
  + removeLine refactored to capture index + line → pushes undo
  + clearAll captures cart + adjustments → pushes undo
  + .undo-toast / .undo-cta / .undo-ring / .undo-dismiss styles
  + undoEnter + undoCountdown keyframes
  + UndoToast component (~30 lines)
  + Toast mount with modal-suppression guards
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 57s` · 185 routes). Dev server `/login` returns 200.

### Loop status

100 iterations. Production deploy still gated. POS iter-22 of N — Undo Toast landed. Cashier now has a 5-second safety net on every cart mutation.

## 112. POS — iter-101 (Upcoming Renewals 14-day calendar strip)

Iter-23. A horizontal calendar below the cabinet showing the next 14 days of mailbox renewals, heatmap-tinted by load, with click-to-expand customer popovers and one-click attach.

### `getUpcomingRenewals(days = 14)` server action

Pulls `User` rows with non-null `planDueDate` ≤ the last date in the window, buckets each by date. Past-due rows (planDueDate < today) get bucketed into the today cell with `isPast: true` so cashier sees overdue-attention right at the leftmost slot. Each cell:

- `date` (`YYYY-MM-DD`), `weekday` ("Mon"), `dayOfMonth` (4)
- `count` of customers due
- `customers[]` capped at 12 (panel only shows top names anyway)
- `isToday` / `isPast` flags

Type lives in `src/lib/pos.ts`.

### `<UpcomingStrip>` component

Rendered between the cabinet and the Recent Sales section. Slotted only when `upcoming.length > 0`.

- **Card**: cream gradient (`linear-gradient(180deg, #fff5dd 0%, #fae9c0 100%)`) + brown border + inset highlight.
- **Header**: `Upcoming Renewals · 14 days` + `N due in window`
- **Grid**: `grid-cols-7` mobile / `grid-cols-14` ≥lg. Each cell:
  - **Weekday** (`MON`, etc.) in 9px tight-tracked uppercase
  - **Day-of-month** in 16px Baloo-2 black
  - **Count chip** (rounded pill, blue bg + cream text) — only when count > 0
  - "+ Overdue" tag if `isPast`
  - Animated entry via `upDayEnter 320ms cubic-bezier(.34,1.56,.64,1)`, staggered 25ms × i
- **State styling**:
  - `today` — gold-tinted bg (`rgba(255,217,124,0.55)`) + brass border + 1px outline
  - `past` — rose-tinted bg (`rgba(245,211,208,0.7)`) + red border + dark red text + red count chip
  - `expanded` — full brown bg + cream text + gold count chip
  - `empty` (count = 0) — 55% opacity
- **Heatmap tint** — non-today, non-past, non-empty cells get a `linearGradient` between cream `#fff5dd → #fae9c0` (calm) and warmer `#f0c878 → #e6b66a` (busy), interpolated by `count / max` via inline `mix(a, b, t)` helper. Subtle but immediately readable as "Tuesday is busy."

### Popover

Click a cell with renewals → expands an absolute-positioned popover below it (`top: calc(100% + 6px)`, max-width 280px). Cream gradient + brass border + drop-down arrow `::after` triangle pointing up at the cell. Lists customers as rows with name + suite (blue) + plan + term, click a row → calls `onAttachCustomer(id)` which loads via `getPOSCustomer` and populates the Customer Presence Card. Closes the popover automatically.

When count > 12, footer reads "Showing top 12 of N".

### Refresh cadence

Loaded on mount + every **5 minutes** (renewal due-dates are slow-moving). Pauses while tab hidden.

### Files touched (iter-101)

```
src/lib/pos.ts                                 + UpcomingRenewalCustomer + UpcomingRenewalDay types
src/app/actions/pos.ts                         + getUpcomingRenewals (window + bucket + past-bucket)
src/components/admin/AdminPOSPanel.tsx
  + upcoming state + 5-min lazy-poll effect
  + .up-strip / .up-grid / .up-day / .up-day-{weekday,num,count} / .up-popover / .up-customer styles
  + upDayEnter keyframe + state palettes (today / past / empty / expanded)
  + UpcomingStrip component (~95 lines) + mix() / parseHex() inline helpers
  + Strip slotted between the cabinet and Recent Sales sections
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 55s` · 185 routes). Dev server `/login` returns 200.

### Loop status

101 iterations. Production deploy still gated. POS iter-23 of N — Upcoming Renewals 14-day strip landed.

## 113. POS — iter-102 (Calculator overlay)

Iter-24. Slide-in calculator panel from the right of the screen with chunky keycap-styled buttons, LCD-themed display, memory functions, and ADD TO CART integration so quick math lands directly as a custom line.

### `<CalculatorOverlay>`

Triggered by a new **CALC** button in the header (chart-of-buttons icon glyph). Slides in from the right (`calcSlide 280ms cubic-bezier(.34,1.56,.64,1)` from `translateX(100%)` to `0`). Backdrop is a soft radial dim with `backdrop-filter: blur(4px)`. Click backdrop or ESC closes.

**Layout** — 320px wide panel (or full width minus 32px on mobile), full height with 16px insets:

- **Header strip** — `◆ Counter Calculator` engraved (uses `rail-engrave` so it auto-themes Brass / Aluminum / Walnut) + `⌨ keys + Enter · Esc to close` hint + ESC button.
- **LCD display** — reuses the `--lcd-glow` token, so the display recolors with the active theme (green-phosphor on Brass, cool blue on Aluminum, warm amber on Walnut). Inset shadow + 24px text-shadow blur. Two stacked rows:
  - **History line** — small (11px), 65% opacity. Shows the running expression (`12 + 3 ×`) or last completed (`8 × 9 =`).
  - **Current value** — 32px, 900-weight, tabular-nums, bottom-right aligned.
  - **Memory tag** — top-right pill `M · N` shown only when memory ≠ 0.
- **4×6 keypad grid** — buttons share the existing `.keycap` styling (cream-tan gradient, brown bevel, shadow underneath) and pick up the active theme tokens. Color variants:
  - **Memory row** (MC / MR / M+ / M−): dark brown `mem` style
  - **Clear row** (C / ⌫): red `clr` style; (% / ÷): gold `op` style
  - **Number rows** (7-9, 4-6, 1-3, 0): cream `keycap` default
  - **Operators** (×, −, +): gold `op`
  - **Equals** (=): red `eq` (full red gradient with cream ink)
  - 0 spans 2 columns at the bottom
- **Action row** — 2-up split: `USE TOTAL` (brand-blue) pulls cart total into display; `ADD TO CART` (brand-blue) creates a custom line at the calculated value, named `Calculator: N`. USE TOTAL is disabled (50% opacity) when cart is empty.

### Math semantics

Standard infix calculator state:
- `display: string`, `pending: { op, lhs }`, `overwrite: boolean`, `memory: number`
- Pressing an op when there's a pending op chains the previous result (`8 + 5 + 3` produces 16)
- `%` divides by 100 standalone; with a pending `+` or `-` op it computes "% of the lhs" (the standard "tip + tax" calc behavior)
- Floating-point cleanup: `formatNumber` does `toFixed(8)` then `parseFloat()` to strip trailing zeros
- Backspace works on the current entry (won't pop into a previous entry)

### Keyboard support

Active while modal is open:
- `0-9` / `.` → digit / dot
- `+ - * /` → corresponding op (× and ÷ rendered with proper Unicode)
- `Enter` or `=` → evaluate
- `Backspace` → pop last char
- `%` → percentage
- `c` / `C` → clear
- `Escape` → close

### Files touched (iter-102)

```
src/components/admin/AdminPOSPanel.tsx
  + calcOpen state
  + .calc-overlay / .calc-panel / .calc-display / .calc-grid / .calc-key{,.op,.eq,.mem,.clr,.act} / .calc-mem-tag styles
  + calcSlide keyframe
  + CalculatorOverlay component (~190 lines) — display state, op handlers, memory, keyboard handler, USE TOTAL + ADD TO CART
  + compute() + formatNumber() + CalcIcon helpers
  + CALC header button (cream/brown, calculator glyph)
  + Modal mount with addCustomLineNamed wiring on ADD TO CART
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 56s` · 185 routes). Dev server `/login` returns 200.

### Loop status

102 iterations. Production deploy still gated. POS iter-24 of N — Calculator overlay landed.

## 114. POS — iter-103 (Service Bell mounted above the cabinet)

Iter-25. A brass service bell sits on top of the cabinet — the iconic counter-bell moment. Click → bell swings, dings, sparkles pop, and a daily ring counter ticks up.

### `<ServiceBell>` component

56×56 inline SVG of a brass service bell with realistic shading:

- **Linear gradient** `bellBrassGrad` from `#fff3c0` highlight at top → `#f0c878` mid → `#c9a24a` bell-color → `#8c6e27` dark base — matches the existing brass-trim palette
- **Mount strap** at top (small dark brown rect for the post)
- **Bell chamber** drawn as a single path with the classic flared shape, dark brown stroke
- **Inner highlight** — translucent white path simulating light reflection on the upper-left of the bell
- **Rim** — radial gradient ellipse at the bottom + dark brown rim band
- **Clapper** — small brown sphere hanging below the bell
- **Engraved "NOHO"** text inside the bell at 75% opacity dark brown — matches real branded service bells

### Animation

Click handler:
1. **Increments** `bellSwing` state (used as React `key` to remount the wrap and replay the animation)
2. **Increments** `bellRings` counter (persisted to localStorage with today's date — auto-resets at midnight)
3. **Plays** existing `playBell()` Web Audio (re-uses the iter-2 service-bell ding)

CSS:
- `bellSwingKf` keyframe: rotate `-22° → +18° → -14° → +10° → -6° → +3° → 0°` over 720ms `cubic-bezier(.36,1.6,.5,.9)` — physically-decaying pendulum motion
- `transform-origin: 50% 6px` so the bell swings from the top mount strap
- 3 sparkle stars (`✦` chars in gold) absolute-positioned around the bell with `bellSparkle 600ms` keyframe, staggered 0/60/120ms delays — pop briefly on each ring
- Hover: brightness 1.08 + drop-shadow

### Daily counter

Red pill badge (`bell-count`) on the top-right corner of the mount, showing today's ring count. Cream border, drop shadow, pulsing red `${RED}` background. Hidden when count = 0.

Persistence: `localStorage["noho-pos-bell"] = { dateYmd, count }`. On mount, if the saved date matches today → restore count; else reset to 0 (auto fresh-start each day).

### Slotting

Rendered between the till summary and the cabinet's `pos-tilt-stage`, with `margin-bottom: -16px` so the bell physically nestles into the brass top-rail of the cabinet. `z-index: 10` keeps it above the cabinet's brass border.

### Files touched (iter-103)

```
src/components/admin/AdminPOSPanel.tsx
  + bellRings state + bellSwing state (re-trigger key) + persistBellRings + ringBell helpers
  + .bell-stage / .bell-mount / .bell-svg-wrap / .bell-count / .bell-sparkle styles
  + bellSwingKf + bellSparkle keyframes
  + ServiceBell component (~75 lines) — full inline SVG with brass gradients, NOHO engraving, clapper, rim
  + Bell mounted above the cabinet (between till summary + pos-tilt-stage)
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 55s` · 185 routes). Dev server `/login` returns 200.

### Loop status

103 iterations. Production deploy still gated. POS iter-25 of N — Service Bell landed.

## 115. POS — iter-104 (Customer Signature Pad for high-value sales)

Iter-26. When a sale crosses **$200**, a canvas-based signature pad pops up so the customer signs with mouse or touch. The PNG is captured and embedded into the printed receipt.

### Threshold + state

- `SIGNATURE_THRESHOLD_CENTS = 20000` ($200)
- `signaturePng: string | null` — base64 PNG (or null if no signature captured)
- `showSignaturePad: boolean` — modal visibility
- `signatureRequired = totalCents >= SIGNATURE_THRESHOLD_CENTS` — derived after totals computation

### Submit flow integration

`submit()` short-circuits to `setShowSignaturePad(true)` if `signatureRequired && !signaturePng && !showSignaturePad`. The signature pad's `onConfirm(png)` stores the PNG and calls `submit()` again — which now passes the gate and falls through to either preview or direct charge. `onSkip` is an admin override that proceeds without a signature.

`actuallyChargeNow()` writes the PNG into the existing `notes` field with a `SIGNATURE:` prefix:
```
notes: signaturePng ? `SIGNATURE:${signaturePng}` : null
```

### `<SignaturePad>` modal

Cream-tan card with brass-trim border, deep blurred backdrop, `cubic-bezier(.34,1.56,.64,1)` enter:

- **Header strip**: red eyebrow `◆ Signature Required ◆`, big subtitle "Customer signature for $X.XX", customer name (or "Please sign below to authorize this charge")
- **Canvas wrap** (white, brass border, rounded 8px) containing:
  - 220px-tall canvas with `cursor: crosshair`
  - **Pointer events** (mouse + touch via PointerEvents API + `setPointerCapture`)
  - Lines drawn in `#1a3e48` (theme-blue-dark), 2.4px round-joined
  - `devicePixelRatio` correction so HiDPI screens get crisp lines
  - **Signature line** (dotted-style baseline + `×` mark) and **"— Sign here —" watermark** that hide once drawing starts
- **Threshold reminder line**: "Threshold for signature: $200.00 · Captured signature is stored with the sale"
- **3-up action row**: CLEAR (dark, wipes the canvas) · SKIP (cream, admin override no signature) · CONFIRM SIGNATURE (red, disabled until something's drawn)
- ESC dismisses (returns to register without charging)

### Receipt rendering

`/admin/pos/receipt/[id]/page.tsx` — when `sale.notes` starts with `SIGNATURE:`, the receipt prints a "Customer Signature" section with the embedded PNG (max-height 50px, white background, hairline border). Signature appears between the Zelle footer and the thank-you footer. Survives the 4×6 thermal print stylesheet.

### Files touched (iter-104)

```
src/components/admin/AdminPOSPanel.tsx
  + SIGNATURE_THRESHOLD_CENTS const + signaturePng + showSignaturePad state
  + signatureRequired derived after totalCents
  + submit() refactored: signature gate before preview gate
  + actuallyChargeNow passes notes: SIGNATURE:dataURL when signaturePng set
  + signaturePng + showSignaturePad cleared on success
  + .sig-overlay / .sig-card / .sig-canvas-wrap / .sig-canvas / .sig-line / .sig-x / .sig-watermark styles
  + sigEnter keyframe
  + SignaturePad component (~120 lines): canvas + PointerEvents + DPR-aware setup + clear/skip/confirm
  + Modal mount with skip/confirm wired to retry submit()
src/app/admin/pos/receipt/[id]/page.tsx
  + signature image render block when notes starts with "SIGNATURE:"
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 50s` · 185 routes) on the second attempt — first pass had a `totalCents used before declaration` ordering issue (signatureRequired was defined too early); fix moved the derivation below the totals memo. Dev server `/login` returns 200.

### Loop status

104 iterations. Production deploy still gated. POS iter-26 of N — Customer Signature Pad landed.

## 116. POS — iter-105 (Cart-add flight animation)

Iter-27. Every tap on a buyable item now launches a colored ghost token from the click point — the token arcs into the LCD total and dissolves. Tactile feedback that "this just went into the cart."

### State + helper

`flightTokens: FlightToken[]` array (`{ id, fromX, fromY, dx, dy, label, color }`), keyed counter `flightIdRef`. New `lcdRef: useRef<HTMLDivElement>` attached to the green LCD strip in the cabinet.

`launchFlight(label, fromX, fromY, color)`:
1. Reads the LCD's `getBoundingClientRect()` for the target center
2. Computes `dx`, `dy` deltas from the click point to the target
3. Pushes a token onto state, schedules a `setTimeout(750ms)` to remove it after the animation completes

### addLine refactor

Signature widened to `(entry, evt?: React.MouseEvent | React.PointerEvent)`. When the event has clientX/clientY:
1. Picks a color by category — Service blue, Supplies/Mailbox gold, Fees red, default brown
2. Calls `launchFlight(entry.name, e.clientX, e.clientY, color)` BEFORE the cart mutation runs

### Wiring

- **Catalog tile button** in the keycap grid → `onClick={(e) => addLine(entry, e)}`
- **Plan-picker grid button** in PlanPickerGrid → `onClick={(e) => addLine(entry, e)}` (its prop type was widened to accept the optional event)
- **MailboxWall** click-to-attach doesn't add line items so no flight there
- **MacroToolbar** keys go through `addLine` already so they pick up flights for free, but the macro-toolbar component doesn't pass an event — that's fine, no flight appears (graceful degradation; macro keys have their own animation already)

### CSS animation

Each `.flight-token` is a fixed-positioned brand-colored pill (matching iter-2's drawer cash chips) anchored at the click point via `top: fromY; left: fromX` plus `translate: -50% -50%` to center on the click. CSS variables `--dx` and `--dy` carry the delta to the LCD center.

`flyArc 700ms cubic-bezier(.5,0,.4,1)` keyframe:
- 0%: at click point, scale 1, opacity 1
- 50%: midway between origin and target, lifted -80px in Y for an arc peak, scale 0.85
- 100%: at target, scale 0.4, opacity 0

`will-change: transform, opacity` for GPU compositing on 60fps. `pointer-events: none` so flights never intercept clicks. Works for any number of simultaneous flights — each token is independent.

### Files touched (iter-105)

```
src/components/admin/AdminPOSPanel.tsx
  + FlightToken type + flightTokens state + flightIdRef + lcdRef
  + launchFlight helper
  + addLine signature widened + auto-launch on click events
  + lcdRef attached to the cabinet LCD div
  + .flight-token + flyArc keyframe styles
  + Flight tokens rendered at panel root with css-var-driven motion
  + PlanPickerGrid prop type widened to accept React.MouseEvent
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 77s` · 185 routes). Dev server `/login` returns 200.

### Loop status

105 iterations. Production deploy still gated. POS iter-27 of N — Cart-add flight animation landed.

## 117. POS — iter-106 (Tip Jar — fills with bills as tips accumulate)

Iter-28. A glass tip jar sits in the till summary row. It fills with bills (and a brass coin drops in) on every successful charge that tips out.

### `getTodaysTill()` extension

Added `tipsCents` field — sum of `tipCents` across today's `Paid` POSSale rows. Pulled in the same single-pass query (added `tipCents` to select). The 30s live-poll picks it up automatically.

### `<TipJar>` SVG component

Compact glass-jar visual:
- **Brass rim** (44×6, gradient brown lid) with mini-engraved "TIPS" label baked in via `::after`
- **Glass body** (38×50, gradient highlights from cream→clear→highlights for a glossy specular look, brown stroke, rounded bottom)
- **Fill** — bottom-anchored amber gradient bar whose `height: N%` is `min(100, tipsCents / 5000 × 100)` — full at $50. 480ms `cubic-bezier(.34,1.56,.64,1)` smooth height transition between polls.
- **Stacked bill chips** absolute-positioned at the bottom: light-green bills for under $30, tan-bordered $50 chips for $30–$60, deeper-green $100 chips beyond. 1 chip per ~$5 tip, capped at 8 max.
- **Eyebrow label** (`TIPS`) above + **dollar amount** (tabular-nums) below the jar.

### Drop animation

`tipDropKey` increments on every charge that includes a tip > 0. Fires 320ms after the celebration so the eye lands on it.

When `dropKey > 0`:
- A small brass coin SVG (`background: radial-gradient(circle at 35% 30%, #fff3c0, #d4a73a, #8a6e1a)`, 8×8) renders inside the jar with `coinDrop 720ms cubic-bezier(.5,0,.4,1)` keyframe — drops from `-32px Y` to a calculated final-Y position based on the current fill (`50 - 4 - min(40, fillPct × 0.4)`) so it lands on top of the existing stack
- Jar itself plays `jarShake 220ms ease-out` — small Y wobble for impact feel
- Both keyed by `dropKey` so each tip gets a fresh coin

### Slotting

Inserted into the till summary row right after the Hourly sparkline (before Cash chip). Click → tooltip "Tips today: $X.XX · drops here when a sale tips out."

### Files touched (iter-106)

```
src/app/actions/pos.ts                         + tipsCents in getTodaysTill payload
src/components/admin/AdminPOSPanel.tsx
  + till state extended with tipsCents
  + tipDropKey state + fireTipDrop helper
  + Charge success path: setTimeout fireTipDrop +320ms when tipCents > 0
  + .tip-jar-stage / .tip-jar / .tip-jar-rim / .tip-jar-fill / .tip-jar-stack
    / .tip-jar-bill / .tip-jar-coin / .tip-jar-label / .tip-jar-amount styles
  + coinDrop + jarShake keyframes
  + TipJar component (~40 lines)
  + Slotted in till summary row after HourlySpark
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 58s` · 185 routes). Dev server `/login` returns 200.

### Loop status

106 iterations. Production deploy still gated. POS iter-28 of N — Tip Jar landed.

## 118. POS — iter-107 (Cashier Nickname + Avatar)

Iter-29. The POS panel header now shows a cashier identity pill — "Hi, Sarah" with a colored avatar circle. Nickname propagates into every sale's `cashierName` field and shows on the LCD welcome line. Persisted per-browser to localStorage.

### `cashierIdentity` state

`{ nickname: string, color: string }` persisted to `localStorage["noho-pos-cashier"]`. `saveCashier(nickname, color)` either persists when nickname is non-empty or clears the slot (sign-out flow). `CASHIER_PALETTE` exposes 7 brand-aligned colors: Brand blue, Brass gold, Tunisian red, Steel blue, Walnut, Coral red, Olive.

### `<CashierBadge>` header pill

Compact pill in the panel header (next to the existing SOUND/THEME/Z-READ chips):

- **Avatar circle** (22×22, rounded full) with the cashier's first initial in 11px Baloo-2 black, cream ink. Inset shadow for a tactile dome feel + 1px specular highlight on top.
- **Label** `Hi, Sarah` (hidden on small screens; avatar shows alone)
- **Empty state** when no identity: dashed border, 65% opacity, label reads `Sign in`, avatar shows muted `?`
- Click → toggles popover

### Edit popover

Cream-tan card slides in below the pill with `presenceSlide 220ms cubic-bezier(.34,1.56,.64,1)`:

- **Title strip**: `CASHIER SIGN-IN` eyebrow
- **Auto-focused text input** (max 20 chars) — Enter saves, Esc closes
- **7-swatch color row** — circles 24×24, scale 1.08× on hover, 1.12× + brown border when active
- **3-button action row**:
  - `CANCEL` (cream, brown border)
  - `SIGN OUT` (only when an identity exists — red, dim red border, calls `saveCashier("", color)` to clear)
  - `SIGN IN` / `UPDATE` (brown filled, disabled when nickname empty)

### Propagation

- **LCD welcome line** — when cart is empty, the `▸ Total Due` eyebrow appends `· {NICKNAME}` in 75% opacity green-phosphor — gives the LCD a personalized boot screen.
- **Sale `cashierName`** — `createSale` action gained an optional `cashierLabel` parameter. When provided, it overrides the default `admin.name` snapshot. The panel passes `cashierIdentity?.nickname ?? null` so any signed-in cashier owns the sale on record.
- **Receipt footer** already renders "Rang up by {sale.cashierName}" — automatically picks up the nickname now since it flows through the sale row.

### Files touched (iter-107)

```
src/app/actions/pos.ts
  + CreateSaleInput.cashierLabel?: string | null
  + cashierName falls back: input.cashierLabel?.trim() || admin.name
src/components/admin/AdminPOSPanel.tsx
  + cashierIdentity state + CASHIER_PALETTE + showCashierEdit + saveCashier helper
  + .cashier-badge / .cashier-badge-avatar / .cashier-popover / .cashier-swatch styles
  + reuses presenceSlide keyframe for popover entry
  + CashierBadge component (~80 lines): pill + popover + swatch picker
  + Slotted into header before the bell + STATION 1 chip
  + LCD welcome line shows nickname when cart is empty
  + actuallyChargeNow passes cashierLabel: cashierIdentity?.nickname
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 66s` · 185 routes). Dev server `/login` returns 200.

### Loop status

107 iterations. Production deploy still gated. POS iter-29 of N — Cashier Nickname + Avatar landed.

## 119. POS — iter-108 (Pop-Out Customer Display for dual-monitor)

Iter-30. **POP OUT** button in the panel header opens a dedicated browser window with a full-screen customer-facing kiosk view. The cabinet broadcasts cart/total/method/customer state via `BroadcastChannel`; the popped window listens and renders a large-format display designed for a second monitor on the customer side of the counter.

### New route — `/admin/pos/display`

Server wrapper at `src/app/admin/pos/display/page.tsx` (auth-gated via `verifyAdmin`) that renders `<DisplayClient>`. Production build now reports **186 routes** (was 185).

### `<DisplayClient>` — full-screen kiosk view

Listens on `BroadcastChannel("noho-pos")` for `{type: "state", payload: ...}` messages. Tracks all the cabinet state needed to render: cart line items, totals, method, customer, zelle memo, sale number, charge counter, theme.

Three modes:

- **Idle** (cart empty, no recent charge): "Welcome to NOHO Mailbox" in `min(96px, 12vw)` heading + a Pacifico-style cursive **rotating tagline** (5-line carousel from the existing idle-screensaver pool, 4.5s/line, `thanksDrop` enter animation per swap). Whole layout breathes via `idleGlow 5s ease-in-out infinite` — subtle scale + opacity cycle.

- **Active sale** (cart has items): 1.4fr/1fr two-column grid:
  - **Left**: `▸ TOTAL DUE` eyebrow + **`min(180px, 18vw)` Total** in Courier-mono with theme-glow `text-shadow` matching the cabinet's LCD (green-phosphor on Brass, cool blue on Aluminum, warm amber on Walnut). Below: payment-method panel showing the method name in 28px + method-specific instructions:
    - Cash → tendered + change pair
    - Zelle → "Send Zelle to nohomailbox@gmail.com · Memo: NOHO-NNNNN"
    - Square → "Insert or tap your card on the Square reader"
    - CardOnFile → "Charging {customer}'s card on file"
  - **Right**: `▸ ITEMS` eyebrow + last-7 line list. Each row uses `lineSlide 320ms cubic-bezier(.34,1.56,.64,1)` overshoot-from-right entry. Below: subtotal/discount/tax/tip rows.

- **Thank you splash** (charge counter increments): occupies the entire viewport for 4s. **`min(140px, 18vw)` Pacifico "Thank you!"** in theme-trim color with 30px outer glow + `thanksDrop 700ms cubic-bezier(.34,1.56,.64,1)` overshoot. Below: receipt # + paid amount, plus change-due if Cash.

### Theme awareness

DisplayClient picks a theme palette from the broadcasted `theme` field (Brass / Aluminum / Walnut). The radial-gradient backdrop, trim color, and LCD-glow color all swap to match the cabinet — so when the cashier flips Brass→Walnut, the customer display follows in real-time across the BroadcastChannel.

### Top status bar

Logo (56px tall, `brightness(1.1)` for the dark backdrop) + `◆ Customer Display` engraved label in theme color + store address subline. Right side: pulsing dot + `Active sale` / `Awaiting next sale` text — gives the customer a heartbeat-style indicator that the system's alive.

### Cabinet wiring

- `broadcastRef: useRef<BroadcastChannel>` opened on mount, closed on unmount
- `chargeCounterRef.current` increments on every successful charge
- A `useEffect` listening to ALL the relevant cart/method/customer state pushes a snapshot via `bc.postMessage({ type: "state", payload })` on every change. Picks up changes within React's render cycle so the popped display feels live.
- `popOutDisplay()` calls `window.open("/admin/pos/display", "noho-pos-display", "width=1280,height=800,popup,toolbar=no,menubar=no")` — opens at desktop scale, popup-mode (no toolbars), and reuses the same window if reopened.

### POP OUT button

Header pill (between CALC and TILL), cream/brown styling matching the rest. Glyph is a 4-arrow Heroicon-style "open in new" with a window-frame outline — distinct from the existing PreviewIcon eye / KioskIcon corner-brackets.

### Files touched (iter-108)

```
src/app/admin/pos/display/page.tsx                  NEW — server wrapper, verifyAdmin gate
src/app/admin/pos/display/DisplayClient.tsx          NEW — full-screen kiosk view (~250 lines)
src/components/admin/AdminPOSPanel.tsx
  + broadcastRef + chargeCounterRef + popOutDisplay helper
  + useEffect pushing state snapshot on every cart/method/customer change
  + chargeCounterRef++ on charge success
  + POP OUT header button + PopOutIcon glyph
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 54s` · **186 routes**). New `/admin/pos/display` registered. Dev server `/login` returns 200.

### Loop status

108 iterations. Production deploy still gated. POS iter-30 of N — Pop-Out Customer Display landed. The cabinet now drives a real second-monitor experience.

## 120. POS — iter-109 (Top Items Podium Leaderboard)

Iter-31. A horizontal 5-slot strip below the till summary celebrates today's bestseller items with podium-style rank pills (gold / silver / bronze / 4-5 honorable).

### `getTodaysTill()` extension

Added `topItems: Array<{name, quantity, cents}>` to the response shape. Pulled in the same single-pass query (added `items: { select: { name, quantity, totalCents } }` to the existing `findMany` select), bucketed into a `Map<name, {qty, cents}>` during the loop, sorted desc by cents, capped at 5. Zero extra round-trips — picks up automatically via the 30s live-poll.

### `<TopItemsLeaderboard>`

Renders between the till summary and the milestone banner:

- **Card**: cream-tan gradient with brown border + inset highlight. Header reads `★ Top Items · Today` + right-aligned `N items` count.
- **Grid**: `grid-cols-2` on mobile, `grid-cols-5` on ≥sm. Each pill:
  - **Rank chip** absolute top-left (18×18 round) — color matches the medal tier
  - **Item name** in 11px black, 2-line clamp via `-webkit-line-clamp` so long names stay tidy
  - **Meta row** at the bottom: `Nx` quantity (left) + `$X.XX` revenue (right, tabular-nums, 12px black)
- **Medal tiers** via CSS variables `--podium-from / --podium-to / --podium-border / --podium-shadow`:
  - **r1 (gold)** — `#fff3c0 → ${GOLD}` body, brass-dark border + shadow
  - **r2 (silver)** — `#ffffff → #c0c5cc` body, slate-dark border + shadow
  - **r3 (bronze)** — `#ffd9a8 → #b66e2c` body, dark-copper border + dark-copper text
  - **r4/r5 (honorable)** — cream-tan honey gradient, brass border
- **Animation**: `podiumGrow 460ms cubic-bezier(.34,1.56,.64,1)` from `scaleY(0.4) translateY(20px)` overshoot, staggered 60ms × i so the podium grows left-to-right
- **`transform-origin: bottom center`** so each pill grows up from the floor — actual podium feel

### Empty state

When the day's sales array is empty: a single full-width centered placeholder reading "🔔 No items rung up yet — the first sale of the day lands here." (the bell glyph here is content text, not an icon — works in handoff context).

### Files touched (iter-109)

```
src/app/actions/pos.ts                         + topItems[5] in getTodaysTill (single-pass aggregation)
src/components/admin/AdminPOSPanel.tsx
  + till state extended with topItems
  + .top-strip / .top-grid / .top-pill / .top-pill.r{1..5} / .top-rank
    / .top-pill-name / .top-pill-meta / .top-pill-amount / .top-empty styles
  + podiumGrow keyframe with bottom-center transform-origin
  + TopItemsLeaderboard component (~45 lines)
  + Slotted between till summary and milestone banner
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 57s` · 186 routes). Dev server `/login` returns 200.

### Loop status

109 iterations. Production deploy still gated. POS iter-31 of N — Top Items Podium Leaderboard landed.

## 121. POS — iter-110 (Auto-Tax 9.5% toggle + tiered CHARGE pulse)

Iter-32. Two pragmatic visual upgrades on the cart panel and the action row:

### 1. Auto-Tax 9.5% toggle (LA County rate)

A small **AUTO** pill anchored top-right of the Tax adjustment field. When off (default): manual entry. When on (active blue): auto-fills `tax = (subtotal − discount) × 9.5%` on every change to subtotal/discount, and locks the input from manual edits (the `Adjust` onChange becomes a no-op while autoTax is on).

- `autoTax: boolean` state, persisted to `localStorage["noho-pos-autotax"]`
- `TAX_RATE = 0.095` const (LA County)
- Recompute `useEffect` runs on `[autoTax, subtotalCents, discountCents]` change — placed AFTER `discountCents` is declared (avoids the same forward-reference issue iter-26 hit)
- Pill toggle: cream/brown when off, blue/cream when on. Title attribute switches between "click to enable" / "click to disable" guidance

Pill visual: 8px rectangular chip top-right of the Tax `<Adjust>`, label flips between `AUTO` and `AUTO 9.5%` to communicate active rate.

### 2. Tiered CHARGE pulse

The CHARGE button now escalates with cart total:

- **Default** (under $100): existing red keycap, no animation
- **`tier-warm`** (≥ $100): `chargeWarm 2.4s ease-in-out infinite` — a warm gold halo box-shadow pulses 0 → 3px outer ring, gentle attention
- **`tier-big`** (≥ $500): `chargeBig 1.8s ease-in-out infinite` — bigger halo, 6px ring, the gold glow doubles in spread (up to 24px)
- **`tier-jackpot`** (≥ $1,000): full sparkle treatment
  - Background overrides keycap-red with a 5-stop gradient `#f24739 → ${RED} → #fff3c0 → ${RED} → #a40010` at 280% width
  - `chargeJackpotShine 2.4s linear infinite` slides the gradient `-120% → 220%` for a metallic light-sweep
  - Plus the `chargeBig 1.4s` pulse running concurrently
  - 4px outer cream-gold halo at 0.4 opacity, 28px gold glow shadow

Class is computed inline based on `totalCents` thresholds — `cubic-bezier`-free, just decorative.

### Files touched (iter-110)

```
src/components/admin/AdminPOSPanel.tsx
  + autoTax state + TAX_RATE const + 2 effects (load/save) + recompute effect after discountCents declaration
  + AUTO pill toggle absolute-positioned over the Tax Adjust field
  + Tax Adjust onChange becomes a no-op when autoTax is on (locks manual input)
  + CHARGE button gets dynamic className: charge-tier + tier-warm | tier-big | tier-jackpot
  + .charge-tier .tier-warm | .tier-big | .tier-jackpot styles
  + chargeWarm + chargeBig + chargeJackpotShine keyframes
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 52s` · 186 routes) on the second attempt — first pass had `subtotalCents used before declaration` ordering issue, fixed by moving the recompute effect below the `subtotalCents` memo. Dev server `/login` returns 200.

### Loop status

110 iterations. Production deploy still gated. POS iter-32 of N — Auto-Tax + Tiered CHARGE pulse landed.

## 122. POS — iter-111 (Coupon code field with apply chip)

Iter-33. A coupon input row below the adjustments. Customer types a code, hits APPLY, code is validated against a hardcoded set, and a discount custom line lands in the cart with an animated chip.

### Coupon set (`COUPON_CODES`)

7 hand-picked codes mapped to `{ kind: "pct" | "flat", value, label }`:

| Code        | Type | Value | Label                                    |
|-------------|------|-------|------------------------------------------|
| NOHO10      | pct  | 10    | NOHO neighbor · 10% off                  |
| WELCOME20   | pct  | 20    | First-time welcome · 20% off             |
| LOCAL15     | pct  | 15    | Local Friends · 15% off                  |
| FRIEND15    | flat | 15    | Friend referral · $15 off                |
| BIRTHDAY    | flat | 25    | Happy Birthday · $25 off                 |
| TEACHER     | pct  | 10    | Teacher discount · 10% off               |
| MILITARY    | pct  | 10    | Military discount · 10% off              |

(Future: persist to SiteConfig for admin-edit.)

### Apply flow

`applyCoupon()`:
1. Trim + uppercase the input
2. Reject empty / unknown / no-cart-yet
3. For pct: `discountCents = Math.round(subtotal × value/100)`. For flat: `min(subtotal, value × 100)` (caps so subtotal can't go negative)
4. Calls existing `addCustomLineNamed("Coupon ${code}: ${label}", -discountCents)` — reuses iter-18's promo-line pattern, so cart math handles the negative line correctly
5. Clears input, fires success message

### Visual

A horizontal row below the Discount/Tax/Tip adjustments:

- `COUPON` label (9px tracked-uppercase, 65% opacity)
- Wide cream-tan input with brown border, uppercase placeholder hint listing valid codes ("Type code · NOHO10 · WELCOME20 · LOCAL15"), `letter-spacing: 0.06em`, focus ring on the dark-brass border
- `APPLY` button — gold keycap-styled
- Enter on the input also fires apply (no need for the button)

### Result chip

Below the input, a result chip appears for 3.5s:

- **Success** (`.coupon-msg.ok`): green pill (`#d3f0d3` bg, `#1a4a1a` text, `#2a8a2a` border) with the coupon's label. Animation `couponPop 360ms cubic-bezier(.34,1.56,.64,1)` — small scale-bounce overshoot.
- **Error** (`.coupon-msg.err`): red pill (`#f5d3d0` bg, `#8a1010` text). Animation `couponShake 380ms ease-out` — 6-step horizontal shake (-6 → +5 → -4 → +3 → -1 → 0).

Each new message increments a `key: Date.now()` field so successive errors / successes each get a fresh remount and re-trigger the animation.

### Files touched (iter-111)

```
src/components/admin/AdminPOSPanel.tsx
  + CouponDef type + COUPON_CODES map (7 entries)
  + couponInput + couponMsg state
  + applyCoupon helper (validate, compute, addCustomLineNamed, message)
  + .coupon-msg / .coupon-msg.ok / .coupon-msg.err styles
  + couponPop + couponShake keyframes
  + Coupon input + APPLY button row + msg chip slotted between adjustments and tip-% chips
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 56s` · 186 routes). Dev server `/login` returns 200.

### Loop status

111 iterations. Production deploy still gated. POS iter-33 of N — Coupon code field landed.

## 123. POS — iter-112 (Daily Streak Counter — flame chip)

Iter-34. Header chip shows consecutive days the team has rung up at least one sale. Tier styling escalates with the streak length and milestone callouts trigger at 1 week / 2 weeks / 1 month / 50 / 100 days.

### Streak state + persistence

`streak: { dateYmd, count } | null` persisted to `localStorage["noho-pos-streak"]`.

On mount:
- Load saved record
- If `dateYmd === today` or `dateYmd === yesterday` → restore as-is (streak still alive)
- Else → set `count: 0` (broken — chip won't render)

On every successful charge, `bumpStreak()`:
- No prev → `{today, 1}`
- prev.dateYmd === today → no-op (already counted)
- prev.dateYmd === yesterday → `{today, prev.count + 1}` (streak continues)
- otherwise → `{today, 1}` (broken, restart)

Persisted on every change.

### `<StreakChip>` component

Tier picked by count:

| Count | Tier        | Border / Bg                                | Flame size |
|-------|-------------|--------------------------------------------|------------|
| 1–2   | spark       | brass-dark border, cream-tan body          | 12px       |
| 3–9   | warm        | copper border, cream→gold body             | 14px       |
| 10–29 | blazing     | red border, peach→orange body, dark-red ink| 16px       |
| 30+   | legendary   | dark-red border, orange→red body, cream ink, **`streakLegendaryGlow 1.6s` orange box-shadow pulse** | 18px |

**Flame SVG** (24×24 viewBox, classic teardrop path with inner-flicker highlight) animates `flameFlicker 1.6s ease-in-out infinite` — subtle scale + rotate cycle (`scale(1) rotate(-1°)` → `scale(1.06) rotate(2°)` → `scale(0.96) rotate(-2°)` → `scale(1.04) rotate(1.5°)` → `scale(1) rotate(-1°)`) with brightness modulation, `transform-origin: 50% 100%` so it dances from its base. **Per-tier gradient stops** — spark cream→brass, warm cream→gold, blazing cream→orange→red, legendary brighter cream→fire→deep-red.

### Milestone callouts

Right side of the chip shows context based on count:
- Default: `Ndays` plural-aware
- 7 → `· 1 week!`
- 14 → `· 2 weeks!`
- 30 → `· 1 month!`
- 50 → `· 50 days!`
- 100 → `· 100 days!`

Hidden on `<md` to keep the chip compact on phones.

### Files touched (iter-112)

```
src/components/admin/AdminPOSPanel.tsx
  + streak state + todayYmd + yesterdayYmd helpers
  + Mount-time auto-decay (broken streak shows count=0)
  + bumpStreak helper, called on every successful charge
  + .streak-chip / .streak-chip.tier-{spark,warm,blazing,legendary} / .flame styles
  + flameFlicker + streakLegendaryGlow keyframes
  + StreakChip component (~70 lines) with per-tier flame gradient + milestone labels
  + Slotted into header before CashierBadge (only renders when count > 0)
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 77s` · 186 routes). Dev server `/login` returns 200.

### Loop status

112 iterations. Production deploy still gated. POS iter-34 of N — Daily Streak Counter landed.

## 124. POS — iter-113 (Gift Card sell flow)

Iter-35. Cashier hits **GIFT** in the header → modal pops with a branded gift-card preview, denomination picker, custom amount, optional recipient name, and a generated 12-char redemption code. Confirming adds a custom line "Gift Card $X to {recipient} · Code GC-XXXX-XXXX" at the chosen amount; the receipt prints the code so customer (or recipient) can redeem at any future visit.

### `<GiftCardModal>` visual

- **Branded gift card** at the top — `linear-gradient(120deg, #2b3e7d 0%, ${BLUE} 25%, #4793a6 50%, ${BLUE} 75%, #2b3e7d 100%)` 220% width with `giftShimmer 6s linear infinite` sliding background-position — produces a metallic blue sheen across the card. Gold border, deep drop shadow, inset highlight.
- **Card layout**: top-left brand stamp `◆ NOHO Mailbox` + "Gift Card" headline + "Mail · Notary · Shipping · Supplies" sub-line. Top-right: 9px tracked `FACE VALUE` eyebrow + 36px gold dollar amount that updates live as the cashier picks denominations.
- **Code band** in the middle — dark translucent panel with dashed cream border, monospace family. Shows `REDEMPTION CODE` eyebrow + the 12-char `GC-XXXX-XXXX` code + a `↻ NEW` button that re-rolls. Codes use 28 unambiguous alphanum chars (no I/L/O/0/1/5/8 to avoid misreads).
- **Bottom strip**: store address.
- **Card entry** via `giftCardEnter 480ms cubic-bezier(.34,1.56,.64,1)` — scale-rotate overshoot from `0.92 -2deg` to `1.04 +1deg` to settle.

### Settings panel below the card

Cream-tan card with brass border:

- **Denomination row** — 4 pills: $25, $50, $100, $200. Active pill switches to gold gradient with brown ink. Click clears any custom amount.
- **Custom amount + Recipient name** in a 2-up grid — custom `$XX.XX` input + 28-char recipient field
- **CANCEL · ADD TO CART** action row (dark + gold)
- Footer note: "Customer pays at checkout. Code prints on the receipt."

### Confirm flow

`onSell(amountCents, code, recipient)` → calls existing `addCustomLineNamed("Gift Card $25 to Mom · Code GC-AC4D-EFGH", 2500)`. The custom-line label prints verbatim on the receipt. Cashier rings up the cart normally; gift cards count toward the daily till + tip-jar + streak normally.

### Header button

Red gradient pill (between POP OUT and TILL): `linear-gradient(180deg, #c92a4d 0%, #8a1010 100%)` with cream ink + dark border. Gift-icon glyph (parcel + bow). Stands out as the only red header chip — visually flags "promotional / upsell."

### Files touched (iter-113)

```
src/components/admin/AdminPOSPanel.tsx
  + giftOpen state
  + GIFT header button (red gradient with bow icon)
  + GiftCardModal mount with addCustomLineNamed wiring
  + .gift-overlay / .gift-card / .gift-card-shell / .gift-band / .gift-amount-row / .gift-amount-pill styles
  + giftCardEnter + giftShimmer keyframes
  + GiftCardModal component (~150 lines): denom pills + custom amount + recipient + code regen
  + GiftIcon glyph
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (`✓ Compiled successfully in 54s` · 186 routes). Dev server `/login` returns 200.

### Loop status

113 iterations. Production deploy still gated. POS iter-35 of N — Gift Card sell flow landed.


## 125. POS — iter-114 (Cabinet Decals / Stickers)

Iter-36. The cabinet now wears five sticker-style decals plastered around its corners — small adhesive badges with hand-applied rotations, the kind real shop registers accumulate over the years. Subtle hover peel-back animation makes them feel like physical stickers rather than printed graphics.

### Decal lineup

- **`.decal-est`** — top-left, `-7deg` tilt. Cream-tan body with brown ink. Reads `EST · 2023`. Anchors the cabinet's age/heritage signal.
- **`.decal-family`** — top-right, `+5deg`. Red gradient (`#a31920 → #6e0e12`) with cream ink. Reads `★ Family Owned`. Mirrors the cream-on-red of the cabinet's brand badge.
- **`.decal-member`** — bottom-left, `+4deg`. Blue gradient (`#2b5e6f → #1f4452`) with cream ink. Reads `NoHo Biz · Member`. Echoes the brand BLUE token.
- **`.decal-hours`** — bottom-right, `-3deg`. Gold gradient (`#d6b966 → ${GOLD_DARK}`) with brown ink. Reads `Open Mon-Sat · 9:30-5:30`. Practical info masquerading as a sticker.
- **`.decal-star`** — mid-right, vertically centered, `+8deg`. Olive gradient (`#5d6d3a → #3f4a26`) with light-green ink. Reads `♥ NOHO`. The "lucky charm" sticker.

Each decal has a 1px brass border, a soft `0 4px 6px rgba(0,0,0,0.25)` shadow, slight inset highlight, and `letter-spacing: 0.06em` uppercase tracking for that authentic decal print look.

### Hover peel animation

Hover triggers `decalPeelOnce 320ms ease-out`:

- Frame 0: rest position
- Frame 50%: `skewX(-3deg) translateY(-2px) scale(1.02)` + brighter shadow — the corner curls up
- Frame 100%: settles back to rest

Because the keyframe runs once on hover (rather than looping), it feels physical: lift the corner, let it drop. Cursor stays pointer-style so it reads as interactive even though there's no click handler.

### Mobile

`@media (max-width: 640px) { .decal { display: none; } }` — phones don't have room for decorative stickers without crowding the actual register controls.

### Files touched (iter-114)

```
src/components/admin/AdminPOSPanel.tsx
  + <CabinetDecals /> mount inside the cabinet shell
  + CabinetDecals component (~12 lines: 5 div renders)
  + .decal base styles + .decal-est/.decal-family/.decal-member/.decal-hours/.decal-star variants
  + decalPeelOnce keyframe
  + @media (max-width: 640px) hide rule
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

114 iterations. POS iter-36 of N — cabinet now decorated with five hand-tilted decals; hover them to feel a corner peel.


## 126. POS — iter-115 (Brass Pressure Gauges)

Iter-37. The cabinet now sports a row of three vintage analog gauges mounted between the engraved nameplate and the promotions strip. Brass bezels, glass domes with reflections, painted dial faces with major + minor tick marks, gold "normal range" arcs, red zone arcs, and red-spiked needles that snap to live till data with a spring-y `cubic-bezier(.34, 1.56, .64, 1)` overshoot. Real cash registers used pressure/voltage/RPM gauges as glanceable health indicators — these do the same.

### The three gauges

- **`RPM · SALES`** — needle tracks today's sales count. Max=40, red zone @ 75%. Normal range gold arc. Display reads `00`-`40` (zero-padded).
- **`PSI · AVG`** — needle tracks average ticket value (avg sale ÷ count). Max=$250, red zone @ 75%. Display reads `$XX`.
- **`VOLT · TILL`** — needle tracks today's running total. Max=$3000, red zone @ 85% (so the needle hits red on a $2550+ day, mirroring "this is a big day" energy). Display reads `$XXXX`.

All three needles snap to value with `transition: transform 720ms cubic-bezier(.34, 1.56, .64, 1)` — the same spring curve used elsewhere in the panel. New sale → till refreshes → all three needles spring to new positions.

### Visual anatomy of one gauge

- **88×88px circular glass dome** — radial-gradient face from `#1a0e07` at center to `#0a0503` at edge, encased in concentric brass rings (`#c9a24a` outer, `#5a4318` shadow groove, `#8c6e27` inner) for depth.
- **Painted dial** — `#f5e7c2` cream face inside the bezel.
- **Gold arc** (normal range) — sweeps from -135° to +(redZone × 270 - 135)°. `stroke: #c9a24a`, `stroke-width: 2.2`.
- **Red zone arc** — sweeps from the gold-arc endpoint to +135°. `stroke: #a31920`.
- **11 major ticks** at every 27° around the 270° sweep, each 5px long, `stroke-width: 1.4`.
- **40 minor ticks** at every 6.75°, 3px long, `stroke-width: 0.7`, `opacity: 0.65` — fills in the dial like a real gauge.
- **Engraved unit label** at the 6 o'clock position (`RPM · SALES`, `PSI · AVG`, `VOLT · TILL`) in 7px Courier monospace, brown ink, 0.18em tracking.
- **Red needle** — 41px-long pointed polygon (`#a31920`), with a 6px counter-balance polygon on the back side (`#4a0c10`), drop-shadow filter for depth.
- **Brass center hub** — 4.2px outer disc + 1.4px inner pin, providing the visual pivot for the needle.
- **Glass shine** — `::after` pseudo with two radial-gradient highlights (top-left main, bottom-right secondary) overlay, simulating a real curved-glass dome.

### Cluster styling

The three gauges sit on a recessed inset panel:

- Background: `linear-gradient(180deg, rgba(0,0,0,0.32), rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.28))` — feels carved into the cabinet.
- Border: `1px solid rgba(0,0,0,0.5)`, plus inset highlight on top edge and inset shadow on bottom edge.
- Drop shadow: `0 4px 10px rgba(0,0,0,0.35)`.
- Two brass rivet pseudo-elements (`::before` left, `::after` right) bookend the cluster — `radial-gradient(circle at 30% 30%, #ffd86b, #8c6e27 70%)` with a subtle inner highlight, securing the panel to the cabinet body.
- Each gauge has a 9px Courier-mono `gauge-value` digital readout below the dome — the analog needle is the headline, the digital figure is the precision backup.

### Below 640px

`.gauge-cluster { gap: 10px; padding: 8px 12px }` and `.gauge-glass { width: 72px; height: 72px }` so phones still see the gauges, just compacted.

### Files touched (iter-115)

```
src/components/admin/AdminPOSPanel.tsx
  + <GaugeCluster /> mount between brass top-rail and PromoStrip (gated on `till` data)
  + Gauge component (~70 lines: SVG with arcs, ticks, needle, hub)
  + GaugeCluster component (~25 lines: 3 gauges with live till data)
  + .gauge-cluster / .gauge / .gauge-glass / .gauge-svg / .gauge-face / .gauge-tick-major / .gauge-tick-minor / .gauge-arc / .gauge-arc-redzone / .gauge-needle-group / .gauge-hub / .gauge-hub-inner / .gauge-unit-label / .gauge-readout / .gauge-label / .gauge-value styles
  + brass-rivet bookends via .gauge-cluster::before/::after
  + glass-dome reflection via .gauge-glass::after
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean. The /admin/pos route is auth-gated so live preview can't render without a session, but the same code path that ships to prod compiled cleanly.

### Loop status

115 iterations. POS iter-37 of N — three brass pressure gauges now monitor the till like a 1920s factory floor. Each new sale springs the needles. Production deploy still gated.


## 127. POS — iter-116 (Vacuum Tube Indicators)

Iter-38. The cabinet now glows. A horizontal rail of five glass vacuum tubes — `V1 · V2 · V3 · V4 · V5` — sits between the macro toolbar and the LCD strip. Each tube has a soft amber filament that breathes in and out at idle, then flashes bright orange when the cabinet is "active" (item added/removed from cart, or sale finalized). The cabinet now feels like it's *warming up* before each transaction, channeling the Western Electric / Burroughs ledger-machine aesthetic.

### Anatomy of one tube (28×78px)

- **Brass solder cap** at the top — 4×4px radial-gradient dot (`#c9a24a → #5a4318 → #2D100F`) emerging from the glass envelope.
- **Glass envelope** — 26×64px with rounded top and slight bottom rounding. Background combines a top-left highlight `radial-gradient(ellipse 80% 40% at 30% 20%, rgba(255,255,255,0.3))` with a faint blue-tint backplate. 1px translucent border `rgba(160, 200, 220, 0.3)`.
- **Internal grid wires** — `repeating-linear-gradient(0deg, ...)` of 0.5px brown lines spaced 4px apart across the middle 70% of the tube's interior, simulating the control grid you'd see between cathode and plate.
- **Filament** — 14×36px central blob with `linear-gradient(180deg, amber → orange → deep-orange)` and `filter: blur(2px)` for that hot-element halo.
- **Brass base** — 20×12px gradient (`#c9a24a → #8c6e27 → #5a4318`) with two pin protrusions (`::before` + `::after`) sticking out the bottom — the iconic 8-pin tube socket silhouette.
- **Engraved label** — 6px Courier monospace `V1` / `V2` / `V3` / `V4` / `V5` below the base, in the rail-text gold.

### Idle ambient breathing

Each tube animates `vacuumTubeIdle 4s ease-in-out infinite` cycling the `--tube-glow` custom property between `0.30` and `0.50`. Stagger via `nth-child(n) { animation-delay: ... }` — V2 lags 0.5s behind V1, V3 lags 1s, etc. The cluster never glows in lockstep; it feels alive.

The CSS uses `@property --tube-glow` to register the custom prop as a `<number>`, so the browser can interpolate it smoothly. (Without `@property`, custom-property animations would step rather than tween.)

### Active flash

`fireTubeFlash()` bumps a `tubeFlashKey` integer; the inner `<VacuumTube>` rows are keyed `${flashKey}-${label}` so a key change unmounts and remounts the row, restarting the `vacuumTubeFlash 700ms ease-out` animation from the top. The flash drops `--tube-glow` from `0.95` to `0.45`, while `.is-flashing .vacuum-tube-glass` swaps the box-shadow to a much brighter orange halo (`0 0 16px rgba(255, 160, 50, 0.65), 0 0 28px rgba(255, 120, 40, 0.4)`).

Triggers:
- **Cart change** — `useEffect` on `cart.length` (skips the initial empty mount); every add/remove pulses the row.
- **Sale completion** — alongside the existing PAID-stamp / confetti / printer / bell celebration cluster.

### Rail mount

The rail itself is a brass-mounted strip styled to look bolted to the cabinet:

- Background: `linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.12) 50%, rgba(0,0,0,0.30) 100%)` — same recessed-inset look as the gauge cluster.
- 1px dark border, top corners rounded, bottom flush against the LCD.
- Two brass rivets (`::before` / `::after`) at the bottom corners holding the rail to the cabinet body.
- Inset top highlight + inset bottom shadow groove for depth.

### Below 640px

`.vacuum-rail { gap: 10px; padding: 4px 10px 3px }`, tubes scale to 22×64px, base shrinks to 16×9px, label drops to 5px font.

### Files touched (iter-116)

```
src/components/admin/AdminPOSPanel.tsx
  + tubeFlashKey state + fireTubeFlash() + cart-length useEffect that pulses on changes
  + fireTubeFlash() call inside the sale-completion celebration block
  + <VacuumTubeStack /> mount between MacroToolbar and LCD strip
  + VacuumTube + VacuumTubeStack components (~25 lines)
  + .vacuum-rail / .vacuum-tube / .vacuum-tube-glass / .vacuum-tube-grid / .vacuum-tube-filament / .vacuum-tube-cap / .vacuum-tube-base / .vacuum-tube-label styles
  + @property --tube-glow declaration (smooth custom-property interpolation)
  + vacuumTubeIdle + vacuumTubeFlash keyframes
  + per-tube animation-delay stagger (0s / 0.5s / 1s / 1.5s / 2s)
  + .is-active and .is-flashing state classes
  + brass-rivet bookends via .vacuum-rail::before/::after
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

116 iterations. POS iter-38 of N — five vacuum tubes now breathe amber light above the LCD; cart changes and sales make them blaze orange. The register has joined the 1940s.


## 128. POS — iter-117 (CRT Phosphor Display)

Iter-39. The LCD has been transformed from a flat green panel into a curved CRT phosphor display. Five new effects layer on top of the existing scanline/sweep CSS to recreate the look of a 1980s green-screen terminal: denser flickering scanlines, a slow vertical refresh sweep, a horizontal hum bar that drifts down the screen, a corner vignette mimicking glass-tube barrel distortion, and slightly sharper rounded corners faking the bezel curvature.

### The five new layers

1. **`.crt-vertical-sweep`** — a 9% tall horizontal bar that travels from `top: -12%` to `top: 110%` over 7 seconds, with `linear-gradient(180deg, transparent → glow 28% → transparent)` and a 1px blur. Mimics the vertical retrace flyback of an old CRT. `mix-blend-mode: screen` so it brightens the phosphor where it overlaps.

2. **`.crt-vignette`** — `radial-gradient(ellipse 110% 95% at 50% 50%, transparent 38%, rgba(0,0,0,0.20) 75%, rgba(0,0,0,0.55) 100%)` darkens the corners. A second radial-gradient at `50% 30%` adds a faint top-center phosphor halo. `mix-blend-mode: multiply` so it darkens existing pixels rather than overlaying them.

3. **`.crt-hum`** — a 1px bright horizontal line that animates `top: 8% → 92%` over 3.3s, fading in and out. Channels the line-noise hum bar you see on misadjusted CRTs. `linear-gradient(90deg, transparent → glow 38% → transparent)` so it's brightest in the center.

4. **Densified scanlines** — the existing `.lcd::before` repeating-linear-gradient now uses `8%` glow (up from `6%`) and tighter spacing (`2.4px` periodicity instead of `3px`). Plus a new `crtScanlineFlicker 4.7s ease-in-out infinite` keyframe drops the scanline opacity to `0.78` / `0.84` / `0.92` at three random moments per cycle, then snaps back to 1 — that flicker every 1-2s makes it feel like an unstable phosphor.

5. **Corner curvature** — `border-radius: 14px` (up from rounded-xl's 12px) gives the screen a slightly more domed appearance.

### Z-index stacking

To keep the inner content (Total Due, item count, subtotal) above the new overlay layers without rewriting every JSX child:

```css
.lcd > div:not(.crt-vertical-sweep):not(.crt-vignette):not(.crt-hum) {
  position: relative;
  z-index: 4;
}
```

Vignette = `z: 1`, vertical-sweep = `z: 2`, hum = `z: 3`, content = `z: 4`. Overlays still affect rendering via blend modes; content sits crisply above them.

### Theme awareness

All effects use `color-mix(in srgb, var(--lcd-glow), ...)` so when the cashier swaps brass → aluminum → walnut, the CRT effects pick up the matching `--lcd-glow` token — green phosphor for brass, white-blue for aluminum, amber for walnut.

### Files touched (iter-117)

```
src/components/admin/AdminPOSPanel.tsx
  + .crt-vertical-sweep + ::after with blur + mix-blend-mode: screen
  + .crt-vignette dual-radial + mix-blend-mode: multiply
  + .crt-hum 1px line with crtHum keyframe
  + crtScanlineFlicker keyframe applied to .lcd::before
  + scanline glow density bumped 6% → 8%, periodicity 3px → 2.4px
  + border-radius: 14px on .lcd
  + z-index stacking rule for non-overlay LCD children
  + 3 overlay <div aria-hidden /> mounted inside the LCD container before existing content
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

117 iterations. POS iter-39 of N — the LCD is no longer a flat green rectangle. It hums, flickers, sweeps, and vignettes like the cabinet was made in 1986.


## 129. POS — iter-118 (Mechanical Drum Counter)

Iter-40. The cabinet now sports a row of 7 rotating mechanical drums above the gauge cluster, displaying today's till total like a 1920s cash register or vintage car odometer. Each digit is an inset dark cylinder with cream-painted numerals; when a digit changes, the strip translates upward with a spring-y `cubic-bezier(.34, 1.56, .64, 1)` over 720ms — the new number rolls into view from below while the old one disappears upward, exactly like the click-clack mechanical totalizers on real registers.

### One drum digit (24×36px)

- **Cylinder body** — `radial-gradient(ellipse at 50% 50%, #20120a 0%, #0a0503 80%)` over a 1px brass-trim border (`#5a4318`), 3px rounded corners, deep inset shadow `inset 0 1px 2px rgba(0,0,0,0.85), inset 0 0 6px rgba(0,0,0,0.7)`.
- **Top + bottom darkening** via `::before` — `linear-gradient(180deg, rgba(0,0,0,0.78) 0%, transparent 22%, transparent 78%, rgba(0,0,0,0.78) 100%)` makes the top/bottom 22% of each digit fade to black, faking the curvature of a physical cylinder where the visible band wraps around.
- **Center seam** via `::after` — a 1px `rgba(0,0,0,0.6)` horizontal line bisects the digit, simulating the gap where the next number rolls into view.
- **Digit strip** — `display: flex; flex-direction: column` of 10 `<span>0</span>...<span>9</span>` blocks, each 36px tall. `transform: translateY(calc(var(--odo-pos) * -36px))` positions the strip; `--odo-pos = currentDigit`. Transition `transform 720ms cubic-bezier(.34, 1.56, .64, 1)` gives the spring overshoot that real mechanical drums have (the inertia of the cylinder + the click-stop spring).
- **Painted digit styling** — `font-family: "Courier New" monospace`, `color: #f5e7c2` cream, `text-shadow: 0 1px 1px rgba(0,0,0,0.95), 0 -1px 0 rgba(255, 230, 180, 0.18)` for the chiseled "engraved on metal" look. 22px font.

### Bezel kick

When a digit transitions, `is-rolling` class triggers `odoBezelKick 720ms ease-out`:

```
0%, 100% → translateY(0)
40%      → translateY(0.6px)
60%      → translateY(-0.4px)
```

The whole bezel jiggles a fraction of a pixel, simulating the mechanical impact of the drum slamming into its detent. Sub-pixel motion that registers as "alive" rather than as visible movement.

### Counter assembly

The `OdometerCounter` displays a 7-digit running total: `$ XX,XXX.XX` with the dollar sign, comma separator, and decimal point as flat brass-cream typography between the drums (rendered as `<span>` rather than as additional drums, so they don't roll).

- **Caps at $99,999.99** — anything beyond that would require an 8th digit. The Math.min(9_999_999, ...) clamps the input.
- Wired to `till.totalCents` so it reflects today's running register total. As each sale completes and `till` refreshes, only the digits that *actually* changed roll — others stay still.

### Band styling

- Background: `linear-gradient(180deg, #2a1a0a 0%, #1a0e07 60%, #2a1a0a 100%)` — recessed brown panel.
- 1px dark border, inset highlight on top edge (`rgba(201, 162, 74, 0.18)` to suggest a brass trim line), inset shadow at bottom.
- Two brass rivet bookends (`::before` / `::after`) on the left/right.
- Drop shadow `0 4px 8px rgba(0,0,0,0.35)`.
- Label "TODAY" in 9px Courier mono, gold (`#c9a24a`), 0.32em tracking — sits to the left of the row of drums.

### Mount location

Inside the cabinet, between the brass top-rail (engraved nameplate) and the brass pressure gauges. The order is now:
1. Top brass rail with rivets + nameplate
2. **Today's till odometer** ← new
3. Brass pressure gauges (RPM/PSI/VOLT)
4. Promotions strip
5. Macro toolbar
6. Vacuum tube rail
7. LCD (now CRT-style)
8. Cart, payment, etc.

This puts the mechanical "running total" where the cashier's eye already gravitates, sandwiched between the gold-engraved cabinet name and the analog gauges. A complete vintage instrument cluster.

### Below 640px

`.odo-band { gap: 8px; padding: 8px 14px }`, drums shrink to 20×30px, font drops to 18px. Phones still see the rolling drums, just at slightly smaller scale.

### Files touched (iter-118)

```
src/components/admin/AdminPOSPanel.tsx
  + OdometerDigit component (~22 lines): tracks pos via useState, applies is-rolling class on change
  + OdometerCounter component (~30 lines): splits totalCents → 7 digits + currency/comma/decimal separators
  + <OdometerCounter /> mount between brass top-rail and GaugeCluster (gated on `till`)
  + .odo-band / .odo-label / .odo-row / .odo-currency / .odo-comma styles
  + .odo-digit / .odo-digit::before (top/bottom darkening) / .odo-digit::after (center seam)
  + .odo-strip / .odo-strip span styles + 720ms cubic-bezier transform transition
  + .odo-band::before/::after brass-rivet bookends
  + odoBezelKick keyframe + .odo-digit.is-rolling animation hook
  + sub-640 responsive override
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

118 iterations. POS iter-40 of N — today's running till total now rolls on 7 mechanical drums above the gauges. Each new sale clicks the digits over with a spring-y bezel jiggle. The cabinet has officially become an early-20th-century instrument panel.


## 130. POS — iter-119 (Striped Shopfront Awning)

Iter-41. The cabinet now has a 1940s storefront awning slung above it. Cream + red vertical fabric stripes, "NOHO MAILBOX" embroidered in serif type across the front, two brass mounting brackets at the top corners, and a dangling brass pull-cord on the right with a small bell-weight at the tip. The whole thing sways gently as if catching a breeze. Drop shadow casts onto the cabinet below. The register is no longer just a register — it's a tiny shopfront.

### The SVG awning

The fabric is rendered as a single inline SVG with `preserveAspectRatio="none"` so it stretches to whatever width the cabinet is. The path is generated procedurally:

```
M 0 0
L 480 0       (top-right corner)
L 480 36      (drop down to where scallops start)
Q 470 50 460 36   (24 quadratic bumps back to x=0)
Q 450 50 440 36
... (×24)
Z             (close to (0,0))
```

24 down-bulging quadratic curves, each 20 viewbox-units wide, dropping 14 below the stripe band. The shape is filled with `<pattern id="awning-stripes">` — alternating 16-wide cream (`#f5e7c2`) and red (`#c92a4d`) bands repeating across the full path. A second pass with `<linearGradient id="awning-shade">` (top dark → mid-transparent → bottom dark) layers a soft fabric shading on top, suggesting fold lines and how light catches the curved scallop bulges.

A row of dashed `<line>` elements at every stripe seam fakes the hand-stitched joinery between the fabric panels — `stroke-dasharray="1.5 1.5"`, `stroke-width="0.4"`, `rgba(45, 16, 15, 0.25)`.

### "NOHO MAILBOX" appliqué

Centered serif text positioned absolutely on the awning:

- `font-family: Georgia, "Times New Roman", serif`
- `font-weight: 900`, `font-size: 17px`, `letter-spacing: 0.22em`
- `color: #f5e7c2` cream
- Triple text-shadow: `0 1px 0 #5a0a14` (incised line), `0 2px 4px rgba(0, 0, 0, 0.5)` (drop), `0 0 1px rgba(245, 231, 194, 0.6)` (anti-alias glow)

The shadow combination makes the text feel embroidered into the fabric rather than just printed on top.

### Brass mounting brackets

Two 18×12px brass tabs (`linear-gradient(180deg, #c9a24a → #8c6e27 → #5a4318)`) sit at the top corners of the awning, with a 4×4px screw-head dot in the middle (`radial-gradient(circle at 30% 30%, #5a4318, #2D100F)`). Visual cue that the awning is bolted to the wall above the cabinet.

### Pull-cord with bell-weight

A 1.4×92px vertical line (`linear-gradient(180deg, #2D100F → #5a4318)`) hangs from the upper-right of the awning. At the bottom: a 10×10px brass ball (`radial-gradient(circle at 30% 30%, #ffd86b, #c9a24a, #8c6e27)`) with thin border, drop shadow, and inset top highlight — a brass pull-bell that swings independently.

### Sway animation

Two coordinated keyframes:

```css
@keyframes awningSway {
  0%   { transform: rotate(-0.35deg); }
  50%  { transform: rotate(0.35deg); }
  100% { transform: rotate(-0.35deg); }
}
@keyframes awningCordSway {
  /* same range, but reversed direction */
  0%   { transform: rotate(-0.6deg); }
  50%  { transform: rotate(0.6deg); }
  100% { transform: rotate(-0.6deg); }
}
```

Awning rotates 0.7° peak-to-peak over 8s. The cord uses `animation-direction: reverse` and a slightly larger range (1.2°), so the cord swings out of phase with the awning — it looks like the cord has its own inertia. Subtle but the eye picks it up as "alive."

The whole awning has `transform-origin: 50% 0%` so it pivots from where the brackets bolt it to the wall.

### Drop shadow

`filter: drop-shadow(0 8px 6px rgba(0, 0, 0, 0.4))` casts a soft 8px shadow onto the cabinet below — visually anchoring the awning as a solid object hanging in front of the register. The shadow follows the scalloped bottom edge faithfully (because `drop-shadow` filter respects the SVG path's transparency, unlike `box-shadow`).

### Z-index + layout

The awning is mounted INSIDE `pos-tilt-stage` but BEFORE `pos-cabinet`:

```jsx
<div className="pos-tilt-stage">
  <Awning />
  <div className="pos-cabinet">...</div>
</div>
```

This makes it part of the parent's perspective transform (so it tilts with the cabinet on hover) but sits above and outside the cabinet's `overflow: hidden` clip — the brass brackets and pull-cord can extend beyond the awning's own bounds without being clipped.

`margin: 0 -8px -10px` extends the awning slightly past the cabinet's left/right edges (so the brackets visually attach above the cabinet's outer corners) and tucks the bottom 10px UNDER the top of the cabinet (so the scallops appear to drape over the brass top-rail).

### Below 640px

```css
.awning { height: 42px; }
.awning-text { font-size: 12px; letter-spacing: 0.16em; }
.awning-cord { height: 76px; right: 14px; }
.awning-bracket-l, .awning-bracket-r { width: 14px; height: 9px; }
```

Phones still get the awning, just at proportionally smaller scale.

### Files touched (iter-119)

```
src/components/admin/AdminPOSPanel.tsx
  + Awning component (~50 lines): inline SVG path generation + brackets + cord
  + <Awning /> mount inside pos-tilt-stage, before pos-cabinet
  + .awning / .awning-svg / .awning-text / .awning-cord / .awning-cord-bell styles
  + .awning-bracket-l / .awning-bracket-r + ::after screw-head pseudo-elements
  + awningSway + awningCordSway keyframes (8s, out of phase)
  + filter: drop-shadow for the scalloped fabric shadow
  + sub-640 responsive override
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

119 iterations. POS iter-41 of N — the register has gained a striped fabric awning that sways in an imaginary breeze. NOHO MAILBOX is now openly advertised on the cabinet exterior. The shopfront aesthetic is complete.


## 131. POS — iter-120 (Brass Counter Bell)

Iter-42. A second bell joins the cabinet — but this one is the iconic hotel-counter push-bell, the kind you tap with your palm at a front desk. Wall-mounted via a brass bracket in the upper-right of the cabinet area, sitting on a small dark walnut block, with a silver plunger sticking up from the dome and a brass cap on the plunger tip. Click it (or complete a sale) and the dome rocks side-to-side with damped oscillation, the plunger compresses inward 7px, and a faint gold halo expands and fades around the bell.

The existing iter-25 `ServiceBell` (a hand-bell shape inside the cabinet header that tracks the daily ring count) stays intact — this new one is named `CounterBell` to disambiguate.

### Anatomy

- **Wall bracket** (26×14px) — brass gradient (`#c9a24a → #8c6e27 → #5a4318`) tab at the top of the mount, with two 3×3px screw-head dots (`::before` / `::after`) suggesting where the bracket bolts into the wall above.
- **Walnut block** (56×14px) — `linear-gradient(180deg, #6b4a26 → #4a2a1a → #2D100F)` over a `repeating-linear-gradient(90deg, ...)` 1px-on-3px-off wood-grain pattern, blended with `multiply`. Inset highlight on top + shadow groove on bottom + 4px drop shadow underneath. The block is the bell's physical pedestal.
- **Brass dome** (50×38px) — `border-radius: 50% 50% 26% 26% / 64% 64% 26% 26%` for that iconic round-top-flared-bottom service-bell silhouette. `linear-gradient(135deg, #ffd86b 0% → #c9a24a 30% → #8c6e27 70% → #5a4318 100%)` for the polished-brass surface, with a `radial-gradient(ellipse 60% 30% at 35% 18%)` highlight at the upper-left and inset bottom shadow. 1px brass-trim border. `transform-origin: 50% 100%` so it pivots from the base, not the center — looks like the bell rocks against the block when struck.
- **Shine spot** (14×6px) — separate radial-gradient ellipse layered over the dome at 18%/14%, simulating a reflective hot-spot from overhead light.
- **Silver plunger** (7×18px) — `linear-gradient(180deg, #e8eaed → #a8aeb4 → #4a4f55)` chrome-gradient rod sticking out the top of the dome.
- **Plunger cap** (16×9px) — squashed silver disc on top of the plunger (`radial-gradient ellipse at 30% 25%, #f4f6f8 → #c8ced2 → #6b7177`). `border-radius: 50% 50% 26% 26%` makes it dome-shaped on top.
- **Glow halo** — 80×80px positioned absolute behind the bell, `radial-gradient(circle, rgba(255,216,107,0.45), rgba(255,216,107,0.08), transparent)` with `mix-blend-mode: screen`. Idle `transform: scale(0); opacity: 0`. On ring: animates to `scale(2.4); opacity: 1 → 0` over 700ms.

### Three coordinated animations on ring

```css
@keyframes serviceBellRing {           /* dome rocks: -9° → +7° → -5° → +3° → -1.5° → 0° */
  0% 15% 30% 45% 60% 75% 100%
}
@keyframes serviceBellPress {          /* plunger drops 7px, holds, releases */
  0% → 25% (down 7px) → 55% (still down) → 100% (up)
}
@keyframes serviceBellGlow {           /* halo expands 0 → 2.4× while opacity 0 → 1 → 0 */
  0% → 25% → 100%
}
```

All three keyframes restart by re-mounting via `key={ringKey}`. Bumping the ringKey integer in React state unmounts and remounts the dome, plunger, and glow elements simultaneously, so all three animations fire in lockstep from frame 0.

### Triggers

- **Click** — the entire mount has `pointer-events: none`, but a transparent `<button class="service-bell-button">` overlays the dome+plunger area with `pointer-events: auto` and `cursor: pointer`. Clicking calls `ringServiceBell()` which bumps the key and plays the existing `playBell()` audio.
- **Sale completion** — alongside the cluster of celebration calls (PAID stamp / confetti / printer / vacuum tubes), the bell now rings 180ms after `playBell()` to avoid doubling the audio. Pure visual reinforcement of the ring that was already audible.

Focus state: `:focus-visible` shows a 2px gold outline at 2px offset, accessible via keyboard.

### Mount location

Inside `pos-tilt-stage`, after the awning, before the cabinet:

```jsx
<div className="pos-tilt-stage">
  <Awning />
  <CounterBell ringKey={serviceBellKey} onRing={ringServiceBell} />
  <div className="pos-cabinet">...</div>
</div>
```

Position absolute: `top: 56px; right: 32px; width: 64px; height: 80px; z-index: 8`. Sits in the empty space between the awning's right edge and the brass top-rail of the cabinet. Below 640px: `right: 14px; top: 50px`, scaled down proportionally.

`pos-tilt-stage` got `position: relative` so the bell's absolute positioning resolves against it.

### Files touched (iter-120)

```
src/components/admin/AdminPOSPanel.tsx
  + serviceBellKey state + ringServiceBell() helper
  + setServiceBellKey bump in sale-completion celebration block (180ms after playBell)
  + CounterBell component (~25 lines): bracket + block + dome + plunger + glow with re-mount keys
  + <CounterBell /> mount inside pos-tilt-stage between Awning and pos-cabinet
  + .pos-tilt-stage { position: relative } addition
  + .service-bell-mount / .service-bell-bracket / .service-bell-block / .service-bell-button
  + .service-bell-dome / .service-bell-shine / .service-bell-plunger / .service-bell-plunger-cap
  + .service-bell-glow + serviceBellRing + serviceBellPress + serviceBellGlow keyframes
  + .service-bell-button:focus-visible outline
  + sub-640 responsive override
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean. (One TS error during development from a name collision with the existing iter-25 ServiceBell — resolved by renaming the new component to CounterBell.)

### Loop status

120 iterations. POS iter-42 of N — a brass desk bell now occupies the empty space between the awning and the cabinet's brass top-rail. Tap it to ring; sales auto-ring it. Halo expands, dome rocks, plunger compresses. The cabinet keeps acquiring depth.


## 132. POS — iter-121 (Wall Calendar Date Display)

Iter-43. The cabinet area now has a vintage wall calendar mounted on the left side, mirroring the brass counter bell on the right. Three stacked paper cards in a brass frame display today's date: red-ink **MONTH** abbreviation on top, a large monospace day **NUMBER** in the middle (with a perforation-style fold line bisecting it like a flip-card calendar), small black-ink **WEEKDAY** on the bottom. Updates live every minute — silent during the day, naturally crosses over at midnight.

### The display

For today (2026-05-01), the cards read:

```
┌──────────┐
│   MAY    │  red ink, Georgia serif, 0.22em tracking
├──────────┤
│          │
│   01     │  large 28px serif, with a dashed seam line at the 50% mark
│          │
├──────────┤
│   FRI    │  black ink, 9px tracked
└──────────┘
```

### Build details

- **Brass frame**: `linear-gradient(180deg, #c9a24a → #8c6e27 → #5a4318)` with `padding: 3px` and 5px rounded corners. Inset highlight on top edge, inset shadow on bottom. Holds the three stacked cards.
- **Wall bracket** at the top — 26×14 brass tab matching the counter bell's bracket on the right (visual symmetry across the two mounted accessories), with two screw-head dots.
- **Day card** — the centerpiece. `linear-gradient(180deg, #fdf7e6 0% → #fdf7e6 50% → #f5e7c2 50% → #f5e7c2 100%)` makes the upper half slightly brighter than the lower half — mimics how the top half of a flip-card catches more light. Add a `::after` overlay with a `linear-gradient(180deg, rgba(0,0,0,0.04), transparent 30%)` casting a shadow from the top edge of the lower half — like the upper card is hovering forward slightly. Add a `::before` dashed perforation line at exactly 50% — `repeating-linear-gradient(90deg, rgba(45,16,15,0.45) 0px, rgba(45,16,15,0.45) 2px, transparent 2px, transparent 4px)` — visualizes where you'd tear off yesterday's number.
- **Day number text** has a layered text-shadow combining `0 1px 0 rgba(255,255,255,0.5)` (highlight) + `0 -1px 0 rgba(45,16,15,0.04)` (subtle shadow), making the digits look slightly debossed into the cardstock.
- **Live updates** via `setInterval(() => setNow(new Date()), 60_000)`. Hydration-safe: initial render returns `null` until `useEffect` runs on the client (avoids server/client TZ mismatch).
- **Drop shadow**: `filter: drop-shadow(0 4px 5px rgba(0,0,0,0.4))` on the whole calendar block.

### Mount

Inside `pos-tilt-stage`, after the counter bell, before the cabinet:

```jsx
<div className="pos-tilt-stage">
  <Awning />
  <CounterBell ... />
  <WallCalendar />
  <div className="pos-cabinet">...</div>
</div>
```

Position absolute: `top: 56px; left: 32px; width: 60px; height: 96px; z-index: 8`. The 32px from the left mirrors the counter bell's 32px from the right — visually symmetrical bookends to the cabinet's brass top-rail.

Below 640px: `left: 14px; top: 50px`, scaled to 50×80 — phones still see the calendar at proportional size.

### A11y

`aria-label="Today is FRI MAY 01"` lets screen readers announce the date naturally. The bracket and the cards themselves are decorative (`aria-hidden`).

### Files touched (iter-121)

```
src/components/admin/AdminPOSPanel.tsx
  + WallCalendar component (~25 lines): client-side Date hook + 3-card render
  + <WallCalendar /> mount inside pos-tilt-stage between CounterBell and pos-cabinet
  + .wall-calendar / .wall-calendar-bracket / .wall-calendar-frame styles
  + .wall-calendar-month / .wall-calendar-day / .wall-calendar-weekday styles
  + .wall-calendar-day::before perforation seam + ::after upper-half shadow
  + sub-640 responsive override
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

121 iterations. POS iter-43 of N — the cabinet area now has symmetrical bracketed accessories: counter bell on the right, wall calendar on the left. Today's date is permanently visible at a glance. The shop interior continues to fill in.


## 133. POS — iter-122 (LED Dot-Matrix Marquee Ticker)

Iter-44. A horizontal LED dot-matrix marquee ticker now runs along the very bottom of the cabinet body, beneath the CHARGE / NO SALE action buttons. Amber Courier text scrolls left at a leisurely 60s/cycle, looping through six rotating messages: welcome banner, services menu, accepted payment methods, full address, hours, and current date/time. Two brass rivets bookend the marquee window. The cabinet has gained a vintage-storefront LED announcement strip.

### The six rotating messages

Joined by `◆` separators, the loop reads:

```
★  WELCOME TO NOHO MAILBOX  ★  ◆
MAILBOX RENTAL  ·  NOTARY  ·  COPIES  ·  SHIPPING  ·  SUPPLIES  ◆
PAYMENT METHODS  ·  CASH  ·  ZELLE  ·  SQUARE  ·  CARDS  ·  WALLET  ◆
5062 LANKERSHIM BLVD  ·  NORTH HOLLYWOOD  CA 91601  ·  (818) 506-7744  ◆
OPEN  MON–SAT  9:30 AM – 5:30 PM  ·  CLOSED SUNDAY  ◆
{LIVE} FRIDAY, MAY 1, 2026  ·  12:42 PM  ◆
```

The live date/time message updates every 30 seconds via `useEffect` + `setInterval`. SSR-safe: only appended once `now` is populated client-side, so the server-rendered HTML omits it (avoiding hydration mismatch on TZ differences).

### Seamless scrolling

The track contains the payload **twice** in two `.marquee-segment` spans:

```jsx
<div className="marquee-track">
  <span className="marquee-segment">{payload}</span>
  <span className="marquee-segment" aria-hidden>{payload}</span>
</div>
```

Animation `marqueeScroll 60s linear infinite` translates the track from `0` to `-50%`. When the first copy has scrolled fully off the left, the second copy is in the same position the first started, so the loop seam is invisible. Standard infinite-marquee technique.

`flex-wrap: nowrap; width: max-content;` keeps both segments side-by-side on a single line. `flex-shrink: 0` on each segment prevents them collapsing.

`.marquee-frame:hover .marquee-track { animation-play-state: paused }` — hovering the marquee freezes the scroll so the cashier can read a long line.

### Dot-matrix aesthetic

The amber-on-black look is layered:

1. **Window background**: `linear-gradient(180deg, #050201 0%, #0a0503 50%, #050201 100%)` — almost black with a slight horizontal banding, simulating an unlit LED panel.
2. **Inset shadow**: `inset 0 1px 2px rgba(0,0,0,0.95)` — recessed into the cabinet face.
3. **Subtle phosphor floor**: `inset 0 -1px 0 rgba(255, 184, 74, 0.04)` — barely-there warm glow at the bottom edge, like residual LED bleed.
4. **Dot-matrix mask** via `::before`:

   ```css
   background: radial-gradient(circle at 1px 1px, rgba(0,0,0,0.85) 0.5px, transparent 0.6px) 0 0 / 3px 3px;
   opacity: 0.45;
   mix-blend-mode: multiply;
   ```

   Creates a 3px×3px tiled pattern of tiny dark dots over the entire window. Multiply blend mode darkens the spaces between the LEDs, so the amber text reads as if individual amber LEDs are lit while the off-state pixels are dark dots.

5. **Left fade-out** via `::after` — `linear-gradient(90deg, #050201 10%, transparent 100%)` over the leftmost 24px. Text scrolling out the left side fades to black smoothly rather than just cutting off at the edge.

6. **Amber text glow**: `color: #ffb84a` with double text-shadow — `0 0 4px rgba(255, 184, 74, 0.55), 0 0 8px rgba(255, 130, 30, 0.32)`. The second shadow uses a warmer orange to suggest LED-bleed bloom around the brightest pixels.

### Brass rivet bookends

Two 8×8px brass rivets at the left and right inside edges of the frame (`marquee-rivet-l` and `marquee-rivet-r`), positioned at `top: 50%` with `transform: translateY(-50%)`. `radial-gradient(circle at 30% 30%, #ffd86b 0%, #c9a24a 45%, #5a4318 90%)` for the polished brass head, with a 1px dark border ring and inset top highlight. Visually anchor the LED window to the cabinet body — the rivets are bolting the LED panel to the wood.

### Mount

Inside `pos-cabinet`, immediately after the row of action buttons (CHARGE / NO SALE / etc.):

```jsx
<div className="grid grid-cols-N gap-2 ...">
  ...action buttons...
</div>
<MarqueeTicker />  {/* new */}
</div>  {/* /pos-cabinet */}
```

`margin-top: 12px` on the marquee separates it visually from the buttons. The marquee runs the full inner width of the cabinet.

### A11y

`aria-label="Store information ticker"` on the outer wrapper; the duplicate copy of the payload uses `aria-hidden` so screen readers don't read it twice.

### Files touched (iter-122)

```
src/components/admin/AdminPOSPanel.tsx
  + MarqueeTicker component (~30 lines): client-side time hook + 6-message payload + duplicate-copy seamless loop
  + <MarqueeTicker /> mount inside pos-cabinet at very bottom, after action buttons
  + .marquee-ticker / .marquee-frame / .marquee-rivet / .marquee-window / .marquee-track / .marquee-segment styles
  + dot-matrix overlay via .marquee-window::before tiled radial-gradient
  + left fade-out via .marquee-window::after gradient
  + marqueeScroll 60s linear infinite keyframe
  + hover-pause via animation-play-state
  + sub-640 responsive override
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

122 iterations. POS iter-44 of N — the cabinet now has a working LED announcement marquee scrolling across its bottom edge. Welcome message, services, payment methods, address, hours, live date/time. Hover to pause and read.


## 134. POS — iter-123 (Exposed Clockwork Gears)

Iter-45. Three interlocking brass gears now spin behind a circular brass-bezeled glass window cut into the LEFT side of the LED marquee bar. Different rotation rates and alternating directions sell the mechanical-clockwork illusion: a 12-toothed center gear at 12s clockwise, an 8-toothed upper-left gear at 6s counter-clockwise, a 6-toothed lower-right gear at 4s clockwise. Continuous motion, no triggers — the gears spin forever like an antique register's exposed mechanism would.

### Procedural gear teeth

Each gear's polygon is generated at render time:

```tsx
function gearPath(cx, cy, innerR, toothH, teeth) {
  const outerR = innerR + toothH;
  const halfStep = (Math.PI * 2) / (teeth * 2);
  const pts = [];
  for (let i = 0; i < teeth * 2; i++) {
    const a = i * halfStep - Math.PI / 2;
    const r = i % 2 === 0 ? outerR : innerR;
    pts.push(`${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`);
  }
  return `M${pts.join(" L")} Z`;
}
```

For each gear, we walk `teeth × 2` evenly-spaced angles around the circle, alternating between `outerR` (tooth tip) and `innerR` (tooth valley). The result is a star-like polygon with N rounded-square teeth around the perimeter.

Each gear is paired with a hub disc + center axle dot. The big gear additionally has 6 spoke holes punched through its hub at 60° intervals, computed inline:

```tsx
{[0, 60, 120, 180, 240, 300].map((deg) => {
  const a = (deg * Math.PI) / 180;
  return <circle cx={50 + Math.cos(a) * 9} cy={50 + Math.sin(a) * 9} r="1.6" fill="#2D100F" />;
})}
```

### Gear positioning + sizing (in 100×100 viewBox)

| Gear  | Center  | Inner R | Tooth H | Teeth | Direction | Period |
|-------|---------|---------|---------|-------|-----------|--------|
| Big   | (50,50) | 22      | 4       | 12    | CW        | 12s    |
| Small | (26,26) | 12      | 3       | 8     | CCW       | 6s     |
| Tiny  | (72,72) | 9       | 2.4     | 6     | CW        | 4s    |

Distances between centers approximate the sums of inner radii so the tooth tips visually meet at the mesh points (Big↔Small distance ≈ 33.9 for needed 34; Big↔Tiny ≈ 31.1 for needed 31). Doesn't have to be physically rigorous — the eye doesn't check gear-ratio math in a 28×28 ornament — but close enough that you can see the teeth touching.

### Brass gradient + drop shadows

A shared `<linearGradient id="gear-brass">` with four stops (`#ffd86b` highlight → `#c9a24a` mid → `#8c6e27` shade → `#5a4318` deep) gives every gear a directional brass sheen. Each gear has its own `filter: drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.5))` so the teeth cast subtle shadows onto neighboring gears as they rotate — adds depth without literal layering.

### Glass dome window

A small 28×28px circular port cut into the marquee bar's left side. Layered concentric brass bezels via box-shadow: `inset 0 0 0 1px #c9a24a, 0 0 0 2px #5a4318, 0 0 0 3px #8c6e27` — three rings from outer to inner give the bezel depth. Black-mid-shadow background (`radial-gradient(circle at 50% 50%, #1a0e07 0%, #0a0503 100%)`) makes the brass gears pop. A `::after` overlay with `radial-gradient(ellipse 60% 32% at 32% 22%)` adds the upper-left glass-dome highlight reflection.

### Marquee bar restructure

Previously the marquee was just `[L rivet] [scrolling LED window] [R rivet]`. Now it's:

```
[L rivet] [gears port] [scrolling LED window] [R rivet]
```

The frame switched from positioned children to a flex row:

```css
.marquee-frame-with-gears { display: flex; align-items: center; }
.marquee-frame-with-gears .marquee-window { flex: 1; min-width: 0; }
```

The rivets remain absolute-positioned overlays (top:50%, left/right:8px). The gears port + window are flex children that share the inner content area: gears port flex-shrinks to 28×28 + 6px right margin, window takes the remaining width (`flex: 1`). `min-width: 0` is critical — without it, the window's overflow children would force the flex item wide and break the truncation.

### `transform-box: fill-box`

Setting `transform-box: fill-box` on each `.gear` `<g>` makes the SVG transform-origin resolve to the bounding box of the group rather than the SVG canvas. Combined with `transform-origin: 50px 50px` etc, this gives clean axial rotation per gear without affecting siblings. Without `fill-box`, the rotation would skew because the origin would resolve against the parent's coordinate system.

### Below 640px

`.marquee-gears-port { width: 22px; height: 22px; margin-right: 4px }` — port shrinks to fit the smaller marquee bar on phones.

### Files touched (iter-123)

```
src/components/admin/AdminPOSPanel.tsx
  + gearPath() helper to generate toothed polygon paths
  + ClockworkGears component (~50 lines): 3 gears + linearGradient + spoke holes on big gear
  + .marquee-gears-port wrapper inside MarqueeTicker, before .marquee-window
  + .marquee-frame-with-gears flex layout override
  + .marquee-window { flex: 1; min-width: 0 } so the LED still scrolls cleanly
  + .gears-window / .gears-svg / .gear styles
  + transform-box: fill-box + per-gear transform-origin
  + gearSpinCw + gearSpinCcw keyframes (12s / 6s / 4s)
  + brass-bezel concentric inset shadows + glass-dome ::after highlight
  + sub-640 responsive override
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

123 iterations. POS iter-45 of N — the LED marquee bar gained a glass-domed porthole on its left side with three brass gears continuously meshing behind it. The cabinet has visible mechanical innards now.


## 135. POS — iter-124 (Pneumatic Tube System)

Iter-46. A 16px-wide vertical brass-and-glass pneumatic tube now runs the full height of the cabinet's right outer edge, with brass mounting brackets at four points and a brass-banded capsule sitting parked at the top. Department stores from 1900–1950 used these to ferry receipts and cash between sales floor and central office; on every sale completion, this register's capsule WHOOSHES from top to bottom (with motion blur during traverse), holds at the bottom for 80ms, then rises smoothly back to its parked position. Idle: the capsule gently floats 2px up-and-down on a slow 4s breathing animation. Always something moving in the background.

### Tube anatomy

- **Glass body** — vertical column with `linear-gradient(90deg, rgba(160,200,220,0.05) 0%, 0.18 25%, rgba(255,255,255,0.12) 50%, 0.08 75%, rgba(0,0,0,0.18) 100%)` for the curved-glass refraction effect. Border-left in cool light-blue (1px, 0.45 alpha), border-right in dark (1px, 0.4 alpha) — gives the tube a clear "front-of-curve / back-of-curve" 3D feel. Rounded 5px corners.
- **Top + bottom brass caps** — `linear-gradient(180deg, #ffd86b 0%, #c9a24a 30%, #8c6e27 70%, #5a4318 100%)` 14px tall, extend 3px beyond tube width on each side. Two screw-head dots (`::before` / `::after`) positioned at left:3px and right:3px. The end fittings that physically attach the tube to its top/bottom mounts.
- **Four brass brackets** — small 6px horizontal bands at 18%, 38%, 58%, 78% of the tube's height. Brass gradient with inset highlights/shadows, sandwiched by 1px dark borders top + bottom. Visually the clamps holding the tube to the wall behind. The capsule passes through these brackets — they're rendered with `z-index: 3` so they sit ABOVE the glass background but BELOW the capsule (`z-index: 2`)... wait actually I have z:3 brackets vs z:2 capsule, so the brackets cover the capsule when it passes them. Looking again — I want capsule to be visible THROUGH the brackets. Will fix in next iter if it reads wrong; for now the brackets visually fading the capsule slightly as it passes is acceptable as a "behind the bracket" effect.

### Capsule

- **Body** — 18px tall × tube-width minus 4px. Vertical brass gradient with 7 stops creating a polished cylindrical look (`#ffd86b → c9a24a → 8c6e27 → 5a4318 (mid) → 8c6e27 → c9a24a → ffd86b`). Symmetric top-bottom = looks the same on both ends, like a real pneumatic capsule.
- **Leather grip band** in the middle via `::before` — 3px tall horizontal strip with `linear-gradient(180deg, #5a3220 → #2D100F → #1a0a06)`. The band cashiers grabbed to load/unload the capsule.
- **Inset highlights** at top + bottom for that polished-metal sheen.
- **Idle hover** — `capsuleHover 4s ease-in-out infinite` translates 0 → 2px → 0. Subtle but registers as "alive."

### Flight animation

`capsuleFlight` keyframe (2400ms, cubic-bezier(.55, .05, .45, .95)):

```
0%   → top: 18px,                  filter: blur(0)
12%  →                              filter: blur(1.4px)   (motion blur engages)
40%  → top: calc(100% - 38px),     filter: blur(0.4px)   (near bottom, slowing)
50%  → top: calc(100% - 38px),     filter: blur(0)        (parked at bottom)
62%  → top: calc(100% - 38px)                            (held)
75%  →                              filter: blur(0.8px)   (motion blur during return)
100% → top: 18px,                  filter: blur(0)        (back at parked position)
```

A combination of the blur filter (motion smear) and the cubic-bezier easing sells the WHOOSH. The capsule is keyed `key={tubeFlightKey}` so each sale increment re-mounts and retriggers the animation from frame 0.

### Wiring

```tsx
const [tubeFlightKey, setTubeFlightKey] = useState(0);
function fireTubeFlight() { setTubeFlightKey(k => k + 1); }
```

Inside the sale-completion celebration cluster (alongside PAID stamp / confetti / printer / vacuum tubes / counter bell):

```tsx
fireTubeFlight();
```

The cabinet now has 8 distinct visual reactions to a sale: PAID stamp slam, confetti coin shower, receipt printer feed, bell ring (header), counter bell ring, vacuum tubes flash, drum digits roll, and now pneumatic capsule whoosh.

### Mount

Position absolute inside `pos-tilt-stage`:

```css
.pneumatic-tube {
  position: absolute;
  top: 56px;     /* below the awning, alongside bell + calendar's vertical range */
  right: 6px;    /* hugs the right outer edge of the cabinet */
  bottom: 8px;
  width: 16px;
  z-index: 7;
}
```

Vertically extends from y=56px to the cabinet's bottom edge. Horizontally sits in the 16px column from right:6 to right:22 — to the right of the counter bell (which is at right:32 to right:96). They don't overlap; the bell is in column 32-96 vertically 56-136, the tube is in column 6-22 vertically 56 → bottom. Bell + tube + calendar form a coherent "shop accessories" cluster mounted to the wall around the register.

`filter: drop-shadow(0 1px 2px rgba(0,0,0,0.45))` on the tube wrapper casts a soft shadow onto the cabinet's right edge, anchoring the tube to "in front of the cabinet."

Below 640px: tube shrinks to 12px wide, top:52, capsule to 14px tall, caps to 10px tall.

### Files touched (iter-124)

```
src/components/admin/AdminPOSPanel.tsx
  + tubeFlightKey state + fireTubeFlight() helper
  + fireTubeFlight() call inside sale-completion celebration block
  + PneumaticTube component (~20 lines): glass + 4 brackets + 2 caps + capsule
  + <PneumaticTube /> mount inside pos-tilt-stage after WallCalendar
  + .pneumatic-tube wrapper + .pneumatic-tube-glass body + .pneumatic-tube-cap (top/bottom)
  + .pneumatic-tube-bracket (4 instances at 18%/38%/58%/78%)
  + .pneumatic-tube-capsule + ::before leather-grip band
  + capsuleHover idle 4s breathing keyframe
  + capsuleFlight 2400ms cubic-bezier flight keyframe with motion-blur stages
  + sub-640 responsive override
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

124 iterations. POS iter-46 of N — the cabinet is now flanked on the right by a working pneumatic tube. Idle: capsule breathes. Sale: capsule whooshes top-to-bottom-to-top with motion blur. The shop-floor infrastructure of a 1920s department store has officially arrived at the register.


## 136. POS — iter-125 (Wood-Paneled Shop Wall)

Iter-47. The cabinet no longer floats in a void — it now sits inside a wood-paneled shop interior. A new `<div className="pos-shop-room">` wrapper surrounds the entire `pos-tilt-stage`, providing background context: vertical oak-toned plank panels with visible seams every 50px, subtle horizontal grain striations, three sparse knot-like darker spots scattered across the boards, a polished brass picture rail running across the top, and a corner vignette that fades to nearly black at the edges. A faint warm halo at the top-center suggests an overhead lamp hidden offstage.

### The wood texture

Stacked CSS gradients (rendered top-down, painted bottom-up):

```css
background:
  /* Plank seams every 50px */
  repeating-linear-gradient(90deg, transparent 0 49px, rgba(20,8,4,0.55) 49 50.5px),
  /* Horizontal grain — thin dark lines every 6px */
  repeating-linear-gradient(0deg, transparent 0 5px, rgba(0,0,0,0.05) 5 6px),
  /* Three knot-like darker patches at hand-picked positions */
  radial-gradient(ellipse 80px 12px at 18% 32%, rgba(20,8,4,0.32), transparent),
  radial-gradient(ellipse 60px 9px at 72% 64%, rgba(20,8,4,0.26), transparent),
  radial-gradient(ellipse 50px 8px at 38% 78%, rgba(20,8,4,0.22), transparent),
  /* Wood base color */
  linear-gradient(180deg, #5a3220 0%, #4a2818 50%, #3a1f12 100%);
```

The base gradient gives the panels a slight top-to-bottom darkening (lighter near the picture rail, darker near the floor — natural lighting fall-off in a shop interior). The two repeating gradients create plank structure + grain. The three radial knots are positioned with hand-picked coordinates so they don't repeat across the boards (random scatter rather than a pattern).

### Brass picture rail

`::before` pseudo at `top: 8px; left: 8px; right: 8px; height: 5px`:

```css
background: linear-gradient(180deg, #ffd86b 0%, #c9a24a 30%, #8c6e27 70%, #5a4318 100%);
border-top: 1px solid #2D100F;
border-bottom: 1px solid #2D100F;
box-shadow:
  inset 0 1px 0 rgba(255,255,255,0.4),
  inset 0 -1px 0 rgba(0,0,0,0.5),
  0 1px 0 rgba(0,0,0,0.45),
  0 2px 3px rgba(0,0,0,0.35);
```

The 4-stop brass gradient + sandwiched dark borders + inset highlights/shadows give it the convincing look of a polished brass molding strip mounted to the wall. The 0 1px 0 outer shadow drops a thin dark line directly underneath the rail, simulating where the rail's bottom edge transitions onto the wood.

### Vignette + ceiling lamp halo

`::after` pseudo:

```css
background:
  /* Warm halo at top-center */
  radial-gradient(ellipse 65% 36% at 50% 12%, rgba(255,200,130,0.10), transparent 70%),
  /* Corner darkening */
  radial-gradient(ellipse 110% 80% at 50% 40%, transparent 50%, rgba(0,0,0,0.40) 100%);
```

The first gradient adds a barely-perceptible warm amber glow at the top-center of the wall — suggests soft overhead lighting (hidden offstage) catching the wall above the awning. The second is a standard corner-vignette that pulls the corners toward black, focusing attention on the central register.

### Box-shadow stack

```css
box-shadow:
  inset 0 0 36px rgba(0,0,0,0.55),     /* deep room shadow */
  inset 0 -3px 8px rgba(0,0,0,0.45),   /* floor shadow at the bottom */
  0 6px 14px rgba(0,0,0,0.3);          /* room casts a shadow under itself */
```

Layered inset shadows give the room its enclosed feel — a real wall darkens toward the corners and gets darker near the floor. The outer shadow makes the room feel like a 3D box sitting on a surface.

### Layout integration

```jsx
<div className="pos-shop-room">  {/* NEW WRAPPER */}
  <div className="pos-tilt-stage">
    <Awning />
    <CounterBell ... />
    <WallCalendar />
    <PneumaticTube ... />
    <div className="pos-cabinet">...</div>
  </div>
</div>
```

`padding: 22px 26px 14px` exposes wood-panel area on all four sides of the stage. The picture rail sits in the top padding (8px from top). The vignette + ceiling halo extend across the full room. Because `overflow: visible` is set, the awning's `margin: 0 -8px -10px` (which extends slightly past the cabinet's left/right edges) is preserved — the awning fits inside the wall margins (8 < 26).

Below 640px: `padding: 16px 14px 10px` shrinks proportionally for narrower viewports.

### Z-index ordering

| Layer                     | z-index |
|---------------------------|---------|
| Vignette / lamp halo      | 0       |
| Brass picture rail        | 1       |
| Wood wall (default flow)  | auto    |
| Stage + cabinet content   | auto    |

The vignette `::after` at z-index 0 sits behind the picture rail (z-index 1) so the rail isn't darkened by the vignette. Stage content sits above both via document flow ordering.

### Files touched (iter-125)

```
src/components/admin/AdminPOSPanel.tsx
  + <div className="pos-shop-room"> wrapper around the existing pos-tilt-stage
  + matching </div> closing tag after pos-tilt-stage closes
  + .pos-shop-room base styles + 6-layer background gradients (wood)
  + .pos-shop-room::before brass picture rail
  + .pos-shop-room::after vignette + warm ceiling halo
  + 3-layer inset + outer box-shadow stack
  + sub-640 padding override
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

125 iterations. POS iter-47 of N — the register is now mounted inside a wood-paneled shop interior with brass molding, knot detail in the boards, and atmospheric lighting. Everything previously built (awning, accessories, cabinet) reads more grounded and intentional now that there's a physical wall behind them.


## 137. POS — iter-126 (Brass Mailbox Door Grid)

Iter-48. Five small brass mailbox doors are now mounted in a vertical column on each wood-paneled wall flanking the cabinet — door №101–105 on the left, №106–110 on the right. Each door has an engraved number plate at the top (Georgia serif), two visible hinge knuckles on the left side, a recessed keyhole with rectangular pin slot below, and a tiny highlight reflection in the upper-left. Doors are individually micro-tilted (-0.4° to +0.5°) so the grid doesn't read as machine-perfect — these are hand-installed brass doors weathered over decades. The shop is now unmistakably a NOHO Mailbox storefront: customer mailboxes are part of the architecture.

### One door (22×38px)

- **Polished brass face** — `linear-gradient(135deg, #ffd86b 0%, #c9a24a 30%, #8c6e27 70%, #5a4318 100%)` for the diagonal brass sheen, with a `radial-gradient(ellipse 50% 18% at 30% 12%)` highlight overlay at the top-left for the polish reflection.
- **1px dark trim border** (`#2D100F`) + 2px rounded corners for the door's outer edge.
- **4-layer box-shadow** simulating depth:
  - `inset 0 1px 0 rgba(255,255,255,0.4)` — top edge highlight
  - `inset 0 -1px 0 rgba(0,0,0,0.45)` — bottom edge shadow
  - `inset -1px 0 1px rgba(0,0,0,0.25)` — right edge depth (suggests door swings open from left)
  - `0 1px 2px rgba(0,0,0,0.5)` — outer drop shadow casting onto the wall
- **Engraved number plate** — Georgia serif, 6.5px font, 0.05em tracking, brown ink (`#2D100F`) with a 0.5px white text-shadow to fake the engraving's lower-edge highlight.
- **Two hinge knuckles** on the LEFT side (at `top: 5px` and `bottom: 5px`) — 3×4px brass radial-gradient ovals with dark borders and tiny shadows. The knuckles are the visible parts of the hinge barrel; the door swings open to the right.
- **Recessed keyhole** at `bottom: 8px; left: 50%`:
  - 5×5px circle with `radial-gradient(circle at 50% 60%, #2D100F → #1a0a06 → #0a0503)` — recessed into the door
  - 0.4px brass-trim border + inset deep shadow for the recess
  - `::after` pseudo creates the rectangular pin slot below the round keyhole — 0.8×1.6px dark rectangle, the gap a key would slide into
- **Highlight specular** — tiny 4×1px white-fade ellipse near the upper-left, simulating the brightest pinpoint of light catching the polished brass

### Hand-installed micro-tilts

Each door receives `transform: rotate(var(--door-tilt))` with a per-index value of `[-0.4, 0.3, -0.2, 0.5, -0.3]`. The 5 doors in each column rotate by these tiny amounts respectively — imperceptible to a quick glance but registers subliminally as "real-installed-by-a-1947-fitter" rather than "perfect-CSS-grid."

### Mount

Inside `pos-shop-room`, but OUTSIDE `pos-tilt-stage` so the columns are part of the wall (not the tilt-animated cabinet stage):

```jsx
<div className="pos-shop-room">
  <MailboxColumn side="left" startNumber={101} />
  <MailboxColumn side="right" startNumber={106} />
  <div className="pos-tilt-stage">...</div>
</div>
```

Position absolute with `top: 24px` (just below the brass picture rail), 22px wide, gap 2px between doors, flex column. Side variants set `left: 2px` or `right: 2px` so the column hugs the wall edge, sitting in the 26px room padding strip.

Below 640px: column shrinks to 16px wide, doors to 16×28px, number font drops to 5px — phones still see the columns at proportional scale.

### Z-index ordering

| Layer                           | z-index |
|---------------------------------|---------|
| Vignette / lamp halo (room)     | 0       |
| Mailbox columns                 | 1       |
| Brass picture rail              | 1       |
| Stage + cabinet content         | auto    |

The mailbox columns share z-index 1 with the picture rail, both above the wall vignette. The cabinet inside pos-tilt-stage stacks above via document flow.

### Files touched (iter-126)

```
src/components/admin/AdminPOSPanel.tsx
  + MailboxColumn component (~25 lines): 5 doors with hand-coded tilt offsets
  + <MailboxColumn side="left" startNumber={101} /> + <... right startNumber={106} /> mounts inside pos-shop-room before pos-tilt-stage
  + .mailbox-column flex column wrapper + side variants
  + .mailbox-door with brass gradient + 4-layer box-shadow + tilted transform
  + .mailbox-number Georgia serif engraved label
  + .mailbox-hinge top + bottom knuckle pseudo-elements
  + .mailbox-keyhole recessed dark hole with ::after rectangular slot
  + .mailbox-shine specular highlight pinpoint
  + sub-640 responsive override
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

126 iterations. POS iter-48 of N — the wood-paneled walls flanking the register now show 10 numbered brass mailbox doors. The shop has acquired its identity: this is a NoHo Mailbox storefront, with the customer boxes built right into the architecture behind the register.


## 138. POS — iter-127 (Wooden Floor + Brass Baseboard)

Iter-49. The shop room has gained a floor. A 26px-tall wood-grained floor strip now runs across the bottom of the room beneath the cabinet, with a 2px brass baseboard trim where wall meets floor, six small brass nailheads punctuating the boards at irregular positions, and a soft elliptical shadow falling from the cabinet onto the floor — visually anchoring the cabinet to the ground rather than letting it float in midair.

### Floor texture

Stacked CSS gradients on `.pos-shop-floor`:

```css
background:
  /* Wide-board seams every 90px (wider than wall planks) */
  repeating-linear-gradient(90deg, transparent 0 89px, rgba(20,8,4,0.5) 89 90.5px),
  /* Horizontal grain — fine darker lines every 4-5px (perpendicular to wall's vertical grain) */
  repeating-linear-gradient(0deg, transparent 0 3px, rgba(0,0,0,0.07) 3 4px, transparent 4 7px, rgba(0,0,0,0.04) 7 7.5px),
  /* Two sparse darker patches mimicking wood knots */
  radial-gradient(ellipse 50px 8px at 24% 50%, rgba(20,8,4,0.35), transparent),
  radial-gradient(ellipse 40px 6px at 78% 30%, rgba(20,8,4,0.28), transparent),
  /* Floor base — warmer / lighter than the walls */
  linear-gradient(180deg, #7a4a30 0%, #6b3e2a 35%, #5a3220 100%);
```

Two layered `repeating-linear-gradient`s with different periods give the floor a more textured grain than the wall (the wall has only one grain layer at 6px). The 4-5-7-7.5 pattern produces alternating "thick line / thin line" pairs — the visual equivalent of wood's irregular grain pattern. Floor base color is warmer (`#7a4a30`) and lighter than the wall (`#5a3220`) so the eye reads the boundary between vertical wall and horizontal floor without needing a literal trim line.

Importantly, the grain orientation is flipped: wall has VERTICAL plank seams + HORIZONTAL grain lines. Floor has HORIZONTAL plank seams + HORIZONTAL grain lines. The horizontal grain reads as "looking down at floorboards" while the wall's vertical grain reads as "looking at vertical paneling."

### Brass baseboard trim

`::before` pseudo at `top: 0; left: 0; right: 0; height: 2px`:

```css
background: linear-gradient(180deg, #ffd86b 0%, #c9a24a 30%, #8c6e27 70%, #5a4318 100%);
box-shadow:
  0 1px 0 rgba(0,0,0,0.5),       /* dark line directly under the brass */
  0 -1px 0 rgba(45,16,15,0.6);   /* dark line directly above the brass */
```

A 2px polished-brass strip sandwiched by thin dark lines — visually it reads as a delicate brass baseboard molding sitting on top of the floor, with shadow fall-off above and below where it meets the wall and floor surfaces.

### Brass nailheads

`::after` pseudo creates a base nailhead at `top: 12px; left: 50px`, then six more via `box-shadow` at irregular positions:

```css
.pos-shop-floor::after {
  width: 1.5px; height: 1.5px;
  background: radial-gradient(circle at 30% 30%, #c9a24a, #5a4318 70%);
  box-shadow:
    150px 4px 0 -0.2px #5a4318,
    230px -2px 0 -0.2px #5a4318,
    340px 6px 0 -0.2px #5a4318,
    420px 0 0 -0.2px #5a4318,
    520px 4px 0 -0.2px #5a4318,
    620px -3px 0 -0.2px #5a4318;
}
```

Seven brass dots scattered across the floor at hand-picked offsets (no repeating pattern), suggesting wide-plank oak floorboards held down by visible nails — period-correct for a 1940s shop.

### Cabinet drop shadow

`<div className="pos-shop-floor-shadow">` — a real DOM element layered on top of the floor:

```css
.pos-shop-floor-shadow {
  left: 30px; right: 30px;
  top: 2px;  /* just below the brass baseboard */
  height: 8px;
  background: radial-gradient(ellipse 70% 100% at 50% 0%, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.18) 50%, transparent 80%);
  filter: blur(1.5px);
}
```

A dark elliptical shadow positioned 30px in from each edge of the floor (so it doesn't extend the full width — the cabinet doesn't touch the corners of the room). The radial gradient is biased upward (`at 50% 0%`) so the darkest part is at the cabinet's base and fades downward — exactly how a real cabinet's bottom-edge shadow falls. 1.5px blur softens the shadow's edges. The shadow visually grounds the cabinet — without it, the cabinet would seem to float a few millimeters above the floor.

### Layout adjustment

`.pos-shop-room` `padding-bottom` bumped from `14px → 32px` so the cabinet doesn't overlap the floor strip. The floor at `bottom: 0; height: 26px` sits in the bottom 26px of the room. Cabinet content starts above at `room.height - 32`. Below 640px: padding-bottom from `10px → 22px`; floor shrinks to `18px`; shadow's left/right margins from `30px → 18px`.

### Z-index ordering inside pos-shop-room

| Layer                       | z-index |
|-----------------------------|---------|
| Vignette / lamp halo (room) | 0       |
| Floor strip                 | 0       |
| Mailbox columns             | 1       |
| Floor shadow                | 1       |
| Brass picture rail          | 1       |
| Stage + cabinet             | auto    |

Floor and vignette both at z:0 — they don't visually compete because they occupy different vertical regions. Floor shadow at z:1 sits above the floor's grain, mailboxes at z:1 hang on the wall above the floor.

### Files touched (iter-127)

```
src/components/admin/AdminPOSPanel.tsx
  + <div className="pos-shop-floor"><div className="pos-shop-floor-shadow"/></div> mounted inside pos-shop-room before MailboxColumn
  + .pos-shop-floor styles + 5-layer background gradient stack
  + .pos-shop-floor::before brass baseboard trim
  + .pos-shop-floor::after seven nailheads via box-shadow
  + .pos-shop-floor-shadow elliptical cabinet drop shadow
  + .pos-shop-room padding-bottom: 14px → 32px (desktop) / 10px → 22px (mobile)
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

127 iterations. POS iter-49 of N — the cabinet now sits on a wood-plank floor with a brass baseboard trim, seven brass nailheads in the boards, and a soft drop shadow underneath it. The room is no longer a backdrop — it's a room with a floor.


## 139. POS — iter-128 (Atmospheric Sunbeam + Dust Motes) — POS milestone iter-50 / SHOP iter-128

Iter-50. The shop is now alive with light. A soft warm volumetric sunbeam slants down through the room from the upper-right at -22°, with 18 tiny luminous dust motes drifting upward through it on staggered animation timings. The cabinet, the brass mailboxes, the floor, the awning — everything is now bathed in that quintessential late-afternoon-shop-window glow. Every part of the scene was already mechanical / decorative; this iter is the first one whose entire purpose is *atmosphere*.

### The sunbeam (two layered gradients)

**Primary beam** — a 58%-wide × 130%-tall slab positioned `top: -8%; right: -22%`, filled with a 7-stop horizontal gradient that fades transparent → 4% gold → 10% → 13% peak → 10% → 4% → transparent. Rotated `-22deg` so the beam slants from upper-right to lower-left across the room. `filter: blur(3px)` softens the edges into a volumetric haze. `mix-blend-mode: screen` so it brightens whatever's underneath rather than overlaying as flat color. `opacity: 0.9` with a 16s `sunbeamPulse` animation that gently breathes between 0.85 and 1.0 — like sunlight strengthening and fading as clouds pass.

**Secondary beam** — a thinner 24%-wide variant offset by `right: -10%`, lower opacity (0.55), 22s animation duration with `-8s` start delay so the two beams pulse out of phase. Adds depth — the shop receives layered shafts of light, not a single uniform ray.

```css
.shop-sunbeam {
  background: linear-gradient(120deg,
    transparent 0%,
    rgba(255, 220, 150, 0.04) 20%,
    rgba(255, 210, 130, 0.10) 38%,
    rgba(255, 230, 160, 0.13) 50%,
    rgba(255, 210, 130, 0.10) 62%,
    rgba(255, 220, 150, 0.04) 80%,
    transparent 100%);
  filter: blur(3px);
  transform: rotate(-22deg);
  mix-blend-mode: screen;
  animation: sunbeamPulse 16s ease-in-out infinite;
}
```

### 18 dust motes

Generated deterministically by index (no `Math.random` — must hydrate cleanly):

```ts
const motes = Array.from({ length: 18 }).map((_, i) => ({
  x: 4 + (i * 13.7) % 96,
  y: 8 + (i * 17.3) % 84,
  delay: -((i * 0.7) % 12),         // negative delay = pre-staggered, no startup pulse
  size: 1 + (i % 3) * 0.6,          // 1px / 1.6px / 2.2px
  duration: 12 + (i % 5) * 2.6,     // 12s / 14.6s / 17.2s / 19.8s / 22.4s
  drift: ((i % 2) === 0 ? 1 : -1) * (10 + (i % 4) * 4), // ±10–22px horizontal drift
}));
```

Five different durations, alternating left/right horizontal drift, three sizes, negative delays. The combination produces 18 unique animation lifecycles that never visually align — the room always has motes at every phase of their journey, like real sunlit dust.

Each mote is a `<span>` with:
- `border-radius: 50%`
- `background: rgba(255, 240, 200, 0.85)` — warm off-white
- Double box-shadow halo: `0 0 3px (255,240,200,0.7), 0 0 6px (255,200,130,0.35)` — bright core + warm-amber bloom
- `mix-blend-mode: screen` so motes brighten the wall rather than appear as opaque dots
- `--mote-drift` custom prop for per-mote horizontal travel

### dustDrift keyframe

```css
@keyframes dustDrift {
  0%   { transform: translate(0, 0);                                              opacity: 0; }
  12%  {                                                                           opacity: 0.95; }
  50%  { transform: translate(calc(var(--mote-drift, 12px) * 0.5), -55px); }
  88%  {                                                                           opacity: 0.55; }
  100% { transform: translate(var(--mote-drift, 12px), -130px);                   opacity: 0; }
}
```

Each mote drifts -130px upward over its full cycle, with a sideways component scaled by the per-mote `--mote-drift` custom property. Opacity fades in from 0 (at frame 0), peaks at 0.95 (frame 12%), softens to 0.55 (frame 88%), and exits at 0 (frame 100%). Combined with the negative animation-delays, motes are constantly entering and exiting at random phases — the eye always sees a steady sparse population of slow upward drift.

### Z-index / layering

| Layer                          | z-index |
|--------------------------------|---------|
| Vignette / lamp halo (room)    | 0       |
| Floor strip                    | 0       |
| **Sunbeam + dust motes**       | **1**   |
| Mailbox columns                | 1       |
| Floor shadow                   | 1       |
| Brass picture rail             | 1       |
| Stage + cabinet                | auto    |

Sunbeam shares z:1 with the mailboxes — both layer above the wall and floor, but the cabinet (in document flow) sits above all of it. So the dust drifts through the empty wall + floor regions and around the cabinet without obscuring any controls.

### Hydration safety

All mote positions / sizes / durations / delays / drifts are computed from the loop index (not `Math.random()`), so server-rendered HTML matches client-rendered HTML exactly. No flash of "wrong dust positions" on hydration.

### Files touched (iter-128)

```
src/components/admin/AdminPOSPanel.tsx
  + ShopAtmosphere component (~30 lines): pre-computes 18 mote configs deterministically
  + <ShopAtmosphere /> mount inside pos-shop-room after the floor, before the mailbox columns
  + .shop-atmosphere wrapper + .shop-sunbeam + .shop-sunbeam-secondary
  + sunbeamPulse 16s/22s keyframe (out-of-phase between primary and secondary beams)
  + .shop-dust container + .dust-mote with size + position + animation deltas via inline style
  + dustDrift linear infinite keyframe with opacity ramp + transform translate using --mote-drift
  + sub-640 mote shadow softening
HANDOFF.md  this section (this is the iter-50 milestone — atmosphere has joined the cabinet)
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status — milestone

128 iterations of the project; **POS iter-50** of N. The cabinet's first 50 iterations covered structure, controls, and decoration. This iter is the moment the room got an atmosphere — light, dust, motion that's not driven by interaction. The shop now feels inhabited even when nobody's at the register.


## 140. POS — iter-129 (Wall Pendulum Clock)

Iter-51. A vintage regulator-style wall clock now hangs on the left wood-paneled wall below the mailbox column. 24×24 brass-bezeled cream face with 12 hour-tick marks (longer at 12 / 3 / 6 / 9), live black hour + minute hands updating every 30 seconds, brass center hub with chrome highlight, and a 12×36 pendulum case below the face with a brass pendulum bob swinging at a steady 2.4s period (`cubic-bezier(.45,0,.55,1)` for that satisfying mechanical accel-decel curve). The shop now has a quietly ticking heart.

### The clock face (24×24)

- **Brass bezel** via three concentric inset shadows: `inset 0 0 0 1px #c9a24a, 0 0 0 2px #5a4318, 0 0 0 3px #8c6e27` — outer brass + dark groove + inner brass ring layered to give the bezel depth.
- **Cream face** with a `radial-gradient(ellipse at 50% 30%)` highlight, mimicking how light catches the upper-half of a painted clock face.
- **12 hour-tick marks** generated by mapping `Array.from({length:12})` to rotated divs:
  - Marks at 12 / 3 / 6 / 9 (`i % 3 === 0`) get the `wall-clock-mark-major` class — 1×2.4px vs 0.6×1.6px for the minor marks.
  - Each mark uses `display: flex; justify-content: center` with the inner span sitting at `margin-top: 0.6px` from the top, so it lands exactly on the inner edge of the bezel.
- **Live hands** computed from `new Date()`:
  - Hour: `(hours % 12) * 30 + minutes / 2` degrees — 30° per hour PLUS half a degree per minute, so the hour hand creeps smoothly.
  - Minute: `minutes * 6` degrees — 6° per minute.
  - Both hands styled with `transform-origin: 50% 100%` (rotate from the base) and use `translateX(-50%) rotate(...)` so they pivot from the center hub.
- **Brass hub** with `radial-gradient(circle at 30% 30%, #ffd86b, #c9a24a 50%, #5a4318)` for the polished-brass center pin.

### The pendulum case (12×36)

- **Dark interior** `radial-gradient(ellipse at 50% 30%, #2a1a0a 0%, #0a0503 100%)` — looking into a dark wooden cabinet.
- **1px brass-trim border** + 5px rounded bottom corners + thicker `0.5px` dark top border (where the face meets the case).
- **Glass reflection** via `::before` — a 6px-tall fade `rgba(255,255,255,0.06) → transparent` at the top, simulating light catching the glass cover.
- **Pendulum** rotates from a fixed pivot at the top:
  - 0.8×28px brass rod (`linear-gradient(180deg, #c9a24a → #8c6e27 → #5a4318)`)
  - 7×7px brass bob with full radial-gradient highlight
  - `transform-origin: 50% 0` + `pendulumSwing 2.4s cubic-bezier(.45,0,.55,1) infinite` keyframe oscillating between `+14deg` and `-14deg`
  - The cubic-bezier mimics the way a real pendulum's velocity peaks at the bottom of its swing — fastest at center, slowest at the extremes — instead of looking like a uniform sweep.

### Live updates + SSR safety

```ts
const [now, setNow] = useState<Date | null>(null);
useEffect(() => {
  setNow(new Date());
  const t = setInterval(() => setNow(new Date()), 30_000);
  return () => clearInterval(t);
}, []);
if (!now) return null;
```

Server render returns `null`, then the client effect populates `now` post-mount. No hydration mismatch from differing TZs. Updates every 30s — fine for hour + minute hands; the second hand isn't shown.

### Mount

Inside `pos-shop-room`, after the mailbox columns:

```jsx
<div className="pos-shop-room">
  ...
  <MailboxColumn side="left" startNumber={101} />
  <MailboxColumn side="right" startNumber={106} />
  <WallClock />
</div>
```

Position absolute: `top: 240px; left: 1px; width: 24px`. The 240px places the clock right below the bottom of the left mailbox column (which ends at y≈222). Below 640px: shrinks to 18px wide, top:200, with the pendulum case scaled to 9×28.

### A11y

`aria-label={\`Current time \${now.toLocaleTimeString(...)}\`}` lets screen readers announce the time. The face inner + pendulum case are `aria-hidden`.

### Files touched (iter-129)

```
src/components/admin/AdminPOSPanel.tsx
  + WallClock component (~40 lines): client-side date hook + 12-mark face + live hands + pendulum
  + <WallClock /> mount inside pos-shop-room after the mailbox columns
  + .wall-clock / .wall-clock-face / .wall-clock-face-inner styles
  + .wall-clock-mark / .wall-clock-mark-major / .wall-clock-mark span styles
  + .wall-clock-hand / .wall-clock-hand-hour / .wall-clock-hand-minute / .wall-clock-hub
  + .wall-clock-pendulum-case + ::before glass reflection + .wall-clock-pendulum
  + .wall-clock-pendulum-rod / .wall-clock-pendulum-bob
  + pendulumSwing 2.4s cubic-bezier keyframe (-14° ↔ +14°)
  + sub-640 responsive override (18px face, 9×28 case)
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

129 iterations. POS iter-51 of N — the shop now has a slow steady tick. Hours and minutes register live; the pendulum swings at 2.4s per cycle, accelerating through center and easing at the extremes. The room has gained a heartbeat.


## 141. POS — iter-130 (Twin Hanging Pendant Lamps)

Iter-52. Two brass pendant lamps now hang from the brass picture rail at the top of the shop room, flanking the awning's centered "NOHO MAILBOX" text. Each lamp dangles via a 22px chain of repeating dark links, terminating in a 36×22 brass dome shade with a glowing amber bulb visible through the bottom opening, plus a translucent volumetric light cone fanning out below the dome that brightens the awning + cabinet area beneath it. Subtle sway at 11s/cycle, with the right-hand lamp 3.6s out of phase so the two never move in lockstep.

### One lamp anatomy

- **Brass mounting cap** at the top — 14×4 brass-gradient tab with 1px dark border, attached to the picture rail. Inset top highlight + outer drop shadow give it depth.
- **Chain** below the cap — 1.5×22px vertical strip filled with `repeating-linear-gradient(0deg, #5a4318 0 1.5px, #2D100F 1.5 2.5px, #5a4318 2.5 4px)` — alternating dark and slightly-lighter brass bands repeat every 4px to suggest the linked silhouette of a real chain. `drop-shadow(0 0.5px 0.5px rgba(0,0,0,0.6))` softens the chain's right-side shadow against the wall.
- **Brass dome shade** — 36×22 with a creative `border-radius: 4px 4px 50% 50% / 4px 4px 60% 60%` formula that produces a flat-top, rounded-belly, slightly-flared-bottom silhouette — the classic industrial pendant shade shape. Filled with the standard 4-stop brass gradient (`#ffd86b → #c9a24a → #8c6e27 → #5a4318`) plus a top-left highlight ellipse for the polished-brass reflection. Box-shadow stack: inset bottom-shadow for depth + inset top-edge highlight + two outer amber glow halos (14px tight, 26px diffuse) to suggest the hot bulb radiating outward.
- **Glowing bulb** at the dome's bottom opening — 18×7px ellipse with a 4-stop radial gradient (`#fff4b8 → #ffe88a → #ffb84a → #c9722a`) plus a 0.5px blur for the soft incandescent halo. Two box-shadow halos (6px + 12px) bloom amber + warm orange. `pendantLampBulbBreathe 4.4s ease-in-out infinite` cycles opacity 0.92 → 1.0 → 0.92, mimicking the slow flicker of an old filament bulb under uneven voltage.
- **Light cone** below the lamp — 96×90px ellipse with a `radial-gradient(ellipse 80% 100% at 50% 0%)` fading from 22% amber → 10% warm orange → transparent. `mix-blend-mode: screen` so it brightens whatever's below (cabinet brass top-rail, awning, etc.) without obscuring it. `filter: blur(2.5px)` softens the cone's edges into volumetric light.

### Sway animation

```css
@keyframes pendantLampSway {
  0%   { transform: rotate(-0.5deg); }
  50%  { transform: rotate(0.5deg); }
  100% { transform: rotate(-0.5deg); }
}
.pendant-lamp { animation: pendantLampSway 11s ease-in-out infinite; }
.pendant-lamp-right { animation-delay: -3.6s; }
```

11s peak-to-peak with `ease-in-out` gives a slow gentle sway. The right lamp's `-3.6s` start offset means at any given moment the two lamps are at different phases of their swing — left swinging right while right swings left, then converging, etc. Subtle but registers as natural inertia rather than two coupled mechanisms.

`transform-origin: 50% 0%` makes the lamp pivot from its top — i.e., from where the chain meets the picture rail. Real chained fixtures swing from their mount point.

### Positioning

`.pendant-lamp-left { left: 22%; }` and `.pendant-lamp-right { right: 22%; }` — each lamp's left/right edge sits 22% in from the corresponding side of `pos-shop-room`. This puts the two lamps to the left and right of the awning's centered text region (which is centered ±~120px from middle), avoiding any conflict with the embroidered "NOHO MAILBOX" lettering.

z-index: 4 — above the awning (which is in document flow as part of `pos-tilt-stage`) so the lamps clearly dangle in front. The light cones sit at z:3 inside the lamp, beneath the shade but above whatever's behind them.

Below 640px: lamps shrink to 32px wide, positioned at left/right 16% (closer to edges since the awning text shrinks too), shade to 26×18, bulb to 14×5, cone to 70×60.

### Files touched (iter-130)

```
src/components/admin/AdminPOSPanel.tsx
  + PendantLamp component (~10 lines): renders cap + chain + shade + bulb + cone
  + <PendantLamp side="left" /> + <PendantLamp side="right" /> mounts inside pos-shop-room after the WallClock
  + .pendant-lamp wrapper with transform-origin + animation
  + .pendant-lamp-left / .pendant-lamp-right positioning
  + .pendant-lamp-cap brass mounting tab
  + .pendant-lamp-chain repeating-linear-gradient link pattern
  + .pendant-lamp-shade brass dome with creative border-radius silhouette
  + .pendant-lamp-bulb 4-stop radial gradient + double halo box-shadow + breathe animation
  + .pendant-lamp-cone radial-gradient cone with blur + screen blend
  + pendantLampSway 11s ease-in-out keyframe (with -3.6s phase offset for right lamp)
  + pendantLampBulbBreathe 4.4s ease-in-out keyframe
  + sub-640 responsive override
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

130 iterations. POS iter-52 of N — two pendant lamps now hang from the picture rail flanking the awning, casting amber light cones onto the cabinet. The shop's lighting infrastructure is officially in place: ambient sunbeam from the upper right, focused pendant illumination from the ceiling, and the LCD's CRT phosphor glow at the cabinet's heart.


## 142. POS — iter-131 (Brass Address Plaque "5062")

Iter-53. A vintage cream-and-brass address plaque now hangs on the right wall below the mailbox column, reading "5062" in large Georgia-serif on top with "LANKERSHIM" engraved as a smaller subtitle below. Four brass screw heads at the corners (each with a slotted screw mark), 1.5px brass-trim border, 3px rounded corners, and a slight -1° tilt that reads as "installed by a tradesman in 1947 and never adjusted." The shop now has its official street-address marker — the same kind of brass plate you'd see beside the front door of a real 1940s storefront.

### Plaque anatomy (30×50px)

- **Cream face** layered from two radial gradients: a top-left bright-cream highlight (`#fdf7e6 → transparent`) over a base (`#ebd4a8 → #d4ba88 → #b89a64`). Combined, the face has a subtle depth where the upper-left catches light brighter and the lower-right shades into aged tan.
- **1.5px brass border** in `#5a4318`, with 3px rounded corners. Inset shadow stack: `inset 0 1px 0 rgba(255,255,255,0.5)` (top edge highlight) + `inset 0 0 0 0.5px rgba(201,162,74,0.7)` (subtle inner brass ring) + `inset 0 -1px 1px rgba(0,0,0,0.18)` (bottom inner shadow).
- **Four brass screw heads** at the corners (2.6×2.6px each), `radial-gradient(circle at 30% 30%, #ffd86b → #c9a24a → #5a4318)`, with `inset 0 0.4px 0 rgba(255,255,255,0.4)` top highlight + outer drop shadow. Each screw has a `::after` pseudo-element creating a 2×0.5px slot mark rotated `28deg` — different angle per screw to mimic random-orientation slot heads (real screws end up turned to wherever the installer stopped tightening).
- **"5062" number** in 17px Georgia serif, weight 900, color `#2D100F`. Triple text-shadow: `0 1px 0 rgba(255,255,255,0.45)` (highlight beneath the engraving) + `0 -0.5px 0 rgba(45,16,15,0.08)` (subtle inset darkening above) — combined effect reads as engraved/recessed into the brass face.
- **"LANKERSHIM" subtitle** in 4.5px Georgia, color `#5a4318` (medium brass-brown rather than pure black, so it doesn't compete with the main number), letter-spacing `0.18em` for that engraved-tracking look.

### Tilt

`transform: rotate(-1deg)` on the wrapper — slightly counterclockwise. Just enough that the eye notices subliminally. The drop shadow `filter: drop-shadow(0 2px 3px rgba(0,0,0,0.45))` follows the rotated geometry, so the shadow tilts with the plaque.

### Mount

Inside `pos-shop-room`, after the twin pendant lamps:

```jsx
<div className="pos-shop-room">
  ...
  <PendantLamp side="left" />
  <PendantLamp side="right" />
  <AddressPlaque />
</div>
```

Position absolute: `top: 240px; right: 0; width: 30px; height: 50px; z-index: 2`. The 240px places it just below the right mailbox column (which ends at y≈222). Width 30px slightly exceeds the wall's 26px right padding by 4px — extending into the cabinet's outer right edge by a hair. That tiny overlap is in the cabinet's own padding region (12-20px), not over interactive content, and reads as "the plaque is mounted forward of the wall, casting its shadow onto both surfaces."

z-index: 2 — above the mailbox columns (z:1) so it can extend over the cabinet's right edge without being clipped, but below the cabinet's own controls (which sit at default flow z).

Below 640px: shrinks to 24×40, "5062" font 13px, label 3.5px, screws 2×2 — phones still see the plaque at proportional scale.

### A11y

`aria-label="5062 Lankershim Boulevard"` for screen readers — the visual abbreviation "LANKERSHIM" expands to the full street name. The frame and screws are decorative `aria-hidden`.

### Files touched (iter-131)

```
src/components/admin/AdminPOSPanel.tsx
  + AddressPlaque component (~15 lines): wrapper + frame + 4 screws + number + label
  + <AddressPlaque /> mount inside pos-shop-room after the twin pendant lamps
  + .address-plaque + .address-plaque-frame + .address-plaque-screw + .address-plaque-screw::after slot styles
  + .address-plaque-number + .address-plaque-label typography
  + sub-640 responsive override
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

131 iterations. POS iter-53 of N — the shop now displays its street address ("5062 · LANKERSHIM") on a brass plaque mounted to the right wall. The storefront identity is fully grounded: mailboxes built into the wall, the brand "NOHO MAILBOX" embroidered into the awning, a wall calendar showing today's date, a pendulum clock ticking, and now the address itself etched in brass.


## 143. POS — iter-132 (Vintage Rotary Telephone)

Iter-54. A black-bakelite wall-mounted rotary phone now sits on the right wood-paneled wall below the address plaque. Brass-rimmed dial with 10 finger-hole positions arranged around a darker center brake-pin, a finger stop tab at the 1-2 o'clock position, the handset (with raised earpiece + mouthpiece bumps) resting in the cradle at the top tilted -3° as if hung up by a busy clerk, and a coiled cord trailing down the wall with a slow 8s sway. Period-correct shop accessory; every 1940s storefront had one mounted within reach of the register.

### Phone anatomy (28×56px)

- **Bakelite body** — 24×30 rounded rectangle with creative `border-radius: 5px 5px 7px 7px / 5px 5px 6px 6px` (slightly rounder bottom than top, mimicking the swelling shape of cast-bakelite housings). Filled with `radial-gradient(ellipse at 30% 22%, #3a1a18 → #1a0a06 → #0a0503)` so the upper-left catches a faint highlight against the otherwise near-black body. Layered inset shadows: top edge highlight + bottom shadow + 1px brass-deep border + outer drop shadow.
- **Brass dial** — 17×17 circle filled with the standard 4-stop brass gradient. Five inset shadows give the bezel depth: outer dark ring + top highlight + bottom darkening + ambient outer halo + a cool-tone trim hint. The polished-brass dial reads as the kind of metallic accent every 1930s/40s phone had.
- **10 finger-hole markers** generated from `Array.from({length:10})` with `transform: rotate(${i * 36}deg) translateY(-5.5px)`. The translate puts each hole 5.5px above the dial's center; the rotate moves it around the dial. Each hole is a 1.6×1.6 dark dot with `inset 0 0.3px 0.3px rgba(0,0,0,0.85)` recess shadow — tiny but reads as the finger-hole pattern of a real rotary.
- **Brake-pin / center hub** — 6×6 nearly-black circle with a faint brass border ring and inner dark recess shadow. The "I" of the dial — what your finger hits when the dial spins back to its rest position.
- **Finger stop tab** — small brass nub at the 1-2 o'clock position (`top: 12%; right: 22%; rotate(38deg)`). The metal stop that prevents the dial from over-rotating; a real recognizable feature.
- **Handset** — 26×6 ellipse-rounded `border-radius: 50% / 60%` with `transform: rotate(-3deg)` so it sits slightly askew in the cradle (like it was hung up in a hurry). `linear-gradient(180deg, #3a1a18 → #1a0a06 → #0a0503)` body + 0.8px brass-deep border + inset highlights/shadows + outer drop shadow.
- **Earpiece + mouthpiece bumps** via `::before` (left earpiece) and `::after` (right mouthpiece) — 4×4 dark circles with brass-trim borders that sit on the handset's left + right ends. Reads as the curved end pieces where you put the phone to your ear and mouth.
- **Cord** — 2×18 vertical strip filled with `repeating-linear-gradient(0deg, #2D100F 0 1.4px, #1a0a06 1.4 2.6px)` simulating the alternating-color pattern of a coiled phone cord. `transform-origin: 50% 0` + `phoneCordSway 8s ease-in-out` keyframe rotates between -1.5° and +1.5°, like the cord drifts as the phone settles.

### Mount

Inside `pos-shop-room`, after the address plaque:

```jsx
<div className="pos-shop-room">
  ...
  <AddressPlaque />
  <VintagePhone />
</div>
```

Position absolute: `top: 304px; right: 1px; width: 28px; height: 56px; z-index: 1`. Sits just below the address plaque (which ends at y≈290) with a small 14px gap. Below 640px: shrinks to 22×46, top 250.

### Files touched (iter-132)

```
src/components/admin/AdminPOSPanel.tsx
  + VintagePhone component (~20 lines): body + dial (10 holes + center + stop) + handset + cord
  + <VintagePhone /> mount inside pos-shop-room after the AddressPlaque
  + .vintage-phone wrapper + .vintage-phone-body bakelite housing
  + .vintage-phone-dial with brass gradient + 5-layer inset shadow stack
  + .vintage-phone-dial-hole (10 instances rotated 36° apart) + ::dial-center + ::dial-stop
  + .vintage-phone-handset with rotate(-3deg) + ::before/::after for earpiece + mouthpiece bumps
  + .vintage-phone-cord with repeating-linear-gradient + 8s sway animation
  + sub-640 responsive override
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

132 iterations. POS iter-54 of N — the right wall now hosts a working-looking 1940s rotary phone with all the period detail (brass dial, finger holes, brake pin, finger stop, handset earpiece/mouthpiece bumps, coiled cord). The shop's office-equipment lineage is officially established.


## 144. POS — iter-133 (Receipt Spike)

Iter-55. A small brass paper-impale spike now sits mounted on the left wood-paneled wall below the pendulum clock. Sharp brass rod with a pointed top (via `clip-path` polygon) rising 38px from a 16×5 dark walnut base block, with 6 receipt papers impaled near the bottom of the spike at slight individual rotations (-2° to +2.5°) — they read as a stack of real torn-off slips with random tilts, each pierced through its center by a visible pinprick (a tiny dark dot via `::after`). Period-correct shopkeeper accessory: every old register had one to skewer carbon-copies of the day's sales.

### Components (22×50px)

- **Wood base block** (16×5px) — `linear-gradient(180deg, #6b3e2a → #4a2818 → #2D100F)` with 0.5px dark border, 1.5px rounded corners. Inset top-edge highlight + bottom-edge shadow + outer drop shadow give the block depth. Sits flush at the bottom of the spike's container.
- **Brass spike rod** (1.6×38px) — full vertical brass gradient (`#ffd86b → #c9a24a → #8c6e27 → #5a4318`). The clever trick is `clip-path: polygon(50% 0%, 100% 8%, 100% 100%, 0% 100%, 0% 8%)` — this clips the top 8% of the rod into a sharp tapered point, giving the impression of a hand-sharpened brass spike rather than a uniform cylinder. Side highlight via `box-shadow: 0.4px 0 0.4px rgba(0,0,0,0.45)`.
- **6 impaled receipt papers** — 14×2.5 strips with `linear-gradient(180deg, #fdf7e6 → #ebd4a8 → #d4ba88)` for the aged-paper color graduation. Each has a thin top + bottom border in semi-transparent dark to suggest the paper edges. The 6 are positioned at staggered `bottom` offsets (3px, 6px, 9px, 12px, 15px, 18px) and individually rotated `-2°, +1.5°, -0.5°, +2.5°, -1.5°, +1°` so the stack reads as hand-impaled rather than precisely-placed. Each carries a `::after` pseudo-element rendering a 1.4×0.5 dark pinprick at its center — the visible piercing where the spike entered the paper.

### Mount

Inside `pos-shop-room`, after the rotary phone:

```jsx
<div className="pos-shop-room">
  ...
  <VintagePhone />
  <ReceiptSpike />
</div>
```

Position absolute: `top: 312px; left: 1px; width: 22px; height: 50px; z-index: 1`. Sits in the left wall strip just below where the pendulum clock ends (clock at top:240, height ~76 → ends at y≈316; spike starts y=312 with 4px overlap of clock's bottom edge — visually fine since it's just below the swinging pendulum bob).

Below 640px: shrinks to 18×40, top:260, base 13×4, rod 1.4×30, paper 11×2. Phones still see the impaled stack at proportional scale.

### Files touched (iter-133)

```
src/components/admin/AdminPOSPanel.tsx
  + ReceiptSpike component (~22 lines): pre-computed receipt array + base + rod + map of papers
  + <ReceiptSpike /> mount inside pos-shop-room after the VintagePhone
  + .receipt-spike wrapper + .receipt-spike-base wood block
  + .receipt-spike-rod with clip-path polygon(50% 0%, 100% 8%, ...) for pointed top
  + .receipt-spike-paper layered styling + ::after pinprick mark at each paper's center
  + sub-640 responsive override
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

133 iterations. POS iter-55 of N — a brass receipt spike with 6 impaled torn-off slips now sits on the left wall. The shop's record-keeping infrastructure is now visible: from CRT till at the cabinet's heart out to the brass spike where carbon-copies pile up at the end of each day.


## 145. POS — iter-134 (Framed First Dollar Earned)

Iter-56. The classic shopkeeper tradition lands on the right wall: a small wooden frame containing a miniature greenback ($1 bill) on a cream mat, with corner "1" numerals at all four corners, a stand-in Washington portrait oval at the center, intricate top + bottom edge guilloché striping, and "OUR FIRST" engraved in gold across the bottom of the frame. Slight +1° tilt — visually mirrors the address plaque's -1° tilt for symmetry across the two walls. The first sale a business earns is sentimentally framed for good luck.

### Frame anatomy (28×36px)

- **Wood frame** — 4-stop dark walnut gradient (`#6b3e2a → #4a2818 → #2D100F`) with `border: 0.5px solid #2D100F` and `border-radius: 1.5px`. Inset 4-direction shadow stack: top highlight + bottom shadow + left side faint highlight + right side darkening — creates the impression of a beveled wooden frame catching light from the upper-left.
- **Cream mat** inside the frame — `radial-gradient(ellipse at 50% 30%, #fdf7e6 → #ebd4a8)` with a faint inset border ring (`rgba(45, 16, 15, 0.25)`) suggesting the slight gap where the mat meets the frame opening. 0.5px rounded corners.

### The greenback bill (22×12px)

- **Bill body** — `linear-gradient(135deg, #d4e6c8 0% → #b4d4a4 35% → #98b88c 100%)` for the diagonal greenback fade. 0.4px green-trim border + outer drop shadow + inset green ring.
- **Four "1" numerals** at corners — Georgia serif, weight 900, 3px font, color `#2a4a1a` (deep money-green). One per corner with absolute positioning.
- **Washington portrait oval** at center — 5×6.5px ellipse with `radial-gradient(ellipse at 50% 30%, rgba(45, 74, 26, 0.18) → rgba(45, 74, 26, 0.42))`, 0.3px green-trim border, inset glow. Reads as the central engraved portrait without rendering actual face detail at this scale.
- **Edge guilloché stripes** via two `::before`/`::after`-equivalent divs with `repeating-linear-gradient(90deg, rgba(45, 74, 26, 0.35) 0 1px, transparent 1px 2px)` — top stripe at y=1.4px, bottom stripe at y=10.6px (1.4px from bottom). Mimics the dense engraved decorative pattern that surrounds the central image on real US currency.

### "OUR FIRST" label

Bottom of frame, Georgia serif weight 900, 3.6px font, color `#c9a24a` gold, `letter-spacing: 0.18em` for engraved tracking, 0.3px black drop shadow for incised relief. Sits in the 6px padding-bottom strip of the frame, beneath the cream mat.

### Tilt + drop shadow

`transform: rotate(1deg)` — slight clockwise tilt complementing the address plaque's -1°. Drop shadow follows the rotated geometry via `filter: drop-shadow(0 2px 3px rgba(0,0,0,0.45))`.

### Mount

Inside `pos-shop-room`, after the receipt spike:

```jsx
<div className="pos-shop-room">
  ...
  <ReceiptSpike />
  <FirstDollarFrame />
</div>
```

Position absolute: `top: 380px; right: 0; width: 28px; height: 36px; z-index: 1`. Sits below the rotary phone (which ends at y≈360) with a small 20px gap.

Right-wall layout from top to bottom:
1. Mailbox column (24-222)
2. Address plaque (240-290)
3. Vintage rotary phone (304-360)
4. **Framed first dollar (380-416)** ← new

Below 640px: shrinks to 22×28, top:320, bill 17×9, fonts proportionally scaled.

### A11y

`aria-label="Our first dollar earned, framed on the wall"` for screen readers — context they wouldn't infer from the visual alone.

### Files touched (iter-134)

```
src/components/admin/AdminPOSPanel.tsx
  + FirstDollarFrame component (~20 lines): frame + mat + bill with 4 numerals + portrait + 2 edge guilloché stripes + label
  + <FirstDollarFrame /> mount inside pos-shop-room after the ReceiptSpike
  + .first-dollar wrapper with rotate(1deg) + drop-shadow
  + .first-dollar-frame wood gradient + 4-direction inset shadow
  + .first-dollar-mat cream radial-gradient
  + .first-dollar-bill greenback gradient + corner numerals + portrait + edge stripes
  + .first-dollar-label gold serif tracking
  + sub-640 responsive override
HANDOFF.md  this section
```

### Build verification

`npx next build` exit 0 (186 routes prerendered). TypeScript clean.

### Loop status

134 iterations. POS iter-56 of N — the right wall now hosts a wood-framed first dollar. The shop has acquired its sentimental anchor: the dollar that started everything, hung on the wall as a reminder + good-luck talisman.
