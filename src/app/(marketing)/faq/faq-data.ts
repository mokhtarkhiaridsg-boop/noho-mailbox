// Shared FAQ entries — imported by both the server-component page (for
// schema.org JSON-LD + metadata) AND the client-component accordion.
// Keep this file framework-agnostic (no React/Next imports) so the
// types live cleanly on both server + client.

export type FaqEntry = {
  category: string;
  question: string;
  answer: string;
};

export const FAQS: FaqEntry[] = [
  { category: "Getting Started", question: "What do I need to sign up for a mailbox?", answer: "You'll need two valid government-issued photo IDs (e.g., driver's license + passport) and a completed USPS Form 1583. We'll help you fill out the form in-store and notarize it on the spot." },
  { category: "Getting Started", question: "What is USPS Form 1583?", answer: "It's a form required by the USPS that authorizes us to receive mail on your behalf. You must complete it in person with a valid ID, and it must be notarized. We handle the notarization for free when you sign up." },
  { category: "Getting Started", question: "Do I get a real street address?", answer: "Yes! You receive a real street address with a unique suite number — not a P.O. Box. You can use it for personal mail, business registration, banking, and more." },
  { category: "Mail & Packages", question: "How does mail scanning work?", answer: "When mail arrives, we scan the exterior and upload it to your secure online dashboard. You can then choose to open & scan the contents, forward it, or have it shredded." },
  { category: "Mail & Packages", question: "Do you accept packages from all carriers?", answer: "Yes — we accept packages from USPS, UPS, FedEx, DHL, Amazon, and any other delivery service. You'll receive an instant notification when a package arrives." },
  { category: "Mail & Packages", question: "When do carriers pick up outgoing mail?", answer: "Carrier pickup schedules at our store: USPS picks up Monday–Saturday around 4:00 PM. UPS picks up Monday–Friday around 5:00 PM. FedEx picks up Monday–Friday around 4:30 PM. DHL picks up Monday–Friday around 3:30 PM. Drop off outgoing shipments well before these times to ensure same-day dispatch." },
  { category: "Mail & Packages", question: "How long will you hold my mail and packages?", answer: "Standard holding is 3 days at no charge. Days 4–13: $6.50/day per package (base tier). Days 14–29: $9.75/day (1.5×). Days 30–59: $13.00/day (2×). Days 60+: $19.50/day (3×, final). After extended holding, unclaimed items may be returned to sender, forwarded (at your expense), or disposed of. Contact us to arrange extended holding in advance." },
  { category: "Mail & Packages", question: "Can I request mail to be shredded?", answer: "Absolutely. From your dashboard, click 'Discard' on any mail item and we'll securely shred and dispose of it." },
  { category: "Delivery Service", question: "How does same-day delivery work?", answer: "Request a delivery through our website or dashboard. We dispatch a local courier who picks up your mail or packages from our store and delivers them to your address — same day." },
  { category: "Delivery Service", question: "What are the delivery zones and pricing?", answer: "North Hollywood zone deliveries are a flat $5. Outside NoHo, pricing is zone-based: $9 Inner Valley (Studio City / Sherman Oaks / Burbank, 0–5 mi), $13 Mid Valley (Van Nuys / Glendale / Los Feliz, 5–10 mi), $17 Greater LA (Hollywood / Silver Lake / Echo Park, 10–15 mi), $21 West LA (Culver City / Beverly Hills / Pasadena, 15–20 mi), $28 Far LA (Santa Monica / Long Beach / Torrance, 20–30 mi). Beyond 30 miles is custom-quoted. See /delivery for the full map." },
  { category: "Delivery Service", question: "Do I need to be a mailbox member to use delivery?", answer: "No! Our same-day delivery service is open to anyone. You can request a delivery directly from our website." },
  { category: "Pricing & Plans", question: "What plans do you offer?", answer: "We offer three plans — Basic Box, Business Box, and Premium Box — each available in 3-month, 6-month, or 14-month terms. Business Box is our most popular, and Premium includes mail forwarding, priority processing, and notary discounts." },
  { category: "Pricing & Plans", question: "Are there any hidden fees or setup costs?", answer: "No hidden fees. The price you see is the price you pay. There's no setup fee — just bring your IDs and you're good to go." },
  { category: "Pricing & Plans", question: "Can I upgrade or change my plan?", answer: "Yes, you can upgrade at any time. The price difference is prorated for the remaining term. Contact us in-store or through the dashboard." },
  { category: "Notary", question: "Do I need an appointment for notary services?", answer: "Walk-ins are welcome based on availability, but we recommend booking online to guarantee your appointment time." },
  { category: "Notary", question: "What documents can you notarize?", answer: "We notarize legal documents, real estate transactions, business agreements, affidavits, power of attorney, contracts, loan documents, and identity verifications." },
  { category: "Notary", question: "Do Premium members get a notary discount?", answer: "Yes — Premium Box subscribers receive a discounted notary rate. Ask about your member pricing when booking." },
  { category: "Business Solutions", question: "What's included in the $2,000 Business Solutions package?", answer: "LLC/DBA/S-Corp formation, EIN, all required filings, a full brand book, branding assets, a live website with hosting, SEO setup, social media profiles, Google Business profile, and 12 months of mail service." },
  { category: "Business Solutions", question: "How long does the business formation process take?", answer: "Most packages are completed within 2-4 weeks. We handle everything from filing to branding to website launch, so you can focus on your business." },
];

export const FAQ_CATEGORIES = Array.from(new Set(FAQS.map((f) => f.category)));
