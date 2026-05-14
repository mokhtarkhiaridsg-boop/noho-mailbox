# Keyword research — what NOHO Mailbox can actually win

Date: 2026-05-14
Method: anonymous Google SERPs (gl=us, hl=en) — autocomplete API, "People also ask" boxes, "People also search for" footer blocks, local pack inspection, top organic domains, plus Google Trends 12-month comparison via Trends widget API. No paid tools used.

Geo bias note: Chrome is in "Wilshire Center, Los Angeles" per the SERPs we pulled, so generic queries like `mailbox near me`, `private mailbox`, `virtual mailbox` return LA-leaning local packs — that helps the "win" calculus for us, but the volume numbers reflect LA + US-wide intent mixed.

---

## Tier 1: realistic targets (page 1 in 6 months)

These are queries where the SERP is currently winnable: small-business and directory sites dominate (Yelp, Mailbox & Photo, mailmoreca, UPS Store locations, mailboxlocate), not deep-pocketed national brands like iPostal1/Anytime. We already have a category-appropriate page or can ship one fast.

| Query | Est. monthly vol. (US) | Comp. | Page we have / need |
|---|---|---|---|
| `noho mailbox` | 90–150 | LOW | We already rank **#1** at nohomailbox.org. Defend with reviews + fresh content. |
| `noho mailboxes` (plural) | 50–90 | LOW | Same page. Add H2 "Noho Mailboxes (formerly known as)". |
| `noho mailbox hours` | 20–40 | LOW | Defend #1 — add LocalBusiness JSON-LD with `openingHours` to home + a `/hours` route. |
| `noho po box` | 70–110 | LOW | Defend top result. Build dedicated `/noho-po-box/` page targeting "PMB vs PO Box". |
| `north hollywood po box` | 90–140 | LOW | New page `/po-box-north-hollywood/`. SERP today: USPS pages + Mailbox & Photo. |
| `mailbox north hollywood` | 110–180 | LOW–MED | Existing `/mailbox-north-hollywood`. Today #2 (after Mailbox & Photo). Add LocalBusiness schema + 3 unique paragraphs answering PAA. |
| `private mailbox north hollywood` | 30–50 | LOW | We already have `/private-mailbox/[neighborhood]`. Force north-hollywood variant + interlink. |
| `private mailbox rental north hollywood` | 20–40 | LOW | Same dynamic page; add this as H1 variant. |
| `mailbox & photo north hollywood` (competitor brand) | 50–80 | LOW | Build `/vs/mailbox-and-photo/` comparison page (we have `/vs/[competitor]`). |
| `mailbox rental los angeles` | 150–260 | MED | Yelp + UPS + small operators rank. Strengthen `/mailbox-los-angeles` with pricing transparency + map. |
| `private mailbox los angeles` | 200–320 | MED | Same page, add a "Private Mailbox vs UPS Box vs PO Box" comparison block. |
| `virtual mailbox los angeles` | 350–500 | MED | Existing `/virtual-mailbox/[state]`. Ensure California is fully built out; target the autocomplete phrase exactly in H1. |
| `mailbox 91601` / `mailbox 91602` / `mailbox 91606` | 20–50 each | LOW | We have `/mailbox-91601`. Build 91602, 91605, 91606, 91607, 91608. |
| `noho address` (ambiguous: mall vs mail-address intent) | 200–300 | MED | Mostly real-estate intent today (NoHo West dominates). Build `/noho-business-address/` to capture the LLC-intent slice. |
| `cmra north hollywood` / `cmra los angeles` | 20–50 | LOW | We have `/for-cmra-operators/`. Add a public-facing `/cmra-north-hollywood/` consumer page (explainer + "yes we are one"). |

Why these are realistic: every Tier 1 SERP is currently held by sites with similar or weaker domain authority (Yelp listings, single-location small operators, USPS tool pages). No backlink-heavy nationals dominate the local-modifier slice.

---

## Tier 2: aspirational (page 1 in 12+ months)

Mid-tier competition + decent volume. We can place but it takes sustained content + links.

