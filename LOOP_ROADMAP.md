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

All 30 original items shipped iter-83 → iter-111. New ideas to keep the loop going:

31. **Wallet auto top-up** ✓ shipped iter-112 — when wallet drops below member-set threshold, auto-creates a CreditRequest and emails them.
32. **Holiday closure auto-emails** ✓ shipped iter-113 — daily cron emails active customers 2 days before each iter-90 holiday.
33. **Member onboarding checklist** ✓ shipped iter-114 — visual progress arc + 8 items + per-item Go links + auto-collapse to chip when 100% done.
34. **Mailbox upgrade flow with prorate** ✓ shipped iter-116 — Basic→Business→Premium upgrade card with per-option prorate calc, wallet-funded charge, atomic plan switch + MailboxRenewal record + audit + receipt email + admin webhook.
35. **Holiday-aware email scheduler** — never sends storage-fee warnings during a closure window.
36. **Sticky note pinning UI** ✓ shipped iter-120 — global pinned-notes board (sticky-card grid) + customer detail drawer with pin/unpin/delete + create form with kind picker + customer search.
37. **Saved package contacts** ✓ shipped iter-119 — per-customer recipient autocomplete chips on the intake panel, frequency-weighted with recency boost, click-to-fill.
38. **Customer photo album** ✓ shipped iter-115 — paginated grid of every package + scanned-mail photo for the member, with All/Packages/Mail filter chips + click-to-zoom lightbox + lazy loading.
39. **Mailbox suite occupancy heatmap** — admin visual grid of all suites + utilization %.
40. **Bulk forward batch** — admin runs forwarding for multiple suites at once.
41. **Affiliate earnings dashboard** ✓ shipped iter-121 — leaderboard with medal ranks + 12-month closed-vs-paid SVG bar chart + payout queue with mark-paid action + 4 stat tiles.
42. **Customer time-zone awareness** — emails respect their TZ for "delivered today" copy.
43. **Backup verification panel** — admin sees latest DB backup health + last-restore-test.
44. **Member self-service mailbox transfer** — request to swap suite (e.g. someone wants a memorable number).
45. **Carrier wait-time predictor** — historical avg time-to-pickup per customer, use to nudge stale ones.
