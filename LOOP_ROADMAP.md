# Loop Roadmap — Remarkable Core Features

Each `/loop` iteration pulls one item from this list, ships it as a substantial feature (not a polish), and the next iteration learns from the previous (audit-trail patterns get reused, new components get factored, every send gets logged).

Built so far through iter-83 lays down the operational chassis — intake, pickup, dropoff, audit, notifications, exports, lookups, QR pickup, bulk mailer. Everything below builds on that.

---

## Tier 1 · Communication & growth (ship next)

1. **SMS notifications via Twilio** — mail-arrived + picked-up + storage-warning texts. Per-customer opt-in preference. Reuses the Notification + EmailLog patterns; new `SmsLog` table.
2. **Customer notification-preference center** — UI on member settings to toggle email vs SMS vs in-app per event type. Backed by a JSON `notifPrefs` blob on User (already exists in schema).
3. **Annual statement PDF** — per-customer PDF of all activity (intake, pickups, fees, payments) with a year-end summary. Generates on-demand from member dashboard, archived to Vercel Blob.
4. **Customer-satisfaction NPS survey** — fires after pickup-confirm email, simple 1–5 stars + comment. Aggregated on a new admin `Insights` page.
5. **Public package-tracking page** without login (`/p/[id]?token=`). Customer can share with sender; shows photo + status timeline + ETA. Token-gated so it can't be enumerated.

## Tier 2 · Money & billing

6. **Auto-bill storage fees on pickup** — when admin marks Picked Up, if storage was active, charge wallet (or generate invoice). Uses the existing wallet/invoice infrastructure.
7. **Stripe / Square recurring billing** for plan renewals. Card-on-file auto-charges 7 days before plan due date.
8. **POS sale completion + thermal receipt** — finish wiring `pos.ts` so AdminPOSPanel can ring up cash/card/wallet sales with a printable receipt. Blocked by the empty pos.ts Turbopack hiccup; resolve and ship.
9. **Bookkeeping export** — monthly QuickBooks IIF + plain-CSV export of all paid invoices, walletTransactions, POS sales, mailbox renewals, dropoff fees.
10. **Storage-fee dispute workflow** — customer disputes from dashboard, admin sees in a new "Pending disputes" queue, can waive or uphold with audit trail.

## Tier 3 · Operations & power features

11. **Cmd+K admin omnibox** — global jump-to-anything: customer name → their page; tracking # → lookup result; "log dropoff" → opens form. Mirrors the member CommandPalette that just shipped.
12. **Daily KPI digest email** to admin every morning — yesterday's intake / pickups / dropoffs / revenue / churn signals.
13. **Slack/Discord webhook bridge** — every package-arrived event, every dropoff, every storage-tier breach posts to a configurable webhook URL.
14. **Two-factor auth for admin sessions** — TOTP. The `totpSecret` + `totpEnabled` columns already exist; build the enrollment + verify flow.
15. **Operating-hours config** — admin-editable holiday + special-hours table. Auto-shows on marketing site + locks customer-facing actions during closed hours.
16. **Mailbox key audit ledger** — full who-has-key-N timeline (assignments, returns, replacements). Backed by the existing MailboxKey model + audit log.

## Tier 4 · Customer self-serve

17. **Pickup-time scheduling** — customer books a 15-min slot, admin sees a sorted queue. Backed by a new `PickupAppointment` table.
18. **Guest-pickup authorization with QR** — customer authorizes a guest from their dashboard; guest gets a one-time QR; admin scans it to release a specific package. Backed by existing `GuestPickupAuth` model.
19. **Shared-mailbox access** — primary user grants secondary access to view their packages. Backed by existing `SharedMailboxAccess` model.
20. **Vacation-hold workflow** — customer schedules a hold window from their dashboard; admin sees it on the shelf list; auto-resumes on end date. Backed by existing `VacationHold` model.

## Tier 5 · Carrier & compliance

21. **USPS / UPS / FedEx live tracking** — auto-poll carrier APIs for the active scans; surface "package out for delivery", "exception", "delivered" events on the member dashboard with timestamps.
22. **AI photo analysis on intake** — call Claude Vision on every photo upload to detect carrier label, fragile/this-side-up stickers, suspected hazardous content. Surfaces warnings on the row.
23. **CMRA quarterly compliance report** — auto-generates the USPS Form 1583 quarterly customer roster + change report.
24. **ID-document expiry alerts** — when `idPrimaryExpDate` is <90d away, fire a renewal-prompt email + dashboard banner.
25. **Insurance / declared-value workflow** — customer can upgrade a label or in-bureau dropoff with declared value; calculated insurance fee adds to the cart.