| Query | Est. monthly vol. | Comp. | Notes |
|---|---|---|---|
| `virtual mailbox` (bare) | 30K–50K | HIGH | iPostal1, Anytime Mailbox, PhysicalAddress, PostScan all rank with massive content. Need 4–6 pillar pages + 30+ supporting articles to enter top-10. |
| `virtual mailbox service` | 8K–12K | HIGH | Same operators. Realistic if we publish a "best virtual mailbox in 2026" comparison guide. |
| `private mailbox` (bare) | 5K–8K | MED–HIGH | UPS Store owns #1 nationally. We can rank with a "private mailbox vs PO box vs virtual mailbox" hub. |
| `mail forwarding service` | 6K–10K | HIGH | iPostal1, USPS, Anytime, Northwest. Tough but our existing `/services` + new `/mail-forwarding/` could place 8–10 with a Reddit-style buyer's guide. |
| `cmra near me` | 1K–2K | LOW–MED | Currently weak SERP — Yelp + USPS FAQ + a Reddit thread. We can rank #1–3 with a real explainer + national CMRA directory page. |
| `virtual mailbox for llc` | 1K–2K | MED | We have `/virtual-mailbox/for/[persona]` — make sure LLC is one. iPostal1 ranks here today. |
| `virtual mailbox california` | 600–1K | MED | We have state pages. Sharpen California to win this exact match. |
| `virtual mailbox vs po box` | 1K–2K | MED | iPostal1 + Reddit. We can rank with a long-form comparison article + table. |
| `virtual mailbox cost` / `virtual mailbox pricing` | 1K–3K | MED | Build `/virtual-mailbox/pricing/` with a real comparison table. |
| `cheapest virtual mailbox` | 1K–2K | MED | Comparison post. We can rank #5–10 with one article. |
| `mailbox rental cost` | 1K–2K | MED | Build `/mailbox-rental-cost/` with a 50-state median table. |
| `virtual mailbox reddit` | 500–1K | MED | Build a long-form "What r/digitalnomad actually recommends" article. |

---

## Tier 3: don't bother

Single-word generics or queries where intent / SERP makes them un-winnable for us.

| Query | Why skip |
|---|---|
| `noho` (bare) | Locked by Wikipedia, NoHo West mall, NoHo Arts District, NoHo BID. Intent is the neighborhood, not us. |
| `noho hank` / `noho 7` / `noho west regal` | Pop culture / movie theater intent. Not buyers. |
| `mailbox` (bare) | Hardware store / Amazon results. Pure transactional product intent, not service. |
| `po box` (bare) | USPS owns it. Trends shows it's still 50× bigger than "virtual mailbox" — but unwinnable. |
| `mailbox near me` (bare) | Dominated by blue-USPS-box locators (mailboxmap.com, USPS tools, Yelp). User wants a place to drop a stamped letter, not rent. |
| `camera near me` / autocomplete hijack for `cmra near me` | Google auto-corrects "cmra" → "camera" in suggest. Need to target `cmra` only as a researched/specialist query, not via autocomplete. |
| `usps virtual mailbox` | USPS owns. We can't pretend to be USPS. |
| `mail forwarding service south dakota` / `florida` / `texas` | Domicile-state-specific — locked by Northwest Registered Agent, St Brendan, DakotaPost. Don't compete here. |

---

## "Noho" query map

What anonymous Google returns for each `noho + X` query and whether the intent is monetizable for us.

| Query | Top 3 organic | Local pack? | Intent | Monetizable for us? |
|---|---|---|---|---|
| `noho` | nohowest.com, nohoartsdistrict.com, nohobid.com | yes | Neighborhood/mall | No |
| `noho mailbox` | **nohomailbox.org**, mailboxandphoto.com, yelp.com | yes | Direct brand + service | YES — already #1 |
| `noho mailboxes` (plural) | yelp.com (us), mapquest, fedex | yes | Direct service | YES |
| `noho address` | nohowest.com, lausd.org (high school), nohohome.org | partial | Mall/school address lookup | Mixed — sliver of business-address intent |
| `noho po box` | nohomailbox.org (AI-overview!), USPS, UPS Store, Mailbox & Photo, **Yelp** | yes | Post box rental | YES — high intent |
| `noho station address` / `noho 14 address` / `noho flats address` | Apartment buildings | no | Apartment-resident intent | No |
| `noho zip code` (implied PAA) | USPS, geographical sites | no | Lookup | Build a tiny `/noho-zip-code/` answer page just for PAA capture |
| `noho spa` / `noho diner` / `noho chow` | Local business listings | yes | Wrong vertical | No |

