# Lane B — Business Solutions: Prospect List & Partner Channels

**Two ways to fill the Business Solutions pipeline:**
1. **Direct prospects** — people who need an LLC + brand + site right now
2. **Referral partners** — professionals whose clients need it and who don't offer it themselves

Direct prospects are slower per-touch, but partner channels compound. Run both in parallel.

---

## B1. Direct prospects

### B1a. Existing mailbox customers — your hottest list (run this Monday)

Pull from Prisma `User` table:
- All `boxType = "Business"` customers with `planExpiresAt > now` → **already paying for Business box, already trust you**
- Anyone tagged in admin notes as "asked about LLC" / "wants website" / "branding"

**Pitch (sequence in `08-customer-upsell.md`):** "You already have the address. Want the rest? $2k all-in: LLC formed, EIN filed, brand kit, website. Or $1.2k/mo if you want us managing it. First 5 mailbox customers get $300 off."

### B1b. Realtors going independent

CA real estate agents must operate under a brokerage OR form their own DBA + brand to take their book independently. There's a steady trickle.

**Where to find them:**
- BNI / Toastmasters / local Chamber of Commerce meetups
- Compass / KW / RE/MAX agents who've recently changed firms (LinkedIn signal)
- Comments in r/realestate / r/RealEstateLosAngeles

**Pitch:** "We do the LLC, the DBA, your brand book, your site, and 12 months of mail at our address — $2k flat. You'd pay $3k+ piecemeal."

### B1c. Etsy / Amazon / Shopify sellers

LA has a heavy Etsy/Amazon FBA seller population. They hit a ceiling at ~$50k/yr revenue when buyers and platforms start asking for real LLC + EIN.

**Where to find them:**
- r/EtsySellers, r/AmazonSeller, r/FulfillmentByAmazon — search "LLC" / "trademark" / "real address"
- Local seller meetups (Eventbrite "Amazon seller Los Angeles")
- IG hashtags: #etsysellerla #shopifyseller #lasmallbusiness

**Pitch:** "Your Etsy is making money. Want a trademark? You need an LLC. We do the LLC, EIN, brand book, site, and 12 months of a real LA street address (no PO box) — $2k flat."

### B1d. Immigrant-founded service businesses (mechanics, salons, contractors, restaurants)

This is the largest under-served segment in the Valley. They need legitimacy infrastructure (LLC, EIN, real address, branded marketing) but most agencies talk over their heads in English-only.

**Reach them via:**
- Walking in to their shops (you already do this for delivery — same trip)
- Tunisian / North African / Middle Eastern community FB groups
- Spanish-language flyers at panaderías, mercados, hardware stores
- Iglesia / mosque community boards (with permission)
- Whatever community network you already have personally

**Pitch (English):** "We help small businesses open the right way. LLC, EIN, real LA address, brand and website — all from one shop. We speak [your languages]. We come to you if needed."

### B1e. Side-hustlers going full-time

Newsletter writers, content creators, consultants, OnlyFans creators, freelancers who file Schedule C and want to incorporate.

**Reach them:**
- Indie Hackers, r/SideProject, r/freelance
- IG/TikTok creators making LA-based content
- Substack writers in LA
- Local coworking spaces (WeWork Burbank, NoHo coworks) — flyer in printer rooms

---

## B2. Referral partners — fastest scale path

These professionals see the LLC/brand need before you do but don't want to build it themselves. **You give them a 15% commission on the bundle** ($300 on a $2k close, $180/mo on a retainer).

### B2a. CPAs & bookkeepers

Found in the searches:
- **Roland Fink, CPA** — North Hollywood. Already does incorporation referrals. Walk in.
- **Velin & Associates, Inc.** — North Hollywood. Tax + business consulting.
- **LACPA Partners Inc.** — Burbank. Small business focus.
- **L.A. Financial Management** — Burbank. Small business focus.
- **Eran Consulting** — Burbank. Full-service.
- **ADK Accounting** — Burbank.

**Yelp searches to expand:** "Best 10 Accountants near North Hollywood", "Small Business Accountant Burbank".

**Pitch:** "When a client walks in needing an LLC, you're either pulling them through LegalZoom or sending them to an attorney for $1500. We do LLC + EIN + brand + site + a year of real address for $2k flat. We pay you 15% — $300 per referral, $180/mo on a retainer. We don't compete with your tax work, we feed it."

### B2b. Immigration attorneys

Immigration attorneys see streams of new arrivals starting businesses (E-2, EB-5, L-1, family-based). They need the post-immigration setup but immigration counsel doesn't do it.

**How to find:** justia.com → Immigration Law → CA → North Hollywood / Burbank / Sherman Oaks.

**Pitch:** "Your E-2 / L-1 clients all need US business setup after the visa. We do LLC, EIN, brand, site, and a real LA address — $2k flat, 15% to you. You stay in your lane, your client gets the next step solved, you get $300/referral."

### B2c. Web designers & freelance brand designers (NOT agencies)

Solo freelancers are too small to do LLC + EIN + mail; they punt that part. They get $1k for a site and lose the bigger fish.

**Where:** Behance + Dribbble filtered to LA, IG #lawebdesigner, freelancer Slacks.

**Pitch:** "You bid $1500 for the site. Bundle yours into our $2k package and we pay you $300. Your client gets a real business setup, you don't lose the deal to LegalZoom + Wix."

### B2d. Insurance agents (commercial / GL)

Every new LLC needs general liability + workers' comp. Insurance agents see the formation moment. Reciprocal referral.

**How to find:** local State Farm / Allstate / commercial brokers.

**Pitch:** "We refer every new LLC client to you for GL + workers' comp. You refer your new-formation prospects to us. 15% both ways or fee-trade — your call."

### B2e. Realtor → small biz pivot agents

Realtors who help small businesses lease commercial space see the formation moment and don't have a service to offer beyond the lease.

**Pitch:** Same as B2c.

---

## B3. Channel sequencing

**Week 1:**
- Pull existing-customer Business-tier list. Send `08-customer-upsell.md` campaign.
- Walk in to all CPAs in B2a. Hand them the partner one-pager.

**Week 2:**
- Email/walk in to immigration attorneys (B2b).
- Cold-DM 5 web designers (B2c) on IG.

**Week 3:**
- Set up Eventbrite listings for free monthly "How to start your business in California" workshop at the storefront. Lead magnet for B1d, B1e.

**Week 4:**
- First partner check-ins. Adjust commission if friction is high.

## B4. Tracking

```
| Partner | Type | Contact | First touch | Status | Referrals (count) | Closed ($) |
```

Status: `cold`, `pitched`, `signed agreement`, `1st referral`, `recurring`.

**North-star:** 5 partners actively sending referrals by week 8 → 1 partner-sourced close per week.