## Tier 6 · Differentiators

26. **Multi-language support (Arabic + French)** — i18n layer for marketing + dashboard. Ties to the Khiari memory (Tunisia bureau ops).
27. **PWA / offline mode for the bureau scanner** — InboundScanPanel works on a tablet at the counter even with flaky wifi; queues actions locally, syncs on reconnect.
28. **Same-day delivery driver app** (PWA) — driver sees their route, scans for proof-of-pickup, captures POD photo at delivery.
29. **Member referral rewards** — already half-built (Referral model exists). Customer shares a link, both get a credit when referee signs up.
30. **Bulk customer onboarding via CSV** — admin uploads a customer-roster CSV (name, email, suite, plan, KYC status) → preview → import. Invites all in one shot via the new bulk mailer.

---

## Loop discipline

- Every iteration: ship one feature end-to-end (server action + UI + audit log + appropriate notification) — not a polish, not a chip, not a rename.
- Every iteration: extend or reuse the patterns shipped in earlier iters (`prisma.$transaction` for atomic write+audit; `LightboxContext` for any new photo surface; `playBeep` for any new admin scan event; `wrapLayout` for any new email).
- Every iteration: build verify → exit 0 → schedule the next.
- Every iteration learns: if something broke (e.g. iter-82 hit a Turbopack stale cache), document the workaround so future iters don't trip on it again.
- HANDOFF.md gets a §N append every 5 iters covering the block.

When all 30 ship, the bureau has the most opinionated mailbox-store SaaS on the market.

---

## Tier 7 · Post-roadmap (added at iter-112)