Buying-intent terms (capture aggressively): `noho mailbox`, `noho mailboxes`, `noho po box`, `noho mailbox hours`, `noho mailbox reviews`, `noho po box near me`, `noho po box locations`.

Informational terms (build content for): `what zip code is noho`, `what does noho stand for`, `noho address` (disambiguation page).

Competitors dominating the broader noho-services space:
- **Mailbox & Photo** (mailboxandphoto.com, 4821 Lankershim) — direct neighbor competitor, owns most "north hollywood mailbox" queries
- **The UPS Store** at 13027 Victory Blvd
- **NOHO SHIPPING CENTER** (6034 Vineland)
- **Worldwide Postal Services** (11642 Victory)

---

## Top 20 actionable next-page-builds

We already have `/private-mailbox/[neighborhood]`, `/virtual-mailbox/[state]`, `/virtual-mailbox/for/[persona]`. Gaps:

1. `/po-box-north-hollywood/` — target "north hollywood po box", "noho po box". Compare USPS PO Box vs our PMB side-by-side.
2. `/cmra-north-hollywood/` — consumer-facing "yes, we're a CMRA — here's what that means for you".
3. `/cmra-near-me/` — national CMRA-finder with embedded directory + LA highlight.
4. `/virtual-mailbox-vs-po-box/` — comparison article. Captures PAA "Is there such a thing as a virtual mailbox?", "Does IRS accept virtual mailbox?", and the 1–2K-volume comparison query.
5. `/virtual-mailbox-for-llc/` (under `/virtual-mailbox/for/`) — LLC persona-page if not already there. PAA gold.
6. `/private-mailbox-vs-po-box/` — second comparison hub.
7. `/mailbox-rental-cost-los-angeles/` — captures "mailbox rental cost" + LA modifier.
8. `/mailbox-91602/`, `/mailbox-91605/`, `/mailbox-91606/`, `/mailbox-91607/`, `/mailbox-91608/` — five ZIP pages alongside existing 91601.
9. `/vs/mailbox-and-photo/` — direct competitor comparison.
10. `/vs/ups-store-north-hollywood/` — direct competitor comparison.
11. `/vs/anytime-mailbox/` — national competitor comparison.
12. `/vs/ipostal1/` — national competitor.
13. `/vs/postscan-mail/` — already showing up in LA-targeted ads, write a real comparison.
14. `/noho-zip-code/` — tiny FAQ page that answers the PAA "What zip code is Noho?" + ranks for ~200/mo.
15. `/what-does-noho-stand-for/` — short PAA-capture article. Easy snippet.
16. `/cheapest-virtual-mailbox-2026/` — annual round-up article (rebuild yearly).
17. `/mail-forwarding-service-california/` — exact-match autocomplete suggestion.
18. `/mailbox-rental-business-for-sale/` — owner-acquisition lead funnel, ranks for the autocomplete suggestion + feeds franchise pipeline.
19. `/blog/can-i-get-a-free-mailbox/` — PAA-bait blog post.
20. `/blog/how-much-for-a-virtual-po-box/` — PAA-bait blog post.

---

## "People Also Ask" gold-mine

These questions repeated across multiple seed SERPs — each one is a blog-post brief that can win the snippet position because the current PAA answers are weak (Reddit threads, generic blog posts, no clear authoritative writeup).

**High-priority (appeared on 2+ SERPs):**
1. **What zip code is Noho?** — `noho mailbox`, `noho po box` SERPs. Trivial answer (91601, 91602, 91605, 91606, 91607, 91608). One-page answer ranks instantly.
2. **What are those neighborhood mailboxes called?** — `noho mailbox`, `noho po box`. (Cluster box units / CBU). Easy snippet.
3. **How much for a virtual PO box?** — `noho mailbox`, `noho po box`. We can publish actual pricing — most competitors hide it.
4. **Can I get a PO Box for free?** / **How can I get a free mailbox?** / **Can I get a virtual mailbox for free?** — appears under `noho po box`, `mailbox rental`, `virtual mailbox`. Highly searched. Honest no-but-here's-the-cheapest-option article.
5. **How much is a PO Box monthly?** / **How much do UPS private mailboxes cost?** / **How much does it cost to rent a small mailbox?** — recurring pricing PAAs. Publish a real comparison.

**Mid-priority (single-SERP but high intent):**
6. **What does NoHo stand for?** / **What does NoHo stand for in California?** / **What does NoHo stand for in LA?** — `noho address` SERP. Answer: NOrth HOllywood. Easy.
7. **Is a PMB (Private Mailbox) really necessary as opposed to a PO Box?** — `private mailbox` PAA. Long-form comparison.
8. **What does "private mailbox" mean?** — define-the-term article.
9. **What are the pros and cons of a PMB?** — `private mailbox`. Comparison article.
10. **What does CMRA stand for USPS?** / **Is UPS a CMRA?** / **What is CMRA certification?** / **How to check if an address is a CMRA?** — `cmra near me`. We own this category authority-wise.
11. **Is there such a thing as a virtual mailbox?** — `virtual mailbox`. Definition.
12. **Does IRS accept virtual mailbox?** — `virtual mailbox`. High-intent for LLC/business buyers.
13. **What are the disadvantages of a virtual mailbox?** — honest comparison wins trust.
14. **Can you have a virtual address in CA?** — `mailbox los angeles`. Yes/regulatory article.
15. **How to get mail without a permanent address?** — `private mailbox`. Digital-nomad audience.
16. **Which mail forwarding service is best?** — `mail forwarding service`. Comparison article.
17. **How do I forward mail for free?** — `mail forwarding service`. USPS-explainer article.
18. **What is the postal code for North Hollywood?** — `mailbox north hollywood`, `noho po box`. Trivial.
19. **Who do I contact about my mailbox?** — useful USPS / property-manager explainer.
20. **What are the blue mailboxes called?** — `mailbox near me`. Trivia article (USPS Collection Box).

Each of these belongs in a single blog post, 500–900 words, with the question as H1, the direct answer in the first 50 words (snippet bait), and a CTA to our pricing or sign-up page.

---

## Google Trends signal (12 months, US, May 2025 → May 2026)

- `po box`: avg 88.2 (popularity index). Flat — first 3 weeks 89.0, last 3 weeks 86.7. Tiny decline (~2.5%).
- `virtual mailbox`: avg 1.7. Flat — first 3 weeks 1.3, last 3 weeks 1.3.
- `private mailbox`: avg 0.7. Flat-to-up — 0.0 → 0.3.

Takeaway: "po box" is ~50× more searched than "virtual mailbox", but its SERP is owned by USPS. The category isn't growing — share-taking is the only path. We win by ranking for **local-modifier** queries where the national giants don't bother, plus **comparison** queries where buyer indecision creates room.

---

## SERP-by-SERP raw evidence