All 30 original items shipped iter-83 → iter-111. Tier 7 (#31-#45) shipped iter-112 → iter-132.
All 45 features shipped end-to-end. Loop continues with Tier 8 ideation (#46+).

New ideas to keep the loop going:

31. **Wallet auto top-up** ✓ shipped iter-112 — when wallet drops below member-set threshold, auto-creates a CreditRequest and emails them.
32. **Holiday closure auto-emails** ✓ shipped iter-113 — daily cron emails active customers 2 days before each iter-90 holiday.
33. **Member onboarding checklist** ✓ shipped iter-114 — visual progress arc + 8 items + per-item Go links + auto-collapse to chip when 100% done.
34. **Mailbox upgrade flow with prorate** ✓ shipped iter-116 — Basic→Business→Premium upgrade card with per-option prorate calc, wallet-funded charge, atomic plan switch + MailboxRenewal record + audit + receipt email + admin webhook.
35. **Holiday-aware email scheduler** ✓ shipped iter-130 — `DeferredEmail` queue + `sendOrDefer()` helper + `decideHolidayDeferral()` lib + drain cron + admin panel with cancel/send-now per row + 9 default-deferred kinds.
36. **Sticky note pinning UI** ✓ shipped iter-120 — global pinned-notes board (sticky-card grid) + customer detail drawer with pin/unpin/delete + create form with kind picker + customer search.
37. **Saved package contacts** ✓ shipped iter-119 — per-customer recipient autocomplete chips on the intake panel, frequency-weighted with recency boost, click-to-fill.
38. **Customer photo album** ✓ shipped iter-115 — paginated grid of every package + scanned-mail photo for the member, with All/Packages/Mail filter chips + click-to-zoom lightbox + lazy loading.
39. **Mailbox suite occupancy heatmap** — admin visual grid of all suites + utilization %.
40. **Bulk forward batch** ✓ shipped iter-127 — pending-forwards queue + per-row checkboxes + per-row address picker + atomic per-item process with audit + roll-up batch audit + failure surfacing for retry.
41. **Affiliate earnings dashboard** ✓ shipped iter-121 — leaderboard with medal ranks + 12-month closed-vs-paid SVG bar chart + payout queue with mark-paid action + 4 stat tiles.
42. **Customer time-zone awareness** ✓ shipped iter-123 — User.timeZone column + member card with 16 common TZs + browser-detect shortcut + custom IANA input + live "now in X" preview + helper for emails to render times in user's TZ.
43. **Backup verification panel** ✓ shipped iter-132 — `runBackupHealthCheck()` runs 5 probes (connectivity SELECT 1, write probe via SiteConfig sentinel round-trip, schema integrity via Promise.allSettled across 12 model counts, write recency with stale thresholds, env-var presence ✓/✗ never values) + admin panel auto-runs on mount with gradient overall-status banner + 5 check tiles + row-counts grid + recency timeline + env config matrix + last-10-runs history. Audit-logged as `backup.health_check_ran`.
44. **Member self-service mailbox transfer** ✓ shipped iter-122 — schema + vacant-suite picker + reason form + admin queue with race-safe approval (atomic User.suiteNumber swap + audit) + decision emails + webhook.
45. **Carrier wait-time predictor** ✓ shipped iter-126 — per-customer avg/median/fastest/slowest pickup days mined from audit log, "late" flag at >50% over their own pace, sparkbar visualization, predicted-pickup-by date for in-progress packages.

---

## Tier 8 · Post-Tier-7 (added at iter-133)

Tier 7 closes at iter-132 with #43 backup-verification panel — all 15 Tier 7 items shipped. New backlog of remarkable bureau features to keep the loop going.

**iter-136 (mid-Tier-8 fix)** — Label printer pivoted from DB-only to ONLINE carrier lookup. `findLabelByTracking` now auto-detects carrier from the tracking pattern, hits Shippo's tracking API in parallel with the local DB lookup (Promise.all), returns `OnlineTracking { carrier, status, location, etaIso, history[], source }`. Panel renders an `OnlineTrackingPane` directly under the tracking input: live status pill (PRE_TRANSIT/TRANSIT/DELIVERED/RETURNED/FAILURE), location, ETA, "✓ matches our intake" overlay when DB also has the row, and the last 4 carrier scan rows. Falls back to detect-only chip when Shippo isn't configured. Audit-logs every `labelprinter.online_lookup`. Source field on LabelData expanded to `"online" | "db+online" | "manual"`.

46. **Customer credit / wallet ledger PDF** ✓ shipped iter-133 — `getWalletLedger()` server action returns full lifetime transaction history with computed opening/closing/credited/debited summary + entry list (DESC, includes invoiceId). Printable `/dashboard/wallet/ledger` page renders branded SSR statement: hero (member, suite, period), 4-tile summary, full table with kind pill + signed amount + running balance column, footer disclaimer. "Download statement" pill in WalletPanel opens it in a new tab. Audit-logged as `wallet.ledger_viewed`.
47. **Webhook delivery retry & dead-letter** ✓ shipped iter-134 — `WebhookDelivery` schema gained `attempt`/`nextRetryAt`/`deadLettered`/`lastTriedAt`. Failed deliveries auto-schedule retry on exponential backoff (60s/5m/30m/2h/12h, 6 total attempts) → after MAX dead-lettered. New `/api/cron/retry-webhooks` (Bearer-auth) drains due retries via `drainWebhookRetries()` (capped 100/tick). Admin panel gained "Pending retries · Dead letters" section with per-row Replay (resets attempt, re-fires, audit-logs `webhook.replayed`) and Discard (dead-letter only, audit-logs `webhook.deadletter_discarded`). Failed/pending/dead-lettered rows are excluded from the 200-per-endpoint trim so admin always has visibility.
48. **Multi-photo intake gallery** ✓ shipped iter-135 — `MailItem.extraPhotosJson` JSON column (capped 10) holds `{id, url, label?, addedAt}` extras. Server actions `addExtraPhoto`/`removeExtraPhoto`/`relabelExtraPhoto`/`listExtraPhotos`/`getMailItemGallery` are atomic + audit-logged. Member `PackagesPanel` shows primary photo with `+N` count badge; thumb strip below row with admin-set labels; click any thumb opens self-contained `PhotoLightbox` swiper (←/→ keys, ESC, backdrop close, dot indicators, caption). Admin `AdminMailItemPhotosModal` opens from per-row camera icon: existing primary read-only, extras editable inline (rename, remove), URL paste OR file upload via `/api/upload`, 6 preset label chips (Back/Label close-up/Contents/Damage/Side/Top).
49. **Pickup signature capture** ✓ shipped iter-137 — `MailItem` gained `pickupSignatureSvg`/`pickupSignerName`/`pickupSignedAt`. New `<PickupSignatureModal>` is a touch-friendly pointer-events-backed SVG pad: captures polylines as compact path-data (1-decimal precision, 0.7px point dedup), exports as a self-contained SVG document. Server actions `recordPickupSignature`/`clearPickupSignature`/`getPickupSignature` validate (50 KB cap, no markup chars) + atomic write + audit-log (`mail.pickup_signature_captured`/`_cleared`). New ✍️ icon on every `MailItemCard` opens the pad; on save the modal also fires `handleMailAction(id, "Picked Up")` so the existing receipt-email + SMS + webhook + storage-fee pipeline runs unchanged. `sendMailPickedUpEmail` re-fetches the row + embeds the signature SVG inline beside the typed signer name.
50. **Invoice editing & adjustments** ✓ shipped iter-138 — `InvoiceMeta` extended with `adjustments[]` (kind: discount/waiver/surcharge, signedCents, customer-visible description, internal reason, byActorId, atIso, voidedAt). `computeInvoiceTotals` returns new `adjustmentsCents` + `totalBeforeAdjustments`; final total clamped to ≥0. Server actions `addInvoiceAdjustment`/`voidInvoiceAdjustment`/`listInvoiceAdjustments` enforce: positive amount, ≥2-char description AND reason, blocks Paid/Void invoices, atomic recompute of `Invoice.totalCents`, audit-logs `invoice.adjustment_added`/`_voided`. Voids stay in array with `voidedAt` for permanent audit. New `<InvoiceAdjustmentsModal>` (3 kind chips, $ + description + reason fields, totals strip, active list with Void buttons, voided history). `<AdminInvoiceBuilder>` gained "Adjust" button with active-count badge. Printable invoice page renders signed adjustment rows between subtotal/tax and total — green for credits, amber for surcharges.
51. **Smart routing for inbound mail** ✓ shipped iter-139 — `routeRecipientName({ recipient })` server action tokenizes (handles "Doe, John" / titles / suffixes / business aliases), pulls 60-row candidate pool via OR-contains across name/email/businessName, scores on 7 axes: surname × 60 + first-name × 25 + residue × 15, business-name-in-haystack +50, email-prefix +8, recency bonus (mail-items in past 30d, +3 to +15), Active-mailbox +5. Lev-distance fallback (≤1 short, ≤2 long) catches typos. Returns top 5 + `autoPick` when score ≥ 85 AND second place ≥ 25 behind. Audit-logs `intake.smart_routed`. `AdminInboundScanPanel` shows ✨ "Smart match" banner above customer-search results when admin types a 2+-word recipient name; top chip is GREEN when auto-pickable. One click pre-fills suite + recipient name with the typed envelope text.
52. **Customer health score** ✓ shipped iter-140 — `getCustomerHealthScores({userIds?})` computes a 7-axis signed score per member from existing tables (no new schema): tenure (0→+20 over 36mo cap), payment punctuality (-25→+25, % paid-on-time over last 12mo invoices), overdue invoices (-25, 8/each), open disputes (-15, 5/each), pickup-survey satisfaction (0→+15, avg ★/5 × 15), 90-day engagement (0→+10), standing (KYC +5, auto-topup +3, 2FA +2). Raw -65..+95 normalized to 0-100; bucket Excellent/Healthy/Watch/At Risk. All aggregations batched via `Promise.all` + `groupBy` so list of 300 customers = 4 queries total. New `<CustomerHealthBadge>` shows colored pill that pops a per-axis breakdown popover (signed contribution per axis + human-readable detail). `AdminCustomersPanel` now has sortable Health column in table view, badge inline in card view, "Health watch" segment chip filtering Watch + At Risk.
53. **Auto-reply rules for mailer** — admin sets per-thread auto-replies based on keyword triggers (vacation, after-hours, holiday). Reuses the iter-118 mailer infrastructure.
54. **Storage tier auto-graduation** — when a package crosses 14/30/60 days, auto-recalculates fee tier + sends a heads-up email at each threshold. Builds on iter-103 storage-fee infra.
55. **Suite cleaning / maintenance log** — track when each suite was last cleaned/inspected. Admin marks done; report shows overdue cleans.