`noho mailbox` — Top organic: nohomailbox.org (#1), Yelp NOHO MAILBOXES, mailboxandphoto.com, MapQuest, FedEx, Waze, Worldwide Postal, USPS, UPS Store. Local pack: yes (us + 2 others). PAA: "What are those neighborhood mailboxes called?", "What zip code is Noho?", "Can I move my mailbox from the street to my house?", "How much for a virtual PO box?". People also search: "Noho mailbox reviews / photos / 5062 Lankershim / Mailbox and Photo / PO Box North Hollywood / Notary Public NH / Fingerprinting NH". Autocomplete: "noho mailbox", "noho mailboxes reviews", "noho mailbox hours", "noho mailbox and photo", "north hollywood mailbox".

`noho po box` — AI Overview at top mentions Noho Mailboxes by name. Top organic: nohomailbox.org, USPS Chandler, UPS Store 13027, Mailbox & Photo. Local pack: yes. PAA: "Can I get a PO Box for free?", "What does NoHo stand for in California?", "What is the postal code for North Hollywood?", "How much is a PO Box monthly?". People also search: "Noho po box locations / near me / reviews + a few USPS addresses". Autocomplete: "north hollywood po box", "closest po box to me", "non po box address".

`mailbox north hollywood` — Top organic: mailboxandphoto.com (#1, sitelinks), Yelp top-10, UPS Store, USPS, Worldwide Postal, Mailbox Locate, nohomailbox.org. Local pack: yes. PAA: "Are there mailboxes at the post office?", "Who do I contact about my mailbox?", "What is the postal code for North Hollywood?", "Who owns my mailbox?". People also search: "Usps mailbox NH / NH phone number / Post office mailbox / NH address / Free mailbox NH / NH contact / 4821 Lankershim / NH passport". Autocomplete: "mailbox north hollywood", "mailbox and photo north hollywood", "mailbox it near me".

`mailbox los angeles` — Top organic: Anytime Mailbox, PostalAnnex, MailboxMap, mailmoreca.com, Yelp top-10, UPS Store, MailConnexion, Brentwood Mailbox Center, Mailbox Locate. Local pack: yes. PAA: "Do public mailboxes still exist?", "Can I get a free mailbox?", "Can you have a virtual address in CA?", "What are the big neighborhood mailboxes called?". People also search: "Mailbox LA for rent / Private mailbox LA / Free / Cost / Virtual / USPS / Cheap / Mail and More". Autocomplete: "mailbox los angeles", "virtual mailbox los angeles", "mailbox rental los angeles", "private mailbox los angeles", "anytime mailbox los angeles".

`mailbox near me` — Top organic: MailboxMap, USPS tools, PostalAnnex, US247PostalCenter, Mailbox Locate, Yelp Usps Mailbox LA, iPostal1, Yelp Us Post Office Box. Local pack: yes. PAA: "What are the blue mailboxes called?", "Where can I drop off a package to mail near me?", "How often do blue mailboxes get picked up?", "How do I find out which mailbox is mine in a neighborhood?". People also search: "Mailbox near Hollywood LA / near LA CA / Mailbox near me for sale / Blue mailbox near me / Street mailbox / Post office near me / Within 1 mi / Post Office mailbox near me". Autocomplete: "mailbox near me", "mailbox los angeles", "mailbox near me usps", "open now", "now", "for sale", "blue box", "within 5 mi", "within 0.5 mi", "to mail a letter".

`virtual mailbox` — Sponsored: BOXFO, usepostal.com, Davinci Virtual. Top organic: iPostal1 LA virtual address, Anytime Mailbox, Reddit r/digitalnomad recommendation thread, iPostal1 main, PostScan Mail, Pak Mail, Postal Box & Ship Service (Glendale), physicaladdress.com. Local pack: yes. PAA: "Is there such a thing as a virtual mailbox?", "Does IRS accept virtual mailbox?", "What are the disadvantages of a virtual mailbox?", "Can I get a virtual mailbox for free?". Find related products: "Virtual mailbox vs virtual address / Cheapest / California / Free / Italy / Free trial". People also search: "Cheap / Best / Near me / USPS / Free / Reddit / Business / For LLC". Autocomplete: "virtual mailbox service", "near me", "los angeles", "usps", "for business", "reddit", "for llc", "vs po box".

`private mailbox` — Top organic: theupsstore.com Personal Mailbox Services, Yelp top-10 LA, Reddit r/digitalnomad PMB thread, Discussions & forums (Reddit + Quora cluster), mailmoreca.com, PostalAnnex 90022, USPS Rent a PO Box, Anytime Mailbox LA, US247PostalCenter, Miracle Mail. Local pack: yes (LA). PAA: "How much do UPS private mailboxes cost?", "What does 'private mailbox' mean?", "What are the pros and cons of a PMB?", "How to get mail without a permanent address?". People also search: "Cost / Rental near me / Rental / Near me / LA / vs PO Box / UPS / FedEx". Autocomplete: "private mailbox near me", "private mailbox", "private mailbox rental near me", "rental", "services near me", "ups", "vs po box", "cost", "usps", "for rent near me".

`mail forwarding service` — Top organic: iPostal1, USPS forward, Reddit r/RVLiving thread, Anytime Mailbox, Northwest Registered Agent California, physicaladdress.com, Sasquatch Mail, Quora, Yelp LA top-10, USA2Me. Local pack: low/none. PAA: "Which mail forwarding service is best?", "How do I forward mail for free?", "Is USPS mail forwarding service free?", "How do I forward all my mail to a different address?". People also search: "near california / near los angeles, ca / USPS / Reddit / Temporary / Best / For RVers / For businesses". Autocomplete: "mail forwarding service", "california", "near me", "florida", "south dakota", "for expats", "usps", "texas", "us to canada", "europe to us".

`cmra near me` — Top organic: Yelp top-10 mail services, USPS CMRA FAQ, UPS Locations LA, US247PostalCenter, mailmoreca.com, iPostal1 Mailbox Rental Near Me, Reddit r/PrivacySecurityOSINT lessons-learned thread, theupsstore.com Personal Mailbox, us247-postalcenter.com, USPS LA. Local pack: weak (no clear local pack for "cmra" — Google substitutes "camera" or "mail services"). PAA: "What does CMRA stand for USPS?", "Is UPS a CMRA?", "What is CMRA certification?", "How to check if an address is a CMRA?". People also search: "cmra near Hollywood LA / CMRA address cost / CMRA application / CMRA USPS / How to become a CMRA / CMRA database / CMRA address check". Autocomplete misfires to "camera near me" — true `cmra` query is a niche niche, ~100–500/mo, but very high intent.

`mailbox rental` — Top organic: USPS Rent a PO Box, Yelp top-10 LA, ACE One Stop, mailmoreca.com, yourmailboxdirect.com, PostalAnnex, boxbrosla.com (Goodman), UPS Store Santa Monica, iPostal1. Local pack: yes. PAA: "How much does it cost to rent a small mailbox?", "How much is it to rent a mailbox at the Post Office?", "How can I get a free mailbox?", "How much is it to rent a mailbox at UPS?". People also search: "Mailbox rental near me / Private mailbox rental / Cheap / LA / Private mailbox / USPS PO Box / Pay PO Box renewal online free / Virtual mailbox". Autocomplete: "mailbox rental near me", "los angeles", "mailbox rental", "cost", "business for sale", "services", "for business", "usps", "service near me", "with physical address".

`noho address` — Top organic: nohohome.org (NoHo Home Alliance), nohowest.com, Yelp NH, LA Parks NH Recreation Center, NoHo Commons (Athena PM), Hope the Mission NoHo Shelter, lausd.org NH High, shopnohocommons.com directions, Apartments.com NoHo 14. Local pack: partial. PAA: "What does NoHo stand for?", "What does NoHo stand for in LA?", "What zip code is NoHo?", "Is NoHo in LA County?". People also search: "NOHO West / West directory / North Hollywood / Noho address map / West Apartments / mall / West restaurants / West Alexan". Autocomplete: "noho address", "north hollywood address", "noho west address", "noho flats address", "noho station address", "noho 14 address", "corepower.noho address", "laemmle noho address", "soulcycle noho address", "noho one address".

---

## Method notes / caveats

- Volume numbers are educated estimates derived from autocomplete prominence, PAA pull, and Trends comparison — not Keyword Planner data. Treat the brackets as rough orders of magnitude (low = <100/mo, med = 100–1K, high = 1K–10K, very high = 10K+).
- All searches ran with `gl=us&hl=en` from an LA-geolocated IP, so local packs lean LA. National volume distribution may differ.
- We did not paginate beyond page 1 — the SERP signal we used is page-1 organic + local + PAA + related, which is what matters for ranking strategy.
- Autocomplete reflects current Google suggest, which is recency-biased — fresh trends like "virtual mailbox for llc" show up, but legacy queries may be under-represented.
